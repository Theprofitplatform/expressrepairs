import { describe, it, expect } from 'vitest';
import { specRows, relatedProducts } from '../src/lib/shop.js';

describe('specRows', () => {
  const p = { id: 'T-1', name: 'X', category: 'Audio', brand: 'Apple', sku: 'SKU9', priceCents: 1000 };
  it('builds label/value pairs from real data only', () => {
    const rows = Object.fromEntries(specRows(p));
    expect(rows.Brand).toBe('Apple');
    expect(rows.Category).toBe('Audio');
    expect(rows.SKU).toBe('SKU9');
    expect(rows.Dispatch).toMatch(/1–2 business days/);
  });
  it('omits empty fields', () => {
    expect(Object.fromEntries(specRows({ ...p, brand: '', sku: '' })).Brand).toBeUndefined();
  });
});

describe('relatedProducts', () => {
  const mk = (id, category, brand) => ({ id, category, brand });
  const all = [mk('a', 'Audio', 'Apple'), mk('b', 'Audio', 'Apple'), mk('c', 'Audio', 'Sony'), mk('d', 'Cases & Covers', 'Apple'), mk('e', 'Audio', 'Sony')];
  it('prefers same brand, same category, excludes self, caps at n', () => {
    expect(relatedProducts(all[0], all, 3).map((p) => p.id)).toEqual(['b', 'c', 'e']);
  });
  it('never includes the product itself', () => {
    expect(relatedProducts(all[0], all, 10).map((p) => p.id)).not.toContain('a');
  });
});
