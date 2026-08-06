// Cloudflare Pages Function - POST /api/review-sms
//
// Staff-triggered Google-review request SMS. A PIN-gated internal page
// (src/pages/staff/review-request.astro) posts { name, mobile, device, pin };
// this endpoint validates the PIN, normalises the mobile to an AU E.164 number,
// and sends a review-request SMS via sendSms() in _shared.js.
//
// An optional `action: 'optout'` field turns the same request into a
// suppression instead: it records that the number must never be texted
// again (ORDERS_KV key `optout:<sha256-hex-of-E.164>`, no TTL) and sends
// nothing. Every other send checks that key first and refuses to send if
// it's set — see the fail-closed comment at the check below.
//
// Provider selection: sendSms picks Twilio when TWILIO_ACCOUNT_SID is set,
// otherwise ClickSend. Today, ClickSend is live (Twilio not yet configured).
//
// Config (Cloudflare Pages - Settings - Environment variables / Secrets):
//   CLICKSEND_USERNAME  (secret, required)  - ClickSend account username
//   CLICKSEND_API_KEY   (secret, required)  - ClickSend API key
//   CLICKSEND_SENDER    (optional)          - sender ID, default 'Xpress' (<= 11 chars)
//   TWILIO_ACCOUNT_SID  (secret, optional)  - Twilio account SID
//   TWILIO_AUTH_TOKEN   (secret, optional)  - Twilio auth token
//   TWILIO_NUMBER       (secret, optional)  - Twilio sender number
//   REVIEW_SMS_PIN      (secret, required)  - staff PIN gating this endpoint
//   REVIEW_LINK         (required)          - https://g.page/r/.../review
//
// Note: the shared sameSite also allows *.pages.dev (preview deploys), which
// the old local copy here did not. Acceptable widening: the PIN below is the
// real gate - Origin/Referer are forgeable off-browser regardless.
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
  normalizeAuMobile,
} from '../_shared.js';

// Hex-encodes a digest buffer (same helper as stripe-webhook.js).
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// Hashes an E.164 number for the optout: KV key — never store the number
// itself. crypto.subtle is the Workers-runtime primitive (no Node crypto).
async function sha256Hex(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

export { normalizeAuMobile };

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

  const optoutKey = `optout:${await sha256Hex(to)}`;

  // Opt-out branch runs after the PIN gate/rate-limit/size-cap checks above
  // (it reuses this endpoint precisely to inherit them) and short-circuits
  // before any SMS-sending config is even read. `name` isn't required here.
  if (data.action === 'optout') {
    if (!env.ORDERS_KV) return json(503, { ok: false, error: 'Could not record right now.' });
    try {
      await env.ORDERS_KV.put(optoutKey, '1');
    } catch (err) {
      console.error('optout write failed', err);
      return json(503, { ok: false, error: 'Could not record right now.' });
    }
    return json(200, { ok: true, to });
  }

  // Suppression check — deliberately fails CLOSED, the opposite of
  // pinRateLimited's fail-open above. Failing open there locks nobody out of
  // a staff tool; failing open here would text a customer who legally asked
  // not to be texted (Spam Act). Sends are one at a time from a staff page,
  // so a refusal is immediately visible and retryable — unlike the rate
  // limiter, there's no "everyone locked out" downside to weigh against it.
  if (!env.ORDERS_KV) return json(503, { ok: false, error: 'Could not send right now.' });
  try {
    const suppressed = await env.ORDERS_KV.get(optoutKey);
    if (suppressed) return json(503, { ok: false, error: 'This number has opted out of texts.' });
  } catch (err) {
    console.error('optout check failed', err);
    return json(503, { ok: false, error: 'Could not send right now.' });
  }

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
