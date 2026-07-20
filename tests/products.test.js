import { describe, it, expect } from 'vitest';
import { PRODUCTS, SHOP, fmtPrice } from '../src/data/products.js';
import { readFileSync } from 'node:fs';

describe('products data', () => {
  it('loads and validates products.json', () => {
    expect(Array.isArray(PRODUCTS)).toBe(true);
    expect(PRODUCTS.length).toBeGreaterThan(0);
    for (const p of PRODUCTS) {
      expect(p.id).toBeTruthy();
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.image).toMatch(/^\/images\/products\//);
    }
  });

  it('never exposes cost price anywhere in the public data file', () => {
    const raw = readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8');
    expect(raw).not.toMatch(/costCents|margin/);
  });

  it('has sane shop config', () => {
    expect(SHOP.flatShippingCents).toBe(1095);
    expect(SHOP.freeShippingThresholdCents).toBe(9900);
    expect(SHOP.currency).toBe('aud');
  });

  it('formats prices', () => {
    expect(fmtPrice(14900)).toBe('$149');
    expect(fmtPrice(1095)).toBe('$10.95');
  });
});
