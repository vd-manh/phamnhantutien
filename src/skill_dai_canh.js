// Kiếm Tu · ô O · Đại Canh Kiếm Trận
// 1) Tụ lực ~4 giây: một tay bắt ấn trước ngực; dưới chân mở pháp trận xanh lục (pixelfx "rune circle" + bát quái,
//    phù văn, chữ 庚 vẽ bằng code). 36 phi kiếm quấn lôi điện lần lượt bay lên từ pháp trận, xếp thành 3 vòng đồng tâm
//    sau lưng như một chiếc khiên kiếm (các vòng xoay ngược chiều, sét giật giữa các kiếm).
// 2) Phát động: tay phải chỉ thẳng thi pháp, khiên kiếm tách ra, từng kiếm lao tới mục tiêu theo đường xoắn ốc quấn vào
//    nhau như lốc xoáy, cắm xuống quanh mục tiêu; thanh cuối cùng gọi lôi giáng xuống (pixelfx lightning strike).
window.TT = window.TT || {};

(function () {
  // khiên kiếm: các vòng đồng tâm (số kiếm, bán kính, cỡ kiếm, chiều xoay)
  const RINGS = [
    { n: 8, R: 10, sc: 0.38, dir: 1 },
    { n: 16, R: 19, sc: 0.45, dir: -1 },
    { n: 22, R: 28, sc: 0.5, dir: 1 },
    { n: 26, R: 37, sc: 0.55, dir: -1 },
  ];                            // tổng 72 thanh
  const N = RINGS.reduce((a, r) => a + r.n, 0);
  const GATHER = 4000;          // thời gian tụ lực (ms)
  const FLY = 720;              // thời gian bay tới mục tiêu (ms)
  const LAUNCH = 940;           // toàn bộ khiên kiếm rời đi trong khoảng này (ms)
  const STAGGER = LAUNCH / N;   // kiếm sau phóng chậm hơn kiếm trước (ms)
  const ARRAY_R = 58;           // bán kính pháp trận
  const C_GREEN = 0x5dffa0, C_LIGHT = 0xd6ffe6, C_BOLT = 0xb8fff0;
  const K_LINE = 0x22c46a, K_DARK = 0x0f7a45, K_HI = 0x9dffc4;
  const TRIGRAMS = [7, 6, 5, 4, 3, 2, 1, 0];      // bát quái: bit = hào liền (1) / đứt (0)

  // ---- texture vẽ một lần: phi kiếm pixel (mũi hướng lên)
  function ensureTextures(scene) {
    if (scene.textures.exists('dc_sword')) return;
    const W = 9, H = 34, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    const OUT = '#0b3b2a', B0 = '#e9fff4', B1 = '#9dffcf', B2 = '#3fd99a', B3 = '#1f8f63';
    for (let y = 1; y <= 22; y++) {
      const half = y < 4 ? 0 : 1;
      for (let x = 4 - half - 1; x <= 4 + half + 1; x++) px(x, y, OUT);
    }
    for (let y = 2; y <= 22; y++) {
      if (y < 4) { px(4, y, B0); continue; }
      px(3, y, B1); px(4, y, B0); px(5, y, B2);
    }
    px(4, 0, OUT);
    for (let y = 6; y <= 20; y += 2) px(4, y, B1);
    for (let x = 0; x <= 8; x++) { px(x, 23, OUT); px(x, 25, OUT); }
    for (let x = 1; x <= 7; x++) px(x, 24, x === 4 ? '#7dffcf' : '#e6c35c');
    px(0, 24, OUT); px(8, 24, OUT);
    for (let y = 26; y <= 31; y++) { px(3, y, OUT); px(5, y, OUT); px(4, y, y % 2 ? B3 : '#145c40'); }
    px(4, 32, '#e6c35c'); px(3, 32, OUT); px(5, 32, OUT); px(4, 33, OUT);
    scene.textures.addCanvas('dc_sword', cv);
  }

  // pháp trận phối cảnh (vẽ lại mỗi khung để xoay đúng trên mặt đất)
  function drawCircle(gfx, x, y, r, rot, alpha, pulse) {
    gfx.clear();
    if (r < 1 || alpha <= 0) return;
    const sy = 0.5;
    const ell = (rr, w, c, a) => { gfx.lineStyle(w, c, a); gfx.strokeEllipse(x, y, rr * 2, rr * 2 * sy); };
    const pt = (rr, ang) => ({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr * sy });
    gfx.fillStyle(K_DARK, 0.2 * alpha); gfx.fillEllipse(x, y, r * 2, r * 2 * sy);
    // vành ngoài kép
    ell(r + 1, 4, K_DARK, 0.5 * alpha);
    ell(r, 2, K_LINE, 0.95 * alpha);
    ell(r * 0.94, 1, K_HI, 0.8 * alpha);
    // vạch chia độ giữa hai vành
    for (let i = 0; i < 36; i++) {
      const a = rot + i / 36 * Math.PI * 2, l = i % 3 === 0 ? 0.86 : 0.9;
      const p0 = pt(r * l, a), p1 = pt(r * 0.94, a);
      gfx.lineStyle(1, i % 3 === 0 ? K_HI : K_LINE, 0.9 * alpha);
      gfx.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    ell(r * 0.84, 1, K_LINE, 0.8 * alpha);
    // bát quái: 8 quẻ quay ngược chiều, mỗi quẻ 3 hào nằm theo tiếp tuyến
    for (let i = 0; i < 8; i++) {
      const a = -rot * 0.6 + i / 8 * Math.PI * 2;
      const tx = -Math.sin(a), ty = Math.cos(a) * sy;
      const tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      for (let b = 0; b < 3; b++) {
        const c = pt(r * (0.66 + b * 0.055), a), half = 4.2;
        const solid = (TRIGRAMS[i] >> b) & 1;
        gfx.lineStyle(1.5, K_HI, 0.9 * alpha);
        if (solid) gfx.lineBetween(c.x - ux * half, c.y - uy * half, c.x + ux * half, c.y + uy * half);
        else {
          gfx.lineBetween(c.x - ux * half, c.y - uy * half, c.x - ux * 1.2, c.y - uy * 1.2);
          gfx.lineBetween(c.x + ux * 1.2, c.y + uy * 1.2, c.x + ux * half, c.y + uy * half);
        }
      }
    }
    ell(r * 0.6, 1.5, K_LINE, 0.9 * alpha);
    // vòng chấm sáng
    for (let i = 0; i < 48; i++) {
      const p = pt(r * 0.53, rot * 1.4 + i / 48 * Math.PI * 2);
      gfx.fillStyle(i % 4 === 0 ? K_HI : K_LINE, (i % 4 === 0 ? 0.6 + 0.4 * pulse : 0.7) * alpha);
      gfx.fillRect(p.x - 0.5, p.y - 0.5, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    // lục mang tinh
    for (let k = 0; k < 2; k++) {
      const pts = [0, 1, 2].map(j => pt(r * 0.46, -rot * 1.5 + k * Math.PI / 3 + j * Math.PI * 2 / 3));
      gfx.lineStyle(1.5, K_LINE, 0.95 * alpha);
      gfx.strokePoints(pts.concat([pts[0]]), false);
    }
    // 12 ký hiệu hình thoi quanh lõi
    for (let i = 0; i < 12; i++) {
      const a = rot * 2.2 + i / 12 * Math.PI * 2, c = pt(r * 0.3, a), d = 1.8;
      gfx.lineStyle(1, K_HI, 0.85 * alpha);
      gfx.strokePoints([{ x: c.x, y: c.y - d * sy }, { x: c.x + d, y: c.y }, { x: c.x, y: c.y + d * sy }, { x: c.x - d, y: c.y }, { x: c.x, y: c.y - d * sy }], false);
    }
    ell(r * 0.22, 1, K_HI, 0.8 * alpha);
  }

  // tia sét gấp khúc giữa 2 điểm
  function bolt(gfx, x0, y0, x1, y1, amp, color, width) {
    const n = 6, pts = [];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = (i === 0 || i === n) ? 0 : (Math.random() * 2 - 1) * amp;
      pts.push({ x: x0 + dx * t + nx * off, y: y0 + dy * t + ny * off });
    }
    gfx.lineStyle(width + 2, C_GREEN, 0.35); gfx.strokePoints(pts, false);
    gfx.lineStyle(width, color, 1); gfx.strokePoints(pts, false);
  }

  TT.Skills.dai_canh = function (w, sk, now) {
    ensureTextures(w);
    const p = w.player, t0 = now;
    const dmg = w.st.atk * sk.dmg;
    const has = n => !!TT.FX.bfx[n];
    // tụ lực: đứng yên, một tay bắt ấn trước ngực
    p.setVelocity(0);
    w.playAnim('cast');
    w.lockUntil = now + GATHER + 250;
    w.skillLock = now + GATHER + 250;
    TT.SFX.cast();

    const circleGlow = w.add.image(p.x, p.y, 'light').setTint(C_GREEN).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-931).setAlpha(0).setScale(3.4, 1.7);
    const circle = w.add.graphics().setDepth(-930);
    const glyph = w.add.text(p.x, p.y, '庚', {
      fontFamily: '"Microsoft YaHei", "SimSun", "Noto Serif SC", serif', fontSize: '40px', fontStyle: 'bold',
      color: '#9dffc4', stroke: '#0f7a45', strokeThickness: 4
    }).setOrigin(0.5).setDepth(-929).setAlpha(0).setScale(0.32, 0.16);
    const rune = has('px_rune_circle_g')
      ? TT.FX.beanfx(w, 'px_rune_circle_g', p.x, p.y, { depth: -928, scale: 1.9, loopMs: GATHER }) : null;
    const fxg = w.add.graphics().setDepth(5600).setBlendMode(Phaser.BlendModes.ADD);   // sét
    const motes = w.add.particles(p.x, p.y, 'dot', {
      speedY: { min: -60, max: -20 }, speedX: { min: -10, max: 10 }, lifespan: { min: 500, max: 1000 },
      scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [C_GREEN, C_LIGHT, C_BOLT],
      blendMode: 'ADD', frequency: 30, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 100, 50) }
    }).setDepth(4100);

    // khiên kiếm sau lưng
    const shieldC = () => ({ x: p.x, y: p.y - w.pH * 0.72 });
    const shieldGlow = w.add.image(p.x, p.y, 'light').setTint(C_GREEN).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(p.depth - 4).setAlpha(0).setScale(1.3);
    const slots = [];
    RINGS.forEach((rg, k) => { for (let j = 0; j < rg.n; j++) slots.push({ k, j, rg, off: k * 0.13 }); });
    const ringRot = [0, 0, 0];
    const swords = [];
    let phase = 'gather', alive = true;
    const slotPos = (sw, C) => {
      const th = sw.slot.j / sw.slot.rg.n * Math.PI * 2 + sw.slot.off + ringRot[sw.slot.k];
      const bob = Math.sin(w.time.now / 180 + sw.i) * 0.8;
      return { th, x: C.x + Math.cos(th) * (sw.slot.rg.R + bob), y: C.y + Math.sin(th) * (sw.slot.rg.R + bob) * 0.92 };
    };

    // phi kiếm lần lượt bay lên từ pháp trận (xếp từ vòng trong ra vòng ngoài)
    slots.forEach((slot, i) => {
      w.time.delayedCall(250 + i * (2700 / N), () => {
        if (!alive) return;
        const a0 = i * 2.39996;                              // góc vàng: rải đều quanh pháp trận
        const rr = ARRAY_R * (0.45 + 0.4 * ((i * 7) % 10) / 10);
        const sx = p.x + Math.cos(a0) * rr, sy = p.y + Math.sin(a0) * rr * 0.5;
        const s = w.add.image(sx, sy, 'dc_sword').setOrigin(0.5, 0.65).setDepth(p.depth - 2).setScale(0.1).setAlpha(0);
        const glow = w.add.image(sx, sy, 'light').setTint(C_GREEN).setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.26).setAlpha(0.45).setDepth(p.depth - 3);
        swords.push({ s, glow, i, slot, state: 'rise', born: w.time.now, x: sx, y: sy });
        if (i % 2 === 0) TT.FX.burst(w, sx, sy, [C_GREEN, C_LIGHT, C_BOLT], 5, 50);
        if (i % 4 === 0) { w.addLight(sx, sy - 6, 40, C_GREEN, 260); TT.SFX.slash(false); }
      });
    });

    const cState = { r: 0, a: 0 };
    w.tweens.add({ targets: cState, r: ARRAY_R, a: 1, duration: 600, ease: 'Back.easeOut' });

    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now, el = tn - t0;
      if (w.dead && alive) { cleanup(); return; }
      RINGS.forEach((rg, k) => { ringRot[k] += rg.dir * (phase === 'gather' ? 0.01 + k * 0.003 : 0.03); });
      drawCircle(circle, p.x, p.y, cState.r, el / 900, cState.a, 0.5 + 0.5 * Math.sin(el / 120));
      circleGlow.setPosition(p.x, p.y).setAlpha(cState.a * (0.35 + 0.1 * Math.sin(el / 150)));
      glyph.setPosition(p.x, p.y).setAlpha(cState.a * (0.75 + 0.25 * Math.sin(el / 200)));
      motes.setPosition(p.x, p.y);
      if (rune) rune.setPos(p.x, p.y);
      if (el % 240 < 17) w.addLight(p.x, p.y - 8, 100 + 30 * Math.sin(el / 200), C_GREEN, 300);
      fxg.clear();

      const C = shieldC();
      let ringed = 0;
      swords.forEach(sw => {
        const sc = SWc(sw);
        if (sw.state === 'rise') {
          const k = Math.min(1, (tn - sw.born) / 420);
          sw.s.setAlpha(k).setScale(sc * (0.2 + 0.8 * k));
          sw.ry = sw.y - 14 * Phaser.Math.Easing.Quadratic.Out(k);
          sw.s.setPosition(sw.x, sw.ry).setRotation(0);
          if (k >= 1) { sw.state = 'gather'; sw.gBorn = tn; sw.fx = sw.x; sw.fy = sw.ry; }
        } else if (sw.state === 'gather') {
          const k = Math.min(1, (tn - sw.gBorn) / 620), e = Phaser.Math.Easing.Cubic.InOut(k);
          const t = slotPos(sw, C);
          const mx = (sw.fx + t.x) / 2 + (sw.fx < p.x ? -14 : 14), my = Math.min(sw.fy, t.y) - 16;
          const x = (1 - e) * (1 - e) * sw.fx + 2 * (1 - e) * e * mx + e * e * t.x;
          const y = (1 - e) * (1 - e) * sw.fy + 2 * (1 - e) * e * my + e * e * t.y;
          sw.s.setPosition(x, y).setRotation(Phaser.Math.Angle.RotateTo(sw.s.rotation, t.th + Math.PI / 2, 0.25))
            .setDepth(p.depth - 2);
          if (k >= 1) sw.state = 'ring';
        } else if (sw.state === 'ring') {
          const t = slotPos(sw, C);
          sw.s.setPosition(t.x, t.y).setRotation(t.th + Math.PI / 2).setDepth(p.depth - 2 - sw.slot.k * 0.01);
          ringed++;
        }
        if (sw.state !== 'fly' && sw.state !== 'done') sw.glow.setPosition(sw.s.x, sw.s.y).setDepth(sw.s.depth - 1);
        if (sw.state !== 'done' && Math.random() < (sw.state === 'fly' ? 0.2 : 0.06)) {
          const a = sw.s.rotation - Math.PI / 2, L = 6;
          bolt(fxg, sw.s.x - Math.cos(a) * L, sw.s.y - Math.sin(a) * L, sw.s.x + Math.cos(a) * L, sw.s.y + Math.sin(a) * L, 2.5, C_BOLT, 1);
        }
      });
      // mặt khiên: quầng sáng sau vòng kiếm, đậm dần theo số kiếm đã vào vị trí
      shieldGlow.setPosition(C.x, C.y).setDepth(p.depth - 4)
        .setAlpha(phase === 'gather' ? 0.45 * ringed / N * (0.85 + 0.15 * Math.sin(tn / 140)) : Math.max(0, shieldGlow.alpha - 0.04));
      // sét nhảy giữa các kiếm cạnh nhau trên cùng một vòng và giữa các vòng
      const inRing = swords.filter(sw => sw.state === 'ring');
      if (inRing.length > 1) {
        for (let q = 0; q < 3; q++) {
          if (Math.random() < 0.5) {
            const a = inRing[(Math.random() * inRing.length) | 0];
            const b = inRing.find(o => o !== a && o.slot.k === a.slot.k && (o.slot.j === (a.slot.j + 1) % a.slot.rg.n))
              || inRing.find(o => o.slot.k === a.slot.k + 1);
            if (b) bolt(fxg, a.s.x, a.s.y, b.s.x, b.s.y, 3, C_LIGHT, 1);
          }
        }
      }
      if (phase === 'gather' && inRing.length && Math.random() < 0.07) {
        const a = inRing[(Math.random() * inRing.length) | 0];
        bolt(fxg, p.x + (Math.random() * 2 - 1) * 40, p.y, a.s.x, a.s.y, 7, C_BOLT, 1.5);
      }
      if (phase === 'launch') flyStep(tn);
    }});

    const SWc = sw => sw.slot.rg.sc;

    // ---- phát động: tay phải chỉ thẳng thi pháp, khiên kiếm tách ra thành lốc xoáy lao tới mục tiêu
    let target = null, launchT = 0, landed = 0;
    w.time.delayedCall(GATHER, () => {
      if (!alive) return;
      const e = w.nearestEnemies(p.x, p.y, 230, 1)[0];
      if (e) w.facing.set(e.x - p.x, e.y - p.y).normalize();
      target = e ? { x: e.x, y: e.y, e } : { x: p.x + w.facing.x * 130, y: p.y + w.facing.y * 130 };
      phase = 'launch'; launchT = w.time.now;
      // động tác chỉ kiếm thi pháp (khung 3-6 của hàng thi pháp); giữ đến khi kiếm cuối rời khiên
      w.playAnim(TT.Caster.anims.cast_point ? 'cast_point' : 'cast');
      const hold = N * STAGGER + 250;
      w.lockUntil = Math.max(w.lockUntil, launchT + hold);
      w.skillLock = Math.max(w.skillLock, launchT + hold);
      TT.FX.warn(w, target.x, target.y, 40, FLY + N * STAGGER);
      TT.FX.flash(w, 0.12, 200, C_GREEN);
      TT.SFX.thunder(false);
      w.cameras.main.shake(160, 0.004);
      const C = shieldC();
      swords.forEach(sw => {
        if (sw.state === 'rise' || sw.state === 'gather') sw.state = 'ring';
        sw.start = { x: sw.s.x, y: sw.s.y };
        sw.c0 = C;
        // phóng từ vòng ngoài vào trong, xen kẽ quanh vòng cho đều
        sw.delay = (N - 1 - sw.i) * STAGGER;
        if (sw.i % 4 === 0) {
          sw.trail = w.add.particles(0, 0, 'dot', {
            speed: { min: 2, max: 8 }, lifespan: { min: 200, max: 380 }, scale: { start: 0.8, end: 0 },
            alpha: { start: 0.9, end: 0 }, tint: [C_GREEN, C_LIGHT, C_BOLT], blendMode: 'ADD', frequency: 18
          }).setDepth(5550);
          sw.trail.startFollow(sw.s);
        }
      });
      w.tweens.add({ targets: cState, a: 0, r: ARRAY_R + 16, duration: 700, ease: 'Quad.easeIn' });
      w.tweens.add({ targets: glyph, alpha: 0, duration: 500 });
      motes.stop();
    });

    function flyStep(tn) {
      if (target && target.e && target.e.active && !target.e.dying) { target.x = target.e.x; target.y = target.e.y; }
      swords.forEach(sw => {
        if (sw.state === 'done') return;
        const u = (tn - launchT - sw.delay) / FLY;
        if (u < 0) {                                         // vẫn nằm trên khiên, xoay theo vòng
          const t = slotPos(sw, shieldC());
          sw.s.setPosition(t.x, t.y).setRotation(t.th + Math.PI / 2);
          sw.glow.setPosition(t.x, t.y);
          sw.start = { x: t.x, y: t.y }; sw.c0 = shieldC();
          return;
        }
        if (sw.state !== 'fly') { sw.state = 'fly'; if (sw.i % 6 === 0) TT.SFX.dash(); }
        const k = Math.min(1, u), e = Phaser.Math.Easing.Sine.In(k);
        const ax = sw.c0.x + (target.x - sw.c0.x) * e, ay = sw.c0.y + (target.y - 6 - sw.c0.y) * e;
        const dx = target.x - sw.c0.x, dy = target.y - 6 - sw.c0.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const spin = sw.i / N * Math.PI * 2 + k * Math.PI * 4.5;
        const rad = 12 * (1 - k) + 11 * Math.sin(Math.PI * Math.min(1, k * 1.15));   // phình ra giữa đường như lốc xoáy
        const helX = nx * Math.cos(spin) * rad, helY = ny * Math.cos(spin) * rad - Math.sin(spin) * rad * 0.55;
        const blend = Math.min(1, k * 4);
        const ringX = sw.start.x - sw.c0.x, ringY = sw.start.y - sw.c0.y;
        const x = ax + ringX * (1 - blend) * (1 - k) + helX * blend;
        const y = ay + ringY * (1 - blend) * (1 - k) + helY * blend;
        const vx = x - sw.s.x, vy = y - sw.s.y;
        if (vx * vx + vy * vy > 0.01) sw.s.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
        sw.s.setPosition(x, y).setDepth(y + 40);
        sw.glow.setPosition(x, y).setDepth(y + 39);
        if (k >= 1) land(sw);
      });
    }

    function land(sw) {
      sw.state = 'done';
      const x = target.x + Phaser.Math.Between(-10, 10), y = target.y + Phaser.Math.Between(-5, 5);
      sw.s.setPosition(x, y - 4).setRotation(Math.PI).setDepth(y + 2);        // cắm xuống đất
      if (sw.trail) sw.trail.stop();
      if (sw.i % 2 === 0) TT.FX.burst(w, x, y, [C_GREEN, C_LIGHT, 0xffffff], 5, 80);
      if (sw.i % 6 === 0) {
        w.addLight(x, y - 6, 60, C_GREEN, 260);
        if (has('px_zap_hit_g')) TT.FX.beanfx(w, 'px_zap_hit_g', x, y - 4, { depth: y + 50, scale: 0.7, flip: Math.random() < 0.5 });
        else bolt(fxg, x, y - 40, x, y, 6, C_BOLT, 1.5);
        TT.SFX.hit();
        w.cameras.main.shake(50, 0.003);
      }
      w.hitEnemiesInRadius(x, y, 22, dmg * 3.6 / N, { ox: x, oy: y + 6, force: 40 });   // tổng sát thương kiếm không đổi
      landed++;
      w.tweens.add({ targets: [sw.s, sw.glow], alpha: 0, delay: 500, duration: 350,
        onComplete: () => { sw.s.destroy(); sw.glow.destroy(); if (sw.trail) sw.trail.destroy(); } });
      if (landed === N) finale();
    }

    function finale() {
      const x = target.x, y = target.y;
      const boom = () => {
        TT.FX.ring(w, x, y, C_GREEN, 2.6, 500);
        TT.FX.ring(w, x, y, C_LIGHT, 1.6, 380, 90);
        TT.FX.flash(w, 0.1, 320, C_GREEN);
        w.addLight(x, y - 10, 220, C_GREEN, 800);
        w.hitEnemiesInRadius(x, y, 52, dmg * 1.5, { ox: x, oy: y, force: 240 });
        w.hitStop(100);
        TT.SFX.boom();
      };
      if (has('px_lightning_strike_g')) {
        // pixelfx: tia sét chạm đất ở giây 0.77 -> phát từ giây 0.6 để sét giáng gần như ngay
        TT.FX.beanfx(w, 'px_lightning_strike_g', x, y, { depth: y + 60, scale: 1.1, startAt: 0.6 });
        w.time.delayedCall(170, () => {
          if (has('px_ground_slam_g')) TT.FX.beanfx(w, 'px_ground_slam_g', x, y, { depth: y + 55, scale: 1.0 });
          TT.SFX.thunder(true);
          w.cameras.main.shake(320, 0.009);
          boom();
        });
      } else {
        TT.FX.lightning(w, x, y, { scale: 0.95, tint: C_GREEN });
        boom();
      }
      w.time.delayedCall(900, cleanup);
    }

    function cleanup() {
      if (!alive) return;
      alive = false;
      tick.remove();
      circle.destroy(); circleGlow.destroy(); glyph.destroy(); shieldGlow.destroy(); fxg.destroy(); motes.destroy();
      if (rune) rune.stop();
      swords.forEach(sw => {
        if (sw.state !== 'done') { sw.s.destroy(); sw.glow.destroy(); if (sw.trail) sw.trail.destroy(); }
      });
    }
  };
})();
