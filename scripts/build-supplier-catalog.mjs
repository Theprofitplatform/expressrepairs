// scripts/build-supplier-catalog.mjs — .supplier-data/*.json -> ORDERS_KV
//
// Turns the raw extractor output (scripts/extract-supplier-catalog.py) into
// the catalogue rows served by /api/supplier-catalog, and uploads them to KV.
// Cost prices are involved throughout: nothing here may write inside src/ or
// any committed path. Usage: node scripts/build-supplier-catalog.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Same namespace as wrangler.toml's ORDERS_KV binding.
const NAMESPACE_ID = '76d87c01303149d5b37f520242b0f335';

export const normName = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const cents = (v) => (typeof v === 'number' ? Math.round(v * 100) : null);

export function buildHocoRows(raw, hocoProducts) {
  const byId = new Map(hocoProducts.map((p) => [p.id, p]));
  return raw.map((r) => {
    const shop = byId.get(`H-${r.id}`);
    return {
      sku: String(r.id), name: r.name, costCents: cents(r.cost), rrpCents: cents(r.rrp),
      category: shop?.category ?? '', stocked: Boolean(shop), inStock: true,
    };
  });
}

export function buildMobilemallRows(raw, shopProducts) {
  // ponytail: MobileMall SKUs don't map to DXPOS SKUs, so "stocked" is an
  // exact normalised-name match — misses renamed items; upgrade to a curated
  // SKU map if staff report gaps.
  const names = new Set(shopProducts.map((p) => normName(p.name)));
  return raw.map((r) => ({
    sku: r.sku, name: r.name, costCents: cents(r.cost), rrpCents: null,
    category: r.categories, stocked: names.has(normName(r.name)),
    inStock: r.stock !== 'Out of stock',
  }));
}

function upload(key, rows) {
  const tmp = join(mkdtempSync(join(tmpdir(), 'supcat-')), `${key}.json`);
  writeFileSync(tmp, JSON.stringify(rows));
  execFileSync('npx', ['wrangler', 'kv', 'key', 'put', key, '--path', tmp,
    '--namespace-id', NAMESPACE_ID, '--remote'], { stdio: 'inherit', shell: true });
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (isMain) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const hoco = buildHocoRows(read('.supplier-data/hoco.json'), read('src/data/hoco-products.json'));
  const mm = buildMobilemallRows(read('.supplier-data/mobilemall.json'), read('src/data/products.json'));
  console.log(`hoco: ${hoco.length} rows (${hoco.filter((r) => r.stocked).length} stocked)`);
  console.log(`mobilemall: ${mm.length} rows (${mm.filter((r) => r.stocked).length} stocked)`);
  upload('supplier-catalog:hoco', hoco);
  upload('supplier-catalog:mobilemall', mm);
}
