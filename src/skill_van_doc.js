// Độc Tu · ô O · Vạn Độc Trận (màu xanh độc chủ đạo)
// 1) Kết trận (KNOT ms): dưới chân mở pháp trận xanh độc (ngũ giác, 5 ký hiệu ngũ độc xoay, sương độc bốc lên); camera lùi ra.
// 2) Gọi đúng 5 con ngũ độc (rắn, rết, bọ cạp, cóc, nhện), mỗi con chui lên từ một đỉnh ngũ giác rồi trận khép lại,
//    nhân vật đi lại được. Mỗi con có thanh máu riêng, sống tối đa LIFE ms: bò đuổi yêu thú gần nhất, vồ cắn liên tục
//    (sát thương + nhiễm độc world.poisonEnemy); không có yêu thú thì bò theo chủ. Yêu thú bị cắn quay sang đánh con đó
//    (e.taunt, world.updateEnemies); hết máu hoặc hết giờ thì tan thành sương độc.
window.TT = window.TT || {};

(function () {
  const KNOT = 1100;           // kết trận (ms)
  const SPAWN = 180;           // khoảng cách giữa hai con lúc gọi (ms)
  const HOLD = SPAWN * 5 + 300; // gọi xong 5 con thì trận khép
  const LIFE = 10000;          // mỗi con sống tối đa (ms)
  const HP_MUL = 0.35;         // máu mỗi con = máu tối đa của nhân vật x HP_MUL
  const ARRAY_R = 70;          // bán kính trận
  const RANGE = 230;           // tầm tìm mục tiêu
  const G1 = 0x3cff7a, G2 = 0x9dffb8, G3 = 0x1d7a3e, PURPLE = 0x9b5cff, DARK = 0x0d2a16;
  const KINDS = ['xà', 'rết', 'bọ cạp', 'cóc', 'nhện'];
  const SYMS = ['蛇', '蜈', '蠍', '蟾', '蛛'];

  function drawArray(g, x, y, r, rot, a, pulse) {
    g.clear();
    if (r < 1 || a <= 0) return;
    const sy = 0.5;
    const P = (rr, ang) => ({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr * sy });
    g.fillStyle(DARK, 0.35 * a); g.fillEllipse(x, y, r * 2, r * 2 * sy);
    const ring = (rr, w, c, al) => { g.lineStyle(w, c, al * a); g.strokeEllipse(x, y, rr * 2, rr * 2 * sy); };
    ring(r + 2, 4, G3, 0.6); ring(r, 2, G1, 0.95); ring(r * 0.9, 1, G2, 0.7);
    // vạch như vảy rắn quanh vành
    for (let i = 0; i < 40; i++) {
      const ang = rot + i / 40 * Math.PI * 2, p0 = P(r * 0.9, ang), p1 = P(r * (i % 2 ? 0.84 : 0.8), ang + 0.05);
      g.lineStyle(1, G1, 0.85 * a); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    // ngũ giác + ngôi sao năm cánh (ngũ độc)
    const pent = [0, 1, 2, 3, 4].map(i => P(r * 0.72, -rot * 0.7 - Math.PI / 2 + i * Math.PI * 2 / 5));
    g.lineStyle(2, G1, 0.9 * a); g.strokePoints(pent.concat([pent[0]]), false);
    const star = [0, 2, 4, 1, 3, 0].map(i => pent[i]);
    g.lineStyle(1.5, G2, (0.6 + 0.4 * pulse) * a); g.strokePoints(star, false);
    ring(r * 0.36, 1.5, G1, 0.9);
    // lõi: đầm độc sóng sánh
    g.fillStyle(G1, (0.18 + 0.12 * pulse) * a); g.fillEllipse(x, y, r * 0.66, r * 0.33);
    g.fillStyle(PURPLE, 0.25 * a); g.fillEllipse(x + Math.sin(rot * 3) * 4, y, r * 0.3, r * 0.15);
    return pent;
  }

  TT.Skills.van_doc = function (w, sk, now) {
    const p = w.player, dmg = w.st.atk * sk.dmg;
    p.setVelocity(0);
    w.playAnim('cast');
    const total = KNOT + HOLD;
    w.lockUntil = now + total; w.skillLock = now + total;
    TT.SFX.cast();

    // ---- camera lùi ra cho thấy trận và vùng ngũ độc tấn công
    // camera: khung chứa trận + các yêu thú trong tầm, lùi ra vừa khung và dời tâm vào giữa (như chiêu O của Đạo Gia)
    const cam = w.cameras.main, zoom0 = cam.zoom, camO = { x: 0, y: 0 };
    let camDone = false;
    (function camAim() {
      const es = w.nearestEnemies(p.x, p.y, RANGE, 6);
      const xs = [p.x - ARRAY_R - 10, p.x + ARRAY_R + 10].concat(es.map(e => e.x - 30), es.map(e => e.x + 30));
      const ys = [p.y - w.pH - 30, p.y + ARRAY_R * 0.5 + 10].concat(es.map(e => e.y - 50), es.map(e => e.y + 20));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const z = Math.min(zoom0, cam.width / (x1 - x0 + 40), cam.height / (y1 - y0 + 40)) * 0.9;
      cam.zoomTo(Math.max(1, z), 600, 'Sine.easeInOut', true);
      w.tweens.add({ targets: camO, x: p.x - (x0 + x1) / 2, y: p.y - (y0 + y1) / 2, duration: 600, ease: 'Sine.easeInOut',
        onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    })();
    const camBack = () => {
      if (camDone) return; camDone = true;
      cam.zoomTo(zoom0, 600, 'Sine.easeInOut', true);
      w.tweens.killTweensOf(camO);
      w.tweens.add({ targets: camO, x: 0, y: 0, duration: 600, ease: 'Sine.easeInOut', onUpdate: () => cam.setFollowOffset(camO.x, camO.y) });
    };

    const X = p.x, Y = p.y;
    const arr = w.add.graphics().setDepth(-930);
    const glow = w.add.image(X, Y, 'light').setTint(G1).setBlendMode(Phaser.BlendModes.ADD).setDepth(-931).setAlpha(0).setScale(4.4, 2.2);
    const st = { r: 0, a: 0 };
    w.tweens.add({ targets: st, r: ARRAY_R, a: 1, duration: 600, ease: 'Back.easeOut' });
    const syms = SYMS.map(ch => w.add.text(X, Y, ch, {
      fontFamily: '"KaiTi", "STKaiti", "Microsoft YaHei", "SimSun", serif', fontSize: '28px',
      color: '#9dffb8', stroke: '#0d2a16', strokeThickness: 4
    }).setOrigin(0.5).setDepth(-928).setAlpha(0).setScale(0.32, 0.2));
    const mist = w.add.particles(X, Y, 'dot', {
      speedY: { min: -40, max: -12 }, speedX: { min: -8, max: 8 }, lifespan: { min: 600, max: 1200 },
      scale: { start: 1.6, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [G1, G2, PURPLE], blendMode: 'ADD', frequency: 28,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, ARRAY_R * 2, ARRAY_R) }
    }).setDepth(4100);

    // ảnh ngũ độc
    const tex = i => w.textures.exists('ngudoc_' + i) ? 'ngudoc_' + i
      : (w.textures.exists(TT.weaponTex('doc_ran_east')) ? TT.weaponTex('doc_ran_east') : 'dot');
    const fx = w.add.graphics().setDepth(5600);
    let alive = true, pent = null, spawned = 0;
    const beasts = [];
    const t0 = now;
    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now, el = tn - t0;
      if (w.dead && alive) { cleanup(); return; }
      pent = drawArray(arr, X, Y, st.r, el / 1300, st.a, 0.5 + 0.5 * Math.sin(el / 130));
      glow.setAlpha(st.a * (0.3 + 0.1 * Math.sin(el / 160)));
      if (pent) syms.forEach((s, i) => s.setPosition(pent[i].x, pent[i].y - 2).setAlpha(st.a * (0.8 + 0.2 * Math.sin(el / 200 + i))));
      if (el > KNOT && spawned < 5 && tn - (tick.lastSpawn || 0) >= SPAWN) { tick.lastSpawn = tn; spawn(); }
      if (el > 400 && el < KNOT + HOLD && (el % 900) < 17) w.playAnim(el < KNOT ? 'cast' : (TT.Caster && TT.Caster.anims.cast_point ? 'cast_point' : 'cast'));
      fx.clear();
      for (let i = beasts.length - 1; i >= 0; i--) step(beasts[i], tn) || beasts.splice(i, 1);
      if (el >= KNOT + HOLD) finish();
      if (st.fin && el >= KNOT + HOLD + 500 && !beasts.length) cleanup();
    }});

    // ---- ngũ độc: chui lên từ đỉnh ngũ giác, bò đuổi yêu thú, vồ cắn liên tục; có máu riêng, sống tối đa LIFE ms
    // mỗi loài một kiểu bò: tốc độ, độ nhún, kiểu lượn
    const GAIT = [
      { speed: 78, bob: 1.0, wave: 5, hop: 0 },    // rắn: trườn uốn lượn
      { speed: 104, bob: 0.6, wave: 1.5, hop: 0 }, // rết: chạy nhanh
      { speed: 64, bob: 1.5, wave: 0, hop: 0 },    // bọ cạp: bò từng nhịp
      { speed: 86, bob: 0, wave: 0, hop: 14 },     // cóc: nhảy cóc
      { speed: 96, bob: 0.8, wave: 2.5, hop: 0 },  // nhện: lướt nhanh
    ];
    const animOK = k => w.textures.exists('ngudoc_' + k) && w.textures.get('ngudoc_' + k).frameTotal > 2;
    function ensureAnims(k) {
      if (!animOK(k) || w.anims.exists('ngudoc_' + k + '_crawl')) return;
      w.anims.create({ key: 'ngudoc_' + k + '_crawl', frames: w.anims.generateFrameNumbers('ngudoc_' + k, { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
      w.anims.create({ key: 'ngudoc_' + k + '_bite', frames: w.anims.generateFrameNumbers('ngudoc_' + k, { start: 4, end: 5 }), frameRate: 12, repeat: 0 });
    }
    const playCrawl = b => { if (animOK(b.kind) && b.anim !== 'crawl') { b.anim = 'crawl'; b.im.play('ngudoc_' + b.kind + '_crawl'); } };
    const stopCrawl = b => { if (animOK(b.kind) && b.anim === 'crawl') { b.anim = 'stand'; b.im.stop(); b.im.setFrame(0); } };

    function spawn() {
      const kind = spawned++;
      ensureAnims(kind);
      const pt = pent ? pent[kind] : { x: X, y: Y };
      const sx = pt.x, sy = pt.y;
      const has = w.textures.exists('ngudoc_' + kind);
      const im = has ? w.add.sprite(sx, sy, 'ngudoc_' + kind, 0) : w.add.image(sx, sy, tex(kind));
      im.setOrigin(0.5, 1).setDepth(sy).setScale(0).setFlipX(sx < X);
      const base = has ? (animOK(kind) ? 0.6 : 0.5) : 0.18;   // con có hình động (đã chuẩn theo chiều dài thân) to hơn một chút
      const hp = Math.max(1, Math.round(w.st.maxHp * HP_MUL));
      TT.FX.burst(w, sx, sy, [G1, G2, PURPLE], 8, 60);
      TT.SFX.slash(false);
      beasts.push({ im, tgt: null, x: sx, y: sy, born: w.time.now, base, kind, g: GAIT[kind], state: 'rise', t: 0,
        phase: Math.random() * 6, hp, maxHp: hp, hurtUntil: 0, flashUntil: 0, anim: '' });
    }

    function retarget(b) {
      if (b.tgt && b.tgt.active && !b.tgt.dying && Math.hypot(b.tgt.x - b.x, b.tgt.y - b.y) < RANGE * 1.3) return;
      b.tgt = w.nearestEnemies(b.x, b.y, RANGE, 1)[0] || null;
    }

    // yêu thú chạm vào thì con độc vật mất máu (mỗi 0.7s một lần, theo sát thương của yêu thú)
    function takeHits(b, tn) {
      if (tn < b.hurtUntil) return;
      let hit = 0, from = null;
      for (const e of w.nearestEnemies(b.x, b.y - 4, 20, 4)) {
        if (e.dummy || e.dying || !e.dmg || tn < (e.frozenUntil || 0) || tn < (e.stunUntil || 0)) continue;
        if (e.dmg > hit) { hit = e.dmg; from = e; }
      }
      if (!hit) return;
      b.hurtUntil = tn + 700; b.flashUntil = tn + 140;
      b.hp -= hit;
      const kx = b.x - from.x, ky = b.y - from.y, kd = Math.hypot(kx, ky) || 1;   // bị hất lùi một chút
      b.x += kx / kd * 6; b.y += ky / kd * 6;
    }

    function drawBar(b) {
      const bw = 26, bh = 3, k = Math.max(0, b.hp / b.maxHp);
      const bx = b.x - bw / 2, by = b.y - b.im.displayHeight - 6;
      fx.fillStyle(0x000000, 0.65); fx.fillRect(bx - 1, by - 1, bw + 2, bh + 3);
      fx.fillStyle(k > 0.35 ? G1 : 0xffb347, 1); fx.fillRect(bx, by, bw * k, bh);
      // vạch tím mỏng dưới thanh máu: thời gian còn lại
      const life = Math.max(0, 1 - (w.time.now - b.born) / LIFE);
      fx.fillStyle(PURPLE, 1); fx.fillRect(bx, by + bh + 1, bw * life, 1);
    }

    function step(b, tn) {
      const age = tn - b.born, g = b.g;
      if (b.state === 'rise') {                              // chui lên từ trận: lớn dần từ mặt đất
        const k = Math.min(1, age / 300);
        b.im.setScale(b.base * k, b.base * k * (0.6 + 0.4 * k));
        if (k >= 1) { b.state = 'chase'; playCrawl(b); }
        return true;
      }
      if (b.state === 'fade') {                              // hết máu / hết giờ: tan thành sương độc
        const d = (tn - b.fadeT) / 320;
        b.im.setAlpha(Math.max(0, 1 - d)).setScale(b.base * (1 + d * 0.3), b.base * Math.max(0, 1 - d * 0.6));
        if (d >= 1) { b.im.destroy(); return false; }
        return true;
      }
      if (age > LIFE || b.hp <= 0) {
        b.state = 'fade'; b.fadeT = tn; b.im.clearTint();
        TT.FX.burst(w, b.x, b.y - 6, [G1, G2, PURPLE], 10, 60);
        return true;
      }
      takeHits(b, tn);
      if (tn < b.flashUntil) b.im.setTint(0xff6060); else b.im.clearTint();
      retarget(b);
      const dt = 16 / 1000;
      // mục tiêu: yêu thú; không có thì bò theo chủ, đứng quanh chân chủ
      let tx, ty, near;
      if (b.tgt) { tx = b.tgt.x; ty = b.tgt.y; near = 16; }
      else { const a = b.kind / 5 * Math.PI * 2; tx = p.x + Math.cos(a) * 36; ty = p.y + 8 + Math.sin(a) * 14; near = 6; }
      const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy) || 1;
      if (b.state === 'chase') {
        if (dist > near) {
          b.t += dt;
          const fol = b.tgt ? 1 : Math.min(1.8, 0.7 + dist / 80);                   // theo chủ: xa thì bò nhanh hơn
          const sp = g.speed * fol * (g.hop ? (Math.sin(b.t * 9) > 0 ? 1.6 : 0.15) : 1);   // cóc: nhảy từng cú
          const nx = dx / dist, ny = dy / dist, mv = Math.min(sp * dt, dist);
          const wav = Math.sin(b.t * 14 + b.phase) * g.wave;                        // lượn ngang (rắn, nhện)
          b.x += nx * mv - ny * wav * dt * 10;
          b.y += ny * mv + nx * wav * dt * 10;
          const hopY = g.hop ? -Math.max(0, Math.sin(b.t * 9)) * g.hop : 0;
          const bob = Math.sin(b.t * 22 + b.phase) * g.bob;
          if (Math.abs(dx) > 2) b.im.setFlipX(dx < 0);
          playCrawl(b);
          b.im.setPosition(b.x, b.y + hopY + bob).setDepth(b.y + 1)
            .setScale(b.base * (1 + 0.06 * Math.sin(b.t * 22)), b.base * (1 - 0.06 * Math.sin(b.t * 22)));
          fx.fillStyle(G3, 0.35); fx.fillEllipse(b.x, b.y, 14 * b.base * 2, 4);           // bóng + vệt độc trên đất
        } else if (b.tgt) { b.state = 'bite'; b.biteT = tn; b.bitDone = false; }
        else {                                                                       // đứng chờ cạnh chủ
          stopCrawl(b);
          b.im.setPosition(b.x, b.y).setDepth(b.y + 1).setScale(b.base);
          if (Math.abs(p.x - b.x) > 4) b.im.setFlipX(p.x < b.x);
        }
        drawBar(b);
        return true;
      }
      // cắn: lùi lấy đà rồi vồ tới, mỗi nhát sát thương + nhiễm độc; yêu thú bị cắn quay sang đánh con này
      const face = dx >= 0;
      b.im.setFlipX(!face);
      const bk = (tn - b.biteT) / 300;
      const lunge = bk < 0.4 ? -bk / 0.4 * 4 : (bk < 0.6 ? (bk - 0.4) / 0.2 * 10 - 4 : Math.max(0, 6 - (bk - 0.6) / 0.4 * 6));
      b.im.setPosition(b.x + (face ? lunge : -lunge), b.y).setDepth(b.y + 1)
        .setScale(b.base * (1 + (bk > 0.4 && bk < 0.6 ? 0.15 : 0)), b.base);
      if (animOK(b.kind) && b.anim !== 'bite') { b.anim = 'bite'; b.im.play('ngudoc_' + b.kind + '_bite'); }
      if (bk >= 0.45 && !b.bitDone) {
        b.bitDone = true;
        const e = b.tgt;
        if (e && e.active && !e.dying) {
          TT.FX.burst(w, e.x, e.y - 6, [G1, G2, PURPLE], 8, 80);
          w.damageEnemy(e, dmg * Phaser.Math.FloatBetween(0.8, 1.0), { kx: 0, ky: 0, force: 10 });
          if (w.poisonEnemy) w.poisonEnemy(e, w.st.atk * 0.15, 3500);
          e.taunt = b; e.tauntUntil = tn + 1500;
        }
        if (b.kind === 3) w.cameras.main.shake(50, 0.002);
        TT.SFX.hit();
      }
      if (bk >= 1.4) { b.state = 'chase'; b.anim = ''; }        // nghỉ một nhịp rồi cắn tiếp
      drawBar(b);
      return true;
    }

    function finish() {
      if (!alive || st.fin) return;
      st.fin = true;
      TT.FX.ring(w, X, Y, G1, 2.6, 480);
      TT.FX.ring(w, X, Y, PURPLE, 1.6, 380, 80);
      TT.FX.burst(w, X, Y - 10, [G1, G2, PURPLE], 30, 160);
      w.hitEnemiesInRadius(X, Y, ARRAY_R, dmg * 1.5, { ox: X, oy: Y, force: 160 });
      TT.SFX.boom();
      mist.stop();
      w.tweens.add({ targets: st, r: 0, a: 0, duration: 400, ease: 'Back.easeIn' });
      w.tweens.add({ targets: syms.concat([glow]), alpha: 0, duration: 400 });
      camBack();
      w.time.delayedCall(450, () => { if (alive) [arr, glow, mist].concat(syms).forEach(o => o.setVisible(false)); });
    }

    function cleanup() {
      if (!alive) return;
      alive = false;
      tick.remove();
      [arr, glow, fx, mist].concat(syms).forEach(o => o.destroy());
      beasts.forEach(b => { if (b.im.active) b.im.destroy(); b.hp = 0; });
      camBack();
    }
  };
})();
