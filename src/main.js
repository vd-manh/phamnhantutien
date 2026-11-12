// Khởi động game.
(function () {
  function start() {
    TT.HUD.init();
    window.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 960,      // camera trong WorldScene zoom x2: thế giới vẫn 480x270 "pixel to",
      height: 540,     // nhân vật beanfx hiển thị ở độ phân giải gốc

      backgroundColor: '#0b0912',
      pixelArt: true,
      roundPixels: true,
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [TT.BootScene, TT.SelectScene, TT.WorldScene]
    });
  }

  document.getElementById('btn-switch').addEventListener('click', function (ev) {
    ev.currentTarget.blur();     // để phím Space/Enter không bấm lại nút
    const w = window.game && window.game.scene.getScene('World');
    if (w && w.scene.isActive()) w.switchClass();
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (confirm('Xóa toàn bộ tiến độ và tu luyện lại từ đầu?')) {
      TT.Save.clear();
      TT.Save.disabled = true;
      location.reload();
    }
  });

  // chờ font pixel tải xong (tối đa 1.5s) để chữ trong game hiển thị đúng
  const fontReady = document.fonts
    ? Promise.race([document.fonts.load('16px VT323'), new Promise(r => setTimeout(r, 1500))])
    : Promise.resolve();
  fontReady.catch(function () {}).then(start);
})();
