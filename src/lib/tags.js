// Derived product tags — computed at build/run time from name+category, never
// persisted, so a DXPOS re-sync or HOCO re-import can't wipe them and newly
// synced products auto-tag. Vocabulary was mined from all ~6,850 catalog names
// and every regex verified against the full catalog for false positives
// (e.g. bare "magnetic" is a wallet-clasp feature, NOT MagSafe; "flip" is the
// Galaxy Z Flip model, not a flip case — both deliberately excluded).

const CASES = ['Cases & Covers', 'Tablet & iPad Cases', 'Watch Cases', 'AirPods Cases'];

// [slug, name regex, categories the rule applies in (null = any)].
// Category guards stop cross-category leakage: "wireless charging" earbuds
// cases, "Ring Stand" phone cases vs ring mounts, iPad-case "stylus holder".
export const TAG_RULES = [
  // cases
  ['wallet-case', /wallet|diary|folio|hanman/i, CASES],
  ['clear-case', /\bclear\b|transparent|crystal/i, CASES],
  ['rugged-case', /heavy.?duty|defen[dcs]|anti.?shock|shock.?proof|armou?r|\btough\b|rugged|drop.?tested|survivor|military|pelican ranger/i, CASES],
  ['silicone', /silicone/i, CASES],
  ['leather', /leather/i, CASES],
  ['glitter', /glitter|sparkle|bling|twinkle|disco|shimmer/i, CASES],
  ['stand-case', /\bstand(ing)?\b|kickstand/i, CASES],
  ['ring-holder', /\bring\b/i, CASES],
  ['ring-holder', /ring (holder|stand|grip)/i, ['Mounts & Holders']],
  ['card-holder', /\bcard\b/i, CASES],
  ['keyboard-case', /keyboard/i, ['Tablet & iPad Cases']],
  // features (cross-category by design)
  ['magsafe', /mag-?safe|\bmsafe\b|\bqi2\b/i, null],
  ['waterproof', /water\s?proof|ip68|ipx\d/i, null],
  // screen protection
  ['tempered-glass', /tempered\s*glass/i, null],
  ['tempered-glass', /dragon glass/i, ['Screen Protection']],
  ['full-cover', /full[- ](cover|glue|screen)|edge[- ]to[- ]edge|\b9d\b/i, ['Screen Protection']],
  ['uv-glass', /dome glass|\buv[- ](glue|glass|tempered|dome)/i, ['Screen Protection']],
  ['privacy-screen', /privacy|anti[- ]?spy|anti[- ]?peep/i, ['Screen Protection']],
  ['camera-protector', /camera.*(glass|protector|lens)|lens protector/i, ['Screen Protection']],
  ['ceramic', /ceramic/i, ['Screen Protection']],
  ['watch-protector', /\bwatch\b|iwatch/i, ['Screen Protection']],
  ['tablet-protector', /ipad|\btab\b|tablet/i, ['Screen Protection']],
  // cables & charging
  ['usb-c-cable', /usb-c.*cable|cable.*usb-c/i, ['Cables & Charging']],
  ['lightning-cable', /lightning.*cable|cable.*lightning/i, ['Cables & Charging']],
  ['wall-charger', /wall charger|power adapter|charger \(au\)|\bgan\b/i, ['Cables & Charging']],
  ['car-charger', /car charger/i, null],
  ['wireless-charger', /wireless charg/i, ['Cables & Charging', 'Mounts & Holders', 'Accessories']],
  ['power-bank', /power ?bank|\d{4,6}\s?mah/i, null],
  ['fast-charging', /fast charg|quick charg|super ?charge|\bpd\s?\d|\bqc\s?\d/i, ['Cables & Charging']],
  ['charging-dock', /\bdock(ing)?\b|charging station/i, ['Cables & Charging']],
  // mounts & holders
  ['car-mount', /car (mount|holder)|in-?car|dash\s?board|windscreen|windshield/i, ['Mounts & Holders']],
  ['magnetic-mount', /magnetic/i, ['Mounts & Holders']],
  ['bike-mount', /bicycle|\bbike\b|motorcycle/i, null],
  ['desk-stand', /desk\s?top|desk stand|table.*stand|folding stand|phone stand|tablet stand/i, ['Mounts & Holders']],
  ['selfie-stick', /selfie|tripod/i, ['Mounts & Holders']],
  // accessories
  ['tracker', /anti-?lost|tracking (card|tag)/i, ['Accessories']],
  ['watch-strap', /(silicone|leather|steel|magnetic|series) strap|watch\s?band|band for iwatch/i, ['Accessories']],
  ['smart-watch', /smart (sports )?watch/i, ['Accessories']],
  ['stylus', /capacitive pen(cil)?|stylus|\bpencil\b/i, ['Accessories']],
  ['dash-cam', /driving recorder|dash\s?cam/i, null],
  ['card-reader', /card reader/i, null],
  ['carplay', /carplay/i, null],
  ['fm-transmitter', /fm transmitter/i, null],
  // audio
  ['earbuds', /true wireless|\btws\b|earbuds?/i, ['Audio']],
  ['headphones', /headphones?|over[- ]ear/i, ['Audio']],
  ['wired-earphones', /3\.5\s?mm|wire[- ]control|\bwired\b/i, ['Audio']],
  ['speaker', /\bspeaker\b/i, ['Audio']],
  ['noise-cancelling', /\banc\b|\benc\b|noise[- ]?cancel|noise reduction/i, ['Audio']],
  ['microphone', /\bmicrophone\b|lavalier|karaoke/i, ['Audio']],
  ['gaming-headset', /\bgaming\b/i, ['Audio']],
];

// Memoized like deviceModel in shop.js — the client filter bar runs this over
// the whole 6.8k search index on first use.
const cache = new Map();
export function tagsFor(p) {
  const key = `${p.category}|${p.name}`;
  let tags = cache.get(key);
  if (tags) return tags;
  const set = new Set();
  for (const [slug, re, cats] of TAG_RULES) {
    if ((!cats || cats.includes(p.category)) && re.test(p.name)) set.add(slug);
  }
  tags = [...set].sort();
  cache.set(key, tags);
  return tags;
}

// "wallet-case" -> "Wallet Case" (fallback label for non-curated tags).
export const tagLabel = (slug) =>
  CURATED_TAGS.find((t) => t.tag === slug)?.label ||
  slug.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());

// Tags with their own SEO landing page at /shop/t/<tag>/. Hand-picked for
// real shopper search intent; every entry must clear MIN_TAG_PAGE_PRODUCTS
// (guarded by tests/tags.test.js).
export const MIN_TAG_PAGE_PRODUCTS = 8;
export const CURATED_TAGS = [
  { tag: 'magsafe', label: 'MagSafe', blurb: 'MagSafe & magnetic-ring compatible cases, chargers and mounts.' },
  { tag: 'wallet-case', label: 'Wallet & Flip Cases', blurb: 'Card-slot wallet, diary and folio cases.' },
  { tag: 'clear-case', label: 'Clear Cases', blurb: 'Transparent and crystal-clear cases that show off your phone.' },
  { tag: 'rugged-case', label: 'Rugged & Heavy Duty Cases', blurb: 'Shockproof, armour and drop-tested protection.' },
  { tag: 'silicone', label: 'Silicone Cases', blurb: 'Soft-touch silicone and liquid-silicone cases.' },
  { tag: 'leather', label: 'Leather Cases', blurb: 'Genuine and PU leather cases and covers.' },
  { tag: 'glitter', label: 'Glitter & Bling Cases', blurb: 'Glitter, sparkle and bling cases.' },
  { tag: 'stand-case', label: 'Cases With Stand', blurb: 'Kickstand and ring-stand cases for hands-free viewing.' },
  { tag: 'waterproof', label: 'Waterproof', blurb: 'IP-rated waterproof cases, speakers and gear.' },
  { tag: 'tempered-glass', label: 'Tempered Glass', blurb: 'Tempered-glass screen protectors for phones, watches and tablets.' },
  { tag: 'privacy-screen', label: 'Privacy Screen Protectors', blurb: 'Anti-spy privacy glass — dark from the sides.' },
  { tag: 'camera-protector', label: 'Camera Lens Protectors', blurb: 'Camera lens glass and protectors.' },
  { tag: 'power-bank', label: 'Power Banks', blurb: 'Portable power banks from 5,000 to 50,000mAh.' },
  { tag: 'usb-c-cable', label: 'USB-C Cables', blurb: 'USB-C charging and data cables.' },
  { tag: 'lightning-cable', label: 'Lightning Cables', blurb: 'Lightning cables for iPhone and iPad.' },
  { tag: 'wall-charger', label: 'Wall Chargers', blurb: 'AU wall chargers and power adapters, PD and GaN fast charging.' },
  { tag: 'car-charger', label: 'Car Chargers', blurb: 'Fast in-car USB and USB-C chargers.' },
  { tag: 'wireless-charger', label: 'Wireless Chargers', blurb: 'Qi wireless charging pads, stands and docks.' },
  { tag: 'car-mount', label: 'Car Mounts', blurb: 'Dashboard, windscreen and vent phone holders.' },
  { tag: 'earbuds', label: 'Wireless Earbuds', blurb: 'True-wireless earbuds and Bluetooth headsets.' },
  { tag: 'speaker', label: 'Bluetooth Speakers', blurb: 'Portable Bluetooth speakers.' },
  { tag: 'noise-cancelling', label: 'Noise Cancelling', blurb: 'ANC earbuds and headphones.' },
  { tag: 'watch-strap', label: 'Watch Straps', blurb: 'Straps and bands for Apple Watch and smart watches.' },
];
