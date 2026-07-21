// scripts/catalog-fixes.mjs — data-quality fixes for the shop catalog, applied
// by transformCatalog in sync-products.mjs so a DXPOS re-sync can't undo them.
// The real fix belongs in DXPOS itself (names/categories are typed there);
// until the owner cleans the source, this is the single place that repairs it.
// Run directly (`node scripts/catalog-fixes.mjs`) to re-apply to the committed
// products.json without a POS round-trip.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// DXPOS placeholder price (three ring-light fixtures at $8,888) — never sell.
export const PLACEHOLDER_PRICE_CENTS = 888800;

// Shop fixtures / B2B gear that slipped past TRADE_ONLY_PATTERNS: display
// sets, comparison stands, watch dummies, signage, the heat-transfer printer.
export const HIDE_IDS = new Set([
  'X-03975', 'X-01981', 'X-03022', 'X-03475', 'X-04038', 'X-04039', 'X-04037',
  'X-03521', 'X-03522', // tempered-glass display sets/stands
  'X-03976', // power bank display
  'X-04036', 'X-04917', 'X-04733', // display stand, countertop rack, strap display box
  'X-05296', 'X-05297', 'X-05298', // non-functional watch dummies
  'X-05203', 'X-05011', // hidden signage / stop sign
  'X-05950', 'X-05811', // Epson heat-transfer printer, cloud print box
]);

// Products filed under the wrong Sell-grid group in DXPOS. id -> category.
// ponytail: explicit id list, not inference — new mounts synced from DXPOS
// land in Accessories until added here (or re-grouped in DXPOS).
const MOVES = {};
const move = (cat, ids) => ids.forEach((id) => (MOVES[id] = cat));
move('Audio', [
  'X-02004', // Apple EarPods USB-C
  'X-05284', 'X-03510', // lavalier / wireless microphones
  'X-03621', // external sound card
  'X-03492', // Bluetooth audio receiver
  'X-04914', 'X-03506', // car FM transmitters
]);
move('Accessories', [
  'X-04860', 'X-03633', 'X-05690', // anti-lost trackers
  'X-03021', // USB flash drive
  'X-05204', 'X-05224', 'X-02163', // card readers
  'X-04907', 'X-02627', // wireless CarPlay adapters
  // DXPOS "Holders" tag swept these into Mounts & Holders, but they're not
  // mounts: ring light + its floor stand, folding keyboard, MagSafe thermos.
  'X-02011', 'X-02008', 'X-02626', 'X-04919',
]);
move('Mounts & Holders', [
  // car holders
  'X-02072', 'X-02060', 'X-06667', 'X-06684', 'X-06101', 'X-06104', 'X-05106',
  'X-05229', 'X-03623', 'X-04913', 'X-04890', 'X-04895', 'X-04894', 'X-04889',
  'X-03128', 'X-03127', 'X-02606', 'X-02307', 'X-04920', 'X-05281', 'X-05283',
  'X-05286', 'X-06788', 'X-03500', 'X-03441', 'X-03435',
  // bike / motorcycle mounts
  'X-06494', 'X-03447', 'X-05232', 'X-04893', 'X-03494', 'X-02605',
  // desktop / notebook stands
  'X-04896', 'X-03439', 'X-03019', 'X-06593', 'X-06164', 'X-06829', 'X-05285',
  'X-02314', 'X-07358',
  // magnetic rings / ring holders
  'X-05653', 'X-07433', 'X-07173', 'X-05231', 'X-03442', 'X-03440', 'X-02609',
  // windshield car holders filed under Cases & Covers
  'X-05288', 'X-06700',
]);

// Ordered name repairs. Verified against the full catalog (no false matches);
// each is idempotent so re-running the sync never double-applies.
const NAME_FIXES = [
  // encoding artifacts
  [/＆/g, ' & '], [/Ⅴ/g, 'V'],
  // typos and one-off broken names
  [/Lightinng/g, 'Lightning'],
  [/cableLightning/g, 'cable Lightning'],
  [/magnetie/g, 'magnetic'],
  [/power bark/g, 'power bank'],
  [/(?<!U)SB-C/g, 'USB-C'],
  [/Suction Cips/g, 'Suction Clips'],
  [/Extra Syong/g, 'Extra Strong'],
  [/Vicktory/g, 'Victory'],
  [/Smart Al /g, 'Smart AI '],
  [/\bilky white/g, 'milky white'],
  [/True\.Wireless/g, 'True Wireless'],
  [/Simply Roar Simply Roar/g, 'Simply Roar'],
  [/Blackhoco\. U114/g, 'Black'], // SKU pasted into the color slot
  [/100cm - 100cm/g, '100cm'],
  [/\bAir3\b/g, 'Air 3'],
  [/a20 \/ a30 \/ a50/g, 'A20 / A30 / A50'],
  [/Galaxy S24 \/ 25\b/g, 'Galaxy S24 / S25'],
  [/S24 \/ S25 Plus BLACKTECH Defense/g, 'S24 Plus / S25 Plus BLACKTECH Defense'],
  [/BLACKTECH Goospery/g, 'Goospery'], // two competing brands in one name
  [/\s*\(perfect fit guaranteed\)/gi, ''],
  [/2\*male/g, '2 x male'],
  [/\bIphone\b/g, 'iPhone'],
  [/inchs/gi, 'inch'],
  // brand casing
  [/\bhoco\b\.?/gi, 'hoco.'],
  [/\bborofone\b/gi, 'BOROFONE'],
  [/\bLito\b/g, 'LITO'],
  // terminology — one word per concept
  [/Type-C3\.0/g, 'USB-C 3.0'],
  [/\bType-C\b/gi, 'USB-C'],
  [/Metal grey/g, 'Metal Grey'],
  [/\bmicro[ -]?usb\b/gi, 'Micro-USB'],
  [/\bfor iP\b/g, 'for iPhone'],
  [/\biP\b/g, 'iPhone'],
  [/\bBT\b/g, 'Bluetooth'],
  [/ANC Active Noise Cancellation/g, 'Active Noise Cancellation'],
  [/true wireless (Bluetooth )?(headset|earphones|earbuds)/gi, 'True Wireless Earbuds'],
  [/\bGray\b/g, 'Grey'], [/\bgray\b/g, 'grey'],
  [/ To /g, ' to '], // "USB-A To Lightning" — connector "to" is lowercase
  // spacing and decoration
  [/\*([^*]+)\*/g, '$1'], // *Single Pack* / *AI Face Tracking*
  [/([a-z0-9])\(/gi, '$1 ('], // "holder(air outlet)"
  [/(\d)inch/g, '$1 inch'],
  [/(\d) mm\b/g, '$1mm'],
];

export function fixName(raw) {
  let name = raw;
  for (const [re, to] of NAME_FIXES) name = name.replace(re, to);
  name = name.replace(/\s+/g, ' ').trim();
  // Title-case lowercase color/variant suffixes ("- milky white" -> "- Milky White")
  return name.replace(/ - ([a-z].*)$/, (m, c) => ' - ' + c.replace(/\b[a-z]/g, (ch) => ch.toUpperCase()));
}

// brand holds DXPOS category.name: a device platform (Apple/Samsung/…) worth
// keeping for the brand filter, or internal jargon ("hold", "Max Profit
// Picks", "Cables") that must never render. Junk is replaced by the maker
// named in the product name, or dropped.
const PLATFORM_BRANDS = new Set(['Apple', 'Samsung', 'Google', 'OPPO', 'Vivo', 'Motorola', 'TCL', 'LG']);
const MAKERS = [
  'BLACKTECH', 'hoco.', 'BOROFONE', 'Baseus', 'Cygnett', 'Goospery', 'LITO',
  'Hanman', 'iBuy', 'Simply Roar', 'EFM', 'Gecko', 'XIAOMI',
  'Apple', 'Samsung', 'Google',
];
// Device-specific products (cases, glass) are named "<device> <maker> ...";
// by catalog convention their brand is the device PLATFORM, so the category
// pages can filter by it. Maker-first names (hoco. cables etc.) fall through
// to the maker scan. ponytail: prefix match only — a "Simply Roar iPhone"
// case named maker-first stays maker-branded; acceptable.
const PLATFORM_PREFIX = [
  [/^(iphone|ipad|airpods|apple|iwatch)/i, 'Apple'],
  [/^samsung|^galaxy/i, 'Samsung'],
  [/^(google )?pixel/i, 'Google'],
  [/^oppo/i, 'OPPO'],
];
export function fixBrand(brand, name) {
  if (PLATFORM_BRANDS.has(brand)) return brand;
  const platform = PLATFORM_PREFIX.find(([re]) => re.test(name));
  if (platform) return platform[1];
  return MAKERS.find((m) => name.includes(m)) || '';
}

function fixCategory(p, name) {
  if (MOVES[p.id]) return MOVES[p.id];
  // AirPods cases get their own category (they also arrive misfiled in Audio,
  // swept there by the "AirPods" keyword)
  if (/^AirPods/i.test(name) && /case|cover|BLACKTECH/i.test(name)) return 'AirPods Cases';
  // screen/camera protectors filed under Audio ("speaker hole") or Cases
  if (/tempered glass|screen protector|corning glass|camera guard/i.test(name) && !/case with|with case/i.test(name)) {
    return 'Screen Protection';
  }
  // DXPOS's internal "Holders" tag marks future mounts synced into Accessories
  if (p.category === 'Accessories' && p.brand === 'Holders') return 'Mounts & Holders';
  // Cases & Covers is 4 device types in one coat — split out the non-phone
  // ones so the platform filter stays meaningful (an "Apple" filter mixing
  // iPhone, iPad, and Watch cases helps nobody).
  if (p.category === 'Cases & Covers') {
    if (/\biPad\b|\bTab\b|\btablet\b/i.test(name)) return 'Tablet & iPad Cases';
    if (/\bwatch\b/i.test(name)) return 'Watch Cases';
  }
  return p.category;
}

export function applyCatalogFixes(products) {
  const byName = new Map();
  for (const p of products) {
    // brand "Parts" = internal repair parts (charging-port flex cables) that
    // share the Cables & Charging grid group — never retail stock.
    if (HIDE_IDS.has(p.id) || p.priceCents === PLACEHOLDER_PRICE_CENTS || p.brand === 'Parts') continue;
    const name = fixName(p.name);
    const fixed = { ...p, name, category: fixCategory(p, name), brand: fixBrand(p.brand, name) };
    // Double-imported SKUs share an exact name — keep the cheapest (lowest id
    // as tie-break) so a shopper never sees the same product at two prices.
    const cur = byName.get(name);
    if (!cur || fixed.priceCents < cur.priceCents || (fixed.priceCents === cur.priceCents && fixed.id < cur.id)) {
      byName.set(name, fixed);
    }
  }
  return [...byName.values()];
}

// Direct run: re-apply fixes to the committed products.json.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = fileURLToPath(new URL('../src/data/products.json', import.meta.url));
  const before = JSON.parse(readFileSync(file, 'utf8'));
  const after = applyCatalogFixes(before);
  writeFileSync(file, JSON.stringify(after, null, 2) + '\n');
  const renamed = after.filter((p, i) => before.find((b) => b.id === p.id)?.name !== p.name).length;
  console.log(`${before.length} -> ${after.length} products (${before.length - after.length} hidden/deduped), ${renamed} names fixed.`);
}
