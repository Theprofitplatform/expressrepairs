# Supplier Order Tool — Design

Date: 2026-07-25
Status: Approved

## Purpose

A PIN-gated internal page where shop staff build a supplier order (HOCO or
MobileMall) by searching the catalogue, setting quantities, and exporting an
order sheet they paste into the supplier's own ordering channel (portal /
WhatsApp / email). No orders are transmitted by the system itself.

## Requirements (decided with owner)

- **Output**: a copyable order list + downloadable CSV. The system never
  contacts suppliers directly.
- **Data**: both currently stocked shop items and the full HOCO / MobileMall
  supplier ranges, in one list with a "stocked only" filter.
- **Cost prices are shown** — therefore catalogue data (which includes supplier
  cost) must NEVER be committed to this public repo or baked into the public
  static bundle. It is served only from a PIN-gated API.
- **Auth**: shared shop PIN, same pattern as `/staff/review-request` +
  `/api/review-sms`. No per-user accounts.
- **No order history.** Supplier confirmations are the record.

## Architecture

Three pieces, all following existing repo patterns:

### 1. Data build — `scripts/extract-supplier-catalog.py` + `scripts/build-supplier-catalog.mjs`

- Follows the established HOCO-import pattern (`extract-hoco-catalogue.py` →
  `import-hoco.mjs`): a small Python script (openpyxl) extracts each supplier
  xlsx to a temp JSON, then the `.mjs` script does the matching and KV upload.
  No new npm dependency for xlsx parsing.
- The xlsx files are passed as command-line paths; they live OUTSIDE the repo
  (e.g. `..\HOCO_Catalogue_with_RRP_*.xlsx`, `..\MobileMall_Catalogue_*.xlsx`),
  are private, and stay uncommitted. Extracted JSON goes to a temp/ignored path.
- Result is one JSON array per supplier, rows shaped:
  `{ sku, name, cost, rrp, category, stocked }`.
- `stocked: true` when the row matches a product in the live shop data
  (`src/data/products.js` output) — this is how "both sources" collapse into
  one list.
- Uploads each dataset to the existing `ORDERS_KV` namespace
  (binding already in `wrangler.toml`, id `76d87c01…`) via
  `wrangler kv key put supplier-catalog:<supplier> --path <tmp.json> --remote`.
- Catalogue refresh = drop in the new xlsx, re-run the script. No deploy needed.

### 2. API — `functions/api/supplier-catalog.js`

- `POST { pin, supplier }` where `supplier ∈ { hoco, mobilemall }`.
- Validates PIN server-side against `env.STAFF_PIN`, falling back to
  `env.REVIEW_SMS_PIN` so staff keep a single PIN. Wrong/missing PIN → 401
  with no data. Unknown supplier → 400.
- On success returns the KV value for `supplier-catalog:<supplier>` as JSON
  (~1–2 MB), `Cache-Control: no-store`.
- Reuses `json` / `sameSite` helpers from `functions/_shared.js`, same
  body-size cap and hygiene as `review-sms.js`.

### 3. UI — `src/pages/staff/order.astro` → `/staff/order/`

- `noindex`, inline-styled, vanilla JS — visually and structurally a sibling of
  `review-request.astro`.
- Flow: enter PIN (remembered in `localStorage`) → pick supplier tab
  (HOCO / MobileMall) → catalogue loads once into memory → search box filters
  client-side (~7k rows is fine) → "stocked only" toggle → qty stepper per
  row → running order panel with line costs and order total.
- Export buttons:
  - **Copy order** — tab-separated lines `SKU\tName\tQty\tUnit cost` plus a
    total row, via `navigator.clipboard`.
  - **Download CSV** — same data as `order-<supplier>-<YYYY-MM-DD>.csv` via a
    Blob link. No server round-trip for either.

## Error handling

- API: 401 bad PIN, 400 bad supplier/body, 404 catalogue key missing in KV
  (message tells staff to re-run the build script), 500 pass-through.
- UI: status line (`role="status"`) mirrors the review-request page; failed
  catalogue load shows the API error and re-enables the PIN form.

## Testing

- Vitest unit tests for the xlsx→row transform (sku/cost/rrp mapping, stocked
  matching) and for the API's PIN/supplier validation, alongside the existing
  suite. No new frameworks.

## Owner setup (one-off)

1. Optionally set `STAFF_PIN` secret on the Pages project (otherwise the
   existing `REVIEW_SMS_PIN` gates the tool).
2. Run the extract + build scripts once to seed KV:
   `python scripts/extract-supplier-catalog.py <hoco.xlsx> <mobilemall.xlsx>`
   then `node scripts/build-supplier-catalog.mjs`.

## Out of scope (add when a real need appears)

Per-user accounts, order history / reorder, emailing suppliers, stock-level
integration with DXPOS, rate limiting beyond the existing endpoints' posture.
