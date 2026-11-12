"""Chuyển sprite sheet của pixelfx (github.com/patch-gg/pixelfx, MIT) sang định dạng hiệu ứng gọn của game (tt:1),
có thể đổi màu (đặt lại sắc độ, giữ độ sáng) để hợp chiêu thức.

Chạy:
  python tools/pack_pixelfx.py <thư_mục_sheets> <id> <tên_trong_game> [--hue 140] [--sat 1.0] [--speed 1] [--max-fps 30]
ví dụ:
  python tools/pack_pixelfx.py .../pixelfx/sheets arcane/rune-circle px_rune_circle_g --hue 140

Kết quả: assets/fx/<tên>/<tên>.png + .json và cập nhật assets/fx/manifest.json.
"""
import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_SIDE = 4096


def rgb2hsl(a):
    a = a / 255.0
    mx, mn = a.max(-1), a.min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d == 0, 0, d / np.where(l > 0.5, 2 - mx - mn, mx + mn + 1e-9))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / (d + 1e-9)) % 6, np.where(mx == g, (b - r) / (d + 1e-9) + 2, (r - g) / (d + 1e-9) + 4)) * 60
    return np.where(d == 0, 0, h), s, l


def hsl2rgb(h, s, l):
    c = (1 - np.abs(2 * l - 1)) * s
    x = c * (1 - np.abs((h / 60) % 2 - 1))
    m = l - c / 2
    z = np.zeros_like(h)
    i = (h // 60).astype(int) % 6
    r = np.choose(i, [c, x, z, z, x, c]); g = np.choose(i, [x, c, c, x, z, z]); b = np.choose(i, [z, z, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1) * 255


def recolor(img, hue, sat_mul):
    a = np.array(img).astype(float)
    h, s, l = rgb2hsl(a[..., :3])
    colored = (s > 0.12) & (a[..., 3] > 0)                    # giữ trắng / xám (lõi sáng, khói)
    rgb = hsl2rgb(np.full_like(h, hue), np.clip(s * sat_mul, 0, 1), l)
    a[..., :3] = np.where(colored[..., None], rgb, a[..., :3])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("sheets")
    ap.add_argument("id")
    ap.add_argument("name")
    ap.add_argument("--hue", type=float)
    ap.add_argument("--sat", type=float, default=1.0)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--max-fps", type=float, default=30)
    a = ap.parse_args()

    meta = json.load(open(os.path.join(a.sheets, a.id + ".json"), encoding="utf8"))
    src = Image.open(os.path.join(a.sheets, a.id + ".png")).convert("RGBA")
    px = meta["meta"]["pixelfx"]
    fw0, fh0 = px["frameSize"]
    frames = []
    for f in meta["frames"]:
        r = f["frame"]
        im = src.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
        if a.hue is not None:
            im = recolor(im, a.hue, a.sat)
        frames.append(im)
    fps0 = px["fps"]

    box = None
    for f in frames:
        bb = f.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if bb:
            box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = max(0, x0 - 2), max(0, y0 - 2), min(fw0, x1 + 2), min(fh0, y1 + 2)
    fw, fh = x1 - x0, y1 - y0

    step = max(1, math.ceil(fps0 / a.max_fps))
    while True:
        keep = frames[::step]
        n = len(keep)
        cols = max(1, min(n, MAX_SIDE // fw))
        rows = math.ceil(n / cols)
        if rows * fh <= MAX_SIDE:
            break
        step += 1
    sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(keep):
        sheet.paste(f.crop((x0, y0, x1, y1)), ((i % cols) * fw, (i // cols) * fh))

    dest = os.path.join(ROOT, "assets", "fx", a.name)
    os.makedirs(dest, exist_ok=True)
    sheet.save(os.path.join(dest, a.name + ".png"), optimize=True)
    pv = px["pivot"]
    out = {
        "tt": 1, "name": a.name, "w": fw, "h": fh, "frames": n, "columns": cols,
        "fps": round(fps0 / step, 3), "speed": a.speed, "loop": bool(px.get("loop")),
        "pivot": [round(pv[0] - x0, 1), round(pv[1] - y0, 1)], "target": None,
        "states": {}, "hits": [], "duration": round(len(frames) / fps0, 3),
        "source": "pixelfx " + a.id + " (MIT, github.com/patch-gg/pixelfx)" + (f", đổi màu hue {a.hue}" if a.hue is not None else ""),
    }
    json.dump(out, open(os.path.join(dest, a.name + ".json"), "w", encoding="utf8"), indent=1, ensure_ascii=False)

    man_path = os.path.join(ROOT, "assets", "fx", "manifest.json")
    man = json.load(open(man_path, encoding="utf8")) if os.path.exists(man_path) else {"effects": {}}
    man.setdefault("effects", {})[a.name] = {"sheet": a.name + "/" + a.name + ".png", "json": a.name + "/" + a.name + ".json", "w": fw, "h": fh}
    json.dump(man, open(man_path, "w", encoding="utf8"), indent=2, ensure_ascii=False)
    print(f"{a.name}: {len(frames)} -> {n} frame {fw}x{fh} @ {out['fps']} fps, lưới {cols}x{rows}, pivot {out['pivot']}")


if __name__ == "__main__":
    main()
