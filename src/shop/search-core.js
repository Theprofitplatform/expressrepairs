// Shared product-search matching + ranking, used by the /shop/search/ results
// grid and the ShopSearch suggestion dropdown. Runs over the build-time
// search-index.json entries ({id, name, brand, category, priceCents}).
// ponytail: normalized-substring scoring, no search library — revisit only if
// relevance complaints survive this.

// Thumbnail URL for a search-index entry's id. Both suppliers' photos are
// mirrored to R2 by scripts/upload-images-r2.mjs as products/<id>.webp (800px,
// used by product detail pages) plus a products/<id>-400.webp variant.
//
// Grids and search results render at most ~400px wide — a phone card is ~343px
// and a suggestion thumb is 44px — so they take the -400 variant. Serving the
// 800px original here decoded ~2.1MB of bitmap per card and took the renderer
// from 120MB to 602MB at 862 images before it died. Run the upload script after
// any catalog import so new ids have the variant before this URL is hit.
export const thumbSrc = (id) => `https://img.expressrepairs.com.au/products/${id}-400.webp`;

// The 800px original. Used as the onerror fallback for the grid: the manifest
// tracks the 800px key, so a product whose -400 backfill failed is still listed
// as R2-hosted and would otherwise render a broken image. Falling back costs
// memory, not correctness.
export const fullSrc = (id) => `https://img.expressrepairs.com.au/products/${id}.webp`;

// Same downscale for a thumb URL already baked into the product data by the
// import scripts. Leaves supplier-hosted URLs (no R2 variant) untouched, and is
// idempotent — the early return matters because if the import scripts ever start
// emitting -400 directly, a second pass here would ask for -400-400 and 404 every
// grid image. Deliberately not a lookbehind: this ships to phones, and older iOS
// Safari throws at parse time on those, taking the whole script down with it.
export const gridThumb = (url) => {
  const s = String(url || '');
  return /-400\.webp$/.test(s)
    ? s
    : s.replace(/(\/\/img\.expressrepairs\.com\.au\/products\/[^/]+)\.webp$/, '$1-400.webp');
};

import { tagsFor } from '../lib/tags.js';

// One-way is enough where products only ever use one spelling.
const SYN = {
  cover: ['case'], case: ['cover'],
  protector: ['glass', 'protection'], glass: ['protector'],
  charger: ['charging', 'charge'], charging: ['charger'],
  cord: ['cable'], lead: ['cable'],
  earphones: ['earbuds', 'headset', 'handsfree'],
  earbuds: ['earphones', 'headset'],
  headphones: ['earbuds', 'earphones', 'headset'],
  holder: ['mount', 'stand'], mount: ['holder', 'stand'], stand: ['holder', 'mount'],
  powerbank: ['power bank'],
};

// Lowercase, strip punctuation, split letter<->digit boundaries so
// "iphone15" / "s24ultra" match "iPhone 15" / "S24 Ultra". Space-padded so
// ' token' tests word starts.
export const norm = (s) =>
  ' ' +
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim() +
  ' ';

// Product codes — barcode or SKU — are matched against the WHOLE query, not
// per token: norm() would shred "PCK10-BW-S26" into five tokens. Strip the
// punctuation off both sides so a code scans, types, and pastes the same.
const codeOf = (s) => (s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

// Only queries that look like a code are tested against one: they must carry a
// digit and be 4+ characters, so "case" never prefix-matches a SKU and "15"
// keeps meaning iPhone 15 rather than every EAN with a 15 in it.
const isCodeQuery = (c) => c.length >= 4 && /\d/.test(c);

// Returns { hits, total, partial }. Every token (or a synonym) must match;
// if nothing matches all tokens, fall back to all-but-one so a single typo'd
// word degrades the results instead of blanking them (partial: true).
// Ranking: word-start name match > name substring > brand/category match;
// ties go to the shorter (more specific) name.
export function searchProducts(index, q, limit = 50) {
  const tokens = norm(q).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { hits: [], total: 0, partial: false };
  const code = codeOf(q);
  const asCode = isCodeQuery(code);
  const scored = [];
  for (const p of index) {
    p._name ??= norm(p.name);
    p._all ??= norm(`${p.name} ${p.brand} ${p.category} ${tagsFor(p).join(' ')}`);
    // Scanned or typed product code — barcode first, else the SKU printed on
    // the carton (HOCO publishes no barcode for 1,594 of its lines). Beats
    // every name match so the one box on the shelf lands top. Prefix, so it
    // hits mid-scan too.
    if (asCode) {
      p._code ??= [codeOf(p.gtin), codeOf(p.sku)];
      if (p._code.some((c) => c && c.startsWith(code))) {
        scored.push({ p, matched: tokens.length, score: 4 * tokens.length });
        continue;
      }
    }
    let matched = 0;
    let score = 0;
    for (const t of tokens) {
      const alts = [t, ...(SYN[t] || [])];
      const inName = alts.some((a) => p._name.includes(a));
      if (!inName && !alts.some((a) => p._all.includes(a))) continue;
      matched++;
      score += inName ? (p._name.includes(' ' + t) ? 3 : 2) : 1;
    }
    if (matched) scored.push({ p, matched, score });
  }
  const full = scored.filter((s) => s.matched === tokens.length);
  const pool = full.length
    ? full
    : scored.filter((s) => s.matched >= Math.max(1, tokens.length - 1));
  pool.sort(
    (a, b) => b.score - a.score || b.matched - a.matched || a.p.name.length - b.p.name.length,
  );
  return { hits: pool.slice(0, limit).map((s) => s.p), total: pool.length, partial: !full.length };
}
