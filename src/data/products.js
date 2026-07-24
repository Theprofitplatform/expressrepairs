import { z } from 'zod';
import { productSchema } from './schema.js';
import raw from './products.json';
import hoco from './hoco-products.json';
import { mergeCatalogs } from '../lib/merge-catalogs.js';
import { tagsFor } from '../lib/tags.js';

// Owner-set retail prices (2026-07-25): every Hanman case sells at $29.95
// (phone) / $39.95 (tablet), whatever DXPOS or the HOCO catalogue carry.
// Applied here — after the merge — so neither a DXPOS re-sync nor a HOCO
// refresh can undo it. Remove once the sources are repriced.
const priceFix = (p) =>
  /hanman/i.test(p.name) && /Cases/.test(p.category)
    ? { ...p, priceCents: p.category === 'Tablet & iPad Cases' ? 3995 : 2995 }
    : p;

// products.json is synced from DXPOS (scripts/sync-products.mjs);
// hoco-products.json is imported from the HOCO catalogue (scripts/import-hoco.mjs).
// Merged here so every consumer (shop pages, search index, product feed)
// sees one catalog. DXPOS wins duplicates. Tags are derived, not synced.
export const PRODUCTS = z
  .array(productSchema)
  .parse(mergeCatalogs(raw, hoco).map((p) => priceFix({ ...p, tags: tagsFor(p) })));

// Shipping config — owner-adjustable. Cents, AUD, GST-inclusive.
export const SHOP = {
  flatShippingCents: 1095,
  freeShippingThresholdCents: 9900,
  currency: 'aud',
};

export const fmtPrice = (cents) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
