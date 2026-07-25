import { describe, it, expect } from 'vitest';
import { normName, buildHocoRows, buildMobilemallRows } from '../scripts/build-supplier-catalog.mjs';

describe('normName', () => {
  it('lowercases and collapses non-alphanumerics', () => {
    expect(normName('USB-C  Fast Charger (20W)!')).toBe('usb c fast charger 20w');
  });
});

describe('buildHocoRows', () => {
  // Fixture values are fabricated to avoid real supplier cost data in a public repo.
  // Do NOT replace these with actual SKU/cost/RRP values; cost prices must never
  // be committed. The test verifies id-join, cents conversion, category lookup, and
  // unmatched-row handling — any fabricated values that exercise these paths work.
  const raw = [
    { id: 1001, name: 'Fabricated Ring Stand', cost: 9.99, rrp: 24.99 },
    { id: 9999, name: 'Unlisted Thing', cost: 2, rrp: null },
  ];
  const hocoProducts = [{ id: 'H-1001', category: 'Screen Protection' }];
  it('maps cents, category and stocked from the shop HOCO data', () => {
    const rows = buildHocoRows(raw, hocoProducts);
    expect(rows[0]).toEqual({
      sku: '1001', name: 'Fabricated Ring Stand', costCents: 999, rrpCents: 2499,
      category: 'Screen Protection', stocked: true, inStock: true,
    });
    expect(rows[1]).toEqual({
      sku: '9999', name: 'Unlisted Thing', costCents: 200, rrpCents: null,
      category: '', stocked: false, inStock: true,
    });
  });
});

describe('buildMobilemallRows', () => {
  const raw = [
    { sku: 'CH1', name: 'USB-C Fast Charger 20W', cost: 12.5, stock: 'In stock', categories: 'Chargers | Wall' },
    { sku: 'CH2', name: 'Rare Cable', cost: 3, stock: 'Out of stock', categories: '' },
  ];
  const shopProducts = [{ name: 'USB-C Fast Charger 20W' }];
  it('maps cents, supplier stock, and stocked by normalised name', () => {
    const rows = buildMobilemallRows(raw, shopProducts);
    expect(rows[0]).toEqual({
      sku: 'CH1', name: 'USB-C Fast Charger 20W', costCents: 1250, rrpCents: null,
      category: 'Chargers | Wall', stocked: true, inStock: true,
    });
    expect(rows[1].stocked).toBe(false);
    expect(rows[1].inStock).toBe(false);
  });
});
