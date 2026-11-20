// Set-ups: what a family owns, as an inventory of physical pieces.
import { piecesOf, PIECE_NAMES, baseFlat, cushFlat, tri, ottoman, second } from './pieces.js';

// The set-ups builds are written for. `tag` is the short wording used on cards.
export const SETUPS = {
  'couch': { label: '1 play couch', tag: '1 couch', couches: 1, addon: false },
  'couch-addon': { label: '1 play couch + round add-on', tag: '1 couch + add-on', couches: 1, addon: true },
  'two-couch': { label: '2 play couches', tag: '2 couches', couches: 2, addon: false },
};
export const SETUP_IDS = Object.keys(SETUPS);

// What a family can own: the three above, plus two couches with the round add-on, which fits every build.
export const OWNED = { ...SETUPS, 'two-couch-addon': { label: '2 play couches + round add-on', tag: '2 couches + add-on', couches: 2, addon: true } };
export const OWNED_IDS = Object.keys(OWNED);

export const THEMES = { go: 'Things that go', fort: 'Forts', climb: 'Climb & slide' };

const PER_COUCH = { base: 1, cushion: 1, triangle: 2 }, ADDON = { pad: 1, hoop: 1, puck: 2 };

export function inventory(setupId) {
  const s = OWNED[setupId], inv = {};
  for (const t in PER_COUCH) inv[t] = PER_COUCH[t] * s.couches;
  for (const t in ADDON) inv[t] = s.addon ? ADDON[t] : 0;
  return inv;
}

// Can a family that owns `ownedId` make a build designed for `buildSetupId`?
export function fits(buildSetupId, ownedId) {
  const need = inventory(buildSetupId), have = inventory(ownedId);
  return Object.keys(need).every(t => need[t] <= have[t]);
}

// Every build the visitor can make; with nothing chosen, every build.
export const canMake = (builds, ownedId) => OWNED[ownedId] ? builds.filter(b => fits(b.setup, ownedId)) : builds;

// What a family is short of for a build, in the words cards use: 'round add-on', '2 couches'.
export function missing(buildSetupId, ownedId) {
  const need = SETUPS[buildSetupId], have = OWNED[ownedId], out = [];
  if (!have) return out;
  if (need.addon && !have.addon) out.push('round add-on');
  if (need.couches > have.couches) out.push('2 couches');
  return out;
}
export const needsLabel = (buildSetupId, ownedId) => { const m = missing(buildSetupId, ownedId); return m.length ? 'Needs ' + m.join(' and ') : ''; };

// A drawing of a set-up itself, made from the real pieces, for the "what do you own" tiles.
const couchPieces = (x, y) => [baseFlat(x, y, 0, 'x'), cushFlat(x, y, 5.5, 'x'), tri(x, y, 8.75, 'y'), tri(x + 51, y, 8.75, 'y')];
const pictures = {};
export function setupPicture(ownedId) {
  const o = OWNED[ownedId];
  return pictures[ownedId] ||= {
    name: o.label, stickers: [],
    pieces: [couchPieces(0, 0), ...(o.couches === 2 ? [second(couchPieces(0, 46))] : []), ...(o.addon ? [ottoman(92, o.couches === 2 ? 39.5 : 16.5, 0)] : [])],
  };
}

// The sofa or wall a build leans on, in the words cards use; '' for a build that uses only the floor.
export const usesLabel = build => build.prop ? `Uses ${build.prop.words}` : '';

export const untestedLabel = build => build.tested ? '' : 'Not yet kid-tested';

// Problems with one build: unknown set-up or theme, or more pieces than its set-up holds.
export function checkBuild(build) {
  const errors = [], say = m => errors.push(`${build.id}: ${m}`);
  if (!build.id || !build.name) say('needs an id and a name');
  if (!THEMES[build.theme]) say(`unknown theme "${build.theme}"`);
  if (!SETUPS[build.setup]) { say(`unknown set-up "${build.setup}"`); return errors; }
  const have = inventory(build.setup), used = {}, perCouch = {};
  for (const p of piecesOf(build)) {
    used[p.type] = (used[p.type] || 0) + 1;
    const k = p.type + '/' + p.couch;
    perCouch[k] = (perCouch[k] || 0) + 1;
    if (p.couch > SETUPS[build.setup].couches) say(`uses a second couch's ${PIECE_NAMES[p.type]} but has one couch`);
  }
  for (const t in used) if (used[t] > have[t]) say(`uses ${used[t]} × ${PIECE_NAMES[t]} but ${SETUPS[build.setup].label} has ${have[t]}`);
  for (const k in perCouch) { const t = k.split('/')[0]; if (PER_COUCH[t] && perCouch[k] > PER_COUCH[t]) say(`takes ${perCouch[k]} × ${PIECE_NAMES[t]} from one couch`); }
  return errors;
}

export function checkLibrary(builds) {
  const errors = builds.flatMap(checkBuild), seen = new Set();
  for (const b of builds) { if (seen.has(b.id)) errors.push(`${b.id}: duplicate id`); seen.add(b.id); }
  return errors;
}
