// Ad landing-page overlay. Each entry maps a campaign slug to an existing
// service (for prices/FAQs from ./repairs.js) plus ad-specific copy. The
// catch-all entry (service: null) lists every service and carries its own FAQs.
// Validated by landingPageSchema — see ./schema.js.
import { z } from 'zod';
import { landingPageSchema } from './schema.js';

export const LANDING_PAGES = z.array(landingPageSchema).parse([
  {
    slug: 'screen-repair',
    service: 'screen',
    metaTitle: 'Same-Day Phone Screen Repair — Riverwood | Xpress Phone Repairs',
    metaDescription: 'Cracked screen? Same-day phone screen repair at Riverwood Plaza from $99. Free diagnostic, no fix no fee, 6–12 month warranty. Call (02) 9533 3300.',
    h1: 'Cracked screen? Fixed today.',
    sub: 'Same-day screen replacement for iPhone, Samsung, Pixel and more — original-quality parts, fitted and tested while you wait at Riverwood Plaza.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
  },
  {
    slug: 'battery',
    service: 'battery',
    metaTitle: 'Phone Battery Replacement — Same Day, Riverwood | Xpress Phone Repairs',
    metaDescription: 'Phone dying by lunchtime? Same-day battery replacement at Riverwood Plaza from $59. Free diagnostic, no fix no fee, 6–12 month warranty. Call (02) 9533 3300.',
    h1: 'New battery, same day.',
    sub: 'Stop chasing power outlets. We fit fresh, high-capacity batteries for every major brand — usually in under an hour, warrantied and tested.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
  },
  {
    slug: 'water-damage',
    service: 'water-damage',
    metaTitle: 'Water Damage Phone Repair — Riverwood | Xpress Phone Repairs',
    metaDescription: 'Dropped your phone in water? Fast water-damage diagnosis and repair at Riverwood Plaza. Free diagnostic, no fix no fee. Bring it in now — call (02) 9533 3300.',
    h1: 'Water damage? Act fast — we can help.',
    sub: 'The sooner we see it, the better the odds. Free diagnostic, an honest assessment, and same-day repair where the board allows — every major brand.',
    offer: 'Free diagnostic · No fix, no fee · 6–12 month warranty',
  },
  {
    slug: 'repairs',
    service: null,
    metaTitle: 'Phone Repairs Riverwood — Same Day | Xpress Phone Repairs',
    metaDescription: 'Same-day phone repairs at Riverwood Plaza — screens, batteries, charging ports, cameras and more. Free diagnostic, no fix no fee. Call (02) 9533 3300.',
    h1: 'Phone broken? Fixed today at Riverwood Plaza.',
    sub: 'Screens, batteries, charging ports, cameras, water damage — every major brand, repaired same-day with a free diagnostic and up to a 12-month warranty.',
    offer: 'Same-day · Free diagnostic · 6–12 month warranty',
    fromCaption: 'Repairs from',
    fromAmount: '$49',
    faqs: [
      { q: 'How long do repairs take?', a: 'Most common repairs — screens, batteries, charging ports — are done the same day, usually within the hour. We give you a firm time estimate when you drop in.' },
      { q: 'Do you charge for a diagnostic?', a: "No. Diagnostics are free, and it's no fix, no fee — if we can't repair it, you don't pay." },
      { q: 'Which brands do you repair?', a: "Apple iPhone, Samsung Galaxy, Google Pixel, Oppo, Huawei, Motorola and more. If you're not sure, just call and ask." },
      { q: 'Do your repairs come with a warranty?', a: 'Yes — repairs are covered by a 6–12 month warranty depending on the part and device.' },
    ],
  },
]);

export const LANDING_BY_SLUG = Object.fromEntries(LANDING_PAGES.map((p) => [p.slug, p]));
