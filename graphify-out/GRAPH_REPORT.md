# Graph Report - wt-hoco  (2026-07-23)

## Corpus Check
- 148 files · ~626,555 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 863 nodes · 1251 edges · 58 communities (48 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2bc28852`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `../../layouts/Layout.astro` - 29 edges
2. `SITE` - 16 edges
3. `SEO Plan — expressrepairs.com.au` - 15 edges
4. `Online Shop Setup — Owner Runbook` - 15 edges
5. `../../../data/site.js` - 14 edges
6. `PRODUCTS` - 14 edges
7. `Phase 1 — Astro Foundation + Homepage Migration Implementation Plan` - 14 edges
8. `expressrepairs.com.au — SEO Content Site Design` - 14 edges
9. `../../components/SiteNav.astro` - 13 edges
10. `../../lib/seo.js` - 12 edges

## Surprising Connections (you probably didn't know these)
- `fmtTime()` --calls--> `parseTimeToMinutes()`  [EXTRACTED]
  src/lib/seo.js → src/lib/hours.js
- `onRequest()` --calls--> `json()`  [EXTRACTED]
  functions/api/checkout.js → functions/_shared.js
- `onRequest()` --calls--> `json()`  [EXTRACTED]
  functions/api/lead.js → functions/_shared.js
- `onRequest()` --calls--> `json()`  [EXTRACTED]
  functions/api/review-sms.js → functions/_shared.js
- `onRequest()` --calls--> `json()`  [EXTRACTED]
  functions/api/stripe-webhook.js → functions/_shared.js

## Import Cycles
- 1-file cycle: `src/data/products.js -> src/data/products.js`

## Communities (58 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (58): ../components/sections2.jsx, ../components/sections.jsx, BookingWidget(), BrandLogo(), Icon, LandingForm(), BrandsStrip(), Contact() (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (49): heroModules, navLinks, schema, ../components/AdTracking.astro, ../../../components/CtaBand.astro, ../../components/LandingForm.jsx, ../../../components/MobileCta.astro, ../../../components/PageScripts.astro (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (35): 10. Roadmap — 30 / 60 / 90 days, 1. Executive summary, 2. Audit snapshot, 3. Keyword & intent map (hyperlocal first), 4.1 One-time profile completion (do once, ~1–2 hrs), 4.2 Light ongoing cadence (minimal effort), 4. Pillar 1 — Google Business Profile (do this first), 5.1 Generate velocity (templated, low effort) (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (30): dependencies, astro, @astrojs/react, @astrojs/sitemap, aws4fetch, react, react-dom, zod (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): Backfill: breakdown of the original 106 drops, Commit, Commits, Deduplication Strategy Applied, False-positive assessment of the remaining 44, Files changed, Fix (minimal, same function), Fix round 1 (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (9): Concerns, Full test suite, Status, Step 1: Full static build, Step 2: Payload check, Step 3: Page QA (via dist/, per adapted instructions — no preview server), Step 4: Commit, Summary of headline numbers (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): 10. Phasing, 11. Prerequisites / Inputs Required (at implementation), 12. Risks & Mitigations, 13. Open Questions (resolve at implementation), 1. Context, 2. Goals, 3. Non-Goals, 4. Decisions (locked) (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): Context a fresh session needs, Deliberately NOT in this plan, Ecommerce Improvements Implementation Plan, Global Constraints, Phase 1 — Convert, Phase 2 — Be found, Phase 3 — Take money cleanly, Task 10: Customer order-confirmation email (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): File Structure, Follow-ups (out of scope, tracked), Phase 1 — Astro Foundation + Homepage Migration Implementation Plan, Scope, Self-Review, Task 1: Initialise Astro project + tooling, Task 2: Data layer — ESM modules + Zod validation, Task 3: `hours` logic library (open-now) (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (9): Execution Log, Next Steps, Step 1: Write the extractor, Step 2: Run the extractor, Step 3a: Verify structure, Step 3b: Verify no wholesale leakage, Step 4: Commit, Task 1 Completion Report (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): Ad Landing Pages — Design, Architecture, Data layer — `src/data/landing.js`, Decisions (from brainstorming), Error handling, Goal, Honesty constraints, Out of scope (YAGNI) (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (38): Category distribution (final), Category distribution (final, after applyCatalogFixes), Category distribution (final, after applyCatalogFixes), Commit, Deviations, Finding addressed, Findings addressed, Findings addressed (+30 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (11): 1. `googleAdsId` — Google Ads Conversion ID → looks like `AW-XXXXXXXXXX`, 2 & 3. Two conversion actions → each yields a **conversion label**, Conversion Tracking — Setup & Handoff, Definition of done, How it works (so you can verify, not just paste), Ship, Status, The edit (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): 10. First-week launch runsheet (start here), 11. Holiday special-hours — set these in GBP, 1. Google Business Profile — exact field values, 2. GBP business description (paste-ready, ~700 / 750 chars), 3. Services to add in GBP (name · price · description), 4. Photo shot-list (upload 12–15 — real photos only, no stock), 5. GBP Q&A — seed these yourself (post the question, then answer it), 6. GBP Posts — 6 ready to publish (one every 1–2 weeks; batch them now) (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (10): Ad Landing Pages Implementation Plan, Global Constraints, How to fill in tracking IDs (post-merge, no code change needed beyond IDs), Self-Review (completed by plan author), Task 1: Landing-page data layer, Task 2: Tracking config + AdTracking component, Task 3: Landing lead helpers + LandingForm island, Task 4: The landing route + build verification (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (9): Build verification (`npm run build`, dist/), Concerns / notes, Final review fixes — hoco-import branch, Finding 1 — broken thumbs for H- ids (Critical), Finding 2 — B2B leaks (Important), Finding 3 — warehouse codes in display names (Important), Finding 4 — stale copy (Minor), Regeneration (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (54): ../../data/products.js, ../../data/site.js, ../../lib/seo.js, ../../lib/shop.js, ../shop/filter-core.js, ../../shop/search-core.js, ../data/site.js, brandCounts (+46 more)

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (11): dayName(), DAYS, isOpenAt(), isTradingDay(), parseHourTo24(), parseTimeToMinutes(), splitHoursRange(), absoluteUrl() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (27): byId, onRequest(), emailValid(), oneLine(), onRequest(), REPAIR_LABELS, buildReviewMessage(), normalizeAuMobile() (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): Execution Summary, Report Created, Task 6 Completion Report

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (10): Background facts (verified 2026-07-22), Decisions taken (owner can override later, each is one knob), Global Constraints, HOCO Catalogue Import Implementation Plan, Task 1: Commit a wholesale-free HOCO catalogue snapshot, Task 2: `scripts/import-hoco.mjs` — transform catalogue rows to shop products, Task 3: Merge the two catalogs at build time, Task 4: Build, size and page QA (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (19): 1. Current account structure (so we localize the right things), 2. Two findings that change the plan (read first), 2a. "Shift budget to the Leads ads" — budget is **not** the bottleneck, 2b. "Wire up the Pixel Lead event" — it's **already wired in code**, 3. Localization — the part you asked for, 4. Paste-ready localized creative copy, 5. Suburb landing pages (ad destinations), 6. Targeting / radius guide (apply in Ads Manager) (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (10): Context a fresh session needs, Global Constraints, Self-review notes (done at plan-writing time), Shop Filters & Categories Implementation Plan, Task 1: `deviceModel()` extractor + `modelGroups()`, Task 2: `filterProducts()` core, Task 3: Device-model landing pages, Task 4: ShopFilters component — model chips + real whole-category filters (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (15): ✨ BACK GLASS, 🔋 BATTERY, 📸 CAMERA, 🔌 CHARGING PORT, Express Repairs — In-Store Quoting Sheet (staff), iPhone, iPhone, Other brands (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (13): 1. Goal, 2. Non-goals (YAGNI), 3. Architecture & flow, 4.1 Staff page — `src/pages/staff/review-request.astro`, 4.2 API — `functions/api/review-sms.js`, 4.3 Message template, 4. Components, 5. Configuration (Cloudflare Pages → Settings → Environment variables) (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): Back glass replacement, Battery replacement, Camera / lens, Charging port, Express Repairs — Repair Price List, Notes for staff, Other repairs we do (quote on inspection), Quick reference — starting prices (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (8): File Structure, Global Constraints, Review-Request SMS Implementation Plan, Self-Review, Task 1: Pure helpers — `normalizeAuMobile` + `buildReviewMessage`, Task 2: The `/api/review-sms` endpoint, Task 3: Staff page + sitemap exclusion, Task 4: Document env vars + owner setup

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (8): Context a fresh session needs, Deliberately NOT in this plan, Global Constraints, Shop Improvements Implementation Plan, Task 1: Customer-facing categories (highest visible impact), Task 2: Exclude trade-only products, Task 3: Self-host images on Cloudflare R2, Task 4: Product search

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (13): 1. Product sync (DXPOS → website), 2. Storefront, 3. Checkout & payment, 4. Orders, Architecture, Components, Error handling, Goal (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (11): Global Constraints, Launch checklist (after all tasks merge & deploy), Online Accessories Store Implementation Plan, Task 1: Product data foundation, Task 2: DXPOS sync script, Task 3: Sync workflow, Task 4: Shop pages, Task 5: Cart (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (15): 1. Set up Stripe (takes payments), 2. Add the Stripe keys to Cloudflare Pages, 3. Add the DXPOS secrets to GitHub, 4. Run the first sync, 5. How the day-to-day range is managed, 6. Test before going live with real money, 7. How orders work day-to-day, Go-live checklist (payments) (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): aws, failures, ids, keyFor(), PRODUCTS, queue, todo, uploadOne()

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (24): applyCatalogFixes(), fixBrand(), fixCategory(), fixName(), HIDE_IDS, MAKERS, MOVES, NAME_FIXES (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.31
Nodes (6): filterProducts(), PRICE_BANDS, norm(), searchProducts(), SYN, IDX

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (8): Context, Ecommerce Improvements — Design, Goal, Non-goals, Phase 1 — Convert (works before Stripe is on), Phase 2 — Be found, Phase 3 — Take money cleanly, Success criteria

### Community 46 - "Community 46"
Cohesion: 0.36
Nodes (4): tracker-lock.sh script, usage(), validate_name(), write_owner()

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (9): 1. Device-model subcategory pages (categories fix + SEO), 2. Real full-category filters (filters fix), 3. Small conversion polish (falls out of the extractor), Approaches considered, Design, Out of scope, Problem (verified on live data, 3,518 products), Shop Filters & Categories — Design (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): Active, Done log (newest first), Protocol (both executors), Shared Work Tracker — expressrepairs

### Community 49 - "Community 49"
Cohesion: 0.83
Nodes (3): tracker-lock.test.sh script, check(), cleanup()

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): 1. Group + collapse the model wall, 2. One-row filter toolbar, 3. Density + fold, Approaches considered, Design (native-first, no JS added beyond what exists), Out of scope, Problem (from the live Cases & Covers page), Shop UI/UX Polish — Design (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): Context a fresh session needs, Global Constraints, Self-review notes (plan-writing time), Shop UI/UX Polish Implementation Plan, Task 1: `modelFamilies()` display helper, Task 2: ShopFilters rework — collapsed family groups + one-row toolbar, Task 3: Density + above-the-fold products, Task 4: Deploy + live verification

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (7): Ad landing pages (`/go/`), Deploy, Develop, expressrepairs.com.au, Lead delivery (`/api/lead`), Review-request SMS (staff tool), What it is

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (5): For Your Review, HOCO Catalogue Import Report, Owner Knobs, Pricing & Fulfillment, Results

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (3): Agent tasks (any Claude session can pick these up), Owner tasks (blocked on you), Shop tasks — outstanding items

## Knowledge Gaps
- **445 isolated node(s):** `byId`, `REPAIR_LABELS`, `name`, `version`, `private` (+440 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../../layouts/Layout.astro` connect `Community 1` to `Community 0`, `Community 17`, `Community 16`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `PRODUCTS` connect `Community 16` to `Community 42`, `Community 19`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `byId`, `REPAIR_LABELS`, `name` to the rest of the system?**
  _445 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.056329113924050635 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05868544600938967 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._