import { describe, it, expect } from 'vitest';
import { transformCatalog, ONLINE_GRID_GROUPS } from '../scripts/sync-products.mjs';

const row = (over = {}) => ({
  id: 'X-10', name: 'Case', sku: 'C1', type: 'PRODUCT', archived: false,
  sellCents: 1900, costCents: 700, gridGroup: 'Accessories',
  imageUrl: '/uploads/x10.jpg', category: { name: 'Cases' },
  stockLevels: [{ onHand: 4 }],
  ...over,
});

describe('transformCatalog', () => {
  it('maps a sellable row and strips cost price', () => {
    const [p] = transformCatalog([row()]);
    expect(p).toEqual({
      id: 'X-10', name: 'Case', category: 'Cases', priceCents: 1900,
      image: '/images/products/X-10.jpg', inStock: true, sku: 'C1',
      _sourceImage: '/uploads/x10.jpg',
    });
    expect(JSON.stringify(p)).not.toMatch(/cost/i);
  });

  it('excludes archived, non-PRODUCT, zero-price, no-image, and off-list grid groups', () => {
    expect(transformCatalog([row({ archived: true })])).toHaveLength(0);
    expect(transformCatalog([row({ type: 'SERVICE' })])).toHaveLength(0);
    expect(transformCatalog([row({ sellCents: 0 })])).toHaveLength(0);
    expect(transformCatalog([row({ imageUrl: null })])).toHaveLength(0);
    expect(transformCatalog([row({ gridGroup: 'Services' })])).toHaveLength(0);
  });

  it('inStock: onHand>0 true, 0 false, untracked (null) true; falls back to gridGroup for category', () => {
    expect(transformCatalog([row({ stockLevels: [{ onHand: 0 }] })])[0].inStock).toBe(false);
    expect(transformCatalog([row({ stockLevels: [] })])[0].inStock).toBe(true);
    expect(transformCatalog([row({ category: null })])[0].category).toBe('Accessories');
  });

  it('image extension follows the source url, defaulting to jpg', () => {
    expect(transformCatalog([row({ imageUrl: '/u/a.PNG' })])[0].image).toBe('/images/products/X-10.png');
    expect(transformCatalog([row({ imageUrl: '/u/a' })])[0].image).toBe('/images/products/X-10.jpg');
  });

  it('exports the owner-editable grid-group allowlist', () => {
    expect(ONLINE_GRID_GROUPS).toContain('Accessories');
  });

  it('defaults a missing sku to an empty string instead of undefined (Zod requires a string)', () => {
    const [p] = transformCatalog([row({ sku: undefined })]);
    expect(p.sku).toBe('');
  });
});
