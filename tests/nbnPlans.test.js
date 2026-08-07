import { describe, it, expect } from 'vitest';
import { NBN_PLANS, NBN_INTRO_OFF, nbnIntroPrice } from '../src/data/plans.js';

describe('NBN_PLANS', () => {
  it('has 9 plans with unique names', () => {
    expect(NBN_PLANS).toHaveLength(9);
    expect(new Set(NBN_PLANS.map((p) => p.name)).size).toBe(9);
  });

  it('has exactly one featured plan', () => {
    expect(NBN_PLANS.filter((p) => p.featured)).toHaveLength(1);
  });

  it('advertises no lock-in on every plan', () => {
    for (const p of NBN_PLANS) expect(p.features.some((f) => /no lock-in/i.test(f))).toBe(true);
  });

  it('states a typical business-hour speed on every plan', () => {
    for (const p of NBN_PLANS) expect(p.typical).toMatch(/^\d+\/\d+ Mbps$/);
  });

  it('keeps the noIntro flag through the zod schema', () => {
    // nbnPlanSchema strips undeclared keys, so dropping `noIntro` from the
    // schema would silently pull both list-price plans back into the discount
    // with nothing else failing. This is the tripwire for that.
    const excluded = NBN_PLANS.filter((p) => p.noIntro);
    expect(excluded.map((p) => p.name)).toEqual(['NBN 2000/200', 'NBN 2000/500']);
    for (const p of excluded) expect(nbnIntroPrice(p)).toBe(p.price);
    for (const p of NBN_PLANS.filter((p) => !p.noIntro)) {
      expect(nbnIntroPrice(p)).toBe(p.price - NBN_INTRO_OFF);
    }
  });
});
