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

const categoryCount = (name) => PRODUCTS.filter((p) => p.category === name).length;
const tagCount = (tag) => PRODUCTS.filter((p) => p.tags.includes(tag)).length;

const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))]
  .map((name) => ({ name, slug: slugifyCategory(name), count: categoryCount(name) }))
  .sort((a, b) => b.count - a.count);

export const SHOP_MENU = {
  total: PRODUCTS.length,
  categories: CATEGORIES,
  // CURATED_TAGS order is hand-picked by shopper intent — kept, not re-sorted.
  tags: CURATED_TAGS.map(({ tag, label }) => ({ tag, label, count: tagCount(tag) })),
};

// The cascade: category → device family → model, every leaf an existing
// /shop/c/<cat>/m/<model>/ page.
//
// modelGroups' DEFAULT min (4), not MIN_MODEL_PAGE_PRODUCTS — 4 is the floor
// the [category]/m/[model] route generates with, so this tree and the built
// pages are the same set by construction. Passing 10 here would hide ~110 live
// pages; passing anything lower would link to pages that were never built.
//
// Served as /shop/menu.json, not inlined. At 107 bytes a link the full tree is
// a ~27KB panel, and the nav ships on 10,347 pages — inlining would add
// ~217MB to dist. It is fetched once per session instead. Nothing is lost to
// crawlers: ShopFilters already static-links every one of these leaves from
// the category page it belongs to.
export const CATALOGUE = CATEGORIES.map(({ name, slug, count }) => {
  const inCat = PRODUCTS.filter((p) => p.category === name);
  return {
    name,
    slug,
    count,
    families: modelFamilies(modelGroups(inCat)),
  };
});

// Leaf hrefs of the cascade, for the route-existence tests.
export const catalogueLinks = () =>
  CATALOGUE.flatMap((c) => [
    `/shop/c/${c.slug}/`,
    ...c.families.flatMap((f) => f.models.map((m) => `/shop/c/${c.slug}/m/${m.key}/`)),
  ]);

// Every href the panel INLINES, for the route-existence test. The cascade's
// own links arrive over fetch, not in the HTML — they are catalogueLinks().
// Keep in sync with ShopMegaMenu.astro.
export const menuLinks = () => [
  '/shop/',
  '/shop/m/',
  '/shop/search/',
  ...SHOP_MENU.categories.map((c) => `/shop/c/${c.slug}/`),
  ...SHOP_MENU.tags.map((t) => `/shop/t/${t.tag}/`),
];
