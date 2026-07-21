import { describe, it, expect } from 'vitest';
import { productSchema } from '../src/lib/seo.js';

describe('productSchema', () => {
  const p = { id: 'T-1', name: 'Case', category: 'Cases & Covers', brand: 'Apple', sku: 'S1', priceCents: 4990, image: 'https://img.expressrepairs.com.au/products/T-1.webp', thumb: '', inStock: true };
  it('emits a valid Product with AUD offer and no ratings', () => {
    const s = productSchema(p);
    expect(s['@type']).toBe('Product');
    expect(s.offers.priceCurrency).toBe('AUD');
    expect(s.offers.price).toBe('49.90');
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.aggregateRating).toBeUndefined(); // store rating must never leak here
    expect(JSON.stringify(s)).not.toMatch(/cost/i);
  });
  it('omits brand when empty', () => {
    expect(productSchema({ ...p, brand: '' }).brand).toBeUndefined();
  });
});
