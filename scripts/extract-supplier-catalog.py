# scripts/extract-supplier-catalog.py — supplier xlsx -> .supplier-data/*.json
# Usage: python scripts/extract-supplier-catalog.py <hoco.xlsx> <mobilemall.xlsx>
# Output INCLUDES wholesale/cost prices, so it goes to gitignored .supplier-data/
# (repo is public). Next step: node scripts/build-supplier-catalog.mjs
import json, sys, pathlib
import openpyxl

hoco_src, mm_src = sys.argv[1], sys.argv[2]
out_dir = pathlib.Path(__file__).parent.parent / ".supplier-data"
out_dir.mkdir(exist_ok=True)

def rows_of(path):
    ws = openpyxl.load_workbook(path, read_only=True)["Catalogue"]
    it = ws.iter_rows(values_only=True)
    return next(it), it

def num(v):
    return float(v) if isinstance(v, (int, float)) else None

# HOCO: (Product ID, Product Name, Wholesale Price, RRP, Margin, Margin %, URL, Image)
header, rows = rows_of(hoco_src)
assert header[:4] == ("Product ID", "Product Name", "Wholesale Price (AUD)",
                      "Selling Price / RRP (AUD)"), f"HOCO layout changed: {header}"
hoco, skipped = [], 0
for r in rows:
    pid, name, cost, rrp = r[0], r[1], num(r[2]), num(r[3])
    if not pid or not name or not cost or cost <= 0:
        skipped += 1
        continue
    hoco.append({"id": int(pid), "name": str(name).strip(), "cost": cost, "rrp": rrp})
(out_dir / "hoco.json").write_text(json.dumps(hoco), encoding="utf-8")
print(f"hoco: {len(hoco)} rows, {skipped} skipped")

# MobileMall: (SKU, Product Name, Regular Price, Current Price, Stock Status, Categories, URL, Image)
header, rows = rows_of(mm_src)
assert header[:6] == ("SKU", "Product Name", "Regular Price (AUD)",
                      "Current Price (AUD)", "Stock Status", "Categories"), f"MobileMall layout changed: {header}"
mm, skipped = [], 0
for r in rows:
    sku, name, cost, stock, cats = r[0], r[1], num(r[3]), r[4], r[5]
    if not sku or not name or not cost or cost <= 0:
        skipped += 1
        continue
    mm.append({"sku": str(sku).strip(), "name": str(name).strip(), "cost": cost,
               "stock": str(stock or "").strip(), "categories": str(cats or "").strip()})
(out_dir / "mobilemall.json").write_text(json.dumps(mm), encoding="utf-8")
print(f"mobilemall: {len(mm)} rows, {skipped} skipped")
