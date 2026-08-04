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
import {
  json,
  sameSite,
  pinEqual,
  MIN_PIN_LENGTH,
  readJsonBody,
  clientIp,
  pinRateLimited,
  recordPinFailure,
  clearPinFailures,
} from '../_shared.js';

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
//
// The opt-out line is a Spam Act requirement. It points at the shop mobile
// rather than saying "reply STOP", because the 'Xpress' alphanumeric sender
// cannot receive replies — carriers block them. The shop mobile takes both
// calls and texts, so it is a channel that actually works today.
// 233 chars with a short name, 270 at the 40-char name cap — both under the
// 306-char two-segment ceiling, so the opt-out costs nothing.
export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} - The team. To opt out, call or text 0415 303 300.`
  );
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return json(parsed.status, { ok: false, error: parsed.error });
  const data = parsed.data;

  // PIN gate. Unset OR too short → unconfigured (never an open endpoint).
  const pinSecret = env.REVIEW_SMS_PIN;
  if (!pinSecret || pinSecret.length < MIN_PIN_LENGTH) {
    if (pinSecret) console.error('REVIEW_SMS_PIN is too short (min 10) — use a 16+ char random PIN');
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }

  const ip = clientIp(request);
  if (await pinRateLimited(env.ORDERS_KV, ip)) {
    return json(429, { ok: false, error: 'Too many attempts. Wait 15 minutes.' });
  }
  if (!pinEqual(String(data.pin ?? ''), pinSecret)) {
    await recordPinFailure(env.ORDERS_KV, ip);
    return json(401, { ok: false, error: 'Wrong PIN.' });
  }
  await clearPinFailures(env.ORDERS_KV, ip);

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

  // Bookkeeping only — the shop's own count, independent of ClickSend's history.
  // Key-per-send mirrors lead.js: a daily counter would be a read-modify-write
  // race. Deliberately PII-free: no phone number, no name, no message body.
  if (env.ORDERS_KV) {
    try {
      await env.ORDERS_KV.put(
        `reviewsms:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`,
        JSON.stringify({ sent: true }),
        { expirationTtl: 60 * 60 * 24 * 730 },
      );
    } catch (err) {
      // Never fail a delivered SMS over bookkeeping.
      console.error('ORDERS_KV review-sms count failed', err);
    }
  }

  return json(200, { ok: true, to });
}
