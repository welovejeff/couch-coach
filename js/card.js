// The build card used wherever builds are listed: the gallery, "build next" and the sheet's swap grid.
import { SETUPS, needsLabel, untestedLabel, usesLabel } from './setups.js';
import { drawBuild } from './flat.js';
import { themeLabel } from './brand.js';
import { esc } from './html.js';

export const buildHref = build => `build.html?b=${encodeURIComponent(build.id)}`;

// What a card says. `owned` is the visitor's set-up ('' when unknown); `onSheet` marks the toggle.
export function cardModel(build, { owned = '', onSheet = false } = {}) {
  const needs = needsLabel(build.setup, owned);
  return { id: build.id, name: build.name, theme: build.theme, href: buildHref(build), tag: SETUPS[build.setup].tag, needs, uses: usesLabel(build), label: untestedLabel(build), onSheet };
}

// The picture is left empty and drawn when the card scrolls into view (see drawWhenSeen).
// `sheetToggle: false` leaves out the "Add to sheet" button.
export function cardHtml(build, { owned = '', onSheet = false, sheetToggle = true } = {}) {
  const c = cardModel(build, { owned, onSheet });
  return `<article class="card ${c.theme}${c.needs ? ' cant' : ''}" data-id="${c.id}">
    <a class="card-open" href="${c.href}"><span class="pic" data-pic="${c.id}"></span><span class="name">${esc(c.name)}</span></a>
    <span class="meta">${themeLabel(c.theme)}<span class="tag${c.needs ? ' needs' : ''}">${c.needs || c.tag}</span></span>
    ${c.uses ? `<span class="uses">${c.uses}</span>` : ''}
    ${c.label ? `<span class="untested">${c.label}</span>` : ''}
    ${sheetToggle ? `<button type="button" class="add" data-add="${c.id}" aria-pressed="${c.onSheet}">${c.onSheet ? 'On your sheet' : 'Add to sheet'}</button>` : ''}
  </article>`;
}

// Draws each [data-pic] inside `root` when it comes into view. `findBuild(id)` returns the build
// and `pal()` the current colours. Returns { redraw } to repaint after a colour change.
export function drawWhenSeen(root, findBuild, pal) {
  const draw = el => { el.innerHTML = drawBuild(findBuild(el.dataset.pic), pal()); el.dataset.drawn = '1'; };
  const seen = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { seen.unobserve(e.target); draw(e.target); }
  }, { rootMargin: '300px' });
  const watch = () => { seen.disconnect(); root.querySelectorAll('[data-pic]:not([data-drawn])').forEach(el => seen.observe(el)); };
  watch();
  return { watch, redraw() { root.querySelectorAll('[data-pic][data-drawn]').forEach(draw); } };
}
