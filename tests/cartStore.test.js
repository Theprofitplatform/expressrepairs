import { describe, it, expect, beforeEach } from 'vitest';
import { getCart, addToCart, setQty, clearCart, cartCount } from '../src/shop/cart-store.js';

// jsdom-free localStorage stub
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

describe('cart store', () => {
  it('adds, increments, sets, and clears', () => {
    addToCart('X-1'); addToCart('X-1'); addToCart('X-2');
    expect(getCart()).toEqual({ 'X-1': 2, 'X-2': 1 });
    setQty('X-1', 5);
    expect(getCart()['X-1']).toBe(5);
    setQty('X-2', 0);
    expect(getCart()).toEqual({ 'X-1': 5 });
    expect(cartCount(getCart())).toBe(5);
    clearCart();
    expect(getCart()).toEqual({});
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('er-cart', '{nope');
    expect(getCart()).toEqual({});
  });

  it('caps quantity at 20', () => {
    setQty('X-1', 99);
    expect(getCart()['X-1']).toBe(20);
  });
});
