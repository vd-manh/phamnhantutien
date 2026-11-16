"""Đánh dấu bút (lớp vũ khí) cho Đạo Gia: ghi dao/brush_marks.json.

- Hàng có bút vẽ sẵn (cách A: idle s/e/ne/n): dò lưỡi bút tự động (weapon_detect.detect), vẽ lại với độ dài thống nhất.
- Hàng cách B (tay nắm không): toạ độ nắm tay (ảnh nguồn) + góc bút, đặt tay trong bảng HAND dưới đây.
Góc: 0 = mũi bút sang phải, 90 = chúc xuống, -90 = chĩa lên (toạ độ ảnh).
Chạy: python -I tools/mark_dao_brush.py
"""
import json
import math
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_sheet  # noqa: E402
from weapon_detect import detect  # noqa: E402

ROOT = ai_sheet.ROOT
OUT = os.path.join(ROOT, "dao", "brush_marks.json")
L = 70            # độ dài bút cầm tay (px ảnh nguồn, người cao ~250)

# nguồn -> 6 khung (gx, gy, góc[, sau_lưng]); None = khung không có bút
HAND = {
    "front":     [(228, 256, 135), (228, 256, 135), (405, 255, 135), (572, 257, 135), (738, 256, 135), (909, 256, 135)],
    "se_run":    [(52, 252, 150), (243, 245, 150), (401, 249, 150), (588, 247, 150), (735, 254, 150), (925, 247, 150)],
    "s_run":     [(138, 209, 70), (291, 220, 70), (472, 225, 70), (632, 220, 70), (814, 222, 70), (984, 241, 70)],
    "e_run":     [(114, 207, 100), (290, 205, 100), (465, 194, 100), (633, 205, 100), (803, 198, 100), (972, 195, 100)],
    "ne_run":    [(151, 198, 75), (320, 195, 75), (490, 189, 75), (657, 212, 75), (828, 198, 75), (995, 192, 75)],   # tay phải ảnh (chốt 13/11)
    "n_run":     [(99, 211, 125, 1), (269, 206, 125, 1), (395, 221, 125, 1), (565, 222, 125, 1), (735, 220, 125, 1), (905, 220, 125, 1)],
    "se_attack": [(56, 258, 135), (303, 176, -35), (461, 174, -30), (643, 179, -5), (843, 176, -5), (912, 256, 135)],
    "s_attack":  [(129, 218, -70), (294, 217, -40), (479, 217, -30), (647, 218, -10), (821, 217, -10), (992, 217, -70)],
    "e_attack":  [(118, 207, -45), (256, 190, -20), (423, 192, -20), (648, 182, 0), (836, 182, 0), (970, 208, -45)],
    "ne_attack": [(139, 177, -60), (322, 158, -50), (496, 158, -50), (666, 155, -40), (666, 155, -40), (990, 240, 100)],   # tay phải ảnh (chốt 13/11)
    "se_cast":   [(125, 194, -40), (261, 194, 0), (483, 194, -45), (656, 206, 30), (847, 194, 20), (903, 261, 135)],
    # s_cast: khung 4-5 Gemini ném bằng tay kia; bút vẫn ở tay viết (nắm tay ở hông)
    "s_cast":    [(130, 214, -60), (292, 187, -45), (475, 189, -60), (636, 226, 60), (827, 227, 60), (996, 212, 100)],
    "e_cast":    [(146, 188, -45), (310, 163, -50), (489, 164, -50), (654, 180, 0), (866, 179, 0), (979, 208, 95)],
    "ne_cast":   [(151, 184, -60), (311, 178, -55), (485, 168, -60), (656, 149, -45), (852, 136, -50), (983, 245, 100)],
    "n_cast":    [(140, 183, -60), (294, 180, -60), (457, 177, -60), (630, 155, -65), (826, 161, -20), (986, 229, 100)],   # ảnh lật khi đóng gói
    "n_attack":  [(125, 225, -50), (299, 199, -50), (477, 205, -40), (662, 199, -30), (662, 199, -30), (987, 250, 60)],
}
# hàng có bút vẽ sẵn (cách A): mỗi khung (x thân bút, ...); toạ độ đọc trên lưới, bút gần thẳng đứng.
# (đầu xoá trên, đáy xoá dưới, y nắm tay, lệch x của nắm tay và mũi, sau_lưng)
# bút vẽ sẵn nhưng phải chuyển sang tay khác (NE: tay phải ảnh, chốt 13/11/2026): nắm tay mới từng khung
REGRIP = {"ne_idle": [(115, 300), (289, 300), (460, 295), (627, 300), (796, 300), (962, 300)]}
PAINTED = {
    "s_idle":  ([140, 303, 480, 649, 821, 992], 187, 300, 212, (0, -5), 0),
    "e_idle":  ([149, 308, 471, 637, 800, 966], 285, 395, 306, (-4, -4), 0),
    "ne_idle": ([38, 209, 378, 547, 717, 882], 225, 335, 245, (-2, 2), 1),
    "n_idle":  ([29, 195, 368, 536, 708, 879], 190, 300, 212, (1, 1), 0),
}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    srcs = ai_sheet.SETS["dao_ai"]["sources"]
    marks = {}
    for name, rows in HAND.items():
        row = srcs[name]["names"][0]
        for i, m in enumerate(rows):
            if m is None:
                continue
            gx, gy, a = m[:3]
            r = math.radians(a)
            marks[f"{name}/{row}/{i}"] = {"grip": [gx, gy], "tip": [round(gx + L * math.cos(r), 1), round(gy + L * math.sin(r), 1)],
                                          "behind": bool(m[3]) if len(m) > 3 else False, "noerase": True, "by": "claude"}
    for name, (xs, y0, y1, yg, (dg, dt), behind) in PAINTED.items():
        for i, x in enumerate(xs):
            dgp = REGRIP[name][i] if name in REGRIP else [x + dg, yg]
            marks[f"{name}/idle/{i}"] = {"grip": [x, y0], "tip": [x + dt, y1], "draw_grip": list(dgp), "draw_len": L,
                                         "behind": bool(behind) and name not in REGRIP, "by": "claude"}
    with open(OUT, "w", encoding="utf8") as f:
        json.dump({"note": "Bút Đạo Gia, toạ độ ảnh nguồn. Tạo bằng tools/mark_dao_brush.py", "marks": marks}, f, ensure_ascii=False, indent=1)
    print("ghi", len(marks), "khung ->", OUT)


if __name__ == "__main__":
    main()
