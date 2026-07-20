import { z } from 'zod';
import { productSchema } from './schema.js';
import raw from './products.json';

// Synced from DXPOS by scripts/sync-products.mjs (see .github/workflows/sync-products.yml).
export const PRODUCTS = z.array(productSchema).parse(raw);

// Shipping config — owner-adjustable. Cents, AUD, GST-inclusive.
export const SHOP = {
  flatShippingCents: 1095,
  freeShippingThresholdCents: 9900,
  currency: 'aud',
};

export const fmtPrice = (cents) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
