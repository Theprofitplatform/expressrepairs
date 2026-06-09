import { describe, it, expect } from 'vitest';
import { BRANDS } from '../src/data/brands.js';
import { ISSUES, REPAIR_CARDS } from '../src/data/services.js';
import { SITE } from '../src/data/site.js';
import { FAQS, HOURS } from '../src/data/content.js';
import { SIM_PLANS, HANDSET_PLANS } from '../src/data/plans.js';
import { ACCESSORIES, BRAND_TILES } from '../src/data/accessories.js';
import { TESTIMONIALS, WARRANTIES } from '../src/data/content.js';

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

  it('all data modules parse and are non-empty', () => {
    for (const arr of [SIM_PLANS, HANDSET_PLANS, ACCESSORIES, BRAND_TILES, TESTIMONIALS, WARRANTIES]) {
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
    }
  });

  it('every testimonial has substantial text (guards against truncation)', () => {
    for (const t of TESTIMONIALS) {
      expect(t.text.length).toBeGreaterThan(40);
    }
  });
});
