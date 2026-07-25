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
