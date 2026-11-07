/* ONDA sound engine: every sound is synthesised live with Web Audio, no audio files.
     sound.init()                    call from a user gesture
     sound.setLevel(id, 0..1)        0 = off
     sound.setTexture(id, 0|1|2)     the 소리 결 of that sound
     sound.fadeTo(0..1, seconds)     master level, used by the sleep timer and pause
     sound.place(id, x, y, z)        where that sound is around the listener (-z is in front), any length
   Each sound is built on first use, so a theme you never open costs nothing.
   Made for falling asleep: warm low-heavy beds that move slowly, no hard clicks, every small event has a soft
   attack and is muffled, and the master gently levels whatever the mix adds up to. */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const OUT = 0.34;

let ctx = null, master = null, pinkBuf = null, brownBuf = null, whiteBuf = null;
const tracks = {};          // id -> { gain, apply(texture) }
const levels = {}, textures = {}, places = {};

function buffers() {
  const n = ctx.sampleRate * 4;
  pinkBuf = ctx.createBuffer(1, n, ctx.sampleRate); brownBuf = ctx.createBuffer(1, n, ctx.sampleRate); whiteBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const p = pinkBuf.getChannelData(0), br = brownBuf.getChannelData(0), wh = whiteBuf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1; wh[i] = w * 0.5;
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
const ramp = (param, v, t = 0.6) => param.setTargetAtTime(v, ctx.currentTime, t);
const panned = (node, pan) => { if (!ctx.createStereoPanner || !pan) return node; const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); return p; };
// a slow random walk instead of a sine: breath, gusts and swells never repeat the same shape
function drift(param, range, every = [1.2, 3], id = null) {
  (function step() {
    if (!id || levels[id] > 0) { const [lo, hi] = range(); const d = rand(...every); param.setTargetAtTime(rand(lo, hi), ctx.currentTime, d * 0.55); setTimeout(step, d * 1000); }
    else setTimeout(step, 800);
  })();
}
// a short grain of noise with a soft attack: crackles, keys, paper, droplets. Never a raw click
function grain(out, { at = 0, attack = 0.003, decay = 0.012, type = 'bandpass', f = 1500, q = 1, amp = 0.05, pan = 0, buf = whiteBuf }) {
  const t = ctx.currentTime + at, s = ctx.createBufferSource(), env = gain(0), x = filt(type, f, q);
  s.buffer = buf; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(amp, t + attack); env.gain.setTargetAtTime(0, t + attack, decay);
  s.connect(x).connect(env); panned(env, pan).connect(out);
  s.start(t, rand(0, 3.5)); s.stop(t + attack + decay * 8 + 0.02);
}
// a soft sine body under a grain: the 'thock' of a key, the plip of a drop, the thump of a rail joint
function tone(out, { at = 0, f = 200, to = f, attack = 0.004, decay = 0.03, amp = 0.03, pan = 0 }) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), env = gain(0);
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(to, t + attack + decay * 2);
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(amp, t + attack); env.gain.setTargetAtTime(0, t + attack, decay);
  o.connect(env); panned(env, pan).connect(out); o.start(t); o.stop(t + attack + decay * 8 + 0.02);
}
// a longer swell of filtered noise: a wave coming in, a page sweeping over, a breath of wind
function swell(out, { rise = 1, fall = 1.5, amp = 0.3, buf = pinkBuf, f0 = 300, f1 = 1200, f2 = 500, q = 0.5, pan = 0 }) {
  const t = ctx.currentTime, s = ctx.createBufferSource(), x = filt('lowpass', f0, q), env = gain(0);
  s.buffer = buf; s.loop = true;
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(amp, t + rise); env.gain.setTargetAtTime(0, t + rise, fall);
  x.frequency.setValueAtTime(f0, t); x.frequency.exponentialRampToValueAtTime(f1, t + rise); x.frequency.setTargetAtTime(f2, t + rise, fall * 0.8);
  s.connect(x).connect(env); panned(env, pan).connect(out);
  s.start(t, rand(0, 3)); s.stop(t + rise + fall * 6);
}
// run fn on a jittered timer while the sound is audible
function every(id, delay, fn) { (function loop() { if (levels[id] > 0) fn(); setTimeout(loop, delay()); })(); }

const BUILD = {
  /* ---------- 자연 ---------- */
  // a fireplace across the room: a warm breathing roar, a faint sizzle, and small muffled crackles
  fire(g) {
    const roarF = filt('lowpass', 360, 0.6), roar = gain(0.5); src(brownBuf).connect(roarF).connect(roar).connect(g);
    const sizF = filt('bandpass', 2600, 0.6), siz = gain(0.02); src(pinkBuf).connect(sizF).connect(siz).connect(g);
    const crack = filt('lowpass', 4200, 0.5); crack.connect(g);
    let c = { roar: [0.4, 0.6], chance: 0.14, amp: 0.06 };
    drift(roar.gain, () => c.roar, [1.5, 3.5], 'fire');
    every('fire', () => 70, () => {
      if (Math.random() > c.chance) return;
      const n = Math.random() < 0.15 ? 2 + Math.floor(rand(0, 3)) : 1;   // now and then a little cluster
      for (let i = 0; i < n; i++) grain(crack, { at: i * rand(0.02, 0.06), attack: 0.0025, decay: rand(0.006, 0.016), f: rand(1400, 3000), q: 1.1, amp: c.amp * rand(0.4, 1), pan: rand(-0.3, 0.3) });
      if (Math.random() < 0.03) tone(crack, { f: 120, to: 80, attack: 0.01, decay: 0.08, amp: 0.05 });   // a log settling
    });
    return (t) => {
      c = [{ roar: [0.35, 0.5], chance: 0.05, amp: 0.035 }, { roar: [0.4, 0.62], chance: 0.13, amp: 0.055 }, { roar: [0.55, 0.85], chance: 0.22, amp: 0.07 }][t];
      ramp(roarF.frequency, [300, 360, 480][t]); ramp(siz.gain, [0.03, 0.02, 0.03][t]);
    };
  },
  // a sea that breathes: each wave is its own swell that opens up as it breaks, then a long hush of foam
  wave(g) {
    const far = filt('lowpass', 240, 0.5), fg = gain(0.28); src(brownBuf).connect(far).connect(fg).connect(g);
    const foamBus = filt('lowpass', 6500, 0.5); foamBus.connect(g);
    let c = { period: 8, amp: 0.55, open: 1300, rise: 2.6, foam: 0.07 };
    every('wave', () => c.period * rand(0.8, 1.25) * 1000, () => {
      const pan = rand(-0.25, 0.25);
      swell(g, { rise: c.rise * rand(0.85, 1.15), fall: c.rise * 0.9, amp: c.amp * rand(0.75, 1), buf: brownBuf, f0: 180, f1: c.open, f2: 350, pan });
      setTimeout(() => swell(foamBus, { rise: 0.5, fall: c.rise * 0.7, amp: c.foam * rand(0.7, 1), buf: pinkBuf, f0: 1500, f1: 4500, f2: 2200, q: 0.4, pan: -pan }), c.rise * 900);
    });
    return (t) => {
      c = [{ period: 4.5, amp: 0.4, open: 800, rise: 1.4, foam: 0.035 }, { period: 8, amp: 0.55, open: 1200, rise: 2.6, foam: 0.06 }, { period: 7, amp: 0.7, open: 1700, rise: 2.1, foam: 0.1 }][t];
      ramp(fg.gain, [0.2, 0.28, 0.34][t]);
    };
  },
  // a spring breeze in the trees: soft gusts that wander in loudness and colour, leaves rustling along with them
  wind(g) {
    const bodyF = filt('bandpass', 520, 0.45), gust = gain(0.5); src(pinkBuf).connect(bodyF).connect(gust).connect(g);
    src(brownBuf).connect(filt('lowpass', 280, 0.5)).connect(gain(0.35)).connect(gust);
    const leaves = gain(0.04); src(whiteBuf).connect(filt('highpass', 3200, 0.5)).connect(filt('lowpass', 7000, 0.5)).connect(leaves).connect(gust);
    let c = { g: [0.35, 0.75], f: [450, 850] };
    drift(gust.gain, () => c.g, [1.8, 4], 'wind'); drift(bodyF.frequency, () => c.f, [2, 5], 'wind');
    return (t) => {
      c = [{ g: [0.25, 0.5], f: [380, 650] }, { g: [0.35, 0.75], f: [450, 850] }, { g: [0.45, 1], f: [400, 1100] }][t];
      ramp(leaves.gain, [0.02, 0.04, 0.06][t]);
    };
  },
  // steady rain on leaves and a roof: a soft hiss, a low body, and a dense haze of tiny muffled drops
  rain(g) {
    const hissF = filt('lowpass', 3600, 0.5), hiss = gain(0.4); src(pinkBuf).connect(filt('highpass', 380, 0.5)).connect(hissF).connect(hiss).connect(g);
    const roof = gain(0.18); src(brownBuf).connect(filt('lowpass', 520, 0.5)).connect(roof).connect(g);
    const drops = filt('lowpass', 6000, 0.5); drops.connect(g);
    let c = { per: 2, amp: 0.025, tap: 0.08 };
    every('rain', () => 60, () => {
      for (let i = 0; i < c.per; i++) grain(drops, { at: rand(0, 0.06), attack: 0.0015, decay: rand(0.003, 0.008), f: rand(2400, 5200), q: 0.9, amp: c.amp * rand(0.3, 1), pan: rand(-0.5, 0.5) });
      if (Math.random() < c.tap) grain(drops, { attack: 0.003, decay: 0.02, f: rand(700, 1300), q: 1.2, amp: 0.03, pan: rand(-0.4, 0.4) });   // a heavier drop on a leaf
    });
    return (t) => {
      c = [{ per: 1, amp: 0.018, tap: 0.04 }, { per: 2, amp: 0.024, tap: 0.08 }, { per: 4, amp: 0.026, tap: 0.12 }][t];
      ramp(hiss.gain, [0.22, 0.4, 0.62][t]); ramp(hissF.frequency, [3000, 3600, 4400][t]); ramp(roof.gain, [0.1, 0.18, 0.3][t]);
    };
  },

  /* ---------- 도심 ---------- */
  // a pour-over at the counter: a thin stream that wanders in pitch, round drops into the cup, a warm room
  coffee(g) {
    const streamF = filt('bandpass', 900, 2.2), stream = gain(0.1); src(pinkBuf).connect(streamF).connect(filt('lowpass', 2800, 0.5)).connect(stream).connect(g);
    src(brownBuf).connect(filt('lowpass', 220, 0.5)).connect(gain(0.08)).connect(g);
    let c = { s: [0.05, 0.12], f: [700, 1150], drip: [1.5, 4] };
    drift(stream.gain, () => c.s, [0.8, 2], 'coffee'); drift(streamF.frequency, () => c.f, [0.6, 1.6], 'coffee');
    every('coffee', () => rand(...c.drip) * 1000, () => {
      const f = rand(420, 620), pan = rand(-0.15, 0.15);
      tone(g, { f, to: f * 1.6, attack: 0.004, decay: 0.05, amp: 0.035, pan });   // a drop rises in pitch as it lands
      grain(g, { attack: 0.002, decay: 0.01, f: f * 3, q: 2, amp: 0.012, pan });
    });
    return (t) => {
      c = [{ s: [0, 0.02], f: [700, 1000], drip: [0.9, 2] }, { s: [0.05, 0.12], f: [700, 1150], drip: [1.5, 4] }, { s: [0.14, 0.26], f: [500, 900], drip: [4, 8] }][t];
    };
  },
  // a night train from inside the carriage: a low rolling rumble, a gentle sway, and soft muffled rail joints
  train(g) {
    const rumF = filt('lowpass', 140, 0.5), rum = gain(0.55); src(brownBuf).connect(rumF).connect(rum).connect(g);
    src(pinkBuf).connect(filt('lowpass', 650, 0.5)).connect(gain(0.05)).connect(g);   // the air inside the carriage
    lfo(0.16, 0.06, rum.gain);
    const joints = filt('lowpass', 200, 0.7); const jg = gain(1); joints.connect(jg).connect(g);
    let c = { gap: 1.25, amp: 0.2 };
    every('train', () => c.gap * rand(0.95, 1.05) * 1000, () => {
      for (const [at, a] of [[0, 1], [0.14, 0.8]]) { grain(joints, { at, attack: 0.012, decay: 0.05, type: 'lowpass', f: 180, q: 0.7, amp: c.amp * a, buf: brownBuf }); tone(joints, { at, f: 70, to: 55, attack: 0.012, decay: 0.06, amp: c.amp * 0.25 * a }); }
    });
    return (t) => {
      c = [{ gap: 1.6, amp: 0.08 }, { gap: 1.25, amp: 0.18 }, { gap: 1.05, amp: 0.26 }][t];
      ramp(rumF.frequency, [110, 140, 175][t]); ramp(rum.gain, [0.4, 0.55, 0.7][t]);
    };
  },
  // a soft, deep keyboard: rounded 'thock' keys in short words, a deeper space bar, thinking pauses
  typing(g) {
    src(brownBuf).connect(filt('lowpass', 300, 0.5)).connect(gain(0.03)).connect(g);   // the quiet room
    const keys = filt('lowpass', 3200, 0.5); keys.connect(g);
    let rate = 1, left = 0;
    (function loop() {
      let wait = rand(110, 190);
      if (levels.typing > 0) {
        const pan = rand(-0.2, 0.2);
        if (left <= 0) {   // end of a word: the space bar, then a breath
          grain(keys, { attack: 0.003, decay: 0.02, f: 650, q: 1.2, amp: 0.05, pan }); tone(keys, { f: 150, attack: 0.003, decay: 0.03, amp: 0.035, pan });
          left = 2 + Math.floor(rand(0, 6)); wait = Math.random() < 0.12 ? rand(1400, 3000) : rand(260, 520);
        } else {
          const f = rand(1000, 1500);
          grain(keys, { attack: 0.0018, decay: 0.009, f, q: 1.4, amp: rand(0.035, 0.05), pan }); tone(keys, { f: rand(190, 240), attack: 0.002, decay: 0.018, amp: 0.025, pan });
          left--;
        }
      }
      setTimeout(loop, wait / rate);
    })();
    return (t) => { rate = [0.6, 1, 1.45][t]; };
  },
  // turning pages in a quiet library: a soft sweep as the page lifts, then a hushed settle as it lands
  page(g) {
    src(pinkBuf).connect(filt('bandpass', 600, 0.5)).connect(gain(0.025)).connect(g);   // the quiet room
    let gap = 5;
    every('page', () => rand(0.6, 1.4) * gap * 1000, () => {
      const pan = rand(-0.3, 0.3);
      swell(g, { rise: rand(0.12, 0.2), fall: 0.16, amp: 0.07, buf: whiteBuf, f0: 1100, f1: rand(2600, 3600), f2: 1400, q: 0.6, pan });
      for (let i = 0; i < 4; i++) grain(g, { at: rand(0.02, 0.25), attack: 0.004, decay: 0.012, f: rand(3500, 5500), q: 0.8, amp: 0.008, pan });
      setTimeout(() => swell(g, { rise: 0.05, fall: 0.1, amp: 0.05, buf: pinkBuf, f0: 300, f1: 800, f2: 400, q: 0.5, pan: pan * 0.5 }), rand(320, 420));
    });
    return (t) => { gap = [9, 5, 2.6][t]; };
  },

  /* ---------- 노이즈 ---------- */
  // a desk fan: a smooth airy whoosh with only a hint of the blades, and a low motor far underneath
  fan(g) {
    const airF = filt('lowpass', 1000, 0.5), air = gain(0.55); src(pinkBuf).connect(airF).connect(air).connect(g);
    src(brownBuf).connect(filt('lowpass', 240, 0.5)).connect(gain(0.3)).connect(air);
    const blade = lfo(6, 0.02, air.gain);
    const motor = ctx.createOscillator(); motor.frequency.value = 60; const mg = gain(0.012); motor.connect(filt('lowpass', 200, 0.5)).connect(mg).connect(g); motor.start();
    return (t) => { ramp(airF.frequency, [650, 1000, 1500][t]); ramp(air.gain, [0.4, 0.55, 0.72][t]); ramp(blade.o.frequency, [4, 6, 8][t]); };
  },
  // inside a plane at night: the deep, even roar of the cabin, the vents, and the engines' faint drone
  cabin(g) {
    const lp = filt('lowpass', 420, 0.5), lv = gain(0.75); src(brownBuf).connect(lp).connect(lv).connect(g);
    src(pinkBuf).connect(filt('bandpass', 950, 0.4)).connect(gain(0.035)).connect(g);
    const drone = ctx.createOscillator(); drone.frequency.value = 96; const dg = gain(0.006); drone.connect(dg).connect(g); drone.start();
    lfo(0.03, 1.2, drone.frequency);
    return (t) => { ramp(lp.frequency, [280, 420, 600][t]); ramp(lv.gain, [0.6, 0.75, 0.9][t]); };
  },
  // an old radio between stations: a soft hiss whose colour slowly drifts, and only the faintest crackle
  static(g) {
    const bp = filt('bandpass', 1800, 0.5), top = filt('lowpass', 4500, 0.5), sg = gain(0.3); src(pinkBuf).connect(bp).connect(top).connect(sg).connect(g);
    let c = { f: [1300, 2400], chance: 0.05, amp: 0.012 };
    drift(bp.frequency, () => c.f, [3, 7], 'static');
    every('static', () => 90, () => { if (Math.random() < c.chance) grain(g, { attack: 0.0015, decay: 0.004, f: rand(2500, 4500), q: 0.8, amp: c.amp * rand(0.5, 1), pan: rand(-0.4, 0.4) }); });
    return (t) => {
      c = [{ f: [900, 1700], chance: 0, amp: 0 }, { f: [1300, 2400], chance: 0.05, amp: 0.012 }, { f: [1800, 3200], chance: 0.1, amp: 0.016 }][t];
      ramp(top.frequency, [3000, 4500, 6000][t]); ramp(sg.gain, [0.26, 0.3, 0.36][t]);
    };
  },
  // a fridge at night: a low mains hum and a compressor that slowly comes on and off
  hum(g) {
    const hg = gain(0.1);
    for (const [f, a] of [[60, 1], [120, 0.45], [180, 0.12]]) { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(gain(a)).connect(hg); o.start(); }
    hg.connect(filt('lowpass', 400, 0.5)).connect(g);
    const body = gain(0.3); src(brownBuf).connect(filt('lowpass', 180, 0.5)).connect(body).connect(g);
    let level = 0.1;
    (function cycle(on) {   // on for a while, off for a while, never switching abruptly
      hg.gain.setTargetAtTime(on ? level : level * 0.25, ctx.currentTime, 3);
      setTimeout(() => cycle(!on), (on ? rand(30, 50) : rand(15, 25)) * 1000);
    })(true);
    return (t) => { level = [0.06, 0.1, 0.15][t]; ramp(hg.gain, level, 1); ramp(body.gain, [0.2, 0.3, 0.42][t]); };
  },
};

// how loud each sound sits next to the others, measured so that no single one jumps out of a mix
// broadband beds sit near -31 dB, the low rumbles a little higher (low sound feels quieter), sparse ones by their events
const TRIM = { fire: 0.25, wave: 0.38, wind: 0.42, rain: 0.54, coffee: 1.17, train: 0.44, typing: 1.78, page: 3.5, fan: 0.4, cabin: 0.28, static: 1.24, hum: 0.4 };

// a sound goes two ways: most of it through a 3D panner that places it around the head, and a little straight out,
// which keeps its stereo width (a panner folds its input to mono). Behind the head it also dulls and drops slightly.
const WET = 1.1, DRY = 0.14;
function space(g) {
  const dry = gain(DRY); g.connect(dry).connect(master);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.rolloffFactor = 0;
  // HRTF alone barely moves low sounds like waves and hum, so a plain left-right pan makes the turn easy to hear
  const lr = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1), back = filt('lowpass', 20000, 0.5), wet = gain(WET);
  g.connect(p).connect(lr).connect(back).connect(wet).connect(master);
  return { p, lr, back, wet };
}
function setPlace(t, x, y, z) {
  const n = ctx.currentTime, len = Math.hypot(x, y, z) || 1, X = x / len, Y = y / len, Z = z / len, s = t.space, tau = 0.05;
  if (s.p.positionX) { s.p.positionX.setTargetAtTime(X, n, tau); s.p.positionY.setTargetAtTime(Y, n, tau); s.p.positionZ.setTargetAtTime(Z, n, tau); }
  else s.p.setPosition(X, Y, Z);
  const behind = clamp(Z, 0, 1);
  s.lr.pan?.setTargetAtTime(X * 0.72, n, tau);
  s.back.frequency.setTargetAtTime(20000 * Math.pow(1900 / 20000, behind), n, tau);
  s.wet.gain.setTargetAtTime(WET * (1 - 0.34 * behind), n, tau);
}
function ensure(id) {
  if (!ctx || tracks[id] || !BUILD[id]) return;
  const g = gain(0), s = space(g);
  const apply = BUILD[id](g);
  tracks[id] = { g, apply, space: s }; apply(textures[id] ?? 1);
  const at = places[id] || [0, 0, -1]; setPlace(tracks[id], at[0], at[1], at[2]);
}
// sounds come in and leave slowly, so moving a slider never starts anything with a jolt
function update(id) { ensure(id); const t = tracks[id]; if (t) t.g.gain.setTargetAtTime((levels[id] || 0) * OUT * (TRIM[id] ?? 1), ctx.currentTime, 0.25); }

export const sound = {
  get ready() { return !!ctx; },
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // the sleep master: the very top is rounded off, and a gentle leveller keeps the mix from ever jumping
      master = gain(1);
      const soften = filt('lowpass', 9500, 0.5), level = ctx.createDynamicsCompressor();
      level.threshold.value = -26; level.knee.value = 12; level.ratio.value = 2.5; level.attack.value = 0.02; level.release.value = 0.4;
      master.connect(soften).connect(level).connect(gain(1.25)).connect(ctx.destination); buffers();
      Object.keys(levels).forEach(update);
    } catch (e) { ctx = null; }
  },
  setLevel(id, v) { levels[id] = clamp(v, 0, 1); if (ctx) update(id); },
  setTexture(id, t) { textures[id] = t; if (tracks[id]) tracks[id].apply(t); },
  texture(id) { return textures[id] ?? 1; },
  place(id, x, y, z) { places[id] = [x, y, z]; if (tracks[id]) setPlace(tracks[id], x, y, z); },
  fadeTo(v, seconds = 1) { if (!ctx) return; const p = master.gain, now = ctx.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(v, now + seconds); },
};
