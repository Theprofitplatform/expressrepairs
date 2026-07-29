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

describe('owner price overrides', () => {
  it('every Hanman case is $29.95 phone / $39.95 tablet', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const hanman = PRODUCTS.filter((p) => /hanman/i.test(p.name) && /Cases/.test(p.category));
    expect(hanman.length).toBeGreaterThan(300); // DXPOS + HOCO both covered
    for (const p of hanman) {
      expect(p.priceCents).toBe(p.category === 'Tablet & iPad Cases' ? 3995 : 2995);
    }
  });

  it('every Korean Simple D case is $29.95, Double Folio $39.95', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const simpleD = PRODUCTS.filter((p) => /simple d/i.test(p.name) && /Cases/.test(p.category));
    expect(simpleD.length).toBeGreaterThan(200);
    for (const p of simpleD) {
      expect(p.priceCents).toBe(/double/i.test(p.name) ? 3995 : 2995);
    }
  });
});

/**
 * The shop's own counter price must beat the supplier's RRP.
 *
 * ~1,510 products the POS stocks are listed under their H-/M- SUPPLIER id,
 * because the DXPOS row carrying the shop price has no photo and never reaches
 * products.json. The site therefore quoted the supplier's RRP — which was
 * visibly wrong in both directions: Apple EarPods listed at $119.90 that the
 * shop sells for $39.95, and other lines listed BELOW the counter price,
 * losing margin on every web order.
 */
describe('POS price beats supplier RRP', () => {
  it('never leaves a supplier listing at a price the POS contradicts', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const { default: POS } = await import('../src/data/pos-prices.json');
    const wrong = PRODUCTS.filter(
      (p) => /^[HM]-/.test(p.id) && POS[p.name] && POS[p.name] !== p.priceCents,
    );
    // Owner overrides (priceFix) run last and deliberately outrank the POS, so
    // allow those; nothing else may disagree.
    const notOwnerSet = wrong.filter((p) => !/hanman|simple d/i.test(p.name));
    expect(notOwnerSet.map((p) => `${p.id} ${p.name}`)).toEqual([]);
  });

  it('only touches supplier-sourced listings — a DXPOS row keeps its own price', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const { default: raw } = await import('../src/data/products.json');
    const byId = new Map(raw.map((p) => [p.id, p.priceCents]));
    for (const p of PRODUCTS) {
      if (!p.id.startsWith('X-')) continue;
      if (/hanman|simple d/i.test(p.name)) continue; // owner override wins
      expect(p.priceCents, p.id).toBe(byId.get(p.id));
    }
  });

  it('carries the known corrections', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const at = (id) => PRODUCTS.find((p) => p.id === id)?.priceCents;
    expect(at('M-10003900')).toBe(3995); // Apple EarPods — was $119.90
    expect(at('M-10009839')).toBe(1795); // USB-C to 3.5mm — was $69.90
  });
});
