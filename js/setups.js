// Set-ups: what a family owns, as an inventory of physical pieces.
import { piecesOf, PIECE_NAMES } from './pieces.js';

export const SETUPS = {
  'couch': { label: '1 play couch', couches: 1, addon: false },
  'couch-addon': { label: '1 play couch + round add-on', couches: 1, addon: true },
  'two-couch': { label: '2 play couches', couches: 2, addon: false },
};
export const SETUP_IDS = Object.keys(SETUPS);
export const DEFAULT_SETUP = 'couch-addon';

export const THEMES = { go: 'Things that go', fort: 'Forts', climb: 'Climb & slide' };

const PER_COUCH = { base: 1, cushion: 1, triangle: 2 }, ADDON = { pad: 1, hoop: 1, puck: 2 };

export function inventory(setupId) {
  const s = SETUPS[setupId], inv = {};
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
export const canMake = (builds, ownedId) => SETUPS[ownedId] ? builds.filter(b => fits(b.setup, ownedId)) : builds;

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
