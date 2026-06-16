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
  // Add your Google Business / Facebook / Instagram profile URLs here to link
  // the business entity (emitted as schema.org `sameAs`).
  sameAs: [],
  // ⚠️ Star rich-results: set `count` to your REAL Google review count to emit
  // an aggregateRating. Left null so we never publish a fabricated review count.
  rating: { value: 4.9, count: null, best: 5 },
});
