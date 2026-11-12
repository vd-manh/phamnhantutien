"""Tạo nhân vật Quỷ Tu từ tu sĩ cầm trượng của beanfx (nghich_tien_truong_topdown, MIT):
  - đổi màu: áo đen than, tóc đỏ máu, mạng che mặt lưới đỏ, da trắng bệch, đầu trượng màu xương
  - vẽ thêm lá cờ hồn (Vạn Hồn Phiên) rách đỏ đen có phù văn, treo ở đầu trượng của từng frame,
    nằm sau thân người và lay nhẹ theo frame.
Kết quả: assets/casters/quy_tu_topdown/ (cùng rig.json, cùng tên sheet) để game dùng như nhân vật beanfx.

Cần Pillow:  python tools/make_quy_tu.py [--preview thư_mục]
"""
import argparse
import colorsys
import json
import math
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "casters", "nghich_tien_truong_topdown")
DST = os.path.join(ROOT, "assets", "casters", "quy_tu_topdown")


def hls(hdeg, l, s):
    r, g, b = colorsys.hls_to_rgb((hdeg % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return (round(r * 255), round(g * 255), round(b * 255))


_cache = {}


def remap(r, g, b):
    key = (r, g, b)
    if key in _cache:
        return _cache[key]
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hd = h * 360
    if s > 0.25 and 140 <= hd <= 185:                 # đầu trượng xanh ngọc -> xương
        out = hls(40, 0.22 + l * 0.55, 0.22)
    elif s > 0.25 and 215 <= hd <= 262 and l > 0.15:  # tóc xanh lam -> đỏ máu thẫm
        out = hls(352, 0.06 + l * 0.5, 0.6)
    elif (hd < 15 or hd > 340) and s > 0.35:          # viền / đai đỏ -> đỏ máu tươi hơn
        out = hls(355, min(0.55, l * 1.15), min(1, s * 1.1))
    elif 10 <= hd <= 45 and s > 0.3 and l > 0.45:     # da -> trắng bệch
        out = hls(215, 0.5 + l * 0.32, 0.1)
    elif l > 0.86:                                    # điểm trắng (lưới mạng che mặt, viền sáng) -> lưới đỏ
        out = hls(355, 0.42, 0.55)
    else:                                             # áo xám, nón, bóng tối -> đen than
        out = hls(228 if 150 < hd < 300 else 350, 0.03 + l * 0.34, min(0.22, s + 0.05))
    _cache[key] = out
    return out


def staff_head(cell):
    """Vị trí đầu trượng (cụm pixel xanh ngọc) trong frame gốc: (x giữa, y trên cùng) hoặc None."""
    px = cell.load()
    w, h = cell.size
    xs, top, n = 0, h, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            hh, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s > 0.25 and 140 <= hh * 360 <= 185:
                xs += x; n += 1; top = min(top, y)
    return (round(xs / n), top) if n >= 4 else None


def noise(i, salt):
    v = math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
    return v - math.floor(v)


def draw_banner(layer, ax, ay, side, phase):
    """Cờ hồn treo dưới thanh ngang ở đầu trượng (ax, ay). side = 1 treo sang phải, -1 sang trái."""
    px = layer.load()
    W, H = layer.size

    def put(x, y, c, a=255):
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = (*c, a)

    wood, cloth, cloth2, band, rune, paper, seal = (40, 26, 22), (26, 12, 18), (44, 14, 22), (120, 18, 30), (214, 168, 74), (214, 204, 168), (170, 30, 36)
    bw = 13                                            # bề rộng lá cờ
    x0 = ax + (1 if side > 0 else -bw)                 # mép cờ sát cán
    top = ay + 1
    # thanh ngang
    for x in range(min(ax, x0) - 1, max(ax, x0 + bw) + 2):
        put(x, top - 1, wood)
    # vải cờ: mỗi cột dài khác nhau (rách), lay theo hàng
    for c in range(bw):
        length = 27 + int(noise(c, 1) * 7) - (4 if c in (2, 6, 10) else 0)
        for r in range(length):
            sway = round(math.sin(phase + r * 0.18) * (r / 14.0))
            x, y = x0 + c + sway * side, top + r
            col = cloth2 if c in (0, bw - 1) else cloth
            if 3 <= r <= 6:
                col = band
            if c == bw // 2 and r >= 8 and r % 4 == 0 and r < length - 3:
                col = rune
            if c == bw // 2 - 2 and r >= 10 and (r + 2) % 6 == 0 and r < length - 3:
                col = rune
            put(x, y, col)
    # hai dải bùa giấy dài ở hai mép
    for k, cx in enumerate((x0 - 1, x0 + bw)):
        length = 36 + int(noise(k, 7) * 6)
        for r in range(length):
            sway = round(math.sin(phase * 1.3 + r * 0.22 + k) * (r / 10.0))
            put(cx + sway * side, top + r, seal if r % 5 == 0 else paper)


def outline(layer, col=(6, 3, 10)):
    px = layer.load()
    W, H = layer.size
    pts = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0 and any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] > 0
                                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                pts.append((x, y))
    for x, y in pts:
        px[x, y] = (*col, 255)


def convert_sheet(path, fw, fh, pivot_x, sheet_index):
    src = Image.open(path).convert("RGBA")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    n = src.width // fw
    for i in range(n):
        cell = src.crop((i * fw, 0, i * fw + fw, fh))
        rec = Image.new("RGBA", cell.size, (0, 0, 0, 0))
        sp, dp = cell.load(), rec.load()
        for y in range(fh):
            for x in range(fw):
                r, g, b, a = sp[x, y]
                if a:
                    dp[x, y] = (*remap(r, g, b), a)
        head = staff_head(cell)
        frame = Image.new("RGBA", cell.size, (0, 0, 0, 0))
        if head:
            ban = Image.new("RGBA", cell.size, (0, 0, 0, 0))
            side = 1 if head[0] >= pivot_x else -1
            draw_banner(ban, head[0], head[1], side, phase=i * 0.7 + sheet_index)
            outline(ban)
            frame.alpha_composite(ban)
        frame.alpha_composite(rec)                     # nhân vật đè lên cờ: cờ nằm phía sau
        out.paste(frame, (i * fw, 0))
    return out


def main():
    try:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")      # console Windows mặc định không in được tiếng Việt
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="chỉ xuất ảnh xem thử vào thư mục này")
    a = ap.parse_args()
    rig = json.load(open(os.path.join(SRC, "rig.json"), encoding="utf8"))

    if a.preview:
        cells = []
        for name in ["idle_south", "idle_east", "idle_north", "run_west", "attack1_east", "cast_south", "attack3_south-west"]:
            anim = name.split("_")[0]
            info = rig["anims"][anim]
            fw, fh = info["frame"]
            sh = convert_sheet(os.path.join(SRC, name + ".png"), fw, fh, info["pivot"][0], 0)
            cells.append(sh.crop((fw * 3, 0, fw * 4, fh)))
        prev = Image.new("RGBA", (144 * len(cells), 128), (46, 52, 40, 255))
        for i, c in enumerate(cells):
            prev.alpha_composite(c, (i * 144, 0))
        prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(a.preview, "quy_tu.png"))
        print("preview ok")
        return

    os.makedirs(DST, exist_ok=True)
    k = 0
    for anim, info in rig["anims"].items():
        fw, fh = info["frame"]
        for d, fname in info["sheets"].items():
            convert_sheet(os.path.join(SRC, fname), fw, fh, info["pivot"][0], k).save(os.path.join(DST, fname), optimize=True)
            k += 1
    rig["name"] = "quy_tu_topdown"
    rig["source"] = "Quỷ Tu: đổi màu + vẽ thêm cờ hồn từ nghich_tien_truong_topdown của beanfx (MIT)"
    json.dump(rig, open(os.path.join(DST, "rig.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("đã tạo", k, "sheet vào", DST)


if __name__ == "__main__":
    main()
