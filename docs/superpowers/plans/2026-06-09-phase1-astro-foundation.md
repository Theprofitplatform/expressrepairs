# Phase 1 — Astro Foundation + Homepage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-browser-Babel React SPA with a pre-rendered Astro site that ships the same homepage as static HTML (with hydrated islands for interactivity), full SEO scaffolding, and deploys to the existing Cloudflare Pages project.

**Architecture:** Astro (SSG) renders the existing React components to static HTML at build time via `@astrojs/react`. The homepage mounts the existing component tree as a single hydrated island (`client:load`) for guaranteed behavioural parity in Phase 1; per-section island optimisation is deferred. Data moves from `window`-globals into typed ESM modules validated by Zod. A small SEO library produces canonical URLs, meta, and JSON-LD. Cloudflare builds on git push.

**Tech Stack:** Astro, `@astrojs/react`, `@astrojs/sitemap`, React 18, Zod, Vitest, Wrangler (Cloudflare Pages).

---

## Scope

**In scope (this plan):** Astro project setup + tooling; data layer (ESM + Zod); SEO helper library; base `Layout.astro`; migrate the existing components from `window`-globals to ESM; homepage `index.astro` at parity with JSON-LD; `robots.txt` + sitemap; Cloudflare deploy.

**Deferred to the next plan (Phase 1b):** core per-service pages (`/repairs/<service>/`). They reuse the `Layout` + SEO library built here, so they are cleaner to build once this foundation lands. Local service×suburb pages and the blog/content-engine remain Phase 2 / Phase 3 per the spec.

**Known pre-existing gaps (NOT fixed here — parity only):**
- The `BookingWidget` and `Contact` form do not submit anywhere (they only set local "submitted" state). Wiring a real lead endpoint is a follow-up, flagged in §Follow-ups.
- `/images/*.jpg` referenced by repair/accessory cards do not exist yet (real images are a launch prerequisite). Backgrounds fail gracefully.
- Site data is placeholder (address/phone/testimonials). Real-NAP swap is a launch prerequisite, not a code task.

---

## File Structure

```
expressrepairs/
  legacy-site/                 # the mirrored SPA, moved aside as migration reference (git mv from public/)
  astro.config.mjs             # NEW — Astro config (react + sitemap, site URL)
  vitest.config.js             # NEW — Vitest config
  package.json                 # MODIFY — Astro/Vitest/wrangler scripts + deps
  wrangler.toml                # MODIFY — deploy dist/ (Astro output)
  public/
    robots.txt                 # NEW — real robots + sitemap reference
    favicon.svg                # NEW — placeholder favicon
    images/                    # (empty for now; real images dropped here at launch)
  src/
    styles/
      global.css               # MOVED from legacy-site/styles.css
    data/
      schema.js                # NEW — Zod schemas for all data shapes
      site.js                  # NEW — SITE (NAP) + structured address/geo
      brands.js                # NEW — BRANDS
      services.js              # NEW — ISSUES, REPAIR_CARDS
      plans.js                 # NEW — SIM_PLANS, HANDSET_PLANS
      accessories.js           # NEW — ACCESSORIES, BRAND_TILES
      content.js               # NEW — TESTIMONIALS, WARRANTIES, FAQS, HOURS
    lib/
      seo.js                   # NEW — canonical(), pageMeta(), JSON-LD generators
      hours.js                 # NEW — isOpenNow(), parseHours(), dayName()
    components/
      icons.jsx                # MIGRATED from legacy-site/src/icons.jsx (ESM)
      BookingWidget.jsx        # MIGRATED from legacy-site/src/booking.jsx (ESM)
      sections.jsx             # MIGRATED from legacy-site/src/sections.jsx (ESM)
      sections2.jsx            # MIGRATED from legacy-site/src/sections2.jsx (ESM)
      App.jsx                  # MIGRATED from legacy-site/src/app.jsx (ESM, default export, no createRoot)
    layouts/
      Layout.astro             # NEW — <head>, meta, canonical, OG, fonts, global.css, JSON-LD
    pages/
      index.astro              # NEW — homepage: <App client:load/> + schema
      404.astro                # NEW — real 404 (replaces SPA catch-all)
  tests/
    data.test.js               # NEW — data integrity / Zod parse
    seo.test.js                # NEW — SEO helpers
    hours.test.js              # NEW — open-now logic
    build-output.test.js       # NEW — asserts on built dist/ HTML
```

---

## Task 1: Initialise Astro project + tooling

**Files:**
- Run: `git mv public legacy-site`
- Create: `astro.config.mjs`, `vitest.config.js`, `src/pages/index.astro` (temporary smoke page), `public/favicon.svg`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Move the mirrored SPA aside as reference**

```bash
cd /Users/avi/projects/expressrepairs
git mv public legacy-site
```

- [ ] **Step 2: Replace package.json**

```json
{
  "name": "expressrepairs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Astro site for expressrepairs.com.au on Cloudflare Pages",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "whoami": "wrangler whoami",
    "projects": "wrangler pages project list",
    "deploy": "astro build && wrangler pages deploy dist"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/react": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "wrangler": "^4"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: completes; `node_modules/` populated (already git-ignored).

- [ ] **Step 4: Create astro.config.mjs**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://expressrepairs.com.au',
  integrations: [react(), sitemap()],
  build: { format: 'directory' },
});
```

- [ ] **Step 5: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create a temporary smoke page `src/pages/index.astro`**

```astro
---
const ok = true;
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Express Repairs</title></head>
  <body><h1>Astro is up{ok ? '' : '?'}</h1></body>
</html>
```

- [ ] **Step 7: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
```

- [ ] **Step 8: Append build artefacts to `.gitignore`**

Add these lines to `.gitignore`:

```
dist/
.astro/
```

- [ ] **Step 9: Verify build + test runner work**

Run: `npm run build`
Expected: build succeeds, `dist/index.html` created containing "Astro is up".

Run: `npm test`
Expected: Vitest runs and reports "no test files found" (tests come next) — exit code 0 is fine, or it reports 0 tests.

- [ ] **Step 10: Commit**

```bash
git add legacy-site package.json package-lock.json astro.config.mjs vitest.config.js src/pages/index.astro public/favicon.svg .gitignore
git commit -m "chore: scaffold Astro project + Vitest, move SPA mirror to legacy-site/"
```

---

## Task 2: Data layer — ESM modules + Zod validation

The data values come **verbatim** from `legacy-site/src/data.jsx` (read that file for the exact arrays). This task moves them into typed modules and adds runtime validation, plus structured address/geo fields on `SITE` that the LocalBusiness schema needs.

**Files:**
- Create: `src/data/schema.js`, `src/data/site.js`, `src/data/brands.js`, `src/data/services.js`, `src/data/plans.js`, `src/data/accessories.js`, `src/data/content.js`
- Test: `tests/data.test.js`

- [ ] **Step 1: Write the failing test `tests/data.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { BRANDS } from '../src/data/brands.js';
import { ISSUES, REPAIR_CARDS } from '../src/data/services.js';
import { SITE } from '../src/data/site.js';
import { FAQS, HOURS } from '../src/data/content.js';

describe('data integrity', () => {
  it('imports without throwing (Zod parse passed)', () => {
    expect(BRANDS.length).toBeGreaterThan(0);
    expect(REPAIR_CARDS.length).toBeGreaterThan(0);
  });

  it('every brand has at least one model', () => {
    for (const b of BRANDS) expect(b.models.length).toBeGreaterThan(0);
  });

  it('every priced issue has a numeric price for every brand', () => {
    const ids = BRANDS.map((b) => b.id);
    for (const issue of ISSUES) {
      for (const id of ids) {
        expect(typeof issue.basePrice[id]).toBe('number');
      }
    }
  });

  it('SITE exposes the NAP + structured address fields the schema needs', () => {
    expect(SITE.name).toBeTruthy();
    expect(SITE.phoneHref).toMatch(/^tel:/);
    expect(SITE.address.locality).toBeTruthy();
    expect(SITE.address.region).toBeTruthy();
    expect(SITE.address.postalCode).toBeTruthy();
    expect(typeof SITE.geo.lat).toBe('number');
  });

  it('HOURS covers all 7 days of week', () => {
    expect(new Set(HOURS.map((h) => h.dow)).size).toBe(7);
  });

  it('FAQS each have a question and answer', () => {
    for (const f of FAQS) {
      expect(f.q).toBeTruthy();
      expect(f.a).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/data/brands.js` (modules not created yet).

- [ ] **Step 3: Create `src/data/schema.js`**

```js
import { z } from 'zod';

const brandIds = ['apple', 'samsung', 'google', 'oppo', 'huawei', 'motorola'];
const priceMap = z.object(Object.fromEntries(brandIds.map((id) => [id, z.number()])));

export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string(),
  models: z.array(z.string()).min(1),
});

export const issueSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  basePrice: priceMap,
});

export const repairCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  from: z.string(),
  img: z.string(),
  tag: z.string().optional(),
  size: z.string(),
});

export const planSchema = z.object({
  name: z.string(),
  price: z.number(),
  data: z.string(),
  featured: z.boolean().optional(),
  features: z.array(z.string()).min(1),
});

export const accessorySchema = z.object({
  title: z.string(),
  desc: z.string(),
  price: z.string(),
  img: z.string(),
  tag: z.string().optional(),
});

export const brandTileSchema = z.object({ id: z.string(), name: z.string(), sub: z.string() });
export const testimonialSchema = z.object({ name: z.string(), source: z.string(), avatar: z.string(), text: z.string() });
export const warrantySchema = z.object({ title: z.string(), desc: z.string() });
export const faqSchema = z.object({ q: z.string(), a: z.string() });
export const hoursSchema = z.object({ day: z.string(), hrs: z.string(), dow: z.number().min(0).max(6) });

export const siteSchema = z.object({
  name: z.string(),
  phone: z.string(),
  phoneHref: z.string().startsWith('tel:'),
  addressLines: z.array(z.string()).min(1),
  addressShort: z.string(),
  mapsQuery: z.string(),
  tagline: z.string(),
  address: z.object({
    locality: z.string(),
    region: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }),
});
```

- [ ] **Step 4: Create `src/data/site.js`** (values from `legacy-site/src/data.jsx` `SITE`, plus structured fields — PLACEHOLDER values flagged for launch swap)

```js
import { siteSchema } from './schema.js';

// NOTE: address/geo below are PLACEHOLDERS — replace with the real shop NAP at launch.
export const SITE = siteSchema.parse({
  name: 'Express Repairs',
  phone: '1300 373 773',
  phoneHref: 'tel:+611300373773',
  addressLines: ['Shop 12, 100 Main Street', 'Sydney NSW 2000'],
  addressShort: '100 Main Street, Sydney NSW 2000',
  mapsQuery: '100 Main Street Sydney',
  tagline: 'Same-day phone repairs done right',
  address: { locality: 'Sydney', region: 'NSW', postalCode: '2000', country: 'AU' },
  geo: { lat: -33.8688, lng: 151.2093 },
});
```

- [ ] **Step 5: Create the remaining data modules**

For each, copy the corresponding array(s) verbatim from `legacy-site/src/data.jsx`, wrap in the matching Zod parse, and `export`. Do NOT keep the `Object.assign(window, …)` line.

`src/data/brands.js`:
```js
import { z } from 'zod';
import { brandSchema } from './schema.js';
export const BRANDS = z.array(brandSchema).parse([
  /* paste the BRANDS array from legacy-site/src/data.jsx */
]);
```

`src/data/services.js`:
```js
import { z } from 'zod';
import { issueSchema, repairCardSchema } from './schema.js';
export const ISSUES = z.array(issueSchema).parse([ /* paste ISSUES */ ]);
export const REPAIR_CARDS = z.array(repairCardSchema).parse([ /* paste REPAIR_CARDS */ ]);
```

`src/data/plans.js`:
```js
import { z } from 'zod';
import { planSchema } from './schema.js';
export const SIM_PLANS = z.array(planSchema).parse([ /* paste SIM_PLANS */ ]);
export const HANDSET_PLANS = z.array(planSchema).parse([ /* paste HANDSET_PLANS */ ]);
```

`src/data/accessories.js`:
```js
import { z } from 'zod';
import { accessorySchema, brandTileSchema } from './schema.js';
export const ACCESSORIES = z.array(accessorySchema).parse([ /* paste ACCESSORIES */ ]);
export const BRAND_TILES = z.array(brandTileSchema).parse([ /* paste BRAND_TILES */ ]);
```

`src/data/content.js`:
```js
import { z } from 'zod';
import { testimonialSchema, warrantySchema, faqSchema, hoursSchema } from './schema.js';
export const TESTIMONIALS = z.array(testimonialSchema).parse([ /* paste TESTIMONIALS */ ]);
export const WARRANTIES = z.array(warrantySchema).parse([ /* paste WARRANTIES */ ]);
export const FAQS = z.array(faqSchema).parse([ /* paste FAQS */ ]);
export const HOURS = z.array(hoursSchema).parse([ /* paste HOURS */ ]);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all `data integrity` assertions green. (A Zod failure here means a value was pasted wrong — fix the data, not the schema.)

- [ ] **Step 7: Commit**

```bash
git add src/data tests/data.test.js
git commit -m "feat: typed + Zod-validated data layer migrated from SPA globals"
```

---

## Task 3: `hours` logic library (open-now)

Extracts `isOpenNow()` from `legacy-site/src/sections.jsx` into a tested pure-ish module so both the components and the schema use one implementation.

**Files:**
- Create: `src/lib/hours.js`
- Test: `tests/hours.test.js`

- [ ] **Step 1: Write the failing test `tests/hours.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { parseHourTo24, dayName, isOpenAt } from '../src/lib/hours.js';
import { HOURS } from '../src/data/content.js';

describe('hours helpers', () => {
  it('parses 12h clock strings to 24h integers', () => {
    expect(parseHourTo24('9:00 AM')).toBe(9);
    expect(parseHourTo24('6:00 PM')).toBe(18);
    expect(parseHourTo24('12:00 PM')).toBe(12);
    expect(parseHourTo24('12:00 AM')).toBe(0);
  });

  it('maps day-of-week index to schema.org day name', () => {
    expect(dayName(1)).toBe('Monday');
    expect(dayName(0)).toBe('Sunday');
  });

  it('reports open during listed hours and closed outside them', () => {
    // Monday (dow 1) is 9:00 AM – 6:00 PM in HOURS
    const monday10am = new Date('2026-06-08T10:00:00');
    const monday8pm = new Date('2026-06-08T20:00:00');
    expect(isOpenAt(monday10am, HOURS)).toBe(true);
    expect(isOpenAt(monday8pm, HOURS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- hours`
Expected: FAIL — cannot resolve `../src/lib/hours.js`.

- [ ] **Step 3: Create `src/lib/hours.js`**

```js
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayName(dow) {
  return DAYS[dow];
}

export function parseHourTo24(s) {
  const m = String(s).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let hh = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return hh;
}

export function isOpenAt(date, hours) {
  const row = hours.find((h) => h.dow === date.getDay());
  if (!row) return false;
  const [openPart, closePart] = row.hrs.split(' – ');
  const hr = date.getHours();
  return hr >= parseHourTo24(openPart) && hr < parseHourTo24(closePart);
}

export function isOpenNow(hours) {
  return isOpenAt(new Date(), hours);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- hours`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hours.js tests/hours.test.js
git commit -m "feat: tested open-now hours helpers"
```

---

## Task 4: SEO library — canonical, meta, JSON-LD generators

**Files:**
- Create: `src/lib/seo.js`
- Test: `tests/seo.test.js`

- [ ] **Step 1: Write the failing test `tests/seo.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { canonical, localBusinessSchema, faqPageSchema, breadcrumbSchema } from '../src/lib/seo.js';
import { SITE } from '../src/data/site.js';
import { FAQS, HOURS } from '../src/data/content.js';

describe('canonical()', () => {
  it('returns the trailing-slash root for "/"', () => {
    expect(canonical('/')).toBe('https://expressrepairs.com.au/');
  });
  it('normalises a nested path to a single trailing slash', () => {
    expect(canonical('repairs/screen')).toBe('https://expressrepairs.com.au/repairs/screen/');
    expect(canonical('/repairs/screen/')).toBe('https://expressrepairs.com.au/repairs/screen/');
  });
});

describe('localBusinessSchema()', () => {
  const s = localBusinessSchema(SITE, HOURS);
  it('is a LocalBusiness with telephone + postal address', () => {
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.telephone).toBe(SITE.phone);
    expect(s.address['@type']).toBe('PostalAddress');
    expect(s.address.addressRegion).toBe(SITE.address.region);
  });
  it('emits one openingHours entry per day', () => {
    expect(s.openingHoursSpecification).toHaveLength(HOURS.length);
    expect(s.openingHoursSpecification[0].dayOfWeek).toBeTruthy();
  });
});

describe('faqPageSchema()', () => {
  it('emits a Question per FAQ', () => {
    const f = faqPageSchema(FAQS);
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity).toHaveLength(FAQS.length);
    expect(f.mainEntity[0]['@type']).toBe('Question');
    expect(f.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('breadcrumbSchema()', () => {
  it('numbers items in order', () => {
    const b = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Repairs', path: '/repairs/' },
    ]);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].item).toBe('https://expressrepairs.com.au/repairs/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- seo`
Expected: FAIL — cannot resolve `../src/lib/seo.js`.

- [ ] **Step 3: Create `src/lib/seo.js`**

```js
import { dayName, parseHourTo24 } from './hours.js';

export const SITE_URL = 'https://expressrepairs.com.au';

export function canonical(path = '/') {
  const trimmed = String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? `${SITE_URL}/` : `${SITE_URL}/${trimmed}/`;
}

function to24Str(s) {
  return String(parseHourTo24(s)).padStart(2, '0') + ':00';
}

export function localBusinessSchema(site, hours) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    url: `${SITE_URL}/`,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.addressLines[0],
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: hours.map((h) => {
      const [open, close] = h.hrs.split(' – ');
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayName(h.dow),
        opens: to24Str(open),
        closes: to24Str(close),
      };
    }),
  };
}

export function faqPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- seo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.js tests/seo.test.js
git commit -m "feat: SEO library — canonical URLs + LocalBusiness/FAQ/Breadcrumb JSON-LD"
```

---

## Task 5: Base `Layout.astro`

**Files:**
- Run: `git mv legacy-site/styles.css src/styles/global.css`
- Create: `src/layouts/Layout.astro`

- [ ] **Step 1: Move the stylesheet into src**

```bash
git mv legacy-site/styles.css src/styles/global.css
```

- [ ] **Step 2: Create `src/layouts/Layout.astro`**

```astro
---
import '../styles/global.css';
import { canonical } from '../lib/seo.js';

const {
  title,
  description,
  path = '/',
  schema = [],          // array of JSON-LD objects
  htmlAttrs = {},       // e.g. data-palette etc. carried from the original <html>
} = Astro.props;

const url = canonical(path);
const jsonld = Array.isArray(schema) ? schema : [schema];
---
<!doctype html>
<html lang="en" {...htmlAttrs}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={url} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content={url} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" />

    {jsonld.map((obj) => (
      <script type="application/ld+json" set:html={JSON.stringify(obj)} />
    ))}
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Verify it compiles via a temporary use**

Edit `src/pages/index.astro` to:
```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Express Repairs" description="Same-day phone repairs." path="/">
  <h1>Layout works</h1>
</Layout>
```

Run: `npm run build`
Expected: build succeeds; `dist/index.html` contains `<link rel="canonical" href="https://expressrepairs.com.au/"/>` and the Google Fonts stylesheet link.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/layouts/Layout.astro src/pages/index.astro
git commit -m "feat: base Layout.astro with meta, canonical, OG, fonts, JSON-LD slot"
```

---

## Task 6: Migrate components from `window`-globals to ESM

Mechanical conversion of the four component files in `legacy-site/src/`. **The transformation rule for every file:** (1) delete the trailing `Object.assign(window, {…})` / `window.X =` lines; (2) add `export` before each component/const that other files use; (3) add `import` lines for every identifier the file references but does not define; (4) replace `const { useState } = React;` with a proper React import; (5) replace inline `isOpenNow()` calls with the imported helper.

**Files:**
- Create (migrated): `src/components/icons.jsx`, `src/components/BookingWidget.jsx`, `src/components/sections.jsx`, `src/components/sections2.jsx`, `src/components/App.jsx`

- [ ] **Step 1: Migrate `icons.jsx` (worked example of the rule)**

Source: `legacy-site/src/icons.jsx`. Create `src/components/icons.jsx` with the **same `Icon` object and `BrandLogo` component body**, but headed/footed like this:

```jsx
import React from 'react';

export const Icon = {
  /* ...exact same Phone/Pin/Clock/Star/Zap/ArrowRight/ArrowLeft/Check/Shield/Tools entries... */
};

export const BrandLogo = ({ id, size = 28 }) => {
  /* ...exact same switch body... */
};
```
Remove the original `window.Icon = Icon; window.BrandLogo = BrandLogo;` lines.

- [ ] **Step 2: Migrate `BookingWidget.jsx`**

Source: `legacy-site/src/booking.jsx`. Create `src/components/BookingWidget.jsx`:
- Header:
```jsx
import React, { useState } from 'react';
import { Icon, BrandLogo } from './icons.jsx';
import { BRANDS, ISSUES } from '../data/services.js';
import { SITE } from '../data/site.js';
```
Wait — `BRANDS` lives in `brands.js`. Use:
```jsx
import { Icon, BrandLogo } from './icons.jsx';
import { BRANDS } from '../data/brands.js';
import { ISSUES } from '../data/services.js';
import { SITE } from '../data/site.js';
```
- Replace `const { useState } = React;` with the `import React, { useState } from 'react';` above.
- Keep the `BookingWidget` function body **verbatim**; add `export` → `export function BookingWidget() { … }`.
- Remove `window.BookingWidget = BookingWidget;`.

- [ ] **Step 3: Migrate `sections.jsx`**

Source: `legacy-site/src/sections.jsx`. Create `src/components/sections.jsx`:
- Header:
```jsx
import React, { useState } from 'react';
import { Icon } from './icons.jsx';
import { BookingWidget } from './BookingWidget.jsx';
import { isOpenNow } from '../lib/hours.js';
import { SITE } from '../data/site.js';
import { HOURS } from '../data/content.js';
import { REPAIR_CARDS } from '../data/services.js';
import { SIM_PLANS, HANDSET_PLANS } from '../data/plans.js';
import { ACCESSORIES } from '../data/accessories.js';
```
- Delete the local `function isOpenNow() {…}` definition (now imported from `../lib/hours.js`); update its call sites to `isOpenNow(HOURS)`.
- Add `export` to `Nav`, `Hero`, `RepairServices`, `Plans`, `Accessories`. Keep bodies verbatim otherwise.
- `Plans` already uses `useState` (provided by the React import).
- Remove the `Object.assign(window, {…})` footer.

- [ ] **Step 4: Migrate `sections2.jsx`**

Source: `legacy-site/src/sections2.jsx`. Create `src/components/sections2.jsx`:
- Header:
```jsx
import React, { useState } from 'react';
import { Icon, BrandLogo } from './icons.jsx';
import { isOpenNow } from '../lib/hours.js';
import { SITE } from '../data/site.js';
import { HOURS, TESTIMONIALS, WARRANTIES, FAQS } from '../data/content.js';
import { BRAND_TILES } from '../data/accessories.js';
```
- `Store` calls `isOpenNow()` → change to `isOpenNow(HOURS)`.
- Add `export` to `BrandsStrip`, `WhyUs`, `Testimonials`, `Warranty`, `FAQ`, `Store`, `Contact`, `Footer`. Bodies verbatim (they keep their `useState`, `new Date()` usage).
- Remove the `Object.assign(window, {…})` footer.

- [ ] **Step 5: Migrate `app.jsx` → `App.jsx`**

Source: `legacy-site/src/app.jsx`. Create `src/components/App.jsx`:
```jsx
import React from 'react';
import { Icon } from './icons.jsx';
import { SITE } from '../data/site.js';
import { Nav, Hero, RepairServices, Plans, Accessories } from './sections.jsx';
import { BrandsStrip, WhyUs, Testimonials, Warranty, FAQ, Store, Contact, Footer } from './sections2.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <RepairServices />
      <Plans />
      <Accessories />
      <BrandsStrip />
      <WhyUs />
      <Testimonials />
      <Warranty />
      <FAQ />
      <Store />
      <Contact />
      <Footer />
      <a href={SITE.phoneHref} className="mobile-call-cta">
        <Icon.Phone size={16} /> Call {SITE.phone}
      </a>
    </>
  );
}
```
Note: the original `ReactDOM.createRoot(...).render(<App/>)` lines are **dropped** — Astro mounts the island.

- [ ] **Step 6: Verify components compile (typecheck via build smoke)**

Temporarily set `src/pages/index.astro` to:
```astro
---
import Layout from '../layouts/Layout.astro';
import App from '../components/App.jsx';
---
<Layout title="Express Repairs" description="Same-day phone repairs." path="/">
  <App client:load />
</Layout>
```

Run: `npm run build`
Expected: build succeeds with no "X is not defined" / unresolved-import errors. `dist/index.html` now contains rendered section markup (e.g. the text "Get a free quote" and the phone number `1300 373 773`).

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "refactor: migrate SPA components from window-globals to ESM modules"
```

---

## Task 7: Homepage `index.astro` at parity + JSON-LD, and a real 404

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/404.astro`
- Test: `tests/build-output.test.js`

- [ ] **Step 1: Write the failing build-output test `tests/build-output.test.js`**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

let html = '';
beforeAll(() => {
  execSync('npm run build', { stdio: 'inherit' });
  html = readFileSync('dist/index.html', 'utf8');
}, 120000);

describe('built homepage', () => {
  it('has the canonical tag', () => {
    expect(html).toContain('rel="canonical" href="https://expressrepairs.com.au/"');
  });
  it('server-renders core content (not a blank SPA shell)', () => {
    expect(html).toContain('1300 373 773');
    expect(html).toContain('Get a free quote');
  });
  it('includes LocalBusiness and FAQ JSON-LD', () => {
    expect(html).toContain('"@type":"LocalBusiness"');
    expect(html).toContain('"@type":"FAQPage"');
  });
  it('does NOT load Babel standalone or unpkg React (the old SPA stack)', () => {
    expect(html).not.toContain('@babel/standalone');
    expect(html).not.toContain('unpkg.com/react');
  });
  it('emitted a sitemap', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- build-output`
Expected: FAIL — sitemap assertion fails (sitemap integration added in Task 8) and/or JSON-LD assertions fail (index not yet wired with schema). This is expected; it passes after Step 3 + Task 8.

- [ ] **Step 3: Finalise `src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import App from '../components/App.jsx';
import { localBusinessSchema, faqPageSchema } from '../lib/seo.js';
import { SITE } from '../data/site.js';
import { FAQS, HOURS } from '../data/content.js';

const schema = [localBusinessSchema(SITE, HOURS), faqPageSchema(FAQS)];
const description =
  'Same-day phone repairs in Sydney — screen, battery, charging port and more, backed by a 6–12 month warranty. Free 20-second quote.';
---
<Layout
  title="Express Repairs — Fast, trusted phone & device repairs"
  description={description}
  path="/"
  schema={schema}
  htmlAttrs={{ 'data-palette': 'electric-blue', 'data-herovariant': 'split', 'data-planstyle': 'cards', 'data-fontpair': 'mix', 'data-dark': 'false' }}
>
  <div id="root"><App client:load /></div>
</Layout>
```

- [ ] **Step 4: Create `src/pages/404.astro`** (replaces the old SPA catch-all)

```astro
---
import Layout from '../layouts/Layout.astro';
import { SITE } from '../data/site.js';
---
<Layout title="Page not found — Express Repairs" description="That page doesn't exist." path="/404">
  <main style="max-width:640px;margin:120px auto;padding:0 24px;text-align:center;">
    <h1 style="font-size:40px;margin-bottom:12px;">Page not found</h1>
    <p style="color:#555;margin-bottom:24px;">We couldn't find that page. It may have moved.</p>
    <a class="btn btn-primary" href="/">Back to home</a>
    <p style="margin-top:16px;">Or call us: <a href={SITE.phoneHref}>{SITE.phone}</a></p>
  </main>
</Layout>
```

- [ ] **Step 5: Visual parity check**

Run: `npm run preview` (after a build) and open the served URL.
Compare against the mirror in `legacy-site/index.html` (open it via `npx serve legacy-site`). Confirm: nav, hero + booking widget, repairs, plans toggle, accessories, brands, why-us, testimonials, warranty, FAQ accordion, store, contact form, footer all render and the interactive bits work (booking steps, plan toggle, FAQ open/close, form validation).

Expected: visual + behavioural parity. Known acceptable diffs: `/images/*.jpg` backgrounds are blank (no assets yet); the "Open now/Closed" indicator may briefly flip on hydration (build-time vs client-time) — acceptable for Phase 1.

- [ ] **Step 6: Commit** (build-output test goes green after Task 8 adds the sitemap)

```bash
git add src/pages/index.astro src/pages/404.astro tests/build-output.test.js
git commit -m "feat: homepage at parity as pre-rendered Astro page with JSON-LD + real 404"
```

---

## Task 8: robots.txt + sitemap, then final build verification

`@astrojs/sitemap` was added in Task 1; this task adds `robots.txt` referencing it and turns the build-output test green.

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://expressrepairs.com.au/sitemap-index.xml
```

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: succeeds; `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist; `dist/robots.txt` present.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: ALL tests pass, including `tests/build-output.test.js` (sitemap assertion now satisfied).

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt
git commit -m "feat: robots.txt + sitemap reference; full build green"
```

---

## Task 9: Deploy to the existing Cloudflare Pages project

> Requires the user's interactive `wrangler login` (browser). Do not create a new Pages project — deploy to the one already bound to `expressrepairs.com.au`.

**Files:**
- Modify: `wrangler.toml` (set `name` to the real project; remove the stale `pages_build_output_dir = "public"` since Astro outputs to `dist/`)

- [ ] **Step 1: Authenticate (user runs)**

```
npx wrangler login
npx wrangler whoami
```

- [ ] **Step 2: Identify the existing project**

Run: `npx wrangler pages project list`
- If a project serves `expressrepairs.com.au` → note its exact name.
- If the list is empty → the site is a **Worker**, not Pages. STOP and escalate: deploying Pages would not update the live Worker; the deploy path differs (this plan assumes Pages). Re-confirm with the user before proceeding.

- [ ] **Step 3: Update `wrangler.toml`**

```toml
# Cloudflare Pages config for expressrepairs.com.au
name = "<EXACT-EXISTING-PROJECT-NAME>"
compatibility_date = "2026-06-09"
pages_build_output_dir = "dist"
```

- [ ] **Step 4: Deploy a preview first (non-production)**

Run: `npm run build && npx wrangler pages deploy dist --branch=astro-preview`
Expected: returns a `*.pages.dev` preview URL. Open it; smoke-check the homepage renders and interactive bits work.

- [ ] **Step 5: Promote to production**

Run: `npx wrangler pages deploy dist --branch=main`  *(or the project's production branch)*
Expected: deploy succeeds; the production URL updates.

- [ ] **Step 6: Verify live**

```bash
curl -sI https://expressrepairs.com.au/ | grep -i 'server\|content-type'
curl -s https://expressrepairs.com.au/ | grep -c '"@type":"LocalBusiness"'   # expect 1
curl -s https://expressrepairs.com.au/sitemap-index.xml | head -3
curl -sI https://expressrepairs.com.au/some-missing-page | head -1            # expect 404 now, not 200
```
Expected: homepage served, LocalBusiness JSON-LD present, sitemap live, unknown paths return real 404.

- [ ] **Step 7: Commit + push (triggers git-connected CF build if configured)**

```bash
git add wrangler.toml
git commit -m "chore: point Cloudflare Pages deploy at Astro dist/ output"
git push
```

---

## Self-Review

**Spec coverage (against `2026-06-09-seo-content-site-design.md`):**
- §5 Stack (Astro + React + Cloudflare) → Tasks 1, 6, 9. ✓
- §5 reuse components + styles.css → Tasks 5, 6. ✓
- §5 confirm Pages-vs-Worker before deploy → Task 9 Step 2. ✓
- §6 data → typed `src/data/` single source of truth → Task 2. ✓
- §8 unique title/meta/canonical → Tasks 4, 5, 7. ✓
- §8 JSON-LD (LocalBusiness, FAQPage, Breadcrumb) → Task 4 (BlogPosting/Service deferred with their page types). ✓
- §8 sitemap + robots.txt → Tasks 1, 8. ✓
- §8 near-zero JS / static HTML → server-render achieved (Task 7 test asserts no Babel/unpkg). Per-section island trimming is a deferred CWV optimisation (see Follow-ups) — flagged honestly, not silently dropped.
- §10 Phase 1 "core service pages" → **explicitly deferred to Phase 1b** (Scope section). Not silently omitted.

**Placeholder scan:** No "TBD/TODO" steps. The `/* paste … */` markers in Task 2 are deliberate references to verbatim data in `legacy-site/src/data.jsx` (the source is in-repo), not missing content — the transformation rule is fully specified.

**Type/name consistency:** `isOpenNow(hours)` / `isOpenAt(date, hours)` / `parseHourTo24()` / `dayName()` used consistently across `hours.js`, `seo.js`, and the component imports. `canonical()`, `localBusinessSchema()`, `faqPageSchema()`, `breadcrumbSchema()` signatures match between `seo.js`, `seo.test.js`, and `index.astro`. Data export names (`BRANDS`, `ISSUES`, `REPAIR_CARDS`, `SIM_PLANS`, `HANDSET_PLANS`, `ACCESSORIES`, `BRAND_TILES`, `TESTIMONIALS`, `WARRANTIES`, `FAQS`, `HOURS`, `SITE`) match their import sites in Task 6.

## Follow-ups (out of scope, tracked)
1. **CWV optimisation:** convert static sections (Nav, RepairServices, Accessories, BrandsStrip, WhyUs, Testimonials, Warranty, Footer) to zero-JS `.astro`, leaving only `BookingWidget`, `Plans`, `FAQ`, `Contact`, and an `OpenStatus` island hydrated.
2. **Lead capture:** the booking widget + contact form don't POST anywhere — wire to an email/Cloudflare endpoint.
3. **Real assets/NAP:** drop real `/images/*`, swap placeholder address/phone/testimonials, set real `geo` coords.
4. **Phase 1b:** core `/repairs/<service>/` pages on this foundation.
