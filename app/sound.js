/* ONDA sound engine: every sound is synthesised live with Web Audio, no audio files.
     sound.init()                    call from a user gesture
     sound.setLevel(id, 0..1)        0 = off
     sound.setTexture(id, 0|1|2)     the 소리 결 of that sound
     sound.fadeTo(0..1, seconds)     master level, used by the sleep timer and pause
   Each sound is built on first use, so a theme you never open costs nothing. */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const OUT = 0.34;

let ctx = null, master = null, pinkBuf = null, brownBuf = null;
const tracks = {};          // id -> { gain, apply(texture) }
const levels = {}, textures = {};

function buffers() {
  const n = ctx.sampleRate * 4;
  pinkBuf = ctx.createBuffer(1, n, ctx.sampleRate); brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const p = pinkBuf.getChannelData(0), br = brownBuf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08; b6 = w * 0.115926;
    last = (last + 0.02 * w) / 1.02; br[i] = last * 3.2;
  }
}
const src = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 3); return s; };
const filt = (type, f, q = 1) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
const lfo = (hz, depth, target) => { const o = ctx.createOscillator(), g = gain(depth); o.frequency.value = hz; o.connect(g).connect(target); o.start(); return { o, g }; };
const ramp = (param, v, t = 0.4) => param.setTargetAtTime(v, ctx.currentTime, t);
// a short burst of filtered noise: the building block of crackles, clicks, page rustles and rail clacks
function burst(out, { len = 0.04, decay = 0.006, type = 'highpass', f = 2000, q = 0.7, amp = 0.2, pan = 0 }) {
  const t = ctx.currentTime, b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
  const s = ctx.createBufferSource(); s.buffer = b; let node = s.connect(filt(type, f, q)).connect(gain(amp));
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  node.connect(out); s.start(t);
}
function drop(out, { f = 2400, amp = 0.05, len = 0.07, pan = 0 }) {
  const t = ctx.currentTime, env = gain(0), o = ctx.createOscillator();
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(amp, t + 0.002); env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + len * 0.45);
  let node = env; if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; env.connect(p); node = p; }
  node.connect(out); o.connect(env); o.start(t); o.stop(t + len + 0.02);
}
// run fn on a jittered timer while the sound is audible
function every(id, delay, fn) { (function loop() { if (levels[id] > 0) fn(); setTimeout(loop, delay()); })(); }

const BUILD = {
  fire(g) {
    const bed = filt('bandpass', 450, 1.2), bg = gain(1); src(pinkBuf).connect(bed).connect(bg).connect(g);
    let chance = 0.4;
    every('fire', () => 100, () => { if (Math.random() < chance) burst(g, { f: 2200, amp: rand(0.12, 0.34), pan: rand(-0.3, 0.3) }); });
    return (t) => { chance = [0.14, 0.4, 0.7][t]; ramp(bed.frequency, [340, 450, 640][t]); ramp(bg.gain, [0.7, 1, 1.35][t]); };
  },
  wave(g) {
    const wf = filt('lowpass', 380), sw = gain(0.65); src(pinkBuf).connect(wf).connect(sw).connect(g);
    const a = lfo(0.14, 220, wf.frequency), b = lfo(0.14, 0.32, sw.gain);
    return (t) => { [a.o, b.o].forEach((o) => ramp(o.frequency, [0.22, 0.14, 0.08][t])); ramp(a.g.gain, [110, 220, 420][t]); ramp(b.g.gain, [0.14, 0.32, 0.46][t]); ramp(wf.frequency, [520, 380, 320][t]); };
  },
  wind(g) {
    const wb = filt('bandpass', 520, 0.7), gust = gain(0.7); src(pinkBuf).connect(wb).connect(gust).connect(g);
    src(pinkBuf).connect(filt('highpass', 2500)).connect(gain(0.15)).connect(gust);
    const a = lfo(0.07, 0.3, gust.gain), b = lfo(0.11, 180, wb.frequency);
    return (t) => { ramp(a.o.frequency, [0.05, 0.07, 0.12][t]); ramp(a.g.gain, [0.18, 0.3, 0.45][t]); ramp(wb.frequency, [700, 520, 380][t]); };
  },
  rain(g) {
    const hiss = gain(0.5); src(pinkBuf).connect(filt('highpass', 600)).connect(filt('lowpass', 2600)).connect(hiss).connect(g);
    const drops = filt('lowpass', 5200); drops.connect(g); let rate = 1;
    (function loop() { if (levels.rain > 0) drop(drops, { f: rand(1800, 3200), amp: 0.06 * rand(0.5, 1), pan: rand(-0.4, 0.4) }); setTimeout(loop, rand(60, 260) / (0.3 + levels.rain) / rate); })();
    return (t) => { rate = [0.4, 1, 2.4][t]; ramp(hiss.gain, [0.28, 0.5, 0.85][t]); };
  },
  coffee(g) {
    // the pour: a thin, bright trickle whose loudness flickers, plus single drops into the cup
    const tr = filt('bandpass', 2100, 1.4), tg = gain(0.25), am = gain(0.5); src(pinkBuf).connect(tr).connect(am).connect(tg).connect(g);
    lfo(7.5, 0.35, am.gain); const sweep = lfo(0.6, 500, tr.frequency);
    let rate = 1;
    every('coffee', () => rand(500, 1600) / rate, () => drop(g, { f: rand(900, 1400), amp: 0.08, len: 0.12, pan: rand(-0.15, 0.15) }));
    return (t) => { rate = [0.6, 1, 1.6][t]; ramp(tg.gain, [0.04, 0.25, 0.55][t]); ramp(sweep.o.frequency, [0.3, 0.6, 1.1][t]); };
  },
  train(g) {
    // far rumble and the da-dum of wheels over rail joints
    const rum = gain(0.6), lp = filt('lowpass', 140); src(brownBuf).connect(lp).connect(rum).connect(g);
    lfo(0.35, 0.12, rum.gain);
    const clack = filt('lowpass', 420); const cg = gain(1); clack.connect(cg).connect(g);
    let gap = 1.25;
    every('train', () => gap * 1000, () => { burst(clack, { len: 0.12, decay: 0.03, type: 'lowpass', f: 300, amp: 0.5 }); setTimeout(() => burst(clack, { len: 0.12, decay: 0.03, type: 'lowpass', f: 300, amp: 0.42 }), 150); });
    return (t) => { gap = [1.5, 1.25, 1.0][t]; ramp(clack.frequency, [240, 420, 700][t]); ramp(cg.gain, [0.45, 1, 1.5][t]); ramp(lp.frequency, [110, 140, 190][t]); };
  },
  typing(g) {
    let rate = 1;
    (function loop() {
      if (levels.typing > 0) { burst(g, { len: 0.02, decay: 0.003, f: rand(1800, 3200), amp: rand(0.18, 0.3), pan: rand(-0.25, 0.25) }); drop(g, { f: rand(500, 700), amp: 0.025, len: 0.03 }); }
      const pause = Math.random() < 0.08 ? rand(500, 1300) : rand(90, 230);   // short words, then a breath
      setTimeout(loop, pause / rate);
    })();
    return (t) => { rate = [0.55, 1, 1.7][t]; };
  },
  page(g) {
    let gap = 3.2;
    every('page', () => rand(0.6, 1.4) * gap * 1000, () => {
      const n = 3 + Math.floor(rand(0, 4));
      for (let i = 0; i < n; i++) setTimeout(() => burst(g, { len: 0.18, decay: 0.05, type: 'bandpass', f: rand(2500, 5200), q: 0.8, amp: rand(0.06, 0.12), pan: rand(-0.3, 0.3) }), i * rand(30, 70));
    });
    src(pinkBuf).connect(filt('bandpass', 900, 0.5)).connect(gain(0.03)).connect(g);   // the quiet room
    return (t) => { gap = [6, 3.2, 1.6][t]; };
  },
  fan(g) {
    const bp = filt('bandpass', 800, 0.5), am = gain(0.8); src(pinkBuf).connect(bp).connect(am).connect(g);
    const blade = lfo(7, 0.08, am.gain);
    const motor = ctx.createOscillator(); motor.frequency.value = 58; const mg = gain(0.04); motor.connect(mg).connect(g); motor.start();
    return (t) => { ramp(bp.frequency, [550, 800, 1150][t]); ramp(am.gain, [0.55, 0.8, 1.1][t]); ramp(blade.o.frequency, [5, 7, 10][t]); };
  },
  cabin(g) {
    const lp = filt('lowpass', 350), lv = gain(1.1); src(brownBuf).connect(lp).connect(lv).connect(g);
    src(pinkBuf).connect(filt('bandpass', 1200, 0.4)).connect(gain(0.05)).connect(g);   // the faint air of the vents
    lfo(0.02, 40, lp.frequency);
    return (t) => { ramp(lp.frequency, [220, 350, 520][t]); ramp(lv.gain, [0.8, 1.1, 1.4][t]); };
  },
  static(g) {
    const bp = filt('bandpass', 3000, 0.7), sg = gain(0.55); src(pinkBuf).connect(bp).connect(sg).connect(g);
    const tune = lfo(0.05, 900, bp.frequency);
    let chance = 0.3;
    every('static', () => 70, () => { if (Math.random() < chance) burst(g, { len: 0.01, decay: 0.0015, f: 4000, amp: rand(0.1, 0.22), pan: rand(-0.5, 0.5) }); });
    return (t) => { chance = [0.08, 0.3, 0.6][t]; ramp(sg.gain, [0.35, 0.55, 0.8][t]); ramp(tune.g.gain, [400, 900, 1600][t]); };
  },
  hum(g) {
    const h1 = ctx.createOscillator(), h2 = ctx.createOscillator(); h1.frequency.value = 55; h2.frequency.value = 110;
    const hg = gain(0.12); h1.connect(hg); h2.connect(gain(0.4)).connect(hg); hg.connect(g); h1.start(); h2.start();
    src(brownBuf).connect(filt('lowpass', 220)).connect(gain(0.5)).connect(g);
    lfo(0.025, 0.05, hg.gain);   // the compressor slowly comes and goes
    return (t) => { ramp(hg.gain, [0.07, 0.12, 0.2][t]); };
  },
};

function ensure(id) {
  if (!ctx || tracks[id] || !BUILD[id]) return;
  const g = gain(0); g.connect(master);
  const apply = BUILD[id](g);
  tracks[id] = { g, apply }; apply(textures[id] ?? 1);
}
function update(id) { ensure(id); const t = tracks[id]; if (t) t.g.gain.setTargetAtTime((levels[id] || 0) * OUT, ctx.currentTime, 0.08); }

export const sound = {
  get ready() { return !!ctx; },
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = gain(1); master.connect(ctx.destination); buffers();
      Object.keys(levels).forEach(update);
    } catch (e) { ctx = null; }
  },
  setLevel(id, v) { levels[id] = clamp(v, 0, 1); if (ctx) update(id); },
  setTexture(id, t) { textures[id] = t; if (tracks[id]) tracks[id].apply(t); },
  texture(id) { return textures[id] ?? 1; },
  fadeTo(v, seconds = 1) { if (!ctx) return; const p = master.gain, now = ctx.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(v, now + seconds); },
};
