// Scene chính: bản đồ Thanh Vân Sơn, tu luyện, chiến đấu, độ kiếp.
window.TT = window.TT || {};

TT.WorldScene = class extends Phaser.Scene {
  constructor() { super('World'); }

  // ================= KHỞI TẠO =================
  // data: { cls: 'kiem' | 'phap', fresh: true nếu bắt đầu lại từ đầu }
  create(data) {
    const D = TT.DATA;
    data = data || {};
    const saved = data.fresh ? null : TT.Save.load();
    this.cls = data.cls || (saved && saved.cls) || 'kiem';
    this.gender = data.gender || (saved && saved.gender) || 'm';
    this.C = D.classes[this.cls];
    // bộ nhân vật theo tông môn x giới tính x cảnh giới: nạp xong mới dựng scene
    const realm0 = Phaser.Math.Clamp(((saved && saved.realm) | 0), 0, D.realms.length - 1);
    this.ckey = TT.casterKey(this.cls, this.gender, realm0);
    this._loading = false;
    if (!TT.Casters[this.ckey] && location.protocol !== 'file:' && !data._loaded) {
      this._loading = true;
      TT.loadCasters(this, [this.ckey], () => this.scene.restart(Object.assign({}, data, { _loaded: true })));
      return;
    }
    this.cp = 'c_' + this.ckey + '_';                       // tiền tố texture/animation của nhân vật
    TT.Caster = TT.Casters[this.ckey];
    this.T = 16; this.MW = 60; this.MH = 40;
    this.worldW = this.MW * this.T; this.worldH = this.MH * this.T;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.rng = TT.Pixel.rng(20261110);
    this.solids = [];
    this.obstacles = this.physics.add.staticGroup();
    this.buildMap();

    // trạng thái người chơi
    this.s = Object.assign({ realm: 0, stage: 0, cult: 0, hp: -1, mp: -1, kills: 0 }, saved || {});
    this.s.cls = this.cls;
    this.s.gender = this.gender;
    this.s.realm = Phaser.Math.Clamp(this.s.realm | 0, 0, D.realms.length - 1);
    this.s.stage = Phaser.Math.Clamp(this.s.stage | 0, 0, 2);
    this.computeStats();
    if (this.s.hp <= 0) this.s.hp = this.st.maxHp;
    if (this.s.mp < 0) this.s.mp = this.st.maxMp;
    this.s.hp = Math.min(this.s.hp, this.st.maxHp);
    this.s.mp = Math.min(this.s.mp, this.st.maxMp);

    this.createPlayer();
    if (data.switched && data.x !== undefined) { this.player.setPosition(data.x, data.y); this.shadow.setPosition(data.x, data.y); }
    this.enemies = this.physics.add.group();
    this.orbs = [];
    this.trib = null;
    this.dead = false;
    this.hudT = 0;
    // scene.restart dùng lại cùng đối tượng scene: đặt lại các cờ trạng thái
    this.switching = false; this._hitStop = false; this.meditating = false;
    this.flying = false; this.flyBusy = false; this.lift = 0;
    if (this.physics.world.isPaused) this.physics.world.resume();
    this.anims.resumeAll();

    this.obsCollider = this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.onTouchEnemy(e));

    const cam = this.cameras.main;
    cam.setZoom(2);
    // vùng màn hình theo đơn vị thế giới: dùng cho các lớp phủ cố định (bóng tối, mây, mưa, chớp)
    const Z = cam.zoom, SW = this.scale.width, SH = this.scale.height;
    this.view = { x: SW / 2 - SW / (2 * Z), y: SH / 2 - SH / (2 * Z), w: SW / Z, h: SH / Z };
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(600);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,U,I,O,ONE,TWO,THREE,FOUR,FIVE,SPACE,B,M,P,F');
    const k = this.keys;
    this.skillKeys = [[k.K, k.ONE], [k.L, k.TWO], [k.U, k.THREE], [k.I, k.FOUR], [k.O, k.FIVE]];
    this.initSkills();
    this.input.keyboard.on('keydown', () => TT.SFX.unlock());

    // linh khí khi thiền
    this.qi = this.add.particles(0, 0, 'dot', {
      speedY: { min: -30, max: -12 }, speedX: { min: -6, max: 6 },
      lifespan: { min: 700, max: 1200 }, alpha: { start: 0.9, end: 0 }, scale: { start: 1, end: 0.4 },
      tint: [0x7fe3ff, 0xbff1ff, 0xffffff], frequency: 70,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 10) },
      emitting: false
    });
    this.qi.startFollow(this.player, 0, -this.pH * 0.7);

    // lửa linh khí bay lên quanh người (hệ có khai báo aura, ví dụ Kiếm Tu bạch y)
    if (this.C.aura) {
      this.auraFx = this.add.particles(0, 0, 'dot', {
        speedY: { min: -38, max: -16 }, speedX: { min: -6, max: 6 }, lifespan: { min: 500, max: 900 },
        scale: { start: 1.2, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: this.C.aura, blendMode: 'ADD',
        frequency: 110, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 22, 8) }
      });
      this.auraFx.startFollow(this.player, 0, -2);
      this.auraFx.setDepth(4000);
    }
    this.qi.setDepth(4000);

    // vệt kiếm khí khi ngự kiếm phi hành
    this.flyTrail = this.add.particles(0, 0, 'dot', {
      speed: { min: 2, max: 8 }, lifespan: { min: 350, max: 650 }, scale: { start: 1.3, end: 0 },
      alpha: { start: 0.85, end: 0 }, tint: [0x9fe8ff, 0xd8f6ff, 0x5ab8ff], blendMode: 'ADD', frequency: 22,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 14, 3) }, emitting: false
    }).setDepth(3990);

    // ===== đồ họa: ánh sáng, ngày đêm, môi trường =====
    this.tod = 0.3;             // thời điểm trong ngày (0..1), 1 chu kỳ = 300 giây
    this.tribDark = 0;
    this.flashes = [];
    this.lighting = new TT.Lighting(this, this.view);
    this.createAmbient();
    if (this.renderer.type === Phaser.WEBGL) {
      try { cam.postFX.addVignette(0.5, 0.5, 0.92, 0.28); } catch (e) { /* bỏ qua */ }
      if (this.player.preFX) {
        this.player.preFX.setPadding(8);
        this.pGlow = this.player.preFX.addGlow(0x7fe3ff, 0, 0, false, 0.1, 8);
      }
    }

    // vòng lặp phụ
    this.time.addEvent({ delay: 1600, loop: true, callback: () => this.spawnEnemy() });
    this.time.addEvent({ delay: 5000, loop: true, callback: () => TT.Save.save(this.s) });
    for (let i = 0; i < 4; i++) this.spawnEnemy();
    this._onUnload = () => TT.Save.save(this.s);
    window.addEventListener('beforeunload', this._onUnload);
    this.events.once('shutdown', () => window.removeEventListener('beforeunload', this._onUnload));

    TT.HUD.stats(this.s, this.st);
    if (!this.useCaster && location.protocol === 'file:') {
      TT.HUD.log('Đang dùng nhân vật tạm. Chạy start.bat để dùng nhân vật beanfx 8 hướng.', 'warn');
    }
    if (data.switched) {
      const unlocked = this.skillIds.filter((id, i) => this.skillUnlocked(i)).map(id => TT.DATA.skills[id].name);
      TT.HUD.banner('CHUYỂN TU ' + this.C.name.toUpperCase(), TT.DATA.realms[this.s.realm].name + ' · ' + TT.DATA.stages[this.s.stage] + ' (giữ nguyên tu vi)', this.C.color);
      TT.HUD.log('Đã chuyển sang ' + this.C.name + '. Chiêu đã lĩnh ngộ: ' + unlocked.join(', ') + '.', 'gold');
    } else if (!saved) {
      TT.HUD.banner('THANH VÂN SƠN', 'Con đường tu tiên bắt đầu từ đây', '#9fe3ff');
      TT.HUD.log('Ngồi thiền cạnh linh tuyền (giữ SPACE) để hấp thu linh khí.');
      TT.HUD.log('Yêu thú ngoài trận pháp rơi linh khí khi bị tiêu diệt.');
      const first = TT.DATA.skills[this.skillIds[0]];
      TT.HUD.log(this.C.name + ' lĩnh ngộ ' + first.name + ' (phím K). Mỗi lần đột phá đại cảnh giới sẽ mở thêm một chiêu.', 'gold');
    } else {
      TT.HUD.log('Đã tải tiến độ tu luyện.', 'gold');
    }
  }

  buildMap() {
    const { T, MW, MH } = this, r = this.rng, cx = MW / 2, cy = MH / 2;
    this.spring = { x: cx * T, y: cy * T };
    const pathY = x => cy + Math.round(Math.sin(x * 0.23) * 1.6);
    const pathX = y => cx + Math.round(Math.sin(y * 0.31 + 1) * 1.6);
    const kind = (x, y) => {
      const dx = (x + 0.5 - cx) / 6, dy = (y + 0.5 - cy) / 4.5;
      if (dx * dx + dy * dy <= 1) return 'stone';
      const py = pathY(x), px = pathX(y);
      if (y === py || y === py + 1 || x === px || x === px + 1) return 'path';
      return null;
    };

    // nền: vẽ toàn bộ tile vào 1 canvas
    const cv = TT.Pixel.canvas(MW * T, MH * T), ctx = cv.getContext('2d');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = kind(x, y);
      let src;
      if (k === 'stone') src = TT.Tiles.stone;
      else if (k === 'path') src = TT.Tiles.path;
      else src = r() < 0.06 ? TT.Tiles.flower : TT.Tiles.grass[(r() * 4) | 0];
      ctx.drawImage(src, x * T, y * T);
    }

    // viền cỏ mềm phủ lên đường đất / sân đá (thay cho cạnh ô vuông)
    const er = TT.Pixel.rng(4242), G = '#3e7b3a', R = TT.Pixel.rect;
    const isGrass = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && !kind(x, y);
    const dep = () => 1 + (er() < 0.45 ? 1 : 0) + (er() < 0.12 ? 1 : 0);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = kind(x, y);
      if (!k) continue;
      const sh = k === 'path' ? '#7c6342' : '#5c6170', ox = x * T, oy = y * T;
      if (isGrass(x, y - 1)) for (let i = 0; i < T; i++) { const d = dep(); R(ctx, ox + i, oy, 1, d, G); R(ctx, ox + i, oy + d, 1, 1, sh); }
      if (isGrass(x, y + 1)) for (let i = 0; i < T; i++) { const d = dep(); R(ctx, ox + i, oy + T - d, 1, d, G); }
      if (isGrass(x - 1, y)) for (let i = 0; i < T; i++) { const d = dep(); R(ctx, ox, oy + i, d, 1, G); R(ctx, ox + d, oy + i, 1, 1, sh); }
      if (isGrass(x + 1, y)) for (let i = 0; i < T; i++) { const d = dep(); R(ctx, ox + T - d, oy + i, d, 1, G); R(ctx, ox + T - d - 1, oy + i, 1, 1, sh); }
    }
    if (this.textures.exists('ground')) this.textures.remove('ground');
    this.textures.addCanvas('ground', cv);
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-1000);

    // trận pháp quanh linh tuyền
    const g = this.add.graphics().setDepth(-990);
    g.lineStyle(1, 0x7fe3ff, 0.35).strokeEllipse(this.spring.x, this.spring.y, 176, 128);
    g.lineStyle(1, 0x7fe3ff, 0.18).strokeEllipse(this.spring.x, this.spring.y, 150, 106);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      g.fillStyle(0x7fe3ff, 0.5).fillRect(Math.round(this.spring.x + Math.cos(a) * 88) - 1, Math.round(this.spring.y + Math.sin(a) * 64) - 1, 3, 3);
    }

    this.add.image(this.spring.x, this.spring.y, 'spring').setDepth(-980);
    this.addSolid(this.spring.x, this.spring.y, 50, 30);
    const st = this.add.image(this.spring.x + 60, this.spring.y - 28, 'stele').setOrigin(0.5, 1);
    st.setDepth(st.y);
    this.addSolid(st.x, st.y - 3, 12, 6);
    this.steleLight = { x: st.x, y: st.y - 12 };

    // mặt nước lấp lánh + gợn sóng
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, dd = Math.sqrt(r());
      const s = this.add.image(this.spring.x + Math.cos(a) * 20 * dd, this.spring.y + Math.sin(a) * 11 * dd, 'dot')
        .setDepth(-975).setAlpha(0).setScale(0.5);
      this.tweens.add({ targets: s, alpha: { from: 0, to: 1 }, duration: 300, yoyo: true, repeat: -1, repeatDelay: 800 + r() * 2000, delay: r() * 2000 });
    }
    this.time.addEvent({
      delay: 1400, loop: true, callback: () => {
        const a = Math.random() * Math.PI * 2, dd = Math.sqrt(Math.random());
        const rp = this.add.image(this.spring.x + Math.cos(a) * 16 * dd, this.spring.y + Math.sin(a) * 9 * dd, 'ring')
          .setDepth(-975).setTint(0xbff1ff).setScale(0.05, 0.025).setAlpha(0.7);
        this.tweens.add({ targets: rp, scaleX: 0.3, scaleY: 0.15, alpha: 0, duration: 1400, ease: 'Cubic.out', onComplete: () => rp.destroy() });
      }
    });

    this.add.particles(this.spring.x, this.spring.y, 'dot', {
      speedY: { min: -18, max: -6 }, speedX: { min: -4, max: 4 }, lifespan: 1800,
      alpha: { start: 0.8, end: 0 }, scale: { start: 1, end: 0.3 }, tint: [0x7fe3ff, 0xbff1ff],
      frequency: 160, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 50, 28) }
    }).setDepth(3000);

    // cây & đá
    const treeKey = () => r() < 0.3 ? 'tree_pink' : 'tree';
    this.trees = [];
    const place = (x, y, key) => {
      this.trees.push(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y));
      this.add.image(x, y - 1, 'shadowL').setAlpha(0.28).setDepth(-900);
      this.addSolid(x, y - 4, 10, 6);
    };
    for (let x = 8; x < this.worldW; x += 18 + r() * 10) {
      place(x, 22 + r() * 10, treeKey());
      place(x + 6, this.worldH - 2 - r() * 6, treeKey());
    }
    for (let y = 40; y < this.worldH - 20; y += 18 + r() * 10) {
      place(6 + r() * 8, y, treeKey());
      place(this.worldW - 6 - r() * 8, y, treeKey());
    }
    const nearPath = (tx, ty) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (kind(tx + dx, ty + dy)) return true;
      return false;
    };
    const scatter = (count, minDist, fn) => {
      let n = 0, tries = 0;
      while (n < count && tries < 3000) {
        tries++;
        const tx = 2 + ((r() * (MW - 4)) | 0), ty = 3 + ((r() * (MH - 5)) | 0);
        if (nearPath(tx, ty) || Math.hypot(tx - cx, (ty - cy) * 1.3) < 9) continue;
        const x = tx * T + 8 + ((r() * 6) | 0) - 3, y = ty * T + 14;
        if (this.solids.some(s => Math.hypot(s.x - x, s.y - y) < minDist)) continue;
        fn(x, y); n++;
      }
    };
    scatter(110, 22, (x, y) => place(x, y, treeKey()));
    scatter(28, 16, (x, y) => {
      this.add.image(x, y, 'rock').setOrigin(0.5, 1).setDepth(y);
      this.addSolid(x, y - 3, 12, 6);
    });

    // cỏ lay theo gió (độ trễ theo vị trí tạo thành "sóng gió" chạy qua đồng cỏ)
    for (let i = 0; i < 340; i++) {
      const tx = (r() * MW) | 0, ty = 2 + ((r() * (MH - 3)) | 0);
      if (kind(tx, ty)) continue;
      const x = tx * T + ((r() * 16) | 0), y = ty * T + ((r() * 16) | 0);
      if (this.solids.some(s => Math.hypot(s.x - x, s.y - y) < s.r + 2)) continue;
      const tf = this.add.image(x, y, r() < 0.2 ? 'tuft_f' : 'tuft').setOrigin(0.5, 1).setDepth(y);
      this.tweens.add({ targets: tf, angle: { from: -6, to: 7 }, duration: 1600 + r() * 500, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (x * 4 + y) % 1600 });
    }
  }

  createAmbient() {
    const W = this.view.w;
    this.petals = this.add.particles(this.view.x, this.view.y, 'petal', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-40, -16, W + 40, 8) },
      speedX: { min: 10, max: 28 }, speedY: { min: 12, max: 26 },
      rotate: { start: 0, end: 540 }, lifespan: 14000, frequency: 600,
      alpha: { start: 1, end: 0.6 }, tint: [0xffffff, 0xffd6e8, 0xf6c1da]
    }).setScrollFactor(0).setDepth(4500);

    this.fireflies = this.add.particles(0, 0, 'dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, this.worldW, this.worldH) },
      speed: { min: 3, max: 10 }, lifespan: { min: 3000, max: 6000 }, scale: 0.5,
      tint: [0xe6ff8a, 0xffef9a], blendMode: 'ADD', frequency: 60, emitting: false,
      alpha: { onEmit: () => 0, onUpdate: (pt, k, t) => Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.sin(t * 40 + pt.x)) }
    }).setDepth(5050);

    this.rain = this.add.particles(this.view.x, this.view.y, 'drop', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-20, -12, W + 120, 4) },
      speedY: { min: 380, max: 460 }, speedX: { min: -90, max: -70 }, rotate: 11,
      lifespan: 800, quantity: 3, frequency: 16, alpha: 0.5, emitting: false
    }).setScrollFactor(0).setDepth(5150);
  }

  isNight() { return this.tod > 0.55 && this.tod < 0.85; }

  addLight(x, y, r, c, ttl) { this.flashes.push({ x, y, r, c, ttl, born: this.time.now }); }

  updateVisuals(time, d) {
    const p = this.player, sp = this.spring, LC = TT.Lighting.lerpColor;
    this.tod = (this.tod + d / 300) % 1;

    // độ tối theo giờ trong ngày
    const keys = [[0, 0], [0.42, 0], [0.55, 0.62], [0.85, 0.62], [1, 0]];
    let dark = 0;
    for (let i = 1; i < keys.length; i++) {
      if (this.tod <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        dark = a[1] + (b[1] - a[1]) * ((this.tod - a[0]) / (b[0] - a[0]));
        break;
      }
    }
    let color = LC(0x3a1838, 0x0b0f2e, Math.pow(dark / 0.62, 1.5));   // hoàng hôn tím cam -> đêm xanh thẫm
    dark = Math.max(dark, 0.74 * this.tribDark);
    color = LC(color, 0x0a0718, this.tribDark);

    // nguồn sáng
    const L = [];
    L.push({ x: p.x, y: p.y - this.pH * 0.5, r: this.meditating ? 74 : 50, i: 1, c: this.meditating ? 0x7fe3ff : null });
    L.push({ x: sp.x, y: sp.y, r: 100 + Math.sin(time / 380) * 5, i: 1, c: 0x5fd3ff });
    L.push({ x: this.steleLight.x, y: this.steleLight.y, r: 30, i: 0.8, c: 0x7fe3ff });
    for (let i = 0; i < this.orbs.length && i < 40; i++) L.push({ x: this.orbs[i].x, y: this.orbs[i].y, r: 16, i: 0.9, c: 0x7fe3ff });
    this.enemies.getChildren().forEach(e => {
      if (e.active && !e.dying) L.push({ x: e.x, y: e.y - 6, r: 24, i: 0.55, c: e.kind.tint[0] });
    });
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i], k = 1 - (time - f.born) / f.ttl;
      if (k <= 0) { this.flashes.splice(i, 1); continue; }
      L.push({ x: f.x, y: f.y, r: f.r, i: k, c: f.c });
    }
    this.lighting.render(L, dark, color);

    // môi trường
    this.fireflies.emitting = dark > 0.3 && !this.trib;
    this.petals.emitting = !this.trib;

    // cây mờ đi khi nhân vật đứng phía sau
    for (const t of this.trees) {
      const a = (Math.abs(t.x - p.x) < 15 && p.y < t.y - 3 && p.y > t.y - 40) ? 0.5 : 1;
      if (t.alpha !== a) t.setAlpha(a);
    }

    // hào quang khi thiền
    if (this.pGlow) {
      const buffed = this.buff && time < this.buff.until;
      const target = buffed ? 3 : this.meditating ? (this.trib ? 4 : 2.5) : 0;
      this.pGlow.outerStrength += (target - this.pGlow.outerStrength) * Math.min(1, d * 6);
      this.pGlow.color = (buffed || this.trib) ? 0xffd04a : 0x7fe3ff;
    }

    if (time - (this.todT || 0) > 500) {
      this.todT = time;
      const t = this.tod;
      TT.HUD.tod(t < 0.42 ? 'Ban ngày' : t < 0.55 ? 'Hoàng hôn' : t < 0.85 ? 'Đêm: Nguyệt hoa, tu vi +30%' : 'Bình minh', this.isNight());
    }
  }

  heal(v) {
    v = Math.round(v);
    if (v <= 0 || this.s.hp >= this.st.maxHp) return;
    this.s.hp = Math.min(this.st.maxHp, this.s.hp + v);
    const p = this.player;
    TT.FX.text(this, p.x + 8, p.y - this.pH - 4, '+' + v, '#7dffb8', 11);
  }

  solidAt(x, y) {
    if (x < 8 || y < 12 || x > this.worldW - 8 || y > this.worldH - 4) return true;
    return this.solids.some(o => Math.hypot(o.x - x, o.y - y) < o.r);
  }

  // ================= CHIÊU THỨC =================
  initSkills() {
    this.skillIds = this.C.skills;
    this.skillReady = this.skillIds.map(() => 0);
    this.skillLock = 0;
    this.projectiles = [];
    this.auras = [];
    this.buff = null;
    this.dash = null;
    TT.HUD.initSkills(this.C, this.skillIds, i => this.useSkill(i));
  }

  // ô chiêu thứ i mở khóa khi đạt đại cảnh giới thứ i (Luyện Khí = 0)
  skillUnlocked(i) { return this.s.realm >= i; }

  useSkill(i) {
    if (this.dead || i >= this.skillIds.length) return;
    const id = this.skillIds[i], sk = TT.DATA.skills[id], now = this.time.now;
    if (!this.skillUnlocked(i)) {
      TT.HUD.log(sk.name + ': cần đạt ' + TT.DATA.realms[i].name + ' mới lĩnh ngộ được.', 'warn');
      return;
    }
    if (now < this.skillReady[i] || now < this.skillLock || this.meditating) return;
    if (this.s.mp < sk.cost) { TT.HUD.log('Linh lực không đủ để thi triển ' + sk.name + '!', 'warn'); return; }
    if (TT.Skills[id](this, sk, now) === false) return;
    this.s.mp -= sk.cost;
    this.skillReady[i] = now + sk.cd * 1000;
    TT.HUD.pulseSlot(i);
  }

  skillHud() {
    const now = this.time.now;
    return this.skillIds.map((id, i) => {
      const sk = TT.DATA.skills[id], left = Math.max(0, this.skillReady[i] - now);
      return { locked: !this.skillUnlocked(i), frac: left / (sk.cd * 1000), left: left / 1000, noMp: this.s.mp < sk.cost };
    });
  }

  nearestEnemies(x, y, range, n) {
    return this.enemies.getChildren()
      .filter(e => e.active && !e.dying)
      .map(e => ({ e, d: Phaser.Math.Distance.Between(x, y, e.x, e.y) }))
      .filter(o => o.d <= range)
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map(o => o.e);
  }

  // o: { sprite, vx, vy, life (ms), r, dmg, pierce, color, onEnd(x, y) }
  addProjectile(o) {
    o.born = this.time.now; o.hit = new Set();
    if (o.color) {
      o.trail = this.add.particles(0, 0, 'dot', {
        speed: { min: 2, max: 12 }, lifespan: 300, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
        tint: [o.color, 0xffffff], frequency: 20, blendMode: 'ADD'
      }).setDepth(5150);
      o.trail.startFollow(o.sprite);
    }
    this.projectiles.push(o);
  }

  endProjectile(o) {
    o.dead = true;
    if (o.onEnd) o.onEnd(o.sprite.x, o.sprite.y);
    if (o.trail) { o.trail.stop(); this.time.delayedCall(400, () => o.trail.destroy()); }
    this.tweens.killTweensOf(o.sprite);
    o.sprite.destroy();
  }

  updateSkills(time, d) {
    const p = this.player;
    // đạn / kiếm khí
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const o = this.projectiles[i], s = o.sprite;
      if (o.homing !== undefined) {                       // âm hồn tự truy đuổi; mất mục tiêu thì tìm con khác
        if (!o.homing || !o.homing.active || o.homing.dying) o.homing = this.nearestEnemies(s.x, s.y, 160, 1)[0] || null;
        if (o.homing) {
          const tx = o.homing.x - s.x, ty = o.homing.y - 6 - s.y, dd = Math.hypot(tx, ty) || 1, k = Math.min(1, d * 5);
          o.vx += (tx / dd * o.speed - o.vx) * k; o.vy += (ty / dd * o.speed - o.vy) * k;
        }
        s.setRotation(Math.atan2(o.vy, o.vx) + Math.PI / 2);
      }
      s.x += o.vx * d; s.y += o.vy * d;
      if (o.color) this.flashes.push({ x: s.x, y: s.y, r: 40, c: o.color, ttl: 60, born: time });
      let end = time - o.born > o.life || s.x < 0 || s.y < 0 || s.x > this.worldW || s.y > this.worldH;
      for (const e of this.enemies.getChildren()) {
        if (end || !e.active || e.dying || o.hit.has(e)) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y - 6) > o.r + 6) continue;
        o.hit.add(e);
        if (o.dmg) {
          const dm = o.dmg * Phaser.Math.FloatBetween(0.9, 1.1);
          this.damageEnemy(e, dm, { kx: Math.sign(o.vx) * 0.7, ky: Math.sign(o.vy) * 0.7, force: 120 });
          if (o.lifesteal) this.heal(dm * o.lifesteal);
        }
        if (!o.pierce) end = true;
      }
      if (end) { this.endProjectile(o); this.projectiles.splice(i, 1); }
    }

    // lướt (Lưu Vân Bộ)
    if (this.dash) {
      const ds = this.dash;
      if (time < ds.until) {
        p.setVelocity(ds.vx, ds.vy);
        if (time - ds.ghostT > 28) { ds.ghostT = time; this.ghost(p, 0x9fe3ff); }
        for (const e of this.nearestEnemies(p.x, p.y, 20, 9)) {
          if (ds.hit.has(e)) continue;
          ds.hit.add(e);
          this.damageEnemy(e, ds.dmg, { ox: p.x, oy: p.y, force: 160 });
        }
      } else {
        this.dash = null;
        p.setVelocity(0);
        if (ds.onEnd) ds.onEnd();
      }
    }

    // phi kiếm hộ thân (Kiếm Vực)
    for (let i = this.auras.length - 1; i >= 0; i--) {
      const a = this.auras[i];
      if (a.type === 'buff') {                           // Kim Chung Tráo: chuông + hào quang bám theo người
        if (time > a.until || this.dead) {
          if (a.aura) a.aura.stop();
          if (this.buff === a) this.buff = null;
          this.auras.splice(i, 1); continue;
        }
        if (a.bell) a.bell.setPos(p.x, p.y);
        if (a.aura) a.aura.setPos(p.x, p.y);
        this.flashes.push({ x: p.x, y: p.y - 30, r: 70, c: 0xffd04a, ttl: 60, born: time });
        continue;
      }
      if (a.type === 'wispring') {                       // Âm Hỏa Trận: 8 ma trơi xoay quanh thân
        if (time > a.until || this.dead) {
          a.wisps.concat([a.ring]).forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: () => o.destroy() }));
          this.auras.splice(i, 1); continue;
        }
        a.t += d;
        const cx = p.x, cy = p.y - 8;
        a.ring.setPosition(p.x, p.y).setRotation(a.t * 1.5);
        a.wisps.forEach((wp, k) => {
          const ang = a.t * 2.4 + k * Math.PI / 4;
          wp.setPosition(cx + Math.cos(ang) * 36, cy + Math.sin(ang) * 22 + Math.sin(a.t * 6 + k) * 2);
        });
        this.flashes.push({ x: cx, y: cy, r: 70, c: 0x5dffa0, ttl: 60, born: time });
        if (time >= a.next) {
          a.next = time + 400;
          let total = 0;
          this.nearestEnemies(cx, cy + 6, 46, 99).forEach(e => {
            const dm = a.dmg * Phaser.Math.FloatBetween(0.9, 1.1); total += dm;
            this.damageEnemy(e, dm, { ox: cx, oy: cy, force: 50 });
          });
          if (total) this.heal(total * 0.2);
        }
        continue;
      }
      if (a.type === 'minions') {                        // Bách Quỷ Dạ Hành: quỷ hồn tự săn yêu thú
        if (time > a.until || this.dead) {
          a.ghosts.forEach(g => { TT.FX.burst(this, g.x, g.y, [0xb8ffd8, 0x5dffa0], 12, 80); this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() }); });
          this.auras.splice(i, 1); continue;
        }
        a.ghosts.forEach(g => {
          const tgt = this.nearestEnemies(g.x, g.y + 8, 170, 1)[0];
          let gx, gy;
          if (tgt && Phaser.Math.Distance.Between(p.x, p.y, tgt.x, tgt.y) < 220) { gx = tgt.x; gy = tgt.y - 10; }
          else { const ang = time / 600 + g.k * Math.PI / 2; gx = p.x + Math.cos(ang) * 24; gy = p.y - 24 + Math.sin(ang) * 10; }
          const tx = gx - g.x, ty = gy - g.y, dd = Math.hypot(tx, ty) || 1, sp = tgt ? 130 : 90, k = Math.min(1, d * 4);
          g.vx += (tx / dd * sp - g.vx) * k; g.vy += (ty / dd * sp - g.vy) * k;
          g.x += g.vx * d; g.y += g.vy * d;
          g.setFlipX(g.vx < 0);
          this.flashes.push({ x: g.x, y: g.y, r: 26, c: 0x7dffb8, ttl: 50, born: time });
          if (tgt && dd < 12 && time >= g.nextBite) {
            g.nextBite = time + 600;
            this.damageEnemy(tgt, a.dmg * Phaser.Math.FloatBetween(0.9, 1.1), { ox: g.x, oy: g.y, force: 80 });
            TT.FX.burst(this, g.x, g.y + 4, [0xb8ffd8, 0x5dffa0], 8, 60);
          }
        });
        continue;
      }
      if (a.type === 'follow') {                         // Lôi Thần Hộ Thể: lôi quấn thân, tự giật địch lại gần
        if (time > a.until || this.dead) { if (this.dead && a.fx) a.fx.stop(); this.auras.splice(i, 1); continue; }
        if (a.fx) a.fx.setPos(p.x, p.y);
        if (time >= a.next) {
          const e = this.nearestEnemies(p.x, p.y, 56, 1)[0];
          if (e) {
            a.next = time + 450;
            TT.FX.lightning(this, e.x, e.y, { scale: 0.5 });
            this.damageEnemy(e, a.dmg * Phaser.Math.FloatBetween(0.9, 1.1), { ox: p.x, oy: p.y, force: 120 });
          }
        }
        continue;
      }
      if (time > a.until || this.dead) {
        a.swords.forEach(sw => this.tweens.add({ targets: sw, alpha: 0, scale: 0.4, duration: 250, onComplete: () => sw.destroy() }));
        this.auras.splice(i, 1);
        continue;
      }
      a.t += d;
      const cx = p.x, cy = p.y - this.pH * 0.4;
      a.swords.forEach((sw, k) => {
        const ang = a.t * 5 + k * Math.PI * 2 / 3;
        const x = cx + Math.cos(ang) * a.r, y = cy + Math.sin(ang) * a.r * 0.6;
        sw.setPosition(x, y).setRotation(ang).setDepth(p.y + Math.sin(ang) * 10);
      });
      if (Math.floor(a.t * 20) % 2 === 0) this.flashes.push({ x: cx, y: cy, r: 50, c: 0x8fd3ff, ttl: 80, born: time });
      for (const e of this.nearestEnemies(cx, cy + 6, a.r + 12, 9)) {
        if (time - (a.last.get(e) || 0) < 350) continue;
        a.last.set(e, time);
        this.damageEnemy(e, a.dmg, { ox: cx, oy: cy, force: 90 });
      }
    }
  }

  // ===== cảm giác đánh =====
  hitStop(ms) {
    if (this._hitStop) return;
    this._hitStop = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    setTimeout(() => { this.physics.world.resume(); this.anims.resumeAll(); this._hitStop = false; }, ms);
  }

  ghost(s, tint) {
    const g = this.add.image(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY)
      .setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setTint(tint).setAlpha(0.55).setDepth(s.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  addSolid(x, y, w, h) {
    const z = this.add.zone(x, y, w, h);
    this.obstacles.add(z);
    this.solids.push({ x, y, r: Math.max(w, h) / 2 + 4 });
  }

  createPlayer() {
    const sp = this.spring, rig = TT.Caster;
    this.useCaster = !!rig;
    this.shadow = this.add.image(sp.x, sp.y + 50, 'shadow').setAlpha(0.35).setDepth(-900);
    if (this.useCaster) {
      // nhân vật beanfx: frame 144x128, pivot (chân) theo rig.json, hiển thị scale 0.5 dưới camera zoom 2
      const a = rig.anims.idle, fw = a.frame[0], fh = a.frame[1];
      this.player = this.physics.add.sprite(sp.x, sp.y + 50, this.cp + 'idle_south', 0)
        .setOrigin(a.pivot[0] / fw, a.pivot[1] / fh).setScale(TT.rigScale(rig));
      const bk = TT.DATA.casterScale / TT.rigScale(rig);   // thân va chạm giữ cùng kích thước thế giới với mọi bộ
      this.player.body.setSize(16 * bk, 10 * bk).setOffset(a.pivot[0] - 8 * bk, a.pivot[1] - 9 * bk);
      this.pH = rig.height * TT.rigScale(rig);             // chiều cao nhân vật theo đơn vị thế giới
      this.shadow.setScale(1.4, 1.2);
    } else {
      this.player = this.physics.add.sprite(sp.x, sp.y + 50, 'hero', 0).setOrigin(0.5, 22 / 24);
      this.player.body.setSize(8, 5).setOffset(12, 18);
      this.pH = 20;
    }
    this.player.setCollideWorldBounds(true);
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.animType = null;
    this.playAnim('idle', true);
    this.lockUntil = 0; this.knockUntil = 0; this.nextAttack = 0; this.nextCast = 0;
    this.invulnUntil = 0; this.combo = 0; this.lastSlash = -9999;
  }

  // hướng 8 phía từ vector facing: round(atan2(dy,dx) / tau * 8) mod 8 (quy tắc của beanfx)
  dirName() {
    const dirs = TT.Caster.directions, n = dirs.length;
    const i = ((Math.round(Math.atan2(this.facing.y, this.facing.x) / (Math.PI * 2) * n) % n) + n) % n;
    return dirs[i];
  }

  // name: idle | run | sit | cast | attack1..3 | hurt | dead
  // keep=true: đổi hướng giữa chừng vẫn giữ nguyên frame đang chạy (chạy/đứng mượt khi xoay)
  playAnim(name, keep) {
    const p = this.player;
    if (!this.useCaster) {
      this.animType = name;
      const map = { idle: 'hero_idle', run: 'hero_walk', sit: 'hero_sit', attack1: 'hero_attack', attack2: 'hero_attack', attack3: 'hero_attack' };
      if (name === 'cast') { p.anims.stop(); p.setFrame(9); }
      else if (name === 'dead') { p.anims.stop(); p.setFrame(10); }
      else if (map[name]) p.play(map[name], keep);
      return;
    }
    if (name === 'sit') {
      // không có động tác ngồi: giữ tư thế kiếm chỉ trước ngực (frame 4 của "cast"), quay mặt về phía nam
      p.anims.stop();
      const sc = TT.Caster.anims.cast;
      if (sc && sc.alias) p.setTexture(this.cp + sc.alias + '_south', 0);
      else p.setTexture(this.cp + 'cast_south', Math.min(4, sc.frames - 1));   // tư thế bắt ấn
      this.animType = 'sit';
      return;
    }
    const ad = TT.Caster.anims[name];
    if (ad && ad.alias && !(keep && this.animType === name)) this.aliasFx(name);
    const key = this.cp + name + '_' + this.dirName();
    const cur = p.anims.currentAnim;
    if (keep && cur && cur.key === key && p.anims.isPlaying) return;
    let startFrame = 0;
    if (keep && this.animType === name && p.anims.currentFrame) startFrame = p.anims.currentFrame.index - 1;
    this.animType = name;
    p.play({ key, startFrame });
  }

  // ===== ngự kiếm phi hành (F) =====
  canFly() { return !!(this.useCaster && TT.Caster.anims.fly); }

  // nâng sprite lên khỏi mặt đất (đơn vị thế giới) mà giữ nguyên thân va chạm & bóng ở chân
  setLift(v) {
    const p = this.player, a = TT.Caster.anims.idle, sc = TT.rigScale(TT.Caster);
    const bk = TT.DATA.casterScale / sc, lf = v / sc;
    this.lift = v;
    p.setOrigin(a.pivot[0] / a.frame[0], (a.pivot[1] + lf) / a.frame[1]);
    p.body.setOffset(a.pivot[0] - 8 * bk, a.pivot[1] - 9 * bk + lf);
  }

  toggleFly(time) {
    if (this.flyBusy || this.dead) return;
    if (this.flying) { this.land(time); return; }
    if (!this.canFly()) { TT.HUD.log('Tông môn này chưa có thuật ngự kiếm.'); return; }
    if (this.s.realm < 1) { TT.HUD.log('Đạt Trúc Cơ mới có thể ngự kiếm phi hành.', 'warn'); return; }
    if (this.trib) { TT.HUD.log('Đang độ kiếp, không thể ngự kiếm!', 'warn'); return; }
    if (time < this.lockUntil) return;
    const p = this.player, dur = this.animMs('fly_up', 400);
    this.flyBusy = true;
    p.setVelocity(0);
    this.playAnim('fly_up');
    this.lockUntil = time + dur;
    if (TT.SFX.pickup) TT.SFX.pickup();
    TT.FX.ring(this, p.x, p.y, 0x9fe8ff, 0.9, 380);
    const o = { v: 0 };
    this.tweens.add({ targets: o, v: 9, delay: dur * 0.4, duration: dur * 0.6, ease: 'Quad.easeOut',
      onUpdate: () => this.setLift(o.v) });
    this.time.delayedCall(dur, () => {
      if (this.dead || !this.flyBusy) return;
      this.flyBusy = false; this.flying = true;
      this.obsCollider.active = false;                      // bay lướt qua vật cản
      this.playAnim('fly', true);
    });
  }

  land(time, instant) {
    const p = this.player;
    this.flying = false;
    this.flyTrail.emitting = false;
    if (instant) {
      this.flyBusy = false; this.tweens.killTweensOf(this.player);
      this.setLift(0); this.obsCollider.active = true; this.shadow.setScale(1.4, 1.2);
      return;
    }
    const dur = this.animMs('fly_land', 400);
    this.flyBusy = true;
    p.setVelocity(0);
    this.playAnim('fly_land');
    this.lockUntil = time + dur;
    const o = { v: this.lift };
    this.tweens.add({ targets: o, v: 0, duration: dur * 0.45, ease: 'Quad.easeIn', onUpdate: () => this.setLift(o.v) });
    this.time.delayedCall(dur * 0.45, () => TT.FX.ring(this, p.x, p.y, 0x9fe8ff, 0.8, 320));
    this.time.delayedCall(dur, () => {
      if (this.dead) return;
      this.flyBusy = false; this.obsCollider.active = true; this.setLift(0); this.shadow.setScale(1.4, 1.2);
      this.animType = null; this.playAnim('idle', true);
    });
  }

  flyHint(time) {
    if (time < (this._flyHintT || 0)) return;
    this._flyHintT = time + 2500;
    TT.HUD.log('Đang ngự kiếm: nhấn F để hạ xuống rồi mới xuất chiêu.');
  }

  // bộ hero chưa có động tác đánh / thi pháp / trúng đòn / ngã: thay bằng hiệu ứng trên sprite
  aliasFx(name) {
    const p = this.player, k = TT.rigScale(TT.Caster);
    const col = Phaser.Display.Color.HexStringToColor(this.C.color).color;
    this.tweens.killTweensOf(p);
    p.setScale(k).setAngle(0);
    if (/^attack/.test(name)) {
      // lướt tới + nghiêng người theo hướng đánh, kèm vệt chém
      const big = name === 'attack3', dist = big ? 7 : 4;
      const fx = this.facing.x, fy = this.facing.y;
      this.tweens.add({ targets: p, x: p.x + fx * dist, y: p.y + fy * dist * 0.6, angle: (fx >= 0 ? 1 : -1) * (big ? 10 : 6),
        scaleX: k * 1.08, scaleY: k * 0.94, duration: 90, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => p.setScale(k).setAngle(0) });
      const ang = Math.atan2(fy, fx), y0 = p.y - this.pH * 0.45;
      const s = this.add.image(p.x + fx * 12, y0 + fy * 8, 'slash', big ? 1 : 0).setRotation(ang)
        .setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.depth + 1).setScale(big ? 1.2 : 0.9);
      this.tweens.add({ targets: s, alpha: 0, scale: s.scale * 1.3, duration: 220, onComplete: () => s.destroy() });
    } else if (name === 'cast') {
      // vận công: nhún xuống, bật lên, hào quang tông môn
      this.tweens.add({ targets: p, scaleY: k * 1.06, scaleX: k * 0.96, duration: 120, yoyo: true, ease: 'Sine.easeInOut',
        onComplete: () => p.setScale(k) });
      p.setTintFill(col);
      this.time.delayedCall(70, () => { if (!this.dead) p.clearTint(); });
      TT.FX.ring(this, p.x, p.y - 2, col, 0.8, 320);
      TT.FX.burst(this, p.x, p.y - this.pH * 0.6, [col, 0xffffff], 8, 50);
    } else if (name === 'hurt') {
      const fx = this.facing.x >= 0 ? -1 : 1;
      this.tweens.add({ targets: p, x: p.x + fx * 2, angle: fx * 8, duration: 70, yoyo: true,
        onComplete: () => p.setAngle(0) });
    } else if (name === 'dead') {
      this.tweens.add({ targets: p, angle: this.facing.x >= 0 ? -90 : 90, y: p.y - 2, alpha: 0.6, duration: 380, ease: 'Quad.easeIn' });
    }
  }

  // thời điểm (ms) tới frame chạm của một động tác beanfx; dùng để gây sát thương đúng lúc kiếm chém tới
  contactMs(name, fallback) {
    const a = this.useCaster && TT.Caster.anims[name];
    if (!a || !a.contact || !a.ms) return fallback;
    let t = 0;
    for (let i = 0; i < a.contact[0]; i++) t += a.ms[i];
    return t;
  }

  animMs(name, fallback) {
    const a = this.useCaster && TT.Caster.anims[name];
    if (!a) return fallback;
    return a.ms ? a.ms.reduce((x, y) => x + y, 0) : a.frames / a.fps * 1000;
  }

  // điểm xuất chiêu (đầu kiếm / tay) theo rig.json, quy ra toạ độ thế giới
  emitPoint(name) {
    const p = this.player, a = this.useCaster && TT.Caster.anims[name];
    const pt = a && a.emit && a.emit.point[this.dirName()];
    if (!pt) return { x: p.x + this.facing.x * 8, y: p.y - this.pH * 0.6 };
    const k = TT.rigScale(TT.Caster);
    return { x: p.x + pt[0] * k, y: p.y + pt[1] * k };
  }

  computeStats() {
    const R = TT.DATA.realms[this.s.realm], m = 1 + 0.2 * this.s.stage;
    this.st = {
      maxHp: Math.round(R.hp * m * this.C.hpMul), maxMp: Math.round(R.mp * m * this.C.mpMul),
      atk: Math.round(R.atk * m * this.C.atkMul), speed: 82 + this.s.realm * 5
    };
  }

  // ================= VÒNG LẶP =================
  update(time, delta) {
    if (this._loading || !this.player) return;
    const d = Math.min(delta, 50) / 1000, p = this.player, s = this.s, st = this.st, k = this.keys, D = TT.DATA;
    const JD = Phaser.Input.Keyboard.JustDown;

    if (JD(k.M)) TT.HUD.log(TT.SFX.toggle() ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
    if (this.dead) { p.setVelocity(0); this.qi.emitting = false; return; }

    const locked = time < this.lockUntil;
    let ix = 0, iy = 0;
    if (k.A.isDown || k.LEFT.isDown) ix -= 1;
    if (k.D.isDown || k.RIGHT.isDown) ix += 1;
    if (k.W.isDown || k.UP.isDown) iy -= 1;
    if (k.S.isDown || k.DOWN.isDown) iy += 1;
    if (JD(k.F)) this.toggleFly(time);
    const wantSit = k.SPACE.isDown && !this.flying;
    const moving = (ix || iy) && !locked && !wantSit;

    if (moving) {
      const len = Math.hypot(ix, iy), spd = st.speed * (this.flying ? 1.9 : 1);
      p.setVelocity(ix / len * spd, iy / len * spd);
      this.facing.set(ix / len, iy / len);
      if (ix && !this.useCaster) p.setFlipX(ix < 0);
    } else if (time > this.knockUntil) {
      p.setVelocity(0);
    }
    this.meditating = wantSit && !locked;

    if (!locked) {
      if (this.flying) this.playAnim('fly', true);
      else if (this.meditating) { if (this.animType !== 'sit') this.playAnim('sit'); }
      else this.playAnim(moving ? 'run' : 'idle', true);
    }
    if (this.flying) {
      this.setLift(9 + Math.sin(time / 260) * 1.2);          // lơ lửng nhấp nhô trên kiếm
      this.flyTrail.setPosition(p.x - this.facing.x * 8, p.y - this.lift - this.facing.y * 4);
      this.flyTrail.emitting = !!moving;
    }

    const pressed = this.skillKeys.map(([a, b]) => { const x = JD(a), y = JD(b); return x || y; });
    if (this.flying || this.flyBusy) {
      if (k.J.isDown || pressed.some(Boolean)) this.flyHint(time);
    } else if (!this.meditating) {
      if (k.J.isDown) this.doSlash(time);
      pressed.forEach((on, i) => { if (on) this.useSkill(i); });
    }
    if (JD(k.B)) this.tryTribulation();
    if (JD(k.P)) this.switchClass();

    // tu luyện & hồi phục
    const nearSpring = Phaser.Math.Distance.Between(p.x, p.y, this.spring.x, this.spring.y) < D.springRadius;
    const R = D.realms[s.realm];
    if (!this.trib) {
      const rate = this.meditating ? D.meditateRate * (nearSpring ? D.springMul : 1) : D.passiveRate;
      this.addCult(rate * R.gain * (this.isNight() ? 1.3 : 1) * d);
    }
    const regen = this.meditating ? (nearSpring ? 3 : 2) : 0.25;
    s.hp = Math.min(st.maxHp, s.hp + st.maxHp * 0.03 * regen * d);
    s.mp = Math.min(st.maxMp, s.mp + st.maxMp * (this.meditating ? 0.12 : 0.03) * d);

    this.qi.emitting = this.meditating;
    this.qi.frequency = nearSpring ? 30 : 80;

    this.updateEnemies(time);
    this.updateOrbs(time, d);
    this.updateVisuals(time, d);
    this.updateSkills(time, d);

    p.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y);
    if (this.lift) this.shadow.setScale(1.4 - this.lift * 0.03, 1.2 - this.lift * 0.03);
    this.updatePrompt(nearSpring);
    if (time - this.hudT > 100) { this.hudT = time; TT.HUD.stats(s, st); TT.HUD.skills(this.skillHud()); }
  }

  updatePrompt(nearSpring) {
    const R = TT.DATA.realms[this.s.realm];
    let t = '';
    if (this.trib) t = this.trib.final ? 'ĐẠO LÔI CUỐI! Giữ SPACE để vận công hộ thể' : 'Né các vòng sét đỏ!';
    else if (this.isBottleneck()) t = R.strikes ? 'Bình cảnh! Nhấn B để độ kiếp (' + R.strikes + ' đạo thiên lôi)' : 'Tu vi viên mãn: đã hết nội dung bản demo';
    else if (nearSpring && !this.meditating) t = 'Linh tuyền: giữ SPACE để thiền (tu vi x' + TT.DATA.springMul + ')';
    TT.HUD.prompt(t);
  }

  // ================= TU VI =================
  isBottleneck() {
    const R = TT.DATA.realms[this.s.realm];
    return this.s.stage === 2 && this.s.cult >= R.need[2];
  }

  addCult(v) {
    const s = this.s, R = TT.DATA.realms[s.realm];
    if (this.isBottleneck()) return;
    s.cult += v;
    while (s.cult >= R.need[s.stage]) {
      if (s.stage < 2) {
        s.cult -= R.need[s.stage];
        s.stage++;
        this.onStageUp();
      } else {
        s.cult = R.need[2];
        TT.HUD.log(R.strikes ? 'Đã chạm bình cảnh, cần độ kiếp để đột phá! (nhấn B)' : 'Tu vi viên mãn!', 'gold');
        break;
      }
    }
  }

  onStageUp() {
    const s = this.s, R = TT.DATA.realms[s.realm], p = this.player;
    this.computeStats();
    s.hp = Math.min(this.st.maxHp, s.hp + this.st.maxHp * 0.25);
    TT.FX.ring(this, p.x, p.y - this.pH * 0.5, 0x7fe3ff, 2, 700);
    TT.FX.burst(this, p.x, p.y - this.pH * 0.5, [0x7fe3ff, 0xffffff], 24, 90);
    TT.SFX.levelup();
    TT.HUD.banner(R.name + ' · ' + TT.DATA.stages[s.stage], 'Tu vi tăng tiến', R.color);
    TT.Save.save(s);
  }

  // ================= CHIẾN ĐẤU =================
  doSlash(time) {
    if (time < this.nextAttack) return;
    this.combo = (time - this.lastSlash < 650) ? (this.combo + 1) % 3 : 0;
    const big = this.combo === 2, p = this.player, name = 'attack' + (this.combo + 1);
    // beanfx: sát thương rơi đúng frame "contact" của động tác chém
    const contact = this.contactMs(name, 0);
    this.lastSlash = time;
    this.nextAttack = time + Math.max(contact + (big ? 200 : 110), big ? 460 : 250);
    this.lockUntil = time + (this.useCaster ? this.animMs(name, 300) * 0.8 : (big ? 260 : 170));
    p.setVelocity(0);
    this.playAnim(name);

    let ang = Math.atan2(this.facing.y, this.facing.x);
    ang = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const reach = (big ? 16 : 13) + (this.useCaster ? 3 : 0);
    const strike = () => {
      if (this.dead) return;
      const hx = p.x + dx * reach, hy = p.y - this.pH * 0.45 + dy * reach;
      if (this.cls === 'vo') {                                      // Võ Tu: chưởng ấn, không có vệt kiếm
        const col = big ? 0xffe08a : 0xffb347;
        TT.FX.ring(this, hx, hy, col, big ? 1.1 : 0.7, big ? 320 : 220);
        TT.FX.burst(this, hx, hy, [col, 0xffffff], big ? 22 : 12, big ? 140 : 100);
        this.addLight(hx, hy, big ? 60 : 40, col, 200);
        TT.SFX.slash(big);
      } else {
        const sl = TT.FX.slash(this, hx, hy, ang, big);
        if (this.cls === 'phap' && !big) sl.setTint(0xd8c8ff);
        if (this.cls === 'nho' && !big) sl.setTint(0xf0f2ff);
      }
      if (big) [0, 50, 100].forEach(dl => this.time.delayedCall(dl, () => this.ghost(p, 0xffe08a)));
      this.hitEnemiesInRadius(hx, hy + 4, (big ? 22 : 17) + (this.useCaster ? 2 : 0), this.st.atk * (big ? 1.8 : 1), { kx: dx, ky: dy, force: big ? 200 : 120 });
    };
    if (contact > 0) this.time.delayedCall(contact, strike); else strike();
  }

  castThunder(time, mul) {
    const p = this.player;
    p.setVelocity(0);

    let tx = p.x + this.facing.x * 60, ty = p.y + this.facing.y * 60, best = 150;
    this.enemies.getChildren().forEach(e => {
      if (!e.active || e.dying) return;
      const dd = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
      if (dd < best) { best = dd; tx = e.x; ty = e.y; }
    });
    if (best < 150 && (tx !== p.x || ty !== p.y)) this.facing.set(tx - p.x, ty - p.y).normalize();   // quay về phía mục tiêu
    if (!this.useCaster && tx !== p.x) p.setFlipX(tx < p.x);

    const contact = this.contactMs('cast', 200);           // frame tung chiêu trong rig.json
    this.lockUntil = time + Math.max(240, contact + 120);
    this.playAnim('cast');
    TT.SFX.cast();
    TT.FX.warn(this, tx, ty, 14, contact);
    this.time.delayedCall(contact, () => {
      const ep = this.emitPoint('cast');
      TT.FX.burst(this, ep.x, ep.y, [0x9ad8ff, 0xffffff], 10, 60);
      this.addLight(ep.x, ep.y, 40, 0xbff1ff, 250);
      TT.FX.lightning(this, tx, ty, { scale: 0.7 });
      this.hitEnemiesInRadius(tx, ty, 24, this.st.atk * (mul || 2.4), { ox: tx, oy: ty, force: 110 });
    });
  }

  hitEnemiesInRadius(x, y, r, dmg, kb) {
    let hits = 0;
    this.enemies.getChildren().slice().forEach(e => {
      if (!e.active || e.dying) return;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y - 5) > r + 6) return;
      hits++;
      this.damageEnemy(e, dmg * Phaser.Math.FloatBetween(0.9, 1.1), kb);
    });
    if (hits) {
      this.cameras.main.shake(60, 0.002);
      this.hitStop(dmg > this.st.atk * 1.5 ? 75 : 40);
    }
    return hits;
  }

  damageEnemy(e, dmg, kb) {
    if (this.buff && this.time.now < this.buff.until) dmg *= this.buff.atk;   // Kim Chung Tráo tăng công
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    TT.FX.text(this, e.x, e.y - 14, String(dmg), '#ffffff');
    e.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (e.active) e.clearTint(); });
    this.tweens.killTweensOf(e);
    e.setScale(1).setAlpha(1);
    this.tweens.add({ targets: e, scaleX: 1.35, scaleY: 0.7, duration: 70, yoyo: true });
    TT.SFX.hit();
    let kx, ky;
    if (kb && kb.kx !== undefined) { kx = kb.kx; ky = kb.ky; }
    else {
      const ox = kb && kb.ox !== undefined ? kb.ox : this.player.x, oy = kb && kb.oy !== undefined ? kb.oy : this.player.y;
      const a = Math.atan2(e.y - oy, e.x - ox); kx = Math.cos(a); ky = Math.sin(a);
    }
    const f = (kb && kb.force) || 140;
    if (this.time.now < (e.frozenUntil || 0)) {           // đang bất động: không bị đẩy lùi
      this.time.delayedCall(75, () => { if (e.active && e.timeTint) e.setTint(0x9fd8b8); });
      if (e.hp <= 0) this.killEnemy(e);
      return;
    }
    e.setVelocity(kx * f, ky * f);
    e.stunUntil = this.time.now + 200;
    e.aggro = true;
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dying = true;
    e.body.enable = false;
    this.tweens.killTweensOf(e);
    e.setScale(1);
    this.s.kills++;
    this.addLight(e.x, e.y - 6, 60, e.kind.tint[0], 400);
    if (this.C.lifesteal) {                               // Quỷ Tu - Hấp Hồn: một hồn ma bay về hồi khí huyết
      const soul = this.add.image(e.x, e.y - 8, 'wisp').setBlendMode(Phaser.BlendModes.ADD).setDepth(5200);
      const p = this.player;
      this.tweens.add({
        targets: soul, x: { getEnd: () => p.x }, y: { getEnd: () => p.y - this.pH * 0.5 }, duration: 420, ease: 'Quad.in',
        onComplete: () => { soul.destroy(); this.heal(this.st.maxHp * this.C.lifesteal); }
      });
    }
    TT.FX.burst(this, e.x, e.y - 6, e.kind.tint.concat([0xffffff]), 20, 90);
    const n = Phaser.Math.Between(e.kind.orbs[0], e.kind.orbs[1]);
    for (let i = 0; i < n; i++) this.spawnOrb(e.x, e.y - 6, e.orbVal);
    this.tweens.add({
      targets: e, scaleX: 1.6, scaleY: 0.2, alpha: 0, duration: 220,
      onComplete: () => { e.shadow.destroy(); e.destroy(); }
    });
  }

  spawnOrb(x, y, val) {
    const o = this.add.image(x, y, 'orb').setDepth(y);
    o.val = val; o.born = this.time.now;
    o.vx = Phaser.Math.FloatBetween(-70, 70); o.vy = Phaser.Math.FloatBetween(-70, 70);
    this.tweens.add({ targets: o, scale: { from: 0.3, to: 1 }, duration: 200 });
    this.orbs.push(o);
  }

  updateOrbs(time, d) {
    const p = this.player;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.vx *= 0.9; o.vy *= 0.9;
      const dx = p.x - o.x, dy = (p.y - this.pH * 0.5) - o.y, dist = Math.hypot(dx, dy) || 1;
      if (time - o.born > 350 && dist < 70) {
        const sp = 120 + (70 - dist) * 4;
        o.vx = dx / dist * sp; o.vy = dy / dist * sp;
      }
      o.x += o.vx * d; o.y += o.vy * d;
      o.setDepth(o.y + 4);
      if (dist < 8) {
        this.addCult(o.val);
        TT.SFX.pickup();
        TT.FX.text(this, p.x, p.y - this.pH - 6, '+' + o.val, '#8fe3ff', 11);
        o.destroy(); this.orbs.splice(i, 1);
      } else if (time - o.born > 40000) {
        o.destroy(); this.orbs.splice(i, 1);
      }
    }
  }

  // ================= YÊU THÚ =================
  spawnEnemy() {
    if (this.trib) return;
    const s = this.s, D = TT.DATA;
    if (this.enemies.countActive(true) >= 4 + s.realm * 2) return;
    const kinds = D.enemies.filter(k => k.minRealm <= s.realm);
    const kind = Math.random() < 0.6 ? kinds[kinds.length - 1] : kinds[(Math.random() * kinds.length) | 0];
    let x, y, ok = false;
    for (let i = 0; i < 30 && !ok; i++) {
      x = 40 + Math.random() * (this.worldW - 80);
      y = 50 + Math.random() * (this.worldH - 90);
      ok = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 200 &&
        Phaser.Math.Distance.Between(x, y, this.spring.x, this.spring.y) > 160 &&
        !this.solids.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 8);
    }
    if (!ok) return;
    const mul = 1 + 0.7 * (s.realm - kind.minRealm);
    const e = this.enemies.create(x, y, kind.id).setOrigin(0.5, 14 / 16);
    e.body.setSize(12, 7).setOffset(4, 8);
    e.setCollideWorldBounds(true);
    e.kind = kind;
    e.maxHp = e.hp = Math.round(kind.hp * mul);
    e.dmg = Math.round(kind.dmg * mul);
    e.speed = kind.speed;
    e.orbVal = Math.round(kind.orbVal * mul);
    e.stunUntil = 0; e.wanderT = 0; e.aggro = false; e.dying = false;
    e.play(kind.id + '_bob');
    e.shadow = this.add.image(x, y, 'shadow').setAlpha(0.3).setDepth(-900);
    e.setAlpha(0);
    this.tweens.add({ targets: e, alpha: 1, duration: 400 });
  }

  updateEnemies(time) {
    const p = this.player, sp = this.spring, D = TT.DATA;
    const playerSafe = Phaser.Math.Distance.Between(p.x, p.y, sp.x, sp.y) < D.safeRadius;
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      e.setDepth(e.y);
      e.shadow.setPosition(e.x, e.y);
      // làm chậm (Băng Phong Trận): phủ màu băng, giảm 60% tốc độ
      const slowed = time < (e.slowUntil || 0);
      if (slowed && !e.isTinted && !e.dying) { e.setTint(0x9fe8ff); e.frostTint = true; }
      else if (!slowed && e.frostTint) { e.clearTint(); e.frostTint = false; }
      // bất động (Thanh Nhiên Kiếm Quyết - thời gian ngưng đọng): đứng im, dừng hoạt ảnh
      const frozen = time < (e.frozenUntil || 0);
      if (frozen && !e.dying) {
        e.setVelocity(0);
        if (e.anims && e.anims.isPlaying) e.anims.pause();
        if (!e.timeTint) { e.setTint(0x9fd8b8); e.timeTint = true; }
        return;
      } else if (e.timeTint) {
        e.timeTint = false; e.clearTint();
        if (e.anims && e.anims.isPaused) e.anims.resume();
      }
      if (e.dying || time < e.stunUntil) return;
      const spd = e.speed * (slowed ? 0.4 : 1);
      const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
      const sx = e.x - sp.x, sy = e.y - sp.y, ds = Math.hypot(sx, sy) || 1;
      if (ds < D.safeRadius + 10) {                       // bị trận pháp đẩy ra
        e.setVelocity(sx / ds * spd, sy / ds * spd);
        return;
      }
      if (!playerSafe && (dist < 130 || (e.aggro && dist < 260))) {
        e.setVelocity(dx / dist * spd, dy / dist * spd);
        e.setFlipX(dx < 0);
      } else if (time > e.wanderT) {
        e.wanderT = time + 800 + Math.random() * 1600;
        if (Math.random() < 0.4) e.setVelocity(0);
        else {
          const a = Math.random() * Math.PI * 2;
          e.setVelocity(Math.cos(a) * spd * 0.4, Math.sin(a) * spd * 0.4);
          e.setFlipX(Math.cos(a) < 0);
        }
      }
    });
  }

  onTouchEnemy(e) {
    if (e.dying || this.trib || this.dead || this.flying) return;   // bay trên cao: yêu thú không chạm tới
    if (this.time.now < (e.frozenUntil || 0)) return;              // yêu thú đang bất động
    const t = this.time.now;
    if (t < this.invulnUntil) return;
    this.invulnUntil = t + 800;
    const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    this.player.setVelocity(Math.cos(a) * 170, Math.sin(a) * 170);
    this.knockUntil = t + 150;
    this.lockUntil = Math.max(this.lockUntil, t + 150);
    this.hurtPlayer(e.dmg);
  }

  hurtPlayer(dmg) {
    const p = this.player;
    if (this.buff && this.time.now < this.buff.until) {       // Kim Chung Tráo giảm sát thương
      dmg *= 1 - this.buff.dr;
      TT.FX.ring(this, p.x, p.y - this.pH * 0.5, 0xffd04a, 0.9, 260);
    }
    dmg = Math.round(dmg);
    this.s.hp -= dmg;
    TT.FX.text(this, p.x, p.y - this.pH - 8, '-' + dmg, '#ff6b6b', 14);
    p.setTint(0xff7777);
    this.time.delayedCall(140, () => p.clearTint());
    TT.SFX.hurt();
    this.cameras.main.shake(100, 0.004);
    if (this.useCaster && this.s.hp > 0 && !this.meditating && !this.flying && !this.flyBusy && !/attack|cast|fly/.test(this.animType)) {
      this.playAnim('hurt');
      this.lockUntil = Math.max(this.lockUntil, this.time.now + 250);
    }
    if (this.s.hp <= 0) {
      this.s.hp = 0;
      if (this.trib) this.tribFail(this.trib);
      else this.playerDown();
    }
  }

  playerDown() {
    const p = this.player, s = this.s;
    this.dead = true;
    if (this.flying || this.flyBusy || this.lift) this.land(this.time.now, true);
    p.setVelocity(0); this.playAnim('dead'); p.setTint(0x999999);
    s.cult *= 0.8;
    TT.SFX.fail();
    TT.HUD.banner('TRỌNG THƯƠNG', 'Tu vi tổn hao 20%, được đưa về linh tuyền', '#ff8a8a');
    this.cameras.main.fadeOut(900);
    this.time.delayedCall(1300, () => {
      p.clearTint();
      this.tweens.killTweensOf(p);
      p.setAngle(0).setAlpha(1).setScale(TT.rigScale(TT.Caster));
      this.animType = null;
      this.playAnim('idle', true);
      p.setPosition(this.spring.x, this.spring.y + 50);
      s.hp = Math.round(this.st.maxHp * 0.5);
      this.dead = false;
      this.invulnUntil = this.time.now + 1500;
      this.cameras.main.fadeIn(600);
      TT.Save.save(s);
    });
  }

  // đổi trang phục / binh khí theo cảnh giới hiện tại (nạp bộ mới nếu cần)
  refreshOutfit() {
    const key = TT.casterKey(this.cls, this.gender, this.s.realm);
    if (key === this.ckey) return;
    TT.loadCasters(this, [key], () => {
      if (!TT.Casters[key] || !this.player || !this.scene.isActive()) return;
      this.ckey = key;
      this.cp = 'c_' + key + '_';
      TT.Caster = TT.Casters[key];
      this.animType = null;
      this.playAnim('idle', true);
      TT.HUD.log('Khoác lên pháp y và binh khí cảnh giới ' + TT.DATA.realms[this.s.realm].name + '.', 'gold');
    });
  }

  // ================= ĐỔI MÔN PHÁI =================
  // Chuyển sang hệ kế tiếp, giữ nguyên cảnh giới / tu vi / số yêu thú đã diệt.
  switchClass(target) {
    if (this.switching) return;
    if (this.trib) { TT.HUD.log('Đang độ kiếp, không thể đổi môn phái!', 'warn'); return; }
    if (this.dead) return;
    const ids = Object.keys(TT.DATA.classes);
    const next = target && TT.DATA.classes[target] ? target : ids[(ids.indexOf(this.cls) + 1) % ids.length];
    if (next === this.cls) return;
    this.switching = true;
    const s = this.s, C2 = TT.DATA.classes[next];
    // giữ tỉ lệ khí huyết / linh lực hiện tại khi sang hệ mới
    const hpR = s.hp / this.st.maxHp, mpR = s.mp / this.st.maxMp;
    s.cls = next;
    const R = TT.DATA.realms[s.realm], m = 1 + 0.2 * s.stage;
    s.hp = Math.max(1, Math.round(R.hp * m * C2.hpMul * hpR));
    s.mp = Math.round(R.mp * m * C2.mpMul * mpR);
    TT.Save.save(s);
    const p = this.player;
    TT.FX.ring(this, p.x, p.y - this.pH * 0.5, Phaser.Display.Color.HexStringToColor(C2.color).color, 2.5, 500);
    TT.FX.flash(this, 0.35, 450, 0xffffff);
    TT.SFX.learn();
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ cls: next, gender: this.gender, switched: true, x: p.x, y: p.y });
    });
  }

  // ================= ĐỘ KIẾP =================
  tryTribulation() {
    if (this.trib || this.dead) return;
    if (this.flying || this.flyBusy) { TT.HUD.log('Hạ xuống đất (F) rồi mới độ kiếp.', 'warn'); return; }
    const R = TT.DATA.realms[this.s.realm];
    if (!this.isBottleneck()) { TT.HUD.log('Tu vi chưa viên mãn, chưa thể độ kiếp.'); return; }
    if (!R.strikes) { TT.HUD.log('Đã tới đỉnh của bản demo.', 'gold'); return; }
    if (this.s.hp < this.st.maxHp * 0.5) { TT.HUD.log('Khí huyết suy yếu, hãy thiền hồi phục trước khi độ kiếp!', 'warn'); return; }
    this.startTribulation(R);
  }

  startTribulation(R) {
    const t = this.trib = { wave: 0, total: R.strikes, done: false, final: false, clouds: [] };
    // yêu thú bỏ chạy
    this.enemies.getChildren().slice().forEach(e => {
      e.dying = true; e.body.enable = false;
      this.tweens.add({ targets: e, alpha: 0, duration: 500, onComplete: () => { e.shadow.destroy(); e.destroy(); } });
    });
    this.tweens.killTweensOf(this);
    this.tweens.add({ targets: this, tribDark: 1, duration: 1500 });
    this.time.delayedCall(900, () => { if (!t.done) this.rain.emitting = true; });
    for (let i = 0; i < 7; i++) {
      const c = this.add.image(this.view.x + i * 78 - 10 + Math.random() * 20, this.view.y + 8 + Math.random() * 26, 'cloud')
        .setScrollFactor(0).setDepth(5100).setAlpha(0);
      this.tweens.add({ targets: c, alpha: 0.95, duration: 1200, delay: i * 80 });
      this.tweens.add({ targets: c, x: c.x + 30, duration: 5000 + Math.random() * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      t.clouds.push(c);
    }
    TT.SFX.rumble();
    this.cameras.main.shake(1200, 0.003);
    TT.HUD.banner('THIÊN KIẾP GIÁNG LÂM', R.strikes + ' đạo thiên lôi, sống sót để đột phá', '#c9a7ff');
    TT.HUD.log('Né vòng đỏ. Đạo cuối không thể né: giữ SPACE để vận công hộ thể!', 'warn');
    this.time.delayedCall(2200, () => this.tribWave(t));
  }

  tribWave(t) {
    if (t.done) return;
    t.wave++;
    const last = t.wave === t.total, p = this.player;
    t.final = last;
    const tel = last ? 1800 : Math.max(520, 1000 - t.wave * 50);
    const pts = [];
    if (last) {
      pts.push({ x: p.x, y: p.y, r: 26, follow: true });
      TT.HUD.banner('ĐẠO LÔI CUỐI', 'Giữ SPACE: vận công hộ thể!', '#ff9ad5');
    } else {
      const n = 1 + Math.floor(t.wave / 3) + Math.min(this.s.realm, 2);
      pts.push({ x: p.x + p.body.velocity.x * 0.35, y: p.y + p.body.velocity.y * 0.35, r: 16 });
      for (let i = 1; i < n; i++) pts.push({ x: p.x + Phaser.Math.Between(-80, 80), y: p.y + Phaser.Math.Between(-55, 55), r: 16 });
    }
    pts.forEach(pt => {
      const w = TT.FX.warn(this, pt.x, pt.y, pt.r, tel);
      let ev = null;
      if (pt.follow) {
        const start = this.time.now;
        ev = this.time.addEvent({
          delay: 16, loop: true, callback: () => {
            if (this.time.now - start > tel * 0.7) return;   // khóa mục tiêu ở 30% cuối
            pt.x = p.x; pt.y = p.y; w.setPos(pt.x, pt.y);
            if (pt.fx) pt.fx.setPos(pt.x, pt.y);
          }
        });
        // ấn chú thiên lôi của beanfx: đòn đánh rơi ở giây 1.4 => bắt đầu sớm hơn để trùng lúc sét giáng
        const sig = TT.FX.bfx.sigil_thunder;
        if (sig && sig.hits && sig.hits.length) {
          const lead = Math.min(tel, sig.hits[0].t * 1000);
          this.time.delayedCall(tel - lead, () => {
            if (!t.done) pt.fx = TT.FX.beanfx(this, 'sigil_thunder', pt.x, pt.y, { depth: 6000 });
          });
        }
      }
      this.time.delayedCall(tel, () => {
        if (ev) ev.remove();
        if (!t.done) this.tribStrike(pt, last);
      });
    });
    this.time.delayedCall(tel + (last ? 900 : 450), () => {
      if (t.done) return;
      if (last) this.tribSuccess(t); else this.tribWave(t);
    });
  }

  tribStrike(pt, last) {
    TT.FX.lightning(this, pt.x, pt.y, { scale: last ? 1.5 : 1, big: last, noSprite: !!pt.fx });
    const p = this.player;
    if (Phaser.Math.Distance.Between(p.x, p.y, pt.x, pt.y) <= pt.r + 3) {
      let dmg = this.st.maxHp * (last ? 0.6 : 0.2);
      if (last && this.meditating) {
        dmg *= 0.4;
        TT.FX.text(this, p.x, p.y - this.pH - 18, 'HỘ THỂ!', '#8fe3ff', 16);
        TT.FX.ring(this, p.x, p.y - this.pH * 0.5, 0x7fe3ff, 1.4, 500);
      }
      this.hurtPlayer(dmg);
    }
  }

  tribEnd(t) {
    t.done = true;
    this.trib = null;
    this.tweens.killTweensOf(this);
    this.tweens.add({ targets: this, tribDark: 0, duration: 1200 });
    this.rain.emitting = false;
    t.clouds.forEach(c => {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, alpha: 0, duration: 1000, onComplete: () => c.destroy() });
    });
  }

  tribSuccess(t) {
    this.tribEnd(t);
    const s = this.s, p = this.player;
    s.realm++; s.stage = 0; s.cult = 0;
    this.computeStats();
    s.hp = this.st.maxHp; s.mp = this.st.maxMp;
    const R = TT.DATA.realms[s.realm];
    const bp = TT.FX.bfx.dot_pha_hoa_than;
    if (bp) {
      // beanfx "đột phá hóa thần": nhân vật hóa kim thân, tụ linh khí, xé trời mà lên
      TT.Skills.hidePlayer(this, this.time.now, bp.duration);
      TT.FX.beanfx(this, 'dot_pha_hoa_than', p.x, p.y, {
        at: { burst: () => { TT.FX.flash(this, 0.6, 700, 0xffe08a); this.addLight(p.x, p.y - 20, 280, 0xffe08a, 1600); this.cameras.main.shake(300, 0.006); } }
      });
    } else {
      TT.FX.breakthrough(this, p.x, p.y);
    }
    TT.SFX.levelup();
    TT.HUD.banner('ĐỘT PHÁ THÀNH CÔNG', R.name + ' · ' + TT.DATA.stages[0], R.color);
    TT.HUD.log('Bước vào cảnh giới ' + R.name + '! Khí huyết, linh lực, công lực tăng mạnh.', 'gold');
    const ni = s.realm;
    if (ni < this.skillIds.length) {
      const sk = TT.DATA.skills[this.skillIds[ni]];
      this.time.delayedCall(2900, () => {
        TT.HUD.banner('LĨNH NGỘ CÔNG PHÁP', sk.name + '  [phím ' + TT.DATA.skillKeys[ni] + ']', sk.color);
        TT.HUD.log('Lĩnh ngộ ' + sk.name + ': ' + sk.desc, 'gold');
        TT.HUD.flashUnlock(ni);
        TT.SFX.learn();
      });
    }
    this.refreshOutfit();
    TT.Save.save(s);
  }

  tribFail(t) {
    this.tribEnd(t);
    const s = this.s, R = TT.DATA.realms[s.realm];
    s.cult = Math.floor(R.need[2] * 0.6);
    s.hp = Math.max(1, Math.round(this.st.maxHp * 0.3));
    this.invulnUntil = this.time.now + 1500;
    TT.SFX.fail();
    TT.HUD.banner('ĐỘ KIẾP THẤT BẠI', 'Tu vi tổn hại, hãy tu luyện lại rồi thử lần nữa', '#ff8a8a');
    TT.Save.save(s);
  }
};
