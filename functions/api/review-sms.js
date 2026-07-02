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
// Self-contained by design: it duplicates lead.js's small guard helpers rather
// than editing lead.js, so the two endpoints never conflict.

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

export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} — The team`
  );
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hostAllowed = (host, env) => {
  if (!host) return false;
  const extra = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (
    host === 'expressrepairs.com.au' ||
    host === 'www.expressrepairs.com.au' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    extra.includes(host)
  );
};

// True when the request originates from our own site (Origin, else Referer).
const sameSite = (request, env) => {
  const hostOf = (v) => {
    try { return new URL(v).host; } catch { return ''; }
  };
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

// Length-safe PIN comparison (avoids a trivial early-exit timing signal).
const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Request too large.' });

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  // PIN gate. If the secret is unset the endpoint is unconfigured — never open.
  const pinSecret = env.REVIEW_SMS_PIN;
  if (!pinSecret) return json(503, { ok: false, error: 'SMS sending not configured.' });
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
      console.error('ClickSend send failed', res.status, JSON.stringify(result));
      return json(503, { ok: false, error: 'Could not send right now.' });
    }
  } catch (err) {
    console.error('ClickSend request error', err);
    return json(503, { ok: false, error: 'Could not send right now.' });
  }

  return json(200, { ok: true, to });
}
