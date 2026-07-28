import { CATALOGUE } from '../../lib/shopMenu.js';

// The mega menu's cascade data (category → device family → model), fetched on
// first hover instead of inlined. See CATALOGUE for why: the full tree is
// ~27KB of markup and the nav renders on 10,347 pages.
//
// Keys are one letter — this file is the whole payload, and the property names
// repeat 230 times. `n` is the display name, `s` the slug, `c` the count,
// `f` families, `m` models, `k` the model key.
export function GET() {
  const tree = CATALOGUE.map(({ name, slug, count, families }) => ({
    n: name,
    s: slug,
    c: count,
    f: families.map(({ family, models }) => ({
      n: family,
      m: models.map(({ key, label, count: c }) => ({ k: key, n: label, c })),
    })),
  }));
  return new Response(JSON.stringify(tree), {
    headers: { 'Content-Type': 'application/json' },
  });
}
