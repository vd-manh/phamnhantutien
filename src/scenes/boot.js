// Sinh texture tạm, rồi (nếu chạy qua web server) nạp:
//  - nhân vật beanfx 8 hướng theo rig.json (TT.DATA.caster)
//  - hiệu ứng beanfx khai báo trong assets/fx/manifest.json
window.TT = window.TT || {};

TT.BootScene = class extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    TT.Textures.generate(this);
    this.load.on('loaderror', f => console.warn('[asset] không tải được', f && f.src));
    if (location.protocol !== 'file:') {
      this.load.json('bfx_manifest', 'assets/fx/manifest.json');
    }
  }

  create() {
    TT.Textures.anims(this);
    const man = this.cache.json.get('bfx_manifest');
    const effects = man && man.effects ? Object.entries(man.effects) : [];
    let queued = 0;

    // --- hiệu ứng ---
    const base = 'assets/fx/';
    effects.forEach(([name, e]) => {
      const key = 'bfx_' + name;
      if (e.sheet) {            // đã đóng gói bằng tools/pack_beanfx.py: lưới + JSON gọn
        this.load.spritesheet(key, base + e.sheet, { frameWidth: e.w, frameHeight: e.h });
        this.load.json(key + '_meta', base + e.json);
      } else if (e.color) {     // định dạng xuất chuẩn của beanfx: _color.png + _light.png + .json
        this.load.atlas(key, base + e.color, base + e.json);
        if (e.light) this.load.atlas(key + '_light', base + e.light, base + e.json);
        this.load.json(key + '_meta', base + e.json);
      } else {                  // sprite sheet Aseprite đơn giản
        this.load.aseprite(key, base + e.png, base + e.json);
      }
      queued++;
    });

    if (!queued) return this.toSelect();
    this.load.once('complete', () => {
      effects.forEach(([name, e]) => this.buildEffect(name, e));
      this.toSelect();
    });
    this.load.start();
  }

  // nhân vật Luyện Khí của cả 5 tông môn x 2 giới tính cho màn hình chọn
  toSelect() {
    const keys = [];
    for (const cls of Object.keys(TT.DATA.classes)) for (const g of ['m', 'f']) keys.push(TT.casterKey(cls, g, 0));
    TT.loadCasters(this, keys, () => this.scene.start('Select'), { dirs: ['south'] });
  }

  buildCaster(cls, rig) {
    let ok = true;
    for (const [name, a] of Object.entries(rig.anims)) {
      for (const dir of rig.directions) {
        const key = 'c_' + cls + '_' + name + '_' + dir;
        if (!this.textures.exists(key)) { ok = false; continue; }
        const frames = [];
        for (let i = 0; i < a.frames; i++) frames.push({ key, frame: i, duration: a.ms ? a.ms[i] : 0 });
        this.anims.create({ key, frames, frameRate: a.fps, repeat: a.loop ? -1 : 0 });
      }
    }
    if (!ok) { console.warn('[beanfx] thiếu một số sheet nhân vật, dùng nhân vật tạm'); return; }
    TT.Casters = TT.Casters || {};
    TT.Casters[cls] = rig;
    console.log('[beanfx] đã nạp nhân vật', rig.name);
  }

  buildEffect(name, e) {
    const key = 'bfx_' + name;
    if (!this.textures.exists(key)) return;
    const meta = this.cache.json.get(key + '_meta');
    if (meta && meta.tt) {
      // mốc thời gian quy về giây thực tế (đã chia tốc độ phát)
      const sp = meta.speed || 1;
      const frames = [];
      for (let i = 0; i < meta.frames; i++) frames.push({ key, frame: i });
      this.anims.create({ key: key + '_play', frames, frameRate: meta.fps * sp, repeat: meta.loop ? -1 : 0 });
      const states = {};
      for (const [k, v] of Object.entries(meta.states || {})) states[k] = [v[0] / sp, v[1] / sp];
      TT.FX.bfx[name] = {
        tex: key, anim: key + '_play', tt: true, size: [meta.w, meta.h], pivot: meta.pivot, target: meta.target,
        anchor: [meta.pivot[0] / meta.w, meta.pivot[1] / meta.h], scale: TT.DATA.casterScale,
        loop: meta.loop, states, hits: (meta.hits || []).map(t => ({ t: t / sp })),
        duration: (meta.duration || meta.frames / meta.fps) / sp, fps: meta.fps * sp, frames: meta.frames
      };
      console.log('[beanfx] đã nạp hiệu ứng', name, '(' + meta.frames + ' frame)');
      return;
    }
    const frameNames = meta ? meta.frames.map(f => f.filename) : this.textures.get(key).getFrameNames();
    const fps = (meta && meta.meta.beanfx && meta.meta.beanfx.fps) || e.fps || 16;
    this.anims.create({ key: key + '_play', frames: frameNames.map(f => ({ key, frame: f })), frameRate: fps, repeat: 0 });
    const info = { tex: key, anim: key + '_play', anchor: e.anchor || [0.5, 0.5], scale: e.scale || 1 };
    if (meta && meta.meta.beanfx) {
      const b = meta.meta.beanfx;
      info.pivot = b.pivot; info.size = b.frameSize; info.hits = (b.act && b.act.hits) || [];
      info.anchor = [b.pivot[0] / b.frameSize[0], b.pivot[1] / b.frameSize[1]];
      info.scale = e.scale || TT.DATA.casterScale;
      info.lightGain = b.light_gain || 1;
      if (this.textures.exists(key + '_light')) {
        this.anims.create({ key: key + '_light_play', frames: frameNames.map(f => ({ key: key + '_light', frame: f })), frameRate: fps, repeat: 0 });
        info.light = key + '_light';
      }
    }
    TT.FX.bfx[name] = info;
    console.log('[beanfx] đã nạp hiệu ứng', name, '(' + frameNames.length + ' frame)');
  }
};
