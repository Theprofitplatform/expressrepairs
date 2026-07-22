import { describe, it, expect } from 'vitest';
import { filterProducts, PRICE_BANDS } from '../src/shop/filter-core.js';

const IDX = [
  { id: 'a', name: 'iPhone 16 Pro hoco. Slim Case - Black', brand: 'Apple', category: 'Cases & Covers', priceCents: 1500 },
  { id: 'b', name: 'iPhone 16 Pro BLACKTECH Hard Case - Clear', brand: 'Apple', category: 'Cases & Covers', priceCents: 2500 },
  { id: 'c', name: 'Galaxy S24 Ultra BLACKTECH Case - Black', brand: 'Samsung', category: 'Cases & Covers', priceCents: 5500 },
  { id: 'd', name: 'iPhone 16 Pro Tempered Glass', brand: 'Apple', category: 'Screen Protection', priceCents: 1000 },
];

describe('filterProducts', () => {
  it('scopes by category', () => {
    expect(filterProducts(IDX, { category: 'Cases & Covers' }).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
  it('scopes by model key within a category', () => {
    expect(
      filterProducts(IDX, { category: 'Cases & Covers', model: 'iphone-16-pro' }).map((p) => p.id),
    ).toEqual(['a', 'b']);
  });
  it('filters by brand and price band', () => {
    expect(filterProducts(IDX, { brand: 'Samsung' }).map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(IDX, { price: 'under-20' }).map((p) => p.id)).toEqual(['a', 'd']);
    expect(filterProducts(IDX, { price: '20-50' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(IDX, { price: 'over-50' }).map((p) => p.id)).toEqual(['c']);
  });
  it('sorts by price both ways without mutating input order otherwise', () => {
    expect(filterProducts(IDX, { sort: 'price-asc' }).map((p) => p.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(filterProducts(IDX, { sort: 'price-desc' }).map((p) => p.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(filterProducts(IDX, {}).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('free-text q uses the shared search matcher', () => {
    expect(filterProducts(IDX, { q: 's24ultra' }).map((p) => p.id)).toEqual(['c']);
  });
  it('composes all filters', () => {
    const out = filterProducts(IDX, { category: 'Cases & Covers', brand: 'Apple', price: 'under-20', sort: 'price-asc' });
    expect(out.map((p) => p.id)).toEqual(['a']);
  });
});

describe('PRICE_BANDS', () => {
  it('bands are exhaustive and non-overlapping at boundaries', () => {
    for (const cents of [1999, 2000, 5000, 5001]) {
      expect(Object.values(PRICE_BANDS).filter((fn) => fn(cents))).toHaveLength(1);
    }
  });
});
