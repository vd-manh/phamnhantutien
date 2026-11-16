// Lớp vũ khí tách rời: thân nhân vật (đã xoá kiếm) -> vũ khí -> bàn tay nắm chuôi.
// Dữ liệu do tools/ai_sheet.py ghi vào rig.json:
//   anims[a].weapon[hướng][khung] = [gx, gy, góc°, dài, sau_lưng, (bề ngang)] (toạ độ trong khung) hoặc 0 (khung không có vũ khí)
//   anims[a].hands[hướng]         = sheet bàn tay, cùng cỡ khung với sheet thân
//   rig.weapon = { default: id, nominal: chiều dài chuẩn chuôi->mũi trong khung }
// Ảnh vũ khí: assets/weapons/weapons.json (ảnh nằm ngang, mũi sang phải, grip/tip theo toạ độ ảnh).
window.TT = window.TT || {};

TT.WEAPON_BASE = 'assets/weapons/';
TT.weaponTex = id => 'wpn_' + id;

// texture key 'c_<bộ>_<động tác>_<hướng>' -> { rig, anim, dir }. Hướng không chứa '_' nên tách ở dấu '_' cuối.
TT._wlParse = {};
TT.weaponParse = function (key) {
  if (key in TT._wlParse) return TT._wlParse[key];
  let out = null;
  if (key && key.startsWith('c_')) {
    let best = '';
    for (const k of Object.keys(TT.CasterRigs || {})) if (key.startsWith('c_' + k + '_') && k.length > best.length) best = k;
    if (best) {
      const rest = key.slice(best.length + 3), j = rest.lastIndexOf('_');
      if (j > 0) out = { rig: TT.CasterRigs[best], anim: rest.slice(0, j), dir: rest.slice(j + 1) };
    }
  }
  return (TT._wlParse[key] = out);
};

class WeaponLayer {
  // spr: sprite nhân vật; weaponId: vũ khí đang cầm (bỏ trống = vũ khí mặc định của rig)
  constructor(scene, spr, weaponId) {
    this.scene = scene;
    this.spr = spr;
    this.weaponId = weaponId || null;
    this.blade = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.hand = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this._sync = () => this.sync();
    scene.events.on('postupdate', this._sync);
    spr.once('destroy', () => this.destroy());
    this.sync();
  }

  setWeapon(id) { this.weaponId = id || null; this.sync(); }

  destroy() {
    if (!this.scene) return;
    this.scene.events.off('postupdate', this._sync);
    this.blade.destroy();
    this.hand.destroy();
    this.scene = null;
  }

  sync() {
    const p = this.spr, b = this.blade, h = this.hand;
    if (!this.scene || !p.active) return;
    const info = TT.weaponParse(p.texture.key);
    const a = info && info.rig.anims[info.anim];
    const fi = +p.frame.name || 0;
    const wd = a && a.weapon && a.weapon[info.dir];
    const w = wd && wd[fi];
    const tex = this.scene.textures;
    const fw = p.frame.realWidth, fh = p.frame.realHeight;
    // điểm trong khung -> toạ độ thế giới (sprite nhân vật không lật, không xoay)
    const ox = p.x - p.originX * fw * p.scaleX, oy = p.y - p.originY * fh * p.scaleY;
    const common = o => o.setScrollFactor(p.scrollFactorX, p.scrollFactorY).setAlpha(p.alpha);
    const tint = o => (p.isTinted ? o.setTint(p.tintTopLeft) : o.clearTint());

    // vũ khí
    const wid = this.weaponId || (info && info.rig.weapon && info.rig.weapon.default);
    const def = wid && TT.Weapons && TT.Weapons[wid];
    if (p.visible && w && def && tex.exists(TT.weaponTex(wid))) {
      const [gx, gy, ang, len, behind] = w;
      const [x0, y0] = def.grip, [x1, y1] = def.tip;
      // phần tử thứ 6 (nếu có): bề ngang riêng của khung (kiếm bay to hơn kiếm cầm tay)
      const L = Math.hypot(x1 - x0, y1 - y0), nom = w[5] || info.rig.weapon.nominal || len;
      if (b.texture.key !== TT.weaponTex(wid)) b.setTexture(TT.weaponTex(wid));
      b.setOrigin(x0 / b.width, y0 / b.height)
        .setPosition(ox + gx * p.scaleX, oy + gy * p.scaleY)
        .setScale(len / L * p.scaleX, nom / L * p.scaleY)
        .setRotation(ang * Math.PI / 180)
        .setDepth(p.depth + (behind ? -0.002 : 0.001))
        .setVisible(true);
      common(b); tint(b);
    } else b.setVisible(false);

    // bàn tay nắm chuôi (vẽ đè lên vũ khí)
    const hk = p.texture.key + '_hand';
    if (p.visible && b.visible && a && a.hands && a.hands[info.dir] && tex.exists(hk)) {
      if (h.texture.key !== hk) h.setTexture(hk, fi); else h.setFrame(fi);
      h.setOrigin(p.originX, p.originY).setPosition(p.x, p.y).setScale(p.scaleX, p.scaleY)
        .setDepth(p.depth + 0.002).setVisible(true);
      common(h); tint(h);
    } else h.setVisible(false);
  }
}
TT.WeaponLayer = WeaponLayer;

// gắn lớp vũ khí nếu bộ nhân vật có dữ liệu vũ khí; trả về layer hoặc null
TT.attachWeapon = function (scene, spr, rig, weaponId) {
  if (!rig || !rig.weapon) return null;
  return new WeaponLayer(scene, spr, weaponId);
};
