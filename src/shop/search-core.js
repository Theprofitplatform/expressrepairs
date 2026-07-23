// Shared product-search matching + ranking, used by the /shop/search/ results
// grid and the ShopSearch suggestion dropdown. Runs over the build-time
// search-index.json entries ({id, name, brand, category, priceCents}).
// ponytail: normalized-substring scoring, no search library — revisit only if
// relevance complaints survive this.

// Thumbnail URL for a search-index entry's id. Both suppliers' photos are
// mirrored to R2 as products/<id>.webp by scripts/upload-images-r2.mjs
// (run it after any catalog import so new ids exist before this URL is hit).
export const thumbSrc = (id) => `https://img.expressrepairs.com.au/products/${id}.webp`;

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

// Returns { hits, total, partial }. Every token (or a synonym) must match;
// if nothing matches all tokens, fall back to all-but-one so a single typo'd
// word degrades the results instead of blanking them (partial: true).
// Ranking: word-start name match > name substring > brand/category match;
// ties go to the shorter (more specific) name.
export function searchProducts(index, q, limit = 50) {
  const tokens = norm(q).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { hits: [], total: 0, partial: false };
  const scored = [];
  for (const p of index) {
    p._name ??= norm(p.name);
    p._all ??= norm(`${p.name} ${p.brand} ${p.category}`);
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
