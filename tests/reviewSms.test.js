import { describe, it, expect } from 'vitest';
import { normalizeAuMobile, buildReviewMessage } from '../functions/api/review-sms.js';

describe('normalizeAuMobile', () => {
  it('normalises common AU mobile formats to E.164', () => {
    expect(normalizeAuMobile('0412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('+61 412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('61412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('(04) 1234-5678')).toBe('+61412345678');
  });

  it('rejects landlines, short numbers and junk', () => {
    expect(normalizeAuMobile('0298765432')).toBeNull(); // Sydney landline
    expect(normalizeAuMobile('0412345')).toBeNull();     // too short
    expect(normalizeAuMobile('')).toBeNull();
    expect(normalizeAuMobile('not a phone')).toBeNull();
    expect(normalizeAuMobile(null)).toBeNull();
  });
});

describe('buildReviewMessage', () => {
  it('includes the name, brand, review link and sign-off', () => {
    const msg = buildReviewMessage('Sam', 'https://g.page/r/abc/review');
    expect(msg).toContain('Hi Sam,');
    expect(msg).toContain('Xpress Phone Repairs at Riverwood Plaza');
    expect(msg).toContain('https://g.page/r/abc/review');
    expect(msg).toContain('— The team');
  });

  it('falls back to "there" for a blank name and strips control chars', () => {
    expect(buildReviewMessage('', 'L')).toContain('Hi there,');
    expect(buildReviewMessage('A\nB', 'L')).toContain('Hi A B,');
  });
});
