import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { deviceModel, modelGroups } from '../src/lib/shop.js';

describe('deviceModel', () => {
  it.each([
    ['iPhone 16 Pro Max BLACKTECH Soft Case - Black', 'iphone-16-pro-max', 'iPhone 16 Pro Max'],
    ['iPhone 16e hoco. Slim Case - Clear', 'iphone-16e', 'iPhone 16e'],
    ['iPhone 13 Mini Hard Protective Case', 'iphone-13-mini', 'iPhone 13 Mini'],
    ['iPhone XS Max Tempered Glass', 'iphone-xs-max', 'iPhone XS Max'],
    ['iPhone SE 2022 Silicone Case - Red', 'iphone-se-2022', 'iPhone SE 2022'],
    ['Samsung Galaxy S24 Ultra BLACKTECH Stay Clear Case', 'galaxy-s24-ultra', 'Galaxy S24 Ultra'],
    ['Samsung Galaxy Z Fold 7 VividSilk Cover - Black', 'galaxy-z-fold-7', 'Galaxy Z Fold 7'],
    ['Samsung Galaxy A15 5G Flip Wallet', 'galaxy-a15-5g', 'Galaxy A15 5G'],
    ['Samsung Galaxy Note 20 Ultra Case', 'galaxy-note-20-ultra', 'Galaxy Note 20 Ultra'],
    ['Samsung Galaxy Note 10+ BLACKTECH Case - Black', 'galaxy-note-10-plus', 'Galaxy Note 10 Plus'],
    ['Google Pixel 8 Pro Privacy Glass', 'pixel-8-pro', 'Pixel 8 Pro'],
    ['Pixel 7a Clear Case', 'pixel-7a', 'Pixel 7a'],
    ['iPad Pro 11 2024 LITO D20 Tempered Glass Screen Protector', 'ipad-pro-11', 'iPad Pro 11'],
    ['Single Pack iPad 10 / 2025 A16 LITO D20 Tempered Glass', 'ipad-10', 'iPad 10'],
  ])('parses %s', (name, key, label) => {
    expect(deviceModel(name)).toEqual({ key, label });
  });

  it('multi-model names bucket under the first model listed', () => {
    expect(deviceModel('iPhone X / XS / 11 Pro Privacy 9D Glass - Black').key).toBe('iphone-x');
  });

  it('returns null when no device model leads the name', () => {
    expect(deviceModel('Baseus Bowie True Wireless Earbuds - Black')).toBeNull();
    expect(deviceModel('65W GaN Wall Charger')).toBeNull();
  });

  it('parses >= 75% of the live device-scoped catalog (guards against name-format drift)', () => {
    const all = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
    const scoped = all.filter((p) =>
      ['Cases & Covers', 'Screen Protection', 'Tablet & iPad Cases'].includes(p.category),
    );
    if (scoped.length === 0) return; // pre-sync checkout
    const hit = scoped.filter((p) => deviceModel(p.name)).length;
    expect(hit / scoped.length).toBeGreaterThan(0.75);
  });
});

describe('modelGroups', () => {
  const mk = (name) => ({ name });
  it('groups by model, drops buckets under min, sorts by count desc', () => {
    const products = [
      ...Array(5).fill(mk('iPhone 16 Pro Case A')),
      ...Array(3).fill(mk('Galaxy S24 Ultra Case B')),
      mk('Unparseable Charger Thing'),
    ];
    expect(modelGroups(products, 4)).toEqual([{ key: 'iphone-16-pro', label: 'iPhone 16 Pro', count: 5 }]);
    expect(modelGroups(products, 3)).toEqual([
      { key: 'iphone-16-pro', label: 'iPhone 16 Pro', count: 5 },
      { key: 'galaxy-s24-ultra', label: 'Galaxy S24 Ultra', count: 3 },
    ]);
  });
});
