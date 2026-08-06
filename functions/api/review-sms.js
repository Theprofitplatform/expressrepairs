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
  oneLine,
  sendSms,
} from '../_shared.js';

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
// 231 chars with a short name, 268 at the 40-char name cap — both under the
// 306-char two-segment ceiling, so the opt-out costs nothing.
//
// Two deliberate choices in the wording:
//
// 1. It does NOT say "if you're happy with the repair". Conditioning the ask on
//    the customer already being satisfied is review gating — soliciting only
//    the people likely to leave five stars. Google's review policies prohibit
//    it, and it buys nothing: everyone who walks out with a working phone gets
//    the same message, and the rating looks after itself.
// 2. It asks for one specific detail. On 2026-08-05, 13 of the shop's 22
//    reviews were unquotable because they were four words long ("Good
//    service"). A review naming the actual repair is a better testimonial AND
//    carries the device/repair terms people search for.
export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `A quick Google review means a lot - even a line on what we fixed helps: ` +
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

  const reviewLink = env.REVIEW_LINK;
  const smsConfigured = env.TWILIO_ACCOUNT_SID || (env.CLICKSEND_USERNAME && env.CLICKSEND_API_KEY);
  if (!smsConfigured || !reviewLink) {
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }

  const sent = await sendSms(env, to, buildReviewMessage(data.name, reviewLink));
  if (!sent.ok) {
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
