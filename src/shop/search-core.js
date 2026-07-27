// Shared product-search matching + ranking, used by the /shop/search/ results
// grid and the ShopSearch suggestion dropdown. Runs over the build-time
// search-index.json entries ({id, name, brand, category, priceCents}).
// ponytail: normalized-substring scoring, no search library — revisit only if
// relevance complaints survive this.

// Thumbnail URL for a search-index entry's id. Both suppliers' photos are
// mirrored to R2 as products/<id>.webp by scripts/upload-images-r2.mjs
// (run it after any catalog import so new ids exist before this URL is hit).
export const thumbSrc = (id) => `https://img.expressrepairs.com.au/products/${id}.webp`;

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
