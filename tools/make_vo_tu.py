"""Tạo nhân vật Võ Tu (tay không) từ tu sĩ cầm kiếm của beanfx (nghich_tien_kiem_topdown, MIT):
  - gỡ thanh kiếm khỏi tay: lưỡi kiếm (vàng + viền đỏ) bị xóa; chỗ lưỡi chồng lên người được tô lại từ xung quanh
  - gỡ nón + mạng che, vẽ tóc đen búi cao buộc dải đồng, đuôi tóc buông sau gáy (dùng chung với make_kiem_tu.py)
  - đổi màu: áo khoác ngoài trắng ngọc, áo trong xanh ngọc bích, đai/viền màu đồng, tóc đen
Kết quả: assets/casters/vo_tu_topdown/ (cùng rig.json, cùng tên sheet).

Cần Pillow:  python tools/make_vo_tu.py [--preview thư_mục]
"""
import argparse
import colorsys
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_kiem_tu as mk  # noqa: E402

SRC = mk.SRC
DST = os.path.join(mk.ROOT, "assets", "casters", "vo_tu_topdown")

# búi tóc cao buộc dải đồng, không đuôi ngựa (khác Kiếm Tu)
mk.GOLD = [(92, 52, 22), (168, 108, 52), (214, 160, 92)]
mk.PONYTAIL = False
mk.BUN = (3.4, 2.8, 8.0)


def hls_of(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


_cache = {}


def remap(c):
    """Bảng màu "lực điền": áo vải thô cam đất / hoàng thổ, phần tối nâu sẫm, da rám nắng, đai da sẫm.
    Tông nóng, tương phản mạnh với cỏ xanh của bản đồ."""
    if c in _cache:
        return _cache[c]
    h, l, s = hls_of(c)
    hd = h * 360
    if s > 0.22 and 215 <= hd <= 262:                     # tóc -> đen
        out = mk.hls(25, 0.04 + l * 0.22, 0.25)
    elif (hd < 15 or hd > 340) and s > 0.35:              # tua / nút đai -> da thuộc sẫm
        out = mk.hls(20, 0.1 + l * 0.25, 0.45)
    elif 38 <= hd <= 62 and s > 0.45 and l > 0.35:        # đồ vàng còn sót -> đồng
        out = mk.hls(30, 0.35 + l * 0.35, 0.6)
    elif 10 <= hd <= 38 and s > 0.3 and l > 0.45:         # da -> rám nắng
        out = mk.hls(22, 0.3 + l * 0.42, 0.5)
    elif s < 0.2 and l >= 0.45:                           # áo sáng -> cam đất / hoàng thổ
        out = mk.hls(32, 0.3 + (l - 0.45) * 0.95, 0.46)
    elif s < 0.3 and 0.12 <= l < 0.45:                    # áo tối -> nâu sẫm (quần, áo trong)
        out = mk.hls(16, 0.07 + (l - 0.12) * 0.5, 0.38)
    else:
        out = c[:3]
    _cache[c] = out
    return out


mk.remap = remap


def is_blade(c):
    h, l, s = hls_of(c)
    return 32 <= h * 360 <= 60 and s >= 0.18 and l > 0.3          # lưỡi kiếm: ngà / vàng nhạt các tông


def is_blade_edge(c):
    h, l, s = hls_of(c)
    hd = h * 360
    return (hd < 22 or hd > 340) and s > 0.35 or (20 <= hd <= 60 and s > 0.5 and l < 0.3)   # viền đỏ / nâu đậm


def is_red(c):
    h, l, s = hls_of(c)
    return (h * 360 < 15 or h * 360 > 340) and s > 0.35


def fill_inside(o, w, h, todo, body):
    """Điểm còn sót (todo): nằm trong bề ngang thân người ở cùng hàng thì tô bằng màu áo gần nhất bên trái/phải,
    nằm ngoài thì để trong suốt. Tránh lỗ thủng nhìn xuyên ra nền."""
    for (x, y) in todo:
        row = [bx for bx in range(w) if (bx, y) in body]
        if row and min(row) < x < max(row):
            left = max((bx for bx in row if bx < x), default=None)
            right = min((bx for bx in row if bx > x), default=None)
            cs = [o[bx, y] for bx in (left, right) if bx is not None and o[bx, y][3]]
            if cs:
                o[x, y] = tuple(round(sum(c[i] for c in cs) / len(cs)) for i in range(3)) + (255,)
                continue
        o[x, y] = (0, 0, 0, 0)


def remove_weapon(cell):
    """Xóa lưỡi kiếm (vàng) và viền đỏ dính liền lưỡi; chỗ chồng lên người tô lại từ điểm kề."""
    w, h = cell.size
    p = cell.load()
    blade = {(x, y) for y in range(h) for x in range(w) if p[x, y][3] and is_blade(p[x, y])}
    if len(blade) < 6:
        return cell
    for _ in range(3):                                    # viền đỏ / nâu dính liền lưỡi kiếm
        grow = set()
        for (x, y) in blade:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if 0 <= q[0] < w and 0 <= q[1] < h and q not in blade and p[q][3] and is_blade_edge(p[q]):
                        grow.add(q)
        blade |= grow
    out = cell.copy()
    o = out.load()
    body = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] and (x, y) not in blade   # noqa: E731
    for (x, y) in blade:
        o[x, y] = (0, 0, 0, 0)
    filled = {}
    for (x, y) in blade:                                  # lượt 1: chỉ tô từ điểm ảnh gốc của người
        nb = [p[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if body(x + dx, y + dy)]
        if len(nb) >= 2:
            filled[(x, y)] = tuple(round(sum(c[i] for c in nb) / len(nb)) for i in range(3)) + (255,)
    for q, c in filled.items():
        o[q] = c
    extra = {}
    for (x, y) in blade - set(filled):                    # lượt 2: điểm bị kẹp giữa người (>= 3 điểm kề)
        nb = [o[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
              if 0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3]]
        if len(nb) >= 3:
            extra[(x, y)] = tuple(round(sum(c[i] for c in nb) / len(nb)) for i in range(3)) + (255,)
    for q, c in extra.items():
        o[q] = c
    left = blade - set(filled) - set(extra)
    bodyset = {(x, y) for y in range(h) for x in range(w) if p[x, y][3] and (x, y) not in blade}
    fill_inside(o, w, h, left, bodyset)
    # dọn điểm ảnh lẻ còn sót dọc chỗ lưỡi kiếm cũ (0-1 điểm kề)
    near = set()
    for (x, y) in blade:
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                near.add((x + dx, y + dy))
    for _ in range(2):
        for (x, y) in near:
            if 0 <= x < w and 0 <= y < h and o[x, y][3]:
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                        if 0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3])
                if n <= 1:
                    o[x, y] = (0, 0, 0, 0)
    return out


def is_hair(c):
    h, l, s = hls_of(c)
    return 215 <= h * 360 <= 262 and (s > 0.22 or (s > 0.12 and l < 0.2))   # cả đuôi tóc xanh đen rất tối


def remove_long_hair(cell):
    """Bỏ phần tóc dài buông dưới cằm (tô lại bằng màu áo xung quanh, ngoài thân thì xóa)."""
    w, h = cell.size
    p = cell.load()
    hat = [(x, y) for y in range(h) for x in range(w) if p[x, y][3] and mk.is_hat(p[x, y])]
    if len(hat) < 12:
        return cell
    top0 = min(y for _, y in hat)
    hy1 = max(y for _, y in hat if y <= top0 + 14)
    cut = hy1 + 13                                        # dưới dòng này là tóc dài buông xuống lưng / vai
    hair = {(x, y) for y in range(cut, h) for x in range(w) if p[x, y][3] and is_hair(p[x, y])}
    if not hair:
        return cell
    for _ in range(2):                                    # lan sang viền đen + ánh sáng của lọn tóc
        grow = set()
        for (x, y) in hair:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in hair or not (0 <= q[0] < w and cut <= q[1] < h) or not p[q][3]:
                        continue
                    hh, l, s = hls_of(p[q])
                    if l < 0.07 or (200 <= hh * 360 <= 265 and s > 0.1):
                        grow.add(q)
        hair |= grow
    out = cell.copy()
    o = out.load()
    for q in hair:
        o[q] = (0, 0, 0, 0)
    todo = set(hair)
    for _ in range(14):                                   # tô dần từ mép áo vào
        filled = {}
        for (x, y) in todo:
            nb = [o[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if 0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3] and (x + dx, y + dy) not in todo]
            need = 2 if _ < 2 else 3                      # 2 lượt đầu: viền ngoài; sau đó chỉ tô chỗ bị kẹp giữa áo
            if len(nb) >= need:
                filled[(x, y)] = tuple(round(sum(c[i] for c in nb) / len(nb)) for i in range(3)) + (255,)
        for q, c in filled.items():
            o[q] = c
        todo -= set(filled)
        if not filled:
            break
    bodyset = {(x, y) for y in range(h) for x in range(w) if p[x, y][3] and (x, y) not in hair}
    fill_inside(o, w, h, todo, bodyset)
    return out


def drop_specks(img, min_size=8):
    """Xóa các mảnh nhỏ không dính vào thân (vụn lưỡi kiếm, đuôi tóc lẻ)."""
    w, h = img.size
    p = img.load()
    seen = set()
    for y in range(h):
        for x in range(w):
            if p[x, y][3] and (x, y) not in seen:
                comp, stack = [], [(x, y)]
                seen.add((x, y))
                while stack:
                    cx, cy = stack.pop()
                    comp.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        q = (cx + dx, cy + dy)
                        if 0 <= q[0] < w and 0 <= q[1] < h and q not in seen and p[q][3]:
                            seen.add(q); stack.append(q)
                if len(comp) < min_size:
                    for q in comp:
                        p[q] = (0, 0, 0, 0)
    return img


BULK = 1.22          # thân từ cổ trở xuống rộng thêm 22% (đầu giữ nguyên) -> dáng vạm vỡ


def widen_body(img, pivot_x, found_head):
    """Mở rộng ngang phần thân dưới cổ quanh trục chân; 4 hàng ở vai chuyển tiếp dần để không gãy hình."""
    if not found_head:
        return img
    w, h = img.size
    p = img.load()
    rows = [y for y in range(h) if any(p[x, y][3] for x in range(w))]
    if not rows:
        return img
    neck = rows[0] + 21                                   # đỉnh búi + chiều cao đầu
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o = out.load()
    for y in range(h):
        k = 1.0 if y < neck else min(BULK, 1.0 + (BULK - 1.0) * (y - neck + 1) / 4)
        for x in range(w):
            sx = int(round(pivot_x + (x + 0.5 - pivot_x) / k - 0.5))
            if 0 <= sx < w:
                o[x, y] = p[sx, y]
    return out


def edit(cell, direction, phase, pivot_x=72):
    rw = remove_weapon(cell)
    p = rw.load()
    has_hat = sum(1 for y in range(rw.height) for x in range(rw.width) if p[x, y][3] and mk.is_hat(p[x, y])) >= 12
    return drop_specks(widen_body(mk.edit_frame(remove_long_hair(rw), direction, phase), pivot_x, has_hat))


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
                         ("run_east", 3), ("attack2_south-east", 4), ("attack1_east", 3), ("cast_south", 4)]:
            anim, d = name.split("_", 1)
            fw, fh = rig["anims"][anim]["frame"]
            src = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
            cells.append(edit(src.crop((fi * fw, 0, fi * fw + fw, fh)), d, fi).crop((30, 10, 114, 118)))
        prev = Image.new("RGBA", (84 * len(cells), 108), (60, 70, 80, 255))
        for i, c in enumerate(cells):
            prev.alpha_composite(c, (i * 84, 0))
        prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(os.path.join(a.preview, "vo_tu.png"))
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
    rig["name"] = "vo_tu_topdown"
    rig["source"] = "Võ Tu tay không: gỡ kiếm, nón, mạng che; tóc búi cao; đổi màu từ nghich_tien_kiem_topdown của beanfx (MIT)"
    json.dump(rig, open(os.path.join(DST, "rig.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("đã tạo", k, "sheet vào", DST)


if __name__ == "__main__":
    main()
