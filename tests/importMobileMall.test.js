import { describe, it, expect } from 'vitest';
import {
  transformMobileMall,
  categoryFor,
  cleanName,
  MOBILEMALL_EXCLUDE_PATTERNS,
} from '../scripts/import-mobilemall.mjs';
import MM_PRODUCTS from '../src/data/mobilemall-products.json';

const row = (over = {}) => ({
  sku: '10019833',
  name: 'iPhone 17 BLACKTECH Sentinel X Ring (MagSafe Compatible) - Black',
  rrpCents: 2990,
  image: 'https://mobilemall.com.au/media/catalog/product/cache/abc/a.jpg',
  categories: ['Apple', 'Cases and Protectors', 'iPhone 17'],
  ...over,
});

describe('categoryFor', () => {
  it('prefers the shared name rules when they classify', () => {
    expect(categoryFor('iPhone 17 LITO D22 Full Cover Screen Protector - Black', ['Cases and Protectors']))
      .toBe('Screen Protection');
    expect(categoryFor('iPhone 17 BLACKTECH Mag Case (MagSafe Compatible) - Clear', [])).toBe('Cases & Covers');
    expect(categoryFor('BLACKTECH USB-A to Lightning Cable 100cm', [])).toBe('Cables & Charging');
  });

  // The gap that put 3.3k cases in the Accessories catch-all: MobileMall names
  // cases by model line, with no "case"/"cover" word to match on.
  it('falls back to the supplier bucket for case names with no case keyword', () => {
    const cats = ['Samsung', 'Cases and Protectors', 'Galaxy A27'];
    expect(categoryFor('Samsung Galaxy A27 BLACKTECH Soft Feeling With Soft Micro Fiber - Black', cats))
      .toBe('Cases & Covers');
    expect(categoryFor('Samsung Galaxy A37 BLACKTECH Triangle Armor - Navy', cats)).toBe('Cases & Covers');
    expect(categoryFor('Samsung Galaxy A57 BLACKTECH Commuter - Black', cats)).toBe('Cases & Covers');
  });

  it('leaves straps and bands in Accessories despite the shared supplier bucket', () => {
    const cats = ['Apple', 'Cases and Protectors', 'Watch'];
    expect(categoryFor('Apple Watch Nylon Strap 42mm - Black', cats)).toBe('Accessories');
    expect(categoryFor('Samsung Galaxy Watch Silicone Band 44mm - Navy', cats)).toBe('Accessories');
  });

  it('keeps genuine accessories in Accessories when no bucket applies', () => {
    expect(categoryFor('BLACKTECH 32-in-1 gadget kit', ['New Arrivals'])).toBe('Accessories');
  });
});

describe('cleanName', () => {
  it('strips the export’s bold markup and doubled spaces', () => {
    expect(cleanName('**10pcs/pack** LITO D15  Privacy Glass')).toBe('10pcs/pack LITO D15 Privacy Glass');
  });
});

describe('transformMobileMall', () => {
  it('produces schema-shaped products with M- ids and the MobileMall sku', () => {
    const [p] = transformMobileMall([row()], new Set());
    expect(p).toMatchObject({
      id: 'M-10019833',
      sku: '10019833',
      priceCents: 2990,
      inStock: true,
      category: 'Cases & Covers',
      image: 'https://mobilemall.com.au/media/catalog/product/cache/abc/a.jpg',
    });
  });

  it('uses the R2 mirror for image and thumb when the id is in the manifest', () => {
    const [p] = transformMobileMall([row()], new Set(['M-10019833']));
    expect(p.image).toBe('https://img.expressrepairs.com.au/products/M-10019833.webp');
    expect(p.thumb).toBe('https://img.expressrepairs.com.au/products/M-10019833.webp');
  });

  it('excludes wholesale-only lines a consumer shop must never list', () => {
    const rows = [
      row({ sku: '1', name: 'iPhone 17 BLACKTECH 3D Custom Sublimation Phone Case Single Layer' }),
      row({ sku: '2', name: 'iPhone 17 Pro Dummy - Navy' }),
      row({ sku: '3', name: '**10pcs/pack** iPhone 17 Pro LITO D15 HD PRO Privacy Full Glass' }),
      row({ sku: '6', name: 'iPhone 17 Forward 3D Custom Sublimation 2 in 1 Coated Phone Case Mold' }),
      row({ sku: '7', name: 'Retail Display Stand for tempered glass' }),
      row({ sku: '8', name: 'Charging Port | iPhone 14 Pro Max - Black' }),
    ];
    expect(transformMobileMall(rows)).toEqual([]);
  });

  it('drops rows with no usable image or price', () => {
    expect(transformMobileMall([row({ image: '' })])).toEqual([]);
    expect(transformMobileMall([row({ rrpCents: 0 })])).toEqual([]);
  });
});

describe('MOBILEMALL_EXCLUDE_PATTERNS', () => {
  it('does not match ordinary consumer products', () => {
    for (const name of [
      'iPhone 17 Pro Max BLACKTECH Sentinel X Ring (MagSafe Compatible) - Orange',
      'iPhone 17 Goospery Mercury Blue Moon Diary - Wine',
      'Samsung Galaxy S25 Ultra BLACKTECH Triangle Armor - Silver',
      'BLACKTECH USB-C to USB-C 100W Fast Charging Cable 100cm - Black',
    ]) {
      expect(MOBILEMALL_EXCLUDE_PATTERNS.some((p) => p.test(name))).toBe(false);
    }
  });
});

describe('the committed import', () => {
  it('fills the iPhone 17 gap that prompted the import', () => {
    const i17 = MM_PRODUCTS.filter((p) => /iPhone 17/i.test(p.name) && /Cases/.test(p.category));
    expect(i17.length).toBeGreaterThan(200);
  });

  // Account-credit promos and supplier test rows are all hand-keyed SKUs
  // ("SGA27SP", "tomato", "New product test"); real stock is always numeric.
  it('carries no promo or test rows — every sku is numeric', () => {
    expect(MM_PRODUCTS.filter((p) => !/^\d+$/.test(p.sku))).toEqual([]);
  });

  it('never publishes a supplier cost price — every price is the RRP column', () => {
    // The extractor exports "Regular Price" only; "Current Price" is our trade
    // price. Every DXPOS-synced SKU prices at exactly 1.00x Regular Price, so a
    // sub-$1 product here would mean the cost column leaked into the snapshot.
    expect(MM_PRODUCTS.filter((p) => p.priceCents < 100)).toEqual([]);
  });

  it('ids and skus are unique', () => {
    expect(new Set(MM_PRODUCTS.map((p) => p.id)).size).toBe(MM_PRODUCTS.length);
    expect(new Set(MM_PRODUCTS.map((p) => p.sku)).size).toBe(MM_PRODUCTS.length);
  });
});
