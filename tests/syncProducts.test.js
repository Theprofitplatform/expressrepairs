import { describe, it, expect } from 'vitest';
import { transformCatalog, thumbUrl, ONLINE_GRID_GROUPS } from '../scripts/sync-products.mjs';

const row = (over = {}) => ({
  id: 'X-10', name: 'Case', sku: 'C1', type: 'PRODUCT', archived: false,
  sellCents: 1900, costCents: 700, gridGroup: 'Accessories',
  imageUrl: 'https://www.hoco.com.au/web/image/product.template/10/image_1024',
  category: { name: 'Cases' },
  stockLevels: [{ onHand: 4 }],
  ...over,
});

describe('transformCatalog', () => {
  it('maps a sellable row and strips cost price', () => {
    const [p] = transformCatalog([row()]);
    expect(p).toEqual({
      id: 'X-10', name: 'Case', category: 'Cases', priceCents: 1900,
      image: 'https://www.hoco.com.au/web/image/product.template/10/image_1024',
      thumb: 'https://www.hoco.com.au/web/image/product.template/10/image_256',
      inStock: true, sku: 'C1',
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

  // Availability is not tracked in DXPOS for this catalogue (no stock counts),
  // so every qualifying product is listed regardless of onHand — the shop
  // promises "dispatched in 1-2 business days" instead of tracking stock.
  it('lists products regardless of stock level', () => {
    expect(transformCatalog([row({ stockLevels: [{ onHand: 4 }] })])).toHaveLength(1);
    expect(transformCatalog([row({ stockLevels: [{ onHand: 0 }] })])).toHaveLength(1);
    expect(transformCatalog([row({ stockLevels: [] })])).toHaveLength(1);
    expect(transformCatalog([row({ stockLevels: undefined })])).toHaveLength(1);
  });

  it('a listed product is always in stock, and category falls back to gridGroup', () => {
    expect(transformCatalog([row()])[0].inStock).toBe(true);
    expect(transformCatalog([row({ category: null })])[0].category).toBe('Accessories');
  });

  it('falls back to the supplier image map by SKU when DXPOS has no photo', () => {
    // DXPOS carries no product images; the map is keyed on a normalised SKU.
    expect(transformCatalog([row({ imageUrl: null, sku: 'no-such-sku-xyz' })])).toHaveLength(0);
  });

  it('exports the owner-editable grid-group allowlist', () => {
    expect(ONLINE_GRID_GROUPS).toContain('Accessories');
  });

  it('defaults a missing sku to an empty string instead of undefined (Zod requires a string)', () => {
    const [p] = transformCatalog([row({ sku: undefined })]);
    expect(p.sku).toBe('');
  });
});

describe('thumbUrl', () => {
  it('rewrites the trailing Odoo image_1024 size to image_256', () => {
    expect(thumbUrl('https://www.hoco.com.au/web/image/product.template/10/image_1024')).toBe(
      'https://www.hoco.com.au/web/image/product.template/10/image_256',
    );
  });

  it('leaves other urls unchanged', () => {
    expect(thumbUrl('https://cdn.example.com/uploads/x10.jpg')).toBe('https://cdn.example.com/uploads/x10.jpg');
    expect(thumbUrl('')).toBe('');
  });
});
