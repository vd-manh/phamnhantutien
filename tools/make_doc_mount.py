"""Vật cưỡi Độc Tu: độc xà 5 hướng bay (ảnh Gemini) -> assets/weapons/doc_ran_<hướng>.png + weapons.json.

Nguồn (thư mục doc/):
  doc_ran_s.png  rắn bay về phía người xem (nhìn từ trên chéo xuống, đầu ở dưới)
  doc_ran_n.png  rắn bay ra xa (đầu ở trên)
  doc_ran.png    rắn nhìn ngang, đầu bên phải (hướng đông)
  Hai hướng chéo: xoay ảnh s / n một góc (ảnh nhìn từ trên xuống nên xoay vẫn tự nhiên).
Mỗi ảnh ghi "stand" = điểm đứng trên lưng rắn (toạ độ ảnh), game đặt điểm này ngay dưới bàn chân nhân vật.
Chạy: python -I tools/make_doc_mount.py [--preview <thư mục>]
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "doc")
OUT = os.path.join(ROOT, "assets", "weapons")
H_VERT = 150        # chiều cao ảnh ra (px) cho rắn dọc (s, n); rắn ngang rộng 200
N_W = 130           # rắn bay ra xa uốn rộng: giới hạn bề ngang


def cutout(path):
    """Tách nền trắng, giữ mảng lớn nhất (bỏ vụn của hình bên cạnh), cắt sát."""
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    a[:, :3] = 255; a[:, -3:] = 255; a[:3] = 255; a[-3:] = 255
    near = (a.min(2) > 226).astype(np.uint8)
    n, lab = cv2.connectedComponents(near)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    bg = np.isin(lab, [e for e in edge if near[lab == e].any()])
    fg = (~bg).astype(np.uint8)
    n2, lab2, st, _ = cv2.connectedComponentsWithStats(fg, 8)
    k = 1 + int(np.argmax(st[1:, 4]))
    keep = lab2 == k
    ys, xs = np.where(keep)
    rgba = np.dstack([a, np.where(keep, 255, 0)]).astype(np.uint8)
    return Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")


def stand_point(im):
    """Điểm đứng = điểm trên thân rắn gần tâm khối nhất, đẩy vào giữa bề dày thân (khoảng cách tới mép lớn nhất quanh đó)."""
    a = np.array(im)[..., 3] > 0
    ys, xs = np.where(a)
    cx, cy = xs.mean(), ys.mean()
    dist = cv2.distanceTransform(a.astype(np.uint8), cv2.DIST_L2, 5)
    thick = dist > dist.max() * 0.55                     # lõi thân (bỏ đuôi mảnh, sừng)
    ty, tx = np.where(thick)
    k = int(np.argmin((tx - cx) ** 2 + (ty - cy) ** 2))
    return [round(float(tx[k]), 1), round(float(ty[k]), 1)]


def fit(im, h=None, w=None):
    k = (h / im.height) if h else (w / im.width)
    out = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    arr = np.array(out); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
    return Image.fromarray(arr)


def rotated(im, deg):
    big = Image.new("RGBA", (im.width * 2, im.height * 2), (0, 0, 0, 0))
    big.paste(im, (im.width // 2, im.height // 2))
    r = big.rotate(deg, resample=Image.BICUBIC, expand=False)
    bb = r.getbbox()
    return r.crop(bb)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    s = fit(cutout(os.path.join(SRC, "doc_ran_s.png")), h=H_VERT)
    n = fit(cutout(os.path.join(SRC, "doc_ran_n.png")), w=N_W)
    e = fit(cutout(os.path.join(SRC, "doc_ran.png")), w=200)
    imgs = {
        "south": s,
        "south-east": rotated(s, 38),       # đầu (ở dưới) xoay về góc dưới phải
        "east": e,
        "north-east": rotated(n, -38),      # đầu (ở trên) xoay về góc trên phải
        "north": n,
    }
    p = os.path.join(OUT, "weapons.json")
    d = json.load(open(p, encoding="utf8"))
    for k, im in imgs.items():
        name = f"doc_ran_{k}"
        im.save(os.path.join(OUT, name + ".png"))
        stand = stand_point(im) if k != "east" else [round(im.width * 0.47, 1), round(im.height * 0.6, 1)]
        d["weapons"][name] = {"name": "Song Giác Độc Xà", "img": name + ".png", "grip": [0, 0], "tip": [im.width, 0],
                              "stand": stand, "source": "tools/make_doc_mount.py (doc/doc_ran_*.png, Gemini)"}
        print(name, im.size, "stand", stand)
    json.dump(d, open(p, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    if "--preview" in sys.argv:
        pv = sys.argv[sys.argv.index("--preview") + 1]
        W = sum(im.width for im in imgs.values()) + 60
        H = max(im.height for im in imgs.values())
        sheet = Image.new("RGBA", (W, H), (62, 123, 58, 255)); x = 0
        from PIL import ImageDraw
        for k, im in imgs.items():
            sheet.alpha_composite(im, (x, 0))
            sp = d["weapons"][f"doc_ran_{k}"]["stand"]
            ImageDraw.Draw(sheet).ellipse((x + sp[0] - 4, sp[1] - 4, x + sp[0] + 4, sp[1] + 4), outline=(255, 0, 0), width=2)
            x += im.width + 12
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(os.path.join(pv, "doc_mount.png"))


if __name__ == "__main__":
    main()
