# Online Accessories Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell accessories on expressrepairs.com.au with Stripe Checkout + shipping, products synced from DXPOS.

**Architecture:** A scheduled GitHub Action pulls the catalog from DXPOS (through the pos tunnel's Basic-auth gate + DXPOS JWT), writes `src/data/products.json` + product images, and commits — the existing `deploy.yml` then rebuilds and deploys. The Astro site renders `/shop` pages from that file at build time. A Pages Function creates Stripe Checkout sessions (validating prices server-side); a second Function receives Stripe's webhook and emails orders via the existing Resend pipeline.

**Tech Stack:** Astro 5 + React islands (existing), Cloudflare Pages Functions, Stripe Checkout via raw `fetch` (no SDK dependency), vitest, GitHub Actions.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-20-online-accessories-store-design.md`. Read it first.
- **Cost price (`costCents`, `margin`) must NEVER appear in any file under `src/`, `public/`, or `functions/`.** The sync transform strips it; a test enforces it.
- All money handled in **integer cents, AUD, GST-inclusive** (DXPOS `sellCents` is GST-inclusive). Display format: `$149` (whole dollars) or `$10.95` (has cents).
- Shipping defaults (owner-adjustable, live in `src/data/products.js`): flat **1095** cents, free at/over **9900** cents subtotal, free in-store pickup always offered.
- No new npm dependencies. Stripe is called with `fetch` + form encoding; webhook signatures verified with WebCrypto (both run fine in Pages Functions).
- Follow existing patterns: Pages Functions look like `functions/api/lead.js` (same-site check, `json()` helper, 503-not-502 rule); tests look like `tests/lead.test.js`; data files are Zod-validated like `src/data/accessories.js`.
- Tests must not hardcode product ids/names from `products.json` — the sync overwrites it. Pick items dynamically (`PRODUCTS.find(...)`).
- Node ≥ 20 (`node:test` not used — vitest). Commit after every green task.

---

### Task 1: Product data foundation

**Files:**
- Create: `src/data/products.json`
- Modify: `src/data/schema.js` (append `productSchema`)
- Create: `src/data/products.js`
- Test: `tests/products.test.js`

**Interfaces:**
- Produces: `PRODUCTS` (array of `{id, name, category, priceCents, image, inStock, sku}`), `SHOP` (`{flatShippingCents: 1095, freeShippingThresholdCents: 9900, currency: 'aud'}`), `fmtPrice(cents) → '$149' | '$10.95'` — all from `src/data/products.js`. Later tasks import these exact names.

- [ ] **Step 1: Write the failing test**

```js
// tests/products.test.js
import { describe, it, expect } from 'vitest';
import { PRODUCTS, SHOP, fmtPrice } from '../src/data/products.js';
import { readFileSync } from 'node:fs';

describe('products data', () => {
  it('loads and validates products.json', () => {
    expect(Array.isArray(PRODUCTS)).toBe(true);
    expect(PRODUCTS.length).toBeGreaterThan(0);
    for (const p of PRODUCTS) {
      expect(p.id).toBeTruthy();
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.image).toMatch(/^\/images\/products\//);
    }
  });

  it('never exposes cost price anywhere in the public data file', () => {
    const raw = readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8');
    expect(raw).not.toMatch(/costCents|margin/);
  });

  it('has sane shop config', () => {
    expect(SHOP.flatShippingCents).toBe(1095);
    expect(SHOP.freeShippingThresholdCents).toBe(9900);
    expect(SHOP.currency).toBe('aud');
  });

  it('formats prices', () => {
    expect(fmtPrice(14900)).toBe('$149');
    expect(fmtPrice(1095)).toBe('$10.95');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/products.test.js`
Expected: FAIL — cannot resolve `../src/data/products.js`.

- [ ] **Step 3: Create the seed data file**

`src/data/products.json` — placeholder rows until the first real sync (same shape the sync writes). Images can 404 locally until sync runs; that's fine.

```json
[
  { "id": "X-1", "name": "Tempered Glass Screen Protector", "category": "Accessories", "priceCents": 1500, "image": "/images/products/X-1.jpg", "inStock": true, "sku": "SP-TG-01" },
  { "id": "X-2", "name": "USB-C Fast Charger 20W", "category": "Cables & power", "priceCents": 2500, "image": "/images/products/X-2.jpg", "inStock": true, "sku": "CH-20W" },
  { "id": "X-3", "name": "Wireless Earbuds", "category": "Audio", "priceCents": 3900, "image": "/images/products/X-3.jpg", "inStock": false, "sku": "AU-EB-01" }
]
```

- [ ] **Step 4: Add `productSchema` to `src/data/schema.js`**

Append (match the file's existing style):

```js
// One synced DXPOS product shown in /shop. Written by scripts/sync-products.mjs
// — never hand-edit products.json; change the product in DXPOS instead.
export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  priceCents: z.number().int().positive(),
  image: z.string().startsWith('/images/products/'),
  inStock: z.boolean(),
  sku: z.string(),
});
```

- [ ] **Step 5: Create `src/data/products.js`**

```js
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/products.test.js`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/data/products.json src/data/products.js src/data/schema.js tests/products.test.js
git commit -m "feat(shop): product data module synced-file shape + shop config"
```

---

### Task 2: DXPOS sync script

**Files:**
- Create: `scripts/sync-products.mjs`
- Test: `tests/syncProducts.test.js`

**Interfaces:**
- Consumes: DXPOS API through `https://pos.expressrepairs.com.au` — Worker gate (Basic auth once → `pos_gate` cookie, see `../pos-redirect/src/index.js`), then `POST /api/auth/login` `{email, password}` → `{token}`, then `GET /api/catalog?type=PRODUCT&pageSize=200&page=N` (paginated, `Authorization: Bearer <token>` + gate cookie). Catalog rows include `id, name, sku, sellCents, costCents, archived, imageUrl, gridGroup, category:{name}, stockLevels:[{onHand}], type`.
- Produces: `src/data/products.json` (Task 1 shape) and downloaded images in `public/images/products/<id>.<ext>`. Exports pure `transformCatalog(rows)` for tests.
- Env vars (script reads from `process.env`): `POS_GATE_USER`, `POS_GATE_PASS`, `POS_EMAIL`, `POS_PASSWORD`, optional `POS_BASE` (default `https://pos.expressrepairs.com.au`).

- [ ] **Step 1: Write the failing test (transform only — no network in tests)**

```js
// tests/syncProducts.test.js
import { describe, it, expect } from 'vitest';
import { transformCatalog, ONLINE_GRID_GROUPS } from '../scripts/sync-products.mjs';

const row = (over = {}) => ({
  id: 'X-10', name: 'Case', sku: 'C1', type: 'PRODUCT', archived: false,
  sellCents: 1900, costCents: 700, gridGroup: 'Accessories',
  imageUrl: '/uploads/x10.jpg', category: { name: 'Cases' },
  stockLevels: [{ onHand: 4 }],
  ...over,
});

describe('transformCatalog', () => {
  it('maps a sellable row and strips cost price', () => {
    const [p] = transformCatalog([row()]);
    expect(p).toEqual({
      id: 'X-10', name: 'Case', category: 'Cases', priceCents: 1900,
      image: '/images/products/X-10.jpg', inStock: true, sku: 'C1',
      _sourceImage: '/uploads/x10.jpg',
    });
    expect(JSON.stringify(p)).not.toMatch(/cost/i);
  });

  it('excludes archived, non-PRODUCT, zero-price, no-image, and off-list grid groups', () => {
    expect(transformCatalog([row({ archived: true })])).toHaveLength(0);
    expect(transformCatalog([row({ type: 'SERVICE' })])).toHaveLength(0);
    expect(transformCatalog([row({ sellCents: 0 })])).toHaveLength(0);
    expect(transformCatalog([row({ imageUrl: null })])).toHaveLength(0);
    expect(transformCatalog([row({ gridGroup: 'Services' })])).toHaveLength(0);
  });

  it('inStock: onHand>0 true, 0 false, untracked (null) true; falls back to gridGroup for category', () => {
    expect(transformCatalog([row({ stockLevels: [{ onHand: 0 }] })])[0].inStock).toBe(false);
    expect(transformCatalog([row({ stockLevels: [] })])[0].inStock).toBe(true);
    expect(transformCatalog([row({ category: null })])[0].category).toBe('Accessories');
  });

  it('image extension follows the source url, defaulting to jpg', () => {
    expect(transformCatalog([row({ imageUrl: '/u/a.PNG' })])[0].image).toBe('/images/products/X-10.png');
    expect(transformCatalog([row({ imageUrl: '/u/a' })])[0].image).toBe('/images/products/X-10.jpg');
  });

  it('exports the owner-editable grid-group allowlist', () => {
    expect(ONLINE_GRID_GROUPS).toContain('Accessories');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/syncProducts.test.js`
Expected: FAIL — cannot resolve `../scripts/sync-products.mjs`.

- [ ] **Step 3: Write the script**

```js
// scripts/sync-products.mjs — pull the accessories catalog from DXPOS into
// src/data/products.json + public/images/products/, for the /shop pages.
// Runs in .github/workflows/sync-products.yml during shop hours (the shop PC
// hosts DXPOS behind the pos tunnel — offline PC = graceful no-op, site keeps
// last synced data). Cost price is stripped here and must never be committed.
//
// Env: POS_GATE_USER POS_GATE_PASS (Worker Basic gate), POS_EMAIL POS_PASSWORD
// (DXPOS login), optional POS_BASE.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE = process.env.POS_BASE || 'https://pos.expressrepairs.com.au';

// Which DXPOS Sell-grid groups go online. Owner: edit this list to change
// what the shop sells; archive a product in DXPOS to remove just one item.
export const ONLINE_GRID_GROUPS = ['Accessories', 'Cables & power', 'Audio'];

const extOf = (url) => {
  const m = /\.(jpe?g|png|webp|gif)(\?|$)/i.exec(url || '');
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
};

// Pure transform: DXPOS catalog rows -> products.json entries (+ _sourceImage,
// which main() uses to download and then deletes before writing the file).
export function transformCatalog(rows) {
  return rows
    .filter(
      (r) =>
        !r.archived &&
        r.type === 'PRODUCT' &&
        r.sellCents > 0 &&
        r.imageUrl &&
        ONLINE_GRID_GROUPS.includes(r.gridGroup),
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category?.name || r.gridGroup,
      priceCents: r.sellCents,
      image: `/images/products/${r.id}.${extOf(r.imageUrl)}`,
      inStock: (r.stockLevels?.[0]?.onHand ?? null) !== 0,
      sku: r.sku,
      _sourceImage: r.imageUrl,
    }));
}

async function main() {
  const { POS_GATE_USER, POS_GATE_PASS, POS_EMAIL, POS_PASSWORD } = process.env;
  if (!POS_GATE_USER || !POS_GATE_PASS || !POS_EMAIL || !POS_PASSWORD) {
    console.error('Missing POS_* env vars'); process.exit(1);
  }

  // 1. Pass the Worker gate once with Basic auth; keep the pos_gate cookie.
  const basic = 'Basic ' + Buffer.from(`${POS_GATE_USER}:${POS_GATE_PASS}`).toString('base64');
  const gateRes = await fetch(`${BASE}/`, { headers: { Authorization: basic } }).catch(() => null);
  if (!gateRes || gateRes.status === 503) {
    console.log('POS offline (shop PC / tunnel down) — keeping last synced data.');
    process.exit(0); // graceful: not an error, just no update this run
  }
  if (gateRes.status === 401) { console.error('Gate credentials rejected'); process.exit(1); }
  const cookie = (gateRes.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie.startsWith('pos_gate=')) { console.error('No gate cookie issued'); process.exit(1); }

  // 2. DXPOS login -> JWT.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ email: POS_EMAIL, password: POS_PASSWORD }),
  });
  if (!loginRes.ok) { console.error('DXPOS login failed', loginRes.status); process.exit(1); }
  const { token } = await loginRes.json();
  const auth = { Cookie: cookie, Authorization: `Bearer ${token}` };

  // 3. Page through the catalog (hard-capped at 200/page server-side).
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}/api/catalog?type=PRODUCT&pageSize=200&page=${page}`, { headers: auth });
    if (!res.ok) { console.error('Catalog fetch failed', res.status); process.exit(1); }
    const body = await res.json();
    const data = body.data ?? body;
    rows.push(...data);
    const total = body.total ?? data.length;
    if (rows.length >= total || data.length === 0) break;
  }

  const products = transformCatalog(rows);
  if (products.length === 0) { console.error('0 sellable products — refusing to blank the shop'); process.exit(1); }

  // 4. Download images (POS-relative paths go through the gate; absolute
  //    supplier URLs are fetched directly) so the live site never hotlinks.
  const imgDir = fileURLToPath(new URL('../public/images/products/', import.meta.url));
  mkdirSync(imgDir, { recursive: true });
  for (const p of products) {
    const src = p._sourceImage.startsWith('http') ? p._sourceImage : BASE + p._sourceImage;
    const res = await fetch(src, { headers: { Cookie: cookie } });
    if (!res.ok) { console.warn(`image failed for ${p.id} (${res.status}) — keeping previous file if any`); }
    else writeFileSync(imgDir + p.image.split('/').pop(), Buffer.from(await res.arrayBuffer()));
    delete p._sourceImage;
  }

  const out = fileURLToPath(new URL('../src/data/products.json', import.meta.url));
  writeFileSync(out, JSON.stringify(products, null, 2) + '\n');
  console.log(`Synced ${products.length} products.`);
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
```

Verify in Step 4 that importing the module in tests does NOT trigger `main()` (tests pass with no POS env vars and no network) — that proves the execution guard works on this platform.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/syncProducts.test.js`
Expected: PASS (5 tests), no network calls, no `Missing POS_* env vars` output.

- [ ] **Step 5: Add script to package.json**

In `package.json` scripts: `"sync:products": "node scripts/sync-products.mjs"`.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all existing tests + new ones PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-products.mjs tests/syncProducts.test.js package.json
git commit -m "feat(shop): DXPOS catalog sync script (strips cost price, downloads images)"
```

---

### Task 3: Sync workflow

**Files:**
- Create: `.github/workflows/sync-products.yml`

**Interfaces:**
- Consumes: `npm run sync:products` (Task 2) and its `POS_*` env vars, as **GitHub repo secrets** with the same names.
- Produces: commits to `main` when data changed; the existing `deploy.yml` (push-to-main trigger) then builds and deploys. No deploy logic here.

- [ ] **Step 1: Write the workflow**

```yaml
name: Sync products from DXPOS

# Pulls the accessories catalog from the POS (shop PC via the pos tunnel) and
# commits src/data/products.json + images. deploy.yml picks up the push and
# ships it. Runs during shop hours because the shop PC hosts DXPOS; an offline
# PC makes the sync a no-op (script exits 0), never a broken shop.
#
# Repo secrets required: POS_GATE_USER POS_GATE_PASS POS_EMAIL POS_PASSWORD

on:
  schedule:
    - cron: '30 23 * * 0-5'  # ~9:30am Sydney, Mon–Sat
    - cron: '0 4 * * 1-6'    # ~2–3pm Sydney, Mon–Sat
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: sync-products
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Sync catalog
        run: npm run sync:products
        env:
          POS_GATE_USER: ${{ secrets.POS_GATE_USER }}
          POS_GATE_PASS: ${{ secrets.POS_GATE_PASS }}
          POS_EMAIL: ${{ secrets.POS_EMAIL }}
          POS_PASSWORD: ${{ secrets.POS_PASSWORD }}

      - name: Validate synced data
        run: npx vitest run tests/products.test.js

      - name: Commit if changed
        run: |
          git add src/data/products.json public/images/products
          if git diff --cached --quiet; then
            echo "No product changes."
          else
            git config user.name "product-sync[bot]"
            git config user.email "sales@funcovers.com.au"
            git commit -m "chore(shop): sync products from DXPOS"
            git push
          fi
```

- [ ] **Step 2: Validate the YAML locally**

Run: `npx js-yaml .github/workflows/sync-products.yml > /dev/null && echo OK` (js-yaml ships with the npm tree; if unavailable, `node -e "require('yaml')"` is not needed — a clean `git push` + the Actions tab is the real check).
Expected: `OK` (or skip if js-yaml absent — GitHub validates on push).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-products.yml
git commit -m "ci(shop): scheduled DXPOS product sync workflow"
```

---

### Task 4: Shop pages

**Files:**
- Create: `src/pages/shop/index.astro`
- Create: `src/pages/shop/[id].astro`
- Modify: `src/pages/index.astro` (nav `links` array — add `{ label: 'Shop', href: '/shop/' }`; find the existing `links={[...]}` passed to `SiteNav`) and `src/components/SiteFooter.astro` (add a Shop link alongside existing page links)
- Test: extend `tests/build-output.test.js`

**Interfaces:**
- Consumes: `PRODUCTS`, `fmtPrice` from `src/data/products.js` (Task 1).
- Produces: routes `/shop/` and `/shop/<id>/`. Product pages contain `<button class="btn btn-primary" data-add-to-cart data-id={p.id} ...>` — Task 5's cart script binds to `[data-add-to-cart]`.

- [ ] **Step 1: Write the failing build test**

Append to `tests/build-output.test.js` (follow its existing style for reading `dist/`):

```js
describe('shop pages', () => {
  it('builds /shop/ with product cards and no cost price', () => {
    const html = readFileSync('dist/shop/index.html', 'utf8');
    expect(html).toContain('/shop/');
    expect(html).not.toMatch(/costCents/);
  });

  it('builds a product detail page per product', () => {
    const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
    const p = products[0];
    const html = readFileSync(`dist/shop/${p.id}/index.html`, 'utf8');
    expect(html).toContain(p.name);
    expect(html).toContain('data-add-to-cart');
  });
});
```

(Adjust `readFileSync` import/paths to match how that test file already reads `dist/` — it exists, follow it.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npx vitest run tests/build-output.test.js`
Expected: FAIL — `dist/shop/index.html` missing.

- [ ] **Step 3: Create `src/pages/shop/index.astro`**

Follow the structure of an existing listing page (`src/pages/repairs.astro`) — same `Layout`, `SiteNav`, `SiteFooter`, container classes. Content:

```astro
---
import Layout from '../../layouts/Layout.astro';
import SiteNav from '../../components/SiteNav.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import MobileCta from '../../components/MobileCta.astro';
import { PRODUCTS, fmtPrice } from '../../data/products.js';

const categories = [...new Set(PRODUCTS.map((p) => p.category))];
const NAV = [
  { label: 'Repairs', href: '/repairs/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Shop', href: '/shop/' },
];
---
<Layout
  title="Phone Accessories — Cases, Chargers & More | Express Repairs"
  description="Quality phone accessories with fast shipping Australia-wide or free pickup in store. Cases, screen protectors, chargers, cables and audio."
>
  <SiteNav links={NAV} ctaHref="/shop/cart/" />
  <main class="container-wide" style="padding:2rem 0 4rem">
    <h1>Shop accessories</h1>
    <p>Ship Australia-wide (free over $99) or pick up in store — same stock as our counter.</p>
    <p><a href="/shop/cart/" class="btn btn-outline btn-sm">View cart (<span data-cart-count>0</span>)</a></p>
    {categories.map((cat) => (
      <section>
        <h2>{cat}</h2>
        <div class="grid grid-3">
          {PRODUCTS.filter((p) => p.category === cat).map((p) => (
            <a href={`/shop/${p.id}/`} class="card">
              <img src={p.image} alt={p.name} loading="lazy" width="300" height="300" style="object-fit:contain;aspect-ratio:1" />
              <h3>{p.name}</h3>
              <p><strong>{fmtPrice(p.priceCents)}</strong>{!p.inStock && <span class="tag"> Out of stock</span>}</p>
            </a>
          ))}
        </div>
      </section>
    ))}
  </main>
  <SiteFooter />
  <MobileCta />
  <script src="../../shop/cart-count.js"></script>
</Layout>
```

Reuse the site's real card/grid classes — open `src/pages/repairs.astro` and copy its card markup/classes rather than inventing new ones. The `cart-count.js` script is created in Task 5; leave the `<script>` line out until then if the build complains, and add it in Task 5.

- [ ] **Step 4: Create `src/pages/shop/[id].astro`**

```astro
---
import Layout from '../../layouts/Layout.astro';
import SiteNav from '../../components/SiteNav.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import { PRODUCTS, fmtPrice } from '../../data/products.js';

export function getStaticPaths() {
  return PRODUCTS.map((p) => ({ params: { id: p.id }, props: { p } }));
}
const { p } = Astro.props;
---
<Layout title={`${p.name} | Express Repairs`} description={`Buy ${p.name} online — ship Australia-wide or free pickup at Express Repairs.`}>
  <SiteNav links={[{ label: 'Shop', href: '/shop/' }]} ctaHref="/shop/cart/" />
  <main class="container" style="padding:2rem 0 4rem">
    <p><a href="/shop/">← All accessories</a></p>
    <div class="grid grid-2">
      <img src={p.image} alt={p.name} width="480" height="480" style="object-fit:contain;aspect-ratio:1" />
      <div>
        <h1>{p.name}</h1>
        <p style="font-size:1.5rem"><strong>{fmtPrice(p.priceCents)}</strong></p>
        {p.inStock ? (
          <button class="btn btn-primary" data-add-to-cart data-id={p.id} data-name={p.name}>Add to cart</button>
        ) : (
          <button class="btn" disabled>Out of stock</button>
        )}
        <p><a href="/shop/cart/">View cart (<span data-cart-count>0</span>)</a></p>
        <p>GST included. Flat $10.95 shipping — free over $99 — or free pickup in store.</p>
      </div>
    </div>
  </main>
  <SiteFooter />
  <script src="../../shop/cart-count.js"></script>
</Layout>
```

- [ ] **Step 5: Add Shop to site navigation**

In `src/pages/index.astro` find the nav links passed to `SiteNav` (or the homepage's own header links) and add `{ label: 'Shop', href: '/shop/' }`. In `src/components/SiteFooter.astro` add `<a href="/shop/">Accessories shop</a>` in the links column. Match surrounding markup exactly.

- [ ] **Step 6: Build and test**

Run: `npm run build && npx vitest run tests/build-output.test.js`
Expected: PASS. Also eyeball `npm run preview` → `/shop/` renders with the site's look.

- [ ] **Step 7: Commit**

```bash
git add src/pages/shop tests/build-output.test.js src/pages/index.astro src/components/SiteFooter.astro
git commit -m "feat(shop): /shop listing and product pages"
```

---

### Task 5: Cart

**Files:**
- Create: `src/shop/cart-store.js` (localStorage helpers)
- Create: `src/shop/cart-count.js` (binds `[data-cart-count]` badges + `[data-add-to-cart]` buttons)
- Create: `src/components/ShopCartPage.jsx` (React island: cart contents + checkout)
- Create: `src/pages/shop/cart.astro`
- Create: `src/pages/shop/thanks.astro`
- Test: `tests/cartStore.test.js`

**Interfaces:**
- Consumes: `PRODUCTS`, `SHOP`, `fmtPrice` (Task 1); buttons/badges from Task 4.
- Produces: `cart-store.js` exports `getCart() → {id: qty}`, `setQty(id, qty)`, `addToCart(id)`, `clearCart()`, `cartCount(cart)`. `ShopCartPage` POSTs `{items: [{id, qty}]}` to `/api/checkout` and redirects to the returned `url` (Task 6's contract).

- [ ] **Step 1: Write the failing test**

```js
// tests/cartStore.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getCart, addToCart, setQty, clearCart, cartCount } from '../src/shop/cart-store.js';

// jsdom-free localStorage stub
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

describe('cart store', () => {
  it('adds, increments, sets, and clears', () => {
    addToCart('X-1'); addToCart('X-1'); addToCart('X-2');
    expect(getCart()).toEqual({ 'X-1': 2, 'X-2': 1 });
    setQty('X-1', 5);
    expect(getCart()['X-1']).toBe(5);
    setQty('X-2', 0);
    expect(getCart()).toEqual({ 'X-1': 5 });
    expect(cartCount(getCart())).toBe(5);
    clearCart();
    expect(getCart()).toEqual({});
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('er-cart', '{nope');
    expect(getCart()).toEqual({});
  });

  it('caps quantity at 20', () => {
    setQty('X-1', 99);
    expect(getCart()['X-1']).toBe(20);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/cartStore.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/shop/cart-store.js`**

```js
// Tiny localStorage cart: { productId: qty }. Shared by the add-to-cart
// buttons (cart-count.js) and the cart page island (ShopCartPage.jsx).
const KEY = 'er-cart';
const MAX_QTY = 20; // per line — sanity cap, matches /api/checkout's limit

export function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || '{}');
    return c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
}

function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export const setQty = (id, qty) => {
  const cart = getCart();
  const n = Math.min(MAX_QTY, Math.max(0, Math.floor(qty)));
  if (n === 0) delete cart[id];
  else cart[id] = n;
  return save(cart);
};

export const addToCart = (id) => setQty(id, (getCart()[id] || 0) + 1);
export const clearCart = () => save({});
export const cartCount = (cart) => Object.values(cart).reduce((a, b) => a + b, 0);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/cartStore.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `src/shop/cart-count.js`**

```js
// Wires [data-add-to-cart] buttons and [data-cart-count] badges on shop pages.
import { getCart, addToCart, cartCount } from './cart-store.js';

const refresh = () => {
  const n = cartCount(getCart());
  document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = String(n)));
};

document.querySelectorAll('[data-add-to-cart]').forEach((btn) =>
  btn.addEventListener('click', () => {
    addToCart(btn.dataset.id);
    refresh();
    btn.textContent = 'Added ✓';
    setTimeout(() => (btn.textContent = 'Add to cart'), 1200);
  }),
);
refresh();
```

Add the `<script src="../../shop/cart-count.js"></script>` lines to both Task 4 pages if deferred there.

- [ ] **Step 6: Implement `src/components/ShopCartPage.jsx`**

Follow `BookingWidget.jsx` for style/state conventions (it's the existing React island). Behavior:

```jsx
import { useEffect, useState } from 'react';
import { PRODUCTS, SHOP, fmtPrice } from '../data/products.js';
import { getCart, setQty, cartCount } from '../shop/cart-store.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export default function ShopCartPage() {
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setCart(getCart()), []);

  const lines = Object.entries(cart).filter(([id]) => byId[id]);
  const subtotal = lines.reduce((sum, [id, qty]) => sum + byId[id].priceCents * qty, 0);
  const freeShip = subtotal >= SHOP.freeShippingThresholdCents;

  const update = (id, qty) => setCart({ ...setQty(id, qty) });

  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines.map(([id, qty]) => ({ id, qty })) }),
      });
      const body = await res.json();
      if (res.ok && body.url) { location.href = body.url; return; }
      setError(body.error || 'Checkout is unavailable right now — call us and we can take payment over the phone.');
    } catch {
      setError('Checkout is unavailable right now — call us and we can take payment over the phone.');
    }
    setBusy(false);
  };

  if (!lines.length) return <p>Your cart is empty. <a href="/shop/">Browse accessories</a>.</p>;
  return (
    <div>
      {lines.map(([id, qty]) => (
        <div key={id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '.75rem 0', borderBottom: '1px solid #eee' }}>
          <img src={byId[id].image} alt="" width="64" height="64" style={{ objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <strong>{byId[id].name}</strong>
            <div>{fmtPrice(byId[id].priceCents)}</div>
          </div>
          <input type="number" min="0" max="20" value={qty} onChange={(e) => update(id, Number(e.target.value))} style={{ width: '4rem' }} />
          <button onClick={() => update(id, 0)} aria-label={`Remove ${byId[id].name}`}>✕</button>
        </div>
      ))}
      <p style={{ marginTop: '1rem' }}>
        Subtotal: <strong>{fmtPrice(subtotal)}</strong> ({cartCount(cart)} items)<br />
        Shipping: {freeShip ? 'FREE' : fmtPrice(SHOP.flatShippingCents)} — or free pickup in store (choose at checkout)
      </p>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      <button className="btn btn-primary" disabled={busy} onClick={checkout}>
        {busy ? 'Redirecting…' : 'Checkout securely'}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/pages/shop/cart.astro` and `src/pages/shop/thanks.astro`**

`cart.astro`: Layout + SiteNav (as Task 4) + `<h1>Your cart</h1>` + `<ShopCartPage client:load />` (import from `../../components/ShopCartPage.jsx`).

`thanks.astro`: Layout + SiteNav + confirmation copy: "Order received — thank you! You'll get a Stripe receipt by email; we'll pack your order and email/text when it ships (or when it's ready for pickup)." Plus an inline script to clear the cart:

```astro
<script>
  import { clearCart } from '../../shop/cart-store.js';
  clearCart();
</script>
```

- [ ] **Step 8: Full build + suite**

Run: `npm run build && npm test`
Expected: PASS; `/shop/cart/` renders the island (check `npm run preview`).

- [ ] **Step 9: Commit**

```bash
git add src/shop src/components/ShopCartPage.jsx src/pages/shop tests/cartStore.test.js
git commit -m "feat(shop): cart with localStorage store and checkout hand-off"
```

---

### Task 6: Checkout Pages Function

**Files:**
- Create: `functions/api/checkout.js`
- Test: `tests/checkout.test.js`

**Interfaces:**
- Consumes: `src/data/products.json` (imported directly — esbuild bundles JSON) and `SHOP` values (duplicate the two shipping constants locally with a comment, OR import from `../../src/data/products.js`; importing is preferred and works — zod is bundleable. Use the import.). Env: `STRIPE_SECRET_KEY` (Pages secret).
- Produces: `POST /api/checkout` accepting `{items: [{id, qty}]}` → `200 {ok:true, url}` (Stripe-hosted page) | `400/403/405/503 {ok:false, error}`. Success redirects to `/shop/thanks/`, cancel to `/shop/cart/`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/checkout.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/checkout.js';
import { PRODUCTS, SHOP } from '../src/data/products.js';

const ORIGIN = 'https://expressrepairs.com.au';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x' };
const inStock = PRODUCTS.find((p) => p.inStock);

function makeReq({ method = 'POST', body = {}, origin = ORIGIN } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return { method, headers, json: async () => body };
}

const okStripe = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }), { status: 200 }),
  );

beforeEach(() => vi.restoreAllMocks());

describe('POST /api/checkout', () => {
  it('rejects non-POST (405) and cross-origin (403)', async () => {
    expect((await onRequest({ request: makeReq({ method: 'GET' }), env: ENV })).status).toBe(405);
    expect((await onRequest({ request: makeReq({ origin: 'https://evil.example' }), env: ENV })).status).toBe(403);
  });

  it('400s on empty cart, unknown product, bad qty', async () => {
    for (const items of [[], [{ id: 'nope-999', qty: 1 }], [{ id: inStock.id, qty: 0 }], [{ id: inStock.id, qty: 21 }]]) {
      const res = await onRequest({ request: makeReq({ body: { items } }), env: ENV });
      expect(res.status).toBe(400);
    }
  });

  it('400s on out-of-stock items when any exist', async () => {
    const oos = PRODUCTS.find((p) => !p.inStock);
    if (!oos) return; // seed data may be all in stock after a real sync
    const res = await onRequest({ request: makeReq({ body: { items: [{ id: oos.id, qty: 1 }] } }), env: ENV });
    expect(res.status).toBe(400);
  });

  it('503s when Stripe key not configured', async () => {
    const res = await onRequest({ request: makeReq({ body: { items: [{ id: inStock.id, qty: 1 }] } }), env: {} });
    expect(res.status).toBe(503);
  });

  it('uses SERVER prices (ignores any client-sent price) and returns the Stripe url', async () => {
    const fetchSpy = okStripe();
    const res = await onRequest({
      request: makeReq({ body: { items: [{ id: inStock.id, qty: 2, priceCents: 1 }] } }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toContain('checkout.stripe.com');
    const sent = fetchSpy.mock.calls[0][1].body.toString();
    expect(sent).toContain(`unit_amount%5D=${inStock.priceCents}`); // encoded [unit_amount]=serverPrice
    expect(sent).not.toContain('unit_amount%5D=1&');
  });

  it('offers free shipping at/over the threshold, flat rate below it', async () => {
    const fetchSpy = okStripe();
    const qtyForFree = Math.ceil(SHOP.freeShippingThresholdCents / inStock.priceCents);
    await onRequest({ request: makeReq({ body: { items: [{ id: inStock.id, qty: Math.min(20, qtyForFree) }] } }), env: ENV });
    const sent = fetchSpy.mock.calls[0][1].body.toString();
    if (inStock.priceCents * Math.min(20, qtyForFree) >= SHOP.freeShippingThresholdCents) {
      expect(sent).not.toContain(String(SHOP.flatShippingCents));
    } else {
      expect(sent).toContain(String(SHOP.flatShippingCents));
    }
    expect(sent).toContain('Pickup+in+store');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/checkout.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `functions/api/checkout.js`**

```js
// Cloudflare Pages Function — POST /api/checkout
//
// Turns a cart ({items:[{id, qty}]}) into a Stripe Checkout Session and
// returns its hosted-payment url. Prices ALWAYS come from the synced catalog
// (src/data/products.json) — a client-sent price is ignored, so a tampered
// cart can't buy at $0.01. Stock and existence are checked here too.
//
// Env (Pages project → Settings → Environment variables):
//   STRIPE_SECRET_KEY (secret, required) — sk_live_… (sk_test_… while testing)
//
// Shipping: flat rate below the free threshold, free at/over it, and a free
// "Pickup in store" option always. Values live in src/data/products.js (SHOP).
import { PRODUCTS, SHOP } from '../../src/data/products.js';

const MAX_QTY = 20; // per line — matches the cart UI cap
const SITE = 'https://www.expressrepairs.com.au';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Same-site gate — same policy as lead.js.
const hostAllowed = (host, env) => {
  if (!host) return false;
  const extra = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (
    host === 'expressrepairs.com.au' ||
    host === 'www.expressrepairs.com.au' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    extra.includes(host)
  );
};
const sameSite = (request, env) => {
  const hostOf = (v) => { try { return new URL(v).host; } catch { return ''; } };
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: 'Invalid request body.' }); }

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length || items.length > 50) return json(400, { ok: false, error: 'Cart is empty.' });

  const lines = [];
  for (const { id, qty } of items) {
    const p = byId[id];
    const n = Number(qty);
    if (!p) return json(400, { ok: false, error: 'An item in your cart is no longer available.' });
    if (!Number.isInteger(n) || n < 1 || n > MAX_QTY) return json(400, { ok: false, error: 'Invalid quantity.' });
    if (!p.inStock) return json(400, { ok: false, error: `${p.name} is out of stock — please remove it from your cart.` });
    lines.push({ p, qty: n });
  }

  const key = env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { ok: false, error: 'Online payment is not set up yet — call us to order.' });

  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const freeShip = subtotal >= SHOP.freeShippingThresholdCents;

  // Stripe wants application/x-www-form-urlencoded with bracket nesting.
  const form = new URLSearchParams();
  const set = (k, v) => form.set(k, String(v));
  set('mode', 'payment');
  set('success_url', `${SITE}/shop/thanks/?session_id={CHECKOUT_SESSION_ID}`);
  set('cancel_url', `${SITE}/shop/cart/`);
  set('currency', SHOP.currency);
  set('phone_number_collection[enabled]', 'true');
  set('shipping_address_collection[allowed_countries][0]', 'AU');
  lines.forEach((l, i) => {
    set(`line_items[${i}][quantity]`, l.qty);
    set(`line_items[${i}][price_data][currency]`, SHOP.currency);
    set(`line_items[${i}][price_data][unit_amount]`, l.p.priceCents);
    set(`line_items[${i}][price_data][product_data][name]`, l.p.name);
    set(`line_items[${i}][price_data][product_data][metadata][id]`, l.p.id);
    set(`line_items[${i}][price_data][product_data][metadata][sku]`, l.p.sku);
  });
  const ship = (i, label, cents) => {
    set(`shipping_options[${i}][shipping_rate_data][display_name]`, label);
    set(`shipping_options[${i}][shipping_rate_data][type]`, 'fixed_amount');
    set(`shipping_options[${i}][shipping_rate_data][fixed_amount][currency]`, SHOP.currency);
    set(`shipping_options[${i}][shipping_rate_data][fixed_amount][amount]`, cents);
  };
  if (freeShip) ship(0, 'Free shipping (order over $99)', 0);
  else ship(0, 'Standard shipping (AusPost)', SHOP.flatShippingCents);
  ship(1, 'Pickup in store — Express Repairs', 0);

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const body = await res.json();
    if (!res.ok || !body.url) {
      console.error('Stripe session create failed', res.status, body?.error?.message);
      return json(503, { ok: false, error: 'Could not start checkout right now.' });
    }
    return json(200, { ok: true, url: body.url });
  } catch (err) {
    console.error('Stripe request error', err);
    return json(503, { ok: false, error: 'Could not start checkout right now.' });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/checkout.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify the Function bundles**

Run: `npm run build && npx wrangler pages functions build --outdir=.wrangler-fn-check 2>&1 | tail -3` (then delete `.wrangler-fn-check`). If the JSON/zod import fails to bundle, fall back to importing `products.json` directly and inlining the two SHOP constants with a `// keep in sync with src/data/products.js` comment.
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add functions/api/checkout.js tests/checkout.test.js
git commit -m "feat(shop): Stripe Checkout session endpoint with server-side price validation"
```

---

### Task 7: Stripe webhook → order email

**Files:**
- Create: `functions/api/stripe-webhook.js`
- Test: `tests/stripeWebhook.test.js`

**Interfaces:**
- Consumes: Stripe `checkout.session.completed` events. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` (+ optional `LEAD_TO_EMAIL`/`LEAD_FROM_EMAIL`, same defaults as lead.js).
- Produces: `POST /api/stripe-webhook` → 200 on success/ignored events, 400 on bad signature, 503 on email failure (Stripe retries non-2xx). Order email to sales@funcovers.com.au.

- [ ] **Step 1: Write the failing tests**

```js
// tests/stripeWebhook.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/stripe-webhook.js';

const SECRET = 'whsec_testsecret';
const ENV = { STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 'rk_x' };

async function sign(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${t},v1=${hex}`;
}

const EVENT = JSON.stringify({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_1', amount_total: 4085, customer_details: { name: 'Jo', email: 'jo@x.com', phone: '+614' }, shipping_details: { address: { line1: '1 St', city: 'Sydney', postal_code: '2000', state: 'NSW' } }, shipping_cost: { amount_total: 1095 } } },
});

function makeReq(payload, sigHeader) {
  const headers = new Headers();
  if (sigHeader) headers.set('stripe-signature', sigHeader);
  return { method: 'POST', headers, text: async () => payload };
}

// fetch mock: first call = Stripe line_items GET, second = Resend POST
const mockUpstreams = (resendStatus = 200) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url).includes('api.stripe.com')) {
      return new Response(JSON.stringify({ data: [{ description: 'Case', quantity: 2, amount_total: 3800 }] }), { status: 200 });
    }
    return new Response('{}', { status: resendStatus });
  });

beforeEach(() => vi.restoreAllMocks());

describe('POST /api/stripe-webhook', () => {
  it('400s on missing or invalid signature, sends nothing', async () => {
    const spy = mockUpstreams();
    expect((await onRequest({ request: makeReq(EVENT, null), env: ENV })).status).toBe(400);
    expect((await onRequest({ request: makeReq(EVENT, 't=1,v1=deadbeef'), env: ENV })).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('400s on stale timestamp (replay guard)', async () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET, old)), env: ENV });
    expect(res.status).toBe(400);
  });

  it('emails the order on checkout.session.completed and 200s', async () => {
    const spy = mockUpstreams();
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    const resendCall = spy.mock.calls.find(([u]) => String(u).includes('resend'));
    expect(resendCall).toBeTruthy();
    const body = JSON.parse(resendCall[1].body);
    expect(body.subject).toContain('order');
    expect(body.text).toContain('Case');
    expect(body.text).toContain('Jo');
  });

  it('200s and ignores other event types without emailing', async () => {
    const spy = mockUpstreams();
    const other = JSON.stringify({ type: 'payment_intent.created', data: { object: {} } });
    const res = await onRequest({ request: makeReq(other, await sign(other, SECRET)), env: ENV });
    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('503s when the email fails so Stripe retries', async () => {
    mockUpstreams(500);
    const res = await onRequest({ request: makeReq(EVENT, await sign(EVENT, SECRET)), env: ENV });
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/stripeWebhook.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `functions/api/stripe-webhook.js`**

```js
// Cloudflare Pages Function — POST /api/stripe-webhook
//
// Stripe calls this when an online order is paid (checkout.session.completed).
// We verify the signature manually (WebCrypto — no Stripe SDK), fetch the
// session's line items, and email the order to the shop via Resend, exactly
// like /api/lead does for enquiries. Non-2xx responses make Stripe retry for
// up to 3 days, so a Resend outage can't lose an order.
//
// Env: STRIPE_WEBHOOK_SECRET (whsec_…), STRIPE_SECRET_KEY, RESEND_API_KEY,
// optional LEAD_TO_EMAIL / LEAD_FROM_EMAIL (same defaults as lead.js).
// Configure the endpoint in Stripe Dashboard → Developers → Webhooks →
// https://www.expressrepairs.com.au/api/stripe-webhook, event
// checkout.session.completed.

const DEFAULT_TO = 'sales@funcovers.com.au';
const DEFAULT_FROM = 'Express Repairs <quotes@expressrepairs.com.au>';
const TOLERANCE_SECONDS = 300;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function validSignature(payload, header, secret) {
  const parts = Object.fromEntries(
    String(header || '').split(',').map((kv) => kv.split('=', 2)).filter((p) => p.length === 2),
  );
  const t = Number(parts.t);
  if (!t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  if (sig.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false });

  const payload = await request.text();
  const ok = env.STRIPE_WEBHOOK_SECRET &&
    (await validSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET));
  if (!ok) return json(400, { ok: false, error: 'Bad signature.' });

  let event;
  try { event = JSON.parse(payload); } catch { return json(400, { ok: false, error: 'Bad payload.' }); }
  if (event.type !== 'checkout.session.completed') return json(200, { ok: true, ignored: true });

  const s = event.data.object;

  // Fetch what was bought (line items aren't embedded in the event).
  let items = [];
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${s.id}/line_items?limit=100`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (res.ok) items = (await res.json()).data || [];
    else console.error('line_items fetch failed', res.status);
  } catch (err) {
    console.error('line_items fetch error', err);
  }

  const c = s.customer_details || {};
  const addr = s.shipping_details?.address;
  const shipTo = addr && addr.line1
    ? [addr.line1, addr.line2, `${addr.city || ''} ${addr.state || ''} ${addr.postal_code || ''}`].filter(Boolean).join(', ')
    : 'PICKUP IN STORE';

  const itemLines = items.map((i) => `${i.quantity} × ${i.description} — ${money(i.amount_total)}`);
  const rows = [
    ['Customer', c.name],
    ['Email', c.email],
    ['Phone', c.phone],
    ['Deliver to', shipTo],
    ['Items', itemLines.join('\n') || `(see Stripe session ${s.id})`],
    ['Shipping', money(s.shipping_cost?.amount_total)],
    ['TOTAL PAID', money(s.amount_total)],
  ].filter(([, v]) => v);

  const text = `New online order (PAID)\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nStripe session: ${s.id}`;
  const html = `<h2>New online order (PAID)</h2><table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:15px">${rows
    .map(([k, v]) => `<tr><td style="color:#666"><strong>${esc(k)}</strong></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table><p style="color:#999;font-size:13px">Stripe session ${esc(s.id)} · expressrepairs.com.au/shop</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL || DEFAULT_FROM,
        to: [env.LEAD_TO_EMAIL || DEFAULT_TO],
        subject: `New online order — ${money(s.amount_total)}${c.name ? ` — ${c.name}` : ''}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Resend order email failed', res.status, await res.text());
      return json(503, { ok: false }); // non-2xx → Stripe retries
    }
  } catch (err) {
    console.error('Resend order email error', err);
    return json(503, { ok: false });
  }

  return json(200, { ok: true });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/stripeWebhook.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Full suite + build**

Run: `npm test && npm run build`
Expected: everything PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/api/stripe-webhook.js tests/stripeWebhook.test.js
git commit -m "feat(shop): Stripe webhook emails paid orders to the shop"
```

---

### Task 8: Owner setup runbook

**Files:**
- Create: `docs/shop-setup.md`

**Interfaces:** none — documentation for the owner + future agents.

- [ ] **Step 1: Write `docs/shop-setup.md`**

Cover, in owner-followable steps:

1. **Stripe account**: sign up at stripe.com (ABN, bank account). Copy `sk_live_…` secret key. Create webhook endpoint `https://www.expressrepairs.com.au/api/stripe-webhook` for event `checkout.session.completed`; copy `whsec_…`.
2. **Cloudflare Pages env vars** (project `expressrepairs` → Settings → Environment variables, Production): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (both Secret type). `RESEND_API_KEY` already exists.
3. **GitHub repo secrets** (Settings → Secrets → Actions): `POS_GATE_USER`, `POS_GATE_PASS` (the pos.expressrepairs.com.au Basic login), `POS_EMAIL`, `POS_PASSWORD` (a DXPOS staff login).
4. **First sync**: Actions → "Sync products from DXPOS" → Run workflow. Check `/shop/` after the deploy finishes.
5. **Managing the range**: price/photo/stock changes in DXPOS flow automatically at 9:30am & 2pm Mon–Sat; archive a product in DXPOS to remove it; the online range = Sell-grid groups Accessories / Cables & power / Audio (edit `ONLINE_GRID_GROUPS` in `scripts/sync-products.mjs` to change).
6. **Test before going live**: with `sk_test_…`/test webhook secret set, place an order with card `4242 4242 4242 4242`, confirm the order email arrives, then swap in live keys.
7. **Orders**: arrive by email (like leads). Ring up the sale in DXPOS so stock stays right (automatic push is Phase 2). Refunds via the Stripe Dashboard.

- [ ] **Step 2: Commit**

```bash
git add docs/shop-setup.md
git commit -m "docs(shop): owner setup runbook for Stripe + sync secrets"
```

---

## Launch checklist (after all tasks merge & deploy)

- [ ] Owner adds the 4 GitHub secrets → run sync workflow → real products render on `/shop/`.
- [ ] Owner adds Stripe **test** keys to Pages env → end-to-end test order (4242 card) → order email received.
- [ ] Swap to live keys → one real $1-range order (then refund) → GO.
- [ ] Update memory/status docs; Phase 2 (webhook → `POST /api/sales` in DXPOS) gets its own spec when order volume justifies it.
