# Online Shop Setup — Owner Runbook

This is for the shop owner, not a developer. It tells you exactly what to
click and what to paste, in order, to turn the online shop on. Do the steps
in order — later ones depend on earlier ones.

Two places hold secrets and they are **different places** that do **different
jobs**:

- **Cloudflare Pages** (the website's settings) — holds the Stripe payment keys.
- **GitHub** (the code repository's settings) — holds the DXPOS login the
  robot uses to copy your product list across every day.

Mixing them up means either payments or the product sync won't work, so
follow each section's "where" carefully.

---

## 1. Set up Stripe (takes payments)

1. Go to [stripe.com](https://stripe.com) and sign up for an account using
   your business details (ABN, bank account for payouts).
2. Once your account is active, in the Stripe Dashboard go to
   **Developers → API keys**. Copy the **Secret key** — it starts with
   `sk_live_…`. Keep this safe, do not share it or paste it anywhere except
   step 2 below.
3. Still in Stripe, go to **Developers → Webhooks → Add endpoint**.
   - **Endpoint URL**: `https://www.expressrepairs.com.au/api/stripe-webhook`
   - **Event to send**: `checkout.session.completed`
4. After creating it, click into the new endpoint and copy the
   **Signing secret** — it starts with `whsec_…`.

You now have two values: `sk_live_…` and `whsec_…`. Both go into Cloudflare
Pages in the next step (not GitHub).

---

## 2. Add the Stripe keys to Cloudflare Pages

This is the website hosting dashboard, not GitHub.

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages → expressrepairs** (the Pages project — this is
   what actually serves the live site).
3. Go to **Settings → Environment variables → Production**.
4. Add two variables, both set to type **Secret** (not "Text"):
   - `STRIPE_SECRET_KEY` = the `sk_live_…` key from step 1.2
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_…` value from step 1.4
5. `RESEND_API_KEY` should already be there from the contact-form setup —
   leave it as is, it's reused to email you orders too.
6. Save. Cloudflare applies environment variable changes to the next deploy —
   if the shop already deployed once today, trigger a redeploy (any small
   push, or Cloudflare's "Retry deployment" button) so the new keys take
   effect.

**Until `STRIPE_SECRET_KEY` is set**, checkout doesn't break — customers who
try to pay just see "Online payment is not set up yet — call us to order."
So it's safe to deploy the shop before Stripe is ready.

---

## 3. Add the DXPOS secrets to GitHub

This is the code repository's settings, separate from Cloudflare. This is
what lets the robot log into your till system every day and copy the
product list, prices, photos and stock across to the shop.

1. Go to the repository on GitHub → **Settings → Secrets and variables →
   Actions → New repository secret**.
2. Add four secrets (exact names matter — all capitals, underscores):
   - `POS_GATE_USER` — the username for the `pos.expressrepairs.com.au`
     login screen (the one staff use to reach DXPOS remotely).
   - `POS_GATE_PASS` — the matching password.
   - `POS_EMAIL` — a DXPOS staff login email.
   - `POS_PASSWORD` — that staff login's password.

These are different credentials from the Stripe keys in step 2 — don't put
Stripe keys here, and don't put these DXPOS logins into Cloudflare.

---

## 4. Run the first sync

1. In GitHub, go to the **Actions** tab.
2. Click **Sync products from DXPOS** in the left list.
3. Click **Run workflow** (top right) → **Run workflow** again to confirm.
4. Wait a minute or two for it to finish (green checkmark = success).
5. Once the site redeploys (a couple of minutes after the sync commits),
   check `https://www.expressrepairs.com.au/shop/` — your real products,
   prices and photos should be showing.

After this first manual run, it repeats automatically twice a day on its own
(see next section) — you won't need to click this again unless something
looks wrong.

---

## 5. How the day-to-day range is managed

- The sync runs automatically **twice a day, Monday–Saturday**, around
  **9:30am and 2pm Sydney time**. Any price, photo or stock change you make
  in DXPOS shows up online within a few hours.
- **To remove one item** from the shop: archive it in DXPOS. It disappears
  from the site at the next sync.
- **What decides what's online at all**: only products from three DXPOS
  Sell-grid groups appear — **Accessories**, **Cables & power**, and
  **Audio**. A product also needs a photo and a price above zero to show up.
  If you want a different set of groups sold online, that's one line in
  `scripts/sync-products.mjs` (the `ONLINE_GRID_GROUPS` list) — ask whoever
  manages the site to change it.
- **If the shop PC or the till connection is down** when a sync tries to
  run, it just skips that run quietly and keeps showing the last successful
  sync — the online shop never goes blank or breaks because of it.

---

## 6. Test before going live with real money

Do this before telling any customers the shop is open, so you never take a
real card charge by accident during testing.

1. In Cloudflare Pages (Settings → Environment variables → Production, same
   place as step 2), temporarily set:
   - `STRIPE_SECRET_KEY` to your Stripe **test** secret key (`sk_test_…`,
     found in Stripe Dashboard with the "Test mode" toggle switched on, top
     right of the Stripe Dashboard).
   - `STRIPE_WEBHOOK_SECRET` to the signing secret of a **test-mode** webhook
     endpoint (create one the same way as step 1.3, but with test mode on).
2. Redeploy so the test keys take effect.
3. On the live site, add a product to your cart and go through checkout.
   On Stripe's payment page, enter the test card:
   - Card number: `4242 4242 4242 4242`
   - Any future expiry date, any 3-digit CVC, any postcode.
4. Complete the "purchase" — no real money moves, it's a test card.
5. Confirm you receive an order email (to sales@funcovers.com.au).
6. Once that email arrives correctly, go back to Cloudflare Pages and swap
   `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` back to the **live**
   values from steps 1.2 and 1.4. Redeploy.
7. Optional final check: place one real order for a cheap item, then refund
   it from the Stripe Dashboard (**Payments** → find the order → **Refund**).

You're now live and able to take real payments.

---

## 7. How orders work day-to-day

- When a customer pays, you get an **email** (same inbox as your contact-form
  leads) with the customer's name, phone, delivery address (or "PICKUP IN
  STORE"), what they bought, and the amount paid.
- **You must still ring up the sale in DXPOS yourself.** The online shop does
  not yet update your till stock automatically — it only emails you the
  order. If you don't ring it into DXPOS, your stock count will be wrong.
  (Automatically pushing sales into DXPOS is planned as a later phase, once
  there's enough order volume to justify building it.)
- **Refunds**: done from the Stripe Dashboard (**Payments** → find the order
  → **Refund**), not from DXPOS.
- **Shipping charged to customers**: a flat **$10.95** under $99, **free** at
  $99 or more, and a free **"Pickup in store"** option is always offered too.
  These numbers live in `src/data/products.js` (the `SHOP` object) if they
  ever need changing.
- The order email now says either **"Fulfilment: Pickup in store — Express
  Repairs"** or a shipping option — so you can tell at a glance whether to
  post it or set it aside for pickup.
- **If you ever get two identical order emails**, don't panic and don't post
  the item twice — that's just Stripe re-sending its notification (it does
  this sometimes to make sure nothing gets missed). Both emails will have the
  exact same session id in square brackets in the subject line, e.g.
  `[cs_1AbC2dEf]`. Same session id = same order, sent twice. Check DXPOS or
  the Stripe Dashboard for that order if you're ever unsure whether it's a
  duplicate.

---

## One thing not to worry about

If you notice the checkout receipt/confirmation page URL always starts with
`www.expressrepairs.com.au` (with the "www"), that's expected and cosmetic —
both `www.expressrepairs.com.au` and `expressrepairs.com.au` serve the exact
same live site. Nothing is broken.

---

## Quick recap — where each secret goes

| Secret | Goes in | Where exactly |
|---|---|---|
| `STRIPE_SECRET_KEY` | Cloudflare Pages | expressrepairs project → Settings → Environment variables → Production |
| `STRIPE_WEBHOOK_SECRET` | Cloudflare Pages | same place |
| `RESEND_API_KEY` | Cloudflare Pages | same place (already set) |
| `POS_GATE_USER` / `POS_GATE_PASS` | GitHub | repo → Settings → Secrets and variables → Actions |
| `POS_EMAIL` / `POS_PASSWORD` | GitHub | same place |

---

## Returns policy (owner to supply)

The shop currently makes **no returns claims anywhere** — no returns text on
product pages, cart, or checkout. Australian Consumer Law consumer guarantees
apply regardless (faulty goods must be remedied), but any voluntary
change-of-mind returns policy needs wording from you before we publish it.
Send the wording (or "ACL only, no change-of-mind returns") and we'll add it
to the shop pages.

---

## Google free listings — one-time setup

The site publishes a Google Merchant feed of all shop products at
`https://www.expressrepairs.com.au/shop/google-feed.xml` (regenerated on every
deploy, so it tracks the twice-daily product sync automatically).

1. Create a Google Merchant Center account at https://merchants.google.com
   (use the same Google account as the Business Profile).
2. Verify the website: choose the **DNS record** method — Merchant Center gives
   you a TXT record, add it in Cloudflare → expressrepairs.com.au → DNS.
3. Products → Feeds → Add feed → **Scheduled fetch**, URL
   `https://www.expressrepairs.com.au/shop/google-feed.xml`, fetch **daily**.
4. Shipping settings: add a rate for Australia — $10.95 flat, **free over
   $99** (the free threshold lives here, not in the feed).
5. Done — products appear in the free listings tab of Google Search/Shopping
   within a few days. No ad spend required.

---

## Meta catalog (done — for reference)

Product catalog **Express Repairs Accessories** (id `1408359851110752`) lives
under the "Xpress Phone Repairs" business (`1645681176516723`) and is fed by a
daily 3am scheduled fetch (feed id `1564222575315748`) of the same
`https://www.expressrepairs.com.au/shop/google-feed.xml` used for Google.
View/manage in Commerce Manager → Data sources.

Dynamic (catalog) ads need the pixel to send `content_ids` matching the feed's
`g:id` values — the AddToCart/InitiateCheckout/Purchase events wired on the
shop already do this.
