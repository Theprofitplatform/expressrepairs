// Cloudflare Pages Function — POST /api/checkout
//
// Turns a cart ({items:[{id, qty}]}) into a Stripe Checkout Session and
// returns its hosted-payment url. Prices ALWAYS come from the synced catalog
// (src/data/products.json) — a client-sent price is ignored, so a tampered
// cart can't buy at $0.01. Stock and existence are checked here too.
//
// Env (Pages project → Settings → Environment variables):
//   STRIPE_SECRET_KEY (secret, required) — sk_live_… (sk_test_… while testing)
//
// Shipping: flat rate below the free threshold, free at/over it, and a free
// "Pickup in store" option always. Values live in src/data/products.js (SHOP).
import { PRODUCTS, SHOP } from '../../src/data/products.js';

const MAX_QTY = 20; // per line — matches the cart UI cap
const SITE = 'https://www.expressrepairs.com.au';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Same-site gate — same policy as lead.js.
const hostAllowed = (host, env) => {
  if (!host) return false;
  const extra = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (
    host === 'expressrepairs.com.au' ||
    host === 'www.expressrepairs.com.au' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    extra.includes(host)
  );
};
const sameSite = (request, env) => {
  const hostOf = (v) => { try { return new URL(v).host; } catch { return ''; } };
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: 'Invalid request body.' }); }

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length || items.length > 50) return json(400, { ok: false, error: 'Cart is empty.' });

  const lines = [];
  for (const { id, qty } of items) {
    const p = byId[id];
    const n = Number(qty);
    if (!p) return json(400, { ok: false, error: 'An item in your cart is no longer available.' });
    if (!Number.isInteger(n) || n < 1 || n > MAX_QTY) return json(400, { ok: false, error: 'Invalid quantity.' });
    if (!p.inStock) return json(400, { ok: false, error: `${p.name} is out of stock — please remove it from your cart.` });
    lines.push({ p, qty: n });
  }

  const key = env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { ok: false, error: 'Online payment is not set up yet — call us to order.' });

  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const freeShip = subtotal >= SHOP.freeShippingThresholdCents;

  // Stripe wants application/x-www-form-urlencoded with bracket nesting.
  const form = new URLSearchParams();
  const set = (k, v) => form.set(k, String(v));
  set('mode', 'payment');
  set('success_url', `${SITE}/shop/thanks/?session_id={CHECKOUT_SESSION_ID}`);
  set('cancel_url', `${SITE}/shop/cart/`);
  set('currency', SHOP.currency);
  set('phone_number_collection[enabled]', 'true');
  set('shipping_address_collection[allowed_countries][0]', 'AU');
  lines.forEach((l, i) => {
    set(`line_items[${i}][quantity]`, l.qty);
    set(`line_items[${i}][price_data][currency]`, SHOP.currency);
    set(`line_items[${i}][price_data][unit_amount]`, l.p.priceCents);
    set(`line_items[${i}][price_data][product_data][name]`, l.p.name);
    set(`line_items[${i}][price_data][product_data][metadata][id]`, l.p.id);
    set(`line_items[${i}][price_data][product_data][metadata][sku]`, l.p.sku);
  });
  const ship = (i, label, cents) => {
    set(`shipping_options[${i}][shipping_rate_data][display_name]`, label);
    set(`shipping_options[${i}][shipping_rate_data][type]`, 'fixed_amount');
    set(`shipping_options[${i}][shipping_rate_data][fixed_amount][currency]`, SHOP.currency);
    set(`shipping_options[${i}][shipping_rate_data][fixed_amount][amount]`, cents);
  };
  if (freeShip) ship(0, 'Free shipping (order over $99)', 0);
  else ship(0, 'Standard shipping (AusPost)', SHOP.flatShippingCents);
  ship(1, 'Pickup in store — Express Repairs', 0);

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const body = await res.json();
    if (!res.ok || !body.url) {
      console.error('Stripe session create failed', res.status, body?.error?.message);
      return json(503, { ok: false, error: 'Could not start checkout right now.' });
    }
    return json(200, { ok: true, url: body.url });
  } catch (err) {
    console.error('Stripe request error', err);
    return json(503, { ok: false, error: 'Could not start checkout right now.' });
  }
}
