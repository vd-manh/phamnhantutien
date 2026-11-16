"""Tạo hình cho chiêu Giang Sơn Lưỡng Nghi Đồ (Đạo Gia), tông thuỷ mặc trắng đen.

- gs_cloud: mây xoáy lấy từ hiệu ứng Vạn Kiếm Quy Tông (assets/fx/van_kiem_quy_tong_v5, khung 23-37), đổi sang màu mực.
- gs_dragon: kim long lấy từ Phi Long Tại Thiên (assets/fx/phi_long_tai_thien), bỏ hình người thi pháp, đổi sang màu mực.
- gs_mountain: núi thuỷ mặc vẽ bằng numpy (ba lớp núi loang mực, vân núi, sương chân núi).
Kết quả: assets/fx/giang_son/*.png + giang_son.json (cỡ khung, số khung).
Chạy: python -I tools/make_giang_son_fx.py [--preview <thư mục>]
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX = os.path.join(ROOT, "assets", "fx")
OUT = os.path.join(FX, "giang_son")
INK = np.array([17, 17, 17], float)
PAPER = np.array([244, 241, 234], float)


def frames_of(name):
    m = json.load(open(os.path.join(FX, name, name + ".json")))
    im = np.array(Image.open(os.path.join(FX, name, name + ".png")).convert("RGBA"))
    W, H, c = m["w"], m["h"], m["columns"]
    return [im[(f // c) * H:(f // c + 1) * H, (f % c) * W:(f % c + 1) * W] for f in range(m["frames"])]


def to_ink(rgba, lo=0.18, hi=0.78, gamma=1.0):
    """Đổi màu sang thuỷ mặc: độ sáng thấp -> mực đen, cao -> giấy trắng, giữa -> xám loang. Giữ alpha."""
    rgb = rgba[..., :3].astype(float) / 255
    L = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])
    t = np.clip((L - lo) / (hi - lo), 0, 1) ** gamma
    out = INK[None, None] * (1 - t[..., None]) + PAPER[None, None] * t[..., None]
    return np.dstack([out, rgba[..., 3]]).astype(np.uint8)


def bbox_union(frames, thr=40):
    ys, xs = [], []
    for f in frames:
        yy, xx = np.where(f[..., 3] > thr)
        if len(yy):
            ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def strip(frames):
    h, w = frames[0].shape[:2]
    s = np.zeros((h, w * len(frames), 4), np.uint8)
    for i, f in enumerate(frames):
        s[:, i * w:(i + 1) * w] = f
    return s


# ---------------- mây
def make_cloud():
    fr = frames_of("van_kiem_quy_tong_v5")[23:38]
    fr = [f[:100] for f in fr]                       # chỉ dải mây phía trên (kiếm ở dưới)
    x0, y0, x1, y1 = bbox_union(fr, 60)
    fr = [f[y0:y1, x0:x1].copy() for f in fr]
    out = []
    for f in fr:
        a = f[..., 3].astype(float)
        a[a < 60] = 0                                # bỏ quầng sáng mờ
        f[..., 3] = a.astype(np.uint8)
        g = to_ink(f, lo=0.12, hi=0.62, gamma=0.8)
        # viền mực quanh mây cho nổi trên nền cỏ
        m = (g[..., 3] > 0).astype(np.uint8)
        edge = cv2.dilate(m, np.ones((3, 3), np.uint8)) - m
        g[edge > 0] = [17, 17, 17, 255]
        out.append(g)
    return out


# ---------------- rồng
def make_dragon():
    allf = frames_of("phi_long_tai_thien")
    idx = [36, 37, 38, 39]
    res = []
    for i in idx:
        f = allf[i].copy()
        a = f[..., 3]
        m = (a > 70).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        if n <= 1:
            continue
        k = 1 + int(np.argmax(st[1:, 4]))           # mảng lớn nhất là con rồng; người thi pháp là mảng tách rời
        keep = cv2.dilate((lab == k).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        f[~keep] = 0
        f[..., 3] = np.where(f[..., 3] < 70, 0, f[..., 3])
        res.append(f)
    x0, y0, x1, y1 = bbox_union(res, 70)
    out = []
    for f in res:
        f = f[y0 - 2:y1 + 2, x0 - 2:x1 + 2]
        g = to_ink(f, lo=0.62, hi=0.97, gamma=2.2)       # thân vàng -> mực đen, chỗ sáng nhất -> trắng
        m = (g[..., 3] > 0).astype(np.uint8)
        edge = cv2.dilate(m, np.ones((3, 3), np.uint8)) - m
        g[edge > 0] = [244, 241, 234, 220]            # viền trắng mỏng: rồng mực nổi trên nền tối
        out.append(g)
    return out


# ---------------- rồng tách đốt: đầu + một lát thân (game nối nhiều lát theo đường bay cho thân uốn lượn)
HEAD_BOX = (86, 6, 130, 76)        # trên khung 2 của gs_dragon: đầu nhìn chéo xuống phải, cổ ở mép trái
BODY_BOX = (56, 24, 68, 56)        # trên khung 3: đoạn thân nằm ngang, gai lưng hướng lên


def make_dragon_parts(dr):
    head = dr[1][HEAD_BOX[1]:HEAD_BOX[3], HEAD_BOX[0]:HEAD_BOX[2]].copy()
    body = dr[2][BODY_BOX[1]:BODY_BOX[3], BODY_BOX[0]:BODY_BOX[2]].copy()
    return [head], [body]


# ---------------- núi thuỷ mặc
def make_mountain(W=150, H=128, seed=7):
    rng = np.random.default_rng(seed)
    xs = np.arange(W)

    def noise1d(n, scale):
        k = rng.normal(0, 1, n // scale + 3)
        return np.interp(np.arange(n) / scale, np.arange(len(k)), k)

    def ridge(peaks, rough):
        h = np.zeros(W)
        for (c, hh, wd) in peaks:
            h = np.maximum(h, hh * np.exp(-np.abs(xs - c) / wd * (1.0 if xs.mean() else 1)) ** 0.9)   # đỉnh nhọn
        return h + noise1d(W, 6) * rough + noise1d(W, 2) * rough * 0.35

    canvas = np.zeros((H, W, 4), float)
    yy = np.arange(H)[:, None]
    layers = [  # (đỉnh: tâm, cao, độ dốc), độ gồ ghề, đậm nhất, nền (px từ đáy)
        ([(36, 70, 40), (118, 78, 42)], 1.6, 0.32, 24),
        ([(22, 62, 30), (98, 94, 36)], 2.0, 0.58, 12),
        ([(62, 116, 34), (120, 64, 26)], 2.4, 0.95, 3),
    ]
    for li, (peaks, rough, dark, base) in enumerate(layers):
        top = H - base - ridge(peaks, rough)
        d = yy - top[None, :]                                      # px dưới sống núi
        inside = d >= 0
        # loang mực: đậm sát sống núi, nhạt dần xuống chân (thuỷ mặc), có vệt khô ngang
        wash = np.exp(-np.clip(d, 0, None) / (14 + 6 * li)) * 0.75 + 0.25 * np.exp(-np.clip(d, 0, None) / 60)
        dry = 0.85 + 0.15 * np.sin(yy * 0.9 + np.arange(W)[None, :] * 0.13 + rng.uniform(0, 6)) * (rng.random((H, W)) > 0.4)
        ink = np.clip(wash * dry * dark, 0, 1)
        # vân núi: nét chéo đậm dọc sườn
        for _ in range(26 + li * 10):
            cx = rng.integers(8, W - 8)
            cy = int(top[cx] + rng.integers(3, 30))
            ln = rng.integers(4, 10)
            for t in range(ln):
                x, y = cx - t // 2, cy + t
                if 0 <= x < W and 0 <= y < H and inside[y, x]:
                    ink[y, x] = min(1, ink[y, x] + 0.35 * dark)
        a = np.where(inside, 0.75 + 0.12 * li, 0)
        col = PAPER[None, None] * (1 - ink[..., None]) + INK[None, None] * ink[..., None]
        # sống núi: viền mực đậm, phía sáng có vệt trắng
        edge = inside & ~np.vstack([inside[1:], np.zeros((1, W), bool)]) | (inside & (np.abs(d) < 1.5))
        col[edge] = INK; a[edge] = 1
        # phủ lớp
        A = a[..., None]
        canvas[..., :3] = canvas[..., :3] * (1 - A) + col * A
        canvas[..., 3] = canvas[..., 3] * (1 - a) + a
    # sương trắng ở chân núi và một dải sương ngang lưng núi
    mist = np.clip((yy - (H - 34)) / 30, 0, 1) ** 1.3
    band = np.exp(-((yy - (H - 58)) / 5) ** 2) * 0.55 * (0.6 + 0.4 * np.sin(np.arange(W)[None, :] / 9))
    m = np.clip(mist + band, 0, 1) * (canvas[..., 3] > 0)
    canvas[..., :3] = canvas[..., :3] * (1 - m[..., None]) + PAPER[None, None] * m[..., None]
    canvas[..., 3] = np.clip(canvas[..., 3] * (1 - 0.7 * mist), 0, 1)
    return [np.dstack([canvas[..., :3], canvas[..., 3] * 255]).astype(np.uint8)]



# ---------------- bàn tay từ mây: tay áo trắng, hai ngón (trỏ + giữa) duỗi chúc xuống kẹp quân cờ đen (chiêu Nhất Lệnh)
def make_hand(H=112):
    """Bàn tay đặt cờ (ảnh Gemini dao/dao_hand.png): tách nền trắng, thu nhỏ, chuyển tông thuỷ mặc
    (da -> trắng ngà, bóng -> xám mực, viền giữ đen; viền vàng cổ tay giữ lại). Trả thêm meta: tâm quân cờ, bề rộng tay áo ở mép trên."""
    src = os.path.join(ROOT, "dao", "dao_hand.png")
    im = np.array(Image.open(src).convert("RGB")).astype(int)
    near = (im.min(2) > 236).astype(np.uint8)
    n, lab = cv2.connectedComponents(near)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    bg = np.isin(lab, [e for e in edge if near[lab == e].any()])
    fg = ~bg
    ys, xs = np.where(fg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([im, np.where(fg, 255, 0)]).astype(np.uint8)[y0:y1, x0:x1]
    k = H / rgba.shape[0]
    small = np.array(Image.fromarray(rgba, "RGBA").resize((max(1, round(rgba.shape[1] * k)), H), Image.LANCZOS))
    small[..., 3] = np.where(small[..., 3] > 110, 255, 0)
    rgb = small[..., :3].astype(float) / 255
    L = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    # giữ màu thật của ảnh (da hồng hào, áo ngà): người dùng chê bản đổi sang trắng đen là "trắng bệch"
    res = small.copy()
    # tâm quân cờ: mảng tối lớn nhất ở 1/4 dưới ảnh
    dark = (L < 0.25) & (small[..., 3] > 0)
    dark[: int(H * 0.72)] = False
    yy, xx = np.where(dark)
    stone = [round(float(xx.mean()), 1), round(float(yy.mean()), 1)]
    top = np.where(small[0, :, 3] > 0)[0]
    # màu tay áo (mép trên ảnh) để game vẽ phần tay áo nối lên mây cho khớp
    row = small[1:4, top.min() + 3:top.max() - 3][..., :3].reshape(-1, 3)
    light = row[row.mean(1) > 150]
    sc = light.mean(0) if len(light) else np.array([240, 234, 214])
    shade = sc * 0.82
    hexc = lambda c: int(c[0]) << 16 | int(c[1]) << 8 | int(c[2])
    meta = {"stone": stone, "sleeve": [int(top.min()), int(top.max())], "sleeveColor": hexc(sc), "sleeveShade": hexc(shade)}
    return [res], meta


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    dr = make_dragon()
    head, body = make_dragon_parts(dr)
    hand, hmeta = make_hand()
    for key, fn in (("gs_cloud", make_cloud), ("gs_dragon", lambda: dr), ("gs_dhead", lambda: head),
                    ("gs_dbody", lambda: body), ("gs_mountain", make_mountain), ("gs_hand", lambda: hand)):
        fr = fn()
        h, w = fr[0].shape[:2]
        Image.fromarray(strip(fr)).save(os.path.join(OUT, key + ".png"), optimize=True)
        meta[key] = {"img": "giang_son/" + key + ".png", "w": w, "h": h, "frames": len(fr)}
        if key == "gs_hand":
            meta[key].update(hmeta)
        print(key, w, "x", h, len(fr), "khung")
    meta["note"] = "Tạo bằng tools/make_giang_son_fx.py. Dùng trong src/skill_giang_son.js, src/skill_nhat_lenh.js"
    json.dump(meta, open(os.path.join(OUT, "giang_son.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    if "--preview" in sys.argv:
        pv = sys.argv[sys.argv.index("--preview") + 1]
        for key in ("gs_cloud", "gs_dragon", "gs_dhead", "gs_dbody", "gs_mountain", "gs_hand"):
            im = Image.open(os.path.join(OUT, key + ".png")).convert("RGBA")
            bg = Image.new("RGBA", im.size, (62, 123, 58, 255)); bg.alpha_composite(im)
            bg.resize((im.width * 2, im.height * 2), Image.NEAREST).save(os.path.join(pv, "pv_" + key + ".png"))


if __name__ == "__main__":
    main()
