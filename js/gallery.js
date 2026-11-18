// The gallery home page: a wall of build cards filtered by what the visitor owns and by theme.
import { BUILDS } from './builds.js';
import { canMake, SETUPS, SETUP_IDS, THEMES, untestedLabel } from './setups.js';
import { drawBuild, palette } from './flat.js';
import { browserPrefs } from './prefs.js';
import { esc, oncePerFrame } from './html.js';

// The builds to show for the visitor's choices; nothing chosen shows everything.
export const visibleBuilds = (builds, { owned, theme }) => canMake(builds, owned).filter(b => !theme || b.theme === theme);

export const buildHref = build => `build.html?b=${encodeURIComponent(build.id)}`;

export const cardModel = build => ({ id: build.id, name: build.name, theme: build.theme, href: buildHref(build), label: untestedLabel(build) });

export const EMPTY_MESSAGE = 'No builds match those choices. Try another theme.';

// A second couch colour only makes sense once the visitor owns two couches.
export const showsSecondColor = owned => SETUPS[owned]?.couches === 2;

const chips = (name, options, current) => options.map(([value, text]) =>
  `<label><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}><span>${esc(text)}</span></label>`).join('');

export function initGallery() {
  const prefs = browserPrefs(), $ = id => document.getElementById(id);
  let theme = '';

  // Each card's picture is drawn only when it scrolls into view.
  const drawWhenSeen = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      drawWhenSeen.unobserve(e.target);
      const build = BUILDS.find(b => b.id === e.target.dataset.id);
      e.target.querySelector('.pic').innerHTML = drawBuild(build, palette(prefs.colors()));
    }
  }, { rootMargin: '300px' });

  const renderGrid = () => {
    const owned = prefs.get('setup'), list = visibleBuilds(BUILDS, { owned, theme }).map(cardModel);
    drawWhenSeen.disconnect();
    $('count').textContent = `${list.length} build${list.length === 1 ? '' : 's'}`;
    $('grid').innerHTML = list.length ? list.map(c =>
      `<a class="card ${c.theme}" href="${c.href}" data-id="${c.id}"><div class="pic"></div>${c.label ? `<span class="untested">${c.label}</span>` : ''}<div class="name">${esc(c.name)}</div></a>`).join('')
      : `<p class="empty">${EMPTY_MESSAGE}</p>`;
    $('grid').querySelectorAll('.card').forEach(card => drawWhenSeen.observe(card));
    $('nug2-row').hidden = !showsSecondColor(owned);
  };

  const redrawSoon = oncePerFrame(renderGrid);
  $('owned').insertAdjacentHTML('beforeend', chips('owned', [['', 'Show everything'], ...SETUP_IDS.map(id => [id, SETUPS[id].label])], prefs.get('setup')));
  $('themes').insertAdjacentHTML('beforeend', chips('theme', [['', 'All'], ...Object.entries(THEMES)], ''));
  $('owned').addEventListener('change', e => { prefs.set('setup', e.target.value); renderGrid(); });
  $('themes').addEventListener('change', e => { theme = e.target.value; renderGrid(); });
  for (const id of ['nug', 'nug2', 'chk']) {
    $(id).value = id === 'nug2' ? prefs.colors().nug2 : prefs.get(id);
    $(id).addEventListener('input', () => {
      prefs.set(id, $(id).value);
      // until the second couch has its own colour, its picker follows the first
      if (id === 'nug' && !prefs.get('nug2')) $('nug2').value = $(id).value;
      redrawSoon();
    });
  }
  renderGrid();
}
