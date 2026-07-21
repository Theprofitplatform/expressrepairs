import { describe, it, expect } from 'vitest';
import { GET } from '../src/pages/shop/search-index.json.js';
import { PRODUCTS } from '../src/data/products.js';

describe('shop search index', () => {
  it('serves one lean entry per product, no cost price, no image URLs', async () => {
    const body = await GET().text();
    const index = JSON.parse(body);
    expect(index).toHaveLength(PRODUCTS.length);
    expect(body).not.toMatch(/costCents|margin/);
    // Thumbs/images are deliberately excluded to keep the payload small —
    // results link to the product page for the photo.
    for (const e of index.slice(0, 5)) {
      expect(Object.keys(e).sort()).toEqual(['brand', 'category', 'id', 'name', 'priceCents']);
    }
  });
});
