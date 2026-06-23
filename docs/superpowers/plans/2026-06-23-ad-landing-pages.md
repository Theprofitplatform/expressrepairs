# Ad Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a family of four `noindex` conversion-first ad landing pages at `/go/<slug>/` (screen-repair, battery, water-damage, and a catch-all "repairs"), each call-first with a lean callback-form fallback and GA4 / Google Ads / Meta Pixel conversion tracking.

**Architecture:** One data-driven Astro route (`src/pages/go/[lp].astro`) generates all four pages from a new `LANDING_PAGES` overlay that references the existing validated `SERVICES` data for prices/FAQs. A new `AdTracking.astro` component emits tag snippets only when their IDs are configured, firing a Google-Ads/Meta/GA4 conversion on any tap-to-call and on form-submit success. Pages are excluded from the sitemap via the `@astrojs/sitemap` `filter` option.

**Tech Stack:** Astro 5, React islands, Zod (data validation), Vitest, Cloudflare Pages. Spec: `docs/superpowers/specs/2026-06-23-ad-landing-pages-design.md`.

## Global Constraints

- **Working directory / git root is `repo/`** (the parent dir is not a repo). Run all commands from `repo/`.
- **Branch first:** the repo is on `main`. Before Task 1, create a feature branch (`git checkout -b feat/ad-landing-pages`). Do not commit to `main`.
- **Node ≥ 20** (CI uses Node 22).
- **All `src/data/*` is Zod-validated** — add new data schemas to `src/data/schema.js`, parse arrays at the bottom of the data module (project convention).
- **Never fabricate prices or reviews.** Prices come only from existing `SERVICES` data. `SITE.rating.count` is `null`; do **not** render any star rating or review count anywhere.
- **Warranty wording is exactly `6–12 months`** (en-dash), reused verbatim from existing service pages.
- **Tests:** `npm test` runs `vitest run`; build-touching tests call `npm run build` in `beforeAll` with a generous timeout. Test files live in `tests/*.test.js`, `environment: 'node'` (no DOM — test pure functions, not React rendering).
- **Phone constants:** `SITE.phone` = `(02) 9533 3300`, `SITE.phoneHref` = `tel:+61295333300`.

---

### Task 1: Landing-page data layer

**Files:**
- Modify: `src/data/schema.js` (add `landingPageSchema`)
- Create: `src/data/landing.js`
- Test: `tests/landing.test.js`

**Interfaces:**
- Consumes: `faqSchema` from `src/data/schema.js`; `SERVICE_BY_SLUG` from `src/data/repairs.js`.
- Produces:
  - `landingPageSchema` (Zod object) exported from `src/data/schema.js`.
  - `LANDING_PAGES: Array<{ slug, service: string|null, metaTitle, metaDescription, h1, sub, offer, fromCaption?, fromAmount?, faqs?: {q,a}[] }>` from `src/data/landing.js`.
  - `LANDING_BY_SLUG: Record<slug, entry>` from `src/data/landing.js`.

- [ ] **Step 1: Write the failing test**

Create `tests/landing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { LANDING_PAGES, LANDING_BY_SLUG } from '../src/data/landing.js';
import { SERVICE_BY_SLUG } from '../src/data/repairs.js';

const slugSafe = /^[a-z0-9-]+$/;

describe('landing page data integrity', () => {
  it('imports without throwing (Zod parse passed) and has entries', () => {
    expect(LANDING_PAGES.length).toBeGreaterThan(0);
  });

  it('every landing slug is URL-safe and unique', () => {
    const slugs = LANDING_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s, s).toMatch(slugSafe);
  });

  it('every landing service is null (catch-all) or a real service slug', () => {
    for (const p of LANDING_PAGES) {
      if (p.service !== null) expect(SERVICE_BY_SLUG[p.service], p.service).toBeTruthy();
    }
  });

  it('every catch-all page carries its own FAQs (no service to borrow from)', () => {
    for (const p of LANDING_PAGES.filter((p) => p.service === null)) {
      expect(p.faqs?.length, p.slug).toBeGreaterThan(0);
    }
  });

  it('resolves every page through LANDING_BY_SLUG', () => {
    for (const p of LANDING_PAGES) expect(LANDING_BY_SLUG[p.slug]).toBe(p);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- landing.test.js`
Expected: FAIL — `Cannot find module '../src/data/landing.js'`.

- [ ] **Step 3: Add the schema**

In `src/data/schema.js`, directly after the existing `faqSchema` line (`export const faqSchema = z.object({ q: z.string(), a: z.string() });`), add:

```js
export const landingPageSchema = z.object({
  slug: z.string(),
  service: z.string().nullable(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  h1: z.string(),
  sub: z.string(),
  offer: z.string(),
  fromCaption: z.string().optional(),
  fromAmount: z.string().optional(),
  faqs: z.array(faqSchema).optional(),
});
```

- [ ] **Step 4: Create the data module**

Create `src/data/landing.js`:

```js
// Ad landing-page overlay. Each entry maps a campaign slug to an existing
// service (for prices/FAQs from ./repairs.js) plus ad-specific copy. The
// catch-all entry (service: null) lists every service and carries its own FAQs.
// Validated by landingPageSchema — see ./schema.js.
import { z } from 'zod';
import { landingPageSchema } from './schema.js';

export const LANDING_PAGES = z.array(landingPageSchema).parse([
  {
    slug: 'screen-repair',
    service: 'screen',
    metaTitle: 'Same-Day Phone Screen Repair — Riverwood | Xpress Phone Repairs',
    metaDescription: 'Cracked screen? Same-day phone screen repair at Riverwood Plaza from $99. Free diagnostic, no fix no fee, 6–12 month warranty. Call (02) 9533 3300.',
    h1: 'Cracked screen? Fixed today.',
    sub: 'Same-day screen replacement for iPhone, Samsung, Pixel and more — original-quality parts, fitted and tested while you wait at Riverwood Plaza.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
  },
  {
    slug: 'battery',
    service: 'battery',
    metaTitle: 'Phone Battery Replacement — Same Day, Riverwood | Xpress Phone Repairs',
    metaDescription: 'Phone dying by lunchtime? Same-day battery replacement at Riverwood Plaza from $59. Free diagnostic, no fix no fee, 6–12 month warranty. Call (02) 9533 3300.',
    h1: 'New battery, same day.',
    sub: 'Stop chasing power outlets. We fit fresh, high-capacity batteries for every major brand — usually in under an hour, warrantied and tested.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
  },
  {
    slug: 'water-damage',
    service: 'water-damage',
    metaTitle: 'Water Damage Phone Repair — Riverwood | Xpress Phone Repairs',
    metaDescription: 'Dropped your phone in water? Fast water-damage diagnosis and repair at Riverwood Plaza. Free diagnostic, no fix no fee. Bring it in now — call (02) 9533 3300.',
    h1: 'Water damage? Act fast — we can help.',
    sub: 'The sooner we see it, the better the odds. Free diagnostic, an honest assessment, and same-day repair where the board allows — every major brand.',
    offer: 'Free diagnostic · No fix, no fee · 6–12 month warranty',
  },
  {
    slug: 'repairs',
    service: null,
    metaTitle: 'Phone Repairs Riverwood — Same Day | Xpress Phone Repairs',
    metaDescription: 'Same-day phone repairs at Riverwood Plaza — screens, batteries, charging ports, cameras and more. Free diagnostic, no fix no fee. Call (02) 9533 3300.',
    h1: 'Phone broken? Fixed today at Riverwood Plaza.',
    sub: 'Screens, batteries, charging ports, cameras, water damage — every major brand, repaired same-day with a free diagnostic and up to a 12-month warranty.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
    fromCaption: 'Repairs from',
    fromAmount: '$49',
    faqs: [
      { q: 'How long do repairs take?', a: 'Most common repairs — screens, batteries, charging ports — are done the same day, usually within the hour. We give you a firm time estimate when you drop in.' },
      { q: 'Do you charge for a diagnostic?', a: "No. Diagnostics are free, and it's no fix, no fee — if we can't repair it, you don't pay." },
      { q: 'Which brands do you repair?', a: "Apple iPhone, Samsung Galaxy, Google Pixel, Oppo, Huawei, Motorola and more. If you're not sure, just call and ask." },
      { q: 'Do your repairs come with a warranty?', a: 'Yes — repairs are covered by a 6–12 month warranty depending on the part and device.' },
    ],
  },
]);

export const LANDING_BY_SLUG = Object.fromEntries(LANDING_PAGES.map((p) => [p.slug, p]));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- landing.test.js`
Expected: PASS (5 passing).

- [ ] **Step 6: Commit**

```bash
git add src/data/schema.js src/data/landing.js tests/landing.test.js
git commit -m "feat(landing): add validated ad landing-page data overlay"
```

---

### Task 2: Tracking config + AdTracking component

**Files:**
- Create: `src/data/tracking.js`
- Create: `src/components/AdTracking.astro`
- Test: `tests/tracking.test.js`

**Interfaces:**
- Produces: `TRACKING: { ga4Id, googleAdsId, googleAdsCallLabel, googleAdsLeadLabel, metaPixelId }` (all strings, empty by default) from `src/data/tracking.js`.
- Produces: `AdTracking.astro` default component. It renders nothing when all IDs are empty. When configured, it loads gtag and/or Meta Pixel and wires two conversions: a **call** conversion on any `a[href^="tel:"]` click, and a **lead** conversion on a `lead-success` DOM event (`document.dispatchEvent(new CustomEvent('lead-success'))` — Task 3 fires this).

- [ ] **Step 1: Write the failing test**

Create `tests/tracking.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TRACKING } from '../src/data/tracking.js';

describe('tracking config', () => {
  it('exposes the expected tag keys as strings', () => {
    for (const k of ['ga4Id', 'googleAdsId', 'googleAdsCallLabel', 'googleAdsLeadLabel', 'metaPixelId']) {
      expect(TRACKING, k).toHaveProperty(k);
      expect(typeof TRACKING[k], k).toBe('string');
    }
  });

  it('ships empty placeholder IDs by default (nothing fires until configured)', () => {
    expect(TRACKING.ga4Id).toBe('');
    expect(TRACKING.googleAdsId).toBe('');
    expect(TRACKING.metaPixelId).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tracking.test.js`
Expected: FAIL — `Cannot find module '../src/data/tracking.js'`.

- [ ] **Step 3: Create the tracking config**

Create `src/data/tracking.js`:

```js
// Conversion-tracking tag IDs for the ad landing pages. Each is OPTIONAL:
// AdTracking.astro emits a tag only when its ID is non-empty, so the pages
// work with nothing configured and you fill these in when ads go live.
//
//   ga4Id              GA4 measurement ID,         e.g. 'G-XXXXXXXXXX'
//   googleAdsId        Google Ads conversion ID,   e.g. 'AW-XXXXXXXXXX'
//   googleAdsCallLabel conversion label for a call (the part after the '/')
//   googleAdsLeadLabel conversion label for a form lead
//   metaPixelId        Meta (Facebook) Pixel ID,   e.g. '1234567890'
export const TRACKING = {
  ga4Id: '',
  googleAdsId: '',
  googleAdsCallLabel: '',
  googleAdsLeadLabel: '',
  metaPixelId: '',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tracking.test.js`
Expected: PASS (2 passing).

- [ ] **Step 5: Create the AdTracking component**

Create `src/components/AdTracking.astro`:

```astro
---
// Loads GA4 / Google Ads / Meta Pixel and fires conversions on call + lead.
// Renders NOTHING when no IDs are configured (see src/data/tracking.js).
// Tags load after first paint to protect Core Web Vitals on paid traffic.
import { TRACKING as t } from '../data/tracking.js';
const enabled = Boolean(t.ga4Id || t.googleAdsId || t.metaPixelId);
---
{enabled && (
  <script is:inline define:vars={{ t }}>
    (function () {
      function inject(src) {
        var s = document.createElement('script');
        s.async = true; s.src = src; document.head.appendChild(s);
      }

      // Google gtag (GA4 and/or Google Ads).
      if (t.ga4Id || t.googleAdsId) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        inject('https://www.googletagmanager.com/gtag/js?id=' + (t.ga4Id || t.googleAdsId));
        window.gtag('js', new Date());
        if (t.ga4Id) window.gtag('config', t.ga4Id);
        if (t.googleAdsId) window.gtag('config', t.googleAdsId);
      }

      // Meta Pixel.
      if (t.metaPixelId) {
        !function (f, b, e, v, n, s, u) {
          if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
          s = b.createElement(e); s.async = !0; s.src = v; u = b.getElementsByTagName(e)[0]; u.parentNode.insertBefore(s, u);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', t.metaPixelId);
        window.fbq('track', 'PageView');
      }

      function fireCall() {
        if (window.gtag) {
          if (t.googleAdsId && t.googleAdsCallLabel) window.gtag('event', 'conversion', { send_to: t.googleAdsId + '/' + t.googleAdsCallLabel });
          if (t.ga4Id) window.gtag('event', 'call');
        }
        if (window.fbq) window.fbq('track', 'Contact');
      }
      function fireLead() {
        if (window.gtag) {
          if (t.googleAdsId && t.googleAdsLeadLabel) window.gtag('event', 'conversion', { send_to: t.googleAdsId + '/' + t.googleAdsLeadLabel });
          if (t.ga4Id) window.gtag('event', 'generate_lead');
        }
        if (window.fbq) window.fbq('track', 'Lead');
      }

      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="tel:"]');
        if (a) fireCall();
      });
      document.addEventListener('lead-success', fireLead);
    })();
  </script>
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/data/tracking.js src/components/AdTracking.astro tests/tracking.test.js
git commit -m "feat(landing): add conversion-tracking config + AdTracking component"
```

---

### Task 3: Landing lead helpers + LandingForm island

**Files:**
- Create: `src/lib/landingLead.js`
- Create: `src/components/LandingForm.jsx`
- Test: `tests/landingLead.test.js`

**Interfaces:**
- Consumes: `sendLead` from `src/lib/sendLead.js`; `SITE` from `src/data/site.js`.
- Produces (`src/lib/landingLead.js`):
  - `validateContact({ name, phone }): Record<string,string>` — returns an errors object (empty when valid).
  - `buildLeadPayload({ name, phone, slug, service, company? }): { source, name, phone, type, company }` — `source` = `landing:<slug>`, `type` = `service || 'general'`.
- Produces (`src/components/LandingForm.jsx`): named export `LandingForm({ slug, service })`. On submit success it dispatches `document.dispatchEvent(new CustomEvent('lead-success'))` (consumed by AdTracking from Task 2).

- [ ] **Step 1: Write the failing test**

Create `tests/landingLead.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateContact, buildLeadPayload } from '../src/lib/landingLead.js';

describe('validateContact', () => {
  it('flags a missing name and phone', () => {
    const e = validateContact({ name: '', phone: '' });
    expect(e.name).toBeTruthy();
    expect(e.phone).toBeTruthy();
  });

  it('rejects a too-short phone', () => {
    expect(validateContact({ name: 'Jane', phone: '123' }).phone).toBeTruthy();
  });

  it('passes a valid name + AU mobile', () => {
    expect(validateContact({ name: 'Jane Doe', phone: '0412 345 678' })).toEqual({});
  });
});

describe('buildLeadPayload', () => {
  it('tags source with the landing slug and trims fields', () => {
    const p = buildLeadPayload({ name: ' Jane ', phone: ' 0412 345 678 ', slug: 'screen-repair', service: 'screen' });
    expect(p.source).toBe('landing:screen-repair');
    expect(p.type).toBe('screen');
    expect(p.name).toBe('Jane');
    expect(p.phone).toBe('0412 345 678');
  });

  it('falls back to type "general" for the catch-all (null service)', () => {
    expect(buildLeadPayload({ name: 'J', phone: '0412 345 678', slug: 'repairs', service: null }).type).toBe('general');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- landingLead.test.js`
Expected: FAIL — `Cannot find module '../src/lib/landingLead.js'`.

- [ ] **Step 3: Create the pure helpers**

Create `src/lib/landingLead.js`:

```js
// Pure helpers for the landing-page callback form, kept out of the React island
// so they can be unit-tested in node (no DOM). Phone rule mirrors BookingWidget.
export function validateContact({ name, phone }) {
  const errors = {};
  if (!String(name || '').trim()) errors.name = 'Please enter your name';
  const p = String(phone || '').trim();
  if (!p) errors.phone = 'We need a number to call back';
  else if (!/^[\d\s+()-]{8,}$/.test(p)) errors.phone = 'That phone number looks off';
  return errors;
}

export function buildLeadPayload({ name, phone, slug, service, company = '' }) {
  return {
    source: `landing:${slug}`,
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    type: service || 'general',
    company,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- landingLead.test.js`
Expected: PASS (5 passing).

- [ ] **Step 5: Create the LandingForm island**

Create `src/components/LandingForm.jsx`:

```jsx
import React, { useState } from 'react';
import { SITE } from '../data/site.js';
import { sendLead } from '../lib/sendLead.js';
import { validateContact, buildLeadPayload } from '../lib/landingLead.js';

// Lean 2-field callback form for ad landing pages. Props: slug, service.
export function LandingForm({ slug, service = null }) {
  const [form, setForm] = useState({ name: '', phone: '', company: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  async function submit() {
    const errs = validateContact(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setSendError('');
    const res = await sendLead(buildLeadPayload({ ...form, slug, service }));
    setSending(false);
    if (res.ok) {
      setSent(true);
      // AdTracking listens for this and fires the lead conversion.
      document.dispatchEvent(new CustomEvent('lead-success'));
    } else {
      setSendError(`Couldn't send — please call us on ${SITE.phone}.`);
    }
  }

  if (sent) {
    return (
      <div className="form-success" role="status" aria-live="polite">
        ✓ Thanks {form.name.split(' ')[0] || 'mate'} — we'll call you back shortly.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-field">
        <label htmlFor="lf-name">Your name</label>
        <input id="lf-name" type="text" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Jane Doe"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'lf-name-err' : undefined} />
        {errors.name && <div id="lf-name-err" className="form-error" role="alert">{errors.name}</div>}
      </div>
      <div className="form-field">
        <label htmlFor="lf-phone">Phone number</label>
        <input id="lf-phone" type="tel" value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="04xx xxx xxx"
          aria-invalid={errors.phone ? 'true' : undefined}
          aria-describedby={errors.phone ? 'lf-phone-err' : undefined} />
        {errors.phone && <div id="lf-phone-err" className="form-error" role="alert">{errors.phone}</div>}
      </div>
      {/* Honeypot — hidden from users; the server rejects the lead if filled. */}
      <input type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true"
        value={form.company}
        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <button className="btn btn-primary btn-block btn-lg" disabled={sending} onClick={submit}>
        {sending ? 'Sending…' : 'Request my callback'}
      </button>
      {sendError && <div className="form-error" role="alert">{sendError}</div>}
      <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
        No spam, no obligation — just a friendly call back.
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/landingLead.js src/components/LandingForm.jsx tests/landingLead.test.js
git commit -m "feat(landing): add callback-form helpers + LandingForm island"
```

---

### Task 4: The landing route + build verification

**Files:**
- Create: `src/pages/go/[lp].astro`
- Test: `tests/landing-build.test.js`

**Interfaces:**
- Consumes: `LANDING_PAGES` (Task 1), `AdTracking` (Task 2), `LandingForm` (Task 3); existing `Layout`, `SiteFooter`, `MobileCta`, `PageScripts`, `PriceTable`; `SITE`, `SERVICE_BY_SLUG`, `SERVICES`, `HOURS`.
- Produces: static pages at `dist/go/<slug>/index.html` for all four slugs, each `noindex,nofollow`, call-first, excluded from the sitemap in Task 5.

- [ ] **Step 1: Write the failing test**

Create `tests/landing-build.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

beforeAll(() => {
  // Cold Astro build can take ~60-90s; allow generous headroom.
  execSync('npm run build', { stdio: 'inherit' });
}, 180000);

const SLUGS = ['screen-repair', 'battery', 'water-damage', 'repairs'];

describe('built ad landing pages', () => {
  it('builds all four /go/ pages', () => {
    for (const s of SLUGS) expect(existsSync(`dist/go/${s}/index.html`), s).toBe(true);
  });

  it('every landing page is noindex,nofollow', () => {
    for (const s of SLUGS) {
      const html = readFileSync(`dist/go/${s}/index.html`, 'utf8');
      expect(html, s).toContain('name="robots" content="noindex, nofollow"');
    }
  });

  it('leads with a tap-to-call link to the shop phone and shows the offer', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).toContain('href="tel:+61295333300"');
    expect(html).toContain('(02) 9533 3300');
    expect(html).toContain('Free diagnostic');
  });

  it('ships no tracking snippet while tag IDs are empty (the default)', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).not.toContain('googletagmanager.com/gtag');
    expect(html).not.toContain('fbevents.js');
  });

  it('does not fabricate a star rating / review count', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).not.toContain('aggregateRating');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- landing-build.test.js`
Expected: FAIL — the build emits no `dist/go/...` files yet, so the first assertion fails.

- [ ] **Step 3: Create the route**

Create `src/pages/go/[lp].astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import MobileCta from '../../components/MobileCta.astro';
import PageScripts from '../../components/PageScripts.astro';
import PriceTable from '../../components/PriceTable.astro';
import AdTracking from '../../components/AdTracking.astro';
import { LandingForm } from '../../components/LandingForm.jsx';
import { SITE } from '../../data/site.js';
import { LANDING_PAGES } from '../../data/landing.js';
import { SERVICE_BY_SLUG, SERVICES } from '../../data/repairs.js';
import { HOURS } from '../../data/content.js';

export function getStaticPaths() {
  return LANDING_PAGES.map((lp) => {
    const svc = lp.service ? SERVICE_BY_SLUG[lp.service] : null;
    if (lp.service && !svc) throw new Error(`landing "${lp.slug}" references unknown service "${lp.service}"`);
    return { params: { lp: lp.slug }, props: { lp, svc } };
  });
}

const { lp, svc } = Astro.props;
const path = `/go/${lp.slug}/`;

// Monday hours as the no-JS fallback; PageScripts refines #today-hours and
// #open-status to the visitor's real "today" client-side.
const todayHours = HOURS.find((h) => h.dow === 1)?.hrs || '9:00 AM – 6:00 PM';

const faqs = (lp.faqs && lp.faqs.length ? lp.faqs : svc?.faqs || []).slice(0, 4);
const fromCaption = svc?.fromCaption || lp.fromCaption || 'Repairs from';
const fromAmount = svc?.fromAmount || lp.fromAmount || '';
const turnaround = svc?.turnaround || 'Same day';
const heroImg = svc?.img || '/images/screen-repair.jpg';
const heroAlt = svc?.alt || 'Phone repair at Xpress Phone Repairs Riverwood';
const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapsQuery)}`;

const phoneSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';
---
<Layout
  title={lp.metaTitle}
  description={lp.metaDescription}
  path={path}
  noindex={true}
  htmlAttrs={{ 'data-palette': 'electric-blue', 'data-fontpair': 'jakarta', 'data-dark': 'false' }}
>
  <AdTracking />

  <header class="lp-header">
    <div class="container-wide lp-header-inner">
      <a href="/" class="lp-logo">{SITE.name}</a>
      <a href={SITE.phoneHref} class="btn btn-primary btn-sm"><Fragment set:html={phoneSvg} /> {SITE.phone}</a>
    </div>
  </header>

  <main id="main-content">
    <section class="hero" style="padding-bottom: 56px;">
      <div class="hero-bg"></div>
      <div class="container-wide" style="position: relative; z-index: 1;">
        <div class="hero-grid">
          <div>
            <span class="hero-badge"><span class="hero-badge-pill">Riverwood Plaza</span><span>{lp.offer}</span></span>
            <h1 class="hero-title" style="font-size: clamp(36px, 5vw, 58px);">{lp.h1}</h1>
            <p class="hero-sub">{lp.sub}</p>
            <div class="hero-ctas">
              <a href={SITE.phoneHref} class="btn btn-primary btn-lg"><Fragment set:html={phoneSvg} /> Call {SITE.phone}</a>
              <a href="#callback" class="btn btn-ghost btn-lg">Prefer a callback?</a>
            </div>
            <div class="hero-infobar">
              <div><div class="hero-info-label">Today</div><div class="hero-info-value" id="today-hours">{todayHours}</div></div>
              <div><div class="hero-info-label">Turnaround</div><div class="hero-info-value">{turnaround}</div></div>
              <div><div class="hero-info-label">Warranty</div><div class="hero-info-value">6–12 months</div></div>
              <div><div class="hero-info-label">Status</div><div class="hero-info-value" id="open-status">…</div></div>
            </div>
          </div>
          <div>
            <div class="lhero-media">
              <img src={heroImg} alt={heroAlt} fetchpriority="high" decoding="async" />
              <div class="lhero-media-overlay"></div>
              {fromAmount && (
                <div class="lhero-price-tag">
                  <div class="from">{fromCaption}</div>
                  <div class="amount">{fromAmount}</div>
                </div>
              )}
              <div class="lhero-media-caption"><span>Free diagnostic · No fix, no fee</span><span class="cap-sub">All major brands</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="pricing" style="background: var(--bg-soft); padding-top: 72px;">
      <div class="container-wide">
        <span class="eyebrow">Up-front pricing</span>
        <h2 class="section-title" style="margin-top: 14px;">Know the price before you come in.</h2>
        {svc ? (
          <PriceTable colLabel={svc.priceColLabel} note={svc.priceNote} rows={svc.rows} />
        ) : (
          <div class="lp-price-grid">
            {SERVICES.map((s) => (
              <a class="lp-price-card" href={SITE.phoneHref}>
                <span class="lp-price-card-label">{s.label}</span>
                <span class="lp-price-card-amount">{s.fromAmount}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>

    <section class="section-tight">
      <div class="container-wide">
        <span class="eyebrow">How it works</span>
        <h2 class="section-title" style="margin-top: 14px; font-size: clamp(28px, 3.5vw, 40px);">Three steps, one short visit.</h2>
        <div class="process-strip" style="margin-top: 36px;">
          <div class="process-step"><div class="process-step-num">1</div><div class="process-step-title">Call or drop in</div><div class="process-step-desc">Tell us your device &amp; the problem</div></div>
          <div class="process-step"><div class="process-step-num">2</div><div class="process-step-title">Free diagnostic</div><div class="process-step-desc">Quoted up front — no fix, no fee</div></div>
          <div class="process-step"><div class="process-step-num">3</div><div class="process-step-title">Walk out fixed</div><div class="process-step-desc">Tested &amp; warrantied, usually same day</div></div>
        </div>
      </div>
    </section>

    <section class="section-tight" id="callback" style="background: var(--bg-soft);">
      <div class="container-wide lp-callback">
        <div>
          <span class="eyebrow">Prefer a callback?</span>
          <h2 class="section-title" style="margin-top: 14px;">We'll call you back — fast.</h2>
          <p class="section-lede">Leave your number and we'll ring you to confirm your price and book a time. Or just call <a href={SITE.phoneHref}>{SITE.phone}</a> now.</p>
        </div>
        <div class="lp-form-card">
          <LandingForm client:visible slug={lp.slug} service={lp.service} />
        </div>
      </div>
    </section>

    {faqs.length > 0 && (
      <section class="section-tight" id="faq">
        <div class="container-wide">
          <div style="text-align: center;"><span class="eyebrow">FAQ</span><h2 class="section-title" style="margin-top: 14px; margin-inline: auto;">Good to know.</h2></div>
          <div class="faq-list">
            {faqs.map((f, i) => (
              <div class="faq-item" data-open={i === 0 ? 'true' : 'false'}>
                <button type="button" class="faq-q" aria-expanded={i === 0 ? 'true' : 'false'} aria-controls={`faq-a-${i}`}><span>{f.q}</span><span class="faq-toggle" aria-hidden="true">+</span></button>
                <div class="faq-a" id={`faq-a-${i}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )}

    <section class="section-tight" style="background: var(--bg-soft);">
      <div class="container-wide lp-findus">
        <div>
          <span class="eyebrow">Find us</span>
          <h2 class="section-title" style="margin-top: 14px;">{SITE.storeName}</h2>
          <p class="section-lede">{SITE.addressShort}</p>
          <div class="hero-ctas" style="margin-top: 20px;">
            <a href={SITE.phoneHref} class="btn btn-primary btn-lg"><Fragment set:html={phoneSvg} /> Call {SITE.phone}</a>
            <a href={mapsHref} class="btn btn-ghost btn-lg" target="_blank" rel="noopener">Get directions</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
  <MobileCta />
  <PageScripts />
</Layout>

<style>
  .lp-header { position: sticky; top: 0; z-index: 50; background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border-soft, #e5e7eb); }
  .lp-header-inner { display: flex; align-items: center; justify-content: space-between; padding-block: 12px; }
  .lp-logo { font-weight: 800; font-size: 18px; color: var(--text, #0f172a); text-decoration: none; }
  .lp-price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-top: 28px; }
  .lp-price-card { display: flex; flex-direction: column; gap: 6px; padding: 18px 20px; border-radius: 14px; background: #fff; border: 1px solid var(--border-soft, #e5e7eb); text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .lp-price-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); }
  .lp-price-card-label { font-weight: 600; color: var(--text, #0f172a); }
  .lp-price-card-amount { font-size: 22px; font-weight: 800; color: var(--brand-700, #0a66ff); }
  .lp-callback, .lp-findus { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .lp-form-card { background: #fff; border: 1px solid var(--border-soft, #e5e7eb); border-radius: 18px; padding: 28px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); }
  @media (max-width: 768px) {
    .lp-callback, .lp-findus { grid-template-columns: 1fr; gap: 24px; }
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- landing-build.test.js`
Expected: PASS (5 passing). If the build throws, read the Astro error — a missing CSS var falls back safely, but an undefined data field (e.g. a typo in `landing.js`) will surface here.

- [ ] **Step 5: Commit**

```bash
git add src/pages/go/[lp].astro tests/landing-build.test.js
git commit -m "feat(landing): add call-first /go/ ad landing route"
```

---

### Task 5: Exclude landing pages from the sitemap

**Files:**
- Modify: `astro.config.mjs`
- Test: `tests/landing-build.test.js` (append one assertion)

**Interfaces:**
- Consumes: nothing new.
- Produces: `sitemap-*.xml` with no `/go/` URLs, while existing `/repairs/` URLs remain.

- [ ] **Step 1: Add the failing assertion**

In `tests/landing-build.test.js`, inside the `describe('built ad landing pages', ...)` block, add:

```js
  it('excludes /go/ landing pages from the sitemap', () => {
    const xml = ['dist/sitemap-0.xml', 'dist/sitemap-1.xml']
      .filter(existsSync)
      .map((p) => readFileSync(p, 'utf8'))
      .join('');
    expect(xml).toContain('/repairs/'); // sanity: the sitemap has real content
    expect(xml).not.toContain('/go/');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- landing-build.test.js`
Expected: FAIL — the new assertion finds `/go/` URLs in the sitemap (not yet filtered).

- [ ] **Step 3: Add the sitemap filter**

In `astro.config.mjs`, change the integrations line:

```js
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/go/') })],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- landing-build.test.js`
Expected: PASS (6 passing).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all suites green, including the existing `build-output.test.js` (still finds `/repairs/screen/riverwood/` in the sitemap).

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs tests/landing-build.test.js
git commit -m "feat(landing): exclude /go/ ad pages from sitemap"
```

---

### Task 6: Documentation + README note

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-23-ad-landing-pages-design.md` (mark status: implemented)

**Interfaces:** none (docs only).

- [ ] **Step 1: Add a README section**

In `README.md`, after the "Lead delivery (`/api/lead`)" section, add:

```markdown
## Ad landing pages (`/go/`)

Conversion-first landing pages for paid campaigns, separate from the SEO
`repairs/` family. They are `noindex` and excluded from the sitemap.

- Pages: `/go/screen-repair/`, `/go/battery/`, `/go/water-damage/`, `/go/repairs/`.
- Copy lives in `src/data/landing.js` (prices/FAQs are reused from
  `src/data/repairs.js` — never duplicated).
- **Conversion tracking:** fill in the tag IDs in `src/data/tracking.js`
  (GA4, Google Ads conversion ID + call/lead labels, Meta Pixel). Until an ID
  is set its tag does not load. A tap-to-call fires a call conversion; a
  successful callback-form submit fires a lead conversion.
```

- [ ] **Step 2: Mark the spec implemented**

In `docs/superpowers/specs/2026-06-23-ad-landing-pages-design.md`, change the `**Status:**` line to:

```markdown
**Status:** Implemented (2026-06-23)
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/2026-06-23-ad-landing-pages-design.md
git commit -m "docs(landing): document /go/ ad landing pages + tracking setup"
```

---

## How to fill in tracking IDs (post-merge, no code change needed beyond IDs)

Edit `src/data/tracking.js` and set the strings, then rebuild/deploy:

| Field | Where to get it |
| --- | --- |
| `ga4Id` | GA4 Admin → Data Streams → your web stream → `G-XXXXXXXXXX` |
| `googleAdsId` | Google Ads → Goals → Conversions → tag setup → `AW-XXXXXXXXXX` |
| `googleAdsCallLabel` | The conversion **label** for your "Call" action (the part after the `/` in `send_to`) |
| `googleAdsLeadLabel` | The conversion **label** for your "Lead/Form" action |
| `metaPixelId` | Meta Events Manager → your pixel → numeric ID |

---

## Self-Review (completed by plan author)

**Spec coverage:**
- 4 pages / `/go/<slug>/` → Task 1 (data) + Task 4 (route). ✓
- Call-first hero + sticky call + form fallback → Task 4 (hero, `MobileCta`) + Task 3 (`LandingForm`). ✓
- Hooks: same-day / free diagnostic / warranty → Task 1 `offer` copy + Task 4 hero infobar (`6–12 months`) + process strip. ✓
- Tracking GA4 + Google Ads + Meta → Task 2 (`AdTracking` + config), fired by Task 4 tel-links and Task 3 `lead-success`. ✓
- noindex + sitemap exclusion → Task 4 (`noindex={true}`) + Task 5 (filter). ✓
- Lean 2-field form, service pre-filled, `source: landing:<slug>` → Task 3. ✓
- Honesty: no fabricated review count → asserted in Task 4 test; prices only from `SERVICES`. ✓
- Catch-all per-service price grid → Task 4 (`svc ? PriceTable : lp-price-grid`). ✓
- Error handling: send failure shows "call us", build-time guard on bad service slug → Task 3 + Task 4 `getStaticPaths`. ✓

**Placeholder scan:** No TBD/TODO. Empty tracking IDs are intentional config, asserted by tests. ✓

**Type consistency:** `validateContact`/`buildLeadPayload` signatures match between Task 3 definition and `LandingForm` usage. `LANDING_PAGES` field names match between `landingPageSchema` (Task 1), `landing.js` entries (Task 1), and route consumption (Task 4: `lp.slug/service/metaTitle/metaDescription/h1/sub/offer/fromCaption/fromAmount/faqs`). `lead-success` event name matches between `LandingForm` (dispatch) and `AdTracking` (listen). ✓
