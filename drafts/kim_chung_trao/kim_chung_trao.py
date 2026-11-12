"""kim_chung_trao: Kim Chung Tráo (Golden Bell Shield). A translucent phantom of a golden temple bell drops over the
caster, strikes the ground, rings (sound rings, a light sweep up the body, runes glowing), then dissolves from the
mouth up into rising gold motes. A second sheet is the golden aura that stays round the body while the buff lasts.

Two sheets, front view, one direction (symmetric):
  kim_chung_trao  140x210, pivot (70, 170) on the caster's feet, 30 fps, 42 frames (1.4 s), one-shot
  kim_chung_aura  100x110, pivot (50, 100), 30 fps, 30 frames (1.0 s), seamless loop
Outlined pixel art, glow strong, clarity balanced (the bell body is a translucent phantom; rim, bands and bosses
solid), gold palette.

| state    | frames | s         | what moves                                                        | carrier       |
|----------|--------|-----------|-------------------------------------------------------------------|---------------|
| drop     | 0-7    | 0.0-0.27  | the phantom bell falls over the body, fading in                   | bell          |
| strike   | 8-9    | 0.27-0.33 | it lands: white-gold flash, ground ring                           | flash         |
| ring     | 10-24  | 0.33-0.83 | it shudders, sound rings spread, a light band sweeps up, runes glow | bell, runes |
| dissolve | 25-41  | 0.83-1.4  | it dissolves from the mouth up into rising motes                  | motes         |

Bell part list (East Asian temple bell, about 86 px tall): dragon-head loop handle holding a jewel (14 px), domed
crown (8 px), upper body with rows of round bosses in panels split by a vertical band, 3-4 raised horizontal
bands, a lotus striking seat on the front, two columns of runes on the lower body, flared lip.
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

OUT = HERE / "out"
FPS = 30
SEED = 4
PAL = ["#3a1c06", "#8a4a0c", "#d07a14", "#f2a62e", "#ffd04a", "#fff2b8"]
LIGHT_RAMP = ["#7a3a00", "#f0a020", "#ffd870", "#ffffff"]

# ---------------------------------------------------------------- the bell
BW, BH, BPX, BPY, BN = 140, 210, 70, 170, 42
BELL_STATES = {"drop": (0, 7), "strike": (8, 9), "ring": (10, 24), "dissolve": (25, 41)}
BX, BY = fl.grid(BW, BH, BPX, BPY)
BCV = SimpleNamespace(x=BX, y=BY)
LAND = 8
TOP = -74.0          # top of the crown (local y, the mouth is at 0)


def half_width(v):
    """Half width of the bell body at local height v (0 the mouth, negative up)."""
    v = np.asarray(v, float)
    hw = np.where(v > -4, 28.0 - (v + 4) * 0.25, 0.0)                 # flared lip
    body = 26.0 - np.clip(-v - 4, 0, None) * (3.0 / 58.0)             # gently narrowing to the shoulder
    hw = np.where((v <= -4) & (v > -62), body, hw)
    dome = (v <= -62) & (v >= TOP)
    hw = np.where(dome, 23.0 * np.sqrt(np.clip(1 - ((v + 62) / (TOP + 62)) ** 2, 0, 1)), hw)
    return np.where(v < TOP, 0.0, np.where(v > 0, 0.0, hw))


def bell_maps(ox, oy):
    """Shade map and alpha map of the bell with its mouth centre at (ox, oy) (world px)."""
    x, y = BX - ox, BY - oy
    m = np.full(BX.shape, -1, np.int8)
    alpha = np.zeros(BX.shape)
    hw = half_width(y)
    inside = (np.abs(x) <= hw) & (hw > 0)
    u = np.where(hw > 0, x / np.maximum(hw, 1e-6), 0)
    shade = np.where(u < -0.6, 4, np.where(u < 0.0, 3, np.where(u < 0.55, 3, 2)))    # phantom gold: warm, saturated body
    m[inside] = shade[inside]
    alpha[inside] = 0.7
    solid = np.zeros(BX.shape, bool)
    # raised horizontal bands and the lip
    for yb, wb in ((-2.5, 3), (-29, 2), (-47, 2), (-61, 2)):
        band = inside & (np.abs(y - yb) <= wb / 2)
        m[band] = np.where(u[band] < 0, 4, 3)
        solid |= band
    # vertical bands splitting the boss panels
    vb = inside & (np.abs(x) <= 1) & (y < -47) & (y > -61)
    m[vb] = 3
    solid |= vb
    # bosses: 2 rows x 4 per side visible
    for row in (-50.5, -55.5):
        for bxp in (-17, -12, -6, 6, 12, 17):
            on = (np.abs(x - bxp) <= 1) & (np.abs(y - row) <= 1) & inside
            m[on] = 4
            sh = (np.abs(x - bxp - 1) <= 0.5) & (np.abs(y - row - 1.5) <= 0.5) & inside
            m[sh] = 1
            solid |= on | sh
    # lotus striking seat on the front
    rr = np.hypot(x, y + 18)
    lotus = inside & (rr <= 5.2)
    petals = lotus & (rr > 2.5) & ((np.floor((np.arctan2(y + 18, x) + math.pi) / (math.pi / 4)) % 2) == 0)
    m[lotus] = 2
    m[petals] = 4
    m[inside & (rr <= 1.6)] = 5
    solid |= lotus
    # rune columns
    runes = np.zeros(BX.shape, bool)
    for cx in (-15, 15):
        for k in range(5):
            ry = -33 - k * 2.8
            on = (np.abs(x - cx - ((k % 2) * 1 - 0.5)) <= 0.6) & (np.abs(y - ry) <= 0.6)
            runes |= on & inside
    m[runes] = 5
    solid |= runes
    # crown and dragon handle with a jewel
    arch_pts = [(-8, TOP + 1), (-8, TOP - 7), (-4, TOP - 11), (0, TOP - 12), (4, TOP - 11), (8, TOP - 7), (8, TOP + 1)]
    d, _, _ = fl.stroke(x, y, arch_pts, 3.2, 3.2)
    arch = d < 0
    m[arch] = 3
    m[arch & (y < TOP - 9)] = 4
    for hx in (-7.5, 7.5):
        head = ((x - hx) / 3.2) ** 2 + ((y - (TOP - 4)) / 2.6) ** 2 <= 1
        m[head] = 3
        m[head & (y < TOP - 4.5)] = 4
        m[(np.abs(x - hx - np.sign(hx) * 1.2) <= 0.5) & (np.abs(y - (TOP - 4.5)) <= 0.5)] = 5   # dragon eye
        solid |= head
    jewel = np.hypot(x, y - (TOP - 14)) <= 2.2
    m[jewel] = 5
    solid |= arch | jewel
    alpha[solid] = 1.0
    # outline
    on = m >= 0
    m2 = fl.outline(m, 0)
    rim = (m2 >= 0) & ~on
    alpha[rim] = 1.0
    return m2, alpha, x, y, inside, runes


def smooth01(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def bell_frame(f, seed=SEED):
    L = lt.buffer(BCV)
    m = np.full(BX.shape, -1, np.int8)
    alpha = np.zeros(BX.shape)
    rng = np.random.default_rng(seed)

    if f < LAND:
        t = f / LAND
        oy = -46 * (1 - t * t)
        fade = 0.35 + 0.65 * t
    else:
        oy, fade = 0.0, 1.0
    shake = round(math.sin(f * 2.6) * 1.6 * math.exp(-(f - LAND) / 5)) if f >= LAND else 0
    bm, ba, x, y, inside, runes = bell_maps(shake, oy)

    # dissolve from the mouth up into motes
    keep = np.ones(BX.shape, bool)
    if f >= 25:
        p = (f - 25) / 16.0
        noise = fl.noise(BX, BY, 6, seed)                      # 0..1 field
        hnorm = np.clip(-y / 90.0, 0, 1)                       # 0 at the mouth, 1 at the top
        keep = noise * 0.6 + hnorm * 0.55 > p * 1.25
    if f >= 25:                                       # the dark rim goes first so no dirty specks stay behind
        keep &= ~((bm == 0) & ((f - 25) / 16.0 > 0.12))
    vis = (bm >= 0) & keep
    m[vis] = bm[vis]
    alpha[vis] = ba[vis] * fade
    # translucent body is a little more solid while it rings
    if LAND <= f < 25:
        alpha[vis & (ba < 1)] = 0.78
    # soft golden light inside the phantom (it glows rather than tints the ground)
    body_k = (0.12 if f < LAND else 0.22 if f < 25 else 0.22 * (1 - (f - 25) / 16)) * fade
    if body_k > 0:
        lt.glow(L, BCV, shake, oy - 34, 40, body_k)

    # light: jewel, runes, light band sweeping up while it rings, impact flash
    jk = fade * (1 - smooth01((f - 25) / 12.0))               # the jewel goes out with the bell
    lt.glow(L, BCV, shake, oy + TOP - 14, 5, 0.55 * jk)
    lt.glow(L, BCV, shake, oy + TOP - 14, 12, 0.22 * jk)
    rk = 0.4 if LAND <= f < 30 else 0.15
    ry_, rx_ = np.nonzero(runes & keep)
    for j in range(0, len(ry_), 2):
        lt.glow(L, BCV, BX[ry_[j], rx_[j]], BY[ry_[j], rx_[j]], 3.5, rk * lt.flicker(j, f, seed))
    if LAND + 2 <= f < 25:
        sy = -4 - (f - LAND - 2) * 5.2
        hw = float(half_width(np.array([sy]))[0])
        if hw > 0:
            lt.glow_line(L, BCV, (shake - hw, oy + sy), (shake + hw, oy + sy), 5, 0.28)
    lt.flash_at(L, BCV, f, LAND, 0, -36, 70, 0.85, 7)
    lt.flash_at(L, BCV, f, LAND, 0, -2, 30, 0.6, 5)

    # ground ring at the strike
    if LAND <= f < LAND + 9:
        k = (f - LAND) / 9
        rx, ryy = 22 + 30 * k, 6 + 8 * k
        dd = np.abs(np.hypot(BX / rx, BY / ryy) - 1) * rx
        ring = dd < 1.0
        m[ring & (m < 0)] = 4 if k < 0.5 else 3
        alpha[ring] = np.maximum(alpha[ring], 1 - k)
        lt.glow_ring(L, BCV, 0, 0, rx, 3, 0.25 * (1 - k), flat=ryy / rx)
    # sound rings round the bell
    for k0 in (LAND + 1, LAND + 6, LAND + 11):
        age = f - k0
        if 0 <= age < 10:
            R = 34 + age * 3.4
            dd = np.abs(np.hypot(BX / R, (BY + 40) / (R * 1.05)) - 1) * R
            ang = np.arctan2(BY + 38, BX)
            dash = (np.floor((ang + math.pi) / 0.32) % 2) == 0
            on = (dd < 0.8) & dash
            m[on & (m < 0)] = 4
            alpha[on] = np.maximum(alpha[on], 1 - age / 10)
            lt.glow_ring(L, BCV, 0, -40, R, 2.5, 0.14 * (1 - age / 10), flat=1.05)

    # motes rising from where the bell dissolved
    if f >= 25:
        for i in range(70):
            h = lambda s: fk.hsh(i, s + seed)         # noqa: E731
            born = 25 + 14 * h(1)
            age = f - born
            life = 5 + 4 * h(2)
            if 0 <= age < life:
                v0 = -6 - 80 * h(3) * min(1.0, (born - 25) / 14 * 1.2 + 0.1)
                hw = float(half_width(np.array([v0]))[0])
                px = (h(4) * 2 - 1) * hw
                py = v0 - age * (0.8 + 0.9 * h(5))
                px += math.sin(age * 0.5 + i) * 1.2
                s = 5 if age < life * 0.4 else 4
                fl.put(m, px + BPX - 0.5, py + BPY - 0.5, s)
                xi, yi = int(round(px + BPX - 0.5)), int(round(py + BPY - 0.5))
                if 0 <= xi < BW and 0 <= yi < BH:
                    alpha[yi, xi] = 1.0 - age / life * 0.5
                lt.glow(L, BCV, px, py, 3, 0.2 * (1 - age / life) * lt.flicker(i, f, seed))

    col = pfx.paint(m, PAL)
    col[..., 3] = (np.clip(alpha, 0, 1) * 255 * (m >= 0)).astype(np.uint8)
    light = pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), LIGHT_RAMP)
    return col, light, L


# ---------------------------------------------------------------- the aura (seamless loop)
AW, AH, APX, APY, AN = 100, 110, 50, 100, 30
AX, AY = fl.grid(AW, AH, APX, APY)
ACV = SimpleNamespace(x=AX, y=AY)


def aura_frame(f, seed=SEED):
    L = lt.buffer(ACV)
    m = np.full(AX.shape, -1, np.int8)
    alpha = np.zeros(AX.shape)
    ph = 2 * math.pi * f / AN

    # body glow (the aura is a light source: wide soft pool + a tighter one round the chest)
    lt.glow(L, ACV, 0, -32, 34, 0.12 + 0.03 * math.sin(ph * 2))
    lt.glow(L, ACV, 0, -36, 16, 0.1)
    # rotating rune ring on the ground
    rx, ry = 22.0, 7.0
    dd = np.abs(np.hypot(AX / rx, AY / ry) - 1) * rx
    ang = np.arctan2(AY / ry, AX / rx)
    dash = (np.floor((ang + ph * 0.5 + math.pi) / 0.4) % 3) != 0
    ring = (dd < 0.9) & dash
    m[ring] = 3
    alpha[ring] = 1.0
    tick = (dd < 2.2) & ((np.floor((ang + ph * 0.5 + math.pi) / 0.4) % 3) == 0) & (np.abs(dd) < 2.2)
    m[tick & (m < 0)] = 4
    alpha[tick] = 0.8
    lt.glow_ring(L, ACV, 0, 0, rx, 3, 0.22, flat=ry / rx)

    # flame tongues licking up round the body outline (each loops on the 30-frame cycle)
    for i in range(14):
        h = lambda s: fk.hsh(i, s + seed)             # noqa: E731
        age = (f + h(1) * AN) % AN / AN                # 0..1 within the loop
        side = -1 if i % 2 else 1
        bx = side * (11 + 6 * h(2))
        by = -6 - 46 * h(3)
        x0 = bx * (1 - 0.25 * age) + math.sin(age * 6 + i) * 1.2
        y0 = by - age * 20
        size = (1 - age) * (2.8 + 1.6 * h(4))
        if size < 0.5:
            continue
        pts = [(x0, y0 + size * 2.2), (x0 + side * 0.4, y0), (x0 - side * 0.6, y0 - size * 2.6)]
        d, t, _ = fl.stroke(AX, AY, pts, size * 1.6, 0.3)
        on = d < 0
        tone = np.where(t < 0.25, 5, np.where(t < 0.6, 4, 3))
        m[on] = tone[on] if age < 0.5 else np.minimum(tone[on], 4)
        alpha[on] = np.maximum(alpha[on], 0.9 - age * 0.5)
        lt.glow(L, ACV, x0, y0, 4.5, 0.22 * (1 - age))
    # sparkles orbiting the body
    for i in range(6):
        a = ph + i * math.pi / 3
        sx, sy = math.cos(a) * 20, -30 + math.sin(a) * 6 - i * 3
        fk.twinkle(m, sx + APX - 0.5, sy + APY - 0.5, 1, 5, 4)
        xi, yi = int(round(sx + APX - 0.5)), int(round(sy + APY - 0.5))
        alpha[max(0, yi - 1):yi + 2, max(0, xi - 1):xi + 2] = np.maximum(alpha[max(0, yi - 1):yi + 2, max(0, xi - 1):xi + 2], 1.0)
        lt.glow(L, ACV, sx, sy, 3, 0.25 * lt.flicker(i, f, seed))

    m = np.where((m < 0) & (fl.outline(m, 0) == 0) & (alpha == 0), -1, m)
    col = pfx.paint(m, PAL)
    col[..., 3] = (np.clip(alpha, 0, 1) * 255 * (m >= 0)).astype(np.uint8)
    light = pfx.tint(np.repeat(np.clip(L, 0, 1)[..., None], 3, -1), LIGHT_RAMP)
    return col, light, L


# ---------------------------------------------------------------- output
def measure(cols, Ls, name):
    covers, means = [], []
    for c, Lr in zip(cols, Ls):
        ys, xs = np.nonzero(c[..., 3])
        if len(ys) == 0:
            continue
        b = np.clip(Lr[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 1)
        if (b > 0.03).any():
            covers.append((b > 0.03).mean()); means.append(b[b > 0.03].mean())
    print(f"{name} light: cover {np.median(covers) * 100:.0f} %  mean {np.median(means):.3f}")


def build(name, render, n, w, h, pivot, loop, states=None, peak_only=False):
    frames = [n // 2] if peak_only else range(n)
    cols, lights, finals, Ls = [], [], [], []
    for f in frames:
        c, l, Lr = render(f)
        cols.append(c); lights.append(l); Ls.append(Lr); finals.append(pfx.composite(c, l))
    if peak_only:
        return finals
    measure(cols, Ls, name)
    meta = ex.write(OUT, name, finals, FPS, pivot, loop, light=lights, color=cols, states=states,
                    extra=dict(fc.meta("side", w, h, pivot), glow="strong"))
    fc.check(meta["meta"]["beanfx"])
    pfx.gif(finals, OUT / f"{name}.gif", FPS, scale=3)
    pfx.contact(OUT / f"{name}_contact.png", finals, FPS)
    problems = ex.check(finals, lights, loop=loop, src=__file__)
    problems += ex.check_seeds(lambda f, sd: render(f, seed=sd)[0], n)
    try:
        ex.page(OUT / f"{name}.json")
    except Exception as e:
        print("page skipped:", e)
    return problems


def main():
    OUT.mkdir(exist_ok=True)
    if "--peak" in sys.argv:
        from PIL import Image
        caster = None
        try:
            import rig
            r = rig.load(str(HERE.parent.parent / "assets" / "casters" / "vo_tu_topdown"))
            caster = r.place((BH, BW), (BPX, BPY), "cast", 4, "south")
        except Exception as e:
            print("caster preview skipped:", e)
        tiles = []
        for f in (4, 9, 16, 30):
            c, l, _ = bell_frame(f)
            fr = pfx.composite(c, l)
            if caster is not None:
                under = caster.copy()
                a = fr[..., 3:4] / 255.0
                under[..., :3] = (fr[..., :3] * a + caster[..., :3] * (1 - a)).astype(np.uint8)
                under[..., 3] = np.maximum(fr[..., 3], caster[..., 3])
                fr = under
            tiles.append(pfx.composite(fr, np.zeros((BH, BW, 3)), "#3e7b3a")[..., :3])
        c, l, _ = aura_frame(10)
        au = pfx.composite(pfx.composite(c, l), np.zeros((AH, AW, 3)), "#3e7b3a")
        pad = np.zeros((BH, BW, 3), np.uint8); pad[:] = (62, 123, 58)
        pad[BH - AH - 10:BH - 10, 20:20 + AW] = au[..., :3]
        tiles.append(pad)
        big = np.concatenate(tiles, axis=1)
        Image.fromarray(big).resize((big.shape[1] * 3, big.shape[0] * 3), Image.NEAREST).save(OUT / "peak_3x.png")
        print("peak written")
        return
    problems = build("kim_chung_trao", bell_frame, BN, BW, BH, (BPX, BPY), False, BELL_STATES)
    problems += build("kim_chung_aura", aura_frame, AN, AW, AH, (APX, APY), True)
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    print("ok: kim_chung_trao + kim_chung_aura")


if __name__ == "__main__":
    main()
