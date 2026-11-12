"""Tạo nhân vật Nho Đạo (đạo sĩ thư sinh, đen trắng) từ tu sĩ cầm trượng của beanfx (nghich_tien_truong_topdown, MIT):
  - gỡ nón + mạng che, vẽ tóc đen búi cao cài trâm ngọc, tóc dài buông sau lưng (dùng chung make_kiem_tu.py)
  - đổi màu kiểu thủy mặc: áo ngoài trắng tinh, áo trong / phần tối đen mực, điểm đỏ -> xám mực
  - đầu trượng xanh ngọc -> phất trần đuôi ngựa trắng, cán trượng sơn đen
Kết quả: assets/casters/nho_dao_topdown/ (cùng rig.json, cùng tên sheet).

Cần Pillow:  python tools/make_nho_dao.py [--preview thư_mục]
"""
import argparse
import math
import colorsys
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_kiem_tu as mk  # noqa: E402

SRC = os.path.join(mk.ROOT, "assets", "casters", "nghich_tien_truong_topdown")
DST = os.path.join(mk.ROOT, "assets", "casters", "nho_dao_topdown")

# tóc dài thả tự do (không đuôi ngựa), đội nho cân đen có hai dải khăn -> khác hẳn Kiếm Tu / Võ Tu
mk.GOLD = [(30, 84, 58), (72, 160, 112), (168, 228, 190)]
mk.PONYTAIL = False
mk.HEADWEAR = "cap"

SCROLL = [(222, 204, 128), (182, 160, 86), (128, 104, 52), (72, 44, 20)]   # thẻ tre: sáng, vừa, bóng, dây buộc

_cache = {}


def remap(c):
    if c in _cache:
        return _cache[c]
    h, l, s = colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)
    hd = h * 360
    if s > 0.22 and 140 <= hd <= 185:                     # đầu trượng xanh ngọc -> ngòi bút lông (lông trắng, mũi mực đen)
        out = mk.hls(220, 0.62 + l * 0.36, 0.05) if l > 0.5 else mk.hls(230, 0.05 + l * 0.15, 0.1)
    elif s > 0.22 and 215 <= hd <= 262:                   # tóc -> đen
        out = mk.hls(230, 0.03 + l * 0.2, 0.12)
    elif (hd < 15 or hd > 340) and s > 0.35:              # đỏ -> xám mực
        out = mk.hls(230, 0.12 + l * 0.35, 0.06)
    elif 38 <= hd <= 62 and s > 0.45 and l > 0.35:        # đồ vàng -> ngọc
        out = mk.hls(150, 0.3 + l * 0.4, 0.45)
    elif 10 <= hd <= 38 and s > 0.3 and l > 0.45:         # da: giữ, hơi sáng
        out = mk.hls(hd, min(0.93, l * 1.05), s * 0.85)
    elif s < 0.2 and l >= 0.42:                           # áo sáng -> trắng tinh
        out = mk.hls(220, 0.74 + (l - 0.42) * 0.55, 0.06)
    elif s < 0.3 and 0.1 <= l < 0.42:                     # áo tối -> đen mực
        out = mk.hls(230, 0.05 + (l - 0.1) * 0.35, 0.08)
    else:
        out = c[:3]
    _cache[c] = out
    return out


mk.remap = remap


def _hls(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


def is_skin(c):
    h, l, s = _hls(c)
    return 10 <= h * 360 <= 38 and s > 0.3 and l > 0.45


def is_teal(c):
    h, l, s = _hls(c)
    return s > 0.22 and 140 <= h * 360 <= 185


def add_scroll(img, orig):
    """Quyển thẻ tre ở bàn tay không cầm bút: cụm màu da dưới cổ, xa cây bút nhất. Bàn tay vẽ đè lên thẻ tre."""
    w, h = img.size
    p, q = img.load(), orig.load()
    teal = [(x, y) for y in range(h) for x in range(w) if q[x, y][3] and is_teal(q[x, y])]
    rows = [y for y in range(h) if any(p[x, y][3] for x in range(w))]
    if not rows or not teal:
        return img
    bx = sum(x for x, _ in teal) / len(teal)
    skin = {(x, y) for y in range(rows[0] + 24, h) for x in range(w) if p[x, y][3] and is_skin(p[x, y])}
    clusters, seen = [], set()
    for s0 in skin:
        if s0 in seen:
            continue
        comp, stack = [], [s0]
        seen.add(s0)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (cx + dx, cy + dy)
                    if n in skin and n not in seen:
                        seen.add(n); stack.append(n)
        if len(comp) >= 2:
            clusters.append(comp)
    if not clusters:
        return img
    cent = [(sum(x for x, _ in c) / len(c), sum(y for _, y in c) / len(c), c) for c in clusters]
    cent.sort(key=lambda t: -abs(t[0] - bx))
    hx, hy, hand = cent[0]
    if abs(hx - bx) < 7:                                   # chỉ thấy tay cầm bút -> không vẽ thẻ tre
        return img
    hand_px = {pt: p[pt] for pt in hand}
    x0, y0 = int(round(hx - 5)), int(round(hy - 2))
    rect = [(x0 + i, y0 + j) for j in range(7) for i in range(10)]
    for (x, y) in rect:
        if not (0 <= x < w and 0 <= y < h):
            continue
        i, j = x - x0, y - y0
        if j in (0, 6):
            col = SCROLL[2]
        elif j in (2, 4):
            col = SCROLL[3]                                # dây buộc
        else:
            col = SCROLL[0] if i % 2 == 0 else SCROLL[1]   # các thanh tre
        p[x, y] = col + (255,)
    for x in range(x0 - 1, x0 + 11):                       # viền tối
        for y in (y0 - 1, y0 + 7):
            if 0 <= x < w and 0 <= y < h and (x, y) not in hand_px:
                p[x, y] = mk.OUTL + (255,)
    for y in range(y0, y0 + 7):
        for x in (x0 - 1, x0 + 10):
            if 0 <= x < w and 0 <= y < h and (x, y) not in hand_px:
                p[x, y] = mk.OUTL + (255,)
    for pt, c in hand_px.items():                         # bàn tay đè lên thẻ tre
        p[pt] = c
    return img


# ---------------- gỡ cây trượng (dò theo đường thẳng từ đầu trượng), thay bằng bút lông nhỏ cầm tay
def _hls2(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


def _is_teal(c):
    h, l, s = _hls2(c)
    return s > 0.22 and 140 <= h * 360 <= 185


def staff_col(c):
    h, l, s = _hls2(c)
    hd = h * 360
    return (200 <= hd <= 232 and s >= 0.09 and l >= 0.4 and not (hd >= 225 and s > 0.3 and l < 0.8)) or l < 0.22


def _is_skin(c):
    h, l, s = _hls2(c)
    return 10 <= h * 360 <= 38 and s > 0.3 and l > 0.45


def find_staff(im):
    w, h = im.size
    p = im.load()
    op = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] > 0   # noqa: E731
    teal = [(x, y) for y in range(h) for x in range(w) if op(x, y) and is_teal(p[x, y])]
    if len(teal) < 4:
        return set(), None
    hc = (sum(x for x, _ in teal) / len(teal), sum(y for _, y in teal) / len(teal))
    hat = [(x, y) for y in range(h) for x in range(w) if op(x, y) and mk.is_hat(p[x, y])]
    veil = None
    if hat:
        t0 = min(y for _, y in hat)
        hat = [(x, y) for x, y in hat if y <= t0 + 14]
        veil = (min(x for x, _ in hat) - 3, max(x for x, _ in hat) + 3, max(y for _, y in hat) - 1, max(y for _, y in hat) + 26)
    whites = []
    for y in range(h):
        for x in range(w):
            if not op(x, y):
                continue
            hh, l, s = _hls2(p[x, y])
            if l > 0.88 and 200 <= hh * 360 <= 230 and s >= 0.15:
                if veil and veil[0] <= x <= veil[1] and veil[2] <= y <= veil[3]:
                    continue
                dd = math.hypot(x - hc[0], y - hc[1])
                if dd > 6:
                    whites.append((x, y, dd))
    mask = set(teal)
    for y in range(int(hc[1]) - 7, int(hc[1]) + 8):                 # head knob
        for x in range(int(hc[0]) - 7, int(hc[0]) + 8):
            if op(x, y) and math.hypot(x - hc[0], y - hc[1]) <= 7.5 and (staff_col(p[x, y]) or is_teal(p[x, y]) or greyish(p[x, y])):
                if not is_skin(p[x, y]):
                    mask.add((x, y))
    line = None
    if whites:
        angs = sorted(math.atan2(y - hc[1], x - hc[0]) for x, y, _ in whites)
        a = angs[len(angs) // 2]
        near = [d for x, y, d in whites if abs(math.atan2(y - hc[1], x - hc[0]) - a) < 0.35]
        L = (max(near) if near else 0) + 2
        ux, uy = math.cos(a), math.sin(a)
        miss, t = 0, 0.0                                  # dò dọc cán cho tới khi hết màu cán (3 điểm hụt liên tiếp)
        while t < 120 and miss < 3:
            t += 1
            hit = any(op(int(round(hc[0] + ux * t - uy * o)), int(round(hc[1] + uy * t + ux * o))) and
                      staff_col(p[int(round(hc[0] + ux * t - uy * o)), int(round(hc[1] + uy * t + ux * o))])
                      for o in (-1, 0, 1))
            miss = 0 if hit else miss + 1
        L = max(L, t - 3)
        line = (hc, a, L)
        for y in range(h):
            for x in range(w):
                if not op(x, y) or (x, y) in mask:
                    continue
                t = (x - hc[0]) * ux + (y - hc[1]) * uy
                if t < 0 or t > L:
                    continue
                d = abs(-(x - hc[0]) * uy + (y - hc[1]) * ux)
                if d <= 1.6 and (staff_col(p[x, y]) or (d <= 1.1 and greyish(p[x, y]))) and not is_skin(p[x, y]):
                    mask.add((x, y))
    return mask, (hc, line)




def greyish(c):
    h, l, s = _hls2(c)
    return s < 0.2 and l > 0.35


def drop_small(img, region, min_size=10):
    """Xóa mảnh nhỏ rời rạc (vụn trượng) có điểm nằm trong vùng region."""
    w, h = img.size
    p = img.load()
    seen = set()
    for st in region:
        if st in seen or not (0 <= st[0] < w and 0 <= st[1] < h) or not p[st][3]:
            continue
        comp, stack = [], [st]
        seen.add(st)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (cx + dx, cy + dy)
                if 0 <= q[0] < w and 0 <= q[1] < h and q not in seen and p[q][3]:
                    seen.add(q); stack.append(q)
        if len(comp) < min_size:
            for q in comp:
                p[q] = (0, 0, 0, 0)


def remove_staff(cell):
    """Xóa trượng; điểm nằm trong bề ngang thân ở cùng hàng thì vá bằng màu áo hai bên. Trả về (ảnh, vị trí tay cầm, hướng)."""
    mask, info = find_staff(cell)
    if not mask:
        return cell, None
    w, h = cell.size
    p = cell.load()
    out = cell.copy()
    o = out.load()
    for q in mask:
        o[q] = (0, 0, 0, 0)
    body = {(x, y) for y in range(h) for x in range(w) if p[x, y][3] and (x, y) not in mask}
    for (x, y) in mask:
        row = [bx for bx in range(max(0, x - 12), min(w, x + 13)) if (bx, y) in body]
        left = max((bx for bx in row if bx < x), default=None)
        right = min((bx for bx in row if bx > x), default=None)
        if left is not None and right is not None and right - left <= 9:
            cs = [o[left, y], o[right, y]]
            o[x, y] = tuple(round((cs[0][i] + cs[1][i]) / 2) for i in range(3)) + (255,)
    near = {(x + dx, y + dy) for (x, y) in mask for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)}
    for _ in range(2):                                    # điểm lẻ bám quanh chỗ trượng cũ
        for (x, y) in near:
            if 0 <= x < w and 0 <= y < h and o[x, y][3]:
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                        if 0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3])
                if n <= 1:
                    o[x, y] = (0, 0, 0, 0)
    drop_small(out, near)
    hc, line = info
    # tay cầm: cụm màu da gần cán trượng nhất
    skin = [(x, y) for (x, y) in body if _is_skin(p[x, y])]
    grip, a = None, None
    if line and skin:
        _, a, L = line
        ux, uy = math.cos(a), math.sin(a)
        def dist(q):
            t = (q[0] - hc[0]) * ux + (q[1] - hc[1]) * uy
            return abs(-(q[0] - hc[0]) * uy + (q[1] - hc[1]) * ux) + (0 if 0 <= t <= L else 50)
        best = min(skin, key=dist)
        if dist(best) < 4:
            grip = best
    if grip is None and skin:
        grip = min(skin, key=lambda q: math.hypot(q[0] - hc[0], q[1] - hc[1]))
        a = math.atan2(hc[1] - grip[1], hc[0] - grip[0]) + math.pi
    return out, (grip, a)


BRUSH = [(14, 12, 18), (58, 34, 22), (96, 60, 34), (150, 150, 158), (236, 238, 244), (20, 18, 26)]


def draw_brush(img, grip, ang):
    """Bút lông ngắn (~13 px) trong tay: đuôi cán sau tay, cán gỗ sơn, khâu bạc, ngòi lông trắng, mũi mực đen.
    Hướng ngòi: ngược về phía đầu trượng cũ (ang chỉ từ đầu trượng xuống cán) -> ngòi chĩa theo phía đầu trượng."""
    if grip is None or ang is None:
        return img
    w, h = img.size
    o = img.load()
    hand = {}
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            q = (grip[0] + dx, grip[1] + dy)
            if 0 <= q[0] < w and 0 <= q[1] < h and o[q][3] and _is_skin(o[q]):
                hand[q] = o[q]
    ux, uy = -math.cos(ang), -math.sin(ang)          # từ tay hướng về phía đầu trượng cũ
    if uy > 0.2:                                      # luôn để ngòi chếch lên cho dễ nhận
        ux, uy = ux, -abs(uy)
    pts = []
    for t in range(-3, 11):
        if t < 0:
            col = BRUSH[1]
        elif t < 6:
            col = BRUSH[2] if t % 2 else BRUSH[1]
        elif t == 6:
            col = BRUSH[3]
        elif t < 10:
            col = BRUSH[4]
        else:
            col = BRUSH[5]
        x, y = grip[0] + ux * t, grip[1] + uy * t
        pts.append((x, y, col, t))
    drawn = set()
    for x, y, col, t in pts:
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < w and 0 <= yi < h:
            o[xi, yi] = col + (255,); drawn.add((xi, yi))
        if 7 <= t <= 8:                               # ngòi phình ra 1 px
            xj, yj = int(round(x - uy)), int(round(y + ux))
            if 0 <= xj < w and 0 <= yj < h:
                o[xj, yj] = BRUSH[4] + (255,); drawn.add((xj, yj))
    for (x, y) in list(drawn):                        # viền tối quanh bút
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if 0 <= q[0] < w and 0 <= q[1] < h and q not in drawn and not o[q][3]:
                o[q] = BRUSH[0] + (255,)
    for q, c in hand.items():                         # bàn tay nắm đè lên cán
        o[q] = c
    return img


def ink_tip(img, orig):
    """Nhuộm mũi ngòi bút (phần trên cùng của đầu trượng cũ) thành đen mực."""
    w, h = img.size
    p, q = img.load(), orig.load()
    teal = [(x, y) for y in range(h) for x in range(w) if q[x, y][3] and is_teal(q[x, y])]
    if len(teal) < 4:
        return img
    y0, y1 = min(y for _, y in teal), max(y for _, y in teal)
    cut = y0 + max(1, round((y1 - y0) * 0.38))
    for (x, y) in teal:
        if y <= cut and p[x, y][3]:
            p[x, y] = (22, 20, 28, 255) if y < cut else (60, 58, 70, 255)
    return img


def edit(cell, direction, phase):
    clean, grip = remove_staff(cell)
    out = mk.edit_frame(clean, direction, phase)
    if grip:
        draw_brush(out, *grip)
    return add_scroll(out, cell)


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
        for name, fi in [("idle_south", 0), ("idle_east", 2), ("idle_north", 0), ("run_east", 3),
                         ("attack1_east", 4), ("cast_south", 4), ("attack3_south-west", 5)]:
            anim, d = name.split("_", 1)
            fw, fh = rig["anims"][anim]["frame"]
            src = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
            cells.append(edit(src.crop((fi * fw, 0, fi * fw + fw, fh)), d, fi).crop((20, 10, 124, 118)))
        prev = Image.new("RGBA", (104 * len(cells), 108), (62, 123, 58, 255))
        for i, c in enumerate(cells):
            prev.alpha_composite(c, (i * 104, 0))
        prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(a.preview, "nho_dao.png"))
        print("preview ok")
        return
    os.makedirs(DST, exist_ok=True)
    k = 0
    for anim, info in rig["anims"].items():
        fw, fh = info["frame"]
        for d, fname in info["sheets"].items():
            src = Image.open(os.path.join(SRC, fname)).convert("RGBA")
            out = Image.new("RGBA", src.size, (0, 0, 0, 0))
            for i in range(src.width // fw):
                out.paste(edit(src.crop((i * fw, 0, i * fw + fw, fh)), d, i * 0.6 + k), (i * fw, 0))
            out.save(os.path.join(DST, fname), optimize=True)
            k += 1
    rig["name"] = "nho_dao_topdown"
    rig["source"] = "Nho Đạo: gỡ nón và mạng che, nho cân hai dải khăn, đổi màu đen trắng, đại bút + thẻ tre, từ nghich_tien_truong_topdown của beanfx (MIT)"
    json.dump(rig, open(os.path.join(DST, "rig.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("đã tạo", k, "sheet vào", DST)


if __name__ == "__main__":
    main()
