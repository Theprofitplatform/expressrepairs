import { describe, it, expect } from 'vitest';
import { crossSells } from '../src/lib/shop.js';

describe('crossSells', () => {
  const mk = (id, category, priceCents) => ({ id, category, priceCents });
  const all = [
    mk('a', 'Audio', 1500),
    mk('b', 'Audio', 999),
    mk('c', 'Audio', 2500), // over $20 — excluded
    mk('d', 'Cases & Covers', 1200), // category not in cart — excluded
    mk('e', 'Audio', 1999),
    mk('f', 'Audio', 500),
  ];
  it('suggests under-$20 items from cart categories, excluding cart items', () => {
    const ids = crossSells(['a'], all, 4).map((p) => p.id);
    expect(ids).not.toContain('a'); // already in cart
    expect(ids).not.toContain('c'); // too expensive
    expect(ids).not.toContain('d'); // wrong category
    expect(ids).toEqual(['b', 'e', 'f']);
  });
  it('caps at n and is deterministic', () => {
    expect(crossSells(['a'], all, 2).map((p) => p.id)).toEqual(['b', 'e']);
    expect(crossSells([], all, 4)).toEqual([]);
  });
});
