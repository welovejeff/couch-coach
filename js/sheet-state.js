// Which builds are on the printable sheet, in order, and which of them the family chose to keep.
// A sheet is { ids, kept, for }: `for` is the owned set-up it was made for. No browser dependency.
import { OWNED, SETUP_IDS, fits } from './setups.js';

const THEME_ORDER = ['go', 'fort', 'climb'];

// Deal a list out so each row mixes a vehicle, a fort and a climber.
export function mixThemes(builds) {
  const piles = THEME_ORDER.map(t => builds.filter(b => b.theme === t)), out = [];
  while (piles.some(p => p.length)) for (const p of piles) if (p.length) out.push(p.shift());
  return out;
}

// Every build a family can make, best suggestions first: the ones written for exactly what they
// own, then the simpler ones. Two couches with the add-on has none of its own, so it takes turns.
export function candidates(builds, ownedId) {
  if (!OWNED[ownedId]) return [];
  const sets = SETUP_IDS.filter(s => fits(s, ownedId)).map(s => mixThemes(builds.filter(b => b.setup === s)));
  if (SETUP_IDS.includes(ownedId)) return [...sets.filter(s => s[0]?.setup === ownedId), ...sets.filter(s => s[0]?.setup !== ownedId)].flat();
  const out = [];
  for (let i = 0; sets.some(s => i < s.length); i += 4) for (const s of [...sets].reverse()) out.push(...s.slice(i, i + 4));
  return out;
}

export const suggest = (builds, ownedId, count = 12) => ({ ids: candidates(builds, ownedId).slice(0, count).map(b => b.id), kept: [], for: ownedId });

// Bring a stored sheet in line with the library and the current set-up: kept builds that still
// fit stay where they can, everything else is topped up from the suggestions.
export function normalise(sheet, builds, ownedId, count = 12) {
  const pool = candidates(builds, ownedId).map(b => b.id);
  if (!sheet || sheet.for !== ownedId) {
    const kept = (sheet?.kept || []).filter(id => pool.includes(id)).slice(0, count);
    return { ids: [...kept, ...pool.filter(id => !kept.includes(id))].slice(0, count), kept, for: ownedId };
  }
  const ids = [...new Set(sheet.ids)].filter(id => pool.includes(id)).slice(0, count);
  for (const id of pool) { if (ids.length >= count) break; if (!ids.includes(id)) ids.push(id); }
  return { ids, kept: (sheet.kept || []).filter(id => ids.includes(id)), for: ownedId };
}

export const onSheet = (sheet, id) => sheet.ids.includes(id);
export const isKept = (sheet, id) => sheet.kept.includes(id);
export const spares = (sheet, builds, ownedId) => candidates(builds, ownedId).filter(b => !sheet.ids.includes(b.id));

export const keep = (sheet, id, on = !isKept(sheet, id)) => ({ ...sheet, kept: on ? [...new Set([...sheet.kept, id])] : sheet.kept.filter(k => k !== id) });

// Put `inId` where `outId` was. The new card is kept, since someone chose it.
export function swap(sheet, outId, inId) {
  if (!onSheet(sheet, outId) || onSheet(sheet, inId)) return sheet;
  return { ...sheet, ids: sheet.ids.map(id => id === outId ? inId : id), kept: [...sheet.kept.filter(k => k !== outId), inId] };
}

// "Add to sheet" from a card elsewhere on the site. Picks sit first, in the order they were
// picked: the build goes straight after the last pick, and if it was not on the sheet already the
// last suggestion makes room. Returns the sheet unchanged when every card is a pick.
export function add(sheet, id) {
  if (isKept(sheet, id) || isFull(sheet)) return sheet;
  const ids = sheet.ids.filter(x => x !== id);
  if (ids.length === sheet.ids.length) ids.splice(ids.findLastIndex(x => !isKept(sheet, x)), 1);
  ids.splice(ids.findLastIndex(x => isKept(sheet, x)) + 1, 0, id);
  return { ...sheet, ids, kept: [...sheet.kept, id] };
}
// Un-keeping a build lets shuffle and set-up changes replace it; it stays where it is.
export const remove = (sheet, id) => keep(sheet, id, false);
export const isFull = sheet => sheet.ids.length > 0 && sheet.ids.every(id => isKept(sheet, id));

// Taking a pick off the sheet: the later cards close up and a suggestion fills the end.
export function takeOff(sheet, id, builds, ownedId) {
  if (!onSheet(sheet, id)) return sheet;
  const rest = sheet.ids.filter(x => x !== id), pool = candidates(builds, ownedId).map(b => b.id);
  const fill = pool.find(x => x !== id && !rest.includes(x)) ?? id;
  return { ...sheet, ids: [...rest, fill], kept: sheet.kept.filter(k => k !== id) };
}

// Swap a suggestion for the next build the family can make that is not on the sheet.
export function another(sheet, id, builds, ownedId) {
  const pool = candidates(builds, ownedId).map(b => b.id), at = pool.indexOf(id);
  if (isKept(sheet, id) || at < 0) return sheet;
  for (let step = 1; step < pool.length; step++) {
    const next = pool[(at + step) % pool.length];
    if (!onSheet(sheet, next)) return { ...sheet, ids: sheet.ids.map(x => x === id ? next : x) };
  }
  return sheet;
}

// Make the sheet hold `count` builds. Shrinking keeps picks ahead of suggestions, so the picks
// that come off are the last ones; growing tops up with suggestions.
export function resize(sheet, builds, ownedId, count) {
  const ordered = sheet.ids.length > count ? [...sheet.ids.filter(id => isKept(sheet, id)), ...sheet.ids.filter(id => !isKept(sheet, id))] : sheet.ids;
  return normalise({ ...sheet, ids: ordered.slice(0, count), kept: sheet.kept.filter(id => ordered.indexOf(id) < count) }, builds, ownedId, count);
}
export const picksLost = (sheet, count) => Math.max(0, sheet.kept.length - count);

export function move(sheet, id, by) {
  const i = sheet.ids.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= sheet.ids.length) return sheet;
  const ids = [...sheet.ids]; [ids[i], ids[j]] = [ids[j], ids[i]];
  return { ...sheet, ids };
}

// Replace every card that is not kept with a random spare. `rand` returns a number in [0, 1).
export function shuffle(sheet, builds, ownedId, rand = Math.random) {
  const pool = candidates(builds, ownedId).map(b => b.id).filter(id => !isKept(sheet, id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return { ...sheet, ids: sheet.ids.map(id => isKept(sheet, id) ? id : pool.shift() ?? id) };
}

// Stored form: ids joined with dots, kept ones marked with a star, e.g. "couch-addon:race-car*.castle".
export const encode = sheet => `${sheet.for}:${sheet.ids.map(id => id + (isKept(sheet, id) ? '*' : '')).join('.')}`;
export function decode(text) {
  const m = /^([a-z-]*):([a-z0-9.*-]*)$/.exec(text || '');
  if (!m) return null;
  const parts = m[2].split('.').filter(Boolean);
  return { for: m[1], ids: parts.map(p => p.replace('*', '')), kept: parts.filter(p => p.endsWith('*')).map(p => p.slice(0, -1)) };
}

// How big the sheet is. It lives in the saved print options, "paper.sides.pictures.ink"
// (for example "letter.2.6.full"): a sheet starts as one page of six.
export function sheetSize(prefs) {
  const [, sides, per] = String(prefs.get('sheetopts') || '').split('.');
  const pages = sides === '2' ? 2 : 1, each = per === '4' ? 4 : 6;
  return { pages, per: each, count: pages * each };
}
export function setPages(prefs, pages) {
  const parts = String(prefs.get('sheetopts') || '').split('.');
  while (parts.length < 4) parts.push('');
  parts[1] = String(pages);
  prefs.set('sheetopts', parts.join('.'));
}

// The sheet as every page should see it, read from saved choices and made valid for the set-up.
export const loadSheet = (prefs, builds, count = sheetSize(prefs).count) => normalise(decode(prefs.get('sheet')), builds, prefs.get('setup'), count);
export const saveSheet = (prefs, sheet) => prefs.set('sheet', encode(sheet));
