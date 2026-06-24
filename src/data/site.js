import { siteSchema } from './schema.js';

// Real NAP — Mertel Pty Ltd (ABN 88 644 567 019) trading as Xpress Phone Repairs,
// the former Metro Wireless Vodafone dealer at Riverwood Plaza.
export const SITE = siteSchema.parse({
  name: 'Express Repairs',
  // Store-location display name (Avi's correction) — distinct from the brand name.
  storeName: 'Xpress Phone Repairs Riverwood',
  storeSub: 'Inside Metro Wireless Store',
  phone: '(02) 9533 3300',
  phoneHref: 'tel:+61295333300',
  addressLines: ['Shop 7C, Riverwood Plaza, 247-267 Belmore Rd', 'Riverwood NSW 2210'],
  addressShort: 'Riverwood Plaza, 247-267 Belmore Rd, Riverwood NSW 2210',
  mapsQuery: 'Riverwood Plaza 247-267 Belmore Rd Riverwood NSW 2210',
  tagline: 'Same-day phone repairs done right',
  address: { locality: 'Riverwood', region: 'NSW', postalCode: '2210', country: 'AU' },
  geo: { lat: -33.9522, lng: 151.051 },
  // Structured-data extras (LocalBusiness JSON-LD).
  image: '/images/screen-repair.jpg',
  priceRange: '$49–$169',
  // Official business profiles — emitted as schema.org `sameAs` so Google can
  // reconcile this site with the same entity on Maps/Facebook/Instagram.
  sameAs: [
    'https://share.google/8M0VDZRfbNvnQiwbD', // Google Business Profile (Xpress Phone Repairs Riverwood)
    'https://www.facebook.com/people/Xpress-Repairs/61590991947576/',
    'https://www.instagram.com/xpressrepairs.riverwood/',
  ],
  // Star rich-results: REAL Google rating + review count (owner-confirmed from
  // the GBP listing, 2026-06-24) — emits aggregateRating in the LocalBusiness JSON-LD.
  rating: { value: 4.9, count: 17, best: 5 },
});
