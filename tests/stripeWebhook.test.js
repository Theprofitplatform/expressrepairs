import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/stripe-webhook.js';

const SECRET = 'whsec_testsecret';
const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 'rk_x' };

async function sign(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${t},v1=${hex}`;
}

const EVENT = JSON.stringify({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 4085, customer_details: { name: 'Jo', email: 'jo@x.com', phone: '+614' }, shipping_details: { address: { line1: '1 St', city: 'Sydney', postal_code: '2000', state: 'NSW' } }, shipping_cost: { amount_total: 1095 } } },
});

function makeReq(payload, sigHeader) {
  const headers = new Headers();
  if (sigHeader) headers.set('stripe-signature', sigHeader);
  return { method: 'POST', headers, text: async () => payload };
}

// fetch mock: Stripe line_items GET, Stripe session-expand GET, Resend POST
const mockUpstreams = (resendStatus = 200, fulfilmentLabel = 'Standard shipping (AusPost)') =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = String(url);
    if (u.includes('line_items')) {
      return new Response(JSON.stringify({ data: [{ description: 'Case', quantity: 2, amount_total: 3800 }] }), { status: 200 });
    }
    if (u.includes('api.stripe.com')) {
      return new Response(JSON.stringify({ shipping_cost: { shipping_rate: { display_name: fulfilmentLabel } } }), { status: 200 });
    }
    return new Response('{}', { status: resendStatus });
  });

beforeEach(() => vi.restoreAllMocks());

describe('POST /api/stripe-webhook', () => {
  it('400s on missing or invalid signature, sends nothing', async () => {
    const spy = mockUpstreams();
    expect((await onRequest({ request: makeReq(EVENT, null), env: ENV })).status).toBe(400);
    expect((await onRequest({ request: makeReq(EVENT, 't=1,v1=deadbeef'), env: ENV })).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('400s on stale timestamp (replay guard)', async () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET, old)), env: ENV });
    expect(res.status).toBe(400);
  });

  it('emails the order on checkout.session.completed and 200s', async () => {
    const spy = mockUpstreams();
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    const resendCall = spy.mock.calls.find(([u]) => String(u).includes('resend'));
    expect(resendCall).toBeTruthy();
    const body = JSON.parse(resendCall[1].body);
    expect(body.subject).toContain('order');
    expect(body.text).toContain('Case');
    expect(body.text).toContain('Jo');
  });

  it('200s and ignores other event types without emailing', async () => {
    const spy = mockUpstreams();
    const other = JSON.stringify({ type: 'payment_intent.created', data: { object: {} } });
    const res = await onRequest({ request: makeReq(other, await sign(other, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('200s and ignores an unpaid session (delayed-notification payment method) without emailing', async () => {
    const spy = mockUpstreams();
    const unpaid = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_unpaid', payment_status: 'unpaid', amount_total: 4085, customer_details: { name: 'Jo', email: 'jo@x.com' } } },
    });
    const res = await onRequest({ request: makeReq(unpaid, await sign(unpaid, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('prints the shipping-rate display name as a Fulfilment row in the email', async () => {
    mockUpstreams(200, 'Pickup in store — Express Repairs');
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    const spy = globalThis.fetch;
    const resendCall = spy.mock.calls.find(([u]) => String(u).includes('resend'));
    const body = JSON.parse(resendCall[1].body);
    expect(body.text).toContain('Pickup in store — Express Repairs');
  });

  it('falls back to collected_information.shipping_details for the address (newer Stripe API versions)', async () => {
    const spy = mockUpstreams();
    const evt = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_new_api',
          payment_status: 'paid',
          amount_total: 4085,
          customer_details: { name: 'Jo', email: 'jo@x.com' },
          collected_information: { shipping_details: { address: { line1: '9 New St', city: 'Sydney', postal_code: '2000', state: 'NSW' } } },
        },
      },
    });
    const res = await onRequest({ request: makeReq(evt, await sign(evt, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    const resendCall = spy.mock.calls.find(([u]) => String(u).includes('resend'));
    const body = JSON.parse(resendCall[1].body);
    expect(body.text).toContain('9 New St');
  });

  it('503s when the email fails so Stripe retries', async () => {
    mockUpstreams(500);
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET)), env: ENV });
    expect(res.status).toBe(503);
  });

  it('sanitizes CR/LF in the customer name and puts the session id in the subject', async () => {
    const spy = mockUpstreams();
    const crlf = String.fromCharCode(13) + String.fromCharCode(10);
    const evilName = `Jo${crlf}Bcc: attacker@evil.com`;
    const evilEvent = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc123',
          payment_status: 'paid',
          amount_total: 4085,
          customer_details: { name: evilName, email: 'jo@x.com', phone: '+614' },
        },
      },
    });
    const res = await onRequest({ request: makeReq(evilEvent, await sign(evilEvent, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    const resendCall = spy.mock.calls.find(([u]) => String(u).includes('resend'));
    const body = JSON.parse(resendCall[1].body);
    expect(body.subject).not.toContain(String.fromCharCode(13));
    expect(body.subject).not.toContain(String.fromCharCode(10));
    expect(body.subject).toContain('cs_test_abc123');
  });

  it('413s on an oversized Content-Length, sends nothing', async () => {
    const spy = mockUpstreams();
    const headers = new Headers();
    headers.set('content-length', String(20 * 1024));
    const req = { method: 'POST', headers, text: async () => EVENT };
    const res = await onRequest({ request: req, env: ENV });
    expect(res.status).toBe(413);
    expect(spy).not.toHaveBeenCalled();
  });
});
