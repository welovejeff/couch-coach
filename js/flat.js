// Flat isometric SVG renderer: turns a build's solids into shaded, depth-sorted tiles.
import { solidsOf } from './pieces.js';

const COS = Math.cos(Math.PI / 6), SIN = 0.5, TILE = 7;
const proj = p => [(p[0] - p[1]) * COS, (p[0] + p[1]) * SIN - p[2]];
const LIGHT = [0.24, 0.52, 0.82];

function clipToCell(poly, x0, y0, x1, y1) {
  const planes = [[1, 0, x0], [-1, 0, -x1], [0, 1, y0], [0, -1, -y1]];
  let out = poly;
  for (const [a, b, c] of planes) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length];
      const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
      if (dp >= 0) out.push(p);
      if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq); out.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]); }
    }
    if (!out.length) break;
  }
  return out;
}

// One solid to its camera-facing tiles.
export function tilesOf({ profile, hole, axis, o, len, role, smooth }) {
  const map = (t, u, v) => axis === 'x' ? [o[0] + t, o[1] + u, o[2] + v] : axis === 'y' ? [o[0] + u, o[1] + t, o[2] + v] : [o[0] + u, o[1] + v, o[2] + t];
  const dir = (t, u, v) => axis === 'x' ? [t, u, v] : axis === 'y' ? [u, t, v] : [u, v, t];
  const seen = n => n[0] + n[1] + n[2] > 1e-6;
  const tiles = [];
  const c = profile.reduce((s, p) => [s[0] + p[0] / profile.length, s[1] + p[1] / profile.length], [0, 0]);

  function sides(poly, inward) {
    const n = poly.length, norms = [], vis = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      let nu = b[1] - a[1], nv = -(b[0] - a[0]);
      const l = Math.hypot(nu, nv) || 1; nu /= l; nv /= l;
      const dot = nu * ((a[0] + b[0]) / 2 - c[0]) + nv * ((a[1] + b[1]) / 2 - c[1]);
      if ((dot < 0) !== inward) { nu = -nu; nv = -nv; }
      norms[i] = dir(0, nu, nv); vis[i] = seen(norms[i]);
    }
    for (let i = 0; i < n; i++) {
      if (!vis[i]) continue;
      const a = poly[i], b = poly[(i + 1) % n];
      const su = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / TILE));
      const st = Math.max(1, Math.ceil(len / TILE));
      const P = (s, j) => map(len * j / st, a[0] + (b[0] - a[0]) * s / su, a[1] + (b[1] - a[1]) * s / su);
      const edgeA = !smooth || (!inward && !vis[(i + n - 1) % n]);
      const edgeB = !smooth || (!inward && !vis[(i + 1) % n]);
      for (let s = 0; s < su; s++) for (let j = 0; j < st; j++) {
        const edges = [];
        if (j === 0) edges.push([P(s, 0), P(s + 1, 0)]);
        if (j === st - 1) edges.push([P(s, st), P(s + 1, st)]);
        if (s === 0 && edgeA) edges.push([P(0, j), P(0, j + 1)]);
        if (s === su - 1 && edgeB) edges.push([P(su, j), P(su, j + 1)]);
        tiles.push({ pts: [P(s, j), P(s + 1, j), P(s + 1, j + 1), P(s, j + 1)], n: norms[i], edges, role });
      }
    }
  }
  sides(profile, false);
  if (hole) sides(hole, true);

  const onRim = (p, q) => profile.some((a, i) => {
    const b = profile[(i + 1) % profile.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d = r => Math.abs((b[0] - a[0]) * (r[1] - a[1]) - (b[1] - a[1]) * (r[0] - a[0])) / l;
    return d(p) < 1e-6 && d(q) < 1e-6;
  });
  for (const [t, n] of [[0, dir(-1, 0, 0)], [len, dir(1, 0, 0)]]) {
    if (!seen(n)) continue;
    if (hole) {
      for (let i = 0; i < profile.length; i++) {
        const j = (i + 1) % profile.length;
        const A = map(t, ...profile[i]), B = map(t, ...profile[j]), C = map(t, ...hole[j]), D = map(t, ...hole[i]);
        tiles.push({ pts: [A, B, C, D], n, edges: [[A, B], [C, D]], role });
      }
    } else {
      const us = profile.map(p => p[0]), vs = profile.map(p => p[1]);
      const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
      const nu = Math.max(1, Math.ceil((u1 - u0) / TILE)), nv = Math.max(1, Math.ceil((v1 - v0) / TILE));
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const cell = clipToCell(profile, u0 + (u1 - u0) * i / nu, v0 + (v1 - v0) * j / nv, u0 + (u1 - u0) * (i + 1) / nu, v0 + (v1 - v0) * (j + 1) / nv);
        if (cell.length < 3) continue;
        const edges = [];
        cell.forEach((p, k) => { const q = cell[(k + 1) % cell.length]; if (onRim(p, q)) edges.push([map(t, ...p), map(t, ...q)]); });
        tiles.push({ pts: cell.map(p => map(t, ...p)), n, edges, role });
      }
    }
  }
  return tiles;
}

function overlap2d(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = b[1] - a[1], ny = a[0] - b[0];
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of A) { const d = nx * p[0] + ny * p[1]; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const p of B) { const d = nx * p[0] + ny * p[1]; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    const tol = 1e-4 * Math.hypot(nx, ny);
    if (a1 <= b0 + tol || b1 <= a0 + tol) return false;
  }
  return true;
}

// Back-to-front order: for every pair of tiles that overlap on screen, work out which one sits
// behind the other's plane, then sort so nothing is painted before what it hides.
// Returns { tiles, cycles }; cycles counts orderings that could not be resolved.
export function sortTiles(tiles) {
  const E = 1e-4;
  tiles.forEach(t => {
    t.depth = t.pts.reduce((s, p) => s + p[0] + p[1] + p[2], 0) / t.pts.length;
    t.s = t.pts.map(proj);
    t.d = t.n[0] * t.pts[0][0] + t.n[1] * t.pts[0][1] + t.n[2] * t.pts[0][2];
    const xs = t.s.map(p => p[0]), ys = t.s.map(p => p[1]);
    t.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    t.after = []; t.wait = 0;
  });
  const side = (t, p) => t.n[0] * p[0] + t.n[1] * p[1] + t.n[2] * p[2] - t.d;
  const behind = (a, b) => a.pts.every(p => side(b, p) <= E) || b.pts.every(p => side(a, p) >= -E);
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
    const a = tiles[i], b = tiles[j];
    if (a.bb[2] <= b.bb[0] || b.bb[2] <= a.bb[0] || a.bb[3] <= b.bb[1] || b.bb[3] <= a.bb[1]) continue;
    const ab = behind(a, b), ba = behind(b, a);
    if (ab === ba || !overlap2d(a.s, b.s)) continue;
    if (ab) { a.after.push(b); b.wait++; } else { b.after.push(a); a.wait++; }
  }
  const left = [...tiles].sort((a, b) => a.depth - b.depth), out = [];
  let cycles = 0;
  while (left.length) {
    let k = left.findIndex(t => t.wait === 0);
    if (k < 0) { k = 0; cycles++; }
    const t = left.splice(k, 1)[0];
    out.push(t); t.after.forEach(u => u.wait--);
  }
  return { tiles: out, cycles };
}

/* ---------- colour ---------- */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const W = [255, 255, 255], K = [20, 24, 48];

// Colour roles from the visitor's choices: first couch, second couch, round add-on.
export function palette({ nug, nug2, chk }) {
  const n = hex2rgb(nug), n2 = hex2rgb(nug2 || nug), c = hex2rgb(chk);
  return {
    base: n, cush: mix(n, W, 0.22), tri: mix(n, K, 0.14),
    base2: n2, cush2: mix(n2, W, 0.22), tri2: mix(n2, K, 0.14),
    hoop: c, pad: mix(c, W, 0.28), puck: mix(c, K, 0.16),
  };
}
export const roleHex = (pal, role) => rgb2hex(pal[role]);

/* ---------- draw one build ---------- */
const cache = new WeakMap();
export function sortedTiles(build) {
  if (!cache.has(build)) cache.set(build, sortTiles(solidsOf(build).flatMap(tilesOf)));
  return cache.get(build);
}

export function drawBuild(build, pal) {
  const { tiles } = sortedTiles(build);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, fx0 = 1e9, fy0 = 1e9, fx1 = -1e9, fy1 = -1e9;
  const grow = (sx, sy) => { x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); };
  const f = v => v.toFixed(1);
  let out = '';
  for (const t of tiles) {
    const b = Math.max(0.5, Math.min(1.04, 0.58 + 0.5 * (t.n[0] * LIGHT[0] + t.n[1] * LIGHT[1] + t.n[2] * LIGHT[2])));
    const col = pal[t.role], fill = rgb2hex(b <= 1 ? col.map(v => v * b) : mix(col, W, (b - 1) * 2));
    const d = t.pts.map((p, i) => { const s = proj(p); grow(s[0], s[1]); fx0 = Math.min(fx0, p[0]); fx1 = Math.max(fx1, p[0]); fy0 = Math.min(fy0, p[1]); fy1 = Math.max(fy1, p[1]); return (i ? 'L' : 'M') + f(s[0]) + ' ' + f(s[1]); }).join('') + 'Z';
    out += `<path d="${d}" fill="${fill}" stroke="${fill}"/>`;
    if (t.edges.length) {
      const e = t.edges.map(([p, q]) => { const a = proj(p), c = proj(q); return `M${f(a[0])} ${f(a[1])}L${f(c[0])} ${f(c[1])}`; }).join('');
      out += `<path d="${e}" class="ln" stroke="${rgb2hex(mix(col, K, 0.6))}"/>`;
    }
  }
  const m = 9, rug = [[fx0 - m, fy0 - m, 0], [fx1 + m, fy0 - m, 0], [fx1 + m, fy1 + m, 0], [fx0 - m, fy1 + m, 0]].map(proj);
  let stick = '';
  for (const [x, y, z, ch, size] of build.stickers || []) {
    const s = proj([x, y, z]); grow(s[0] - size * 0.7, s[1] - size); grow(s[0] + size * 0.7, s[1] + size * 0.3);
    // emoji go in as HTML: emoji inside SVG <text> makes Chrome's PDF export fail
    stick += `<foreignObject x="${f(s[0] - size)}" y="${f(s[1] - size * 1.2)}" width="${size * 2}" height="${size * 1.5}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${size}px;line-height:1.3;text-align:center">${ch}</div></foreignObject>`;
  }
  const p = 5;
  return `<svg viewBox="${f(x0 - p)} ${f(y0 - p)} ${f(x1 - x0 + 2 * p)} ${f(y1 - y0 + 2 * p)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${build.name}">
    <style>path{stroke-width:.8px;stroke-linejoin:round;vector-effect:non-scaling-stroke}.ln{fill:none;stroke-width:1.5px;stroke-linecap:butt}</style>
    <polygon points="${rug.map(s => f(s[0]) + ',' + f(s[1])).join(' ')}" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round" opacity=".85"/>
    ${out}${stick}</svg>`;
}
