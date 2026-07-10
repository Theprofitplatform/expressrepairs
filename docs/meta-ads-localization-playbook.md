# Meta Ads — Localization & Optimization Playbook

_Account: **Xpress Repair** (`1909285833096577`, AUD) · Page `1156397807557737` · Pixel/dataset **`28525940300327696`** ("Xpress Repairs Web")_
_Snapshot: first ~7 days of delivery (to 25 Jun 2026). Spend $187.15 · 12,093 impr · 196 clicks · CTR 1.62% · CPC $0.95._

This is the working doc for making the ads **more local** and fixing two tracking/budget
issues found during the audit. Store NAP used throughout: **Shop 7C, Riverwood Plaza,
257 Belmore Rd, Riverwood NSW 2210 · 0415 303 300 · 4.9★ (17) · 1,000+ locals**.

---

## 1. Current account structure (so we localize the right things)

| Campaign | Ad set | Optimise | Geo (now) | Budget | Spend | Result |
|---|---|---|---|---|---|---|
| Calls — Riverwood (Scheduled) | `…286960777` Riverwood **15 km** — Calls | QUALITY_CALL | 15 km radius | $360 lifetime, day-parted | $151.22 | 10 calls @ **$15.12** |
| Landing Pages — Leads | `…416630777` LP Test — All services (**8 km, mobile**) | LANDING_PAGE_VIEWS | 8 km radius, **mobile only** | $20/day | $32.94 | 32 LP views @ $1.03 |
| Calls — Riverwood (dup) | paused | — | — | — | $2.99 | 0 |
| Riverwood — Traffic | paused | — | — | — | $0 | — |

**Best performers to build on:**
- **Call — Screen Before/After (Challenger)** → 6 calls @ **$9.76** (2.4× cheaper than the $99-offer ad). Winner.
- **LP — Screen Repair** → CTR **3.88%**, $0.80 / landing-page view. Best engagement.

---

## 2. Two findings that change the plan (read first)

### 2a. "Shift budget to the Leads ads" — budget is **not** the bottleneck
The Leads ad set has a **$20/day** cap but spent only **$32.94 in ~7 days (~$4.70/day)**. It is
**under-delivering its existing budget**, so adding budget does nothing. The real limiter is the
narrow setup: **8 km radius + mobile-only + optimising for landing-page views**.

**Do this instead (in order):**
1. **Enable Advantage+ placements** on this ad set — Meta's Opportunity Score (account = **83/100**)
   estimates **−25% cost per landing-page view**. (Removes the manual placement restriction.)
2. **Drop the mobile-only restriction** (let it serve desktop + tablet) to widen delivery.
3. Once it actually spends $20/day with headroom, **then** raise the budget.

### 2b. "Wire up the Pixel Lead event" — it's **already wired in code**
- `src/data/tracking.js` → `metaPixelId: '28525940300327696'` ✅ (matches the live dataset)
- `src/components/AdTracking.astro` fires `fbq('track','Lead')` on the `lead-success` event and
  `fbq('track','Contact')` on every `tel:` tap. ✅
- `src/components/LandingForm.jsx` dispatches `lead-success` on a successful submit. ✅

So the browser pixel **should** be sending `Lead` on form submit and `Contact` on call taps. The
gaps that remain are **configuration, not code**:
1. **Verify** `Lead` / `Contact` events are actually arriving (Events Manager → dataset
   `28525940300327696` → Test events / Overview). The audit could read the dataset but not yet
   confirm event volume.
2. The Leads ad set optimises for **LANDING_PAGE_VIEWS**, not the **Lead** pixel event — that's why
   results read "landing page views." Once ~15–30 `Lead` events/week are landing, switch the ad set
   to **Conversions → Lead** so Meta optimises toward real callbacks.
3. **Server-side (Conversions API) has never fired** (`server_last_fired_time` = never). Browser-only
   tracking loses ~10–30% of events to ad-blockers/iOS. Optional but worth adding later via the
   Cloudflare Pages Function that already handles `/api/lead`.

---

## 3. Localization — the part you asked for

You already have **15 suburb landing pages** built for SEO. The ads currently ignore them and target
one "Riverwood" blob. Three levers, in priority order (biggest ROI first):

### Lever 1 — Localize the creatives (works at any budget; do this first)
Your single best ad (the before/after challenger) has an **empty body** and a generic "Xpress Repairs"
headline — zero local signal. Localized, proof-led copy is the cheapest win. Paste-ready copy in §4.

### Lever 2 — Point ad traffic to the matching suburb page
Map each localized ad → its suburb landing page (full list in §5). A "screen repair Padstow" ad should
land on `…/repairs/screen/padstow/`, which already has Padstow-specific copy, travel directions and
FAQs. (For *call* ads the CTA is tap-to-call, so the page matters less — but for the Leads/Traffic side
it matters a lot.)

### Lever 3 — Tighten + align the geo targeting (the "radius guide", §6)
Match the ad geography to your real catchment and your SEO suburb footprint.

> **Recommendation on "suburb-specific ad sets":** at ~$27/day total spend, splitting into 10–15
> suburb ad sets would **fragment the budget** — each ad set needs volume to exit Meta's learning
> phase, and tiny ad sets never do. **Better:** keep **one** local ad set per objective (Calls / Leads)
> with localized *creatives* + suburb *landing pages*. Add genuinely separate suburb ad sets only as a
> Phase 2 once daily spend is higher. The build recipe for those is in §7 for when you're ready.

---

## 4. Paste-ready localized creative copy

CTA = **Call Now** (`0415 303 300`) for call ads, **Learn More** → suburb page for traffic ads.
Primary text first, then **Headline**.

### A. Fix the winning challenger (currently blank) — Call ad
> Cracked screen? See the before & after. 📱 We replace most phone screens in **30–60 min while you
> wait** — right here at **Riverwood Plaza** (Shop 7C, 257 Belmore Rd). Original-quality parts,
> 6–12 month warranty, free diagnostic. Rated **4.9★ by 1,000+ local customers**.
> 📞 Tap **Call Now** — 0415 303 300.

**Headline:** Same-Day Screen Repair — Riverwood Plaza

### B. Local call ad — broad "phone repairs"
> 📱 Cracked screen, dead battery, dud charging port? Get it sorted **today** at **Xpress Phone Repairs,
> Riverwood** — inside Metro Wireless, Shop 7C / 257 Belmore Rd. iPhone, Samsung, Pixel & more, most
> done while you wait. Free diagnostic · no fix, no fee · 6–12 mo warranty. **4.9★, 1,000+ locals.**
> 📞 Tap **Call Now**: 0415 303 300.

**Headline:** Phone Repairs in Riverwood — Call Today

### C. Suburb traffic ad — Screen, per suburb (→ `…/repairs/screen/<suburb>/`)
Swap `{Suburb}` and the travel line per suburb (travel facts from §5):
> Cracked screen in **{Suburb}**? We're {travel} at **Riverwood Plaza** — most screens replaced in
> **30–60 min** with original-quality parts, fitted, tested and warrantied while you wait. Free
> diagnostic, no fix–no fee. **4.9★, 1,000+ St George locals.**

**Headline:** Same-Day Screen Repair near {Suburb}

Examples for the travel line:
- **Padstow** — "one stop up the T8"
- **Narwee** — "literally the next station"
- **Beverly Hills** — "two stops down the T8"
- **Peakhurst** — "about 5 minutes up Forest Rd"
- **Hurstville** — "a short drive — and free parking (skip the Westfield queues)"

### D. Suburb traffic ad — Battery (→ `…/repairs/battery/<suburb>/`; pages exist for Padstow, Riverwood, Hurstville, Beverly Hills, Kingsgrove)
> Phone dying before lunch in **{Suburb}**? A fresh, quality battery brings it back to all-day life —
> fitted in **30–45 min** at **Riverwood Plaza**, {travel}. Warranty included, free battery health
> check. **4.9★, 1,000+ locals.**

**Headline:** Same-Day Battery Replacement near {Suburb}

---

## 5. Suburb landing pages (ad destinations)

Base: `https://expressrepairs.com.au`

| Suburb | Screen page | Battery page | Travel (for copy) |
|---|---|---|---|
| Riverwood | `/repairs/screen/riverwood/` | `/repairs/battery/riverwood/` | at Riverwood Plaza |
| Padstow | `/repairs/screen/padstow/` | `/repairs/battery/padstow/` | 1 stop on the T8 / ~5 min |
| Narwee | `/repairs/screen/narwee/` | — | next station, 1 stop |
| Beverly Hills | `/repairs/screen/beverly-hills/` | `/repairs/battery/beverly-hills/` | 2 stops / ~7 min |
| Kingsgrove | `/repairs/screen/kingsgrove/` | `/repairs/battery/kingsgrove/` | 3 stops / ~10 min |
| Peakhurst | `/repairs/screen/peakhurst/` | — | ~5 min up Forest Rd |
| Revesby | `/repairs/screen/revesby/` | — | 2 stops / ~7 min |
| Roselands | `/repairs/screen/roselands/` | — | ~8 min via King Georges Rd |
| Punchbowl | `/repairs/screen/punchbowl/` | — | ~8 min |
| Hurstville | `/repairs/screen/hurstville/` | `/repairs/battery/hurstville/` | ~10 min, free parking |

Lean conversion pages (current ad destinations, all "Riverwood Plaza"): `/go/screen-repair/`,
`/go/battery/`, `/go/water-damage/`, `/go/repairs/`.

---

## 6. Targeting / radius guide (apply in Ads Manager)

The shop pin: **Riverwood Plaza, 257 Belmore Rd** (lat `-33.9522`, lng `151.051`).

**Current:** Calls = 15 km radius · Leads = 8 km radius, mobile-only.

**Recommended:**
1. **Calls ad set** — tighten **15 km → 10 km**. 15 km reaches the CBD fringe and Bankstown; for a
   walk-in/same-day shop those clicks rarely convert to a visit. 10 km still covers every suburb you
   have a page for.
   - Ads Manager → ad set → **Audience → Locations** → drop pin on the address → set radius **10 km**.
2. **Leads ad set** — keep the radius **but**:
   - **Edit → Placements → Advantage+ placements** (turn on). _(−25% cost/LP view per Opportunity Score.)_
   - **Devices: All** (remove mobile-only).
3. **Optional — align to your SEO footprint** instead of a plain radius: add these as **included
   locations** (type each suburb): Riverwood, Padstow, Narwee, Beverly Hills, Peakhurst, Kingsgrove,
   Revesby, Roselands, Punchbowl, Hurstville. This makes the ad geography mirror the 15 suburb pages.
4. **Age/gender:** leave broad (Advantage+ Audience) — at this budget, manual narrowing just starves
   delivery.

---

## 7. Phase-2 recipe: genuine suburb-specific ad sets (when daily spend grows)

Only worth it once you can give each ad set ≥ ~$10/day. Per suburb:
- **Campaign:** reuse the Leads (OUTCOME_LEADS) campaign.
- **Ad set:** name `Leads — {Suburb} — Screen`; **Locations** = just that suburb (or a 3–5 km pin);
  optimise **Conversions → Lead** (after §2b is verified) or **Landing Page Views** to start;
  Advantage+ placements ON.
- **Ad:** localized creative from §4C/§4D → suburb page from §5.
- Start with the **3 highest-intent nearby suburbs**: Padstow, Beverly Hills, Peakhurst. Add more only
  if they beat the single-ad-set baseline.

---

## 8. Assets built (all PAUSED — review & activate in Ads Manager)

Created via API on 2026-06-26. Facebook **and** Instagram (auto-attached **@xpressrepairs.riverwood**).

**Calls ad set** (`120254605286960777`):
| Ad | Creative | Image | Lands on |
|---|---|---|---|
| Call — Screen Before/After (LOCALIZED challenger) | `841454518818259` | before/after (proven) | `/go/screen-repair/` |
| Call — $99 Screen Offer (HONEST — from $99, varies by model) | `1569550828063097` | before/after | `/go/screen-repair/` |

**Leads ad set** (`120254958416630777`):
| Ad | Creative | Image | Lands on |
|---|---|---|---|
| LP — Screen — Padstow | `1744134293681546` | before/after | `/repairs/screen/padstow/` |
| LP — Screen — Beverly Hills | `3287472954792797` | before/after | `/repairs/screen/beverly-hills/` |
| LP — Screen — Peakhurst | `2096006608003603` | before/after | `/repairs/screen/peakhurst/` |
| LP — Battery — Padstow | `1533073231603011` | battery photo | `/repairs/battery/padstow/` |
| LP — Battery — Beverly Hills | `1012596515033845` | battery photo | `/repairs/battery/beverly-hills/` |
| LP — Battery — Hurstville | `2459509884516641` | battery photo | `/repairs/battery/hurstville/` |

> ⚠️ The Leads ad set now holds these 6 + existing LP ads. **Don't run all at once** at this budget —
> activate ~3–4 fresh ads max (e.g. the 3 screen suburb ads, or rotate screen→battery). Too many ads
> starves each of the volume it needs to learn.

**Pricing note (§4):** callers were anchoring on "$99" (the *cheapest* model; iPhone/Samsung cost more).
Ads keep "from $99" + "final price depends on your model, quoted free" — **no specific upper range** until
the Lightspeed price reconciliation lands. Landing page `/go/[lp].astro` got a number-agnostic
"Price varies by model — free exact quote" caveat under the hero price tag (**in working tree, NOT
deployed** — ship it with the pricing fix to avoid a parallel-agent collision).

## 9. Owner action checklist

**In Ads Manager (only you can do these — API can't safely edit live targeting/placements):**
- [ ] §2a Leads ad set: **Advantage+ placements ON**, **devices = All** (do this *before* any budget change)
- [ ] Activate the localized ads (run the challenger *alongside* the original — don't delete it)
- [ ] §6 Calls radius **15 km → 10 km**; (optional) swap radius for the 10-suburb list
- [ ] Tick the **Instagram account** on each new ad if you want to confirm IG identity (already auto-attached)
- [ ] §2b Verify `Lead`/`Contact` events in Events Manager (dataset `28525940300327696`)
- [ ] §2b When volume allows, switch the Leads ad set to optimise **Lead** (not landing-page views)

**In the repo / deploy:**
- [ ] Deploy the `/go/[lp].astro` "varies by model" caveat **with** the Lightspeed pricing fix
- [ ] (Later) Add server-side Conversions API on the `/api/lead` Pages Function

**Done (by Claude):** localized challenger + honest $99 ad, 3 screen + 3 battery suburb ads (all paused,
FB+IG); landing-page price caveat (working tree); 5-day performance re-check scheduled for **2026-07-01**
(routine `trig_01L6MGM8gzAtDjUDCPjTemSN`).

**The 3 ads stuck `WITH_ISSUES` are NOT a creative problem** (diagnosed 2026-06-26). All three
(`Ad — $99 Screen Offer`, `Ad — iPhone Repair`, `Ad — Brand graphic`) share one error: *"can't activate
— no valid funding source / payment method."* They live in the **paused Traffic campaign**
`120254600844840777` (ad set `120254600915330777`) — an older campaign superseded by the Calls + Leads
campaigns. The account otherwise has a valid card and is actively spending, so this is almost certainly a
**stale flag** from before a payment method was added. **Fix:** Ads Manager → **Billing & Payment
settings**, confirm the card is current; the flag clears when the campaign/ad is next activated. No copy
changes needed — and you likely don't need this old Traffic campaign at all (safe to leave paused/archive).
