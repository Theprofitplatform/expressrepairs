// Cloudflare Pages Function — POST /api/missed-call
//
// Twilio calls this when a forwarded call from either shop line rings out.
// We never answer: the response is <Reject/>, so no voice minutes are billed.
// The caller gets a text inviting them to reply.
//
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER (E.164), ORDERS_KV.
import {
  normalizeAuMobile, validTwilioSignature, sendSms, isOptedOut, MAX_BODY_BYTES,
} from '../_shared.js';

const DEDUP_SECONDS = 6 * 60 * 60; // don't re-text the same caller within 6h
export const DAILY_CAP = 100; // hard backstop against a robocall loop
// ponytail: DAILY_CAP is a read-modify-write over two independent KV calls —
// the >= check below, the increment further down — with an SMS send in
// between, so concurrent webhooks can all read the same stale count and all
// send before any of them writes the bump. The effective ceiling rises with
// the attacker's concurrency, same failure shape as PIN_GLOBAL_MAX_FAILS in
// _shared.js. Acceptable for a shop that gets one missed call at a time;
// upgrade to a Durable Object (strongly consistent, serializes writes) if
// per-day accuracy ever actually matters.

const TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>';
const twiml = (status = 200) =>
  new Response(TWIML, { status, headers: { 'content-type': 'text/xml' } });

export function buildMissedCallMessage() {
  // GSM-7 only. Promises a reply, not an immediate one — the shop is closed
  // Sundays, so "we'll get back to you" must not imply instant availability.
  return (
    'Sorry we missed your call - Xpress Phone Repairs, Riverwood Plaza. ' +
    "How can we help? Reply to this text and we'll get straight back to you."
  );
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return twiml(405);

  // Public and unauthenticated: reject an oversized body on the declared
  // length before buffering it at all. A lying or absent Content-Length just
  // means this cheap check is skipped for that request — the signature check
  // right after still blocks anyone who isn't Twilio, so no real defence is
  // lost by not verifying the real byte count too (contrast readJsonBody in
  // _shared.js, which re-checks received bytes because its callers are
  // staff-PIN-gated, not signature-gated).
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return twiml(413);
  }

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const ok = await validTwilioSignature(
    request.url, params, request.headers.get('x-twilio-signature'), env.TWILIO_AUTH_TOKEN,
  );
  if (!ok) return twiml(403);

  // Landline callers and withheld numbers cannot receive SMS — sending would
  // fail and still be billed.
  const to = normalizeAuMobile(params.From);
  if (!to) return twiml();

  // Spam Act suppression, checked before anything else that could send. Note
  // this fails CLOSED while the dedup/cap block below fails OPEN — the two are
  // deliberately different and the difference is the point. A KV outage there
  // costs a duplicate text; a KV outage here would text someone who asked us
  // to stop. When we cannot prove consent, we do not send.
  const optout = await isOptedOut(env, to);
  if (!optout.ok || optout.optedOut) return twiml();

  const kv = env.ORDERS_KV;
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `missed:count:${day}`;

  if (kv) {
    try {
      if (await kv.get(`missed:${to}`)) return twiml(); // already texted recently
      if (Number(await kv.get(capKey) || 0) >= DAILY_CAP) {
        console.error('missed-call daily cap reached', day);
        return twiml();
      }
    } catch (err) {
      // Fail closed here would brick the feature on a KV blip, so we fail
      // open — but be honest about what that means: a KV outage or a missing
      // ORDERS_KV binding doesn't just risk "a rare duplicate text", it takes
      // out the dedup window AND the DAILY_CAP backstop together for as long
      // as it lasts, so every missed call gets texted with no loop
      // protection at all until KV recovers.
      console.error('missed-call KV unavailable', err);
    }
  }

  const result = await sendSms(env, to, buildMissedCallMessage());
  if (!result.ok) return twiml();

  if (kv) {
    try {
      await kv.put(`missed:${to}`, '1', { expirationTtl: DEDUP_SECONDS });
      await kv.put(capKey, String(Number(await kv.get(capKey) || 0) + 1), {
        expirationTtl: 60 * 60 * 48,
      });
    } catch (err) {
      console.error('missed-call bookkeeping failed', err);
    }
  }
  return twiml();
}
