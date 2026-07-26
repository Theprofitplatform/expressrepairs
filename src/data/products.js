import { z } from 'zod';
import { productSchema } from './schema.js';
import raw from './products.json';
import hoco from './hoco-products.json';
import mobilemall from './mobilemall-products.json';
import { mergeCatalogs, mergeSupplier } from '../lib/merge-catalogs.js';
import { tagsFor } from '../lib/tags.js';

// Owner-set retail prices (2026-07-25), whatever DXPOS or the HOCO catalogue
// carry: Hanman cases $29.95 phone / $39.95 tablet; Korean Simple D $29.95,
// its Double Folio variants $39.95. Applied here — after the merge — so
// neither a DXPOS re-sync nor a HOCO refresh can undo it. Remove entries as
// the sources get repriced.
const priceFix = (p) => {
  if (!/Cases/.test(p.category)) return p;
  if (/hanman/i.test(p.name))
    return { ...p, priceCents: p.category === 'Tablet & iPad Cases' ? 3995 : 2995 };
  if (/simple d/i.test(p.name))
    return { ...p, priceCents: /double/i.test(p.name) ? 3995 : 2995 };
  return p;
};

// products.json is synced from DXPOS (scripts/sync-products.mjs);
// mobilemall-products.json and hoco-products.json are imported from the two
// supplier catalogues (scripts/import-mobilemall.mjs, scripts/import-hoco.mjs).
// Merged here so every consumer (shop pages, search index, product feed) sees
// one catalog. DXPOS wins duplicates — MobileMall by SKU, HOCO by name — so a
// POS re-sync can never wipe a supplier product, nor double-list a stocked one.
// Tags are derived, not synced.
export const PRODUCTS = z
  .array(productSchema)
  .parse(
    mergeCatalogs(mergeSupplier(raw, mobilemall), hoco).map((p) =>
      priceFix({ ...p, tags: tagsFor(p) }),
    ),
  );

// Shipping config — owner-adjustable. Cents, AUD, GST-inclusive.
export const SHOP = {
  flatShippingCents: 1095,
  freeShippingThresholdCents: 9900,
  currency: 'aud',
};

export const fmtPrice = (cents) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
