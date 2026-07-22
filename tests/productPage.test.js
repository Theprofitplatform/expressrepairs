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
  it('HOCO-supplied products (H- ids) quote 2–3 business days', () => {
    expect(Object.fromEntries(specRows({ ...p, id: 'H-8250' })).Dispatch).toMatch(/2–3 business days/);
  });
  it('omits empty fields', () => {
    expect(Object.fromEntries(specRows({ ...p, brand: '', sku: '' })).Brand).toBeUndefined();
  });
});

describe('relatedProducts', () => {
  const mk = (id, name = 'Generic', category, brand) => ({ id, name, category, brand });
  const all = [mk('a', 'Generic A', 'Audio', 'Apple'), mk('b', 'Generic B', 'Audio', 'Apple'), mk('c', 'Generic C', 'Audio', 'Sony'), mk('d', 'Generic D', 'Cases & Covers', 'Apple'), mk('e', 'Generic E', 'Audio', 'Sony')];
  it('prefers same brand, same category, excludes self, caps at n', () => {
    expect(relatedProducts(all[0], all, 3).map((p) => p.id)).toEqual(['b', 'c', 'e']);
  });
  it('never includes the product itself', () => {
    expect(relatedProducts(all[0], all, 10).map((p) => p.id)).not.toContain('a');
  });
});

describe('relatedProducts model preference', () => {
  const mk = (id, name, brand = 'Apple', category = 'Cases & Covers') => ({ id, name, brand, category });
  it('prefers same device model over same brand', () => {
    const p = mk('p1', 'iPhone 16 Pro hoco. Slim Case');
    const all = [
      p,
      mk('b1', 'iPhone 14 Case', 'Apple'),
      mk('m1', 'iPhone 16 Pro BLACKTECH Hard Case', 'BLACKTECH'),
      mk('m2', 'iPhone 16 Pro Wallet Case', 'Apple'),
    ];
    expect(relatedProducts(p, all, 2).map((x) => x.id)).toEqual(['m2', 'm1']);
  });
});
