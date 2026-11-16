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

import cv2
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


def one_row(path, row, name):
    """Nguồn ảnh 1 hàng 6 khung; cỡ đo theo khung đầu của chính nó (tư thế đứng)."""
    d = dict(path=path, rows=1, cols=6, names=[row])
    if row != "idle":                 # hàng "idle" tự đo theo cả hàng
        d["size_from"] = (name, row, 0)
    return d


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
        # lớp vũ khí tách rời: đánh dấu bằng tools/mark_weapon.py, ảnh vũ khí trong assets/weapons/
        weapon=dict(marks="sword/weapon_marks.json", default="thanh_phong",
                    # ngự kiếm: ảnh bay chỉ có kiếm nằm ngang (mũi sang phải). Hướng nam/bắc xoay kiếm theo
                    # trục dọc dưới chân: nam = mũi hướng về người xem (xuống), bắc = mũi hướng ra xa (lên).
                    # (góc°, hệ số thu ngắn phối cảnh, hệ số bề ngang, điểm trên kiếm đặt dưới bàn chân: 0 = đốc, 0.5 = giữa).
                    # Hướng nam mượn thân nhìn chéo nên lệch 10° theo mặt; nhân vật đứng giữa kiếm.
                    turn={"fly": {"south": (80, 0.75, 1.4, 0.5), "north": (-90, 0.75, 1.4, 0.2)}},
                    no_nominal={"fly"}),
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
            "back_dead": dict(path="sword/kiem_back_dead.png", rows=1, cols=6, names=["dead"],
                              size_from=("back_dead", "dead", 0)),
            # ảnh 1 hàng vẽ lại theo quy tắc "kiếm ở tay gần người xem" (docs/CAU_LENH_KIEM_TU.md)
            "se_idle": one_row("sword/kiem_se_idle.png", "idle", "se_idle"),
            "se_run": one_row("sword/kiem_se_run.png", "run", "se_run"),
            "se_attack": one_row("sword/kiem_se_attack.png", "attack", "se_attack"),
            "se_cast": one_row("sword/kiem_se_cast.png", "cast", "se_cast"),
            "se_hurt": one_row("sword/kiem_se_hurt.png", "hurt", "se_hurt"),
            "s_idle": one_row("sword/kiem_s_idle.png", "idle", "s_idle"),
            "s_run": one_row("sword/kiem_s_run.png", "run", "s_run"),
            "s_attack": one_row("sword/kiem_s_attack.png", "attack", "s_attack"),
            "s_cast": one_row("sword/kiem_s_cast.png", "cast", "s_cast"),
            "s_hurt": one_row("sword/kiem_s_hurt.png", "hurt", "s_hurt"),
            "s_dead": one_row("sword/kiem_s_dead.png", "dead", "s_dead"),
            "n_run": one_row("sword/kiem_n_run.png", "run", "n_run"),
            "n_attack": one_row("sword/kiem_n_attack.png", "attack", "n_attack"),
            "n_hurt": one_row("sword/kiem_n_hurt.png", "hurt", "n_hurt"),
            "back_cast": one_row("sword/kiem_back_cast.png", "cast", "back_cast"),
            "side_attack": one_row("sword/kiem_side_attack.png", "attack", "side_attack"),
            "side_cast": one_row("sword/kiem_e_cast.png", "cast", "side_cast"),   # thay kiem_side_cast (kiếm ở tay xa)
            "fly_ne": dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(6, 6, 506, 506), rows=3, cols=3, names=FLY_ROWS),
            "fly_se": dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(518, 6, 1018, 506), rows=3, cols=3, names=FLY_ROWS),
            "fly_e":  dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(6, 518, 506, 1018), rows=3, cols=3, names=FLY_ROWS),
            "fly_n":  dict(path="sword/Gemini_Generated_Image_y4hs*.png", box=(518, 518, 1018, 1018), rows=3, cols=3, names=FLY_ROWS),
        },
        # sheet 6x6 cũ chỉ còn dùng: "back" hàng đứng (sau lưng) và hàng chém / trúng đòn (thực ra góc chéo sau -> NE),
        # "front" hàng ngã (chéo trước), "side" hàng đứng / chạy (ngang)
        dirsets={
            "idl": mirror({"south-east": ("se_idle", False), "south": ("s_idle", False), "east": ("side", False),
                           "north-east": ("back", False), "north": ("back", False)}),
            "run": mirror({"south-east": ("se_run", False), "south": ("s_run", False), "east": ("side", False),
                           "north-east": ("n_run", False), "north": ("n_run", False)}),
            "atk": mirror({"south-east": ("se_attack", False), "south": ("s_attack", False), "east": ("side_attack", False),
                           "north-east": ("back", False), "north": ("n_attack", False)}),
            "cst": mirror({"south-east": ("se_cast", False), "south": ("s_cast", False), "east": ("side_cast", False),
                           "north-east": ("back_cast", False), "north": ("back_cast", False)}),
            "hurt": mirror({"south-east": ("se_hurt", False), "south": ("s_hurt", False), "east": ("side_hurt", False),
                            "north-east": ("back", False), "north": ("n_hurt", False)}),
            "dead": mirror({"south-east": ("front", False), "south": ("s_dead", False), "east": ("side_dead", False),
                            "north-east": ("back_dead", False), "north": ("back_dead", False)}),
            "fly": mirror({"south-east": ("fly_se", False), "south": ("fly_se", False), "east": ("fly_e", False),
                           "north-east": ("fly_ne", False), "north": ("fly_n", False)}),
        },
        anims={
            "idle":     ("idl", "idle", ALL6, 6, True, None, "frame"),
            "run":      ("run", "run", ALL6, 11, True, None, "frame"),
            "attack1":  ("atk", "attack", ALL6, 18, False, 2, "frame"),
            "attack2":  ("atk", "attack", [1, 2, 3, 4, 5], 18, False, 2, "frame"),
            "attack3":  ("atk", "attack", ALL6, 13, False, 3, "frame"),
            "cast":     ("cst", "cast", [0, 1], 6, False, 1, "frame"),          # 1 tay bắt ấn trước ngực, giữ tư thế
            "cast_point": ("cst", "cast", [2, 3, 4, 5], 10, False, None, "frame"),   # tay chỉ thẳng thi pháp, kiếm khí
            "hurt":     ("hurt", "hurt", [0, 1, 3], 12, False, None, "frame"),
            "dead":     ("dead", "dead", ALL6, 9, False, None, "row"),
            "fly_up":   ("fly", "up", [0, 1, 2], 8, False, None, "row"),
            "fly":      ("fly", "fly", [0, 1, 2], 6, True, None, "frame"),
            "fly_land": ("fly", "land", [0, 1, 2], 8, False, None, "row"),
        },
    ),
}

# Đạo Gia (docs/CAU_LENH_DAO_GIA.md): bộ động tác chung với Kiếm Tu. Hiện mới có hàng đứng 5 hướng;
# động tác nào chưa có ảnh thì tạm mượn hàng đứng (thêm nguồn vào DAO_ROWS khi có ảnh mới).
# khung hỏng -> khung thay (theo nguồn "<hướng>_<động tác>"): ne_attack khung 5 Gemini vẽ cả người mờ đi
DAO_FIX = {"front": {("idle", 0): ("idle", 1)}, "ne_attack": {("attack", 4): ("attack", 3)}, "n_attack": {("attack", 4): ("attack", 3)}}
# khung trúng riêng của Đạo Gia (chỉ số trong danh sách khung của động tác): đòn 1 bùng mực ở khung 4
DAO_CONTACT = {"attack1": 3}
# (động tác, hướng) lấy ảnh lật ngang: ảnh vẽ tay không cầm bút viết; nhìn thẳng / sau lưng gần đối xứng nên lật lại
# thì tay viết trùng tay cầm bút ở hàng đứng, chạy
DAO_FLIP = {("attack", "n"), ("cast", "n")}
DAO_DIRS = {"south-east": "se", "south": "s", "east": "e", "north-east": "ne", "north": "n"}
DAO_EXTRA = {}   # hàng mới có vài hướng: khai báo nguồn để đánh dấu bút, chưa đưa vào game
DAO_ROWS = {"idle": ["se", "s", "e", "ne", "n"], "run": ["se", "s", "e", "ne", "n"], "attack": ["se", "s", "e", "ne", "n"], "cast": ["se", "s", "e", "ne", "n"]}          # động tác -> các hướng đã có ảnh dao/dao_<hướng>_<động tác>.png


def _dao_set():
    src, dsets = {}, {}
    for row, dirs in list(DAO_ROWS.items()) + list(DAO_EXTRA.items()):
        for k in dirs:
            name = "front" if (row, k) == ("idle", "se") else f"{k}_{row}"   # "front" = nguồn chuẩn chiều cao
            src[name] = dict(one_row(f"dao/dao_{k}_{row}.png", row, name), unmark=True)   # ảnh Gemini có dấu sao
            if name in DAO_FIX:
                src[name]["fix"] = DAO_FIX[name]
    def pick(row):
        # đủ 5 hướng mới dùng hàng đó; thiếu hướng nào thì cả động tác tạm mượn hàng đứng
        full = all(k in DAO_ROWS.get(row, []) for k in DAO_DIRS.values())
        r = row if full else "idle"
        m = {d: ("front" if (r, k) == ("idle", "se") else f"{k}_{r}", (r, k) in DAO_FLIP) for d, k in DAO_DIRS.items()}
        return mirror(m), full
    anims = {}
    for name, (dset, row, idx, fps, loop, contact, mode) in SETS["kiem_ai"]["anims"].items():
        srow = {"atk": "attack", "cst": "cast"}.get(dset, row if dset != "fly" else "fly")
        m, full = pick(srow)
        key = "dao_" + srow
        dsets[key] = m
        r = srow if full else "idle"
        if not full:
            idx = [i for i in idx if i < 6][:len(idx)] or ALL6
            mode = "frame"
        anims[name] = (key, r, idx, fps, loop, contact if full else None, mode)
        if full and name in DAO_CONTACT:
            anims[name] = anims[name][:5] + (DAO_CONTACT[name],) + anims[name][6:]
    return dict(height=74, stand_px=82, sources=src, dirsets=dsets, anims=anims,
                weapon=dict(marks="dao/brush_marks.json", default="dao_but"))     # bút: tools/mark_dao_brush.py   # mũ đạo cao: 82 (Kiếm Tu ~76)


SETS["dao_ai"] = _dao_set()


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


def split_parts(strip, cols):
    """Ảnh 1 hàng: tách theo mảng liền nhau thay vì cắt thẳng đứng.
    Mảng dính với người của khung nào (kiếm trong tay) thuộc khung đó; mảng rời (vệt chém, tia sáng)
    thuộc khung có người gần nhất. Trả [(ô RGBA, x0 trong dải)]; None nếu không tách được an toàn."""
    full = remove_bg(strip)
    a = full[..., 3] > 0
    lab, n = ndimage.label(a, structure=np.ones((3, 3)))
    if n == 0:
        return None
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    k = len(cols) - 1
    body = []
    for c in range(k):
        seg = lab[:, cols[c]:cols[c + 1]]
        ids, cnt = np.unique(seg[seg > 0], return_counts=True)
        if not len(ids):
            return None
        body.append(int(ids[np.argmax(cnt)]))
    if len(set(body)) < k:            # hai người dính nhau (vệt chém nối liền) -> dùng cách cắt cũ
        return None
    owner = {b: c for c, b in enumerate(body)}
    loose = [i for i in range(1, n + 1) if i not in owner]
    if loose:
        objs = ndimage.find_objects(lab)
        best = {i: (np.inf, 0) for i in loose}
        for c, b in enumerate(body):                  # từng bản đồ khoảng cách một (đỡ tốn bộ nhớ)
            dist = ndimage.distance_transform_edt(lab != b).astype(np.float32)
            for i in loose:
                sl = objs[i - 1]
                dmin = float(dist[sl][lab[sl] == i].min())
                if dmin < best[i][0]:
                    best[i] = (dmin, c)
            del dist
        for i in loose:
            owner[i] = best[i][1]
    own = np.full(lab.shape, -1, int)
    for i, c in owner.items():
        own[lab == i] = c
    out = []
    W = strip.shape[1]
    for c in range(k):
        xs = np.nonzero((own == c).any(axis=0))[0]
        x0 = max(0, min(cols[c], int(xs.min()) - 4))
        x1 = min(W, max(cols[c + 1], int(xs.max()) + 5))
        cell = full[:, x0:x1].copy()
        cell[own[:, x0:x1] != c, 3] = 0
        out.append((cell, x0))
    return out


def _star(r, p=0.8, pad=5):
    yy, xx = np.mgrid[-r - pad:r + pad + 1, -r - pad:r + pad + 1]
    return (np.abs(xx) ** p + np.abs(yy) ** p) <= r ** p                 # sao 4 cánh: p=1 hình thoi, p<1 cánh lõm


def remove_ground_lines(im, min_len=40, clear=0.7):
    """Xoá vạch đất mảnh (AI tự vẽ dưới chân dù câu lệnh cấm): đoạn ngang tối dài >= min_len px mà
    phía trên và phía dưới 3px phần lớn là nền trắng (khác viền áo, đế giày: đó là mảng dày). im: RGBA, sửa tại chỗ."""
    rgb = im[..., :3].astype(int)
    ink_ = rgb.min(2) < 200
    white = rgb.min(2) > 235
    H, W = ink_.shape
    hit = np.zeros_like(ink_)
    for y in range(3, H - 3):
        row = ink_[y]
        if row.sum() < min_len:
            continue
        x = 0
        while x < W:
            if not row[x]:
                x += 1
                continue
            x0 = x
            while x < W and row[x]:
                x += 1
            if x - x0 >= min_len:
                above = white[y - 3, x0:x].mean()
                below = white[y + 3, x0:x].mean()
                if above >= clear and below >= clear:
                    hit[y, x0:x] = True
    if not hit.any():
        return 0
    hit = cv2.dilate(hit.astype(np.uint8), np.ones((3, 1), np.uint8)).astype(bool) & (rgb.min(2) < 245)
    im[hit, :3] = 255
    return int(hit.sum())


def remove_gemini_mark(im, ncc_min=0.6, lift_min=3.0):
    """Xoá dấu sao 4 cánh (lớp trắng mờ) Gemini đóng gần góc dưới phải ảnh (cách góc ~50-80px).
    Dò bằng so khớp chuẩn hoá (matchTemplate) với khuôn hình sao ở vài cỡ, chỉ nhận khi khớp hình rõ
    và vùng sao sáng hơn vành quanh nó; rồi vá bằng cv2.inpaint. im: RGBA, sửa tại chỗ. Trả True nếu đã xoá."""
    H, W = im.shape[:2]
    Y0, X0 = max(0, H - 130), max(0, W - 130)
    g = im[Y0:, X0:, :3].astype(np.float32).mean(2)
    best = None
    for r, pw in [(r, pw) for r in range(8, 17, 1) for pw in (0.67, 0.8, 1.0)]:
        st = _star(r, pw)
        if st.shape[0] > g.shape[0] or st.shape[1] > g.shape[1]:
            continue
        res = cv2.matchTemplate(g, st.astype(np.float32), cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(res)
        if best is None or mx > best[0]:
            best = (mx, loc, st)
    if best is None or best[0] < ncc_min:
        return False
    _, (x, y), st = best
    win = g[y:y + st.shape[0], x:x + st.shape[1]]
    ring = cv2.dilate(st.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~st
    if win[st].mean() - win[ring].mean() < lift_min:
        return False
    m = np.zeros((H, W), np.uint8)
    m[Y0 + y:Y0 + y + st.shape[0], X0 + x:X0 + x + st.shape[1]] = cv2.dilate(st.astype(np.uint8), np.ones((5, 5), np.uint8))
    im[..., :3] = cv2.inpaint(np.ascontiguousarray(im[..., :3]), m, 3, cv2.INPAINT_TELEA)
    return True


def split(src, boxes=None, centers=None):
    """Cắt ảnh nguồn thành lưới ô (đã xoá nền).
    boxes: nếu là list, được điền [[(x0, y0) góc trái-trên của từng ô trong ảnh nguồn]] theo hàng.
    centers: nếu là list, được điền [[x tâm danh nghĩa của ô (giữa hai đường chia) trong ảnh nguồn]]."""
    files = sorted(glob.glob(os.path.join(ROOT, src["path"])))
    if not files:
        raise SystemExit("không tìm thấy ảnh: " + src["path"])
    im = np.array(Image.open(files[0]).convert("RGBA"))
    if src.get("unmark"):
        remove_gemini_mark(im)
        remove_ground_lines(im)
    bx, by = 0, 0
    if src.get("box"):
        x0, y0, x1, y1 = src["box"]
        im = im[y0:y1, x0:x1]
        bx, by = x0, y0
    nrows, ncols = src["rows"], src["cols"]
    m = ink(im[..., :3])
    rows = bounds(m.sum(1), nrows, 0, im.shape[0])
    grid = []
    for r in range(nrows):
        band = m[rows[r]:rows[r + 1]]
        cols = bounds(band.sum(0), ncols, 0, im.shape[1])
        parts = split_parts(im[rows[r]:rows[r + 1]], cols) if nrows == 1 else None
        if parts is None:
            parts = [(remove_bg(im[rows[r]:rows[r + 1], cols[c]:cols[c + 1]]), cols[c]) for c in range(ncols)]
        grid.append([p[0] for p in parts])
        if boxes is not None:
            boxes.append([(bx + p[1], by + rows[r]) for p in parts])
        if centers is not None:
            centers.append([bx + (cols[c] + cols[c + 1]) / 2 for c in range(ncols)])
    names = src["names"]
    for (rn, fi), (rn2, fi2) in (src.get("fix") or {}).items():
        grid[names.index(rn)][fi] = grid[names.index(rn2)][fi2]
        if boxes is not None:
            boxes[names.index(rn)][fi] = boxes[names.index(rn2)][fi2]
        if centers is not None:
            centers[names.index(rn)][fi] = centers[names.index(rn2)][fi2]
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


def frame_point(p, cell_w, ax, ay, flip, k):
    """Toạ độ điểm p (trong ô nguồn) sau to_frame(): cùng phép thu nhỏ / lật / dán như ảnh."""
    w2 = max(1, round(cell_w * k))
    x, y, axk = p[0] * k, p[1] * k, ax * k
    if flip:
        x, axk = w2 - x, w2 - axk
    return x + round(PX - axk), y + round(PY - ay * k)


WEAPON_DIR = os.path.join(ROOT, "assets", "weapons")


def load_weapon(wid):
    with open(os.path.join(WEAPON_DIR, "weapons.json"), encoding="utf8") as f:
        w = json.load(f)["weapons"][wid]
    img = Image.open(os.path.join(WEAPON_DIR, w["img"])).convert("RGBA")
    return w, img


def draw_weapon(canvas, wimg, wdef, wd, nominal):
    """Vẽ thử vũ khí lên khung (cho ảnh xem trước), cùng phép biến đổi như src/weapon_layer.js."""
    gx, gy, ang, ln = wd[:4]
    if len(wd) > 5 and wd[5]:
        nominal = wd[5]
    (x0, y0), (x1, y1) = wdef["grip"], wdef["tip"]
    L = float(np.hypot(x1 - x0, y1 - y0))
    sx, sy = ln / L, nominal / L
    a = np.radians(ang)
    ca, sa = np.cos(a), np.sin(a)
    # ma trận: ảnh vũ khí -> khung (dời grip về gốc, co giãn, xoay, dời tới (gx, gy)); PIL cần ma trận ngược
    M = np.array([[ca * sx, -sa * sy, 0], [sa * sx, ca * sy, 0], [0, 0, 1]], float)
    M[0, 2] = gx - (M[0, 0] * x0 + M[0, 1] * y0)
    M[1, 2] = gy - (M[1, 0] * x0 + M[1, 1] * y0)
    Mi = np.linalg.inv(M)
    layer = wimg.transform(canvas.size, Image.AFFINE, tuple(Mi[:2].ravel()), Image.BILINEAR)
    canvas.alpha_composite(layer)


def build(key, preview=None):
    cfg = SETS[key]
    wcfg = cfg.get("weapon")
    marks = {}
    if wcfg:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from weapon_detect import erase_weapon, erase_band, hand_overlay_mask
        mp = os.path.join(ROOT, wcfg["marks"])
        if os.path.exists(mp):
            with open(mp, encoding="utf8") as f:
                marks = json.load(f)["marks"]
        wdef, wimg = load_weapon(wcfg["default"])
    erase_cache = {}
    grids, layout = {}, {}
    for name, src in cfg["sources"].items():
        bxs, cts = [], []
        grids[name] = (split(src, bxs, cts), src["names"])
        layout[name] = (bxs, cts)

    def median_h(src, row, idxs):
        g, names = grids[src]
        return float(np.median([stand_height(g[names.index(row)][i]) for i in idxs]))

    ref_h = median_h("front", "idle", range(6))
    # stand_px: chiều cao đứng đích trong khung (ảnh nguồn mỗi bộ một cỡ); bỏ trống = hệ số SHRINK cố định
    shrink = cfg["stand_px"] / ref_h if cfg.get("stand_px") else SHRINK
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
                # cùng một vị trí so với tâm danh nghĩa của ô (giữa hai đường chia) ở mọi khung
                ri = grids[src][1].index(row)
                bxs, cts = layout[src][0][ri], layout[src][1][ri]
                off = bxs[0][0] + per[0][0] - cts[0]
                ground = max(p[1] for p in per)
                per = [(cts[i] + off - bxs[i][0], ground) for i in range(len(per))]
            anchor_cache[k] = per
        return anchor_cache[k]

    dst = os.path.join(OUT, key)
    os.makedirs(dst, exist_ok=True)
    for f in glob.glob(os.path.join(dst, "*.png")):
        os.remove(f)
    rig = {"name": key, "view": "top-down", "fps": 10, "directions": DIRS8, "pixel_scale": 1, "height": cfg["height"],
           "source": "Sprite sheet tạo bằng AI (thư mục sword/), đóng gói bằng tools/ai_sheet.py", "anims": {}}
    def weapon_cell(src, row, i):
        """(thân đã xoá kiếm, lớp bàn tay hoặc None, (chuôi, mũi) trong toạ độ ô hoặc None)."""
        ck = (src, row, i)
        if ck not in erase_cache:
            cell = row_cells(src, row)[i]
            mk = marks.get(f"{src}/{row}/{i}")
            if not wcfg or not mk or mk.get("none") or "grip" not in mk:
                erase_cache[ck] = (cell, None, None)
            else:
                ri = grids[src][1].index(row)
                ox, oy = layout[src][0][ri][i]
                g = (mk["grip"][0] - ox, mk["grip"][1] - oy)
                t = (mk["tip"][0] - ox, mk["tip"][1] - oy)
                u = stand_height(row_cells(src, row)[0]) / 400.0
                if mk.get("band"):
                    # kiếm to dưới chân (ngự kiếm): xoá nguyên dải quanh trục, không lấy lớp bàn tay
                    body, hand = erase_band(cell, g, t, mk["band"]), np.zeros_like(cell)
                elif mk.get("noerase"):
                    # khung gốc không có kiếm (bị thân che): giữ nguyên thân, chỉ lấy bàn tay để vẽ đè lên kiếm
                    a = cell[..., 3:4] / 255.0
                    fr = (cell[..., :3] * a + 255 * (1 - a)).astype(np.uint8)
                    hm = hand_overlay_mask(fr, g, u)
                    body, hand = cell, np.zeros_like(cell)
                    hand[hm] = cell[hm]
                else:
                    body, hand = erase_weapon(cell, g, t, u)
                if mk.get("draw_len"):
                    # xoá theo vũ khí vẽ sẵn (grip->tip), nhưng vẽ lại cùng hướng với độ dài thống nhất (px ảnh nguồn),
                    # chuôi đặt ở draw_grip (nắm tay) nếu có
                    L = float(np.hypot(t[0] - g[0], t[1] - g[1])) or 1.0
                    ux, uy = (t[0] - g[0]) / L, (t[1] - g[1]) / L
                    if mk.get("draw_grip"):
                        g = (mk["draw_grip"][0] - ox, mk["draw_grip"][1] - oy)
                    t = (g[0] + ux * mk["draw_len"], g[1] + uy * mk["draw_len"])
                erase_cache[ck] = (body, hand if hand[..., 3].any() else None, (g, t, bool(mk.get("behind"))))
        return erase_cache[ck]

    prev, lens, wframes = [], [], []
    for anim, (dset, row, idx, fps, loop, contact, mode) in cfg["anims"].items():
        entry = {"frame": [FW, FH], "frames": len(idx), "fps": fps, "loop": loop, "pivot": [PX, PY],
                 "ms": [round(1000 / fps)] * len(idx), "sheets": {}}
        if contact is not None:
            entry["contact"] = [contact]
        for d in DIRS8:
            src, flip = cfg["dirsets"][dset][d]
            cells, anc = row_cells(src, row), anchors(src, row, mode)
            k = shrink * kmul[src]
            frames, hands, wdata = [], [], []
            for i in idx:
                body, hand, gt = weapon_cell(src, row, i)
                frames.append(to_frame(body, *anc[i], flip, k))
                hands.append(to_frame(hand, *anc[i], flip, k) if hand is not None else None)
                if gt is None:
                    wdata.append(0)
                    continue
                (g, t, behind), cw = gt, cells[i].shape[1]
                fg = frame_point(g, cw, *anc[i], flip, k)
                ft = frame_point(t, cw, *anc[i], flip, k)
                ln = float(np.hypot(ft[0] - fg[0], ft[1] - fg[1]))
                ang = float(np.degrees(np.arctan2(ft[1] - fg[1], ft[0] - fg[0])))
                wide = 0
                if dset in wcfg.get("no_nominal", ()):
                    wide = ln            # kiếm bay: bề ngang co giãn đều theo chiều dài gốc, không theo kiếm cầm tay
                turn = wcfg.get("turn", {}).get(dset, {}).get(d)
                if turn:
                    # đặt kiếm dọc dưới chân: điểm `at` của kiếm nằm ngay dưới bàn chân, giữa thân (PX).
                    # Thân vẽ đè lên (sau_lưng = 1): bay xuống thì chuôi khuất sau người, bay lên thì lưỡi khuất.
                    cy = (fg[1] + ft[1]) / 2
                    ang, ln, wide = float(turn[0]), ln * turn[1], wide * turn[2]
                    r = np.radians(ang)
                    at = turn[3]
                    fg = (PX - np.cos(r) * ln * at, cy - np.sin(r) * ln * at)
                wdata.append([round(fg[0], 1), round(fg[1], 1), round(ang, 1), round(ln, 1), 1 if behind else 0]
                             + ([round(wide, 1)] if wide else []))
                if dset not in wcfg.get("no_nominal", ()):
                    lens.append(ln)
            strip = Image.new("RGBA", (FW * len(frames), FH))
            for i, f in enumerate(frames):
                strip.paste(f, (i * FW, 0))
            name = f"{anim}_{d}.png"
            strip.save(os.path.join(dst, name), optimize=True)
            entry["sheets"][d] = name
            if any(h is not None for h in hands):
                hs = Image.new("RGBA", (FW * len(frames), FH))
                for i, h in enumerate(hands):
                    if h is not None:
                        hs.paste(h, (i * FW, 0))
                hname = f"{anim}_{d}_hand.png"
                hs.save(os.path.join(dst, hname), optimize=True)
                entry.setdefault("hands", {})[d] = hname
            if any(wdata):
                entry.setdefault("weapon", {})[d] = wdata
            if preview and d in ("south-east", "south", "east", "north", "west"):
                prev.append((strip, [h for h in hands], wdata))
        rig["anims"][anim] = entry
    if wcfg and lens:
        # chiều dài "chuẩn" (không bị thu ngắn phối cảnh) của chuôi->mũi trong khung: dùng cho bề ngang vũ khí
        rig["weapon"] = {"default": wcfg["default"], "nominal": round(float(np.percentile(lens, 75)), 1)}
    with open(os.path.join(dst, "rig.json"), "w", encoding="utf8") as f:
        json.dump(rig, f, ensure_ascii=False, indent=1)
    if preview:
        wmax = max(s.width for s, _, _ in prev)
        sheet = Image.new("RGBA", (wmax, FH * len(prev)), (62, 123, 58, 255))
        nominal = rig.get("weapon", {}).get("nominal", 1)
        for j, (s, hands, wdata) in enumerate(prev):
            for i in range(s.width // FW):
                fr = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
                wd = wdata[i] if i < len(wdata) else 0
                if wd and wd[4]:
                    draw_weapon(fr, wimg, wdef, wd, nominal)       # kiếm sau lưng: vẽ trước thân
                fr.alpha_composite(s.crop((i * FW, 0, (i + 1) * FW, FH)))
                if wd and not wd[4]:
                    draw_weapon(fr, wimg, wdef, wd, nominal)
                if i < len(hands) and hands[i] is not None:
                    fr.alpha_composite(hands[i])
                sheet.alpha_composite(fr, (i * FW, j * FH))
                sheet.putpixel((i * FW + PX, j * FH + PY), (255, 0, 0, 255))   # dấu điểm chân
        sheet.save(os.path.join(preview, key + "_preview.png"))
    print("built", key)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    key = sys.argv[1]
    prev = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    build(key, prev)


if __name__ == "__main__":
    main()
