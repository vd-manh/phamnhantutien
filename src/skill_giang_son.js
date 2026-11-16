// Đạo Gia · ô O · Giang Sơn Lưỡng Nghi Đồ (tông trắng đen: thư pháp, tranh thuỷ mặc)
// Mây, rồng, núi: ảnh tạo bằng tools/make_giang_son_fx.py (mây Vạn Kiếm Quy Tông, kim long Phi Long Tại Thiên, đổi màu mực);
// vẽ bằng code chỉ là dự phòng khi chưa nạp được ảnh.
// 1) Tụ chiêu: dưới chân mở trận thái cực lưỡng nghi (âm dương + bát quái, phối cảnh trên mặt đất, quay chậm).
//    Nhân vật liên tục viết thư pháp; các nét mực bay lên từ trận pháp, tụ lại trước mặt thành chữ 龍.
// 2) Chữ viết xong: phất tay ném chữ vào mục tiêu. Trúng: một ngọn núi thuỷ mặc giáng xuống đè lên mục tiêu (bất động).
// 3) Hai đám mây thuỷ mặc (to bằng pháp trận) hiện ở hai bên mục tiêu, hai con rồng mực lao ra từ mây, xuyên qua mục tiêu,
//    núi vỡ thành mực bắn tung.
window.TT = window.TT || {};

(function () {
  const GATHER = 3400;          // thời gian tụ chiêu (ms)
  const N_STROKES = 18;         // số nét mực bay lên tụ thành chữ
  const THROW = 420;            // chữ bay tới mục tiêu (ms)
  const PIN = 2600;             // núi đè: mục tiêu bất động (ms)
  const DRAGON = 1000;          // rồng bay lượn từ mây tới mục tiêu (ms)
  const ARRAY_R = 110;          // bán kính trận pháp
  const CLOUD_DX = 150;         // mây cách mục tiêu theo phương ngang (px)
  const CLOUD_W = ARRAY_R * 2;  // bề ngang mây = đường kính trận pháp
  const DRAGON_SC = 1.5;        // cỡ rồng (đầu ảnh gốc cao 70px)
  const INK = 0x111111, PAPER = 0xf4f1ea, GREY = 0x8a8a8a;
  const TRIGRAMS = [7, 6, 5, 4, 3, 2, 1, 0];

  // ---- texture vẽ một lần
  function ensureTextures(scene) {
    if (scene.textures.exists('gs_stroke')) return;
    const mk = (key, w, h, draw) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      scene.textures.addCanvas(key, cv);
    };
    // nét bút: thuôn hai đầu, mực đen, viền trắng
    mk('gs_stroke', 26, 10, g => {
      const path = () => { g.beginPath(); g.moveTo(1, 6); g.quadraticCurveTo(10, 0, 25, 4); g.quadraticCurveTo(12, 9, 1, 6); g.closePath(); };
      path(); g.lineWidth = 2.5; g.strokeStyle = '#f4f1ea'; g.stroke();
      path(); g.fillStyle = '#111111'; g.fill();
      g.fillStyle = '#555555'; g.fillRect(6, 4, 9, 1);
    });
    // núi thuỷ mặc: ba lớp núi đậm nhạt, sống núi trắng, chân núi chìm trong sương
    mk('gsx_mountain', 112, 92, (g, W, H) => {
      const poly = (pts, fill, alpha) => {
        g.globalAlpha = alpha; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fillStyle = fill; g.fill(); g.globalAlpha = 1;
      };
      poly([[0, 84], [16, 42], [28, 54], [48, 22], [66, 48], [86, 30], [112, 72], [112, 92], [0, 92]], '#c4c4c4', 0.85);
      poly([[4, 92], [22, 54], [36, 62], [54, 30], [72, 60], [94, 44], [110, 92]], '#7c7c7c', 0.95);
      const front = [[14, 92], [33, 50], [45, 58], [58, 12], [71, 44], [84, 36], [101, 92]];
      poly(front, '#262626', 1);
      g.beginPath(); g.moveTo(front[0][0], front[0][1]); front.slice(1).forEach(p => g.lineTo(p[0], p[1]));
      g.lineWidth = 2; g.strokeStyle = '#000000'; g.stroke();
      // sống núi sáng (vân thuỷ mặc)
      g.strokeStyle = 'rgba(244,241,234,0.85)'; g.lineWidth = 1.5;
      [[[58, 13], [52, 34], [55, 52]], [[33, 51], [29, 66]], [[84, 37], [80, 52]], [[71, 45], [68, 58]]].forEach(l => {
        g.beginPath(); g.moveTo(l[0][0], l[0][1]); l.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.stroke();
      });
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 37) % 60, y = 50 + (i * 23) % 30;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 3); g.stroke();
      }
      // sương trắng ở chân núi
      const gr = g.createLinearGradient(0, H - 30, 0, H);
      gr.addColorStop(0, 'rgba(244,241,234,0)'); gr.addColorStop(1, 'rgba(244,241,234,0.95)');
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, H - 30, W, 30);
      g.globalCompositeOperation = 'source-over';
    });
    // mây thuỷ mặc: các cụm tròn trắng viền mực, xoáy cuộn bên trong
    mk('gsx_cloud', 144, 70, g => {
      const puffs = [[28, 44, 20], [52, 32, 24], [84, 28, 27], [114, 42, 22], [70, 48, 23], [40, 52, 16], [100, 54, 16]];
      g.fillStyle = '#111111';
      puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r + 2.5, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = '#f4f1ea';
      puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
      g.strokeStyle = '#111111'; g.lineWidth = 1.6;
      puffs.forEach(([x, y, r], i) => {
        g.beginPath();
        for (let t = 0; t < 2.6 * Math.PI; t += 0.15) {
          const rr = r * 0.62 * (1 - t / (3 * Math.PI)), a = t + i;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
          if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      });
      const gr = g.createLinearGradient(0, 40, 0, 70);
      gr.addColorStop(0, 'rgba(120,120,120,0)'); gr.addColorStop(1, 'rgba(120,120,120,0.45)');
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 40, 144, 30);
    });
  }

  // ---- trận thái cực lưỡng nghi (vẽ lại mỗi khung, phối cảnh nằm trên mặt đất)
  function drawArray(gfx, x, y, r, rot, alpha, pulse) {
    gfx.clear();
    if (r < 1 || alpha <= 0) return;
    const sy = 0.5;
    const P = (u, v) => {                     // toạ độ cục bộ (u, v: v hướng lên) -> màn hình, có xoay
      const c = Math.cos(rot), s = Math.sin(rot);
      return { x: x + (u * c - v * s), y: y - (u * s + v * c) * sy };
    };
    const ring = (rr, w, col, a) => { gfx.lineStyle(w, col, a * alpha); gfx.strokeEllipse(x, y, rr * 2, rr * 2 * sy); };
    // nền giấy mờ + vành mực kép
    gfx.fillStyle(PAPER, 0.18 * alpha); gfx.fillEllipse(x, y, r * 2, r * 2 * sy);
    ring(r + 1.5, 4, PAPER, 0.55);
    ring(r, 2.5, INK, 0.95);
    ring(r * 0.93, 1, INK, 0.7);
    // 24 nét chấm phá quanh vành (như nét bút lông)
    for (let i = 0; i < 24; i++) {
      const a = -rot * 0.5 + i / 24 * Math.PI * 2;
      const p0 = P(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86), p1 = P(Math.cos(a + 0.12) * r * 0.86, Math.sin(a + 0.12) * r * 0.86);
      gfx.lineStyle(i % 2 ? 1 : 2, INK, 0.85 * alpha); gfx.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    // bát quái: 8 quẻ, hào mực đen viền trắng
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const ux = -Math.sin(a), uv = Math.cos(a);
      for (let b = 0; b < 3; b++) {
        const rr = r * (0.66 + b * 0.06), cu = Math.cos(a) * rr, cv = Math.sin(a) * rr, h = 4.6;
        const solid = (TRIGRAMS[i] >> b) & 1;
        const seg = (t0, t1) => {
          const A = P(cu + ux * t0, cv + uv * t0), B = P(cu + ux * t1, cv + uv * t1);
          gfx.lineStyle(3.2, PAPER, 0.7 * alpha); gfx.lineBetween(A.x, A.y, B.x, B.y);
          gfx.lineStyle(1.8, INK, 0.95 * alpha); gfx.lineBetween(A.x, A.y, B.x, B.y);
        };
        if (solid) seg(-h, h); else { seg(-h, -1.3); seg(1.3, h); }
      }
    }
    ring(r * 0.56, 1.5, INK, 0.9);
    // âm dương: nửa trắng, nửa đen hình chữ S, hai chấm mắt cá
    const R = r * 0.5, pts = n => n;
    const whole = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; whole.push(P(Math.cos(a) * R, Math.sin(a) * R)); }
    gfx.fillStyle(PAPER, 0.92 * alpha); gfx.fillPoints(whole, true);
    const black = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 + i / 20 * Math.PI; black.push(P(Math.cos(a) * R, Math.sin(a) * R)); }
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; black.push(P(Math.cos(a) * R / 2, -R / 2 + Math.sin(a) * R / 2)); }
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 - i / 20 * Math.PI; black.push(P(Math.cos(a) * R / 2, R / 2 + Math.sin(a) * R / 2)); }
    gfx.fillStyle(INK, 0.95 * alpha); gfx.fillPoints(black, true);
    const dot = (cu, cv, col) => {
      const d = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; d.push(P(cu + Math.cos(a) * R * 0.14, cv + Math.sin(a) * R * 0.14)); }
      gfx.fillStyle(col, 0.95 * alpha); gfx.fillPoints(d, true);
    };
    dot(0, -R / 2, PAPER); dot(0, R / 2, INK);
    gfx.lineStyle(1.5, INK, 0.9 * alpha); gfx.strokePoints(whole, true);
    // vòng sáng nhấp nháy ngoài cùng
    ring(r + 5 + pulse * 3, 1, PAPER, 0.35 + 0.3 * pulse);
  }

  // ---- rồng mực: thân là chuỗi điểm theo đường bay, đầu có sừng và râu
  function drawDragon(gfx, trail, alpha, flip) {
    const n = trail.length;
    if (n < 2 || alpha <= 0) return;
    for (let i = 1; i < n; i++) {                                     // viền trắng rồi thân đen, thuôn về đuôi
      const k = i / (n - 1), w = 2 + 12 * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5);
      gfx.lineStyle(w + 3, PAPER, 0.8 * alpha); gfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
    }
    for (let i = 1; i < n; i++) {
      const k = i / (n - 1), w = 2 + 12 * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5);
      gfx.lineStyle(w, INK, alpha); gfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
    }
    // vảy / vây lưng: gai trắng mỗi 3 điểm
    for (let i = 3; i < n - 3; i += 3) {
      const a = trail[i - 1], b = trail[i + 1], ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang) * flip, ny = Math.cos(ang) * flip;
      const k = i / (n - 1), w = 3 + 9 * k, c = trail[i];
      gfx.lineStyle(1.2, PAPER, 0.9 * alpha);
      gfx.lineBetween(c.x - nx * w * 0.2, c.y - ny * w * 0.2, c.x - nx * (w * 0.75 + 3), c.y - ny * (w * 0.75 + 3));
    }
    // đầu rồng
    const h = trail[n - 1], h2 = trail[n - 2], ang = Math.atan2(h.y - h2.y, h.x - h2.x);
    const fx = Math.cos(ang), fy = Math.sin(ang), nx = -fy * flip, ny = fx * flip;
    const HS = 1.45;                                                   // cỡ đầu rồng
    const pt = (f, s) => ({ x: h.x + (fx * f + nx * s) * HS, y: h.y + (fy * f + ny * s) * HS });
    const head = [pt(-4, -6), pt(5, -6), pt(13, -2), pt(15, 1), pt(9, 4), pt(1, 6), pt(-4, 5)];
    gfx.fillStyle(PAPER, 0.9 * alpha); gfx.fillPoints(head.map(p => ({ x: p.x + (p.x - h.x) * 0.25, y: p.y + (p.y - h.y) * 0.25 })), true);
    gfx.fillStyle(INK, alpha); gfx.fillPoints(head, true);
    const eye = pt(6, -2.5);
    gfx.fillStyle(PAPER, alpha); gfx.fillRect(eye.x - 1, eye.y - 1, 2.5, 2.5);
    // sừng
    gfx.lineStyle(1.6, INK, alpha);
    const s0 = pt(-1, -5), s1 = pt(-10, -12), s2 = pt(-14, -10);
    gfx.lineBetween(s0.x, s0.y, s1.x, s1.y); gfx.lineBetween(s1.x, s1.y, s2.x, s2.y);
    // râu dài uốn lượn
    gfx.lineStyle(1, INK, 0.9 * alpha);
    for (const side of [-1, 1]) {
      const ws = []; const t = Date.now() / 120;
      for (let j = 0; j <= 8; j++) ws.push(pt(12 - j * 3.5, side * (3 + j * 0.9) + Math.sin(t + j * 0.8 + side) * j * 0.5));
      gfx.strokePoints(ws, false);
    }
  }

  TT.Skills._gsTextures = ensureTextures;     // dùng chung: nét bút gs_stroke (chiêu Nhất Lệnh)

  TT.Skills.giang_son = function (w, sk, now) {
    ensureTextures(w);
    const p = w.player, t0 = now, dmg = w.st.atk * sk.dmg;
    p.setVelocity(0);
    w.playAnim('cast');
    w.lockUntil = now + GATHER + 300;
    w.skillLock = now + GATHER + 300;
    TT.SFX.cast();

    const arr = w.add.graphics().setDepth(-930);
    const arrGlow = w.add.image(p.x, p.y, 'light').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-931).setAlpha(0).setScale(6.4, 3.2);
    const fx = w.add.graphics().setDepth(5650);                   // rồng, vệt mực
    const st = { r: 0, a: 0 };
    w.tweens.add({ targets: st, r: ARRAY_R, a: 1, duration: 650, ease: 'Back.easeOut' });

    // camera: tính khung chứa nhân vật + trận pháp + hai mây + mục tiêu, lùi ra cho vừa và dời tâm vào giữa khung;
    // xong chiêu thì trả lại như cũ
    const cam = w.cameras.main, zoom0 = cam.zoom;
    const camO = { x: 0, y: 0 };
    let camDone = false;
    function camAim(tx, ty) {
      const xs = [p.x - ARRAY_R, p.x + ARRAY_R, tx - CLOUD_DX - CLOUD_W / 2, tx + CLOUD_DX + CLOUD_W / 2];
      const ys = [p.y - ARRAY_R * 0.5, p.y + ARRAY_R * 0.5, p.y - w.pH - 30, ty - 96 - 50, ty + 24];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const z = Math.min(zoom0, cam.width / (x1 - x0 + 40), cam.height / (y1 - y0 + 40));
      cam.zoomTo(Math.max(0.9, z * 0.9), 600, 'Sine.easeInOut', true);      // chừa lề 10%
      w.tweens.killTweensOf(camO);
      w.tweens.add({ targets: camO, x: p.x - (x0 + x1) / 2, y: p.y - (y0 + y1) / 2, duration: 600, ease: 'Sine.easeInOut',
        onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    }
    function camBack() {
      if (camDone) return;
      camDone = true;
      cam.zoomTo(zoom0, 700, 'Sine.easeInOut', true);
      w.tweens.killTweensOf(camO);
      w.tweens.add({ targets: camO, x: 0, y: 0, duration: 700, ease: 'Sine.easeInOut',
        onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    }


    // hai đám mây thuỷ mặc hiện cùng lúc với trận pháp, chếch trên cao hai bên mục tiêu dự kiến
    // (mây: xoáy mây Vạn Kiếm Quy Tông đổi màu mực; rồng: kim long Phi Long Tại Thiên đổi màu mực)
    const hasCloud = w.textures.exists('gs_cloud'), hasDragon = w.textures.exists('gs_dragon');
    if (hasCloud && !w.anims.exists('gs_cloud_spin'))
      w.anims.create({ key: 'gs_cloud_spin', frames: w.anims.generateFrameNumbers('gs_cloud'), frameRate: 12, repeat: -1 });
    if (hasDragon && !w.anims.exists('gs_dragon_fly'))
      w.anims.create({ key: 'gs_dragon_fly', frames: w.anims.generateFrameNumbers('gs_dragon'), frameRate: 10, repeat: -1 });
    const e0 = w.nearestEnemies(p.x, p.y, 240, 1)[0];
    const T0 = e0 ? { x: e0.x, y: e0.y } : { x: p.x + w.facing.x * 130, y: p.y + w.facing.y * 130 };
    const clouds = [-1, 1].map(side => {
      const x = T0.x + side * CLOUD_DX, y = T0.y - 96;
      let spr;
      if (hasCloud) { spr = w.add.sprite(x, y, 'gs_cloud', 0).setDepth(5660).setScale(0).setFlipX(side > 0); spr.play('gs_cloud_spin'); }
      else spr = w.add.image(x, y, 'gsx_cloud').setDepth(5660).setScale(0).setFlipX(side > 0);
      w.tweens.add({ targets: spr, scale: CLOUD_W / (hasCloud ? spr.width : 144), alpha: 0.95, duration: 650, ease: 'Back.easeOut' });
      return { side, x, y, spr };
    });
    camAim(T0.x, T0.y);

    // điểm tụ chữ: trước mặt, ngang đầu
    const glyphPos = () => ({ x: p.x + w.facing.x * 34, y: p.y - w.pH * 1.15 + w.facing.y * 6 });
    const g0 = glyphPos();
    const glyph = w.add.text(g0.x, g0.y, '龍', {
      fontFamily: '"STXingkai", "KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", "SimSun", serif',
      fontSize: '72px', color: '#111111', stroke: '#f4f1ea', strokeThickness: 7
    }).setOrigin(0.5).setDepth(5640).setAlpha(0).setScale(0.18);
    const glyphHalo = w.add.image(g0.x, g0.y, 'light').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5639).setAlpha(0).setScale(0.9);
    const motes = w.add.particles(p.x, p.y, 'dot', {
      speedY: { min: -50, max: -15 }, speedX: { min: -8, max: 8 }, lifespan: { min: 500, max: 1000 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [INK, PAPER, GREY], frequency: 40,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, ARRAY_R * 1.8, ARRAY_R * 0.9) }
    }).setDepth(4100);

    let alive = true, phase = 'gather', collected = 0;
    const strokes = [];
    // nét mực lần lượt bay lên từ trận pháp, uốn cong rồi tụ vào chữ
    for (let i = 0; i < N_STROKES; i++) {
      w.time.delayedCall(350 + i * ((GATHER - 900) / N_STROKES), () => {
        if (!alive) return;
        const a = i * 2.39996, rr = ARRAY_R * (0.5 + 0.45 * ((i * 7) % 10) / 10);
        const sx = p.x + Math.cos(a) * rr, sy = p.y + Math.sin(a) * rr * 0.5;
        const s = w.add.image(sx, sy, 'gs_stroke').setDepth(5630).setScale(0.6).setAlpha(0).setRotation(Math.random() * 6.28);
        strokes.push({ s, born: w.time.now, sx, sy, side: i % 2 ? 1 : -1, spin: (Math.random() - 0.5) * 8 });
        if (i % 3 === 0) { TT.FX.burst(w, sx, sy, [INK, PAPER], 4, 40); TT.SFX.slash(false); }
      });
    }

    let writeT = now;
    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now, el = tn - t0;
      if (w.dead && alive) { cleanup(); return; }
      drawArray(arr, p.x, p.y, st.r, el / 1400, st.a, 0.5 + 0.5 * Math.sin(el / 140));
      arrGlow.setPosition(p.x, p.y).setAlpha(st.a * (0.22 + 0.08 * Math.sin(el / 160)));
      motes.setPosition(p.x, p.y);
      // viết liên tục: phát lại động tác bắt ấn viết chữ
      if (phase === 'gather' && tn - writeT > 460) { writeT = tn; w.playAnim('cast'); }
      const G = glyphPos();
      if (phase === 'gather') {
        glyph.setPosition(G.x, G.y + Math.sin(el / 220) * 1.2);
        glyphHalo.setPosition(G.x, G.y);
      }
      strokes.forEach(o => {
        if (o.done) return;
        const k = Math.min(1, (tn - o.born) / 700), e = Phaser.Math.Easing.Cubic.InOut(k);
        const mx = (o.sx + G.x) / 2 + o.side * 28, my = Math.min(o.sy, G.y) - 22;
        const x = (1 - e) * (1 - e) * o.sx + 2 * (1 - e) * e * mx + e * e * G.x;
        const y = (1 - e) * (1 - e) * o.sy + 2 * (1 - e) * e * my + e * e * G.y;
        const vx = x - o.s.x, vy = y - o.s.y;
        o.s.setPosition(x, y).setAlpha(Math.min(1, k * 4)).setScale(0.6 + 0.3 * Math.sin(k * Math.PI));
        if (vx * vx + vy * vy > 0.01) o.s.setRotation(Math.atan2(vy, vx));
        if (k >= 1) {
          o.done = true; o.s.destroy(); collected++;
          const f = collected / N_STROKES;
          glyph.setAlpha(Math.min(1, 0.15 + f)).setScale(0.25 + 0.45 * f);
          glyphHalo.setAlpha(0.15 + 0.35 * f).setScale(1.2 + 1.3 * f);
          TT.FX.burst(w, G.x, G.y, [INK, PAPER], 3, 30);
        }
      });
      if (phase === 'dragons') dragonStep(tn);
    }});

    // ---- chữ viết xong: phất tay ném chữ vào mục tiêu
    let target = null, mountain = null, pinned = [];
    w.time.delayedCall(GATHER, () => {
      if (!alive) return;
      const e = w.nearestEnemies(p.x, p.y, 240, 1)[0];
      if (e) w.facing.set(e.x - p.x, e.y - p.y).normalize();
      target = e ? { x: e.x, y: e.y, e } : { x: p.x + w.facing.x * 130, y: p.y + w.facing.y * 130 };
      phase = 'throw';
      camAim(target.x, target.y);
      strokes.forEach(o => { if (!o.done) { o.done = true; o.s.destroy(); } });
      glyph.setAlpha(1).setScale(0.7);
      w.playAnim(TT.Caster && TT.Caster.anims.cast_point ? 'cast_point' : 'cast');
      w.lockUntil = Math.max(w.lockUntil, w.time.now + 500);
      w.skillLock = Math.max(w.skillLock, w.time.now + 500);
      TT.FX.flash(w, 0.12, 200, 0xffffff);
      TT.SFX.dash();
      w.tweens.add({ targets: st, a: 0, r: ARRAY_R + 14, duration: 700, ease: 'Quad.easeIn' });
      motes.stop();
      const trail = w.add.particles(0, 0, 'dot', {
        speed: { min: 4, max: 18 }, lifespan: { min: 220, max: 420 }, scale: { start: 1.1, end: 0 },
        alpha: { start: 0.9, end: 0 }, tint: [INK, PAPER, GREY], frequency: 14, quantity: 2
      }).setDepth(5635);
      trail.startFollow(glyph);
      const sx = glyph.x, sy = glyph.y, o = { k: 0 };
      w.tweens.add({ targets: o, k: 1, duration: THROW, ease: 'Sine.easeIn', onUpdate: () => {
        if (target.e && target.e.active && !target.e.dying) { target.x = target.e.x; target.y = target.e.y; }
        const tx = target.x, ty = target.y - 12;
        glyph.setPosition(sx + (tx - sx) * o.k, sy + (ty - sy) * o.k - Math.sin(o.k * Math.PI) * 18)
          .setScale(0.7 + 0.2 * Math.sin(o.k * Math.PI)).setRotation(Math.sin(o.k * 9) * 0.15);
        glyphHalo.setPosition(glyph.x, glyph.y);
      }, onComplete: () => { trail.stop(); w.time.delayedCall(500, () => trail.destroy()); impact(); } });
    });

    // ---- chữ trúng mục tiêu: núi thuỷ mặc giáng xuống đè lên, mục tiêu bất động
    function impact() {
      if (!alive) return;
      const x = target.x, y = target.y;
      w.tweens.add({ targets: [glyph, glyphHalo], alpha: 0, scale: 0.9, duration: 260 });
      TT.FX.burst(w, x, y - 12, [INK, PAPER, GREY], 22, 140);
      TT.FX.ring(w, x, y, 0xffffff, 1.4, 320);
      w.hitEnemiesInRadius(x, y, 30, dmg * 2, { ox: x, oy: y, force: 30 });
      TT.SFX.hit();
      pinned = w.nearestEnemies(x, y, 44, 99);
      pinned.forEach(en => { en.frozenTint = 0x9a9a9a; en.timeTint = true; en.setTint(0x9a9a9a); en.frozenUntil = w.time.now + PIN; });
      const mk = w.textures.exists('gs_mountain') ? 'gs_mountain' : 'gsx_mountain';
      mountain = w.add.image(x, y - 140, mk, 0).setOrigin(0.5, 1).setDepth(y + 30).setAlpha(0).setScale(mk === 'gs_mountain' ? 0.85 : 0.75);
      w.tweens.add({ targets: mountain, y: y + 10, alpha: 1, duration: 240, ease: 'Quad.easeIn', onComplete: () => {
        w.cameras.main.shake(260, 0.008);
        TT.SFX.boom();
        TT.FX.ring(w, x, y + 4, GREY, 2.2, 420);
        TT.FX.burst(w, x, y + 4, [PAPER, GREY, INK], 26, 110, { gravityY: 120 });
        w.hitStop(90);
        w.time.delayedCall(380, summonDragons);
      } });
    }

    // ---- hai con rồng mực bay lượn ra từ hai đám mây, ngoạm vào mục tiêu
    // Rồng nối đốt: đầu (gs_dhead) bay theo một đường cong; SEGS lát thân (gs_dbody) đặt lùi sau đầu theo đúng đường đã bay,
    // nên thân uốn theo đường lượn. Lát nào còn "trong mây" (chưa ra khỏi điểm xuất phát) thì ẩn: rồng chui dần ra khỏi mây.
    const SEGS = 44, SEG_GAP = 4.2, HEAD_DIR = 0.84;      // số lát thân, khoảng cách lát (px), hướng mõm trong ảnh đầu (rad)
    const HEAD_O = [0.04, 0.5], BODY_OY = 15 / 32;         // điểm cổ trong ảnh đầu; trục thân trong lát thân
    const segOK = w.textures.exists('gs_dhead') && w.textures.exists('gs_dbody');
    const dragons = [];
    let dragonT = 0, hits = 0;

    // đường bay: từ mây vòng ra ngoài, lượn một vòng rồi bổ xuống mục tiêu (bézier bậc 3, lấy mẫu theo độ dài cung)
    function flightPath(c, tx, ty) {
      const P = [{ x: c.x, y: c.y + 8 }, { x: c.x + c.side * 80, y: c.y + 70 },
                 { x: tx + c.side * 110, y: ty - 110 }, { x: tx, y: ty }];
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const t = i / 120, u = 1 - t;
        const x = u * u * u * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t * t * t * P[3].x;
        const y = u * u * u * P[0].y + 3 * u * u * t * P[1].y + 3 * u * t * t * P[2].y + t * t * t * P[3].y;
        pts.push({ x, y, s: i ? pts[i - 1].s + Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y) : 0 });
      }
      return pts;
    }
    function along(pts, s) {                     // điểm + góc tiếp tuyến tại độ dài cung s
      if (s <= 0) {
        const a = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        return { x: pts[0].x + Math.cos(a) * s, y: pts[0].y + Math.sin(a) * s, a };
      }
      let i = 1;
      while (i < pts.length - 1 && pts[i].s < s) i++;
      const A = pts[i - 1], B = pts[i], k = Math.min(1, (s - A.s) / ((B.s - A.s) || 1));
      return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, a: Math.atan2(B.y - A.y, B.x - A.x) };
    }

    function summonDragons() {
      if (!alive) return;
      TT.SFX.thunder(false);
      clouds.forEach((c, j) => {
        w.tweens.add({ targets: c.spr, scale: c.spr.scale * 1.12, duration: 160, yoyo: true });   // mây cuộn lên khi rồng lao ra
        const d = { side: c.side, c, delay: 300 + j * 200, done: false };
        if (segOK) {
          d.body = [];
          for (let i = 0; i < SEGS; i++) {
            const k = 1 - i / SEGS;                                                // to ở cổ, thuôn về đuôi
            d.body.push(w.add.image(c.x, c.y, 'gs_dbody').setOrigin(0.5, BODY_OY).setDepth(5655 - i * 0.001)
              .setScale(DRAGON_SC * 0.6, DRAGON_SC * (0.35 + 0.75 * Math.sqrt(k))).setVisible(false));
          }
          d.head = w.add.image(c.x, c.y, 'gs_dhead').setOrigin(HEAD_O[0], HEAD_O[1]).setDepth(5656).setScale(DRAGON_SC).setVisible(false);
        } else if (hasDragon) {
          d.dragon = w.add.sprite(c.x, c.y, 'gs_dragon', 0).setDepth(5655).setAlpha(0).setFlipX(c.side > 0);
          d.dragon.play({ key: 'gs_dragon_fly', startFrame: j * 2 });
        }
        dragons.push(d);
      });
      dragonT = w.time.now;
      phase = 'dragons';
    }

    const BITE = 320, FADE = 360;
    function hideDragon(d) {
      d.gone = true;
      (d.body || []).forEach(o => o.setVisible(false));
      if (d.head) d.head.setVisible(false);
      if (d.dragon) d.dragon.setVisible(false);
    }
    function dragonStep(tn) {
      fx.clear();
      const x = target.x, y = target.y - 16;
      dragons.forEach(d => {
        const u = (tn - dragonT - d.delay) / DRAGON;
        if (u < 0 || d.gone) return;
        if (!d.done) d.path = flightPath(d.c, x, y);                                // bám theo mục tiêu đang di chuyển
        const L = d.path[d.path.length - 1].s;
        const k = Math.min(1, u), sHead = L * Phaser.Math.Easing.Sine.InOut(k);
        let al = 1, shake = 0, bk = 0;
        if (d.done) {
          const b = tn - d.biteT;
          shake = Math.max(0, 1 - b / BITE); bk = Math.min(1, b / BITE);
          al = b < BITE ? 1 : Math.max(0, 1 - (b - BITE) / FADE);
          if (al <= 0) { hideDragon(d); return; }
        }
        if (d.head) {
          // thân: lát i lùi sau đầu i*SEG_GAP theo đường bay; thêm sóng nhẹ cho thân trườn
          d.body.forEach((o, i) => {
            const sb = sHead - (i + 1) * SEG_GAP;
            if (sb < 0) { o.setVisible(false); return; }                             // còn trong mây
            const q = along(d.path, sb), wv = Math.sin((sb - tn * 0.25) / 14) * 3 * (1 - k * 0.6);
            o.setVisible(true).setPosition(q.x - Math.sin(q.a) * wv, q.y + Math.cos(q.a) * wv)
              .setRotation(q.a).setFlipY(Math.cos(q.a) < 0).setAlpha(al);
          });
          const hp = along(d.path, sHead), flip = Math.cos(hp.a) < 0;
          const hx = hp.x + Math.sin(tn / 24) * 2 * shake, hy = hp.y + Math.cos(tn / 31) * 1.2 * shake;
          // ảnh đầu: cổ ở mép trái, mõm chúc xuống; bay sang trái thì lật dọc để sừng vẫn ở trên
          d.head.setVisible(true).setPosition(hx, hy).setFlipY(flip)
            .setRotation(hp.a - (flip ? -HEAD_DIR : HEAD_DIR) * 0.55).setAlpha(al)
            .setScale(DRAGON_SC * (1 + 0.12 * Math.sin(bk * Math.PI)));
        } else if (d.dragon) {
          const hp = along(d.path, sHead);
          d.dragon.setOrigin(d.side > 0 ? 0.08 : 0.92, 0.72).setPosition(hp.x, hp.y).setAlpha(al * Math.min(1, k * 5))
            .setRotation(d.side > 0 ? -(Math.atan2(Math.sin(hp.a), -Math.cos(hp.a)) - 0.44) : hp.a - 0.44);
        }
        if (k >= 1 && !d.done) {
          d.done = true; d.biteT = tn; hits++;
          TT.FX.burst(w, x, y, [INK, PAPER, GREY], 30, 150);
          TT.FX.ring(w, x, y + 12, INK, 1.6, 320);
          TT.FX.flash(w, 0.08, 140, 0xffffff);
          w.hitEnemiesInRadius(x, y + 16, 36, dmg * 2, { ox: x, oy: y, force: 10 });
          w.cameras.main.shake(220, 0.008);
          TT.SFX.boom();
          w.time.delayedCall(BITE, () => { if (alive) TT.FX.burst(w, x, y, [INK, GREY, PAPER], 28, 100); });   // tan thành mực
          if (hits === 2) w.time.delayedCall(BITE, finale);
        }
      });
    }

    // ---- kết: núi vỡ thành mực bắn tung, mây tan
    function finale() {
      const x = target.x, y = target.y;
      w.time.delayedCall(120, () => {
        if (!alive) return;
        TT.FX.ring(w, x, y, INK, 2.8, 520);
        TT.FX.ring(w, x, y, PAPER, 1.9, 420, 80);
        TT.FX.burst(w, x, y - 20, [INK, PAPER, GREY], 40, 200, { gravityY: 160 });
        w.hitEnemiesInRadius(x, y, 50, dmg * 1.5, { ox: x, oy: y, force: 220 });
        pinned.forEach(en => { if (en.active) { en.frozenUntil = 0; en.frozenTint = 0; } });
        w.hitStop(110);
        TT.SFX.thunder(true);
        if (mountain) w.tweens.add({ targets: mountain, alpha: 0, scaleX: 0.95, scaleY: 0.5, y: mountain.y + 6, duration: 360 });
        clouds.forEach(c => w.tweens.add({ targets: c.spr, alpha: 0, scale: c.spr.scale * 1.3, duration: 500 }));
      });
      w.time.delayedCall(900, cleanup);
    }

    function cleanup() {
      if (!alive) return;
      alive = false;
      tick.remove();
      [arr, arrGlow, fx, glyph, glyphHalo, motes].forEach(o => o.destroy());
      if (mountain) mountain.destroy();
      clouds.forEach(c => c.spr.destroy());
      dragons.forEach(d => { if (d.dragon) d.dragon.destroy(); if (d.head) d.head.destroy(); (d.body || []).forEach(o => o.destroy()); });
      camBack();
      strokes.forEach(o => { if (!o.done) o.s.destroy(); });
      pinned.forEach(en => { if (en.active) { en.frozenUntil = 0; en.frozenTint = 0; } });
    }
  };
})();
