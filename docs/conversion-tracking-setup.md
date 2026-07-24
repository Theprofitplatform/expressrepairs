# Conversion Tracking — Setup & Handoff

**Goal:** measure the site in Google — total traffic via **GA4**, and paid-ad
**calls + form leads** via **Google Ads** — so campaign spend is judged against
real conversions.

## Status

| Tag                       | State        | Scope                                   |
| ------------------------- | ------------ | --------------------------------------- |
| Meta (Facebook) Pixel     | ✅ live       | `/go/` ad pages (PageView + Contact/Lead) |
| GA4 (`G-RMD7TWKMXE`)       | ✅ live       | **whole site** (every page) — see below |
| Google Ads conversion ID  | ⬜ not set    | would be `/go/` ad pages only           |
| Google Ads call label     | ⬜ not set    | tap-to-call conversion                  |
| Google Ads lead label     | ⬜ not set    | form-submit conversion                  |

**Remaining work = Google Ads only.** GA4 and the Pixel are done. This doc is
written so a **Claude coworker can finish it** once the owner (Avi) supplies the
Google Ads values.

---

## TL;DR for the coworker

1. Get these three values from the owner (see "What the owner must supply"):
   `googleAdsId`, `googleAdsCallLabel`, `googleAdsLeadLabel`.
2. Paste them into **`src/data/tracking.js`** (those three fields only — leave
   `ga4Id` and `metaPixelId` as they are; they're live).
3. `npm test` (runs the build + tracking assertions) → all green.
4. Deploy: `npm run deploy` (or push to `main` and let the GitHub Action run).
   **Never** `wrangler deploy` — use `wrangler pages deploy` / `npm run deploy`.
5. Verify in Google Ads "Tag diagnostics" / Tag Assistant that a test
   call-click and a test form-submit each register a conversion.

No component edits are needed — the code already wires everything; the Ads tags
stay dormant only because their IDs are empty.

---

## How it works (so you can verify, not just paste)

- **`src/data/tracking.js`** — the single source of truth for every tag ID. A tag
  is emitted only when its ID is non-empty.
- **`src/components/SiteAnalytics.astro`** — loads **GA4 site-wide**. It's
  included by `src/layouts/Layout.astro`, so it runs on **every** page when
  `ga4Id` is set (homepage, all `/repairs/` SEO pages, blog, and `/go/`). It
  loads `gtag.js` async (never blocks first paint), sets a global
  `window.__gtagSrcLoaded` flag, and `config`s GA4.
- **`src/components/AdTracking.astro`** — included **only** by
  `src/pages/go/[lp].astro`, so it runs on the `/go/` ad pages only. It owns:
  - **Google Ads** — `config`s `googleAdsId` (reuses the gtag library already
    loaded by SiteAnalytics; the `__gtagSrcLoaded` guard prevents a second load
    and prevents GA4 being configured twice / double-counting pageviews).
  - **Meta Pixel** — `init` + `PageView`.
  - **Conversion events:**
    - **Call** — on a click of any `<a href="tel:...">`:
      Ads `conversion` (`send_to: <googleAdsId>/<googleAdsCallLabel>`),
      GA4 `call`, Meta `Contact`.
    - **Lead** — on the document `lead-success` event (dispatched by
      `src/components/LandingForm.jsx` on a successful submit):
      Ads `conversion` (`send_to: <googleAdsId>/<googleAdsLeadLabel>`),
      GA4 `generate_lead`, Meta `Lead`.

**Scope summary:** GA4 = whole site. Google Ads + Meta Pixel + the call/lead
conversion events = `/go/` ad pages only (intentional — those are the `noindex`,
conversion-first paid pages).

---

## What the owner must supply (Claude can't create Google accounts)

Creating a Google Ads account and its conversion actions requires the owner's
Google login and business verification. So the owner gets the values; the
coworker wires them in. The owner can paste them, or grant browser access to the
Google Ads console and let the coworker read them off-screen.

> GA4 is already done — `ga4Id = 'G-RMD7TWKMXE'`. Nothing more needed there.

### 1. `googleAdsId` — Google Ads Conversion ID → looks like `AW-XXXXXXXXXX`
- Google Ads → **Goals** → **Conversions** (or **Tools → Conversions**). The
  account-level Google tag / conversion ID is the `AW-XXXXXXXXXX` value.

### 2 & 3. Two conversion actions → each yields a **conversion label**
Create **two** conversion actions: Google Ads → Conversions → **+ New conversion
action** → **Website**:

| Conversion action  | Category        | Maps to        | Field in tracking.js  |
| ------------------ | --------------- | -------------- | --------------------- |
| Phone call click   | Contact / Phone | `tel:` clicks  | `googleAdsCallLabel`  |
| Lead form submit   | Submit lead     | form submit    | `googleAdsLeadLabel`  |

After creating each, open it → **Tag setup** → "Install the tag yourself".
Google shows an event snippet like:

```js
gtag('event', 'conversion', {'send_to': 'AW-123456789/AbC-D_efGhIjKlmn'});
```

The part **before** the `/` is `googleAdsId` (`AW-123456789`). The part **after**
the `/` is the **label** (`AbC-D_efGhIjKlmn`) — that's what goes in
`googleAdsCallLabel` / `googleAdsLeadLabel`. **Do not** include the `AW-.../`
prefix in the label fields; the code joins them as `googleAdsId + '/' + label`.

> If the owner only has the full `send_to` string, split it yourself: everything
> before the slash → `googleAdsId`, everything after → the label.

---

## The edit

File: **`src/data/tracking.js`**. Fill in the three Ads fields; leave the rest:

```js
export const TRACKING = {
  ga4Id: 'G-RMD7TWKMXE',            // live, site-wide — leave as is
  googleAdsId: 'AW-XXXXXXXXXX',     // step 1 (keep the AW- prefix)
  googleAdsCallLabel: 'AbC-D_xxx',  // step 2 label only, no AW-.../ prefix
  googleAdsLeadLabel: 'EfG-H_yyy',  // step 3 label only, no AW-.../ prefix
  metaPixelId: '28525940300327696', // live — leave as is
};
```

Partial is fine: if only the ID + call label are ready, set those and leave the
lead label blank — the lead conversion just stays dormant until it lands. Don't
invent placeholder IDs; an empty string is the correct "not configured yet" state.

After editing, also update the assertion in **`tests/tracking.test.js`** (it
pins which IDs are expected to be set) so the suite reflects reality.

---

## Verify (evidence, not assertion)

```bash
npm install   # if deps aren't installed
npm test      # builds the site + runs all assertions (incl. GA4 site-wide + tracking)
npm run preview
```

Then in the browser:

1. **GA4 site-wide** — load the **homepage** (`/`), DevTools → Network, confirm a
   request to `googletagmanager.com/gtag/js?id=G-RMD7TWKMXE`. Check GA4 →
   **Realtime** shows your visit. (Already true today — this is the regression check.)
2. **Ads tags load** — on a `/go/` page (e.g. `/go/screen-repair/`), confirm the
   gtag library loads exactly **once** (SiteAnalytics loads it; AdTracking reuses
   it) and that `window.gtag` exists in the Console.
3. **Call conversion** — click the tap-to-call button (any `tel:` link).
   **Google Tag Assistant** (tagassistant.google.com) shows the `conversion`
   event live; Google Ads → Conversions flips the action to "Recording
   conversions" within a few hours.
4. **Lead conversion** — submit the landing form. On success it dispatches
   `lead-success` → `generate_lead` (GA4 Realtime) + Ads lead `conversion` + Meta
   `Lead` fire. Confirm in Tag Assistant.

> The form only truly delivers a lead when `RESEND_API_KEY` is configured
> server-side; otherwise `/api/lead` returns 503. The **conversion still fires
> client-side** regardless, but for a clean end-to-end test prefer a build where
> lead email works, or test the tracking with Tag Assistant directly.

---

## Ship

- **Preferred:** commit `src/data/tracking.js` (+ the test) and push to `main`.
  `.github/workflows/deploy.yml` builds and runs
  `wrangler pages deploy dist --project-name expressrepairs --branch main`.
- **Manual:** `npm run deploy` (needs `wrangler login` or
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).
- ⚠️ **Do not** run `wrangler deploy` (the Workers command) — it publishes a
  separate Worker that doesn't serve the domain and drops the `/api/lead`
  function. Always `wrangler pages deploy` / `npm run deploy`.

After deploy, re-check `https://expressrepairs.com.au/go/screen-repair/` and
watch Google Ads "Tag diagnostics" report "Recording conversions" over ~24h.

---

## Lead counter (first-party, no analytics account needed)

Every lead that `POST /api/lead` actually delivers writes one KV key to
`ORDERS_KV` (binding declared in `wrangler.toml`, so it applies on every
deploy). GA4 and the ad platforms each report their own version of a
conversion; this is the shop's own count, and it's the only one that can't be
lost to ad blockers or consent banners.

Key: `lead:<ISO timestamp>:<8 hex>` — Value: `{source, campaign, type, model,
quote}`. No name, phone, email or details; the shop inbox is the record of the
customer. Keys expire after 2 years.

Read it with the namespace id from `wrangler.toml`:

```bash
# this month's leads (count = number of keys)
npx wrangler kv key list --namespace-id 76d87c01303149d5b37f520242b0f335 \
  --prefix "lead:$(date +%Y-%m)" | jq length

# what a single lead was attributed to
npx wrangler kv key get --namespace-id 76d87c01303149d5b37f520242b0f335 "<key>"
```

Nothing exposes this over HTTP — a public lead count is a public business
metric, and an authed endpoint is more moving parts than a CLI call.

---

## Definition of done

- [ ] `googleAdsId` + both labels filled in `src/data/tracking.js`.
- [ ] `tests/tracking.test.js` updated to match; `npm test` all green.
- [ ] On a deployed `/go/` page: gtag loads once, a `tel:` click and a form
      submit each fire their conversion (verified in Tag Assistant / GA4 Realtime).
- [ ] Google Ads conversion actions show "Recording conversions" (allow ~24h).
- [ ] `ga4Id` + `metaPixelId` untouched; GA4 still site-wide on the homepage.
