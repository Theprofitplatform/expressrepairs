import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { TRACKING } from '../src/data/tracking.js';

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

  it('leads with a tap-to-call to the mobile, with the landline also listed', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).toContain('href="tel:+61415303300"'); // mobile = primary call CTA
    expect(html).toContain('0415 303 300');
    expect(html).toContain('href="tel:+61295333300"'); // landline still available (footer)
    expect(html).toContain('(02) 9533 3300');
    expect(html).toContain('Free diagnostic');
  });

  it('loads each tracking tag only when its ID is configured', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    // Meta Pixel is configured → its loader and the real id ship to the page.
    if (TRACKING.metaPixelId) {
      expect(html).toContain('fbevents.js');
      expect(html).toContain(`"metaPixelId":"${TRACKING.metaPixelId}"`);
    }
    // GA4 / Google Ads unset → the embedded config carries empty ids, so gtag
    // never initialises (its loader URL is present in the script but inert).
    if (!TRACKING.ga4Id) expect(html).toContain('"ga4Id":""');
    if (!TRACKING.googleAdsId) expect(html).toContain('"googleAdsId":""');
    // Nothing configured at all → AdTracking renders no script.
    if (!TRACKING.metaPixelId && !TRACKING.ga4Id && !TRACKING.googleAdsId) {
      expect(html).not.toContain('fbevents.js');
    }
  });

  it('does not fabricate a star rating / review count', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).not.toContain('aggregateRating');
  });

  it('the catch-all /go/repairs/ page renders the per-service price grid', () => {
    const html = readFileSync('dist/go/repairs/index.html', 'utf8');
    expect(html).toContain('lp-price-card');
  });

  it('excludes /go/ landing pages from the sitemap', () => {
    const xml = ['dist/sitemap-0.xml', 'dist/sitemap-1.xml']
      .filter(existsSync)
      .map((p) => readFileSync(p, 'utf8'))
      .join('');
    expect(xml).toContain('/repairs/'); // sanity: the sitemap has real content
    expect(xml).not.toContain('/go/');
  });
});
