// src/lib/merge-catalogs.js — combine the DXPOS-synced catalog with the HOCO
// catalogue import at build time. DXPOS wins every duplicate (those products
// exist in the POS and can be rung up in-store); HOCO fills the rest.
// ponytail: name + hoco-model-code dedupe only — cross-supplier fuzzy name
// matching is a rabbit hole; the worst miss is one product listed twice.
// A hoco-branded HOCO row drops only when BOTH hold against the SAME dxpos
// product: (1) its model-code set is a subset of that product's, AND (2)
// every one of its name tokens appears in that product's name (dxpos's extra
// decoration/color/variant tokens are fine — coverage is one-directional,
// hoco tokens ⊆ dxpos tokens). Condition (1) alone false-matches a bare code
// shared by unrelated variants (G15 for iPhone vs G15 for Samsung S26; U150
// 36W-A-C vs 60W-C-C; different colors/lengths) — condition (2) requires the
// device/wattage/color words to actually match too. Failure mode if this pair
// ever wrongly agrees: a duplicate listing — the cheap failure, so this stays
// a token-coverage heuristic, not a real product-attribute diff.
export const modelCodes = (name) =>
  new Set(name.match(/\b[A-Z]{1,3}\d{1,3}[A-Z]{0,2}\b/g) || []);

const nameTokens = (name) =>
  new Set(name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean));

export function mergeCatalogs(dxpos, hoco) {
  const names = new Set(dxpos.map((p) => p.name));
  const hocoProducts = dxpos
    .filter((p) => /hoco\./i.test(p.name))
    .map((p) => ({ codes: modelCodes(p.name), tokens: nameTokens(p.name) }))
    .filter((p) => p.codes.size);
  const covered = (codes, tokens) =>
    codes.size &&
    hocoProducts.some(
      (p) => [...codes].every((c) => p.codes.has(c)) && [...tokens].every((t) => p.tokens.has(t)),
    );
  const fresh = hoco.filter(
    (p) => !names.has(p.name) && !(/hoco\./i.test(p.name) && covered(modelCodes(p.name), nameTokens(p.name))),
  );
  return [...dxpos, ...fresh];
}
