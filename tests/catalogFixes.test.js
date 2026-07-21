import { describe, it, expect } from 'vitest';
import { applyCatalogFixes, fixName, fixBrand, PLACEHOLDER_PRICE_CENTS } from '../scripts/catalog-fixes.mjs';
import { PRODUCTS } from '../src/data/products.js';

const p = (over = {}) => ({
  id: 'X-1', name: 'Case', category: 'Accessories', brand: '', priceCents: 1000,
  image: 'https://x/i.webp', thumb: 'https://x/i.webp', inStock: true, sku: 's',
  ...over,
});

describe('fixName', () => {
  it('repairs typos, encoding, and spacing', () => {
    expect(fixName('BLACKTECH USB-A To Lightinng Cable  100cm - white')).toBe(
      'BLACKTECH USB-A to Lightning Cable 100cm - White',
    );
    expect(fixName('iWatch＆SAM strap')).toBe('iWatch & SAM strap');
    expect(fixName('hoco Duke Ⅴ true wireless BT headset - ilky white')).toBe(
      'hoco. Duke V True Wireless Earbuds - Milky White',
    );
    expect(fixName('Tab A7 10.4inchs Case')).toBe('Tab A7 10.4 inch Case');
    expect(fixName('car holder(air outlet) Type-C - metal gray')).toBe(
      'car holder (air outlet) USB-C - Metal Grey',
    );
  });

  it('is idempotent', () => {
    for (const prod of PRODUCTS.slice(0, 200)) {
      expect(fixName(prod.name)).toBe(prod.name);
    }
  });
});

describe('fixBrand', () => {
  it('keeps device platforms, cleans jargon, extracts the maker from the name', () => {
    expect(fixBrand('Apple', 'iPhone 15 BLACKTECH Case')).toBe('Apple');
    expect(fixBrand('Max Profit Picks', 'hoco. X59 cable')).toBe('hoco.');
    expect(fixBrand('hold', 'Generic widget')).toBe('');
  });
});

describe('applyCatalogFixes', () => {
  it('hides placeholder prices, repair parts, and fixture ids', () => {
    expect(applyCatalogFixes([p({ priceCents: PLACEHOLDER_PRICE_CENTS })])).toHaveLength(0);
    expect(applyCatalogFixes([p({ brand: 'Parts' })])).toHaveLength(0);
    expect(applyCatalogFixes([p({ id: 'X-05296' })])).toHaveLength(0); // watch dummy
  });

  it('keeps the cheapest of exact-name duplicates', () => {
    const out = applyCatalogFixes([
      p({ id: 'X-2', priceCents: 4990 }),
      p({ id: 'X-3', priceCents: 2990 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('X-3');
  });

  it('recategorizes AirPods cases and mislabeled screen protectors', () => {
    const [a] = applyCatalogFixes([p({ name: 'AirPods 2 BLACKTECH Silicone Case - Blue', category: 'Audio' })]);
    expect(a.category).toBe('Cases & Covers');
    const [g] = applyCatalogFixes([p({ name: 'iPhone 12 LITO Tempered Glass - Black', category: 'Audio' })]);
    expect(g.category).toBe('Screen Protection');
    // …but a case-with-glass combo is not dragged out of its category
    const [c] = applyCatalogFixes([p({ name: 'Watch Case With Tempered Glass', category: 'Cases & Covers' })]);
    expect(c.category).toBe('Cases & Covers');
  });
});

// The committed products.json must already be in fixed form.
describe('products.json data quality', () => {
  it('has no broken names', () => {
    for (const prod of PRODUCTS) {
      expect(prod.name, prod.id).not.toMatch(/\s{2}|inchs|Lightinng|＆|Ⅴ/);
    }
  });

  it('has no placeholder prices or duplicate names', () => {
    expect(PRODUCTS.filter((x) => x.priceCents === PLACEHOLDER_PRICE_CENTS)).toHaveLength(0);
    const names = PRODUCTS.map((x) => x.name);
    expect(names.length).toBe(new Set(names).size);
  });

  it('has no internal jargon in the brand field', () => {
    const junk = ['Parts', 'hold', 'nan', 'Max Profit Picks', 'Buy 1 Get 1 Free', 'Cables', 'Handsfree'];
    for (const prod of PRODUCTS) expect(junk, prod.id).not.toContain(prod.brand);
  });
});
