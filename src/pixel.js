// Bộ công cụ vẽ pixel lên canvas (dùng để sinh sprite tạm thời bằng code).
window.TT = window.TT || {};

TT.Pixel = (function () {
  const P = {};

  P.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  };

  // RNG có seed (xorshift) để map/sprite luôn giống nhau mỗi lần chạy
  P.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  P.rect = function (ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };

  P.ellipse = function (ctx, cx, cy, rx, ry, col) {
    ctx.fillStyle = col;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  // Bresenham với "cọ" vuông kích thước b
  P.line = function (ctx, x0, y0, x1, y1, col, b) {
    b = b || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = b >> 1;
    ctx.fillStyle = col;
    for (;;) {
      ctx.fillRect(x0 - o, y0 - o, b, b);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };

  P.poly = function (ctx, pts, col, b) {
    for (let i = 1; i < pts.length; i++) P.line(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, b);
  };

  // Viền 1px quanh các pixel đặc trong một vùng (từng frame)
  P.outline = function (ctx, x0, y0, w, h, col) {
    const img = ctx.getImageData(x0, y0, w, h), d = img.data;
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
    ctx.fillStyle = col;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (a(x, y) === 0 && (a(x - 1, y) > 0 || a(x + 1, y) > 0 || a(x, y - 1) > 0 || a(x, y + 1) > 0)) {
          ctx.fillRect(x0 + x, y0 + y, 1, 1);
        }
      }
    }
  };

  // Đăng ký canvas thành texture Phaser, cắt thành các frame đánh số 0..n-1
  P.addSheet = function (scene, key, canvas, fw, fh) {
    const tex = scene.textures.addCanvas(key, canvas);
    const cols = Math.floor(canvas.width / fw), rows = Math.floor(canvas.height / fh);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tex.add(i++, 0, c * fw, r * fh, fw, fh);
    return tex;
  };

  return P;
})();
