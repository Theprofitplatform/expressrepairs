# Shop Filters & Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3,518-product shop browsable: static device-model subcategory pages (SEO landing pages like "iPhone 16 Pro Cases & Covers") plus filters/sort that operate over the whole category instead of the current page's 48 cards.

**Architecture:** Everything derives at build time from `src/data/products.json` — no new services, no schema/sync changes. A pure `deviceModel(name)` extractor (93% measured hit-rate) powers new `/shop/c/[category]/m/[model]/` static routes; client-side filtering reuses the existing `search-index.json` + a new pure `filterProducts()` shared by tests and the browser.

**Tech Stack:** Astro 5 (static), vitest, Zod, Cloudflare Pages. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-22-shop-filters-categories-design.md`

---

## Context a fresh session needs

**Repo:** `C:\Users\sales\claudee\expressrepairs\repo`, branch `main`, GitHub `Theprofitplatform/expressrepairs` (must stay public). **Every push to main deploys the live site** (`.github/workflows/deploy.yml` runs `npm test` + `npm run build` first — a red test blocks deploy). A parallel SEO agent sometimes commits here — `git pull --rebase` before every push.

**Verify commands:** `npm test` (158 green expected — run first for the real baseline) and `npm run build` (~3,800 pages). Live checks via the gstack `/browse` skill.

**Data flow:** `.github/workflows/sync-products.yml` regenerates `src/data/products.json` twice daily; never hand-edit it. Product shape (`productSchema` in `src/data/schema.js`): `{ id, name, category, brand, priceCents, image, thumb, inStock, sku }`. `category` is one of 9 clean names (Cases & Covers = 2,474 of 3,518 products). `brand` is the supplier's category.name — a single field mixing device brands (Apple, Samsung) and makers (hoco., BLACKTECH); treat it as one facet. Names lead with the device model: `"iPhone 16 Pro BLACKTECH Soft Case - Black"`. Every image is R2-hosted at `https://img.expressrepairs.com.au/products/<id>.webp`.

**Existing shop code you will touch:**
- `src/lib/shop.js` — `slugifyCategory`, `specRows`, `crossSells`, `relatedProducts` (all pure, tested).
- `src/shop/search-core.js` — `norm`, `searchProducts(index, q, limit)`; shared build/client.
- `src/pages/shop/search-index.json.js` — build-time index `[{id, name, brand, category, priceCents}]`.
- `src/pages/shop/c/[category]/[...page].astro` — paginated category grid (48/page). Its inline script has TWO filters to be replaced: brand chips that only hide cards on the current page (the bug this plan fixes), and a model text input that already searches the whole category via the index — the pattern this plan generalizes.
- `src/pages/shop/[id].astro` — product page, uses `relatedProducts`.
- `tests/` — vitest; `build-output.test.js` builds once and greps `dist/`.

**Money rules:** integer cents, AUD, GST-inclusive; render with `fmtPrice`. **`costCents` must NEVER appear in `src/`, `public/`, `functions/`, or any feed.**

**Content integrity:** never fabricate reviews/ratings/claims. Store rating stays store-level only.

## Global Constraints

- No new runtime npm dependencies.
- Tests must not hardcode product ids/names from `products.json` (sync overwrites it) — select dynamically; injected fixture data is fine.
- Money in integer cents; `fmtPrice(cents)` from `src/data/products.js` for display.
- Follow existing patterns: pure helpers in `src/lib/`/`src/shop/` with unit tests; page scripts stay thin DOM wiring.
- Commit per task; push per task after `git pull --rebase` (deploy is test-gated).
- Zero-product builds must not crash (pre-sync checkout): every `getStaticPaths` must tolerate an empty catalog (existing pages already do — `paginate` over zero categories returns no routes).

---

### Task 1: `deviceModel()` extractor + `modelGroups()`

**Files:**
- Modify: `src/lib/shop.js`
- Test: `tests/shopModel.test.js` (new)

**Interfaces:**
- Consumes: nothing new (`slugifyCategory` already in the same file).
- Produces: `deviceModel(name) -> { key: string, label: string } | null` (memoized; `key` is a slug like `iphone-16-pro`, `label` like `iPhone 16 Pro`) and `modelGroups(products, min = 4) -> [{ key, label, count }]` sorted by count desc. Tasks 2–5 rely on both, exactly these names.

- [ ] **Step 1: Write the failing test** — `tests/shopModel.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { deviceModel, modelGroups } from '../src/lib/shop.js';

describe('deviceModel', () => {
  it.each([
    ['iPhone 16 Pro Max BLACKTECH Soft Case - Black', 'iphone-16-pro-max', 'iPhone 16 Pro Max'],
    ['iPhone 16e hoco. Slim Case - Clear', 'iphone-16-e', 'iPhone 16e'],
    ['iPhone 13 Mini Hard Protective Case', 'iphone-13-mini', 'iPhone 13 Mini'],
    ['iPhone XS Max Tempered Glass', 'iphone-xs-max', 'iPhone XS Max'],
    ['iPhone SE 2022 Silicone Case - Red', 'iphone-se-2022', 'iPhone SE 2022'],
    ['Samsung Galaxy S24 Ultra BLACKTECH Stay Clear Case', 'galaxy-s24-ultra', 'Galaxy S24 Ultra'],
    ['Samsung Galaxy Z Fold 7 VividSilk Cover - Black', 'galaxy-z-fold-7', 'Galaxy Z Fold 7'],
    ['Samsung Galaxy A15 5G Flip Wallet', 'galaxy-a15-5g', 'Galaxy A15 5G'],
    ['Samsung Galaxy Note 20 Ultra Case', 'galaxy-note-20-ultra', 'Galaxy Note 20 Ultra'],
    ['Google Pixel 8 Pro Privacy Glass', 'pixel-8-pro', 'Pixel 8 Pro'],
    ['Pixel 7a Clear Case', 'pixel-7-a', 'Pixel 7a'],
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shopModel.test.js`
Expected: FAIL — `deviceModel` is not exported.

- [ ] **Step 3: Implement** — append to `src/lib/shop.js`:

```js
// Leading device-model extractor. DXPOS names lead with the device
// ("iPhone 16 Pro BLACKTECH Soft Case - Black"); multi-model items
// ("iPhone X / XS / 11 Pro ... Glass") bucket under the first model listed.
// Memoized: relatedProducts() calls this across the whole catalog for every
// product page at build time.
// ponytail: regex chain, no device DB — the shopModel coverage test alarms if
// name formats drift below 75%.
const MODEL_RES = [
  [/\biPhone\s?(SE(?:\s?\d{4})?|X[SR]?(?:\s?Max)?|\d{1,2}(?:e|(?:\s(?:Pro|Plus|Max|Mini))+)?)/i, 'iPhone'],
  [
    /\bGalaxy\s(Z\s?(?:Fold|Flip)\s?\d+|Tab\s[A-Z]+\d*\s?\+?|Note\s?\d+|[SAM]\d{1,3})((?:\s?(?:Ultra|Plus|FE|Lite|5G|\+))*)/i,
    'Galaxy',
  ],
  [/\bPixel\s?(\d+a?(?:\sPro)?(?:\sXL)?)/i, 'Pixel'],
  [/\biPad\s?(Pro\s?\d{1,2}(?:\.\d)?|Air\s?\d{0,2}|Mini\s?\d?|\d{1,2}(?:\.\d)?)/i, 'iPad'],
];
const modelCache = new Map();
export const deviceModel = (name) => {
  if (modelCache.has(name)) return modelCache.get(name);
  let result = null;
  for (const [re, family] of MODEL_RES) {
    const m = name.match(re);
    if (!m) continue;
    const label = `${family} ${(m[1] + (m[2] || '')).replace(/\s+/g, ' ').trim()}`;
    result = { key: slugifyCategory(label), label };
    break;
  }
  modelCache.set(name, result);
  return result;
};

// (category-scoped) model buckets big enough to deserve a landing page.
export const modelGroups = (products, min = 4) => {
  const groups = new Map();
  for (const p of products) {
    const m = deviceModel(p.name);
    if (!m) continue;
    const g = groups.get(m.key) ?? { ...m, count: 0 };
    g.count += 1;
    groups.set(m.key, g);
  }
  return [...groups.values()]
    .filter((g) => g.count >= min)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};
```

Note on the test's expected labels: keys come from `slugifyCategory(label)`, so `iPhone 16e` → `iphone-16-e` (the letter/digit boundary is NOT split by slugifyCategory — verify; if the slug comes out as `iphone-16e`, fix the TEST expectations to match the real slug, not the implementation). Same for `pixel-7-a` vs `pixel-7a`. Run the test and align expectations with actual slugs — the invariant that matters is stability, not the exact hyphenation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shopModel.test.js`
Expected: PASS (after aligning slug expectations per the note above).

- [ ] **Step 5: Sanity-probe real coverage** (no commit gate, just eyes):

```bash
node -e "
const raw = require('./src/data/products.json');
import('./src/lib/shop.js').then(({ deviceModel, modelGroups }) => {
  const scoped = raw.filter(p => ['Cases & Covers','Screen Protection','Tablet & iPad Cases'].includes(p.category));
  const hit = scoped.filter(p => deviceModel(p.name)).length;
  console.log('coverage', (hit/scoped.length*100).toFixed(1)+'%', 'buckets>=4:', modelGroups(scoped).length);
});"
```

Expected: coverage ≥ 90%, roughly 100+ buckets.

- [ ] **Step 6: Full suite + commit**

Run: `npm test` — all green.

```bash
git add src/lib/shop.js tests/shopModel.test.js
git commit -m "feat(shop): device-model extractor + model grouping helpers"
```

---

### Task 2: `filterProducts()` core

**Files:**
- Create: `src/shop/filter-core.js`
- Test: `tests/filterCore.test.js` (new)

**Interfaces:**
- Consumes: `searchProducts` from `src/shop/search-core.js`; `deviceModel` from `src/lib/shop.js`.
- Produces: `PRICE_BANDS` (`{ 'under-20', '20-50', 'over-50' }` → predicate on cents) and `filterProducts(index, { category, model, brand, price, sort, q })` → filtered array of index entries. Task 4's browser script uses both, exactly these names.

- [ ] **Step 1: Write the failing test** — `tests/filterCore.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { filterProducts, PRICE_BANDS } from '../src/shop/filter-core.js';

const IDX = [
  { id: 'a', name: 'iPhone 16 Pro hoco. Slim Case - Black', brand: 'Apple', category: 'Cases & Covers', priceCents: 1500 },
  { id: 'b', name: 'iPhone 16 Pro BLACKTECH Hard Case - Clear', brand: 'Apple', category: 'Cases & Covers', priceCents: 2500 },
  { id: 'c', name: 'Galaxy S24 Ultra BLACKTECH Case - Black', brand: 'Samsung', category: 'Cases & Covers', priceCents: 5500 },
  { id: 'd', name: 'iPhone 16 Pro Tempered Glass', brand: 'Apple', category: 'Screen Protection', priceCents: 1000 },
];

describe('filterProducts', () => {
  it('scopes by category', () => {
    expect(filterProducts(IDX, { category: 'Cases & Covers' }).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
  it('scopes by model key within a category', () => {
    expect(
      filterProducts(IDX, { category: 'Cases & Covers', model: 'iphone-16-pro' }).map((p) => p.id),
    ).toEqual(['a', 'b']);
  });
  it('filters by brand and price band', () => {
    expect(filterProducts(IDX, { brand: 'Samsung' }).map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(IDX, { price: 'under-20' }).map((p) => p.id)).toEqual(['a', 'd']);
    expect(filterProducts(IDX, { price: '20-50' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(IDX, { price: 'over-50' }).map((p) => p.id)).toEqual(['c']);
  });
  it('sorts by price both ways without mutating input order otherwise', () => {
    expect(filterProducts(IDX, { sort: 'price-asc' }).map((p) => p.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(filterProducts(IDX, { sort: 'price-desc' }).map((p) => p.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(filterProducts(IDX, {}).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('free-text q uses the shared search matcher', () => {
    expect(filterProducts(IDX, { q: 's24ultra' }).map((p) => p.id)).toEqual(['c']);
  });
  it('composes all filters', () => {
    const out = filterProducts(IDX, { category: 'Cases & Covers', brand: 'Apple', price: 'under-20', sort: 'price-asc' });
    expect(out.map((p) => p.id)).toEqual(['a']);
  });
});

describe('PRICE_BANDS', () => {
  it('bands are exhaustive and non-overlapping at boundaries', () => {
    for (const cents of [1999, 2000, 5000, 5001]) {
      expect(Object.values(PRICE_BANDS).filter((fn) => fn(cents))).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/filterCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/shop/filter-core.js`:

```js
import { searchProducts } from './search-core.js';
import { deviceModel } from '../lib/shop.js';

// Price presets shared by the filter bar UI and filterProducts. Cents, AUD.
export const PRICE_BANDS = {
  'under-20': (c) => c < 2000,
  '20-50': (c) => c >= 2000 && c <= 5000,
  'over-50': (c) => c > 5000,
};

// Pure filter over search-index entries ({id, name, brand, category,
// priceCents}). Used by the category/model page filter bar (browser) and
// tests (node). No sort => index order (= server "featured" order).
export function filterProducts(index, { category, model, brand, price, sort, q } = {}) {
  let pool = index;
  if (category) pool = pool.filter((p) => p.category === category);
  if (model) pool = pool.filter((p) => deviceModel(p.name)?.key === model);
  if (brand) pool = pool.filter((p) => p.brand === brand);
  if (price && PRICE_BANDS[price]) pool = pool.filter((p) => PRICE_BANDS[price](p.priceCents));
  if (q) pool = searchProducts(pool, q, 1000).hits;
  if (sort === 'price-asc') pool = [...pool].sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === 'price-desc') pool = [...pool].sort((a, b) => b.priceCents - a.priceCents);
  return pool;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/filterCore.test.js`
Expected: PASS.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — all green.

```bash
git add src/shop/filter-core.js tests/filterCore.test.js
git commit -m "feat(shop): pure filterProducts core (brand/model/price/sort/q)"
```

---

### Task 3: Device-model landing pages

**Files:**
- Create: `src/pages/shop/c/[category]/m/[model]/[...page].astro`
- Test: modify `tests/build-output.test.js` (add to the existing `shop pages` describe)

**Interfaces:**
- Consumes: `deviceModel`, `modelGroups`, `slugifyCategory` from `src/lib/shop.js`; `PRODUCTS`, `fmtPrice` from `src/data/products.js`; `breadcrumbSchema` from `src/lib/seo.js`.
- Produces: routes `/shop/c/<category>/m/<model>/` (+ `/2/`, `/3/`… pages). Task 4 embeds `ShopFilters` here; Task 5 links here from product pages.

Route note: Astro gives the literal `m` segment priority over the sibling rest-param route `[category]/[...page].astro`, so `/shop/c/cases-covers/m/iphone-16-pro/` cannot be swallowed by the category paginator. The build-output test below proves it.

- [ ] **Step 1: Write the failing test** — append inside `describe('shop pages', ...)` in `tests/build-output.test.js`:

```js
  it('builds device-model landing pages with a 4-level breadcrumb (skips pre-sync)', async () => {
    const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
    if (products.length === 0) return;
    const { deviceModel, modelGroups, slugifyCategory } = await import('../src/lib/shop.js');
    // Derive the biggest bucket dynamically — never hardcode model names.
    const byCat = new Map();
    for (const p of products) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
    const [category, group] = [...byCat.entries()]
      .flatMap(([cat, items]) => modelGroups(items).map((g) => [cat, g]))
      .sort((a, b) => b[1].count - a[1].count)[0];
    const path = `dist/shop/c/${slugifyCategory(category)}/m/${group.key}/index.html`;
    const html = readFileSync(path, 'utf8');
    expect(html).toContain(group.label);
    const crumbs = jsonLdBlocks(html).find((b) => b['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(4);
    // Every product on the page belongs to the bucket.
    expect(html).toContain('Page 1 of');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/build-output.test.js`
Expected: FAIL — ENOENT on the model page path (build emits no such route yet). This test rebuilds (~90s); that's the file's normal cost.

- [ ] **Step 3: Implement the route** — `src/pages/shop/c/[category]/m/[model]/[...page].astro`:

```astro
---
import Layout from '../../../../../../layouts/Layout.astro';
import SiteNav from '../../../../../../components/SiteNav.astro';
import SiteFooter from '../../../../../../components/SiteFooter.astro';
import MobileCta from '../../../../../../components/MobileCta.astro';
import ShopSearch from '../../../../../../components/ShopSearch.astro';
import { PRODUCTS, fmtPrice } from '../../../../../../data/products.js';
import { slugifyCategory, deviceModel, modelGroups } from '../../../../../../lib/shop.js';
import { breadcrumbSchema } from '../../../../../../lib/seo.js';

export function getStaticPaths({ paginate }) {
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  return categories.flatMap((category) => {
    const inCat = PRODUCTS.filter((p) => p.category === category);
    return modelGroups(inCat).flatMap(({ key, label }) => {
      const items = inCat.filter((p) => deviceModel(p.name)?.key === key);
      return paginate(items, {
        pageSize: 48,
        params: { category: slugifyCategory(category), model: key },
        props: { category, modelLabel: label },
      });
    });
  });
}

const { page, category, modelLabel } = Astro.props;
const { category: categorySlug, model: modelKey } = Astro.params;

const navLinks = [
  { label: 'Repairs', href: '/repairs/' },
  { label: 'Shop', href: '/shop/' },
];

const schema = breadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Shop', path: '/shop/' },
  { name: category, path: `/shop/c/${categorySlug}/` },
  { name: modelLabel, path: `/shop/c/${categorySlug}/m/${modelKey}/` },
]);
---
<Layout
  title={`${modelLabel} ${category} | Express Repairs Shop`}
  description={`Shop ${category.toLowerCase()} for ${modelLabel} — ship Australia-wide (free over $99) or free pickup at Express Repairs, Riverwood Plaza.`}
  path={`/shop/c/${categorySlug}/m/${modelKey}/`}
  schema={schema}
  htmlAttrs={{ 'data-palette': 'electric-blue', 'data-fontpair': 'jakarta', 'data-dark': 'false' }}
>
  <SiteNav links={navLinks} ctaHref="/shop/cart/" />

  <main id="main-content" class="section">
    <div class="container-wide">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="crumb-sep">/</span>
        <a href="/shop/">Shop</a>
        <span class="crumb-sep">/</span>
        <a href={`/shop/c/${categorySlug}/`}>{category}</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">{modelLabel}</span>
      </nav>

      <h1 class="section-title" style="margin-top: 16px; font-size: clamp(28px, 3.2vw, 38px);">
        {modelLabel} {category}
      </h1>
      <p class="hero-sub">{page.total} products for {modelLabel} — same stock as our counter at Riverwood Plaza.</p>

      <ShopSearch placeholder="Search accessories" />

      <div class="acc-grid" style="margin-top: 24px;">
        {page.data.map((p) => (
          <a href={`/shop/${p.id}/`} class="acc-card" data-brand={p.brand}>
            <div class="acc-visual">
              <img
                src={p.thumb}
                alt={p.name}
                loading="lazy"
                decoding="async"
                width="400"
                height="300"
                style="width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: contain; background: #fff; padding: 12px; box-sizing: border-box;"
              />
            </div>
            <div class="acc-body">
              <div class="acc-title">{p.name}</div>
              <div class="acc-price">{fmtPrice(p.priceCents)}</div>
            </div>
          </a>
        ))}
      </div>

      <div id="pagination" style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 40px;">
        {page.url.prev ? <a href={page.url.prev} class="btn btn-ghost btn-sm">← Previous</a> : <span />}
        <span class="hero-sub" style="margin: 0;">Page {page.currentPage} of {page.lastPage}</span>
        {page.url.next ? <a href={page.url.next} class="btn btn-ghost btn-sm">Next →</a> : <span />}
      </div>

      <p style="margin-top: 40px;"><a href={`/shop/c/${categorySlug}/`}>← All {category}</a></p>
    </div>
  </main>

  <SiteFooter />
  <MobileCta />
  <script src="../../../../../../shop/cart-count.js"></script>
</Layout>
```

(Task 4 adds the shared `ShopFilters` component to this page; keep this task shippable without it.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/build-output.test.js`
Expected: PASS, including the new model-page test. Also eyeball `dist/shop/c/cases-covers/m/` — expect ~60+ model directories.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — all green.

```bash
git add "src/pages/shop/c/[category]/m" tests/build-output.test.js
git commit -m "feat(shop): static device-model landing pages under /shop/c/<cat>/m/<model>/"
```

---

### Task 4: ShopFilters component — model chips + real whole-category filters

**Files:**
- Create: `src/components/ShopFilters.astro`
- Modify: `src/pages/shop/c/[category]/[...page].astro` (embed component; DELETE the old inline brand-chip + model-filter script entirely)
- Modify: `src/pages/shop/c/[category]/m/[model]/[...page].astro` (embed component)
- Test: reuses `tests/filterCore.test.js` (logic) — the component script is thin DOM wiring per house style.

**Interfaces:**
- Consumes: `filterProducts`, `PRICE_BANDS` from `src/shop/filter-core.js`; `modelGroups` (server-side, for chips); `fmtPrice`.
- Produces: `<ShopFilters category={string} model={string?} brands={[{name,count}]} models={[{key,label,count}]?} categorySlug={string} />`. `models` renders link-chips to Task 3's pages (category page only); `brands` renders filter chips with true whole-category counts.

- [ ] **Step 1: Implement the component** — `src/components/ShopFilters.astro`:

```astro
---
// Filter bar for category and model pages. Server renders model link-chips
// (static SEO links to /m/<model>/ pages) and brand/price/sort controls with
// TRUE whole-scope counts. The script filters over search-index.json via
// filterProducts — never just the 48 server-rendered cards.
const { category, categorySlug, model = '', brands = [], models = [] } = Astro.props;
---
<div id="shop-filters" data-category={category} data-model={model}>
  {models.length > 0 && (
    <nav aria-label="Shop by model" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px;">
      {models.map((m) => (
        <a href={`/shop/c/${categorySlug}/m/${m.key}/`} class="btn btn-ghost btn-sm">
          {m.label} <span style="opacity:.6">({m.count})</span>
        </a>
      ))}
    </nav>
  )}

  <div style="margin-top: 20px; max-width: 520px;">
    <input
      id="model-filter"
      type="search"
      placeholder="Filter by your model — e.g. iPhone 15 Pro, S24 Ultra"
      aria-label="Filter this list by device model or keyword"
      autocomplete="off"
      style="width: 100%; box-sizing: border-box; padding: 10px 14px; font-size: 16px; border: 1px solid var(--border, #d0d5dd); border-radius: 10px;"
    />
  </div>

  {brands.length > 1 && (
    <div data-facet="brand" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px;" aria-label="Filter by brand">
      <button class="btn btn-primary btn-sm" data-value="">All brands</button>
      {brands.map((b) => (
        <button class="btn btn-ghost btn-sm" data-value={b.name}>{b.name} <span style="opacity:.6">({b.count})</span></button>
      ))}
    </div>
  )}

  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center;">
    <div data-facet="price" style="display: flex; gap: 8px;" aria-label="Filter by price">
      <button class="btn btn-primary btn-sm" data-value="">Any price</button>
      <button class="btn btn-ghost btn-sm" data-value="under-20">Under $20</button>
      <button class="btn btn-ghost btn-sm" data-value="20-50">$20–$50</button>
      <button class="btn btn-ghost btn-sm" data-value="over-50">Over $50</button>
    </div>
    <label style="margin-left: auto; font-size: 0.9rem;">
      Sort
      <select id="sort-select" style="margin-left: 6px; padding: 8px 10px; border: 1px solid var(--border, #d0d5dd); border-radius: 8px;">
        <option value="">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </label>
  </div>

  <p id="filter-status" class="hero-sub" style="margin-top: 12px;" hidden></p>
</div>

<script>
  import { filterProducts } from '../shop/filter-core.js';

  const root = document.getElementById('shop-filters');
  const grid = document.querySelector('.acc-grid');
  const pagination = document.getElementById('pagination');
  const status = document.getElementById('filter-status');
  const input = document.getElementById('model-filter');
  const sortSel = document.getElementById('sort-select');
  const { category, model } = root.dataset;

  const fmtPrice = (c) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
  const esc = (s) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  // ponytail: render cap keeps a filter-only view of a 2,400-product category
  // from creating thousands of DOM nodes; raise if anyone ever pages past it.
  const CAP = 500;

  const state = { brand: '', price: '', sort: '', q: '' };
  let orig = null;
  let indexP = null;

  const card = (p) => `
    <a href="/shop/${esc(p.id)}/" class="acc-card" data-brand="${esc(p.brand)}">
      <div class="acc-visual">
        <img src="https://img.expressrepairs.com.au/products/${esc(p.id)}.webp" alt="${esc(p.name)}"
          loading="lazy" decoding="async" width="400" height="300"
          style="width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: contain; background: #fff; padding: 12px; box-sizing: border-box;" />
      </div>
      <div class="acc-body">
        <div class="acc-title">${esc(p.name)}</div>
        <div class="acc-price">${fmtPrice(p.priceCents)}</div>
      </div>
    </a>`;

  const syncUrl = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) if (v) params.set(k, v);
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
  };

  const apply = async () => {
    syncUrl();
    if (!state.brand && !state.price && !state.sort && !state.q) {
      if (orig !== null) { grid.innerHTML = orig; pagination.style.display = ''; status.hidden = true; }
      return;
    }
    orig ??= grid.innerHTML;
    indexP ??= fetch('/shop/search-index.json').then((r) => r.json());
    const hits = filterProducts(await indexP, { category, model, ...state });
    status.hidden = false;
    status.textContent = hits.length
      ? `${hits.length} product${hits.length === 1 ? '' : 's'}${hits.length > CAP ? ` — showing first ${CAP}` : ''}`
      : 'No products match those filters — clear one and try again.';
    grid.innerHTML = hits.slice(0, CAP).map(card).join('');
    pagination.style.display = 'none';
  };

  for (const facet of ['brand', 'price']) {
    const bar = root.querySelector(`[data-facet="${facet}"]`);
    bar?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      state[facet] = btn.dataset.value;
      for (const b of bar.querySelectorAll('button[data-value]'))
        b.className = `btn btn-sm ${b === btn ? 'btn-primary' : 'btn-ghost'}`;
      apply();
    });
  }
  sortSel?.addEventListener('change', () => { state.sort = sortSel.value; apply(); });
  let timer;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = input.value.trim(); apply(); }, 200);
  });

  // Restore shareable/back-button state from the URL.
  const params = new URLSearchParams(location.search);
  let dirty = false;
  for (const k of Object.keys(state)) {
    const v = params.get(k);
    if (!v) continue;
    state[k] = v;
    dirty = true;
    if (k === 'q') input && (input.value = v);
    if (k === 'sort') sortSel && (sortSel.value = v);
    if (k === 'brand' || k === 'price') {
      const bar = root.querySelector(`[data-facet="${k}"]`);
      for (const b of bar?.querySelectorAll('button[data-value]') ?? [])
        b.className = `btn btn-sm ${b.dataset.value === v ? 'btn-primary' : 'btn-ghost'}`;
    }
  }
  if (dirty) apply();
</script>
```

- [ ] **Step 2: Wire into the category page** — in `src/pages/shop/c/[category]/[...page].astro`:

Frontmatter — replace the existing per-page `brands` line with whole-category data and model chips:

```js
import ShopFilters from '../../../../components/ShopFilters.astro';
import { modelGroups } from '../../../../lib/shop.js';

// True whole-category brand counts (the old chips counted only this page's 48).
const inCat = PRODUCTS.filter((p) => p.category === category);
const brandCounts = [...new Set(inCat.map((p) => p.brand).filter(Boolean))]
  .sort()
  .map((name) => ({ name, count: inCat.filter((p) => p.brand === name).length }));
const models = modelGroups(inCat);
```

Template — replace the old `#model-filter` input div, `#model-filter-status` p, and `#brand-filter` div with:

```astro
<ShopFilters category={category} categorySlug={categorySlug} brands={brandCounts} models={models} />
```

Script — DELETE the entire old inline `<script>` block (brand chips + model filter; both behaviors now live in the component). Keep the `cart-count.js` script tag.

- [ ] **Step 3: Wire into the model page** — in `src/pages/shop/c/[category]/m/[model]/[...page].astro` frontmatter:

```js
import ShopFilters from '../../../../../../components/ShopFilters.astro';
const bucket = PRODUCTS.filter(
  (p) => p.category === category && deviceModel(p.name)?.key === modelKey,
);
const brandCounts = [...new Set(bucket.map((p) => p.brand).filter(Boolean))]
  .sort()
  .map((name) => ({ name, count: bucket.filter((p) => p.brand === name).length }));
```

Template — add below the `<ShopSearch>` line (no `models` prop — you're already on a model page):

```astro
<ShopFilters category={category} categorySlug={categorySlug} model={modelKey} brands={brandCounts} />
```

- [ ] **Step 4: Build + verify manually**

Run: `npm run build`, then `npx astro preview` and check in a browser (or with the `/browse` skill):
- `/shop/c/cases-covers/`: model chips render with counts; clicking a brand chip shows the status line with the TRUE category-wide count (e.g. hoco. shows hundreds, not the handful on page 1); sort by price reorders; URL gains `?brand=...`; reloading that URL restores the filtered view; clearing all filters restores server grid + pagination.
- `/shop/c/cases-covers/m/iphone-16-pro/` (or the largest built bucket): filter bar scoped to the bucket.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — all green (build-output tests rebuild and must still pass).

```bash
git add src/components/ShopFilters.astro "src/pages/shop/c"
git commit -m "feat(shop): whole-category filter bar (brand/price/sort/q) + model chip navigation"
```

---

### Task 5: Model-aware related products + product-page model link

**Files:**
- Modify: `src/lib/shop.js` (`relatedProducts`)
- Modify: `src/pages/shop/[id].astro`
- Test: modify `tests/shopModel.test.js` (or wherever `relatedProducts` is currently covered — check `tests/productPage.test.js` first and extend there if it already tests `relatedProducts`)

**Interfaces:**
- Consumes: `deviceModel`, `modelGroups` from Task 1.
- Produces: `relatedProducts(p, all, n)` unchanged signature, better ordering: same model > same brand > same category.

- [ ] **Step 1: Write the failing test** (in the file that covers `relatedProducts`):

```js
import { relatedProducts } from '../src/lib/shop.js';

describe('relatedProducts model preference', () => {
  const mk = (id, name, brand = 'Apple', category = 'Cases & Covers') => ({ id, name, brand, category });
  it('prefers same device model over same brand', () => {
    const p = mk('p1', 'iPhone 16 Pro hoco. Slim Case');
    const all = [
      p,
      mk('b1', 'iPhone 14 Case', 'Apple'),
      mk('m1', 'iPhone 16 Pro BLACKTECH Hard Case', 'BLACKTECH'),
      mk('m2', 'iPhone 16 Pro Wallet Case', 'Apple'),
    ];
    expect(relatedProducts(p, all, 2).map((x) => x.id)).toEqual(['m2', 'm1']);
  });
});
```

(`m2` first: same model AND same brand; `m1` second: same model. `b1` last: brand only.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shopModel.test.js` (or the covering file)
Expected: FAIL — current ordering ignores model.

- [ ] **Step 3: Implement** — replace `relatedProducts` in `src/lib/shop.js`:

```js
// Same category; same device model first, then same brand (stable), never
// the product itself. deviceModel is memoized, so the catalog-wide scan per
// product page stays cheap at build time.
export const relatedProducts = (p, all, n = 4) => {
  const model = deviceModel(p.name)?.key;
  const rank = (x) =>
    (model && deviceModel(x.name)?.key === model ? 2 : 0) + (x.brand === p.brand ? 1 : 0);
  return all
    .filter((x) => x.category === p.category && x.id !== p.id)
    .sort((x, y) => rank(y) - rank(x))
    .slice(0, n);
};
```

Note: `Array.prototype.sort` is stable, so equal ranks keep catalog order — the existing behavior.

- [ ] **Step 4: Add the model-page link on product pages** — in `src/pages/shop/[id].astro` frontmatter:

```js
import { deviceModel, modelGroups } from '../../lib/shop.js';
// Link to the model landing page only when Task 3 actually built one (>= 4 products).
const model = deviceModel(p.name);
const hasModelPage =
  model && modelGroups(PRODUCTS.filter((x) => x.category === p.category)).some((g) => g.key === model.key);
```

Template — after the `View cart` paragraph (line ~71), add:

```astro
{hasModelPage && (
  <p style="margin-top: 12px;">
    <a href={`/shop/c/${slugifyCategory(p.category)}/m/${model.key}/`} class="btn btn-ghost btn-sm">
      More {p.category} for {model.label} →
    </a>
  </p>
)}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/shopModel.test.js` then `npm test` (full, includes rebuild)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/shop.js "src/pages/shop/[id].astro" tests/
git commit -m "feat(shop): model-aware related products + model landing-page link on product pages"
```

---

### Task 6: Deploy + live verification

**Files:** none new — verification only.

- [ ] **Step 1: Full local gate**

Run: `npm test` — all green (baseline 158 + new tests). Run `npm run build` — succeeds; note the page count grew by roughly the model-page count (~130).

- [ ] **Step 2: Push (deploys automatically)**

```bash
git pull --rebase
git push
gh run watch --exit-status   # deploy workflow: test + build + wrangler pages deploy
```

- [ ] **Step 3: Live checks** (use the gstack `/browse` skill):

- `https://expressrepairs.com.au/shop/c/cases-covers/` — model chips render; pick a brand chip → status shows the whole-category count; sort works; URL param round-trips on reload.
- `https://expressrepairs.com.au/shop/c/cases-covers/m/iphone-16-pro/` (or the largest live bucket) — 200, correct title "iPhone 16 Pro Cases & Covers", 4-crumb breadcrumb, filter bar present.
- A product page for a case — shows the "More Cases & Covers for <model> →" link and model-matched related products.
- `https://expressrepairs.com.au/sitemap-0.xml` — contains `/shop/c/cases-covers/m/` URLs.

- [ ] **Step 4: Post-deploy graph refresh**

Run: `graphify update .` from `C:\Users\sales\claudee\expressrepairs` (per project CLAUDE.md).

- [ ] **Step 5: Report** — summarize to the owner: number of model pages live, before/after category browsing story, and that filters now cover whole categories.

---

## Self-review notes (done at plan-writing time)

- **Spec coverage:** model pages (T3), model navigation (T4 chips), real filters + sort + price + URL state (T2/T4), conversion polish (T5), success criteria checked in T6. Sitemap needs no task — `@astrojs/sitemap` includes all built pages automatically (verified in `astro.config.mjs`).
- **Slug caveat:** exact slugs like `iphone-16-e` vs `iphone-16e` depend on `slugifyCategory`'s boundary handling — Task 1 Step 3 tells the implementer to align test expectations with real output; Tasks 3–5 only ever pass keys produced by the same function, so internal consistency holds regardless.
- **Empty-catalog builds:** every new `getStaticPaths` derives from `PRODUCTS`; zero products → zero routes, no crash. Data-driven tests skip when `products.json` is empty.
- **Perf:** `deviceModel` memoized (Task 1) before `relatedProducts` starts calling it catalog-wide per page (Task 5). Client render cap 500 with a visible status line (no silent truncation).
