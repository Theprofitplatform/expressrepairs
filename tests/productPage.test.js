import { describe, it, expect } from 'vitest';
import { specRows } from '../src/lib/shop.js';

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
