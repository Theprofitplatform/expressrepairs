import { z } from 'zod';
import { productSchema } from './schema.js';
import raw from './products.json';
import hoco from './hoco-products.json';
import mobilemall from './mobilemall-products.json';
import barcodes from './barcodes.json';
import POS_PRICES from './pos-prices.json';
import { mergeCatalogs, mergeSupplier } from '../lib/merge-catalogs.js';
import { tagsFor } from '../lib/tags.js';

// Supplier barcodes, keyed by SKU (scripts/extract-mobilemall-catalogue.py).
// DXPOS SKUs are MobileMall SKUs, so one map codes both the POS-synced and the
// MobileMall-imported products; HOCO ships its own gtin and is left alone.
// Applied after the merge so no re-sync can wipe it — same reason as priceFix.
const barcodeFix = (p) => (p.gtin || !barcodes[p.sku] ? p : { ...p, gtin: barcodes[p.sku] });

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

// The shop's own price wins over the supplier's RRP.
//
// ~1,510 products the POS stocks are listed here under their H-/M- SUPPLIER id,
// because the DXPOS row carrying the shop's price has no photo and never
// reaches products.json — so the site quotes the supplier's RRP instead. Mostly
// the two agree; where they don't it is visible and bad in both directions
// (Apple EarPods listed at $119.90 that the shop sells for $39.95, and other
// lines listed BELOW the counter price, losing margin on every web order).
//
// pos-prices.json is emitted by the sync, keyed by fixed name — the same key
// the merge dedupes on. Only supplier-sourced listings are touched: a DXPOS row
// already carries its own price. Applied after the merge, like priceFix and
// barcodeFix, so no re-sync can undo it.
const posPriceFix = (p) => {
  if (!/^[HM]-/.test(p.id)) return p;
  const cents = POS_PRICES[p.name];
  return cents && cents !== p.priceCents ? { ...p, priceCents: cents } : p;
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
      barcodeFix(priceFix(posPriceFix({ ...p, tags: tagsFor(p) }))),
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
