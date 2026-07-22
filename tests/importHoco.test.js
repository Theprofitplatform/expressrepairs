import { describe, it, expect } from 'vitest';
import { transformHoco, hocoCategory, HOCO_EXCLUDE_PATTERNS } from '../scripts/import-hoco.mjs';

const row = (over = {}) => ({
  id: 8250,
  name: 'Hoco G9 Tempered Glass | iPhone 15 Pro',
  rrpCents: 1990,
  image: 'https://www.hoco.com.au/web/image/product.template/8250/image_1024',
  ...over,
});

describe('hocoCategory', () => {
  it('maps by name keywords', () => {
    expect(hocoCategory('Hoco G9 Tempered Glass | iPhone 15')).toBe('Screen Protection');
    expect(hocoCategory('COCO Ring Stand Crystal Case | Samsung Flip8')).toBe('Cases & Covers');
    expect(hocoCategory('Hoco X101 60W USB-C to USB-C cable')).toBe('Cables & Charging');
    expect(hocoCategory('Hoco EW60 True Wireless Earbuds')).toBe('Audio');
    expect(hocoCategory('Hoco CA118 Magnetic Car Holder')).toBe('Mounts & Holders');
    expect(hocoCategory('Hoco UT10 32-in-1 gadget')).toBe('Accessories');
  });

  it('maps leading case-brand names to Cases & Covers', () => {
    expect(hocoCategory('Hanman | Samsung A27')).toBe('Cases & Covers');
    expect(hocoCategory('Coco MSafe Anti Shock | iPhone 17 Pro Max')).toBe('Cases & Covers');
    expect(hocoCategory('Otterbox Defender MagSafe | iPhone 17e')).toBe('Cases & Covers');
    expect(hocoCategory('Speck Presidio MagSafe | iPhone 14 Plus/15 Plus - Gold Glitter')).toBe('Cases & Covers');
    expect(hocoCategory('Raptic Military 600D Aramid Fibre Magsafe | Samsung Galaxy Fold7')).toBe('Cases & Covers');
    expect(hocoCategory('X-doria Raptic Shield Msafe | Samsung S25 Ultra - Red')).toBe('Cases & Covers');
    expect(hocoCategory('Mercury SF Jelly | Samsung S24')).toBe('Cases & Covers');
  });

  it('strips a leading SKU bracket code before matching', () => {
    expect(hocoCategory('[FW3-08] Hanman | iPhone 16')).toBe('Cases & Covers');
    expect(hocoCategory('[BWS3-11] Pelican Ranger | iPhone 13 Pro')).toBe('Cases & Covers');
  });

  it('strips repeated leading SKU bracket codes before matching', () => {
    expect(hocoCategory('[FW9-6][BWF5-08] Pelican Ranger | Samsung S22 Plus')).toBe('Cases & Covers');
    expect(hocoCategory('[FW1-24][FW8-07] iFace mall | Samsung S22 Ultra - Black')).toBe('Cases & Covers');
    expect(hocoCategory('[FW7-31][FW7-28] Caseology Dual Layer Heavy Duty | iPhone 7 Plus/6 Plus')).toBe('Cases & Covers');
  });

  it('maps additional case-line prefixes found in the stripped-name recount', () => {
    expect(hocoCategory('Editor Transparent Capsule | Samsung S24')).toBe('Cases & Covers');
    expect(hocoCategory('Korean Editor Super Colors Fit SF Jelly | Samsung S24')).toBe('Cases & Covers');
    expect(hocoCategory('Lifeproof FRE | iPhone 15')).toBe('Cases & Covers');
    expect(hocoCategory('Redpepper Waterproof | iPhone 15')).toBe('Cases & Covers');
  });

  it('maps bare glass/dome protector names to Screen Protection', () => {
    expect(hocoCategory('Korean Whitestone UV Dome Glass | Samsung S24')).toBe('Screen Protection');
    expect(hocoCategory('Dragon Glass | Samsung A57')).toBe('Screen Protection');
  });

  it('keeps genuine hoco. gadgets in Accessories', () => {
    expect(hocoCategory('hoco. HP52 Shoulder and neck massager')).toBe('Accessories');
  });
});

describe('transformHoco', () => {
  it('produces schema-shaped products with H- ids and hoco sku', () => {
    const [p] = transformHoco([row()]);
    expect(p).toMatchObject({
      id: 'H-8250',
      sku: '8250',
      priceCents: 1990,
      inStock: true,
      category: 'Screen Protection',
      image: 'https://www.hoco.com.au/web/image/product.template/8250/image_1024',
      thumb: 'https://www.hoco.com.au/web/image/product.template/8250/image_256',
    });
  });

  it('excludes repair tooling and bulk trade packs', () => {
    const rows = [
      row({ id: 1, name: 'Sunshine LS3 Plus LCD Screen Separator 220V' }),
      row({ id: 2, name: 'MaAnt D2 Grinding Pen for CPU polishing' }),
      row({ id: 3, name: '[PACK 10] Bull W Full Edge Thick Glass | Samsung S26' }),
      row({ id: 4, name: '2UUL DA51 OCA Glue Remover' }),
      row({ id: 5, name: '[PACK of 10] Dragon Glass | Samsung A57' }),
      row({ id: 6, name: '[Pack of 10pcs $1/unit] iRoo Tiger W5' }),
      row({ id: 7, name: '[PACK20] backing leather' }),
    ];
    expect(transformHoco(rows)).toEqual([]);
  });

  it('excludes [TOL...]-coded tools, [PT...]-coded parts, and shop fixtures', () => {
    const rows = [
      row({ id: 8, name: '[TOL3-2] BST-129 Large Double Bend Head Plastic Pry Tools' }),
      row({ id: 9, name: '[TOL1-4] SUGON 3005D 220V Adjustable Digital DC Power Supply AU Plug' }),
      row({ id: 10, name: '[PT-B01] OEM Touch Digitizer | iPad 9 (10.2) - Black' }),
      row({ id: 11, name: 'SY10A Cashier Desk (L800xD550xH1000mm)' }),
      row({ id: 12, name: 'Hoco A1 Metal Hook Shelf (L1200xD300xH2400mm)' }),
      row({ id: 13, name: 'HOCO G100 | Intelligent film cutting machine' }),
      row({ id: 14, name: 'Touch Digitizer | iPad 10 (10.9) HQ' }),
      row({ id: 15, name: 'Best BST-501 opening tools with spudger' }),
    ];
    expect(transformHoco(rows)).toEqual([]);
  });

  it('drops rows with no usable image or price', () => {
    expect(transformHoco([row({ image: '' })])).toEqual([]);
    expect(transformHoco([row({ rrpCents: 0 })])).toEqual([]);
  });

  it('applies the shared name fixes (hoco casing)', () => {
    const [p] = transformHoco([row({ name: 'hoco G9 Tempered Glass | iPhone 15' })]);
    expect(p.name).toContain('hoco.');
  });

  it('strips leading SKU bracket codes from the display name', () => {
    const [p] = transformHoco([row({ name: '[FW3-08] Hanman | Samsung A27' })]);
    expect(p.name).toBe('Hanman | Samsung A27');
    expect(p.category).toBe('Cases & Covers');
  });

  it('strips repeated leading SKU bracket codes from the display name', () => {
    const [p] = transformHoco([row({ name: '[FW9-6][BWF5-08] Pelican Ranger | Samsung S22 Plus' })]);
    expect(p.name).toBe('Pelican Ranger | Samsung S22 Plus');
  });
});

describe('HOCO_EXCLUDE_PATTERNS', () => {
  it('does not match ordinary consumer products', () => {
    for (const name of [
      'Hoco J170 22.5W 10000mAh power bank',
      'COCO Camera Stand Case | Samsung Z Fold8',
      'Hanman Wallet Case | Samsung A27',
      '[FW3-08] Hanman | Samsung A27', // ordinary case-line SKU bracket, not a TOL/PT warehouse code
    ]) {
      expect(HOCO_EXCLUDE_PATTERNS.some((p) => p.test(name))).toBe(false);
    }
  });
});
