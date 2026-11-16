"""Hình chiêu Độc Tu: ngũ độc (rắn, rết, bọ cạp, cóc, nhện) cho chiêu Vạn Độc Trận.

Ưu tiên ảnh động: doc/ngudoc_anim_<tên>.png = một hàng 6 khung nhìn ngang mặt sang phải
(khung 1-4 bò, lặp; khung 5-6 cắn). Thiếu thì dùng ảnh tĩnh cắt từ doc/doc_ngudoc.png.
Ra: assets/fx/doc/ngudoc_<i>.png (sprite sheet 1 hàng, khung cỡ đều, chân thẳng hàng) + doc_fx.json
(mỗi con: key, img, w, h, frames). boot.js nạp qua doc_fx.json.
Chạy: python -I tools/make_doc_fx.py [--preview <thư mục>]
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fx", "doc")
NAMES = ["ran", "ret", "bocap", "coc", "nhen"]
H = 56          # chiều cao con vật (px) trong khung
# chiều dài thân khi bò (px) cho hàng động: rắn dài, hầm hố; nhện, cóc gọn hơn
BODY_W = {"ran": 110, "ret": 90, "bocap": 66, "coc": 64, "nhen": 72}


def clean(a):
    a = a.copy(); a[:, :4] = 255; a[:, -4:] = 255; a[:4] = 255; a[-4:] = 255
    near = (a.min(2) > 228).astype(np.uint8)
    n, lab = cv2.connectedComponents(near)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    bg = np.isin(lab, [e for e in edge if near[lab == e].any()])
    # vùng trắng kín bên trong (vd. lòng đuôi bọ cạp cong) mà lớn thì cũng là nền; nanh trắng nhỏ thì giữ
    _, lab2, st, _ = cv2.connectedComponentsWithStats(near, 8)
    for j in range(1, st.shape[0]):
        if st[j, 4] > 900:
            bg |= lab2 == j
    return ~bg


def split_cols(fg, n):
    col = fg.sum(0).astype(float)
    xs = np.where(col > 0)[0]; x0, x1 = xs.min(), xs.max()
    cuts = [x0]
    for k in range(1, n):
        c = x0 + (x1 - x0) * k / n; half = (x1 - x0) / n * 0.45
        lo, hi = int(c - half), int(c + half)
        cuts.append(lo + int(np.argmin(col[lo:hi])))
    return cuts + [x1 + 1]


def cut(a, fg, x0, x1):
    m = fg.copy(); m[:, :x0] = False; m[:, x1:] = False
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    if n <= 1:
        return None
    keep = np.zeros_like(m)
    big = st[1:, 4].max()
    for j in range(1, n):
        if st[j, 4] >= big * 0.04:
            keep |= lab == j
    ys, xs = np.where(keep)
    return np.dstack([a, np.where(keep, 255, 0)]).astype(np.uint8)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def frames_of(i, name, still):
    p = os.path.join(ROOT, "doc", f"ngudoc_anim_{name}.png")
    if os.path.exists(p):
        a = np.array(Image.open(p).convert("RGB")).astype(int)
        fg = clean(a)
        c = split_cols(fg, 6)
        fr = [cut(a, fg, c[k], c[k + 1]) for k in range(6)]
        fr = [f for f in fr if f is not None]
        if len(fr) == 6:
            return fr
    return [still[i]]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(OUT, exist_ok=True)
    a = np.array(Image.open(os.path.join(ROOT, "doc", "doc_ngudoc.png")).convert("RGB")).astype(int)
    fg = clean(a)
    c = split_cols(fg, 5)
    still = [cut(a, fg, c[k], c[k + 1]) for k in range(5)]
    meta = {"note": "Ngũ độc cho chiêu Vạn Độc Trận (src/skill_van_doc.js). Tạo bằng tools/make_doc_fx.py", "ngudoc": []}
    sheets = []
    for i, name in enumerate(NAMES):
        fr = frames_of(i, name, still)
        # cùng tỉ lệ cho cả hàng. Hàng động: theo chiều DÀI thân khi bò (khung 1-4), vì khung ngóc đầu cao vọt
        # làm con vật bị thu bé lại; ảnh tĩnh: theo chiều cao
        if len(fr) == 6:
            k = BODY_W[name] / float(np.median([f.shape[1] for f in fr[:4]]))
        else:
            k = H / max(f.shape[0] for f in fr)
        ims = []
        for f in fr:
            im = Image.fromarray(f, "RGBA")
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            arr = np.array(im); arr[..., 3] = np.where(arr[..., 3] > 100, 255, 0)
            ims.append(Image.fromarray(arr))
        W = max(im.width for im in ims) + 4
        HH = max(im.height for im in ims) + 4
        sheet = Image.new("RGBA", (W * len(ims), HH), (0, 0, 0, 0))
        for j, im in enumerate(ims):
            sheet.alpha_composite(im, (j * W + (W - im.width) // 2, HH - 2 - im.height))   # chân thẳng hàng đáy
        key = f"ngudoc_{i}"
        sheet.save(os.path.join(OUT, key + ".png"))
        meta["ngudoc"].append({"key": key, "img": "doc/" + key + ".png", "w": W, "h": HH, "frames": len(ims), "name": name})
        sheets.append(sheet)
        print(key, name, "khung", len(ims), "cỡ", W, "x", HH)
    json.dump(meta, open(os.path.join(OUT, "doc_fx.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    if "--preview" in sys.argv:
        pv = sys.argv[sys.argv.index("--preview") + 1]
        Wt = max(s.width for s in sheets); Ht = sum(s.height for s in sheets)
        out = Image.new("RGBA", (Wt, Ht), (62, 123, 58, 255)); y = 0
        for s in sheets:
            out.alpha_composite(s, (0, y)); y += s.height
        out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(os.path.join(pv, "ngudoc.png"))


if __name__ == "__main__":
    main()
