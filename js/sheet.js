// The printable double-sided sheet: 12 build cards, six to a page.
import { BUILDS } from './builds.js';
import { drawBuild, palette } from './flat.js';
import { browserPrefs } from './prefs.js';
import { SETUPS, SETUP_IDS, DEFAULT_SETUP, untestedLabel } from './setups.js';

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A stored choice wins; with none, the sheet assumes one couch plus the round add-on.
export const sheetSetup = stored => SETUPS[stored] ? stored : DEFAULT_SETUP;

// The builds a sheet shows: the ones made for exactly the chosen set-up.
export const sheetBuilds = (builds, setupId) => builds.filter(b => b.setup === setupId).slice(0, 12);

// Six cards to a page, in library order.
export const sheetPages = builds => [builds.slice(0, 6), builds.slice(6, 12)];

export const sheetTitle = (kid, page) => page === 0 ? (kid ? `${esc(kid)}’s Couch Builds` : 'My Couch Builds') : 'More Couch Builds!';

// The footer names the pieces the sheet is for, in the site's own wording.
export const footerLine = setupId => SETUPS[setupId].label;

// Which colour controls a set-up needs.
export const colorControls = setupId => ({ nug2: SETUPS[setupId].couches === 2, chk: SETUPS[setupId].addon });

export function sheetHtml(builds, { kid, pal, setupId }) {
  const card = (b, i) => `<section class="card ${b.theme}"><div class="num">${i + 1}</div><div class="star">★</div>
      <div class="pic">${drawBuild(b, pal)}</div>${untestedLabel(b) ? `<span class="untested">${untestedLabel(b)}</span>` : ''}<div class="name">${esc(b.name)}</div></section>`;
  return sheetPages(builds).map((list, pg) => `<article class="page">
      <header><span class="em">${pg ? '🚀' : '🛋️'}</span><h2>${sheetTitle(kid, pg)}</h2><span class="em">${pg ? '🚀' : '⭐'}</span></header>
      <div class="grid">${list.map((b, i) => card(b, pg * 6 + i)).join('')}</div>
      <footer><span class="key"><span><i style="background:var(--go)"></i>Things that go</span><span><i style="background:var(--fort)"></i>Forts</span><span><i style="background:var(--climb)"></i>Climb &amp; slide</span><span>★ Color the star when you build it!</span></span>
      <span>${footerLine(setupId)} · grown-up nearby</span></footer></article>`).join('');
}

export function initSheet() {
  const prefs = browserPrefs(), $ = id => document.getElementById(id);
  const render = () => {
    const setupId = sheetSetup(prefs.get('setup')), show = colorControls(setupId);
    $('nug2-row').hidden = !show.nug2;
    $('chk-row').hidden = !show.chk;
    $('pages').innerHTML = sheetHtml(sheetBuilds(BUILDS, setupId), { kid: prefs.get('kid').trim(), pal: palette(prefs.colors()), setupId });
  };
  const fit = () => { $('pages').style.zoom = Math.min(1, (window.innerWidth - 32) / 816); };
  $('setup').innerHTML = SETUP_IDS.map(id => `<option value="${id}">${SETUPS[id].label}</option>`).join('');
  $('setup').value = sheetSetup(prefs.get('setup'));
  $('setup').addEventListener('change', () => { prefs.set('setup', $('setup').value); render(); });
  for (const id of ['kid', 'nug', 'nug2', 'chk']) {
    $(id).value = id === 'nug2' ? prefs.colors().nug2 : prefs.get(id);
    $(id).addEventListener('input', () => { prefs.set(id, $(id).value); render(); });
  }
  $('print').addEventListener('click', () => window.print());
  window.addEventListener('resize', fit);
  fit(); render();
}
