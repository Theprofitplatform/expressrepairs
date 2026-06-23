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
