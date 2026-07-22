# HOCO Catalogue Import Report

**Snapshot date:** 2026-07-20 | **Deployed:** 2026-07-22

## Results

- **Imported:** 3,413 HOCO products (from 3,846-row catalogue snapshot)
- **Excluded as trade/tooling:** 425 rows (repair tooling brands, warehouse-coded tools/parts [TOL]/[PT], bulk packs, shop fixtures, uncoded digitizers/opening tools)
- **Duplicates suppressed at merge:** 45 (DXPOS version wins; deduped on model-code + name-token coverage)
- **Live totals post-deploy:** 6,886 products (3,518 DXPOS + 3,368 HOCO after dedupe)
- **Previously-dropped products now covered:** DXPOS funnel gap (2,472 products historically dropped for missing supplier images) is now filled by HOCO sourcing

## Owner Knobs

**To hide/unhide a product class:** Edit `HOCO_EXCLUDE_PATTERNS` in `scripts/import-hoco.mjs` and redeploy.

**To refresh the snapshot:** Run `python scripts/extract-hoco-catalogue.py "<new xlsx>"` then `node scripts/import-hoco.mjs`, commit, and deploy.

## For Your Review

Two HOCO rows were treated as duplicates of existing DXPOS listings:
- "CW63 Fast Qi2 magnetic wireless fast charger" → matched to DXPOS "CW63 Pro"
- "K24 Support 3-axis smart gimbal" → matched to DXPOS "K24 with LED Fill Light"

If these are distinct SKUs you stock, reply and we'll resurrect them.

## Pricing & Fulfillment

- HOCO prices = RRP column from the sheet
- Images hotlinked from hoco.com.au
- All HOCO items show in stock with standard dispatch copy ("dispatched in 1-2 business days")
- **Action:** Please confirm HOCO order lead time aligns with this dispatch window
