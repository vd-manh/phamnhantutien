"""Dò lưỡi kiếm trong từng khung.
Xoay ảnh theo từng góc; ở mỗi góc tìm dải ngang dài nhất của "màu lưỡi kiếm" mà trên/dưới
(cách `side` px) không còn màu đó (vật mảnh). Dải dài nhất trên mọi góc = lưỡi kiếm.
Đầu nào gần bàn tay (vùng da dưới đầu) là chuôi."""
import numpy as np
import cv2


def hsv_of(fr):
    return cv2.cvtColor(fr, cv2.COLOR_RGB2HSV).astype(int)


def skin_mask(fr):
    h = hsv_of(fr)
    return (h[..., 0] >= 3) & (h[..., 0] <= 22) & (h[..., 1] > 40) & (h[..., 2] > 150)


def blade_color(fr):
    h = hsv_of(fr)
    return (h[..., 1] < 75) & (h[..., 2] > 130) & (h[..., 2] < 246)


def hand_mask(fr):
    sk = skin_mask(fr)
    ink = fr.min(axis=2) < 200
    ys = np.where(ink.any(axis=1))[0]
    head_y = int(ys.min() + 0.36 * (ys.max() - ys.min()))
    sk[:head_y] = False
    return sk


def _longest_run(row, gap):
    """Đoạn dài nhất các ô True, cho phép hở <= gap. Trả (độ dài, đầu, cuối)."""
    idx = np.where(row)[0]
    if len(idx) == 0:
        return 0, 0, 0
    br = np.where(np.diff(idx) > gap + 1)[0]
    starts = np.r_[idx[0], idx[br + 1]]
    ends = np.r_[idx[br], idx[-1]]
    k = np.argmax(ends - starts)
    return ends[k] - starts[k], starts[k], ends[k]


def detect(fr, cx=None, side=11, gap=3, min_len=55, step=1.5, xwin=170):
    H, W = fr.shape[:2]
    cand = blade_color(fr).astype(np.uint8)
    if cx is not None:
        cand[:, :max(0, int(cx - xwin))] = 0
        cand[:, int(cx + xwin):] = 0
    D = int(np.hypot(H, W)) + 4
    pad = np.zeros((D, D), np.uint8)
    oy, ox = (D - H) // 2, (D - W) // 2
    pad[oy:oy + H, ox:ox + W] = cand
    C = (D / 2, D / 2)
    best = None
    for a in np.arange(0, 180, step):
        M = cv2.getRotationMatrix2D(C, a, 1.0)
        r = cv2.warpAffine(pad, M, (D, D), flags=cv2.INTER_NEAREST).astype(bool)
        up = np.zeros_like(r); up[side:] = r[:-side]
        dn = np.zeros_like(r); dn[:-side] = r[side:]
        thin = r & ~up & ~dn
        rows = np.where(thin.sum(1) >= min_len * 0.6)[0]
        for y in rows:
            L, s, e = _longest_run(thin[y], gap)
            if L >= min_len and (best is None or L > best[0]):
                best = (L, a, y, s, e)
    if best is None:
        return None
    L, a, y, s, e = best
    Mi = cv2.invertAffineTransform(cv2.getRotationMatrix2D(C, a, 1.0))
    def back(x, yy):
        p = Mi @ np.array([x, yy, 1.0])
        return np.array([p[0] - ox, p[1] - oy])
    p0, p1 = back(s, y), back(e, y)
    d = (p1 - p0) / np.hypot(*(p1 - p0))
    nrm = np.array([-d[1], d[0]])
    # căn trục vào giữa bề rộng lưỡi
    cb = blade_color(fr)
    offs = [o for o in range(-9, 10) if
            np.mean([cb[int(round(q[1])), int(round(q[0]))] for q in
                     (p0 + (p1 - p0) * t + nrm * o for t in np.linspace(0.1, 0.9, 15))
                     if 0 <= q[0] < W and 0 <= q[1] < H]) > 0.6]
    if offs:
        mid = (min(offs) + max(offs)) / 2
        p0, p1 = p0 + nrm * mid, p1 + nrm * mid
        half = (max(offs) - min(offs)) / 2 + 1
    else:
        half = 5
    # kéo dài hai đầu theo trục khi còn màu lưỡi hoặc viền tối ngay trên trục (cho phép hở 6 px)
    dk = hsv_of(fr)[..., 2] < 120
    def extend(p, dd):
        last, k, miss = p, 0, 0
        while k < 200 and miss <= 6:
            q = last + dd * (miss + 1)
            hit = False
            for o in (0, -2, 2):
                x, y = int(round(q[0] + nrm[0] * o)), int(round(q[1] + nrm[1] * o))
                if 0 <= x < W and 0 <= y < H and (cb[y, x] or dk[y, x]):
                    hit = True
            if hit:
                last, miss = q, 0
            else:
                miss += 1
            k += 1
        return last
    p0, p1 = extend(p0, -d), extend(p1, d)
    # chuôi = đầu gần bàn tay
    hm = hand_mask(fr)
    ys, xs = np.where(hm)
    if len(xs):
        S = np.stack([xs, ys], 1)
        if np.min(np.hypot(*(S - p0).T)) > np.min(np.hypot(*(S - p1).T)):
            p0, p1 = p1, p0
            d = -d; nrm = -nrm
        gi = np.argmin(np.hypot(*(S - p0).T))
        grip = S[gi].astype(float)
    else:
        grip = p0
    Lb = float(np.hypot(*(p1 - p0)))
    # mặt nạ xoá: lưỡi + viền tối + vệ / chuôi xanh gần tay
    yy, xx = np.mgrid[0:H, 0:W]
    rel = np.stack([xx - p0[0], yy - p0[1]], -1)
    t = rel @ d
    dist = np.abs(rel @ nrm)
    h = hsv_of(fr)
    dark = h[..., 2] < 120
    hilt_blue = (h[..., 0] >= 95) & (h[..., 0] <= 125) & (h[..., 1] > 90)
    m_blade = (t >= -2) & (t <= Lb + 6) & (((dist <= half + 2) & cb) | ((dist <= half + 5) & dark & (t > 6)))
    m_hilt = (t >= -30) & (t < 10) & (dist <= half + 7) & (hilt_blue | dark | cb) & ~skin_mask(fr)
    return dict(mask=m_blade | m_hilt, base=p0, tip=p1, dir=d, half=half, grip=grip, length=Lb)
