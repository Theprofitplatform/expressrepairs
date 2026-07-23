import { describe, it, expect } from 'vitest';
import { TAG_RULES, tagsFor, tagLabel, CURATED_TAGS, MIN_TAG_PAGE_PRODUCTS } from '../src/lib/tags.js';
import { PRODUCTS } from '../src/data/products.js';

const p = (name, category = 'Cases & Covers') => ({ name, category });

describe('tag rules', () => {
  it('tags the classic case shapes', () => {
    expect(tagsFor(p('Samsung Galaxy S23 Goospery Mercury Blue Moon Diary - Navy'))).toContain('wallet-case');
    expect(tagsFor(p('iPhone 15 BLACKTECH Clear Case (MagSafe Compatible)'))).toEqual(
      expect.arrayContaining(['clear-case', 'magsafe']),
    );
    expect(tagsFor(p('Coco MSafe Anti Shock | iPhone 17 Pro Max'))).toEqual(
      expect.arrayContaining(['magsafe', 'rugged-case']),
    );
  });

  it('bare "magnetic" is a clasp, not MagSafe; "flip" is a Galaxy model, not a case type', () => {
    expect(tagsFor(p('Hanman Magnetic Detachable Wallet | Samsung A55'))).not.toContain('magsafe');
    expect(tagsFor(p('Samsung Galaxy Z Flip 6 Clear Case'))).toEqual(
      expect.not.arrayContaining(['wallet-case', 'flip-case']),
    );
  });

  it('category guards stop cross-category leakage', () => {
    // earbuds with a "Wireless Charging case" are not wireless chargers
    expect(tagsFor(p('hoco. EW09 Soundman Wireless Charging case Earbuds', 'Audio'))).not.toContain('wireless-charger');
    expect(tagsFor(p('hoco. CW63 Wireless Charging Stand', 'Cables & Charging'))).toContain('wireless-charger');
    // "Ring Stand" cases are cases; ring mounts are mounts — both tag ring-holder
    expect(tagsFor(p('Nico Sparkle Ring Stand | iPhone 16'))).toContain('ring-holder');
    expect(tagsFor(p('Magnetic Ring Holder for car', 'Mounts & Holders'))).toContain('ring-holder');
  });

  it('screen protection vocabulary', () => {
    const t = tagsFor(p('Samsung Galaxy S26 hoco. G15 Privacy 9D Full Cover Tempered Glass - Black', 'Screen Protection'));
    expect(t).toEqual(expect.arrayContaining(['tempered-glass', 'privacy-screen', 'full-cover']));
  });

  it('power banks are detected by name or capacity', () => {
    expect(tagsFor(p('hoco. J111 power bank (10000mAh)', 'Cables & Charging'))).toContain('power-bank');
    expect(tagsFor(p('J162A Full power 22.5W+PD20W /w two cables (20000mAh)', 'Accessories'))).toContain('power-bank');
  });

  it('all slugs are kebab-case and tagsFor is sorted + deduped', () => {
    for (const [slug] of TAG_RULES) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const tags = tagsFor(p('Coco Ring Stand Crystal Ring | iPhone 15'));
    expect(tags).toEqual([...new Set(tags)].sort());
  });
});

describe('catalog tag coverage', () => {
  it('at least 70% of products carry a tag (drift alarm, like the deviceModel guard)', () => {
    const tagged = PRODUCTS.filter((x) => x.tags.length > 0).length;
    expect(tagged / PRODUCTS.length).toBeGreaterThan(0.7);
  });

  it('every curated tag has a rule, a unique slug, and enough products for its page', () => {
    const ruleSlugs = new Set(TAG_RULES.map(([s]) => s));
    const seen = new Set();
    for (const { tag, label, blurb } of CURATED_TAGS) {
      expect(ruleSlugs, `curated tag ${tag} has no rule`).toContain(tag);
      expect(seen.has(tag)).toBe(false);
      seen.add(tag);
      expect(label.length).toBeGreaterThan(2);
      expect(blurb.length).toBeGreaterThan(10);
      const count = PRODUCTS.filter((x) => x.tags.includes(tag)).length;
      expect(count, `curated tag ${tag} below page minimum`).toBeGreaterThanOrEqual(MIN_TAG_PAGE_PRODUCTS);
    }
  });

  it('tagLabel falls back to humanized slug', () => {
    expect(tagLabel('magsafe')).toBe('MagSafe');
    expect(tagLabel('some-random-tag')).toBe('Some Random Tag');
  });

  it('brand backfill holds: near-zero empty brands after maker/platform inference', () => {
    expect(PRODUCTS.filter((x) => !x.brand).length).toBeLessThan(100);
  });
});
