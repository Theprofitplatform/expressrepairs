# Plan — device-model SEO landing pages

**Date:** 2026-07-30
**Status:** proposed, awaiting decision
**Origin:** owner request — "SEO landing pages per device model / suburb generated from a template and your repair pricing"

---

## Summary of the recommendation

Build the **model** axis. Do **not** build the **model × suburb** axis.

Ahrefs AU data (30 July 2026) says the model axis has ~14,000 searches/month at
difficulty 0–5, and the model × suburb axis has zero — not "low", zero, and mostly
not even present in Ahrefs' keyword index. Generating the cross-product would be
~1,400 pages competing for nothing, using the exact page pattern Google names in
its spam policy.

Recommended first slice: **6 pages**, phased, with a stated kill criterion before
we commit to the rest.

---

## 1. Research

### 1a. The model axis is real, and battery is where the volume is

Screen, AU, from `keywords-explorer-matching-terms`:

| Keyword | Vol/mo | KD |
|---|---|---|
| iphone screen repair | 1,000 | 35 |
| iphone screen repair sydney | 900 | 7 |
| iphone screen repair cost | 300 | 4 |
| iphone 11 screen repair | 250 | 0 |
| iphone 13 / 15 / x / xr / xs / 12 / 13 pro max screen repair | 150 each | 0–2 |
| iphone 14 / 12 pro / xs max / 14 pro max / 13 pro / 11 pro screen repair | 90–100 each | 0–2 |

Battery, same source — **substantially bigger, and even easier**:

| Keyword | Vol/mo | KD |
|---|---|---|
| iphone battery replacement | **2,300** | 4 |
| iphone battery replacement cost | **1,100** | 3 |
| iphone 13 battery replacement | **1,100** | 1 |
| iphone 12 battery replacement | 800 | 3 |
| iphone 14 pro battery replacement | 700 | 2 |
| iphone 11 battery replacement | 700 | 5 |
| iphone battery replacement cost australia | 700 | 2 |
| iphone 13 pro battery replacement | 600 | 3 |
| iphone 14 pro max battery replacement | 500 | 5 |
| iphone 14 / 13 pro max battery replacement | 450 each | 0 |
| iphone 11 battery replacement cost | 350 | 0 |
| iphone 12 mini / 12 pro max / 15 pro max battery replacement | 300 each | 0–1 |
| iphone 15 pro / 12 pro / 15 battery replacement | 250 each | 0–4 |
| iphone 7 / 8 / 13 mini battery replacement | 200 each | 0 |

Battery beats screen roughly **6 : 1** on the same handset. That inverts the
assumption baked into the current site, where screen is the hero service.

### 1b. The model × suburb axis does not exist

`keywords-explorer-overview`, AU:

| Keyword | Vol/mo |
|---|---|
| iphone screen repair riverwood | **0** |
| iphone 11 screen repair riverwood | not indexed |
| phone repair riverwood | not indexed |
| screen repair beverly hills | not indexed |

Two independent problems with building it anyway:

1. **No demand.** 9 generations × 12 suburbs × 2 repairs ≈ 216 pages minimum, and
   1,400+ if split by variant. All targeting zero.
2. **Active penalty risk.** Google's spam policy defines doorway pages as, in its
   own words, "multiple pages where the content varies only by city name". A
   template that swaps a suburb into otherwise identical copy is a textbook match.
   The site is DR 0.4 with an already-spammy 400-domain backlink profile — it has
   no authority buffer to absorb a site-wide quality signal, and 2 ranking
   keywords to lose.

**Decision: the suburb axis is done.** 17 suburb pages exist, they were written to
the anti-doorway spec with genuinely distinct copy, and that is the right number.
Adding suburbs is not a lever; the map pack is (see the GBP work in
`seo-offsite-kit.md`).

### 1c. The SERP is beatable at the bottom

`serp-overview` for **iphone 13 battery replacement** (1,100/mo, KD 1):

| Pos | Result | DR |
|---|---|---|
| 1 | support.apple.com | 97 |
| 3 | ifixit.com (DIY guide) | 83 |
| 4 | reddit.com thread | 95 |
| 5 | macfixit.com.au (mail-in only) | 40 |
| 7 | onlinemobileparts.com.au | **8** |
| 8 | fix2u.com | **17** |
| 9 | kixup.com.au | **3** |
| 10 | gadgetparts.com.au | **10** |

Two things to take from this:

- **#1 is unwinnable.** Apple owns it. Anyone promising you position 1 on these
  terms is selling something.
- **Positions 5–10 are held by DR 3–17 sites, and three of them sell parts rather
  than repairs.** Google is padding the page with a DIY guide, a Reddit thread, a
  US blog, an India post and a South African site — it cannot find enough good
  Australian commercial results. That is the actual opening: not outranking Apple,
  but being the best *"an Australian shop will do this for you today for $X"*
  result on a page that currently has almost none.

### 1d. The uncomfortable prior

The site already has ~30 SEO pages — 6 service, 17 suburb, blog posts — and ranks
for **2 keywords with ~15 visits/month**. More pages is precisely the thing that
has already been tried here and did not work.

So this plan has to answer *why would these be different*, and the answer has to
be better than "these ones are good". It is:

- The existing 30 pages target **geo** terms of 0–60/mo, and are competing against
  the map pack, which occupies the top of every local SERP before organic results
  begin. They are fighting for scraps behind a wall.
- These target **national device** terms of 150–2,300/mo where there is no map
  pack at all, and where the bottom half of page 1 is DR 3–17.

That is a genuinely different game. But it remains a hypothesis until GSC shows
impressions, which is why this plan is phased with a kill criterion rather than
shipping 18 pages on faith.

---

## 2. Design decisions

### 2a. One page per generation, not per variant

iPhone 13, 13 mini, 13 Pro and 13 Pro Max all cost **$149 screen / $119 battery** —
verified against `MODEL_PRICES` in `src/data/services.js`. Four pages would carry
four identical price tables and near-identical prose, which is thin content and
re-creates the doorway problem one axis over.

One page per generation, naming every variant explicitly in the H1, table and
FAQs, is eligible for all four queries. Combined that is 2,350/mo of battery
demand pointed at one strong page instead of four weak ones.

### 2b. Split by repair, not by variant

Battery and screen are different searches with different intent:

- **Battery** searchers are researching — "is it worth it", "what does it cost",
  "how do I know". Note that `iphone battery replacement cost` alone is 1,100/mo.
- **Screen** searchers have a broken phone in their hand right now.

One page cannot lead with both. So: `/repairs/iphone-13-battery/` and
`/repairs/iphone-13-screen/`, each covering all variants of that generation.

### 2c. What stops these being mail-merge

A generator that swaps a model name into shared prose is the same doorway problem
with a different variable. Each page must carry something true about *that
generation's* repair that is not true of the others. These are real and already
drafted (`stash@{0}`):

| Generation | The thing that is actually different |
|---|---|
| iPhone 17 | Current generation — parts not always in stock, call first |
| iPhone 16 | Camera Control button sits in the display assembly path; tested with the screen |
| iPhone 15 | First USB-C iPhone; comes in for charging faults more than screens, often a free clean |
| iPhone 14 | Apple redesigned 14 / 14 Plus so the rear glass comes off alone — back glass is far less work. Pro and Pro Max kept the old build |
| iPhone 13 | Face ID was originally tied to the display; Apple removed that in iOS 15.2 |
| iPhone 12 | MagSafe magnet array sits behind the rear glass, damaged by drops with the glass intact |
| iPhone 11 | Most common phone on the bench; mostly batteries now, most are past 800 cycles |
| iPhone X/XR/XS | XR is LCD, X and XS are OLED — which is why the XR screen is the cheapest of the three |
| iPhone 8/7/SE | Touch ID is factory-paired to the home button. Button intact, we transfer it. Button destroyed, nobody can restore Touch ID |

**Rule for this build: no page ships without one of these.** If we cannot say
something true and specific about a generation, that page does not get made. That
is the line between a landing page and a doorway page, and it is also just the
reason someone would rather read our page than a parts shop's.

### 2d. Prices come from one place

Rows are generated from `MODEL_PRICES` in `src/data/services.js` — the same data
the booking widget quotes from. No second copy of the pricing, so a price change
moves the widget, the model pages and `prices.test.js` together. This is the
"generated from your repair pricing" part of the original request, and it is the
part worth keeping.

---

## 3. Proposed build

### Phase A — battery, 6 pages (recommended first)

Battery leads because it is ~6× the volume at equal or lower difficulty.

| Page | Primary keyword | Vol/mo | KD | Also targets |
|---|---|---|---|---|
| `/repairs/iphone-13-battery/` | iphone 13 battery replacement | 1,100 | 1 | 13 Pro (600), 13 Pro Max (450), 13 mini (200) |
| `/repairs/iphone-14-battery/` | iphone 14 pro battery replacement | 700 | 2 | 14 Pro Max (500), 14 (450) |
| `/repairs/iphone-12-battery/` | iphone 12 battery replacement | 800 | 3 | 12 mini (300), 12 Pro Max (300), 12 Pro (250) |
| `/repairs/iphone-11-battery/` | iphone 11 battery replacement | 700 | 5 | 11 cost (350), 11 Pro Max (150) |
| `/repairs/iphone-15-battery/` | iphone 15 pro max battery replacement | 300 | — | 15 Pro (250), 15 (250) |
| `/repairs/iphone-8-battery/` | iphone 8 battery replacement | 200 | 0 | iphone 7 (200) |

Addressable: **~7,400/mo**, difficulty 0–5.

### Phase B — retitle what already exists (do at the same time, ~15 min)

`/repairs/iphone-battery/` shipped in PR #56 aimed at "iphone battery replacement
**sydney**" — 70/mo. The unqualified "iphone battery replacement" is **2,300/mo at
KD 4** and "iphone battery replacement cost" is **1,100/mo at KD 3**. The page is
already built and already publishes real prices, which is exactly what a cost
query wants. This is a title, H1 and intro change on an existing page for a 30×
bigger target — the cheapest item in this document by a wide margin.

Same applies to `/repairs/iphone-screen/`: "iphone screen repair cost" is 300/mo
at KD 4 and the page has the full price table already.

### Phase C — screen, 6 pages (only if Phase A shows movement)

Same six generations, screen instead of battery. ~1,200/mo addressable.

### Phase D — Samsung (needs research first)

`samsung screen repair` is 300/mo at KD 0 and `samsung s23 screen repair` is
90/mo, but I have not pulled the Galaxy model long tail yet. Do that research
before committing. Note Samsung repair economics differ — genuine parts at
Samsung AU pricing means $211–525, so the page argument is "genuine part, honest
price", not "cheap".

### Explicitly out of scope

- **Model × suburb pages.** Zero demand, doorway risk. See §1b.
- **Per-variant pages** (13 Pro separate from 13). Identical prices, nothing
  distinct to say. See §2a.
- **More suburb pages.** 17 is enough; the map pack is the lever there.
- **Android tablets / other brands.** Parts availability too variable to publish
  a price we can honour.

---

## 4. Guardrails

Tests, so this cannot rot the way the GBP kit prices did:

1. `prices.test.js` already pins `fromAmount` and `schemaPrice` to the cheapest
   row — the generator computes both, so they cannot drift.
2. **New:** every model page's price must equal the `MODEL_PRICES` entry for every
   variant it claims to cover. Catches a page saying $149 after the data says $159,
   and catches a variant being silently added to a generation at a different price.
3. **New:** every model page must have a non-empty generation-specific `note` and
   `extraFaq` — the mechanical enforcement of §2c.
4. `gbpKit.test.js` must exclude model pages from the GBP service table (GBP lists
   services by job, not by handset). Already drafted.

## 5. Kill criterion

The reason the existing 30 pages are a cautionary tale is that nobody set one.

**Set up Google Search Console first** — it is not currently connected, so we are
flying blind and the Ahrefs `gsc-*` endpoints return nothing. Then:

> If Phase A's 6 pages have not registered **impressions in GSC for their primary
> keywords within 8 weeks** of indexing, stop. Do not build Phase C or D.

Impressions, not clicks, and not rankings — impressions are the earliest honest
signal that Google considers the page a candidate at all. If they do not appear,
the constraint is domain authority, not page count, and the answer is the link and
GBP work rather than more pages.

## 6. Effort

| Item | Effort |
|---|---|
| Phase B retitles | ~15 min |
| Generator + guard tests | ~1 hr (mostly drafted in `stash@{0}`) |
| Phase A — 6 battery pages | ~2 hrs, most of it writing the generation-specific content |
| Phase C — 6 screen pages | ~1.5 hrs |
| Phase D — Samsung research + pages | ~2 hrs, gated on the research |

## 7. Honest expected outcome

Not position 1 — Apple owns that on every one of these terms. The realistic target
is positions 5–10 on several of them, displacing DR 3–17 parts shops that are not
even offering a repair service. At 1,100/mo, position 7 is roughly 25–40 visits a
month from one page, and those visitors are people whose battery is dying who have
just read our actual price.

Across Phase A, that is plausibly 150–400 visits/month within 3–6 months, against
the current 15. It is also entirely possible that DR 0.4 keeps these pages out of
the top 10 regardless of quality — which is what the kill criterion is for, and
why the GBP and local-link work stays the higher priority in the meantime.

---

## Decisions needed

1. Phase A as scoped (6 battery pages), or a smaller trial (say the top 2) first?
2. Phase B retitles — do now, alongside PR #56, or separately?
3. Confirm Google Search Console gets connected before Phase A ships, so the kill
   criterion is actually measurable.
