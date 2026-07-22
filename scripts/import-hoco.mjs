// scripts/import-hoco.mjs — transform the committed HOCO catalogue snapshot
// (src/data/hoco-catalogue.json, RRP only) into src/data/hoco-products.json
// for the /shop pages. DXPOS knows nothing about these products; they are
// merged with the DXPOS sync at build time by src/lib/merge-catalogs.js, so
// a POS re-sync can never wipe them. Images are hotlinked from hoco.com.au.
//
// Re-run after refreshing the snapshot:
//   python scripts/extract-hoco-catalogue.py "<new xlsx>"
//   node scripts/import-hoco.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyCatalogFixes } from './catalog-fixes.mjs';
import { thumbUrl } from './sync-products.mjs';

// B2B lines that must not appear in a consumer shop: repair machines/tooling
// brands and bulk trade packs. Owner: add a pattern to hide a class, or
// delete one to start selling it.
export const HOCO_EXCLUDE_PATTERNS = [
  /\b(MaAnt|Sunshine|2UUL|Mr Yang|Mechanic|Qianli|Relife|Aixun|JCID|TBK)\b/i, // tool brands
  /\b(OCA|separator|soldering|rework station|microscope|glue remover|reballing|test board|programmer)\b/i,
  /\[PACK \d+\]/i, // bulk trade packs
  /\bBull W\b/i, // bulk-glass trade brand
];

// Keyword -> existing site category. Order matters: protectors before cases
// (a "case with glass" bundle is filed as a case by the negative lookahead
// in catalog-fixes' fixCategory, which runs after this and also handles the
// AirPods/tablet/watch case splits).
const CATEGORY_RULES = [
  [/tempered glass|screen protector|privacy glass|matte glass|hydrogel|camera (lens |)?(protector|glass|guard)/i, 'Screen Protection'],
  [/\bcase\b|\bcover\b|\bfolio\b|\bpouch\b|ring stand/i, 'Cases & Covers'],
  [/\bcable\b|charger|charging|power bank|powerbank|\badapter\b|\badaptor\b|\bdock\b|car charge/i, 'Cables & Charging'],
  [/earbud|earphone|headphone|headset|speaker|microphone|\bmic\b/i, 'Audio'],
  [/holder|mount|\bstand\b|tripod|selfie stick/i, 'Mounts & Holders'],
];
export const hocoCategory = (name) =>
  CATEGORY_RULES.find(([re]) => re.test(name))?.[1] || 'Accessories';

// Pure transform: catalogue snapshot rows -> productSchema-shaped entries.
// applyCatalogFixes gives us the shared name repairs, brand inference, the
// cases/protectors category refinements, and exact-name dedupe for free.
export function transformHoco(rows) {
  return applyCatalogFixes(
    rows
      .filter(
        (r) =>
          r.rrpCents > 0 &&
          r.image &&
          !HOCO_EXCLUDE_PATTERNS.some((p) => p.test(r.name)),
      )
      .map((r) => ({
        id: `H-${r.id}`,
        name: r.name,
        category: hocoCategory(r.name),
        brand: '', // fixBrand infers from the name (hoco./COCO/Hanman/platform)
        priceCents: r.rrpCents,
        image: r.image,
        thumb: thumbUrl(r.image),
        inStock: true,
        sku: String(r.id),
      })),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const src = fileURLToPath(new URL('../src/data/hoco-catalogue.json', import.meta.url));
  const rows = JSON.parse(readFileSync(src, 'utf8'));
  const products = transformHoco(rows);
  const excluded = rows.filter((r) => HOCO_EXCLUDE_PATTERNS.some((p) => p.test(r.name)));
  console.log(
    `hoco funnel: catalogue=${rows.length} excluded-trade=${excluded.length} -> importable=${products.length}`,
  );
  if (products.length === 0 || products.length > 6000) {
    console.error(`refusing to publish ${products.length} products — check the snapshot/patterns.`);
    process.exit(1);
  }
  const out = fileURLToPath(new URL('../src/data/hoco-products.json', import.meta.url));
  writeFileSync(out, JSON.stringify(products, null, 2) + '\n');
  console.log(`Wrote ${products.length} HOCO products.`);
}
