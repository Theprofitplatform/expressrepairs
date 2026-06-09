# expressrepairs.com.au — SEO Content Site Design

**Date:** 2026-06-09
**Status:** Approved (design); pending implementation plan
**Author:** Abhi + Claude

---

## 1. Context

`expressrepairs.com.au` is a **real local phone-repair shop**. The current live site
is a no-build React SPA on Cloudflare Pages: `index.html` loads React 18 (UMD) +
Babel Standalone from `unpkg.com` and transpiles six `.jsx` files **in the browser**.
A faithful mirror was reconstructed into this repo on 2026-06-09 (the original source
was not on disk).

The current data (`public/src/data.jsx`) is **placeholder** — demo address
("Shop 12, 100 Main Street, Sydney NSW 2000"), generic phone (`1300 373 773`), and
stock `pravatar.cc` testimonials. Real business details must replace these before launch.

The site is being repurposed as an **SEO acquisition engine** for the shop. The
browser-side Babel SPA is actively bad for SEO (slow Core Web Vitals, JS-dependent
rendering), so the rebuild is part of the goal, not incidental.

## 2. Goals

- Rank for **high-intent local search** ("[repair] [suburb]", "phone repair near me").
- Publish a **steady blog** for top-of-funnel discovery.
- **Hands-off** content production: a scheduled job generates and publishes content with
  no manual review step, protected by automated quality gates.
- Keep the existing **brand/design** (reuse `styles.css` and React components).
- **No Gemini quota usage** — Claude writes the content.

## 3. Non-Goals

- No migration to WordPress or any CMS (stays static on Cloudflare Pages).
- No reuse of the clawdbot content-pipeline / Cebu infrastructure (that publishes via
  WP/Shopify REST and burns Gemini quota; expressrepairs is a separate project).
- No mass programmatic suburb pages (doorway-page risk — see §6).
- Google Business Profile management is out of scope for this build (it's the other
  half of local SEO, handled separately).

## 4. Decisions (locked)

| Decision | Choice |
|---|---|
| Site type | Real local business, real shop |
| Content produced | Local service×suburb pages **+** blog |
| Homepage | Rebuild fully in Astro (static), reusing existing React components + `styles.css` |
| Publish loop | **Scheduled / hands-off**, protected by build gate + validation + notify + revert |
| Generator location | **VPS cron** (`claude -p`) → git push → Cloudflare builds |
| Content author | Claude (no Gemini quota) |

## 5. Architecture & Stack

- **Astro** (static site generation) deployed on **Cloudflare Pages**, git-connected
  for push-to-deploy.
- **`@astrojs/react`** integration to render existing React components to static HTML at
  build time. The booking form remains a hydrated client island (`client:visible` or
  `client:idle`); everything else ships zero JS.
- **`styles.css`** carried over as-is to preserve the current visual design.
- **`@astrojs/mdx`** for blog content; **`@astrojs/sitemap`** for sitemap generation.
- Output is fully static HTML → fast, reliably indexable.

### Confirm before deploy wiring
The live origin is either a **Cloudflare Pages** project (SPA fallback) or a **Worker**.
Resolve via `wrangler login` → `wrangler pages project list` (empty ⇒ it's a Worker).
The new Astro build must deploy to the **existing** project bound to the domain — never a
new one (would create a duplicate not attached to `expressrepairs.com.au`).

## 6. Content Model

Structured data from `data.jsx` moves into typed `src/data/` modules (one source of
truth): `site.ts` (NAP), `brands.ts`, `services.ts` (repair types + per-brand pricing),
`plans.ts`, `accessories.ts`, `testimonials.ts`, `faqs.ts`, `hours.ts`, `suburbs.ts`.

Three page families:

| Family | Route pattern | Generated from |
|---|---|---|
| Service pages | `/repairs/<service>/` | template + pricing data (one per repair type: screen, battery, backglass, port, camera, water, speaker) |
| Local pages | `/repairs/<service>/<suburb>/` | `getStaticPaths` over curated suburb list × services |
| Blog | `/blog/<slug>/` + `/blog/` index + tag pages | MDX in `src/content/blog/` |

### Anti-doorway-page constraints (critical)
Local pages carry the real SEO penalty risk. Rules:
- **Curated suburb list** of the shop's actual service area (~10–20 suburbs), defined in
  `suburbs.ts`. NOT every NSW suburb.
- Each local page must contain **unique, substantive copy** (generated once and stored),
  not a find-and-replace of the suburb name into a shared template.
- Pages include genuinely useful local detail: pricing table, relevant FAQs, NAP, map,
  travel/area context. Thin pages are dropped, not shipped.

## 7. Publish Engine (Phase 3)

```
VPS cron
  → claude -p  (writes ONE MDX post or one local-page copy block;
                prompt includes site data + brand voice + topic from queue)
  → validate   (frontmatter complete, internal links resolve, word-count floor,
                no placeholder strings, required schema fields present)
  → git commit (specific file) + git push
  → Cloudflare Pages builds
        └─ build fails on malformed content ⇒ NO deploy  (primary safety gate)
  → Discord notification with the published URL
```

- **Topic queue:** a file (`content/queue.json` or similar) listing planned blog topics
  and local pages still needing unique copy. Seeded manually; optional GSC topic-mining
  feed is a later enhancement, not part of this build.
- **Author:** Claude via `claude -p` headless (existing VPS pattern). Zero Gemini quota.
- **Cadence:** configurable (default assumption: ~2 blog posts/week; confirm at impl).
- **Rollback:** `git revert <commit> && git push`, or Cloudflare Pages dashboard
  "rollback to previous deployment".
- **VPS load:** minimal — the job is an API call + file write + git push. The Astro
  **build runs on Cloudflare**, not the VPS (respects the box's RAM/earlyoom constraints).
- **Auth/creds:** VPS needs git push access (existing avi git-sync / deploy key) and the
  existing `claude -p` headless auth. No new secrets committed to git.

## 8. SEO Requirements (baked in)

- Unique `<title>`, meta description, and canonical URL per page.
- JSON-LD structured data:
  - `LocalBusiness` (real NAP, geo coordinates, opening hours) site-wide.
  - `Service` on service pages.
  - `FAQPage` on pages with FAQ blocks.
  - `BlogPosting` on blog posts.
  - `BreadcrumbList` on nested pages.
- Auto-generated XML sitemap; `robots.txt` (current file is Cloudflare's content-signals
  policy — replace/extend with a real one + sitemap reference).
- Contextual internal linking: service ↔ suburb ↔ blog.
- Performance: static HTML, JS only for the booking form island, font preconnect.

## 9. Proposed Repo Structure (post-migration)

```
expressrepairs/
  src/
    components/          # existing React components, reused as static + islands
    layouts/
    pages/
      index.astro
      repairs/[service]/index.astro
      repairs/[service]/[suburb].astro
      blog/index.astro
      blog/[...slug].astro
    content/
      blog/*.mdx
      config.ts          # collection schemas (zod)
    data/                # site.ts, brands.ts, services.ts, suburbs.ts, ...
  public/                # images, robots.txt, favicon
  scripts/
    generate-content.mjs # claude -p generator + validator (Phase 3)
  astro.config.mjs
  package.json
```

The reconstructed `public/src/*.jsx` + `public/index.html` are the migration *input*;
they are superseded once the Astro homepage reaches parity.

## 10. Phasing

- **Phase 1 — Astro migration.** Homepage parity (static, reusing components), core
  service pages, SEO scaffolding (layouts, meta, sitemap, schema), Cloudflare deploy to
  the existing project. No content engine yet.
- **Phase 2 — Local pages.** Programmatic service×suburb pages over the curated suburb
  list, with unique copy, schema, and internal linking.
- **Phase 3 — Content engine.** VPS cron generator + topic queue + validation + build
  gate + Discord notify + documented rollback.

## 11. Prerequisites / Inputs Required (at implementation)

- Real NAP: business name, address, phone, opening hours (replace placeholders).
- Real service-area **suburb list** (drives Phase 2).
- Real testimonials or a Google review embed (replace `pravatar.cc` fakes).
- Brand assets: logo + real images (the `/images/*.jpg` paths are currently unpopulated).
- Confirmation of Pages-vs-Worker for the existing deployment (from `wrangler login`).
- Publish cadence.

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Auto-published low-quality/incorrect content on a real business site | Build gate + validation block bad content; `git revert` rollback; Discord visibility per publish |
| Doorway-page penalty from thin local pages | Curated suburb list, unique per-page copy, substantive content (§6) |
| Visual regression during Astro migration | Reuse existing `styles.css` + components; compare against the mirrored live page |
| Deploying to a duplicate CF project | Confirm + target the existing project before first deploy (§5) |
| VPS resource pressure | Build offloaded to Cloudflare; generator is lightweight |
| Placeholder data leaking to production | Real-NAP swap is a Phase 1 prerequisite; validator checks for known placeholder strings |

## 13. Open Questions (resolve at implementation)

- Exact target suburb list and publish cadence.
- Whether the homepage's SIM/handset plan sections (telco reseller content) stay, and
  whether they need their own SEO pages.
- Blog taxonomy (tags/categories) depth.
