import { siteSchema } from './schema.js';

// Real NAP — Mertel Pty Ltd (ABN 88 644 567 019) trading as Xpress Phone Repairs,
// the former Metro Wireless Vodafone dealer at Riverwood Plaza.
export const SITE = siteSchema.parse({
  name: 'Express Repairs',
  phone: '(02) 9533 3300',
  phoneHref: 'tel:+61295333300',
  addressLines: ['Shop 7C, Riverwood Plaza, 247-267 Belmore Rd', 'Riverwood NSW 2210'],
  addressShort: 'Riverwood Plaza, 247-267 Belmore Rd, Riverwood NSW 2210',
  mapsQuery: 'Riverwood Plaza 247-267 Belmore Rd Riverwood NSW 2210',
  tagline: 'Same-day phone repairs done right',
  address: { locality: 'Riverwood', region: 'NSW', postalCode: '2210', country: 'AU' },
  geo: { lat: -33.9522, lng: 151.051 },
});
