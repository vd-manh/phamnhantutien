"""Đóng gói hiệu ứng beanfx đã render (thư mục out/ của một draft) thành sprite sheet dạng lưới cho game.

beanfx xuất nhiều kiểu: dải ngang rất dài (có thể vượt giới hạn texture 16384 px của GPU),
lưới, hoặc nhiều trang Aseprite. Script này đọc mọi kiểu, rồi:
  - cắt bỏ phần trong suốt chung của mọi frame (chỉnh lại pivot/target cho khớp),
  - giảm fps xuống tối đa --max-fps và bỏ bớt frame nếu tổng số pixel vượt --max-px,
  - xếp lại thành lưới rộng tối đa 4096 px,
  - ghi assets/fx/<tên>/<tên>.png + <tên>.json và cập nhật assets/fx/manifest.json.

Ảnh dùng là bản đã gộp sẵn lớp sáng (<tên>.png), đọc tốt trên nền tối lẫn sáng.

Cần Pillow:  python tools/pack_beanfx.py <thư_mục_out> [--name ten] [--speed 1.0] [--max-fps 30] [--max-px 9000000]
"""
import argparse
import json
import math
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_SIDE = 4096


def load_frames(out_dir, name):
    meta = json.load(open(os.path.join(out_dir, name + ".json"), encoding="utf8"))
    frames = []
    if "meta" in meta and "beanfx" in meta["meta"]:                    # Aseprite (có thể nhiều trang)
        b = meta["meta"]["beanfx"]
        pages = b.get("pages") or [{"image": name + ".png"}]
        imgs = {}
        for e in meta["frames"]:
            p = e.get("page", 0)
            if p not in imgs:
                imgs[p] = Image.open(os.path.join(out_dir, pages[p]["image"])).convert("RGBA")
            f = e["frame"]
            frames.append(imgs[p].crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])))
        info = {"w": b["frameSize"][0], "h": b["frameSize"][1], "fps": b["fps"], "pivot": b["pivot"],
                "target": b.get("target") if isinstance(b.get("target"), list) else None,
                "loop": b.get("loop", False), "states": b.get("states") or {},
                "hits": [h["t"] for h in (b.get("act") or {}).get("hits", [])]}
    else:                                                                # dạng đơn giản: dải hoặc lưới
        w, h, n = meta["w"], meta["h"], meta["frames"]
        img = Image.open(os.path.join(out_dir, name + ".png")).convert("RGBA")
        cols = img.width // w
        for i in range(n):
            x, y = (i % cols) * w, (i // cols) * h
            frames.append(img.crop((x, y, x + w, y + h)))
        info = {"w": w, "h": h, "fps": meta["fps"], "pivot": meta.get("pivot", [w / 2, h / 2]),
                "target": meta.get("target"), "loop": meta.get("loop", False),
                "states": meta.get("states") or {}, "hits": [hh["t"] for hh in meta.get("hits", []) if "t" in hh]}
    return frames, info


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")      # console Windows mặc định không in được tiếng Việt
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("--name")
    ap.add_argument("--speed", type=float, default=1.0, help="tốc độ phát trong game (1.4 = nhanh hơn 40%%)")
    ap.add_argument("--max-fps", type=float, default=30)
    ap.add_argument("--max-px", type=int, default=9_000_000)
    a = ap.parse_args()

    name = a.name or [f[:-5] for f in os.listdir(a.out_dir)
                      if f.endswith(".json") and not re.search(r"_p\d+\.json$", f)][0]
    frames, info = load_frames(a.out_dir, name)
    fps0 = info["fps"]

    # vùng có nội dung chung của mọi frame (+2 px lề)
    box = None
    for f in frames:
        bb = f.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if bb:
            box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = max(0, x0 - 2), max(0, y0 - 2), min(info["w"], x1 + 2), min(info["h"], y1 + 2)
    fw, fh = x1 - x0, y1 - y0

    step = max(1, math.ceil(fps0 / a.max_fps))
    while True:
        keep = frames[::step]
        n = len(keep)
        cols = max(1, min(n, MAX_SIDE // fw))
        rows = math.ceil(n / cols)
        if n * fw * fh <= a.max_px and rows * fh <= MAX_SIDE:
            break
        step += 1

    sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(keep):
        sheet.paste(f.crop((x0, y0, x1, y1)), ((i % cols) * fw, (i // cols) * fh))

    dest = os.path.join(ROOT, "assets", "fx", name)
    os.makedirs(dest, exist_ok=True)
    sheet.save(os.path.join(dest, name + ".png"), optimize=True)

    shift = lambda p: [round(p[0] - x0, 1), round(p[1] - y0, 1)] if p else None
    out = {
        "tt": 1, "name": name, "w": fw, "h": fh, "frames": n, "columns": cols,
        "fps": round(fps0 / step, 3), "speed": a.speed, "loop": bool(info["loop"]),
        "pivot": shift(info["pivot"]), "target": shift(info["target"]),
        # mốc thời gian tính bằng giây theo tốc độ gốc (game tự chia cho speed)
        "states": {k: [round(v[0] / fps0, 3), round((v[1] + 1) / fps0, 3)] for k, v in info["states"].items()},
        "hits": info["hits"],
        "duration": round(len(frames) / fps0, 3)
    }
    json.dump(out, open(os.path.join(dest, name + ".json"), "w", encoding="utf8"), indent=1)

    man_path = os.path.join(ROOT, "assets", "fx", "manifest.json")
    man = json.load(open(man_path, encoding="utf8")) if os.path.exists(man_path) else {"effects": {}}
    man.setdefault("effects", {})[name] = {"sheet": name + "/" + name + ".png", "json": name + "/" + name + ".json", "w": fw, "h": fh}
    json.dump(man, open(man_path, "w", encoding="utf8"), indent=2, ensure_ascii=False)

    mb = sheet.width * sheet.height * 4 / 1e6
    print(f"{name}: {len(frames)} -> {n} frame {fw}x{fh} @ {out['fps']} fps, lưới {cols}x{rows} "
          f"({sheet.width}x{sheet.height}, ~{mb:.0f} MB VRAM), pivot {out['pivot']} target {out['target']}")


if __name__ == "__main__":
    sys.exit(main())
