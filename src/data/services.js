import { z } from 'zod';
import { issueSchema, repairCardSchema } from './schema.js';

// basePrice is the realistic *starting* (cheapest-model) price per brand — the
// booking widget shows it as "from $X" because the exact price depends on the
// model. Figures are floors derived from 12 months of real POS repair sales
// (Lightspeed), so flagships are no longer under-quoted at one flat number.
export const ISSUES = z.array(issueSchema).parse([
  { id: 'screen', label: 'Screen Repair', emoji: '📱', basePrice: { apple: 99, samsung: 99, google: 129, oppo: 99, huawei: 99, motorola: 99, other: 0 } },
  { id: 'battery', label: 'Battery', emoji: '🔋', basePrice: { apple: 59, samsung: 59, google: 59, oppo: 59, huawei: 59, motorola: 59, other: 0 } },
  { id: 'backglass', label: 'Back Glass', emoji: '✨', basePrice: { apple: 149, samsung: 99, google: 99, oppo: 99, huawei: 99, motorola: 99, other: 0 } },
  { id: 'port', label: 'Charging Port', emoji: '🔌', basePrice: { apple: 49, samsung: 59, google: 49, oppo: 39, huawei: 39, motorola: 49, other: 0 } },
  { id: 'camera', label: 'Camera', emoji: '📸', basePrice: { apple: 49, samsung: 79, google: 49, oppo: 49, huawei: 49, motorola: 49, other: 0 } },
  { id: 'water', label: 'Water Damage', emoji: '💧', basePrice: { apple: 149, samsung: 149, google: 149, oppo: 149, huawei: 149, motorola: 149, other: 0 } },
  { id: 'speaker', label: 'Speaker', emoji: '🔊', basePrice: { apple: 49, samsung: 49, google: 49, oppo: 49, huawei: 49, motorola: 49, other: 0 } },
  { id: 'diagnostic', label: 'Free Diagnostic', emoji: '🔍', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0, other: 0 } },
  { id: 'other', label: 'Other', emoji: '🛠️', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0, other: 0 } },
]);

// Per-model "from" prices by issue id. Overrides the per-brand basePrice in
// the booking widget when the selected model has an entry.
// - Apple screen tiers per owner: iPhone 11–13 from $149, iPhone 14+ from $199
//   (X/XR/XS/SE fall through to the $99 brand floor).
// - Samsung: we fit GENUINE Samsung parts only, so prices mirror Samsung
//   Australia's official Repair Cost Estimator (inc GST, July 2026 —
//   samsung.com/au/support/repair-cost). Cheapest official option per model;
//   foldable screens list the front/cover display (main display costs more,
//   quoted on inspection). A Samsung model with no entry under a priced issue
//   (e.g. Note 20 — Samsung no longer publishes pricing) shows "Custom quote".
const SCREEN_PRICES = {
  // Apple — iPhone 14 and newer
  'iPhone 17 Pro Max': 199, 'iPhone 17 Pro': 199, 'iPhone 17': 199, 'iPhone Air': 199,
  'iPhone 16 Pro Max': 199, 'iPhone 16 Pro': 199, 'iPhone 16 Plus': 199, 'iPhone 16': 199, 'iPhone 16e': 199,
  'iPhone 15 Pro Max': 199, 'iPhone 15 Pro': 199, 'iPhone 15 Plus': 199, 'iPhone 15': 199,
  'iPhone 14 Pro Max': 199, 'iPhone 14 Pro': 199, 'iPhone 14 Plus': 199, 'iPhone 14': 199,
  // Apple — iPhone 11 to 13
  'iPhone 13 Pro Max': 149, 'iPhone 13 Pro': 149, 'iPhone 13': 149, 'iPhone 13 mini': 149,
  'iPhone 12 Pro Max': 149, 'iPhone 12 Pro': 149, 'iPhone 12': 149, 'iPhone 12 mini': 149,
  'iPhone 11 Pro': 149, 'iPhone 11': 149,
  // Samsung — official Samsung AU genuine-screen pricing (swept 2026-07-10)
  'Galaxy S25 Ultra': 436, 'Galaxy S25+': 360, 'Galaxy S25 Edge': 525, 'Galaxy S25': 303, 'Galaxy S25 FE': 311,
  'Galaxy S24 Ultra': 432, 'Galaxy S24+': 359, 'Galaxy S24 FE': 294, 'Galaxy S24': 315,
  'Galaxy S23 Ultra': 435, 'Galaxy S23+': 358, 'Galaxy S23': 316, 'Galaxy S23 FE': 294,
  'Galaxy S22 Ultra': 401, 'Galaxy S22+': 323, 'Galaxy S22': 359,
  'Galaxy S21 Ultra': 447, 'Galaxy S21+': 319, 'Galaxy S21': 328, 'Galaxy S21 FE': 358,
  'Galaxy S20 Ultra': 410, 'Galaxy S20+': 361, 'Galaxy S20': 381, 'Galaxy S20 FE': 310,
  'Galaxy Z Fold7': 319, 'Galaxy Z Flip7': 292,
  'Galaxy Z Fold6': 330, 'Galaxy Z Flip6': 260,
  'Galaxy Z Fold5': 244, 'Galaxy Z Flip5': 278,
  'Galaxy Z Fold4': 256, 'Galaxy Z Flip4': 230,
  'Galaxy Z Fold3': 305, 'Galaxy Z Flip3': 230,
  'Galaxy A73': 322, 'Galaxy A57': 294, 'Galaxy A56': 283, 'Galaxy A55': 279, 'Galaxy A54': 313,
  'Galaxy A53': 310, 'Galaxy A52': 249, 'Galaxy A37': 321, 'Galaxy A36': 318, 'Galaxy A35': 278,
  'Galaxy A34': 316, 'Galaxy A33': 310, 'Galaxy A26': 280, 'Galaxy A25': 279, 'Galaxy A23': 248,
  'Galaxy A22': 211, 'Galaxy A17': 266, 'Galaxy A16': 267, 'Galaxy A15': 256, 'Galaxy A13': 231,
  'Galaxy A05': 230,
  // Older models Samsung no longer prices (S9/S10, A11/A04s era, Note 20)
  // intentionally have no entry — the widget quotes them on inspection.
};

// Battery replacement — owner pricing (2026-07). Apple: iPhone 11 and newer
// from $119 (X/XR/XS/SE fall through to the $59 brand floor). Samsung: $99
// flat for S21 and newer + foldables, $79 for A series and pre-S21-era
// models (Note 20).
const BATTERY_PRICES = {
  // Apple — iPhone 11 and newer
  'iPhone 17 Pro Max': 119, 'iPhone 17 Pro': 119, 'iPhone 17': 119, 'iPhone Air': 119,
  'iPhone 16 Pro Max': 119, 'iPhone 16 Pro': 119, 'iPhone 16 Plus': 119, 'iPhone 16': 119, 'iPhone 16e': 119,
  'iPhone 15 Pro Max': 119, 'iPhone 15 Pro': 119, 'iPhone 15 Plus': 119, 'iPhone 15': 119,
  'iPhone 14 Pro Max': 119, 'iPhone 14 Pro': 119, 'iPhone 14 Plus': 119, 'iPhone 14': 119,
  'iPhone 13 Pro Max': 119, 'iPhone 13 Pro': 119, 'iPhone 13': 119, 'iPhone 13 mini': 119,
  'iPhone 12 Pro Max': 119, 'iPhone 12 Pro': 119, 'iPhone 12': 119, 'iPhone 12 mini': 119,
  'iPhone 11 Pro': 119, 'iPhone 11': 119,
  'Galaxy S25 Ultra': 99, 'Galaxy S25+': 99, 'Galaxy S25 Edge': 99, 'Galaxy S25': 99, 'Galaxy S25 FE': 99,
  'Galaxy S24 Ultra': 99, 'Galaxy S24+': 99, 'Galaxy S24 FE': 99, 'Galaxy S24': 99,
  'Galaxy S23 Ultra': 99, 'Galaxy S23+': 99, 'Galaxy S23': 99, 'Galaxy S23 FE': 99,
  'Galaxy S22 Ultra': 99, 'Galaxy S22+': 99, 'Galaxy S22': 99,
  'Galaxy S21 Ultra': 99, 'Galaxy S21+': 99, 'Galaxy S21': 99, 'Galaxy S21 FE': 99,
  'Galaxy S20 Ultra': 99, 'Galaxy S20+': 99, 'Galaxy S20': 99, 'Galaxy S20 FE': 99,
  'Galaxy S10+': 79, 'Galaxy S10': 79, 'Galaxy S10e': 79, 'Galaxy S9+': 79, 'Galaxy S9': 79,
  'Galaxy Z Fold7': 99, 'Galaxy Z Flip7': 99,
  'Galaxy Z Fold6': 99, 'Galaxy Z Flip6': 99,
  'Galaxy Z Fold5': 99, 'Galaxy Z Flip5': 99,
  'Galaxy Z Fold4': 99, 'Galaxy Z Flip4': 99,
  'Galaxy Z Fold3': 99, 'Galaxy Z Flip3': 99,
  'Galaxy A73': 79, 'Galaxy A71': 79, 'Galaxy A57': 79, 'Galaxy A56': 79, 'Galaxy A55': 79,
  'Galaxy A54': 79, 'Galaxy A53': 79, 'Galaxy A52': 79, 'Galaxy A51': 79, 'Galaxy A37': 79,
  'Galaxy A36': 79, 'Galaxy A35': 79, 'Galaxy A34': 79, 'Galaxy A33': 79, 'Galaxy A32': 79,
  'Galaxy A26': 79, 'Galaxy A25': 79, 'Galaxy A23': 79, 'Galaxy A22': 79, 'Galaxy A17': 79,
  'Galaxy A16': 79, 'Galaxy A15': 79, 'Galaxy A14': 79, 'Galaxy A13': 79, 'Galaxy A12': 79,
  'Galaxy A11': 79, 'Galaxy A05s': 79, 'Galaxy A05': 79, 'Galaxy A04s': 79,
  'Galaxy Note 20 Ultra': 79, 'Galaxy Note 20': 79,
};

export const MODEL_PRICES = { screen: SCREEN_PRICES, battery: BATTERY_PRICES };

export const REPAIR_CARDS = z.array(repairCardSchema).parse([
  { id: 'screen', title: 'Screen Repair', desc: 'Cracked or shattered? Back to mint in under an hour. Genuine Samsung screens at official Samsung pricing.', from: 'from $99', img: '/images/screen-repair.jpg', tag: 'Most Popular', size: 'hero' },
  { id: 'battery', title: 'Battery Replacement', desc: 'Fresh cells so you stop chasing power outlets.', from: 'from $59', img: '/images/battery-repair.jpg', size: 'tall' },
  { id: 'backglass', title: 'Back Glass', desc: 'Restore the finish — no shards, no sharp edges.', from: 'from $99', img: '/images/glass-repair.jpg', size: 'small' },
  { id: 'port', title: 'Charging Port', desc: 'Finicky cable? We clean or replace it, fast.', from: 'from $39', img: '/images/port-repair.jpg', size: 'small' },
  { id: 'other', title: 'Other Repairs', desc: "Water damage, speakers, cameras — we've seen it all.", from: 'custom quote', img: '/images/other-repairs.jpg', size: 'wide' },
  { id: 'diagnostic', title: 'Free Diagnostic', desc: "Not sure what's wrong? Bring it in, no charge.", from: 'free', img: '/images/diagnostic.jpg', tag: 'Free', size: 'small' },
]);
