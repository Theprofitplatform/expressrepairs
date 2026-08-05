import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeAuMobile, buildReviewMessage, onRequest } from '../functions/api/review-sms.js';
import { PIN_MAX_FAILS } from '../functions/_shared.js';

describe('normalizeAuMobile', () => {
  it('normalises common AU mobile formats to E.164', () => {
    expect(normalizeAuMobile('0412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('+61 412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('61412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('(04) 1234-5678')).toBe('+61412345678');
  });

  it('rejects landlines, short numbers and junk', () => {
    expect(normalizeAuMobile('0298765432')).toBeNull(); // Sydney landline
    expect(normalizeAuMobile('0412345')).toBeNull();     // too short
    expect(normalizeAuMobile('')).toBeNull();
    expect(normalizeAuMobile('not a phone')).toBeNull();
    expect(normalizeAuMobile(null)).toBeNull();
  });
});

describe('buildReviewMessage', () => {
  it('includes the name, brand, review link and sign-off', () => {
    const msg = buildReviewMessage('Sam', 'https://g.page/r/abc/review');
    expect(msg).toContain('Hi Sam,');
    expect(msg).toContain('Xpress Phone Repairs at Riverwood Plaza');
    expect(msg).toContain('https://g.page/r/abc/review');
    // Plain-hyphen sign-off (GSM-7, not an em-dash).
    expect(msg).toContain(' - The team.');
    // Spam Act: every commercial SMS needs a working opt-out. The Xpress alpha
    // tag can't receive replies, so the opt-out points at the shop mobile.
    expect(msg).toContain('To opt out, call or text 0415 303 300.');
  });

  it('does not gate the ask on the customer already being happy', () => {
    // Review gating — asking only the satisfied — breaches Google's review
    // policies. The message must go out the same to everyone.
    const msg = buildReviewMessage('Sam', 'https://g.page/r/abc/review');
    expect(msg).not.toMatch(/if you(’|')?re happy|enjoyed|were satisfied|went well\?/i);
  });

  it('asks for a specific detail, not just a star rating', () => {
    // 13 of the shop's 22 reviews were unquotable four-word ratings. Prompting
    // for the actual repair produces better testimonials and better local SEO.
    expect(buildReviewMessage('Sam', 'https://g.page/r/abc/review')).toContain('what we fixed');
  });

  it('stays within 2 GSM-7 segments even with the longest allowed name', () => {
    const msg = buildReviewMessage('x'.repeat(40), 'https://g.page/r/Ce96yvDNgJmJEAI/review');
    // 2 concatenated GSM-7 segments = 153 * 2. Exceeding this bills a 3rd.
    // These chars live in GSM-7's extension table and cost 2 septets each.
    const septets = msg.length + (msg.match(/[[\]{}\\~^|€]/g) || []).length;
    expect(septets).toBeLessThanOrEqual(306);
    // Any non-GSM-7 char (em dash, smart quote) silently halves capacity.
    expect(msg).toMatch(/^[ -~\n]*$/);
  });

  it('falls back to "there" for a blank name and strips control chars', () => {
    expect(buildReviewMessage('', 'L')).toContain('Hi there,');
    expect(buildReviewMessage('A\nB', 'L')).toContain('Hi A B,');
  });
});

const ORIGIN = 'https://expressrepairs.com.au';
const PIN = 'test-pin-abc123'; // >= MIN_PIN_LENGTH (10)
const FULL_ENV = {
  CLICKSEND_USERNAME: 'u',
  CLICKSEND_API_KEY: 'k',
  REVIEW_SMS_PIN: PIN,
  REVIEW_LINK: 'https://g.page/r/abc/review',
};

function makeReq({ method = 'POST', body = {}, rawBody, origin = ORIGIN } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  const text = rawBody != null ? rawBody : JSON.stringify(body);
  const bytes = new TextEncoder().encode(text);
  return {
    method,
    headers,
    arrayBuffer: async () => bytes.buffer,
  };
}

const clickSendOk = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: { messages: [{ status: 'SUCCESS' }] } }), { status: 200 })
  );

describe('POST /api/review-sms', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects non-POST with 405', async () => {
    const res = await onRequest({ request: makeReq({ method: 'GET' }), env: FULL_ENV });
    expect(res.status).toBe(405);
  });

  it('rejects cross-origin with 403 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ origin: 'https://evil.example', body: { pin: PIN, mobile: '0412345678' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a body over the size cap with 413 (real bytes, not Content-Length)', async () => {
    const res = await onRequest({ request: makeReq({ rawBody: 'x'.repeat(17 * 1024) }), env: FULL_ENV });
    expect(res.status).toBe(413);
  });

  it('rejects a non-object JSON body (null / scalar) with 400 and sends nothing', async () => {
    const spy = clickSendOk();
    expect((await onRequest({ request: makeReq({ rawBody: 'null' }), env: FULL_ENV })).status).toBe(400);
    expect((await onRequest({ request: makeReq({ rawBody: '"hi"' }), env: FULL_ENV })).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await onRequest({ request: makeReq({ rawBody: '{not json' }), env: FULL_ENV });
    expect(res.status).toBe(400);
  });

  it('returns 503 when REVIEW_SMS_PIN is unset (never an open endpoint)', async () => {
    const spy = clickSendOk();
    const { REVIEW_SMS_PIN, ...noPin } = FULL_ENV;
    const res = await onRequest({ request: makeReq({ body: { pin: PIN, mobile: '0412345678' } }), env: noPin });
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns 503 when REVIEW_SMS_PIN is too short (weak-secret guard) and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: 'short', mobile: '0412345678' } }),
      env: { ...FULL_ENV, REVIEW_SMS_PIN: 'short' },
    });
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a wrong PIN with 401 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: 'wrong-pin-000000', mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an invalid mobile with 400 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0298765432', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns 503 when ClickSend creds are unset and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: { REVIEW_SMS_PIN: PIN, REVIEW_LINK: 'https://g.page/r/abc/review' },
    });
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends on the happy path and returns the normalised number', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0412 345 678', name: 'Sam', device: 'iPhone 13' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, to: '+61412345678' });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe('https://rest.clicksend.com/v3/sms/send');
    const sent = JSON.parse(opts.body);
    expect(sent.messages[0].to).toBe('+61412345678');
    expect(sent.messages[0].from).toBe('Xpress');
    expect(sent.messages[0].body).toContain('Hi Sam,');
    expect(sent.messages[0].body).toContain('https://g.page/r/abc/review');
    expect(opts.headers.Authorization).toMatch(/^Basic /);
  });

  it('clamps a long CLICKSEND_SENDER to 11 chars', async () => {
    const spy = clickSendOk();
    await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: { ...FULL_ENV, CLICKSEND_SENDER: 'SuperLongSenderName' },
    });
    const sent = JSON.parse(spy.mock.calls[0][1].body);
    expect(sent.messages[0].from).toBe('SuperLongSe');
    expect(sent.messages[0].from.length).toBe(11);
  });

  it('returns 503 when ClickSend reports a per-message failure (HTTP 200)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { messages: [{ status: 'INVALID_RECIPIENT' }] } }), { status: 200 })
    );
    const res = await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(503);
  });

  it('returns 503 on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    const res = await onRequest({
      request: makeReq({ body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(503);
  });
});

// Fake KV — same Map-backed shape used in tests/supplierOrderApi.test.js,
// including putOptions so a test can assert the expirationTtl was passed.
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

function reqFrom(ip, opts) {
  const request = makeReq(opts);
  request.headers.set('CF-Connecting-IP', ip);
  return request;
}

describe('POST /api/review-sms — PIN rate limiting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('accepts a 10-character PIN (the floor)', async () => {
    const spy = clickSendOk();
    const tenCharPin = '6543216543';
    const res = await onRequest({
      request: reqFrom('20.0.0.1', { body: { pin: tenCharPin, mobile: '0412345678', name: 'Sam' } }),
      env: { ...FULL_ENV, REVIEW_SMS_PIN: tenCharPin, ORDERS_KV: makeFakeKv() },
    });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('the 6th failure from one IP returns 429 before pinEqual runs — for a correct PIN AND a wrong one', async () => {
    const spy = clickSendOk();
    const kv = makeFakeKv();
    const ip = '20.0.0.2';
    const envFor = { ...FULL_ENV, ORDERS_KV: kv };
    for (let i = 0; i < PIN_MAX_FAILS; i++) {
      const res = await onRequest({
        request: reqFrom(ip, { body: { pin: 'wrong-pin-000000', mobile: '0412345678' } }),
        env: envFor,
      });
      expect(res.status).toBe(401);
    }
    const res = await onRequest({
      request: reqFrom(ip, { body: { pin: PIN, mobile: '0412345678' } }),
      env: envFor,
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: 'Too many attempts. Wait 15 minutes.' });
    expect(spy).not.toHaveBeenCalled();

    // A WRONG PIN from the same over-limit IP must ALSO be refused unread —
    // this is the assertion that actually pins the ordering (see the
    // matching case in tests/supplierOrderApi.test.js for why the
    // correct-PIN case alone doesn't).
    const overLimitWrong = await onRequest({
      request: reqFrom(ip, { body: { pin: 'still-wrong-000000', mobile: '0412345678' } }),
      env: envFor,
    });
    expect(overLimitWrong.status).toBe(429);
    expect(await kv.get(`pinfail:${ip}`)).toBe(String(PIN_MAX_FAILS)); // must not keep counting past the cap
    expect(spy).not.toHaveBeenCalled();
  });

  it('records a PII-free log entry after a successful send', async () => {
    clickSendOk();
    const kv = makeFakeKv();
    const res = await onRequest({
      request: reqFrom('20.0.0.4', { body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: { ...FULL_ENV, ORDERS_KV: kv },
    });
    expect(res.status).toBe(200);
    const key = [...kv.putOptions.keys()].find((k) => k.startsWith('reviewsms:'));
    expect(key).toBeTruthy();
    // Must never carry the customer's number or name.
    expect(key).not.toContain('412345678');
    expect(await kv.get(key)).toBe(JSON.stringify({ sent: true }));
  });

  it('a correct PIN clears that IP counter', async () => {
    const spy = clickSendOk();
    const kv = makeFakeKv();
    const ip = '20.0.0.3';
    const envFor = { ...FULL_ENV, ORDERS_KV: kv };
    await onRequest({ request: reqFrom(ip, { body: { pin: 'wrong-pin-000000', mobile: '0412345678' } }), env: envFor });
    expect(await kv.get(`pinfail:${ip}`)).toBe('1');

    const res = await onRequest({
      request: reqFrom(ip, { body: { pin: PIN, mobile: '0412345678', name: 'Sam' } }),
      env: envFor,
    });
    expect(res.status).toBe(200);
    expect(await kv.get(`pinfail:${ip}`)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
