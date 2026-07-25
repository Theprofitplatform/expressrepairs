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
