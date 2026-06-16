import { dayName, parseTimeToMinutes, splitHoursRange, isTradingDay } from './hours.js';

// Keep in sync with the `site` field in astro.config.mjs.
export const SITE_URL = 'https://expressrepairs.com.au';

// Stable @id for the one canonical business entity. Reference this from inner
// pages (provider/areaServed) instead of re-declaring a partial LocalBusiness,
// so Google consolidates every page onto a single business node.
export const BUSINESS_ID = `${SITE_URL}/#business`;

export function canonical(path = '/') {
  const trimmed = String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? `${SITE_URL}/` : `${SITE_URL}/${trimmed}/`;
}

// Absolute URL for an asset path like "/images/x.jpg".
export function absoluteUrl(path) {
  return new URL(String(path || '/'), SITE_URL).href;
}

// "9:00 AM" -> "09:00", "5:30 PM" -> "17:30" (minute-accurate, schema.org time format)
function fmtTime(s) {
  const mins = parseTimeToMinutes(s);
  if (mins === null) return '00:00';
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function localBusinessSchema(site, hours) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': BUSINESS_ID,
    name: site.name,
    url: `${SITE_URL}/`,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.addressLines[0],
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    // Closed days are omitted from the spec (schema.org convention).
    openingHoursSpecification: hours.filter((h) => isTradingDay(h.hrs)).map((h) => {
      const [open, close] = splitHoursRange(h.hrs);
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayName(h.dow),
        opens: fmtTime(open),
        closes: fmtTime(close),
      };
    }),
  };
  if (site.image) schema.image = absoluteUrl(site.image);
  if (site.priceRange) schema.priceRange = site.priceRange;
  if (Array.isArray(site.sameAs) && site.sameAs.length) schema.sameAs = site.sameAs;
  // Only emit aggregateRating when a REAL review count is configured — never
  // ship a fabricated rating/count (Google review-snippet & ACCC policy).
  if (site.rating && Number(site.rating.count) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(site.rating.value),
      reviewCount: String(site.rating.count),
      bestRating: String(site.rating.best ?? 5),
    };
  }
  return schema;
}

// A minimal reference to the canonical business, for use as a Service provider
// or areaServed on inner pages (points at the full node via @id).
export function businessRef(site) {
  return { '@type': 'LocalBusiness', '@id': BUSINESS_ID, name: site.name };
}

export function faqPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  };
}
