import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../src/data/products.js';
import { deviceModel, slugifyCategory, modelGroups } from '../src/lib/shop.js';
import { CURATED_TAGS } from '../src/lib/tags.js';
import {
  SHOP_MENU,
  CATALOGUE,
  MODEL_ROUTES,
  MODEL_FAMILIES,
  MIN_MODEL_PAGE_PRODUCTS,
  menuLinks,
  catalogueLinks,
} from '../src/lib/shopMenu.js';

// Every category-scoped model page the site builds, as "<catSlug>|<modelKey>".
// Mirrors getStaticPaths in pages/shop/c/[category]/m/[model]/[...page].astro —
// modelGroups' default min, applied within the category.
const builtPairs = new Set(
  [...new Set(PRODUCTS.map((p) => p.category))].flatMap((category) => {
    const inCat = PRODUCTS.filter((p) => p.category === category);
    return modelGroups(inCat).map((m) => `${slugifyCategory(category)}|${m.key}`);
  }),
);

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

  it('every type link is a curated tag with a live page', () => {
    const curated = new Set(CURATED_TAGS.map((t) => t.tag));
    for (const t of SHOP_MENU.tags) {
      expect(curated.has(t.tag), t.tag).toBe(true);
      expect(t.count, t.tag).toBeGreaterThan(0);
    }
  });

  it('every href is URL-safe and trailing-slashed', () => {
    for (const href of [...menuLinks(), ...catalogueLinks()]) {
      expect(href.endsWith('/'), href).toBe(true);
      for (const seg of href.split('/').filter(Boolean)) expect(seg, href).toMatch(slugSafe);
    }
  });

  // The panel ships in the HTML of ~10,000 pages, so only the two cheap
  // columns are inlined — the cascade's ~230 model links arrive over fetch.
  // Inlining them measured at ~27KB a page, roughly 217MB of dist. This is
  // the tripwire: if a link count creeps back in here, that is why.
  it('inlines under 40 links', () => {
    expect(menuLinks().length).toBeLessThan(40);
  });

  // /shop/m/ promises a model count in its own copy; the index must list
  // exactly the models that got routes.
  it('the model index lists every routed model', () => {
    const listed = MODEL_FAMILIES.reduce((n, f) => n + f.models.length, 0);
    expect(listed).toBe(MODEL_ROUTES.length);
  });
});

// The cascade served at /shop/menu.json. Its leaves are category-scoped model
// pages built with modelGroups' DEFAULT min (4) — using MIN_MODEL_PAGE_PRODUCTS
// here would hide live pages, anything lower would link to pages that were
// never generated. This is the test that pins that choice.
describe('catalogue cascade', () => {
  const leafPairs = () =>
    CATALOGUE.flatMap((c) => c.families.flatMap((f) => f.models.map((m) => `${c.slug}|${m.key}`)));

  it('covers every category exactly once, in the menu order', () => {
    expect(CATALOGUE.map((c) => c.slug)).toEqual(SHOP_MENU.categories.map((c) => c.slug));
  });

  it('every leaf is a category-scoped model page that exists', () => {
    const leaves = leafPairs();
    expect(leaves.length).toBeGreaterThan(200);
    for (const pair of leaves) expect(builtPairs.has(pair), pair).toBe(true);
  });

  it('reaches every category-scoped model page the build makes', () => {
    const leaves = new Set(leafPairs());
    expect([...builtPairs].filter((p) => !leaves.has(p))).toEqual([]);
  });

  it('counts are real and models are unique within a category', () => {
    for (const c of CATALOGUE) {
      const keys = c.families.flatMap((f) => f.models.map((m) => m.key));
      expect(new Set(keys).size, c.slug).toBe(keys.length);
      for (const f of c.families) {
        expect(f.models.length, `${c.slug}/${f.family}`).toBeGreaterThan(0);
        for (const m of f.models) {
          const real = PRODUCTS.filter(
            (p) => p.category === c.name && deviceModel(p.name)?.key === m.key,
          ).length;
          expect(real, `${c.slug}/${m.key}`).toBe(m.count);
        }
      }
    }
  });

  // Cables, Audio, Watch Cases and AirPods Cases have no extractable device
  // model. The script renders them as leaves; if extraction ever starts
  // covering them this flips, and the leaf branch stops being reachable.
  it('leaf categories are the ones with no model coverage', () => {
    for (const c of CATALOGUE) {
      const inCat = PRODUCTS.filter((p) => p.category === c.name);
      expect(c.families.length === 0, c.slug).toBe(modelGroups(inCat).length === 0);
    }
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
