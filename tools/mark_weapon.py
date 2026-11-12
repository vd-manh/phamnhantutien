"""Trang đánh dấu vũ khí trong từng khung nhân vật (cho lớp vũ khí tách rời).

Chạy:  python tools/mark_weapon.py [bộ] [cổng]      (mặc định: kiem_ai 8090)
       rồi mở http://localhost:8090/

- Lần đầu: tách mọi khung game thực sự dùng, chạy dò kiếm tự động (vài phút), lưu đệm ở
  drafts/weapon_layer/out/cells/ (không đưa lên git).
- Mỗi khung: chuôi (chỗ bàn tay nắm) + mũi kiếm, hoặc "không có kiếm", cờ "sau lưng".
- Kết quả lưu vào sword/weapon_marks.json theo toạ độ ẢNH NGUỒN, khoá "<nguồn>/<hàng>/<khung>".
"""
import glob
import json
import os
import sys
import threading
import http.server
import urllib.parse

import numpy as np
from PIL import Image
import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_sheet                      # noqa: E402
from weapon_detect import detect     # noqa: E402

ROOT = ai_sheet.ROOT
CACHE = os.path.join(ROOT, "drafts", "weapon_layer", "out", "cells")
MARKS = os.path.join(ROOT, "sword", "weapon_marks.json")
NORM_H = 400                          # chuẩn hoá chiều cao đứng trước khi dò (bộ dò chỉnh cho cỡ này)
LOCK = threading.Lock()


def used_cells(cfg):
    """(nguồn, hàng, khung) mà các động tác (trừ bay) thực sự dùng."""
    out = []
    for anim, (dset, row, idx, *_rest) in cfg["anims"].items():
        for d, (src, _flip) in cfg["dirsets"][dset].items():
            if src.startswith("fly"):
                continue
            for i in idx:
                k = (src, row, i)
                if k not in out:
                    out.append(k)
    return out


def prepare(key):
    cfg = ai_sheet.SETS[key]
    os.makedirs(CACHE, exist_ok=True)
    auto_path = os.path.join(CACHE, key + "_auto.json")
    cells = used_cells(cfg)
    if os.path.exists(auto_path):
        with open(auto_path, encoding="utf8") as f:
            items = json.load(f)
        want = [f"{s}/{r}/{i}" for s, r, i in cells]
        src_files = [f for s in {c[0] for c in cells}
                     for f in glob.glob(os.path.join(ROOT, cfg["sources"][s]["path"]))]
        fresh = all(os.path.getmtime(f) <= os.path.getmtime(auto_path) for f in src_files)
        if fresh and sorted(it["key"] for it in items) == sorted(want):
            return items
    items = []
    srcs = sorted({c[0] for c in cells})
    for sname in srcs:
        src = cfg["sources"][sname]
        boxes = []
        grid = ai_sheet.split(src, boxes)
        names = src["names"]
        ref = grid[0][0] if src["rows"] > 1 else grid[0][0]
        k = NORM_H / max(ai_sheet.stand_height(ref), 1)
        for (s2, row, i) in cells:
            if s2 != sname:
                continue
            r = names.index(row)
            cell = grid[r][i]
            rgb = cell[..., :3].astype(float)
            a = cell[..., 3:4] / 255.0
            fr = (rgb * a + 255 * (1 - a)).astype(np.uint8)
            fname = f"{sname}__{row}__{i}.png"
            Image.fromarray(fr).save(os.path.join(CACHE, fname))
            big = cv2.resize(fr, None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC)
            B = 60
            big = cv2.copyMakeBorder(big, B, B, B, B, cv2.BORDER_CONSTANT, value=(255, 255, 255))
            res = detect(big, cx=big.shape[1] / 2)
            ox, oy = boxes[r][i]
            auto = None
            if res is not None:
                tosrc = lambda p: [round(float((p[0] - B) / k) + ox, 1), round(float((p[1] - B) / k) + oy, 1)]
                auto = {"grip": tosrc(res["grip"]), "tip": tosrc(res["tip"])}
            items.append({"key": f"{sname}/{row}/{i}", "img": fname, "ox": int(ox), "oy": int(oy),
                          "w": int(fr.shape[1]), "h": int(fr.shape[0]), "auto": auto})
            print(f"  {sname}/{row}/{i}: {'dò được' if auto else 'không dò được'}", flush=True)
    with open(auto_path, "w", encoding="utf8") as f:
        json.dump(items, f, ensure_ascii=False)
    return items


def load_marks():
    if os.path.exists(MARKS):
        with open(MARKS, encoding="utf8") as f:
            return json.load(f)
    return {"version": 1, "note": "Đánh dấu vũ khí từng khung (toạ độ ảnh nguồn). Tạo bằng tools/mark_weapon.py", "marks": {}}


def save_marks(data):
    tmp = MARKS + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, MARKS)


def make_handler(key, items):
    html_path = os.path.join(ROOT, "tools", "mark_weapon.html")

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def send(self, code, body, ctype):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            p = urllib.parse.urlparse(self.path).path
            if p in ("/", "/index.html"):
                with open(html_path, "rb") as f:
                    self.send(200, f.read(), "text/html; charset=utf-8")
            elif p == "/api/items":
                with LOCK:
                    marks = load_marks()["marks"]
                body = json.dumps({"set": key, "items": items, "marks": marks}, ensure_ascii=False).encode("utf8")
                self.send(200, body, "application/json; charset=utf-8")
            elif p.startswith("/cells/"):
                fn = os.path.basename(urllib.parse.unquote(p[7:]))
                fp = os.path.join(CACHE, fn)
                if not os.path.exists(fp):
                    self.send(404, b"", "text/plain")
                    return
                with open(fp, "rb") as f:
                    self.send(200, f.read(), "image/png")
            else:
                self.send(404, b"", "text/plain")

        def do_POST(self):
            if urllib.parse.urlparse(self.path).path != "/api/mark":
                self.send(404, b"", "text/plain")
                return
            n = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(n).decode("utf8"))
            k, mark = req["key"], req.get("mark")
            with LOCK:
                data = load_marks()
                if mark is None:
                    data["marks"].pop(k, None)
                else:
                    data["marks"][k] = mark
                save_marks(data)
            self.send(200, b'{"ok":true}', "application/json")

    return H


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:]]
    key = args[0] if args and not args[0].isdigit() else "kiem_ai"
    port = int(next((a for a in args if a.isdigit()), 8090))
    print(f"Chuẩn bị khung của bộ {key}...", flush=True)
    items = prepare(key)
    print(f"{len(items)} khung. Mở http://localhost:{port}/  (Ctrl+C để dừng)", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), make_handler(key, items)).serve_forever()


if __name__ == "__main__":
    main()
