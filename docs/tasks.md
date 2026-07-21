# Shop tasks — outstanding items

Living checklist after the 2026-07-21 ecommerce build (all 12 plan tasks are
live; these are the follow-ups). Tick items off as they're done; details for
each are in `docs/shop-setup.md`.

## Owner tasks (blocked on you)

- [ ] **Stripe test keys** — create the Stripe account, add test-mode
  `STRIPE_SECRET_KEY` (`sk_test_…`) + `STRIPE_WEBHOOK_SECRET` (`whsec_…`) to
  Cloudflare Pages as **Secrets**, so the test-mode dry run can happen
  (shop-setup.md → "Go-live checklist").
- [ ] **Stripe go-live** — after a clean dry run: swap to live keys, then
  place a real cheapest-item order and refund it.
- [ ] **Google Merchant Center** — create the account, verify the domain via
  DNS TXT, add the feed URL with daily fetch, set the free-over-$99 shipping
  rule (shop-setup.md → "Google free listings — one-time setup").
- [ ] **Returns-policy wording** — supply the text (or say "ACL only, no
  change-of-mind returns"); the site currently makes no returns claims and
  none will be invented for you.
- [ ] **`R2_API_TOKEN` GitHub repo secret** — so newly synced product images
  keep mirroring to img.expressrepairs.com.au.
- [ ] **Fix off-platform hours** — Facebook Page + Google Business Profile
  still say "open 7 days"; the shop is closed Sundays.
- [ ] **ClickSend credentials** — for the staff review-request SMS tool
  (merged but not configured): `CLICKSEND_USERNAME`, `CLICKSEND_API_KEY`,
  `REVIEW_SMS_PIN`, `REVIEW_LINK` as Pages Secrets.
- [ ] **Rotate the LS token** (outstanding since the 2026-07-10 pricing fix).

## Agent tasks (any Claude session can pick these up)

- [ ] **Meta feed diagnostics** — first ingestion of feed `1564222575315748`
  (catalog `1408359851110752`) was still in progress at last check
  (3,665 detected, 0 invalid). Re-check `ads_catalog_get_diagnostics` /
  feed details; expect ≥95% accepted, fix the top rejection reason if not.
- [ ] **Stripe test-mode dry run** — once owner adds test keys: full order →
  exactly one shop email, one customer email, KV key written, Purchase event,
  session visible in Stripe. Then update the go-live checklist status.
- [ ] **Rich Results spot-check** — paste a live product URL into Google's
  Rich Results Test; expect "Product" detected (missing-review warnings are
  fine).
- [ ] **Pixel events in Events Manager** — confirm AddToCart / InitiateCheckout
  / Purchase arrive from real traffic (headless browsers suppress the beacon,
  so this needs real visitors or the owner's browser).
- [ ] **Dynamic ads follow-up** — once the catalog is populated and pixel
  events flow, consider a catalog-sales campaign in ad account
  `1909285833096577` (owner decision on budget first).
