import { describe, it, expect } from 'vitest';
import { mergeCatalogs, modelCodes } from '../src/lib/merge-catalogs.js';

const dx = (over = {}) => ({
  id: 'X-00331', name: 'iPhone 12 hoco. G9 Full screen HD tempered glass - Black',
  category: 'Screen Protection', brand: 'Apple', priceCents: 1995,
  image: 'https://x/i.webp', thumb: 'https://x/i.webp', inStock: true, sku: '10008639',
  ...over,
});
const ho = (over = {}) => ({
  id: 'H-8250', name: 'hoco. J170 Starlight 22.5W 10000mAh power bank',
  category: 'Cables & Charging', brand: 'hoco.', priceCents: 3990,
  image: 'https://h/8250', thumb: 'https://h/8250', inStock: true, sku: '8250',
  ...over,
});

describe('modelCodes', () => {
  it('extracts letter+digit model codes', () => {
    expect(modelCodes('hoco. DCA71 15W Super Mag Car mount - Black')).toEqual(new Set(['DCA71']));
    expect(modelCodes('iPhone 12 hoco. G9 glass')).toEqual(new Set(['G9']));
  });
});

describe('mergeCatalogs', () => {
  it('concatenates DXPOS first, HOCO after', () => {
    const m = mergeCatalogs([dx()], [ho()]);
    expect(m.map((p) => p.id)).toEqual(['X-00331', 'H-8250']);
  });

  it('drops a HOCO row whose exact name already exists in DXPOS', () => {
    const m = mergeCatalogs([dx()], [ho({ name: dx().name })]);
    expect(m).toHaveLength(1);
    expect(m[0].id).toBe('X-00331');
  });

  it('drops a hoco-branded HOCO row whose model codes are covered by one DXPOS hoco product', () => {
    const dxJ170 = dx({ id: 'X-09999', name: 'hoco. J170 Starlight 22.5W+PD20W 10000mAh power bank - Black' });
    const m = mergeCatalogs([dxJ170], [ho()]); // ho() is also J170
    expect(m.map((p) => p.id)).toEqual(['X-09999']);
  });

  it('keeps a HOCO row when codes only partially overlap (different device variant)', () => {
    const dxA27 = dx({ id: 'X-08888', name: 'Samsung A27 hoco. G9 tempered glass' });
    const hoA36 = ho({ id: 'H-1', name: 'hoco. G9 Tempered Glass | Samsung A36' });
    const m = mergeCatalogs([dxA27], [hoA36]);
    expect(m).toHaveLength(2);
  });

  it('keeps non-hoco HOCO-catalogue brands untouched', () => {
    const coco = ho({ id: 'H-2', name: 'COCO Ring Stand Crystal | Samsung Flip8', brand: '' });
    expect(mergeCatalogs([dx()], [coco])).toHaveLength(2);
  });

  it('keeps a HOCO row when the bare model code collides across a different device (G15 iPhone vs Samsung)', () => {
    const dxG15 = dx({ id: 'X-11111', name: 'Samsung S26 hoco. G15 Privacy tempered glass - Black' });
    const hoG15 = ho({ id: 'H-3', name: 'iPhone 15 Pro Max hoco. G15 Privacy tempered glass' });
    const m = mergeCatalogs([dxG15], [hoG15]);
    expect(m).toHaveLength(2);
  });

  it('keeps a HOCO row when wattage/connector differ (U150 36W USB-A-C vs 60W USB-C-C)', () => {
    const dxU150 = dx({ id: 'X-22222', name: 'hoco. U150 60W USB-C to USB-C cable - Black' });
    const hoU150 = ho({ id: 'H-4', name: 'hoco. U150 36W USB-A to USB-C cable' });
    const m = mergeCatalogs([dxU150], [hoU150]);
    expect(m).toHaveLength(2);
  });

  it('keeps a HOCO row when the color variant differs (W46 Black vs Gold)', () => {
    const dxW46 = dx({ id: 'X-33333', name: 'hoco. W46 Wireless headphones - Black' });
    const hoW46 = ho({ id: 'H-5', name: 'hoco. W46 Wireless headphones - Gold' });
    const m = mergeCatalogs([dxW46], [hoW46]);
    expect(m).toHaveLength(2);
  });

  it('still drops a genuine dupe with a more decorated DXPOS name (J170 power bank)', () => {
    const dxJ170 = dx({ id: 'X-09999', name: 'hoco. J170 Starlight 22.5W+PD20W 10000mAh power bank - Black' });
    const m = mergeCatalogs([dxJ170], [ho()]); // ho() is 'hoco. J170 Starlight 22.5W 10000mAh power bank'
    expect(m.map((p) => p.id)).toEqual(['X-09999']);
  });
});
