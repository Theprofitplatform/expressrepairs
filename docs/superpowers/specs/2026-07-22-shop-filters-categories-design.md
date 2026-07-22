# Shop Filters & Categories — Design

**Date:** 2026-07-22
**Status:** Proposed (written autonomously — owner review welcome; decisions below used sensible defaults)

## Problem (verified on live data, 3,518 products)

1. **"Cases & Covers" holds 2,474 products (70% of the shop)** — a 52-page
   paginated wall. Nobody browses 52 pages; they need "cases for MY phone".
2. **The brand filter is cosmetic.** Chips on `/shop/c/<category>/` only
   hide/show the 48 cards rendered on the current page, so clicking "hoco."
   on page 1 shows a handful of items even when hundreds exist in the category.
3. **No sort and no price filter** anywhere in the shop.
4. Model discovery is a free-text input only — works, but invisible to
   Google and requires the customer to type.

Measured: a leading-token extractor parses a device model from **93%** of
names in the device-scoped categories (Cases & Covers, Screen Protection,
Tablet & iPad Cases) → 178 model buckets, **107 buckets with ≥ 4 products
covering 2,578 products**.

## Design

Two complementary pieces, both derived at build time from the synced
`products.json` (no new services, no new runtime deps):

### 1. Device-model subcategory pages (categories fix + SEO)

- New pure helpers in `src/lib/shop.js`:
  - `deviceModel(name)` → `{ key, label }` or `null` — parses the leading
    device model ("iPhone 16 Pro", "Galaxy S24 Ultra", "Pixel 8a", "iPad Pro 11").
  - `modelGroups(products, min = 4)` → `[{ key, label, count }]` sorted by count.
- New static route `/shop/c/[category]/m/[model]/` (paginated, 48/page) for
  every (category, model) bucket with ≥ 4 products (~107 pages + pagination).
  Each page: breadcrumb (Home / Shop / Category / Model), H1 like
  "iPhone 16 Pro Cases & Covers", meta description, breadcrumb JSON-LD.
  These are the "iphone 16 pro case" SEO landing pages the shop lacks.
- Category pages get model link-chips (grouped, with counts) above the grid;
  model pages link back to the parent category. Products whose model can't be
  parsed stay reachable via the category grid and text filter — nothing is hidden.
- Sitemap: automatic (`@astrojs/sitemap` includes all built pages).

### 2. Real full-category filters (filters fix)

Replace the per-page-only brand chip script with one filter bar on category
and model pages, all driven by the existing `search-index.json`
(id/name/brand/category/priceCents — already fetched by the model text filter):

- **Brand chips** with true whole-category counts (computed at build).
- **Sort:** Featured (server order) / Price low→high / Price high→low.
- **Price presets:** Under $20 / $20–$50 / Over $50.
- Existing **model text filter** folds into the same pipeline.

Behavior: with no filters active the server-rendered grid + pagination is
untouched (SEO unchanged). Any active filter fetches the index once, runs a
pure `filterProducts(index, opts)` (new `src/shop/filter-core.js`, unit
tested, shared client/build), renders ALL matches client-side and hides
pagination; clearing restores the server HTML. Filter state syncs to URL
query params (`?brand=&price=&sort=&q=`) via `history.replaceState` and is
restored on load, so filtered views are shareable and back-button safe.

### 3. Small conversion polish (falls out of the extractor)

- `relatedProducts()` prefers same **model**, then same brand, then category.
- Product pages link to the product's model page ("More for iPhone 16 Pro").

## Approaches considered

- **A (chosen): static model pages + index-driven client filters.** Zero new
  runtime infra, big SEO surface, filters finally truthful. Cost: ~130 more
  static pages (build is already ~3,800).
- **B: client-side-only faceting, no new pages.** Fixes filters but adds no
  SEO surface and leaves the 52-page category as the only crawlable path. Rejected.
- **C: recategorize in DXPOS / sync script.** Owner-side data work, slow,
  and the model dimension is orthogonal to product-type categories. Rejected.

## Out of scope

- Payments (blocked on owner's Stripe keys), reviews (none exist — content
  integrity rule), per-brand static routes (client filter covers it), any
  change to the 9 customer-facing categories from `catalog-fixes.mjs`.

## Success criteria

- Every model bucket ≥ 4 products has an indexable landing page.
- Brand chip counts equal true category counts; selecting one shows every
  match in the category, not just the current page's.
- Sort and price filters work on category and model pages.
- `npm test` green (baseline 158), `npm run build` succeeds, live pages verified.
