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

// Both supplier catalogs mirror into the same bucket/manifest; H- ids come
// from the HOCO import (scripts/import-hoco.mjs), X- ids from the DXPOS sync.
const PRODUCTS = [...DXPOS, ...HOCO];

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
  const webp = await sharp(Buffer.from(await src.arrayBuffer()))
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const put = await aws.fetch(`${S3}/${keyFor(p.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: webp,
  });
  if (!put.ok) throw new Error(`put ${put.status} ${await put.text()}`);
  return webp.length;
}

const existing = await listExisting();
// Only supplier-hosted images need mirroring; a product whose image already
// points at img.expressrepairs.com.au has nothing to download.
const todo = PRODUCTS.filter((p) => !existing.has(keyFor(p.id)) && !p.image.includes('img.expressrepairs.com.au'))
  .slice(0, Number(process.env.LIMIT) || Infinity); // LIMIT=5 for a smoke run
console.log(`${PRODUCTS.length} products, ${existing.size} already in R2, ${todo.length} to upload`);

const failures = [];
let done = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let p; (p = queue.shift()); ) {
      try {
        const bytes = await uploadOne(p);
        existing.add(keyFor(p.id));
        done++;
        if (done % 100 === 0) console.log(`${done}/${todo.length} uploaded (last ${(bytes / 1024).toFixed(0)}KB)`);
      } catch (e) {
        failures.push(`${p.id} ${p.name}: ${e.message}`);
      }
    }
  }),
);

// Manifest = every product id whose image exists in R2 (sorted for stable diffs).
const ids = PRODUCTS.map((p) => p.id).filter((id) => existing.has(keyFor(id))).sort();
writeFileSync(fileURLToPath(new URL('../src/data/r2-images.json', import.meta.url)), JSON.stringify(ids) + '\n');

console.log(`uploaded=${done} failed=${failures.length} manifest=${ids.length} ids`);
if (failures.length) console.log('failures:\n  ' + failures.slice(0, 50).join('\n  '));
// Failures are logged, not fatal — those products keep their supplier URL.
