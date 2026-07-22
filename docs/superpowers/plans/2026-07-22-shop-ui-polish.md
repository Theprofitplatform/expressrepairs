# Shop UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shop category/model pages scannable: collapse the 90-chip model wall into 4 native `<details>` family groups, merge the filter rows into one toolbar, and raise product density so cards appear above the fold.

**Architecture:** Pure display helper (`modelFamilies`) + markup/CSS rework of the existing `ShopFilters.astro` and shop templates. No new JS behaviors beyond re-binding the brand facet from chips to a `<select>`; no data or route changes.

**Tech Stack:** Astro 5 (static), vitest, plain CSS in `src/styles/global.css`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-22-shop-ui-polish-design.md`

---

## Context a fresh session needs

**Repo:** `C:\Users\sales\claudee\expressrepairs\repo`, branch `main`, GitHub `Theprofitplatform/expressrepairs` (public). **Every push to main deploys the live site** (deploy workflow runs `npm test` + `npm run build` first). A parallel SEO agent sometimes commits — `git pull --rebase` before every push.

**Verify commands:** `npm test` (203 green baseline; includes a ~90s site rebuild in `tests/build-output.test.js`) and `npm run build`.

**What shipped just before this plan (2026-07-22, commits ea59838..588f4f1):**
- `src/lib/shop.js`: `deviceModel(name)` (memoized) and `modelGroups(products, min=4)` → `[{ key, label, count }]` sorted by count desc.
- `src/components/ShopFilters.astro`: renders (a) a FLAT `models.map(...)` chip nav — the wall this plan replaces; (b) a `#model-filter` text input; (c) `data-facet="brand"` chip buttons; (d) `data-facet="price"` chip buttons + `#sort-select`; (e) `#filter-status` (`role="status"`); script filters via `src/shop/filter-core.js` `filterProducts(index, {category, model, brand, price, sort, q})`, syncs URL params `brand/price/sort/q` with `history.replaceState` seeded from `location.search`, restores state on load, render cap 500.
- Category page `src/pages/shop/c/[category]/[...page].astro` passes `<ShopFilters category categorySlug brands={brandCounts} models={modelGroups(inCat)} />`; model page `.../m/[model]/[...page].astro` passes the same minus `models`.
- Tests: `tests/shopModel.test.js`, `tests/filterCore.test.js`, `tests/build-output.test.js` (greps built HTML).

**CSS facts:** `.section { padding: 96px 0 }`, `.section-tight { padding: 64px 0 }` (global.css:166-167). `.acc-grid { grid-template-columns: repeat(3, 1fr) }` with 2-col ≤900px, 1-col ≤560px (global.css:553-555). `.acc-grid` is ALSO used by `src/pages/shop/index.astro` (category tiles) and `src/components/sections.jsx` (homepage) — do NOT change the base class; add a modifier.

## Global Constraints

- No new runtime npm dependencies; no new client JS beyond re-binding the brand facet to a `<select>`.
- All 90 model links must remain in the server-rendered HTML (crawlable) — `<details>` content is fine, JS-injected content is not.
- Do not change filter behavior, URL param names, or `filterProducts` — this is a presentation rework.
- Base `.acc-grid` and everything outside `/shop/` pages must be visually unchanged.
- Tests must not hardcode product ids/names from `products.json`.
- Commit per task; controller pushes after review (`git pull --rebase` first). Quote bracket paths on `git add`.

---

### Task 1: `modelFamilies()` display helper

**Files:**
- Modify: `src/lib/shop.js`
- Test: `tests/shopModel.test.js` (append a describe)

**Interfaces:**
- Consumes: `modelGroups()` output shape `[{ key, label, count }]`.
- Produces: `modelFamilies(groups) -> [{ family: string, models: [{key,label,count}] }]` — families in fixed order iPhone, Galaxy, Pixel, iPad (omitting empty ones); models within a family sorted by label descending, numeric-aware (iPhone 16 Pro before iPhone 7). Task 2 renders this.

- [ ] **Step 1: Write the failing test** — append to `tests/shopModel.test.js`:

```js
import { modelFamilies } from '../src/lib/shop.js'; // merge into the existing import line

describe('modelFamilies', () => {
  const g = (label, count = 5) => ({ key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, count });
  it('groups by family in fixed order, models newest-first (numeric-aware)', () => {
    const groups = [
      g('Galaxy S24 Ultra'), g('iPhone 7'), g('iPhone 16 Pro'), g('Pixel 8'), g('Galaxy A15'), g('iPhone 16'),
    ];
    const fams = modelFamilies(groups);
    expect(fams.map((f) => f.family)).toEqual(['iPhone', 'Galaxy', 'Pixel']);
    expect(fams[0].models.map((m) => m.label)).toEqual(['iPhone 16 Pro', 'iPhone 16', 'iPhone 7']);
  });
  it('omits empty families and returns [] for no groups', () => {
    expect(modelFamilies([])).toEqual([]);
    expect(modelFamilies([g('iPad Pro 11')]).map((f) => f.family)).toEqual(['iPad']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shopModel.test.js`
Expected: FAIL — `modelFamilies` not exported.

- [ ] **Step 3: Implement** — append to `src/lib/shop.js`:

```js
// Display grouping for the model-chip nav: 90 flat chips read as noise, so
// bucket modelGroups() output into device families, newest models first.
const FAMILY_ORDER = ['iPhone', 'Galaxy', 'Pixel', 'iPad'];
export const modelFamilies = (groups) => {
  const by = new Map();
  for (const gm of groups) {
    const family = gm.label.split(' ')[0];
    by.set(family, [...(by.get(family) ?? []), gm]);
  }
  return FAMILY_ORDER.filter((f) => by.has(f)).map((family) => ({
    family,
    models: [...by.get(family)].sort((a, b) =>
      b.label.localeCompare(a.label, undefined, { numeric: true }),
    ),
  }));
};
```

Note: `iPhone 16 Pro` vs `iPhone 16` — descending numeric localeCompare puts the longer "16 Pro" first because "16 Pro" > "16" at the string tail; the test asserts the exact order — if the comparator disagrees, fix the comparator (e.g. compare on `label` with the family prefix stripped) until the test's order holds. The test is the contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shopModel.test.js`
Expected: PASS.

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — all green.

```bash
git add src/lib/shop.js tests/shopModel.test.js
git commit -m "feat(shop): modelFamilies display grouping (family buckets, newest-first)"
```

---

### Task 2: ShopFilters rework — collapsed family groups + one-row toolbar

**Files:**
- Modify: `src/components/ShopFilters.astro`
- Modify: `src/styles/global.css` (append shop-filter styles)

**Interfaces:**
- Consumes: `modelFamilies` from `src/lib/shop.js` (component computes families from its existing `models` prop — page frontmatter unchanged).
- Produces: same component API (`category, categorySlug, model, brands, models`); brand facet becomes `<select id="brand-select">`; everything else (URL params, filterProducts call, status line, cap 500) unchanged.

- [ ] **Step 1: Replace the model nav markup.** In `ShopFilters.astro` frontmatter add:

```js
import { modelFamilies } from '../lib/shop.js';
const families = modelFamilies(models);
```

Replace the current `{models.length > 0 && (<nav aria-label="Shop by model" ...flat chips...)}` block with:

```astro
{families.length > 0 && (
  <nav aria-label="Shop by model" class="model-nav">
    {families.map(({ family, models: fam }) => (
      <details class="model-group">
        <summary>{family} <span class="model-count">({fam.length} model{fam.length === 1 ? '' : 's'})</span></summary>
        <div class="chip-row">
          {fam.map((m) => (
            <a href={`/shop/c/${categorySlug}/m/${m.key}/`} class="btn btn-ghost btn-sm">
              {m.label} <span style="opacity:.6">({m.count})</span>
            </a>
          ))}
        </div>
      </details>
    ))}
  </nav>
)}
```

- [ ] **Step 2: Merge the filter rows into one toolbar.** Replace the three current blocks — the `#model-filter` wrapper div, the `data-facet="brand"` chip div, and the price+sort row — with ONE toolbar (keep `#filter-status` after it, unchanged):

```astro
<div class="filter-toolbar">
  <input
    id="model-filter"
    type="search"
    placeholder="Filter by your model — e.g. iPhone 15 Pro, S24 Ultra"
    aria-label="Filter this list by device model or keyword"
    autocomplete="off"
  />
  {brands.length > 1 && (
    <label class="filter-label">
      Brand
      <select id="brand-select" aria-label="Filter by brand">
        <option value="">All brands</option>
        {brands.map((b) => (
          <option value={b.name}>{b.name} ({b.count})</option>
        ))}
      </select>
    </label>
  )}
  <div data-facet="price" class="chip-row" aria-label="Filter by price">
    <button class="btn btn-primary btn-sm" data-value="">Any price</button>
    <button class="btn btn-ghost btn-sm" data-value="under-20">Under $20</button>
    <button class="btn btn-ghost btn-sm" data-value="20-50">$20–$50</button>
    <button class="btn btn-ghost btn-sm" data-value="over-50">Over $50</button>
  </div>
  <label class="filter-label">
    Sort
    <select id="sort-select">
      <option value="">Featured</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
    </select>
  </label>
</div>
```

- [ ] **Step 3: Script — rebind brand to the select.** In the component script:
  - Add `const brandSel = document.getElementById('brand-select');`
  - Change the facet loop `for (const facet of ['brand', 'price'])` to only `['price']`.
  - Add: `brandSel?.addEventListener('change', () => { state.brand = brandSel.value; apply(); });`
  - In the URL-restore loop, the `k === 'brand'` case becomes `if (k === 'brand') brandSel && (brandSel.value = v);` (price keeps the chip-class loop; drop brand from that branch).

  Everything else (apply, syncUrl, card, cap, status) stays byte-identical.

- [ ] **Step 4: CSS.** Append to `src/styles/global.css` (below the acc-grid block):

```css
/* ============ Shop filter bar (category/model pages) ============ */
.model-nav { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.model-group { border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.model-group summary {
  cursor: pointer; padding: 10px 16px; font-weight: 700; font-size: 15px; list-style: none;
}
.model-group summary::-webkit-details-marker { display: none; }
.model-group summary::after { content: "▾"; float: right; opacity: .5; transition: transform .15s ease; }
.model-group[open] summary::after { transform: rotate(180deg); }
.model-group .model-count { font-weight: 500; color: var(--text-muted); font-size: 13px; }
.model-group .chip-row { padding: 4px 12px 14px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-toolbar {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 16px;
}
.filter-toolbar input[type="search"] {
  flex: 1 1 260px; min-width: 220px; box-sizing: border-box; padding: 10px 14px; font-size: 16px;
  border: 1px solid var(--border); border-radius: 10px;
}
.filter-label { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; white-space: nowrap; }
.filter-label select { padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px; max-width: 190px; }
```

Remove the now-dead inline styles the old markup carried (the input's inline style block, the sort label's inline styles) — styling lives in the classes above.

- [ ] **Step 5: Build + verify manually**

Run: `npm run build`, then `npx astro preview`; check `/shop/c/cases-covers/`:
- 4 collapsed family rows (iPhone/Galaxy/Pixel — iPad only where present), expanding shows newest-first chips; ALL model links present in page source (curl and count `m/` hrefs — must equal the category's bucket count).
- One toolbar row on desktop; brand select filters (status shows whole-category count), `?brand=` round-trips on reload, clearing restores server grid.
- Price chips + sort unchanged in behavior.

- [ ] **Step 6: Full suite + commit**

Run: `npm test` — all green.

```bash
git add src/components/ShopFilters.astro src/styles/global.css
git commit -m "feat(shop): collapse model nav into family groups + one-row filter toolbar"
```

---

### Task 3: Density + above-the-fold products

**Files:**
- Modify: `src/styles/global.css` (append `.acc-grid--dense`)
- Modify: `src/pages/shop/c/[category]/[...page].astro` (grid class, section-tight, count line)
- Modify: `src/pages/shop/c/[category]/m/[model]/[...page].astro` (grid class, section-tight)
- Modify: `src/pages/shop/search.astro` (grid class, section-tight)
- Modify: `src/pages/shop/[id].astro` (related grid class, section-tight)
- Test: `tests/build-output.test.js` (extend the existing category-page assertion)

**Interfaces:**
- Consumes: nothing new. Produces: `.acc-grid--dense` modifier; `/shop/` landing and homepage keep base `.acc-grid` untouched.

- [ ] **Step 1: Failing test.** In `tests/build-output.test.js`, inside the existing `'builds a product detail page and a paginated category page per product'` test, after the `expect(category).toContain('Page 1 of');` line add:

```js
    expect(category).toContain('acc-grid acc-grid--dense');
    expect(category).toContain('section-tight');
```

Run: `npx vitest run tests/build-output.test.js` — Expected: FAIL on the new assertions (after its ~90s rebuild).

- [ ] **Step 2: CSS.** Append to `src/styles/global.css`:

```css
/* Dense product grid for shop browsing pages (landing/homepage keep base). */
.acc-grid--dense { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
@media (max-width: 560px) { .acc-grid--dense { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
.acc-grid--dense .acc-body { padding: 12px 14px 16px; }
.acc-grid--dense .acc-title { font-size: 14.5px; font-weight: 600; }
```

(Place AFTER the base `.acc-grid` media queries so the modifier wins at equal specificity.)

- [ ] **Step 3: Apply per page.**
- Category page: `<main id="main-content" class="section">` → `class="section-tight"`; `<div class="acc-grid" data-category={category} ...>` → `class="acc-grid acc-grid--dense"`; under the H1 add the count line the model page already has: `<p class="hero-sub">{page.total} products — ship Australia-wide (free over $99) or free pickup in store.</p>`.
- Model page: same two class changes (`section-tight`, `acc-grid acc-grid--dense`). Its count line already exists.
- `search.astro`: `section` → `section-tight`; results grid gets `acc-grid--dense` (check how its client script targets the grid — it selects by class `.acc-grid`, which still matches).
- `[id].astro`: `section` → `section-tight`; the "More like this" grid → `acc-grid acc-grid--dense`.
- ShopFilters' client `card()` output renders INTO the existing grid element, so no script change is needed for density.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/build-output.test.js` — PASS. Then `npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css "src/pages/shop/c/[category]/[...page].astro" "src/pages/shop/c/[category]/m/[model]/[...page].astro" src/pages/shop/search.astro "src/pages/shop/[id].astro" tests/build-output.test.js
git commit -m "feat(shop): dense product grid + tighter sections on shop browse pages"
```

---

### Task 4: Deploy + live verification

**Files:** none — verification only.

- [ ] **Step 1:** `npm test` (all green) and `npm run build`.
- [ ] **Step 2:** `git pull --rebase && git push`, then watch the deploy workflow to success.
- [ ] **Step 3: Live checks** on `https://expressrepairs.com.au/shop/c/cases-covers/`:
- Page source still contains ALL model hrefs (`grep -o 'm/[a-z0-9-]*/' | sort -u | wc -l` ≥ 89).
- `<details class="model-group">` present (≥ 2 families); `#brand-select` present; old flat chip nav gone.
- `acc-grid--dense` and `section-tight` present on category + model pages.
- Screenshot or browser-check at ~1366×768: first product row visible without scrolling past filters.
- [ ] **Step 4:** `graphify update .` from `C:\Users\sales\claudee\expressrepairs`; report to owner.

---

## Self-review notes (plan-writing time)

- Spec §1 → Task 1+2 (grouped `<details>`, links in DOM); §2 → Task 2 (toolbar, brand select rebind only); §3 → Task 3 (dense modifier scoped off the shared base class; landing/homepage untouched); success criteria → Task 4 checks.
- The comparator caveat in Task 1 makes the TEST the contract, so implementer can't silently ship a wrong order.
- `search.astro` grid targeting verified as class-based (`.acc-grid`) so adding the modifier is safe; the implementer re-checks in place.
- No behavior/URL/param changes ⇒ `tests/filterCore.test.js` and the URL-restore logic stay valid; only brand UI binding changes.
