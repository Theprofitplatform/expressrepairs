# Shop Improvements Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the live 3,875-product accessories shop actually usable and durable: clean customer-facing categories, no trade-only products, self-hosted images, and search.

**Status when this plan was written (2026-07-21):** the shop is LIVE at https://expressrepairs.com.au/shop/ with 3,875 products. Payments are NOT live (no Stripe keys yet — checkout correctly returns 503 "call us to order").

---

## Context a fresh session needs

**Repo:** `C:\Users\sales\claudee\expressrepairs\repo`, branch `main`, public GitHub repo `Theprofitplatform/expressrepairs`. Pushing to `main` auto-deploys production via `.github/workflows/deploy.yml` (wrangler → Cloudflare Pages project `expressrepairs`). **The live commercial site changes on every push to main.**

**How products get on the site:**
`.github/workflows/sync-products.yml` (twice daily Mon–Sat + manual) runs `scripts/sync-products.mjs`, which:
1. Hits `https://pos.expressrepairs.com.au` — a Cloudflare Worker Basic-auth gate in front of DXPOS on the shop PC via CF Tunnel. **The gate is currently INACTIVE** (returns 200 unauthenticated, issues no `pos_gate` cookie); the script warns and continues on DXPOS's own JWT. Secrets: `POS_GATE_USER`, `POS_GATE_PASS`, `POS_EMAIL`, `POS_PASSWORD` (GitHub repo secrets).
2. `POST /api/auth/login` → JWT, then pages `GET /api/catalog?type=PRODUCT&pageSize=200&page=N`.
3. `transformCatalog()` filters and writes `src/data/products.json`, commits, then **explicitly dispatches the deploy workflow** — a push made with `GITHUB_TOKEN` does NOT trigger other workflows, so this dispatch is load-bearing. Do not remove it.

**Known facts about the POS data (measured, not assumed):**
- 11,989 products total; 6,347 in the 5 configured `gridGroup`s; 3,875 of those have an image.
- **DXPOS has ZERO stock records** (`with-stock-row=0`). Availability is not tracked. Every product is listed as available with a "dispatched in 1-2 business days" promise. This was the owner's explicit decision — do not reintroduce stock filtering.
- **DXPOS has NO product photos.** Images come from `src/data/product-images.json` (10,817 entries, SKU→absolute supplier URL), generated from two supplier spreadsheets in `C:\Users\sales\claudee\expressrepairs\`: `HOCO_Catalogue_with_RRP_2026-07-20.xlsx` and `MobileMall_Catalogue_2026-07-20.xlsx` (openpyxl + pandas are available in the local Python).
- Images are currently **hotlinked** from `hoco.com.au` / `mobilemall.com.au`. HOCO uses Odoo sizes (`.../image_1024` → `thumbUrl()` rewrites to `image_256`). MobileMall images are ~2MB each and cannot be resized by URL.

**Safety rails already in the sync — keep them:**
- `MAX_ONLINE` (default 5000): refuses to publish more products than this.
- Refuses to publish 0 products ("refusing to blank the shop") and prints a per-filter funnel breakdown.
- Offline POS / mid-run network loss → `exit 0`, keeps last synced data.
- Cost price (`costCents`) must NEVER reach `src/`, `public/`, or `functions/`. A test enforces this.

**Verify commands:** `npm test` (should be 138 green before you start) and `npm run build`.

---

## Global Constraints

- Money in integer cents, AUD, GST-inclusive. Shipping: $10.95 flat, free ≥ $99, free pickup.
- No new **runtime** npm dependencies. Build/dev-time tooling (e.g. `sharp`, `wrangler`) is acceptable as a devDependency.
- Follow existing patterns: Zod-validated data files (`src/data/schema.js`), Pages Functions modelled on `functions/api/lead.js`, tests in the style of `tests/products.test.js`.
- Tests must not hardcode product ids/names from `products.json` — the sync overwrites it. Select dynamically.
- After any change to the product shape, run the sync (`gh workflow run "Sync products from DXPOS" --ref main`) and confirm the live site, not just the build.

---

### Task 1: Customer-facing categories (highest visible impact)

**Problem (verified on the live site):** categories come from DXPOS `category.name`, which is internal shop jargon. Live category pages today include **"Max Profit Picks"**, **"hold"**, **"nan"**, **"Stock Take"**, **"Free Item"**, **"Retail Essentials"**, **"100% Credit Back ( Renewed on 18 July )"**, **"$0.99 Offers (Ends Today)"**, **"Buy 1 Get 1 Free"**. The two largest categories are brands — Apple (1,659) and Samsung (1,378) — so browsing by product type is impossible.

**Files:**
- Modify: `scripts/sync-products.mjs` (category derivation, add `brand`)
- Modify: `src/data/schema.js` (`productSchema`)
- Modify: `src/pages/shop/index.astro`, `src/pages/shop/c/[category]/[...page].astro`
- Test: `tests/syncProducts.test.js`, `tests/products.test.js`

- [ ] **Step 1: Make `category` the DXPOS `gridGroup`, not `category.name`.**
  `gridGroup` is already the filter list (`ONLINE_GRID_GROUPS`) and is clean: `Accessories`, `Cases & Covers`, `Screen Protection`, `Cables & Charging`, `Audio`. This alone deletes every junk category. Keep the supplier's `category.name` as a new `brand` field (Apple / Samsung / Google / OPPO / …) — useful for filtering, never as a category.

- [ ] **Step 2: Add `brand` to `productSchema`** as `z.string()` (may be empty). Update the sync transform to emit it.

- [ ] **Step 3: Write failing tests first** — `transformCatalog` returns `category` equal to the row's `gridGroup` (NOT `category.name`), and `brand` equal to `category.name` (empty string when absent). Run, see them fail, then implement.

- [ ] **Step 4: Shop index** — expect exactly 5 category tiles. Confirm no junk category renders.

- [ ] **Step 5: Add a brand filter to the category page.** Simple links (`?brand=` is not possible on a static site — use sub-routes `/shop/c/<category>/b/<brand>/` via `getStaticPaths`, or client-side filtering on the already-rendered grid). Client-side filtering is the lazier option and fine at 48 items/page; prefer it unless the page count explodes.

- [ ] **Step 6:** `npm test` green, `npm run build` green, commit, push, run the sync, and verify on the live site that only the 5 categories exist.

---

### Task 2: Exclude trade-only products

**Problem:** the catalogue contains shop-fixture/trade stock a consumer must not buy — e.g. "BLACKTECH 3D Custom Sublimation Retractable Banner Stands" ($465), "hoco. GF012 Phone Screen Protector 100pcs For Film Cutting Machine" ($235), "BLACKTECH Camera Glass Display Stand" ($139.90).

**Files:** Modify `scripts/sync-products.mjs`; test in `tests/syncProducts.test.js`.

- [ ] **Step 1: Write the failing test.** Given rows named as above, `transformCatalog` excludes them; a normal product ("BLACKTECH USB-A To Lightning Fast Charging Cable 100cm - White") is kept.

- [ ] **Step 2: Implement an exported `TRADE_ONLY_PATTERNS` regex list** with a comment explaining each is trade stock, not consumer product. Start with: `display stand`, `banner stand`, `sublimation`, `cutting machine`, `\b\d{2,}\s*pcs\b`, `film roll`. Export it so it is reviewable and editable by the owner.

- [ ] **Step 3:** Run the sync and check the funnel log for how many were excluded; sanity-check the count is small (tens, not thousands). If it removes a large fraction, the patterns are too broad — tighten them.

- [ ] **Step 4:** Tests green, commit, push, sync, verify.

---

### Task 3: Self-host images on Cloudflare R2

**Problem:** images hotlink to `hoco.com.au` / `mobilemall.com.au`. If either blocks hotlinking or changes URLs, every product photo breaks at once. MobileMall images are ~2MB each, so category pages are slow on mobile.

**Target:** download once → resize to ~800px WebP (~50KB) → upload to R2 → serve from a custom domain. ~3,875 images ≈ 200MB, inside R2's free 10GB tier with no egress fees.

**Files:**
- Create: `scripts/upload-images-r2.mjs` (one-off + incremental)
- Modify: `scripts/sync-products.mjs` (emit R2 URLs; fall back to supplier URL when an image is not yet uploaded)
- Modify: `wrangler.jsonc` / Cloudflare dashboard config as needed
- Test: `tests/syncProducts.test.js`

- [ ] **Step 1: Create the R2 bucket and public domain.** `npx wrangler r2 bucket create expressrepairs-products`, then attach a custom domain (e.g. `img.expressrepairs.com.au`) in the Cloudflare dashboard. Record the public base URL. `~/.cloudflared/cert.pem` exists and can create DNS routes; `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are already GitHub secrets.

- [ ] **Step 2: Write `scripts/upload-images-r2.mjs`.** For each product in `src/data/products.json`: derive the R2 key from the product id (`products/<id>.webp`); skip if it already exists in the bucket (list once up front, don't HEAD 3,875 times); otherwise download the supplier image, resize with `sharp` (devDependency) to max 800px WebP quality ~80, and upload via `wrangler r2 object put` or the S3 API. Be polite: concurrency ≤ 5, and log failures without aborting the whole run.

- [ ] **Step 3: Run the one-off migration** for all 3,875. Expect it to take a while; log progress. Verify a sample of R2 URLs return 200 and are markedly smaller than the originals.

- [ ] **Step 4: Point the sync at R2.** `image`/`thumb` become `<R2_BASE>/products/<id>.webp`. **Fall back to the supplier URL when the image has not been uploaded yet**, so a new product is never imageless — and remember `transformCatalog` currently *requires* an image, so a new product with no R2 object must still qualify via its supplier URL.

- [ ] **Step 5: Make it incremental.** Add an "upload new product images" step to `sync-products.yml` that runs before the commit, so products added in DXPOS get their images into R2 automatically. Needs the R2 credentials as repo secrets.

- [ ] **Step 6:** Tests green, commit, push, sync, and confirm on the live site that image URLs point at your own domain and pages are visibly lighter.

---

### Task 4: Product search

**Problem:** 3,875 products across 5 categories, 48 per page — a customer cannot find "iPhone 15 case" by browsing.

**Files:** Create `src/pages/shop/search.astro` + a small client-side island; modify the shop nav.

- [ ] **Step 1: Generate a search index at build time** — `id`, `name`, `brand`, `category`, `priceCents`, `thumb`. At 3,875 products keep it lean; if it exceeds ~500KB, strip to `id`/`name`/`brand` and look the rest up from the rendered page.

- [ ] **Step 2: Implement client-side search** — plain substring/token matching over the index, no new runtime dependency (see the ladder: do NOT add a search library for this). Debounce input, cap results at ~50.

- [ ] **Step 3: Add a search box** to the shop index and category pages.

- [ ] **Step 4:** Test that the index builds and contains no cost price; `npm test`, `npm run build`, commit, push, verify live.

---

## Deliberately NOT in this plan

- **Stripe go-live** — owner task, blocked on their account. Runbook: `docs/shop-setup.md`.
- **Webhook idempotency (KV/D1 dedup)** — a deliberate deferral; Stripe redelivery can send a duplicate order email. Mitigated by the session id in the subject line and documented for the owner. Revisit if order volume grows.
- **Restoring the POS auth gate** — `pos.expressrepairs.com.au` currently serves the DXPOS login page to anyone unauthenticated. **This is a genuine security issue worth raising with the owner separately**; DXPOS's own login still protects the data, but the Worker gate that used to front it is not enforcing.
- Post-merge backlog from the original review: no out-of-stock marking on the cart page, only HTTP 503 counts as POS-offline in the sync, `[id].astro` 4:3 crop of a square hero image, `hostAllowed`/`sameSite`/`json` triplicated across `functions/api/*.js` → `functions/_shared.js`.
