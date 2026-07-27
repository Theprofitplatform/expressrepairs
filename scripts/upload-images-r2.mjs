// scripts/upload-images-r2.mjs — mirror product images into the R2 bucket
// `expressrepairs-products`, served at https://img.expressrepairs.com.au.
//
// For every product in src/data/products.json: download the supplier image,
// resize to max 800px WebP (~30-60KB vs ~2MB MobileMall originals), upload to
// R2 as products/<id>.webp. Objects already in the bucket are skipped (one
// paginated list up front, no per-object HEADs), so re-runs are incremental —
// the sync workflow runs this before committing so new DXPOS products get
// their image self-hosted automatically.
//
// Writes src/data/r2-images.json — the ids that exist in R2 — which
// scripts/sync-products.mjs uses to emit R2 URLs (supplier URL fallback for
// anything not yet uploaded). Commit that file after running.
//
// Env: R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY (an R2 API token's S3
// credentials, scoped Object Read & Write to this bucket) and
// CLOUDFLARE_ACCOUNT_ID. Uses R2's S3 API — the REST object endpoints
// reject R2-UI tokens, the S3 endpoint is what they're issued for.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { AwsClient } from 'aws4fetch';
import DXPOS from '../src/data/products.json' with { type: 'json' };
import HOCO from '../src/data/hoco-products.json' with { type: 'json' };
import MOBILEMALL from '../src/data/mobilemall-products.json' with { type: 'json' };
import { mergeSupplier } from '../src/lib/merge-catalogs.js';

// All three catalogs mirror into the same bucket/manifest; H- ids come from
// the HOCO import (scripts/import-hoco.mjs), M- ids from the MobileMall import
// (scripts/import-mobilemall.mjs), X- ids from the DXPOS sync. mergeSupplier
// drops the ~3.5k MobileMall rows DXPOS already carries — mirroring those
// would upload the same photo twice under two ids and serve neither.
const PRODUCTS = [...mergeSupplier(DXPOS, MOBILEMALL), ...HOCO];

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = 'expressrepairs-products';
const CONCURRENCY = 5; // be polite to the supplier sites

if (!ACCOUNT || !KEY_ID || !SECRET) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
  process.exit(1);
}
const S3 = `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}`;
const aws = new AwsClient({ accessKeyId: KEY_ID, secretAccessKey: SECRET, service: 's3', region: 'auto' });
const keyFor = (id) => `products/${id}.webp`;
// Grid cards render ~343px wide on a phone but were being served the 800px
// original, which decodes to ~2.1MB of bitmap each. At 500+ cards on screen that
// walked the renderer past 600MB and killed it. The -400 variant decodes to ~4x
// less; product detail pages keep the 800px one.
const thumbKeyFor = (id) => `products/${id}-400.webp`;

const webpAt = (buf, px) =>
  sharp(buf).resize({ width: px, height: px, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

async function putWebp(key, body) {
  const put = await aws.fetch(`${S3}/${key}`, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body });
  if (!put.ok) throw new Error(`put ${put.status} ${await put.text()}`);
}

// One paginated ListObjectsV2 of the whole bucket up front.
// ponytail: regex over the XML — the S3 list response is flat and stable.
async function listExisting() {
  const keys = new Set();
  let token = '';
  for (;;) {
    const res = await aws.fetch(`${S3}?list-type=2&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ''}`);
    if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.add(m[1]);
    token = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] ?? '';
    if (!token) return keys;
  }
}

async function uploadOne(p) {
  const src = await fetch(p.image, { headers: { 'User-Agent': 'Mozilla/5.0 (expressrepairs image mirror)' } });
  if (!src.ok) throw new Error(`download ${src.status}`);
  const buf = Buffer.from(await src.arrayBuffer());
  const [full, thumb] = await Promise.all([webpAt(buf, 800), webpAt(buf, 400)]);
  await putWebp(keyFor(p.id), full);
  await putWebp(thumbKeyFor(p.id), thumb);
  return full.length + thumb.length;
}

// Backfill for products mirrored before the -400 variant existed. Source from R2
// (our own bucket) rather than the supplier: re-downloading ~6.9k supplier images
// just to make a smaller copy would be slow and rude, and some suppliers have
// since dropped the original.
async function backfillThumb(p) {
  const res = await aws.fetch(`${S3}/${keyFor(p.id)}`);
  if (!res.ok) throw new Error(`get ${res.status}`);
  const thumb = await webpAt(Buffer.from(await res.arrayBuffer()), 400);
  await putWebp(thumbKeyFor(p.id), thumb);
  return thumb.length;
}

// Shared worker pool — same shape for both passes.
async function runQueue(items, worker, label) {
  const failures = [];
  const queue = [...items];
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p; (p = queue.shift()); ) {
        try {
          const bytes = await worker(p);
          done++;
          if (done % 100 === 0) console.log(`${label} ${done}/${items.length} (last ${(bytes / 1024).toFixed(0)}KB)`);
        } catch (e) {
          failures.push(`${p.id} ${p.name}: ${e.message}`);
        }
      }
    }),
  );
  return { done, failures };
}

const existing = await listExisting();
// Only supplier-hosted images need mirroring; a product whose image already
// points at img.expressrepairs.com.au has nothing to download.
const todo = PRODUCTS.filter((p) => !existing.has(keyFor(p.id)) && !p.image.includes('img.expressrepairs.com.au'))
  .slice(0, Number(process.env.LIMIT) || Infinity); // LIMIT=5 for a smoke run
console.log(`${PRODUCTS.length} products, ${existing.size} already in R2, ${todo.length} to upload`);

const mirrored = await runQueue(todo, async (p) => {
  const bytes = await uploadOne(p);
  existing.add(keyFor(p.id));
  existing.add(thumbKeyFor(p.id));
  return bytes;
}, 'uploaded');

// Second pass: anything with an 800px object but no -400 thumb yet.
const needThumb = PRODUCTS.filter((p) => existing.has(keyFor(p.id)) && !existing.has(thumbKeyFor(p.id)))
  .slice(0, Number(process.env.LIMIT) || Infinity);
console.log(`${needThumb.length} thumbs to backfill`);
const thumbed = await runQueue(needThumb, backfillThumb, 'thumbed');

const failures = [...mirrored.failures, ...thumbed.failures];
const done = mirrored.done;

// Manifest = every product id whose image exists in R2 (sorted for stable diffs).
const ids = PRODUCTS.map((p) => p.id).filter((id) => existing.has(keyFor(id))).sort();
writeFileSync(fileURLToPath(new URL('../src/data/r2-images.json', import.meta.url)), JSON.stringify(ids) + '\n');

console.log(`uploaded=${done} thumbed=${thumbed.done} failed=${failures.length} manifest=${ids.length} ids`);
if (failures.length) console.log('failures:\n  ' + failures.slice(0, 50).join('\n  '));
// Failures are logged, not fatal — those products keep their supplier URL.
