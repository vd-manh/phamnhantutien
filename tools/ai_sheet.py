"""Đóng gói sprite sheet do AI tạo (nền trắng, lưới ô đều) thành bộ nhân vật của game.

Mỗi bộ khai báo trong SETS:
  sources: tên -> (mẫu đường dẫn, vùng cắt hoặc None, số hàng, số cột, tên các hàng)
  dirsets: tên -> {hướng: (nguồn, lật ngang)}     (các hướng thiếu lấy hướng gần nhất / lật ngang)
  anims:   động tác game -> (dirset, hàng, các khung, fps, lặp, khung chạm, kiểu căn chân)
     kiểu căn chân: "frame" = căn từng khung (đứng, chạy, chém) | "row" = giữ chuyển động trong hàng (ngã, cất cánh)

Chạy:  python tools/ai_sheet.py <key> [--preview <thư mục>]
"""
import glob
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "casters", "chibi")
DIRS8 = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
SHRINK = 0.45                      # 1 ô AI (~170px) -> ~77px, hiển thị 1:1 với casterScale 0.5
FW, FH = 128, 104                  # khung cuối (đủ chỗ cho vệt chém, thanh kiếm bay)
PX, PY = 64, 96                    # chân nhân vật trong khung
BASE_ROWS = ["idle", "run", "attack", "cast", "hurt", "dead"]
FLY_ROWS = ["up", "fly", "land"]
ALL6 = [0, 1, 2, 3, 4, 5]


def mirror(m):
    """Điền các hướng bên trái bằng cách lật hướng bên phải tương ứng."""
    out = dict(m)
    for r, l in (("east", "west"), ("south-east", "south-west"), ("north-east", "north-west")):
        if r in m and l not in m:
            out[l] = (m[r][0], not m[r][1])
    return out


SETS = {
    "kiem_ai": dict(
        height=74,
        # nguồn: tên -> dict(path, box, rows, cols, names, size_from, fix)
        #   size_from: (nguồn, hàng, khung) dùng để đo chiều cao đứng -> tự chỉnh cỡ cho bằng nguồn "front"
        #   fix: {(hàng, khung): (hàng, khung)} thay khung hỏng bằng khung khác
        sources={
            "front": dict(path="sword/kiem_base_front.png.png", rows=6, cols=6, names=BASE_ROWS),   # nhìn chéo trước-phải
            "south": dict(path="sword/kiem_base_south.png.png", rows=6, cols=6, names=BASE_ROWS),
            "back":  dict(path="sword/kiem_base_back*.png", rows=6, cols=6, names=BASE_ROWS),
            "side":  dict(path="sword/kiem_side_ref_sheet.png", rows=4, cols=6, names=BASE_ROWS[:4],
                          fix={("idle", 5): ("idle", 4)}),            # khung cuối hàng 1 bị nút che
            "side_hurt": dict(path="sword/kiem_side_hurt*.png", rows=1, cols=6, names=["hurt"],
                              size_from=("side_hurt", "hurt", 0)),
            "side_dead": dict(path="sword/kiem_side_dead*.png", rows=1, cols=6, names=["dead"],
                              size_from=("side_hurt", "hurt", 0)),
            "fly_ne": dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(6, 6, 506, 506), rows=3, cols=3, names=FLY_ROWS),
            "fly_se": dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(518, 6, 1018, 506), rows=3, cols=3, names=FLY_ROWS),
            "fly_e":  dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(6, 518, 506, 1018), rows=3, cols=3, names=FLY_ROWS),
            "fly_n":  dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(518, 518, 1018, 1018), rows=3, cols=3, names=FLY_ROWS),
        },
        dirsets={
            "base": mirror({"south-east": ("front", False), "south": ("south", False), "east": ("side", False),
                            "north-east": ("back", False), "north": ("back", False)}),
            # chém / thi pháp nhìn ngang: hàng 3-4 của ảnh nhìn ngang bị AI vẽ quay lưng -> dùng ảnh nhìn chéo trước
            "act": mirror({"south-east": ("front", False), "south": ("south", False), "east": ("front", False),
                           "north-east": ("back", False), "north": ("back", False)}),
            "hurt": mirror({"south-east": ("front", False), "south": ("south", False), "east": ("side_hurt", False),
                            "north-east": ("back", False), "north": ("back", False)}),
            "dead": mirror({"south-east": ("front", False), "south": ("south", False), "east": ("side_dead", False),
                            "north-east": ("front", False), "north": ("south", False)}),
            "fly": mirror({"south-east": ("fly_se", False), "south": ("fly_se", False), "east": ("fly_e", False),
                           "north-east": ("fly_ne", False), "north": ("fly_n", False)}),
        },
        anims={
            "idle":     ("base", "idle", ALL6, 6, True, None, "frame"),
            "run":      ("base", "run", ALL6, 11, True, None, "frame"),
            "attack1":  ("act", "attack", ALL6, 18, False, 2, "frame"),
            "attack2":  ("act", "attack", [1, 2, 3, 4, 5], 18, False, 2, "frame"),
            "attack3":  ("act", "attack", ALL6, 13, False, 3, "frame"),
            "cast":     ("act", "cast", [0, 1], 6, False, 1, "frame"),          # 1 tay bắt ấn trước ngực, giữ tư thế
            "cast_point": ("act", "cast", [2, 3, 4, 5], 10, False, None, "frame"),   # tay chỉ thẳng thi pháp, kiếm khí
            "hurt":     ("hurt", "hurt", [0, 1, 3], 12, False, None, "frame"),
            "dead":     ("dead", "dead", ALL6, 9, False, None, "row"),
            "fly_up":   ("fly", "up", [0, 1, 2], 8, False, None, "row"),
            "fly":      ("fly", "fly", [0, 1, 2], 6, True, None, "frame"),
            "fly_land": ("fly", "land", [0, 1, 2], 8, False, None, "row"),
        },
    ),
}


def ink(rgb):
    return rgb.min(2) < 225


def bounds(profile, n, lo, hi):
    """Tìm n-1 đường cắt (cột/hàng ít mực nhất) quanh các vị trí chia đều."""
    step = (hi - lo) / n
    win_r = int(step * 0.2)
    cuts = [lo]
    for k in range(1, n):
        c = int(lo + k * step)
        win = profile[c - win_r:c + win_r]
        cuts.append(c - win_r + int(np.argmin(win + np.abs(np.arange(len(win)) - win_r) * 0.02)))
    cuts.append(hi)
    return cuts


def remove_bg(cell):
    """Xoá nền trắng nối với mép ô (flood fill), giữ phần trắng bên trong nhân vật."""
    rgb = cell[..., :3].astype(int)
    h, w = rgb.shape[:2]
    light = (rgb.min(2) > 228) & (rgb.max(2) - rgb.min(2) < 22)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    # vùng nền bị vệt chém bao kín: gần như trắng tinh (nhiều điểm >= 250, không ngả xanh),
    # còn mảng trắng của áo luôn hơi ngả lam và không có điểm trắng tinh
    lab, n = ndimage.label(light & ~bg)
    for i in range(1, n + 1):
        comp = lab == i
        if comp.sum() < 12:
            continue
        px = rgb[comp]
        if (px.min(1) >= 250).mean() > 0.25 and (px[:, 2] - px[:, 0]).mean() < 8:
            bg |= comp
    out = cell.copy()
    out[..., 3] = np.where(bg, 0, 255)
    # viền sáng còn sót sát nền: làm mờ theo độ trắng (2 lượt)
    for _ in range(2):
        a = out[..., 3] > 0
        near = np.zeros_like(a)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            near |= np.roll(np.roll(~a, dy, 0), dx, 1)
        edge = a & near
        wh = rgb.min(2)
        fade = edge & (wh > 200)
        out[fade, 3] = np.clip((255 - wh[fade]) * 4, 0, 255).astype(np.uint8)
        out[edge & (wh > 235), 3] = 0
    # bỏ các mảnh vụn nhỏ tách rời (nhiễu, mép ô bên cạnh)
    lab, n = ndimage.label(out[..., 3] > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < 40:
                out[lab == i, 3] = 0
    return out


def split(src):
    files = sorted(glob.glob(os.path.join(ROOT, src["path"])))
    if not files:
        raise SystemExit("không tìm thấy ảnh: " + src["path"])
    im = np.array(Image.open(files[0]).convert("RGBA"))
    if src.get("box"):
        x0, y0, x1, y1 = src["box"]
        im = im[y0:y1, x0:x1]
    nrows, ncols = src["rows"], src["cols"]
    m = ink(im[..., :3])
    rows = bounds(m.sum(1), nrows, 0, im.shape[0])
    grid = []
    for r in range(nrows):
        band = m[rows[r]:rows[r + 1]]
        cols = bounds(band.sum(0), ncols, 0, im.shape[1])
        grid.append([remove_bg(im[rows[r]:rows[r + 1], cols[c]:cols[c + 1]]) for c in range(ncols)])
    names = src["names"]
    for (rn, fi), (rn2, fi2) in (src.get("fix") or {}).items():
        grid[names.index(rn)][fi] = grid[names.index(rn2)][fi2]
    return grid


def stand_height(cell):
    ys = np.nonzero(cell[..., 3] > 128)[0]
    return float(ys.max() - ys.min()) if len(ys) else 1.0


def anchor(cell):
    """(x, y) điểm chân: đáy phần thân + trọng tâm điểm tối ở 14% dưới của thân (giày)."""
    a = cell[..., 3] > 128
    ys, xs = np.nonzero(a)
    if not len(ys):
        return cell.shape[1] / 2, cell.shape[0] - 1
    bot = ys.max()
    lum = cell[..., :3].astype(int).sum(2)
    band = a & (np.arange(a.shape[0])[:, None] > bot - (bot - ys.min()) * 0.14)
    dark = band & (lum < 200)
    sx = np.nonzero(dark)[1] if dark.any() else np.nonzero(band)[1]
    return float(np.median(sx)), float(bot)


def to_frame(cell, ax, ay, flip, k=SHRINK):
    im = Image.fromarray(cell).convert("RGBa")
    w, h = im.size
    im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS).convert("RGBA")
    ax, ay = ax * k, ay * k
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        ax = im.width - ax
    canvas = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    canvas.paste(im, (round(PX - ax), round(PY - ay)), im)
    return canvas


def build(key, preview=None):
    cfg = SETS[key]
    grids = {name: (split(src), src["names"]) for name, src in cfg["sources"].items()}

    def median_h(src, row, idxs):
        g, names = grids[src]
        return float(np.median([stand_height(g[names.index(row)][i]) for i in idxs]))

    ref_h = median_h("front", "idle", range(6))
    kmul = {}
    for name, src in cfg["sources"].items():
        if src.get("size_from"):
            sname, row, fi = src["size_from"]
            kmul[name] = ref_h / median_h(sname, row, [fi])
        elif "idle" in src["names"]:
            kmul[name] = ref_h / median_h(name, "idle", range(src["cols"]))
        else:
            kmul[name] = 1.0
    print("hệ số cỡ:", {k: round(v, 2) for k, v in kmul.items()})

    def row_cells(src, row):
        g, rows = grids[src]
        return g[rows.index(row)]

    anchor_cache = {}

    def anchors(src, row, mode):
        k = (src, row, mode)
        if k not in anchor_cache:
            per = [anchor(c) for c in row_cells(src, row)]
            if mode == "row":                      # giữ nguyên chuyển động (nhảy lên, ngã xuống) trong hàng
                ref = row_cells(src, row)[0]
                x0 = per[0][0]
                ground = max(p[1] for p in per)
                per = [(x0 + (c.shape[1] - ref.shape[1]) / 2, ground) for c in row_cells(src, row)]
            anchor_cache[k] = per
        return anchor_cache[k]

    dst = os.path.join(OUT, key)
    os.makedirs(dst, exist_ok=True)
    for f in glob.glob(os.path.join(dst, "*.png")):
        os.remove(f)
    rig = {"name": key, "view": "top-down", "fps": 10, "directions": DIRS8, "pixel_scale": 1, "height": cfg["height"],
           "source": "Sprite sheet tạo bằng AI (thư mục sword/), đóng gói bằng tools/ai_sheet.py", "anims": {}}
    prev = []
    for anim, (dset, row, idx, fps, loop, contact, mode) in cfg["anims"].items():
        entry = {"frame": [FW, FH], "frames": len(idx), "fps": fps, "loop": loop, "pivot": [PX, PY],
                 "ms": [round(1000 / fps)] * len(idx), "sheets": {}}
        if contact is not None:
            entry["contact"] = [contact]
        for d in DIRS8:
            src, flip = cfg["dirsets"][dset][d]
            cells, anc = row_cells(src, row), anchors(src, row, mode)
            frames = [to_frame(cells[i], *anc[i], flip, SHRINK * kmul[src]) for i in idx]
            strip = Image.new("RGBA", (FW * len(frames), FH))
            for i, f in enumerate(frames):
                strip.paste(f, (i * FW, 0))
            name = f"{anim}_{d}.png"
            strip.save(os.path.join(dst, name), optimize=True)
            entry["sheets"][d] = name
            if preview and d in ("south-east", "east", "north", "west"):
                prev.append(strip)
        rig["anims"][anim] = entry
    with open(os.path.join(dst, "rig.json"), "w", encoding="utf8") as f:
        json.dump(rig, f, ensure_ascii=False, indent=1)
    if preview:
        wmax = max(s.width for s in prev)
        sheet = Image.new("RGBA", (wmax, FH * len(prev)), (62, 123, 58, 255))
        for j, s in enumerate(prev):
            sheet.alpha_composite(s, (0, j * FH))
            for x in range(0, s.width, FW):            # dấu điểm chân để kiểm tra căn chỉnh
                sheet.putpixel((x + PX, j * FH + PY), (255, 0, 0, 255))
        sheet.save(os.path.join(preview, key + "_preview.png"))
    print("built", key)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    key = sys.argv[1]
    prev = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    build(key, prev)


if __name__ == "__main__":
    main()
