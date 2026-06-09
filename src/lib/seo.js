import { dayName, parseTimeToMinutes, splitHoursRange } from './hours.js';

// Keep in sync with the `site` field in astro.config.mjs.
export const SITE_URL = 'https://expressrepairs.com.au';

export function canonical(path = '/') {
  const trimmed = String(path).replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? `${SITE_URL}/` : `${SITE_URL}/${trimmed}/`;
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
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
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
    openingHoursSpecification: hours.map((h) => {
      const [open, close] = splitHoursRange(h.hrs);
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayName(h.dow),
        opens: fmtTime(open),
        closes: fmtTime(close),
      };
    }),
  };
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
