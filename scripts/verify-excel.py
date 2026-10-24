"""Read-only reconciliation against every populated workbook item row. Requires openpyxl."""
import json
from pathlib import Path
import openpyxl
root = Path(__file__).resolve().parents[1]
w = openpyxl.load_workbook(root / 'docs/source.xlsx', data_only=True)
items = json.loads((root / 'src/packing/initial-items.json').read_text())
mapping = {'随身背包':'backpack','26寸箱':'case26','28寸箱':'case28','美国采购':'shopping','出发检查':'checklist'}
seen = set()
for sheet, category in mapping.items():
    for row in w[sheet].iter_rows(min_row=8):
        sub, name, qty, priority, status, notes = [c.value for c in row[:6]]
        if not name:
            continue
        item = next(i for i in items if i['source']['sheet']==sheet and i['source']['row']==row[0].row)
        assert item['category']==category and item['name']==name
        assert item['priority']==priority and item['notes']==(notes or '')
        assert item['source']['subcategory']==sub and item['source']['quantity']==qty and item['source']['status']==status
        assert f"{item['quantity']}{item['unit']}"==qty
        seen.add(item['id'])
assert len(seen)==len(items)==92
print('PASS: 92/92 workbook rows match names, quantities, categories, priorities, original statuses and notes.')
