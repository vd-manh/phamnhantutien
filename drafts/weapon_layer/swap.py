"""Thử nghiệm B: xoá kiếm cũ trong từng khung, vẽ vũ khí mới đúng góc, đặt lại bàn tay lên trên.
python swap.py <thư mục khung f0..f5> <ra.png> [tỉ lệ dài]"""
import sys, os
import numpy as np
from PIL import Image
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detect import detect, hand_mask

U = 4  # 1 điểm ảnh pixel-art = 4 px ảnh nguồn

OUT = (40, 18, 22)
def weapon_test():
    """Kiếm thử: bản rộng đỏ, mũi vát, vệ vàng. Vẽ nằm ngang, mũi sang phải.
    Trả ảnh RGBA (đã phóng U lần) và điểm tay cầm (x, y) và vị trí vệ kiếm (x)."""
    Lh, Lg, Lb, Wb = 7, 2, 30, 6          # chuôi, vệ, lưỡi, bề rộng lưỡi (đơn vị pixel-art)
    w, h = Lh + Lg + Lb + 2, 13
    a = np.zeros((h, w, 4), np.uint8)
    cy = h // 2
    def px(x, y, c):
        if 0 <= x < w and 0 <= y < h:
            a[y, x] = (*c, 255)
    # chuôi
    for x in range(0, Lh):
        for y in (cy - 1, cy, cy + 1):
            px(x, y, (70, 40, 30) if (x + y) % 2 else (95, 55, 40))
        px(x, cy - 2, OUT); px(x, cy + 2, OUT)
    px(0, cy - 1, OUT); px(0, cy, (230, 180, 60)); px(0, cy + 1, OUT)
    # vệ kiếm vàng, cao
    gx = Lh
    for x in range(gx, gx + Lg):
        for y in range(cy - 5, cy + 6):
            px(x, y, (250, 205, 80) if y < cy else (205, 150, 40))
    for y in range(cy - 6, cy + 7):
        px(gx - 1, y, OUT); px(gx + Lg, y, OUT)
    for x in range(gx - 1, gx + Lg + 1):
        px(x, cy - 6, OUT); px(x, cy + 6, OUT)
    # lưỡi bản rộng, mũi vát chéo
    bx = gx + Lg + 1
    for i in range(Lb):
        x = bx + i
        top = cy - Wb // 2
        bot = cy + Wb // 2
        taper = i - (Lb - 7)
        if taper > 0:
            top += taper            # vát mép trên tạo mũi xéo
        if top > bot:
            break
        for y in range(top, bot + 1):
            if y == top:
                c = (255, 225, 210)          # mép sáng
            elif y == cy:
                c = (150, 20, 30)            # gân giữa
            elif y < cy:
                c = (225, 60, 55)
            else:
                c = (185, 35, 40)
            px(x, y, c)
        px(x, top - 1, OUT); px(x, bot + 1, OUT)
    # đóng mũi
    for y in range(cy - Wb // 2 - 1, cy + Wb // 2 + 2):
        if a[y, :, 3].any():
            last = np.where(a[y, :, 3])[0].max()
            px(last + 1, y, OUT)
    big = cv2.resize(a, (w * U, h * U), interpolation=cv2.INTER_NEAREST)
    grip = ((Lh * 0.55) * U, (cy + 0.5) * U)
    guard_x = (gx + Lg + 1) * U
    return big, grip, guard_x, Lb * U


def place(canvas, spr, grip, guard_x, p_grip, d, scale):
    """Xoay sprite theo hướng d, đặt điểm tay cầm vào p_grip, phủ lên canvas (RGB)."""
    s = cv2.resize(spr, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    g = (grip[0] * scale, grip[1] * scale)
    ang = np.degrees(np.arctan2(d[1], d[0]))
    M = cv2.getRotationMatrix2D(g, -ang, 1.0)
    M[0, 2] += p_grip[0] - g[0]
    M[1, 2] += p_grip[1] - g[1]
    H, W = canvas.shape[:2]
    r = cv2.warpAffine(s, M, (W, H), flags=cv2.INTER_NEAREST, borderValue=(0, 0, 0, 0))
    al = r[..., 3:4] / 255.0
    return (canvas * (1 - al) + r[..., :3] * al).astype(np.uint8), r[..., 3] > 0


def swap(fr, wpn, len_scale):
    r = detect(fr, cx=fr.shape[1] / 2)
    if r is None:
        return fr, None
    spr, grip, guard_x, blade_len = wpn
    # 1. xoá kiếm cũ
    m = cv2.dilate(r["mask"].astype(np.uint8), np.ones((3, 3), np.uint8))
    clean = cv2.inpaint(fr, m, 5, cv2.INPAINT_TELEA)
    # chỗ quanh nó gần như toàn nền trắng -> trả về trắng hẳn
    white = cv2.blur((fr.min(axis=2) > 235).astype(np.float32), (25, 25)) > 0.55
    clean[(m > 0) & white] = (255, 255, 255)
    # 2. đặt vũ khí mới: vệ kiếm trùng vệ cũ (base), lưỡi dài = len_scale * lưỡi cũ
    scale = (r["length"] * len_scale) / blade_len
    d = r["dir"]
    # điểm tay cầm trên trục = hình chiếu bàn tay lên trục kiếm
    p0 = r["base"]
    tg = (r["grip"] - p0) @ d
    p_grip = p0 + d * min(tg, -2)
    out, wmask = place(clean, spr, grip, guard_x, p_grip, d, scale)
    # 3. đặt lại bàn tay (da + viền) lên trên chuôi
    hm = hand_mask(fr)
    near = np.zeros_like(hm)
    gx, gy = int(r["grip"][0]), int(r["grip"][1])
    near[max(0, gy - 40):gy + 40, max(0, gx - 40):gx + 40] = True
    hand = hm & near
    n, lab = cv2.connectedComponents(hand.astype(np.uint8))
    if n > 1:
        k = lab[gy, gx] if lab[gy, gx] else np.bincount(lab[hand]).argmax()
        hand = lab == k
        ring = cv2.dilate(hand.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
        dark = fr.max(axis=2) < 110
        keep = hand | (ring & dark & ~r["mask"])
        out[keep] = fr[keep]
    return out, r


def main():
    d, dst = sys.argv[1], sys.argv[2]
    ls = float(sys.argv[3]) if len(sys.argv) > 3 else 1.25
    wpn = weapon_test()
    Image.fromarray(wpn[0]).save(os.path.join(os.path.dirname(dst), "weapon_test.png"))
    rows_o, rows_n = [], []
    for i in range(6):
        fr = np.asarray(Image.open(f"{d}/f{i}.png").convert("RGB")).copy()
        o, r = swap(fr, wpn, ls)
        c = slice(40, fr.shape[1] - 40)
        ys = np.where((fr.min(axis=2) < 200).any(axis=1))[0]
        if i == 0:
            y0, y1 = max(0, ys.min() - 20), min(fr.shape[0], ys.max() + 20)
        rows_o.append(fr[y0:y1, c]); rows_n.append(o[y0:y1, c])
        print(i, "ok" if r is not None else "NOT FOUND")
    img = np.concatenate([np.concatenate(rows_o, 1), np.concatenate(rows_n, 1)], 0)
    Image.fromarray(img).save(dst)


if __name__ == "__main__":
    main()
