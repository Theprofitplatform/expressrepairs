import { describe, it, expect } from 'vitest';
import { GET } from '../src/pages/shop/google-feed.xml.js';
import { PRODUCTS } from '../src/data/products.js';

describe('google merchant feed', () => {
  let xml;
  it('returns XML with one item per product', async () => {
    const res = GET();
    expect(res.headers.get('Content-Type')).toBe('application/xml');
    xml = await res.text();
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml.match(/<item>/g).length).toBe(PRODUCTS.length);
  });
  it('gives every item a description', () => {
    expect(xml.match(/<item>[\s\S]*?<description>/g)?.length).toBe(PRODUCTS.length);
  });
  it('never leaks cost and escapes ampersands', () => {
    expect(xml).not.toMatch(/costCents/);
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#)/);
  });
});
