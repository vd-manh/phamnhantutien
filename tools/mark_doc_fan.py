"""Đánh dấu quạt (lớp vũ khí) cho Độc Tu: ghi doc/fan_marks.json (toạ độ ảnh nguồn).

Mọi hàng vẽ theo cách B (tay nắm không): bảng HAND = nắm tay + góc quạt từng khung.
Góc: 0 = mũi quạt sang phải, 90 = chúc xuống, -90 = dựng lên (quạt cầm dựng lên như quạt thật, người dùng chốt 16/11/2026). Phần tử thứ 4 = 1: quạt nằm sau thân.
Nắm tay dò bằng màu da xám tái (độ bão hoà thấp, sáng vừa), đọc lại trên lưới khi cần.
Chạy: python -I tools/mark_doc_fan.py   rồi   python -I tools/ai_sheet.py doc_ai
"""
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "doc", "fan_marks.json")
L = 66            # độ dài quạt gấp (px ảnh nguồn, người cao ~250)

HAND = {
    # chéo trước: quạt ở tay xa (bên trái ảnh), buông chéo xuống ra ngoài
    "front":   [(57, 246, -128), (221, 246, -128), (397, 246, -128), (566, 246, -128), (737, 246, -128), (913, 246, -128)],
    # thẳng: tay bên phải ảnh
    "s_idle":  [(131, 207, -72), (303, 207, -72), (474, 207, -72), (643, 207, -72), (813, 207, -72), (982, 207, -72)],
    # ngang: nắm tay trước bụng, quạt chúc xuống hơi ra trước
    "e_idle":  [(117, 201, -62), (287, 203, -62), (456, 203, -62), (625, 202, -62), (795, 203, -62), (960, 201, -62)],
    # chéo sau: tay bên phải ảnh, ở hông
    "ne_idle": [(133, 242, -62), (304, 242, -62), (474, 242, -62), (643, 245, -62), (812, 242, -62), (980, 244, -62)],
    # sau lưng: tay bên trái ảnh
    "n_idle":  [(36, 214, -105), (201, 251, -105), (372, 251, -105), (543, 253, -105), (702, 253, -105), (872, 250, -105)],
    # ---- hàng chạy (nắm tay dò theo da xám, đối chiếu lưới); góc dựng lên như hàng đứng
    "se_run":  [(53, 243, -128), (240, 238, -128), (404, 238, -128), (568, 240, -128), (731, 242, -128), (899, 238, -128)],
    "s_run":   [(128, 205, -72), (302, 247, -72), (476, 212, -72), (645, 247, -72), (817, 213, -72), (988, 205, -72)],
    "e_run":   [(126, 192, -62), (294, 203, -62), (471, 186, -62), (650, 198, -62), (813, 191, -62), (973, 208, -62)],
    "ne_run":  [(145, 136, -62), (313, 143, -62), (483, 131, -62), (655, 140, -62), (825, 136, -62), (997, 144, -62)],
    # sau lưng: tay trái ảnh vung trước/sau thân, quạt nằm sau thân (khuất bớt)
    "n_run":   [(45, 200, -105, 1), (212, 152, -105, 1), (378, 196, -105, 1), (578, 170, -105, 1), (715, 196, -105, 1), (886, 149, -105, 1)],
    # ---- hàng đánh: quạt theo tay đang vung (ở vài hướng Gemini vung bằng tay kia); duỗi tay thì quạt chĩa theo tay
    "se_attack": [(124, 190, -70), (204, 150, -110), (486, 160, 10), (653, 187, 20), (829, 183, 20), (987, 191, -70)],
    "s_attack":  [(165, 295, -72), (305, 252, -100), (499, 265, -20), (670, 263, -10), (833, 266, -10), (1000, 295, -72)],
    "e_attack":  [(125, 154, -60), (294, 197, -80), (480, 161, -10), (653, 162, -5), (831, 199, 10), (976, 187, -60)],
    "ne_attack": [(245, 272, -62), (565, 268, -62), (885, 292, 0), (1192, 228, -40), (1471, 326, 10), (1744, 295, -62)],
    # sau lưng: toạ độ ảnh gốc (tay bên phải ảnh), khi đóng gói ảnh bị lật nên quạt về tay trái
    "n_attack":  [(133, 207, -75, 1), (314, 153, -80), (512, 155, -40), (660, 100, -85), (838, 240, -75), (991, 206, -75, 1)],
    # ---- hàng thi pháp: khung 1-2 tụ độc trước ngực, 3-6 vung quạt phóng độc
    "se_cast":   [(129, 207, -70), (296, 195, -70), (487, 186, -60), (647, 221, 25), (839, 205, 15), (990, 239, -70)],
    "s_cast":    [(67, 147, -72), (260, 147, -72), (399, 138, -100), (609, 144, -72), (753, 148, -100), (931, 182, -72)],
    "e_cast":    [(138, 176, -60), (304, 161, -60), (462, 183, -30), (640, 172, 0), (834, 177, 0), (980, 203, -60)],
    "ne_cast":   [(134, 180, -62), (306, 177, -62), (480, 162, -62), (650, 140, -40), (830, 135, -30), (985, 194, -62)],
    # sau lưng: toạ độ ảnh gốc (tay bên phải ảnh), ảnh được lật khi đóng gói
    "n_cast":    [(143, 195, -75, 1), (313, 200, -75), (482, 179, -75), (650, 100, -85), (850, 166, -75), (993, 261, -75, 1)],
}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ai_sheet
    srcs = ai_sheet.SETS["doc_ai"]["sources"]
    marks = {}
    for name, rows in HAND.items():
        if name not in srcs:
            continue
        row = srcs[name]["names"][0]
        for i, m in enumerate(rows):
            if m is None:
                continue
            gx, gy, a = m[:3]
            r = math.radians(a)
            marks[f"{name}/{row}/{i}"] = {"grip": [gx, gy], "tip": [round(gx + L * math.cos(r), 1), round(gy + L * math.sin(r), 1)],
                                          "behind": bool(m[3]) if len(m) > 3 else False, "noerase": True, "by": "claude"}
    with open(OUT, "w", encoding="utf8") as f:
        json.dump({"note": "Quạt Độc Tu, toạ độ ảnh nguồn. Tạo bằng tools/mark_doc_fan.py", "marks": marks}, f, ensure_ascii=False, indent=1)
    print("ghi", len(marks), "khung ->", OUT)


if __name__ == "__main__":
    main()
