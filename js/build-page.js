// The build page: one build as a flat picture you step through a piece at a time, with a parts
// list, every step at a glance, a one-page printout and somewhere to go next. The 3D view and
// three.js are only fetched when the visitor asks to spin the build.
import { BUILDS } from './builds.js';
import {
  pageModel, clampStep, mainLabel, stepModel, pieceLine, partsOf, leftOver, floorSpace, verdictFor,
  nextBuilds, nextBuildsNote, neighbours,
} from './steps.js';
import { baseFlat, cushFlat, tri, pad, hoop, puck } from './pieces.js';
import { SETUPS, OWNED, fits, usesLabel } from './setups.js';
import { drawBuild, drawPieces, palette } from './flat.js';
import { browserPrefs } from './prefs.js';
import { mountHeader, themeLabel, COPY } from './brand.js';
import { mountSetupBar } from './setup-bar.js';
import { cardHtml, buildHref, drawWhenSeen } from './card.js';
import { add, takeOff, isKept, loadSheet, saveSheet, sheetSize, setPages } from './sheet-state.js';
import { tapResult } from './tracker.js';
import { esc, oncePerFrame } from './html.js';

// One loose piece of each kind, for the small drawings in the parts list.
const LOOSE = { base: baseFlat(0, 0, 0, 'x'), cushion: cushFlat(0, 0, 0, 'x'), triangle: tri(0, 0, 0, 'y'), pad: pad(0, 0, 0), hoop: hoop(0, 0, 0), puck: puck(0, 0, 0) };

// Review aid: ?own=couch shows the page as a family with that set-up would see it, without
// saving anything. The first real choice made in the set-up bar takes over from it.
function withReviewChoices(prefs, q) {
  const over = OWNED[q.get('own')] ? { setup: q.get('own'), answered: '1', other: '' } : {};
  const get = k => k in over ? over[k] : prefs.get(k);
  return { get, set(k, v) { delete over[k]; prefs.set(k, v); }, colors: () => ({ nug: get('nug'), nug2: get('nug2') || get('nug'), chk: get('chk') }) };
}

export function initBuildPage() {
  const $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const prefs = withReviewChoices(browserPrefs(), q);
  const pal = () => palette(prefs.colors());
  let changed = () => {};

  mountHeader($('top'), 'build');
  const setupBar = mountSetupBar($('setup'), { prefs, onChange: what => changed(what) });

  const model = pageModel(BUILDS, q.get('b'));
  if (!model.found) {
    document.title = 'Build not found · Couch Coach';
    $('missing').hidden = false;
    return;
  }
  const { build, steps } = model, N = steps.length, floor = floorSpace(build);
  const twoCouches = SETUPS[build.setup].couches === 2;
  const owned = () => OWNED[prefs.get('setup')] ? prefs.get('setup') : '';
  let n = 0;             // 0 = before you start, 1..N = one piece each, N + 1 = finished
  let mode = 'flat';     // 'flat' or '3d'
  let viewer = null;

  const icon = (type, couch) => drawPieces(`${type}-${couch}`, [{ ...LOOSE[type], couch }], pal());
  const stepPicture = i => drawBuild(build, pal(), { through: i, fade: true });
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  /* ---------- what never changes for this build ---------- */
  document.title = `${build.name} · Couch Coach`;
  $('page').hidden = false;
  $('stage').classList.add(build.theme);
  $('name').textContent = build.name;
  $('meta').innerHTML = `<li>${themeLabel(build.theme)}</li><li>${N} pieces</li><li>${esc(SETUPS[build.setup].tag)}</li><li>${floor.text}</li>${usesLabel(build) ? `<li><b>${usesLabel(build)}</b></li>` : ''}`;
  $('tested').hidden = !model.label;
  $('testedBtn').textContent = model.label;
  $('testedWhy').textContent = COPY.untestedWhy;
  $('partsH').textContent = `You need ${N} pieces`;
  $('left').textContent = leftOver(build);
  $('left').hidden = !$('left').textContent;
  $('allH').textContent = `All ${N} steps`;
  $('prog').innerHTML = steps.map((s, i) => `<button type="button" data-step="${i + 1}" aria-label="Go to step ${i + 1} of ${N}"></button>`).join('');
  $('all').innerHTML = steps.map((s, i) => `<li><button type="button" data-step="${i + 1}"><span class="th" data-th="${i + 1}" aria-hidden="true"></span><span class="num">${i + 1}</span><span class="tx">${esc(s.text)}</span></button></li>`).join('');
  const { prev, next } = neighbours(BUILDS, build.id);
  $('prevB').href = buildHref(prev); $('prevB').textContent = `← ${prev.name}`;
  $('nextB').href = buildHref(next); $('nextB').textContent = `${next.name} →`;
  const cards = drawWhenSeen($('cards'), id => BUILDS.find(b => b.id === id), pal);

  /* ---------- what depends on the saved set-up ---------- */
  function renderSetup() {
    const own = owned(), v = verdictFor(build.setup, own);
    $('verdict').className = `verdict ${v.kind}`;
    $('verdict').innerHTML = v.kind === 'ok' ? `<b>${v.text}</b>`
      : v.kind === 'short' ? `<b>${esc(v.text)}</b><span>${esc(v.note)}</span><a class="btn" href="index.html">See builds you can make</a>`
      : `<b>${esc(v.text)}</b><span><button type="button" class="linkish" id="tell">Tell us what you have</button> to check you have the pieces.</span>`;
    $('simP').textContent = nextBuildsNote(build, own);
    $('cards').innerHTML = nextBuilds(BUILDS, build, own).map(b => cardHtml(b, { owned: own, sheetToggle: false })).join('');
    cards.watch();
    renderSheet();
  }

  // "Add to sheet" only makes sense for a build the family's own sheet could hold.
  function renderSheet() {
    const own = owned(), can = !!own && fits(build.setup, own);
    $('addSheet').hidden = !can;
    if (!can) return;
    const sheet = loadSheet(prefs, BUILDS), on = isKept(sheet, build.id);
    $('addSheet').setAttribute('aria-pressed', on);
    $('addSheet').textContent = on ? 'On your sheet' : 'Add to sheet';
  }

  /* ---------- pictures, redrawn when the couch colours change ---------- */
  function drawStage() {
    if (mode !== 'flat') return;
    $('draw').innerHTML = n >= 1 && n <= N ? stepPicture(n) : drawBuild(build, pal());
  }
  function drawPictures() {
    drawStage();
    $('printHero').innerHTML = drawBuild(build, pal());
    $('all').querySelectorAll('[data-th]').forEach(el => { el.innerHTML = stepPicture(+el.dataset.th); });
    cards.redraw();
    renderStep();
  }

  /* ---------- everything that changes with the step ---------- */
  function renderStep() {
    const m = stepModel(steps, n, floor.text, build.prop), s = steps[n - 1];
    if (mode === 'flat') drawStage(); else if (viewer) viewer.showThrough(m.state === 'step' ? n : 0);
    $('draw').setAttribute('aria-label', m.state === 'step' ? `${build.name}, step ${n} of ${N}` : build.name);

    $('kicker').textContent = m.kicker;
    $('say').textContent = m.say;
    $('piece').innerHTML = m.state === 'step' ? `<span class="ico" aria-hidden="true">${icon(s.type, s.couch)}</span><span>${esc(pieceLine(s, twoCouches))}</span>`
      : m.state === 'done' ? `<span>${esc(m.more)} <button type="button" class="linkish" id="again">Start again from step 1</button></span>`
      : `<span>${esc(m.more)}</span>`;
    [...$('prog').children].forEach((el, i) => {
      el.className = i + 1 < n ? 'done' : i + 1 === n ? 'now' : '';
      if (i + 1 === n) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });

    const label = mainLabel(n, N);
    $('back').hidden = n === 0;
    $('next').innerHTML = `${label.text}${label.small ? ` <small>${label.small}</small>` : ''}`;

    $('parts').innerHTML = partsOf(steps, n).map(r => `<li class="${r.now ? 'now' : ''}${r.done ? ' done' : ''}">
      <span class="ico" aria-hidden="true">${icon(r.type, r.couch)}</span>
      <span class="nm">${esc(r.name)}${r.from ? `<small class="from">${r.from}</small>` : ''}${r.note ? `<small class="note">${r.note}</small>` : ''}</span>
      <span class="qty">× ${r.need}</span></li>`).join('');
    $('all').querySelectorAll('button').forEach((el, i) => { if (i + 1 === n) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
  }

  // After a step from the bar, the keyboard or the list, bring the sentence back on screen.
  function showStep() {
    const r = $('say').getBoundingClientRect(), barTop = $('bar').getBoundingClientRect().top;
    const fixedBar = getComputedStyle($('bar')).position === 'fixed';
    if (r.top < 70 || r.bottom > (fixedBar ? barTop : innerHeight)) $('stage').scrollIntoView({ block: 'start', behavior: smooth() });
  }
  function go(to, scroll = true) { n = clampStep(to, N); renderStep(); if (scroll) showStep(); }

  $('next').addEventListener('click', () => {
    if (n <= N) return go(n + 1);
    $('similar').scrollIntoView({ block: 'start', behavior: smooth() });
    $('similar').focus({ preventScroll: true });
  });
  $('back').addEventListener('click', () => go(n - 1));
  $('page').addEventListener('click', e => {
    const st = e.target.closest('[data-step]');
    if (st) go(+st.dataset.step);
    else if (e.target.id === 'again') go(1);
    else if (e.target.id === 'tell') setupBar.open();
  });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, select, textarea, .sb-edit')) return;
    if (e.key === 'ArrowRight' && n <= N) go(n + 1);
    if (e.key === 'ArrowLeft' && n > 0) go(n - 1);
  });
  $('testedBtn').addEventListener('click', () => {
    const open = $('testedWhy').hidden;
    $('testedWhy').hidden = !open;
    $('testedBtn').setAttribute('aria-expanded', open);
  });

  /* ---------- 3D on request ---------- */
  const say3d = text => { $('msg').hidden = !text; $('msg').textContent = text; };
  function setMode(m) {
    mode = m;
    $('draw').hidden = m === '3d'; $('three').hidden = m !== '3d';
    $('stage').classList.toggle('in-3d', m === '3d');
    $('vFlat').setAttribute('aria-pressed', m === 'flat'); $('v3d').setAttribute('aria-pressed', m === '3d');
  }
  // Leaving 3D must always work, so a viewer that fails to clean up (or an older cached copy of
  // viewer3d.js with no dispose) is dropped anyway.
  function drop3D() {
    try { viewer?.dispose?.(); } catch (err) { console.warn('3D view did not close cleanly:', err); }
    viewer = null; $('three').innerHTML = '';
  }
  // Loads the viewer and three.js on first use. Returns false if 3D could not start.
  async function start3D() {
    drop3D();
    $('three').innerHTML = '<canvas aria-label="3D view of the build. Drag to spin."></canvas>';
    const canvas = $('three').firstChild;
    try {
      const { createViewer } = await import('./viewer3d.js');
      const made = await createViewer(canvas, build, prefs.colors());
      if (mode !== '3d' || !canvas.isConnected) { made.dispose?.(); return true; }   // the visitor already left
      viewer = made;
      return true;
    } catch (err) { console.warn('3D view did not start:', err); return false; }
  }
  async function enter3D() {
    if (mode === '3d') return;
    setMode('3d');
    say3d('Loading 3D…');
    if (await start3D()) { if (mode === '3d') { say3d('Drag to spin. Pinch or scroll to zoom.'); renderStep(); } return; }
    leave3D();
    say3d('3D does not work in this browser. The picture and the steps still do.');
  }
  function leave3D() { setMode('flat'); drop3D(); say3d(''); renderStep(); }
  $('v3d').addEventListener('click', enter3D);
  $('vFlat').addEventListener('click', () => { if (mode === '3d') leave3D(); });

  /* ---------- the set-up bar changed something ---------- */
  const redraw = oncePerFrame(drawPictures);
  let recolor3D = 0;
  changed = what => {
    if (what === 'kid') return;
    if (what === 'setup') renderSetup();
    redraw();
    if (mode === '3d') {   // a dragged colour picker fires many times: rebuild the 3D view once it settles
      clearTimeout(recolor3D);
      recolor3D = setTimeout(async () => { if (mode === '3d' && await start3D()) renderStep(); }, 250);
    }
  };

  /* ---------- print, sheet, send, keep the screen on ---------- */
  const note = html => { $('actNote').hidden = false; $('actNote').innerHTML = html; };
  $('print').addEventListener('click', () => window.print());
  $('addSheet').addEventListener('click', () => {
    const sheet = loadSheet(prefs, BUILDS), what = tapResult(sheet, build.id, sheetSize(prefs), !!prefs.get('pagesset')), on = what === 'off';
    if (what === 'blocked') return note('Your sheet is full of builds you chose. <a href="sheet.html">Take one off the sheet</a> to make room.');
    if (what === 'grow') setPages(prefs, 2);   // the page was full, so this one starts page two
    const after = on ? takeOff(sheet, build.id, BUILDS, prefs.get('setup')) : add(loadSheet(prefs, BUILDS), build.id);
    saveSheet(prefs, after);
    renderSheet();
    note(on ? 'Taken off your sheet.' : `${esc(build.name)} is on your sheet. <a href="sheet.html">See your sheet</a>`);
  });
  $('share').addEventListener('click', async () => {
    // the link is only the build's address: no set-up, colours or name go with it
    const url = new URL(buildHref(build), location.href).href;
    try {
      if (navigator.share) await navigator.share({ title: `${build.name} · Couch Coach`, url });
      else { await navigator.clipboard.writeText(url); note('Link copied. Paste it into a message.'); }
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // the share sheet was closed
      note(`Link to this build: ${esc(url)}`);
    }
  });
  if ('wakeLock' in navigator) {
    let lock = null, wanted = false;
    const ask = async () => { lock = await navigator.wakeLock.request('screen'); };
    $('awake').hidden = false;
    $('awake').addEventListener('click', async () => {
      try {
        wanted = !wanted;
        if (wanted) await ask(); else if (lock) { await lock.release(); lock = null; }
        note(wanted ? 'The screen will stay on while this page is open.' : 'The screen will dim as usual.');
      } catch { wanted = false; note('This device would not keep the screen on.'); }
      $('awake').setAttribute('aria-pressed', wanted);
    });
    // the browser drops the lock when the page is hidden; take it again on return
    document.addEventListener('visibilitychange', () => { if (wanted && document.visibilityState === 'visible') ask().catch(() => {}); });
  }

  renderSetup();
  drawPictures();

  // Review aids: &step=3 opens at a step (9 of 8 is the finished state), &view=3d opens the 3D view.
  const startAt = parseInt(q.get('step'), 10);
  if (startAt) go(startAt, false);
  if (q.get('view') === '3d') enter3D();
}
