# Supplier ordering (staff)

Staff page: https://expressrepairs.com.au/staff/order/ — enter the shop PIN,
pick HOCO or MobileMall, search, set quantities, then **Copy order** (paste
into WhatsApp/email) or **Download CSV**. Orders are sent to the supplier
manually; nothing is transmitted or stored by the site.

> **Not live yet.** `/staff/order/` only exists once `feat/supplier-order-tool`
> has been merged and deployed to the `expressrepairs` Pages project — until
> then the URL above 404s. The rest of this doc assumes that deploy has happened.

## Before you start: prerequisites

1. **Install `openpyxl`** for the Python extractor. Nothing in this repo installs
   it (no `requirements.txt`, not in `package.json`) — on a clean machine
   `python scripts/extract-supplier-catalog.py` fails with `ModuleNotFoundError`.
   ```bash
   pip install openpyxl
   ```

2. **Cloudflare auth for the KV upload.** `node scripts/build-supplier-catalog.mjs`
   shells out to `wrangler kv key put --remote`, which needs an authenticated
   `wrangler` (`wrangler login` or `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`)
   and **writes straight to the production `ORDERS_KV` namespace** — there is no
   dry-run flag. Only run it when you intend to publish the new catalogue.

3. **Set the PIN on the Pages project** (one-off setup).
   ```bash
   npx wrangler pages secret put STAFF_PIN --project-name expressrepairs
   ```
   Use 16+ random characters. As of 2026-07-25, this secret does not exist.
   Until you set it (or confirm `REVIEW_SMS_PIN` is configured), the tool
   returns HTTP 503 "Staff tools not configured."

4. Seed the catalogues (see refresh below).

## Refreshing a catalogue (new price list from a supplier)

When a supplier sends a new xlsx price list, refresh the KV catalogues from the
repo root:

1. `python scripts/extract-supplier-catalog.py "<path/to/hoco.xlsx>" "<path/to/mobilemall.xlsx>"`
   (The xlsx files live outside the repo; `.supplier-data/` extracts are gitignored.
   Requires `openpyxl` — see prerequisites above.)

2. `node scripts/build-supplier-catalog.mjs`
   (Requires Cloudflare auth and writes straight to production KV — see
   prerequisites above. No dry-run.)

No deploy needed — the page reads KV live.

## How it works

- **PIN verification**: When you submit the load form on `/staff/order/`, the page
  posts your PIN to `/api/supplier-catalog`. The Cloudflare Pages Function
  verifies it server-side before returning the catalogue.
- **Catalogue data** (cost prices, SKUs, stock) lives in Cloudflare KV (`ORDERS_KV`)
  and is served only after PIN verification passes.
- **No transmission**: copy/CSV is built on your machine and left in your clipboard
  or download folder.
- **Security**: cost data is never committed to the repo and never baked into the
  public static bundle; it lives in KV and is served only via the PIN-gated API.

## Before you deploy: bundle leak check

**Why not just `grep -ri "costCents" dist/`?** The staff page's own inline JavaScript
legitimately contains `r.costCents`, so that grep will always match — it tells you
nothing about whether cost data leaked into the public bundle. Run these three checks instead:

1. **Confirm the staff page exists:**
   ```bash
   test -f dist/staff/order/index.html && echo "✓ File exists" || echo "✗ Missing"
   ```

2. **Confirm every costCents reference is in that file only:**
   ```bash
   matches=$(grep -r "costCents" dist/ 2>/dev/null | wc -l)
   staff_matches=$(grep "costCents" dist/staff/order/index.html 2>/dev/null | wc -l)
   if [ "$matches" -eq "$staff_matches" ]; then echo "✓ All in staff page"; else echo "✗ Leaked"; fi
   ```

3. **Confirm no catalogue payload is present:**
   ```bash
   (grep -r '"costCents":' dist/ 2>/dev/null || true) | wc -l
   (grep -r '\[{"sku"' dist/ 2>/dev/null || true) | wc -l
   ```
   Both should return `0`.

## PIN lockout recovery (break-glass)

`/api/supplier-catalog` and `/api/review-sms` share a KV-backed brute-force
throttle (`functions/_shared.js`): 5 failed PINs from one IP in 15 minutes
locks that IP out, and 100 failed PINs from anywhere in 15 minutes locks out
**every** IP on **both** endpoints — including the owner typing the correct
PIN wrong a few times, or someone else hammering the page. That global
lockout is an accepted trade-off of the two-counter design (see the comment
above `pinRateLimited` in `functions/_shared.js`), and it doesn't clear
itself for up to 15 minutes. If you need it gone sooner:

```bash
# Global lockout (blocks everyone on both /staff/order/ and /staff/review-request/):
npx wrangler kv key delete "pinfail:global" --namespace-id 76d87c01303149d5b37f520242b0f335 --remote

# Per-IP lockout (blocks just one IP) — find the IP from the 429 in Cloudflare
# Pages Function logs, then:
npx wrangler kv key delete "pinfail:<ip>" --namespace-id 76d87c01303149d5b37f520242b0f335 --remote
```

Both commands write to the production `ORDERS_KV` namespace — only run them
when a real staff member is actually locked out, not preventatively. Deleting
a key that doesn't exist is a no-op, so it's safe to run either command
speculatively if you're not sure which counter tripped.

If lockouts happen often, the fix is the Cloudflare edge WAF rate-limiting
rule on these two routes (the primary control — see README.md), not loosening
`PIN_MAX_FAILS`/`PIN_GLOBAL_MAX_FAILS`.

## Troubleshooting

- **"Staff tools not configured"**: Check that `STAFF_PIN` (or `REVIEW_SMS_PIN`)
  is set on the Cloudflare Pages project secrets. Set it with the command above.
- **"Catalogue not loaded — run scripts/build-supplier-catalog.mjs"**: Run the
  refresh scripts (above) and wait ~30s for KV to replicate across Cloudflare's
  global edge.
- **"Too many attempts. Wait 15 minutes."**: See
  [PIN lockout recovery](#pin-lockout-recovery-break-glass) above.
