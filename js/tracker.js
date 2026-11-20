// The sheet tracker ("mini paper"): a tiny picture of the printable sheet, fixed to the bottom of
// the screen once a build has been picked. Tapping it pulls up a bigger view of the same paper,
// where picks are moved or taken off and the family chooses one page or two.
// The functions above mountTracker are plain logic that Node can test.
import { OWNED } from './setups.js';
import { owners } from './names.js';
import { drawBuild } from './flat.js';
import { esc } from './html.js';
import {
  add, takeOff, another, keep, move, resize, picksLost, isKept, isFull, onSheet,
  loadSheet, saveSheet, sheetSize, setPages,
} from './sheet-state.js';

const pageWord = n => n === 1 ? '1 page' : '2 pages';

// What a tap on "Add to sheet" does. `size` is { pages, per, count }; `chosen` is true once the
// family picked one page or two on purpose. Returns what to do, never doing it:
//   'off'      the build was a pick, so it comes off
//   'on'       it goes on
//   'grow'     the page is full and nobody fixed its size, so page two starts and it goes on
//   'blocked'  the sheet is full
export function tapResult(sheet, id, size, chosen) {
  if (isKept(sheet, id)) return 'off';
  if (!isFull(sheet)) return 'on';
  return size.pages === 1 && !chosen ? 'grow' : 'blocked';
}

// The tracker's two lines and its button for a sheet.
export function trackerWords(sheet, size, { chosen = false, blocked = false, grew = false } = {}) {
  const k = sheet.kept.length, n = size.count, left = n - k, one = size.pages === 1;
  const fill = left === 1 ? 'We fill the last spot.' : `We fill the other ${left}.`;
  let head = `${k} of ${n} picked`, note = fill;
  if (blocked) { head = one ? 'Page is full' : 'Sheet is full'; note = one ? 'Take one off, or add page two.' : 'Take one off to add another.'; }
  else if (k >= n && !one) { head = `All ${n} picked`; note = 'Both pages are full.'; }
  else if (k >= n && chosen) { head = `All ${n} picked`; note = 'Your page is full.'; }
  else if (k >= n) { head = 'Page one is full'; note = 'Pick one more to start page two.'; }
  else if (grew) note = `Page two started. ${fill}`;
  const done = k >= n;
  return { head, note, full: blocked, done, button: done ? `Print ${pageWord(size.pages)}` : 'Open sheet', long: `${k} of ${n} picked.${done ? '' : ' ' + fill}` };
}

export const sheetName = kid => { const whose = owners(kid); return whose ? `${whose} sheet` : 'Your sheet'; };

const CHEV = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV_DOWN = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TICK = '<span class="tick"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2l2.1 2.1L8 3.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

// The tiny paper. `fresh` is the id of the build that was just picked, which pops in.
export function miniPaperHtml(sheet, size, byId, { chosen = false, fresh = '' } = {}) {
  const page = pg => `<span class="mp-page${size.per === 4 ? ' four' : ''}">${sheet.ids.slice(pg * size.per, (pg + 1) * size.per).map(id =>
    `<i class="${isKept(sheet, id) ? 'pick' : 'sug'} ${byId(id).theme}${id === fresh ? ' new' : ''}"></i>`).join('')}</span>`;
  const peek = `<span class="mp-peek">${isFull(sheet) && !chosen ? '+' : ''}</span>`;
  return `<span class="mp" aria-hidden="true">${page(0)}${size.pages === 2 ? page(1) : peek}</span>`;
}

// Mounts the tracker on a page. `builds` is the library, `pal()` the current colours, `pageEl`
// the page's own content (made inert while the pull-up is open), and `onChange()` is called after
// the saved sheet changes so the page can update its "Add to sheet" buttons.
// Returns { toggle(id), refresh(), isPicked(id) }.
export function mountTracker({ prefs, builds, pal, pageEl, onChange = () => {} }) {
  const byId = id => builds.find(b => b.id === id);
  document.body.insertAdjacentHTML('beforeend', `<div class="tk" id="tk" hidden></div>
    <div class="toastbar on-dark" id="tk-toast" hidden></div><div class="scrim" id="tk-scrim"></div>
    <section class="pu" id="tk-pu" role="dialog" aria-modal="true" aria-labelledby="pu-title" tabindex="-1" inert></section>
    <p class="sr" id="tk-live" aria-live="polite"></p>`);
  const $ = id => document.getElementById(id), tk = $('tk'), pu = $('tk-pu');
  // what the screen is doing right now; none of this is saved
  const S = { open: false, tucked: false, sel: '', blocked: false, grew: false, confirm: '', fresh: '', toast: null };

  const owned = () => OWNED[prefs.get('setup')] ? prefs.get('setup') : '';
  const chosen = () => !!prefs.get('pagesset');
  const sheet = () => owned() ? loadSheet(prefs, builds) : null;
  const say = text => { $('tk-live').textContent = text; };
  const snapshot = () => ({ sheet: prefs.get('sheet'), sheetopts: prefs.get('sheetopts'), pagesset: prefs.get('pagesset') });
  const restore = snap => { for (const k in snap) prefs.set(k, snap[k]); };
  const commit = next => { saveSheet(prefs, next); onChange(); };

  let pics = new Map();
  const picOf = id => pics.get(id) || pics.set(id, drawBuild(byId(id), pal())).get(id);

  let toastTimer = 0;
  function showToast(text, undo) {
    clearTimeout(toastTimer);
    S.toast = { text, undo };
    toastTimer = setTimeout(() => { S.toast = null; renderToast(); }, 10000);
    say(text);
  }
  function renderToast() {
    const t = $('tk-toast');
    t.hidden = !S.toast;
    t.innerHTML = S.toast ? `<span>${esc(S.toast.text)}</span>${S.toast.undo ? '<button type="button" data-act="undo">Undo</button>' : ''}` : '';
  }

  // A tap on a card's "Add to sheet" anywhere on the page.
  function toggle(id) {
    const now = sheet(); if (!now) return;
    Object.assign(S, { blocked: false, grew: false, fresh: '', confirm: '' });
    const size = sheetSize(prefs), what = tapResult(now, id, size, chosen()), name = byId(id).name;
    if (what === 'off') { commit(takeOff(now, id, builds, owned())); if (S.sel === id) S.sel = ''; say(`${name} is off the sheet.`); }
    else if (what === 'blocked') { S.blocked = true; S.tucked = false; say(size.pages === 1 ? 'Your page is full. Take one off, or add page two.' : 'The sheet is full. Take one off to add another.'); }
    else {
      if (what === 'grow') { setPages(prefs, 2); S.grew = true; }
      const next = add(sheet(), id);
      S.fresh = id; commit(next);
      say(`${name} added. ${next.kept.length} of ${sheetSize(prefs).count} picked.${S.grew ? ' Page two started.' : ''}`);
    }
    render();
  }

  function choosePages(n, force = false) {
    Object.assign(S, { blocked: false, grew: false, confirm: '' });
    const now = sheet(), size = sheetSize(prefs), count = n * size.per, lost = picksLost(now, count);
    if (lost && !force) { S.confirm = 'shrink'; return; }
    const undo = snapshot();
    setPages(prefs, n); prefs.set('pagesset', '1');
    commit(resize(now, builds, owned(), count));
    if (lost) showToast(`Took ${lost} ${lost === 1 ? 'pick' : 'picks'} off to fit 1 page.`, undo);
    if (S.sel && !onSheet(sheet(), S.sel)) S.sel = '';
  }

  function clearAll() {
    const undo = snapshot();
    prefs.set('sheet', ''); prefs.set('pagesset', ''); setPages(prefs, 1);
    Object.assign(S, { open: false, tucked: false, sel: '', blocked: false, grew: false, confirm: '' });
    onChange();
    showToast('Sheet cleared.', undo);
  }

  function renderTracker(now, size, w) {
    const show = !!now && now.kept.length > 0;
    tk.hidden = !show;
    document.body.classList.toggle('has-tk', show && !S.tucked);
    tk.classList.toggle('tucked', S.tucked);
    if (!show) { tk.innerHTML = ''; return; }
    const mini = miniPaperHtml(now, size, byId, { chosen: chosen(), fresh: S.fresh }), name = sheetName(prefs.get('kid'));
    tk.innerHTML = `
      <button type="button" class="tk-tab" data-act="tuck" data-f="tab" aria-label="${S.tucked ? `Show the sheet tracker. ${esc(w.long)}` : 'Hide the sheet tracker'}">
        ${mini}<span class="cnt"><span>${now.kept.length} of ${size.count} picked</span><small>Show</small></span><span class="lab">Hide</span>${CHEV_DOWN}
      </button>
      <div class="tk-in"${S.tucked ? ' inert' : ''}>
        <button type="button" class="tk-main" data-act="open" data-f="main" aria-haspopup="dialog" aria-label="${esc(name)}: ${esc(w.head)}. ${esc(w.note)} Tap to change it.">
          <span class="tk-grab"></span>${mini}
          <span class="tk-txt"><b>${esc(w.head)}${CHEV}</b><span class="small${w.full ? ' full' : ''}">${esc(w.note)}</span></span>
        </button>
        <a class="btn${w.done ? ' primary' : ''}" href="sheet.html">${w.button}</a>
      </div>`;
  }

  function selHtml(now, size) {
    const id = S.sel, i = now.ids.indexOf(id);
    if (!id || i < 0) return '<div class="sel"><p class="hint">Tap a build on the paper to move it or take it off. Faded builds are our suggestions.</p></div>';
    const b = byId(id), where = `Spot ${i + 1}${size.pages === 2 ? `, page ${i < size.per ? 1 : 2}` : ''}`;
    return isKept(now, id)
      ? `<div class="sel"><p><b>${esc(b.name)}</b> <span class="small">${where}. Your pick.</span></p><div class="acts">
          <button type="button" class="btn quiet" data-act="earlier" data-f="earlier"${i === 0 ? ' disabled' : ''}>Earlier</button>
          <button type="button" class="btn quiet" data-act="later" data-f="later"${i === now.ids.length - 1 ? ' disabled' : ''}>Later</button>
          <button type="button" class="btn quiet" data-act="off" data-f="off">Take off</button></div></div>`
      : `<div class="sel"><p><b>${esc(b.name)}</b> <span class="small">${where}. A suggestion.</span></p><div class="acts">
          <button type="button" class="btn quiet" data-act="keep" data-f="keep">Keep it</button>
          <button type="button" class="btn quiet" data-act="another" data-f="another">Show another</button></div></div>`;
  }

  function renderPullUp(now, size, w) {
    document.body.classList.toggle('pu-open', S.open);
    pu.inert = !S.open; if (pageEl) pageEl.inert = S.open; tk.inert = S.open;
    if (!S.open || !now) { pu.innerHTML = ''; return; }
    const k = now.kept.length, lost = picksLost(now, size.per);
    const cell = (id, i) => { const b = byId(id), pick = isKept(now, id);
      return `<button type="button" class="cell ${b.theme}${pick ? '' : ' sug'}${id === S.fresh ? ' new' : ''}" data-cell="${id}" data-f="cell-${id}" aria-pressed="${S.sel === id}"
        aria-label="${esc(b.name)}, spot ${i + 1}, ${pick ? 'your pick' : 'a suggestion'}">${picOf(id)}${pick ? TICK : ''}</button>`; };
    const page = pg => { const ids = now.ids.slice(pg * size.per, (pg + 1) * size.per), mine = ids.filter(id => isKept(now, id)).length;
      return `<div class="slot"><div class="pg${size.per === 4 ? ' four' : ''}">${ids.map((id, i) => cell(id, pg * size.per + i)).join('')}</div>
        <p class="pg-lab"><b>${size.pages === 1 ? 'Your page' : pg ? 'Page 2' : 'Page 1'}</b> · ${mine} picked</p></div>`; };
    const ghost = `<div class="slot"><button type="button" class="pg ghost" data-act="pages2" data-f="ghost"><span class="plus" aria-hidden="true">+</span><b>Add page two</b><small>${size.per} more builds on the back</small></button>
        <p class="pg-lab">Not on the sheet yet</p></div>`;
    const shrink = S.confirm === 'shrink' ? `<div class="notice" role="alert"><b>1 page holds ${size.per} builds.</b> Your last ${lost} ${lost === 1 ? 'pick comes' : 'picks come'} off.
        <div class="acts"><button type="button" class="btn" data-act="shrink-yes" data-f="shrink-yes">Use 1 page</button><button type="button" class="btn primary" data-act="cancel" data-f="cancel">Keep 2 pages</button></div></div>` : '';
    const foot = S.confirm === 'clear'
      ? `<div class="notice" role="alert"><b>Take all ${k} ${k === 1 ? 'pick' : 'picks'} off the sheet?</b> You start again with nothing picked.
          <div class="acts"><button type="button" class="btn" data-act="clear-yes" data-f="clear-yes">Clear sheet</button><button type="button" class="btn primary" data-act="cancel" data-f="cancel">Keep them</button></div></div>`
      : `<div class="foot"><a class="btn primary" href="sheet.html">${w.button}</a><button type="button" class="linkish" data-act="clear" data-f="clear">Clear sheet</button></div>`;
    pu.innerHTML = `
      <div class="pu-head">
        <button type="button" class="pu-grab" data-act="close" aria-label="Close"><span></span></button>
        <div class="pu-title"><div><h2 id="pu-title">${esc(sheetName(prefs.get('kid')))}</h2><p class="small">${esc(w.long)}</p></div>
          <button type="button" class="btn quiet" data-act="close" data-f="done">Keep picking</button></div>
      </div>
      <div class="pu-body">
        <fieldset class="chips"><legend>How big is the sheet?</legend>
          ${[1, 2].map(n => `<label><input type="radio" name="tk-pages" value="${n}" data-f="pages-${n}"${size.pages === n ? ' checked' : ''}><span class="chip">${pageWord(n)} <small>${n * size.per} builds</small></span></label>`).join('')}
        </fieldset>
        ${shrink}
        <div class="desk">${page(0)}${size.pages === 2 ? page(1) : ghost}</div>
        ${selHtml(now, size)}
        ${foot}
      </div>`;
  }

  function render() {
    const keepFocus = document.activeElement?.dataset?.f;
    const now = sheet(), size = sheetSize(prefs);
    if (!now || !now.kept.length) S.open = false;
    const w = now ? trackerWords(now, size, { chosen: chosen(), blocked: S.blocked, grew: S.grew }) : null;
    renderTracker(now, size, w); renderPullUp(now, size, w); renderToast();
    if (keepFocus) document.querySelector(`[data-f="${keepFocus}"]:not([disabled])`)?.focus({ preventScroll: true });
  }
  function open() { Object.assign(S, { open: true, tucked: false, blocked: false, fresh: '' }); render(); pu.focus({ preventScroll: true }); }
  function close() { Object.assign(S, { open: false, confirm: '', sel: '', fresh: '' }); render(); document.querySelector('[data-f="main"]')?.focus({ preventScroll: true }); }

  let swallow = false;
  const onClick = e => {
    if (e.target === $('tk-scrim')) return close();
    const el = e.target.closest('[data-act], [data-cell]');
    if (!el || !(tk.contains(el) || pu.contains(el) || $('tk-toast').contains(el))) return;
    if (swallow) { e.preventDefault(); return; }
    if (el.dataset.cell) { S.sel = S.sel === el.dataset.cell ? '' : el.dataset.cell; S.fresh = ''; S.confirm = ''; return render(); }
    const act = el.dataset.act, id = S.sel, now = sheet(), own = owned();
    S.fresh = '';
    if (act === 'open') return open();
    if (act === 'close') return close();
    if (act === 'tuck') { S.tucked = !S.tucked; say(S.tucked ? 'Tracker hidden. Use Show to bring it back.' : 'Tracker shown.'); }
    else if (act === 'pages2') choosePages(2);
    else if (act === 'shrink-yes') choosePages(1, true);
    else if (act === 'clear') S.confirm = 'clear';
    else if (act === 'cancel') S.confirm = '';
    else if (act === 'clear-yes') clearAll();
    else if (act === 'undo') { restore(S.toast.undo); S.toast = null; S.blocked = S.grew = false; clearTimeout(toastTimer); onChange(); say('Your picks are back.'); }
    else if (!now || !id) { /* the rest act on the selected build */ }
    else if (act === 'earlier') commit(move(now, id, -1));
    else if (act === 'later') commit(move(now, id, 1));
    else if (act === 'off') { commit(takeOff(now, id, builds, own)); S.sel = ''; S.blocked = false; }
    else if (act === 'keep') { commit(keep(now, id, true)); S.fresh = id; }
    else if (act === 'another') { const at = now.ids.indexOf(id), next = another(now, id, builds, own); commit(next); S.sel = next.ids[at]; }
    render();
    if (act === 'clear') document.querySelector('[data-f="cancel"]')?.focus();
  };
  document.addEventListener('click', onClick);
  pu.addEventListener('change', e => { if (e.target.name === 'tk-pages') { choosePages(+e.target.value); render(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) close(); });

  // Swipes: up on the tracker opens it, down tucks it away; down on the pull-up's header closes it.
  let drag = null;
  const settle = () => { pu.style.transition = ''; pu.style.transform = ''; };
  document.addEventListener('pointerdown', e => {
    if (e.target.closest?.('.tk-main')) drag = { what: 'tk', y: e.clientY };
    else if (e.target.closest?.('.pu-head')) drag = { what: 'pu', y: e.clientY };
  });
  window.addEventListener('pointermove', e => {
    if (drag?.what !== 'pu') return;
    const dy = Math.max(0, e.clientY - drag.y);
    if (dy > 4) { pu.style.transition = 'none'; pu.style.transform = `translateY(${dy}px)`; }
  });
  window.addEventListener('pointerup', e => {
    if (!drag) return;
    const dy = e.clientY - drag.y, what = drag.what;
    drag = null; settle();
    if (Math.abs(dy) < 24) return;
    swallow = true; setTimeout(() => { swallow = false; }, 0);
    if (what === 'pu' && dy > 70) close();
    else if (what === 'tk' && dy < 0) open();
    else if (what === 'tk') { S.tucked = true; render(); }
  });
  window.addEventListener('pointercancel', () => { drag = null; settle(); });

  render();
  return {
    toggle,
    // the page changed something the tracker shows: set-up, colours or the children's names
    refresh({ colors = false } = {}) { if (colors) pics = new Map(); S.blocked = S.grew = false; render(); },
    isPicked(id) { const now = sheet(); return !!now && isKept(now, id); },
    open,
  };
}
