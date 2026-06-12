import { describe, it, expect } from 'vitest';
import { canonical, localBusinessSchema, faqPageSchema, breadcrumbSchema } from '../src/lib/seo.js';
import { isTradingDay } from '../src/lib/hours.js';
import { SITE } from '../src/data/site.js';
import { FAQS, HOURS } from '../src/data/content.js';

describe('canonical()', () => {
  it('returns the trailing-slash root for "/"', () => {
    expect(canonical('/')).toBe('https://expressrepairs.com.au/');
  });
  it('normalises a nested path to a single trailing slash', () => {
    expect(canonical('repairs/screen')).toBe('https://expressrepairs.com.au/repairs/screen/');
    expect(canonical('/repairs/screen/')).toBe('https://expressrepairs.com.au/repairs/screen/');
  });
});

describe('localBusinessSchema()', () => {
  const s = localBusinessSchema(SITE, HOURS);
  it('is a LocalBusiness with telephone + postal address', () => {
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.telephone).toBe(SITE.phone);
    expect(s.address['@type']).toBe('PostalAddress');
    expect(s.address.addressRegion).toBe(SITE.address.region);
  });
  it('emits one openingHours entry per trading day (closed days omitted)', () => {
    const tradingDays = HOURS.filter((h) => isTradingDay(h.hrs)).length;
    expect(s.openingHoursSpecification).toHaveLength(tradingDays);
    expect(s.openingHoursSpecification[0].dayOfWeek).toBeTruthy();
  });
});

describe('faqPageSchema()', () => {
  it('emits a Question per FAQ', () => {
    const f = faqPageSchema(FAQS);
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity).toHaveLength(FAQS.length);
    expect(f.mainEntity[0]['@type']).toBe('Question');
    expect(f.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('breadcrumbSchema()', () => {
  it('numbers items in order', () => {
    const b = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Repairs', path: '/repairs/' },
    ]);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].item).toBe('https://expressrepairs.com.au/repairs/');
  });
});
