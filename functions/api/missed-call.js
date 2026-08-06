// Cloudflare Pages Function — POST /api/missed-call
//
// Twilio calls this when a forwarded call from either shop line rings out.
// We never answer: the response is <Reject/>, so no voice minutes are billed.
// The caller gets a text inviting them to reply.
//
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER (E.164), ORDERS_KV.
import { normalizeAuMobile, validTwilioSignature, sendSms } from '../_shared.js';

const DEDUP_SECONDS = 6 * 60 * 60; // don't re-text the same caller within 6h
const DAILY_CAP = 100; // hard backstop against a robocall loop

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
      // Fail closed on the dedup check would brick the feature on a KV blip;
      // fail open and accept a rare duplicate text.
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
