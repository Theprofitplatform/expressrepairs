import { describe, it, expect } from 'vitest';
import { SERVICES, SERVICE_BY_SLUG, LOCAL_PAGES, SUBURB_CHIPS } from '../src/data/repairs.js';

const slugSafe = /^[a-z0-9-]+$/;

// Guards the params that getStaticPaths derives — a malformed slug or a local
// page pointing at a non-existent service would 404 a live SEO page or break
// the build (svc would be undefined in the template).
describe('repair routing data integrity', () => {
  it('every service slug is URL-safe and unique', () => {
    const slugs = SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s, s).toMatch(slugSafe);
  });

  it('every service resolves through SERVICE_BY_SLUG', () => {
    for (const s of SERVICES) expect(SERVICE_BY_SLUG[s.slug]).toBe(s);
  });

  it('every LOCAL_PAGES entry references a real service and a URL-safe suburb', () => {
    for (const p of LOCAL_PAGES) {
      expect(SERVICE_BY_SLUG[p.service], `service "${p.service}"`).toBeTruthy();
      expect(p.suburb, p.suburb).toMatch(slugSafe);
      expect(p.faqs?.length, `faqs for ${p.service}/${p.suburb}`).toBeGreaterThan(0);
    }
  });

  it('every built suburb is listed in SUBURB_CHIPS (so it can be internally linked)', () => {
    for (const p of LOCAL_PAGES) {
      expect(SUBURB_CHIPS, p.suburbName).toContain(p.suburbName);
    }
  });
});
