// "Your set-up": one bar, shared by every page, that says what the family owns and in which
// colours. It opens into the same editor everywhere: picture tiles, colour swatches, child's name.
import { BUILDS } from './builds.js';
import { OWNED, OWNED_IDS, canMake, setupPicture } from './setups.js';
import { drawBuild, palette } from './flat.js';
import { SWATCHES, colorName } from './prefs.js';
import { COPY } from './brand.js';
import { mountNames } from './names.js';
import { esc, oncePerFrame } from './html.js';

// Things the site does not cover yet, and the closest set-up to show instead.
export const ELSE = {
  three: { label: '3 or more couches', closest: 'two-couch', say: 'No builds use a third couch yet. These are the 2-couch builds, which leave you one couch spare.' },
  addons: { label: '2 round add-ons', closest: 'couch-addon', say: 'No builds use a second round add-on yet. These are the builds for one couch and one round add-on.' },
  only: { label: 'Only the round add-on', closest: '', say: 'No builds use the round add-on alone yet. Here is everything, so you can see what a couch would add.' },
  brand: { label: 'A different play couch', closest: 'couch', say: 'These builds are sized for a couch made of a folding base, a folding cushion and two triangle pillows. If yours has those four pieces the 1-couch builds should work, though sizes may be a little off.' },
};

export const buildCount = ownedId => canMake(BUILDS, ownedId).length;

// What the bar needs to say for the saved choices. Pure, so it can be tested without a browser.
export function barModel(prefs) {
  const id = prefs.get('setup'), o = OWNED[id], c = prefs.colors();
  if (!o) return { chosen: false, title: 'Which couch do you have?', note: `Showing all ${BUILDS.length} builds`, action: 'Choose', dots: [] };
  return { chosen: true, id, title: o.tag, note: 'Your set-up', action: 'Change', dots: [c.nug, ...(o.couches === 2 ? [c.nug2] : []), ...(o.addon ? [c.chk] : [])] };
}

// Mounts the bar in `el`. `startOpen` shows the editor straight away to someone who has not
// answered yet (the gallery does this; other pages wait to be asked).
// `onChange(what)` is called with 'setup', 'color' or 'kid' after the choice is saved.
export function mountSetupBar(el, { prefs, onChange = () => {}, startOpen = false }) {
  let open = startOpen && !prefs.get('answered');
  const pal = () => palette(prefs.colors());
  const tell = what => onChange(what);

  function swatchRow(key, title) {
    const stored = prefs.get(key), cur = key === 'nug2' ? stored : (stored || '').toLowerCase(), custom = cur && !SWATCHES.some(s => s[1] === cur);
    return `<div class="sb-row"><div class="sb-lab">${title} <small>${key === 'nug2' && !cur ? 'Same as first' : colorName(cur)}</small></div><div class="sb-sws">
      ${key === 'nug2' ? `<button type="button" class="chip" data-color="nug2" data-hex="" aria-pressed="${!cur}">Same as first</button>` : ''}
      ${SWATCHES.map(([n, h]) => `<button type="button" class="sw" style="background:${h}" title="${n}" aria-label="${title}: ${n}" data-color="${key}" data-hex="${h}" aria-pressed="${cur === h}"></button>`).join('')}
      <label class="chip sb-other"${custom ? ' data-on="1"' : ''}>${custom ? `<i class="dot" style="background:${esc(cur)}"></i>` : ''}Other color<input type="color" data-pick="${key}" value="${esc(cur || prefs.get('nug'))}" aria-label="${title}: other color"></label>
    </div></div>`;
  }

  function editor() {
    const id = prefs.get('setup'), o = OWNED[id], other = ELSE[prefs.get('other')];
    return `<section class="sb-edit" aria-label="Your set-up">
      <h2>${prefs.get('answered') ? 'Your set-up' : 'Which one is at your house?'}</h2>
      <p class="sb-lede">Tap the one that looks like yours. The builds change to match.</p>
      <div class="sb-tiles">${OWNED_IDS.map(k => `<button type="button" class="sb-tile" data-own="${k}" aria-pressed="${id === k && !other}">
        <span class="sb-pic" data-setup="${k}">${drawBuild(setupPicture(k), pal())}</span><b>${OWNED[k].tag}</b><small>${buildCount(k)} builds</small></button>`).join('')}</div>
      <details class="sb-else"${other ? ' open' : ''}><summary>I have something else</summary>
        <div class="sb-opts">${Object.entries(ELSE).map(([k, v]) => `<button type="button" class="chip" data-else="${k}" aria-pressed="${prefs.get('other') === k}">${v.label}</button>`).join('')}</div>
      </details>
      ${other ? `<p class="notice"><b>Not covered yet.</b> ${other.say}</p>` : ''}
      ${o ? `<div class="sb-more"><h3>Match your couch colors</h3>
        ${swatchRow('nug', o.couches === 2 ? 'First couch' : 'Couch')}
        ${o.couches === 2 ? swatchRow('nug2', 'Second couch') : ''}
        ${o.addon ? swatchRow('chk', 'Round add-on') : ''}
        <div class="sb-row sb-name"><span class="sb-lab">Child's name <small>optional, printed on the sheet</small></span>
          <div id="sb-names"></div></div>
      </div>` : ''}
      <div class="sb-actions">
        ${o ? `<button class="btn primary" type="button" data-act="done">Show my ${buildCount(id)} builds</button>` : ''}
        <button class="linkish" type="button" data-act="skip">${o ? 'Clear and show everything' : 'Skip, show everything'}</button>
      </div>
      <p class="small">${COPY.private}</p>
    </section>`;
  }

  function bar() {
    const m = barModel(prefs);
    return `<div class="sb-bar">
      ${m.chosen ? `<span class="sb-mini">${drawBuild(setupPicture(m.id), pal())}</span>` : ''}
      <span class="sb-txt"><small>${m.note}</small><b>${m.title}${m.dots.length ? `<span class="sb-dots">${m.dots.map(h => `<i class="dot" style="background:${esc(h)}"></i>`).join('')}</span>` : ''}</b></span>
      <button class="btn quiet" type="button" data-act="edit">${m.action}</button></div>`;
  }

  function render() {
    el.classList.toggle('sb-closed', !open);
    el.innerHTML = open ? editor() : bar();
    const names = el.querySelector('#sb-names');
    if (names) mountNames(names, { prefs, id: 'sb-kid', onChange: () => tell('kid') });
  }
  const redrawPictures = oncePerFrame(() => el.querySelectorAll('[data-setup]').forEach(p => { p.innerHTML = drawBuild(setupPicture(p.dataset.setup), pal()); }));

  el.classList.add('sb');
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.own) {
      // tapping the chosen tile again clears it
      const clear = prefs.get('setup') === d.own && !prefs.get('other');
      prefs.set('setup', clear ? '' : d.own); prefs.set('other', ''); prefs.set('answered', '1');
      render(); tell('setup');
    } else if (d.else) {
      prefs.set('other', d.else); prefs.set('setup', ELSE[d.else].closest); prefs.set('answered', '1');
      render(); tell('setup');
    } else if (d.color) {
      prefs.set(d.color, d.hex); render(); tell('color');
    } else if (d.act === 'edit') {
      open = true; render(); el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else if (d.act === 'done') {
      open = false; prefs.set('answered', '1'); render(); tell('setup');
    } else if (d.act === 'skip') {
      open = false; prefs.set('setup', ''); prefs.set('other', ''); prefs.set('answered', '1'); render(); tell('setup');
    }
  });
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.pick) { prefs.set(t.dataset.pick, t.value); redrawPictures(); tell('color'); }
  });
  // the system colour wheel has closed: show the new colour as chosen
  el.addEventListener('change', e => { if (e.target.dataset.pick) render(); });

  render();
  return {
    open() { open = true; render(); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
    refresh: render,
  };
}
