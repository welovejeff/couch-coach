// The gallery home page: every build, sorted by what the family owns and filtered by theme.
// The decisions (which sections, which order, what the count line says) are pure
// functions at the top so Node can test them; initGallery at the bottom wires them to the page.
import { BUILDS } from './builds.js';
import { SETUPS, SETUP_IDS, OWNED, THEMES, fits, missing, needsLabel } from './setups.js';
import { candidates, mixThemes, isKept, loadSheet } from './sheet-state.js';
import { mountTracker } from './tracker.js';
import { cardHtml, cardModel, buildHref, drawWhenSeen } from './card.js';
import { mountHeader, themeIcon, themeLabel, COPY } from './brand.js';
import { mountSetupBar } from './setup-bar.js';
import { browserPrefs } from './prefs.js';
import { palette } from './flat.js';
import { esc } from './html.js';

const plural = (n, word = 'build') => `${n} ${word}${n === 1 ? '' : 's'}`;

export const SUB_LINE = 'Cars, forts and slides. Free. Tap one to see it go together piece by piece.';
export const CAN_TITLE = 'You can build these now';
export const EMPTY_MESSAGE = 'No builds in this theme for your set-up yet.';
const SECTION_NOTES = { couch: 'Everyone can make these' };
// How a folded row names what is missing; `missing` gives the short words cards use.
const MISSING_THING = { 'round add-on': 'the round add-on', '2 couches': 'a second play couch' };
const size = setupId => SETUPS[setupId].couches * 2 + (SETUPS[setupId].addon ? 1 : 0);

export const headline = builds => `${plural(builds.length, 'build idea')} for your play couch`;

// "12 more builds need the round add-on". `missingThings` is what setups.missing returns.
export const parkedTitle = (n, missingThings) =>
  `${n} more ${n === 1 ? 'build needs' : 'builds need'} ${missingThings.map(m => MISSING_THING[m] || m).join(' and ')}`;

// What the gallery lists, top to bottom.
// Nothing owned: every build in one section per set-up, smallest set-up first.
// A set-up owned: one section of builds the family can make (the ones that use everything they
// own first), then one folded group per missing thing for the builds they cannot make.
// `count` is how many builds are on show before anything folded is opened.
export function gallerySections(builds, { owned = '', theme = '' } = {}) {
  const inTheme = b => !theme || b.theme === theme;
  if (!OWNED[owned]) {
    const sections = [...SETUP_IDS].sort((a, b) => size(a) - size(b)).map(id => ({
      key: id, title: SETUPS[id].label, note: SECTION_NOTES[id] || '', builds: mixThemes(builds.filter(b => b.setup === id && inTheme(b))),
    })).filter(s => s.builds.length);
    return { chosen: false, sections, parked: [], count: sections.reduce((n, s) => n + s.builds.length, 0) };
  }
  const can = candidates(builds, owned).filter(inTheme), groups = new Map();
  for (const b of builds) {
    if (fits(b.setup, owned) || !inTheme(b)) continue;
    const key = needsLabel(b.setup, owned);
    groups.set(key, [...(groups.get(key) || []), b]);
  }
  const parked = [...groups].map(([key, list]) => ({ key, title: parkedTitle(list.length, missing(list[0].setup, owned)), builds: mixThemes(list) }));
  return { chosen: true, sections: [{ key: 'can', title: CAN_TITLE, note: '', builds: can }], parked, count: can.length };
}

// The line under the theme chips: "12 builds you can make with 1 couch", or "36 builds".
export const countLine = (n, owned = '') => OWNED[owned] ? `${plural(n)} you can make with ${OWNED[owned].tag}` : plural(n);

// The build a video link named with ?seen=<id>, or null so the page stays as it is.
export const seenBuild = (builds, id) => (id && builds.find(b => b.id === id)) || null;

// ---------- HTML ----------

export function seenHtml(build, owned = '') {
  const c = cardModel(build, { owned });
  return `<article class="card seen ${c.theme}" data-id="${c.id}">
    <a class="seen-pic" href="${c.href}" tabindex="-1" aria-hidden="true"><span class="pic" data-pic="${c.id}"></span></a>
    <div class="seen-body">
      <span class="eyebrow">From the video</span>
      <h2 class="name">${esc(c.name)}</h2>
      <span class="meta">${themeLabel(c.theme)}<span class="tag${c.needs ? ' needs' : ''}">${c.needs || c.tag}</span></span>
      ${c.uses ? `<span class="uses">${c.uses}</span>` : ''}
      ${c.label ? `<span class="untested">${c.label}</span>` : ''}
      <a class="btn primary" href="${c.href}">See how to build it</a>
    </div></article>`;
}

// `sheet` is null when there is no set-up, and so no sheet to add to. `openRows` holds the keys
// of the folded rows the visitor has opened.
export function listHtml(model, { owned = '', theme = '', sheet = null, openRows = new Set() } = {}) {
  const grid = (list, toggle) => `<div class="grid">${list.map(b =>
    cardHtml(b, { owned, onSheet: !!sheet && isKept(sheet, b.id), sheetToggle: toggle && !!sheet })).join('')}</div>`;
  const empty = `<div class="panel empty"><p>${model.chosen ? EMPTY_MESSAGE : 'No builds in this theme yet.'}</p>
    <button class="btn" type="button" data-act="all-themes">Show everything</button></div>`;
  const sections = model.sections.map(s => `<section class="sec" aria-labelledby="sec-${s.key}">
    <div class="sec-head"><h2 id="sec-${s.key}">${esc(s.title)}</h2><span class="small">${plural(s.builds.length)}${s.note ? `. ${esc(s.note)}` : ''}</span></div>
    ${s.builds.length ? grid(s.builds, true) : theme ? empty : ''}</section>`).join('');
  const parked = model.parked.map(p => `<details class="parked" data-key="${esc(p.key)}"${openRows.has(p.key) ? ' open' : ''}>
    <summary><span><b>${esc(p.title)}</b><small>Tap to look anyway</small></span></summary>
    ${grid(p.builds, false)}</details>`).join('');
  return (sections || (theme ? empty : '')) + parked;
}

const themeChips = current => [['', 'All'], ...Object.entries(THEMES)].map(([id, name]) =>
  `<label><input type="radio" name="theme" value="${id}"${id === current ? ' checked' : ''}><span class="chip">${id ? themeIcon(id) : ''}${esc(name)}</span></label>`).join('');

// REVIEW AID, not a feature: ?own=<set-up> (and ?kid=<name>) lay choices over the saved ones so a
// chosen state can be screenshotted in a fresh browser. While one is in the address nothing is
// saved: choices made on the page last only until it is reloaded.
function reviewPrefs(prefs, q) {
  const over = {};
  if (OWNED[q.get('own')]) Object.assign(over, { setup: q.get('own'), answered: '1', other: '' });
  if (q.get('kid')) over.kid = q.get('kid').slice(0, 60);
  if (!Object.keys(over).length) return prefs;
  const get = k => k in over ? over[k] : prefs.get(k);
  return { get, set: (k, v) => { over[k] = v; }, colors: () => ({ nug: get('nug'), nug2: get('nug2') || get('nug'), chk: get('chk') }) };
}

export function initGallery() {
  const q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
  const prefs = reviewPrefs(browserPrefs(), q);
  const seen = seenBuild(BUILDS, q.get('seen')), openRows = new Set();
  // REVIEW AIDS: ?theme=<theme> starts with that theme chosen, ?open=all starts with the folded rows open.
  let theme = THEMES[q.get('theme')] ? q.get('theme') : '', openAll = q.get('open') === 'all';

  const owned = () => OWNED[prefs.get('setup')] ? prefs.get('setup') : '';
  const sheet = () => owned() ? loadSheet(prefs, BUILDS) : null;

  mountHeader($('top'), 'gallery');
  $('headline').textContent = headline(BUILDS);
  $('sub').textContent = SUB_LINE;
  $('fits').textContent = COPY.fits;
  $('explain').innerHTML = COPY.untestedWhy.startsWith(COPY.untested)
    ? `<b>${esc(COPY.untested)}</b>${esc(COPY.untestedWhy.slice(COPY.untested.length))}` : esc(COPY.untestedWhy);
  $('themes').innerHTML = themeChips(theme);

  const pics = drawWhenSeen($('page'), id => BUILDS.find(b => b.id === id), () => palette(prefs.colors()));

  // the cards' "Add to sheet" buttons follow the saved sheet
  function syncCards() {
    const now = sheet();
    $('list').querySelectorAll('[data-add]').forEach(btn => {
      const on = !!now && isKept(now, btn.dataset.add);
      btn.setAttribute('aria-pressed', on);
      btn.textContent = on ? 'On your sheet' : 'Add to sheet';
    });
  }
  const tracker = mountTracker({ prefs, builds: BUILDS, pal: () => palette(prefs.colors()), pageEl: $('page'), onChange: syncCards });

  function render() {
    const own = owned(), model = gallerySections(BUILDS, { owned: own, theme });
    if (openAll) { model.parked.forEach(p => openRows.add(p.key)); openAll = false; }
    $('seen').innerHTML = seen ? seenHtml(seen, own) : '';
    $('count').textContent = countLine(model.count, own);
    $('list').innerHTML = listHtml(model, { owned: own, theme, sheet: sheet(), openRows });
    pics.watch();
    tracker.refresh();
  }

  const setTheme = t => {
    theme = t;
    $('themes').querySelectorAll('input').forEach(i => { i.checked = i.value === t; });
    render();
  };
  $('themes').addEventListener('change', e => setTheme(e.target.value));

  // remember which folded rows are open so a redraw leaves them as they were
  $('list').addEventListener('toggle', e => {
    const key = e.target.dataset?.key;
    if (key) openRows[e.target.open ? 'add' : 'delete'](key);
  }, true);

  $('list').addEventListener('click', e => {
    if (e.target.closest('[data-act="all-themes"]')) { setTheme(''); return; }
    const btn = e.target.closest('[data-add]');
    if (btn) tracker.toggle(btn.dataset.add);
  });

  const bar = mountSetupBar($('setup'), {
    prefs, startOpen: true,
    onChange(what) {
      if (what === 'color') { pics.redraw(); tracker.refresh({ colors: true }); }
      else if (what === 'kid') tracker.refresh();
      else render();
    },
  });
  $('change').addEventListener('click', () => bar.open());

  render();
}

export { buildHref };
