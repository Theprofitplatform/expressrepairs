import { PRODUCTS } from '../../data/products.js';

// Build-time search index for /shop/search/. Lean on purpose (~550KB raw,
// ~90KB gzipped from the CDN): no thumb/image URLs — the result card links to
// the product page for the photo.
export function GET() {
  const index = PRODUCTS.map(({ id, name, brand, category, priceCents }) => ({
    id,
    name,
    brand,
    category,
    priceCents,
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
