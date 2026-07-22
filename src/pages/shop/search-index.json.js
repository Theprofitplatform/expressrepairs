import { PRODUCTS } from '../../data/products.js';

// Build-time search index for /shop/search/. Lean on purpose (~550KB raw,
// ~90KB gzipped from the CDN): no thumb/image URLs — DXPOS images are
// R2-hosted at img.expressrepairs.com.au/products/<id>.webp and HOCO images
// hotlink hoco.com.au, so the client derives the thumb from the id via
// thumbSrc() in shop/search-core.js instead.
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
