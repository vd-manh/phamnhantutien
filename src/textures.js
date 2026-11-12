// Sinh toàn bộ pixel art tạm thời bằng code. Khi có asset thật (beanfx, Aseprite...)
// chỉ cần nạp texture cùng key là thay thế được.
window.TT = window.TT || {};

TT.Textures = (function () {
  const Px = TT.Pixel;
  const OUT = '#140f1c';
  const C = {
    hair: '#2a2140', hairHi: '#4a3d6e', skin: '#f3cfa6', skinSh: '#d9a27c', eye: '#1a1420',
    robe: '#eef2f7', robeSh: '#b4c3d6', robeDk: '#7d8fab', sash: '#3fb6c8', sashDk: '#26798f',
    gold: '#f2c94c', boot: '#3b2f4f', blade: '#e3eeff', bladeSh: '#8ea6c8', hilt: '#7a4b2a', sheath: '#3a2f55'
  };

  // ---------- Nhân vật tu sĩ (32x24 / frame, quay sang phải) ----------
  function drawHead(ctx, cx, hy, closed) {
    Px.ellipse(ctx, cx + 0.5, hy, 4.2, 4.2, C.skin);
    Px.ellipse(ctx, cx - 0.5, hy - 1.5, 4.6, 3.6, C.hair);
    Px.rect(ctx, cx + 1, hy - 1, 3, 3, C.skin);
    Px.rect(ctx, cx + 4, hy - 1, 1, 2, C.skin);
    if (closed) Px.rect(ctx, cx + 2, hy + 0, 2, 1, C.eye);
    else Px.rect(ctx, cx + 3, hy - 1, 1, 2, C.eye);
    Px.rect(ctx, cx + 1, hy + 2, 2, 1, C.skinSh);
    Px.rect(ctx, cx - 4, hy + 1, 2, 5, C.hair);            // tóc dài phía sau
    Px.ellipse(ctx, cx - 1, hy - 5.5, 2.2, 1.8, C.hair);   // búi tóc
    Px.rect(ctx, cx - 2, hy - 4, 3, 1, C.hairHi);
    Px.rect(ctx, cx - 2, hy - 6, 1, 1, C.hairHi);
    Px.rect(ctx, cx - 4, hy - 5, 1, 1, C.gold);            // trâm cài
    Px.rect(ctx, cx + 1, hy - 6, 1, 1, C.gold);
  }

  function drawStanding(ctx, cx, top, b, legL, legR, pose) {
    const T = top + b;
    // giày
    Px.rect(ctx, cx - 3 + legL, top + 20, 2, 2, C.boot);
    Px.rect(ctx, cx + 1 + legR, top + 20, 2, 2, C.boot);
    // tay áo phía sau
    Px.rect(ctx, cx - 6, T + 13, 2, 4, C.robeSh);
    // tư thế vung kiếm lên (sau lưng đầu)
    if (pose === 'atk0') {
      Px.line(ctx, cx - 2, T + 9, cx - 10, T + 2, C.blade, 1);
      Px.rect(ctx, cx - 2, T + 9, 2, 1, C.gold);
      Px.rect(ctx, cx - 1, T + 10, 3, 4, C.robe);
    }
    // thân áo bào
    for (let y = 0; y < 8; y++) {
      const t = y / 7, half = Math.round(3 + t * 2.5), yy = T + 12 + y;
      Px.rect(ctx, cx - half, yy, half * 2, 1, y === 7 ? C.robeSh : C.robe);
      Px.rect(ctx, cx - half, yy, 1, 1, C.robeSh);
    }
    Px.rect(ctx, cx, T + 12, 1, 1, C.skin);                 // cổ áo chéo
    Px.rect(ctx, cx + 1, T + 13, 1, 1, C.robeDk);
    Px.rect(ctx, cx, T + 14, 1, 1, C.robeDk);
    Px.rect(ctx, cx - 4, T + 15, 8, 1, C.sash);             // đai lưng
    Px.rect(ctx, cx - 5, T + 16, 1, 2, C.sashDk);
    // vỏ kiếm bên hông
    Px.line(ctx, cx - 4, T + 17, cx - 8, T + 20, C.sheath, 1);
    Px.rect(ctx, cx - 3, T + 16, 1, 1, C.gold);
    if (pose === 'idle') { Px.rect(ctx, cx - 2, T + 15, 1, 1, C.hilt); Px.rect(ctx, cx - 1, T + 14, 1, 1, C.hilt); }
    // tay trước
    if (pose === 'idle') {
      Px.rect(ctx, cx + 2, T + 13, 3, 4, C.robe);
      Px.rect(ctx, cx + 4, T + 13, 1, 4, C.robeSh);
      Px.rect(ctx, cx + 3, T + 17, 2, 1, C.skin);
    } else if (pose === 'atk1') {
      Px.rect(ctx, cx + 2, T + 13, 5, 2, C.robe);
      Px.rect(ctx, cx + 2, T + 15, 5, 1, C.robeSh);
      Px.rect(ctx, cx + 7, T + 14, 1, 1, C.skin);
      Px.rect(ctx, cx + 8, T + 13, 1, 3, C.gold);
      Px.rect(ctx, cx + 9, T + 14, 6, 1, C.blade);
      Px.rect(ctx, cx + 9, T + 15, 5, 1, C.bladeSh);
    } else if (pose === 'atk2') {
      Px.rect(ctx, cx + 2, T + 14, 4, 3, C.robe);
      Px.rect(ctx, cx + 5, T + 17, 2, 1, C.skin);
      Px.rect(ctx, cx + 6, T + 17, 1, 2, C.gold);
      Px.line(ctx, cx + 7, T + 18, cx + 12, T + 20, C.blade, 1);
    } else if (pose === 'cast') {
      Px.rect(ctx, cx + 2, T + 12, 4, 3, C.robe);
      Px.rect(ctx, cx + 2, T + 14, 4, 1, C.robeSh);
      Px.rect(ctx, cx + 6, T + 12, 2, 2, C.skin);
      Px.rect(ctx, cx + 8, T + 10, 2, 2, '#bff1ff');
      Px.rect(ctx, cx + 9, T + 9, 1, 1, '#ffffff');
    }
    drawHead(ctx, cx, T + 8, false);
  }

  function drawSitting(ctx, cx, top, b) {
    Px.line(ctx, cx - 6, top + 14, cx - 10, top + 20, C.sheath, 1);
    for (let y = 0; y < 7; y++) {
      const half = Math.round(4 + y * 0.85), yy = top + 15 + y;
      Px.rect(ctx, cx - half, yy, half * 2 + 1, 1, y === 6 ? C.robeSh : C.robe);
      Px.rect(ctx, cx - half, yy, 1, 1, C.robeSh);
    }
    Px.rect(ctx, cx - 4, top + 17, 9, 1, C.sash);
    Px.rect(ctx, cx + 1, top + 18, 3, 2, C.skin);
    if (b) Px.rect(ctx, cx + 2, top + 17, 1, 1, '#bff1ff');
    drawHead(ctx, cx, top + 11 + b, true);
  }

  function heroSheet(scene) {
    const FW = 32, FH = 24;
    const frames = [
      ['idle', 0, 0, 0], ['idle', 1, 0, 0],                                         // 0-1 đứng
      ['idle', 0, -1, 1], ['idle', 1, 0, 0], ['idle', 0, 1, -1], ['idle', 1, 0, 0], // 2-5 chạy
      ['atk0', 0, 0, 0], ['atk1', 0, 0, 0], ['atk2', 0, 0, 0],                       // 6-8 chém
      ['cast', 0, 0, 0],                                                             // 9 thi pháp
      ['sit', 0], ['sit', 1]                                                         // 10-11 thiền
    ];
    const cv = Px.canvas(FW * frames.length, FH), ctx = cv.getContext('2d');
    frames.forEach((f, i) => {
      const ox = i * FW, cx = ox + 16;
      if (f[0] === 'sit') drawSitting(ctx, cx, 0, f[1]);
      else drawStanding(ctx, cx, 0, f[1], f[2], f[3], f[0]);
      Px.outline(ctx, ox, 0, FW, FH, OUT);
    });
    Px.addSheet(scene, 'hero', cv, FW, FH);
  }

  // ---------- Yêu thú dạng linh thể (20x16 / frame) ----------
  function slimeSheet(scene, key, pal, horns) {
    const FW = 20, FH = 16;
    const cv = Px.canvas(FW * 4, FH), ctx = cv.getContext('2d');
    [0, 1, 0, -1].forEach((sq, f) => {
      const ox = f * FW, cx = ox + 10;
      const rx = 6.5 + sq * 0.8, ry = 5 - sq * 0.8, cy = 14.5 - ry;
      if (horns) {
        Px.rect(ctx, cx - 4, cy - ry - 1, 1, 2, '#f2e6c8');
        Px.rect(ctx, cx + 3, cy - ry - 1, 1, 2, '#f2e6c8');
      }
      Px.ellipse(ctx, cx, cy, rx, ry, pal[0]);
      Px.ellipse(ctx, cx - 0.6, cy - 0.6, rx - 1.1, ry - 1.1, pal[1]);
      Px.rect(ctx, cx - 4, cy - ry + 2, 2, 1, pal[2]);
      Px.rect(ctx, cx - 4, cy - ry + 3, 1, 1, pal[2]);
      Px.rect(ctx, cx - 1, cy - 1, 1, 2, '#1a1420');
      Px.rect(ctx, cx + 3, cy - 1, 1, 2, '#1a1420');
      Px.rect(ctx, cx - 1, cy - 1, 1, 1, '#ffffff');
      Px.rect(ctx, cx + 3, cy - 1, 1, 1, '#ffffff');
      Px.outline(ctx, ox, 0, FW, FH, OUT);
    });
    Px.addSheet(scene, key, cv, FW, FH);
  }

  // ---------- Cảnh vật ----------
  function tree(scene, key, pal, seed) {
    const cv = Px.canvas(32, 40), ctx = cv.getContext('2d'), r = Px.rng(seed);
    Px.rect(ctx, 14, 26, 5, 12, '#5a3a28');
    Px.rect(ctx, 17, 26, 2, 12, '#41291d');
    Px.rect(ctx, 12, 36, 9, 2, '#5a3a28');
    Px.ellipse(ctx, 16, 17, 14, 11, pal[0]);
    Px.ellipse(ctx, 14.5, 14.5, 11, 8.5, pal[1]);
    Px.ellipse(ctx, 12, 11, 6.5, 5, pal[2]);
    for (let i = 0; i < 18; i++) {
      const x = 5 + ((r() * 22) | 0), y = 8 + ((r() * 16) | 0);
      Px.rect(ctx, x, y, 1, 1, r() < 0.5 ? pal[2] : pal[0]);
    }
    Px.outline(ctx, 0, 0, 32, 40, OUT);
    scene.textures.addCanvas(key, cv);
  }

  function rock(scene) {
    const cv = Px.canvas(16, 12), ctx = cv.getContext('2d');
    Px.ellipse(ctx, 8, 7, 6.5, 4.5, '#5f6676');
    Px.ellipse(ctx, 7, 6, 5, 3.2, '#8a93a3');
    Px.rect(ctx, 5, 4, 3, 1, '#b4bccb');
    Px.outline(ctx, 0, 0, 16, 12, OUT);
    scene.textures.addCanvas('rock', cv);
  }

  function spring(scene) {
    const cv = Px.canvas(64, 48), ctx = cv.getContext('2d');
    Px.ellipse(ctx, 32, 24, 31, 22, '#4d5260');
    Px.ellipse(ctx, 32, 23.5, 29.5, 20.5, '#7c8494');
    Px.ellipse(ctx, 32, 25, 25, 16, '#1d5f80');
    Px.ellipse(ctx, 32, 24, 23.5, 14.5, '#2f8fb0');
    Px.ellipse(ctx, 30, 22, 15, 8, '#57c3d8');
    Px.rect(ctx, 22, 18, 4, 1, '#bff1ff');
    Px.rect(ctx, 37, 28, 3, 1, '#bff1ff');
    Px.rect(ctx, 27, 31, 5, 1, '#8fe3ff');
    // hoa sen
    Px.ellipse(ctx, 41, 23, 3.2, 1.7, '#3b7a4b');
    Px.ellipse(ctx, 42, 21, 2, 1.6, '#f6c1da');
    Px.rect(ctx, 42, 20, 1, 1, '#ffffff');
    Px.ellipse(ctx, 20, 28, 2.6, 1.4, '#3b7a4b');
    // đá viền
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      Px.rect(ctx, 32 + Math.cos(a) * 30, 24 + Math.sin(a) * 21, 1, 1, '#4d5260');
    }
    scene.textures.addCanvas('spring', cv);
  }

  function stele(scene) {
    const cv = Px.canvas(16, 24), ctx = cv.getContext('2d');
    Px.rect(ctx, 3, 4, 10, 17, '#6d7586');
    Px.rect(ctx, 4, 3, 8, 1, '#6d7586');
    Px.rect(ctx, 5, 2, 6, 1, '#6d7586');
    Px.rect(ctx, 3, 4, 2, 17, '#8a93a3');
    [[7, 7], [9, 7], [8, 9], [7, 11], [9, 12], [8, 14], [7, 16], [9, 16], [8, 17]].forEach(p => Px.rect(ctx, p[0], p[1], 1, 1, '#7fe3ff'));
    Px.rect(ctx, 1, 20, 14, 2, '#4d5260');
    Px.outline(ctx, 0, 0, 16, 24, OUT);
    scene.textures.addCanvas('stele', cv);
  }

  function tiles() {
    const T = {};
    const grass = (seed, flowers) => {
      const c = Px.canvas(16, 16), x = c.getContext('2d'), r = Px.rng(seed);
      Px.rect(x, 0, 0, 16, 16, '#3e7b3a');
      for (let i = 0; i < 14; i++) Px.rect(x, (r() * 16) | 0, (r() * 16) | 0, 1, 1, '#356b33');
      for (let i = 0; i < 6; i++) Px.rect(x, (r() * 15) | 0, (r() * 14) | 0, 1, 2, '#5c9e4b');
      if (flowers) {
        for (let i = 0; i < 3; i++) {
          const fx = 2 + ((r() * 12) | 0), fy = 2 + ((r() * 12) | 0), col = r() < 0.5 ? '#f6c1da' : '#fff1a0';
          Px.rect(x, fx, fy, 1, 1, col); Px.rect(x, fx - 1, fy, 1, 1, col); Px.rect(x, fx + 1, fy, 1, 1, col);
          Px.rect(x, fx, fy - 1, 1, 1, col); Px.rect(x, fx, fy, 1, 1, '#ffd34d');
        }
      }
      return c;
    };
    T.grass = [grass(11), grass(23), grass(37), grass(51)];
    T.flower = grass(97, true);

    T.path = (() => {
      const c = Px.canvas(16, 16), x = c.getContext('2d'), r = Px.rng(5);
      Px.rect(x, 0, 0, 16, 16, '#9c7f55');
      for (let i = 0; i < 16; i++) Px.rect(x, (r() * 16) | 0, (r() * 16) | 0, 1, 1, r() < 0.5 ? '#8a6e48' : '#b39567');
      Px.rect(x, 4, 9, 2, 1, '#7c6342'); Px.rect(x, 11, 3, 2, 1, '#7c6342');
      return c;
    })();

    T.stone = (() => {
      const c = Px.canvas(16, 16), x = c.getContext('2d'), r = Px.rng(9);
      Px.rect(x, 0, 0, 16, 16, '#757b8a');
      for (let i = 0; i < 10; i++) Px.rect(x, (r() * 16) | 0, (r() * 16) | 0, 1, 1, '#868d9c');
      Px.rect(x, 0, 0, 16, 1, '#5c6170'); Px.rect(x, 0, 8, 16, 1, '#5c6170');
      Px.rect(x, 0, 0, 1, 8, '#5c6170'); Px.rect(x, 8, 8, 1, 8, '#5c6170');
      return c;
    })();
    return T;
  }

  // ---------- Hiệu ứng ----------
  function boltSheet(scene) {
    const FW = 40, FH = 176, IY = 170, r = Px.rng(77);
    const pts = (x1) => {
      const out = []; let x = x1 + ((r() * 16 - 8) | 0), y = 0;
      out.push([x, 0]);
      while (y < IY - 16) {
        y += 6 + ((r() * 9) | 0);
        const t = y / IY;
        x += (r() * 12 - 6) | 0;
        x = Math.round(x + (x1 - x) * t * 0.35);
        x = Math.max(5, Math.min(FW - 6, x));
        out.push([x, y]);
      }
      out.push([x1, IY]);
      return out;
    };
    const branches = (p) => {
      const out = [], n = 1 + ((r() * 2) | 0);
      for (let k = 0; k < n; k++) {
        const i = 2 + ((r() * (p.length - 5)) | 0);
        let x = p[i][0], y = p[i][1];
        const dir = r() < 0.5 ? -1 : 1, seg = [[x, y]];
        for (let j = 0; j < 3 + ((r() * 3) | 0); j++) {
          x = Math.max(3, Math.min(FW - 4, x + dir * (2 + ((r() * 5) | 0))));
          y += 5 + ((r() * 6) | 0);
          seg.push([x, y]);
        }
        out.push(seg);
      }
      return out;
    };
    const bolt = (c, p, br, core) => {
      br.forEach(s => Px.poly(c, s, '#5b3fd6', 3));
      Px.poly(c, p, '#5b3fd6', 5);
      br.forEach(s => Px.poly(c, s, '#8fd3ff', 1));
      Px.poly(c, p, '#8fd3ff', 3);
      Px.poly(c, p, '#ffffff', core);
    };
    const flare = (c, s) => {
      Px.ellipse(c, 20, IY, 10 * s, 3.5 * s, '#8fd3ff');
      Px.ellipse(c, 20, IY, 6 * s, 2 * s, '#ffffff');
    };
    const A = pts(20), Ab = branches(A), B = pts(20), Bb = branches(B);
    const cv = Px.canvas(FW * 6, FH), ctx = cv.getContext('2d');
    const frame = (i, alpha, fn) => {
      const t = Px.canvas(FW, FH); fn(t.getContext('2d'));
      ctx.globalAlpha = alpha; ctx.drawImage(t, i * FW, 0); ctx.globalAlpha = 1;
    };
    frame(0, 0.8, c => Px.poly(c, A.slice(0, Math.ceil(A.length * 0.6)), '#c9b8ff', 1));
    frame(1, 1, c => { bolt(c, A, Ab, 2); flare(c, 1); });
    frame(2, 1, c => { bolt(c, B, Bb, 2); flare(c, 1.3); });
    frame(3, 1, c => { bolt(c, A, Ab, 1); flare(c, 1); });
    frame(4, 0.5, c => { bolt(c, B, [], 1); flare(c, 0.8); });
    frame(5, 0.4, c => flare(c, 0.6));
    Px.addSheet(scene, 'bolt', cv, FW, FH);
    TT.Textures.boltOriginY = IY / FH;
  }

  function slashSheet(scene) {
    const S = 40, cv = Px.canvas(S * 4, S), ctx = cv.getContext('2d');
    const arcs = [[-85, -35, 1], [-85, 25, 1], [-55, 80, 1], [15, 85, 0.5]];
    arcs.forEach(([a0, a1, k], f) => {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - 20, dy = y + 0.5 - 20, rr = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx) * 180 / Math.PI;
        if (a < a0 || a > a1) continue;
        const u = (a - a0) / (a1 - a0), w = (1.5 + 4.5 * Math.sin(Math.PI * u)) * k;
        if (rr > 17 || rr < 17 - w) continue;
        const col = k < 1 ? (u > 0.6 ? '#8fe3ff' : '#3a9bd8') : (u > 0.72 ? '#ffffff' : u > 0.38 ? '#bff1ff' : '#58c4f0');
        Px.rect(ctx, f * S + x, y, 1, 1, col);
      }
    });
    Px.addSheet(scene, 'slash', cv, S, S);
  }

  function ringTex(scene, key, size, rIn, rOut, col, dotted) {
    const cv = Px.canvas(size, size), ctx = cv.getContext('2d'), c = size / 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (r >= rIn && r <= rOut && (!dotted || (x + y) % 3 === 0)) Px.rect(ctx, x, y, 1, 1, col);
    }
    return cv;
  }

  function misc(scene) {
    const dot = Px.canvas(2, 2); Px.rect(dot.getContext('2d'), 0, 0, 2, 2, '#ffffff');
    scene.textures.addCanvas('dot', dot);

    const orb = Px.canvas(8, 8), o = orb.getContext('2d');
    Px.ellipse(o, 4, 4, 3.6, 3.6, '#3aa7d8'); Px.ellipse(o, 4, 4, 2.5, 2.5, '#8fe3ff'); Px.rect(o, 3, 3, 2, 2, '#ffffff');
    scene.textures.addCanvas('orb', orb);

    const sh = Px.canvas(14, 5); Px.ellipse(sh.getContext('2d'), 7, 2.5, 7, 2.5, '#000000');
    scene.textures.addCanvas('shadow', sh);

    const sc = Px.canvas(26, 10), s = sc.getContext('2d');
    Px.ellipse(s, 13, 5, 12.5, 4.5, '#1a1410'); Px.ellipse(s, 13, 5, 7, 2.5, '#2b2018');
    scene.textures.addCanvas('scorch', sc);

    scene.textures.addCanvas('ring', ringTex(scene, 'ring', 64, 28.5, 31, '#ffffff'));

    const warn = ringTex(scene, 'warn', 40, 16.5, 18.5, '#ff4f7b');
    const w2 = ringTex(scene, 'w2', 40, 13.5, 14.6, '#ff8fb0', true);
    warn.getContext('2d').drawImage(w2, 0, 0);
    scene.textures.addCanvas('warn', warn);
    scene.textures.addCanvas('warnfill', ringTex(scene, 'warnfill', 40, 0, 18, '#ff3a6a'));

    const cl = Px.canvas(96, 32), c = cl.getContext('2d');
    [[20, 20, 18, 10], [45, 15, 22, 13], [70, 19, 20, 11], [86, 22, 9, 7]].forEach(e => Px.ellipse(c, e[0], e[1], e[2], e[3], '#241e38'));
    [[22, 17, 13, 6], [46, 12, 16, 8], [69, 16, 14, 6]].forEach(e => Px.ellipse(c, e[0], e[1], e[2], e[3], '#342c50'));
    [[40, 10, 6, 2], [62, 13, 5, 2]].forEach(e => Px.ellipse(c, e[0], e[1], e[2], e[3], '#4a4270'));
    scene.textures.addCanvas('cloud', cl);

    // tem ánh sáng: các vòng sáng phân bậc + dithering Bayer cho chất pixel
    const L = 64, lc = Px.canvas(L, L), lx = lc.getContext('2d');
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const levels = [0.18, 0.42, 0.7, 1];
    for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
      const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32;
      if (d >= 1) continue;
      const v = Math.pow(1 - d, 1.2) * 1.15 + (bayer[y % 4][x % 4] / 16 - 0.5) * 0.2;
      let q = 0;
      for (const l of levels) if (v >= l) q = l;
      if (!q) continue;
      lx.fillStyle = 'rgba(255,255,255,' + q + ')';
      lx.fillRect(x, y, 1, 1);
    }
    scene.textures.addCanvas('light', lc);

    const pe = Px.canvas(3, 2), pc = pe.getContext('2d');
    Px.rect(pc, 0, 0, 3, 2, '#f6c1da'); Px.rect(pc, 0, 0, 1, 1, '#ffffff'); Px.rect(pc, 2, 1, 1, 1, '#d97aa5');
    scene.textures.addCanvas('petal', pe);

    const dr = Px.canvas(1, 6); Px.rect(dr.getContext('2d'), 0, 0, 1, 6, '#a9c7ff');
    scene.textures.addCanvas('drop', dr);

    const tuft = (key, flower) => {
      const t = Px.canvas(8, 7), x = t.getContext('2d');
      Px.line(x, 1, 6, 0, 2, '#5c9e4b'); Px.line(x, 3, 6, 3, 0, '#6fb35a');
      Px.line(x, 5, 6, 6, 1, '#5c9e4b'); Px.line(x, 4, 6, 4, 3, '#4a8a40');
      Px.rect(x, 1, 6, 6, 1, '#356b33');
      if (flower) { Px.rect(x, 2, 0, 3, 1, '#f6c1da'); Px.rect(x, 3, 0, 1, 1, '#fff1a0'); }
      scene.textures.addCanvas(key, t);
    };
    tuft('tuft', false); tuft('tuft_f', true);

    const sl = Px.canvas(26, 8); Px.ellipse(sl.getContext('2d'), 13, 4, 13, 4, '#000000');
    scene.textures.addCanvas('shadowL', sl);

    // phi kiếm (mũi chĩa xuống)
    const sw = Px.canvas(7, 26), s2 = sw.getContext('2d');
    Px.rect(s2, 3, 1, 1, 4, '#7a4b2a'); Px.rect(s2, 3, 1, 1, 1, '#f2c94c');
    Px.rect(s2, 1, 5, 5, 1, '#f2c94c');
    Px.rect(s2, 2, 6, 3, 15, '#dbe9ff'); Px.rect(s2, 4, 6, 1, 15, '#8ea6c8'); Px.rect(s2, 3, 6, 1, 15, '#ffffff');
    Px.rect(s2, 3, 21, 1, 3, '#dbe9ff');
    Px.outline(s2, 0, 0, 7, 26, OUT);
    scene.textures.addCanvas('sword', sw);

    // hỏa cầu
    const fb = Px.canvas(14, 14), f2 = fb.getContext('2d');
    Px.ellipse(f2, 7, 7, 6.5, 6.5, '#ff5a1f'); Px.ellipse(f2, 7.5, 6.5, 4.6, 4.6, '#ffb347');
    Px.ellipse(f2, 8, 6, 2.6, 2.6, '#fff3b0');
    scene.textures.addCanvas('fireball', fb);

    // ma trơi (âm hỏa)
    const wp = Px.canvas(10, 14), wpc = wp.getContext('2d');
    Px.ellipse(wpc, 5, 9.5, 4.2, 3.8, '#1fbf6a'); Px.ellipse(wpc, 5, 9, 3, 2.8, '#5dffa0');
    Px.rect(wpc, 4, 3, 2, 4, '#5dffa0'); Px.rect(wpc, 5, 1, 1, 3, '#5dffa0'); Px.rect(wpc, 3, 5, 1, 2, '#1fbf6a');
    Px.ellipse(wpc, 5, 9.5, 1.6, 1.6, '#eafff2');
    scene.textures.addCanvas('wisp', wp);

    // quỷ hồn (2 frame: đuôi uốn)
    const GW = 16, gh = Px.canvas(GW * 2, 18), g2 = gh.getContext('2d');
    [0, 1].forEach(f => {
      const ox = f * GW;
      for (let y = 0; y < 7; y++) {                  // đuôi thon dần, uốn trái/phải theo frame
        const half = Math.max(1, Math.round(4.5 - y * 0.6)), sw = Math.round(Math.sin(y * 0.9 + f * Math.PI) * 1.5);
        Px.rect(g2, ox + 8 - half + sw, 9 + y, half * 2, 1, y > 4 ? '#7fd8a8' : '#b8ffd8');
      }
      Px.ellipse(g2, ox + 8, 6.5, 5.5, 5.5, '#d8fff0');
      Px.ellipse(g2, ox + 7, 5.5, 3.5, 3.2, '#ffffff');
      Px.rect(g2, ox + 5, 6, 2, 2, '#0a2a1c'); Px.rect(g2, ox + 9, 6, 2, 2, '#0a2a1c');
      Px.rect(g2, ox + 7, 9, 2, 1 + f, '#0a2a1c');
      Px.outline(g2, ox, 0, GW, 18, '#0b3a24');
    });
    Px.addSheet(scene, 'ghost', gh, GW, 18);
  }

  function generate(scene) {
    heroSheet(scene);
    slimeSheet(scene, 'slime_g', ['#2f7a45', '#6fd17a', '#c4f5b0'], false);
    slimeSheet(scene, 'slime_p', ['#4b2a78', '#9a62d6', '#e0c4ff'], false);
    slimeSheet(scene, 'slime_r', ['#7a1f2b', '#d6455a', '#ffb0b0'], true);
    tree(scene, 'tree', ['#1f4d36', '#2f7046', '#4f9a5c'], 3);
    tree(scene, 'tree_pink', ['#9b3f6a', '#d97aa5', '#f6c1da'], 8);
    rock(scene);
    spring(scene);
    stele(scene);
    boltSheet(scene);
    slashSheet(scene);
    misc(scene);
    TT.Tiles = tiles();
  }

  function anims(scene) {
    const f = (key, list) => list.map(n => ({ key, frame: n }));
    const A = scene.anims;
    A.create({ key: 'hero_idle', frames: f('hero', [0, 1]), frameRate: 2.5, repeat: -1 });
    A.create({ key: 'hero_walk', frames: f('hero', [2, 3, 4, 5]), frameRate: 9, repeat: -1 });
    A.create({ key: 'hero_attack', frames: f('hero', [6, 7, 8]), frameRate: 18, repeat: 0 });
    A.create({ key: 'hero_sit', frames: f('hero', [10, 11]), frameRate: 1.5, repeat: -1 });
    ['slime_g', 'slime_p', 'slime_r'].forEach(k => A.create({ key: k + '_bob', frames: f(k, [0, 1, 2, 3]), frameRate: 6, repeat: -1 }));
    A.create({ key: 'bolt_strike', frames: f('bolt', [0, 1, 2, 3, 4, 5]), frameRate: 20, repeat: 0 });
    A.create({ key: 'ghost_float', frames: f('ghost', [0, 1]), frameRate: 5, repeat: -1 });
    A.create({ key: 'slash_anim', frames: f('slash', [0, 1, 2, 3]), frameRate: 26, repeat: 0 });
  }

  return { generate, anims, boltOriginY: 170 / 176 };
})();
