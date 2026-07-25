# Shop Improvements — Design

**Date:** 2026-07-25
**Status:** Approved, ready for implementation planning

## Problem

The shop is a mature catalogue — 6,825 products, category/model/tag landing pages,
filters, search, cart, cross-sells, product schema, Google feed — that **cannot
complete a single sale**.

`src/components/ShopCartPage.jsx:21-48` posts the cart to `/api/checkout`.
`functions/api/checkout.js` requires `STRIPE_SECRET_KEY`, which is not set and is
not expected soon (owner: "not yet / unsure"). Without it the endpoint returns
503 and the customer sees:

> Online payment is not set up yet — call us to order.

So every product page on the site funnels into an error. The `thanks.astro` page
compounds it by promising "You'll get a Stripe receipt by email".

Every other improvement — conversion work, SEO, paid traffic — pours visitors
into that hole. Fixing the terminal step comes first.

### What already exists next door

`functions/api/lead.js` is a working, hardened submission pipe: same-site
Origin/Referer check, 16 KB body cap, field-length caps, honeypot, Resend email
to `sales@funcovers.com.au`, and a PII-free `lead:*` record in `ORDERS_KV` for
attribution. Contact forms, the booking widget, and ad landing pages all use it.

An order request is a lead with line items. Reuse it.

## Goals

1. A customer can complete an order today, without Stripe.
2. Nothing built for Stripe is thrown away; re-enabling it later is trivial.
3. Measurement is connected before conversion/SEO work is guessed at.
4. SEO effort goes where it can actually rank.

## Non-goals

- Online card payment. Deferred until the owner obtains Stripe keys.
- An order-management system, order status pages, or customer accounts. The
  shop's inbox is the record of the order, as it already is for every repair lead.
- Chasing search indexation of individual SKU pages (see Phase 4).
- Changes to `functions/api/checkout.js` or `functions/api/stripe-webhook.js`.
  They stay as-is, tested, waiting.

---

## Phase 1 — Order requests

The cart terminates in a working action instead of an error.

### Flow

1. Customer builds a cart as today (unchanged: `cart-store.js`, quantities,
   cross-sells, free-shipping threshold display).
2. The cart's primary button reveals an inline order form rather than
   redirecting to a payment processor.
3. Fields: **name** (required), **phone** (required), **email** (optional, validated
   if present), and **fulfilment** — `pickup` (free, Riverwood Plaza) or
   `delivery`. Delivery reveals an address textarea.
4. Submit posts to `/api/lead` with `source: 'order'` and
   `items: [{ id, qty }]`.
5. On success, redirect to `/shop/thanks/`, which clears the cart (it already does).

### `functions/api/lead.js` — order branch

One branch keyed on `source === 'order'`. It reuses the existing guards, email
send, and KV write; only the row-building differs.

- Resolve each `id` against `PRODUCTS` **server-side**. Names and prices come from
  the catalogue; a client-sent price is ignored entirely. This mirrors the
  existing defence in `checkout.js` (`const byId = Object.fromEntries(...)`), so a
  tampered cart cannot misrepresent a price in the shop's own order email.
- Reject an unknown `id` with 400 `"An item in your cart is no longer available."`
- Reject `qty` that is not an integer in 1–20 with 400 `"Invalid quantity."` The
  bound is declared as a local `MAX_QTY` in `lead.js` rather than imported from
  `checkout.js`; it matches the cart UI cap and the value already used there.
- Reject an empty `items` array, or more than 50 lines, with 400.
- Compute the total from catalogue prices, and add shipping per the existing
  `SHOP` values in `src/data/products.js`: free for `pickup`, free at/over
  `freeShippingThresholdCents`, otherwise `flatShippingCents`.
- Email heading: `New order request`. Subject:
  `New order request: <name> — <n> items, $<total>`.
- Body table lists each line as `<qty> × <name> — <line total>`, then subtotal,
  shipping, total, and the fulfilment choice (with address when delivery).
- `reply_to` is set to the customer email when present, as it already is for leads.

The `ORDERS_KV` record keeps its existing PII-free shape and gains `items` (line
count) and `value` (total in cents), so the shop's own conversion tally covers
orders as well as enquiries.

The 503 `"Lead delivery not configured."` path is unchanged — if `RESEND_API_KEY`
is missing the form shows the call-us fallback rather than silently losing an
order.

### `src/pages/shop/thanks.astro`

Replace the Stripe-receipt promise with what actually happens: the order request
has been received and the shop will call to confirm and take payment. Keep the
existing `clearCart()` call. The `fbq` `Purchase` event and its
`er-checkout-value` sessionStorage handshake are removed — no purchase has
occurred at this point, and firing `Purchase` on an unpaid order request would
corrupt the Meta Ads conversion data for account 1909285833096577. `Lead` is the
correct event and fires from the form submission instead.

### No feature flag

There is deliberately no `paymentsEnabled` config toggle. `checkout.js` and its
tests remain untouched, so restoring Stripe later is a one-line change to the
cart's submit handler plus setting the secret. A config knob for a value that
flips once is complexity for no benefit.

### Tests

Extend the existing suites rather than adding new files:

- `tests/lead.test.js` — order branch: price is taken from the catalogue and a
  client-supplied price is ignored; unknown id rejected; qty 0, 21, and
  non-integer rejected; empty cart rejected; pickup vs delivery shipping totals;
  KV record contains `items` and `value` and no PII.
- `tests/cartUpsell.test.js` / cart component tests — the cart's terminal action
  is the order form, and a successful submission redirects to `/shop/thanks/`.
- `tests/build-output.test.js` — `/shop/thanks/` no longer contains the Stripe
  receipt copy.

---

## Phase 2 — Connect measurement

Near-zero code; mostly owner tasks. It precedes Phases 3 and 4 because both are
otherwise guesswork.

- Connect Google Search Console. The verification meta tag already shipped in
  commit `81328e8`, so this is a five-minute owner task. It also unblocks the
  Ahrefs `gsc-*` tools, which return nothing for this domain today.
- Confirm Cloudflare Web Analytics is reporting (`SiteAnalytics.astro`).
- Document how to read the `ORDERS_KV` tally
  (`wrangler kv key list --prefix lead:2026-07`) so order and enquiry volume can
  be checked without a dashboard.

**Exit criterion:** Search Console shows impressions for `/shop/` URLs, and the KV
tally can be read. Phase 3 and 4 priorities are then set from that data.

---

## Phase 3 — Conversion

Priorities come from Phase 2 data. Three items are committed regardless:

1. **Sticky add-to-cart on mobile product pages.** Most traffic is mobile; the buy
   action currently scrolls out of view above the spec table.
2. **Trust signals above the fold.** The real Google rating (4.9 / 17 reviews),
   pickup address, and dispatch time move above the spec list on `[id].astro`.
   These are existing, owner-confirmed facts — no new claims are invented.
3. **Stock display correctness.** `src/pages/shop/[id].astro:68` hardcodes
   "In stock — dispatched in N business days" unconditionally, while
   `src/lib/seo.js:105` emits `OutOfStock` and `google-feed.xml.js:25` emits
   `out_of_stock` from `p.inStock`. Zero products are out of stock today, so
   nothing is visibly wrong yet — but the first one that goes out of stock will
   show a page that contradicts the site's own structured data and product feed,
   which is a Merchant Centre policy problem as well as a UI one. Gate the line on
   `p.inStock`, and disable add-to-cart for out-of-stock items so the failure
   surfaces on the product page rather than at submission.

---

## Phase 4 — Traffic

**Explicit decision: do not chase per-SKU indexation.** The 6,825 product pages
carry supplier-written copy on a domain with low authority in a local niche.
Most will not be indexed regardless of effort, and pursuing them spends crawl
budget on pages that cannot rank.

Effort concentrates on pages that can:

- Category, device-model (121 pages), and curated tag (23 pages) landing pages get
  genuine introductory content and stronger internal linking. SKU pages are
  treated as conversion endpoints reached from those hubs, not as ranking targets.
- Internal linking from the existing repair/suburb content into matching shop
  categories, connecting the site's two halves.

**Google Merchant Centre:** without online checkout, standard Shopping listings
will be disapproved — the policy requires products be purchasable online. The fit
for a physical store is local surfaces (pickup-today listings tied to the
Riverwood shopfront), which pairs naturally with the pickup option added in
Phase 1. Standard Shopping is revisited if and when Stripe goes live.

**Ops work** — pricing/margin control, supplier ordering, stock accuracy against
DXPOS — is held until Phase 1 is live. The supplier-order tool already has a spec
and plan at `docs/superpowers/specs/2026-07-25-supplier-order-tool-design.md` and
`docs/superpowers/plans/2026-07-25-supplier-order-tool.md`, and is picked up from
there rather than redesigned here.

---

## Sequencing and dependencies

```
Phase 1 (order requests) ──> Phase 2 (measurement) ──> Phase 3 (conversion)
                                                   └─> Phase 4 (traffic)
```

Phase 1 is independent and can start immediately. Phase 2 is owner-blocked but
cheap and can run in parallel with Phase 1 implementation. Phases 3 and 4 are
scoped from Phase 2 data and are planned separately once it exists.

**This spec covers Phase 1 in implementation detail.** Phases 2–4 are recorded
here for sequencing and to fix the two scope decisions above (no payment flag, no
per-SKU indexation chase); each gets its own plan when reached.

## Risks

- **Order requests convert worse than card checkout.** Accepted — a working
  phone-confirmed flow beats an error message, and the shop already handles every
  repair booking this way.
- **Email is the only record of an order.** Accepted, and consistent with existing
  lead handling. If Resend fails the customer sees the call-us fallback rather
  than a false confirmation.
- **`/api/lead` gains a second responsibility.** Contained to one branch that
  reuses all existing guards. If the order path later needs to diverge
  substantially, it splits into `/api/order` at that point, not pre-emptively.
- **A parallel agent commits to this repo.** Phase 1 touches `ShopCartPage.jsx`,
  `lead.js`, and `thanks.astro`; there are currently uncommitted changes to
  `sections.jsx`, `accessories.js`, `schema.js`, and `global.css` from other work.
  Implement in a worktree to avoid the working-tree collision that has bitten this
  repo before.
