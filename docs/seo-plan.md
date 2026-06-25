# SEO Plan — expressrepairs.com.au

**Business:** Xpress Phone Repairs, Riverwood (Express Repairs) — Shop 7C, Riverwood Plaza, 257 Belmore Rd, Riverwood NSW 2210 · (02) 9533 3300
**Prepared:** 2026-06-23
**Primary goal:** More **local leads** — phone calls, booking-form submissions, and walk-ins from Riverwood and the surrounding St George / Canterbury-Bankstown suburbs.
**Strategy in one line:** Build a *local moat* — dominate the Google map pack and "near me" results for one shop's catchment, sequenced by leverage: **GBP → reviews → on-site content depth → citations**.

> Scope note: this is a strategy + roadmap document. On-site items (new suburb pages, blog posts, schema tweaks) are written so they can be actioned in the repo; off-site items (GBP, reviews, citations) are templated to keep manual effort low.

> **Implementation progress — 2026-06-23 (on-site content shipped):**
> - ✅ **Suburb pages: 2 → 15.** Built screen pages for Narwee, Beverly Hills, Kingsgrove, Revesby, Peakhurst, Roselands, Punchbowl and Hurstville; backfilled battery/Riverwood and screen/Padstow; and added the **battery** second-service pages for the Tier-1/2 priorities (Hurstville, Beverly Hills, Kingsgrove). Each has unique, locally-accurate copy (transit, parking, suburb FAQs) and is in the sitemap.
> - ✅ **Blog: 1 → 6 posts.** Wrote the five stub articles (battery-draining fixes, water-damage first aid, OEM vs aftermarket, charging-port lint, repair-vs-upgrade), cross-linked to the relevant service/suburb pages. Build green, all 79 tests pass.
> - ⛔ **Blocked on real data (not fabricated):** `sameAs` URLs (needs the real GBP/Facebook/Instagram links) and `aggregateRating` (needs the real Google review count) — see §5.3 and §8. Off-site pillars (§4 GBP, §5 reviews, §7 citations) remain manual tasks for the shop.

---

## 1. Executive summary

The site already has an **excellent technical foundation** (clean canonical URLs, valid `LocalBusiness` / `FAQPage` / `BreadcrumbList` JSON-LD consolidated on one business `@id`, `@astrojs/sitemap`, `robots.txt`, OpenGraph/Twitter, `en-AU`, optimized font loading, a `noindex` mechanism for the `/go/` conversion pages). **Technical SEO is not the bottleneck.**

The bottleneck is **off-site authority and content depth**:

| The four highest-leverage moves | Why it matters | Effort |
|---|---|---|
| **1. Optimize the Google Business Profile** | The map pack drives the majority of "phone repair near me" clicks; "claimed but neglected" = fast wins | Low (one-time setup + light cadence) |
| **2. Build a review engine** | Reviews are a top-3 local ranking factor *and* unlock the star snippet you currently (correctly) don't fabricate | Low–Med (templated, ongoing) |
| **3. Finish the on-site local content** | Infrastructure exists — only **2 of 10** suburb pages and **1 of 6** blog posts are built | Med (one-time content) |
| **4. Local citations & links** | NAP-consistent listings reinforce the map-pack signal | Low (one-time batch) |

**Expected outcome (realistic, single location):** local-pack visibility and "near me" rankings for the priority suburbs within ~3 months; measurable lift in calls and form leads. Local SEO compounds — the GBP + review work shows up fastest (weeks), content + citations build over 1–3 months.

---

## 2. Audit snapshot

### What's already strong — leave it alone
- ✅ **Structured data:** single canonical `LocalBusiness` node (`/#business`), `FAQPage`, `BreadcrumbList`; inner pages reference the business via `@id` (`businessRef`) instead of re-declaring partial entities — this is exactly right.
- ✅ **Honest schema discipline:** `aggregateRating` is only emitted when a *real* review count is set (`rating.count` is `null` today), and prices/ratings aren't fabricated. Keep this.
- ✅ **Crawl/index basics:** `robots.txt` → `sitemap-index.xml`, per-page canonical, `noindex` on the `/go/` landing pages so they don't compete with the indexable `/repairs/` pages.
- ✅ **Meta + social:** title/description/OG/Twitter all driven from `Layout.astro`; `lang="en-AU"`, `theme-color`, skip-link, non-blocking fonts.
- ✅ **Programmatic page family** already scaffolded: `repairs/[service]` and `repairs/[service]/[suburb]` with a rich unique-copy model (transit directions, local landmarks, suburb-specific FAQs).

### Gaps — where the leads are hiding

| Gap | Current state | Impact |
|---|---|---|
| **GBP neglected** | Claimed, not actively managed | High — biggest local lever underused |
| **No review velocity / no stars** | `rating.count = null`; only 3 testimonials in `LOCAL_REVIEWS` | High — ranking + CTR |
| **Placeholder testimonial** | "Sarah M. / Verified Customer" + code note "pravatar fakes flagged for replacement" | Compliance — see §5 |
| **Suburb pages** | 2 of 10 built (`screen/riverwood`, `battery/padstow`) | Med — missing "near me" capture for 8 suburbs |
| **Blog** | 1 of 6 posts real; 5 are `slug: null` stubs (titles written) | Med — informational capture + internal links |
| **`sameAs` empty** | GBP + social URLs not linked in schema | Low-effort quick win — entity reconciliation |
| **GSC / analytics** | Not confirmed set up | Can't measure or find query opportunities |

**Scorecard:** Technical SEO **A** · On-page **A−** · Content depth **C** · Off-site/GBP **D** · Measurement **D**. The grade gap *is* the opportunity.

---

## 3. Keyword & intent map (hyperlocal first)

Three intent layers, in priority order for a lead-gen local shop:

### Layer 1 — Transactional "near me" / suburb (highest priority)
These convert. Map them to GBP + the `repairs/[service]/[suburb]` pages.

- `phone repair near me`, `phone repair riverwood`, `mobile phone repair [suburb]`
- `iphone screen repair [suburb]`, `samsung screen repair [suburb]`
- `phone battery replacement [suburb]`, `cracked screen repair near me`
- `phone repair riverwood plaza`, `[suburb] phone repair shop`

Suburbs in scope: **Riverwood, Hurstville, Beverly Hills, Kingsgrove, Narwee, Peakhurst, Padstow, Punchbowl, Roselands, Revesby** (the `SUBURB_CHIPS` set).

### Layer 2 — Service + brand/model (medium priority)
Map to `repairs/[service]` pages (already built for 6 services: screen, battery, back-glass, charging-port, camera, water-damage).

- `iphone 15 screen replacement cost`, `samsung galaxy s23 battery replacement`
- `iphone charging port repair`, `phone water damage repair sydney`
- `pixel screen repair`, `iphone back glass replacement`

### Layer 3 — Informational (supports authority + internal links)
Map to the blog. Each post should link to the relevant service/suburb pages.

- `how much does screen repair cost sydney` ✅ (already published)
- `iphone battery health 80 percent replace?`, `is it worth replacing phone battery`
- `dropped phone in water what to do`, `OEM vs aftermarket screen`, `repair or upgrade phone`

> **Money keyword discipline:** for a single location, *proximity to the searcher* is the dominant ranking factor in the pack. Don't chase `phone repair sydney` head terms — chase the suburb terms where you can actually win and the searcher can actually walk in.

---

## 4. Pillar 1 — Google Business Profile (do this first)

GBP is the single biggest lever for local leads and the fastest to move. "Claimed but neglected" means most of these are one-time fixes.

### 4.1 One-time profile completion (do once, ~1–2 hrs)
- **Primary category:** `Mobile phone repair shop`. **Secondary:** `Phone repair service`, `Electronics repair shop`, `Cell phone store` (only those that genuinely apply).
- **Name:** exactly the real-world signage — `Xpress Phone Repairs` (do **not** keyword-stuff, e.g. "…Riverwood Cheap iPhone Repair" — violates Google guidelines and risks suspension).
- **NAP:** must match the site **byte-for-byte**: `Shop 7C, Riverwood Plaza, 257 Belmore Rd, Riverwood NSW 2210` · `(02) 9533 3300`. (Source of truth: `src/data/site.js`.)
- **Hours:** mirror `src/data/hours.js` exactly, including the **Thursday late-night to 7 PM** and **Sunday closed**. Set special hours for public holidays.
- **Services:** add each repair as a GBP service with the price-from values: Screen from $99, Battery from $59, Back Glass from $69, Charging Port from $49, Camera, Water Damage, plus **Free Diagnostic**.
- **Products:** add a few hero items with photos (screen repair, battery, accessories) — products show in the profile and are an extra surface.
- **Attributes:** "Walk-ins welcome", "Wheelchair-accessible", payment types, "Free Wi-Fi" if applicable, "Repair services".
- **Description (750 chars):** lead with what + where + proof: same-day repairs, original-quality parts, 6–12 month warranty, free diagnostic, inside Riverwood Plaza, 2 min from Riverwood station.
- **Photos:** upload 15–20 real photos — storefront (so people find Shop 7C), inside the Plaza, technicians working, before/after repairs, the team. Geotagging is no longer needed; *recency and realness* are. **Avoid stock images.**
- **Website link:** point the GBP "Website" button at a UTM-tagged URL so you can measure GBP → site traffic (see §9). The `/go/` landing pages are ideal targets for the offer-style links.
- **Booking/messaging:** turn on **Messaging** (route to the shop) and add the booking form link.

### 4.2 Light ongoing cadence (minimal effort)
- **GBP Posts:** 1 every 1–2 weeks. Batch-write a month of posts in one sitting. Templates in Appendix C.
- **Q&A seeding:** post and answer 6–8 common questions yourself (turnaround time, walk-in vs booking, warranty, parking, do-you-fix-X). This is one-time.
- **Photos:** add 2–3 new real photos monthly (even phone snaps of completed repairs).
- **Reviews:** respond to every review (see §5) — this is the highest-value recurring 5 minutes.

---

## 5. Pillar 2 — Review engine

Reviews drive both ranking (volume, velocity, recency, keywords-in-reviews) and conversion (stars in the pack + on-site snippet).

### 5.1 Generate velocity (templated, low effort)
- **Target:** a steady trickle beats a burst — aim for a handful of new Google reviews per month, every month. Velocity and recency matter more than a one-time pile.
- **Ask at the counter** when the customer is happiest (handing back the fixed phone). Hand them a **QR code** (print on the receipt / a counter card) linking to the GBP review form (`g.page/r/…/review` short link).
- **SMS/email follow-up** after pickup. Template in Appendix C. Keep it to one message, no incentives (incentivized reviews violate Google + ACCC rules).
- Never gate reviews ("only ask happy customers") via software — review-gating is against Google policy.

### 5.2 Respond to every review
- Reply to all reviews within a few days — positive (thank + reinforce a keyword naturally) and negative (calm, solution-oriented, move offline). Templates in Appendix C.

### 5.3 Wire real reviews into the site (on-site, action later)
Once you have a real, current Google review count:
- Set `rating.count` (and confirm `rating.value`) in `src/data/site.js` to the **real** Google numbers → the existing `localBusinessSchema` will automatically emit `aggregateRating` and unlock the star rich result. **Do not invent a number** — the schema is built to stay silent until a real count is provided, and fabricated ratings breach Google's policy and ACCC guidance.
- Refresh `LOCAL_REVIEWS` in `src/data/repairs.js` with **real** Google reviews and replace the flagged placeholder testimonial ("Sarah M. / Verified Customer" — the code already notes the avatars are "pravatar fakes flagged for replacement"). Displaying fabricated testimonials is a compliance risk; use real, attributable reviews only.

---

## 6. Pillar 3 — On-site content roadmap

The page family exists; this is **finishing**, not building. Two workstreams: suburb pages and blog posts.

### 6.1 Suburb pages (`repairs/[service]/[suburb]`)

Today: `screen/riverwood` and `battery/padstow`. The content model (`LOCAL_PAGES` in `src/data/repairs.js`) is rich and **anti-doorway by design** — each page has genuinely unique copy: transit directions, local landmarks, parking, suburb-specific FAQs and facts.

> **Anti-doorway rule (critical):** Google penalizes near-duplicate "service in [suburb]" pages. **Do NOT** auto-generate all 6 services × 10 suburbs (60 pages). Each new page must earn its place with unique local detail (how to get there from *that* suburb, local references, distinct FAQs) — exactly like the two existing pages. Quality over matrix coverage.

**Recommended build order** — lead with the single highest-intent service (**screen**) for the nearest/highest-demand suburbs, add **battery** as the second service, then expand only where it's earning impressions (check GSC):

| Priority | Suburb | Proximity to shop | Est. local demand | Competition | Build (first service → second) |
|---|---|---|---|---|---|
| **Tier 1** | Hurstville | ~10 min drive (separate line) | High (major hub) | High | screen → battery |
| **Tier 1** | Beverly Hills | Adjacent, 1–2 stops | Medium–High | Medium | screen → battery |
| **Tier 1** | Narwee | Adjacent, 1 stop | Medium | **Low** | screen |
| **Tier 1** | Peakhurst | Adjacent (drive) | Medium | Low–Med | screen |
| **Tier 2** | Kingsgrove | 3 stops on T8 | Medium | Medium | screen → battery |
| **Tier 2** | Roselands | Short drive (Roselands centre) | Medium | Medium | screen |
| **Tier 2** | Punchbowl | Short drive | Medium | Medium | screen |
| **Tier 2** | Revesby | 2 stops east | Medium | Medium | screen |
| (existing) | Riverwood | — | — | — | screen ✅ (add battery) |
| (existing) | Padstow | — | — | — | battery ✅ (add screen) |

Narwee and Peakhurst are deliberately ranked high despite smaller populations: **low competition + true adjacency** = realistic local-pack/organic wins. Hurstville is high value but contested — worth it, but don't expect a fast win there.

**Per-page checklist** (mirror the existing two entries): unique `title`/`description`, suburb `h1`, real transit/driving directions from *that* suburb, `areaFacts`, 4–5 suburb-specific FAQs, a local CTA. Then add the suburb to the relevant service page's "near you" chips so it's internally linked.

### 6.2 Blog posts

1 of 6 is live (`screen-repair-cost-sydney`). The other 5 have titles + tags in `src/data/posts.js` (`slug: null`). Write them — each is a real informational query and an internal-linking opportunity:

| Post (title already drafted) | Target query | Internal links to |
|---|---|---|
| Battery draining fast? 7 fixes before replacing | "phone battery draining fast" | `/repairs/battery/`, battery suburb pages |
| Dropped your phone in water? First 10 minutes | "phone water damage what to do" | `/repairs/water-damage/` |
| OEM vs aftermarket screens | "oem vs aftermarket phone screen" | `/repairs/screen/` |
| Charging cable finicky? Probably lint | "phone not charging dirty port" | `/repairs/charging-port/` |
| Repair or upgrade? A simple framework | "is it worth repairing my phone" | `/repairs/`, `/repairs/battery/`, `/repairs/screen/` |

Each post should: target one query, answer it genuinely, link to 2–3 relevant service/suburb pages, end with a local CTA, and keep the `BlogPosting`/article schema consistent with the existing post.

### 6.3 Internal linking
- Service pages → relevant suburb pages ("near you" chips) and relevant blog posts.
- Blog posts → service + suburb pages (as above).
- Homepage → top service pages (already present) — ensure the priority suburbs are reachable within 2 clicks.

---

## 7. Pillar 4 — Local citations & links

NAP-consistent citations reinforce the map-pack signal. One-time batch, then leave.

### 7.1 Core citations (do once, exact NAP from `site.js`)
- **Apple Maps Connect** and **Bing Places** — claim both (most people forget these; they feed Siri/Maps and Bing/Copilot).
- **True Local**, **Yellow Pages AU (yellowpages.com.au)**, **Yelp AU**, **StartLocal**, **Hotfrog AU**, **Localsearch**, **Aussie Web**.
- **Facebook** + **Instagram** business pages (even if lightly used) — and add **every** profile URL to `sameAs` in `src/data/site.js` (currently empty). GBP URL goes in `sameAs` too.

> **Consistency is the whole point:** use the identical business name, `Shop 7C, Riverwood Plaza, 257 Belmore Rd, Riverwood NSW 2210`, and `(02) 9533 3300` everywhere. Inconsistent NAP across directories dilutes the signal.

### 7.2 Light link opportunities (opportunistic, low effort)
- **Brand/supplier pages:** if any parts supplier or brand lists authorised/partner repairers, get listed.
- **Riverwood Plaza** centre website store directory — ensure the shop is listed with a link.
- **Local community:** local Facebook groups, "best of Riverwood" type roundups, local school/sports newsletter sponsorships (often yield a backlink).
- Avoid paid link schemes / PBNs — risk outweighs reward for a local shop.

---

## 8. Technical SEO — small wins only

The base is strong; these are the only changes worth making (all on-site, action later):

- **`sameAs`** (`src/data/site.js`): add GBP, Facebook, Instagram URLs → strengthens entity reconciliation. *(Quick win.)*
- **Image filenames + alt text:** generic image filenames are fine, but ensure descriptive `alt` on repair/suburb images (e.g. "iPhone screen replacement at Riverwood Plaza"). Helps image search + accessibility.
- **Google Search Console + Bing Webmaster Tools:** verify the domain (DNS TXT via Cloudflare). This is prerequisite for §9 and surfaces real query data to prioritize §6. *(Do this in week 1.)*
- **Confirm sitemap coverage** after each content batch: `https://expressrepairs.com.au/sitemap-index.xml` should include every new suburb/blog page; submit it in GSC.
- **Core Web Vitals:** run a PageSpeed/CrUX check post-launch; the static Astro + non-blocking fonts setup should already pass — verify, don't pre-optimize.
- **Leave alone:** schema structure, canonical logic, the `/go/` `noindex` setup — all correct.

---

## 9. Measurement & KPIs

You can't improve leads you can't see. Set up tracking in week 1.

### 9.1 Instrumentation
- **Google Search Console** — queries, impressions, clicks, position by page; track the suburb terms.
- **Google Business Profile Insights** — calls, direction requests, website clicks, search queries that found you.
- **Web analytics** — GA4 or Cloudflare Web Analytics (already on Cloudflare) for site traffic + sources.
- **Lead tracking via `/api/lead`** — the contact form + booking widget POST here (emails the shop via Resend). Tag form submissions as the primary on-site conversion; optionally fire a GA4 event on success.
- **`/go/` UTM links** — the 4 `noindex` landing pages (`screen-repair`, `battery`, `water-damage`, `repairs`) are perfect campaign targets. Use UTM-tagged URLs for GBP/offline/QR so you can attribute calls and visits to GBP.
- **Call tracking** — at minimum, ask new customers "how did you find us?"; optionally a tracking number on GBP (be careful — must stay NAP-consistent; use a number that forwards and is listed as a secondary).

### 9.2 KPIs & targets (single location, realistic)

| Metric | Baseline | 30 days | 90 days |
|---|---|---|---|
| GBP profile completeness | Partial | 100% | 100% |
| New Google reviews / month | ~0 | 3–5 | Steady 4–8 |
| Indexed suburb pages | 2 | 6 | 10 |
| Published blog posts | 1 | 3 | 6 |
| GBP calls + direction requests | unknown (set baseline) | +20% | +50% |
| Form leads via `/api/lead` | set baseline | track | grow |
| "near me" / suburb pack visibility | low | priority suburbs appearing | Tier-1 suburbs in pack |

> Set baselines in week 1 (GBP Insights + GSC). Local-pack rank fluctuates by searcher location — measure trend, not a single snapshot.

---

## 10. Roadmap — 30 / 60 / 90 days

Sequenced by leverage. Effort tags: 🟢 low (one-time/templated) · 🟡 medium · 🔴 higher.

### Days 1–30 — Foundation & fastest wins (mostly off-site + setup)
1. 🟢 Set up **GSC + Bing Webmaster + GBP Insights baseline**; submit sitemap. *(Week 1 — unblocks measurement.)*
2. 🟢 **Complete the GBP profile** (§4.1) — categories, services, photos, description, hours, attributes, messaging.
3. 🟢 **Stand up the review engine** (§5.1) — QR card + SMS template; start asking at the counter.
4. 🟢 Add **`sameAs`** URLs in `site.js`; create/claim Facebook + Instagram if missing.
5. 🟢 Seed **GBP Q&A** (6–8) and write the **first month of GBP Posts** in one batch.
6. 🟡 Write **2 blog posts** from the stubs (start with battery + water-damage — high-intent).

### Days 31–60 — Content depth (on-site)
7. 🟡 Build **Tier-1 suburb pages** — Hurstville, Beverly Hills, Narwee, Peakhurst (screen first), each with unique local copy per §6.1.
8. 🟡 Add the **second-service** pages where it makes sense (battery for Riverwood; screen for Padstow).
9. 🟢 **Core citations** batch (§7.1) — Apple Maps, Bing Places, True Local, Yellow Pages, Yelp AU, etc., exact NAP.
10. 🟡 Write **2 more blog posts**; add internal links from services/suburbs.
11. 🟢 Once real reviews accrue, **wire `rating.count`** + refresh `LOCAL_REVIEWS` (§5.3); remove placeholder testimonial.

### Days 61–90 — Expand & compound
12. 🟡 Build **Tier-2 suburb pages** (Kingsgrove, Roselands, Punchbowl, Revesby) — but **only** where GSC shows impressions/intent; keep anti-doorway discipline.
13. 🟡 Finish the **remaining blog posts** (6 total live).
14. 🟢 Maintain GBP cadence (posts, photos, review responses).
15. 🟢 **Review §9 metrics**, double down on whatever suburb/service is converting, prune/improve anything flat.

**Ongoing (minimal effort, the only recurring tasks):** respond to reviews (~5 min/review), 1 GBP post per 1–2 weeks (batched monthly), keep asking for reviews at the counter, monthly metrics glance.

---

## Appendix A — Suburb priority quick reference

Build order: **Hurstville · Beverly Hills · Narwee · Peakhurst** (Tier 1) → **Kingsgrove · Roselands · Punchbowl · Revesby** (Tier 2). Lead service = **screen**; second = **battery**. Backfill **battery/Riverwood** and **screen/Padstow** on the two existing suburbs. Every page must carry unique local copy (transit, landmarks, parking, suburb FAQs) — no auto-generated matrix.

## Appendix B — Keyword shortlist by page

- **Homepage / GBP:** phone repair riverwood, phone repair near me, mobile phone repair riverwood plaza
- **`/repairs/screen/`:** phone screen repair, iphone screen repair, cracked screen repair, samsung screen replacement
- **`/repairs/battery/`:** phone battery replacement, iphone battery replacement, samsung battery replacement
- **`/repairs/[service]/[suburb]/`:** [service] repair [suburb], iphone repair [suburb], phone repair near [suburb]
- **Blog:** screen repair cost sydney ✅, phone battery draining fast, phone water damage what to do, oem vs aftermarket screen, phone not charging port, repair or upgrade phone

## Appendix C — Templates

**Review-request SMS (after pickup):**
> Hi [name], thanks for choosing Xpress Phone Repairs at Riverwood Plaza! If you're happy with the repair, a quick Google review really helps a small local shop: [g.page review link]. Cheers, the team.

**Review response — positive:**
> Thanks [name]! Glad we could get your [device] sorted same-day. See you next time — and tell your Riverwood mates! 🙌

**Review response — negative:**
> Hi [name], sorry this didn't meet expectations. We'd like to make it right — please call us on (02) 9533 3300 or pop into Shop 7C and ask for the manager. We stand behind every repair with our 6–12 month warranty.

**GBP Post ideas (rotate):**
> ⚡ Cracked screen? Most iPhone & Samsung screens fixed in 30–60 min at Riverwood Plaza. Free diagnostic, 6–12 month warranty. Walk in Mon–Sat. [Book / Call]
> 🔋 Phone dying by lunchtime? Same-day battery replacement from $59. Drop it off, do your shopping, pick it up charged. [Directions]
> 💧 Dropped your phone in water? Skip the rice — bring it in fast. Free assessment. [Learn more → water-damage page]

## Appendix D — Citation checklist

Apple Maps Connect · Bing Places · Google Business Profile (link in `sameAs`) · Facebook · Instagram · True Local · Yellow Pages AU · Yelp AU · StartLocal · Hotfrog AU · Localsearch · Aussie Web · Riverwood Plaza store directory.
NAP everywhere, identical: **Xpress Phone Repairs** · Shop 7C, Riverwood Plaza, 257 Belmore Rd, Riverwood NSW 2210 · (02) 9533 3300.
