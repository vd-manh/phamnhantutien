"""cuu_long_de_vuong: Cửu Long Đế Vương Công. Golden qi gathers at the caster's back, nine golden loong sprout from
it into a fan halo, roar, then launch one after another along high arcs and bite the target, pouring into it in a
gold burst; the ground breaks and the dragons scatter into embers.

Side view facing east (mirror True), 400x250 cell, pivot on the caster's feet (118, 226), 30 fps, 90 frames (3 s),
one-shot, outlined pixel art, glow strong, clarity clear, gold palette. Fixed range: the bite lands 192 px ahead.

| state    | frames | s         | what moves                                                             | carrier            |
|----------|--------|-----------|------------------------------------------------------------------------|--------------------|
| gather   | 0-26   | 0.0-0.9   | motes spiral into a core behind the back; dragons grow out of it       | core, motes        |
| roar     | 27-38  | 0.9-1.3   | nine dragons in a fan halo bob, open jaws and roar; core flashes        | dragon heads       |
| fly      | 39-57  | 1.3-1.9   | dragons launch in turn, bodies follow their heads along high arcs      | heads, bodies      |
| bite     | 58-70  | 1.9-2.4   | each head snaps on the target and its body pours in; flashes, cracks   | bite flash         |
| dissolve | 71-89  | 2.4-3.0   | embers drift up and out, dust settles                                  | embers             |

Dragon part list (head length 18 px): camel skull and long snout with a nose bump, hinged lower jaw with white teeth
and a red mouth, glowing demon eye under a brow ridge, stag antlers (beam and one tine), flame mane at the nape, two
long catfish barbels trailing back, snake body about 8 heads long tapering to a flame tail tuft, carp-scale banding
and dorsal spines.
"""
import math
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "kit"))
import export as ex  # noqa: E402
import facing as fc  # noqa: E402
import fxkit as fk  # noqa: E402
import fxlib as fl  # noqa: E402
import light as lt  # noqa: E402
import pfx  # noqa: E402

NAME = "cuu_long_de_vuong"
OUT = HERE / "out"
W, H = 400, 250
PX, PY = 118, 226
PIVOT = (PX, PY)
FPS, N = 30, 90
SEED = 9
STATES = {"gather": (0, 26), "roar": (27, 38), "fly": (39, 57), "bite": (58, 70), "dissolve": (71, 89)}

# 0 outline, 1-5 gold shadow..cream, 6 red (eye rim, mouth), 7-9 dust
PAL = ["#2a1204", "#6e3a0c", "#b06a16", "#e2a434", "#f8d66a", "#fff6d0", "#8a1a12", "#3b2f2a", "#6b5a4c", "#a08c74"]
LIGHT_RAMP = ["#5a2a00", "#e08a10", "#ffd060", "#ffffff"]

X, Y = fl.grid(W, H, PX, PY)           # world px relative to the caster's feet, y down
CV = SimpleNamespace(x=X, y=Y)
TX, TY = 192.0, -16.0                  # bite point (the target's body)
CORE = np.array([-24.0, -74.0])        # qi core behind the caster's back
ND = 9
HEAD_LEN = 18.0


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def resample(pts, step=1.0):
    pts = np.asarray(pts, float)
    seg = np.hypot(*(pts[1:] - pts[:-1]).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    s = np.arange(0, cum[-1], step)
    return np.stack([np.interp(s, cum, pts[:, 0]), np.interp(s, cum, pts[:, 1])], -1)


def bez(p0, p1, p2, n):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2


# ---------------------------------------------------------------- routes (fixed geometry, built once)
DR = []
for k in range(ND):
    ang = math.radians(-174 + k * (150 / (ND - 1)))
    R = 66 + 5 * math.sin(k * 1.7)
    A = CORE + np.array([R * math.cos(ang), R * math.sin(ang) * 0.86])
    base = CORE + (A - CORE) * 0.12
    t = np.linspace(0, 1, 70)
    d = (A - base) / np.linalg.norm(A - base)
    nrm = np.array([-d[1], d[0]])
    wave = 7.5 * np.sin(t * math.pi * 2.3 + k * 0.9) * np.sin(t * math.pi)
    coil = base + (A - base) * t[:, None] + nrm * wave[:, None]
    lead = A + d * 6                                         # the head first lifts outward a little
    ctrl = np.array([(A[0] + TX) / 2 + (k - 4) * 7, min(A[1], TY) - 64 - 14 * ((k * 5) % 3)])
    end = np.array([TX + (k - 4) * 1.6, TY + ((k % 3) - 1) * 5])
    fly = bez(lead, ctrl, end, 120)
    route = resample(np.vstack([coil, fly]), 1.0)
    seg = np.hypot(*(route[1:] - route[:-1]).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    lc = float(np.hypot(*(coil[1:] - coil[:-1]).T).sum())
    launch = 39 + k * 1.6
    DR.append(dict(route=route, cum=cum, Lc=lc, Lt=float(cum[-1]), Lb=lc * 0.98, launch=launch,
                   arrive=launch + 17, grow=1 + k * 2.0, k=k))


def at_s(dr, s):
    s = np.clip(s, 0, dr["Lt"])
    return np.stack([np.interp(s, dr["cum"], dr["route"][:, 0]), np.interp(s, dr["cum"], dr["route"][:, 1])], -1)


def head_s(dr, f):
    """Route distance of the head at frame f (float)."""
    if f < dr["launch"]:
        return dr["Lc"]
    u = min(1.0, (f - dr["launch"]) / (dr["arrive"] - dr["launch"]))
    return dr["Lc"] + (u ** 1.7) * (dr["Lt"] - dr["Lc"])


# ---------------------------------------------------------------- drawing helpers
def box(pts, pad):
    x0 = int(max(0, np.floor(pts[:, 0].min() + PX - pad)))
    x1 = int(min(W, np.ceil(pts[:, 0].max() + PX + pad)))
    y0 = int(max(0, np.floor(pts[:, 1].min() + PY - pad)))
    y1 = int(min(H, np.ceil(pts[:, 1].max() + PY + pad)))
    return slice(y0, y1), slice(x0, x1)


def draw_body(layer, pts, wn, f, k):
    """pts tail -> neck (world px). wn: neck width."""
    if len(pts) < 2:
        return
    sy, sx = box(pts, wn + 4)
    x, y = X[sy, sx], Y[sy, sx]
    sub = layer[sy, sx]
    d, t, side = fl.stroke(x, y, pts, 1.6, wn)
    on = d < 0
    sub[on] = 2
    hi_d, _, _ = fl.stroke(x, y, pts + np.array([-0.5, -1.7]), 0.6, wn * 0.42)
    sub[on & (hi_d < 0)] = 4
    lo_d, _, _ = fl.stroke(x, y, pts + np.array([0.4, 1.9]), 0.5, wn * 0.38)
    sub[on & (lo_d < 0) & (hi_d >= 0)] = 1
    length = float(np.hypot(*(pts[1:] - pts[:-1]).T).sum())
    scale = (np.floor(t * length / 2.6).astype(int) + (side > 0)) % 2 == 0     # carp scales
    sub[on & (hi_d >= 0) & (lo_d >= 0) & scale] = 3
    # dorsal spines on the upper side, every 5 px
    for i in range(4, len(pts) - 2, 8):
        tx, ty = pts[i + 1] - pts[i - 1]
        nl = math.hypot(tx, ty) or 1
        nx, ny = -ty / nl, tx / nl
        if ny > 0:
            nx, ny = -nx, -ny
        frac = i / (len(pts) - 1)
        half = (1.6 + (wn - 1.6) * frac) / 2
        L = 1.0 + 1.8 * frac
        bx, by = pts[i] + np.array([nx, ny]) * half
        fl.line(layer, bx + PX - 0.5, by + PY - 0.5, bx + nx * L + PX - 0.5, by + ny * L + PY - 0.5, 3)
        fl.put(layer, bx + nx * L + PX - 0.5, by + ny * L + PY - 0.5, 4)
    # flame tuft at the tail
    tx, ty = pts[0] - pts[min(3, len(pts) - 1)]
    nl = math.hypot(tx, ty) or 1
    tail = np.array([pts[0], pts[0] + np.array([tx, ty]) / nl * 5 + np.array([0, math.sin(f * 0.6 + k) * 2]),
                     pts[0] + np.array([tx, ty]) / nl * 8 + np.array([0, -2 + math.sin(f * 0.6 + k + 1) * 3])])
    sy, sx = box(tail, 4)
    d2, _, _ = fl.stroke(X[sy, sx], Y[sy, sx], tail, 3.0, 0.4)
    layer[sy, sx][(d2 < 0) & (layer[sy, sx] < 0)] = 3


def draw_head(layer, L, hx, hy, a, sc, open_, f, k, glow_k):
    """Head at (hx, hy) facing angle a, scale sc, jaw open 0..1. Local u along the snout, v down."""
    ca, sa = math.cos(a), math.sin(a)
    vs = 1.0 if ca >= -0.15 else -1.0                   # never upside down
    r = 26 * sc
    sy, sx = box(np.array([[hx - r, hy - r], [hx + r, hy + r]]), 1)
    x, y = X[sy, sx], Y[sy, sx]
    dx, dy = x - hx, y - hy
    u = (dx * ca + dy * sa) / sc
    v = (-dx * sa + dy * ca) * vs / sc
    sub = layer[sy, sx]

    def put(mask, s):
        sub[mask] = s

    def strk(pts, w0, w1):
        return fl.stroke(u, v, np.asarray(pts, float), w0, w1)[0] < 0

    flick = math.sin(f * 0.7 + k * 1.3)
    # mane: flame locks behind the skull
    for j, (v0, v1) in enumerate(((-3.2, -6.5), (-0.8, 0.5), (1.8, 6.0))):
        put(strk([(-2, v0), (-8, v0 + (v1 - v0) * 0.5 + flick), (-14 - j, v1 + flick * 1.5)], 3.4, 0.4), 2)
        put(strk([(-2, v0), (-8, v0 + (v1 - v0) * 0.5 + flick)], 1.4, 0.4), 3)
    # far horn (darker, behind) and near horn
    for off, tone in (((1.6, 0.6), 2), ((0, 0), 4)):
        ox, oy = off
        put(strk([(-1 + ox, -4.3 + oy), (-6 + ox, -8.5 + oy), (-10 + ox, -12.5 + oy)], 1.8, 0.8), tone)
        put(strk([(-5.2 + ox, -8 + oy), (-4.6 + ox, -13 + oy)], 1.3, 0.6), tone)
    # skull and snout
    skull = ((u / 6.2) ** 2 + ((v + 1.0) / 4.7) ** 2) <= 1
    top = -3.4 + np.clip(u - 3, 0, None) * 0.16 - 1.1 * np.exp(-((u - 12.6) / 1.3) ** 2)
    snout = (u >= 2) & (u <= 14.2) & (v >= top) & (v <= 0.7 - np.clip(u - 2, 0, None) * 0.04)
    upper = skull | snout
    put(upper, 3)
    put(upper & (v < top + 1.2) & (u > 1), 4)
    put(skull & (v < -3.3), 4)
    # lower jaw on a hinge at (1, 1)
    phi = open_ * 0.42
    cu, su = math.cos(phi), math.sin(phi)
    ju, jv = (u - 1) * cu + (v - 1) * su, -(u - 1) * su + (v - 1) * cu
    jaw = (ju >= -0.5) & (ju <= 10.6) & (jv >= -0.2) & (jv <= 2.8 - ju * 0.13)
    if open_ > 0.15:                                  # red mouth and teeth between the jaws
        mouth = (u > 1.5) & (u < 12.8) & (v > 0.6) & (jv < -0.2) & ~upper
        put(mouth, 6)
        for tu in (5.0, 8.0, 11.0):
            put((np.abs(u - tu) < 0.6) & (v > 0.6) & (v < 1.9) & ~jaw, 5)
            put((np.abs(ju - (tu - 1.5)) < 0.6) & (jv > -1.3) & (jv < -0.1), 5)
    put(jaw, 2)
    put(jaw & (jv > 1.8), 1)
    # beard tuft under the jaw
    put(strk([(4, 3.5 + phi * 4), (1, 6 + phi * 4), (-2, 8 + phi * 3 + flick)], 2.4, 0.4) & (layer[sy, sx] < 0), 2)
    # brow ridge, eye, nose
    put((np.abs(v + 3.6) < 0.6) & (u > 1.2) & (u < 5.5), 1)
    eye = ((u - 3.4) / 1.5) ** 2 + ((v + 2.2) / 1.1) ** 2 <= 1
    put(eye, 5)
    put(((u - 3.9) ** 2 + (v + 2.2) ** 2) <= 0.35, 6)
    put(((u - 12.9) / 1.2) ** 2 + ((v + 2.4) / 0.9) ** 2 <= 1, 4)
    # two catfish barbels trailing back
    for j, (v0, amp) in enumerate(((0.2, 1.0), (-1.0, 1.4))):
        pts = [(12.6, v0), (7, 3 + j + flick * amp), (0, 6 + j * 2 - flick * amp), (-9, 8 + j * 3 + flick * 2 * amp)]
        put(strk(pts, 1.0, 0.7) & (layer[sy, sx] < 0), 4)
    # light: demon eye (tight core + pool), the snout when open
    ex_, ey_ = hx + (3.4 * ca - (-2.2) * vs * sa) * sc, hy + (3.4 * sa + (-2.2) * vs * ca) * sc
    lt.glow(L, CV, ex_, ey_, 4 * sc, 0.6 * glow_k)
    lt.glow(L, CV, ex_, ey_, 11 * sc, 0.27 * glow_k)
    if open_ > 0.3:
        mx, my = hx + 9 * ca * sc, hy + 9 * sa * sc
        lt.glow(L, CV, mx, my, 8 * sc, 0.3 * open_ * glow_k)


# ---------------------------------------------------------------- the frame
def jaw_open(dr, f):
    roar = math.sin(math.pi * np.clip((f - 31 - dr["k"] * 0.4) / 7, 0, 1))
    a, b = dr["launch"], dr["arrive"]
    bite = 0.0
    if a <= f < b:
        u = (f - a) / (b - a)
        bite = smooth(0.45, 0.85, u) * (1 - smooth(0.93, 1.0, u))
    return max(roar, bite)


def render(f, seed=SEED, caster=False):
    m = np.full((H, W), -1, np.int8)
    L = lt.buffer(CV)
    rng = np.random.default_rng(seed)

    # ---- qi core behind the back: visible from frame 0, brightens through the gather, flashes on the roar
    core_k = (0.12 + 0.5 * smooth(0, 30, f)) * (1 - smooth(40, 58, f))
    if core_k > 0.02:
        lt.glow(L, CV, *CORE, 6 + 6 * smooth(0, 30, f), core_k)
        lt.glow(L, CV, *CORE, 22, core_k * 0.4)
        rc = 1.5 + 2.5 * smooth(0, 30, f)
        on = np.hypot(X - CORE[0], Y - CORE[1]) < rc * (1 - smooth(44, 58, f))
        m[on] = 5
    lt.flash_at(L, CV, f, 33, *CORE, 56, 0.75, 8)

    # ---- gather motes spiralling into the dragons' coils
    if f < 30:
        for i in range(140):
            k = i % ND
            dr = DR[k]
            h = lambda s: fk.hsh(i, s + seed)          # noqa: E731
            fa = 5 + 22 * h(1)
            u = min(1.0, f / fa)
            if u >= 1.0:
                continue
            th = 2 * math.pi * h(2)
            rad = 48 + 34 * h(3)
            start = CORE + np.array([math.cos(th) * rad, math.sin(th) * rad * 0.6])
            tgt = at_s(dr, dr["Lc"] * (0.15 + 0.85 * h(4)))
            e = u * u * (3 - 2 * u)
            sw = math.sin(e * math.pi) * 18 * (1 if i % 2 else -1)
            dvec = tgt - start
            nl = np.hypot(*dvec) or 1
            p = start + dvec * e + np.array([-dvec[1], dvec[0]]) / nl * sw
            s = 5 if h(5) > 0.6 else 4
            fl.put(m, p[0] + PX - 0.5, p[1] + PY - 0.5, s)
            if h(6) > 0.7:
                fl.put(m, p[0] + PX + 0.5, p[1] + PY - 0.5, 3)
            lt.glow(L, CV, p[0], p[1], 3.5, 0.18 * lt.flicker(i, f, seed))

    # ---- the nine dragons (back to front: last launched drawn first so the leaders stay on top)
    for dr in sorted(DR, key=lambda d: -d["k"]):
        k = dr["k"]
        grow = smooth(dr["grow"], dr["grow"] + 13, f)
        if grow <= 0:
            continue
        sh = head_s(dr, f)
        pour = smooth(dr["arrive"], dr["arrive"] + 6, f)         # body pours into the target after the bite
        if pour >= 1:
            continue
        tail_s = sh - dr["Lb"] + pour * dr["Lb"]
        if f < dr["launch"]:
            tail_s = sh - dr["Lb"]
            sh = tail_s + dr["Lb"] * grow                         # grow out of the core
        ss = np.linspace(tail_s, sh, max(4, int((sh - tail_s) / 2.5)))
        pts = at_s(dr, ss)
        if f < dr["launch"]:                                      # hover bob, stronger toward the head
            w8 = np.linspace(0, 1, len(pts))[:, None]
            pts = pts + np.array([0.0, math.sin(f * 0.32 + k) * 1.8]) * w8
        layer = np.full((H, W), -1, np.int8)
        neck = 9.5 * (0.6 + 0.4 * grow)
        draw_body(layer, pts, neck, f, k)
        hd = pts[-1] - pts[-3] if len(pts) > 2 else np.array([1.0, 0.0])
        a = math.atan2(hd[1], hd[0])
        sc = (0.55 + 0.45 * smooth(0.5, 1.0, grow)) * 1.25
        if grow > 0.45 and pour < 0.3:
            flying = dr["launch"] <= f < dr["arrive"]
            draw_head(layer, L, pts[-1][0], pts[-1][1], a, sc, jaw_open(dr, f), f, k, 1.0)
            if flying:
                lt.glow(L, CV, pts[-1][0], pts[-1][1], 16, 0.16)
        for j in range(0, len(pts) - 1, 6):                       # faint inner light along the body
            lt.glow(L, CV, pts[j][0], pts[j][1], 6, 0.035 * grow)
        layer = fl.outline(layer, 0)
        m[layer >= 0] = layer[layer >= 0]

        # bite: flash, streaks and gold sparks on arrival
        fa = dr["arrive"]
        if fa <= f < fa + 5:
            fk.streaks(m, X, Y, TX, TY, 7, 6 + (f - fa) * 3, 14 + (f - fa) * 5, 1.4, (5, 4, 3), seed=seed + k,
                       spin=k * 0.7)
        lt.flash_at(L, CV, f, int(round(fa)), TX, TY, 30, 0.6, 6)

    # ---- final bite: big flash, ground breaks
    last = int(round(DR[-1]["arrive"]))
    first = int(round(DR[0]["arrive"]))
    lt.flash_at(L, CV, f, last, TX, TY - 14, 44, 0.95, 10)
    lt.flash_at(L, CV, f, last, TX, TY, 22, 1.0, 5)
    fk.ground_impact(m, X, Y, f - first, FPS, (1, 2, 3), (7, 8, 9), cx=TX, cy=0.0, r=20.0, weight="finisher",
                     life=0.82, seed=seed)

    # ---- embers scatter from the target after each dragon poured in
    for i in range(110):
        k = i % ND
        t0 = DR[k]["arrive"] + 2 + 3 * fk.hsh(i, seed + 3)
        age = f - t0
        life = 8 + 7 * fk.hsh(i, seed + 4)
        if 0 <= age < life:
            a = 2 * math.pi * fk.hsh(i, seed + 5)
            sp = 30 + 45 * fk.hsh(i, seed + 6)
            t = age / FPS
            px = TX + math.cos(a) * sp * t * (1 - 0.35 * t)
            py = TY + math.sin(a) * sp * 0.7 * t - 30 * t
            s = 5 if age < life * 0.3 else 4 if age < life * 0.65 else 3
            fl.put(m, px + PX - 0.5, py + PY - 0.5, s)
            lt.glow(L, CV, px, py, 4, 0.22 * (1 - age / life) * lt.flicker(i, f, seed))

    # ---- last wisps: a few slow embers rise and thin out to the final frame (no pop, no empty frame)
    for i in range(10):
        t0 = 74 + 3 * fk.hsh(i, seed + 40)
        age = f - t0
        if 0 <= age <= N - t0:
            px = TX + (fk.hsh(i, seed + 41) - 0.5) * 50 + math.sin(age * 0.3 + i) * 2
            py = TY - 4 - age * (0.8 + 0.6 * fk.hsh(i, seed + 42))
            fl.put(m, px + PX - 0.5, py + PY - 0.5, 4 if age < 8 else 3)
            lt.glow(L, CV, px, py, 3, 0.12 * lt.flicker(i, f, seed))

    col = pfx.paint(m, PAL)
    lt_rgb = pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), LIGHT_RAMP)
    return col, lt_rgb, L


def with_caster(frame_rgba, f):
    try:
        import rig
        r = rig.load(str(HERE.parent.parent / "assets" / "casters" / "nghich_tien_kiem_topdown"))
        anim = "cast" if f < 60 else "idle"
        k = min(int(f / (FPS / r.fps_of(anim))) if anim == "idle" else min(6, f // 6), 9)
        ch = r.place((H, W), PIVOT, anim, k, "east")
        out = ch.copy()
        a = frame_rgba[..., 3:4] / 255.0
        out[..., :3] = (frame_rgba[..., :3] * a + ch[..., :3] * (1 - a)).astype(np.uint8)
        out[..., 3] = np.maximum(frame_rgba[..., 3], ch[..., 3])
        return out
    except Exception as e:  # preview only
        print("caster preview skipped:", e)
        return frame_rgba


def main():
    peak_only = "--peak" in sys.argv
    OUT.mkdir(exist_ok=True)
    frames = [36, 50, 58, 64] if peak_only else range(N)
    cols, lights, finals, Ls = [], [], [], []
    for f in frames:
        c, l, Lraw = render(f)
        cols.append(c); lights.append(l); Ls.append(Lraw)
        finals.append(pfx.composite(c, l))
    previews = [with_caster(fr, f) for fr, f in zip(finals, frames)]
    if peak_only:
        from PIL import Image
        big = np.concatenate([pfx.composite(p, np.zeros((H, W, 3)), "#101018") for p in previews], axis=1)
        Image.fromarray(big).resize((big.shape[1] * 2, big.shape[0] * 2), Image.NEAREST).save(OUT / "peak_2x.png")
        print("peak frames written")
        return

    # light measure (smooth light only)
    covers, means = [], []
    for c, Lr in zip(cols, Ls):
        ys, xs = np.nonzero(c[..., 3])
        if len(ys) == 0:
            continue
        b = np.clip(Lr[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        if (b > 0.03).any():
            covers.append((b > 0.03).mean()); means.append(b[b > 0.03].mean())
    print(f"light: cover {np.median(covers) * 100:.0f} %  mean {np.median(means):.3f}  (strong: mean 0.08-0.14)")

    hits = [ex.hit(int(round(DR[0]["arrive"])), FPS, weight="light", dir=20),
            ex.hit(int(round(DR[4]["arrive"])), FPS, weight="heavy", dir=20),
            ex.hit(int(round(DR[-1]["arrive"])), FPS, weight="finisher", dir=30)]
    poses = [ex.pose(0.0, "channel"), ex.pose(1.25, "release", "snap"), ex.pose(2.3, "recover")]
    meta = ex.write(OUT, NAME, finals, FPS, PIVOT, False, light=lights, color=cols, states=STATES, hits=hits,
                    poses=poses, target={"x": TX, "react": "launch"},
                    extra=dict(fc.meta("side", W, H, PIVOT, target=[TX + PX, PY]), glow="strong"))
    fc.check(meta["meta"]["beanfx"])
    pfx.strip([pfx.composite(p, np.zeros((H, W, 3)), "#101018") for p in previews[::6]], OUT / f"{NAME}_strip_dark.png")
    pfx.gif(previews, OUT / f"{NAME}.gif", FPS, scale=2)
    pfx.contact(OUT / "contact.png", previews, FPS)

    problems = ex.check(finals, lights, loop=False, src=__file__)
    problems += ex.check_seeds(lambda f, sd: render(f, seed=sd)[0], N)
    problems += ex.check_act(meta["meta"]["beanfx"]["act"], N, FPS, False)
    try:
        ex.page(OUT / f"{NAME}.json")
    except Exception as e:
        print("page skipped:", e)
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    print(f"ok: {N} frames, out/{NAME}.png")


if __name__ == "__main__":
    main()
