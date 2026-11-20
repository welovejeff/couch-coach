// The printable sheet. The paper preview is the editor: tap a card to keep, move or swap it.
// Everything above initSheet() is plain logic that Node can test.
import { owners, mountNames } from './names.js';
import { BUILDS } from './builds.js';
import { drawBuild, palette } from './flat.js';
import { browserPrefs, createPrefs } from './prefs.js';
import { OWNED, OWNED_IDS, THEMES, untestedLabel, usesLabel } from './setups.js';
import { mountHeader, mark, star, themeIcon, themeLabel } from './brand.js';
import { mountSetupBar } from './setup-bar.js';
import { buildHref } from './card.js';
import { loadSheet, saveSheet, suggest, normalise, candidates, spares, keep, swap, move, shuffle, isKept, isFull, encode, decode } from './sheet-state.js';
import { esc, oncePerFrame } from './html.js';

/* ---------- options: paper, sides, picture size, ink ---------- */
export const PAPERS = {
  letter: { label: 'US Letter', w: '8.5in', h: '11in', px: 816 },
  a4: { label: 'A4', w: '210mm', h: '297mm', px: 793.7 },
};
export const INKS = { full: 'Full color', less: 'Less ink', line: 'Color-in' };

// Countries that print on US Letter. Everyone else gets A4.
const LETTER_REGIONS = new Set(['US', 'CA', 'MX', 'PH', 'CL', 'CO', 'VE', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA', 'DO', 'PR']);
export function guessPaper(lang) {
  const region = String(lang || '').split(/[-_]/).slice(1).find(p => /^[A-Za-z]{2}$/.test(p));
  return region && LETTER_REGIONS.has(region.toUpperCase()) ? 'letter' : 'a4';
}

// Stored as "letter.2.6.full". Anything missing or odd falls back: paper to the language guess,
// then one side, six pictures a side, full color.
export function parseOpts(text, lang = '') {
  const [paper, sides, per, ink] = String(text || '').split('.');
  return {
    paper: Object.hasOwn(PAPERS, paper) ? paper : guessPaper(lang),
    sides: sides === '2' ? 2 : 1,
    per: per === '4' ? 4 : 6,
    ink: Object.hasOwn(INKS, ink) ? ink : 'full',
  };
}
export const formatOpts = o => `${o.paper}.${o.sides}.${o.per}.${o.ink}`;

export const cardCount = opts => opts.per * opts.sides;
export const pageCount = opts => opts.sides;

// The chosen builds dealt onto pages, in order.
export const sheetPages = (list, opts) => Array.from({ length: opts.sides }, (_, pg) => list.slice(pg * opts.per, (pg + 1) * opts.per));

// @page size and the page box both come from the paper choice.
export function pageCss(opts) {
  const p = PAPERS[opts.paper];
  return `@page { size: ${p.w} ${p.h}; margin: 0; } .page { width: ${p.w}; height: ${p.h}; }`;
}

/* ---------- words ---------- */
export function sheetTitle(kid, page) {
  const whose = owners(kid);
  if (page === 0) return whose ? `${whose} couch builds` : 'Our couch builds';
  return whose ? `More of ${whose} builds` : 'More couch builds';
}
// Long names shrink the title so it stays on one line beside the mark.
export const titlePt = title => Math.max(13, Math.min(32, Math.floor(840 / title.length)));

export const footerText = (setupId, page, sides) => ({
  hint: 'Point at one to build it. Color the star when it is built.',
  setup: `${OWNED[setupId].label} · A grown-up stays close`,
  page: sides > 1 ? `Page ${page + 1} of ${sides}` : '',
});

// What to check in the print window, for these choices.
export const checklist = opts => [
  ['Paper size', PAPERS[opts.paper].label],
  ['Two-sided', opts.sides === 2 ? 'On, flip on long edge' : 'Off'],
  ['Scale', '100% (not “fit to page”)'],
  ['Background graphics', opts.ink === 'full' ? 'On' : 'Either'],
  ['Pages', String(pageCount(opts))],
];

export const countLine = (n, total) => `${n} of the ${total} builds you can make`;
export function summary(kid, n, opts) {
  const whose = owners(kid);
  return { title: whose ? `${whose} sheet` : 'Your sheet', sub: `${n} builds · ${PAPERS[opts.paper].label} · ${opts.sides === 2 ? 'two-sided' : 'one side'}` };
}

/* ---------- no set-up: ask, never guess ---------- */
export const needsSetup = setupId => !Object.hasOwn(OWNED, setupId);
export const askHtml = () => `<h2>Which couch is this sheet for?</h2>
  <p>The sheet prints builds your child can point at, so it needs to know what you have.</p>
  <div class="chips">${OWNED_IDS.map(id => `<button type="button" class="chip" data-own="${id}">${esc(OWNED[id].tag)}</button>`).join('')}</div>`;

/* ---------- "send to my computer": the sheet travels in the link ---------- */
// Set-up, colors, options and builds. The child's name is never part of it.
export function linkHash({ setup, colors, opts, sheet }) {
  const hex = v => String(v || '').replace('#', '');
  return '#' + new URLSearchParams({ s: setup, n: hex(colors.nug), n2: hex(colors.nug2), c: hex(colors.chk), o: formatOpts(opts), b: encode(sheet) });
}

// Reads a link back. Returns null for anything that is not a usable sheet; never throws.
export function readLink(hash, builds, lang = '') {
  try {
    const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const setup = q.get('s') || '', got = decode(q.get('b'));
    if (needsSetup(setup) || !got || got.for !== setup) return null;
    const pool = new Set(candidates(builds, setup).map(b => b.id)), ids = got.ids.filter(id => pool.has(id));
    if (!ids.length) return null;
    const hex = v => /^[0-9a-f]{6}$/i.test(v || '') ? '#' + v.toLowerCase() : '';
    const opts = parseOpts(q.get('o'), lang);
    return {
      setup, opts, colors: { nug: hex(q.get('n')), nug2: hex(q.get('n2')), chk: hex(q.get('c')) },
      sheet: normalise({ for: setup, ids, kept: got.kept }, builds, setup, cardCount(opts)),
    };
  } catch { return null; }
}

// Has this browser any choices a link would overwrite?
export const hasSaved = prefs => ['answered', 'setup', 'sheet', 'sheetopts'].some(k => prefs.get(k));

/* ---------- the paper ---------- */
// `list` is the chosen builds in order. `kept` and `sel` only add screen marks; they never print.
export function sheetHtml(list, { kid = '', pal, setupId, opts, kept = [], sel = -1 }) {
  const line = opts.ink === 'line', paper = PAPERS[opts.paper].label;
  const card = (b, i) => {
    const label = [usesLabel(b), untestedLabel(b)].filter(Boolean).join(' · ');
    return `<button type="button" class="pcard ${b.theme}${i === sel ? ' sel' : ''}" data-i="${i}" aria-haspopup="dialog" aria-label="Card ${i + 1}, ${esc(b.name)}.${label ? ` ${label}.` : ''} Change this card">
      <span class="num">${i + 1}</span><span class="star">${star()}</span>
      <span class="pic">${drawBuild(b, pal, { line })}</span>
      <span class="foot"><span class="name">${esc(b.name)}</span>${label ? `<span class="ut">${label}</span>` : ''}</span>
      ${kept.includes(b.id) ? '<span class="kept">Kept</span>' : ''}</button>`;
  };
  const key = Object.keys(THEMES).map(t => `<span>${themeIcon(t)}${esc(THEMES[t])}</span>`).join('');
  return sheetPages(list, opts).map((cards, pg) => {
    const title = sheetTitle(kid, pg), foot = footerText(setupId, pg, opts.sides);
    return `<div class="slot"><p class="side">${opts.sides === 1 ? 'The page' : pg ? 'Back' : 'Front'} <span>· ${paper}</span></p>
      <article class="page per${opts.per} ink-${opts.ink}">
        <header>${mark()}<h2 style="font-size:${titlePt(title)}pt">${esc(title)}</h2></header>
        <div class="grid">${cards.map((b, i) => card(b, pg * opts.per + i)).join('')}</div>
        <footer><span class="key">${key}</span>${foot.page ? `<span class="pg">${foot.page}</span>` : ''}
          <span class="hint">${foot.hint}</span><span class="for">${esc(foot.setup)}</span></footer>
      </article></div>`;
  }).join('');
}

/* ---------- the page ---------- */
// Review aids only: ?own=couch-addon&kid=Max&opts=a4.1.4.line show a chosen state for screenshots
// and print checks. They sit on top of the saved choices and nothing is saved while they are used.
function reviewPrefs(search) {
  const q = new URLSearchParams(search);
  if (!['own', 'kid', 'opts'].some(k => q.has(k))) return null;
  const over = new Map();
  if (q.has('own')) { over.set('cc-setup', q.get('own')); over.set('cc-answered', '1'); over.set('cc-other', ''); }
  if (q.has('kid')) over.set('cc-kid', q.get('kid').slice(0, 60));
  if (q.has('opts')) over.set('cc-sheetopts', q.get('opts'));
  return createPrefs({ getItem: k => over.has(k) ? over.get(k) : globalThis.localStorage.getItem(k), setItem: (k, v) => over.set(k, v) });
}

export function initSheet() {
  const $ = id => document.getElementById(id), lang = navigator.language || '';
  const prefs = reviewPrefs(location.search) || browserPrefs();
  const byId = id => BUILDS.find(b => b.id === id);
  const pal = () => palette(prefs.colors());
  const setup = () => prefs.get('setup');
  const readSheet = () => needsSetup(setup()) ? null : loadSheet(prefs, BUILDS, cardCount(opts));
  let opts = parseOpts(prefs.get('sheetopts'), lang), sheet = null, sel = -1, swapTheme = '', offered = null;

  mountHeader($('top'), 'sheet');
  const bar = mountSetupBar($('setup'), {
    prefs,
    onChange(what) {
      if (what === 'setup') { closeEditor(); sheet = readSheet(); render(); }
      else if (what === 'color') redrawSoon();
      else if (what === 'kid') { names.refresh(); drawNames(); }
    },
  });
  const pageStyle = document.head.appendChild(document.createElement('style'));

  /* ----- drawing ----- */
  const OPTION_SETS = [
    ['paper', 'Paper', [['letter', 'US Letter'], ['a4', 'A4']]],
    ['sides', 'Sides', [[2, 'Two sides'], [1, 'One side']]],
    ['per', 'Picture size', [[6, '6 big', 'ages 3+'], [4, '4 bigger', 'under 3']]],
    ['ink', 'Ink', [['full', 'Full color'], ['less', 'Less ink', 'outlines only'], ['line', 'Color-in', 'black only']]],
  ];
  $('options').innerHTML = OPTION_SETS.map(([name, legend, list]) => `<fieldset class="chips field"><legend>${legend}</legend>${list.map(([v, text, note]) =>
    `<label><input type="radio" name="${name}" value="${v}"><span class="chip">${text}${name === 'sides' ? `<small data-sides="${v}"></small>` : note ? `<small>${note}</small>` : ''}</span></label>`).join('')}</fieldset>`).join('');

  function drawSide() {
    const n = sheet.ids.length, s = summary(prefs.get('kid'), n, opts);
    for (const [name] of OPTION_SETS) $('options').querySelectorAll(`[name=${name}]`).forEach(i => { i.checked = i.value === String(opts[name]); });
    $('options').querySelectorAll('[data-sides]').forEach(el => { el.textContent = `${opts.per * el.dataset.sides} builds`; });
    $('pvCount').textContent = countLine(n, candidates(BUILDS, setup()).length);
    $('checks').innerHTML = checklist(opts).map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('');
    $('tipDuplex').hidden = opts.sides === 1;
    pageStyle.textContent = pageCss(opts);
    $('barTitle').textContent = s.title; $('barSub').textContent = s.sub;
  }
  function drawPaper() {
    $('desk').className = 'desk' + (opts.sides === 1 ? ' one' : '');
    $('desk').innerHTML = sheetHtml(sheet.ids.map(byId), { kid: prefs.get('kid'), pal: pal(), setupId: setup(), opts, kept: sheet.kept, sel });
    fit();
  }
  // The paper is laid out at its real size and shrunk to fit; --z lets screen-only marks stay readable.
  function fit() {
    document.querySelectorAll('.slot').forEach(slot => {
      const z = Math.min(1, slot.clientWidth / PAPERS[opts.paper].px), page = slot.querySelector('.page');
      page.style.zoom = z; page.style.setProperty('--z', z);
    });
  }
  // A new name only changes the titles, so the drawings are left alone.
  function drawNames() {
    document.querySelectorAll('.page header h2').forEach((h, pg) => { const t = sheetTitle(prefs.get('kid'), pg); h.textContent = t; h.style.fontSize = titlePt(t) + 'pt'; });
    const s = summary(prefs.get('kid'), sheet ? sheet.ids.length : 0, opts);
    $('barTitle').textContent = s.title; $('barSub').textContent = s.sub;
  }
  function render() {
    const ask = !sheet;
    $('ask').hidden = !ask; $('layout').hidden = $('printbar').hidden = ask;
    document.body.classList.toggle('asking', ask);
    if (ask) { $('ask').innerHTML = askHtml(); return; }
    drawSide(); drawPaper();
    if (sel >= 0) drawEditor();
  }
  const redrawSoon = oncePerFrame(() => { if (sheet) { drawPaper(); if (sel >= 0) drawEditor(); } });
  const commit = next => { sheet = next; saveSheet(prefs, sheet); render(); };

  let toastTimer;
  function toast(msg) { $('toast').textContent = msg; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200); }
  const cardEl = i => $('desk').querySelector(`.pcard[data-i="${i}"]`);

  /* ----- no set-up: the one question ----- */
  $('ask').addEventListener('click', e => {
    const own = e.target.closest('[data-own]')?.dataset.own; if (!own) return;
    prefs.set('setup', own); prefs.set('other', ''); prefs.set('answered', '1');
    bar.refresh(); sheet = readSheet(); render();
  });

  /* ----- card editor ----- */
  function drawEditor() {
    const b = byId(sheet.ids[sel]), kept = isKept(sheet, b.id), all = spares(sheet, BUILDS, setup()), list = all.filter(x => !swapTheme || x.theme === swapTheme);
    $('editor').innerHTML = `<div class="eh"><h2 id="edTitle">Card ${sel + 1} · ${esc(b.name)}</h2><button class="btn quiet" type="button" data-a="close">Done</button></div>
      <div class="ea"><button class="btn" type="button" data-a="keep" aria-pressed="${kept}">${kept ? 'Kept' : 'Keep'}</button>
        <button class="btn quiet" type="button" data-a="up"${sel === 0 ? ' disabled' : ''}>Move earlier</button>
        <button class="btn quiet" type="button" data-a="down"${sel === sheet.ids.length - 1 ? ' disabled' : ''}>Move later</button></div>
      <p class="small">Kept cards stay when you shuffle. <a href="${buildHref(b)}">See ${esc(b.name)} in 3D</a></p>
      <h3>Swap for another build</h3>
      ${all.length ? `<div class="chips">${[['', 'All'], ...Object.keys(THEMES).map(t => [t, THEMES[t]])].map(([v, t]) =>
        `<button type="button" class="chip" data-theme="${v}" aria-pressed="${v === swapTheme}">${v ? themeIcon(v) : ''}${esc(t)}</button>`).join('')}</div>
      <div class="picks">${list.map(x => `<button type="button" class="pick ${x.theme}" data-swap="${x.id}"><span class="pic">${drawBuild(x, pal())}</span>
        <span class="nm">${esc(x.name)}</span>${themeLabel(x.theme)}${untestedLabel(x) ? `<span class="untested">${untestedLabel(x)}</span>` : ''}</button>`).join('') || '<p class="small">No spare builds in this theme.</p>'}</div>`
      : '<p class="small">Every build you can make is already on this sheet. Use Move earlier and Move later to change the order.</p>'}`;
  }
  function openEditor(i) {
    sel = i; swapTheme = ''; drawEditor(); drawPaper();
    $('editor').showModal(); $('editor').scrollTop = 0;
    $('editor').querySelector('[data-a=close]').focus();
  }
  function closeEditor() { if ($('editor').open) $('editor').close(); }
  let flash = false;
  $('editor').addEventListener('close', () => {
    const was = sel; sel = -1;
    if (!sheet) return;
    drawPaper(); cardEl(was)?.focus();
    if (flash) cardEl(was)?.classList.add('flash');
    flash = false;
  });
  $('editor').addEventListener('click', e => {
    if (e.target === $('editor')) return closeEditor(); // a tap on the dimmed page behind
    const t = e.target.closest('button'); if (!t) return;
    const { a, swap: inId, theme } = t.dataset, id = sheet.ids[sel];
    const refocus = q => ($('editor').querySelector(q + ':not(:disabled)') || $('editor').querySelector('[data-a=close]')).focus();
    if (a === 'close') closeEditor();
    else if (a === 'keep') { commit(keep(sheet, id)); refocus('[data-a=keep]'); }
    else if (a === 'up' || a === 'down') { const by = a === 'up' ? -1 : 1; sel += by; commit(move(sheet, id, by)); refocus(`[data-a=${a}]`); }
    else if (theme !== undefined) { swapTheme = theme; drawEditor(); refocus(`[data-theme="${theme}"]`); }
    else if (inId) {
      const i = sel;
      sheet = swap(sheet, id, inId); saveSheet(prefs, sheet);
      flash = true; closeEditor(); drawSide();
      toast(`${byId(inId).name} is now card ${i + 1}, and kept.`);
    }
  });
  $('desk').addEventListener('click', e => { const c = e.target.closest('.pcard'); if (c) openEditor(+c.dataset.i); });

  /* ----- shuffle, start over, name, options ----- */
  $('shuffle').addEventListener('click', () => {
    if (isFull(sheet)) return toast('Every card is kept, so nothing changed. Tap a card to un-keep it.');
    const n = sheet.kept.length;
    commit(shuffle(sheet, BUILDS, setup()));
    toast(n ? `Shuffled. ${n} kept card${n === 1 ? '' : 's'} stayed put.` : 'Shuffled. Keep the ones you like, then shuffle again.');
  });
  $('reset').addEventListener('click', () => { commit(suggest(BUILDS, setup(), cardCount(opts))); toast('Back to the suggested builds.'); });
  const names = mountNames($('kid'), { prefs, onChange: () => { drawNames(); bar.refresh(); } });
  $('options').addEventListener('change', e => {
    const { name, value } = e.target; if (!(name in opts)) return;
    opts = { ...opts, [name]: name === 'sides' || name === 'per' ? +value : value };
    prefs.set('sheetopts', formatOpts(opts));
    if (name === 'sides') prefs.set('pagesset', '1');   // one page or two was chosen on purpose
    // A smaller sheet shows the first cards of the saved one; it is only cut down when edited.
    sheet = readSheet(); render();
  });
  const doPrint = () => window.print();
  $('print').addEventListener('click', doPrint); $('print2').addEventListener('click', doPrint);

  /* ----- send to my computer ----- */
  const currentHash = () => linkHash({ setup: setup(), colors: { nug: prefs.get('nug'), nug2: prefs.get('nug2'), chk: prefs.get('chk') }, opts, sheet });
  $('send').addEventListener('click', async () => {
    const url = location.origin + location.pathname + currentHash();
    try {
      if (navigator.share) await navigator.share({ title: 'Couch Coach sheet', url });
      else { await navigator.clipboard.writeText(url); toast('Link copied. Open it on the computer with the printer.'); }
    } catch (err) {
      if (err?.name === 'AbortError') return; // the share sheet was closed
      history.replaceState(null, '', currentHash());
      toast('Could not copy. The link is now in the address bar: copy it from there.');
    }
  });

  // A link that carries a sheet: use it straight away on a fresh browser, otherwise ask first.
  function useLink(link) {
    prefs.set('setup', link.setup); prefs.set('other', ''); prefs.set('answered', '1');
    if (link.colors.nug) prefs.set('nug', link.colors.nug);
    prefs.set('nug2', link.colors.nug2);
    if (link.colors.chk) prefs.set('chk', link.colors.chk);
    opts = link.opts; prefs.set('sheetopts', formatOpts(opts));
    saveSheet(prefs, link.sheet);
    bar.refresh(); sheet = readSheet(); render();
  }
  const dropHash = () => history.replaceState(null, '', location.pathname + location.search);
  function endOffer() { offered = null; $('offer').hidden = true; dropHash(); }
  $('offer').addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    const link = offered; endOffer();
    if (a === 'use') { useLink(link); toast('Sheet loaded from the link.'); }
  });

  window.addEventListener('resize', fit);
  sheet = readSheet();
  const link = location.hash.length > 1 ? readLink(location.hash, BUILDS, lang) : null;
  if (link && !hasSaved(prefs)) { useLink(link); dropHash(); }
  else if (link && !(sheet && linkHash({ ...link, sheet: link.sheet }) === currentHash())) {
    offered = link;
    $('offer').innerHTML = `<h2>Use this sheet?</h2>
      <p>This link carries a sheet for ${esc(OWNED[link.setup].label)}: ${link.sheet.ids.length} builds on ${PAPERS[link.opts.paper].label}. Using it replaces the set-up, colors and sheet saved in this browser. The child's name stays as it is.</p>
      <div class="acts"><button class="btn primary" type="button" data-a="use">Use this sheet</button><button class="btn quiet" type="button" data-a="keep">Keep mine</button></div>`;
    $('offer').hidden = false;
  } else if (link) dropHash();
  render();
}
