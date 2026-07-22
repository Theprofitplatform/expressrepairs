import { z } from 'zod';
import { productSchema } from './schema.js';
import raw from './products.json';
import hoco from './hoco-products.json';
import { mergeCatalogs } from '../lib/merge-catalogs.js';

// products.json is synced from DXPOS (scripts/sync-products.mjs);
// hoco-products.json is imported from the HOCO catalogue (scripts/import-hoco.mjs).
// Merged here so every consumer (shop pages, search index, product feed)
// sees one catalog. DXPOS wins duplicates.
export const PRODUCTS = z.array(productSchema).parse(mergeCatalogs(raw, hoco));

// Shipping config — owner-adjustable. Cents, AUD, GST-inclusive.
export const SHOP = {
  flatShippingCents: 1095,
  freeShippingThresholdCents: 9900,
  currency: 'aud',
};

export const fmtPrice = (cents) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
