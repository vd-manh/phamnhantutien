"""Biến bộ nhân vật "hero-128" (gegx.itch.io — dùng mọi dự án, không bán lại asset) thành nhân vật tông môn tu tiên:
  knight -> Kiếm Tu, mage -> Pháp Tu, rogue -> Quỷ Tu.
- Đổi màu theo tông môn và theo cảnh giới (6 bộ màu), giữ nguyên nét vẽ gốc.
- Vẽ thêm chi tiết cổ trang: tua đỏ trên mũ giáp (Kiếm Tu), ngọc bội ở chóp mũ (Pháp Tu), dải lụa đỏ sau mũ (Quỷ Tu),
  dải lụa bay (từ Hóa Thần), vầng hào quang (Luyện Hư).
- Đóng gói thành sheet theo định dạng game: assets/casters/chibi/<tông>_h<cảnh giới>/ + rig.json.
  Bản miễn phí chỉ có đứng + đi: các động tác khác khai báo "alias" để game dùng hiệu ứng thay thế.

Chạy:  python tools/hero_sects.py <thư_mục_giải_nén_4_zip> [--preview <thư_mục>]
"""
import colorsys
import json
import math
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "casters", "chibi")
DIRS8 = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]
CW = CH = 184
N = 12
SCALE = 0.3             # hiển thị trong game (đơn vị thế giới trên mỗi điểm ảnh sprite)

# (hue0, hue1, smin, smax) -> list per realm of (new_hue, new_sat, l_mul, l_add)
SECTS = {
    "kiem": dict(hero="knight", ribbon=(205, 0.6), rules=[
        ((185, 245, 0.30, 1.0), [(215, .08, .40, .45), (210, .14, .42, .52), (205, .28, .40, .50),
                                  (200, .40, .40, .45), (45, .55, .42, .40), (48, .30, .35, .62)]),
        ((185, 245, 0.0, 0.30), [None, None, None, None, (45, .30, 1.0, .0), (46, .40, 1.0, .05)]),   # giáp thép -> ánh vàng
    ]),
    "phap": dict(hero="mage", ribbon=(275, 0.5), rules=[
        ((235, 310, 0.12, 1.0), [(255, .25, .90, .02), (265, .45, .95, .02), (272, .60, .95, .0),
                                  (285, .60, .85, .0), (300, .55, .80, .02), (222, .60, 1.0, .05)]),
    ]),
    "quy": dict(hero="rogue", ribbon=(352, 0.75), rules=[
        ((180, 250, 0.08, 1.0), [(230, .08, .60, .0), (350, .20, .55, .0), (350, .30, .55, .0),
                                  (352, .40, .50, .0), (355, .55, .55, .02), (0, .70, .60, .05)]),
        ((270, 320, 0.15, 1.0), [(352, .75, .90, .05)] * 6),
    ]),
}
BACK = {"east": -1, "south-east": -1, "north-east": -1, "west": 1, "south-west": 1, "north-west": 1,
        "south": 0, "north": 0}


def hls_ramp(h, s, l):
    """4 tông (viền, bóng, nền, sáng) quanh một màu."""
    out = []
    for lm, sm in ((0.3, 1.1), (0.7, 1.05), (1.0, 1.0), (1.25, 0.8)):
        r, g, b = colorsys.hls_to_rgb(h / 360, max(0, min(1, l * lm if lm < 1 else l + (1 - l) * (lm - 1))), min(1, s * sm))
        out.append((round(r * 255), round(g * 255), round(b * 255)))
    return out


def recolor(im, rules, realm, cache):
    a = np.array(im.convert("RGBA"))
    flat = a.reshape(-1, 4)
    uniq, inv = np.unique(flat, axis=0, return_inverse=True)
    for i, c in enumerate(uniq):
        key = tuple(int(v) for v in c)
        if key not in cache:
            r, g, b, al = key
            out = key
            if al:
                h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                hd = h * 360
                for (h0, h1, smin, smax), per in rules:
                    nv = per[realm]
                    if nv and h0 <= hd <= h1 and smin <= s < smax:
                        nh, ns, lm, la = nv
                        nl = max(0.0, min(1.0, l * lm + la))
                        rr, gg, bb = colorsys.hls_to_rgb(nh / 360, nl, ns * min(1.0, s / 0.4 + 0.3))
                        out = (round(rr * 255), round(gg * 255), round(bb * 255), al)
                        break
            cache[key] = out
        uniq[i] = cache[key]
    return uniq[inv.ravel()].reshape(a.shape)


# ---------------------------------------------------------------- overlay painting
class Paint:
    def __init__(self, h, w):
        self.h, self.w = h, w
        self.ys, self.xs = np.mgrid[0:h, 0:w] + 0.5
        self.m = np.full((h, w), -1)
        self.col = np.zeros((h, w, 3), np.uint8)

    def stroke(self, pts, r, ramp):
        mask = np.zeros((self.h, self.w), bool)
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            dx, dy = x1 - x0, y1 - y0
            l2 = dx * dx + dy * dy or 1e-9
            t = np.clip(((self.xs - x0) * dx + (self.ys - y0) * dy) / l2, 0, 1)
            mask |= np.hypot(self.xs - x0 - t * dx, self.ys - y0 - t * dy) <= r
        self.fill(mask, ramp)

    def disc(self, cx, cy, r, ramp, ring=0):
        d = np.hypot(self.xs - cx, self.ys - cy)
        mask = (d <= r) & ((d >= r - ring) if ring else True)
        self.fill(mask, ramp)

    def fill(self, mask, ramp):
        up = np.zeros_like(mask); up[1:] = mask[:-1]
        lf = np.zeros_like(mask); lf[:, 1:] = mask[:, :-1]
        dn = np.zeros_like(mask); dn[:-1] = mask[1:]
        rt = np.zeros_like(mask); rt[:, :-1] = mask[:, 1:]
        tone = np.full(mask.shape, 2)
        tone[mask & (~dn | ~rt)] = 1
        tone[mask & (~up | ~lf)] = 3
        for t in (1, 2, 3):
            sel = mask & (tone == t)
            self.col[sel] = ramp[t]
        self.m[mask] = 1
        self.outline_ramp = ramp

    def rgba(self):
        on = self.m >= 0
        out = np.zeros((self.h, self.w, 4), np.uint8)
        out[on, :3] = self.col[on]
        out[on, 3] = 255
        edge = np.zeros_like(on)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            edge |= np.roll(np.roll(on, dy, 0), dx, 1)
        edge &= ~on
        out[edge, :3] = (20, 12, 18)
        out[edge, 3] = 255
        return out


def over(dst, src):
    a = src[..., 3:4] / 255.0
    dst[..., :3] = (src[..., :3] * a + dst[..., :3] * (1 - a)).astype(np.uint8)
    dst[..., 3] = np.maximum(dst[..., 3], src[..., 3])


def decorate(fr, sect, realm, direction, i):
    """fr: RGBA uint8 on the final canvas. Adds the xianxia details for this frame."""
    alpha = fr[..., 3] > 0
    ys, xs = np.nonzero(alpha)
    if not len(ys):
        return fr
    top = ys.min()
    tx = xs[ys <= top + 1].mean()
    bot = ys.max()
    hgt = bot - top
    back = BACK[direction]
    sway = math.sin(i / N * 2 * math.pi)
    behind = Paint(CH, CW)
    front = Paint(CH, CW)
    rh, rs = SECTS[sect]["ribbon"]
    if realm >= 5:                                  # vầng hào quang sau đầu
        behind.disc(tx, top + hgt * 0.14, hgt * 0.17, hls_ramp(48, .9, .65), ring=2.2)
    if realm >= 4:                                  # dải lụa bay sau vai
        sy = top + hgt * 0.3
        hw = hgt * 0.32
        arc = [(tx - hw + 2 * k * hw / 10, sy - math.sin(math.pi * k / 10) * hgt * 0.12 + sway * 1.2) for k in range(11)]
        behind.stroke(arc, 1.3, hls_ramp(rh, rs, .62))
        for sg in (-1, 1):
            tail = [(tx + sg * hw + sg * k * 1.2 + math.sin(k * 0.7 + sway + sg) * 2, sy + k * 4.5) for k in range(10)]
            behind.stroke(tail, 1.3, hls_ramp(rh, rs, .62))
    if sect == "kiem":                              # tua đỏ hồng anh trên mũ giáp
        base = (tx, top + 1)
        dx = back if back else 1
        pts = [base, (tx + dx * 1.5, top - 3), (tx + dx * (4 + sway), top - 3.5),
               (tx + dx * (7 + sway * 1.5), top + 0.5), (tx + dx * (8.5 + sway * 2), top + 5)]
        front.stroke(pts, 1.6, hls_ramp(356, .8, .5))
        if realm >= 2:
            front.disc(tx, top + 0.5, 1.6, hls_ramp(45, .85, .55))
    elif sect == "phap":                            # ngọc bội ở chóp mũ
        front.disc(tx, top + 1.5, 2.2, hls_ramp(45, .85, .55), ring=1.1)
        front.stroke([(tx, top + 3.5), (tx + (back or 1) * 1.5, top + 7 + sway)], 0.9, hls_ramp(45, .85, .55))
        front.disc(tx + (back or 1) * 1.6, top + 8.5 + sway, 1.6, hls_ramp(150 if realm < 5 else 200, .6, .55))
    elif sect == "quy":                             # dải lụa đỏ máu sau mũ trùm
        dxs = [back] if back else [-1, 1]
        for dx in dxs:
            pts = [(tx + dx * 3, top + hgt * 0.1 + k * 3.2) for k in range(1)]
            pts += [(tx + dx * (4 + k * 1.6) + math.sin(k * 0.8 + sway * 1.5) * 1.5, top + hgt * 0.1 + k * 3.6) for k in range(1, 8)]
            (front if direction.startswith("north") else behind).stroke(pts, 1.2, hls_ramp(354, .8, .45))
    out = np.zeros_like(fr)
    over(out, behind.rgba())
    over(out, fr)
    over(out, front.rgba())
    return out


def load_frames(src, hero, anim, d):
    folder = os.path.join(src, hero, hero + "-hero-128", f"{anim}_{d}")
    files = sorted(f for f in os.listdir(folder) if f.endswith(".png"))
    frames = [Image.open(os.path.join(folder, f)).convert("RGBA") for f in files]
    n = len(frames)
    return [frames[round(k * n / N) % n] for k in range(N)]


def place(im):
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((CW - im.width) // 2, CH - im.height - 2))
    return np.array(canvas)


def build(src, sect, realm, preview=None):
    cfg = SECTS[sect]
    key = f"{sect}_h{realm}"
    dst = os.path.join(OUT, key)
    os.makedirs(dst, exist_ok=True)
    cache = {}
    feet = []
    sheets = {"idle": {}, "run": {}}
    for anim, srcanim in (("idle", "idle"), ("run", "walk")):
        for d in DIRS8:
            frames = load_frames(src, cfg["hero"], srcanim, d)
            strip = np.zeros((CH, CW * N, 4), np.uint8)
            for i, im in enumerate(frames):
                fr = place(im)
                fr[..., :4] = recolor(Image.fromarray(fr), cfg["rules"], realm, cache)
                fr = decorate(fr, sect, realm, d, i)
                ys = np.nonzero(fr[..., 3])[0]
                if len(ys) and anim == "idle":
                    feet.append(ys.max())
                strip[:, i * CW:(i + 1) * CW] = fr
            name = f"{anim}_{d}.png"
            Image.fromarray(strip).save(os.path.join(dst, name), optimize=True)
            sheets[anim][d] = name
    pivot_y = int(np.median(feet)) + 1
    height = 120
    alias = {"alias": "idle", "frames": 4, "fps": 12, "loop": False, "frame": [CW, CH], "pivot": [CW // 2, pivot_y]}
    rig = {"name": key, "view": "top-down", "fps": 12, "directions": DIRS8, "pixel_scale": 1, "height": height,
           "scale": SCALE, "source": "hero-128 (gegx.itch.io) đổi màu + chi tiết tu tiên (tools/hero_sects.py)",
           "anims": {
               "idle": {"frame": [CW, CH], "frames": N, "fps": 12, "loop": True, "sheets": sheets["idle"], "pivot": [CW // 2, pivot_y]},
               "run": {"frame": [CW, CH], "frames": N, "fps": 14, "loop": True, "sheets": sheets["run"], "pivot": [CW // 2, pivot_y]},
               "cast": dict(alias), "attack1": dict(alias), "attack2": dict(alias), "attack3": dict(alias),
               "hurt": dict(alias, frames=2), "dead": dict(alias, frames=6)}}
    with open(os.path.join(dst, "rig.json"), "w", encoding="utf8") as f:
        json.dump(rig, f, ensure_ascii=False, indent=1)
    return key


def main():
    src = sys.argv[1]
    if "--preview" in sys.argv:
        out = sys.argv[sys.argv.index("--preview") + 1]
        os.makedirs(out, exist_ok=True)
        rows = []
        for sect, cfg in SECTS.items():
            for realm in range(6):
                cache = {}
                row = []
                for d in ("south", "south-east", "east", "north"):
                    fr = place(load_frames(src, cfg["hero"], "idle", d)[0])
                    fr[..., :4] = recolor(Image.fromarray(fr), cfg["rules"], realm, cache)
                    row.append(decorate(fr, sect, realm, d, 0)[20:, 20:CW - 20])
                rows.append(np.concatenate(row, 1))
        sheet = np.concatenate(rows, 0)
        im = Image.new("RGBA", (sheet.shape[1], sheet.shape[0]), (62, 123, 58, 255))
        im.alpha_composite(Image.fromarray(sheet))
        im.save(os.path.join(out, "hero_sects.png"))
        print("preview ok")
        return
    for sect in SECTS:
        for realm in range(6):
            print("built", build(src, sect, realm), flush=True)


if __name__ == "__main__":
    main()
