// Ánh sáng 2D kiểu pixel: một lớp bóng tối (RenderTexture) phủ màn hình, các nguồn sáng
// "khoét" lỗ vào lớp đó, kèm quầng sáng màu cộng dồn (ADD) để tạo màu cho ánh sáng.
window.TT = window.TT || {};

TT.Lighting = class {
  // view: vùng màn hình tính theo đơn vị thế giới (đã trừ camera zoom), xem WorldScene.view
  constructor(scene, view) {
    this.scene = scene;
    this.rt = scene.add.renderTexture(view.x, view.y, view.w, view.h).setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.stamp = scene.make.image({ key: 'light', add: false }).setOrigin(0.5);
    this.pool = [];
  }

  // lights: [{ x, y, r, i (0..1), c (màu quầng sáng, hoặc null) }]
  render(lights, dark, color) {
    const cam = this.scene.cameras.main, rt = this.rt;
    const vx = cam.worldView.x, vy = cam.worldView.y, W = rt.width, H = rt.height;
    const onScreen = l => l.x + l.r > vx && l.x - l.r < vx + W && l.y + l.r > vy && l.y - l.r < vy + H;

    if (dark < 0.01) {
      rt.setVisible(false);
    } else {
      rt.setVisible(true);
      rt.clear();
      rt.fill(color, dark);
      for (const l of lights) {
        if (!onScreen(l) || l.i <= 0) continue;
        this.stamp.setPosition(l.x - vx, l.y - vy).setScale(l.r / 32).setAlpha(Math.min(1, l.i));
        rt.erase(this.stamp);
      }
    }

    // quầng sáng màu
    let n = 0;
    for (const l of lights) {
      if (!l.c || !onScreen(l) || l.i <= 0) continue;
      let g = this.pool[n];
      if (!g) {
        g = this.scene.add.image(0, 0, 'light').setBlendMode(Phaser.BlendModes.ADD).setDepth(5001);
        this.pool.push(g);
      }
      g.setVisible(true).setPosition(l.x, l.y).setScale(l.r / 32 * 0.75).setTint(l.c)
        .setAlpha(Math.min(1, l.i) * (0.1 + dark * 0.55));
      n++;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  static lerpColor(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
    const br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  }
};
