"""Cắt bảng xoay 5 tư thế (thẳng, chéo trước, ngang, chéo sau, sau lưng) thành ảnh mẫu từng hướng + bản khổ rộng 3:1.

Chạy: python -I tools/cut_turnaround.py <ảnh bảng xoay> <tiền tố> [--suffix _nb]
  vd:  python -I tools/cut_turnaround.py doc/doc_turnaround.png doc/doc
  ->   doc/doc_{s,se,e,ne,n}_ref.png và doc/doc_{...}_ref_wide.png
Đường cắt uốn lượn theo khe trắng giữa các hình (tay chìa ra không bị cắt dính hình bên cạnh).
Tự xoá dấu sao Gemini ở góc dưới phải.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_sheet  # noqa: E402

NAMES = ["s", "se", "e", "ne", "n"]


def seam(fg, c, half=70):
    H, Wd = fg.shape
    lo, hi = max(0, int(c - half)), min(Wd, int(c + half))
    cost = fg[:, lo:hi].astype(float) * 100 + 1 + np.abs(np.arange(lo, hi) - c)[None, :] * 0.02
    D = cost.copy(); B = np.zeros(D.shape, int)
    for y in range(1, H):
        prev = D[y - 1]; l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        st = np.stack([l, prev, r]); k = st.argmin(0); D[y] += st.min(0); B[y] = k - 1
    x = int(D[-1].argmin()); path = [0] * H
    for y in range(H - 1, -1, -1):
        path[y] = x + lo
        if y > 0:
            x += B[y, x]
    return np.array(path)


def wide(out, path):
    HH = 724; WW = 3 * HH; cell = WW // 6
    k = min(HH * 0.86 / out.height, cell * 0.92 / out.width)
    r2 = out.resize((round(out.width * k), round(out.height * k)), Image.LANCZOS)
    wim = Image.new("RGB", (WW, HH), "white")
    wim.paste(r2, ((cell - r2.width) // 2, HH - int(HH * 0.05) - r2.height))
    wim.save(path)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    src, prefix = sys.argv[1], sys.argv[2]
    suf = sys.argv[sys.argv.index("--suffix") + 1] if "--suffix" in sys.argv else ""
    rgba = np.array(Image.open(src).convert("RGBA"))
    print("xoá dấu sao:", ai_sheet.remove_gemini_mark(rgba))
    a = rgba[..., :3].astype(int)
    H, Wd = a.shape[:2]
    fg = a.min(2) < 232
    xs = np.where(fg.any(0))[0]; x0, x1 = xs.min(), xs.max(); W = x1 - x0
    seams = [np.full(H, x0 - 1)] + [seam(fg, x0 + W * k / 5) for k in range(1, 5)] + [np.full(H, x1 + 1)]
    ys = np.where(fg.any(1))[0]; y0, y1 = ys.min(), ys.max()
    X = np.arange(Wd)[None, :]
    for i, n in enumerate(NAMES):
        keep = (X > seams[i][:, None]) & (X < seams[i + 1][:, None])
        b = a.copy(); b[~keep] = 255
        bx = np.where((fg & keep).any(0))[0]
        c = Image.fromarray(b.astype(np.uint8)).crop((bx.min() - 2, max(0, y0 - 20), bx.max() + 3, min(H, y1 + 20)))
        out = Image.new("RGB", (c.width + 60, c.height), "white"); out.paste(c, (30, 0))
        p = f"{prefix}_{n}_ref{suf}.png"
        out.save(p); wide(out, f"{prefix}_{n}_ref{suf}_wide.png")
        print(p, out.size)


if __name__ == "__main__":
    main()
