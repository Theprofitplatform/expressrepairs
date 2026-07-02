import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { TRACKING } from '../src/data/tracking.js';

let html = '';
beforeAll(() => {
  // Cold Astro build can take ~60-90s; allow generous headroom.
  execSync('npm run build', { stdio: 'inherit' });
  html = readFileSync('dist/index.html', 'utf8');
}, 120000);

function jsonLdBlocks(markup) {
  return [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

describe('built homepage', () => {
  it('has the canonical tag', () => {
    expect(html).toContain('rel="canonical" href="https://expressrepairs.com.au/"');
  });
  it('server-renders core content (not a blank SPA shell)', () => {
    expect(html).toContain('(02) 9533 3300');
    expect(html).toContain('Get a free quote');
  });
  it('renders the real NAP (Riverwood Plaza, minute-accurate closes)', () => {
    expect(html).toContain('Riverwood NSW 2210');
    const lb = jsonLdBlocks(html).find((b) => b['@type'] === 'LocalBusiness');
    expect(lb.address.addressLocality).toBe('Riverwood');
    expect(lb.address.postalCode).toBe('2210');
    const monday = lb.openingHoursSpecification.find((o) => o.dayOfWeek === 'Monday');
    expect(monday.closes).toBe('18:00');
    // Sunday is closed → omitted from the opening-hours spec entirely.
    expect(lb.openingHoursSpecification.find((o) => o.dayOfWeek === 'Sunday')).toBeUndefined();
  });
  it('includes LocalBusiness and FAQ JSON-LD (parsed, order-independent)', () => {
    const types = jsonLdBlocks(html).map((b) => b['@type']);
    expect(types).toContain('LocalBusiness');
    expect(types).toContain('FAQPage');
  });
  it('does NOT load Babel standalone or unpkg React (the old SPA stack)', () => {
    expect(html).not.toContain('@babel/standalone');
    expect(html).not.toContain('unpkg.com/react');
  });
  it('emitted a sitemap and a real 404 page', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    expect(existsSync('dist/404.html')).toBe(true);
  });
  it('ships an og:image and a real <main> landmark + skip link', () => {
    expect(html).toContain('property="og:image"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('class="skip-link"');
  });
  it('no longer pulls avatars from the i.pravatar.cc placeholder service', () => {
    expect(html).not.toContain('pravatar');
  });
  it('loads GA4 site-wide (homepage carries the measurement id + gtag loader)', () => {
    // GA4 must be present on a non-/go/ page — proves SiteAnalytics is site-wide,
    // not scoped to the ad landing pages. Skips automatically if GA4 is unset.
    if (TRACKING.ga4Id) {
      expect(html).toContain('googletagmanager.com/gtag/js');
      expect(html).toContain(TRACKING.ga4Id);
    }
  });
});

describe('built local-SEO pages', () => {
  it('the suburb page carries Service + FAQPage + a single canonical LocalBusiness @id', () => {
    const suburb = readFileSync('dist/repairs/screen/riverwood/index.html', 'utf8');
    const blocks = jsonLdBlocks(suburb);
    const types = blocks.map((b) => b['@type']);
    expect(types).toContain('Service');
    expect(types).toContain('FAQPage');
    const lb = blocks.find((b) => b['@type'] === 'LocalBusiness');
    expect(lb['@id']).toContain('#business');
    const svc = blocks.find((b) => b['@type'] === 'Service');
    expect(String(svc.offers.price)).toBeTruthy();
  });
  it('the service page carries an FAQPage and a Home-rooted breadcrumb', () => {
    const svc = readFileSync('dist/repairs/screen/index.html', 'utf8');
    const blocks = jsonLdBlocks(svc);
    expect(blocks.map((b) => b['@type'])).toContain('FAQPage');
    const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement[0].name).toBe('Home');
  });
  it('does not ship crawlable dead "#" suburb links', () => {
    const svc = readFileSync('dist/repairs/back-glass/index.html', 'utf8');
    expect(svc).not.toContain('class="link-chip" href="#"');
  });
  it('the sitemap lists a built local page', () => {
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).toContain('/repairs/screen/riverwood/');
  });
});

describe('staff review-request page', () => {
  it('builds as a noindex page', () => {
    const staff = readFileSync('dist/staff/review-request/index.html', 'utf8');
    expect(staff).toContain('name="robots" content="noindex, nofollow"');
    expect(staff).toContain('id="rr-form"');
  });

  it('is excluded from the sitemap', () => {
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).not.toContain('/staff/');
  });
});
