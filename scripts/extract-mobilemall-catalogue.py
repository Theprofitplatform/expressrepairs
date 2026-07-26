# scripts/extract-mobilemall-catalogue.py — MobileMall xlsx -> src/data/mobilemall-catalogue.json
# Usage: python scripts/extract-mobilemall-catalogue.py "../MobileMall_Catalogue_2026-07-20.xlsx"
# The repo is public: ONLY "Regular Price" (the RRP) is exported. "Current Price"
# is our trade/cost price and never leaves this script — see the assert below.
#
# "Regular Price" is genuinely the RRP: every one of the 3,518 DXPOS-synced SKUs
# prices at exactly 1.00x this column, so importing at it matches what the shop
# already charges in-store.
import json, sys, pathlib
import openpyxl

src = sys.argv[1]
ws = openpyxl.load_workbook(src, read_only=True)["Catalogue"]
rows = ws.iter_rows(values_only=True)
header = [str(h or "") for h in next(rows)]


# Columns move between exports; find them by header text, not a fixed index.
def col(fragment):
    i = next((i for i, h in enumerate(header) if fragment.lower() in h.lower()), None)
    assert i is not None, f"no '{fragment}' column in: {header}"
    return i


C_SKU, C_NAME = col("SKU"), col("Product Name")
C_RRP, C_STOCK, C_IMAGE = col("Regular Price"), col("Stock Status"), col("Image")
C_CATS = col("Categories")
# Guard the one mistake that would leak cost data into a public repo: if a
# future export renames the columns such that "Regular Price" resolves to the
# discounted trade column, this fires instead of silently publishing cost.
assert C_RRP != col("Current Price"), "Regular/Current price columns collapsed — refusing to export"

out = {"skipped_oos": 0, "skipped_bad": 0, "rows": []}
for r in rows:
    sku, name, rrp, stock, image = r[C_SKU], r[C_NAME], r[C_RRP], r[C_STOCK], r[C_IMAGE]
    cats = [c.strip() for c in str(r[C_CATS] or "").split("|") if c.strip()]
    # Real MobileMall products all carry a numeric SKU. The hand-keyed ones
    # ("SGA27SP", "2026-july-new-product", "tomato", "New product test") are
    # account-credit promos and supplier test rows — never sellable stock, and
    # one of them is priced at 1c.
    if not sku or not str(sku).strip().isdigit():
        out["skipped_bad"] += 1
        continue
    if not name or not isinstance(rrp, (int, float)) or rrp <= 0 or not image:
        out["skipped_bad"] += 1
        continue
    # Owner directive: don't list what the supplier can't ship.
    if str(stock or "").strip().lower() != "in stock":
        out["skipped_oos"] += 1
        continue
    out["rows"].append(
        {
            "sku": str(sku).strip(),
            "name": str(name).strip(),
            "rrpCents": round(float(rrp) * 100),
            "image": str(image).strip(),
            # The supplier's own shelf tags. MobileMall names most cases by
            # model line only ("BLACKTECH Triangle Armor - Black"), with no
            # "case"/"cover" word for the name rules to catch, so these are
            # the fallback categoriser — see import-mobilemall.mjs.
            "categories": cats,
        }
    )

dst = pathlib.Path(__file__).parent.parent / "src" / "data" / "mobilemall-catalogue.json"
dst.write_text(json.dumps(out["rows"], indent=1) + "\n", encoding="utf-8")
print(
    f"mobilemall: {len(out['rows'])} rows -> {dst.name} "
    f"({out['skipped_oos']} out of stock, {out['skipped_bad']} unpriced/imageless skipped)"
)
