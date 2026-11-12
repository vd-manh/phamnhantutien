// Hiệu ứng hình ảnh. Mỗi hiệu ứng ưu tiên dùng sprite sheet beanfx (nếu khai báo trong
// assets/fx/manifest.json), nếu không có thì dùng bản vẽ tạm bằng code.
window.TT = window.TT || {};

TT.FX = {
  bfx: {}, // tên hiệu ứng -> { tex, anim, anchor, scale } (điền bởi BootScene)

  sprite(scene, name, fallbackTex, fallbackAnim, x, y, origin) {
    const b = this.bfx[name];
    const s = b
      ? scene.add.sprite(x, y, b.tex).setOrigin(b.anchor[0], b.anchor[1]).setScale(b.scale)
      : scene.add.sprite(x, y, fallbackTex).setOrigin(origin[0], origin[1]);
    s.play(b ? b.anim : fallbackAnim);
    s.once('animationcomplete', () => s.destroy());
    return s;
  },

  // Phát một hiệu ứng beanfx (lớp màu + lớp sáng nếu có). Trả về null nếu chưa nạp.
  // opts:
  //   depth, flip (lật sang trái, giữ đúng điểm chân/pivot)
  //   startAt: bắt đầu từ giây thứ mấy của hiệu ứng (bỏ qua đoạn đầu)
  //   loopMs: hiệu ứng lặp thì chạy bao lâu rồi mờ dần
  //   at: { tênState | số_giây: fn }  gọi khi hiệu ứng chạy tới mốc đó
  //   speed: tốc độ phát (1.25 = nhanh hơn 25%, mốc thời gian tự co theo)
  //   onHit(hit): mốc act.hits trong JSON;  onEnd()
  beanfx(scene, name, x, y, opts) {
    const b = this.bfx[name];
    if (!b || !b.pivot) return null;
    opts = opts || {};
    const depth = opts.depth || 6000, size = b.size;
    const ox = opts.flip ? (size[0] - b.pivot[0]) / size[0] : b.anchor[0];
    const mk = (tex, anim, add) => {
      const s = scene.add.sprite(x, y, tex).setOrigin(ox, b.anchor[1]).setScale(b.scale * (opts.scale || 1)).setDepth(depth + (add ? 1 : 0));
      if (add) s.setBlendMode(Phaser.BlendModes.ADD).setAlpha(Math.min(1, b.lightGain || 1));
      if (opts.flip) s.setFlipX(true);
      const fps = b.fps || (scene.anims.get(anim) && scene.anims.get(anim).frameRate) || 30;
      s.play({ key: anim, startFrame: Math.floor((opts.startAt || 0) * fps), repeat: opts.loopMs ? -1 : undefined });
      if (opts.speed) s.anims.timeScale = opts.speed;
      return s;
    };
    const color = mk(b.tex, b.anim, false);
    const light = b.light ? mk(b.light, b.light + '_play', true) : null;
    const t0 = opts.startAt || 0;
    const timers = [];
    const later = (sec, fn) => { if (sec >= t0) timers.push(scene.time.delayedCall((sec - t0) * 1000 / (opts.speed || 1), fn)); };
    (b.hits || []).forEach(h => later(h.t, () => opts.onHit && opts.onHit(h)));
    for (const [k, fn] of Object.entries(opts.at || {})) {
      const sec = isNaN(+k) ? (b.states && b.states[k] ? b.states[k][0] : null) : +k;
      if (sec != null) later(sec, fn);
    }
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(t => t.remove());
      if (color.active) color.destroy();
      if (light && light.active) light.destroy();
      if (opts.onEnd) opts.onEnd();
    };
    if (opts.loopMs) {
      scene.time.delayedCall(opts.loopMs, () => {
        scene.tweens.add({ targets: [color, light].filter(Boolean), alpha: 0, duration: 400, onComplete: finish });
      });
    } else {
      color.once('animationcomplete', finish);
    }
    return {
      sprite: color,
      setPos(nx, ny) { if (color.active) { color.setPosition(nx, ny); if (light) light.setPosition(nx, ny); } },
      stop() { finish(); }
    };
  },

  lightning(scene, x, y, o) {
    o = o || {};
    const sc = o.scale || 1;
    let s = null;
    if (!o.noSprite) {
      s = this.sprite(scene, 'lightning', 'bolt', 'bolt_strike', x, y, [0.5, TT.Textures.boltOriginY]);
      s.setScale(s.scaleX * sc).setDepth(6000);
      if (o.tint) s.setTint(o.tint);
    }
    this.flash(scene, o.big ? 0.75 : (sc < 1 ? 0.18 : 0.4), o.big ? 260 : 120);
    if (scene.addLight) scene.addLight(x, y - 20, o.big ? 260 : 150 * sc, 0xc9b8ff, o.big ? 700 : 360);
    scene.cameras.main.shake(o.big ? 420 : 160, o.big ? 0.012 : (sc < 1 ? 0.003 : 0.006));
    scene.time.delayedCall(60, () => {
      this.burst(scene, x, y, [0xffffff, 0x9ad8ff, 0xb59bff], o.big ? 40 : 18, o.big ? 200 : 130);
      const sc2 = scene.add.image(x, y, 'scorch').setDepth(-950).setAlpha(0.7).setScale(sc);
      scene.tweens.add({ targets: sc2, alpha: 0, delay: 2500, duration: 1500, onComplete: () => sc2.destroy() });
    });
    TT.SFX.thunder(o.big);
    return s;
  },

  slash(scene, x, y, angle, big) {
    const s = this.sprite(scene, 'slash', 'slash', 'slash_anim', x, y, [0.5, 0.5]);
    s.setRotation(angle).setDepth(y + 30);
    if (Math.abs(angle) > Math.PI / 2) s.setFlipY(true);
    if (big) { s.setScale(s.scaleX * 1.5); s.setTint(0xffe08a); }
    if (scene.addLight) scene.addLight(x, y, big ? 64 : 44, big ? 0xffe08a : 0xbff1ff, big ? 260 : 170);
    TT.SFX.slash(big);
    return s;
  },

  flash(scene, alpha, dur, color) {
    const v = scene.view || { x: 0, y: 0, w: scene.scale.width, h: scene.scale.height };
    const r = scene.add.rectangle(v.x, v.y, v.w, v.h, color || 0xffffff, alpha)
      .setOrigin(0).setScrollFactor(0).setDepth(6500).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
  },

  burst(scene, x, y, tints, n, speed, extra) {
    const cfg = Object.assign({
      speed: { min: speed * 0.3, max: speed },
      lifespan: { min: 250, max: 650 },
      scale: { start: 1, end: 0 },
      tint: tints,
      emitting: false
    }, extra || {});
    Object.keys(cfg).forEach(k => { if (cfg[k] === undefined) delete cfg[k]; });
    const em = scene.add.particles(x, y, 'dot', cfg);
    em.setDepth(6100);
    em.explode(n);
    scene.time.delayedCall(1600, () => em.destroy());
    return em;
  },

  ring(scene, x, y, tint, toScale, dur, delay) {
    const r = scene.add.image(x, y, 'ring').setTint(tint).setScale(0.1).setDepth(6050)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    scene.tweens.add({
      targets: r, scale: toScale, alpha: { from: 1, to: 0 }, duration: dur, delay: delay || 0,
      ease: 'Cubic.out', onComplete: () => r.destroy()
    });
  },

  // vòng cảnh báo trước khi sét đánh xuống
  warn(scene, x, y, r, dur) {
    const s = r / 18;
    const fill = scene.add.image(x, y, 'warnfill').setDepth(5500).setScale(0).setAlpha(0.35);
    const ring = scene.add.image(x, y, 'warn').setDepth(5501).setScale(s);
    scene.tweens.add({ targets: fill, scale: s, duration: dur });
    scene.tweens.add({ targets: ring, alpha: { from: 1, to: 0.35 }, duration: 140, yoyo: true, repeat: -1 });
    scene.time.delayedCall(dur, () => {
      scene.tweens.killTweensOf([fill, ring]);
      fill.destroy(); ring.destroy();
    });
    return { setPos(nx, ny) { if (fill.active) { fill.setPosition(nx, ny); ring.setPosition(nx, ny); } } };
  },

  breakthrough(scene, x, y) {
    this.flash(scene, 0.6, 700, 0xffe08a);
    if (scene.addLight) scene.addLight(x, y - 10, 280, 0xffe08a, 1600);
    const col = scene.add.rectangle(x, y, 12, 380, 0xffe08a, 0.85).setOrigin(0.5, 1).setDepth(6000)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: col, scaleX: { from: 0.2, to: 2.4 }, alpha: 0, duration: 1300, ease: 'Cubic.out', onComplete: () => col.destroy() });
    [0, 160, 320].forEach(d => this.ring(scene, x, y - 8, 0xffe08a, 3.2, 900, d));
    this.burst(scene, x, y - 8, [0xffe08a, 0xffffff, 0xffc94c], 70, 60, {
      speedY: { min: -170, max: -40 }, speedX: { min: -50, max: 50 }, speed: undefined,
      lifespan: { min: 700, max: 1400 }, scale: { start: 1.5, end: 0 }
    });
    scene.cameras.main.shake(300, 0.006);
  },

  text(scene, x, y, str, color, size) {
    const t = scene.add.text(x, y, str, {
      fontFamily: 'VT323, monospace', fontSize: (size || 13) + 'px', color: color || '#ffffff',
      stroke: '#120c1c', strokeThickness: 3, resolution: 2
    }).setOrigin(0.5, 1).setDepth(7000);
    scene.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 750, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
};
