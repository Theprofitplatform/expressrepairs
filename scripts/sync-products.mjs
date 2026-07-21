// scripts/sync-products.mjs — pull the accessories catalog from DXPOS into
// src/data/products.json, for the /shop pages. Runs in
// .github/workflows/sync-products.yml during shop hours (the shop PC hosts
// DXPOS behind the pos tunnel — offline PC = graceful no-op, site keeps last
// synced data). Cost price is stripped here and must never be committed.
//
// Availability is not tracked in DXPOS (no stock counts for this catalogue),
// so every qualifying product is listed as available — see CONTEXT in the
// project notes. Images are hotlinked from the supplier catalogues (absolute
// URLs); nothing is downloaded into the repo.
//
// Env: POS_GATE_USER POS_GATE_PASS (Worker Basic gate), POS_EMAIL POS_PASSWORD
// (DXPOS login), optional POS_BASE.
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import IMAGE_MAP from '../src/data/product-images.json' with { type: 'json' };

const BASE = process.env.POS_BASE || 'https://pos.expressrepairs.com.au';

// DXPOS has no product photos, so images come from the supplier catalogues
// (HOCO + MobileMall), keyed by SKU. Regenerate product-images.json when a new
// supplier price list lands. A DXPOS imageUrl, if ever set, always wins.
const skuKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const imageFor = (r) => r.imageUrl || IMAGE_MAP[skuKey(r.sku)] || '';

// HOCO catalogue URLs follow Odoo's standard image sizes
// (.../product.template/<id>/image_1024). Swap the trailing size token for
// the small grid variant; leave any other URL shape unchanged.
export const thumbUrl = (url) => (url || '').replace(/image_1024(?=\?|$)/, 'image_256');

// The full accessory range is listed regardless of stock (DXPOS carries no
// stock counts for this catalogue) — every listed product ships "dispatched
// in 1-2 business days".
const MAX_ONLINE = Number(process.env.MAX_ONLINE || 5000);

// Which DXPOS Sell-grid groups go online. Owner: edit this list to change
// what the shop sells; archive a product in DXPOS to remove just one item.
// These must match DXPOS's gridGroup values EXACTLY (they are the Sell-grid
// folder names). Confirmed present in the catalog: Screen Protection,
// Cases & Covers, Audio, Accessories, Cables & Charging, SIM & Prepaid,
// Phones & Devices, Recharge, Other, Repairs. Only postable accessories here.
export const ONLINE_GRID_GROUPS = [
  'Accessories',
  'Cases & Covers',
  'Screen Protection',
  'Cables & Charging',
  'Audio',
];

// Pure transform: DXPOS catalog rows -> products.json entries.
export function transformCatalog(rows) {
  return rows
    .filter(
      (r) =>
        !r.archived &&
        r.type === 'PRODUCT' &&
        r.sellCents > 0 &&
        imageFor(r) &&
        ONLINE_GRID_GROUPS.includes(r.gridGroup),
    )
    .map((r) => {
      const image = imageFor(r);
      return {
        id: r.id,
        name: r.name,
        category: r.category?.name || r.gridGroup,
        priceCents: r.sellCents,
        image,
        thumb: thumbUrl(image),
        inStock: true,
        // A missing SKU must not fail Zod validation and silently halt every
        // future sync — the schema requires a string, so default to ''.
        sku: r.sku || '',
      };
    });
}

async function main() {
  const { POS_GATE_USER, POS_GATE_PASS, POS_EMAIL, POS_PASSWORD } = process.env;
  if (!POS_GATE_USER || !POS_GATE_PASS || !POS_EMAIL || !POS_PASSWORD) {
    console.error('Missing POS_* env vars'); process.exit(1);
  }

  // 1. Pass the Worker gate once with Basic auth; keep the pos_gate cookie.
  const basic = 'Basic ' + Buffer.from(`${POS_GATE_USER}:${POS_GATE_PASS}`).toString('base64');
  // redirect:'manual' — the Worker sets pos_gate on ITS response; if the DXPOS
  // app then redirects (e.g. / -> /login) and fetch follows it automatically,
  // we would read the final hop's headers and never see the cookie.
  const gateRes = await fetch(`${BASE}/`, {
    headers: { Authorization: basic },
    redirect: 'manual',
  }).catch(() => null);
  if (!gateRes || gateRes.status === 503) {
    console.log('POS offline (shop PC / tunnel down) — keeping last synced data.');
    process.exit(0); // graceful: not an error, just no update this run
  }
  if (gateRes.status === 401) { console.error('Gate credentials rejected'); process.exit(1); }
  // The Worker APPENDS its pos_gate cookie after any the DXPOS app already set,
  // so scan every Set-Cookie header rather than assuming ours is the first.
  const setCookies = gateRes.headers.getSetCookie?.() ?? [gateRes.headers.get('set-cookie') || ''];
  const cookie = setCookies.join(',').match(/pos_gate=[^;,\s]+/)?.[0];
  // The gate is optional: pos.expressrepairs.com.au has at times been served
  // without the Basic-auth Worker in front, in which case no pos_gate cookie
  // is issued and DXPOS's own JWT is the only thing protecting /api. Warn
  // loudly (that is a security regression worth fixing) but keep syncing.
  if (!cookie) {
    console.warn(
      `WARNING: no pos_gate cookie issued (gate returned ${gateRes.status}) — ` +
        'the POS auth gate appears to be inactive. Continuing with DXPOS login only.',
    );
  }

  // 2. DXPOS login -> JWT.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ email: POS_EMAIL, password: POS_PASSWORD }),
  });
  if (!loginRes.ok) { console.error('DXPOS login failed', loginRes.status); process.exit(1); }
  const { token } = await loginRes.json();
  const auth = { ...(cookie ? { Cookie: cookie } : {}), Authorization: `Bearer ${token}` };

  // 3. Page through the catalog (hard-capped at 200/page server-side).
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}/api/catalog?type=PRODUCT&pageSize=200&page=${page}`, { headers: auth }).catch(() => null);
    if (!res) { console.log('POS connection lost mid-sync — keeping last synced data.'); process.exit(0); }
    if (!res.ok) { console.error('Catalog fetch failed', res.status); process.exit(1); }
    const body = await res.json();
    const data = body.data ?? body;
    rows.push(...data);
    if (data.length === 0 || data.length < 200 || (body.total != null && rows.length >= body.total)) break;
  }

  const products = transformCatalog(rows);

  // Always report the funnel — this is the only visibility into the POS data.
  {
    const live = rows.filter((r) => !r.archived);
    const inGroups = live.filter((r) => ONLINE_GRID_GROUPS.includes(r.gridGroup));
    console.log(
      `catalog funnel: fetched=${rows.length} live=${live.length} ` +
        `in-groups=${inGroups.length} with-image=${inGroups.filter(imageFor).length} ` +
        `-> sellable=${products.length}`,
    );
  }

  if (products.length > MAX_ONLINE) {
    console.error(
      `${products.length} products qualify, over the ${MAX_ONLINE} cap — refusing to publish.\n` +
        `  Narrow ONLINE_GRID_GROUPS, or raise MAX_ONLINE deliberately if this range is intended.`,
    );
    process.exit(1);
  }

  if (products.length === 0) {
    // Say WHY nothing qualified — otherwise diagnosing this needs POS access.
    const live = rows.filter((r) => !r.archived);
    const n = (f) => live.filter(f).length;
    const groups = [...new Set(live.map((r) => r.gridGroup ?? '(none)'))];
    console.error(
      `0 sellable products — refusing to blank the shop.\n` +
        `  fetched=${rows.length} not-archived=${live.length}\n` +
        `  type=PRODUCT: ${n((r) => r.type === 'PRODUCT')}\n` +
        `  sellCents>0: ${n((r) => r.sellCents > 0)}\n` +
        `  has imageUrl: ${n((r) => r.imageUrl)}\n` +
        `  in ONLINE_GRID_GROUPS: ${n((r) => ONLINE_GRID_GROUPS.includes(r.gridGroup))}\n` +
        `  grid groups present: ${groups.join(' | ')}\n` +
        `  (online groups configured: ${ONLINE_GRID_GROUPS.join(' | ')})`,
    );
    process.exit(1);
  }

  const out = fileURLToPath(new URL('../src/data/products.json', import.meta.url));
  writeFileSync(out, JSON.stringify(products, null, 2) + '\n');
  console.log(`Synced ${products.length} products.`);
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
