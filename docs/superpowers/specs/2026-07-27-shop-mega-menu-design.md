# Shop mega menu — design

**Date:** 2026-07-27
**Status:** built — this doc reflects what shipped, with review changes marked
*(revised)*

## Problem

`/shop/` is a landing page of 9 category tiles. Once a shopper is inside a
category, model, tag or product page, the only way to another category is the
browser back button or the footer. The nav is three flat links
(Repairs / Blog / Shop) on every shop page.

Two consequences:

1. **Navigation.** 9,411 products across 9 categories, 118 device models and 23
   type pages are reachable only by walking back up to `/shop/`.
2. **Internal linking.** Model pages are linked from exactly one place — a
   collapsed `<details>` inside their own category page. Tag pages likewise.
   The site ranks for almost nothing (2 keywords, one ranking page), so
   site-wide static links to the model/type pages are worth more here than they
   would be on a healthy domain.

## Decisions taken

| Question | Decision |
|---|---|
| Where does the "by device" column point? | Build new cross-category `/shop/m/<model>/` pages. A link labelled "iPhone 17 Pro" that lands on cases-only is dishonest. |
| Mobile (<900px)? | Desktop-only for now. `.nav-links` is already `display:none` below 900px — mobile has no nav at all. That is a real gap but a separate, larger piece of work. |
| Scope? | `/shop/*` pages only, via an opt-in prop on `SiteNav`. Repairs/blog/nbn page weight unchanged. |

## Design

### The panel

A four-column panel under the "Shop" nav item, rendered on `/shop/*` at ≥900px.

```
┌ Shop ▾ ────────────────────────────────────────────────────────────────┐
│ CATEGORIES           APPLE               SAMSUNG / GOOGLE      BY TYPE  │
│ Cases & Covers 6593  iPhone 17 Pro Max   Galaxy S26 Ultra      MagSafe  │
│ Screen Protect  860  iPhone 17 Pro       Galaxy S26            Wallet   │
│ Accessories     568  iPhone 17           Galaxy Z Fold 7       Clear    │
│ Cables & Chg    464  iPhone 16 Pro Max   Galaxy Z Flip 7       Rugged   │
│ Mounts&Holders  377  iPhone 16 Pro       Galaxy S25 Ultra      Tempered │
│ Tablet & iPad   254  iPhone 16           Pixel 10 Pro          Privacy  │
│ Audio           200  iPad Pro 13         Pixel 10              Powerbank│
│ Watch Cases      53  iPad Pro 11         Galaxy Tab S10        USB-C    │
│ AirPods Cases    42  All 43 Apple →      All 75 models →       (23, 2col)│
├────────────────────────────────────────────────────────────────────────┤
│ All 9,411 products · Free shipping over $99 · Free pickup · Search      │
└────────────────────────────────────────────────────────────────────────┘
```

~55 links. Exact model membership per column comes from `SHOP_MENU` (below),
not from this sketch — the sketch shows shape and volume only.

### Interaction

CSS only. The trigger stays a real `<a href="/shop/">`, so a click still
navigates and the trigger is never a dead end.

```css
.mega:hover .mega-panel,
.mega:focus-within .mega-panel { display: block; }
```

`:focus-within` fires when the trigger anchor itself receives focus, so tabbing
opens the panel and tabbing out closes it. Every item inside is a real `<a>`,
so keyboard and screen-reader users get the full list in reading order.

**No `aria-expanded`.** It cannot be kept truthful without JS, and a
permanently-`false` attribute misreports state to assistive tech — worse than
omitting it. The panel is wrapped in `<nav aria-label="Shop categories">`.

**No Escape-to-close.** Would require JS for one keystroke that focus-out
already covers. `ponytail:` if the panel later grows JS for any reason, add
Escape then.

### `SHOP_MENU` — computed once

`src/lib/shopMenu.js` builds the menu tree at **module load**, not per page.
Astro evaluates a module once per build, so ~10,000 pages share one
computation. Per-page evaluation would run `modelGroups` over 9,411 products
ten thousand times.

Shape:

```js
export const SHOP_MENU = {
  categories: [{ name, slug, count }],        // all 9, count desc
  families:   [{ family, models: [{ key, label, count }], total }],
  tags:       [{ tag, label, count }],        // the 23 that have pages
  total:      9411,
};
```

Sources, all existing, all reused unchanged: `slugifyCategory`, `modelGroups`,
`modelFamilies`, `TAG_RULES`/`tagsFor`.

Column assignment at `min = 10`: iPhone 34, Galaxy 63, Pixel 12, iPad 9. Grouped
into an Apple column (iPhone + iPad = 43) and a Samsung/Google column
(Galaxy + Pixel = 75).

*(revised)* Each column carries **two sub-groups with headings — 6 + 4** (iPhone 6,
iPad 4; Galaxy 6, Pixel 4), not a flat top-10. A flat slice of the concatenated
list would have shown ten iPhones and zero iPads, because iPhone sorts first.

*(revised — caught by screenshot, not by tests)* **Models are selected by product
count, then displayed in `modelFamilies`' newest-first order.** Either signal
alone picks a bad six, and the first build shipped the bad version:

- **Recency alone** (the original plan) sorts alphabetically among names whose
  second word isn't numeric, so `Galaxy Z Fold 7` outranks `Galaxy S26 Ultra`.
  The Samsung column rendered as six foldables — 17 to 39 products each — and
  the entire S line, the volume sellers, never appeared.
- **Count alone** leads Apple with `iPhone 16 Plus` (275) and drops every
  iPhone 17 except the Pro, because catalog depth lags a phone release by
  months.

Count answers "which models matter", family order answers "how should they
read". Three lines in `group()`. A generation-number heuristic was tried and
rejected: `Galaxy A55` parses as generation 55 and would outrank the S26.

*(revised)* The "by type" column lists **all 23 curated tags in a CSS
`columns: 2` split** rather than 10 plus an "All 23 →" link. There is no
`/shop/t/` index page to link to, and building one to justify a truncation the
panel does not need is backwards.

### The new route

`/shop/m/<model>/` — cross-category model pages.
`modelGroups(PRODUCTS, 10)` → **118 models, 203 pages after 48-per-page
pagination**. Threshold 10 (not the default 4) because a model page with 4
products is a thin page, and 154 models would not buy anything the 118 do not.

It is the existing `c/[category]/m/[model]/[...page].astro` shell with the
category filter dropped:

- `filterProducts` already accepts `model` without `category` — no change.
- `ShopFilters`' `goToModel()` already bails on empty `categorySlug` — no
  change. Pass `models={[]}` so no category-scoped model chips render.
- The page adds a chip row — "Cases & Covers (247) · Screen Protection (31) ·
  …" — linking down into the existing `/shop/c/<cat>/m/<model>/` pages, so the
  new tier funnels into the old one rather than competing with it.
- Breadcrumb: Home / Shop / {model}.
- Title: `{model} Cases, Screen Protectors & Accessories | Express Repairs`.

`/shop/m/` — one flat index of all 118 models grouped by family. Target of the
"All N models →" links. Without it those links have nowhere honest to go.

Sitemap picks both up automatically; `@astrojs/sitemap`'s filter excludes only
`/go/`, `/staff/`, `/shop/cart/`, `/shop/thanks/`, `/shop/search/`.

## Files

| Action | File | Note |
|---|---|---|
| NEW | `src/lib/shopMenu.js` | `SHOP_MENU`, computed at module load |
| NEW | `src/components/ShopMegaMenu.astro` | static panel markup |
| NEW | `src/pages/shop/m/[model]/[...page].astro` | 203 pages |
| NEW | `src/pages/shop/m/index.astro` | all-models index |
| EDIT | `src/components/SiteNav.astro` | `mega` prop, ~6 lines |
| EDIT | `src/styles/global.css` | `.mega` block inside the existing Nav section; `display:none` under 900px |
| EDIT | 10 pages under `src/pages/shop/` | add `mega` to the `<SiteNav>` call |
| NEW | `tests/shopMenu.test.js` | see below |
| EDIT | `src/components/ShopFilters.astro` | *(revised)* the filter input read "Filter by your model" on pages that already **are** a model. Fixed at the shared component, so the pre-existing `/shop/c/*/m/*` pages get it too |

## Testing

One test file. The failure mode that matters is a **site-wide nav link that
404s** — a bad href in the menu is on every shop page at once.

`tests/shopMenu.test.js` — 9 tests, all passing:

1. Every `SHOP_MENU.categories[].slug` matches a real category in `PRODUCTS`.
2. Every device link's key is in `MODEL_ROUTES` — i.e. `/shop/m/<key>/` is a
   route `getStaticPaths` generates.
3. Every `SHOP_MENU.tags[].tag` is a `CURATED_TAGS` slug with a non-zero count.
4. Every href is trailing-slashed and URL-safe.
5. Link count stays under 80 — a tripwire against the panel silently growing
   into a page-weight problem as the catalog does.
6. Column totals ("All 43 Apple models") equal what `/shop/m/` actually lists.
7. Every `MODEL_ROUTES` entry clears the threshold and its cached count matches
   a live recount.
8. Model keys are unique and URL-safe.
9. *(revised — found while implementing)* **Category chips on `/shop/m/<model>/`
   only point at category-scoped pages that exist.** The chip row links to
   `/shop/c/<cat>/m/<model>/`, which is built with `modelGroups`' default min of
   4 *within that category*. A chip rendered for a category holding 3 products
   of that model would link to a page that was never generated. The page filters
   at `>= 4` to match; this test is what pins the two numbers together.

`tests/build-output.test.js` gets two assertions: `/shop/m/iphone-17-pro/`
exists, and a rendered category page contains the panel markup. Expect an
additive conflict here — a parallel SEO agent commits to this file.

`tests/shopModel.test.js` already guards `deviceModel` coverage; if a DXPOS name
format drifts, it alarms before the menu goes stale.

## Verified

- `npm run build`: **10,347 pages**, up from 10,143 — exactly the +204 predicted
  (203 paginated model pages + the index).
- `npx vitest run`: **356 passing across 36 files** (was 353).
- Every one of the 55 hrefs in the rendered panel resolves to a built
  `index.html`. Zero broken links.
- Panel renders on `/shop/*`, absent from `/repairs/`.
- Opens on hover **and** on keyboard focus of the trigger; closes when neither
  applies (`:hover` and `:focus-within` both checked in the live page).
- Sitemap contains the `/shop/m/` URLs.

## Known ceilings

- **dist size.** *(measured)* Baseline is **244MB across 10,143 HTML pages**.
  The panel adds ~4KB each → roughly +40MB, about **+16%**. Accepted. If deploy
  time ever suffers, the fallback is dropping `mega` from `shop/[id].astro`
  only, accepting inconsistent nav on product pages.
- **Cloudflare Pages caps at 20,000 files per deployment.** 10,143 today, +204
  from this change. Comfortable, but the headroom is finite and shrinking with
  the catalog — worth a glance at each supplier import.
- **Keyboard tab depth.** Opening the panel puts ~60 links between the trigger
  and the cart button. The existing `.skip-link` ("Skip to content") is the
  escape hatch. A JS Escape-to-close would be the fix if this ever bites.

## Explicitly out of scope

- **Mobile nav.** Below 900px there is no nav menu at all. Larger gap than this
  menu, deliberately deferred.
- **`TILE_PICKS`** in `shop/index.astro` covers 5 of 9 categories. Pre-existing,
  unrelated.
- JS-driven live counts, an `aria-expanded` state machine, animation.
