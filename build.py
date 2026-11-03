"""Build index.html for publishing: the viewer serves published files from another origin, so module files are
blocked there. This puts sound.js, shapes.js and app.js inline, each in its own scope, under one module script.
Edit index.src.html and app/*.js, then run: python build.py"""
import pathlib, re
here = pathlib.Path(__file__).parent
app = here / 'app'

def body(text):
    # imports go to the top of the inline module; the export line is dropped
    return '\n'.join(l for l in text.splitlines() if not l.startswith('import ') and not l.startswith('export {'))

sound = body((app / 'sound.js').read_text(encoding='utf-8')).replace('export const sound =', 'const sound =')
shapes = body((app / 'shapes.js').read_text(encoding='utf-8'))
main = body((app / 'app.js').read_text(encoding='utf-8'))
# the background worker builds the shapes: same geometry code, full CDN URLs (workers have no import map), no DOM
CDN = 'https://cdn.jsdelivr.net/npm/three@0.169.0'
worker = f"""import * as THREE from '{CDN}/+esm';
import {{ mergeVertices, mergeGeometries }} from '{CDN}/examples/jsm/utils/BufferGeometryUtils.js/+esm';
import {{ RoundedBoxGeometry }} from '{CDN}/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';
""" + re.sub(r"const GEO_Q = .*", "const GEO_Q = __GEO_Q__;", shapes).replace("matchMedia('(prefers-reduced-motion: reduce)').matches", 'false') + """
function build(key) {
  if (!key.includes('+')) return (SINGLE[key] || NEW_SHAPES[key])();
  const c = COMBO_SHAPES[key] || (CITY_COMBOS.find((x) => x.key === key) || NOISE_COMBOS.find((x) => x.key === key && !x.skip)).shape;
  return c();
}
self.onmessage = ({ data }) => {
  try {
    const g = build(data.key), pos = g.attributes.position.array, nor = g.attributes.normal.array, idx = g.index ? g.index.array : null;
    const tr = [pos.buffer, nor.buffer]; if (idx) tr.push(idx.buffer);
    self.postMessage({ key: data.key, pos, nor, idx }, tr);
  } catch (e) { self.postMessage({ key: data.key, error: String(e) }); }
};
"""
import json
worker_js = 'const GEO_WORKER_SRC = ' + json.dumps(worker).replace('</', '<\\/') + ';'
names = 'U, MO, reduceMotion, clamp, TRACKS, COMBOS, SINGLE, COMBO_SHAPES, DEFORM, NEW_TRACKS, NEW_SHAPES, CITY_COMBOS, NOISE_COMBOS, dreamMat'
script = f"""<script type="module">
import * as THREE from 'three';
import {{ mergeVertices, mergeGeometries }} from 'three/addons/utils/BufferGeometryUtils.js';
import {{ RoundedBoxGeometry }} from 'three/addons/geometries/RoundedBoxGeometry.js';
{worker_js}
const {{ sound }} = (() => {{
{sound}
return {{ sound }};
}})();
const {{ {names} }} = (() => {{
{shapes}
return {{ {names} }};
}})();
{{
{main}
}}
</script>"""
src = (here / 'index.src.html').read_text(encoding='utf-8')
out = src.replace('<script type="module" src="app/app.js"></script>', script)
assert out != src, 'module tag not found'
# a whole document, so the page also runs on its own (GitHub Pages, a local server); the viewer accepts it too
head, marker, rest = out.partition('<div id="app">')
assert marker, 'app root not found'
base = '<style>html,body{margin:0;padding:0;height:100%}body{background:#e9e7ef}[hidden]:not([hidden=until-found i]){display:none!important}</style>'
out = f'<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{base}\n{head.strip()}\n</head>\n<body>\n{marker}{rest}\n</body>\n</html>\n'
(here / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out))
