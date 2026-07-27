// Shop mega-menu data AND the /shop/m/<model>/ route list, in one place.
//
// Computed once at module load — Astro evaluates a module once per build, so
// the ~10,000 pages that render the menu share one pass. Doing this per page
// would re-run modelGroups over 9.4k products ten thousand times.
//
// The menu columns and getStaticPaths both read MODEL_ROUTES, so a menu link
// physically cannot point at a page that wasn't built.
import { PRODUCTS } from '../data/products.js';
import { slugifyCategory, modelGroups, modelFamilies } from './shop.js';
import { CURATED_TAGS } from './tags.js';

// A cross-category model page needs enough range to be worth landing on.
// modelGroups' own default (4) would add ~36 more pages carrying a handful of
// products each — thin pages on a domain that already struggles to rank.
export const MIN_MODEL_PAGE_PRODUCTS = 10;

export const MODEL_ROUTES = modelGroups(PRODUCTS, MIN_MODEL_PAGE_PRODUCTS);
export const MODEL_FAMILIES = modelFamilies(MODEL_ROUTES);

// Pick by product depth, display in the family's own newest-first order.
// Each signal alone picks a bad six: modelFamilies' recency sort ranks
// alphabetically among non-numeric names, so Galaxy leads with Z Fold 7 (24
// products) and never shows the S line (S26 Ultra, 110) — while a pure count
// sort leads Apple with iPhone 16 Plus because catalog depth lags a release.
// Count says which models matter, family order says how to read them.
const group = (family, show) => {
  const all = MODEL_FAMILIES.find((f) => f.family === family)?.models ?? [];
  const pick = new Set(
    [...all].sort((a, b) => b.count - a.count).slice(0, show).map((m) => m.key),
  );
  return { family, models: all.filter((m) => pick.has(m.key)), total: all.length };
};

const column = (heading, groups) => ({
  heading,
  groups,
  total: groups.reduce((n, g) => n + g.total, 0),
});

const categoryCount = (name) => PRODUCTS.filter((p) => p.category === name).length;
const tagCount = (tag) => PRODUCTS.filter((p) => p.tags.includes(tag)).length;

export const SHOP_MENU = {
  total: PRODUCTS.length,
  categories: [...new Set(PRODUCTS.map((p) => p.category))]
    .map((name) => ({ name, slug: slugifyCategory(name), count: categoryCount(name) }))
    .sort((a, b) => b.count - a.count),
  deviceColumns: [
    column('Apple', [group('iPhone', 6), group('iPad', 4)]),
    column('Samsung & Google', [group('Galaxy', 6), group('Pixel', 4)]),
  ],
  // CURATED_TAGS order is hand-picked by shopper intent — kept, not re-sorted.
  tags: CURATED_TAGS.map(({ tag, label }) => ({ tag, label, count: tagCount(tag) })),
};

// Every href the menu renders, for the route-existence test. Keep in sync with
// ShopMegaMenu.astro.
export const menuLinks = () => [
  '/shop/',
  '/shop/m/',
  '/shop/search/',
  ...SHOP_MENU.categories.map((c) => `/shop/c/${c.slug}/`),
  ...SHOP_MENU.deviceColumns.flatMap((c) => c.groups.flatMap((g) => g.models.map((m) => `/shop/m/${m.key}/`))),
  ...SHOP_MENU.tags.map((t) => `/shop/t/${t.tag}/`),
];
