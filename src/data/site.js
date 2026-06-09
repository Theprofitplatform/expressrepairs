import { siteSchema } from './schema.js';

// NOTE: address/geo below are PLACEHOLDERS — replace with the real shop NAP at launch.
export const SITE = siteSchema.parse({
  name: 'Express Repairs',
  phone: '1300 373 773',
  phoneHref: 'tel:+611300373773',
  addressLines: ['Shop 12, 100 Main Street', 'Sydney NSW 2000'],
  addressShort: '100 Main Street, Sydney NSW 2000',
  mapsQuery: '100 Main Street Sydney',
  tagline: 'Same-day phone repairs done right',
  address: { locality: 'Sydney', region: 'NSW', postalCode: '2000', country: 'AU' },
  geo: { lat: -33.8688, lng: 151.2093 },
});
