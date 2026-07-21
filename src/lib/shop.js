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

// Same category, same-brand first (stable), never the product itself.
export const relatedProducts = (p, all, n = 4) =>
  all
    .filter((x) => x.category === p.category && x.id !== p.id)
    .sort((x, y) => (y.brand === p.brand) - (x.brand === p.brand))
    .slice(0, n);
