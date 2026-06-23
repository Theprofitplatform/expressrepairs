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
