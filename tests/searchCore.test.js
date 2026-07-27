import { describe, it, expect } from 'vitest';
import { searchProducts } from '../src/shop/search-core.js';
import { PRODUCTS } from '../src/data/products.js';

// searchProducts caches normalized haystacks on the entries — copy so other
// tests' PRODUCTS assertions never see the _name/_all props.
const INDEX = PRODUCTS.map(({ id, name, brand, category, priceCents, gtin, sku }) => ({ id, name, brand, category, priceCents, gtin, sku }));

describe('searchProducts', () => {
  it('matches glued model names like "iphone15"', () => {
    const { hits, partial } = searchProducts(INDEX, 'iphone15 case');
    expect(partial).toBe(false);
    expect(hits.length).toBeGreaterThan(10);
    // Top hits tie on score, so don't pin an exact #1 — a HOCO multi-model
    // name ("iPhone 13/14/15") can tie-break ahead of a single-model one
    // now that leading SKU bracket codes no longer pad HOCO names. Assert
    // the digit-letter-boundary match actually surfaces an iPhone 15 product
    // near the top instead.
    expect(hits.slice(0, 3).some((h) => /iPhone 15\b/.test(h.name))).toBe(true);
  });

  it('matches "s24ultra" against "S24 Ultra" names', () => {
    const { hits } = searchProducts(INDEX, 's24ultra');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toMatch(/S24 Ultra/);
  });

  it('understands synonyms (cover -> case, cord -> cable)', () => {
    expect(searchProducts(INDEX, 'iphone 15 cover').hits.length).toBeGreaterThan(10);
    expect(searchProducts(INDEX, 'usb c cord').hits.length).toBeGreaterThan(10);
  });

  it('degrades gracefully on one typo instead of blanking', () => {
    const { hits, partial } = searchProducts(INDEX, 'iphone 15 csae');
    expect(partial).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toMatch(/iPhone/);
  });

  it('ranks name matches above brand/category-only matches', () => {
    const { hits } = searchProducts(
      [
        { id: 'A', name: 'Cheap widget', brand: 'Apple', category: 'Audio', priceCents: 1 },
        { id: 'B', name: 'Apple EarPods', brand: '', category: 'Audio', priceCents: 1 },
      ],
      'apple',
    );
    expect(hits[0].id).toBe('B');
  });

  it('finds a product by its full barcode, ranked first', () => {
    const coded = PRODUCTS.find((p) => p.gtin);
    const { hits } = searchProducts(INDEX, coded.gtin);
    expect(hits[0].id).toBe(coded.id);
  });

  it('matches a barcode mid-scan (prefix), but never on a short digit run', () => {
    const coded = PRODUCTS.find((p) => p.gtin);
    expect(searchProducts(INDEX, coded.gtin.slice(0, 9)).hits.map((h) => h.id)).toContain(coded.id);
    // "15" is iPhone 15, not every EAN containing 15.
    expect(searchProducts(INDEX, 'iphone 15 case').hits[0].name).toMatch(/iPhone/i);
  });

  it('finds a product by SKU, punctuation and case ignored', () => {
    // The fallback for the 1,594 HOCO lines with no published barcode.
    const p = PRODUCTS.find((x) => /^[A-Z]+\d+-[A-Z0-9]+$/.test(x.sku));
    for (const q of [p.sku, p.sku.toLowerCase(), p.sku.replace(/-/g, '')]) {
      expect(searchProducts(INDEX, q).hits.map((h) => h.id)).toContain(p.id);
    }
  });

  it('never treats an ordinary word or a short model number as a code', () => {
    // "case" has no digit; "15" is too short — both must stay name searches.
    expect(searchProducts(INDEX, 'case').hits[0].name).toMatch(/case|cover/i);
    expect(searchProducts(INDEX, 'iphone 15').hits[0].name).toMatch(/iPhone/i);
  });

  it('returns nothing for garbage and empty queries', () => {
    expect(searchProducts(INDEX, 'zzqqxxyy').hits).toHaveLength(0);
    expect(searchProducts(INDEX, '   ').hits).toHaveLength(0);
  });
});
