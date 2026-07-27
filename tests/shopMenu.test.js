import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../src/data/products.js';
import { deviceModel, slugifyCategory, modelGroups } from '../src/lib/shop.js';
import { CURATED_TAGS } from '../src/lib/tags.js';
import {
  SHOP_MENU,
  MODEL_ROUTES,
  MODEL_FAMILIES,
  MIN_MODEL_PAGE_PRODUCTS,
  menuLinks,
} from '../src/lib/shopMenu.js';

// The mega menu renders on every /shop/* page, so one bad href is ~10,000
// pages linking to a 404. These guard the menu against the catalog drifting
// underneath it (a DXPOS re-sync renaming a category, a model falling below
// the page threshold, a curated tag being removed).
describe('shop mega menu', () => {
  const slugSafe = /^[a-z0-9-]+$/;

  it('every category link matches a real category', () => {
    const real = new Set([...new Set(PRODUCTS.map((p) => p.category))].map(slugifyCategory));
    expect(SHOP_MENU.categories.length).toBe(real.size);
    for (const c of SHOP_MENU.categories) {
      expect(real.has(c.slug), c.slug).toBe(true);
      expect(c.count).toBeGreaterThan(0);
    }
  });

  it('every device link is a model that /shop/m/ actually builds', () => {
    const built = new Set(MODEL_ROUTES.map((m) => m.key));
    const shown = SHOP_MENU.deviceColumns.flatMap((c) => c.groups.flatMap((g) => g.models));
    expect(shown.length).toBeGreaterThan(0);
    for (const m of shown) expect(built.has(m.key), m.label).toBe(true);
  });

  it('every type link is a curated tag with a live page', () => {
    const curated = new Set(CURATED_TAGS.map((t) => t.tag));
    for (const t of SHOP_MENU.tags) {
      expect(curated.has(t.tag), t.tag).toBe(true);
      expect(t.count, t.tag).toBeGreaterThan(0);
    }
  });

  it('every href is URL-safe and trailing-slashed', () => {
    for (const href of menuLinks()) {
      expect(href.endsWith('/'), href).toBe(true);
      for (const seg of href.split('/').filter(Boolean)) expect(seg, href).toMatch(slugSafe);
    }
  });

  // The panel ships in the HTML of ~10,000 pages. Left unwatched it grows with
  // the catalog; at ~4KB it costs roughly 16% of dist. This is the tripwire,
  // not a hard rule — raise it deliberately, having measured.
  it('stays under 80 links', () => {
    expect(menuLinks().length).toBeLessThan(80);
  });

  // Column headings promise a total ("All 43 Apple models"); the /shop/m/
  // index must actually list that many, or the promise is a lie.
  it('column totals match the models the index page lists', () => {
    const listed = MODEL_FAMILIES.reduce((n, f) => n + f.models.length, 0);
    const promised = SHOP_MENU.deviceColumns.reduce((n, c) => n + c.total, 0);
    expect(promised).toBe(listed);
    expect(listed).toBe(MODEL_ROUTES.length);
  });
});

describe('/shop/m/ routes', () => {
  it('every model page clears the product threshold', () => {
    for (const m of MODEL_ROUTES) {
      expect(m.count, m.label).toBeGreaterThanOrEqual(MIN_MODEL_PAGE_PRODUCTS);
      const real = PRODUCTS.filter((p) => deviceModel(p.name)?.key === m.key).length;
      expect(real, m.label).toBe(m.count);
    }
  });

  it('keys are unique and URL-safe', () => {
    const keys = MODEL_ROUTES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k, k).toMatch(/^[a-z0-9-]+$/);
  });

  // Every /shop/m/<model>/ page offers "narrow to a category" chips pointing at
  // /shop/c/<cat>/m/<model>/. Those pages are built with modelGroups' default
  // min of 4 *within* the category — the chip filter must use the same floor or
  // it links to pages that were never generated.
  it('category chips only point at category-scoped pages that exist', () => {
    const categories = [...new Set(PRODUCTS.map((p) => p.category))];
    const builtPairs = new Set(
      categories.flatMap((category) => {
        const inCat = PRODUCTS.filter((p) => p.category === category);
        return modelGroups(inCat).map((m) => `${slugifyCategory(category)}|${m.key}`);
      }),
    );
    for (const m of MODEL_ROUTES) {
      const bucket = PRODUCTS.filter((p) => deviceModel(p.name)?.key === m.key);
      const chips = [...new Set(bucket.map((p) => p.category))]
        .map((name) => ({ name, count: bucket.filter((p) => p.category === name).length }))
        .filter((c) => c.count >= 4);
      for (const c of chips) {
        expect(builtPairs.has(`${slugifyCategory(c.name)}|${m.key}`), `${c.name} / ${m.label}`).toBe(true);
      }
    }
  });
});
