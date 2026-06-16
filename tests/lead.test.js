import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/lead.js';

const ORIGIN = 'https://expressrepairs.com.au';
const ENV = { RESEND_API_KEY: 'test_key' };
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);

function makeReq({ method = 'POST', body = {}, origin = ORIGIN, contentLength } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (contentLength != null) headers.set('content-length', String(contentLength));
  return { method, headers, json: async () => body };
}

const okResend = () => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/lead', () => {
  it('rejects non-POST with 405', async () => {
    const res = await onRequest({ request: makeReq({ method: 'GET' }), env: ENV });
    expect(res.status).toBe(405);
  });

  it('rejects cross-origin / unknown-origin requests with 403 and sends nothing', async () => {
    const fetchSpy = okResend();
    const res = await onRequest({ request: makeReq({ origin: 'https://evil.example', body: { name: 'x', phone: '1' } }), env: ENV });
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts a request from the production origin', async () => {
    // Valid origin but missing fields → 400 (proves origin check passed, not 403).
    const res = await onRequest({ request: makeReq({ body: {} }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('honeypot: accepts silently (200) and sends NO email', async () => {
    const fetchSpy = okResend();
    const res = await onRequest({ request: makeReq({ body: { company: 'bot', name: 'x', phone: '123' } }), env: ENV });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('requires name and phone (400)', async () => {
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane' } }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email (400)', async () => {
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400', email: 'nope' } }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('returns 503 when RESEND_API_KEY is unset (never a silent drop)', async () => {
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' } }), env: {} });
    expect(res.status).toBe(503);
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' }, contentLength: 20000 }), env: ENV });
    expect(res.status).toBe(413);
  });

  it('happy path: sends via Resend with Bearer auth, maps the repair id, returns 200', async () => {
    const fetchSpy = okResend();
    const res = await onRequest({
      request: makeReq({ body: { name: 'Jane', phone: '0400 000 000', email: 'jane@example.com', model: 'iPhone 14', type: 'screen' } }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.headers.Authorization).toBe('Bearer test_key');
    const payload = JSON.parse(opts.body);
    expect(payload.subject).toContain('Jane');
    expect(payload.reply_to).toBe('jane@example.com');
    expect(payload.text).toContain('Screen Repair'); // id 'screen' → label via REPAIR_LABELS
  });

  it('escapes HTML in the email body (no injection into the shop inbox)', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: { name: '<img src=x onerror=alert(1)>', phone: '0400' } }), env: ENV });
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.html).toContain('&lt;img');
    expect(payload.html).not.toContain('<img src=x');
  });

  it('strips CR/LF from the subject (mail-header injection guard)', async () => {
    const fetchSpy = okResend();
    const evilName = ['Jane', 'Bcc: evil@example.com'].join(CR + LF);
    await onRequest({ request: makeReq({ body: { name: evilName, phone: '0400' } }), env: ENV });
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.subject.includes(CR)).toBe(false);
    expect(payload.subject.includes(LF)).toBe(false);
  });

  it('maps a Resend failure to 502 (form shows the call-us fallback)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream error', { status: 500 }));
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' } }), env: ENV });
    expect(res.status).toBe(502);
  });
});
