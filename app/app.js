import { THREE, U, MO, reduceMotion, clamp, TRACKS, COMBOS, SINGLE, COMBO_SHAPES, DEFORM, NEW_TRACKS, NEW_SHAPES, CITY_COMBOS, NOISE_COMBOS, dreamMat } from './shapes.js';
import { sound } from './sound.js';

const $ = (s) => document.querySelector(s);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), V2 = (x, y) => new THREE.Vector2(x, y);
const store = {
  get(k, d) { try { const v = localStorage.getItem('onda:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('onda:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: keep going without it */ } },
};

/* ---------- icons (Phosphor) ---------- */
const P = {
  squares: 'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
  moon: 'M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z',
  sun: 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
  list: 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z',
  back: 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z',
  up: 'M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z',
  sparkle: 'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z',
  timer: 'M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z',
  plus: 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z',
  check: 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
  prev: 'M208,47.88V208.12a16,16,0,0,1-24.43,13.43L64,146.77V216a8,8,0,0,1-16,0V40a8,8,0,0,1,16,0v69.23L183.57,34.45A15.95,15.95,0,0,1,208,47.88Z',
  next: 'M208,40V216a8,8,0,0,1-16,0V146.77L72.43,221.55A15.95,15.95,0,0,1,48,208.12V47.88A15.95,15.95,0,0,1,72.43,34.45L192,109.23V40a8,8,0,0,1,16,0Z',
  pause: 'M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z',
  play: 'M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z',
};
const icon = (n) => `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="${P[n]}"/></svg>`;
document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
const setIcon = (el, n) => { el.querySelector('svg')?.remove(); el.insertAdjacentHTML('afterbegin', icon(n)); };

/* ---------- the three themes ---------- */
const TEXTURES = {
  fire: ['잔잔한 불씨', '타닥타닥', '활활'], wave: ['잔물결', '넘실', '철썩'], wind: ['산들', '솔솔', '휘잉'], rain: ['가랑비', '빗소리', '소나기'],
  coffee: ['한 방울씩', '졸졸', '콸콸'], train: ['멀리서', '덜컹덜컹', '가까이'], typing: ['천천히', '톡톡', '빠르게'], page: ['가끔', '사락사락', '자주'],
  fan: ['미풍', '약풍', '강풍'], cabin: ['낮게', '웅', '깊게'], static: ['사르르', '지직', '치익'], hum: ['조용히', '웅', '묵직하게'],
};
const THEMES = {
  nature: { name: '자연', tracks: TRACKS, combo: (k) => COMBOS[k] && { ...COMBOS[k], shape: COMBO_SHAPES[k] }, single: (id) => SINGLE[id], deform: (id) => DEFORM[id] },
  city: { name: '도심', tracks: NEW_TRACKS.filter((t) => t.theme === 'city'), combo: (k) => CITY_COMBOS.find((c) => c.key === k), single: (id) => NEW_SHAPES[id], deform: () => DEFORM.combo },
  noise: { name: '노이즈', tracks: NEW_TRACKS.filter((t) => t.theme === 'noise'), combo: (k) => NOISE_COMBOS.find((c) => c.key === k && !c.skip), single: (id) => NEW_SHAPES[id], deform: () => DEFORM.combo },
};
for (const th of Object.values(THEMES)) {
  th.ids = th.tracks.map((t) => t.id);
  th.keys = [];
  for (let m = 1; m < 16; m++) th.keys.push(th.ids.filter((_, i) => m & (1 << i)).join('+'));
  th.keys.sort((a, b) => a.split('+').length - b.split('+').length);
}
const themeOf = (key) => Object.keys(THEMES).find((t) => THEMES[t].ids.includes(key.split('+')[0]));
const isCombo = (key) => key.includes('+');
const defFor = (key) => { const th = THEMES[themeOf(key)]; return isCombo(key) ? th.combo(key) : th.tracks.find((t) => t.id === key); };
const nameFor = (key) => (isCombo(key) ? defFor(key).name : defFor(key).ko);
const koOf = (id) => defFor(id).ko;
const thumb = (key) => `thumbs/${key.replace(/\+/g, '_')}.webp`;

const PRESETS = {
  nature: [{ name: '잠들기 전', icon: 'wind+rain', levels: { wind: 0.4, rain: 0.7 } }, { name: '책 읽는 밤', icon: 'fire+rain', levels: { fire: 0.3, rain: 0.55 } }, { name: '바닷가 산책', icon: 'fire+wave+wind', levels: { fire: 0.46, wave: 0.64, wind: 0.38 } }],
  city: [{ name: '카페에서', icon: 'coffee+page', levels: { coffee: 0.46, page: 0.64 } }, { name: '작업할 때', icon: 'coffee+typing', levels: { coffee: 0.4, typing: 0.58 } }, { name: '밤 기차 기다리기', icon: 'coffee+train+typing', levels: { coffee: 0.3, train: 0.62, typing: 0.34 } }],
  noise: [{ name: '깊은 잠', icon: 'fan+static+hum', levels: { fan: 0.4, static: 0.3, hum: 0.5 } }, { name: '비행 중', icon: 'cabin+static', levels: { cabin: 0.52, static: 0.66 } }, { name: '한여름 밤', icon: 'fan+hum', levels: { fan: 0.6, hum: 0.45 } }],
};

/* ---------- state ---------- */
const state = {
  theme: store.get('theme', 'nature'),
  levels: { nature: {}, city: {}, noise: {} },
  found: store.get('found', { nature: [], city: [], noise: [] }),
  saved: store.get('presets', []),
  preset: null, timerEnd: 0, timerMin: 0, paused: false,
};
if (!THEMES[state.theme]) state.theme = 'nature';
document.documentElement.dataset.onda = state.theme;
const theme = () => THEMES[state.theme];
const levels = () => state.levels[state.theme];
const presetsOf = (t) => [...PRESETS[t], ...state.saved.filter((p) => p.theme === t)];

/* ---------- renderer ---------- */
const stage = $('#stage'), canvas = $('#gl'), halo = $('.halo');
let renderer = null;
try {
  // the silhouettes already dissolve into the air, so phones can skip multisampling
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !matchMedia('(pointer: coarse)').matches, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // the objects are soft and slightly blurred; 1.5x looks the same and costs far less renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping;
} catch (e) { renderer = null; }   // no WebGL: the mixer, menus and sound still work
const scene = new THREE.Scene();
const CAM_Z = 8, TAN = Math.tan(THREE.MathUtils.degToRad(15));
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60); camera.position.set(0, 0, CAM_Z);
let VW = 2, VH = 2, BASE = 0.8;
const CENTER = V3(0, 0, 0);
function size() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer?.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  VH = TAN * CAM_Z; VW = VH * camera.aspect;
  BASE = Math.min(VW * 0.95, VH * 0.74) / 1.4;
  CENTER.set(0, VH * 0.1, 0);
}
new ResizeObserver(size).observe(stage); size();

/* ---------- objects: launched by a slider, merged into one form ---------- */
const geoCache = {};
function geoFor(key) {
  if (!geoCache[key]) { const g = isCombo(key) ? defFor(key).shape() : THEMES[themeOf(key)].single(key)(); g.computeBoundingBox(); g.computeBoundingSphere(); geoCache[key] = g; }
  return geoCache[key];
}
// shapes are built in a background worker so the screen never waits for them; without a worker they build here
let geoWorker = null;
const geoWaiting = {};
function geoFallback() { geoWorker = null; for (const k of Object.keys(geoWaiting)) { const cbs = geoWaiting[k]; delete geoWaiting[k]; try { geoFor(k); cbs.forEach((cb) => cb()); } catch (e) { /* skip a shape that fails */ } } }
try {
  if (typeof GEO_WORKER_SRC === 'string' && window.Worker) {
    const q = matchMedia('(pointer: coarse)').matches ? 0.55 : 0.72;
    geoWorker = new Worker(URL.createObjectURL(new Blob([GEO_WORKER_SRC.replace('__GEO_Q__', q)], { type: 'text/javascript' })), { type: 'module' });
    geoWorker.onmessage = ({ data }) => {
      const cbs = geoWaiting[data.key] || []; delete geoWaiting[data.key];
      if (data.error) { try { geoFor(data.key); } catch (e) { return; } }
      else if (!geoCache[data.key]) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(data.nor, 3));
        if (data.idx) g.setIndex(new THREE.BufferAttribute(data.idx, 1));
        g.computeBoundingBox(); g.computeBoundingSphere(); geoCache[data.key] = g;
      }
      cbs.forEach((cb) => cb());
    };
    geoWorker.onerror = geoFallback;
  }
} catch (e) { geoWorker = null; }
function withGeo(key, cb) {
  if (geoCache[key]) return cb();
  if (!geoWorker) { try { geoFor(key); } catch (e) { return; } return cb(); }
  if (geoWaiting[key]) { geoWaiting[key].push(cb); return; }
  geoWaiting[key] = [cb]; geoWorker.postMessage({ key });
}
const ents = []; let main = null;
function makeEntity(key) {
  const def = defFor(key), geo = geoFor(key), amp = { value: 0.6 }, hit = { value: 0 };
  const deform = isCombo(key) ? DEFORM.combo : (THEMES[themeOf(key)].deform(key) || DEFORM.combo);
  const mesh = new THREE.Mesh(geo, dreamMat(def, geo, { deform, amp, hit }));
  const bs = geo.boundingSphere, fit = new THREE.Group();
  fit.add(mesh); fit.scale.setScalar(1 / bs.radius); fit.position.copy(bs.center).multiplyScalar(-1 / bs.radius);
  const spin = new THREE.Group(); spin.add(fit);
  const holder = new THREE.Group(); holder.add(spin); scene.add(holder);
  const e = { key, holder, spin, mesh, amp, hit, p: V3(0, 0, 0), v: V3(0, 0, 0), s: 0, sv: 0, ts: 0, target: V3(0, 0, 0), mode: 'main', t: 0, phase: Math.random() * 6, hop: 0, hopV: 0, sq: 0, sqv: 0 };
  ents.push(e); return e;
}
function removeEntity(e) { scene.remove(e.holder); e.mesh.material.dispose(); ents.splice(ents.indexOf(e), 1); }
const activeKey = () => theme().ids.filter((id) => (levels()[id] || 0) > 0).join('+');
const slotX = (id) => (-0.36 + 0.24 * Math.max(0, theme().ids.indexOf(id))) * VW;
function mainScale() {
  const on = theme().ids.filter((id) => (levels()[id] || 0) > 0); if (!on.length) return 0;
  const avg = on.reduce((a, id) => a + levels()[id], 0) / on.length;
  return BASE * (0.78 + 0.28 * avg) * (1 + 0.1 * (on.length - 1));
}
function launch(id) {
  withGeo(id, () => {
    if (!((levels()[id] || 0) > 0) || !theme().ids.includes(id)) return;   // switched off or another theme while it was being built
    const e = makeEntity(id);
    e.mode = 'launch'; e.p.set(slotX(id), -VH - BASE * 0.6, 0.2); e.v.set(0, 6 * MO + 2, 0);
    e.s = BASE * 0.35; e.ts = BASE * 0.62;
  });
}
function eject(id) {
  ents.filter((e) => e.mode === 'launch' && e.key === id).forEach((e) => { e.mode = 'leave'; });
  if (geoCache[id]) { const e = makeEntity(id); e.mode = 'leave'; e.p.copy(main ? main.p : CENTER); e.s = BASE * 0.3; e.ts = BASE * 0.55; e.v.set(0, -1.5, 0); }
  reform();
}
function arrive(e) {
  const key = activeKey();
  if (!key.split('+').includes(e.key)) { e.mode = 'leave'; return; }
  if (main && main.key === key) { absorb(e, main); bump(main); return; }
  if (!main && key === e.key) { e.mode = 'main'; main = e; setCaption(key); discover(key); return; }
  absorb(e, null); reform();
}
function reform() {
  const key = activeKey();
  if (main && main.key === key) return;
  if (main) { absorb(main, null); main = null; }
  if (!key) { setCaption(''); return; }
  if (ents.some((e) => e.mode === 'launch') && !isCombo(key)) return;
  setCaption(key); discover(key);
  withGeo(key, () => {
    if (activeKey() !== key || (main && main.key === key)) return;
    if (main) absorb(main, null);
    main = makeEntity(key); main.p.copy(CENTER); main.s = 0; main.sv = 0; main.hit.value = 1;
  });
}
function absorb(e, into) { e.mode = 'absorb'; e.target.copy(into ? into.p : CENTER); e.ts = 0; }
function bump(m) { m.hit.value = Math.min(1, m.hit.value + 0.7); m.sv += 2.2 * MO; }
function clearObjects() { if (main) { absorb(main, null); main = null; } ents.filter((e) => e.mode === 'launch').forEach((e) => absorb(e, null)); }

/* ---------- soft bodies: size settles slowly like a cloud, shape wobbles like jelly ---------- */
// every raised button and notice is one small spring body; the loop runs only while something is moving
const moving = new Set(); let softRaf = 0, softLast = 0;
function softTick(now) {
  const dt = Math.min((now - softLast) / 1000, 1 / 30); softLast = now;
  for (const m of [...moving]) if (!m.step(dt)) moving.delete(m);
  softRaf = moving.size ? requestAnimationFrame(softTick) : 0;
}
function softWake(m) { moving.add(m); if (!softRaf) { softLast = performance.now(); softRaf = requestAnimationFrame(softTick); } }
const spring = (o, key, target, k, c, dt) => { const v = key + 'v'; o[v] += (k * (target - o[key]) - c * o[v]) * dt; o[key] += o[v] * dt; };
class Soft {
  constructor(el) { this.el = el; this.q = this.qv = this.zv = this.x = this.xv = this.y = this.yv = 0; this.z = 1; this.tq = this.tx = this.ty = 0; this.tz = 1; this.down = false; }
  get amt() { return this._amt ??= clamp(90 / (this.el.offsetHeight || 90), 0.35, 1); }   // a big card moves less than a small pill
  stop() { this.el.style.transform = ''; this.el.classList.remove('soft-live'); this.z = 1; this.q = this.x = this.y = this.zv = this.qv = this.xv = this.yv = 0; return false; }
  step(dt) {
    if (this.el.hidden || !this.el.isConnected) return this.stop();
    for (let i = 0; i < 2; i++) {
      const h = dt / 2;
      if (this.down) { spring(this, 'z', this.tz, 620, 34, h); spring(this, 'q', this.tq, 620, 30, h); spring(this, 'x', this.tx, 420, 28, h); spring(this, 'y', this.ty, 420, 28, h); }
      else { spring(this, 'z', this.tz, 130, 13, h); spring(this, 'q', 0, 240, 7.5, h); spring(this, 'x', 0, 170, 10, h); spring(this, 'y', 0, 170, 10, h); }
    }
    const ax = Math.abs(this.x) * 0.006, ay = Math.abs(this.y) * 0.006;
    this.el.style.transform = `translate(${this.x.toFixed(2)}px,${this.y.toFixed(2)}px) skewX(${(this.x * 0.3).toFixed(2)}deg) scale(${(this.z * (1 + this.q + ax - ay)).toFixed(4)},${(this.z * (1 - this.q + ay - ax)).toFixed(4)})`;
    const still = Math.abs(this.z - this.tz) + Math.abs(this.q) + Math.abs(this.x) / 20 + Math.abs(this.y) / 20 + Math.abs(this.zv) + Math.abs(this.qv) < 0.002;
    if (still && !this.down && this.tz === 1) return this.stop();
    return !(still && !this.down);   // a hovered body rests at its swell, holding its transform
  }
  live() { this.el.classList.add('soft-live'); softWake(this); return this; }
}
const softs = new WeakMap();
const softOf = (el) => softs.get(el) || (softs.set(el, new Soft(el)), softs.get(el));
// a notice or popup puffs in: small and wide, then it fills out and wobbles to rest
function softArrive(el, size = 1) {
  if (reduceMotion) return;
  const s = softOf(el); el.style.transformOrigin = el.classList.contains('pop') ? '' : '50% 50%';
  s.down = false; s.tz = 1; s.z = 1 - 0.3 * size; s.zv = 0; s.q = 0.13 * size; s.qv = 0; s.live();
}
function softKick(el) { if (reduceMotion) return; const s = softOf(el); s.qv -= 1.5 * s.amt; s.zv += 0.5 * s.amt; s.live(); }
if (!reduceMotion) {
  const SOFT_BODY = '.press, .float, .tile.raised, .hill, .round, .controls button, .icon-btn';
  const rub = (d, amt) => Math.sign(d) * (1 - 1 / (Math.abs(d) / 70 + 1)) * 16 * amt;   // follows the finger, less and less
  let held = null, sx = 0, sy = 0;
  let rect = null, last = null, queued = false;
  const glow = (el, e) => { el.style.setProperty('--gx', `${(clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100).toFixed(0)}%`); el.style.setProperty('--gy', `${(clamp((e.clientY - rect.top) / rect.height, 0, 1) * 100).toFixed(0)}%`); };
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.(SOFT_BODY); if (!el) return;
    const s = softOf(el); rect = el.getBoundingClientRect(); glow(el, e);
    el.style.transformOrigin = `${el.style.getPropertyValue('--gx')} ${el.style.getPropertyValue('--gy')}`; el.classList.add('soft-held');
    s.down = true; s.tz = 1 - 0.05 * s.amt; s.tq = 0.04 * s.amt; s.tx = s.ty = 0; held = s; sx = e.clientX; sy = e.clientY; s.live();
  }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (!held) return;
    held.tx = rub(e.clientX - sx, held.amt); held.ty = rub(e.clientY - sy, held.amt);
    last = e; if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; if (held) glow(held.el, last); }); }
  }, { passive: true });
  const letGo = () => {
    if (!held) return; const s = held; held = null;
    s.down = false; s.tz = 1; s.tq = 0; s.tx = s.ty = 0; s.qv -= 1.6 * s.amt; s.zv += 0.7 * s.amt; s.el.classList.remove('soft-held'); s.live();
  };
  window.addEventListener('pointerup', letGo); window.addEventListener('pointercancel', letGo);
  // a mouse swells the surface a little as it passes over
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return; const el = e.target.closest?.(SOFT_BODY); if (!el || el.contains(e.relatedTarget)) return;
    const s = softOf(el); if (s.down) return; el.style.transformOrigin = '50% 50%'; s.tz = 1 + 0.02 * s.amt; s.live();
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return; const el = e.target.closest?.(SOFT_BODY); if (!el || el.contains(e.relatedTarget)) return;
    const s = softOf(el); if (!s.down) { s.tz = 1; s.live(); }
  });
}
// the selection itself travels: the leading edge runs ahead, the trailing edge catches up, the blob thins as it stretches
class Glide {
  constructor(group, from, to) {
    this.group = group; this.from = from; this.g = document.createElement('i'); this.g.className = 'raised soft-glide'; this.g.setAttribute('aria-hidden', 'true');
    this.g.style.borderRadius = getComputedStyle(to).borderRadius;
    this.l = from.offsetLeft; this.r = this.l + from.offsetWidth; this.t = from.offsetTop; this.b = this.t + from.offsetHeight; this.lv = this.rv = this.tv = this.bv = 0;
    from.classList.add('soft-ghost'); group.prepend(this.g); this.aim(to);
  }
  aim(to) {
    this.to?.classList.remove('soft-ghost'); this.to = to; to.classList.add('soft-ghost');
    this.L = to.offsetLeft; this.W = to.offsetWidth; this.T = to.offsetTop; this.H = to.offsetHeight; this.dir = this.L + this.W / 2 > (this.l + this.r) / 2 ? 1 : -1;
    this.g.style.width = `${this.W}px`; this.g.style.height = `${this.H}px`; softWake(this);
  }
  end() { this.g.remove(); this.from.classList.remove('soft-ghost'); this.to.classList.remove('soft-ghost'); this.group._glide = null; return false; }
  step(dt) {
    if (!this.g.isConnected) return this.end();
    const L = this.L, R = L + this.W, T = this.T, B = T + this.H;
    for (let i = 0; i < 2; i++) {
      const h = dt / 2, lead = [300, 19], trail = [120, 13];
      spring(this, 'l', L, ...(this.dir < 0 ? lead : trail), h); spring(this, 'r', R, ...(this.dir > 0 ? lead : trail), h);
      spring(this, 't', T, 200, 15, h); spring(this, 'b', B, 200, 15, h);
    }
    const w = this.r - this.l, thin = Math.max(0, w - this.W) * 0.09, top = this.t + thin, bot = this.b - thin;
    this.g.style.transform = `translate(${this.l.toFixed(1)}px,${top.toFixed(1)}px) scale(${(w / this.W).toFixed(3)},${((bot - top) / this.H).toFixed(3)})`;
    if (Math.abs(this.l - L) + Math.abs(this.r - R) + Math.abs(this.t - T) + Math.abs(this.b - B) + Math.abs(this.lv) + Math.abs(this.rv) < 0.6) return this.end();
    return true;
  }
}
function glideTo(group, from, to) {
  if (reduceMotion || from === to) return;
  if (group._glide?.g.isConnected) { group._glide.aim(to); return; }
  if (!from) return;
  if (getComputedStyle(group).position === 'static') group.style.position = 'relative';
  group._glide = new Glide(group, from, to);
}

/* ---------- caption, halo, discoveries ---------- */
const caption = $('#caption'), capName = $('#capName'), capParts = $('#capParts'), capHint = $('#capHint');
let turnedOnce = store.get('turned', false), capKey = null, capTimer = 0;
function setCaption(key) {
  if (key === capKey) return; capKey = key;
  caption.classList.add('swap'); clearTimeout(capTimer);
  capTimer = setTimeout(() => {
    if (!key) { capName.textContent = '소리 하나를 켜보세요'; capParts.textContent = '슬라이더를 밀면 그 소리가 오브제로 떠올라요'; }
    else { capName.textContent = nameFor(key); capParts.textContent = isCombo(key) ? key.split('+').map(koOf).join(' + ') : ''; }
    capHint.hidden = !key || turnedOnce;
    caption.classList.remove('swap');
  }, 260);
  const def = key ? defFor(key) : null;
  halo.style.setProperty('--halo', def ? def.glowA : 'transparent');
  halo.style.setProperty('--halo-a', def ? 0.55 : 0);
  if (lockOpen) renderLock();
}
const toast = $('#toast'); let toastTimer = 0;
function discover(key) {
  const f = state.found[state.theme] || (state.found[state.theme] = []);
  if (f.includes(key)) return;
  f.push(key); store.set('found', state.found);
  $('#toastCount').textContent = `${f.length} / 15`;
  if (toast.hidden) { toast.hidden = false; softArrive(toast); } else softKick(toast);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

/* ---------- jelly sliders: a thin bar that swells into a drop at its value ---------- */
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
const rgb = (c, a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
const lerp = (a, b, k) => a + (b - a) * k;
function jellyPath(x0, xe, th, r, neck, cy) {
  const f = (v) => v.toFixed(2), k = 0.5523;
  if (th < 0.6 || xe - neck <= x0 + 1) return `M ${f(xe - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;
  const n0 = xe - neck, a = cy - th / 2, b = cy + th / 2, c1 = n0 + neck * 0.55, c2 = n0 + neck * 0.62;
  return `M ${f(x0)} ${f(a)} L ${f(n0)} ${f(a)} C ${f(c1)} ${f(a)} ${f(c2)} ${f(cy - r)} ${f(xe)} ${f(cy - r)} C ${f(xe + r * k)} ${f(cy - r)} ${f(xe + r)} ${f(cy - r * k)} ${f(xe + r)} ${f(cy)} `
    + `C ${f(xe + r)} ${f(cy + r * k)} ${f(xe + r * k)} ${f(cy + r)} ${f(xe)} ${f(cy + r)} C ${f(c2)} ${f(cy + r)} ${f(c1)} ${f(b)} ${f(n0)} ${f(b)} L ${f(x0)} ${f(b)} A ${f(th / 2)} ${f(th / 2)} 0 0 1 ${f(x0)} ${f(a)} Z`;
}
const sliders = {}, activeSliders = new Set();
let sid = 0;
class Jelly {
  constructor(track, value, onChange) {
    this.t = track; this.v = value; this.onChange = onChange; this.id = 'j' + (++sid);
    const A = hex(track.glowA), B = hex(track.glowB), body = hex(track.body);
    const start = mix(B, body, 0.5), end = mix(A, body, 0.45), core = mix(A, body, 0.2);
    this.el = document.createElement('div'); this.el.className = 'row';
    this.el.innerHTML = `<div class="row-head"><b>${track.label}</b><span>${track.ko}</span><span class="val"></span></div>
      <div class="track" role="slider" tabindex="0" aria-label="${track.ko} 볼륨" aria-valuemin="0" aria-valuemax="100" style="--glow:${rgb(A, 0.3)}">
        <svg><defs><linearGradient id="${this.id}g" x1="0" x2="1"><stop offset="0" stop-color="${rgb(start)}"/><stop offset="1" stop-color="${rgb(end)}"/></linearGradient>
        <radialGradient id="${this.id}r"><stop offset="0" stop-color="${rgb(core)}"/><stop offset=".6" stop-color="${rgb(mix(core, end, 0.6))}"/><stop offset="1" stop-color="${rgb(end)}" stop-opacity="0"/></radialGradient></defs>
        <rect class="rail" x="6" height="4" rx="2" style="fill:var(--rail)"/><g class="jelly" opacity=".9"><path fill="url(#${this.id}g)"/><circle fill="url(#${this.id}r)"/></g></svg></div>`;
    this.track = this.el.querySelector('.track'); this.svg = this.el.querySelector('svg'); this.path = this.el.querySelector('path'); this.core = this.el.querySelector('circle');
    this.rail = this.el.querySelector('.rail'); this.val = this.el.querySelector('.val');
    this.W = 300; this.end = null; this.endV = 0; this.touch = 0; this.touchV = 0; this.drag = false;
    new ResizeObserver(() => { this.W = this.track.clientWidth; if (this.W < 40) return; this.svg.setAttribute('viewBox', `0 0 ${this.W} 34`); this.rail.setAttribute('width', this.W - 12); this.rail.setAttribute('y', 15); if (this.end === null) this.end = this.target(); this.wake(); }).observe(this.track);
    this.text(); this.bind();
  }
  get x0() { return 8; } get x1() { return this.W - 16; }
  target() { return this.x0 + this.v * (this.x1 - this.x0); }
  levelAt(clientX) { const r = this.track.getBoundingClientRect(); return clamp((clientX - r.left - this.x0) / (this.x1 - this.x0), 0, 1); }
  text() { const p = Math.round(this.v * 100); this.val.textContent = p ? p : '꺼짐'; this.val.classList.toggle('off', !p); this.track.setAttribute('aria-valuenow', p); this.track.setAttribute('aria-valuetext', p ? p + '%' : '꺼짐'); }
  set(v, user = true) {
    v = clamp(v, 0, 1); if (v < 0.015) v = 0;
    const prev = this.v; this.v = v; this.text(); this.wake();
    if (user && prev !== v) this.onChange(v, prev);
  }
  wake() { activeSliders.add(this); }
  bind() {
    const t = this.track; let downX = 0, moved = false, longFired = false, timer = 0;
    t.addEventListener('pointerdown', (e) => {
      startAudio(); try { t.setPointerCapture(e.pointerId); } catch (_) {}
      downX = e.clientX; moved = false; longFired = false; this.drag = true; this.wake();
      clearTimeout(timer); timer = setTimeout(() => { if (!moved) { longFired = true; this.drag = false; openTexture(this); } }, 480);
    });
    t.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      if (!moved && Math.abs(e.clientX - downX) > 6) { moved = true; clearTimeout(timer); }
      if (moved) this.set(this.levelAt(e.clientX));
    });
    const up = (e) => { clearTimeout(timer); if (this.drag && !moved && !longFired && e.type === 'pointerup') this.set(this.levelAt(e.clientX)); this.drag = false; this.wake(); };
    t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[e.key];
      if (d) { e.preventDefault(); startAudio(); this.set(this.v + d); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTexture(this); }
    });
  }
  tick(dt) {
    const tgt = this.target(); if (this.end === null) this.end = tgt;
    const prev = this.end;
    this.endV += (-360 * (this.end - tgt) - 24 * this.endV) * dt; this.end += this.endV * dt;
    this.touchV += (-260 * (this.touch - (this.drag ? 1 : 0)) - 16 * this.touchV) * dt; this.touch += this.touchV * dt;
    const speed = Math.abs((this.end - prev) / Math.max(dt, 1e-3));
    const on = clamp((this.end - this.x0) / 14, 0, 1), tc = clamp(this.touch, 0, 1.3);
    const r = lerp(5, lerp(7, 10, tc) * (1 + Math.min(0.22, speed / 4000)), on);
    const neck = lerp(0, lerp(24, 34, tc) + Math.min(16, speed * 0.012), on), th = lerp(0, lerp(4, 6, tc), on);
    const xe = Math.max(this.end, this.x0 + r - 2);
    this.path.setAttribute('d', jellyPath(this.x0, xe, th, r, neck, 17));
    this.core.setAttribute('cx', xe.toFixed(2)); this.core.setAttribute('cy', 17); this.core.setAttribute('r', (r * 1.25).toFixed(2));
    this.svg.querySelector('.jelly').setAttribute('opacity', this.v === 0 && on < 0.05 ? 0.75 : 0.9);
    return this.drag || Math.abs(this.end - tgt) > 0.05 || Math.abs(this.endV) > 0.5 || Math.abs(this.touch - (this.drag ? 1 : 0)) > 0.003 || Math.abs(this.touchV) > 0.01;
  }
}
const rows = $('#rows');
function renderRows() {
  rows.innerHTML = ''; for (const k of Object.keys(sliders)) delete sliders[k];
  for (const t of theme().tracks) {
    const s = new Jelly(t, levels()[t.id] || 0, (v, prev) => onLevel(t.id, v, prev));
    sliders[t.id] = s; rows.appendChild(s.el);
  }
  rows.style.display = 'grid'; rows.style.gap = '6px';
}
function onLevel(id, v, prev) {
  levels()[id] = v; sound.setLevel(id, v); state.preset = null;
  if (prev === 0 && v > 0) launch(id); else if (prev > 0 && v === 0) eject(id);
  else if (main) main.hit.value = Math.max(main.hit.value, 0.18);
  if (lockOpen) renderLock();
}
function setLevels(map) { for (const id of theme().ids) sliders[id].set(map[id] || 0); }
$('#allOff').addEventListener('click', () => setLevels({}));

/* ---------- audio starts on the first touch ---------- */
function startAudio() { sound.init(); }
document.addEventListener('pointerdown', startAudio, { passive: true });
document.addEventListener('touchstart', () => {}, { passive: true });   // lets :active show on iOS

/* ---------- light and dark ---------- */
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function applyMode() { const d = isDark(); U.dark.value = d ? 1 : 0; setIcon($('#mode'), d ? 'sun' : 'moon'); $('#mode').setAttribute('aria-label', d ? '라이트 모드' : '다크 모드'); }
// the app opens in light; a choice made with the mode button is remembered
document.documentElement.dataset.theme = store.get('mode', 'light') === 'dark' ? 'dark' : 'light';
$('#mode').addEventListener('click', () => { const next = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = next; store.set('mode', next); applyMode(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyMode);
applyMode();

/* ---------- theme switch ---------- */
function setTheme(t, map) {
  if (t === state.theme && !map) return;
  for (const id of theme().ids) sound.setLevel(id, 0);
  clearObjects();
  state.theme = t; store.set('theme', t); document.documentElement.dataset.onda = t;
  if (map) state.levels[t] = { ...map };
  renderRows(); setCaption('');
  const on = theme().ids.filter((id) => (levels()[id] || 0) > 0);
  on.forEach((id, i) => { sound.setLevel(id, levels()[id]); setTimeout(() => launch(id), 160 + i * 140); });
  warm(t);
}

/* ---------- popups ---------- */
const veil = $('#veil'), menu = $('#menu'), tex = $('#texture');
let openPop = null;
function showPop(el) { closePop(); openPop = el; veil.hidden = false; el.hidden = false; softArrive(el, 0.45); if (el === menu) { $('#openMenu').setAttribute('aria-expanded', 'true'); $('#app').classList.add('menu-open'); } }
function closePop() {
  if (!openPop) return; openPop.hidden = true; veil.hidden = true;
  if (openPop === menu) { $('#openMenu').setAttribute('aria-expanded', 'false'); $('#app').classList.remove('menu-open'); collapseSave(); }
  if (openPop === tex && texFor) { texFor.el.classList.remove('lifted'); texFor = null; }
  openPop = null;
}
veil.addEventListener('click', closePop);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); closeCollection(); } });

// menu: theme, sleep timer, presets
$('#openMenu').addEventListener('click', () => { if (openPop === menu) return closePop(); renderMenu(); showPop(menu); });
function choice(label, on, onClick, cls = 'choice') {
  const b = document.createElement('button'); b.type = 'button'; b.className = `${cls} press ${on ? 'raised is-on' : 'flat'}`;
  b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on); b.innerHTML = label; b.addEventListener('click', onClick); return b;
}
function lift(group, btn) { glideTo(group, group.querySelector('[role=radio].is-on'), btn); group.querySelectorAll('[role=radio]').forEach((b) => { const on = b === btn; b.classList.toggle('raised', on); b.classList.toggle('flat', !on); b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); }); }
const levelText = (map, t) => THEMES[t].ids.filter((id) => map[id] > 0).map((id) => `${koOf(id)} ${Math.round(map[id] * 100)}`).join(', ');
function renderMenu() {
  const th = $('#themes'); th.innerHTML = '';
  for (const t of ['nature', 'city', 'noise']) {
    const b = choice(`<img src="thumbs/icon-${t}.webp" alt="">`, t === state.theme, () => { lift(th, b); setTheme(t); renderPresets(); }, 'theme-btn');
    b.setAttribute('aria-label', THEMES[t].name); th.appendChild(b);
  }
  renderTimerChoices($('#timerChoices'));
  renderPresets(); $('#saveHint').hidden = true;
}
// the same four choices live in the menu and in the lock screen list
function renderTimerChoices(box, after = () => {}) {
  box.innerHTML = '';
  for (const [label, m] of [['끄기', 0], ['15분', 15], ['30분', 30], ['1시간', 60]]) {
    const b = choice(label, state.timerMin === m, () => { lift(box, b); setTimer(m); after(); }); box.appendChild(b);
  }
}
function renderPresets() {
  const box = $('#presets'); box.innerHTML = '';
  for (const p of presetsOf(state.theme)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'preset' + (state.preset === p.name ? ' is-on' : '');
    b.innerHTML = `<img src="${thumb(p.icon)}" alt=""><span><b>${p.name}</b><small>${levelText(p.levels, state.theme)}</small></span>`;
    b.addEventListener('click', () => { applyPreset(p); closePop(); });
    box.appendChild(b);
  }
}
function applyPreset(p) { startAudio(); if (state.paused) togglePause(); setLevels(p.levels); state.preset = p.name; if (lockOpen) renderLock(); }

// save the current mix: the popup grows downward with a name and an icon
const saveExpand = $('#saveExpand'), saveOpen = $('#saveOpen');
let pickIcon = null;
$('#presetName').addEventListener('focus', (e) => e.target.select());
saveOpen.addEventListener('click', () => {
  const key = activeKey(), empty = !key, first = key || theme().ids[0];
  const pick = $('#iconPick'); pick.innerHTML = '';
  const opts = [first, ...theme().ids.filter((id) => id !== first), ...theme().keys.filter((k) => isCombo(k) && k !== first)].slice(0, 6);
  pickIcon = first;
  for (const k of opts) { const b = choice(`<img src="${thumb(k)}" alt="">`, k === first, () => { lift(pick, b); pickIcon = k; }, ''); b.setAttribute('aria-label', nameFor(k)); pick.appendChild(b); }
  const name = $('#presetName'); name.value = empty ? '' : nameFor(key); name.placeholder = '새 프리셋';
  // with every sound off there is nothing to keep: the panel still opens, says so, and saving waits
  $('#saveHint').hidden = !empty; $('#saveConfirm').disabled = empty;
  saveExpand.classList.add('open'); saveOpen.hidden = true;
  setTimeout(() => { menu.scrollTo({ top: menu.scrollHeight, behavior: 'smooth' }); }, 380);   // no autofocus: the keyboard would jump over the panel and the first focus stalls a frame for seconds
});
function collapseSave() { saveExpand.classList.remove('open'); saveOpen.hidden = false; $('#saveHint').hidden = true; }
$('#saveCancel').addEventListener('click', collapseSave);
$('#saveConfirm').addEventListener('click', () => {
  if (!activeKey()) return;
  const name = $('#presetName').value.trim() || nameFor(activeKey());
  const map = {}; theme().ids.forEach((id) => { if (levels()[id] > 0) map[id] = Math.round(levels()[id] * 100) / 100; });
  state.saved = state.saved.filter((p) => !(p.theme === state.theme && p.name === name));
  state.saved.push({ theme: state.theme, name, icon: pickIcon, levels: map }); store.set('presets', state.saved);
  state.preset = name; collapseSave(); renderPresets();
});
$('#presetName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#saveConfirm').click(); });

// 소리 결: long-press a slider and the choices rise above it
let texFor = null;
function openTexture(s) {
  texFor = s; const id = s.t.id;
  $('#texTitle').innerHTML = `${s.t.ko}<span>소리 결</span>`;
  const box = $('#texChoices'); box.innerHTML = '';
  TEXTURES[id].forEach((label, i) => { const b = choice(label, sound.texture(id) === i, () => { lift(box, b); sound.setTexture(id, i); if (main) bump(main); setTimeout(closePop, 420); }); box.appendChild(b); });
  showPop(tex); texFor = s; s.el.classList.add('lifted');
  const app = $('#app').getBoundingClientRect(), row = s.el.getBoundingClientRect();
  tex.style.top = Math.max(70, row.top - app.top - tex.offsetHeight - 10) + 'px';
}

/* ---------- sleep timer ---------- */
const pill = $('#timerPill'); let fading = false;
function setTimer(m) {
  state.timerMin = m; state.timerEnd = m ? Date.now() + m * 60000 : 0; fading = false;
  if (!m) { pill.hidden = true; sound.fadeTo(state.paused ? 0 : 1, 0.6); } else tickTimer();
}
function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function tickTimer() {
  if (!state.timerEnd) return;
  const left = state.timerEnd - Date.now();
  if (left <= 0 && !fading) {
    fading = true; sound.fadeTo(0, 20);   // the sound sinks away slowly instead of stopping
    setTimeout(() => { if (!fading) return; setLevels({}); state.timerMin = 0; state.timerEnd = 0; pill.hidden = true; fading = false; sound.fadeTo(1, 0.2); if (lockOpen) renderLock(); }, 20000);
  }
  if (pill.hidden) { pill.hidden = false; softArrive(pill); }
  $('#timerText').textContent = left > 0 ? `${fmt(left)} 뒤에 천천히 꺼져요` : '천천히 꺼지는 중';
  if (lockOpen) $('#lockSub').textContent = lockSub();
}
setInterval(tickTimer, 1000);
pill.addEventListener('click', () => { renderMenu(); showPop(menu); });

/* ---------- collection ---------- */
const col = $('#collection');
$('#openCollection').addEventListener('click', () => { renderCollection(); col.hidden = false; col.scrollTop = 0; });
$('#closeCollection').addEventListener('click', closeCollection);
function closeCollection() { col.hidden = true; }
const HILL_SPOTS = [[8, 10, 40], [54, 6, 32], [34, 40, 38], [8, 56, 26], [62, 44, 30], [74, 12, 22]];
function renderCollection() {
  const th = theme(), found = state.found[state.theme] || [];
  $('#colCount').textContent = `${found.length} / 15`;
  $('#colTitle').innerHTML = `15개 중 ${found.length}개를<br>찾았어요`;
  const box = $('#groups'); box.innerHTML = '';
  ['소리 하나', '소리 둘', '소리 셋', '소리 넷'].forEach((gname, gi) => {
    const keys = th.keys.filter((k) => k.split('+').length === gi + 1), have = keys.filter((k) => found.includes(k));
    const g = document.createElement('section'); g.className = 'group';
    const complete = have.length === keys.length && keys.length > 1;
    g.innerHTML = `<div class="group-head"><b>${gname}</b><span>${have.length} / ${keys.length}</span>${complete ? '<span>모두 모았어요</span>' : ''}</div>`;
    if (complete) {
      const hill = document.createElement('div'); hill.className = 'hill raised';
      hill.innerHTML = '<div class="inside"></div>' + `<div class="names">${keys.map(nameFor).join(', ')}</div>`;
      keys.forEach((k, i) => { const [x, y, w] = HILL_SPOTS[i % HILL_SPOTS.length]; hill.firstChild.insertAdjacentHTML('beforeend', `<img src="${thumb(k)}" alt="${nameFor(k)}" style="left:${x}%;top:${y}%;width:${w}%;animation-delay:${-i * 1.3}s;animation-duration:${5 + i}s">`); });
      g.appendChild(hill);
    } else {
      const tiles = document.createElement('div'); tiles.className = 'tiles';
      for (const k of keys) {
        const ok = found.includes(k), t = document.createElement('div');
        t.className = `tile ${ok ? 'raised' : 'sunken locked'}${gi === 3 ? ' wide' : ''}`;
        t.innerHTML = `<img src="${thumb(k)}" alt=""><b>${ok ? nameFor(k) : gi === 3 ? '네 가지 소리를 모두 켜면 나타나요' : '미발견'}</b>`;
        tiles.appendChild(t);
      }
      g.appendChild(tiles);
    }
    box.appendChild(g);
  });
}

/* ---------- swipe up: the app goes away, the sound stays ---------- */
const shell = $('#shell'), lock = $('#lock');
let lockOpen = false;
(() => {
  const zone = $('#swipe'); let y0 = 0, t0 = 0, dy = 0, live = false;
  zone.addEventListener('pointerdown', (e) => { live = true; y0 = e.clientY; t0 = performance.now(); dy = 0; shell.style.transition = 'none'; try { zone.setPointerCapture(e.pointerId); } catch (_) {} });
  zone.addEventListener('pointermove', (e) => {
    if (!live) return; dy = Math.min(0, e.clientY - y0);
    const k = Math.abs(dy);
    shell.style.transform = `translateY(${dy * 0.6}px) scale(${1 - Math.min(0.22, k / 1400)})`;
    shell.style.borderRadius = Math.min(44, k / 4) + 'px';
  });
  const end = () => {
    if (!live) return; live = false;
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy < -110 || v < -0.6) closeApp(); else { shell.style.transition = 'transform .6s var(--spring), border-radius .6s var(--soft)'; shell.style.transform = ''; shell.style.borderRadius = ''; }
  };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  zone.addEventListener('click', () => {});
})();
const LOCK_BG = { nature: ['#0f1c34', '#1c1c42', '#2f2449'], city: ['#1e1a33', '#2c1f3e', '#3d2741'], noise: ['#0c1f29', '#12293a', '#1c2c46'] };
function closeApp() {
  closePop(); closeCollection();
  shell.style.transition = 'transform .7s var(--soft), opacity .5s var(--soft), border-radius .6s var(--soft)';
  shell.style.transform = 'translateY(-62%) scale(.7)'; shell.style.opacity = '0'; shell.style.borderRadius = '44px';
  const [a, b, c] = LOCK_BG[state.theme]; lock.style.setProperty('--l-a', a); lock.style.setProperty('--l-b', b); lock.style.setProperty('--l-c', c);
  lockOpen = true; renderLock(); setTimeout(() => { lock.hidden = false; }, 180);
}
function openApp() {
  lockOpen = false; lock.hidden = true; $('#lockList').hidden = true;
  shell.style.transition = 'none'; shell.style.transform = 'translateY(-24%) scale(.86)'; shell.style.opacity = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => { shell.style.transition = 'transform .8s var(--spring), opacity .45s var(--soft), border-radius .6s var(--soft)'; shell.style.transform = ''; shell.style.opacity = ''; shell.style.borderRadius = ''; }));
}
$('#openApp').addEventListener('click', openApp);
// comp only: swipe the lock screen up to come back to the app
(() => {
  let y0 = 0, t0 = 0, dy = 0, live = false;
  lock.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    live = true; y0 = e.clientY; t0 = performance.now(); dy = 0; lock.style.transition = 'none';
    try { lock.setPointerCapture(e.pointerId); } catch (_) {}
  });
  lock.addEventListener('pointermove', (e) => {
    if (!live) return; dy = Math.min(0, e.clientY - y0);
    lock.style.transform = `translateY(${dy * 0.7}px)`; lock.style.opacity = String(1 - Math.min(0.6, -dy / 600));
  });
  const end = () => {
    if (!live) return; live = false;
    const v = dy / Math.max(1, performance.now() - t0);
    lock.style.transition = 'transform .55s var(--soft), opacity .5s var(--soft)';
    if (dy < -90 || v < -0.6) { lock.style.transform = 'translateY(-40%)'; lock.style.opacity = '0'; setTimeout(() => { openApp(); lock.style.transform = ''; lock.style.opacity = ''; }, 260); }
    else { lock.style.transform = ''; lock.style.opacity = ''; }
  };
  lock.addEventListener('pointerup', end); lock.addEventListener('pointercancel', end);
})();
const lockSub = () => (state.timerEnd ? `ONDA, ${fmt(state.timerEnd - Date.now())} 뒤에 꺼져요` : state.paused ? 'ONDA, 일시정지됨' : 'ONDA, 재생 중');
function renderLock() {
  const key = activeKey();
  const title = state.preset || (key ? nameFor(key) : '소리 없음');
  const img = key ? thumb(key) : `thumbs/icon-${state.theme}.webp`;
  $('#lockThumb').src = img; $('#lockArt').src = img; $('#lockTitle').textContent = title; $('#lockSub').textContent = lockSub();
  const d = new Date();
  $('#lockTime').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#lockDate').textContent = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  const box = $('#lockPresets'); box.innerHTML = '';
  for (const p of presetsOf(state.theme)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'preset' + (state.preset === p.name ? ' is-on' : '');
    b.innerHTML = `<img src="${thumb(p.icon)}" alt=""><span><b>${p.name}</b><small>${levelText(p.levels, state.theme)}</small></span>${state.preset === p.name ? icon('check').replace('<svg', '<svg class="check"') : ''}`;
    b.addEventListener('click', () => { applyPreset(p); toggleLockList(false); });
    box.appendChild(b);
  }
  renderTimerChoices($('#lockTimer'), () => { $('#lockSub').textContent = lockSub(); });
}
setInterval(() => { if (lockOpen) { const d = new Date(); $('#lockTime').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; } }, 15000);
function toggleLockList(force) {
  const l = $('#lockList'), show = force ?? l.hidden;
  l.hidden = !show; document.querySelector('.lock-clock').style.opacity = show ? 0.45 : 1;
  if (show) { const pl = document.querySelector('.player'); l.style.top = 'auto'; l.style.bottom = (lock.clientHeight - pl.offsetTop + 12) + 'px'; }
}
$('#lockListBtn').addEventListener('click', () => toggleLockList());
function stepPreset(d) { const list = presetsOf(state.theme); const i = list.findIndex((p) => p.name === state.preset); applyPreset(list[(i + d + list.length) % list.length]); }
$('#prevPreset').addEventListener('click', () => stepPreset(-1));
$('#nextPreset').addEventListener('click', () => stepPreset(1));
function togglePause() {
  state.paused = !state.paused; sound.fadeTo(state.paused ? 0 : 1, 0.5);
  const b = $('#playPause'); setIcon(b, state.paused ? 'play' : 'pause'); b.setAttribute('aria-label', state.paused ? '재생' : '일시정지');
  if (lockOpen) $('#lockSub').textContent = lockSub();
}
$('#playPause').addEventListener('click', togglePause);

/* ---------- turn the object; a tap makes it bounce ---------- */
const userQ = new THREE.Quaternion(), turnV = V3(0, 0, 0), X_AXIS = V3(1, 0, 0), Y_AXIS = V3(0, 1, 0);
let turning = null, resetting = false;
function turnBy(axis, angle) { if (angle) userQ.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle)).normalize(); }
function markTurned() { if (turnedOnce) return; turnedOnce = true; store.set('turned', true); capHint.style.opacity = 0; setTimeout(() => { capHint.hidden = true; capHint.style.opacity = ''; }, 600); }
canvas.addEventListener('pointerdown', (e) => {
  turning = { x: e.clientX, y: e.clientY, t: performance.now(), x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0 }; resetting = false; turnV.set(0, 0, 0);
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  stage.classList.add('turning');
});
canvas.addEventListener('pointermove', (e) => {
  if (!turning) return;
  const now = performance.now(), dx = e.clientX - turning.x, dy = e.clientY - turning.y, len = Math.hypot(dx, dy);
  if (!len) return;
  turning.moved = Math.max(turning.moved, Math.hypot(e.clientX - turning.x0, e.clientY - turning.y0));
  if (turning.moved < 6) return;
  const axis = V3(dy / len, dx / len, 0), angle = len * (Math.PI / Math.max(240, stage.clientWidth * 0.6));
  turnBy(axis, angle); turnV.copy(axis).multiplyScalar(angle / Math.max(0.008, (now - turning.t) / 1000));
  Object.assign(turning, { x: e.clientX, y: e.clientY, t: now });
  if (main) main.hit.value = Math.max(main.hit.value, 0.15);
  markTurned();
});
const tapRay = new THREE.Raycaster(), tapNdc = V2(0, 0), tapHit = V3(0, 0, 0);
function tapped(ev) {
  if (!main || main.s < 0.05) return;
  const r = canvas.getBoundingClientRect();
  tapNdc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  tapRay.setFromCamera(tapNdc, camera);
  if (tapRay.ray.intersectSphere(new THREE.Sphere(main.p, main.s * 1.05), tapHit)) { main.sqv += 9 * MO; main.hopV = BASE * 4.2 * MO + 0.4; main.hit.value = Math.min(1, main.hit.value + 0.6); }
}
const endTurn = (ev) => {
  if (!turning) return;
  if (ev && ev.type === 'pointerup' && turning.moved < 6 && performance.now() - turning.t0 < 350) tapped(ev);
  if (performance.now() - turning.t > 80 || reduceMotion) turnV.set(0, 0, 0);
  if (turnV.length() > 10) turnV.setLength(10);
  turning = null; stage.classList.remove('turning');
};
canvas.addEventListener('pointerup', endTurn); canvas.addEventListener('pointercancel', endTurn);
canvas.addEventListener('dblclick', () => { resetting = true; turnV.set(0, 0, 0); });

/* ---------- build shapes ahead of time, one per idle moment ---------- */
// building a shape is heavy on a phone, so it waits until the intro is over and then takes one shape at a time with a pause between
const warmQueue = [];
let warmReady = false;
function warm(t) {
  if (geoWorker) { THEMES[t].keys.forEach((k) => withGeo(k, () => {})); return; }   // the worker builds them in the background, in order
  warmQueue.unshift(...THEMES[t].keys.filter((k) => !geoCache[k]));
}
(function warmLoop() {
  if (geoWorker) return;
  if (warmReady) { const k = warmQueue.shift(); if (k && !geoCache[k]) { try { geoFor(k); } catch (e) { /* skip a shape that fails */ } } }
  setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(warmLoop, { timeout: 2500 }) : warmLoop()), warmReady ? 600 : 500);
})();

/* ---------- loop ---------- */
const clock = new THREE.Clock(), idleE = new THREE.Euler(), ID = new THREE.Quaternion(), tmpV = V3(0, 0, 0);
let rendered = false;
/* ---------- the sound turns with the object ---------- */
// the object's face is what sounds: spread across it, turned with it, heard from where it now points.
// three.js has +z toward the viewer and audio has -z in front, so z flips on the way out
let spaceKey = null; const spaceQ = new THREE.Quaternion(), spaceV = V3(0, 0, 0);
function syncSpace() {
  const key = activeKey();
  if (key === spaceKey && userQ.angleTo(spaceQ) < 0.004) return;
  spaceKey = key; spaceQ.copy(userQ);
  const on = key ? key.split('+') : [], span = [0, 0, 0.6, 0.85, 1.05][on.length] || 0;   // half the arc in radians
  on.forEach((id, i) => {
    const az = on.length > 1 ? -span + (2 * span * i) / (on.length - 1) : 0;
    spaceV.set(Math.sin(az), 0, Math.cos(az)).applyQuaternion(userQ);
    sound.place(id, spaceV.x, spaceV.y, -spaceV.z);
  });
}
let frameNo = 0, popFrames = 0, lastDraw = 0, slowAvg = 0, lastDrop = 0, pixelRatio = Math.min(devicePixelRatio, 1.5);
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 30), t = clock.elapsedTime;
  syncSpace();
  // nothing of the 3D space is visible: keep only the sliders moving
  if (document.hidden || lockOpen || !col.hidden) { for (const s of [...activeSliders]) if (!s.tick(dt)) activeSliders.delete(s); return; }
  U.time.value = t * MO;
  for (const s of [...activeSliders]) if (!s.tick(dt)) activeSliders.delete(s);
  if (resetting) { userQ.slerp(ID, Math.min(1, dt * 5)); if (userQ.angleTo(ID) < 0.002) { userQ.identity(); resetting = false; } }
  else if (!turning && turnV.lengthSq() > 1e-6) { const sp = turnV.length(); turnBy(tmpV.copy(turnV).divideScalar(sp), sp * dt); turnV.multiplyScalar(Math.exp(-dt * 2.4)); }
  for (const e of [...ents]) {
    e.t += dt;
    if (e.mode === 'launch') {
      tmpV.copy(CENTER).sub(e.p).multiplyScalar(11).addScaledVector(e.v, -4.2);
      e.v.addScaledVector(tmpV, dt); e.p.addScaledVector(e.v, dt);
      if ((e.t > 0.5 && e.p.distanceTo(CENTER) < BASE * 0.5) || e.t > 1.4) arrive(e);
    } else if (e.mode === 'absorb') {
      e.p.lerp(e.target, Math.min(1, dt * 7));
    } else if (e.mode === 'leave') {
      e.v.y -= 14 * dt; e.p.addScaledVector(e.v, dt); e.p.x += (slotX(e.key) - e.p.x) * Math.min(1, dt * 3);
      if (e.p.y < -VH - BASE * 1.2) { removeEntity(e); continue; }
    } else if (e.mode === 'main') {
      e.ts = mainScale();
      e.p.x += (CENTER.x - e.p.x) * Math.min(1, dt * 4);
      e.p.y += (CENTER.y + Math.sin(t * 0.8 + e.phase) * 0.06 * MO - e.p.y) * Math.min(1, dt * 4);
    }
    const k = e.mode === 'absorb' ? 220 : 130, c = e.mode === 'absorb' ? 28 : 10;
    e.sv += (-k * (e.s - e.ts) - c * e.sv) * dt; e.s = Math.max(0, e.s + e.sv * dt);
    if (e.mode === 'absorb' && e.s < 0.01 && e.t > 0.2) { removeEntity(e); continue; }
    if (e.hop > 0 || e.hopV !== 0) { e.hopV -= BASE * 22 * dt; e.hop += e.hopV * dt; if (e.hop <= 0) { e.hop = 0; if (e.hopV < -0.5) e.sqv += Math.min(8, -e.hopV * 1.6) * MO; e.hopV = 0; } }
    e.sqv += (-170 * e.sq - 9 * e.sqv) * dt; e.sq = clamp(e.sq + e.sqv * dt, -0.35, 0.45);
    e.holder.position.set(e.p.x, e.p.y + e.hop, e.p.z);
    const sz = Math.max(e.s, 1e-4);
    e.holder.scale.set(sz * (1 + 0.18 * e.sq), sz * (1 - 0.28 * e.sq), sz * (1 + 0.18 * e.sq));
    e.holder.visible = e.s > 0.002;
    idleE.set(0, Math.sin(t * 0.35 + e.phase) * 0.4 * MO, Math.sin(t * 0.27 + e.phase) * 0.06 * MO);
    e.spin.quaternion.setFromEuler(idleE).premultiply(userQ);
    e.hit.value *= Math.exp(-dt * 1.8);
    e.amp.value = MO * 0.8;
  }
  // the object only drifts when nobody touches it: half the frames are enough, and the interface keeps the other half.
  // under a popup it is blurred away, so a still picture lets the browser reuse the blur
  frameNo++;
  const calm = !turning && !resetting && ents.every((e) => e.mode === 'main' && Math.abs(e.sv) < 0.02 && e.hop === 0 && Math.abs(e.sqv) < 0.05 && e.hit.value < 0.02);
  popFrames = openPop ? popFrames + 1 : 0;
  if (rendered && calm && (popFrames > 40 || frameNo % 2)) return;
  renderer?.render(scene, camera); rendered = true;
  // a phone that still cannot keep up gets fewer pixels, one step at a time
  const now = performance.now(), gap = now - lastDraw; lastDraw = now;
  if (renderer && gap < 200) {
    slowAvg += (gap - slowAvg) * 0.04;
    if (slowAvg > 40 && now - lastDrop > 2500 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); size(); lastDrop = now; slowAvg = 0; }
  }
}

/* ---------- start ---------- */
renderRows(); setCaption(''); warm(state.theme); loop();
// lift the fog after a short hold; fonts get at most a second longer, never an endless wait
const fontsOrTimeout = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
Promise.all([fontsOrTimeout, new Promise((r) => setTimeout(r, reduceMotion ? 300 : 1500))]).then(() => {
  window.__ondaLift ? window.__ondaLift() : $('#intro')?.remove();
  setTimeout(() => { warmReady = true; }, 2600);
});
