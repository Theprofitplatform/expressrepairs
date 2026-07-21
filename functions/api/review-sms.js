// Cloudflare Pages Function — POST /api/review-sms
//
// Staff-triggered Google-review request SMS. A PIN-gated internal page
// (src/pages/staff/review-request.astro) posts { name, mobile, device, pin };
// this endpoint validates the PIN, normalises the mobile to an AU E.164 number,
// and sends a review-request SMS via ClickSend.
//
// Config (Cloudflare Pages → Settings → Environment variables / Secrets):
//   CLICKSEND_USERNAME  (secret, required)  — ClickSend account username
//   CLICKSEND_API_KEY   (secret, required)  — ClickSend API key
//   REVIEW_SMS_PIN      (secret, required)  — staff PIN gating this endpoint
//   REVIEW_LINK         (required)          — https://g.page/r/…/review
//   CLICKSEND_SENDER    (optional)          — sender ID, default 'Xpress' (≤11 chars)
//
// Note: the shared sameSite also allows *.pages.dev (preview deploys), which
// the old local copy here did not. Acceptable widening: the PIN below is the
// real gate — Origin/Referer are forgeable off-browser regardless.
import { json, sameSite } from '../_shared.js';

const MAX_BODY_BYTES = 16 * 1024;

// Single-line, length-capped value — strips CR/LF and other control chars.
const oneLine = (s, max = 200) => {
  let out = '';
  for (const ch of String(s ?? '')) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out.replace(/  +/g, ' ').trim().slice(0, max);
};

// AU mobile → E.164 (+614xxxxxxxx), or null if it isn't a valid AU mobile.
export function normalizeAuMobile(raw) {
  const s = String(raw ?? '').trim();
  const hadPlus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  let national;
  if (hadPlus && digits.startsWith('61')) national = digits.slice(2);
  else if (!hadPlus && digits.length === 11 && digits.startsWith('61')) national = digits.slice(2);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;
  if (!/^4\d{8}$/.test(national)) return null;
  return `+61${national}`;
}

// Sign-off uses a plain hyphen, not an em-dash: a single non-GSM-7 character
// (like "—") forces the whole SMS into UCS-2 (67 chars/segment vs 153), adding
// a billable segment. Keeping the template GSM-7 keeps it to ~2 segments.
export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} - The team`
  );
}

// Length-safe PIN comparison (avoids a trivial early-exit timing signal).
const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// The PIN is the sole barrier for a scripted client (Origin/Referer are
// forgeable off-browser) to a paid outbound SMS. Reject a too-short configured
// PIN as misconfiguration so a weak secret can't ship and be brute-forced.
const MIN_PIN_LENGTH = 10;

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  // Cheap early-reject on the declared length so we don't buffer a huge body;
  // the real received-byte count is still checked below (Content-Length can be
  // spoofed or omitted, so it is not trustworthy on its own).
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'Request too large.' });
  }

  // Enforce the size cap on real received bytes.
  let raw;
  try {
    raw = await request.arrayBuffer();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }
  if (raw.byteLength > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'Request too large.' });
  }

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }
  // A bare JSON scalar (null, a string, a number) parses fine but has no
  // fields; reject it so the field reads below can't throw an uncaught
  // TypeError (which would surface as an opaque 5xx, not our JSON).
  if (typeof data !== 'object' || data === null) {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }
  // (A JSON array passes the check above, but its field reads are undefined and
  // degrade to a 401 — no crash, so this is still safe.)

  // PIN gate. Unset OR too short → unconfigured (never an open endpoint).
  const pinSecret = env.REVIEW_SMS_PIN;
  if (!pinSecret || pinSecret.length < MIN_PIN_LENGTH) {
    if (pinSecret) console.error('REVIEW_SMS_PIN is too short (min 10) — use a 16+ char random PIN');
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }
  if (!pinEqual(String(data.pin ?? ''), pinSecret)) {
    return json(401, { ok: false, error: 'Wrong PIN.' });
  }

  const to = normalizeAuMobile(data.mobile);
  if (!to) return json(400, { ok: false, error: 'Enter a valid Australian mobile number.' });

  const username = env.CLICKSEND_USERNAME;
  const apiKey = env.CLICKSEND_API_KEY;
  const reviewLink = env.REVIEW_LINK;
  if (!username || !apiKey || !reviewLink) {
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }

  const from = oneLine(env.CLICKSEND_SENDER, 11) || 'Xpress';
  const body = buildReviewMessage(data.name, reviewLink);
  const payload = { messages: [{ source: 'cf-pages', from, to, body }] };

  // ClickSend returns HTTP 200 even for a failed message, so we check the
  // per-message status too. Any other outcome → 503 (not 502; see file header).
  try {
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => null);
    const status = result?.data?.messages?.[0]?.status;
    if (!res.ok || status !== 'SUCCESS') {
      // Log status only — the ClickSend body echoes the customer's number/message.
      console.error('ClickSend send failed', res.status, status || 'no-status');
      return json(503, { ok: false, error: 'Could not send right now.' });
    }
  } catch (err) {
    console.error('ClickSend request error', err);
    return json(503, { ok: false, error: 'Could not send right now.' });
  }

  return json(200, { ok: true, to });
}
