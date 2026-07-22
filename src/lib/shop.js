// Shared between /shop/ (category landing) and /shop/c/[category]/[...page]
// (paginated product grid) so both sides slugify the same way.
export const slugifyCategory = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Spec table rows for the product page — real data only, empty fields dropped.
export const specRows = (p) =>
  [
    ['Brand', p.brand],
    ['Category', p.category],
    ['SKU', p.sku],
    ['Dispatch', 'Dispatched in 1–2 business days'],
    ['Shipping', 'Flat $10.95 — free over $99 — free pickup in store'],
    ['GST', 'Included in price'],
  ].filter(([, v]) => v);

// Cheap add-ons (< $20) from the categories already in the cart.
export const crossSells = (cartIds, all, n = 4) => {
  const inCart = new Set(cartIds);
  const cats = new Set(all.filter((p) => inCart.has(p.id)).map((p) => p.category));
  return all
    .filter((p) => !inCart.has(p.id) && p.priceCents < 2000 && cats.has(p.category))
    .slice(0, n);
};

// Same category, same-brand first (stable), never the product itself.
export const relatedProducts = (p, all, n = 4) =>
  all
    .filter((x) => x.category === p.category && x.id !== p.id)
    .sort((x, y) => (y.brand === p.brand) - (x.brand === p.brand))
    .slice(0, n);

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
