"""Web server cục bộ cho game, luôn gửi header chống cache để trình duyệt
không dùng lại file JS/JSON cũ sau khi sửa code hoặc đổi asset.

Chạy:  python tools/serve.py [cổng]   (mặc định 8080), từ thư mục gốc của game.
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    print(f"Thanh Van Tu Tien: http://localhost:{port}/  (Ctrl+C de dung)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
