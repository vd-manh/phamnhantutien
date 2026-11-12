// Kiếm Tu · ô I · Thanh Nhiên Kiếm Quyết
// Khóa mục tiêu gần nhất: trên đầu mục tiêu hiện đồng hồ thời gian (pixelfx "time stop", đổi xanh lục), mục tiêu bất động.
// Nhân vật chớp di quanh mục tiêu chém liên tục; mỗi nhát để lại một tàn ảnh xanh lục đứng nguyên tư thế chém.
// Nhát cuối: quay về chỗ cũ, một đạo kiếm quang lớn; đồng hồ quay ngược rồi biến mất, thời gian chảy lại.
window.TT = window.TT || {};

(function () {
  const HITS = 8;              // số nhát chém liên tục
  const STEP = 250;            // khoảng cách giữa các nhát (ms)
  const OPEN = 350;            // đồng hồ mở ra trước nhát đầu (ms)
  const REWIND = 700;          // đồng hồ quay ngược khi kết thúc (ms)
  const CLOCK_HOLD = 44;       // khung cuối của đoạn "mở + kim chạy" trong time-stop (trước khi hóa xám, nứt vỡ)
  const CAGE_R = 52;           // bán kính trận pháp nhốt mục tiêu; nhân vật lướt quanh viền này
  const CAGE_SY = 0.55;        // ép dẹt theo phối cảnh mặt đất
  const C_GREEN = 0x5dffa0, C_LIGHT = 0xd6ffe6, K_LINE = 0x22c46a, K_DARK = 0x0f7a45, K_HI = 0x9dffc4;

  TT.Skills.thanh_nhien = function (w, sk, now) {
    const p = w.player;
    const e = w.nearestEnemies(p.x, p.y, 170, 1)[0];
    if (!e) { TT.HUD.log('Thanh Nhiên Kiếm Quyết: không có mục tiêu trong tầm.'); return false; }
    const dmg = w.st.atk * sk.dmg;
    const home = { x: p.x, y: p.y };
    const last = { x: e.x, y: e.y };                    // vị trí cuối của mục tiêu (nếu nó chết giữa chừng)
    const total = OPEN + HITS * STEP + 200;
    const endT = now + total + REWIND;

    // khóa nhân vật & bất tử trong lúc thi triển; mục tiêu bất động tới khi đồng hồ quay ngược xong
    p.setVelocity(0);
    w.lockUntil = now + total + 150;
    w.skillLock = now + total + 150;
    w.invulnUntil = Math.max(w.invulnUntil, now + total + 400);
    e.frozenUntil = endT;
    e.setVelocity(0);
    w.facing.set(e.x - p.x, e.y - p.y).normalize();
    w.playAnim('cast');
    TT.SFX.freeze();
    // camera bám tâm trận (giữa nhân vật và mục tiêu) để màn hình không giật theo các lần chớp di
    const cam = w.cameras.main;
    const focus = w.add.zone((p.x + e.x) / 2, (p.y + e.y) / 2, 1, 1);
    cam.startFollow(focus, true, 0.08, 0.08);
    w.tweens.add({ targets: focus, x: e.x, y: e.y - 6, duration: 400, ease: 'Sine.easeOut' });
    const camBack = () => { cam.startFollow(p, true, 0.15, 0.15); focus.destroy(); };

    // ---- đồng hồ thời gian trên đầu mục tiêu (điều khiển từng khung: mở -> kim chạy -> quay ngược)
    const b = TT.FX.bfx.px_time_stop_g;
    let clock = null, clockFrame = 0;
    const headY = () => (e.active ? e.y : last.y) - 30;
    if (b) {
      clock = w.add.sprite(e.x, headY(), b.tex, 0).setOrigin(0.5, b.anchor[1]).setScale(b.scale * 0.85).setDepth(6200);
    } else {
      clock = w.add.image(e.x, headY(), 'ring').setTint(C_GREEN).setScale(0.6).setDepth(6200).setBlendMode(Phaser.BlendModes.ADD);
    }
    const veil = w.add.image(e.x, e.y - 8, 'light').setTint(C_GREEN).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0).setScale(1.2).setDepth(e.depth + 1);
    w.tweens.add({ targets: veil, alpha: 0.35, duration: 300 });
    TT.FX.flash(w, 0.12, 250, C_GREEN);

    const base = Math.atan2(p.y - e.y, p.x - e.x);         // điểm đầu trên viền: phía nhân vật đang đứng
    const ghosts = [], streak = w.add.graphics().setDepth(5500).setBlendMode(Phaser.BlendModes.ADD);
    // trận pháp vòng tròn nhốt mục tiêu
    const cage = w.add.graphics().setDepth(-925);
    const cageGlow = w.add.image(e.x, e.y, 'light').setTint(C_GREEN).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-926).setAlpha(0).setScale(2.9, 1.6);
    const cs = { r: 0, a: 0 };
    w.tweens.add({ targets: cs, r: CAGE_R, a: 1, duration: 320, ease: 'Back.easeOut' });
    const ept = (cx, cy, rr, ang) => ({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr * CAGE_SY });
    function drawCage(cx, cy, rot) {
      cage.clear();
      if (cs.a <= 0) return;
      const ell = (rr, lw, c, al) => { cage.lineStyle(lw, c, al * cs.a); cage.strokeEllipse(cx, cy, rr * 2, rr * 2 * CAGE_SY); };
      cage.fillStyle(K_DARK, 0.16 * cs.a); cage.fillEllipse(cx, cy, cs.r * 2, cs.r * 2 * CAGE_SY);
      ell(cs.r + 1, 4, K_DARK, 0.45);
      ell(cs.r, 2, K_LINE, 0.95);
      ell(cs.r * 0.9, 1, K_HI, 0.8);
      for (let i = 0; i < 32; i++) {                       // vạch phù văn giữa hai vành, xoay chậm
        const a = rot + i / 32 * Math.PI * 2, p0 = ept(cx, cy, cs.r * (i % 4 ? 0.93 : 0.86), a), p1 = ept(cx, cy, cs.r * 0.99, a);
        cage.lineStyle(1, i % 4 ? K_LINE : K_HI, 0.9 * cs.a); cage.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
      for (let i = 0; i < HITS; i++) {                     // 8 trận nhãn trên viền: nơi kiếm khách đặt chân
        const q = ept(cx, cy, cs.r, base + i / HITS * Math.PI * 2);
        cage.fillStyle(K_HI, 0.9 * cs.a); cage.fillRect(q.x - 1.5, q.y - 1, 3, 2);
      }
      ell(cs.r * 0.35, 1, K_LINE, 0.7);
    }
    let alive = true, phase = 'run', rewindT = 0;
    const t0 = now;
    const tick = w.time.addEvent({ delay: 16, loop: true, callback: () => {
      const tn = w.time.now;
      if (!alive) return;
      if (e.active) { last.x = e.x; last.y = e.y; clock.setPosition(e.x, headY()); veil.setPosition(e.x, e.y - 8).setDepth(e.depth + 1); }
      if (b) {
        if (phase === 'run') {
          // khung 0..CLOCK_HOLD trải đều suốt thời gian chém, kim đồng hồ chạy chậm dần
          const k = Math.min(1, (tn - t0) / total);
          clockFrame = Math.round(Phaser.Math.Easing.Sine.Out(k) * CLOCK_HOLD);
        } else {
          // quay ngược: từ khung đang dừng về 0
          const k = Math.min(1, (tn - rewindT) / REWIND);
          clockFrame = Math.round(CLOCK_HOLD * (1 - Phaser.Math.Easing.Quadratic.In(k)));
        }
        clock.setFrame(clockFrame);
      } else {
        clock.rotation += phase === 'run' ? 0.05 : -0.2;
      }
      streak.alpha = Math.max(0, streak.alpha - 0.06);
      drawCage(last.x, last.y, (tn - t0) / 1400);
      cageGlow.setPosition(last.x, last.y).setAlpha(0.25 * cs.a);
    }});

    // ---- tàn ảnh: bản sao khung hình hiện tại của nhân vật, phủ xanh lục, mờ dần
    function ghost(life) {
      // nhuộm xanh (giữ nét tóc, áo, kiếm) + một lớp cộng sáng mờ cùng kích thước
      const g = w.add.image(p.x, p.y, p.texture.key, p.frame.name)
        .setOrigin(p.originX, p.originY).setScale(p.scaleX, p.scaleY).setFlipX(p.flipX)
        .setTint(0x7dffb4).setAlpha(0.6).setDepth(p.depth - 1);
      const glow = w.add.image(p.x, p.y, p.texture.key, p.frame.name)
        .setOrigin(p.originX, p.originY).setScale(p.scaleX, p.scaleY).setFlipX(p.flipX)
        .setTint(C_GREEN).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.depth - 1);
      ghosts.push(g, glow);
      w.tweens.add({ targets: [g, glow], alpha: 0, delay: life, duration: 500, onComplete: () => { g.destroy(); glow.destroy(); } });
    }

    // ---- các nhát chém: chớp di quanh mục tiêu theo hình ngôi sao, mỗi nhát quay mặt vào mục tiêu
    let prevA = null;
    for (let i = 0; i < HITS; i++) {
      w.time.delayedCall(OPEN + i * STEP, () => {
        if (!alive || w.dead) return;
        const ex = last.x, ey = last.y;
        const a = base + i / HITS * Math.PI * 2;                  // lướt quanh viền trận, mỗi nhát 1/8 vòng
        const nx = ex + Math.cos(a) * CAGE_R, ny = ey + Math.sin(a) * CAGE_R * CAGE_SY;
        const hy = -w.pH * 0.5;
        streak.clear(); streak.alpha = 1;
        if (prevA === null) {                                     // nhát đầu: lướt thẳng từ chỗ đứng tới viền
          streak.lineStyle(3, C_GREEN, 0.5); streak.lineBetween(p.x, p.y + hy, nx, ny + hy);
          streak.lineStyle(1, C_LIGHT, 0.9); streak.lineBetween(p.x, p.y + hy, nx, ny + hy);
        } else {                                                  // vệt sáng chạy cong theo viền trận
          const pts = [];
          for (let k = 0; k <= 8; k++) { const q = ept(ex, ey, CAGE_R, prevA + (a - prevA) * k / 8); pts.push({ x: q.x, y: q.y + hy }); }
          streak.lineStyle(4, C_GREEN, 0.45); streak.strokePoints(pts, false);
          streak.lineStyle(1.5, C_LIGHT, 0.95); streak.strokePoints(pts, false);
        }
        // kiếm khí phóng từ viền vào tâm trận
        streak.lineStyle(2, C_GREEN, 0.6); streak.lineBetween(nx, ny + hy, ex, ey - 6);
        streak.lineStyle(1, 0xffffff, 0.9); streak.lineBetween(nx, ny + hy, ex, ey - 6);
        prevA = a;
        p.setPosition(nx, ny); w.shadow.setPosition(nx, ny);
        w.facing.set(ex - nx, ey - ny).normalize();
        w.animType = null;
        w.playAnim(i % 2 ? 'attack2' : 'attack1');
        TT.SFX.slash(i === HITS - 1);
        // vệt chém pixelfx tại mục tiêu, lật theo phía đứng
        const name = i % 2 ? 'px_slash2_g' : 'px_slash_g';
        if (TT.FX.bfx[name]) {
          const fx = TT.FX.beanfx(w, name, ex - Math.cos(a) * 6, ey + 4, { depth: ey + 40, scale: 0.9, flip: nx > ex });
          if (fx && fx.sprite) fx.sprite.setRotation((ny - ey) * 0.02);
        } else {
          TT.FX.slash(w, ex, ey - 6, Math.atan2(ey - ny, ex - nx), false).setTint(C_GREEN);
        }
        w.time.delayedCall(70, () => {
          if (!alive) return;
          ghost(OPEN + HITS * STEP - i * STEP + 300);          // tàn ảnh giữ tới cuối chiêu
          if (e.active && !e.dying) {
            w.damageEnemy(e, dmg * Phaser.Math.FloatBetween(0.9, 1.1), { ox: nx, oy: ny, force: 0 });
            TT.FX.burst(w, ex, ey - 6, [C_GREEN, C_LIGHT, 0xffffff], 6, 80);
            w.addLight(ex, ey - 8, 50, C_GREEN, 180);
          }
          w.hitStop(35);
        });
      });
    }

    // ---- kết thúc: quay về chỗ cũ, nhát kiếm quang lớn, đồng hồ quay ngược rồi biến mất
    w.time.delayedCall(OPEN + HITS * STEP, () => {
      if (!alive || w.dead) return;
      ghost(200);
      streak.clear(); streak.alpha = 1;
      streak.lineStyle(3, C_GREEN, 0.5); streak.lineBetween(p.x, p.y - w.pH * 0.5, home.x, home.y - w.pH * 0.5);
      p.setPosition(home.x, home.y); w.shadow.setPosition(home.x, home.y);
      const ex = last.x, ey = last.y;
      w.facing.set(ex - home.x, ey - home.y).normalize();
      w.animType = null;
      w.playAnim('attack3');
      w.time.delayedCall(w.contactMs('attack3', 150), () => {
        if (!alive) return;
        if (TT.FX.bfx.px_slash2_g) TT.FX.beanfx(w, 'px_slash2_g', ex, ey + 6, { depth: ey + 40, scale: 1.5, flip: home.x > ex });
        TT.FX.ring(w, ex, ey - 4, C_GREEN, 1.4, 360);
        TT.FX.flash(w, 0.15, 260, C_GREEN);
        w.addLight(ex, ey - 8, 120, C_GREEN, 400);
        w.cameras.main.shake(180, 0.006);
        if (e.active && !e.dying) w.damageEnemy(e, dmg * 2.2, { ox: home.x, oy: home.y, force: 0 });
        TT.SFX.boom();
        // đồng hồ quay ngược
        phase = 'rewind'; rewindT = w.time.now;
        TT.SFX.freeze();
        w.time.delayedCall(REWIND, finish);
      });
    });

    function finish() {
      if (!alive) return;
      alive = false;
      camBack();
      tick.remove();
      const x = clock.x, y = clock.y;
      TT.FX.burst(w, x, y - 10, [C_GREEN, C_LIGHT, 0xffffff], 14, 90);
      TT.FX.ring(w, x, y - 10, C_LIGHT, 0.9, 300);
      clock.destroy(); veil.destroy(); streak.destroy();
      w.tweens.add({ targets: cs, a: 0, r: CAGE_R + 10, duration: 350, onUpdate: () => drawCage(last.x, last.y, 0),
        onComplete: () => { cage.destroy(); cageGlow.destroy(); } });
      w.tweens.add({ targets: cageGlow, alpha: 0, duration: 350 });
      if (e.active) {
        e.frozenUntil = 0;
        // thời gian chảy lại: dồn toàn bộ lực đẩy lùi sau khi hết bất động
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
        e.stunUntil = w.time.now + 250;
      }
    }

    // an toàn: nếu nhân vật trọng thương giữa chừng thì dọn dẹp
    w.time.delayedCall(total + REWIND + 600, () => {
      if (alive) finish();
      ghosts.forEach(g => g.active && g.destroy());
    });
  };
})();
