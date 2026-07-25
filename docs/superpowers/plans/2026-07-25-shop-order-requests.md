# Shop Order Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer complete an order on the shop today, without Stripe, by routing the cart through the existing hardened `/api/lead` pipe as an order request.

**Architecture:** A new pure module `src/lib/orderRequest.js` resolves client-sent `{id, qty}` pairs against the catalogue and computes shipping/totals. Both the server (`functions/api/lead.js`) and the browser (`src/components/ShopCartPage.jsx`) import it, so the price the customer sees and the price the shop is emailed come from one function — and neither trusts a client-sent price. The cart's button reveals an inline form instead of redirecting to Stripe. `functions/api/checkout.js` is not touched.

**Tech Stack:** Astro 5 + React islands, Cloudflare Pages Functions, Vitest (node environment), Resend for email, Cloudflare KV (`ORDERS_KV`).

## Global Constraints

- **Never trust a client-sent price.** Every price, name, and stock flag is resolved from `PRODUCTS` server-side, mirroring `functions/api/checkout.js:20`.
- **No new dependencies.** Nothing gets added to `package.json`.
- **Vitest runs in the `node` environment** (`vitest.config.js`) with no jsdom and no React Testing Library. Do not write React component tests — put logic in `src/lib/` and test it there. This is why Task 1 exists.
- **Do not modify** `functions/api/checkout.js`, `functions/api/stripe-webhook.js`, `tests/checkout.test.js`, or `tests/stripeWebhook.test.js`. They stay tested and waiting for a Stripe key.
- **No feature flag.** There is deliberately no `paymentsEnabled` toggle.
- **Copy rules:** never promise a Stripe receipt, never invent a review count or rating. Real facts only: phone `(02) 9533 3300`, pickup at Riverwood Plaza, Riverwood NSW 2210.
- **Money is integer cents** everywhere. Format for display only, via `fmtPrice` from `src/data/products.js`.
- **Run tests with** `npm test` (all) or `npx vitest run tests/<file>` (one file).
- **Work in a git worktree.** A parallel agent commits to this repo and there are already uncommitted changes to `sections.jsx`, `accessories.js`, `schema.js`, and `global.css`. Two agents in one working tree has broken a deploy here before.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/orderRequest.js` *(create)* | Pure: validate + resolve cart lines against the catalogue, compute shipping and totals. No I/O, no DOM. |
| `tests/orderRequest.test.js` *(create)* | Unit tests for the above. |
| `functions/api/lead.js` *(modify)* | Add the `source: 'order'` branch — build the order email and KV record. |
| `tests/lead.test.js` *(modify)* | Order-branch tests. |
| `src/components/ShopCartPage.jsx` *(modify)* | Replace the Stripe redirect with an inline order form. |
| `src/pages/shop/thanks.astro` *(modify)* | Fix the copy; remove the `Purchase` pixel event. |
| `tests/build-output.test.js` *(modify)* | Assert the thanks page no longer promises a Stripe receipt. |

---

### Task 1: Pure order-request logic

**Files:**
- Create: `src/lib/orderRequest.js`
- Test: `tests/orderRequest.test.js`

**Interfaces:**
- Consumes: nothing — this is the base layer. Catalogue and shipping config are passed in as arguments so tests never import `src/data/products.js` (which zod-parses 6,825 products on import).
- Produces:
  - `MAX_QTY: number` (20)
  - `MAX_LINES: number` (50)
  - `shippingCents(subtotalCents: number, fulfilment: string, shop: {flatShippingCents, freeShippingThresholdCents}) => number`
  - `orderTotals(items: Array<{id, qty}>, byId: Record<string, Product>, fulfilment: string, shop) => {lines, subtotalCents, shippingCents, totalCents} | {error: string}` where `lines: Array<{id, name, priceCents, qty, lineTotalCents}>`

- [ ] **Step 1: Write the failing test**

Create `tests/orderRequest.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { orderTotals, shippingCents, MAX_QTY } from '../src/lib/orderRequest.js';

const SHOP = { flatShippingCents: 1095, freeShippingThresholdCents: 9900 };
const byId = {
  a: { id: 'a', name: 'Case', priceCents: 2995, inStock: true },
  b: { id: 'b', name: 'Cable', priceCents: 1500, inStock: true },
  gone: { id: 'gone', name: 'Old Charger', priceCents: 999, inStock: false },
};

describe('shippingCents', () => {
  it('is free for pickup regardless of subtotal', () => {
    expect(shippingCents(500, 'pickup', SHOP)).toBe(0);
    expect(shippingCents(50000, 'pickup', SHOP)).toBe(0);
  });
  it('is flat rate for delivery under the threshold', () => {
    expect(shippingCents(9899, 'delivery', SHOP)).toBe(1095);
  });
  it('is free for delivery at or over the threshold', () => {
    expect(shippingCents(9900, 'delivery', SHOP)).toBe(0);
    expect(shippingCents(20000, 'delivery', SHOP)).toBe(0);
  });
});

describe('orderTotals', () => {
  it('resolves names and prices from the catalogue, ignoring client-sent values', () => {
    const out = orderTotals(
      [{ id: 'a', qty: 2, priceCents: 1, name: 'Free Case' }],
      byId,
      'pickup',
      SHOP,
    );
    expect(out.error).toBeUndefined();
    expect(out.lines).toEqual([
      { id: 'a', name: 'Case', priceCents: 2995, qty: 2, lineTotalCents: 5990 },
    ]);
    expect(out.subtotalCents).toBe(5990);
  });

  it('computes subtotal, shipping and total together', () => {
    const out = orderTotals([{ id: 'a', qty: 1 }, { id: 'b', qty: 1 }], byId, 'delivery', SHOP);
    expect(out.subtotalCents).toBe(4495);
    expect(out.shippingCents).toBe(1095);
    expect(out.totalCents).toBe(5590);
  });

  it('rejects an unknown product id', () => {
    const out = orderTotals([{ id: 'nope', qty: 1 }], byId, 'pickup', SHOP);
    expect(out.error).toBe('An item in your cart is no longer available.');
  });

  it('rejects an out-of-stock product by name', () => {
    const out = orderTotals([{ id: 'gone', qty: 1 }], byId, 'pickup', SHOP);
    expect(out.error).toBe('Old Charger is out of stock — please remove it from your cart.');
  });

  it('rejects a quantity outside 1..MAX_QTY or non-integer', () => {
    for (const qty of [0, -1, MAX_QTY + 1, 1.5, 'two', null, undefined, NaN]) {
      expect(orderTotals([{ id: 'a', qty }], byId, 'pickup', SHOP).error).toBe('Invalid quantity.');
    }
  });

  it('rejects an empty cart and an oversized cart', () => {
    expect(orderTotals([], byId, 'pickup', SHOP).error).toBe('Cart is empty.');
    const many = Array.from({ length: 51 }, () => ({ id: 'a', qty: 1 }));
    expect(orderTotals(many, byId, 'pickup', SHOP).error).toBe('Cart is empty.');
  });

  it('rejects a malformed item entry instead of throwing', () => {
    for (const item of [null, 'a', ['a'], 42]) {
      expect(orderTotals([item], byId, 'pickup', SHOP).error)
        .toBe('An item in your cart is no longer available.');
    }
  });

  it('rejects a fulfilment choice that is not pickup or delivery', () => {
    expect(orderTotals([{ id: 'a', qty: 1 }], byId, '', SHOP).error)
      .toBe('Please choose pickup or delivery.');
    expect(orderTotals([{ id: 'a', qty: 1 }], byId, 'teleport', SHOP).error)
      .toBe('Please choose pickup or delivery.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/orderRequest.test.js`
Expected: FAIL — cannot resolve `../src/lib/orderRequest.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/orderRequest.js`:

```js
// Pure order-request logic, shared by the cart island (ShopCartPage.jsx) and
// the /api/lead order branch. Kept free of I/O and DOM so it can be unit
// tested in the node vitest environment — and so the totals the customer sees
// are computed by the same code that builds the shop's order email.
//
// The catalogue and shipping config are passed in rather than imported, so
// tests don't pay the cost of zod-parsing the full 6,825-product catalogue.

export const MAX_QTY = 20; // per line — matches the cart UI and /api/checkout
export const MAX_LINES = 50;

const FULFILMENT = ['pickup', 'delivery'];

export function shippingCents(subtotalCents, fulfilment, shop) {
  if (fulfilment === 'pickup') return 0;
  return subtotalCents >= shop.freeShippingThresholdCents ? 0 : shop.flatShippingCents;
}

// Returns { lines, subtotalCents, shippingCents, totalCents } or { error }.
// Every value comes from `byId` — a price or name sent by the client is
// ignored entirely, so a tampered cart cannot misrepresent an order.
export function orderTotals(items, byId, fulfilment, shop) {
  if (!FULFILMENT.includes(fulfilment)) {
    return { error: 'Please choose pickup or delivery.' };
  }
  const list = Array.isArray(items) ? items : [];
  if (!list.length || list.length > MAX_LINES) return { error: 'Cart is empty.' };

  const lines = [];
  for (const item of list) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { error: 'An item in your cart is no longer available.' };
    }
    const p = byId[item.id];
    if (!p) return { error: 'An item in your cart is no longer available.' };
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { error: 'Invalid quantity.' };
    }
    if (p.inStock === false) {
      return { error: `${p.name} is out of stock — please remove it from your cart.` };
    }
    lines.push({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      qty,
      lineTotalCents: p.priceCents * qty,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const ship = shippingCents(subtotal, fulfilment, shop);
  return { lines, subtotalCents: subtotal, shippingCents: ship, totalCents: subtotal + ship };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/orderRequest.test.js`
Expected: PASS — 9 tests.

Note on the `qty: 'two'` and `qty: null` cases: `Number('two')` is `NaN` and `Number(null)` is `0`, both of which fail `Number.isInteger` / the range check, so they land on `'Invalid quantity.'` as asserted.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orderRequest.js tests/orderRequest.test.js
git commit -m "feat(shop): pure order-request totals shared by cart and lead API"
```

---

### Task 2: `/api/lead` order branch

**Files:**
- Modify: `functions/api/lead.js`
- Test: `tests/lead.test.js`

**Interfaces:**
- Consumes: `orderTotals`, `MAX_QTY` from `src/lib/orderRequest.js` (Task 1); `PRODUCTS`, `SHOP`, `fmtPrice` from `src/data/products.js`.
- Produces: `POST /api/lead` accepting `{source: 'order', name, phone, email?, fulfilment: 'pickup'|'delivery', address?, details?, items: [{id, qty}]}`. Later tasks (the cart form) post exactly this shape.

Note: importing `PRODUCTS` makes this Function bundle the merged catalogue. `functions/api/checkout.js` already does exactly this, so the bundle cost is already paid and the pattern is established. It does make `tests/lead.test.js` slower to import, which is expected.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lead.test.js`, inside the file but after the existing `describe` block. Uses the existing `makeReq`, `ORIGIN`, `ENV`, and `okResend` helpers already defined at the top of that file.

```js
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

  it('labels pickup as free shipping and delivery as charged below the threshold', async () => {
    const fetchSpy = okResend();
    await onRequest({ request: makeReq({ body: orderBody({ items: [{ id: a.id, qty: 1 }] }) }), env: ENV });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).text).toContain('Pickup in store');
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).text).toContain('Free');
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lead.test.js`
Expected: FAIL — orders are treated as contact leads, so the subject says "New quote request" and the KV record has no `items`/`value`.

- [ ] **Step 3: Implement the order branch**

Three edits to `functions/api/lead.js`.

**3a.** Add imports beside the existing `import { json, sameSite } from '../_shared.js';`:

```js
import { PRODUCTS, SHOP, fmtPrice } from '../../src/data/products.js';
import { orderTotals } from '../../src/lib/orderRequest.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
```

**3b.** Extend the source derivation. Replace:

```js
  const source = rawSource === 'booking' ? 'booking' : isLanding ? 'landing' : 'contact';
```

with:

```js
  const isOrder = rawSource === 'order';
  const source = isOrder
    ? 'order'
    : rawSource === 'booking'
      ? 'booking'
      : isLanding
        ? 'landing'
        : 'contact';
  // Delivery address may contain newlines; capped like details.
  const address = String(data.address ?? '').trim().slice(0, 500);
```

**3c.** After the existing `if (email && !emailValid(email))` check and *before* the `RESEND_API_KEY` check, resolve the order so a bad cart 400s whether or not email is configured:

```js
  // Order requests carry a cart. Prices and names are resolved from the
  // catalogue here — a client-sent price is ignored (see orderRequest.js).
  let order = null;
  if (isOrder) {
    order = orderTotals(data.items, byId, oneLine(data.fulfilment, 20), SHOP);
    if (order.error) return json(400, { ok: false, error: order.error });
  }
```

**3d.** Replace the `heading` and `rows` construction. Replace:

```js
  const heading = source === 'booking' ? 'New booking request' : 'New quote request';
  const rows = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ['Device', model],
    ['Repair', repairType],
    ['Quote', data.quote ? oneLine(data.quote, 60) : ''],
    ['Campaign', campaign],
    ['Details', details],
  ].filter(([, v]) => v);
```

with:

```js
  const heading = isOrder
    ? 'New order request'
    : source === 'booking'
      ? 'New booking request'
      : 'New quote request';

  // The html renderer turns \n into <br>, so a multi-line value is fine here.
  const orderRows = order
    ? [
        ['Fulfilment', data.fulfilment === 'pickup'
          ? 'Pickup in store — Riverwood Plaza'
          : 'Delivery (AusPost)'],
        ['Address', address],
        ['Items', order.lines.map((l) => `${l.qty} × ${l.name} — ${fmtPrice(l.lineTotalCents)}`).join('\n')],
        ['Subtotal', fmtPrice(order.subtotalCents)],
        ['Shipping', order.shippingCents === 0 ? 'Free' : fmtPrice(order.shippingCents)],
        ['Total', fmtPrice(order.totalCents)],
      ]
    : [
        ['Device', model],
        ['Repair', repairType],
        ['Quote', data.quote ? oneLine(data.quote, 60) : ''],
        ['Campaign', campaign],
      ];

  const rows = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ...orderRows,
    ['Details', details],
  ].filter(([, v]) => v);
```

**3e.** Extend the subject. Replace:

```js
    subject: `${heading}: ${name}${model ? ` — ${model}` : ''}${campaign ? ` [${campaign}]` : ''}`,
```

with:

```js
    subject: order
      ? `${heading}: ${name} — ${order.lines.length} item${order.lines.length === 1 ? '' : 's'}, ${fmtPrice(order.totalCents)}`
      : `${heading}: ${name}${model ? ` — ${model}` : ''}${campaign ? ` [${campaign}]` : ''}`,
```

**3f.** Extend the KV record. Replace:

```js
        JSON.stringify({ source, campaign, type: repairType, model, quote: oneLine(data.quote, 60) }),
```

with:

```js
        JSON.stringify(
          order
            ? { source, items: order.lines.length, value: order.totalCents }
            : { source, campaign, type: repairType, model, quote: oneLine(data.quote, 60) },
        ),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lead.test.js`
Expected: PASS — all existing lead tests plus the 10 new order tests. The existing tests must still pass unchanged; if a contact-lead test broke, the `orderRows` ternary is wrong.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS. `tests/checkout.test.js` in particular must be untouched and green.

- [ ] **Step 6: Commit**

```bash
git add functions/api/lead.js tests/lead.test.js
git commit -m "feat(shop): accept order requests via /api/lead with catalogue-resolved prices"
```

---

### Task 3: Cart order form

**Files:**
- Modify: `src/components/ShopCartPage.jsx`

**Interfaces:**
- Consumes: `orderTotals`, `shippingCents` from `src/lib/orderRequest.js` (Task 1); the `POST /api/lead` order shape from Task 2; existing `sendLead` from `src/lib/sendLead.js`; existing cart store from `src/shop/cart-store.js`.
- Produces: no exports beyond the existing default `ShopCartPage` component.

**Verification note:** vitest runs in the `node` environment with no jsdom, so this component has no unit test — which is exactly why its logic lives in `src/lib/orderRequest.js` and is tested in Task 1. Step 4 is a manual browser check against a real dev server. Do not add jsdom or React Testing Library to satisfy a habit.

- [ ] **Step 1: Replace the checkout handler with order-form state**

In `src/components/ShopCartPage.jsx`, replace the imports at the top:

```js
import { useEffect, useState } from 'react';
import { PRODUCTS, SHOP, fmtPrice } from '../data/products.js';
import { getCart, setQty, addToCart, cartCount } from '../shop/cart-store.js';
import { crossSells } from '../lib/shop.js';
import { shippingCents } from '../lib/orderRequest.js';
import { sendLead } from '../lib/sendLead.js';
```

Then replace the whole `const checkout = async () => { ... };` block (currently lines 21–48) with:

```js
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', fulfilment: 'pickup', address: '', company: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submitOrder = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await sendLead({
      source: 'order',
      name: form.name,
      phone: form.phone,
      email: form.email,
      fulfilment: form.fulfilment,
      address: form.fulfilment === 'delivery' ? form.address : '',
      company: form.company, // honeypot — real customers leave it empty
      items: lines.map(([id, qty]) => ({ id, qty })),
    });
    if (res.ok) {
      window.fbq?.('track', 'Lead', {
        content_ids: lines.map(([id]) => id),
        content_type: 'product',
        value: total / 100,
        currency: 'AUD',
        num_items: cartCount(Object.fromEntries(lines)),
      });
      location.href = '/shop/thanks/';
      return;
    }
    setError('We couldn’t send your order just now — please call us on (02) 9533 3300 and we’ll take it over the phone.');
    setBusy(false);
  };
```

- [ ] **Step 2: Use the shared shipping calc in the summary**

Shipping now depends on the customer's pickup/delivery choice, so it must be computed *after* `form` exists.

**Delete** the existing `const freeShip = subtotal >= SHOP.freeShippingThresholdCents;` line (currently line 16, above the `useState` calls you added in Step 1).

**Add** these three lines immediately after the `const set = (k) => ...` helper from Step 1, so they sit below `useState({ ... fulfilment: 'pickup' ... })`:

```js
  const ship = shippingCents(subtotal, form.fulfilment, SHOP);
  const total = subtotal + ship;
  const freeShip = ship === 0;
```

Order matters: `subtotal` is declared above (it depends only on `cart`), `form` is declared in Step 1, and `submitOrder` reads `total` at call time rather than at definition time — so a `const total` declared after `submitOrder` in the same scope is fine.

Then in the summary block, replace the shipping line and add a total:

```js
        <div className="quote-line">
          <span>Shipping</span>
          <span style={{ fontWeight: 700 }}>{freeShip ? 'FREE' : fmtPrice(ship)}</span>
        </div>
        <div className="quote-line">
          <span>Total</span>
          <span style={{ fontWeight: 700 }}>{fmtPrice(total)}</span>
        </div>
```

And replace the `<div className="quote-note">Or choose free pickup in store at checkout.</div>` with:

```js
        <div className="quote-note">Free pickup in store at Riverwood Plaza.</div>
```

The "Add $X more for free shipping" paragraph below the summary stays as-is, but wrap it so it only shows for delivery — pickup is always free, so the nudge is noise:

```js
      {form.fulfilment === 'delivery' && (
        <p style={{ marginTop: 12 }}>
          {freeShip
            ? '✓ Free shipping unlocked.'
            : <>Add <strong>{fmtPrice(SHOP.freeShippingThresholdCents - subtotal)}</strong> more for free shipping — otherwise {fmtPrice(SHOP.flatShippingCents)} flat / free pickup.</>}
        </p>
      )}
```

- [ ] **Step 3: Replace the checkout button with the order form**

Replace the final button (currently `Checkout securely`) with:

```js
      {!showForm ? (
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
          Order these items
        </button>
      ) : (
        <form onSubmit={submitOrder} style={{ marginTop: 20, display: 'grid', gap: 12, maxWidth: 420 }}>
          <p style={{ margin: 0, color: 'var(--muted, #555)' }}>
            Send us your order and we&rsquo;ll call to confirm it and take payment.
          </p>
          <label>
            Name*
            <input required value={form.name} onChange={set('name')} autoComplete="name"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <label>
            Phone*
            <input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <legend style={{ padding: '0 6px' }}>How would you like it?</legend>
            <label style={{ display: 'block' }}>
              <input type="radio" name="fulfilment" value="pickup"
                checked={form.fulfilment === 'pickup'} onChange={set('fulfilment')} />{' '}
              Pickup in store — Riverwood Plaza (free)
            </label>
            <label style={{ display: 'block', marginTop: 6 }}>
              <input type="radio" name="fulfilment" value="delivery"
                checked={form.fulfilment === 'delivery'} onChange={set('fulfilment')} />{' '}
              Deliver to me
            </label>
          </fieldset>
          {form.fulfilment === 'delivery' && (
            <label>
              Delivery address*
              <textarea required rows={3} value={form.address} onChange={set('address')} autoComplete="street-address"
                style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
            </label>
          )}
          {/* Honeypot — hidden from people, filled by bots. Matches lead.js. */}
          <input type="text" name="company" value={form.company} onChange={set('company')}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Sending…' : `Send order — ${fmtPrice(total)}`}
          </button>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted, #555)' }}>
            No payment is taken online. We&rsquo;ll call you on the number above to confirm.
          </p>
        </form>
      )}
```

The existing `{error && <div className="form-error" role="alert" …>}` block stays where it is, immediately above this.

- [ ] **Step 4: Verify in a real browser**

Run: `npm run dev`

Then check, at `http://localhost:4321/shop/`:
1. Add two different products to the cart, open `/shop/cart/`.
2. Confirm subtotal, shipping and total are right, and that switching pickup ⇄ delivery changes shipping to `FREE` / `$10.95` and updates the total and the button label.
3. Confirm choosing delivery reveals the required address field.
4. Click **Send order** with the name field empty — the browser should block submission (native `required`).
5. Fill it in and submit. Locally `RESEND_API_KEY` is unset, so `/api/lead` returns 503 and you should see the "call us on (02) 9533 3300" error rather than a false success. That is the correct local result — it proves the failure path.

Note: port 4322 has a stale preview server on this machine — use the port `astro dev` actually prints.

- [ ] **Step 5: Confirm nothing references the removed checkout path**

Run: `grep -rn "api/checkout\|er-checkout-value\|InitiateCheckout" src/`
Expected: no matches in `src/` (matches remain in `functions/api/checkout.js` and `tests/`, which is correct — those stay).

- [ ] **Step 6: Run the suite and commit**

```bash
npm test
git add src/components/ShopCartPage.jsx
git commit -m "feat(shop): cart sends an order request instead of a dead Stripe checkout"
```

---

### Task 4: Thanks page copy and pixel

**Files:**
- Modify: `src/pages/shop/thanks.astro`
- Test: `tests/build-output.test.js`

**Interfaces:**
- Consumes: the redirect to `/shop/thanks/` from Task 3.
- Produces: nothing consumed by later tasks.

Why the pixel goes: firing Meta `Purchase` when no money has changed hands would report phantom revenue into ad account 1909285833096577 and corrupt its optimisation. `Lead` now fires from the cart form in Task 3, which is the truthful event.

- [ ] **Step 1: Write the failing test**

Add to `tests/build-output.test.js`. The existing file builds the site once in `beforeAll` and reads `dist/index.html`; read the thanks page the same way inside a new describe block:

```js
describe('built shop thanks page', () => {
  const thanks = () => readFileSync('dist/shop/thanks/index.html', 'utf8');

  it('does not promise a Stripe receipt (payments are not enabled)', () => {
    expect(thanks()).not.toContain('Stripe receipt');
  });

  it('tells the customer we will call to confirm and take payment', () => {
    expect(thanks()).toContain('call you to confirm');
  });

});
```

Deliberately **not** asserted here: the absence of the `Purchase` pixel. Astro bundles a page `<script>` into a separate `/_astro/*.js` asset, so `dist/shop/thanks/index.html` never contains that code either way — an assertion on the HTML would pass before the fix as well as after, which is a false green. The pixel removal is verified by the source grep in Step 5 instead.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/build-output.test.js`
Expected: FAIL — the page still contains "Stripe receipt" and the `Purchase` event. This runs a full Astro build first and takes 60–90s.

- [ ] **Step 3: Update the page**

In `src/pages/shop/thanks.astro`, replace the `<div class="form-success" …>` body text with:

```
        Order received — thank you! We&rsquo;ll call you to confirm your order and take payment,
        then pack it for pickup at Riverwood Plaza or send it out. If you need us sooner,
        call (02) 9533 3300.
```

And replace the whole `<script>` block with:

```astro
  <script>
    import { clearCart } from '../../shop/cart-store.js';
    // The order request has been emailed to the shop; the cart's job is done.
    // No Purchase event fires here — no payment has been taken. The cart form
    // fires Meta `Lead` on submit, which is what actually happened.
    clearCart();
  </script>
```

Also update the page `description` frontmatter, which still describes a paid order:

```astro
  description="Thanks for your order request — we'll call you to confirm and arrange pickup or delivery."
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/build-output.test.js`
Expected: PASS.

- [ ] **Step 5: Verify the Purchase pixel is gone from source**

Run: `grep -rn "Purchase\|er-checkout-value" src/`
Expected: no matches. (`Lead` and `InitiateCheckout` in `src/components/AdTracking.astro` or the booking flow are unrelated and may remain — only `Purchase` and the `er-checkout-value` handshake must be gone.)

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 7: Commit**

```bash
git add src/pages/shop/thanks.astro tests/build-output.test.js
git commit -m "fix(shop): thanks page reflects order requests, drops phantom Purchase pixel"
```

---

## Done criteria

- [ ] A customer can add items, choose pickup or delivery, submit name + phone, and reach `/shop/thanks/` with an emptied cart.
- [ ] The shop receives an email titled `New order request: <name> — <n> items, $<total>` with catalogue prices.
- [ ] A tampered cart (fake price, unknown id, qty 0 or 21, empty cart) is rejected with 400 and no email.
- [ ] `ORDERS_KV` gains a `lead:*` record with `source: 'order'`, `items`, and `value`, and no customer PII.
- [ ] No Meta `Purchase` event fires anywhere for an unpaid order.
- [ ] `functions/api/checkout.js`, `functions/api/stripe-webhook.js`, and their tests are unmodified — `git diff --stat main` should not list them.
- [ ] `npm test` passes.

## Deploying

Not part of the task list — the owner deploys. For reference, per this project's architecture the live domain is served by the Cloudflare **Pages** project, not the Worker:

```bash
npm run build
wrangler pages deploy dist --project-name expressrepairs --branch main
```

`RESEND_API_KEY` must already be set in that Pages project (it is — contact forms work today). No new environment variables are needed.
