// Chiêu thức của từng hệ. Mỗi hàm nhận (w: WorldScene, sk: dữ liệu chiêu, now: ms)
// và trả về false nếu không thi triển được (khi đó không trừ linh lực / không tính hồi chiêu).
window.TT = window.TT || {};

TT.Skills = (function () {
  // hướng nhắm: hướng đang quay mặt, làm tròn về 8 hướng
  function aim(w) {
    let ang = Math.atan2(w.facing.y, w.facing.x);
    ang = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    return { ang, dx: Math.cos(ang), dy: Math.sin(ang) };
  }

  // tự quay về yêu thú gần nhất trong tầm (giúp chiêu tầm xa dễ trúng)
  function autoFace(w, range) {
    const e = w.nearestEnemies(w.player.x, w.player.y, range, 1)[0];
    if (e) w.facing.set(e.x - w.player.x, e.y - w.player.y).normalize();
    return e;
  }

  function startCast(w, now, anim, lock) {
    w.player.setVelocity(0);
    w.playAnim(anim || 'cast');
    w.lockUntil = now + lock;
    w.skillLock = now + lock;
  }

  // ẩn nhân vật trong lúc hiệu ứng có vẽ sẵn "kim thân" chạy (nhân vật hóa thân vào hiệu ứng)
  function hidePlayer(w, now, sec) {
    const p = w.player, ms = sec * 1000;
    p.setVelocity(0); p.setAlpha(0); w.shadow.setAlpha(0);
    w.lockUntil = Math.max(w.lockUntil, now + ms);
    w.skillLock = Math.max(w.skillLock, now + ms);
    w.invulnUntil = Math.max(w.invulnUntil, now + ms + 300);
    w.time.delayedCall(ms, () => {
      p.setAlpha(1); w.shadow.setAlpha(0.35);
      TT.FX.ring(w, p.x, p.y - w.pH * 0.5, 0xffe08a, 1.2, 400);
    });
  }

  // hiệu ứng nhìn ngang (side view): quay trái khi đang hướng về bên trái
  const sideFlip = w => w.facing.x < -0.01;

  function scorch(w, x, y, s) {
    const sc = w.add.image(x, y, 'scorch').setDepth(-950).setAlpha(0.7).setScale(s || 1);
    w.tweens.add({ targets: sc, alpha: 0, delay: 2500, duration: 1500, onComplete: () => sc.destroy() });
  }

  function swordFall(w, x, y, dmg) {
    const s = w.add.image(x + 6, y - 90, 'sword').setOrigin(0.5, 1).setDepth(y + 2).setAlpha(0.9);
    w.tweens.add({
      targets: s, x, y: y + 2, duration: 170, ease: 'Quad.in',
      onComplete: () => {
        TT.FX.burst(w, x, y, [0xffe08a, 0xffffff, 0x9fe3ff], 10, 90);
        TT.FX.ring(w, x, y - 2, 0xffe08a, 0.7, 300);
        w.addLight(x, y - 6, 50, 0xffe08a, 260);
        w.hitEnemiesInRadius(x, y, 18, dmg, { ox: x, oy: y + 6, force: 120 });
        w.cameras.main.shake(70, 0.003);
        w.tweens.add({ targets: s, alpha: 0, delay: 350, duration: 300, onComplete: () => s.destroy() });
      }
    });
  }

  return {
    // ================= KIẾM TU =================
    kiem_khi(w, sk, now) {
      const p = w.player;
      autoFace(w, 120);
      const { ang, dx, dy } = aim(w);
      startCast(w, now, 'attack2', 220);
      w.time.delayedCall(w.contactMs('attack2', 0), () => {
        const y0 = p.y - w.pH * 0.45;
        const s = w.add.image(p.x + dx * 10, y0 + dy * 10, 'slash', 1).setRotation(ang).setScale(1.3)
          .setTint(0xbff1ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(5200);
        if (Math.abs(ang) > Math.PI / 2) s.setFlipY(true);
        w.addProjectile({ sprite: s, vx: dx * 260, vy: dy * 260, life: 700, r: 16, dmg: w.st.atk * sk.dmg, pierce: true, color: 0x9fe3ff });
        TT.SFX.slash(true);
      });
    },

    luu_van(w, sk, now) {
      const { dx, dy } = aim(w);
      w.playAnim('run');
      const dmg = w.st.atk * sk.dmg;
      w.dash = {
        until: now + 190, vx: dx * 430, vy: dy * 430, hit: new Set(), dmg, ghostT: 0,
        // beanfx wind_burst: bỏ qua đoạn tụ gió, nổ ngay khi dừng lướt
        onEnd: () => {
          const p = w.player, x = p.x, y = p.y;
          TT.FX.beanfx(w, sk.fx, x, y, {
            startAt: 0.7, depth: 5300,
            at: { burst: () => {
              w.hitEnemiesInRadius(x, y - 4, 36, dmg * 1.4, { ox: x, oy: y, force: 230 });
              w.addLight(x, y - 6, 90, 0x9fffe0, 300);
              w.cameras.main.shake(120, 0.004);
            } }
          });
        }
      };
      w.lockUntil = now + 200; w.skillLock = now + 200;
      w.knockUntil = now + 190;
      w.invulnUntil = Math.max(w.invulnUntil, now + 320);
      TT.SFX.dash();
    },

    van_kiem(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.van_kiem_old(w, sk, now);
      const p = w.player;
      autoFace(w, 150);
      const flip = sideFlip(w), dir = flip ? -1 : 1, x0 = p.x, y0 = p.y;
      const tx = x0 + dir * 102, ty = y0, dmg = w.st.atk * sk.dmg;
      startCast(w, now, 'cast', 700);
      const hitT = b.hits.length ? b.hits[0].t : b.states.plunge[0];
      w.time.delayedCall(Math.max(0, hitT - 1) * 1000, () => TT.FX.warn(w, tx, ty, 34, 1000));
      const at = {};
      at[b.states.rise[0] + 0.5] = () => w.hitEnemiesInRadius(x0, y0 - 8, 46, dmg * 0.25, { ox: x0, oy: y0, force: 140 });
      at[b.states.return[0] + 0.3] = () => w.hitEnemiesInRadius((x0 + tx) / 2, y0 - 6, 70, dmg * 0.3, { ox: tx, oy: ty, force: 120 });
      TT.FX.beanfx(w, sk.fx, x0, y0, {
        flip, at,
        onHit: () => {                                    // cự kiếm cắm xuống
          w.hitEnemiesInRadius(tx, ty, 54, dmg, { ox: tx, oy: ty, force: 260 });
          TT.FX.flash(w, 0.45, 400, 0xffe08a);
          w.cameras.main.shake(400, 0.012);
          w.addLight(tx, ty - 10, 220, 0xffe08a, 700);
          TT.FX.burst(w, tx, ty, [0xffe08a, 0xffffff], 40, 180);
          scorch(w, tx, ty, 1.6);
          w.hitStop(110);
          TT.SFX.boom();
        }
      });
      TT.SFX.cast();
    },

    van_kiem_old(w, sk, now) {
      const p = w.player;
      startCast(w, now, 'cast', 420);
      const pts = w.nearestEnemies(p.x, p.y, 120, 8).map(e => ({ x: e.x, y: e.y }));
      while (pts.length < 8) {
        const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 55;
        pts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.75 });
      }
      w.addLight(p.x, p.y - 30, 90, 0xffe08a, 900);
      pts.forEach((t, k) => w.time.delayedCall(250 + k * 90, () => swordFall(w, t.x, t.y, w.st.atk * sk.dmg)));
    },

    kiem_vuc(w, sk, now) {
      startCast(w, now, 'cast', 300);
      const swords = [0, 1, 2].map(() => w.add.image(w.player.x, w.player.y, 'sword').setTint(0xbfe8ff));
      w.auras.push({ type: 'orbit', until: now + 5000, swords, t: 0, r: 24, dmg: w.st.atk * sk.dmg, last: new Map() });
      TT.SFX.cast();
    },

    nhan_kiem(w, sk, now) {
      const p = w.player;
      startCast(w, now, 'attack3', 650);
      w.invulnUntil = Math.max(w.invulnUntil, now + 800);
      TT.FX.flash(w, 0.35, 400, 0xffe08a);
      [0, 60, 120].forEach(dl => w.time.delayedCall(dl, () => w.ghost(p, 0xffe08a)));
      w.time.delayedCall(w.contactMs('attack3', 200), () => {
        const cy = p.y - w.pH * 0.45;
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          const s = TT.FX.slash(w, p.x + Math.cos(a) * 22, cy + Math.sin(a) * 22, a, true);
          s.setScale(s.scaleX * 1.3);
        }
        TT.FX.ring(w, p.x, cy, 0xffe08a, 3.5, 700);
        w.addLight(p.x, cy, 220, 0xffe08a, 700);
        w.cameras.main.shake(300, 0.01);
        w.hitEnemiesInRadius(p.x, p.y - 6, 62, w.st.atk * sk.dmg, { ox: p.x, oy: p.y, force: 260 });
        w.hitStop(120);
      });
    },

    // ================= PHÁP TU =================
    loi_phap(w, sk, now) {
      w.castThunder(now, sk.dmg);
      w.skillLock = now + 300;
    },

    hoa_cau(w, sk, now) {
      const p = w.player;
      autoFace(w, 170);
      const { dx, dy } = aim(w);
      const contact = w.contactMs('cast', 200);
      startCast(w, now, 'cast', contact + 100);
      w.time.delayedCall(contact, () => {
        const ep = w.emitPoint('cast');
        const s = w.add.image(ep.x, ep.y, 'fireball').setDepth(5200).setBlendMode(Phaser.BlendModes.ADD);
        w.tweens.add({ targets: s, angle: 360, duration: 500, repeat: -1 });
        const dmg = w.st.atk * sk.dmg;
        const explode = (x, y) => {
          TT.FX.burst(w, x, y, [0xff5a1f, 0xffb347, 0xfff3b0], 26, 140);
          TT.FX.ring(w, x, y, 0xffb347, 1.1, 350);
          w.addLight(x, y, 110, 0xff8a3a, 400);
          w.hitEnemiesInRadius(x, y + 4, 28, dmg, { ox: x, oy: y, force: 160 });
          const sc = w.add.image(x, y + 4, 'scorch').setDepth(-950).setAlpha(0.6);
          w.tweens.add({ targets: sc, alpha: 0, delay: 2000, duration: 1500, onComplete: () => sc.destroy() });
          w.cameras.main.shake(120, 0.005);
          TT.SFX.boom();
        };
        w.addProjectile({ sprite: s, vx: dx * 210, vy: dy * 210, life: 900, r: 9, dmg: 0, pierce: false, color: 0xff8a3a, onEnd: explode });
        TT.SFX.cast();
      });
    },

    bang_phong(w, sk, now) {
      const p = w.player, contact = w.contactMs('cast', 200);
      startCast(w, now, 'cast', contact + 150);
      w.time.delayedCall(contact, () => {
        const x = p.x, y = p.y - 6;
        TT.FX.ring(w, x, y, 0x9fe8ff, 2.2, 600);
        TT.FX.ring(w, x, y, 0xffffff, 1.6, 450, 80);
        TT.FX.burst(w, x, y, [0xffffff, 0x9fe8ff, 0x5fc8ff], 50, 170);
        w.addLight(x, y, 160, 0x9fe8ff, 600);
        const frost = w.add.image(x, p.y, 'ring').setTint(0x9fe8ff).setScale(2, 1.4).setAlpha(0.5).setDepth(-940);
        w.tweens.add({ targets: frost, alpha: 0, delay: 1500, duration: 1500, onComplete: () => frost.destroy() });
        w.nearestEnemies(x, y, 64, 99).forEach(e => { e.slowUntil = w.time.now + 3000; });
        w.hitEnemiesInRadius(x, y, 60, w.st.atk * sk.dmg, { ox: x, oy: y, force: 90 });
        TT.SFX.freeze();
      });
    },

    thien_loi(w, sk, now) {
      const p = w.player, contact = w.contactMs('cast', 200);
      startCast(w, now, 'cast', contact + 200);
      const pts = w.nearestEnemies(p.x, p.y, 170, 5).map(e => e);
      while (pts.length < 5) {
        const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 60;
        pts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.75 });
      }
      pts.forEach((t, k) => w.time.delayedCall(contact + k * 160, () => {
        const x = t.x, y = t.y;          // vị trí hiện tại của yêu thú (nếu là yêu thú)
        TT.FX.lightning(w, x, y, { scale: 0.85 });
        w.hitEnemiesInRadius(x, y, 22, w.st.atk * sk.dmg, { ox: x, oy: y, force: 100 });
      }));
    },

    cuu_thien(w, sk, now) {
      const p = w.player;
      const e = autoFace(w, 170);
      const { dx, dy } = aim(w);
      const tx = e ? e.x : p.x + dx * 50, ty = e ? e.y : p.y + dy * 50;
      startCast(w, now, 'cast', 700);
      w.invulnUntil = Math.max(w.invulnUntil, now + 700);
      const dmg = w.st.atk * sk.dmg;
      const b = TT.FX.bfx.sigil_thunder;
      const fx = TT.FX.beanfx(w, 'sigil_thunder', tx, ty, {
        depth: 6000,
        onHit: h => {
          const first = b && b.hits[0] === h;
          if (first) {
            TT.FX.lightning(w, tx, ty, { big: true, noSprite: true });
            w.hitEnemiesInRadius(tx, ty, 48, dmg, { ox: tx, oy: ty, force: 240 });
          } else {
            w.addLight(tx, ty - 10, 90, 0xc9b8ff, 220);
            w.cameras.main.shake(90, 0.004);
            w.hitEnemiesInRadius(tx, ty, 36, dmg * 0.3, { ox: tx, oy: ty, force: 70 });
          }
        }
      });
      if (!fx) {                               // chưa nạp beanfx: dùng sét vẽ tạm
        TT.FX.warn(w, tx, ty, 30, 1000);
        w.time.delayedCall(1000, () => {
          TT.FX.lightning(w, tx, ty, { big: true, scale: 1.5 });
          w.hitEnemiesInRadius(tx, ty, 48, dmg, { ox: tx, oy: ty, force: 240 });
        });
      }
      TT.SFX.cast();
    },

    // ================= CHIÊU DÙNG HIỆU ỨNG BEANFX =================
    phi_long(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.nhan_kiem(w, TT.DATA.skills.nhan_kiem, now);
      const p = w.player;
      autoFace(w, 130);
      const flip = sideFlip(w), dir = flip ? -1 : 1;
      const tx = p.x + (b.target[0] - b.pivot[0]) * b.scale * dir, ty = p.y + (b.target[1] - b.pivot[1]) * b.scale;
      const dmg = w.st.atk * sk.dmg;
      hidePlayer(w, now, b.duration);
      TT.FX.beanfx(w, sk.fx, p.x, p.y, {
        flip,
        at: {
          dive: () => TT.FX.warn(w, tx, ty, 32, (b.states.hit[0] - b.states.dive[0]) * 1000),
          hit: () => {
            w.hitEnemiesInRadius(tx, ty, 48, dmg, { ox: tx, oy: ty, force: 260 });
            TT.FX.flash(w, 0.5, 400, 0xffe08a);
            w.cameras.main.shake(380, 0.012);
            w.addLight(tx, ty - 10, 220, 0xffe08a, 700);
            scorch(w, tx, ty, 1.5);
            w.hitStop(110);
            TT.SFX.boom();
          }
        }
      });
      TT.SFX.cast();
    },

    bang_vu(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.bang_phong(w, TT.DATA.skills.bang_phong, now);
      const p = w.player, e = autoFace(w, 180), { dx, dy } = aim(w);
      const tx = e ? e.x : p.x + dx * 50, ty = e ? e.y : p.y + dy * 50;
      const contact = w.contactMs('cast', 200);
      startCast(w, now, 'cast', contact + 100);
      w.time.delayedCall(contact, () => {
        TT.FX.beanfx(w, sk.fx, tx, ty, { loopMs: 4000, depth: 5300, scale: 2 });
        TT.SFX.freeze();
        w.time.addEvent({
          delay: 400, repeat: 9, callback: () => {
            w.nearestEnemies(tx, ty - 4, 52, 99).forEach(en => {
              en.slowUntil = w.time.now + 1200;
              w.damageEnemy(en, w.st.atk * sk.dmg * Phaser.Math.FloatBetween(0.9, 1.1), { ox: tx, oy: ty, force: 25 });
            });
            w.addLight(tx, ty - 20, 90, 0x9fe8ff, 420);
          }
        });
      });
    },

    loi_than(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.thien_loi(w, TT.DATA.skills.thien_loi, now);
      const p = w.player;
      startCast(w, now, 'cast', 300);
      const fx = TT.FX.beanfx(w, sk.fx, p.x, p.y, { loopMs: 6000, depth: 5300 });
      w.auras.push({ type: 'follow', fx, until: now + 6000, next: now + 300, dmg: w.st.atk * sk.dmg });
      TT.SFX.thunder(false);
    },

    tinh_long(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.cuu_thien(w, TT.DATA.skills.cuu_thien, now);
      const p = w.player;
      autoFace(w, 200);
      const flip = sideFlip(w), dir = flip ? -1 : 1, x0 = p.x, y0 = p.y;
      const reach = 108, tx = x0 + dir * reach, dmg = w.st.atk * sk.dmg;
      hidePlayer(w, now, b.duration);
      TT.FX.beanfx(w, sk.fx, x0, y0, {
        flip,
        at: {
          launch: () => {                                   // đầu rồng xuyên qua mọi thứ trên đường bay
            w.enemies.getChildren().forEach(en => {
              if (!en.active || en.dying) return;
              const along = (en.x - x0) * dir;
              if (along >= 0 && along <= reach && Math.abs(en.y - y0) < 24) w.damageEnemy(en, dmg * 0.5, { kx: dir, ky: 0, force: 160 });
            });
            w.cameras.main.shake(200, 0.006);
          },
          impact: () => {
            w.hitEnemiesInRadius(tx, y0 - 10, 46, dmg, { ox: tx, oy: y0, force: 240 });
            TT.FX.flash(w, 0.4, 350, 0x8fb8ff);
            w.addLight(tx, y0 - 20, 200, 0x8fb8ff, 700);
            w.cameras.main.shake(350, 0.01);
            w.hitStop(100);
            TT.SFX.boom();
          }
        }
      });
      TT.SFX.cast();
    },

    hoa_lien(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.cuu_thien(w, TT.DATA.skills.cuu_thien, now);
      const p = w.player, speed = 1.25;
      autoFace(w, 120);
      const flip = sideFlip(w), dir = flip ? -1 : 1;
      const tx = p.x + (b.target[0] - b.pivot[0]) * b.scale * dir, ty = p.y + (b.target[1] - b.pivot[1]) * b.scale;
      const dmg = w.st.atk * sk.dmg, hurl = b.states.hurl;
      hidePlayer(w, now, b.duration / speed);
      const at = {};
      at[hurl[0]] = () => TT.FX.warn(w, tx, ty, 40, 0.35 / speed * 1000);
      at[hurl[0] + 0.35] = () => {                        // hỏa liên chạm đất
        w.hitEnemiesInRadius(tx, ty, 58, dmg, { ox: tx, oy: ty, force: 280 });
        TT.FX.flash(w, 0.5, 450, 0xff9a5c);
        w.addLight(tx, ty - 10, 240, 0xff8a3a, 900);
        w.cameras.main.shake(450, 0.014);
        scorch(w, tx, ty, 2);
        w.hitStop(130);
        TT.SFX.boom();
      };
      at[hurl[0] + 0.75] = () => w.hitEnemiesInRadius(tx, ty, 70, dmg * 0.3, { ox: tx, oy: ty, force: 120 });
      TT.FX.beanfx(w, sk.fx, p.x, p.y, { flip, speed, at });
      TT.SFX.cast();
    },

    // ================= VÕ TU =================
    cuu_long(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.phi_long(w, TT.DATA.skills.phi_long, now);
      const p = w.player;
      autoFace(w, 140);
      const flip = sideFlip(w), dir = flip ? -1 : 1;
      const x0 = p.x, y0 = p.y, tx = x0 + dir * 96, ty = y0, dmg = w.st.atk * sk.dmg;
      // vận công: đứng yên trong lúc rồng tụ sau lưng và gầm, tới lúc rồng bay đi thì được cử động
      const launch = b.states.fly[0];
      startCast(w, now, 'cast', launch * 1000);
      // rồng nằm sau lưng nhân vật (depth thấp hơn nhân vật một chút)
      TT.FX.beanfx(w, sk.fx, x0, y0, {
        flip, depth: y0 - 1,
        at: {
          gather: () => w.addLight(x0 - dir * 12, y0 - 37, 120, 0xffd34d, launch * 1000),
          roar: () => { w.cameras.main.shake(250, 0.004); TT.SFX.thunder(false); },
          fly: () => TT.FX.warn(w, tx, ty, 34, (b.states.bite[0] - b.states.fly[0]) * 1000 + 150)
        },
        onHit: h => {
          const i = b.hits.indexOf(h), last = i === b.hits.length - 1;
          const share = [0.3, 0.5, 1.0][i] || 0.5;
          w.hitEnemiesInRadius(tx, ty, last ? 50 : 36, dmg * share, { ox: tx, oy: ty, force: last ? 280 : 140 });
          w.addLight(tx, ty - 10, last ? 230 : 120, 0xffd34d, last ? 800 : 300);
          if (last) {
            TT.FX.flash(w, 0.5, 450, 0xffe08a);
            w.cameras.main.shake(420, 0.013);
            w.hitStop(120);
            TT.SFX.boom();
          } else {
            w.cameras.main.shake(120, 0.005);
            TT.SFX.hit();
          }
        }
      });
      TT.SFX.cast();
    },

    giang_long(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.cuu_long(w, TT.DATA.skills.cuu_long, now);
      const p = w.player;
      autoFace(w, 150);
      const flip = sideFlip(w), dir = flip ? -1 : 1;
      const x0 = p.x, y0 = p.y, tx = x0 + dir * 96, ty = y0, dmg = w.st.atk * sk.dmg;
      // đứng tại chỗ vận lực cho tới khi dòng rồng tuôn hết
      startCast(w, now, 'cast', b.states.finale[0] * 1000);
      w.invulnUntil = Math.max(w.invulnUntil, now + b.states.torrent[0] * 1000);
      TT.FX.beanfx(w, sk.fx, x0, y0, {
        flip, depth: 5300,
        at: {
          thrust: () => { w.cameras.main.shake(200, 0.006); w.addLight(x0 + dir * 8, y0 - 17, 110, 0xc58cff, 400); TT.SFX.thunder(false); },
          gather: () => w.addLight(x0 + dir * 56, y0 - 88, 160, 0x5fa8ff, 2600),
          torrent: () => TT.FX.warn(w, tx, ty, 40, (b.states.finale[0] - b.states.torrent[0]) * 1000 + 300),
          finale: () => TT.SFX.thunder(true)
        },
        onHit: h => {
          const last = b.hits.indexOf(h) === b.hits.length - 1;
          if (last) {
            w.hitEnemiesInRadius(tx, ty, 54, dmg, { ox: tx, oy: ty, force: 300 });
            TT.FX.flash(w, 0.55, 450, 0xd4a6ff);
            w.addLight(tx, ty - 12, 240, 0xb07aff, 900);
            w.cameras.main.shake(450, 0.014);
            w.hitStop(130);
            TT.SFX.thunder(true);
          } else {
            w.hitEnemiesInRadius(tx, ty, 32, dmg * 0.12, { ox: tx, oy: ty, force: 60 });
            w.addLight(tx, ty - 8, 70, 0xb07aff, 160);
            TT.SFX.hit();
          }
        }
      });
      TT.SFX.cast();
    },

    kim_chung(w, sk, now) {
      const p = w.player, dur = sk.dur * 1000;
      startCast(w, now, 'cast', 280);
      const a = { type: 'buff', until: now + dur, dr: sk.dr, atk: sk.atk, bell: null, aura: null };
      a.bell = TT.FX.beanfx(w, 'kim_chung_trao', p.x, p.y, { depth: 5300 });
      const strike = (TT.FX.bfx.kim_chung_trao && TT.FX.bfx.kim_chung_trao.states.strike) ? TT.FX.bfx.kim_chung_trao.states.strike[0] : 0.27;
      w.time.delayedCall(strike * 1000, () => {                   // chuông chạm đất: ngân vang
        w.cameras.main.shake(180, 0.006);
        w.addLight(w.player.x, w.player.y - 34, 130, 0xffd04a, 600);
        TT.SFX.bell();
      });
      w.time.delayedCall(800, () => {                              // chuông tan dần -> hào quang ở lại
        if (w.buff === a && w.time.now < a.until) {
          a.aura = TT.FX.beanfx(w, 'kim_chung_aura', w.player.x, w.player.y, { depth: 5300, loopMs: a.until - w.time.now });
        }
      });
      if (!a.bell) { TT.FX.ring(w, p.x, p.y - 30, 0xffd04a, 2, 600); TT.FX.burst(w, p.x, p.y - 30, [0xffd04a, 0xffffff], 30, 100); }
      if (w.buff && w.buff.aura) w.buff.aura.stop();
      w.buff = a;
      w.auras.push(a);
      TT.HUD.log('Kim Chung Tráo: giảm ' + Math.round(sk.dr * 100) + '% sát thương, công lực +' + Math.round((sk.atk - 1) * 100) + '% trong ' + sk.dur + ' giây.', 'gold');
    },

    // ================= QUỶ TU =================
    cau_hon(w, sk, now) {
      const p = w.player, contact = w.contactMs('cast', 200);
      autoFace(w, 170);
      startCast(w, now, 'cast', contact + 80);
      w.time.delayedCall(contact, () => {
        const ep = w.emitPoint('cast');
        const targets = w.nearestEnemies(p.x, p.y, 200, 3);
        const base = Math.atan2(w.facing.y, w.facing.x);
        for (let k = 0; k < 3; k++) {
          const a = base + (k - 1) * 0.7;
          const s = w.add.image(ep.x, ep.y, 'wisp').setBlendMode(Phaser.BlendModes.ADD).setDepth(5200);
          w.addProjectile({
            sprite: s, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 1700, r: 8, dmg: w.st.atk * sk.dmg,
            pierce: false, color: 0x5dffa0, homing: targets.length ? targets[k % targets.length] : null, speed: 220, lifesteal: 0.15
          });
        }
        TT.SFX.cast();
      });
    },

    huyet_anh(w, sk, now) {
      const p = w.player, { dx, dy } = aim(w), dmg = w.st.atk * sk.dmg;
      const x0 = p.x, y0 = p.y;
      let dist = 72;                                       // lùi dần nếu điểm đến vướng cây đá
      while (dist > 8 && w.solidAt(x0 + dx * dist, y0 + dy * dist)) dist -= 6;
      const x1 = Phaser.Math.Clamp(x0 + dx * dist, 10, w.worldW - 10), y1 = Phaser.Math.Clamp(y0 + dy * dist, 14, w.worldH - 6);
      const burst = (x, y) => {
        TT.FX.burst(w, x, y - 8, [0xff2a4a, 0x8a0018, 0xff8a9a], 26, 130);
        TT.FX.ring(w, x, y - 6, 0xff2a4a, 1.3, 380);
        w.addLight(x, y - 8, 90, 0xff2a4a, 380);
        const hits = w.nearestEnemies(x, y, 32, 99);
        hits.forEach(e => w.damageEnemy(e, dmg, { ox: x, oy: y, force: 160 }));
        if (hits.length) w.heal(dmg * 0.3 * hits.length);
      };
      [0, 40].forEach(dl => w.time.delayedCall(dl, () => w.ghost(p, 0xff2a4a)));
      burst(x0, y0);
      p.body.reset(x1, y1);
      w.shadow.setPosition(x1, y1);
      w.time.delayedCall(70, () => { burst(x1, y1); w.ghost(p, 0xff5a72); });
      w.invulnUntil = Math.max(w.invulnUntil, now + 450);
      w.skillLock = now + 160;
      TT.SFX.dash();
    },

    am_hoa(w, sk, now) {
      const p = w.player;
      startCast(w, now, 'cast', 300);
      const wisps = [];
      for (let k = 0; k < 8; k++) wisps.push(w.add.image(p.x, p.y, 'wisp').setBlendMode(Phaser.BlendModes.ADD).setDepth(5200).setAlpha(0.95));
      const ring = w.add.image(p.x, p.y, 'ring').setTint(0x5dffa0).setScale(1.5, 0.95).setAlpha(0.55)
        .setDepth(-930).setBlendMode(Phaser.BlendModes.ADD);
      w.auras.push({ type: 'wispring', until: now + 5000, wisps, ring, t: 0, next: now + 200, dmg: w.st.atk * sk.dmg });
      TT.FX.burst(w, p.x, p.y - 10, [0x5dffa0, 0xeafff2], 24, 90);
      TT.SFX.cast();
    },

    bach_quy(w, sk, now) {
      const p = w.player;
      startCast(w, now, 'cast', 400);
      const ghosts = [];
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const g = w.add.sprite(p.x + Math.cos(a) * 18, p.y - 22 + Math.sin(a) * 8, 'ghost').play('ghost_float')
          .setDepth(5200).setAlpha(0);
        w.tweens.add({ targets: g, alpha: 0.92, duration: 300 });
        g.vx = Math.cos(a) * 60; g.vy = Math.sin(a) * 60; g.nextBite = 0; g.k = k;
        ghosts.push(g);
        TT.FX.burst(w, g.x, g.y, [0xb8ffd8, 0x5dffa0], 10, 70);
      }
      w.auras.push({ type: 'minions', until: now + 8000, ghosts, dmg: w.st.atk * sk.dmg });
      TT.SFX.learn();
    },

    van_hon(w, sk, now) {
      const b = TT.FX.bfx[sk.fx];
      if (!b) return TT.Skills.bach_quy(w, sk, now);
      const p = w.player;
      autoFace(w, 170);
      const flip = sideFlip(w), dir = flip ? -1 : 1;
      const tx = p.x + (b.target[0] - b.pivot[0]) * b.scale * dir, ty = p.y;
      const dmg = w.st.atk * sk.dmg, st = b.states.strike;
      hidePlayer(w, now, b.duration);
      const at = {};
      at[st[0]] = () => TT.FX.warn(w, tx, ty, 42, 300);
      at[st[0] + 0.3] = () => {                           // dòng vạn hồn đổ xuống mục tiêu
        w.hitEnemiesInRadius(tx, ty, 56, dmg, { ox: tx, oy: ty, force: 220 });
        w.heal(w.st.maxHp * 0.15);
        TT.FX.flash(w, 0.4, 450, 0x5dffa0);
        w.addLight(tx, ty - 10, 240, 0x5dffa0, 1000);
        w.cameras.main.shake(400, 0.012);
        w.hitStop(110);
        TT.SFX.boom();
      };
      for (let k = 1; k <= 3; k++) at[st[0] + 0.3 + k * 0.25] = () => w.hitEnemiesInRadius(tx, ty, 50, dmg * 0.15, { ox: tx, oy: ty, force: 60 });
      TT.FX.beanfx(w, sk.fx, p.x, p.y, { flip, at });
      TT.SFX.cast();
    },

    // dùng chung với World (đột phá cảnh giới dùng hiệu ứng "kim thân")
    hidePlayer(w, now, sec) { hidePlayer(w, now, sec); }
  };
})();
