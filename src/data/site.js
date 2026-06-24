import { siteSchema } from './schema.js';

// Real NAP — Mertel Pty Ltd (ABN 88 644 567 019) trading as Xpress Phone Repairs,
// the former Metro Wireless Vodafone dealer at Riverwood Plaza.
export const SITE = siteSchema.parse({
  name: 'Express Repairs',
  // Store-location display name (Avi's correction) — distinct from the brand name.
  storeName: 'Xpress Phone Repairs Riverwood',
  storeSub: 'Inside Metro Wireless Store',
  // Primary number site-wide — the mobile, matching the Google Business listing
  // (used for every call CTA and as the schema NAP telephone). The landline is
  // shown as a clearly-labelled secondary contact (e.g. in the footer).
  phone: '0415 303 300',
  phoneHref: 'tel:+61415303300',
  landline: '(02) 9533 3300',
  landlineHref: 'tel:+61295333300',
  addressLines: ['Shop 7C, Riverwood Plaza, 247-267 Belmore Rd', 'Riverwood NSW 2210'],
  addressShort: 'Riverwood Plaza, 247-267 Belmore Rd, Riverwood NSW 2210',
  mapsQuery: 'Riverwood Plaza 247-267 Belmore Rd Riverwood NSW 2210',
  tagline: 'Same-day phone repairs done right',
  address: { locality: 'Riverwood', region: 'NSW', postalCode: '2210', country: 'AU' },
  geo: { lat: -33.9522, lng: 151.051 },
  // Structured-data extras (LocalBusiness JSON-LD).
  image: '/images/screen-repair.jpg',
  priceRange: '$49–$169',
  // Add your Google Business / Facebook / Instagram profile URLs here to link
  // the business entity (emitted as schema.org `sameAs`).
  sameAs: [],
  // ⚠️ Star rich-results: `count` is the REAL Google review count, verified from
  // the GBP listing on 2026-06-24 (4.9★, 17 reviews) — emits a genuine aggregateRating.
  rating: { value: 4.9, count: 17, best: 5 },
});
