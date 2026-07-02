import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeAuMobile, buildReviewMessage, onRequest } from '../functions/api/review-sms.js';

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
    expect(msg).toContain('— The team');
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
    json: async () => JSON.parse(text),
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
