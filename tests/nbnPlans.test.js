import { describe, it, expect } from 'vitest';
import { NBN_PLANS } from '../src/data/plans.js';

describe('NBN_PLANS', () => {
  it('has 9 plans with unique names', () => {
    expect(NBN_PLANS).toHaveLength(9);
    expect(new Set(NBN_PLANS.map((p) => p.name)).size).toBe(9);
  });

  it('has exactly one featured plan', () => {
    expect(NBN_PLANS.filter((p) => p.featured)).toHaveLength(1);
  });

  it('prices the TeleChoice bundle at exactly 10% off list', () => {
    for (const p of NBN_PLANS) expect(p.bundle).toBeCloseTo(p.price * 0.9, 2);
  });

  it('advertises no lock-in on every plan', () => {
    for (const p of NBN_PLANS) expect(p.features.some((f) => /no lock-in/i.test(f))).toBe(true);
  });

  it('states a typical business-hour speed on every plan', () => {
    for (const p of NBN_PLANS) expect(p.typical).toMatch(/^\d+\/\d+ Mbps$/);
  });
});
