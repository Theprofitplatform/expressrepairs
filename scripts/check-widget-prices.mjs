// Self-check for the booking widget's quote logic (mirrors BookingWidget.jsx).
// Run: node scripts/check-widget-prices.mjs
import { ISSUES, MODEL_PRICES } from '../src/data/services.js';
import { BRANDS } from '../src/data/brands.js';

const label = (issueId, brandId, model) => {
  const issue = ISSUES.find(i => i.id === issueId);
  const mp = MODEL_PRICES[issueId] ? MODEL_PRICES[issueId][model] : undefined;
  const price = mp != null ? mp : issue.basePrice[brandId];
  const needsQuote = brandId === 'samsung' && MODEL_PRICES[issueId] && mp == null;
  return needsQuote ? 'Custom quote' : (price > 0 ? `from $${price}` : 'Free');
};

const cases = [
  // Apple screen tiers
  ['screen', 'apple', 'iPhone XR', 'from $99'],
  ['screen', 'apple', 'iPhone SE (3rd gen)', 'from $99'],
  ['screen', 'apple', 'iPhone 11', 'from $149'],
  ['screen', 'apple', 'iPhone 13 Pro', 'from $149'],
  ['screen', 'apple', 'iPhone 14', 'from $199'],
  ['screen', 'apple', 'iPhone 17 Pro Max', 'from $199'],
  // Samsung screens = official Samsung AU genuine pricing
  ['screen', 'samsung', 'Galaxy S24 Ultra', 'from $432'],
  ['screen', 'samsung', 'Galaxy A54', 'from $313'],
  ['screen', 'samsung', 'Galaxy Note 20', 'Custom quote'],
  // Batteries: owner pricing — Samsung $99, A series / Note 20 era $79
  ['battery', 'samsung', 'Galaxy S25 Ultra', 'from $99'],
  ['battery', 'samsung', 'Galaxy Z Fold7', 'from $99'],
  ['battery', 'samsung', 'Galaxy S21', 'from $99'],
  ['battery', 'samsung', 'Galaxy A54', 'from $79'],
  ['battery', 'samsung', 'Galaxy Note 20', 'from $79'],
  // Apple batteries: iPhone 11+ from $119, older stay on the $59 floor
  ['battery', 'apple', 'iPhone 11', 'from $119'],
  ['battery', 'apple', 'iPhone 15', 'from $119'],
  ['battery', 'apple', 'iPhone 17 Pro Max', 'from $119'],
  ['battery', 'apple', 'iPhone XR', 'from $59'],
  ['battery', 'apple', 'iPhone SE (3rd gen)', 'from $59'],
  // Untouched issues
  ['port', 'samsung', 'Galaxy Note 20', 'from $59'],
  ['diagnostic', 'samsung', 'Galaxy S24', 'Free'],
];

for (const [i, b, m, want] of cases) {
  const got = label(i, b, m);
  if (got !== want) throw new Error(`${i} ${b} ${m}: ${got} != ${want}`);
}

// Every Samsung model must resolve to $99/$79 battery and never $0/Free anywhere.
const sam = BRANDS.find(b => b.id === 'samsung');
for (const m of sam.models) {
  const bat = label('battery', 'samsung', m);
  if (bat !== 'from $99' && bat !== 'from $79') throw new Error(`battery ${m} → ${bat}`);
  const scr = label('screen', 'samsung', m);
  if (scr === 'Free' || scr === 'from $0') throw new Error(`screen ${m} → ${scr}`);
}

console.log('all pricing checks pass');
