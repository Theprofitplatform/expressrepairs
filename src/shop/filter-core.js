import { searchProducts } from './search-core.js';
import { deviceModel } from '../lib/shop.js';
import { tagsFor } from '../lib/tags.js';

// Price presets shared by the filter bar UI and filterProducts. Cents, AUD.
export const PRICE_BANDS = {
  'under-20': (c) => c < 2000,
  '20-50': (c) => c >= 2000 && c <= 5000,
  'over-50': (c) => c > 5000,
};

// Pure filter over search-index entries ({id, name, brand, category,
// priceCents}). Used by the category/model page filter bar (browser) and
// tests (node). No sort => index order (= server "featured" order), except
// when `q` is set — those results are relevance-ranked by searchProducts
// instead.
export function filterProducts(index, { category, model, tag, brand, price, sort, q } = {}) {
  let pool = index;
  if (category) pool = pool.filter((p) => p.category === category);
  if (model) pool = pool.filter((p) => deviceModel(p.name)?.key === model);
  if (tag) pool = pool.filter((p) => tagsFor(p).includes(tag));
  if (brand) pool = pool.filter((p) => p.brand === brand);
  if (price && PRICE_BANDS[price]) pool = pool.filter((p) => PRICE_BANDS[price](p.priceCents));
  if (q) pool = searchProducts(pool, q, 1000).hits;
  if (sort === 'price-asc') pool = [...pool].sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === 'price-desc') pool = [...pool].sort((a, b) => b.priceCents - a.priceCents);
  return pool;
}
