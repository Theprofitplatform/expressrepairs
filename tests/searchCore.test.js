import { describe, it, expect } from 'vitest';
import { searchProducts } from '../src/shop/search-core.js';
import { PRODUCTS } from '../src/data/products.js';

// searchProducts caches normalized haystacks on the entries — copy so other
// tests' PRODUCTS assertions never see the _name/_all props.
const INDEX = PRODUCTS.map(({ id, name, brand, category, priceCents }) => ({ id, name, brand, category, priceCents }));

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

  it('returns nothing for garbage and empty queries', () => {
    expect(searchProducts(INDEX, 'zzqqxxyy').hits).toHaveLength(0);
    expect(searchProducts(INDEX, '   ').hits).toHaveLength(0);
  });
});
