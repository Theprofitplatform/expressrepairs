# Shop UI/UX Polish — Design

**Date:** 2026-07-22
**Status:** Proposed (autonomous defaults — owner review welcome)

## Problem (from the live Cases & Covers page)

The filters/categories feature shipped 2026-07-22 works, but the category
page UI is poor:

1. **90 model chips render as a flat ~13-row wall**, ordered by product count
   (reads as random: iPhone 16 Plus, Galaxy S24 Plus, iPhone 16 Pro, …).
   Unscannable, and it pushes products far below the fold.
2. **Three more filter rows** (text filter, 15 brand chips incl. singletons
   like "hoco. (1)", price chips + sort) stack under the chip wall.
3. **No product is visible above the fold** on a 1080p screen.
4. `.section` padding (96px) wastes the top of every shop page; `.acc-grid`
   is fixed 3 columns even at the 1320px container, so cards are oversized
   with sparse density (3 per row where 5 fit).

## Design (native-first, no JS added beyond what exists)

### 1. Group + collapse the model wall
New pure helper `modelFamilies(groups)` in `src/lib/shop.js`: buckets
`modelGroups()` output into device families (iPhone / Galaxy / Pixel / iPad,
derived from the label's first word), models sorted newest-first
(numeric-aware label sort, descending). `ShopFilters.astro` renders each
family as a native `<details class="model-group">` — collapsed by default,
`<summary>` shows "iPhone (34 models)". 13 rows become 4 one-line rows; all
90 links stay in the DOM (still crawlable, SEO unchanged). No JS.

### 2. One-row filter toolbar
Replace the brand chip rows with a native `<select>` (styled like the
existing Sort select, options carry counts). Toolbar = single flex row that
wraps on mobile: [model/keyword filter input, grows] [Brand select]
[price chips] [Sort select]. The filter script's brand facet moves from
chip-clicks to select-change; URL state/restore unchanged.

### 3. Density + fold
- Shop templates (category, model, search, product) switch `class="section"`
  (96px pad) → the existing `section-tight` (64px).
- New `.acc-grid--dense` modifier: `repeat(auto-fill, minmax(230px, 1fr))`,
  2 columns on mobile, tighter card padding/title. Applied to category,
  model, search grids and the product page's "More like this" grid. The
  `/shop/` landing tiles and homepage keep the base `.acc-grid` (their
  big-tile look is intentional; `sections.jsx` shares the class).
- Category page gains the product-count line the model page already has.

Result: breadcrumb → H1 + count → search → 4 collapsed family rows →
1 toolbar row → product grid, with the first card row above the fold.

## Approaches considered
- **A (chosen): native `<details>` groups + select-based brand facet + CSS
  density modifier.** Zero new JS, links stay crawlable, ~1 helper + markup
  + ~20 lines CSS.
- **B: JS mega-menu / searchable combobox for models.** More polish, new JS
  surface, kills crawlable links unless duplicated. Rejected (YAGNI).
- **C: cap chips at top-12 + "view all" page.** Loses the on-page links'
  crawl value or adds a page. Rejected.

## Out of scope
Card imagery/branding, checkout, /shop/ landing redesign, sticky filter bar,
mobile bottom-sheet filters.

## Success criteria
- Category page: model nav ≤ 5 rows collapsed; one toolbar row; ≥ 1 product
  row above the fold at 1366×768; all 90 model links still in the HTML.
- Grid shows ≥ 4 columns at the 1320px container width.
- `npm test` green (203 baseline), build succeeds, live pages verified.
