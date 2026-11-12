// Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh).
window.TT = window.TT || {};

TT.SFX = (function () {
  let ctx = null, master = null, noiseBuf = null, muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
        const len = ctx.sampleRate * 3;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const ok = () => !muted && ctx && ctx.state === 'running';

  function noise(dur, type, freq, vol, delay) {
    if (!ok()) return;
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  function tone(f0, f1, dur, type, vol, delay) {
    if (!ok()) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    unlock: ensure,
    toggle() { muted = !muted; return muted; },
    thunder(big) {
      noise(0.15, 'highpass', 1800, big ? 0.5 : 0.25);
      noise(big ? 2.2 : 1.0, 'lowpass', big ? 260 : 420, big ? 0.9 : 0.45, 0.03);
    },
    rumble() { noise(2.5, 'lowpass', 140, 0.6); },
    slash(big) { noise(big ? 0.18 : 0.1, 'bandpass', big ? 1400 : 2400, 0.25); },
    hit() { tone(220, 90, 0.09, 'square', 0.06); },
    hurt() { tone(330, 110, 0.18, 'sawtooth', 0.08); },
    pickup() { tone(900, 1500, 0.07, 'triangle', 0.05); },
    cast() { tone(500, 1400, 0.15, 'triangle', 0.06); },
    bell() { [[392, 2.2, 0.12], [784, 1.6, 0.06], [1176, 1.0, 0.03], [1568, 0.7, 0.02]].forEach(([f, d, v]) => tone(f, f * 0.995, d, 'sine', v)); noise(0.08, 'highpass', 2500, 0.15); },
    boom() { noise(0.5, 'lowpass', 600, 0.6); tone(160, 50, 0.3, 'sine', 0.15); },
    freeze() { noise(0.4, 'highpass', 3000, 0.25); tone(1800, 900, 0.3, 'triangle', 0.05); },
    dash() { noise(0.18, 'bandpass', 900, 0.3); },
    learn() { [659, 784, 988, 1318].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.07, i * 0.1)); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.07, i * 0.08)); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, f * 0.97, 0.25, 'square', 0.05, i * 0.15)); }
  };
})();
