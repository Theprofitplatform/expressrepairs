// src/lib/merge-catalogs.js — combine the DXPOS-synced catalog with the HOCO
// catalogue import at build time. DXPOS wins every duplicate (those products
// exist in the POS and can be rung up in-store); HOCO fills the rest.
// ponytail: name + hoco-model-code dedupe only — cross-supplier fuzzy name
// matching is a rabbit hole; the worst miss is one product listed twice.

// Letter+digit tokens like G9 / J170 / DCA71 / UA43A. Device tokens (A27,
// S26) match too — that's why the check below requires the FULL code set of
// the import row to be covered by a single existing product, not a global pool.
export const modelCodes = (name) =>
  new Set(name.match(/\b[A-Z]{1,3}\d{1,3}[A-Z]{0,2}\b/g) || []);

export function mergeCatalogs(dxpos, hoco) {
  const names = new Set(dxpos.map((p) => p.name));
  const hocoCodeSets = dxpos
    .filter((p) => /hoco\./i.test(p.name))
    .map((p) => modelCodes(p.name))
    .filter((s) => s.size);
  const covered = (codes) =>
    codes.size && hocoCodeSets.some((s) => [...codes].every((c) => s.has(c)));
  const fresh = hoco.filter(
    (p) => !names.has(p.name) && !(/hoco\./i.test(p.name) && covered(modelCodes(p.name))),
  );
  return [...dxpos, ...fresh];
}
