"""Tách 6 khung của ảnh 1 hàng (nền trắng) theo cột trống, lưu từng khung + mặt nạ ứng viên lưỡi kiếm."""
import sys, os
import numpy as np
from PIL import Image
import cv2

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
ink = (im.min(axis=2) < 232)
col = ink.sum(axis=0) > 0
# các đoạn cột có mực
segs, x = [], 0
W = im.shape[1]
while x < W:
    if col[x]:
        s = x
        while x < W and col[x]:
            x += 1
        segs.append((s, x))
    x += 1
# gộp đoạn gần nhau (vệt chém rời rạc)
merged = []
for s, e in segs:
    if merged and s - merged[-1][1] < 25:
        merged[-1] = (merged[-1][0], e)
    else:
        merged.append((s, e))
merged = [m for m in merged if m[1] - m[0] > 40]
if len(merged) != 6:
    cw = W / 6
    merged = [(int(i * cw) + 10, int((i + 1) * cw) - 10) for i in range(6)]
print("frames:", merged)

hsv = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(int)
for i, (s, e) in enumerate(merged):
    s, e = max(0, s - 60), min(W, e + 60)          # rộng hơn ô: mũi kiếm có thể lấn sang ô bên
    fr = im[:, s:e].astype(np.uint8)
    Image.fromarray(fr).save(f"{out}/f{i}.png")
    h = hsv[:, s:e]
    sat, val = h[..., 1], h[..., 2]
    cand = (sat < 70) & (val > 150) & (val < 245)
    dbg = fr.copy()
    dbg[cand] = (255, 0, 0)
    Image.fromarray(dbg).save(f"{out}/c{i}.png")
