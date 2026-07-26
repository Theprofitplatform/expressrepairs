# expressrepairs.com.au

Marketing + local-SEO site for **expressrepairs.com.au** (Xpress Phone Repairs,
Riverwood Plaza). Built with **Astro 5**, deployed to **Cloudflare Pages**.

## What it is

A statically-generated **Astro 5** site with a few **React islands** for the
interactive bits:

- `src/pages/**` — routes. The homepage (`index.astro`) plus a programmatic
  local-SEO family: `repairs/`, `repairs/[service]/`, `repairs/[service]/[suburb]/`,
  and `blog/[slug]/`.
- `src/components/*.astro` — static page chrome (nav, footer, CTA, price table).
- `src/components/*.jsx` — React islands hydrated only where needed
  (booking widget, plans toggle, FAQ accordion, contact form).
- `src/data/*` — the single source of truth (Zod-validated): services, prices,
  suburbs, posts, hours, business NAP, and schema.org definitions.
- `functions/api/lead.js` — a Cloudflare **Pages Function** (`POST /api/lead`)
  that emails contact/booking submissions to the shop via [Resend](https://resend.com).
- `astro.config.mjs` — `@astrojs/react` + `@astrojs/sitemap`, `site` set to the
  production URL, `build.format: 'directory'` (trailing-slash URLs).

Build output goes to `dist/` (git-ignored).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # vitest (data integrity, SEO helpers, hours, lead API, build output)
npm run build      # static build → dist/
npm run preview    # serve the built dist/
```

> Requires Node ≥ 20 (CI uses Node 22).

## Lead delivery (`/api/lead`)

The contact form and booking widget POST to `/api/lead`, which emails the lead
to the shop via Resend. Configure these in the Cloudflare **Pages** project
(Settings → Environment variables / Secrets):

| Variable          | Required | Notes                                              |
| ----------------- | -------- | -------------------------------------------------- |
| `RESEND_API_KEY`  | yes      | Resend API key (secret).                           |
| `LEAD_TO_EMAIL`   | no       | Recipient. Defaults to `sales@funcovers.com.au`.   |
| `LEAD_FROM_EMAIL` | no       | Sender on a **Resend-verified** domain.            |

Until `RESEND_API_KEY` is set the endpoint returns `503` and the form shows a
"please call us" fallback — it never silently swallows a lead.

## Review-request SMS (staff tool)

Staff open **`/staff/review-request`** (PIN-gated, `noindex`, unlinked), enter a
customer's first name + mobile, and send a Google-review SMS via ClickSend.
Endpoint: `functions/api/review-sms.js`.

Set these in **Cloudflare Pages → Settings → Environment variables** (mark the
first three as **Secret**), then redeploy:

| Key | Secret | Purpose |
| --- | --- | --- |
| `CLICKSEND_USERNAME` | yes | ClickSend account username |
| `CLICKSEND_API_KEY` | yes | ClickSend API key |
| `REVIEW_SMS_PIN` | yes | staff PIN (min 10 chars — use a 16+ char random string) |
| `REVIEW_LINK` | no | `https://g.page/r/…/review` (GBP → Ask for reviews) |
| `CLICKSEND_SENDER` | no | sender ID, default `Xpress` (≤11 chars, alphanumeric) |
| `ALLOWED_ORIGINS` | no | extra comma-separated hosts allowed to call the API (e.g. a preview domain) |
| `STAFF_PIN` | yes | staff PIN gating `/staff/order/` (min 10 chars). Falls back to `REVIEW_SMS_PIN` if unset — see [Supplier ordering](#supplier-ordering-staff-tool) below. |

Notes:
- **The PIN is the only real barrier** to sending paid SMS to arbitrary numbers
  (the same-site check does not stop scripted, non-browser clients), so use a
  long, random PIN. A `REVIEW_SMS_PIN` shorter than 10 characters is rejected
  server-side as misconfigured (the endpoint returns "not configured").
- **Rate limiting**: the enforcing control is a Cloudflare edge WAF
  rate-limiting rule on `POST /api/supplier-catalog` and `POST /api/review-sms`
  (configured in the Cloudflare dashboard, not in this repo). In addition,
  `functions/_shared.js` keeps KV-backed per-IP (5/15min) and global
  (100/15min) failed-PIN counters as a defence-in-depth second layer — it is
  not a substitute for the WAF rule (KV is a read-modify-write under
  concurrency and throttles to ~1 write/sec/key, so it degrades under a fast
  or parallel attack; see the comment above `pinRateLimited` in
  `functions/_shared.js` for the numbers). See
  [`docs/supplier-orders.md`](docs/supplier-orders.md#pin-lockout-recovery-break-glass)
  for how to clear a lockout.
- **Preview deployments:** the shared `sameSite` check allows any `*.pages.dev`
  host by default (needed to test preview deploys), on top of the production
  apex + `www` + `localhost`. This is a deliberate widening — Origin/Referer are
  forgeable off-browser anyway, so the PIN below is the real gate. Use
  `ALLOWED_ORIGINS` to allow other exact hosts (e.g. a custom preview domain).
- Branded sender IDs are **send-only** — customers can't reply STOP. This relies
  on inferred consent (existing customer, right after their repair). To add a hard
  opt-out later, rent a ClickSend virtual number and set it as `CLICKSEND_SENDER`.
- Confirm the `Xpress` sender ID is permitted on your ClickSend account (some
  accounts require sender-ID registration).
- No incentives, and ask **every** customer — not only happy ones (Google/ACCC).

## Supplier ordering (staff tool)

Staff open **`/staff/order/`** (PIN-gated, `noindex`, unlinked), pick HOCO or
MobileMall, search the catalogue, set quantities, then copy or download the
order as CSV. Endpoint: `functions/api/supplier-catalog.js`. Gated by
`STAFF_PIN` (see the env-var table above). Full setup, refresh, and
troubleshooting steps: [`docs/supplier-orders.md`](docs/supplier-orders.md).

## Ad landing pages (`/go/`)

Conversion-first landing pages for paid campaigns, separate from the SEO
`repairs/` family. They are `noindex` and excluded from the sitemap.

- Pages: `/go/screen-repair/`, `/go/battery/`, `/go/water-damage/`, `/go/repairs/`.
- Copy lives in `src/data/landing.js` (prices/FAQs are reused from
  `src/data/repairs.js` — never duplicated).
- **Conversion tracking:** fill in the tag IDs in `src/data/tracking.js`
  (GA4, Google Ads conversion ID + call/lead labels, Meta Pixel). Until an ID
  is set its tag does not load. A tap-to-call fires a call conversion; a
  successful callback-form submit fires a lead conversion.

## Deploy

Production is the Cloudflare **Pages** project **`expressrepairs`**; the custom
domain `expressrepairs.com.au` is attached there.

- **Automatic (normal path):** every push to `main` runs
  `.github/workflows/deploy.yml`, which builds and runs
  `wrangler pages deploy dist --project-name expressrepairs --branch main`.
  Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- **Manual:** `npm run deploy` (same command; needs `wrangler login` or the
  Cloudflare env vars).

> ⚠️ Do **not** run `wrangler deploy` (the Workers command). It publishes a
> separate Worker that does not serve the domain and drops the `functions/`
> Pages Function (the `/api/lead` endpoint). Always use `wrangler pages deploy`.

See `../VERIFY.md` for the live-site health checks.
