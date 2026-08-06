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

  it('maps a Resend failure to 503 (passes through CF edge; form shows call-us fallback)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream error', { status: 500 }));
    const res = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' } }), env: ENV });
    expect(res.status).toBe(503);
  });

  it('surfaces the landing-page campaign slug in the email (attribution)', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400 000 000', type: 'screen', source: 'landing:screen-repair' } }), env: ENV });
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.text).toContain('screen-repair');      // campaign slug in body
    expect(payload.text).toContain('Source: landing form');
    expect(payload.subject).toContain('screen-repair');   // at-a-glance inbox triage
  });

  it('reports the ad attribution stashed on the landing page (email + KV)', async () => {
    const fetchSpy = okResend();
    const store = new Map();
    const env = { ...ENV, ORDERS_KV: { put: async (k, v) => void store.set(k, v) } };
    const attr = ['utm_source=google', 'utm_campaign=nbn-riverwood', 'gclid=abc123'].join('&');
    await onRequest({
      request: makeReq({ body: { name: 'Jane', phone: '0400 000 000', source: 'landing:nbn', attr } }),
      env,
    });
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.text).toContain('nbn-riverwood');
    expect(JSON.parse([...store.values()][0]).attr).toBe(attr);
  });

  it('counts a delivered lead in KV — attribution only, no customer PII', async () => {
    okResend();
    const store = new Map();
    const env = { ...ENV, ORDERS_KV: { put: async (k, v) => void store.set(k, v) } };
    await onRequest({
      request: makeReq({ body: { name: 'Jane', phone: '0400 000 000', email: 'jane@example.com', model: 'iPhone 14', type: 'screen', source: 'landing:screen-repair' } }),
      env,
    });
    expect(store.size).toBe(1);
    const [key, value] = [...store.entries()][0];
    expect(key.startsWith('lead:')).toBe(true);
    expect(key).toMatch(/^lead:\d{4}-\d{2}-\d{2}T/); // prefix-listable by month
    expect(JSON.parse(value)).toMatchObject({ source: 'landing', campaign: 'screen-repair', type: 'Screen Repair', model: 'iPhone 14' });
    expect(value).not.toContain('Jane');
    expect(value).not.toContain('0400');
    expect(value).not.toContain('jane@example.com');
  });

  it('does not count an undelivered lead, and a KV failure never breaks delivery', async () => {
    // Resend down → 503, nothing counted.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const store = new Map();
    const kv = { put: async (k, v) => void store.set(k, v) };
    const failed = await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' } }), env: { ...ENV, ORDERS_KV: kv } });
    expect(failed.status).toBe(503);
    expect(store.size).toBe(0);

    // KV down but the email went out → still 200, the lead is not lost.
    vi.restoreAllMocks();
    okResend();
    const res = await onRequest({
      request: makeReq({ body: { name: 'Jane', phone: '0400' } }),
      env: { ...ENV, ORDERS_KV: { put: async () => { throw new Error('kv down'); } } },
    });
    expect(res.status).toBe(200);
  });

  it('a plain contact lead carries no campaign row and stays source "contact"', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: { name: 'Jane', phone: '0400' } }), env: ENV });
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.text).toContain('Source: contact form');
    expect(payload.text).not.toContain('Campaign:');
  });
});

describe('POST /api/lead — order requests', () => {
  // Two real catalogue ids/prices are read at test time so the assertions
  // can't drift from the synced catalogue.
  let a, b, price;
  beforeEach(async () => {
    const { PRODUCTS, fmtPrice } = await import('../src/data/products.js');
    [a, b] = PRODUCTS.filter((p) => p.inStock !== false).slice(0, 2);
    price = fmtPrice;
  });

  const orderBody = (over = {}) => ({
    source: 'order',
    name: 'Jane Smith',
    phone: '0400 000 000',
    fulfilment: 'pickup',
    items: [{ id: a.id, qty: 2 }],
    ...over,
  });

  it('sends an order email with catalogue prices, ignoring a client-sent price', async () => {
    const fetchSpy = okResend();
    const res = await onRequest({
      request: makeReq({ body: orderBody({ items: [{ id: a.id, qty: 2, priceCents: 1 }] }) }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.subject).toContain('New order request');
    expect(sent.subject).toContain('Jane Smith');
    // Catalogue price × 2, never the client's 1 cent.
    expect(sent.text).toContain(price(a.priceCents * 2));
    expect(sent.text).not.toContain('$0.02');
    expect(sent.text).toContain(a.name);
  });

  it('links each supplier-sourced item to its supplier product page', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const inStock = PRODUCTS.filter((p) => p.inStock !== false);
    const hoco = inStock.find((p) => p.id.startsWith('H-'));
    const mm = inStock.find((p) => p.id.startsWith('M-'));
    const fetchSpy = okResend();
    await onRequest({
      request: makeReq({ body: orderBody({ items: [{ id: hoco.id, qty: 1 }, { id: mm.id, qty: 1 }] }) }),
      env: ENV,
    });
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.text).toContain(`https://www.hoco.com.au/shop/product/${hoco.id.slice(2)}`);
    expect(sent.text).toContain(`https://mobilemall.com.au/search/${mm.id.slice(2)}`);
    expect(sent.html).toContain(`<a href="https://www.hoco.com.au/shop/product/${hoco.id.slice(2)}">order from supplier</a>`);
    expect(sent.html).toContain(`<a href="https://mobilemall.com.au/search/${mm.id.slice(2)}">order from supplier</a>`);
  });

  it('gives a DXPOS-native (X-) item no supplier link', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const x = PRODUCTS.find((p) => p.id.startsWith('X-') && p.inStock !== false);
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: orderBody({ items: [{ id: x.id, qty: 1 }] }) }), env: ENV });
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.text).not.toContain('supplier:');
    expect(sent.html).not.toContain('order from supplier');
  });

  it('labels pickup as free shipping and delivery as charged below the threshold', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: orderBody({ items: [{ id: a.id, qty: 1 }] }) }), env: ENV });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).text).toContain('Pickup in store');
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).text).toContain('Free');

    const fetchSpy2 = okResend();
    await onRequest({
      request: makeReq({ body: orderBody({ fulfilment: 'delivery', items: [{ id: a.id, qty: 1 }] }) }),
      env: ENV,
    });
    const deliveryText = JSON.parse(fetchSpy2.mock.calls[0][1].body).text;
    expect(deliveryText).toContain('Delivery (AusPost)');
    expect(deliveryText).toContain('$10.95');
  });

  it('labels fulfilment consistently with the shipping charged even with a trailing space (regression)', async () => {
    const fetchSpy = okResend();
    await onRequest({
      request: makeReq({ body: orderBody({ fulfilment: 'pickup ', items: [{ id: a.id, qty: 1 }] }) }),
      env: ENV,
    });
    const text = JSON.parse(fetchSpy.mock.calls[0][1].body).text;
    expect(text).toContain('Pickup in store — Riverwood Plaza');
    expect(text).not.toContain('Delivery (AusPost)');
  });

  it('includes the delivery address when delivery is chosen', async () => {
    const fetchSpy = okResend();
    await onRequest({
      request: makeReq({ body: orderBody({ fulfilment: 'delivery', address: '1 Test St, Riverwood NSW 2210' }) }),
      env: ENV,
    });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).text).toContain('1 Test St, Riverwood NSW 2210');
  });

  it('rejects an unknown product id with 400 and sends nothing', async () => {
    const fetchSpy = okResend();
    const res = await onRequest({ request: makeReq({ body: orderBody({ items: [{ id: 'no-such-id', qty: 1 }] }) }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('An item in your cart is no longer available.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a bad quantity with 400', async () => {
    const res = await onRequest({ request: makeReq({ body: orderBody({ items: [{ id: a.id, qty: 21 }] }) }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid quantity.');
  });

  it('rejects an empty cart with 400', async () => {
    const res = await onRequest({ request: makeReq({ body: orderBody({ items: [] }) }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Cart is empty.');
  });

  it('rejects a missing fulfilment choice with 400', async () => {
    const res = await onRequest({ request: makeReq({ body: orderBody({ fulfilment: undefined }) }), env: ENV });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Please choose pickup or delivery.');
  });

  it('still requires name and phone for an order', async () => {
    const res = await onRequest({ request: makeReq({ body: orderBody({ phone: '' }) }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('escapes HTML in an order email (no injection into the shop inbox)', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: orderBody({ name: '<script>x</script>' }) }), env: ENV });
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.html).not.toContain('<script>x</script>');
    expect(sent.html).toContain('&lt;script&gt;');
  });

  it('records the order in KV with item count and value, and no customer PII', async () => {
    okResend();
    const put = vi.fn().mockResolvedValue(undefined);
    const res = await onRequest({
      request: makeReq({ body: orderBody({ items: [{ id: a.id, qty: 1 }, { id: b.id, qty: 1 }] }) }),
      env: { ...ENV, ORDERS_KV: { put } },
    });
    expect(res.status).toBe(200);
    const [key, value] = put.mock.calls[0];
    expect(key).toMatch(/^lead:/);
    const rec = JSON.parse(value);
    expect(rec.source).toBe('order');
    expect(rec.items).toBe(2);
    expect(rec.value).toBe(a.priceCents + b.priceCents);
    expect(value).not.toContain('Jane Smith');
    expect(value).not.toContain('0400 000 000');
  });
});
