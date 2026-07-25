# Supplier Order Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A PIN-gated `/staff/order/` page where staff build a HOCO or MobileMall supplier order and export it as copyable text / CSV.

**Architecture:** Supplier xlsx catalogues (private, outside the repo) are extracted by a Python script and pushed to the existing `ORDERS_KV` namespace by a Node script. A Pages Function validates the shared shop PIN and serves the catalogue JSON. A static Astro staff page does search/qty/export entirely client-side. Spec: `docs/superpowers/specs/2026-07-25-supplier-order-tool-design.md`.

**Tech Stack:** Astro (static page, inline vanilla JS), Cloudflare Pages Functions, Workers KV, Python + openpyxl (extract), Node (transform/upload), Vitest.

## Global Constraints

- The repo and deployed site are **public**. Supplier cost prices may exist ONLY in: the xlsx files outside the repo, the gitignored `.supplier-data/` directory, KV, and PIN-gated API responses. Never in a committed file or the static bundle.
- Money is stored as integer cents (`costCents`, `rrpCents`) — repo convention (`priceCents`, `rrpCents`).
- PIN secret: `env.STAFF_PIN`, falling back to `env.REVIEW_SMS_PIN`. Minimum configured length 10 (same rule as `review-sms.js`); unset/short → 503, wrong → 401.
- Follow existing patterns: helpers from `functions/_shared.js`, staff-page style from `src/pages/staff/review-request.astro`, script exports tested like `scripts/catalog-fixes.mjs`.
- KV namespace id `76d87c01303149d5b37f520242b0f335` (binding `ORDERS_KV` in `wrangler.toml`). Keys: `supplier-catalog:hoco`, `supplier-catalog:mobilemall`.
- Work on branch `feat/supplier-order-tool` in its own worktree (a parallel agent commits to this repo — never share the working tree). PR + squash merge, like every prior feature.

### xlsx layouts (verified 2026-07-25 against the 2026-07-20 files)

- `HOCO_Catalogue_with_RRP_*.xlsx`, sheet `Catalogue`:
  `('Product ID', 'Product Name', 'Wholesale Price (AUD)', 'Selling Price / RRP (AUD)', 'Margin (AUD)', 'Margin %', 'Product URL', 'Image URL')` — 3,848 data rows. Cost = Wholesale. No category column.
- `MobileMall_Catalogue_*.xlsx`, sheet `Catalogue`:
  `('SKU', 'Product Name', 'Regular Price (AUD)', 'Current Price (AUD)', 'Stock Status', 'Categories', 'Product URL', 'Image URL')` — 6,969 data rows. Cost = Current Price. No RRP. `Categories` is a `A | B | C` string. `Stock Status` = `In stock` / `Out of stock`.

### Catalogue row shape (produced by Task 2/3, consumed by Tasks 4/5)

```js
{ sku: string, name: string, costCents: number, rrpCents: number|null,
  category: string, stocked: boolean, inStock: boolean }
```

---

### Task 0: Worktree

**Files:** none (git only)

- [ ] **Step 1: Create the worktree + branch**

```bash
cd "C:\Users\sales\claudee\expressrepairs\repo"
git worktree add ../wt-supplier-orders -b feat/supplier-order-tool
cd ../wt-supplier-orders
npm install
```

- [ ] **Step 2: Verify the suite is green before touching anything**

Run: `npx vitest run`
Expected: all existing tests PASS. (All later commands run from `wt-supplier-orders`.)

---

### Task 1: Shared PIN helper in `_shared.js`

`pinEqual` and the min-length rule currently live privately in `review-sms.js`; the new endpoint needs them too. Move, don't copy.

**Files:**
- Modify: `functions/_shared.js` (append)
- Modify: `functions/api/review-sms.js` (delete local copy, import)
- Test: `tests/supplierOrderApi.test.js` (created here, grows in Task 4)

**Interfaces:**
- Produces: `pinEqual(a: string, b: string): boolean`, `MIN_PIN_LENGTH = 10` — exported from `functions/_shared.js`.

- [ ] **Step 1: Write the failing test**

Create `tests/supplierOrderApi.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pinEqual, MIN_PIN_LENGTH } from '../functions/_shared.js';

describe('pinEqual', () => {
  it('matches only exact equal strings', () => {
    expect(pinEqual('secret-pin-123456', 'secret-pin-123456')).toBe(true);
    expect(pinEqual('secret-pin-123456', 'secret-pin-123457')).toBe(false);
    expect(pinEqual('short', 'shorter')).toBe(false);
    expect(pinEqual(undefined, 'x')).toBe(false);
  });
  it('exports the min length rule', () => {
    expect(MIN_PIN_LENGTH).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/supplierOrderApi.test.js`
Expected: FAIL — `_shared.js` has no export `pinEqual`.

- [ ] **Step 3: Move the helper**

Append to `functions/_shared.js`:

```js
// Length-safe PIN comparison (avoids a trivial early-exit timing signal).
// The PIN is the sole real barrier on staff endpoints — Origin/Referer are
// forgeable off-browser. MIN_PIN_LENGTH rejects a weak configured secret as
// misconfiguration so it can't ship and be brute-forced.
export const MIN_PIN_LENGTH = 10;
export const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
```

In `functions/api/review-sms.js`: change the import line to

```js
import { json, sameSite, pinEqual, MIN_PIN_LENGTH } from '../_shared.js';
```

and delete the local `pinEqual` const (lines ~58–64) and the local `const MIN_PIN_LENGTH = 10;` (line ~69) plus their now-duplicated comments.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS (new test + all existing review-sms tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add functions/_shared.js functions/api/review-sms.js tests/supplierOrderApi.test.js
git commit -m "refactor: share pinEqual/MIN_PIN_LENGTH across staff endpoints"
```

---

### Task 2: xlsx extractor — `scripts/extract-supplier-catalog.py`

Mirrors `extract-hoco-catalogue.py`, but keeps cost — so output goes to a **gitignored** dir, never `src/data/`.

**Files:**
- Create: `scripts/extract-supplier-catalog.py`
- Modify: `.gitignore` (append `.supplier-data/`)

**Interfaces:**
- Produces: `.supplier-data/hoco.json` — array of `{ "id": int, "name": str, "cost": float, "rrp": float }`; `.supplier-data/mobilemall.json` — array of `{ "sku": str, "name": str, "cost": float, "stock": str, "categories": str }`. Consumed by Task 3.

- [ ] **Step 1: Append `.supplier-data/` to `.gitignore`**

```
# private supplier catalogue extracts (contain cost prices — repo is public)
.supplier-data/
```

- [ ] **Step 2: Write the script**

```python
# scripts/extract-supplier-catalog.py — supplier xlsx -> .supplier-data/*.json
# Usage: python scripts/extract-supplier-catalog.py <hoco.xlsx> <mobilemall.xlsx>
# Output INCLUDES wholesale/cost prices, so it goes to gitignored .supplier-data/
# (repo is public). Next step: node scripts/build-supplier-catalog.mjs
import json, sys, pathlib
import openpyxl

hoco_src, mm_src = sys.argv[1], sys.argv[2]
out_dir = pathlib.Path(__file__).parent.parent / ".supplier-data"
out_dir.mkdir(exist_ok=True)

def rows_of(path):
    ws = openpyxl.load_workbook(path, read_only=True)["Catalogue"]
    it = ws.iter_rows(values_only=True)
    return next(it), it

def num(v):
    return float(v) if isinstance(v, (int, float)) else None

# HOCO: (Product ID, Product Name, Wholesale Price, RRP, Margin, Margin %, URL, Image)
header, rows = rows_of(hoco_src)
assert header[:4] == ("Product ID", "Product Name", "Wholesale Price (AUD)",
                      "Selling Price / RRP (AUD)"), f"HOCO layout changed: {header}"
hoco, skipped = [], 0
for r in rows:
    pid, name, cost, rrp = r[0], r[1], num(r[2]), num(r[3])
    if not pid or not name or not cost or cost <= 0:
        skipped += 1
        continue
    hoco.append({"id": int(pid), "name": str(name).strip(), "cost": cost, "rrp": rrp})
(out_dir / "hoco.json").write_text(json.dumps(hoco), encoding="utf-8")
print(f"hoco: {len(hoco)} rows, {skipped} skipped")

# MobileMall: (SKU, Product Name, Regular Price, Current Price, Stock Status, Categories, URL, Image)
header, rows = rows_of(mm_src)
assert header[:5] == ("SKU", "Product Name", "Regular Price (AUD)",
                      "Current Price (AUD)", "Stock Status"), f"MobileMall layout changed: {header}"
mm, skipped = [], 0
for r in rows:
    sku, name, cost, stock, cats = r[0], r[1], num(r[3]), r[4], r[5]
    if not sku or not name or not cost or cost <= 0:
        skipped += 1
        continue
    mm.append({"sku": str(sku).strip(), "name": str(name).strip(), "cost": cost,
               "stock": str(stock or "").strip(), "categories": str(cats or "").strip()})
(out_dir / "mobilemall.json").write_text(json.dumps(mm), encoding="utf-8")
print(f"mobilemall: {len(mm)} rows, {skipped} skipped")
```

- [ ] **Step 3: Run it against the real files**

Run (from the worktree root):
`python scripts/extract-supplier-catalog.py "..\HOCO_Catalogue_with_RRP_2026-07-20.xlsx" "..\MobileMall_Catalogue_2026-07-20.xlsx"`
Expected: `hoco: ~3800 rows`, `mobilemall: ~6900 rows`, both files present in `.supplier-data/`, and `git status` shows NO `.supplier-data` entries (gitignore works — verify this explicitly).

- [ ] **Step 4: Commit (script + gitignore only)**

```bash
git add scripts/extract-supplier-catalog.py .gitignore
git commit -m "feat: extract supplier catalogues (cost data stays gitignored)"
```

---

### Task 3: Transform + KV upload — `scripts/build-supplier-catalog.mjs`

**Files:**
- Create: `scripts/build-supplier-catalog.mjs`
- Test: `tests/supplierCatalog.test.js`

**Interfaces:**
- Consumes: `.supplier-data/*.json` (Task 2 shapes), `src/data/hoco-products.json` (`{id:'H-8250',category,...}`), `src/data/products.json` (`{name,...}`).
- Produces: exported `normName(s)`, `buildHocoRows(raw, hocoProducts)`, `buildMobilemallRows(raw, shopProducts)` returning the Catalogue-row shape from Global Constraints; KV keys `supplier-catalog:hoco` / `supplier-catalog:mobilemall` holding `JSON.stringify(rows)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/supplierCatalog.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normName, buildHocoRows, buildMobilemallRows } from '../scripts/build-supplier-catalog.mjs';

describe('normName', () => {
  it('lowercases and collapses non-alphanumerics', () => {
    expect(normName('USB-C  Fast Charger (20W)!')).toBe('usb c fast charger 20w');
  });
});

describe('buildHocoRows', () => {
  // Fixture values are fabricated to avoid real supplier cost data in a public repo.
  // Do NOT replace these with actual SKU/cost/RRP values; cost prices must never
  // be committed. The test verifies id-join, cents conversion, category lookup, and
  // unmatched-row handling — any fabricated values that exercise these paths work.
  const raw = [
    { id: 1001, name: 'Fabricated Ring Stand', cost: 9.99, rrp: 24.99 },
    { id: 9999, name: 'Unlisted Thing', cost: 2, rrp: null },
  ];
  const hocoProducts = [{ id: 'H-1001', category: 'Screen Protection' }];
  it('maps cents, category and stocked from the shop HOCO data', () => {
    const rows = buildHocoRows(raw, hocoProducts);
    expect(rows[0]).toEqual({
      sku: '1001', name: 'Fabricated Ring Stand', costCents: 999, rrpCents: 2499,
      category: 'Screen Protection', stocked: true, inStock: true,
    });
    expect(rows[1]).toEqual({
      sku: '9999', name: 'Unlisted Thing', costCents: 200, rrpCents: null,
      category: '', stocked: false, inStock: true,
    });
  });
});

describe('buildMobilemallRows', () => {
  const raw = [
    { sku: 'CH1', name: 'USB-C Fast Charger 20W', cost: 12.5, stock: 'In stock', categories: 'Chargers | Wall' },
    { sku: 'CH2', name: 'Rare Cable', cost: 3, stock: 'Out of stock', categories: '' },
  ];
  const shopProducts = [{ name: 'USB-C Fast Charger 20W' }];
  it('maps cents, supplier stock, and stocked by normalised name', () => {
    const rows = buildMobilemallRows(raw, shopProducts);
    expect(rows[0]).toEqual({
      sku: 'CH1', name: 'USB-C Fast Charger 20W', costCents: 1250, rrpCents: null,
      category: 'Chargers | Wall', stocked: true, inStock: true,
    });
    expect(rows[1].stocked).toBe(false);
    expect(rows[1].inStock).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/supplierCatalog.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the script**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/supplierCatalog.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the real upload once**

Run: `node scripts/build-supplier-catalog.mjs`
Expected: row counts printed, two `wrangler kv key put` successes. Verify with:
`npx wrangler kv key get supplier-catalog:hoco --namespace-id 76d87c01303149d5b37f520242b0f335 --remote | head -c 200`
(If wrangler auth is missing, note it for the owner and continue — the code tasks don't depend on the upload.)

- [ ] **Step 6: Commit**

```bash
git add scripts/build-supplier-catalog.mjs tests/supplierCatalog.test.js
git commit -m "feat: build + upload supplier catalogues to KV"
```

---

### Task 4: API — `functions/api/supplier-catalog.js`

**Files:**
- Create: `functions/api/supplier-catalog.js`
- Test: `tests/supplierOrderApi.test.js` (append)

**Interfaces:**
- Consumes: `json`, `sameSite`, `pinEqual`, `MIN_PIN_LENGTH` from `functions/_shared.js` (Task 1); KV keys from Task 3.
- Produces: `POST /api/supplier-catalog` with body `{ pin, supplier: 'hoco'|'mobilemall' }` → 200 raw JSON array of catalogue rows (`Cache-Control: no-store`); 401 wrong PIN `{ok:false,error:'Wrong PIN.'}`; 400 bad supplier/body; 404 catalogue missing; 503 PIN unconfigured; 403 cross-origin; 405 non-POST.

- [ ] **Step 1: Append the failing tests**

Append to `tests/supplierOrderApi.test.js`:

```js
const { onRequest } = await import('../functions/api/supplier-catalog.js');

const PIN = 'secret-pin-123456';
// Fabricated test data: sku/name/costCents do not correspond to real supplier rows.
// The repo is public, so cost prices must never leak in committed test fixtures.
const HOCO_ROWS = '[{"sku":"1001","name":"Fabricated Ring Stand","costCents":999}]';
const kv = { get: async (k) => (k === 'supplier-catalog:hoco' ? HOCO_ROWS : null) };
const env = { STAFF_PIN: PIN, ORDERS_KV: kv };

const req = (body, { method = 'POST', origin = 'https://expressrepairs.com.au' } = {}) => {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return { method, headers, json: async () => body };
};

describe('POST /api/supplier-catalog', () => {
  it('rejects non-POST and cross-origin', async () => {
    expect((await onRequest({ request: req({}, { method: 'GET' }), env })).status).toBe(405);
    expect((await onRequest({ request: req({}, { origin: 'https://evil.example' }), env })).status).toBe(403);
  });
  it('503 when no PIN configured, 401 on wrong PIN', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { ORDERS_KV: kv } })).status).toBe(503);
    expect((await onRequest({ request: req({ pin: 'nope-nope-nope', supplier: 'hoco' }), env })).status).toBe(401);
  });
  it('falls back to REVIEW_SMS_PIN when STAFF_PIN unset', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { REVIEW_SMS_PIN: PIN, ORDERS_KV: kv } });
    expect(res.status).toBe(200);
  });
  it('400 on unknown supplier or non-object body', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'ebay' }), env })).status).toBe(400);
    expect((await onRequest({ request: req(null), env })).status).toBe(400);
  });
  it('returns the raw KV JSON with no-store, 404 when key missing', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toBe(HOCO_ROWS);
    const miss = await onRequest({ request: req({ pin: PIN, supplier: 'mobilemall' }), env });
    expect(miss.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/supplierOrderApi.test.js`
Expected: pinEqual tests PASS, new describe FAILs — module not found.

- [ ] **Step 3: Write the function**

```js
// Cloudflare Pages Function — POST /api/supplier-catalog
//
// Serves supplier catalogue data (INCLUDES cost prices) to the PIN-gated
// staff ordering page (src/pages/staff/order.astro). Data is seeded into
// ORDERS_KV by scripts/build-supplier-catalog.mjs; it must never be baked
// into the public static bundle.
//
// Config: STAFF_PIN (secret) — staff PIN; falls back to REVIEW_SMS_PIN so
// staff keep a single shop PIN until the owner wants them split.
import { json, sameSite, pinEqual, MIN_PIN_LENGTH } from '../_shared.js';

const SUPPLIERS = new Set(['hoco', 'mobilemall']);

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }
  if (typeof data !== 'object' || data === null) {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  const pinSecret = env.STAFF_PIN || env.REVIEW_SMS_PIN;
  if (!pinSecret || pinSecret.length < MIN_PIN_LENGTH) {
    if (pinSecret) console.error('STAFF_PIN is too short (min 10) — use a 16+ char random PIN');
    return json(503, { ok: false, error: 'Staff tools not configured.' });
  }
  if (!pinEqual(String(data.pin ?? ''), pinSecret)) {
    return json(401, { ok: false, error: 'Wrong PIN.' });
  }

  const supplier = String(data.supplier ?? '');
  if (!SUPPLIERS.has(supplier)) return json(400, { ok: false, error: 'Unknown supplier.' });

  const text = await env.ORDERS_KV.get(`supplier-catalog:${supplier}`);
  if (!text) {
    return json(404, { ok: false, error: 'Catalogue not loaded — run scripts/build-supplier-catalog.mjs.' });
  }
  return new Response(text, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/supplier-catalog.js tests/supplierOrderApi.test.js
git commit -m "feat: PIN-gated supplier catalogue API"
```

---

### Task 5: UI — `src/pages/staff/order.astro`

**Files:**
- Create: `src/pages/staff/order.astro`

**Interfaces:**
- Consumes: `POST /api/supplier-catalog` (Task 4 contract), `Layout.astro` (`title`, `path`, `noindex` props — same as `review-request.astro`).

- [ ] **Step 1: Write the page**

```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="Supplier order" path="/staff/order/" noindex={true}>
  <main id="main-content" style="max-width:52rem;margin:0 auto;padding:2rem 1.25rem;font-family:system-ui,sans-serif">
    <h1 style="font-size:1.4rem;margin:0 0 .25rem">Supplier order</h1>
    <p style="color:#555;margin:.25rem 0 1rem;font-size:.95rem">Build an order, then copy or download it and send it through the supplier's usual channel.</p>

    <form id="so-load" style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:end;margin-bottom:1rem">
      <label style="display:grid;gap:.35rem;font-weight:600;font-size:.9rem">Shop PIN
        <input id="so-pin" type="password" autocomplete="off" required
          style="padding:.55rem;font-size:1rem;border:1px solid #ccc;border-radius:8px;width:11rem" />
      </label>
      <label style="display:grid;gap:.35rem;font-weight:600;font-size:.9rem">Supplier
        <select id="so-supplier" style="padding:.55rem;font-size:1rem;border:1px solid #ccc;border-radius:8px">
          <option value="hoco">HOCO</option>
          <option value="mobilemall">MobileMall</option>
        </select>
      </label>
      <button type="submit" style="padding:.6rem 1rem;font-size:1rem;font-weight:700;color:#fff;background:#0a66ff;border:0;border-radius:10px;cursor:pointer">Load catalogue</button>
      <p id="so-status" role="status" aria-live="polite" style="margin:0;min-height:1.2rem;font-size:.9rem;flex-basis:100%"></p>
    </form>

    <div id="so-tool" hidden>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:.6rem">
        <input id="so-search" type="search" placeholder="Search name / SKU / category…"
          style="flex:1;min-width:14rem;padding:.55rem;font-size:1rem;border:1px solid #ccc;border-radius:8px" />
        <label style="font-size:.9rem;display:flex;gap:.3rem;align-items:center">
          <input id="so-stocked" type="checkbox" /> Stocked only
        </label>
      </div>
      <p id="so-count" style="color:#777;font-size:.85rem;margin:.2rem 0"></p>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <thead><tr style="text-align:left;border-bottom:2px solid #ddd">
          <th style="padding:.4rem">SKU</th><th style="padding:.4rem">Product</th>
          <th style="padding:.4rem">Cost</th><th style="padding:.4rem">Qty</th>
        </tr></thead>
        <tbody id="so-rows"></tbody>
      </table></div>

      <h2 style="font-size:1.1rem;margin:1.2rem 0 .4rem">Order (<span id="so-order-lines">0</span> lines — total $<span id="so-order-total">0.00</span>)</h2>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tbody id="so-order"></tbody>
      </table></div>
      <div style="display:flex;gap:.6rem;margin-top:.8rem">
        <button id="so-copy" type="button" style="padding:.6rem 1rem;font-weight:700;border:1px solid #0a66ff;color:#0a66ff;background:#fff;border-radius:10px;cursor:pointer">Copy order</button>
        <button id="so-csv" type="button" style="padding:.6rem 1rem;font-weight:700;border:1px solid #0a66ff;color:#0a66ff;background:#fff;border-radius:10px;cursor:pointer">Download CSV</button>
      </div>
    </div>
  </main>

  <script is:inline>
    (function () {
      var $ = function (id) { return document.getElementById(id); };
      var rows = [];               // full catalogue for the loaded supplier
      var order = new Map();       // sku -> { row, qty }
      var supplier = 'hoco';
      var MAX_SHOWN = 200;

      try { var saved = localStorage.getItem('rr-pin'); if (saved) $('so-pin').value = saved; } catch (e) {}

      var money = function (c) { return (c / 100).toFixed(2); };

      $('so-load').addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = $('so-status');
        status.style.color = '#555';
        status.textContent = 'Loading…';
        supplier = $('so-supplier').value;
        try {
          var res = await fetch('/api/supplier-catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: $('so-pin').value, supplier: supplier })
          });
          if (!res.ok) {
            var err = await res.json().catch(function () { return {}; });
            status.style.color = '#c0392b';
            status.textContent = err.error || ('Failed (' + res.status + ')');
            return;
          }
          rows = await res.json();
          try { localStorage.setItem('rr-pin', $('so-pin').value); } catch (e2) {}
          order.clear();
          renderOrder();
          $('so-tool').hidden = false;
          status.style.color = '#0a7d28';
          status.textContent = rows.length + ' products loaded.';
          renderList();
        } catch (e3) {
          status.style.color = '#c0392b';
          status.textContent = 'Network error — try again.';
        }
      });

      function filtered() {
        var q = $('so-search').value.toLowerCase().trim();
        var stockedOnly = $('so-stocked').checked;
        return rows.filter(function (r) {
          if (stockedOnly && !r.stocked) return false;
          if (!q) return true;
          return (r.name + ' ' + r.sku + ' ' + r.category).toLowerCase().indexOf(q) !== -1;
        });
      }

      function renderList() {
        var f = filtered();
        $('so-count').textContent = f.length > MAX_SHOWN
          ? 'Showing ' + MAX_SHOWN + ' of ' + f.length + ' — refine your search'
          : f.length + ' products';
        var tbody = $('so-rows');
        tbody.textContent = '';
        f.slice(0, MAX_SHOWN).forEach(function (r) {
          var tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid #eee';
          var badges = (r.stocked ? ' <span style="color:#0a7d28;font-size:.75rem">stocked</span>' : '')
            + (r.inStock ? '' : ' <span style="color:#c0392b;font-size:.75rem">supplier OOS</span>');
          tr.innerHTML =
            '<td style="padding:.35rem;white-space:nowrap">' + r.sku + '</td>' +
            '<td style="padding:.35rem">' + escapeHtml(r.name) + badges + '</td>' +
            '<td style="padding:.35rem;white-space:nowrap">$' + money(r.costCents) +
              (r.rrpCents ? ' <span style="color:#999">rrp $' + money(r.rrpCents) + '</span>' : '') + '</td>' +
            '<td style="padding:.35rem"></td>';
          var qtyCell = tr.lastElementChild;
          var input = document.createElement('input');
          input.type = 'number'; input.min = '0'; input.inputMode = 'numeric';
          input.value = order.has(r.sku) ? order.get(r.sku).qty : '';
          input.placeholder = '0';
          input.style.cssText = 'width:4rem;padding:.35rem;border:1px solid #ccc;border-radius:6px';
          input.addEventListener('input', function () {
            var q = parseInt(input.value, 10);
            if (q > 0) order.set(r.sku, { row: r, qty: q }); else order.delete(r.sku);
            renderOrder();
          });
          qtyCell.appendChild(input);
          tbody.appendChild(tr);
        });
      }

      function renderOrder() {
        var tbody = $('so-order');
        tbody.textContent = '';
        var total = 0;
        order.forEach(function (item) {
          total += item.row.costCents * item.qty;
          var tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid #eee';
          tr.innerHTML =
            '<td style="padding:.3rem;white-space:nowrap">' + item.row.sku + '</td>' +
            '<td style="padding:.3rem">' + escapeHtml(item.row.name) + '</td>' +
            '<td style="padding:.3rem">× ' + item.qty + '</td>' +
            '<td style="padding:.3rem;white-space:nowrap">$' + money(item.row.costCents * item.qty) + '</td>' +
            '<td style="padding:.3rem"></td>';
          var rm = document.createElement('button');
          rm.type = 'button'; rm.textContent = '✕'; rm.setAttribute('aria-label', 'Remove');
          rm.style.cssText = 'border:0;background:none;color:#c0392b;cursor:pointer;font-size:1rem';
          rm.addEventListener('click', function () { order.delete(item.row.sku); renderOrder(); renderList(); });
          tr.lastElementChild.appendChild(rm);
          tbody.appendChild(tr);
        });
        $('so-order-lines').textContent = order.size;
        $('so-order-total').textContent = money(total);
      }

      function orderLines(sep) {
        var lines = [['SKU', 'Product', 'Qty', 'Unit cost', 'Line total'].join(sep)];
        var total = 0;
        order.forEach(function (item) {
          total += item.row.costCents * item.qty;
          var name = sep === ',' ? '"' + item.row.name.replace(/"/g, '""') + '"' : item.row.name;
          lines.push([item.row.sku, name, item.qty, money(item.row.costCents), money(item.row.costCents * item.qty)].join(sep));
        });
        lines.push(['', 'TOTAL', '', '', money(total)].join(sep));
        return lines.join('\n');
      }

      $('so-copy').addEventListener('click', function () {
        navigator.clipboard.writeText(orderLines('\t')).then(function () {
          $('so-status').style.color = '#0a7d28';
          $('so-status').textContent = 'Order copied ✓';
        });
      });
      $('so-csv').addEventListener('click', function () {
        var blob = new Blob([orderLines(',')], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'order-' + supplier + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      }

      $('so-search').addEventListener('input', renderList);
      $('so-stocked').addEventListener('change', renderList);
    })();
  </script>
</Layout>
```

- [ ] **Step 2: Build + manual check**

Run: `npm run build` — expected: build succeeds, `dist/staff/order/index.html` exists, and `grep -ri "costCents" dist/` finds NOTHING (cost data must not be in the bundle).
Then `npx wrangler pages dev dist` (serves functions + static; needs `.dev.vars` with `STAFF_PIN=<16+ chars>` for a local PIN) and check at `http://localhost:8788/staff/order/`: wrong PIN → "Wrong PIN."; right PIN → catalogue loads (requires Task 3's KV upload done, or accept the 404 message as correct behaviour); search, qty, copy, CSV all work. Do NOT commit `.dev.vars`.

- [ ] **Step 3: Run full suite**

Run: `npx vitest run`
Expected: PASS (build-output.test.js may assert on dist — rerun after the build above).

- [ ] **Step 4: Commit**

```bash
git add src/pages/staff/order.astro
git commit -m "feat: staff supplier-order page (/staff/order/)"
```

---

### Task 6: Runbook + ship

**Files:**
- Create: `docs/supplier-orders.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Supplier ordering (staff)

Staff page: https://expressrepairs.com.au/staff/order/ — enter the shop PIN,
pick HOCO or MobileMall, search, set quantities, then **Copy order** (paste
into WhatsApp/email) or **Download CSV**. Orders are sent to the supplier
manually; nothing is transmitted or stored by the site.

## Owner setup (one-off)

1. Set the PIN (16+ random chars) on the Pages project:
   `npx wrangler pages secret put STAFF_PIN --project-name expressrepairs`
   (If unset, the tool falls back to `REVIEW_SMS_PIN`.)
2. Seed the catalogues (see refresh below).

## Refreshing a catalogue (new price list from a supplier)

From `expressrepairs/repo`:

1. `python scripts/extract-supplier-catalog.py "<hoco.xlsx>" "<mobilemall.xlsx>"`
2. `node scripts/build-supplier-catalog.mjs`

No deploy needed — the page reads KV live. The xlsx files and the
`.supplier-data/` extracts contain cost prices: keep them out of git
(`.supplier-data/` is gitignored; the xlsx files live outside the repo).
```

- [ ] **Step 2: Full verification**

Run: `npx vitest run && npm run build`
Expected: all tests PASS, build succeeds, `grep -ri "costCents" dist/` still empty.

- [ ] **Step 3: Commit, push, PR**

```bash
git add docs/supplier-orders.md
git commit -m "docs: supplier ordering runbook"
git push -u origin feat/supplier-order-tool
gh pr create --title "Staff supplier-order tool (/staff/order/)" --body "PIN-gated staff page to build HOCO/MobileMall orders and export copy/CSV order sheets. Catalogue data (incl. cost) lives in ORDERS_KV, served only via /api/supplier-catalog after PIN check — never in the public bundle. Spec: docs/superpowers/specs/2026-07-25-supplier-order-tool-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Squash-merge after review (repo convention). Deploy is the usual
`wrangler pages deploy dist --project-name expressrepairs --branch main` after merge.
Remind the owner: set `STAFF_PIN` (or confirm `REVIEW_SMS_PIN` is set in Pages — as of 2026-07-25 the review-SMS env vars were NOT yet configured, so the tool 503s until one PIN secret exists).
