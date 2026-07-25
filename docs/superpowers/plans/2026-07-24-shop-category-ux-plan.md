# Shop category page UX — implementation plan

Spec: `docs/superpowers/specs/2026-07-24-shop-category-ux-design.md`
Branch: `feat/shop-category-ux` (worktree `wt-shop-ux`; main checkout untouched —
another agent has in-flight edits there). Tasks run **sequentially** — they
share files.

## Task 1 — Shared product card + quick add

- New `src/components/ProductCard.astro`: brand eyebrow, 2-line clamped title,
  price + quick-add button (`data-add-to-cart` `data-id` `data-price`).
- Adopt in `shop/c/[category]/[...page].astro`, `.../m/[model]/[...page].astro`,
  `shop/t/[tag]/[...page].astro`.
- Mirror the same markup in the client `card()` in `ShopFilters.astro`.
- `src/shop/cart-count.js`: replace per-button binding with one delegated
  `document` click listener on `[data-add-to-cart]` (keep qty-input, Pixel
  event, "Added ✓" feedback).
- CSS in `global.css`: eyebrow, line-clamp title, quick-add row; 40px touch
  targets on mobile.
- Verify: `npm test` green, `npm run build` succeeds.

## Task 2 — Sticky toolbar + filter overhaul

- Rework `ShopFilters.astro` per spec §1: sticky bar; model input +
  `<datalist>` (exact label match navigates to model page — pass
  label→`/shop/c/<cat>/m/<key>/` map from the server-rendered props); price
  chips → `<select>`; active-filter chips + Clear all; move model accordions +
  tag chips into one collapsed `<details>` under the bar.
- Remove `<ShopSearch />` from the three templates.
- Mobile ≤700px: controls inside a CSS-only sticky `<details>` "Filter & sort".
- Keep URL state sync/restore working (price now a select).
- Verify: `npm test`, `npm run build`, spot-check rendered HTML of one
  category page for the static model links.

## Task 3 — Verification pass

- Full `npm test` + `npm run build`.
- Preview a built category page; check toolbar stickiness, filtering, model
  navigation, quick add, mobile layout at 390px.
- Code review, then commit history tidy → PR.
