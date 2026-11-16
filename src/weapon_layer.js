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
    this.mount = scene.add.image(0, 0, '__DEFAULT').setVisible(false);   // vật cưỡi khi bay (rig.mount)
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
    this.mount.destroy();
    this.scene = null;
  }

  sync() {
    const p = this.spr, b = this.blade, h = this.hand;
    if (!this.scene || !p.active) return;
    if (p.rotation) { b.setVisible(false); h.setVisible(false); this.mount.setVisible(false); return; }   // nhân vật đang ngã (xoay): ẩn vũ khí
    const info = TT.weaponParse(p.texture.key);
    const a = info && info.rig.anims[info.anim];
    const fi = +p.frame.name || 0;
    const wd = a && a.weapon && a.weapon[info.dir];
    // vật cưỡi (rig.mount): bộ không vẽ riêng động tác bay, bay = tư thế đứng + vũ khí phóng to nằm dưới chân
    const mt = info && info.rig.mount, flyAnim = !!(info && /^fly/.test(info.anim));
    this.syncMount(p, info, mt && flyAnim ? mt : null);
    const w = mt && flyAnim ? 0 : (wd && wd[fi]);             // đang cưỡi thì vũ khí trên tay đã hoá thành vật cưỡi: ẩn
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
// vật cưỡi: ảnh vũ khí (nằm ngang, mũi sang phải) đặt phẳng dưới chân, mũi chỉ theo hướng bay (scene.facing),
// trục dọc thu ngắn 1/2 theo phối cảnh nhìn từ trên; lớn dần theo độ cao (scene.lift) khi cất cánh / hạ cánh
// hướng trái lấy ảnh hướng phải tương ứng rồi lật ngang
const MOUNT_MIRROR = { west: 'east', 'south-west': 'south-east', 'north-west': 'north-east' };
WeaponLayer.prototype.syncMount = function (p, info, mt) {
  const m = this.mount, sc = this.scene;
  if (mt && mt.dirs) {
    // vật cưỡi vẽ sẵn từng hướng (vd độc xà của Độc Tu): chọn ảnh theo hướng nhân vật, không xoay;
    // điểm "stand" (weapons.json) của ảnh đặt ngay giữa hai bàn chân
    const dir = (info && info.dir) || 'south', base = MOUNT_MIRROR[dir] || dir, flip = !!MOUNT_MIRROR[dir];
    const id = mt.dirs[base], def = id && TT.Weapons && TT.Weapons[id];
    if (!def || !p.visible || !sc.textures.exists(TT.weaponTex(id))) { m.setVisible(false); return; }
    if (m.texture.key !== TT.weaponTex(id)) m.setTexture(TT.weaponTex(id));
    const lift = sc.lift || 0, grow = Math.min(1, 0.25 + 0.75 * lift / (mt.lift || 9));
    const fx = (mt.foot && mt.foot[dir]) || 0, k = (mt.scale || 0.6) * grow;
    const ox = def.stand[0] / m.width, oy = def.stand[1] / m.height;
    m.setOrigin(flip ? 1 - ox : ox, oy).setFlipX(flip).setFlipY(false).setRotation(0)
      .setPosition(p.x + fx * p.scaleX, p.y - lift + 1).setScale(k * p.scaleX, k * p.scaleY)
      .setDepth(p.depth - 0.003).setScrollFactor(p.scrollFactorX, p.scrollFactorY).setAlpha(p.alpha).setVisible(true);
    return;
  }
  const def = mt && TT.Weapons && TT.Weapons[mt.weapon];
  if (!mt || !def || !p.visible || !sc.textures.exists(TT.weaponTex(mt.weapon))) { m.setVisible(false); return; }
  if (m.texture.key !== TT.weaponTex(mt.weapon)) m.setTexture(TT.weaponTex(mt.weapon));
  const f = sc.facing || { x: 1, y: 0 }, vx = f.x, vy = f.y * 0.6, vl = Math.hypot(vx, vy) || 1;    // 0.6: thu ngắn phối cảnh khi bay dọc
  const lift = sc.lift || 0, grow = Math.min(1, 0.25 + 0.75 * lift / (mt.lift || 9));
  // bay dọc (lên / xuống) thì bút nhìn từ đầu: dày hơn để đỡ trọn cả hai bàn chân
  const len = (mt.len || 64) * vl * grow, thick = (mt.thick || 11) * grow * (1 + (mt.vthick !== undefined ? mt.vthick - 1 : 0.45) * Math.abs(f.y));
  const fx = (mt.foot && info && mt.foot[info.dir]) || 0;      // tâm hai bàn chân lệch khỏi điểm neo (px khung)
  const left = vx < 0;
  m.setOrigin(0.5, 0.5).setPosition(p.x + fx * p.scaleX, p.y - lift + 1)
    .setRotation(Math.atan2(vy, vx)).setFlipY(left)                 // bay sang trái: lật dọc để mặt trên vẫn ở trên
    .setScale(len / m.width, thick / m.height)
    .setDepth(p.depth - 0.003).setScrollFactor(p.scrollFactorX, p.scrollFactorY).setAlpha(p.alpha).setVisible(true);
};
TT.WeaponLayer = WeaponLayer;

// gắn lớp vũ khí nếu bộ nhân vật có dữ liệu vũ khí; trả về layer hoặc null
TT.attachWeapon = function (scene, spr, rig, weaponId) {
  if (!rig || !rig.weapon) return null;
  return new WeaponLayer(scene, spr, weaponId);
};
