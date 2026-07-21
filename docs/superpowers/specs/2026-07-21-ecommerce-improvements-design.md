# Ecommerce Improvements — Design

**Date:** 2026-07-21 · **Approved by owner in session** (goal: "all of it, prioritised"; descriptions: template-generated specs; feeds: Google + Meta)

## Context

The /shop is live: 3,665 synced products, 5 clean categories, brand filter, search, R2-hosted images. Payments are wired (Stripe Checkout + webhook) but OFF until the owner adds Stripe keys. Meta ads run with a pixel already installed (PageView/Contact/Lead). Product pages are bare: name, price, one image, add-to-cart.

## Goal

Increase orders from the existing shop in three impact-ordered phases: convert visitors on-site, get products found off-site, and make payment day-one clean.

## Phase 1 — Convert (works before Stripe is on)

- **Product page spec block** from data we already have: brand, category (linked), SKU, "dispatched in 1–2 business days", GST/shipping/pickup facts. No AI prose, no invented claims.
- **Quantity picker** on the product page (cart-store already supports `setQty`).
- **"More like this"**: 4 related products, same category preferring same brand, deterministic, excluding self.
- **Store-rating strip**: the real 4.9★ / 17 Google reviews (from `SITE.rating`), display-only, linking to the Google profile. Never emitted as *product* schema.
- **Cart**: free-shipping progress line ("Add $X more for free shipping") and a cross-sell row (cheap add-ons from the cart's categories).
- **Returns policy**: NOT written by us — placeholder task flags it for owner copy. No fabricated policy text (content-integrity rule).

## Phase 2 — Be found

- **Product JSON-LD** on every product page: name, R2 image, AUD price, `InStock`, brand, sku/mpn. **No aggregateRating** — we have no product reviews; store rating stays display-only.
- **Google Merchant feed** at `/shop/google-feed.xml` (RSS 2.0 + `g:` namespace), generated at build time from products.json. Owner runbook for the one-time Merchant Center signup.
- **Meta catalog** created via the connected Meta Ads account (ad account 1909285833096577), scheduled to fetch the same feed URL → enables dynamic product ads with the existing pixel.

## Phase 3 — Take money cleanly

- **Shared helpers**: fold triplicated `hostAllowed`/`json` into `functions/_shared.js` (existing backlog item) before touching the functions further.
- **Webhook idempotency**: KV namespace bound to the Pages project; dedup on Stripe `event.id` so redelivery can't double-email an order.
- **Customer order-confirmation email** from the webhook via the existing Resend setup (today only the shop is emailed).
- **Pixel commerce events**: `AddToCart`, `InitiateCheckout`, `Purchase` (thanks page) with value/currency, matching catalog content_ids for dynamic ads.
- **Stripe test-mode dry run** + go-live checklist refresh in docs/shop-setup.md.

## Non-goals

- AI-written product descriptions (revisit for top sellers later).
- Stock tracking (owner's explicit decision: full range, "dispatched in 1–2 business days").
- Customer accounts, wishlists, multi-currency.

## Success criteria

- Product pages pass Google's rich-results test for Product.
- Both feeds validate (Merchant Center fetch OK; Meta catalog populated).
- A Stripe test-mode order end-to-end: checkout → webhook → shop email + customer email, exactly once each.
- `npm test` and `npm run build` green throughout; no cost price in any new output (test-enforced).
