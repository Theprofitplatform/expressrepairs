import { describe, it, expect, beforeEach, vi } from 'vitest';

// products.json ships empty until the first real DXPOS sync (see
// src/data/products.json / FIX 1) — this checkout flow still needs
// shaped product rows (in-stock + out-of-stock, real prices) to exercise
// pricing/stock/shipping-threshold logic, so it gets its own local fixture
// instead of depending on the public catalog file.
vi.mock('../src/data/products.json', () => ({
  default: [
    { id: 'X-1', name: 'Tempered Glass Screen Protector', category: 'Accessories', priceCents: 1500, image: 'https://cdn.example.com/products/X-1.jpg', thumb: 'https://cdn.example.com/products/X-1.jpg', inStock: true, sku: 'SP-TG-01' },
    { id: 'X-2', name: 'USB-C Fast Charger 20W', category: 'Cables & power', priceCents: 2500, image: 'https://cdn.example.com/products/X-2.jpg', thumb: 'https://cdn.example.com/products/X-2.jpg', inStock: true, sku: 'CH-20W' },
    { id: 'X-3', name: 'Wireless Earbuds', category: 'Audio', priceCents: 3900, image: 'https://cdn.example.com/products/X-3.jpg', thumb: 'https://cdn.example.com/products/X-3.jpg', inStock: false, sku: 'AU-EB-01' },
  ],
}));

const { onRequest } = await import('../functions/api/checkout.js');
const { PRODUCTS, SHOP } = await import('../src/data/products.js');

const ORIGIN = 'https://expressrepairs.com.au';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x' };
const inStock = PRODUCTS.find((p) => p.inStock);

function makeReq({ method = 'POST', body = {}, origin = ORIGIN, contentLength } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (contentLength != null) headers.set('content-length', String(contentLength));
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

  it('400s on malformed body (null or non-object)', async () => {
    const res = await onRequest({ request: makeReq({ body: null }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid request body.');
  });

  it('400s on items array containing null', async () => {
    const res = await onRequest({ request: makeReq({ body: { items: [null] } }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('An item in your cart is no longer available.');
  });

  it('400s when items is not an array', async () => {
    const res = await onRequest({ request: makeReq({ body: { items: 'notanarray' } }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Cart is empty.');
  });

  it('413s on oversized content-length', async () => {
    const res = await onRequest({ request: makeReq({ body: { items: [{ id: inStock.id, qty: 1 }] }, contentLength: 20000 }), env: ENV });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe('Request too large.');
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
