# Shop category page UX upgrade — design

Date: 2026-07-24
Scope: `/shop/c/<category>/` pages (and the model/tag/search pages that share the
same components). Goals, per owner: conversion, visual polish, filter UX
overhaul, mobile experience. Approach approved: evolve existing static Astro +
vanilla JS in place — no new dependencies, no hydration.

## Problems (from the live Cases & Covers page)

1. Products start ~6 control-rows below the fold: search box, 9 tag chips,
   3 model accordions, then a 4-control toolbar.
2. Two search boxes with different behaviour sit near each other (site search
   vs. model filter).
3. Product cards are bare: truncated long names, no brand, no add-to-cart.
4. No visible active-filter state, no "clear all".
5. Nothing is optimised for mobile beyond wrapping.

## Design

### 1. Compact sticky toolbar (`ShopFilters.astro` rework)

One slim bar, sticky below the site nav (`position: sticky`), containing:

- **Model box**: the existing text input, now backed by a native `<datalist>`
  of all model labels in scope. Typing still live-filters the grid (existing
  `q` behaviour). If the entered value exactly matches a model label, navigate
  to that model's SEO page `/shop/c/<cat>/m/<key>/`.
- **Brand** `<select>` (unchanged behaviour).
- **Price** `<select>` (replaces the 4 chip buttons; same 3 buckets).
- **Sort** `<select>` (unchanged).
- **Active-filter chips**: one dismissible chip per active facet plus
  "Clear all", rendered under the bar only when filters are active.

The redundant `ShopSearch` box is removed from category/model/tag pages (site
search remains on `/shop/` and in the nav); the model box is the single search
affordance on these pages.

- **SEO links preserved**: the current model-family accordions (118 static
  `<a>` links) and tag chips move into one collapsed
  `<details class="model-group">Browse by model / type</details>` directly
  under the toolbar. Crawlers still see every link; shoppers see one row.

### 2. Product cards (`ProductCard.astro`, new shared component)

Card markup is currently duplicated in 6 templates plus the client-side
`card()` renderer in `ShopFilters.astro`. Consolidate into one Astro component
used by the category, model, tag and search-adjacent grids, and mirror it in
the client renderer:

- Brand eyebrow line (small, muted, uppercase) when `p.brand` exists.
- Title clamped to 2 lines (`-webkit-line-clamp`), so cards align.
- Price row + **quick-add button** (`data-add-to-cart`, `data-id`,
  `data-price`) — the existing `cart-count.js` handles cart writes and the
  Meta Pixel AddToCart event.
- `cart-count.js` switches from bind-per-button to **event delegation** on
  `document`, because filtered grids are re-rendered via `innerHTML` and
  per-button listeners would be lost.

### 3. Mobile

- On ≤700px the toolbar controls collapse into a sticky
  `<details>` "Filter & sort" disclosure (CSS-only; no JS).
- Grid stays 2-col; quick-add buttons sized for touch (min 40px target).

### 4. Out of scope

- `/shop/` landing and `sections.jsx` cards (separate surface, in-flight edits
  by another agent).
- Any change to `filter-core.js` semantics, pagination, or the 48/page size.
- New dependencies, React islands, image work.

## Files touched

- `src/components/ShopFilters.astro` — toolbar rework + client card renderer.
- `src/components/ProductCard.astro` — new.
- `src/pages/shop/c/[category]/[...page].astro`,
  `src/pages/shop/c/[category]/m/[model]/[...page].astro`,
  `src/pages/shop/t/[tag]/[...page].astro` — adopt ProductCard, drop ShopSearch.
- `src/shop/cart-count.js` — delegated clicks.
- `src/styles/global.css` — sticky toolbar, chips, card, mobile drawer styles.

## Error handling / edge cases

- Datalist match is case-insensitive exact match on the label; no match =
  plain text filter (current behaviour).
- Quick-add respects the existing MAX_QTY cap via `cart-store.js`.
- URL state (`?q=&brand=&price=&sort=`) keeps working, including restore.

## Testing

- Existing suite must stay green (158 tests incl. deviceModel coverage guard).
- Add small unit coverage only where logic is new (model label → key lookup).
- `npm run build` must succeed; manual spot-check of a category page.
