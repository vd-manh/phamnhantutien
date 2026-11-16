// Đạo Gia · ô I · Nhất Lệnh Định Giang Sơn (tông trắng đen: thư pháp, tranh thuỷ mặc)
// 1) Bàn cờ vây mực hiện trên mặt đất, lấy mục tiêu làm tâm; trên trời, ngay trên mục tiêu, một đám mây mực xoáy.
// 2) Nhân vật viết chữ 定 (nét mực tụ lại trước mặt), xong thì ném chữ vào mục tiêu: chữ in xuống tâm bàn cờ như ấn triện,
//    mục tiêu bất động.
// 3) Từ đám mây, một tay áo trắng buông xuống, hai ngón kẹp quân cờ đen đặt mạnh xuống đúng vị trí mục tiêu:
//    bàn cờ loé sáng, sóng mực lan theo các đường kẻ, sát thương lớn.
// Ảnh tay (gs_hand) và mây (gs_cloud): tools/make_giang_son_fx.py.
window.TT = window.TT || {};

(function () {
  const GATHER = 2000;          // thời gian viết chữ (ms)
  const N_STROKES = 12;         // số nét mực tụ thành chữ
  const THROW = 380;            // chữ bay tới mục tiêu (ms)
  const DROP = 300;             // tay từ mây đặt quân cờ xuống (ms)
  const PIN = 1800;             // mục tiêu bất động (ms)
  const HALF = 80;              // nửa cạnh bàn cờ (px)
  const LINES = 9;              // bàn cờ 9 x 9
  const CLOUD_Y = 132;          // mây cao hơn mục tiêu (px)
  const CLOUD_DX = 96;          // mây lệch sang một bên: tay đưa chéo xuống
  const CLOUD_W = 170;
  const HAND_SC = 1.0;          // ảnh tay cao 112px (tools/make_giang_son_fx.py, từ dao/dao_hand.png)
  const INK = 0x111111, PAPER = 0xf4f1ea, GREY = 0x8a8a8a;
  // tâm quân cờ + bề rộng tay áo ở mép trên ảnh tay: đọc từ giang_son.json (gs_hand.stone / .sleeve)
  let HM = { stone: [27, 102], sleeve: [0, 48], w: 49, h: 112 };

  // ván cờ đang đánh dở trên bàn 9 x 9: (cột, hàng, 1 = đen / 0 = trắng); ô giữa (4, 4) để trống cho quân quyết định
  const GAME = [[2, 2, 1], [6, 2, 0], [2, 6, 0], [6, 6, 1], [3, 4, 1], [5, 3, 0], [4, 6, 0], [3, 2, 0], [5, 5, 1],
                [1, 4, 1], [7, 4, 0], [4, 2, 1], [5, 7, 1], [2, 5, 0], [6, 4, 1], [3, 6, 1], [5, 1, 0], [7, 6, 0]];

  // bàn cờ phối cảnh nằm trên mặt đất (trục dọc thu 1/2): mặt giấy loang mực ở mép, khung kép, đường kẻ nét bút
  function drawBoard(g, x, y, half, alpha, flash, stones) {
    g.clear();
    if (half < 1 || alpha <= 0) return;
    const hy = half * 0.5, step = half * 2 / (LINES - 1), pad = 10, pady = 6;
    const X0 = x - half - pad, Y0 = y - hy - pady, BW = half * 2 + pad * 2, BH = hy * 2 + pady * 2;
    // bóng đổ + chân bàn
    g.fillStyle(0x000000, 0.25 * alpha); g.fillRect(X0 + 4, Y0 + 5, BW, BH);
    g.fillStyle(0x2a2a2a, alpha); g.fillRect(X0, Y0 + BH, BW, 5);
    // mặt giấy, mép loang mực (các viền nhạt dần vào trong)
    g.fillStyle(PAPER, 0.93 * alpha); g.fillRect(X0, Y0, BW, BH);
    for (let k = 0; k < 5; k++) {
      g.lineStyle(3, 0x9a968e, (0.22 - k * 0.04) * alpha);
      g.strokeRect(X0 + 2 + k * 2.5, Y0 + 1.5 + k * 1.3, BW - 4 - k * 5, BH - 3 - k * 2.6);
    }
    g.lineStyle(3, INK, alpha); g.strokeRect(X0, Y0, BW, BH);
    g.lineStyle(1, INK, 0.7 * alpha); g.strokeRect(X0 + 4, Y0 + 2.5, BW - 8, BH - 5);
    // đường kẻ: viền ngoài đậm, trong mảnh; nét bút hơi run (lệch ±0.4px)
    for (let i = 0; i < LINES; i++) {
      const lx = x - half + i * step, ly = y - hy + i * step * 0.5;
      const edge = i === 0 || i === LINES - 1, w = edge ? 2 : 1, j = ((i * 37) % 7 - 3) * 0.13;
      g.lineStyle(w, INK, (edge ? 0.95 : 0.7) * alpha);
      g.lineBetween(lx + j, y - hy, lx - j, y + hy);
      g.lineBetween(x - half, ly - j * 0.5, x + half, ly + j * 0.5);
      if (flash > 0) {
        g.lineStyle(w + 1.5, 0xffffff, flash * alpha);
        g.lineBetween(lx, y - hy, lx, y + hy);
        g.lineBetween(x - half, ly, x + half, ly);
      }
    }
    [[4, 4], [2, 2], [6, 2], [2, 6], [6, 6]].forEach(([i, j]) => {
      g.fillStyle(INK, alpha); g.fillEllipse(x - half + i * step, y - hy + j * step * 0.5, 4.5, 2.8);
    });
    // quân cờ: đen bóng / trắng ngà, bóng đổ, ánh sáng
    stones.forEach(st => {
      const a = alpha * st.a, sx = st.x, sy = st.y - (1 - st.a) * 8, r = st.r;
      if (a <= 0) return;
      g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(sx + 1.2, sy + 1.6, r * 2.1, r * 1.25);
      g.fillStyle(st.black ? INK : PAPER, a); g.fillEllipse(sx, sy, r * 2, r * 1.2);
      g.lineStyle(1, st.black ? 0x555555 : INK, 0.9 * a); g.strokeEllipse(sx, sy, r * 2, r * 1.2);
      g.fillStyle(st.black ? 0xbdbdbd : 0xffffff, 0.85 * a); g.fillEllipse(sx - r * 0.35, sy - r * 0.22, r * 0.65, r * 0.3);
    });
  }

  TT.Skills.nhat_lenh = function (w, sk, now) {
    if (TT.Skills._gsTextures) TT.Skills._gsTextures(w);
    const gm = w.cache.json.get('gs_meta');
    if (gm && gm.gs_hand && gm.gs_hand.stone) HM = gm.gs_hand;
    const p = w.player, t0 = now, dmg = w.st.atk * sk.dmg;
    const e0 = w.nearestEnemies(p.x, p.y, 260, 1)[0];
    const T = e0 ? { x: e0.x, y: e0.y, e: e0 } : { x: p.x + w.facing.x * 120, y: p.y + w.facing.y * 120 };
    if (e0) w.facing.set(e0.x - p.x, e0.y - p.y).normalize();
    const B = { x: T.x, y: T.y };                      // tâm bàn cờ: cố định tại chỗ mục tiêu lúc bắt đầu
    p.setVelocity(0);
    w.playAnim('cast');
    w.lockUntil = now + GATHER + 300;
    w.skillLock = now + GATHER + 300;
    TT.SFX.cast();

    // ---- camera: lùi ra cho thấy cả nhân vật, bàn cờ và đám mây
    const cam = w.cameras.main, zoom0 = cam.zoom, camO = { x: 0, y: 0 };
    let camDone = false;
    (function camAim() {
      const cxx = T.x + (T.x >= p.x ? 1 : -1) * CLOUD_DX;
      const xs = [p.x - 30, p.x + 30, T.x - HALF - 20, T.x + HALF + 20, cxx - CLOUD_W / 2, cxx + CLOUD_W / 2];
      const ys = [p.y - w.pH - 40, p.y + 20, T.y + HALF * 0.5 + 20, T.y - CLOUD_Y - 40];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const z = Math.min(zoom0, cam.width / (x1 - x0 + 40), cam.height / (y1 - y0 + 40)) * 0.82;
      cam.zoomTo(Math.max(0.9, z), 500, 'Sine.easeInOut', true);
      w.tweens.add({ targets: camO, x: p.x - (x0 + x1) / 2, y: p.y - (y0 + y1) / 2, duration: 500, ease: 'Sine.easeInOut',
        onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    })();
    function camBack() {
      if (camDone) return;
      camDone = true;
      cam.zoomTo(zoom0, 600, 'Sine.easeInOut', true);
      w.tweens.killTweensOf(camO);
      w.tweens.add({ targets: camO, x: 0, y: 0, duration: 600, ease: 'Sine.easeInOut', onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    }

    // ---- bàn cờ quanh mục tiêu + mây trên trời
    const board = w.add.graphics().setDepth(-925);
    const bd = { half: 0, a: 0, flash: 0 };
    const stones = [];
    w.tweens.add({ targets: bd, half: HALF, a: 1, duration: 500, ease: 'Back.easeOut' });
    const stepB = HALF * 2 / (LINES - 1);
    GAME.forEach(([i, j, black], n) => {
      const st = { x: B.x - HALF + i * stepB, y: B.y - HALF * 0.5 + j * stepB * 0.5, r: 5.2, a: 0, black };
      stones.push(st);
      w.tweens.add({ targets: st, a: 1, delay: 450 + n * 60, duration: 160, ease: 'Quad.easeIn',
        onComplete: () => { if (n % 3 === 0) TT.FX.burst(w, st.x, st.y, [INK, PAPER], 3, 25); } });
    });
    TT.FX.burst(w, B.x, B.y, [INK, PAPER], 14, 90);
    const hasCloud = w.textures.exists('gs_cloud');
    if (hasCloud && !w.anims.exists('gs_cloud_spin'))
      w.anims.create({ key: 'gs_cloud_spin', frames: w.anims.generateFrameNumbers('gs_cloud'), frameRate: 12, repeat: -1 });
    const cside = T.x >= p.x ? 1 : -1;                 // mây lệch về phía xa nhân vật
    const cx = T.x + cside * CLOUD_DX, cy = T.y - CLOUD_Y;
    const cloud = hasCloud ? w.add.sprite(cx, cy, 'gs_cloud', 0).setDepth(5662).setScale(0).setAlpha(0.95)
                           : w.add.image(cx, cy, 'light').setTint(GREY).setDepth(5662).setScale(0);
    if (hasCloud) cloud.play('gs_cloud_spin');
    w.tweens.add({ targets: cloud, scale: CLOUD_W / (hasCloud ? cloud.width : 64), duration: 550, ease: 'Back.easeOut' });

    // ---- viết chữ 定: nét mực bay lên quanh chân, tụ trước mặt
    const glyphPos = () => ({ x: p.x + w.facing.x * 26, y: p.y - w.pH * 1.05 + w.facing.y * 6 });
    const g0 = glyphPos();
    const glyph = w.add.text(g0.x, g0.y, '定', {
      fontFamily: '"STXingkai", "KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", "SimSun", serif',
      fontSize: '72px', color: '#111111', stroke: '#f4f1ea', strokeThickness: 7
    }).setOrigin(0.5).setDepth(5640).setAlpha(0).setScale(0.2);
    const halo = w.add.image(g0.x, g0.y, 'light').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(5639).setAlpha(0);
    const strokes = [];
    let alive = true, collected = 0, phase = 'gather', writeT = now;
    for (let i = 0; i < N_STROKES; i++) {
      w.time.delayedCall(200 + i * ((GATHER - 600) / N_STROKES), () => {
        if (!alive) return;
        const a = i * 2.39996, rr = 26 + (i * 7) % 18;
        const sx = p.x + Math.cos(a) * rr, sy = p.y + Math.sin(a) * rr * 0.5;
        const tex = w.textures.exists('gs_stroke') ? 'gs_stroke' : 'dot';
        const s = w.add.image(sx, sy, tex).setDepth(5630).setScale(0.6).setAlpha(0);
        strokes.push({ s, born: w.time.now, sx, sy, side: i % 2 ? 1 : -1 });
      });
    }

    const fx = w.add.graphics().setDepth(5659);       // tay áo nối từ mây xuống bàn tay (dưới bàn tay, dưới mây)
    let hand = null, handY = 0;
    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now, el = tn - t0;
      if (w.dead && alive) { cleanup(); return; }
      drawBoard(board, B.x, B.y, bd.half, bd.a, bd.flash, stones);
      if (phase === 'gather' && tn - writeT > 420) { writeT = tn; w.playAnim('cast'); }
      const G = glyphPos();
      if (phase === 'gather') { glyph.setPosition(G.x, G.y + Math.sin(el / 200) * 1.2); halo.setPosition(G.x, G.y); }
      strokes.forEach(o => {
        if (o.done) return;
        const k = Math.min(1, (tn - o.born) / 560), e = Phaser.Math.Easing.Cubic.InOut(k);
        const mx = (o.sx + G.x) / 2 + o.side * 20, my = Math.min(o.sy, G.y) - 16;
        const x = (1 - e) * (1 - e) * o.sx + 2 * (1 - e) * e * mx + e * e * G.x;
        const y = (1 - e) * (1 - e) * o.sy + 2 * (1 - e) * e * my + e * e * G.y;
        const vx = x - o.s.x, vy = y - o.s.y;
        o.s.setPosition(x, y).setAlpha(Math.min(1, k * 4));
        if (vx * vx + vy * vy > 0.01) o.s.setRotation(Math.atan2(vy, vx));
        if (k >= 1) {
          o.done = true; o.s.destroy(); collected++;
          const f = collected / N_STROKES;
          glyph.setAlpha(Math.min(1, 0.15 + f)).setScale(0.2 + 0.4 * f);
          halo.setAlpha(0.12 + 0.3 * f).setScale(1 + f);
          TT.FX.burst(w, G.x, G.y, [INK, PAPER], 3, 30);
        }
      });
      // tay áo nối tiếp: ảnh tay (Gemini) đã có cổ tay áo viền đen chỉ vàng, bị cắt ở mép trên;
      // phần tay áo còn lại từ mép trên ảnh lên tới mây vẽ bằng code, cùng bề rộng, loe nhẹ, nếp áo
      fx.clear();
      if (hand && hand.visible) {
        const ang = hand.rotation - Math.PI / 2;                       // hướng từ tay ngược lên mây
        const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
        const sc = hand.scaleX, so = HM.stone, sl = HM.sleeve;
        // điểm giữa mép trên tay áo trong ảnh, đổi sang toạ độ thế giới (ảnh xoay quanh tâm quân cờ)
        const lx = ((sl[0] + sl[1]) / 2 - so[0]) * sc, ly = (0 - so[1]) * sc;
        const cr = Math.cos(hand.rotation), sr = Math.sin(hand.rotation);
        const wx = hand.x + lx * cr - ly * sr, wy = hand.y + lx * sr + ly * cr;
        const L = (cx - wx) * ux + (cy + 6 - wy) * uy;               // độ dài phần tay áo tới mây
        if (L > 2) {
          const a = hand.alpha, w0 = (sl[1] - sl[0]) / 2 * sc, w1 = w0 * 1.35;
          const P = (t, s2) => ({ x: wx + ux * L * t + nx * s2, y: wy + uy * L * t + ny * s2 });
          const left = [], right = [];
          for (let k = 0; k <= 10; k++) {
            const t = k / 10, ww = w0 + (w1 - w0) * t, wave = Math.sin(t * 6 + tn / 170) * 1.5 * t;
            left.push(P(t, -ww + wave)); right.push(P(t, ww + wave));
          }
          const poly = left.slice().reverse().concat(right);
          fx.fillStyle(HM.sleeveColor || PAPER, a); fx.fillPoints(poly, true);
          fx.fillStyle(HM.sleeveShade || 0xc9c4ba, 0.6 * a); fx.fillPoints(right.concat([P(1, 0), P(0, 0)].reverse()), true);
          fx.lineStyle(2, INK, a);
          fx.strokePoints(left, false); fx.strokePoints(right, false);
          fx.lineStyle(1, 0x8a8a8a, 0.8 * a);
          [-0.4, 0.1, 0.55].forEach(f => { const q0 = P(0, f * w0), q1 = P(1, f * w1); fx.lineBetween(q0.x, q0.y, q1.x, q1.y); });
        }
      }
    }});

    // ---- ném chữ vào mục tiêu: chữ in xuống tâm bàn cờ, mục tiêu bất động
    let pinned = [];
    w.time.delayedCall(GATHER, () => {
      if (!alive) return;
      phase = 'throw';
      strokes.forEach(o => { if (!o.done) { o.done = true; o.s.destroy(); } });
      if (T.e && T.e.active && !T.e.dying) { T.x = T.e.x; T.y = T.e.y; }
      w.playAnim(TT.Caster && TT.Caster.anims.cast_point ? 'cast_point' : 'cast');
      w.lockUntil = Math.max(w.lockUntil, w.time.now + 450);
      w.skillLock = Math.max(w.skillLock, w.time.now + 450);
      TT.SFX.dash();
      glyph.setAlpha(1).setScale(0.6);
      const sx = glyph.x, sy = glyph.y, o = { k: 0 };
      w.tweens.add({ targets: o, k: 1, duration: THROW, ease: 'Sine.easeIn', onUpdate: () => {
        glyph.setPosition(sx + (T.x - sx) * o.k, sy + (T.y - 10 - sy) * o.k - Math.sin(o.k * Math.PI) * 16)
          .setScale(0.6 + 0.2 * Math.sin(o.k * Math.PI));
        halo.setPosition(glyph.x, glyph.y);
      }, onComplete: stamp });
    });

    function stamp() {
      if (!alive) return;
      const x = T.x, y = T.y;
      // chữ ép xuống mặt bàn cờ như ấn triện
      w.tweens.add({ targets: glyph, y: y, scaleX: 0.55, scaleY: 0.28, alpha: 0.85, duration: 140, ease: 'Quad.easeIn' });
      glyph.setDepth(-924);
      w.tweens.add({ targets: halo, alpha: 0, duration: 200 });
      TT.FX.burst(w, x, y, [INK, PAPER, GREY], 18, 120);
      TT.FX.ring(w, x, y, 0xffffff, 1.3, 300);
      w.hitEnemiesInRadius(x, y, 26, dmg, { ox: x, oy: y, force: 10 });
      TT.SFX.hit();
      pinned = w.nearestEnemies(x, y, 40, 99);
      pinned.forEach(en => { en.frozenTint = 0x9a9a9a; en.timeTint = true; en.setTint(0x9a9a9a); en.frozenUntil = w.time.now + PIN; });
      w.time.delayedCall(150, dropStone);
    }

    // ---- tay từ mây kẹp quân cờ đặt xuống mục tiêu
    function dropStone() {
      if (!alive) return;
      const x = T.x, y = T.y;
      if (!w.textures.exists('gs_hand')) { slam(); return; }
      const rot = Math.atan2(y - (cy + 10), x - cx) - Math.PI / 2;    // ảnh tay chĩa xuống: xoay về hướng mây -> mục tiêu
      // tay ló ra từ dưới mây (cổ tay vừa chạm đáy mây), mờ dần hiện ra
      const sx = cx + (x - cx) * 0.32, sy = cy + 10 + (y - cy - 10) * 0.32;
      hand = w.add.image(sx, sy, 'gs_hand', 0).setOrigin(HM.stone[0] / HM.w, HM.stone[1] / HM.h).setDepth(5660)
        .setScale(HAND_SC).setRotation(rot).setAlpha(0);
      w.tweens.add({ targets: hand, alpha: 1, duration: 120 });
      TT.SFX.thunder(false);
      // vươn ra chậm rồi ấn mạnh xuống
      w.tweens.add({ targets: hand, x: cx + (x - cx) * 0.75, y: cy + 10 + (y - 2 - cy - 10) * 0.75, duration: DROP * 0.6,
        ease: 'Sine.easeOut', onComplete: () => {
          w.tweens.add({ targets: hand, x, y: y - 2, duration: DROP * 0.35, ease: 'Quad.easeIn', onComplete: slam });
        } });
    }

    function slam() {
      if (!alive) return;
      const x = T.x, y = T.y;
      stones.push({ x, y: y + 1, r: 7.5, a: 1, black: true });
      bd.flash = 1;
      w.tweens.add({ targets: bd, flash: 0, duration: 500 });
      TT.FX.ring(w, x, y, INK, 2.6, 420);
      TT.FX.ring(w, x, y, PAPER, 1.8, 360, 70);
      TT.FX.burst(w, x, y, [INK, PAPER, GREY], 30, 160);
      TT.FX.flash(w, 0.12, 160, 0xffffff);
      w.hitEnemiesInRadius(x, y, 40, dmg * 3, { ox: x, oy: y, force: 60 });
      w.cameras.main.shake(260, 0.01);
      w.hitStop(110);
      TT.SFX.boom();
      // sóng mực chạy theo bốn đường kẻ ra mép bàn cờ
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const dot = w.add.image(x, y, 'dot').setTint(INK).setScale(2.2).setDepth(-923);
        w.tweens.add({ targets: dot, x: x + dx * HALF, y: y + dy * HALF * 0.5, alpha: 0, duration: 380, ease: 'Quad.easeOut',
          onComplete: () => dot.destroy() });
      });
      if (hand) {
        w.tweens.add({ targets: hand, x: cx + (T.x - cx) * 0.32, y: cy + 10 + (T.y - cy - 10) * 0.32, alpha: 0, delay: 280, duration: 380, ease: 'Quad.easeIn',
          onComplete: () => { if (hand) hand.setVisible(false); } });
      }
      w.time.delayedCall(700, () => {
        if (!alive) return;
        pinned.forEach(en => { if (en.active) { en.frozenUntil = 0; en.frozenTint = 0; } });
        w.tweens.add({ targets: bd, a: 0, duration: 500 });
        w.tweens.add({ targets: [cloud, glyph], alpha: 0, duration: 500 });
        camBack();
      });
      w.time.delayedCall(1250, cleanup);
    }

    function cleanup() {
      if (!alive) return;
      alive = false;
      tick.remove();
      [board, fx, glyph, halo, cloud].forEach(o => o.destroy());
      if (hand) hand.destroy();
      strokes.forEach(o => { if (!o.done) o.s.destroy(); });
      pinned.forEach(en => { if (en.active) { en.frozenUntil = 0; en.frozenTint = 0; } });
      camBack();
    }
  };
})();
