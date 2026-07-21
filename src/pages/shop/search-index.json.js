import { PRODUCTS } from '../../data/products.js';

// Build-time search index for /shop/search/. Lean on purpose (~550KB raw,
// ~90KB gzipped from the CDN): no thumb/image URLs — every image is R2-hosted
// at img.expressrepairs.com.au/products/<id>.webp, so search.astro derives the
// thumb from the id.
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
