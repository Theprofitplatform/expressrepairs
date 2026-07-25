# scripts/extract-hoco-catalogue.py — HOCO xlsx -> src/data/hoco-catalogue.json
# Usage: python scripts/extract-hoco-catalogue.py "../HOCO_Catalogue_with_RRP_and_Barcodes_20260725.xlsx"
# The repo is public: ONLY the RRP column is exported. Wholesale never leaves this script.
import json, sys, pathlib
import openpyxl

src = sys.argv[1]
ws = openpyxl.load_workbook(src, read_only=True)["Catalogue"]
rows = ws.iter_rows(values_only=True)
header = [str(h or "") for h in next(rows)]
assert header[:2] == ["Product ID", "Product Name"], f"unexpected sheet layout: {header}"


# Columns move between exports (the 25 Jul one inserted SKU/Barcode before the
# prices), so find them by header text instead of a fixed index.
def col(fragment, required=True):
    i = next((i for i, h in enumerate(header) if fragment.lower() in h.lower()), None)
    assert i is not None or not required, f"no '{fragment}' column in: {header}"
    return i


C_RRP, C_IMAGE = col("RRP"), col("Image")
C_BARCODE, C_STATUS = col("Barcode", False), col("Barcode Status", False)
if C_BARCODE == C_STATUS:  # "Barcode" matched the status column: no barcodes here
    C_BARCODE = C_STATUS = None

out, skipped, coded = [], 0, 0
for r in rows:
    pid, name, rrp, image = r[0], r[1], r[C_RRP], r[C_IMAGE]
    if not pid or not name or not isinstance(rrp, (int, float)) or rrp <= 0:
        skipped += 1
        continue
    row = {
        "id": int(pid),
        "name": str(name).strip(),
        "rrpCents": round(float(rrp) * 100),
        "image": str(image or "").strip(),
    }
    # Only "Valid" barcodes are real GTINs — the sheet also flags rows where the
    # supplier put the SKU in the barcode field, or the check digit fails. A
    # wrong GTIN in a Merchant Center feed is worse than none, so those are dropped.
    if C_BARCODE is not None and r[C_STATUS] == "Valid":
        row["barcode"] = str(r[C_BARCODE]).strip()
        coded += 1
    out.append(row)

dest = pathlib.Path(__file__).parent.parent / "src" / "data" / "hoco-catalogue.json"
dest.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
print(f"{len(out)} products written ({coded} with a valid barcode), {skipped} skipped (no id/name/RRP)")
