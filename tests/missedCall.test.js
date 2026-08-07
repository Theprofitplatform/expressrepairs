import { describe, it, expect, vi } from 'vitest';
import { createHmac, createHash } from 'node:crypto';
import { validTwilioSignature } from '../functions/_shared.js';

// Vector generated independently with Node's crypto.createHmac (not the
// WebCrypto implementation under test), so this is a real cross-check.
const TOKEN = 'test_auth_token_abc123';
const URL_ = 'https://expressrepairs.com.au/api/missed-call';
const PARAMS = {
  AccountSid: 'ACtest',
  CallSid: 'CAtest123',
  CallStatus: 'no-answer',
  From: '+61412345678',
  To: '+61480000000',
};
const GOOD = 'XPaWuOOcDhGDf9KFiHzrh/214ho=';

describe('validTwilioSignature', () => {
  it('accepts a correctly signed request', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, TOKEN)).toBe(true);
  });

  it('rejects a tampered caller number', async () => {
    const tampered = { ...PARAMS, From: '+61499999999' };
    expect(await validTwilioSignature(URL_, tampered, GOOD, TOKEN)).toBe(false);
  });

  it('rejects a wrong auth token, a bad signature and junk', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, 'wrong')).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, 'nope', TOKEN)).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, '', TOKEN)).toBe(false);
  });

  it('accepts the same params in non-alphabetical insertion order (proves sort() is load-bearing)', async () => {
    // Same five keys/values as PARAMS, declared out of alphabetical order.
    // Object key iteration follows insertion order in JS, so this only
    // passes against GOOD if the implementation sorts before signing.
    const reordered = {
      To: PARAMS.To,
      From: PARAMS.From,
      CallStatus: PARAMS.CallStatus,
      CallSid: PARAMS.CallSid,
      AccountSid: PARAMS.AccountSid,
    };
    expect(await validTwilioSignature(URL_, reordered, GOOD, TOKEN)).toBe(true);
  });
});

import { buildMissedCallMessage, onRequest, DAILY_CAP } from '../functions/api/missed-call.js';
import { MAX_BODY_BYTES } from '../functions/_shared.js';

const ENV = {
  TWILIO_ACCOUNT_SID: 'ACtest',
  TWILIO_AUTH_TOKEN: TOKEN,
  TWILIO_NUMBER: '+61480000000',
};

// Builds a request whose signature is genuinely valid for the given params.
// Signs with Node's crypto — an implementation independent of the WebCrypto
// code under test. `node:crypto` is fine here (Vitest runs on Node) but must
// never appear under functions/, which runs on Workers.
function signedReq(params, env = ENV) {
  let data = URL_;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const sig = createHmac('sha1', env.TWILIO_AUTH_TOKEN).update(data).digest('base64');
  return {
    method: 'POST',
    url: URL_,
    headers: new Headers({
      'x-twilio-signature': sig,
      'content-type': 'application/x-www-form-urlencoded',
    }),
    text: async () => new URLSearchParams(params).toString(),
  };
}

function kvStub(store = {}) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    _store: store,
  };
}

describe('missed-call handler', () => {
  it('builds a GSM-7 message that identifies the business and fits one segment', () => {
    const msg = buildMissedCallMessage();
    expect(msg).toContain('Xpress Phone Repairs');
    // Must stay GSM-7: an em dash or smart quote halves segment capacity.
    expect(msg).toMatch(/^[ -~]*$/);
    // Currently 138 chars. A single GSM-7 segment is 160, so this message
    // costs ~5.15c. Crossing 160 doubles the per-missed-call cost, hence the
    // tight bound rather than the 306 two-segment ceiling.
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it('texts a mobile caller and rejects the call', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async (u, o) => { sent.push({ u, o }); return new Response('{}', { status: 201 }); });
    const res = await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kvStub() } });
    expect(res.headers.get('content-type')).toContain('xml');
    expect(await res.text()).toContain('<Reject/>');
    expect(sent).toHaveLength(1);
    expect(String(sent[0].o.body)).toContain('To=%2B61412345678');
  });

  it('does not text a landline caller', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    await onRequest({
      request: await signedReq({ ...PARAMS, From: '+61295333300' }),
      env: { ...ENV, ORDERS_KV: kvStub() },
    });
    expect(sent).toHaveLength(0);
  });

  it('does not text the same caller twice inside the dedup window', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const kv = kvStub({ 'missed:+61412345678': '1' });
    await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kv } });
    expect(sent).toHaveLength(0);
  });

  it('does not text a caller who has opted out', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    // sha256('+61412345678') — the same hashed key /api/review-sms writes.
    const key = `optout:${createHash('sha256').update('+61412345678').digest('hex')}`;
    const res = await onRequest({
      request: await signedReq(PARAMS),
      env: { ...ENV, ORDERS_KV: kvStub({ [key]: '1' }) },
    });
    expect(sent).toHaveLength(0);
    expect(await res.text()).toContain('<Reject/>');
  });

  it('fails closed on the opt-out check: no KV binding means no send', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    // Deliberately contrasts with dedup/cap, which tolerate a missing binding.
    await onRequest({ request: await signedReq(PARAMS), env: { ...ENV } });
    expect(sent).toHaveLength(0);
  });

  it('fails closed on the opt-out check when KV throws', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const kv = { get: async () => { throw new Error('kv down'); }, put: async () => {} };
    await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kv } });
    expect(sent).toHaveLength(0);
  });

  it('rejects an unsigned request without sending', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const req = await signedReq(PARAMS);
    req.headers.set('x-twilio-signature', 'forged');
    const res = await onRequest({ request: req, env: { ...ENV, ORDERS_KV: kvStub() } });
    expect(res.status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it('does not text once the daily cap is reached', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    // Same key shape and same date derivation as the handler.
    const day = new Date().toISOString().slice(0, 10);
    const kv = kvStub({ [`missed:count:${day}`]: String(DAILY_CAP) });
    const res = await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kv } });
    expect(await res.text()).toContain('<Reject/>');
    expect(sent).toHaveLength(0);
  });

  it('rejects an oversized body without reading it, but still returns Reject TwiML', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const req = {
      method: 'POST',
      url: URL_,
      headers: new Headers({ 'content-length': String(MAX_BODY_BYTES + 1) }),
      // If the handler reads the body before checking Content-Length, this
      // throws and the test fails loudly instead of silently passing.
      text: async () => { throw new Error('body should not have been read'); },
    };
    const res = await onRequest({ request: req, env: { ...ENV, ORDERS_KV: kvStub() } });
    expect(res.status).toBe(413);
    expect(res.headers.get('content-type')).toContain('xml');
    expect(await res.text()).toContain('<Reject/>');
    expect(sent).toHaveLength(0);
  });
});
