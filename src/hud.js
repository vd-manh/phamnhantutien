// Giao diện HTML phủ lên canvas (chữ tiếng Việt hiển thị nét hơn vẽ trong canvas pixel).
window.TT = window.TT || {};

TT.HUD = {
  init() {
    const $ = id => document.getElementById(id);
    this.$ = {
      realm: $('realm'), kills: $('kills'), log: $('log'), prompt: $('prompt'),
      banner: $('banner'), bTitle: $('banner-title'), bSub: $('banner-sub'),
      hpF: $('hp-f'), hpT: $('hp-t'), mpF: $('mp-f'), mpT: $('mp-t'), xpF: $('xp-f'), xpT: $('xp-t')
    };
    this._prompt = null;
    this._bannerTimer = 0;
  },

  stats(s, st) {
    const D = TT.DATA, R = D.realms[s.realm], need = R.need[s.stage];
    const $ = this.$;
    $.realm.textContent = R.name + ' · ' + D.stages[s.stage];
    $.realm.style.color = R.color;
    const bar = (fill, text, v, max) => {
      fill.style.width = Math.max(0, Math.min(100, v / max * 100)) + '%';
      text.textContent = Math.floor(v) + ' / ' + max;
    };
    bar($.hpF, $.hpT, s.hp, st.maxHp);
    bar($.mpF, $.mpT, s.mp, st.maxMp);
    bar($.xpF, $.xpT, s.cult, need);
    $.xpF.parentElement.classList.toggle('full', s.cult >= need);
    $.kills.textContent = 'Yêu thú đã diệt: ' + s.kills;
  },

  log(msg, cls) {
    const d = document.createElement('div');
    d.className = 'line ' + (cls || '');
    d.textContent = msg;
    this.$.log.appendChild(d);
    while (this.$.log.children.length > 6) this.$.log.firstChild.remove();
    setTimeout(() => d.classList.add('fade'), 6000);
    setTimeout(() => d.remove(), 7300);
  },

  banner(title, sub, color) {
    const $ = this.$;
    $.bTitle.textContent = title;
    $.bTitle.style.color = color || '#ffe08a';
    $.bSub.textContent = sub || '';
    $.banner.classList.remove('show');
    void $.banner.offsetWidth;
    $.banner.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => $.banner.classList.remove('show'), 2800);
  },

  // ---------- thanh chiêu thức ----------
  initSkills(C, ids, onUse) {
    const bar = document.getElementById('hotbar');
    bar.innerHTML = '';
    this.slots = [];
    const mk = (key, glyph, color, tipHtml, cost) => {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = '<span class="glyph"></span><span class="key"></span><span class="cost"></span>' +
        '<div class="cd"></div><span class="cdt"></span><div class="lock"></div>';
      d.querySelector('.glyph').textContent = glyph;
      d.querySelector('.glyph').style.color = color;
      d.querySelector('.key').textContent = key;
      if (cost) d.querySelector('.cost').textContent = cost;
      d.addEventListener('mouseenter', () => this.showTip(d, tipHtml));
      d.addEventListener('mouseleave', () => this.hideTip());
      bar.appendChild(d);
      return d;
    };
    const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    mk('J', C.basic.glyph, '#ffffff', '<b>' + esc(C.basic.name) + '</b><br>Đánh thường, giữ J để ra 3 đòn liên hoàn. Đòn thứ ba là trọng kích.');
    ids.forEach((id, i) => {
      const sk = TT.DATA.skills[id], R = TT.DATA.realms[i];
      const tip = '<b style="color:' + sk.color + '">' + esc(sk.name) + '</b>' +
        '<br>' + esc(sk.desc) +
        '<br><span class="tip-meta">Linh lực ' + sk.cost + ' · Hồi chiêu ' + sk.cd + 's · Mở khóa: ' + esc(R.name) + '</span>';
      const d = mk(TT.DATA.skillKeys[i], sk.glyph, sk.color, tip, sk.cost);
      d.querySelector('.lock').textContent = R.name;
      d.addEventListener('click', () => onUse(i));
      this.slots.push(d);
    });
  },

  skills(states) {
    if (!this.slots) return;
    states.forEach((st, i) => {
      const d = this.slots[i];
      d.classList.toggle('locked', st.locked);
      d.classList.toggle('nomp', !st.locked && st.noMp);
      d.querySelector('.cd').style.height = (st.locked ? 0 : st.frac * 100) + '%';
      d.querySelector('.cdt').textContent = (!st.locked && st.left > 0) ? (st.left >= 1 ? Math.ceil(st.left) : st.left.toFixed(1)) : '';
    });
  },

  flashUnlock(i) {
    const d = this.slots && this.slots[i];
    if (!d) return;
    d.classList.remove('new'); void d.offsetWidth; d.classList.add('new');
    setTimeout(() => d.classList.remove('new'), 4000);
  },

  pulseSlot(i) {
    const d = this.slots && this.slots[i];
    if (!d) return;
    d.classList.remove('used'); void d.offsetWidth; d.classList.add('used');
  },

  showTip(el, html) {
    const tip = document.getElementById('tip');
    tip.innerHTML = html;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 10) + 'px';
  },

  hideTip() { document.getElementById('tip').style.display = 'none'; },

  tod(text, night) {
    const el = document.getElementById('tod');
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle('night', !!night);
  },

  prompt(text) {
    if (text === this._prompt) return;
    this._prompt = text;
    this.$.prompt.textContent = text || '';
    this.$.prompt.classList.toggle('show', !!text);
  }
};
