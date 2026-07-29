import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SERVICES } from '../src/data/repairs.js';

// The GBP kit's service table is pasted straight into Google Business Profile by
// the owner, so a stale price there quotes a walk-in customer a number we won't
// honour. It drifted once already (back glass $69 vs the site's $99, water damage
// $99 vs $149) because nothing connected the doc to the data. This does.
const KIT = readFileSync(new URL('../docs/seo-offsite-kit.md', import.meta.url), 'utf8');

// "| Phone Screen Repair | From $99 | ..." → { 'Phone Screen Repair': '$99' }
const kitPrices = Object.fromEntries(
  [...KIT.matchAll(/^\|\s*([^|]+?)\s*\|\s*From (\$[\d,]+)\s*\|/gm)].map((m) => [m[1], m[2]]),
);

// GBP service name → service slug in src/data/repairs.js.
const SERVICE_BY_GBP_NAME = {
  'Phone Screen Repair': 'screen',
  'Phone Battery Replacement': 'battery',
  'Charging Port Repair': 'charging-port',
  'Back Glass Replacement': 'back-glass',
  'Camera Repair': 'camera',
  'Water Damage Repair': 'water-damage',
  'iPhone Screen Repair': 'iphone-screen',
  'Samsung Screen Repair': 'samsung-screen',
  'iPhone Battery Replacement': 'iphone-battery',
  'iPad Repair': 'ipad',
};

describe('GBP kit service prices match the site', () => {
  // Per-generation model pages (iPhone 13 Battery, …) are SEO landing pages, not
  // things you list as GBP services — Google's service list is by job, not by
  // handset. Only the job-level services have to appear in the kit.
  it('lists every service the site publishes a price for', () => {
    const slugs = SERVICES.filter((s) => !s.modelPage).map((s) => s.slug).sort();
    expect(Object.values(SERVICE_BY_GBP_NAME).sort()).toEqual(slugs);
  });

  for (const [gbpName, slug] of Object.entries(SERVICE_BY_GBP_NAME)) {
    it(`${gbpName} quotes the same "from" price as /repairs/${slug}/`, () => {
      const svc = SERVICES.find((s) => s.slug === slug);
      expect(kitPrices[gbpName], `"${gbpName}" row missing from the kit table`).toBe(svc.fromAmount);
    });
  }
});
