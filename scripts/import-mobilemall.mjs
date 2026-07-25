// scripts/import-mobilemall.mjs — transform the committed MobileMall catalogue
// snapshot (src/data/mobilemall-catalogue.json, RRP only) into
// src/data/mobilemall-products.json for the /shop pages.
//
// DXPOS carries only about half of MobileMall's range — it's the in-store
// stock list, not the supplier's full catalogue — so the newest lines were
// missing from the shop entirely (only 20% of the iPhone 17 range was listed,
// and whole case families like BLACKTECH Sentinel X / J2 / Y1 were absent for
// every model). This fills the gap the same way the HOCO import does; the
// merge in src/data/products.js keeps DXPOS winning any SKU it does have, so
// a POS re-sync can never wipe these and never double-lists a product.
//
// Re-run after refreshing the snapshot:
//   python scripts/extract-mobilemall-catalogue.py "<new xlsx>"
//   node scripts/import-mobilemall.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyCatalogFixes } from './catalog-fixes.mjs';
import { thumbUrl, R2_BASE, TRADE_ONLY_PATTERNS } from './sync-products.mjs';
import { hocoCategory as supplierCategory, HOCO_EXCLUDE_PATTERNS } from './import-hoco.mjs';
import R2_MANIFEST from '../src/data/r2-images.json' with { type: 'json' };

// Same R2 mirroring scheme as the DXPOS sync and the HOCO import: ids in the
// manifest (written by scripts/upload-images-r2.mjs) serve our own 800px WebP;
// anything not yet mirrored keeps its mobilemall.com.au URL so a freshly
// imported product is never imageless.
const R2_IDS = new Set(R2_MANIFEST);

// MobileMall is a wholesaler, so its catalogue carries trade lines a consumer
// shop must never list. The DXPOS sync and the HOCO import already name most
// of them (bulk packs, shop fixtures, repair tooling and parts); these are the
// ones only MobileMall stocks. Owner: add a pattern to hide a class of product.
export const MOBILEMALL_EXCLUDE_PATTERNS = [
  ...TRADE_ONLY_PATTERNS,
  ...HOCO_EXCLUDE_PATTERNS,
  /\bsublimation\b/i, // blank shells for the custom-print trade
  /\bdummy\b/i, // non-functional display handsets
  /\d+\s*pcs\s*\/\s*pack|\bpcs\/pack\b/i, // "**10pcs/pack**" bulk glass
  /\bmould?\b|\bmold\b/i, // press moulds for the sublimation machines
  // Account-credit promos and supplier test rows are dropped upstream by the
  // extractor's numeric-SKU rule — they have no SKU to sell against.
];
const isExcluded = (name) => MOBILEMALL_EXCLUDE_PATTERNS.some((p) => p.test(name));

// "**bold**" markup and doubled spaces come straight out of the Magento
// export; strip them so a shopper never sees the supplier's own formatting.
export const cleanName = (name) =>
  name.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();

// MobileMall names most cases by model line only — "BLACKTECH Triangle Armor
// - Black", "Samsung Galaxy A27 Hanman - Navy" — with no "case"/"cover" word,
// so the shared name rules drop 3.3k of them into the Accessories catch-all.
// The supplier's own shelf tag settles those: its "Cases and Protectors"
// bucket mixes both, but the protector rules run FIRST in supplierCategory, so
// anything still unclassified at this point is a case, not a protector.
// Straps/bands sit in the same supplier bucket and are genuinely accessories.
export const categoryFor = (name, categories = []) => {
  const byName = supplierCategory(name);
  if (byName !== 'Accessories') return byName;
  if (/\bstraps?\b|\bbands?\b/i.test(name)) return 'Accessories';
  // catalog-fixes' fixCategory then splits iPad/Watch/AirPods cases back out.
  return categories.some((c) => /cases and protectors/i.test(c)) ? 'Cases & Covers' : 'Accessories';
};

// Pure transform: catalogue snapshot rows -> productSchema-shaped entries.
// applyCatalogFixes gives us the shared name repairs, brand inference, the
// cases/protectors category refinements, and exact-name dedupe for free.
export function transformMobileMall(rows, r2Ids = R2_IDS) {
  return applyCatalogFixes(
    rows
      .filter((r) => r.rrpCents > 0 && r.image && !isExcluded(r.name))
      .map((r) => {
        const name = cleanName(r.name);
        const id = `M-${r.sku}`;
        const hosted = r2Ids.has(id) ? `${R2_BASE}/products/${id}.webp` : '';
        return {
          id,
          name,
          category: categoryFor(name, r.categories),
          brand: '', // fixBrand infers from the name (BLACKTECH/Goospery/platform)
          priceCents: r.rrpCents,
          image: hosted || r.image,
          thumb: hosted || thumbUrl(r.image),
          inStock: true, // out-of-stock rows are dropped by the extractor
          sku: String(r.sku),
        };
      }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const src = fileURLToPath(new URL('../src/data/mobilemall-catalogue.json', import.meta.url));
  const rows = JSON.parse(readFileSync(src, 'utf8'));
  const products = transformMobileMall(rows);
  const excluded = rows.filter((r) => isExcluded(r.name));
  console.log(
    `mobilemall funnel: catalogue=${rows.length} excluded-trade=${excluded.length} -> importable=${products.length}`,
  );
  if (products.length === 0 || products.length > 7000) {
    console.error(`refusing to publish ${products.length} products — check the snapshot/patterns.`);
    process.exit(1);
  }
  const out = fileURLToPath(new URL('../src/data/mobilemall-products.json', import.meta.url));
  writeFileSync(out, JSON.stringify(products, null, 2) + '\n');
  console.log(`Wrote ${products.length} MobileMall products.`);
}
