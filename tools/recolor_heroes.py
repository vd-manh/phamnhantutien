"""Đổi bảng màu bộ nhân vật "hero-128" (gegx.itch.io, giấy phép: dùng mọi dự án, không bán lại asset)
sang tông tu tiên, giữ nguyên nét vẽ. Mỗi quy tắc: khoảng màu (hue) + độ bão hoà tối thiểu -> hue/sat mới,
độ sáng biến đổi tuyến tính. Da và đồ da (hue 10..45, sáng vừa) được giữ nguyên.

Chạy:  python tools/recolor_heroes.py <thư_mục_giải_nén> <thư_mục_ra> [--preview]
"""
import colorsys
import glob
import os
import sys

from PIL import Image

# hero -> (tên tông môn, [ (h0, h1, smin, new_h, new_s, l_mul, l_add) ])
RULES = {
    "knight": ("kiem", [(185, 245, 0.3, 215, 0.10, 0.42, 0.52)]),             # áo choàng xanh (giáp thép giữ nguyên) -> bạch y
    "mage":   ("phap", [(235, 310, 0.12, 268, 0.55, 0.95, 0.02)]),            # tím -> tím đạo bào đậm hơn
    "rogue":  ("quy",  [(180, 250, 0.08, 350, 0.30, 0.55, 0.0),               # lam xám -> đen ánh đỏ
                        (270, 320, 0.15, 352, 0.75, 0.9, 0.05)]),             # tím -> đỏ máu
    "archer": ("tien", [(55, 130, 0.12, 168, 0.55, 0.95, 0.03)]),             # lá -> xanh ngọc
}


def recolor_px(c, rules):
    r, g, b, a = c
    if a == 0:
        return c
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hd = h * 360
    for h0, h1, smin, nh, ns, lm, la in rules:
        if h0 <= hd <= h1 and s >= smin:
            nl = max(0.0, min(1.0, l * lm + la))
            rr, gg, bb = colorsys.hls_to_rgb(nh / 360, nl, ns * min(1.0, s / 0.4))
            return (round(rr * 255), round(gg * 255), round(bb * 255), a)
    return c


def recolor_img(im, rules, cache):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3]:
                if c not in cache:
                    cache[c] = recolor_px(c, rules)
                px[x, y] = cache[c]
    return im


def main():
    src, dst = sys.argv[1], sys.argv[2]
    preview = "--preview" in sys.argv
    os.makedirs(dst, exist_ok=True)
    tiles = []
    for hero, (sect, rules) in RULES.items():
        root = os.path.join(src, hero, hero + "-hero-128")
        cache = {}
        if preview:
            row = []
            for d in ("south", "south-east", "east", "north-east", "north"):
                a = Image.open(os.path.join(root, "static", d + ".png")).convert("RGBA")
                b = recolor_img(a.copy(), rules, cache)
                row += [a, b]
            tiles.append(row)
            continue
        for f in glob.glob(os.path.join(root, "*", "*.png")):
            rel = os.path.relpath(f, root)
            out = os.path.join(dst, sect, rel)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            recolor_img(Image.open(f), rules, cache).save(out)
        print("recoloured", hero, "->", sect)
    if preview:
        cw = max(t.width for row in tiles for t in row)
        sheet = Image.new("RGBA", (cw * 10, cw * len(tiles)), (62, 123, 58, 255))
        for j, row in enumerate(tiles):
            for i, t in enumerate(row):
                sheet.alpha_composite(t, (i * cw + (cw - t.width) // 2, j * cw + (cw - t.height)))
        sheet.save(os.path.join(dst, "recolor_preview.png"))
        print("preview ok")


if __name__ == "__main__":
    main()
