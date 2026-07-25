import { describe, it, expect } from 'vitest';
import { pinEqual, MIN_PIN_LENGTH, PIN_MAX_FAILS, PIN_GLOBAL_MAX_FAILS, PIN_WINDOW_SECONDS } from '../functions/_shared.js';

describe('pinEqual', () => {
  it('matches only exact equal strings', () => {
    expect(pinEqual('secret-pin-123456', 'secret-pin-123456')).toBe(true);
    expect(pinEqual('secret-pin-123456', 'secret-pin-123457')).toBe(false);
    expect(pinEqual('short', 'shorter')).toBe(false);
    expect(pinEqual(undefined, 'x')).toBe(false);
  });
  it('exports the min length rule', () => {
    expect(MIN_PIN_LENGTH).toBe(6);
  });
});

// Fake KV — a Map-backed stand-in honouring the get/put/delete shapes the
// real ORDERS_KV binding exposes. `initial` seeds keys as plain strings.
// `putOptions` records the options object each put() was called with, keyed
// by key, so tests can assert expirationTtl was actually passed through —
// without this, deleting the TTL from recordPinFailure would pass silently
// and counters would never expire against the real KV binding.
function makeFakeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  const putOptions = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value, options) {
      store.set(key, String(value));
      putOptions.set(key, options);
    },
    async delete(key) {
      store.delete(key);
    },
    putOptions,
  };
}

const { onRequest } = await import('../functions/api/supplier-catalog.js');

const PIN = 'secret-pin-123456';
// Fabricated test data: sku/name/costCents do not correspond to real supplier rows.
// The repo is public, so cost prices must never leak in committed test fixtures.
const HOCO_ROWS = '[{"sku":"1001","name":"Fabricated Ring Stand","costCents":999}]';
const kv = { get: async (k) => (k === 'supplier-catalog:hoco' ? HOCO_ROWS : null) };
const env = { STAFF_PIN: PIN, ORDERS_KV: kv };

const req = (body, { method = 'POST', origin = 'https://expressrepairs.com.au', rawBody } = {}) => {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  const text = rawBody != null ? rawBody : JSON.stringify(body);
  const bytes = new TextEncoder().encode(text);
  return { method, headers, arrayBuffer: async () => bytes.buffer };
};

describe('POST /api/supplier-catalog', () => {
  it('rejects non-POST and cross-origin', async () => {
    expect((await onRequest({ request: req({}, { method: 'GET' }), env })).status).toBe(405);
    expect((await onRequest({ request: req({}, { origin: 'https://evil.example' }), env })).status).toBe(403);
  });
  it('503 when no PIN configured, 401 on wrong PIN', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { ORDERS_KV: kv } })).status).toBe(503);
    expect((await onRequest({ request: req({ pin: 'nope-nope-nope', supplier: 'hoco' }), env })).status).toBe(401);
    // wrong PIN + unknown supplier must still be 401 — the PIN gate runs before the
    // supplier whitelist, so an unauthenticated caller can't probe valid supplier names
    expect((await onRequest({ request: req({ pin: 'nope-nope-nope', supplier: 'ebay' }), env })).status).toBe(401);
  });
  it('falls back to REVIEW_SMS_PIN when STAFF_PIN unset', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { REVIEW_SMS_PIN: PIN, ORDERS_KV: kv } });
    expect(res.status).toBe(200);
  });
  it('400 on unknown supplier or non-object body', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'ebay' }), env })).status).toBe(400);
    expect((await onRequest({ request: req(null), env })).status).toBe(400);
  });
  it('returns the raw KV JSON with no-store, 404 when key missing', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toBe(HOCO_ROWS);
    const miss = await onRequest({ request: req({ pin: PIN, supplier: 'mobilemall' }), env });
    expect(miss.status).toBe(404);
  });
  it('rejects an oversized body with 413 before the PIN is even checked', async () => {
    // A WRONG pin in an oversized body must still come back 413, not 401 —
    // proving the size cap runs before request.pin is ever read.
    const res = await onRequest({
      request: req(null, { rawBody: JSON.stringify({ pin: 'wrong-wrong-wrong', supplier: 'hoco', pad: 'x'.repeat(17 * 1024) }) }),
      env,
    });
    expect(res.status).toBe(413);
  });
});

// req() with a per-call CF-Connecting-IP so the rate limiter buckets by IP.
const reqFrom = (ip, body, opts) => {
  const request = req(body, opts);
  request.headers.set('CF-Connecting-IP', ip);
  return request;
};

describe('PIN rate limiting', () => {
  const SHORT_PIN = '123456'; // 6 chars — the new floor
  const catalogKv = (extra = {}) => makeFakeKv({ 'supplier-catalog:hoco': HOCO_ROWS, ...extra });

  it('1. accepts a 6-character PIN (used to 503 under the old 10-char floor)', async () => {
    const res = await onRequest({
      request: reqFrom('10.0.0.1', { pin: SHORT_PIN, supplier: 'hoco' }),
      env: { STAFF_PIN: SHORT_PIN, ORDERS_KV: catalogKv() },
    });
    expect(res.status).toBe(200);
  });

  it('2. still 503s a 5-character PIN — the floor holds', async () => {
    const pin = '12345';
    const res = await onRequest({
      request: reqFrom('10.0.0.2', { pin, supplier: 'hoco' }),
      env: { STAFF_PIN: pin, ORDERS_KV: catalogKv() },
    });
    expect(res.status).toBe(503);
  });

  it('3. a wrong PIN increments the per-IP counter, returns 401, and sets expirationTtl on both counters', async () => {
    const kv = catalogKv();
    const res = await onRequest({
      request: reqFrom('10.0.0.3', { pin: 'nope-nope', supplier: 'hoco' }),
      env: { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv },
    });
    expect(res.status).toBe(401);
    expect(await kv.get('pinfail:10.0.0.3')).toBe('1');
    // Without a TTL these counters would never expire against real KV — a
    // handful of typos would lock a staff IP out permanently.
    expect(kv.putOptions.get('pinfail:10.0.0.3')).toEqual({ expirationTtl: PIN_WINDOW_SECONDS });
    expect(kv.putOptions.get('pinfail:global')).toEqual({ expirationTtl: PIN_WINDOW_SECONDS });
  });

  it('4. the 6th failure from one IP returns 429 BEFORE pinEqual runs — for a correct PIN AND a wrong one', async () => {
    const kv = catalogKv();
    const ip = '10.0.0.4';
    const envFor = { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv };
    for (let i = 0; i < PIN_MAX_FAILS; i++) {
      const res = await onRequest({ request: reqFrom(ip, { pin: 'wrong', supplier: 'hoco' }), env: envFor });
      expect(res.status).toBe(401);
    }
    // The IP is now over PIN_MAX_FAILS. A request with the CORRECT PIN must
    // still be rejected with 429 — proving the rate limit runs before pinEqual.
    const res = await onRequest({ request: reqFrom(ip, { pin: SHORT_PIN, supplier: 'hoco' }), env: envFor });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: 'Too many attempts. Wait 15 minutes.' });

    // A WRONG PIN from the same over-limit IP must ALSO be refused unread.
    // A reordered implementation (pinEqual checked before pinRateLimited)
    // would answer this 401 instead of 429 — which leaves brute-forcing
    // completely unthrottled AND leaks a correct-PIN oracle once over the
    // limit (401 = wrong, 429 = right). This is the assertion that actually
    // pins the ordering; the correct-PIN case above alone does not.
    const overLimitWrong = await onRequest({ request: reqFrom(ip, { pin: 'still-wrong', supplier: 'hoco' }), env: envFor });
    expect(overLimitWrong.status).toBe(429);
    expect(await kv.get(`pinfail:${ip}`)).toBe(String(PIN_MAX_FAILS)); // must not keep counting past the cap
  });

  it('4b. PIN_MAX_FAILS - 1 failures still permit the next attempt (off-by-one boundary)', async () => {
    const kv = catalogKv();
    const ip = '10.0.0.41';
    const envFor = { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv };
    for (let i = 0; i < PIN_MAX_FAILS - 1; i++) {
      const res = await onRequest({ request: reqFrom(ip, { pin: 'wrong', supplier: 'hoco' }), env: envFor });
      expect(res.status).toBe(401);
    }
    // Still under the cap — the next (correct-PIN) attempt must go through,
    // catching an implementation that blocks one request early.
    const res = await onRequest({ request: reqFrom(ip, { pin: SHORT_PIN, supplier: 'hoco' }), env: envFor });
    expect(res.status).toBe(200);
  });

  it('5. two different IPs each get their own budget — IP A locked does not lock IP B', async () => {
    const kv = catalogKv();
    const envFor = { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv };
    const ipA = '10.0.0.5';
    const ipB = '10.0.0.6';
    for (let i = 0; i < PIN_MAX_FAILS; i++) {
      await onRequest({ request: reqFrom(ipA, { pin: 'wrong', supplier: 'hoco' }), env: envFor });
    }
    const lockedA = await onRequest({ request: reqFrom(ipA, { pin: SHORT_PIN, supplier: 'hoco' }), env: envFor });
    expect(lockedA.status).toBe(429);

    const okB = await onRequest({ request: reqFrom(ipB, { pin: SHORT_PIN, supplier: 'hoco' }), env: envFor });
    expect(okB.status).toBe(200);
  });

  it('6. exceeding PIN_GLOBAL_MAX_FAILS returns 429 even for a fresh IP', async () => {
    const kv = catalogKv({ 'pinfail:global': String(PIN_GLOBAL_MAX_FAILS) });
    const res = await onRequest({
      request: reqFrom('10.0.0.7', { pin: SHORT_PIN, supplier: 'hoco' }),
      env: { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv },
    });
    expect(res.status).toBe(429);
  });

  it('7. a correct PIN clears that IP counter', async () => {
    const kv = catalogKv();
    const envFor = { STAFF_PIN: SHORT_PIN, ORDERS_KV: kv };
    const ip = '10.0.0.8';
    await onRequest({ request: reqFrom(ip, { pin: 'wrong', supplier: 'hoco' }), env: envFor });
    expect(await kv.get(`pinfail:${ip}`)).toBe('1');

    const res = await onRequest({ request: reqFrom(ip, { pin: SHORT_PIN, supplier: 'hoco' }), env: envFor });
    expect(res.status).toBe(200);
    expect(await kv.get(`pinfail:${ip}`)).toBeNull();
  });

  it('8. a KV that throws on read fails open — correct PIN still returns 200', async () => {
    const throwingKv = {
      async get(key) {
        if (key.startsWith('pinfail:')) throw new Error('KV unavailable');
        return key === 'supplier-catalog:hoco' ? HOCO_ROWS : null;
      },
      async put() {
        throw new Error('KV unavailable');
      },
      async delete() {
        throw new Error('KV unavailable');
      },
    };
    const res = await onRequest({
      request: reqFrom('10.0.0.9', { pin: SHORT_PIN, supplier: 'hoco' }),
      env: { STAFF_PIN: SHORT_PIN, ORDERS_KV: throwingKv },
    });
    expect(res.status).toBe(200);
  });
});
