# Online Accessories Store — Design Spec

**Date:** 2026-07-20
**Status:** Approved by owner (sales model: full e-commerce + shipping; approach A: Stripe on existing site)

## Goal

Sell accessories online at expressrepairs.com.au with payment and shipping, using DXPOS as the single source of truth for products, prices, and stock. The public store must never depend on the shop PC being online.

## Architecture

```
DXPOS (shop PC, NestJS)                GitHub                     Cloudflare
GET /catalog ──tunnel──> scheduled Action ──> products data file ──> Astro build ──> Pages deploy
                                                                        │
Customer browser <── /shop pages + cart ────────────────────────────────┘
        │ checkout
        ▼
Pages Function /api/checkout ──> Stripe Checkout (hosted payment page)
                                        │ payment succeeds
                                        ▼
Pages Function /api/stripe-webhook ──> Resend email to sales@funcovers.com.au
                                  └──> (Phase 2) POST /sales into DXPOS via tunnel
```

## Components

### 1. Product sync (DXPOS → website)

- GitHub Action on a cron during shop hours (10:00 and 14:00 AEST) plus manual `workflow_dispatch` ("sync now").
- Calls DXPOS `GET /catalog` through the existing pos.expressrepairs.com.au tunnel, authenticating with staff credentials stored as repo secrets.
- Writes `src/data/products.js` (Zod-validated like the other data files) with: id, name, category, sell price, image URL, stock quantity. **Cost price is never included.**
- Product images: copied/served so the public site does not fetch from the tunnel at request time.
- Then builds and deploys: `wrangler pages deploy dist --project-name expressrepairs --branch main` (CF API token as repo secret).
- If the shop PC / tunnel is unreachable, the run fails gracefully and the site keeps the last synced data. No customer-facing dependency on the shop PC.
- Product selection: all in-stock accessory-category products by default; owner can exclude items via archive/category in DXPOS.

### 2. Storefront

- `/shop` index (category grid + product cards) and per-product pages, generated at build time from `products.js`, matching the existing site design system.
- Cart: client-side (localStorage), cart page with quantities. No customer accounts, no login.
- Out-of-stock items remain visible but marked "Out of stock" with the buy button disabled (keeps their pages indexed for SEO).

### 3. Checkout & payment

- Cart posts to Pages Function `POST /api/checkout`.
- The Function validates requested items and quantities **against the server-side synced product data** (never trusts client prices), then creates a Stripe Checkout Session:
  - Line items at synced sell prices, AUD, GST-inclusive.
  - Shipping address collection restricted to AU.
  - Shipping options: flat **$10.95**, **free over $99**, and **free in-store pickup**. All owner-adjustable (config values in the site data).
- Stripe hosts the payment page (cards, Apple Pay, Google Pay). No card data ever touches our code.
- Success/cancel URLs return to the site (`/shop/thanks`, cart preserved on cancel).

### 4. Orders

- Stripe webhook `POST /api/stripe-webhook` (Pages Function):
  - Verifies the Stripe signature (secret in Pages env vars, like `RESEND_API_KEY`).
  - On `checkout.session.completed`: emails the full order (items, qty, totals, shipping/pickup, customer contact) to sales@funcovers.com.au via Resend — same pipeline as the lead form.
- Fulfilment is manual: staff pack and post (AusPost) or hold for pickup.
- Stock: adjusts at next sync after staff record the sale in DXPOS (v1). Oversell risk window accepted at launch volume; handled by refund/contact if it occurs.

### Phase 2 (post-launch, separate spec)

- Webhook also creates the sale in DXPOS via `POST /sales` through the tunnel, decrementing stock automatically; queued/retried when the shop PC is off.
- Optional: order-status email to customer beyond Stripe's receipt.

## Error handling

- Sync failure → keep last good data; Action failure notification via GitHub.
- Checkout Function: item unknown/out-of-stock at validation → 400 with a clear message shown in cart.
- Webhook: signature mismatch → 400, no email. Resend failure → non-200 so Stripe retries the webhook.

## Testing

- Stripe test mode end-to-end (browse → cart → pay with test card → webhook email) before switching live keys.
- One small test for the checkout Function's price/stock validation (the money path), matching the existing vitest setup.
- Existing site tests keep passing.

## Owner inputs required

1. Stripe account (ABN + bank details, ~10 min) → API keys into Pages env vars / repo secrets.
2. Confirm shipping defaults ($10.95 flat, free ≥ $99, free pickup) or supply new values.
3. Confirm product selection rule (all in-stock accessories) and check DXPOS images are presentable.

## Out of scope (v1)

Live stock reservation, customer accounts, order-tracking pages, refund automation, discount codes, shipping-label integration.
