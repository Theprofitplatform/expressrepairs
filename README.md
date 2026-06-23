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
