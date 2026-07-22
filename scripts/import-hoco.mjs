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
  /\[pack[^\]]*\d[^\]]*\]/i, // bulk trade packs: [PACK 10], [Pack of 10pcs $1/unit], [PACK20]
  /\bBull W\b/i, // bulk-glass trade brand
  /^\[(TOL\d|PT-)/i, // warehouse tool/part codes: [TOL2-2] pry tools & ESD tweezers, [PT-116] LCDs/digitizers
  /cashier desk|hook shelf|film cutting machine/i, // shop fixtures, not products
];

// Keyword -> existing site category. Order matters: protectors before cases
// (a "case with glass" bundle is filed as a case by the negative lookahead
// in catalog-fixes' fixCategory, which runs after this and also handles the
// AirPods/tablet/watch case splits).
const CATEGORY_RULES = [
  [/tempered glass|screen protector|privacy glass|matte glass|hydrogel|camera (lens |)?(protector|glass|guard)/i, 'Screen Protection'],
  [/\bglass\b|\bdome\b|screen guard/i, 'Screen Protection'], // bare "Dragon Glass" / "UV Dome Glass" names, no other keyword
  [/\bcase\b|\bcover\b|\bfolio\b|\bpouch\b|ring stand/i, 'Cases & Covers'],
  // known case-brand names with no other keyword ("Hanman | Samsung A27"); kept
  // after the protector rules so glass-bundle names above still win. speck/
  // raptic/x-doria/mercury/pelican/lifeproof/redpepper/editor/korean added
  // after measuring leftover Accessories rows on bracket-stripped names (see
  // report — mercury/pelican/editor/korean clear 50, lifeproof/redpepper
  // don't but are unambiguous case brands, so kept anyway).
  [/^(hanman|coco(\s?tech)?|otterbox|uag|goospery|speck|raptic|x-doria|mercury|pelican|lifeproof|redpepper|editor|korean|iface|caseology)\b/i, 'Cases & Covers'],
  [/\bcable\b|charger|charging|power bank|powerbank|\badapter\b|\badaptor\b|\bdock\b|car charge/i, 'Cables & Charging'],
  [/earbud|earphone|headphone|headset|speaker|microphone|\bmic\b/i, 'Audio'],
  [/holder|mount|\bstand\b|tripod|selfie stick/i, 'Mounts & Holders'],
];
export const hocoCategory = (name) => {
  // strip repeated leading SKU bracket codes ("[FW3-08] Hanman | ..." or
  // "[FW9-6][BWF5-08] Pelican Ranger | ...") so the ^-anchored case-brand
  // rule (and every other rule) sees the real name.
  const n = name.replace(/^(\[[^\]]*\]\s*)+/, '');
  return CATEGORY_RULES.find(([re]) => re.test(n))?.[1] || 'Accessories';
};

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
      .map((r) => {
        // Strip leading SKU bracket codes ("[FW3-08] Hanman | ...") from the
        // display name itself — same regex hocoCategory uses — so pages,
        // search, and feeds never show a warehouse code to a shopper.
        const name = r.name.replace(/^(\[[^\]]*\]\s*)+/, '');
        return {
          id: `H-${r.id}`,
          name,
          category: hocoCategory(name),
          brand: '', // fixBrand infers from the name (hoco./COCO/Hanman/platform)
          priceCents: r.rrpCents,
          image: r.image,
          thumb: thumbUrl(r.image),
          inStock: true,
          sku: String(r.id),
        };
      }),
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
