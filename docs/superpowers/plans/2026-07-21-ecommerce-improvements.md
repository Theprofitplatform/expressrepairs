# Ecommerce Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase orders from the live 3,665-product shop: richer product pages and cart (Phase 1), Google/Meta product feeds + structured data (Phase 2), clean day-one payments (Phase 3).

**Architecture:** Everything derives from the two synced data files (`src/data/products.json`, validated by `src/data/schema.js`) at build time — no new runtime services. Feeds are Astro static endpoints like `src/pages/shop/search-index.json.js`. Server work stays in Cloudflare Pages Functions (`functions/api/*`).

**Tech Stack:** Astro 5 (static), vitest, Zod, Cloudflare Pages (+ Functions, KV), Stripe Checkout (keys pending), Resend, Meta pixel + Meta Ads MCP.

**Spec:** `docs/superpowers/specs/2026-07-21-ecommerce-improvements-design.md`

---

## Context a fresh session needs

**Repo:** `C:\Users\sales\claudee\expressrepairs\repo`, branch `main`, GitHub `Theprofitplatform/expressrepairs` (must stay public). **Every push to main deploys the live site** (`.github/workflows/deploy.yml` runs `npm test` + `npm run build` first, so a red test blocks deploy). A parallel SEO agent sometimes commits here — `git pull --rebase` before pushing.

**Verify commands:** `npm test` (144 tests green as of plan writing — run first to get the real baseline) and `npm run build` (~3,800 pages). Live checks: the gstack `/browse` skill (`$B goto` / `$B js`).

**Data flow:** `.github/workflows/sync-products.yml` (twice daily + manual via `gh workflow run "Sync products from DXPOS" --ref main`) regenerates `src/data/products.json` and explicitly dispatches the deploy — do not remove that dispatch. Product shape (Zod `productSchema`): `{ id, name, category, brand, priceCents, image, thumb, inStock, sku }`. `category` ∈ 5 gridGroups; `brand` is the supplier's category.name (may be jargon or ''). Images are self-hosted: `https://img.expressrepairs.com.au/products/<id>.webp` (800px WebP in R2 bucket `expressrepairs-products`), supplier-URL fallback for unmirrored ids via `src/data/r2-images.json`.

**Money rules:** integer cents, AUD, GST-inclusive. `SHOP` in `src/data/products.js`: `flatShippingCents: 1095`, `freeShippingThresholdCents: 9900`. `fmtPrice(cents)` exists there. **`costCents` must NEVER appear in `src/`, `public/`, `functions/`, or any feed — copy the existing test pattern (`tests/products.test.js` greps the raw file).**

**Content integrity (hard rule):** never fabricate reviews, ratings, policies, or claims. The only real rating is the store-level `SITE.rating = { value: 4.9, count: 17 }` in `src/data/site.js` — display it as the store's Google rating only; NEVER emit it as Product `aggregateRating` (we have zero product-level reviews). Returns-policy text must come from the owner (Task 4 flags it).

**Cart internals:** `src/shop/cart-store.js` — localStorage `{ productId: qty }`, exports `getCart() / setQty(id, qty) / addToCart(id) / clearCart() / cartCount(cart)`, `MAX_QTY = 20`. `src/shop/cart-count.js` wires `[data-add-to-cart]` buttons (reads `data-id`) and updates `[data-cart-count]`. Cart page island: `src/components/ShopCartPage.jsx` (React, `client:load`), POSTs `{items:[{id, qty}]}` to `/api/checkout`.

**Functions:** `functions/api/checkout.js` (prices from products.json only; 503 until `STRIPE_SECRET_KEY` env exists), `functions/api/stripe-webhook.js` (WebCrypto signature check, emails the shop via Resend; a `ponytail:` comment marks the missing idempotency), `functions/api/lead.js`, `functions/api/review-sms.js`. All four duplicate `hostAllowed`/`json` helpers. `RESEND_API_KEY` is already a Pages env var; from-address `Express Repairs <quotes@expressrepairs.com.au>` works today.

**Pixel:** `src/components/AdTracking.astro` — `window.fbq` initialised site-wide (PageView; Contact/Lead wired). Meta ad account `1909285833096577`; the Claude session has a **Meta Ads MCP** connection (ToolSearch `select:` the `mcp__claude_ai_Meta_Ads__ads_catalog_*` tools).

**Cloudflare:** account `8fc18f5691f32fccc13eb17e85a0ae10`, zone `expressrepairs.com.au` = `e51ed167f2039099c0eff0e07b6a0f51`. Local `npx wrangler whoami` should show the OAuth login from 2026-07-21; if it expired, ask the user to run `npx wrangler login` (one browser click). The GitHub-secret `CLOUDFLARE_API_TOKEN` is Pages-scoped only. Owner still owes: Stripe keys, `R2_API_TOKEN` repo secret.

## Global Constraints

- Money in integer cents, AUD, GST-inclusive; render with `fmtPrice`.
- No new runtime npm dependencies (dev-time tooling as devDependency is fine).
- Tests must not hardcode product ids/names from products.json (sync overwrites it) — select dynamically; the only exception is data you inject yourself in the test.
- Zod-validate any new data file via `src/data/schema.js`; Pages Functions follow `functions/api/lead.js` patterns; tests in the style of `tests/products.test.js`.
- After changing anything the sync writes, run the sync workflow and verify live, not just the build.
- Commit per task; push per task (deploy is test-gated). `git pull --rebase` before each push.

---

## Phase 1 — Convert

### Task 1: Product page spec block + quantity picker

**Files:**
- Modify: `src/pages/shop/[id].astro`
- Modify: `src/shop/cart-count.js` (read an optional qty input)
- Test: `tests/productPage.test.js` (new)

**Interfaces:**
- Consumes: `PRODUCTS`, `fmtPrice`, `SHOP` from `src/data/products.js`; `slugifyCategory` from `src/lib/shop.js`; `addToCart/setQty/getCart` from `src/shop/cart-store.js`.
- Produces: none used by later tasks.

- [ ] **Step 1: Failing test.** `tests/productPage.test.js`, vitest, follows `tests/landing.test.js` style (render check via built strings is overkill — test the pure helper instead). Add a `specRows(p)` helper you will export from `src/lib/shop.js` and test it:

```js
import { describe, it, expect } from 'vitest';
import { specRows } from '../src/lib/shop.js';

describe('specRows', () => {
  const p = { id: 'T-1', name: 'X', category: 'Audio', brand: 'Apple', sku: 'SKU9', priceCents: 1000 };
  it('builds label/value pairs from real data only', () => {
    const rows = Object.fromEntries(specRows(p));
    expect(rows.Brand).toBe('Apple');
    expect(rows.Category).toBe('Audio');
    expect(rows.SKU).toBe('SKU9');
    expect(rows.Dispatch).toMatch(/1–2 business days/);
  });
  it('omits empty fields', () => {
    expect(Object.fromEntries(specRows({ ...p, brand: '', sku: '' })).Brand).toBeUndefined();
  });
});
```

- [ ] **Step 2:** Run `npx vitest run tests/productPage.test.js` — FAIL (no export).
- [ ] **Step 3:** Implement `specRows` in `src/lib/shop.js`: returns `[['Brand', p.brand], ['Category', p.category], ['SKU', p.sku], ['Dispatch', 'Dispatched in 1–2 business days'], ['Shipping', 'Flat $10.95 — free over $99 — free pickup in store'], ['GST', 'Included in price']].filter(([, v]) => v)`. Run test — PASS.
- [ ] **Step 4:** Render it in `[id].astro` below the price as a simple two-column `<dl>` (match existing inline-style approach; Category value links to `/shop/c/${slugifyCategory(p.category)}/`). Add a quantity picker: `<input type="number" min="1" max="20" value="1" data-qty style="width:70px; padding:10px; border:1px solid var(--border); border-radius:10px;">` next to the add-to-cart button.
- [ ] **Step 5:** In `src/shop/cart-count.js`, where the `[data-add-to-cart]` click handler calls `addToCart(id)`, read the qty: `const qty = Number(document.querySelector('[data-qty]')?.value) || 1;` then `setQty(id, (getCart()[id] || 0) + qty)` (import `setQty`, `getCart`). Keep plain `addToCart` behaviour when no `[data-qty]` exists (category pages have none).
- [ ] **Step 6:** `npm test` green, `npm run build` green. Local check: serve `dist` (`cd dist && python -m http.server 4173`), browse a product page, set qty 3, add, confirm cart count = 3. Commit `shop: product spec block + quantity picker`, push.

### Task 2: "More like this" related products

**Files:**
- Modify: `src/lib/shop.js`, `src/pages/shop/[id].astro`
- Test: `tests/productPage.test.js`

**Interfaces:**
- Produces: `relatedProducts(p, all, n = 4)` in `src/lib/shop.js` — same category, same-brand items first, never `p` itself, deterministic (stable order from the input array), returns up to `n` products.

- [ ] **Step 1: Failing test** in `tests/productPage.test.js`:

```js
import { relatedProducts } from '../src/lib/shop.js';

describe('relatedProducts', () => {
  const mk = (id, category, brand) => ({ id, category, brand });
  const all = [mk('a', 'Audio', 'Apple'), mk('b', 'Audio', 'Apple'), mk('c', 'Audio', 'Sony'), mk('d', 'Cases & Covers', 'Apple'), mk('e', 'Audio', 'Sony')];
  it('prefers same brand, same category, excludes self, caps at n', () => {
    expect(relatedProducts(all[0], all, 3).map((p) => p.id)).toEqual(['b', 'c', 'e']);
  });
  it('never includes the product itself', () => {
    expect(relatedProducts(all[0], all, 10).map((p) => p.id)).not.toContain('a');
  });
});
```

- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement: filter same category & not self; sort same-brand-first (stable: `sort((x, y) => (y.brand === p.brand) - (x.brand === p.brand))`); slice n. Run — PASS.
- [ ] **Step 4:** In `[id].astro`, render `relatedProducts(p, PRODUCTS)` as a 4-tile `acc-grid` titled "More like this" above the "← All accessories" link, reusing the exact card markup from `src/pages/shop/c/[category]/[...page].astro` (thumb, 4:3 contain style, name, price).
- [ ] **Step 5:** `npm test` + `npm run build` green. Commit `shop: related products on product pages`, push.

### Task 3: Store-rating strip on product pages

**Files:**
- Modify: `src/pages/shop/[id].astro`
- No new test (pure display of existing validated data).

- [ ] **Step 1:** Import `SITE` from `src/data/site.js`. Under the "In stock" line render (only when `SITE.rating?.count > 0`): `★ 4.9 rated by 17+ local customers on Google` with the stars styled in the brand colour, linking to the Google profile URL from `SITE.sameAs` (the `google` entry; read the array, pick the one containing `g.page` or `google`, fall back to no link). Copy must say **on Google** and use the store rating verbatim — this is a store rating, not a product rating; do not add schema.
- [ ] **Step 2:** Build, eyeball one page locally, commit `shop: Google store rating strip on product pages`, push.

### Task 4: Cart — free-shipping progress + cross-sells (+ returns placeholder)

**Files:**
- Modify: `src/components/ShopCartPage.jsx`
- Test: `tests/cartStore.test.js` (extend) or new `tests/cartUpsell.test.js`

**Interfaces:**
- Consumes: `SHOP.freeShippingThresholdCents`, `SHOP.flatShippingCents`, `PRODUCTS`, `fmtPrice`.
- Produces: `crossSells(cartIds, all, n = 4)` in `src/lib/shop.js` — products under $20 (`priceCents < 2000`) from the categories present in the cart, not already in the cart, deterministic, up to `n`.

- [ ] **Step 1: Failing test** for `crossSells` (new `tests/cartUpsell.test.js`, same injected-data style as Task 2 — assert under-$20 filter, category match, cart exclusion, cap).
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement in `src/lib/shop.js`. Run — PASS.
- [ ] **Step 4:** In `ShopCartPage.jsx`: above the checkout button, when `0 < subtotal < SHOP.freeShippingThresholdCents`, render "Add **{fmtPrice(SHOP.freeShippingThresholdCents - subtotal)}** more for free shipping — otherwise $10.95 flat / free pickup." When subtotal ≥ threshold render "✓ Free shipping unlocked." Below the cart list, render up to 4 `crossSells` tiles (thumb, name, price, add button calling the store's `addToCart`).
- [ ] **Step 5:** `npm test` + build green; local browse: add an item, see the progress line move as qty changes; add a cross-sell. Commit `shop: free-shipping progress + cart cross-sells`, push.
- [ ] **Step 6 (placeholder for owner):** Add to `docs/shop-setup.md` a short "Returns policy" section stating the site currently makes **no returns claims** and the owner must supply wording (ACL warranties still apply). Do NOT write policy copy yourself. Commit with the same push.

## Phase 2 — Be found

### Task 5: Product JSON-LD on product pages

**Files:**
- Modify: `src/lib/seo.js` (add `productSchema(p)`), `src/pages/shop/[id].astro`
- Test: `tests/productSchema.test.js` (new)

**Interfaces:**
- Produces: `productSchema(p)` in `src/lib/seo.js` returning the JSON-LD object; `[id].astro` passes `[breadcrumbSchema(...), productSchema(p)]` if the Layout `schema` prop accepts an array — check `src/layouts/Layout.astro` first; if it takes a single object, emit a second `<script type="application/ld+json">` inline instead.

- [ ] **Step 1: Failing test:**

```js
import { describe, it, expect } from 'vitest';
import { productSchema } from '../src/lib/seo.js';

describe('productSchema', () => {
  const p = { id: 'T-1', name: 'Case', category: 'Cases & Covers', brand: 'Apple', sku: 'S1', priceCents: 4990, image: 'https://img.expressrepairs.com.au/products/T-1.webp', thumb: '', inStock: true };
  it('emits a valid Product with AUD offer and no ratings', () => {
    const s = productSchema(p);
    expect(s['@type']).toBe('Product');
    expect(s.offers.priceCurrency).toBe('AUD');
    expect(s.offers.price).toBe('49.90');
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.aggregateRating).toBeUndefined(); // store rating must never leak here
    expect(JSON.stringify(s)).not.toMatch(/cost/i);
  });
  it('omits brand when empty', () => {
    expect(productSchema({ ...p, brand: '' }).brand).toBeUndefined();
  });
});
```

- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement: `{'@context':'https://schema.org','@type':'Product',name,image:[p.image],sku:p.sku||undefined,mpn:p.sku||undefined,brand:p.brand?{'@type':'Brand',name:p.brand}:undefined,offers:{'@type':'Offer',url:\`https://www.expressrepairs.com.au/shop/${p.id}/\`,price:(p.priceCents/100).toFixed(2),priceCurrency:'AUD',availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition',seller:{'@type':'Organization',name:'Express Repairs'}}}`. Run — PASS.
- [ ] **Step 4:** Wire into `[id].astro` (per the Layout check above). `npm run build`, then validate one built page's JSON-LD with `node -e` JSON.parse extraction. After push + deploy, paste a live product URL into Google's Rich Results Test — expect "Product" detected (price/availability; warnings about missing reviews are expected and fine).
- [ ] **Step 5:** Commit `shop: Product structured data`, push.

### Task 6: Google Merchant feed + owner runbook

**Files:**
- Create: `src/pages/shop/google-feed.xml.js` (Astro static endpoint, modelled on `src/pages/shop/search-index.json.js`)
- Create: runbook section in `docs/shop-setup.md`
- Test: `tests/googleFeed.test.js` (new)

**Interfaces:**
- Produces: `GET()` returning RSS 2.0 XML, `Content-Type: application/xml`. Item fields per product: `g:id` (product id), `title` (name, XML-escaped), `link` (`https://www.expressrepairs.com.au/shop/<id>/`), `g:image_link` (p.image), `g:price` (`49.90 AUD`), `g:availability` (`in_stock`), `g:condition` (`new`), `g:brand` (when non-empty), `g:mpn` (sku when non-empty), `g:identifier_exists` (`no` when both brand and sku are empty), `g:google_product_category` left out (Google infers), `g:shipping` block: `AU / Standard / 10.95 AUD` plus note free over $99 is set in Merchant Center settings, not per-item.

- [ ] **Step 1: Failing test** — import `{ GET }`, parse the text: assert it starts with `<?xml`, contains exactly `PRODUCTS.length` `<item>` occurrences, contains no `costCents`, escapes `&` (find a product whose name contains `&` dynamically; if none, inject none and just assert no raw unescaped `&` outside entities via regex `/&(?!amp;|lt;|gt;|quot;|#)/`).
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement with a tiny local `xmlEsc` helper (`&<>"` → entities). No dependency. Run — PASS.
- [ ] **Step 4:** Build; confirm `dist/shop/google-feed.xml` exists and is ~2–4MB. Push, then fetch `https://www.expressrepairs.com.au/shop/google-feed.xml` live — 200, `application/xml`.
- [ ] **Step 5:** Append to `docs/shop-setup.md`: "Google free listings — one-time": create Merchant Center account, verify site (DNS TXT via Cloudflare), add feed by URL `https://www.expressrepairs.com.au/shop/google-feed.xml`, daily fetch, set free-shipping-over-$99 rule in Shipping settings. Commit `shop: Google Merchant feed + runbook`, push.

### Task 7: Meta catalog wired to the feed

**Files:** none in-repo (MCP/dashboard work) + note in `docs/shop-setup.md`.

- [ ] **Step 1:** ToolSearch `select:mcp__claude_ai_Meta_Ads__ads_catalog_get_catalogs,mcp__claude_ai_Meta_Ads__ads_catalog_create,mcp__claude_ai_Meta_Ads__ads_catalog_create_product_feed,mcp__claude_ai_Meta_Ads__ads_catalog_get_diagnostics`. Check for an existing catalog first (`get_catalogs`) — do not create a duplicate.
- [ ] **Step 2:** Create catalog "Express Repairs Accessories" (vertical: commerce/e-commerce) on the business that owns ad account `1909285833096577`, then a product feed with a **scheduled fetch** of `https://www.expressrepairs.com.au/shop/google-feed.xml` (Meta accepts Google-format XML), daily.
- [ ] **Step 3:** After first fetch, run `ads_catalog_get_diagnostics` — expect ≥95% of 3,665 items accepted; log and fix the top rejection reason if not (usually image or price format).
- [ ] **Step 4:** Document the catalog id in `docs/shop-setup.md` under a "Meta catalog" heading (with "dynamic ads need the pixel content_ids from Task 8"). Commit, push. **If the MCP connection is absent in the fresh session, mark this task blocked and note the manual path (Commerce Manager → Data sources → Data feed → the same URL).**

## Phase 3 — Take money cleanly

### Task 8: Fold duplicated function helpers into functions/_shared.js

**Files:**
- Create: `functions/_shared.js`
- Modify: `functions/api/checkout.js`, `functions/api/lead.js`, `functions/api/review-sms.js`, `functions/api/stripe-webhook.js` (json only)
- Test: `tests/sendLead.test.js` etc. already import the functions — run the whole suite.

- [ ] **Step 1:** Create `functions/_shared.js` exporting `json(status, body)`, `hostAllowed(host, env)`, `hostOf(url)`, `sameSite(request, env)` — copy the exact current implementations from `functions/api/lead.js` (they are the canonical ones; `checkout.js` and `review-sms.js` are byte-identical copies).
- [ ] **Step 2:** Replace the local copies in all four functions with imports (`import { json, sameSite } from '../_shared.js'`). Keep function-specific constants where they are.
- [ ] **Step 3:** `npm test` — the existing function tests must stay green unchanged (they exercise the behaviour, not the file layout). `npm run build` green (Pages bundles `functions/` separately — also run `npx wrangler pages functions build` if available, else rely on the deploy log).
- [ ] **Step 4:** Commit `functions: shared helpers`, push, **watch the deploy succeed** (this is the riskiest refactor in the plan — Pages Functions bundling of relative imports must be confirmed live: `curl -s -o /dev/null -w "%{http_code}" -X POST https://www.expressrepairs.com.au/api/lead` expecting 400-family, not 500).

### Task 9: Webhook idempotency via KV

**Files:**
- Modify: `functions/api/stripe-webhook.js`
- Test: `tests/stripeWebhook.test.js` — check if it exists; the webhook currently has no direct test file, so create one exercising `onRequest` with a stubbed `env` (follow `tests/sendLead.test.js` mocking style: stub `fetch`, fake KV as a `Map`-backed `{ get, put }`).

**Interfaces:**
- Consumes: a KV binding named `ORDERS_KV` on `env`.
- Produces: dedup — second delivery of the same `event.id` returns `200 { ok: true, duplicate: true }` without emailing.

- [ ] **Step 1: Create the KV namespace + binding.** `npx wrangler kv namespace create ORDERS_KV` (needs the local OAuth login — see Context). Then bind it to the **Pages project** `expressrepairs` (Production) — via dashboard (Pages → expressrepairs → Settings → Bindings → KV) or `npx wrangler pages project` if supported. Record the namespace id in `docs/shop-setup.md`.
- [ ] **Step 2: Failing test:** two calls to `onRequest` with the same signed payload (reuse the signature helper by exporting nothing new — instead stub `env.STRIPE_WEBHOOK_SECRET` and compute a real HMAC in the test with WebCrypto, as the function does); fake KV in `env.ORDERS_KV`; assert Resend fetch stub called exactly once and second response body has `duplicate: true`.
- [ ] **Step 3:** Run — FAIL. **Step 4:** Implement after the `payment_status` check: `if (env.ORDERS_KV) { const seen = await env.ORDERS_KV.get(event.id); if (seen) return json(200, { ok: true, duplicate: true }); }` and after the successful Resend send: `await env.ORDERS_KV?.put(event.id, '1', { expirationTtl: 60 * 60 * 24 * 7 })`. Missing binding = current behaviour (graceful). Remove the `ponytail:` idempotency comment. Run — PASS.
- [ ] **Step 5:** Full suite + build green. Commit `shop: webhook idempotency via KV`, push.

### Task 10: Customer order-confirmation email

**Files:**
- Modify: `functions/api/stripe-webhook.js`
- Test: extend `tests/stripeWebhook.test.js`

- [ ] **Step 1: Failing test:** with a session containing `customer_details.email`, assert TWO Resend calls: one to the shop (existing), one to the customer's address with subject containing "Your Express Repairs order". With no customer email, exactly one call.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement a second Resend send after the shop email succeeds: to `[c.email]`, subject `Your Express Repairs order — ${money(s.amount_total)}`, plain friendly body: thanks, item lines, fulfilment (pickup address `Riverwood Plaza, 257 Belmore Rd, Riverwood` when shipTo is pickup), total, "dispatched in 1–2 business days", the shop phone `0415 303 300`. **Customer-email failure must NOT return non-2xx** (the shop already has the order; a retry would double-email the shop if KV put also failed) — log and continue. Run — PASS.
- [ ] **Step 4:** Suite + build green. Commit `shop: customer order confirmation email`, push.

### Task 11: Pixel commerce events

**Files:**
- Modify: `src/shop/cart-count.js` (AddToCart), `src/components/ShopCartPage.jsx` (InitiateCheckout), `src/pages/shop/thanks.astro` (Purchase)
- Test: none (browser-only wiring; verify with Meta Pixel Helper / Events Manager).

- [ ] **Step 1:** In the add-to-cart handler: `window.fbq?.('track', 'AddToCart', { content_ids: [id], content_type: 'product', value: price / 100, currency: 'AUD' })` — `price` is already on `data-price` (cents).
- [ ] **Step 2:** In `ShopCartPage.jsx`, just before redirecting to Stripe: `window.fbq?.('track', 'InitiateCheckout', { content_ids: ids, content_type: 'product', value: subtotal / 100, currency: 'AUD', num_items: count })`.
- [ ] **Step 3:** In `thanks.astro` (check what context it has — if the Stripe success URL carries `?session_id=`, don't fetch it client-side; fire Purchase without value rather than inventing one, or pass the cart total via `sessionStorage` written in step 2 and clear it after firing): `window.fbq?.('track', 'Purchase', { currency: 'AUD', value })` only when a stored value exists; always clear the cart here if not already done.
- [ ] **Step 4:** Build green; live-verify events fire in Events Manager (Test Events tab) via a browse-skill run. `content_ids` must equal product ids (matches the `g:id` in the feed → dynamic ads join works). Commit `shop: AddToCart/InitiateCheckout/Purchase pixel events`, push.

### Task 12: Stripe test-mode dry run + go-live checklist

**Files:** `docs/shop-setup.md`

- [ ] **Step 1:** With owner-provided **test** keys (`sk_test_`/`whsec_` on a preview env or temporarily on production env vars — coordinate with owner; if no keys available, mark blocked): place a test order end-to-end. Verify exactly one shop email, one customer email, KV key written, Purchase event fired, and Stripe Dashboard shows the session.
- [ ] **Step 2:** Update `docs/shop-setup.md` go-live checklist: swap to live keys, webhook endpoint + event, KV binding present, `R2_API_TOKEN` reminder, feed URLs, "place a $1 real order and refund it" final check.
- [ ] **Step 3:** Commit `docs: shop go-live checklist`, push.

---

## Deliberately NOT in this plan

- AI-written product descriptions (owner chose template specs; revisit for top-100 later).
- Stock tracking / out-of-stock states (owner's explicit standing decision).
- Returns-policy copy (owner must supply wording — Task 4 Step 6 only adds the placeholder).
- Google Merchant Center account creation (owner, with Task 6's runbook).
- Turning payments on (owner adds Stripe keys; Task 12 dry-runs with test keys only).
