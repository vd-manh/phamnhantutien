// Màn hình chọn hệ tu luyện (Kiếm Tu / Pháp Tu). Nhân vật vẽ bằng Phaser, thẻ thông tin là HTML
// đặt chồng đúng lên vùng canvas.
window.TT = window.TT || {};

TT.SelectScene = class extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    const W = this.scale.width, H = this.scale.height, D = TT.DATA;
    this.classes = Object.keys(D.classes);
    this.saved = TT.Save.load();
    this.idx = Math.max(0, this.classes.indexOf(this.saved && this.saved.cls));
    this.gender = (this.saved && this.saved.gender) || 'm';
    this.busy = false;
    document.body.classList.add('selecting');

    this.drawBackdrop(W, H);

    // nhân vật
    this.chars = this.classes.map((cls, i) => {
      const n = this.classes.length, mg = n > 4 ? 0.1 : n > 3 ? 0.13 : 0.18;
      const x = W * (n === 1 ? 0.5 : mg + (1 - 2 * mg) * i / (n - 1)), y = H * 0.43;
      const c = D.classes[cls], col = Phaser.Display.Color.HexStringToColor(c.color).color;
      const glow = this.add.image(x, y - 4, 'light').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2, 1.3).setAlpha(0);
      this.add.image(x, y, 'shadowL').setScale(3, 2.4).setAlpha(0.45);
      const ring = this.add.image(x, y, 'ring').setTint(col).setScale(1.7, 0.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const ck = TT.casterKey(cls, this.gender, 0);
      let spr, rig = TT.CasterRigs[ck];
      if (rig) {
        const a = rig.anims.idle;
        spr = this.add.sprite(x, y, 'c_' + ck + '_idle_south', 0).setOrigin(a.pivot[0] / a.frame[0], a.pivot[1] / a.frame[1]).setScale(4 * TT.rigScale(rig));
        spr.play('c_' + ck + '_idle_south');
      } else {
        spr = this.add.sprite(x, y, 'hero', 0).setOrigin(0.5, 22 / 24).setScale(5).play('hero_idle');
        if (cls === 'phap') spr.setTint(0xd8c8ff);
      }
      const motes = this.add.particles(x, y - 40, 'dot', {
        speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 }, lifespan: 1600, scale: { start: 1.5, end: 0 },
        alpha: { start: 0.9, end: 0 }, tint: [col, 0xffffff], frequency: 90, blendMode: 'ADD',
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 30, 90, 30) }, emitting: false
      });
      return { cls, ck, x, y, spr, ring, glow, motes, rig };
    });
    this.tweens.add({ targets: this.chars.map(c => c.ring), angle: 360, duration: 6000, repeat: -1 });

    this.buildUI();
    this.setIdx(this.idx);
    this.setGender(this.gender);
    this.time.addEvent({ delay: 3200, loop: true, callback: () => this.demo() });
    this.time.delayedCall(500, () => this.demo());

    // phím
    const kb = this.input.keyboard;
    kb.on('keydown', e => {
      TT.SFX.unlock();
      if (this.busy) return;
      const k = e.key;
      const n = this.classes.length;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.setIdx((this.idx + n - 1) % n);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.setIdx((this.idx + 1) % n);
      else if (k === 'g' || k === 'G' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'Tab') {
        if (e.preventDefault) e.preventDefault();
        this.setGender(this.gender === 'm' ? 'f' : 'm');
      }
      else if (k === 'Enter' || k === ' ' || k === 'j' || k === 'J') {
        if (this.saved && this.saved.cls) this.start('continue');
        else this.start(this.saved ? 'keep' : 'new');
      }
    });

    this._onResize = () => this.layoutUI();
    window.addEventListener('resize', this._onResize);
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      window.removeEventListener('resize', this._onResize);
      document.body.classList.remove('selecting');
    });
    this.cameras.main.fadeIn(500);
  }

  drawBackdrop(W, H) {
    const g = this.add.graphics();
    for (let y = 0; y < H; y += 6) {
      const t = y / H;
      g.fillStyle(TT.Lighting.lerpColor(0x070512, 0x2a1c48, t), 1).fillRect(0, y, W, 6);
    }
    // trăng
    this.add.image(W * 0.82, H * 0.2, 'light').setTint(0xfff1c8).setScale(4).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(W * 0.82, H * 0.2, 34, 0xf6efd8);
    this.add.circle(W * 0.82 + 10, H * 0.2 - 6, 30, 0xe9e0c4);
    // sao
    const r = TT.Pixel.rng(77);
    for (let i = 0; i < 90; i++) {
      const s = this.add.rectangle((r() * W) | 0, (r() * H * 0.55) | 0, 2, 2, 0xffffff).setAlpha(0.3 + r() * 0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: 800 + r() * 2000, yoyo: true, repeat: -1, delay: r() * 2000 });
    }
    // núi (2 lớp, cạnh răng cưa pixel)
    const mountain = (base, amp, col, seed, step) => {
      const rr = TT.Pixel.rng(seed), pts = [];
      let h = base;
      for (let x = 0; x <= W + step; x += step) {
        h += (rr() - 0.5) * amp; h = Phaser.Math.Clamp(h, base - amp * 2.5, base + amp);
        pts.push(x, Math.round(h / 4) * 4);
      }
      const m = this.add.graphics().fillStyle(col, 1);
      m.beginPath(); m.moveTo(0, H);
      for (let i = 0; i < pts.length; i += 2) m.lineTo(pts[i], pts[i + 1]);
      m.lineTo(W, H); m.closePath(); m.fillPath();
    };
    mountain(H * 0.55, 40, 0x1a1430, 5, 24);
    mountain(H * 0.68, 30, 0x110d22, 9, 16);
    this.add.rectangle(0, H * 0.78, W, H * 0.22, 0x0b0818).setOrigin(0);
    // linh khí trôi
    this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: W }, y: H, speedY: { min: -30, max: -10 }, speedX: { min: -5, max: 5 },
      lifespan: 9000, frequency: 160, scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: [0x7fe3ff, 0xc9a7ff, 0xffe08a], blendMode: 'ADD'
    });
  }

  // HTML: thẻ thông tin cho từng hệ + nút tiếp tục
  buildUI() {
    const D = TT.DATA, box = document.getElementById('sel-cards'), cont = document.getElementById('sel-continue');
    box.innerHTML = ''; cont.innerHTML = '';
    const gbox = document.getElementById('sel-gender');
    gbox.innerHTML = '';
    this.gButtons = [['m', '♂ Nam'], ['f', '♀ Nữ']].map(([g, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => this.setGender(g));
      gbox.appendChild(b);
      return [g, b];
    });
    const sv = this.saved;
    const statBar = (label, v) => '<div class="stat"><label>' + label + '</label><div class="track"><i style="width:' + Math.round(Math.min(1, v / 1.5) * 100) + '%"></i></div></div>';
    this.cards = this.classes.map((cls, i) => {
      const c = D.classes[cls];
      const d = document.createElement('div');
      d.className = 'card';
      const n = this.classes.length;
      const mg = n > 4 ? 10 : n > 3 ? 13 : 18;
      d.style.left = (n === 1 ? 50 : mg + (100 - 2 * mg) * i / (n - 1)) + '%';
      if (n > 3) { d.style.width = (n > 4 ? 19.2 : 23.5) + '%'; d.style.fontSize = 'calc(var(--u) * ' + (n > 4 ? 11.5 : 13) + ')'; }
      d.style.setProperty('--c', c.color);
      d.innerHTML = '<h3></h3><div class="t"></div><p></p>' + (c.passive ? '<p class="pv"></p>' : '') +
        statBar('Khí huyết', c.hpMul) + statBar('Linh lực', c.mpMul) + statBar('Công lực', c.atkMul) +
        '<div class="sk"></div><button type="button"></button>';
      d.querySelector('h3').textContent = c.name;
      d.querySelector('.t').textContent = c.title;
      d.querySelector('p').textContent = c.desc;
      if (c.passive) d.querySelector('.pv').textContent = c.passive;
      const sk = d.querySelector('.sk');
      c.skills.forEach((id, k) => {
        const s = D.skills[id], span = document.createElement('span');
        span.textContent = s.glyph; span.style.color = s.color;
        span.title = s.name + ' (' + D.realms[k].name + ')';
        sk.appendChild(span);
      });
      const btn = d.querySelector('button');
      btn.textContent = sv && sv.cls ? 'Tu luyện lại từ đầu' : 'Bước vào con đường này';
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        this.setIdx(i);
        if (sv && sv.cls) this.start('new');
        else this.start(sv ? 'keep' : 'new');
      });
      d.addEventListener('click', () => this.setIdx(i));
      box.appendChild(d);
      return d;
    });
    if (sv && sv.cls && D.classes[sv.cls]) {
      const R = D.realms[sv.realm] || D.realms[0];
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '▶ Tiếp tục: ' + D.classes[sv.cls].name + (sv.gender === 'f' ? ' (nữ)' : ' (nam)') + ' · ' + R.name + ' ' + D.stages[sv.stage || 0];
      b.addEventListener('click', () => this.start('continue'));
      cont.appendChild(b);
    }
    this.layoutUI();
  }

  // lớp HTML phủ khít vùng canvas (canvas được co giãn & căn giữa bởi Scale.FIT)
  layoutUI() {
    const el = document.getElementById('select'), cv = this.game.canvas;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    el.style.setProperty('--u', (r.width / 960) + 'px');
  }

  setGender(g) {
    if (this.busy) return;
    this.gender = g;
    (this.gButtons || []).forEach(([gg, b]) => b.classList.toggle('on', gg === g));
    this.chars.forEach(c => {
      const ck = TT.casterKey(c.cls, g, 0), rig = TT.CasterRigs[ck];
      if (!rig) return;
      c.ck = ck; c.rig = rig;
      c.spr.play('c_' + ck + '_idle_south');
    });
    TT.SFX.pickup();
  }

  setIdx(i) {
    if (this.busy) return;
    this.idx = i;
    this.chars.forEach((c, j) => {
      const on = j === i;
      c.spr.setAlpha(on ? 1 : 0.4);
      c.ring.setAlpha(on ? 0.8 : 0);
      c.glow.setAlpha(on ? 0.35 : 0);
      c.motes.emitting = on;
    });
    this.cards.forEach((d, j) => d.classList.toggle('on', j === i));
    TT.SFX.pickup();
  }

  // nhân vật đang chọn múa thử: 3 đòn chém rồi thi pháp
  demo() {
    const c = this.chars[this.idx];
    if (!c || !c.rig || this.busy) return;
    const seq = ['attack1', 'attack2', 'attack3', 'cast'];
    const playNext = k => {
      if (k >= seq.length || this.busy) { c.spr.play('c_' + c.ck + '_idle_south'); return; }
      c.spr.play('c_' + c.ck + '_' + seq[k] + '_south');
      c.spr.once('animationcomplete', () => playNext(k + 1));
      if (seq[k] === 'cast') {
        this.time.delayedCall(280, () => {
          const col = Phaser.Display.Color.HexStringToColor(TT.DATA.classes[c.cls].color).color;
          TT.FX.ring(this, c.x, c.y - 4, col, 2.2, 600);
          TT.FX.burst(this, c.x, c.y - 70, [col, 0xffffff], 20, 120);
        });
      }
    };
    playNext(0);
  }

  // mode: 'continue' = chơi tiếp bản lưu | 'keep' = bản lưu cũ chưa có hệ, giữ tiến độ | 'new' = bắt đầu lại
  start(mode) {
    if (this.busy) return;
    const cls = mode === 'continue' ? this.saved.cls : this.classes[this.idx];
    const gender = mode === 'continue' ? (this.saved.gender || 'm') : this.gender;
    if (mode === 'new' && this.saved && this.saved.cls &&
        !window.confirm('Bắt đầu lại sẽ xóa tiến độ tu luyện hiện tại. Tiếp tục?')) return;
    this.busy = true;
    if (mode === 'new') TT.Save.clear();
    const c = this.chars[this.classes.indexOf(cls)];
    if (c) { TT.FX.ring(this, c.x, c.y - 4, 0xffe08a, 3, 700); TT.FX.flash(this, 0.4, 500, 0xffe08a); }
    TT.SFX.levelup();
    document.body.classList.remove('selecting');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World', { cls, gender, fresh: mode === 'new' }));
  }
};
