/* ONDA shapes: the milky material and every object's geometry, for all three themes.
   Built from 몽환 오브제/index.html (material, helpers, nature set) and 새 오브제/*.js (city and noise sets). */
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// mesh resolution: objects render small on a phone, so touch devices build lighter meshes
const GEO_Q = matchMedia('(pointer: coarse)').matches ? 0.55 : 0.72;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MO = reduceMotion ? 0.3 : 1;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// The four sounds. Each object is a milky body with two soft lights inside it (pos = height 0..1, rad = size vs the object)
const TRACKS = [
  { id: 'fire', label: 'FIRE', ko: '모닥불', color: '#ff6a2b', body: '#fff3ea', rim: '#ffd8c6',
    glowA: '#ff3b2f', posA: 0.66, radA: 0.4, glowB: '#ffc65a', posB: 0.28, radB: 0.55 },
  { id: 'wave', label: 'WAVE', ko: '파도', color: '#1fa8e8', body: '#eef7ff', rim: '#cde2ff',
    glowA: '#2fc2ff', posA: 0.35, radA: 0.55, glowB: '#a18aff', posB: 0.8, radB: 0.38 },
  { id: 'wind', label: 'WIND', ko: '봄바람', color: '#46c983', body: '#f2fbf2', rim: '#d3f0dd',
    glowA: '#3fdc98', posA: 0.55, radA: 0.5, glowB: '#fff07a', posB: 0.2, radB: 0.42 },
  { id: 'rain', label: 'RAIN', ko: '빗소리', color: '#7088ff', body: '#f1f1ff', rim: '#d8dbff',
    glowA: '#566bff', posA: 0.26, radA: 0.52, glowB: '#ff9bd4', posB: 0.72, radB: 0.3 },
];
// What two or more sounds become. Keys list the sounds in TRACKS order.
const COMBOS = {
  'fire+wave':      { name: '물안개', body: '#f6f3f8', rim: '#e2dcea', glowA: '#ffa985', posA: 0.2, radA: 0.46, glowB: '#a8e6ff', posB: 0.82, radB: 0.46 },
  'fire+wind':      { name: '불씨', body: '#fff1e8', rim: '#f2d4c6', glowA: '#ff4a2b', posA: 0.16, radA: 0.42, glowB: '#ffc65a', posB: 0.78, radB: 0.42 },
  'fire+rain':      { name: '꺼진 모닥불', body: '#f2eef2', rim: '#dcd6e2', glowA: '#ff5a3a', posA: 0.14, radA: 0.26, glowB: '#b8b2dc', posB: 0.72, radB: 0.5 },
  'wave+wind':      { name: '물보라', body: '#effaff', rim: '#cfe9ff', glowA: '#38c8ff', posA: 0.32, radA: 0.5, glowB: '#86f0cf', posB: 0.86, radB: 0.36 },
  'wave+rain':      { name: '빗방울 물결', body: '#eff2ff', rim: '#d3dbff', glowA: '#4d7bff', posA: 0.4, radA: 0.5, glowB: '#c5a8ff', posB: 0.82, radB: 0.35 },
  'wind+rain':      { name: '비바람', body: '#f1f3ff', rim: '#d6dcff', glowA: '#7d8cff', posA: 0.72, radA: 0.5, glowB: '#7ef0b8', posB: 0.12, radB: 0.42 },
  'fire+wave+wind': { name: '노을', body: '#fff3ee', rim: '#f2d6e6', glowA: '#ff6a3d', posA: 0.72, radA: 0.4, glowB: '#8a7dff', posB: 0.16, radB: 0.5 },
  'fire+wave+rain': { name: '온천', body: '#f4f6ff', rim: '#dbe3f7', glowA: '#5fd8ff', posA: 0.25, radA: 0.5, glowB: '#ffb09a', posB: 0.82, radB: 0.4 },
  'fire+wind+rain': { name: '무지개', body: '#fbf8ff', rim: '#e8e0f7', glowA: '#ffd1e6', posA: 0.15, radA: 0.3, glowB: '#c9e6ff', posB: 0.15, radB: 0.3, rainbow: 1 },
  'wave+wind+rain': { name: '폭풍', body: '#eef0ff', rim: '#cfd4f5', glowA: '#4f55ff', posA: 0.5, radA: 0.38, glowB: '#6fe0ff', posB: 0.2, radB: 0.6 },
  'fire+wave+wind+rain': { name: '작은 행성', body: '#f7f4ff', rim: '#dcd9f2', glowA: '#ff8a5a', posA: 0.72, radA: 0.45, glowB: '#4f9dff', posB: 0.32, radB: 0.45 },
};


/* ---------- Material: a milky, velvet body lit from inside ----------
   The skin is near white and matte. Two soft lights inside show through it, strongest where the body is thick
   (facing you) and fading toward the edges. The silhouette itself fades out, so every shape dissolves into the air.
   The rainbow form colours its arc in bands instead. */
const U = { time: { value: 0 }, dark: { value: 0 } };
function dreamMat(t, geo, { deform = '', amp, hit }) {
  const box = geo.boundingBox, bs = geo.boundingSphere, h = box.max.y - box.min.y;
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2 + bs.radius * 0.12;
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: U.time, uDark: U.dark, uAmp: amp, uHit: hit, uRainbow: { value: t.rainbow || 0 },
      uY: { value: V2(box.min.y, box.max.y) },
      uBody: { value: new THREE.Color(t.body) }, uRim: { value: new THREE.Color(t.rim) },
      uGA: { value: new THREE.Color(t.glowA) }, uGB: { value: new THREE.Color(t.glowB) },
      uPA: { value: V3(cx, box.min.y + h * t.posA, cz) }, uPB: { value: V3(cx, box.min.y + h * t.posB, cz) },
      uRA: { value: bs.radius * t.radA * 1.4 }, uRB: { value: bs.radius * t.radB * 1.4 },
    },
    vertexShader: `uniform float uTime; uniform float uAmp; uniform float uHit; uniform vec2 uY;
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 transformed = position; vec3 objectNormal = normal;
        float hgt = clamp((position.y - uY.x) / (uY.y - uY.x), 0.0, 1.0);
        ${deform}
        // soft wobble after a merge, like a balloon settling
        float jelly = sin(position.y * 5.0 + uTime * 9.0) * 0.6 + sin(position.x * 4.0 - uTime * 7.0) * 0.4 + sin(position.z * 4.5 + uTime * 8.0) * 0.3;
        transformed += objectNormal * jelly * uHit * 0.06;
        vP = position;
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vV = -mv.xyz; vN = normalize(normalMatrix * objectNormal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uBody; uniform vec3 uRim; uniform vec3 uGA; uniform vec3 uGB; uniform vec3 uPA; uniform vec3 uPB;
      uniform float uRA; uniform float uRB; uniform float uDark; uniform float uRainbow;
      varying vec3 vP; varying vec3 vN; varying vec3 vV;
      vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
      void main() {
        vec3 n = normalize(vN), v = normalize(vV);
        float facing = clamp(dot(n, v), 0.0, 1.0);
        float lit = 0.66 + 0.24 * clamp(dot(n, normalize(vec3(-0.5, 0.8, 0.6))), 0.0, 1.0);   // one wide, soft key light
        vec3 col = mix(uRim, uBody, smoothstep(0.0, 0.7, facing)) * lit * mix(1.0, 0.34, uDark);
        float depth = mix(0.3, 1.0, facing);   // the inner light shows most through the thick middle
        if (uRainbow > 0.5) {
          float band = clamp((length(vP.xy) - 0.76) / 0.48, 0.0, 1.0);
          col = mix(col, hsv2rgb(vec3(0.84 - band * 0.84, 0.5, 1.0)) * mix(1.0, 0.7, uDark), 0.8 * depth * step(0.0, vP.y + 0.05));
        }
        float a = exp(-pow(distance(vP, uPA) / uRA, 2.0)) * depth;
        float b = exp(-pow(distance(vP, uPB) / uRB, 2.0)) * depth;
        col = mix(col, uGA, a * 0.95); col = mix(col, uGB, b * 0.9);
        col += (uGA * a + uGB * b) * mix(0.06, 0.14, uDark);
        float alpha = smoothstep(0.02, 0.55, facing);   // the silhouette dissolves instead of ending in a hard edge
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
}

/* ---------- Geometry helpers: soft solids shrink-wrapped from signed distance fields ---------- */
function editVerts(g, fn) { const p = g.attributes.position, v = V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v, i); p.setXYZ(i, v.x, v.y, v.z); } p.needsUpdate = true; return g; }
function smooth(g) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); const o = mergeVertices(g, 1e-4); o.computeVertexNormals(); return o; }
function merge(...gs) { return mergeGeometries(gs.map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); return g; })); }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const sph = (x, y, z, cx, cy, cz, r, sy = 1, sz = 1) => Math.hypot(x - cx, (y - cy) / sy, (z - cz) / sz) - r;
const blobs = (list, k) => (x, y, z) => { let d = 1e9; for (const b of list) d = smin(d, sph(x, y, z, ...b), k); return d; };
// iq's round cone: sphere r1 at the base, sphere r2 at height h, tilted by `tilt` around z
function roundCone(x, y, z, bx, by, r1, r2, h, tilt = 0, zs = 1) {
  const px = x - bx, py = y - by, c = Math.cos(tilt), s = Math.sin(tilt);
  const rx = px * c + py * s, ry = -px * s + py * c, rz = z / zs;
  const qx = Math.hypot(rx, rz), qy = ry, b = (r1 - r2) / h, a = Math.sqrt(1 - b * b), k = -b * qx + a * qy;
  if (k < 0) return Math.hypot(qx, qy) - r1;
  if (k > a * h) return Math.hypot(qx, qy - h) - r2;
  return qx * a + qy * b - r1;
}
function shrinkWrap(sdf, { center = [0, 0, 0], seg = [150, 110], rMax = 2.6 } = {}) {
  const g = new THREE.SphereGeometry(1, Math.max(24, Math.round(seg[0] * GEO_Q)), Math.max(16, Math.round(seg[1] * GEO_Q))), c = V3(...center), d = V3();
  const f = (t) => sdf(c.x + d.x * t, c.y + d.y * t, c.z + d.z * t);
  editVerts(g, (v) => {
    d.copy(v).normalize();
    let t = rMax, s = f(t);
    while (t > 0 && s > 0) { t -= Math.max(s * 0.8, 0.003); s = f(t); }   // outermost surface along the ray
    let lo = Math.max(t, 0), hi = lo + 0.02;
    for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
    v.copy(d).multiplyScalar(lo).add(c);
  });
  return smooth(g);
}
// a tube along a path whose thickness follows radius(u), u = 0..1 from start to end
function taperTube(points, radius, { T = 260, R = 30, zs = 1.3 } = {}) {
  T = Math.max(40, Math.round(T * GEO_Q)); R = Math.max(10, Math.round(R * GEO_Q));
  const path = new THREE.CatmullRomCurve3(points.map((p) => V3(...p)));
  const g = new THREE.TubeGeometry(path, T, 1, R, false), c = V3();
  editVerts(g, (v, k) => { const u = Math.floor(k / (R + 1)) / T; path.getPointAt(u, c); v.sub(c).multiplyScalar(radius(u)); v.z *= zs; v.add(c); });
  return smooth(g);
}
const cap = (u, a, b) => Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - a) / (1 - a), 2))) * Math.min(1, u / b);   // round ends

/* ---------- The four sounds ---------- */
function waveGeo(stretch = 1) {
  const s = new THREE.Shape();
  s.moveTo(-1.14, -0.4); s.lineTo(0.85, -0.42);
  s.splineThru([V2(0.92, -0.3), V2(0.9, -0.1), V2(0.78, 0.1), V2(0.7, 0.32), V2(0.74, 0.52), V2(0.86, 0.6), V2(0.98, 0.56), V2(1.02, 0.44),
    V2(1.14, 0.5), V2(1.16, 0.7), V2(1.04, 0.88), V2(0.82, 0.96), V2(0.56, 0.9), V2(0.3, 0.7), V2(0.0, 0.4), V2(-0.4, 0.12), V2(-0.82, -0.14), V2(-1.14, -0.33)]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.2, bevelSegments: 8, curveSegments: 8, steps: 2 });
  editVerts(g, (v) => { v.x *= 0.82; v.y *= stretch; v.z -= 0.14; v.z *= 1 + 0.25 * Math.cos(v.x * 1.4); });
  return smooth(g);
}
function cloudGeo(scale = 1) {
  return shrinkWrap(blobs([[0, 0, 0, 0.52, 1, 0.8], [-0.56, -0.1, 0, 0.38, 1, 0.8], [0.58, -0.08, 0.02, 0.4, 1, 0.8],
    [-0.22, 0.3, 0, 0.42, 1, 0.8], [0.26, 0.26, -0.02, 0.38, 1, 0.8], [0, -0.06, 0.18, 0.42, 1, 0.8]].map((b) => [b[0] * scale, b[1] * scale, b[2] * scale, b[3] * scale, b[4], b[5]]), 0.26 * scale));
}
const SINGLE = {
  fire: () => shrinkWrap((x, y, z) => {
    let d = roundCone(x, y, z, 0.04, -0.4, 0.5, 0.07, 1.45, 0.08, 0.9);
    d = smin(d, roundCone(x, y, z, -0.3, -0.3, 0.3, 0.07, 0.98, 0.34, 0.9), 0.2);
    return smin(d, roundCone(x, y, z, 0.34, -0.36, 0.28, 0.07, 0.8, -0.38, 0.9), 0.2);
  }, { center: [0, -0.2, 0], seg: [170, 130] }),
  rain: () => shrinkWrap((x, y, z) => roundCone(x, y, z, 0, -0.3, 0.6, 0.05, 1.05, -0.05), { center: [0, -0.25, 0], seg: [140, 110] }),
  wind: () => {
    const pts = [];
    for (let i = 0; i <= 90; i++) { const u = i / 90, th = 0.5 + u * 2.2 * Math.PI, R = 0.1 + 0.6 * u; pts.push([R * Math.cos(th), R * Math.sin(th), 0]); }
    const e = pts.at(-1);
    for (let i = 1; i <= 24; i++) { const u = i / 24; pts.push([e[0] - u * 0.95, e[1] - 0.05 * u - 0.08 * Math.sin(u * Math.PI), 0]); }
    return taperTube(pts, (u) => {
      const sw = 0.72;
      if (u < sw) return 0.035 + 0.2 * Math.pow(u / sw, 0.7) * Math.min(1, u / 0.04);
      const k = (u - sw) / (1 - sw); return 0.235 * Math.sqrt(Math.max(0, 1 - k * k)) + 0.004;
    }, { T: 360, R: 36, zs: 1.35 });
  },
  wave: () => waveGeo(),
};

/* ---------- What they become together ---------- */
// an ellipsoid with radii a, b, c whose distance is scaled by its smallest radius, so tracing never steps past the surface
const ell = (x, y, z, cx, cy, cz, a, b, c) => (Math.hypot((x - cx) / a, (y - cy) / b, (z - cz) / c) - 1) * Math.min(a, b, c);
const COMBO_SHAPES = {
  // 물안개: puffy clumps of mist lying low over a pool of water, small puffs drifting loose above
  'fire+wave': () => merge(
    shrinkWrap((x, y, z) => ell(x, y, z, 0, -0.62, 0, 0.92, 0.08, 0.8), { center: [0, -0.62, 0], seg: [150, 90] }),
    shrinkWrap(blobs([[-0.66, -0.4, 0.04, 0.18, 0.75], [-0.42, -0.36, -0.04, 0.22, 0.75], [-0.14, -0.38, 0.06, 0.24, 0.75], [0.16, -0.36, -0.02, 0.23, 0.75],
      [0.44, -0.38, 0.05, 0.2, 0.75], [0.68, -0.42, 0.0, 0.15, 0.75]], 0.14), { center: [0, -0.38, 0], seg: [170, 110] }),
    shrinkWrap(blobs([[-0.36, -0.12, 0.0, 0.15, 0.8], [-0.14, -0.1, 0.03, 0.17, 0.8], [0.08, -0.13, -0.02, 0.13, 0.8]], 0.1), { center: [-0.14, -0.12, 0], seg: [120, 80] }),
    shrinkWrap(blobs([[0.3, 0.1, 0.0, 0.11, 0.8], [0.46, 0.12, 0.02, 0.09, 0.8]], 0.08), { center: [0.38, 0.11, 0], seg: [90, 60] }),
    new THREE.SphereGeometry(0.07, 24, 16).scale(1, 0.8, 1).translate(-0.04, 0.28, 0)).rotateX(0.24),
  // 불씨: a small flame leaning in the wind, tiny sparks lifted off it and scattering
  'fire+wind': () => merge(
    SINGLE.fire().scale(0.34, 0.34, 0.34).rotateZ(-0.16).translate(-0.24, -0.5, 0),
    ...[[0.06, -0.04, 0.034], [0.0, 0.1, 0.026], [0.18, 0.06, 0.03], [0.14, 0.22, 0.024], [0.3, 0.16, 0.022], [0.06, 0.3, 0.02],
      [0.26, 0.34, 0.019], [0.42, 0.3, 0.018], [0.36, 0.46, 0.015], [0.18, 0.46, 0.014], [0.52, 0.48, 0.013], [0.46, 0.6, 0.011],
      [0.3, 0.6, 0.01], [0.6, 0.62, 0.01], [0.56, 0.74, 0.008], [0.4, 0.76, 0.008]]
      .map(([sx, sy, r], i) => new THREE.SphereGeometry(r, 14, 10).translate(sx - 0.08, sy - 0.06, 0.06 * ((i * 7) % 3) - 0.06))),
  // 꺼진 모닥불: crossed charred logs on a heap of ash, the last embers, two thin curls of smoke
  'fire+rain': () => merge(
    shrinkWrap((x, y, z) => ell(x, y, z, 0, -0.66, 0, 0.66, 0.14, 0.5), { center: [0, -0.66, 0], seg: [140, 90] }),
    ...[0.55, -0.55, 1.6].map((a, i) => new THREE.CapsuleGeometry(0.075, 0.68, 8, 18).rotateZ(Math.PI / 2).rotateZ(i === 2 ? 0 : 0.18 * Math.sign(a)).rotateY(a).translate(0, -0.5 + i * 0.06, 0)),
    ...[[-0.14, -0.48, 0.2, 0.05], [0.12, -0.46, 0.16, 0.04], [0.02, -0.5, -0.14, 0.04]].map(([ex, ey, ez, r]) => new THREE.SphereGeometry(r, 18, 12).translate(ex, ey, ez)),
    taperTube([[0.0, -0.36, 0.0], [0.12, -0.12, 0.02], [-0.06, 0.12, 0.0], [0.1, 0.36, -0.02], [-0.02, 0.62, 0.0]], (u) => 0.012 + 0.07 * (1 - u) * Math.min(1, u / 0.1 + 0.4), { T: 160, R: 18 }),
    taperTube([[0.16, -0.38, 0.04], [0.28, -0.2, 0.06], [0.2, 0.0, 0.04], [0.32, 0.18, 0.02]], (u) => 0.01 + 0.045 * (1 - u) * Math.min(1, u / 0.1 + 0.4), { T: 120, R: 16 })).rotateX(0.22),
  // 물보라: a smaller wave whose crest breaks into foam, spray bursting off it in an arc
  'wave+wind': () => merge(
    waveGeo(1.05).scale(0.62, 0.62, 0.62).translate(-0.34, -0.42, 0),
    shrinkWrap(blobs([[0.08, 0.2, 0.04, 0.11], [0.22, 0.16, -0.03, 0.09], [-0.04, 0.24, 0.0, 0.08], [0.32, 0.08, 0.02, 0.07]], 0.06), { center: [0.14, 0.17, 0], seg: [110, 80] }),
    ...[[0.2, 0.42, 0.04, 0.07], [0.38, 0.4, -0.05, 0.062], [0.52, 0.3, 0.05, 0.055], [0.06, 0.52, -0.02, 0.05], [0.32, 0.58, 0.05, 0.048], [0.62, 0.16, -0.03, 0.045],
      [0.48, 0.52, -0.04, 0.04], [0.7, 0.34, 0.04, 0.038], [0.18, 0.68, 0.02, 0.035], [0.78, 0.04, 0.0, 0.034], [0.62, 0.5, 0.05, 0.03], [0.4, 0.72, -0.03, 0.028],
      [0.84, 0.22, -0.05, 0.026], [0.74, 0.62, 0.0, 0.022], [0.9, 0.42, 0.03, 0.02]]
      .map(([dx, dy, dz, r]) => new THREE.SphereGeometry(r, 20, 14).translate(dx, dy, dz))),
  // 빗방울 물결: two ripples spreading and a drop just landing
  'wave+rain': () => merge(
    new THREE.TorusGeometry(0.5, 0.05, 14, 80).rotateX(Math.PI / 2).translate(0, 0.21, 0),
    new THREE.TorusGeometry(0.84, 0.045, 14, 100).rotateX(Math.PI / 2).translate(0, 0.14, 0),
    shrinkWrap((x, y, z) => roundCone(x, y, z, 0, 0.5, 0.17, 0.02, 0.36), { center: [0, 0.58, 0], seg: [60, 40] }),
  ).rotateX(0.8),
  // 비바람: a cloud with rain streaks slanting in the wind
  'wind+rain': () => merge(cloudGeo(1),
    ...[-0.5, -0.17, 0.16, 0.49].map((x, i) => new THREE.CapsuleGeometry(0.055, 0.34, 6, 12).rotateZ(-0.45).translate(x - 0.1, -0.74 - (i % 2) * 0.16, 0.05))),
  // 노을: the sun half set behind a band of sea
  'fire+wave+wind': () => {
    const s = new THREE.Shape(); s.moveTo(-1.25, -0.8); s.lineTo(1.25, -0.8);
    const top = []; for (let i = 0; i <= 40; i++) { const x = 1.25 - i * 2.5 / 40; top.push(V2(x, -0.3 + 0.07 * Math.sin(x * 5))); }
    s.splineThru(top); s.closePath();
    const sea = smooth(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 6, curveSegments: 3 }).translate(0, 0, -0.15));
    return merge(new THREE.SphereGeometry(0.78, 64, 48).scale(1, 1, 0.6).translate(0, 0.12, -0.25), sea);
  },
  // 온천: a round pool with a thick rim, steam rising from it
  'fire+wave+rain': () => merge(
    shrinkWrap((x, y, z) => sph(x, y, z, 0, -0.3, 0, 0.92, 0.4, 0.92), { center: [0, -0.3, 0], seg: [120, 80] }),
    new THREE.TorusGeometry(0.88, 0.13, 18, 96).rotateX(Math.PI / 2).translate(0, -0.18, 0),
    shrinkWrap(blobs([[-0.32, 0.12, 0, 0.17], [0, 0.2, 0, 0.21], [0.32, 0.1, 0, 0.16], [-0.2, 0.46, 0, 0.14], [0.16, 0.52, 0, 0.15], [-0.02, 0.8, 0, 0.11]], 0.18), { center: [0, 0.3, 0], seg: [100, 70] }),
  ).rotateX(0.45),
  // 무지개: an arch resting on two small clouds
  'fire+wind+rain': () => merge(
    new THREE.TorusGeometry(1, 0.24, 28, 140, Math.PI),
    shrinkWrap(blobs([[-1, -0.06, 0, 0.3], [-1.28, -0.12, 0, 0.2], [-0.74, -0.14, 0.02, 0.2]], 0.16), { center: [-1, -0.08, 0], seg: [80, 60] }),
    shrinkWrap(blobs([[1, -0.06, 0, 0.3], [1.28, -0.12, 0, 0.2], [0.74, -0.14, 0.02, 0.2]], 0.16), { center: [1, -0.08, 0], seg: [80, 60] }),
  ),
  // 폭풍: a spiral of cloud winding into a calm eye, seen at an angle
  'wave+wind+rain': () => {
    const pts = [];
    for (let i = 0; i <= 140; i++) { const u = i / 140, th = u * 2.6 * Math.PI, R = 0.2 + 0.85 * u; pts.push([R * Math.cos(th), R * Math.sin(th), 0.06 * Math.sin(th * 2)]); }
    return merge(taperTube(pts, (u) => (0.07 + 0.2 * u) * cap(u, 0.86, 0.04) + 0.004, { T: 420, R: 30, zs: 1.1 }),
      new THREE.SphereGeometry(0.16, 32, 24)).rotateX(-0.7);
  },
  // 작은 행성: everything at once, a small world with a ring and a moon
  'fire+wave+wind+rain': () => merge(
    new THREE.SphereGeometry(0.78, 64, 48),
    new THREE.TorusGeometry(1.22, 0.065, 14, 140).rotateX(Math.PI / 2.4).rotateZ(0.32),
    new THREE.SphereGeometry(0.17, 32, 24).translate(1.22, 0.78, 0.2),
  ),
};

// Idle motion, in each object's own space (hgt = 0 at the bottom, 1 at the top)
const DEFORM = {
  fire: `transformed.x += sin(uTime * 1.3 + position.y * 1.8) * 0.07 * hgt * hgt * uAmp;
         transformed.z += cos(uTime * 1.05 + position.y * 1.5) * 0.05 * hgt * hgt * uAmp;`,
  wave: `transformed.y += sin(position.x * 2.6 - uTime * 1.4) * 0.05 * hgt * uAmp;
         transformed.x += sin(uTime * 0.9) * 0.04 * hgt * hgt * uAmp;`,
  wind: `transformed.xy += normalize(position.xy + 0.001) * sin(length(position.xy) * 9.0 - uTime * 2.2) * 0.022 * uAmp;`,
  rain: `transformed.y *= 1.0 + 0.04 * sin(uTime * 2.2) * uAmp;
         transformed.xz *= 1.0 - 0.02 * sin(uTime * 2.2) * uAmp;`,
  combo: `transformed += objectNormal * sin(uTime * 1.2 + position.y * 2.2 + position.x * 1.3) * 0.02 * uAmp;`,
};


/* ---------- New sounds: CITY (도심) and NOISE (화이트 노이즈) ----------
   Same material as the nature set: a milky body with two soft lights inside (pos = height 0..1, rad = size vs the object).
   Needs the helpers from 몽환 오브제/index.html: smin, sph, roundCone, shrinkWrap, smooth, merge, cloudGeo. */
const NEW_TRACKS = [
  // CITY
  { id: 'coffee', label: 'COFFEE', ko: '커피 내리기', theme: 'city', body: '#fff4ea', rim: '#f0dccb',
    glowA: '#c9784a', posA: 0.22, radA: 0.5, glowB: '#ffd99c', posB: 0.82, radB: 0.42 },
  { id: 'train', label: 'TRAIN', ko: '밤기차', theme: 'city', body: '#f3f2ff', rim: '#dadcf6',
    glowA: '#ffcf5e', posA: 0.62, radA: 0.42, glowB: '#6f7dff', posB: 0.12, radB: 0.5 },
  { id: 'typing', label: 'TYPING', ko: '타자 소리', theme: 'city', body: '#f4f6ff', rim: '#d9dff2',
    glowA: '#8fb0ff', posA: 0.35, radA: 0.5, glowB: '#ffb8dc', posB: 0.85, radB: 0.36 },
  { id: 'page', label: 'PAGE', ko: '책장 넘기기', theme: 'city', body: '#fffaf1', rim: '#efe3d2',
    glowA: '#ffc16e', posA: 0.45, radA: 0.48, glowB: '#9fc2ff', posB: 0.9, radB: 0.34 },
  // NOISE
  { id: 'fan', label: 'FAN', ko: '선풍기', theme: 'noise', body: '#effbff', rim: '#cfeaf4',
    glowA: '#6fdcff', posA: 0.5, radA: 0.34, glowB: '#b9ffe2', posB: 0.88, radB: 0.4 },
  { id: 'cabin', label: 'CABIN', ko: '비행기 기내', theme: 'noise', body: '#f5f3ff', rim: '#ddd7f3',
    glowA: '#ff9474', posA: 0.3, radA: 0.42, glowB: '#8db6ff', posB: 0.78, radB: 0.44 },
  { id: 'static', label: 'STATIC', ko: '라디오 잡음', theme: 'noise', body: '#f6f3ff', rim: '#ded8f4',
    glowA: '#6fe6dc', posA: 0.36, radA: 0.46, glowB: '#ff9bd4', posB: 0.72, radB: 0.36 },
  { id: 'hum', label: 'HUM', ko: '밤 냉장고', theme: 'noise', body: '#f2f8ff', rim: '#d6e6f4',
    glowA: '#9fe2ff', posA: 0.3, radA: 0.5, glowB: '#fff0a8', posB: 0.64, radB: 0.36 },
];

// extra signed distance helpers
const smax = (a, b, k) => -smin(-a, -b, k);
function roundBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
// upright cylinder: radius r, half height h, edge radius rr
function roundCyl(x, y, z, r, h, rr) {
  const dx = Math.hypot(x, z) - r + rr, dy = Math.abs(y) - h + rr;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - rr;
}
// one convex piece, wrapped from its own centre
const part = (sdf, center, seg = [110, 80]) => shrinkWrap(sdf, { center, seg });
const rot2 = (a, b, t) => [a * Math.cos(t) + b * Math.sin(t), -a * Math.sin(t) + b * Math.cos(t)];
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s;
}

const NEW_SHAPES = {
  // a drip cone sitting on a round cup, with a little handle
  coffee: () => merge(
    shrinkWrap((x, y, z) => {
      // the dripper is a cone cut flat at the top, with a soft rim
      const cone = smax(roundCone(x, y, z, 0, -0.08, 0.14, 0.5, 0.5), y - 0.3, 0.05);
      const rim = roundCyl(x, y - 0.3, z, 0.5, 0.05, 0.05);
      return smin(roundCyl(x, y + 0.42, z, 0.52, 0.34, 0.16), smin(cone, rim, 0.05), 0.07);
    }, { center: [0, -0.1, 0], seg: [160, 120] }),
    new THREE.TorusGeometry(0.19, 0.075, 18, 56).translate(0.56, -0.4, 0)),
  // one rounded carriage with three windows pressed into its side, on two soft wheels
  train: () => shrinkWrap((x, y, z) => {
    // a long body whose front end is a round nose
    let d = smin(roundBox(x + 0.1, y, z, 0.88, 0.4, 0.4, 0.3), sph(x, y, z, 0.74, -0.02, 0, 0.42, 0.95, 0.98), 0.12);
    for (const wx of [-0.56, -0.08, 0.4]) d = smax(d, -roundBox(x - wx, y - 0.08, z - 0.48, 0.18, 0.15, 0.17, 0.1), 0.035);
    for (const wx of [-0.56, 0.5]) d = smin(d, sph(x, y, z, wx, -0.44, 0, 0.16, 1, 1.5), 0.05);
    return d;
  }, { center: [0, -0.05, 0], seg: [170, 120] }),
  // a puffy keypad: six round keys on a soft base, one pressed down (each part wrapped on its own, so the gaps stay clean)
  typing: () => {
    const parts = [part((x, y, z) => roundBox(x, y + 0.3, z, 0.96, 0.15, 0.64, 0.14), [0, -0.3, 0])];
    let i = 0;
    for (const kz of [-0.24, 0.26]) for (const kx of [-0.6, 0, 0.6]) {
      const ky = (i++ === 4 ? -0.08 : 0) - 0.02;
      parts.push(part((x, y, z) => roundBox(x - kx, y - ky, z - kz, 0.21, 0.17, 0.18, 0.12), [kx, ky, kz], [70, 50]));
    }
    return merge(...parts).rotateX(0.62);
  },
  // an open book with one page lifting as it turns
  page: () => {
    // each leaf is a soft slab hinged at the spine
    const leaf = (ang, w, t, d, ox, oy) => smooth(new RoundedBoxGeometry(w, t, d, 5, t / 2.2).translate(ox, oy, 0).rotateZ(ang).translate(0, -0.22, 0));
    return merge(leaf(0.26, 0.96, 0.12, 1.2, -0.5, 0), leaf(-0.26, 0.96, 0.12, 1.2, 0.5, 0), leaf(1.05, 0.88, 0.06, 1.14, 0.46, 0.04)).rotateX(0.5);
  },
  // three soft blades around a hub, inside a thin guard ring
  fan: () => merge(
    shrinkWrap((x, y, z) => {
      let d = sph(x, y, z, 0, 0, 0, 0.19, 1, 1.4);
      for (let k = 0; k < 3; k++) {
        const a = 0.35 + k * Math.PI * 2 / 3, [u, v] = rot2(x - Math.cos(a) * 0.46, y - Math.sin(a) * 0.46, a);
        d = smin(d, (Math.hypot(u / 0.44, v / 0.27, z / 0.1) - 1) * 0.1, 0.12);
      }
      return d;
    }, { center: [0, 0, 0], seg: [170, 120] }),
    new THREE.TorusGeometry(0.98, 0.05, 16, 120)),
  // an aeroplane window: a thick rounded frame, the pane, and clouds at dusk inside
  cabin: () => {
    // the frame is one soft tube around a rounded window, so it has no seams
    const loop = roundRectShape(0.94, 1.32, 0.44).getSpacedPoints(180).map((p) => V3(p.x, p.y, 0));
    const frame = smooth(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 240, 0.17, 28, true)).scale(1, 1, 1.25);
    // the pane sits well behind the frame so the window reads as deep
    const pane = smooth(new THREE.ExtrudeGeometry(roundRectShape(0.8, 1.18, 0.38), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 48 }).translate(0, 0, -0.2));
    return merge(frame, pane, cloudGeo(0.26).translate(-0.08, -0.32, -0.06), cloudGeo(0.17).translate(0.2, -0.16, -0.08));
  },
  // a small radio with a speaker pressed into its face, one dial and an antenna
  static: () => merge(
    shrinkWrap((x, y, z) => {
      let d = roundBox(x, y, z, 0.8, 0.52, 0.34, 0.27);
      d = smax(d, -roundCyl(x + 0.3, z - 0.42, y + 0.02, 0.27, 0.1, 0.05), 0.04);
      return smin(d, sph(x, y, z, 0.44, 0.06, 0.32, 0.13, 1, 0.8), 0.05);
    }, { center: [0, 0, 0], seg: [170, 120] }),
    new THREE.CapsuleGeometry(0.035, 0.7, 6, 12).rotateZ(-0.5).translate(0.47, 0.81, -0.05),
    new THREE.SphereGeometry(0.08, 24, 16).translate(0.66, 1.15, -0.05)),
  // a soft, tall fridge with its door seam and two handles
  // freezer and fridge doors as two soft blocks with a thin gap between them
  hum: () => merge(
    smooth(new RoundedBoxGeometry(1.04, 0.56, 0.84, 6, 0.26).translate(0, 0.6, 0)),
    smooth(new RoundedBoxGeometry(1.04, 1.14, 0.84, 6, 0.3).translate(0, -0.29, 0)),
    smooth(new RoundedBoxGeometry(0.09, 0.28, 0.1, 4, 0.044).translate(0.3, 0.58, 0.44)),
    smooth(new RoundedBoxGeometry(0.09, 0.42, 0.1, 4, 0.044).translate(0.3, 0.06, 0.44))),
};

/* ---------- CITY combinations: what two or more city sounds become ----------
   Keys list the sounds in NEW_TRACKS order (coffee, train, typing, page). Needs new-objects.js loaded first.
   Every piece is convex or wrapped on its own, so shrinkWrap never has to see round a gap. */
const sdRoundRect2 = (x, y, bx, by, r) => { const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
// a flat 2D shape given thickness 2h and soft edges r
const slab = (d2, z, h, r) => { const wx = d2 + r, wy = Math.abs(z) - h + r; return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - r; };
const rbox = (w, h, d, r, seg = 4) => smooth(new RoundedBoxGeometry(w, h, d, seg, r));
const cupGeo = (s) => merge(part((x, y, z) => roundCyl(x, y, z, 0.52, 0.34, 0.16), [0, 0, 0], [90, 70]), new THREE.TorusGeometry(0.19, 0.075, 16, 48).translate(0.56, 0.02, 0)).scale(s, s, s);
const steam = (s) => taperTube([[0, 0, 0], [0.09, 0.16, 0], [-0.07, 0.32, 0], [0.05, 0.48, 0]], (u) => 0.012 + 0.05 * (1 - u) * Math.min(1, u / 0.12 + 0.4), { T: 120, R: 16 }).scale(s, s, s);
// a takeaway cup with a lid, wrapped as one shape so the see-through material never shows layers inside it (s = scale)
const takeaway = (cx, cy, cz, s = 1) => part((x, y, z) => {
  const px = (x - cx) / s, py = (y - cy) / s, pz = (z - cz) / s, r = 0.13 + 0.045 * (py / 0.21);
  const body = smax(Math.hypot(px, pz) - r, Math.abs(py) - 0.21, 0.035);
  const lid = roundCyl(px, py - 0.225, pz, 0.168, 0.028, 0.02);
  return smin(smin(body, lid, 0.015), sph(px, py, pz, 0, 0.25, 0, 0.085, 0.6), 0.02) * s;
}, [cx, cy, cz], [100, 80]);
const bookBase = () => {
  const leaf = (ang, w, t, d, ox, oy) => rbox(w, t, d, t / 2.2, 5).translate(ox, oy, 0).rotateZ(ang).translate(0, -0.22, 0);
  return merge(leaf(0.26, 0.96, 0.12, 1.2, -0.5, 0), leaf(-0.26, 0.96, 0.12, 1.2, 0.5, 0), leaf(1.05, 0.88, 0.06, 1.14, 0.46, 0.04));
};

const CITY_COMBOS = [
  // 자판기 커피: the coffee machine on a station platform at dawn: a lit panel, a row of buttons, a paper cup steaming in the slot
  { key: 'coffee+train', name: '자판기 커피', body: '#fff4ee', rim: '#eedcd6', glowA: '#ffcf5e', posA: 0.64, radA: 0.38, glowB: '#c9784a', posB: 0.22, radB: 0.34,
    shape: () => {
      const F = 0.31;   // front face of the body
      const paperCup = smooth(new THREE.CylinderGeometry(0.1, 0.072, 0.19, 36, 3).translate(0, -0.47, F + 0.12));
      return merge(
        rbox(0.92, 1.5, 0.62, 0.2, 6),
        rbox(0.82, 0.16, 0.05, 0.05, 3).translate(0, 0.6, F),                      // the sign band on top
        rbox(0.5, 0.56, 0.05, 0.07, 3).translate(-0.12, 0.2, F),                  // the lit panel of drinks
        ...[0.38, 0.2, 0.02].map((by) => new THREE.SphereGeometry(0.055, 20, 14).scale(1, 1, 0.5).translate(0.3, by, F + 0.01)),
        rbox(0.1, 0.05, 0.04, 0.02, 2).translate(0.3, -0.12, F + 0.01),           // the coin slot
        rbox(0.44, 0.3, 0.12, 0.06, 3).translate(0, -0.42, F + 0.02),            // the hood over the cup slot
        paperCup, steam(0.36).translate(0, -0.3, F + 0.12),
        rbox(1.1, 0.06, 0.8, 0.03, 3).translate(0, -0.79, 0.04));                // the platform it stands on
    } },
  // 카페 작업: an open laptop with soft keys, a cup beside it
  { key: 'coffee+typing', name: '카페 작업', body: '#f4f5ff', rim: '#dadff2', glowA: '#8fb0ff', posA: 0.72, radA: 0.5, glowB: '#ffd99c', posB: 0.2, radB: 0.4,
    shape: () => {
      const keys = [];
      for (const kz of [-0.02, 0.24]) for (let i = 0; i < 5; i++) keys.push(rbox(0.22, 0.05, 0.16, 0.022, 3).translate(-0.56 + i * 0.28, -0.22, kz));
      return merge(rbox(1.6, 0.12, 1.05, 0.05).translate(0, -0.3, 0.05),
        rbox(1.6, 1.0, 0.08, 0.035).translate(0, 0.5, 0).rotateX(-0.28).translate(0, -0.26, -0.45), ...keys,
        cupGeo(0.34).translate(0.98, -0.12, 0.42)).rotateX(0.32);
    } },
  // 북카페: an open book with a cup resting on its page
  { key: 'coffee+page', name: '북카페', body: '#fff7ee', rim: '#efe2d4', glowA: '#ffc16e', posA: 0.3, radA: 0.5, glowB: '#c9784a', posB: 0.8, radB: 0.35,
    // two books stacked a little askew, each a soft cover around a lighter block of pages, the cup on top
    shape: () => {
      const book = (w, h, d) => merge(rbox(w, 0.05, d, 0.024, 3).translate(0, h / 2 - 0.025, 0), rbox(w, 0.05, d, 0.024, 3).translate(0, -h / 2 + 0.025, 0),
        rbox(0.05, h, d, 0.024, 3).translate(-w / 2 + 0.025, 0, 0), rbox(w - 0.1, h - 0.08, d - 0.08, 0.03, 3).translate(0.02, 0, 0));
      return merge(book(1.3, 0.3, 0.92).rotateY(0.12).translate(0, -0.42, 0), book(1.1, 0.26, 0.8).rotateY(-0.2).translate(0.06, -0.14, 0.02),
        cupGeo(0.42).translate(0.06, 0.13, 0.04), steam(0.62).translate(0.06, 0.3, 0.04)).rotateX(0.2);
    } },
  // 기차표: a soft ticket with notched sides and a perforation line
  { key: 'train+typing', name: '기차표', body: '#f5f3ff', rim: '#dcdbf5', glowA: '#ffcf5e', posA: 0.68, radA: 0.45, glowB: '#8fb0ff', posB: 0.3, radB: 0.5,
    shape: () => shrinkWrap((x, y, z) => {
      let d2 = sdRoundRect2(x, y, 0.84, 0.46, 0.16);
      d2 = smax(d2, -(Math.hypot(Math.abs(x) - 0.84, y) - 0.16), 0.03);
      let d = slab(d2, z, 0.07, 0.05);
      for (const yy of [-0.3, -0.1, 0.1, 0.3]) d = smax(d, -sph(x, y, z, 0.36, yy, 0.08, 0.04), 0.01);
      return d;
    }, { center: [0, 0, 0], seg: [180, 120] }).rotateZ(-0.18).rotateX(0.28) },
  // 지도: a folded map standing in a zigzag, a pin on the destination
  { key: 'train+page', name: '지도', body: '#f7f8ff', rim: '#dde3f2', glowA: '#ffcf5e', posA: 0.86, radA: 0.3, glowB: '#9fc2ff', posB: 0.35, radB: 0.55,
    shape: () => merge(
      rbox(0.62, 0.95, 0.06, 0.03).rotateY(0.5).translate(-0.53, -0.1, 0.05),
      rbox(0.62, 0.95, 0.06, 0.03).rotateY(-0.5).translate(0, -0.1, 0.05),
      rbox(0.62, 0.95, 0.06, 0.03).rotateY(0.5).translate(0.53, -0.1, 0.05),
      new THREE.SphereGeometry(0.15, 32, 24).translate(0.08, 0.66, 0.24),
      part((x, y, z) => roundCone(x, y, z, 0.08, 0.36, 0.03, 0.13, 0.28), [0.08, 0.5, 0], [60, 40]).translate(0, 0, 0.24)) },
  // 타자기: a soft typewriter with a sheet rising from its roller
  { key: 'typing+page', name: '타자기', body: '#f6f6ff', rim: '#dcdff2', glowA: '#ffc16e', posA: 0.82, radA: 0.38, glowB: '#8fb0ff', posB: 0.25, radB: 0.5,
    shape: () => {
      const keys = [];
      for (const [kz, ky] of [[0.3, -0.02], [0.08, 0.02]]) for (let i = 0; i < 4; i++) keys.push(rbox(0.19, 0.09, 0.14, 0.04, 3).translate(-0.42 + i * 0.28, ky, kz));
      return merge(part((x, y, z) => roundBox(x, y + 0.25, z, 0.72, 0.24, 0.46, 0.18), [0, -0.25, 0]), ...keys,
        new THREE.CapsuleGeometry(0.11, 1.2, 8, 20).rotateZ(Math.PI / 2).translate(0, 0.1, -0.24),
        rbox(0.84, 0.92, 0.03, 0.012, 3).rotateX(-0.22).translate(0, 0.56, -0.34)).rotateX(0.22);
    } },
  // 기차역 벤치: a city platform bench with a small laptop open and a takeaway coffee on its seat, the yellow tactile strip along the platform edge
  { key: 'coffee+train+typing', name: '기차역 벤치', body: '#f5f4ff', rim: '#dcdcf4', glowA: '#ffcf5e', posA: 0.55, radA: 0.42, glowB: '#c9784a', posB: 0.3, radB: 0.32,
    shape: () => {
      const seatY = -0.14, seatTop = seatY + 0.045;
      const bumps = [];
      for (const bz of [0.34, 0.42]) for (let i = 0; i < 13; i++) bumps.push(new THREE.SphereGeometry(0.022, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.78 + i * 0.13, -0.57, bz));
      return merge(
        rbox(1.9, 0.06, 1.0, 0.03, 3).translate(0, -0.62, 0.02),                              // the platform floor
        rbox(1.9, 0.02, 0.2, 0.01, 2).translate(0, -0.585, 0.38), ...bumps,                  // the tactile strip
        ...[-0.6, 0.6].map((lx) => rbox(0.08, 0.42, 0.42, 0.04, 3).translate(lx, -0.38, 0)),  // legs
        rbox(1.5, 0.09, 0.48, 0.045, 4).translate(0, seatY, 0.02),                            // seat
        rbox(1.5, 0.36, 0.08, 0.04, 4).rotateX(-0.18).translate(0, 0.13, -0.25),               // backrest
        // a small laptop left open on the seat
        merge(rbox(0.46, 0.03, 0.32, 0.015, 2).translate(0, 0.015, 0.08),
          rbox(0.46, 0.3, 0.025, 0.012, 2).translate(0, 0.15, 0).rotateX(-0.42).translate(0, 0.02, -0.07)).rotateY(0.38).translate(-0.34, seatTop, 0.1),
        takeaway(0.42, seatTop + 0.13, 0.1, 0.62), steam(0.34).translate(0.42, seatTop + 0.33, 0.1)).rotateX(0.16);
    } },
  // 여행 가방: a soft suitcase with straps, a handle and a sticker
  { key: 'coffee+train+page', name: '여행 가방', body: '#fff4ec', rim: '#eedcd4', glowA: '#c9784a', posA: 0.3, radA: 0.5, glowB: '#9fc2ff', posB: 0.82, radB: 0.35,
    shape: () => merge(
      part((x, y, z) => roundBox(x, y, z, 0.68, 0.5, 0.26, 0.2), [0, 0, 0]),
      new THREE.TorusGeometry(0.2, 0.05, 14, 40, Math.PI).translate(0, 0.5, 0),
      rbox(0.1, 1.03, 0.56, 0.05, 3).translate(-0.36, 0, 0), rbox(0.1, 1.03, 0.56, 0.05, 3).translate(0.36, 0, 0),
      part((x, y, z) => sph(x, y, z, -0.04, 0.08, 0.27, 0.14, 1, 0.22), [-0.04, 0.08, 0.27], [50, 36]),
      ...[[-0.5, 0.15], [0.5, 0.15], [-0.5, -0.15], [0.5, -0.15]].map(([wx, wz]) => new THREE.SphereGeometry(0.07, 20, 14).translate(wx, -0.55, wz))) },
  // 책상 조명: a desk lamp bent over a pool of warm light
  { key: 'coffee+typing+page', name: '책상 조명', body: '#fffaf0', rim: '#efe4d6', glowA: '#ffd99c', posA: 0.52, radA: 0.36, glowB: '#8fb0ff', posB: 0.1, radB: 0.45,
    shape: () => merge(
      part((x, y, z) => roundCyl(x, y + 0.85, z, 0.42, 0.07, 0.06), [0, -0.85, 0], [80, 50]),
      new THREE.CapsuleGeometry(0.05, 0.62, 6, 14).rotateZ(0.39).translate(-0.135, -0.45, 0),
      new THREE.SphereGeometry(0.085, 20, 14).translate(-0.27, -0.12, 0),
      new THREE.CapsuleGeometry(0.05, 0.5, 6, 14).rotateZ(-0.9).translate(-0.035, 0.065, 0),
      // the shade: half a dome, its open face turned down toward the desk
      new THREE.SphereGeometry(0.32, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(0.594).translate(0.32, 0.28, 0),
      new THREE.TorusGeometry(0.32, 0.035, 14, 80).rotateX(Math.PI / 2).rotateZ(0.594).translate(0.32, 0.28, 0),
      new THREE.SphereGeometry(0.13, 24, 18).translate(0.32 + 0.56 * 0.07, 0.28 - 0.83 * 0.07, 0)) },
  // 편지: an envelope with its flap and a round seal
  { key: 'train+typing+page', name: '편지', body: '#fff6fa', rim: '#f0dce6', glowA: '#ffb8dc', posA: 0.45, radA: 0.42, glowB: '#ffcf5e', posB: 0.85, radB: 0.35,
    shape: () => shrinkWrap((x, y, z) => {
      const body = slab(sdRoundRect2(x, y, 0.82, 0.54, 0.12), z, 0.06, 0.04);
      const f2 = Math.max(y - 0.5, (-0.06 + 0.72 * Math.abs(x) - y) / 1.23) + 0.02;
      const flap = slab(f2, z - 0.08, 0.025, 0.02);
      return smin(smin(body, flap, 0.02), sph(x, y, z, 0, -0.04, 0.12, 0.13, 1, 0.45), 0.03);
    }, { center: [0, 0, 0], seg: [180, 120] }).rotateZ(0.12).rotateX(0.22) },
  // 잠든 도시: a small block of soft towers with lit windows, and a crescent moon
  { key: 'coffee+train+typing+page', name: '잠든 도시', body: '#f3f3ff', rim: '#d9dbf5', glowA: '#ffcf5e', posA: 0.45, radA: 0.45, glowB: '#6f7dff', posB: 0.92, radB: 0.4,
    shape: () => {
      const tower = (cx, w, h, dz) => { const cy = -0.62 + h; return part((x, y, z) => {
        let d = roundBox(x - cx, y - cy, z - dz, w, h, 0.26, 0.14);
        for (let r = 0; r < Math.floor(h / 0.2); r++) for (const wx of [-w * 0.42, w * 0.42])
          d = smax(d, -roundBox(x - cx - wx, y - (cy + h - 0.2 - r * 0.24), z - dz - 0.28, 0.05, 0.06, 0.06, 0.03), 0.02);
        return d;
      }, [cx, cy, dz]); };
      return merge(part((x, y, z) => roundBox(x, y + 0.7, z, 0.98, 0.08, 0.5, 0.07), [0, -0.7, 0], [100, 60]),
        tower(-0.52, 0.26, 0.32, 0.04), tower(0.04, 0.29, 0.5, -0.06), tower(0.56, 0.24, 0.24, 0.08),
        part((x, y, z) => smax(sph(x, y, z, 0.62, 0.66, 0, 0.27, 1, 0.6), -sph(x, y, z, 0.74, 0.75, 0, 0.23, 1, 0.9), 0.03), [0.5, 0.56, 0], [90, 70]));
    } },
];

/* ---------- NOISE combinations: what two or more white-noise sounds become ----------
   Keys list the sounds in NEW_TRACKS order (fan, cabin, static, hum). Needs new-objects.js and city-combos.js (helpers) loaded first.
   Each one is a single object whose parts say which sounds made it. */
// a thin stream of air, tapering as it drifts
const air = (pts, w = 0.03) => taperTube(pts, (u) => 0.006 + w * (1 - u) * Math.min(1, u / 0.15 + 0.3), { T: 120, R: 14 });
// a disc facing the viewer (axis along z)
const discZ = (cx, cy, cz, r, h, rr) => part((x, y, z) => roundCyl(x - cx, z - cz, y - cy, r, h, rr), [cx, cy, cz], [70, 50]);

const NOISE_COMBOS = [
  // 머리 위 송풍구: the panel above an airplane seat, two air nozzles and a reading light, air drifting down
  { key: 'fan+cabin', name: '머리 위 송풍구', body: '#f2f8ff', rim: '#d6e6f4', glowA: '#6fdcff', posA: 0.55, radA: 0.42, glowB: '#ff9474', posB: 0.85, radB: 0.3,
    shape: () => merge(
      rbox(1.6, 0.66, 0.2, 0.12, 5).translate(0, 0.32, 0),
      ...[-0.42, 0.02].flatMap((nx) => [discZ(nx, 0.32, 0.1, 0.19, 0.04, 0.03), new THREE.SphereGeometry(0.1, 28, 20).scale(1, 1, 0.8).translate(nx, 0.3, 0.17)]),
      discZ(0.5, 0.32, 0.1, 0.13, 0.03, 0.02), new THREE.SphereGeometry(0.07, 24, 16).scale(1, 1, 0.5).translate(0.5, 0.32, 0.14),
      air([[-0.42, 0.18, 0.22], [-0.36, -0.12, 0.34], [-0.46, -0.42, 0.4], [-0.38, -0.7, 0.42]]),
      air([[0.02, 0.18, 0.22], [0.1, -0.1, 0.32], [0.0, -0.38, 0.38], [0.08, -0.62, 0.4]]),
      air([[-0.2, 0.18, 0.2], [-0.16, -0.2, 0.3], [-0.24, -0.5, 0.34]], 0.022)).rotateX(-0.2) },
  // 스피커: a round cone that pushes air and plays noise, waves drifting off it
  { key: 'fan+static', name: '스피커', body: '#f1fbff', rim: '#d3ecf2', glowA: '#6fe6dc', posA: 0.4, radA: 0.45, glowB: '#ff9bd4', posB: 0.82, radB: 0.32,
    shape: () => merge(
      rbox(0.95, 1.3, 0.5, 0.22, 6),
      new THREE.TorusGeometry(0.31, 0.05, 16, 64).translate(0, -0.18, 0.26), new THREE.TorusGeometry(0.17, 0.04, 14, 48).translate(0, -0.18, 0.26),
      new THREE.SphereGeometry(0.09, 24, 16).scale(1, 1, 0.55).translate(0, -0.18, 0.27),
      new THREE.TorusGeometry(0.1, 0.03, 12, 40).translate(0, 0.36, 0.26), new THREE.SphereGeometry(0.05, 18, 12).scale(1, 1, 0.6).translate(0, 0.36, 0.27),
      ...[0.62, 0.8].map((r, i) => new THREE.TorusGeometry(r, 0.025, 10, 48, 1.1).rotateZ(-0.55).translate(0, -0.18, 0.18 - i * 0.04))) },
  // 에어컨: a soft wall unit, its louver tilted open and cool air flowing out
  { key: 'fan+hum', name: '에어컨', body: '#f0fbff', rim: '#d2ebf4', glowA: '#9fe2ff', posA: 0.6, radA: 0.45, glowB: '#b9ffe2', posB: 0.15, radB: 0.4,
    shape: () => merge(
      rbox(1.7, 0.52, 0.42, 0.2, 6).translate(0, 0.3, 0),
      rbox(1.42, 0.05, 0.2, 0.025, 3).rotateX(0.65).translate(0, 0.06, 0.2),
      new THREE.SphereGeometry(0.035, 16, 12).translate(0.62, 0.38, 0.215),
      ...[-0.5, -0.1, 0.3].map((ax, i) => air([[ax, 0.02, 0.26], [ax + 0.06, -0.24, 0.42], [ax - 0.04, -0.5, 0.5], [ax + 0.05, -0.76 + i * 0.04, 0.52]]))) },
  // 기내 헤드폰: soft over-ear headphones from the seat pocket, the cable curling down
  { key: 'cabin+static', name: '기내 헤드폰', body: '#f7f3ff', rim: '#ded8f3', glowA: '#ff9bd4', posA: 0.3, radA: 0.42, glowB: '#8db6ff', posB: 0.85, radB: 0.4,
    shape: () => merge(
      new THREE.TorusGeometry(0.6, 0.07, 18, 90, Math.PI).translate(0, 0.02, 0),
      ...[-1, 1].flatMap((s) => [
        part((x, y, z) => roundCyl(y + 0.08, (x - s * 0.62) * s, z, 0.26, 0.11, 0.08), [s * 0.62, -0.08, 0], [90, 60]),
        new THREE.TorusGeometry(0.19, 0.075, 14, 48).rotateY(Math.PI / 2).translate(s * 0.48, -0.08, 0)]),
      air([[-0.66, -0.32, 0.05], [-0.6, -0.55, 0.15], [-0.3, -0.62, 0.25], [-0.05, -0.7, 0.3]], 0.024),
      new THREE.CapsuleGeometry(0.03, 0.08, 6, 12).rotateZ(Math.PI / 2).translate(0.02, -0.71, 0.3)) },
  // 기내 카트: the drinks trolley, a door with a latch, two paper cups on top, small wheels
  { key: 'cabin+hum', name: '기내 카트', body: '#f4f6ff', rim: '#d9def2', glowA: '#fff0a8', posA: 0.55, radA: 0.45, glowB: '#8db6ff', posB: 0.15, radB: 0.4,
    shape: () => merge(
      rbox(0.82, 1.1, 0.7, 0.12, 6).translate(0, -0.05, 0),
      rbox(0.68, 0.84, 0.05, 0.05, 3).translate(0, -0.08, 0.36),
      new THREE.CapsuleGeometry(0.035, 0.6, 6, 12).rotateZ(Math.PI / 2).translate(0, 0.42, 0.4),
      discZ(0.22, -0.08, 0.39, 0.05, 0.02, 0.015),
      ...[-0.17, 0.15].map((cx) => smooth(new THREE.CylinderGeometry(0.085, 0.065, 0.17, 30, 2).translate(cx, 0.6, 0.02))),
      ...[[-0.3, 0.24], [0.3, 0.24], [-0.3, -0.24], [0.3, -0.24]].map(([wx, wz]) => part((x, y, z) => roundCyl(y + 0.66, x - wx, z - wz, 0.06, 0.03, 0.02), [wx, -0.66, wz], [40, 30]))) },
  // 브라운관 TV: a soft CRT with a bulging screen, two knobs and rabbit-ear antennas
  { key: 'static+hum', name: '브라운관 TV', body: '#f4f8ff', rim: '#d8e4f2', glowA: '#6fe6dc', posA: 0.48, radA: 0.42, glowB: '#fff0a8', posB: 0.85, radB: 0.32,
    shape: () => merge(
      rbox(1.24, 0.96, 0.8, 0.26, 6).translate(0, -0.1, 0),
      // the screen: a rounded rectangle bulging gently forward
      part((x, y, z) => slab(sdRoundRect2(x + 0.12, y + 0.08, 0.36, 0.3, 0.13), z - 0.4 - 0.04 * (1 - Math.min(1, Math.hypot((x + 0.12) / 0.36, (y + 0.08) / 0.3))), 0.04, 0.035), [-0.12, -0.08, 0.41], [100, 80]),
      ...[0.06, -0.2].map((ky) => new THREE.SphereGeometry(0.065, 22, 16).scale(1, 1, 0.7).translate(0.44, ky, 0.41)),
      ...[-0.4, 0.4].map((t) => new THREE.CapsuleGeometry(0.025, 0.6, 6, 12).translate(0, 0.3, 0).rotateZ(t).translate(0, 0.38, -0.05)),
      ...[-0.4, 0.4].map((t) => new THREE.SphereGeometry(0.06, 18, 12).translate(-Math.sin(t) * 0.66, 0.38 + Math.cos(t) * 0.66, -0.05)),
      ...[-0.38, 0.38].map((fx) => new THREE.SphereGeometry(0.07, 18, 12).scale(1, 0.6, 1).translate(fx, -0.6, 0.1))) },
  // 프로펠러 비행기: a soft little plane: propeller (air), cabin windows (flight), an antenna (radio)
  { key: 'fan+cabin+static', name: '프로펠러 비행기', body: '#f6f5ff', rim: '#ddd9f3', glowA: '#ff9474', posA: 0.4, radA: 0.45, glowB: '#6fdcff', posB: 0.82, radB: 0.35,
    shape: () => merge(
      new THREE.CapsuleGeometry(0.27, 1.0, 12, 32).rotateZ(Math.PI / 2),
      rbox(0.44, 0.07, 1.7, 0.035, 4).translate(0.06, -0.08, 0),
      rbox(0.28, 0.34, 0.06, 0.03, 3).translate(-0.66, 0.24, 0), rbox(0.22, 0.05, 0.6, 0.025, 3).translate(-0.66, 0.06, 0),
      ...[-0.2, 0.05, 0.3].map((wx) => new THREE.SphereGeometry(0.06, 18, 12).scale(1, 1, 0.4).translate(wx, 0.08, 0.26)),
      new THREE.SphereGeometry(0.09, 22, 16).translate(0.8, 0, 0),
      rbox(0.04, 0.72, 0.12, 0.02, 3).rotateX(0.35).translate(0.86, 0, 0),
      new THREE.CapsuleGeometry(0.018, 0.26, 6, 10).rotateZ(-0.25).translate(0.18, 0.4, 0), new THREE.SphereGeometry(0.04, 16, 12).translate(0.21, 0.55, 0)).rotateY(-0.7).rotateX(0.42).rotateZ(0.1) },
  // 수면 캡슐: a sleeping pod, its round door window glowing, a small air vent at its side
  { key: 'fan+cabin+hum', name: '수면 캡슐', body: '#f5f6ff', rim: '#dbdef3', glowA: '#fff0a8', posA: 0.52, radA: 0.42, glowB: '#8db6ff', posB: 0.12, radB: 0.4,
    shape: () => merge(
      new THREE.CapsuleGeometry(0.46, 0.95, 14, 40).rotateZ(Math.PI / 2).translate(0, 0.05, 0),
      new THREE.TorusGeometry(0.25, 0.055, 16, 64).translate(0.12, 0.05, 0.43),
      smooth(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 48, 1).rotateX(Math.PI / 2).translate(0.12, 0.05, 0.41)),
      ...[0.18, 0.05, -0.08].map((vy) => new THREE.CapsuleGeometry(0.02, 0.14, 6, 10).rotateZ(Math.PI / 2).translate(-0.48, vy, 0.38)),
      rbox(1.5, 0.06, 0.8, 0.03, 3).translate(0, -0.47, 0)) },
  // 백색소음기: the white noise machine: a soft round puck, rings across its top, a ring of light at its base
  { key: 'fan+static+hum', name: '백색소음기', body: '#f4fbff', rim: '#d6ecf3', glowA: '#6fe6dc', posA: 0.7, radA: 0.42, glowB: '#ff9bd4', posB: 0.15, radB: 0.4,
    shape: () => merge(
      part((x, y, z) => smin(roundCyl(x, y + 0.02, z, 0.62, 0.26, 0.22), sph(x, y, z, 0, 0.14, 0, 0.56, 0.32), 0.08), [0, 0, 0], [140, 100]),
      ...[0.14, 0.27, 0.4].map((r, i) => new THREE.TorusGeometry(r, 0.02, 10, 64).rotateX(Math.PI / 2).translate(0, 0.32 - i * 0.025, 0)),
      // a band of soft light around its side
      new THREE.TorusGeometry(0.63, 0.03, 12, 96).rotateX(Math.PI / 2).translate(0, -0.08, 0)).rotateX(0.24) },
  // 인공위성: a small satellite, its body hums, its dish listens for static, its panels like little cabin wings
  { key: 'cabin+static+hum', name: '인공위성', body: '#f5f5ff', rim: '#dcdcf4', glowA: '#8db6ff', posA: 0.45, radA: 0.5, glowB: '#fff0a8', posB: 0.82, radB: 0.32,
    shape: () => merge(
      rbox(0.5, 0.52, 0.5, 0.12, 5),
      ...[-1, 1].flatMap((s) => [new THREE.CapsuleGeometry(0.025, 0.18, 6, 10).rotateZ(Math.PI / 2).translate(s * 0.37, 0, 0), rbox(0.8, 0.04, 0.44, 0.02, 3).translate(s * 0.86, 0, 0),
        ...[-0.2, 0.2].map((gx) => rbox(0.012, 0.05, 0.44, 0.006, 1).translate(s * 0.86 + gx, 0, 0))]),
      new THREE.SphereGeometry(0.3, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2.6).rotateX(Math.PI).rotateZ(-0.6).translate(0.12, 0.62, 0),
      new THREE.CapsuleGeometry(0.02, 0.3, 6, 10).rotateZ(-0.6).translate(0.04, 0.42, 0),
      new THREE.CapsuleGeometry(0.02, 0.32, 6, 10).translate(-0.12, 0.42, 0.1), new THREE.SphereGeometry(0.04, 14, 10).translate(-0.12, 0.6, 0.1)).rotateZ(0.18).rotateX(0.2) },
  // 열기구: a hot air balloon: the envelope swells with air (fan), the basket is its cabin, the burner hums, a little radio antenna rides along
  { key: 'fan+cabin+static+hum', name: '열기구', body: '#f8f5ff', rim: '#e2dbf3', glowA: '#ffb07a', posA: 0.22, radA: 0.34, glowB: '#ff9bd4', posB: 0.72, radB: 0.45,
    shape: () => {
      const bx = 0.16, bt = -0.82;   // basket centre and the top of the basket
      // the envelope: a teardrop whose eight gores swell out softly
      const gore = (y) => Math.min(1, Math.max(0, (y + 0.1) / 0.4)) * Math.min(1, Math.max(0, (0.95 - y) / 0.4));   // fades out at the neck and at the crown
      const envelope = shrinkWrap((x, y, z) => roundCone(x, y, z, 0, -0.2, 0.17, 0.6, 0.62) - 0.02 * Math.cos(8 * Math.atan2(z, x)) * gore(y), { center: [0, 0.3, 0], seg: [180, 140] });
      const ropes = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => {
        const a = V3(sx * 0.12, -0.3, sz * 0.12), b = V3(bx * 0 + sx * 0.15, bt + 0.02, sz * 0.15), m = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a);
        return new THREE.CapsuleGeometry(0.012, d.length(), 4, 8).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize())).translate(m.x, m.y, m.z);
      });
      return merge(envelope, ...ropes,
        rbox(0.36, 0.26, 0.36, 0.07, 4).translate(0, bt - 0.13, 0),                              // the basket
        smooth(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 24, 1).translate(0, -0.4, 0)),          // the burner
        new THREE.CapsuleGeometry(0.012, 0.22, 4, 8).rotateZ(-0.3).translate(0.21, bt + 0.08, 0.12), new THREE.SphereGeometry(0.03, 12, 8).translate(0.25, bt + 0.2, 0.12),
        cloudGeo(0.2).translate(-0.62, -0.62, 0.1), cloudGeo(0.14).translate(0.66, -0.2, -0.1));
    } },
  // (구름 침대, the earlier all-four object, kept for reference)
  { key: 'fan+cabin+static+hum__bed', name: '구름 침대', body: '#f8f6ff', rim: '#e0dbf3', glowA: '#ff9bd4', posA: 0.6, radA: 0.42, glowB: '#8db6ff', posB: 0.15, radB: 0.45, skip: true,
    shape: () => merge(
      // a thick cloud for a mattress
      shrinkWrap(blobs([[0, -0.22, 0, 0.55, 0.8, 0.85], [-0.52, -0.28, 0.04, 0.44, 0.78, 0.85], [0.52, -0.28, 0, 0.46, 0.78, 0.85], [-0.24, -0.1, 0.14, 0.4, 0.8, 0.85], [0.28, -0.1, -0.12, 0.42, 0.8, 0.85], [0.84, -0.36, 0.02, 0.3, 0.8, 0.85], [-0.84, -0.36, 0, 0.28, 0.8, 0.85]], 0.22), { center: [0, -0.24, 0], seg: [180, 130] }),
      // a fluffy pillow on the left, a blanket folded back over the rest
      part((x, y, z) => roundBox(x + 0.46, y - 0.14, z + 0.02, 0.3, 0.13, 0.24, 0.13), [-0.46, 0.14, -0.02], [80, 60]),
      rbox(0.94, 0.08, 0.7, 0.04, 4).translate(0.28, 0.08, 0.06),
      rbox(0.94, 0.09, 0.2, 0.045, 3).translate(0.28, 0.15, -0.24)).rotateX(0.26)
    },
];

export { THREE, U, MO, reduceMotion, clamp, V2, V3, TRACKS, COMBOS, SINGLE, COMBO_SHAPES, DEFORM, NEW_TRACKS, NEW_SHAPES, CITY_COMBOS, NOISE_COMBOS, dreamMat };
