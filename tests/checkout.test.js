import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/checkout.js';
import { PRODUCTS, SHOP } from '../src/data/products.js';

const ORIGIN = 'https://expressrepairs.com.au';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x' };
const inStock = PRODUCTS.find((p) => p.inStock);

function makeReq({ method = 'POST', body = {}, origin = ORIGIN } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return { method, headers, json: async () => body };
}

const okStripe = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }), { status: 200 }),
  );

beforeEach(() => vi.restoreAllMocks());

describe('POST /api/checkout', () => {
  it('rejects non-POST (405) and cross-origin (403)', async () => {
    expect((await onRequest({ request: makeReq({ method: 'GET' }), env: ENV })).status).toBe(405);
    expect((await onRequest({ request: makeReq({ origin: 'https://evil.example' }), env: ENV })).status).toBe(403);
  });

  it('400s on empty cart, unknown product, bad qty', async () => {
    for (const items of [[], [{ id: 'nope-999', qty: 1 }], [{ id: inStock.id, qty: 0 }], [{ id: inStock.id, qty: 21 }]]) {
      const res = await onRequest({ request: makeReq({ body: { items } }), env: ENV });
      expect(res.status).toBe(400);
    }
  });

  it('400s on out-of-stock items when any exist', async () => {
    const oos = PRODUCTS.find((p) => !p.inStock);
    if (!oos) return; // seed data may be all in stock after a real sync
    const res = await onRequest({ request: makeReq({ body: { items: [{ id: oos.id, qty: 1 }] } }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('503s when Stripe key not configured', async () => {
    const res = await onRequest({ request: makeReq({ body: { items: [{ id: inStock.id, qty: 1 }] } }), env: {} });
    expect(res.status).toBe(503);
  });

  it('uses SERVER prices (ignores any client-sent price) and returns the Stripe url', async () => {
    const fetchSpy = okStripe();
    const res = await onRequest({
      request: makeReq({ body: { items: [{ id: inStock.id, qty: 2, priceCents: 1 }] } }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toContain('checkout.stripe.com');
    const sent = fetchSpy.mock.calls[0][1].body.toString();
    expect(sent).toContain(`unit_amount%5D=${inStock.priceCents}`); // encoded [unit_amount]=serverPrice
    expect(sent).not.toContain('unit_amount%5D=1&');
  });

  it('offers free shipping at/over the threshold, flat rate below it', async () => {
    const fetchSpy = okStripe();
    const qtyForFree = Math.ceil(SHOP.freeShippingThresholdCents / inStock.priceCents);
    await onRequest({ request: makeReq({ body: { items: [{ id: inStock.id, qty: Math.min(20, qtyForFree) }] } }), env: ENV });
    const sent = fetchSpy.mock.calls[0][1].body.toString();
    if (inStock.priceCents * Math.min(20, qtyForFree) >= SHOP.freeShippingThresholdCents) {
      expect(sent).not.toContain(String(SHOP.flatShippingCents));
    } else {
      expect(sent).toContain(String(SHOP.flatShippingCents));
    }
    expect(sent).toContain('Pickup+in+store');
  });
});
