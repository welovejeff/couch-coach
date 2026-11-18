// The printable double-sided sheet: 12 build cards, six to a page.
import { BUILDS } from './builds.js';
import { drawBuild, palette } from './flat.js';
import { browserPrefs } from './prefs.js';

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The builds a sheet shows.
export const sheetBuilds = builds => builds.slice(0, 12);

// Six cards to a page, in library order.
export const sheetPages = builds => [builds.slice(0, 6), builds.slice(6, 12)];

export const sheetTitle = (kid, page) => page === 0 ? (kid ? `${esc(kid)}’s Couch Builds` : 'My Couch Builds') : 'More Couch Builds!';

export const footerLine = () => '1 play couch + round add-on';

export function sheetHtml(builds, { kid, pal }) {
  const card = (b, i) => `<section class="card ${b.theme}"><div class="num">${i + 1}</div><div class="star">★</div>
      <div class="pic">${drawBuild(b, pal)}</div><div class="name">${esc(b.name)}</div></section>`;
  return sheetPages(builds).map((list, pg) => `<article class="page">
      <header><span class="em">${pg ? '🚀' : '🛋️'}</span><h2>${sheetTitle(kid, pg)}</h2><span class="em">${pg ? '🚀' : '⭐'}</span></header>
      <div class="grid">${list.map((b, i) => card(b, pg * 6 + i)).join('')}</div>
      <footer><span class="key"><span><i style="background:var(--go)"></i>Things that go</span><span><i style="background:var(--fort)"></i>Forts</span><span><i style="background:var(--climb)"></i>Climb &amp; slide</span><span>★ Color the star when you build it!</span></span>
      <span>${footerLine()} · grown-up nearby</span></footer></article>`).join('');
}

export function initSheet() {
  const prefs = browserPrefs(), $ = id => document.getElementById(id);
  const render = () => {
    $('pages').innerHTML = sheetHtml(sheetBuilds(BUILDS), { kid: prefs.get('kid').trim(), pal: palette(prefs.colors()) });
  };
  const fit = () => { $('pages').style.zoom = Math.min(1, (window.innerWidth - 32) / 816); };
  for (const id of ['kid', 'nug', 'chk']) {
    $(id).value = prefs.get(id);
    $(id).addEventListener('input', () => { prefs.set(id, $(id).value); render(); });
  }
  $('print').addEventListener('click', () => window.print());
  window.addEventListener('resize', fit);
  fit(); render();
}
