// Đạo Gia · ô U · Thiên Lôi Kiếp (tông trắng đen thuỷ mặc)
// 1) Viết nhanh chữ 雷 (nét mực tụ trước mặt), ném chữ vào yêu thú gần nhất.
// 2) Trúng: trên đầu mục tiêu hiện đám mây mực xoáy (gs_cloud), mây bám theo mục tiêu,
//    liên tục giáng sét trắng viền mực xuống đầu nó (mỗi tia gây sát thương nhỏ, lan sang yêu thú sát bên).
// 3) Hết thời gian (hoặc mục tiêu chết thì mây chuyển sang yêu thú gần đó) mây tan.
window.TT = window.TT || {};

(function () {
  const WRITE = 1100;           // thời gian viết chữ (ms)
  const N_STROKES = 8;
  const THROW = 340;
  const STORM = 5200;           // mây giáng sét trong bao lâu (ms)
  const BOLT_EVERY = 420;       // khoảng cách giữa hai tia sét (ms)
  const CLOUD_H = 74;           // mây cao hơn chân mục tiêu (px)
  const CLOUD_W = 110;
  const INK = 0x111111, PAPER = 0xf4f1ea, GREY = 0x8a8a8a;

  // tia sét gấp khúc: lõi trắng, viền mực, nhánh phụ
  function boltPts(x0, y0, x1, y1, amp) {
    const n = 7, pts = [], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = (i === 0 || i === n) ? 0 : (Math.random() * 2 - 1) * amp * (1 - t * 0.4);
      pts.push({ x: x0 + dx * t + nx * off, y: y0 + dy * t + ny * off });
    }
    return pts;
  }
  // w: độ dày (1 = tia thường, ~1.8 = tia sấm lớn)
  function drawBolt(g, pts, a, w) {
    w = w || 1;
    g.lineStyle(9 * w, INK, 0.85 * a); g.strokePoints(pts, false);
    g.lineStyle(5 * w, PAPER, a); g.strokePoints(pts, false);
    g.lineStyle(2 * w, 0xffffff, a); g.strokePoints(pts, false);
  }
  function drawGlow(g, pts, a, w) {             // quầng sáng (lớp ADD)
    g.lineStyle(22 * (w || 1), 0xffffff, 0.22 * a); g.strokePoints(pts, false);
    g.lineStyle(12 * (w || 1), 0xffffff, 0.35 * a); g.strokePoints(pts, false);
  }

  TT.Skills.loi_kiep = function (w, sk, now) {     // mã loi_kiep: "thien_loi" đã là Thiên Lôi Dẫn của Pháp Tu
    if (TT.Skills._gsTextures) TT.Skills._gsTextures(w);
    const p = w.player, dmg = w.st.atk * sk.dmg;
    let target = w.nearestEnemies(p.x, p.y, 230, 1)[0] || null;
    if (target) w.facing.set(target.x - p.x, target.y - p.y).normalize();
    p.setVelocity(0);
    w.playAnim('cast');
    w.lockUntil = now + WRITE + 250;
    w.skillLock = now + WRITE + 250;
    TT.SFX.cast();

    let alive = true, phase = 'write', collected = 0;
    const glyphPos = () => ({ x: p.x + w.facing.x * 24, y: p.y - w.pH * 1.0 + w.facing.y * 6 });
    const g0 = glyphPos();
    const glyph = w.add.text(g0.x, g0.y, '雷', {
      fontFamily: '"STXingkai", "KaiTi", "STKaiti", "Kaiti SC", "Microsoft YaHei", "SimSun", serif',
      fontSize: '64px', color: '#111111', stroke: '#f4f1ea', strokeThickness: 6
    }).setOrigin(0.5).setDepth(5640).setAlpha(0).setScale(0.18);
    const halo = w.add.image(g0.x, g0.y, 'light').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(5639).setAlpha(0);
    const strokes = [];
    for (let i = 0; i < N_STROKES; i++) {
      w.time.delayedCall(80 + i * ((WRITE - 380) / N_STROKES), () => {
        if (!alive) return;
        const a = i * 2.39996, rr = 22 + (i * 7) % 14;
        const sx = p.x + Math.cos(a) * rr, sy = p.y + Math.sin(a) * rr * 0.5;
        const s = w.add.image(sx, sy, w.textures.exists('gs_stroke') ? 'gs_stroke' : 'dot').setDepth(5630).setScale(0.55).setAlpha(0);
        strokes.push({ s, born: w.time.now, sx, sy, side: i % 2 ? 1 : -1 });
      });
    }

    // camera: từ lúc ném chữ, lùi ra và dời tâm để thấy cả nhân vật lẫn mây giông; bám theo mây (mây đi theo yêu thú)
    const cam = w.cameras.main, zoom0 = cam.zoom, camO = { x: 0, y: 0 };
    let camOn = false, camDone = false;
    function camTrack(tx, ty) {                      // tx, ty: chân mục tiêu (mây ở trên cao CLOUD_H)
      const xs = [p.x - 30, p.x + 30, tx - CLOUD_W / 2 - 10, tx + CLOUD_W / 2 + 10];
      const ys = [p.y - w.pH - 30, p.y + 20, ty - CLOUD_H - 40, ty + 24];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const z = Math.max(0.9, Math.min(zoom0, cam.width / (x1 - x0 + 40), cam.height / (y1 - y0 + 40)) * 0.88);
      cam.setZoom(cam.zoom + (z - cam.zoom) * 0.08);
      camO.x += (p.x - (x0 + x1) / 2 - camO.x) * 0.1;
      camO.y += (p.y - (y0 + y1) / 2 - camO.y) * 0.1;
      cam.setFollowOffset(camO.x, camO.y);
    }
    function camBack() {
      if (camDone) return;
      camDone = true;
      cam.zoomTo(zoom0, 600, 'Sine.easeInOut', true);
      w.tweens.add({ targets: camO, x: 0, y: 0, duration: 600, ease: 'Sine.easeInOut', onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    }

    const fx = w.add.graphics().setDepth(5655);          // tia sét
    const glow = w.add.graphics().setDepth(5654).setBlendMode(Phaser.BlendModes.ADD);   // quầng sáng quanh tia
    let cloud = null, stormT = 0, nextBolt = 0, bolts = [], nBolt = 0;
    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now;
      if (w.dead && alive) { cleanup(); return; }
      const G = glyphPos();
      if (phase === 'write') { glyph.setPosition(G.x, G.y); halo.setPosition(G.x, G.y); }
      strokes.forEach(o => {
        if (o.done) return;
        const k = Math.min(1, (tn - o.born) / 420), e = Phaser.Math.Easing.Cubic.InOut(k);
        const mx = (o.sx + G.x) / 2 + o.side * 16, my = Math.min(o.sy, G.y) - 12;
        const x = (1 - e) * (1 - e) * o.sx + 2 * (1 - e) * e * mx + e * e * G.x;
        const y = (1 - e) * (1 - e) * o.sy + 2 * (1 - e) * e * my + e * e * G.y;
        const vx = x - o.s.x, vy = y - o.s.y;
        o.s.setPosition(x, y).setAlpha(Math.min(1, k * 4));
        if (vx * vx + vy * vy > 0.01) o.s.setRotation(Math.atan2(vy, vx));
        if (k >= 1) {
          o.done = true; o.s.destroy(); collected++;
          const f = collected / N_STROKES;
          glyph.setAlpha(Math.min(1, 0.2 + f)).setScale(0.18 + 0.32 * f);
          halo.setAlpha(0.1 + 0.3 * f).setScale(0.8 + f);
        }
      });
      if (phase === 'storm') stormStep(tn);
      if (camOn && !camDone) {
        const tg = phase === 'storm' && cloud ? cloud.home
          : (target && target.active && !target.dying ? { x: target.x, y: target.y } : { x: glyph.x, y: glyph.y + 10 });
        camTrack(tg.x, tg.y);
      }
    }});

    // ---- ném chữ
    w.time.delayedCall(WRITE, () => {
      if (!alive) return;
      phase = 'throw';
      camOn = true;
      strokes.forEach(o => { if (!o.done) { o.done = true; o.s.destroy(); } });
      if (!target || !target.active || target.dying) target = w.nearestEnemies(p.x, p.y, 230, 1)[0] || null;
      const dest = () => target && target.active && !target.dying
        ? { x: target.x, y: target.y - 10 } : { x: p.x + w.facing.x * 120, y: p.y + w.facing.y * 120 - 10 };
      w.playAnim(TT.Caster && TT.Caster.anims.cast_point ? 'cast_point' : 'cast');
      TT.SFX.dash();
      glyph.setAlpha(1).setScale(0.5);
      const sx = glyph.x, sy = glyph.y, o = { k: 0 };
      const trail = w.add.particles(0, 0, 'dot', {
        speed: { min: 4, max: 16 }, lifespan: { min: 200, max: 380 }, scale: { start: 1, end: 0 },
        alpha: { start: 0.9, end: 0 }, tint: [INK, PAPER, GREY], frequency: 14, quantity: 2
      }).setDepth(5635);
      trail.startFollow(glyph);
      w.tweens.add({ targets: o, k: 1, duration: THROW, ease: 'Sine.easeIn', onUpdate: () => {
        const d = dest();
        glyph.setPosition(sx + (d.x - sx) * o.k, sy + (d.y - sy) * o.k - Math.sin(o.k * Math.PI) * 14);
        halo.setPosition(glyph.x, glyph.y);
      }, onComplete: () => {
        trail.stop(); w.time.delayedCall(450, () => trail.destroy());
        const d = dest();
        w.tweens.add({ targets: [glyph, halo], alpha: 0, scale: 0.9, duration: 220 });
        TT.FX.burst(w, d.x, d.y, [INK, PAPER, GREY], 16, 110);
        TT.SFX.hit();
        if (target && target.active && !target.dying) w.damageEnemy(target, dmg * 0.6, { kx: 0, ky: 0, force: 10 });
        startStorm(d.x, d.y + 10);
      } });
    });

    // ---- mây giông bám theo mục tiêu, giáng sét liên tục
    function startStorm(x, y) {
      if (!alive) return;
      const hasCloud = w.textures.exists('gs_cloud');
      if (hasCloud && !w.anims.exists('gs_cloud_spin'))
        w.anims.create({ key: 'gs_cloud_spin', frames: w.anims.generateFrameNumbers('gs_cloud'), frameRate: 12, repeat: -1 });
      cloud = hasCloud ? w.add.sprite(x, y - CLOUD_H, 'gs_cloud', 0).setDepth(5660).setScale(0)
                       : w.add.image(x, y - CLOUD_H, 'light').setTint(GREY).setDepth(5660).setScale(0);
      if (hasCloud) cloud.play('gs_cloud_spin');
      cloud.home = { x, y };
      w.tweens.add({ targets: cloud, scale: CLOUD_W / (hasCloud ? cloud.width : 64), duration: 380, ease: 'Back.easeOut' });
      TT.SFX.thunder(false);
      stormT = w.time.now; nextBolt = stormT + 300;
      phase = 'storm';
    }

    function stormStep(tn) {
      // mây bám theo mục tiêu; mục tiêu chết thì chuyển sang yêu thú gần nhất trong tầm
      if (!target || !target.active || target.dying) {
        const n = w.nearestEnemies(cloud.home.x, cloud.home.y, 110, 1)[0];
        target = n || null;
      }
      if (target) cloud.home = { x: target.x, y: target.y };
      const hx = cloud.home.x, hy = cloud.home.y;
      cloud.x += (hx - cloud.x) * 0.12;
      cloud.y += (hy - CLOUD_H + Math.sin(tn / 260) * 2 - cloud.y) * 0.12;
      fx.clear(); glow.clear();
      // tia sét: sống 260ms, giật lóe 2 nhịp (sáng - tối - sáng) như sét thật; tia lớn đổi hình gấp khúc ở nhịp 2
      const LIFE = 260;
      bolts = bolts.filter(b => tn - b.t < LIFE);
      bolts.forEach(b => {
        const age = tn - b.t, k = age / LIFE;
        const flick = age < 50 ? 1 : age < 90 ? 0.25 : age < 150 ? 1 : 1 - (age - 150) / (LIFE - 150);
        if (b.big && age >= 90 && !b.re) { b.re = true; b.pts = boltPts(b.pts[0].x, b.pts[0].y, b.pts[b.pts.length - 1].x, b.pts[b.pts.length - 1].y, b.amp); }
        drawGlow(glow, b.pts, flick * (1 - k * 0.5), b.w);
        drawBolt(fx, b.pts, flick, b.w);
      });
      // mây chớp sáng ngay trước khi giáng sét
      if (cloud.setTintFill) {
        const pre = nextBolt - tn;
        if (pre < 110 && pre > 0 && tn - stormT < STORM) cloud.setTintFill(0xffffff); else cloud.clearTint();
      }
      if (tn >= nextBolt && tn - stormT < STORM) {
        nBolt++;
        const big = nBolt % 3 === 0;                                          // cứ tia thứ 3 là sấm sét lớn
        nextBolt = tn + BOLT_EVERY * Phaser.Math.FloatBetween(0.85, 1.15);
        const tx = hx + Phaser.Math.Between(-4, 4), ty = hy - 4;
        const bw = big ? 1.8 : 1.1, amp = big ? 14 : 10;
        const pts = boltPts(cloud.x + Phaser.Math.Between(-16, 16), cloud.y + 10, tx, ty, amp);
        bolts.push({ pts, t: tn, w: bw, big, amp });
        for (let q = 0; q < (big ? 4 : 2); q++) {                             // nhánh phụ toả hai bên
          const m = pts[2 + q % 4], sd = q % 2 ? 1 : -1;
          bolts.push({ pts: boltPts(m.x, m.y, m.x + sd * Phaser.Math.Between(14, 30), m.y + Phaser.Math.Between(12, 28), 5), t: tn, w: 0.5 });
        }
        // vết mực cháy loang trên mặt đất, mờ dần
        const scorch = w.add.image(tx, ty + 6, 'light').setTint(INK).setDepth(-900).setAlpha(0.75).setScale(big ? 1.1 : 0.7, big ? 0.45 : 0.3);
        w.tweens.add({ targets: scorch, alpha: 0, duration: 1600, delay: 300, onComplete: () => scorch.destroy() });
        TT.FX.burst(w, tx, ty, [PAPER, INK, GREY, 0xffffff], big ? 30 : 16, big ? 170 : 120);
        TT.FX.ring(w, tx, ty + 6, 0xffffff, big ? 1.8 : 1.0, big ? 320 : 240);
        TT.FX.ring(w, tx, ty + 6, INK, big ? 1.3 : 0.7, big ? 300 : 220, 60);
        w.addLight(tx, ty - 10, big ? 150 : 90, 0xffffff, big ? 300 : 200);
        TT.FX.flash(w, big ? 0.22 : 0.1, big ? 140 : 90, 0xffffff);
        w.hitEnemiesInRadius(tx, ty + 4, big ? 34 : 24, dmg * (big ? 1.1 : 0.55), { ox: tx, oy: ty, force: big ? 40 : 12 });
        w.cameras.main.shake(big ? 200 : 90, big ? 0.009 : 0.004);
        if (big) w.hitStop(60);
        TT.SFX.thunder(big);
      }
      if (tn - stormT >= STORM + 200) finish();
    }

    function finish() {
      if (!alive || phase === 'end') return;
      phase = 'end';
      fx.clear(); glow.clear();
      if (cloud.clearTint) cloud.clearTint();
      camBack();
      w.tweens.add({ targets: cloud, alpha: 0, scale: cloud.scale * 1.25, duration: 450, onComplete: cleanup });
    }

    function cleanup() {
      if (!alive) return;
      alive = false;
      tick.remove();
      [fx, glow, glyph, halo].forEach(o => o.destroy());
      if (cloud) cloud.destroy();
      strokes.forEach(o => { if (!o.done) o.s.destroy(); });
      camBack();
    }
  };
})();
