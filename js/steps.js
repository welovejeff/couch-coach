// The step-through: one step per physical piece, in the order the build lists them, and everything
// the build page works out from a build without drawing it. No browser dependency, so Node can test it.
import { piecesOf, solidsOf, PIECE_NAMES } from './pieces.js';
import { SETUPS, OWNED, inventory, fits, canMake, missing, untestedLabel } from './setups.js';

const TYPES = ['base', 'cushion', 'triangle', 'pad', 'hoop', 'puck'];
const SHORT = { base: 'base', cushion: 'cushion', triangle: 'triangle pillow', pad: 'round pad', hoop: 'hoop', puck: 'puck' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ---------- where a piece sits ---------- */
// [x0, y0, z0, x1, y1, z1] around some solids
export function boundsOf(solids) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const s of solids) {
    const at = (t, u, v) => s.axis === 'x' ? [s.o[0] + t, s.o[1] + u, s.o[2] + v] : s.axis === 'y' ? [s.o[0] + u, s.o[1] + t, s.o[2] + v] : [s.o[0] + u, s.o[1] + v, s.o[2] + t];
    for (const [u, v] of s.profile) for (const t of [0, s.len]) at(t, u, v).forEach((c, i) => { b[i] = Math.min(b[i], c); b[i + 3] = Math.max(b[i + 3], c); });
  }
  return b;
}

// How one half of a base or cushion lies: flat, stood up on an edge, or sloping.
const lieOf = s => s.axis !== 'z' ? 'lean' : s.len <= 6 ? 'flat' : 'up';
const flatHoop = p => p.type === 'hoop' && p.solids[0].axis === 'z';
const SUPPORT_ORDER = ['base', 'cushion', 'pad', 'hoop', 'puck', 'triangle'];
const ORDINALS = ['first', 'second', 'third', 'fourth'];

// What the piece rests on, in words: "on the floor", "on top of the base", "inside the hoop".
function restingPlace(pieces, boxes, i) {
  const p = pieces[i], b = boxes[i], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2;
  const sameSpot = j => Math.hypot((boxes[j][0] + boxes[j][3]) / 2 - cx, (boxes[j][1] + boxes[j][4]) / 2 - cy) < 3 && boxes[j][2] < b[5] - 0.5 && boxes[j][5] > b[2] + 0.5;
  const earlier = pieces.map((x, j) => j).filter(j => j < i);

  // a piece that is part flat and part sloping rests where its flat part is
  const level = p.solids.filter(s => lieOf(s) !== 'lean');
  const z0 = level.length && level.length < p.solids.length ? boundsOf(level)[2] : b[2];
  const under = [];
  if (z0 >= 0.5) for (const j of earlier) {
    const o = boxes[j], ox = Math.min(b[3], o[3]) - Math.max(b[0], o[0]), oy = Math.min(b[4], o[4]) - Math.max(b[1], o[1]);
    if (ox > 1 && oy > 1 && Math.abs(o[5] - z0) < 1.2) under.push(j);
  }
  const onTop = () => {
    const kinds = [...new Set(under.map(j => pieces[j].type))].sort((a, c) => SUPPORT_ORDER.indexOf(a) - SUPPORT_ORDER.indexOf(c));
    const t = kinds[0], mine = under.filter(j => pieces[j].type === t), down = earlier.filter(j => pieces[j].type === t);
    if (mine.length > 1) return `on top of the ${SHORT[t]}s`;
    // with two of a kind already down, or one of its own kind underneath, say which one
    const which = down.length > 1 || t === p.type ? ORDINALS[down.indexOf(mine[0])] + ' ' : '';
    const standing = pieces[mine[0]].solids.every(s => lieOf(s) === 'up') && (t === 'base' || t === 'cushion');
    return `${standing ? 'across the top of' : 'on top of'} the ${which}${SHORT[t]}`;
  };

  if (p.type === 'puck' && p.solids[0].axis === 'z') {
    const hoopHere = earlier.some(j => flatHoop(pieces[j]) && sameSpot(j));
    if (hoopHere) return under.some(j => pieces[j].type === 'puck') ? 'inside the hoop, on top of the first puck' : 'inside the hoop';
  }
  if (flatHoop(p)) {
    const inside = earlier.filter(j => pieces[j].type === 'puck' && sameSpot(j)).length;
    if (inside) return inside > 1 ? 'over the pucks' : 'over the puck';
  }
  if (z0 < 0.5) return 'on the floor';
  return under.length ? onTop() : 'where the picture shows';
}

// One sentence per placed piece, saying what to do with it. Returns, for each piece,
// { text, type, couch, k, total }: the k-th of `total` pieces of that type from that couch.
export function describeSteps(pieces) {
  const all = {}, seenAll = {}, per = {}, seenPer = {};
  for (const p of pieces) { all[p.type] = (all[p.type] || 0) + 1; const key = p.type + p.couch; per[key] = (per[key] || 0) + 1; }
  const boxes = pieces.map(p => boundsOf(p.solids));
  return pieces.map((p, i) => {
    const k = seenAll[p.type] = (seenAll[p.type] || 0) + 1, T = all[p.type], s = SHORT[p.type];
    const n = T === 1 ? `the ${s}` : k === 1 ? `a ${s}` : k === T ? (T === 2 ? `the other ${s}` : `the last ${s}`) : `another ${s}`;
    const where = restingPlace(pieces, boxes, i), up = p.solids[0].axis === 'z';
    const lies = p.solids.map(lieOf).sort().join('+'), [a, c] = p.solids;
    let text;
    if (p.how) text = p.how.replace('{n}', n).replace(/^./, c => c.toUpperCase());
    else if (p.type === 'base' || p.type === 'cushion') {
      if (lies === 'flat') text = `Lay ${n} flat ${where}`;
      else if (lies === 'up') text = `Stand ${n} on its long edge ${where}, like a wall`;
      else if (lies === 'lean') text = `Prop ${n} up at a slope ${where}`;
      else if (lies === 'flat+flat' && Math.abs(a.o[0] - c.o[0]) < 1 && Math.abs(a.o[1] - c.o[1]) < 1) text = `Fold ${n} in half and lay it ${where}`;
      else if (lies === 'up+up') {
        const straight = Math.abs(a.o[0] - c.o[0]) < 1 || Math.abs(a.o[1] - c.o[1]) < 1;
        text = straight ? `Stand ${n} on its long edge ${where}, like a wall` : `Stand ${n} on its long edge ${where} and bend it into a corner`;
      } else if (lies === 'lean+lean') text = `Stand ${n} up like a tent ${where}, with the fold at the top`;
      else if (lies === 'flat+lean') {
        // the sloping half either climbs from the flat half (a ramp) or runs down from it (a slide)
        const flat = p.solids.find(x => lieOf(x) === 'flat'), slope = p.solids.find(x => lieOf(x) === 'lean');
        const climbs = boundsOf([slope])[5] > boundsOf([flat])[5] + 1;
        text = `Lay half of ${n} flat ${where} and ${climbs ? 'prop the rest up like a ramp' : 'let the rest slope down like a slide'}`;
      }
      else if (lies === 'flat+up') text = `Bend ${n} into an L ${where}: one half flat, one half standing up`;
      else text = `Put ${n} ${where}, bent the way the picture shows`;
    } else if (p.type === 'triangle') text = up ? `Stand ${n} on its end ${where}` : `Set ${n} down ${where}, point up`;
    else if (p.type === 'puck') text = up ? `Lay ${n} flat ${where}` : `Stand ${n} on its rim ${where}, like a wheel`;
    else if (p.type === 'hoop') text = up ? (where.startsWith('over') ? `Lower ${n} ${where}` : `Lay ${n} flat ${where}`) : `Stand ${n} up on its rim ${where}`;
    else text = `Lay ${n} flat ${where}`;
    const key = p.type + p.couch;
    return { text: text.replace(/\.$/, '') + '.', type: p.type, couch: p.couch, k: seenPer[key] = (seenPer[key] || 0) + 1, total: per[key] };
  });
}

/* ---------- steps ---------- */
// A folded base is two solids but one piece, so it is one step.
export function stepsOf(build) {
  const solids = solidsOf(build), pieces = piecesOf(build), said = describeSteps(pieces);
  return pieces.map((p, i) => ({ label: PIECE_NAMES[p.type], solids: solids.filter(s => s.piece === i), ...said[i] }));
}

// n counts from 1; 0 means the whole build is shown, before the first step.
export const captionFor = (steps, n) => n === 0 ? `All ${steps.length} pieces` : `Step ${n} of ${steps.length}: ${steps[n - 1].text}`;
export const nextStep = (steps, n) => Math.min(steps.length, n + 1);
export const prevStep = n => Math.max(1, n - 1);

// The page walks 0 (before you start), 1..N (one piece each), N + 1 (finished).
export const clampStep = (n, count) => Math.max(0, Math.min(count + 1, Math.round(n) || 0));

// The words on the one main button. `small` is the quieter count beside it.
export function mainLabel(n, count) {
  if (n <= 0) return { text: 'Start building', small: plural(count, 'step') };
  if (n > count) return { text: 'Pick the next build', small: '' };
  if (n === count) return { text: 'Finish', small: '' };
  return { text: 'Next piece', small: `${n} of ${count}` };
}

// "Triangle pillow · second couch · 1 of 2", under the step sentence.
export function pieceLine(step, twoCouches = false) {
  return [step.label, ...(twoCouches && PER_COUCH_TYPES.has(step.type) ? [step.couch === 2 ? 'second couch' : 'first couch'] : []), ...(step.total > 1 ? [`${step.k} of ${step.total}`] : [])].join(' · ');
}
const PER_COUCH_TYPES = new Set(['base', 'cushion', 'triangle']);

// The kicker, sentence and follow-up line for any position of the step-through.
export function stepModel(steps, n, floor = '', prop = null) {
  const count = steps.length;
  if (n <= 0) return { state: 'before', kicker: 'Before you start', say: `Clear ${floor ? floor.replace(/^About/, 'about') : 'some floor'}${prop ? ` in front of ${prop.words}` : ''}, then put down one piece at a time.`, more: 'This is the finished build. The steps start from an empty floor. A grown-up does the building: let your kid pick the build and pass you the pieces.' };
  if (n > count) return { state: 'done', kicker: 'Finished', say: `All ${count} pieces are down.`, more: 'Check it stands firm before anyone climbs on, and stay close the first time.' };
  return { state: 'step', kicker: `Step ${n} of ${count}`, say: steps[n - 1].text, more: '' };
}

/* ---------- parts ---------- */
// One row per kind of piece (and per couch, when the build uses two), with how many are down
// after step n. `now` marks the kind being placed at step n.
export function partsOf(steps, n = 0) {
  const count = steps.length, at = Math.max(0, Math.min(count, n)), cur = n >= 1 && n <= count ? steps[n - 1] : null;
  const two = steps.some(s => s.couch === 2), rows = [];
  for (const type of TYPES) for (const couch of [1, 2]) {
    const mine = s => s.type === type && s.couch === couch, need = steps.filter(mine).length;
    if (!need) continue;
    const down = steps.slice(0, at).filter(mine).length;
    rows.push({
      key: `${type}-${couch}`, type, couch, name: PIECE_NAMES[type], need, down,
      from: two && PER_COUCH_TYPES.has(type) ? (couch === 2 ? 'Second couch' : 'First couch') : '',
      note: n <= 0 ? '' : down === need ? (need > 1 ? 'All down' : 'Down') : need > 1 ? `${down} of ${need} down` : '',
      done: n > 0 && down === need, now: !!cur && mine(cur),
    });
  }
  return rows;
}

// What the build's set-up has that the build leaves on the side; '' when it uses everything.
export function leftOver(build) {
  const have = inventory(build.setup), used = {}, left = [];
  for (const p of piecesOf(build)) used[p.type] = (used[p.type] || 0) + 1;
  for (const t of TYPES) { const spare = have[t] - (used[t] || 0); if (spare > 0) left.push(plural(spare, SHORT[t])); }
  return left.length ? `Not used in this build: ${left.join(', ')}.` : '';
}

/* ---------- header facts ---------- */
// The floor the finished build covers, in feet rounded up to the half foot, longest side first.
export function floorSpace(build) {
  const b = boundsOf(solidsOf(build));
  if (build.prop) b[0] = Math.max(b[0], 0);   // the part lying on the sofa takes up no floor
  const [long, short] = [b[3] - b[0], b[4] - b[1]].map(v => Math.ceil(v / 12 * 2 - 1e-9) / 2).sort((x, y) => y - x);
  return { long, short, text: `About ${long} × ${short} ft of floor` };
}

// Can the saved set-up make this build? `owned` is '' when nothing is saved.
export function verdictFor(buildSetup, owned) {
  if (!OWNED[owned]) return { kind: 'unknown', text: `Made for: ${SETUPS[buildSetup].label}`, note: '' };
  const short = missing(buildSetup, owned).map(m => /^\d/.test(m) ? m : `a ${m}`);
  if (short.length) return { kind: 'short', text: `You need ${short.join(' and ')} for this one`, note: `Your set-up is ${OWNED[owned].label}.` };
  return { kind: 'ok', text: 'You have every piece for this', note: '' };
}

/* ---------- where next ---------- */
// Up to `count` builds to make next with the same pieces: the visitor's own builds when this one
// fits what they have, otherwise the builds written for this build's set-up. Same set-up and same
// theme come first.
export function nextBuilds(builds, build, owned = '', count = 4) {
  const mine = OWNED[owned] && fits(build.setup, owned);
  const pool = (mine ? canMake(builds, owned) : builds.filter(b => b.setup === build.setup)).filter(b => b.id !== build.id);
  const rank = b => (b.setup === build.setup ? 0 : 2) + (b.theme === build.theme ? 0 : 1);
  return pool.map((b, i) => [rank(b), i, b]).sort((p, q) => p[0] - q[0] || p[1] - q[1]).slice(0, count).map(r => r[2]);
}
export const nextBuildsNote = (build, owned = '') => OWNED[owned] && fits(build.setup, owned)
  ? `Nothing extra needed. These all work with ${OWNED[owned].label}.`
  : `These all use ${SETUPS[build.setup].label}.`;

// The builds either side of this one in the library, wrapping at the ends.
export function neighbours(builds, id) {
  const i = builds.findIndex(b => b.id === id), n = builds.length;
  return { prev: builds[(i + n - 1) % n], next: builds[(i + 1) % n] };
}

// What the build page needs to show for a build id, or a not-found state.
export function pageModel(builds, id) {
  const build = builds.find(b => b.id === id);
  if (!build) return { found: false };
  return { found: true, build, name: build.name, label: untestedLabel(build), steps: stepsOf(build) };
}
