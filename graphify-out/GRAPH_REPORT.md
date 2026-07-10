# Graph Report - repo  (2026-07-10)

## Corpus Check
- 85 files · ~286,634 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 529 nodes · 770 edges · 39 communities (32 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1cf5bd6`
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

## God Nodes (most connected - your core abstractions)
1. `../../layouts/Layout.astro` - 22 edges
2. `SITE` - 15 edges
3. `SEO Plan — expressrepairs.com.au` - 15 edges
4. `Phase 1 — Astro Foundation + Homepage Migration Implementation Plan` - 14 edges
5. `expressrepairs.com.au — SEO Content Site Design` - 14 edges
6. `../../../data/site.js` - 12 edges
7. `Off-Site SEO Execution Kit — expressrepairs.com.au` - 12 edges
8. `Ad Landing Pages — Design` - 11 edges
9. `scripts` - 10 edges
10. `HOURS` - 10 edges

## Surprising Connections (you probably didn't know these)
- `fmtTime()` --calls--> `parseTimeToMinutes()`  [EXTRACTED]
  src/lib/seo.js → src/lib/hours.js
- `Hero()` --calls--> `isOpenNow()`  [EXTRACTED]
  src/components/sections.jsx → src/lib/hours.js
- `Store()` --calls--> `isOpenNow()`  [EXTRACTED]
  src/components/sections2.jsx → src/lib/hours.js

## Import Cycles
- None detected.

## Communities (39 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (52): ../components/sections2.jsx, ../components/sections.jsx, BookingWidget(), BrandLogo(), Icon, BrandsStrip(), Contact(), FAQ() (+44 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (43): heroModules, navLinks, schema, ../../components/LandingForm.jsx, ../../../data/content.js, ../../data/landing.js, ../../data/posts.js, ../../../data/repairs.js (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (35): 10. Roadmap — 30 / 60 / 90 days, 1. Executive summary, 2. Audit snapshot, 3. Keyword & intent map (hyperlocal first), 4.1 One-time profile completion (do once, ~1–2 hrs), 4.2 Light ongoing cadence (minimal effort), 4. Pillar 1 — Google Business Profile (do this first), 5.1 Generate velocity (templated, low effort) (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (27): dependencies, astro, @astrojs/react, @astrojs/sitemap, react, react-dom, zod, description (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): Accessibility, Component State, Concerns, Design Decisions, Event Dispatch, Files Changed, Files Created, Git Commit (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): Change, Concerns, Files Changed, Fix, Fix pass: build-test race, Fix pass: find-us layout, Full Suite, Full-suite run results (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): 10. Phasing, 11. Prerequisites / Inputs Required (at implementation), 12. Risks & Mitigations, 13. Open Questions (resolve at implementation), 1. Context, 2. Goals, 3. Non-Goals, 4. Decisions (locked) (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (10): emailValid(), hostAllowed(), json(), oneLine(), onRequest(), REPAIR_LABELS, sameSite(), CR (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): File Structure, Follow-ups (out of scope, tracked), Phase 1 — Astro Foundation + Homepage Migration Implementation Plan, Scope, Self-Review, Task 1: Initialise Astro project + tooling, Task 2: Data layer — ESM modules + Zod validation, Task 3: `hours` logic library (open-now) (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (13): Commit, Commit, Concerns, Edits Applied, Files Changed, Fix pass (review round 1), Self-Review, Step 1: RED — Write Failing Test (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): Ad Landing Pages — Design, Architecture, Data layer — `src/data/landing.js`, Decisions (from brainstorming), Error handling, Goal, Honesty constraints, Out of scope (YAGNI) (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (12): Commit, Files Created, Fix pass (review round 1), No Concerns, Self-Review, Step 1-2: Test Written & RED, Step 3-4: Implementation & GREEN, Step 5: AdTracking Component (+4 more)

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
Cohesion: 0.40
Nodes (8): dayName(), DAYS, isOpenAt(), isTradingDay(), parseHourTo24(), parseTimeToMinutes(), splitHoursRange(), fmtTime()

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (9): Commit, Final Fixes Report, Fix #1 — Landing campaign attribution in lead email (TDD), Fix #2 — Catch-all page price grid coverage, Full Suite, Step 1 — RED (failing tests written first), Step 2 — Implementation in `functions/api/lead.js`, Step 3 — GREEN (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (9): Commit, Concerns, Files Changed, Self-Review, Step 1: Add the failing assertion (RED), Step 2: Add the sitemap filter (GREEN), Step 3: Full regression suite (ALL GREEN), Task 5 Report: Exclude landing pages from the sitemap (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (7): Ad landing pages (`/go/`), Deploy, Develop, expressrepairs.com.au, Lead delivery (`/api/lead`), Review-request SMS (staff tool), What it is

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (6): 1. README.md — Added Ad landing pages section, 2. docs/superpowers/specs/2026-06-23-ad-landing-pages-design.md — Updated Status, Changes Made, Commit, Task 6: Documentation — Completion Report, Verification Summary

### Community 21 - "Community 21"
Cohesion: 0.39
Nodes (4): LandingForm(), buildLeadPayload(), validateContact(), sendLead()

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (19): 1. Current account structure (so we localize the right things), 2. Two findings that change the plan (read first), 2a. "Shift budget to the Leads ads" — budget is **not** the bottleneck, 2b. "Wire up the Pixel Lead event" — it's **already wired in code**, 3. Localization — the part you asked for, 4. Paste-ready localized creative copy, 5. Suburb landing pages (ad destinations), 6. Targeting / radius guide (apply in Ads Manager) (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (3): How to fill in tracking IDs (post-merge, no code change needed beyond IDs), Self-Review (completed by plan author), Task 6: Documentation + README note

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
Cohesion: 0.29
Nodes (9): buildReviewMessage(), hostAllowed(), json(), normalizeAuMobile(), oneLine(), onRequest(), pinEqual(), sameSite() (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.60
Nodes (3): LANDING_BY_SLUG, LANDING_PAGES, landingPageSchema

## Knowledge Gaps
- **277 isolated node(s):** `REPAIR_LABELS`, `name`, `version`, `private`, `type` (+272 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../../layouts/Layout.astro` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `SITE` connect `Community 1` to `Community 0`, `Community 21`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `REPAIR_LABELS`, `name`, `version` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06467661691542288 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08365384615384615 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._