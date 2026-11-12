"""Chạy bộ dò kiếm trên mọi ô của mọi nguồn trong bộ kiem_ai, xuất ảnh tổng hợp từng nguồn."""
import sys, os
import numpy as np
from PIL import Image
import cv2
ROOT = r"d:\phamnhantutien-main"
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_sheet
from detect import detect

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
cfg = ai_sheet.SETS["kiem_ai"]
TARGET_H = 400
for name, src in cfg["sources"].items():
    if name.startswith("fly"):
        continue
    grid = ai_sheet.split(src)
    rows_img = []
    for r, row in enumerate(grid):
        cells = []
        for c, cell in enumerate(row):
            rgb = cell[..., :3].astype(float); a = cell[..., 3:4] / 255.0
            fr = (rgb * a + 255 * (1 - a)).astype(np.uint8)
            hh = ai_sheet.stand_height(cell)
            k = TARGET_H / max(hh, 1) if r == 0 or True else 1
            k = TARGET_H / ai_sheet.stand_height(grid[0][0]) if src["rows"] > 1 else TARGET_H / ai_sheet.stand_height(row[0])
            fr = cv2.resize(fr, None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC)
            fr = cv2.copyMakeBorder(fr, 40, 40, 60, 60, cv2.BORDER_CONSTANT, value=(255, 255, 255))
            res = detect(fr, cx=fr.shape[1] / 2)
            dbg = fr.copy()
            if res is not None:
                dbg[res["mask"]] = (255, 0, 0)
                cv2.circle(dbg, tuple(int(v) for v in res["grip"]), 9, (0, 200, 0), 3)
                cv2.circle(dbg, tuple(int(v) for v in res["tip"]), 9, (255, 0, 255), 3)
            else:
                cv2.rectangle(dbg, (0, 0), (dbg.shape[1] - 1, dbg.shape[0] - 1), (255, 140, 0), 8)
            cv2.putText(dbg, f"{src['names'][r]} {c}", (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
            dbg = cv2.resize(dbg, None, fx=0.4, fy=0.4, interpolation=cv2.INTER_AREA)
            cells.append(dbg)
        h = max(x.shape[0] for x in cells)
        cells = [cv2.copyMakeBorder(x, 0, h - x.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255)) for x in cells]
        rows_img.append(np.concatenate(cells, 1))
    w = max(x.shape[1] for x in rows_img)
    rows_img = [cv2.copyMakeBorder(x, 0, 0, 0, w - x.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for x in rows_img]
    Image.fromarray(np.concatenate(rows_img, 0)).save(f"{out}/{name}.png")
    print("done", name)
