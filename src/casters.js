// Nạp nhân vật theo yêu cầu: mỗi bộ = tông môn x giới tính x cảnh giới (assets/casters/chibi/<key>/).
// Chỉ nạp bộ đang cần (khoảng 64 sheet nhỏ), không nạp cả 60 bộ cùng lúc.
window.TT = window.TT || {};
TT.Casters = TT.Casters || {};          // bộ đầy đủ (8 hướng, mọi động tác)
TT.CasterRigs = TT.CasterRigs || {};    // rig đã đọc (kể cả khi mới nạp một phần cho màn hình chọn)

// Kiếm / Pháp / Quỷ Tu dùng bộ hero vẽ tay (tools/hero_sects.py): một tạo hình chung cho nam & nữ, đổi màu theo cảnh giới
TT.HERO_SECTS = { kiem: 1, phap: 1, quy: 1 };
// bộ nhân vật vẽ sẵn (ảnh AI, tools/ai_sheet.py) thay cho cả tông môn, mọi cảnh giới & giới tính
TT.CUSTOM_CASTERS = { kiem: 'kiem_ai', nho: 'dao_ai', doc: 'doc_ai' };   // bộ vẽ AI (tools/ai_sheet.py) cho mọi cảnh giới, giới tính
TT.casterKey = (cls, gender, realm) => {
  if (TT.CUSTOM_CASTERS[cls]) return TT.CUSTOM_CASTERS[cls];
  const r = Math.max(0, Math.min(5, realm | 0));
  return TT.HERO_SECTS[cls] ? cls + '_h' + r : cls + '_' + (gender === 'f' ? 'f' : 'm') + r;
};
// tỉ lệ hiển thị của một rig (bộ chibi cũ dùng casterScale chung)
TT.rigScale = rig => (rig && rig.scale) || TT.DATA.casterScale;
TT.casterBase = key => 'assets/casters/chibi/' + key + '/';

// keys: danh sách key cần có; done() gọi khi xong (kể cả khi lỗi / chạy từ file://)
// opts.dirs: chỉ nạp các hướng này (vd ['south'] cho màn hình chọn) -> không đánh dấu là bộ đầy đủ
TT.loadCasters = function (scene, keys, done, opts) {
  opts = opts || {};
  const need = [...new Set(keys)].filter(k => !TT.Casters[k]);
  if (!need.length || location.protocol === 'file:') { done(); return; }
  const L = scene.load;
  need.forEach(k => L.json('rig_' + k, TT.casterBase(k) + 'rig.json'));
  if (!TT.Weapons && !scene.cache.json.exists('tt_weapons')) L.json('tt_weapons', TT.WEAPON_BASE + 'weapons.json');
  L.once('complete', () => {
    if (!TT.Weapons) {
      const wj = scene.cache.json.get('tt_weapons');
      if (wj && wj.weapons) TT.Weapons = wj.weapons;
    }
    const rigs = {};
    need.forEach(k => {
      const r = scene.cache.json.get('rig_' + k);
      if (r && r.anims) rigs[k] = r;
    });
    let queued = 0;
    for (const [k, r] of Object.entries(rigs)) {
      for (const [name, a] of Object.entries(r.anims)) {
        if (a.alias) continue;                          // động tác mượn sheet khác (bộ hero chưa có)
        for (const d of r.directions) {
          if (opts.dirs && opts.dirs.indexOf(d) < 0) continue;
          const tk = 'c_' + k + '_' + name + '_' + d;
          if (scene.textures.exists(tk)) continue;
          L.spritesheet(tk, TT.casterBase(k) + a.sheets[d], { frameWidth: a.frame[0], frameHeight: a.frame[1] });
          queued++;
          // lớp bàn tay nắm vũ khí (src/weapon_layer.js)
          if (a.hands && a.hands[d] && !scene.textures.exists(tk + '_hand')) {
            L.spritesheet(tk + '_hand', TT.casterBase(k) + a.hands[d], { frameWidth: a.frame[0], frameHeight: a.frame[1] });
            queued++;
          }
        }
      }
      // ảnh vũ khí cầm tay + vật cưỡi khi bay (rig.mount.weapon, có thể là ảnh khác, vd rắn của Độc Tu)
      [r.weapon && r.weapon.default, r.mount && r.mount.weapon].concat(r.mount && r.mount.dirs ? Object.values(r.mount.dirs) : []).forEach(id => {
        const wd = id && TT.Weapons && TT.Weapons[id];
        if (wd && !scene.textures.exists(TT.weaponTex(id))) {
          L.image(TT.weaponTex(id), TT.WEAPON_BASE + wd.img);
          queued++;
        }
      });
    }
    const finish = () => {
      for (const [k, r] of Object.entries(rigs)) {
        let ok = true;
        for (const [name, a] of Object.entries(r.anims)) {
          for (const d of r.directions) {
            const tk = 'c_' + k + '_' + name + '_' + d;
            const src = a.alias ? 'c_' + k + '_' + a.alias + '_' + d : tk;
            if (!scene.textures.exists(src)) { if (!opts.dirs) ok = false; continue; }
            if (scene.anims.exists(tk)) continue;
            const frames = [];
            for (let i = 0; i < a.frames; i++) frames.push({ key: src, frame: i, duration: a.ms ? a.ms[i] : 0 });
            scene.anims.create({ key: tk, frames, frameRate: a.fps, repeat: a.loop ? -1 : 0 });
          }
        }
        TT.CasterRigs[k] = r;
        if (ok && !opts.dirs) TT.Casters[k] = r;
        else if (!ok) console.warn('[nhân vật] thiếu sheet của', k);
      }
      done();
    };
    if (!queued) { finish(); return; }
    L.once('complete', finish);
    L.start();
  });
  L.start();
};
