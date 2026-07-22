# scripts/extract-hoco-catalogue.py — HOCO xlsx -> src/data/hoco-catalogue.json
# Usage: python scripts/extract-hoco-catalogue.py "../HOCO_Catalogue_with_RRP_2026-07-20.xlsx"
# The repo is public: ONLY the RRP column is exported. Wholesale never leaves this script.
import json, sys, pathlib
import openpyxl

src = sys.argv[1]
ws = openpyxl.load_workbook(src, read_only=True)["Catalogue"]
rows = ws.iter_rows(values_only=True)
header = next(rows)
assert header[:2] == ("Product ID", "Product Name"), f"unexpected sheet layout: {header}"

out, skipped = [], 0
for r in rows:
    pid, name, _wholesale, rrp = r[0], r[1], r[2], r[3]
    image = r[7]
    if not pid or not name or not isinstance(rrp, (int, float)) or rrp <= 0:
        skipped += 1
        continue
    out.append({
        "id": int(pid),
        "name": str(name).strip(),
        "rrpCents": round(float(rrp) * 100),
        "image": str(image or "").strip(),
    })

dest = pathlib.Path(__file__).parent.parent / "src" / "data" / "hoco-catalogue.json"
dest.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
print(f"{len(out)} products written, {skipped} skipped (no id/name/RRP)")
