"""Tạo nhân vật Kiếm Tu "bạch y" từ tu sĩ cầm kiếm của beanfx (nghich_tien_kiem_topdown, MIT):
  - gỡ mạng che mặt (chấm trắng kiểu bàn cờ) bằng cách tô lại từ điểm ảnh xung quanh, lộ mặt ra
  - gỡ nón rộng vành, vẽ lại chỏm tóc đen, búi tóc có kim quan và đuôi ngựa buông sau gáy (theo hướng nhìn)
  - đổi màu: tóc đen, áo trắng ngà (bóng xanh nhạt), phần tối của áo xám xanh thẫm, điểm đỏ -> xanh lam linh khí,
    lưỡi kiếm vàng -> bạc ánh lam
Kết quả: assets/casters/kiem_bach_y_topdown/ (cùng rig.json, cùng tên sheet).

Cần Pillow:  python tools/make_kiem_tu.py [--preview thư_mục]
"""
import argparse
import colorsys
import json
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "casters", "nghich_tien_kiem_topdown")
DST = os.path.join(ROOT, "assets", "casters", "kiem_bach_y_topdown")

HAIR = [(14, 12, 20), (30, 27, 42), (52, 48, 70), (84, 82, 110)]    # tối -> sáng (ánh xanh nhẹ)
GOLD = [(120, 78, 20), (214, 160, 52), (250, 222, 128)]
OUTL = (8, 6, 14)
PONYTAIL = True          # Kiếm Tu: đuôi ngựa buông sau gáy; Võ Tu tắt đi
BUN = (2.2, 1.8, 6.5)    # búi tóc: bán kính ngang, bán kính dọc, cao hơn đỉnh đầu bao nhiêu
HEADWEAR = "bun"         # "bun": búi tóc (+ kim quan / dải đồng); "cap": nho cân đen có hai dải khăn (Nho Đạo)
CAP = [(8, 8, 12), (30, 30, 38), (66, 66, 80)]

# hướng "sau gáy" (đuôi ngựa buông về phía này) theo tên hướng; y > 0 là buông xuống
BACK = {"east": (-1, 0.6), "west": (1, 0.6), "south": (0, 1), "north": (0, 1),
        "south-east": (-0.8, 0.8), "south-west": (0.8, 0.8), "north-east": (-0.7, 0.9), "north-west": (0.7, 0.9)}


def hls_of(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


def hls(hdeg, l, s):
    r, g, b = colorsys.hls_to_rgb((hdeg % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return (round(r * 255), round(g * 255), round(b * 255))


def is_hat(c):
    h, l, s = hls_of(c)
    return (15 <= h * 360 <= 50 and s < 0.22 and 0.08 < l < 0.45)


def is_light(c):
    h, l, s = hls_of(c)
    return l > 0.6 and (s < 0.3 or (l > 0.85 and 190 <= h * 360 <= 245))   # trắng xám / trắng ánh xanh, không phải da


_cache = {}


def remap(c):
    if c in _cache:
        return _cache[c]
    h, l, s = hls_of(c)
    hd = h * 360
    if s > 0.22 and 215 <= hd <= 262:                     # tóc xanh lam -> đen ánh xanh
        out = hls(250, 0.04 + l * 0.32, 0.25)
    elif (hd < 15 or hd > 340) and s > 0.35:              # đỏ -> xanh lam linh khí
        out = hls(200, 0.3 + l * 0.6, 0.75)
    elif 38 <= hd <= 62 and s > 0.45 and l > 0.35:        # lưỡi kiếm / đồ vàng -> bạc ánh lam
        out = hls(205, 0.45 + l * 0.5, 0.35)
    elif 10 <= hd <= 38 and s > 0.3 and l > 0.45:         # da: giữ, hơi sáng
        out = hls(hd, min(0.92, l * 1.04), s * 0.9)
    elif s < 0.2 and l >= 0.33:                           # áo xám sáng -> bạch y
        out = hls(205, 0.62 + (l - 0.33) * 0.85, 0.16)
    elif s < 0.3 and 0.12 <= l < 0.33:                    # áo xám tối -> xám xanh thẫm (áo trong)
        out = hls(215, 0.14 + (l - 0.12) * 0.9, 0.24)
    else:
        out = c[:3]
    _cache[c] = out
    return out


def edit_frame(cell, direction, phase):
    """cell: ảnh RGBA 1 frame. Trả về frame đã gỡ nón/mạng, vẽ tóc, đổi màu."""
    w, h = cell.size
    src = cell.load()
    px = [[src[x, y] for x in range(w)] for y in range(h)]
    op = lambda x, y: 0 <= x < w and 0 <= y < h and px[y][x][3] > 0   # noqa: E731

    hat = [(x, y) for y in range(h) for x in range(w) if px[y][x][3] and is_hat(px[y][x])]
    if len(hat) < 12:                                     # không thấy nón (vd. frame chết nằm) -> chỉ đổi màu
        return recolor(cell)
    top0 = min(y for _, y in hat)
    hat = [(x, y) for x, y in hat if y <= top0 + 14]      # chỉ phần nón trên đỉnh (bỏ màu xám nâu lẫn ở thân)
    hx0, hx1 = min(x for x, _ in hat), max(x for x, _ in hat)
    hy0, hy1 = min(y for _, y in hat), max(y for _, y in hat)

    # 1) mạng che: vùng ngay dưới vành nón, cùng bề ngang nón
    my0, my1 = hy1 - 1, min(h - 1, hy1 + 26)
    mesh = set()
    for y in range(my0, my1 + 1):
        for x in range(hx0 - 2, hx1 + 3):
            if op(x, y) and is_light(px[y][x]):
                # chấm mạng đứng lẻ kiểu bàn cờ: ít nhất 3 trong 4 điểm kề không phải màu sáng
                dark_nb = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                              if not (op(x + dx, y + dy) and is_light(px[y + dy][x + dx])))
                if dark_nb >= 3 or y <= hy1 + 12:            # vùng mặt ngay dưới vành: mọi điểm trắng xám là mạng
                    mesh.add((x, y))
    newpx = [row[:] for row in px]
    todo, done = set(mesh), set()
    for _ in range(5):                                    # tô dần từ ngoài vào (cụm mạng dày ở mặt)
        filled = {}
        for (x, y) in todo:
            nb = [newpx[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if op(x + dx, y + dy) and ((x + dx, y + dy) not in mesh or (x + dx, y + dy) in done)
                  and not is_hat(px[y + dy][x + dx])]
            if len(nb) >= 2:
                filled[(x, y)] = tuple(round(sum(c[i] for c in nb) / len(nb)) for i in range(3)) + (255,)
        for (x, y), c in filled.items():
            newpx[y][x] = c
        done |= set(filled)
        todo -= set(filled)
        if not filled:
            break
    for (x, y) in todo:
        newpx[y][x] = (0, 0, 0, 0)

    # 2) nón: xóa vùng màu nón + viền tối + dải đỏ trong khung nón
    for y in range(hy0 - 1, hy1 + 2):
        for x in range(hx0 - 1, hx1 + 2):
            if not (0 <= x < w and 0 <= y < h) or not newpx[y][x][3]:
                continue
            c = newpx[y][x]
            hh, l, s = hls_of(c)
            red = (hh * 360 < 15 or hh * 360 > 340) and s > 0.3
            if is_hat(c) or l < 0.09 or red:
                newpx[y][x] = (0, 0, 0, 0)
    # dọn các điểm lẻ trơ trọi do mạng / vành nón để lại (2 lượt)
    for _ in range(2):
      for y in range(hy0 - 2, my1 + 1):
        for x in range(hx0 - 3, hx1 + 4):
            if 0 <= x < w and 0 <= y < h and newpx[y][x][3]:
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                        if 0 <= x + dx < w and 0 <= y + dy < h and newpx[y + dy][x + dx][3])
                if n <= 1 and y < hy1 + 2:
                    newpx[y][x] = (0, 0, 0, 0)
                elif n == 0:
                    newpx[y][x] = (0, 0, 0, 0)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o = out.load()
    for y in range(h):
        for x in range(w):
            if newpx[y][x][3]:
                o[x, y] = newpx[y][x]
    out = recolor(out)
    o = out.load()

    # 3) đầu: tìm đỉnh còn lại của tóc/da ngay dưới chỗ nón cũ
    top, xs = None, []
    for y in range(hy0, min(h, hy1 + 14)):
        row = [x for x in range(hx0, hx1 + 1) if o[x, y][3]]
        if len(row) >= 3:
            top = y if top is None else top
            if y - top <= 4:
                xs += row
    if top is None:
        return out
    cx = sum(xs) / len(xs)
    half = max(4.5, min(7.0, (max(xs) - min(xs) + 1) / 2))
    cy = top + 1.5
    bx, by = BACK.get(direction, (0, 1))
    sway = math.sin(phase) * 0.8

    def dot(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < w and 0 <= y < h:
            o[x, y] = c + (255,)

    hair_px = []
    # đuôi ngựa: từ búi tóc buông về phía sau gáy rồi xuống
    if PONYTAIL and direction not in ("south",):
        root_x, root_y = cx + bx * (half - 1), cy - 4.5
        for i in range(26):
            t = i / 25
            x = root_x + bx * 5 * math.sin(t * 1.6) + sway * t * 2
            y = root_y + t * 24 * (0.6 + 0.4 * abs(by))
            wdt = 2.6 - 1.6 * t
            for dx in range(-2, 3):
                if abs(dx) <= wdt / 2 + 0.3:
                    hair_px.append((x + dx, y, 1 if dx > 0 else 2))
    # chỏm tóc: nửa elip phủ đầu
    for y in range(int(cy - 6), int(cy + 3)):
        for x in range(int(cx - half - 1), int(cx + half + 2)):
            if ((x + 0.5 - cx) / (half + 0.6)) ** 2 + ((y + 0.5 - cy) / 5.6) ** 2 <= 1 and y <= cy + 1:
                shade = 2 if (x + 0.5 - cx) < -half * 0.2 and y < cy - 2 else 1
                hair_px.append((x, y, shade))
    for x, y, s in hair_px:
        dot(x, y, HAIR[s])
    if HEADWEAR == "cap":
        draw_cap(dot, cx, cy, half, bx, by, sway, direction)
    else:
        draw_bun(dot, cx, cy, bx)
    # viền tối quanh phần tóc mới vẽ
    region = [(x, y) for y in range(max(0, int(cy - 14)), min(h, int(cy + 32)))
              for x in range(max(0, int(cx - 16)), min(w, int(cx + 17)))]
    add = []
    for x, y in region:
        if o[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3]
                                   and o[x + dx, y + dy][:3] in (HAIR[1], HAIR[2], GOLD[0], GOLD[1], GOLD[2], CAP[1], CAP[2])
                                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            add.append((x, y))
    for x, y in add:
        o[x, y] = OUTL + (255,)
    return out


def draw_cap(dot, cx, cy, half, bx, by, sway, direction):
    """Nho cân: mũ vải đen ôm đỉnh đầu, chóp vuông phía sau, hai dải khăn buông dài sau gáy."""
    for y in range(int(cy - 6), int(cy) + 1):                 # thân mũ ôm đỉnh đầu
        for x in range(int(cx - half - 1), int(cx + half + 2)):
            if ((x + 0.5 - cx) / (half + 0.9)) ** 2 + ((y + 0.5 - (cy + 0.5)) / 5.8) ** 2 <= 1 and y <= cy:
                dot(x, y, CAP[2] if (x + 0.5 - cx) < -half * 0.3 and y < cy - 4 else CAP[1])
    qx = cx + bx * 2.5                                        # chóp vuông thấp nhô lên phía sau
    for y in range(int(cy - 8), int(cy - 5)):
        for x in range(int(qx - 2), int(qx + 3)):
            dot(x, y, CAP[1] if x > qx - 1 else CAP[2])
    for x in range(int(cx - half - 1), int(cx + half + 2)):  # vành mũ
        dot(x, cy, CAP[0])
    # hai dải khăn: từ sau mũ buông xuống, lay nhẹ
    if direction in ("south",):
        roots = [(cx - half - 0.5, cy - 2, -1), (cx + half + 0.5, cy - 2, 1)]
    else:
        roots = [(qx + bx * 2 - 1, cy - 4, bx or 1), (qx + bx * 2 + 1, cy - 3, bx or 1)]
    for j, (rx, ry, sd) in enumerate(roots):
        x, y = rx, ry
        for i in range(20):
            x += sd * 0.4 + sway * 0.25 * (1 if j else -1) + (0.2 if i > 10 else 0) * sd
            y += 1
            dot(x, y, CAP[2] if i % 4 == 1 else CAP[1])
            dot(x + sd, y, CAP[0])


def draw_bun(dot, cx, cy, bx):
    # búi tóc + kim quan
    kx, ky = cx + bx * 1.5, cy - BUN[2]
    for x in range(int(kx - BUN[0] - 1), int(kx + BUN[0] + 2)):
        for y in range(int(ky - BUN[1] - 1), int(ky + BUN[1] + 2)):
            if ((x + 0.5 - kx) / BUN[0]) ** 2 + ((y + 0.5 - ky) / BUN[1]) ** 2 <= 1:
                dot(x, y, HAIR[1])
    if BUN[0] > 2.5:                                      # búi lớn (Võ Tu): dải đồng quấn ngang chân búi
        for x in range(int(kx - BUN[0]), int(kx + BUN[0]) + 1):
            dot(x, ky + BUN[1] - 1, GOLD[1])
        dot(kx - BUN[0] - 1, ky + BUN[1], GOLD[0]); dot(kx - BUN[0] - 2, ky + BUN[1] + 1, GOLD[0])
        dot(kx - 1, ky - BUN[1] + 1, HAIR[2]); dot(kx, ky - BUN[1] + 1, HAIR[3])
    else:                                                 # kim quan + trâm (Kiếm Tu)
        dot(kx - 1, ky - 2, GOLD[1]); dot(kx, ky - 2, GOLD[2]); dot(kx + 1, ky - 2, GOLD[1])
        dot(kx, ky - 3, GOLD[2]); dot(kx - 1, ky - 1, GOLD[0]); dot(kx + 1, ky - 1, GOLD[0])
        dot(kx - 3, ky, GOLD[1]); dot(kx + 3, ky, GOLD[1])


def recolor(img):
    out = img.copy()
    p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            c = p[x, y]
            if c[3]:
                p[x, y] = remap(c[:3]) + (c[3],)
    return out


def convert_sheet(path, fw, fh, direction, k):
    src = Image.open(path).convert("RGBA")
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    for i in range(src.width // fw):
        out.paste(edit_frame(src.crop((i * fw, 0, i * fw + fw, fh)), direction, i * 0.6 + k), (i * fw, 0))
    return out


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview")
    a = ap.parse_args()
    rig = json.load(open(os.path.join(SRC, "rig.json"), encoding="utf8"))
    if a.preview:
        cells = []
        for name, fi in [("idle_south", 0), ("idle_east", 2), ("idle_north", 0), ("idle_south-west", 0),
                         ("run_east", 3), ("attack2_south-east", 4), ("cast_south", 4), ("run_north-west", 5)]:
            anim, d = name.split("_", 1)
            fw, fh = rig["anims"][anim]["frame"]
            src = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
            cells.append(edit_frame(src.crop((fi * fw, 0, fi * fw + fw, fh)), d, fi).crop((30, 10, 114, 118)))
        prev = Image.new("RGBA", (84 * len(cells), 108), (46, 52, 40, 255))
        for i, c in enumerate(cells):
            prev.alpha_composite(c, (i * 84, 0))
        prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(a.preview, "kiem_bach_y.png"))
        print("preview ok")
        return
    os.makedirs(DST, exist_ok=True)
    k = 0
    for anim, info in rig["anims"].items():
        fw, fh = info["frame"]
        for d, fname in info["sheets"].items():
            convert_sheet(os.path.join(SRC, fname), fw, fh, d, k).save(os.path.join(DST, fname), optimize=True)
            k += 1
    rig["name"] = "kiem_bach_y_topdown"
    rig["source"] = "Kiếm Tu bạch y: gỡ nón và mạng che, vẽ tóc đuôi ngựa, đổi màu từ nghich_tien_kiem_topdown của beanfx (MIT)"
    json.dump(rig, open(os.path.join(DST, "rig.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("đã tạo", k, "sheet vào", DST)


if __name__ == "__main__":
    main()
