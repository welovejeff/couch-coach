import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILDS } from '../js/builds.js';
import { palette } from '../js/flat.js';
import { createPrefs } from '../js/prefs.js';
import { OWNED_IDS } from '../js/setups.js';
import { suggest, keep } from '../js/sheet-state.js';
import * as setups from '../js/setups.js';
import {
  guessPaper, parseOpts, formatOpts, cardCount, pageCount, sheetPages, pageCss, sheetTitle, titlePt, footerText, checklist,
  countLine, summary, needsSetup, askHtml, linkHash, readLink, hasSaved, sheetHtml,
} from '../js/sheet.js';

const pal = palette({ nug: '#4f7cb8', nug2: '', chk: '#9db08a' });
const byId = id => BUILDS.find(b => b.id === id);
const opts = (text = 'letter.2.6.full') => parseOpts(text, 'en-US');
const html = (setupId, o = opts(), extra = {}) => sheetHtml(suggest(BUILDS, setupId, cardCount(o)).ids.map(byId), { kid: '', pal, setupId, opts: o, ...extra });
const text = out => out.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
const count = (out, needle) => out.split(needle).length - 1;
const mem = (seed = {}) => { const m = new Map(Object.entries(seed)); return createPrefs({ getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) }); };

test('with no set-up saved the page asks which couch, and never falls back to one', () => {
  assert.equal(setups.DEFAULT_SETUP, undefined);
  for (const none of ['', 'nonsense', 'toString', undefined]) assert.equal(needsSetup(none), true, String(none));
  for (const id of OWNED_IDS) assert.equal(needsSetup(id), false, id);
  const ask = askHtml();
  assert.ok(ask.includes('Which couch is this sheet for?'));
  assert.deepEqual([...ask.matchAll(/data-own="([^"]+)"/g)].map(m => m[1]), OWNED_IDS);
});

test('titles carry the name on both pages, and read well without one', () => {
  assert.equal(sheetTitle('Max', 0), 'Max’s couch builds');
  assert.equal(sheetTitle('Max', 1), 'More of Max’s builds');
  assert.equal(sheetTitle('', 0), 'Our couch builds');
  assert.equal(sheetTitle('', 1), 'More couch builds');
  assert.equal(sheetTitle('  ', 0), 'Our couch builds');
  const out = html('couch-addon', opts(), { kid: 'Max' });
  assert.ok(out.includes('Max’s couch builds') && out.includes('More of Max’s builds'));
});

test('a long name shrinks the title, and a name is escaped on the paper', () => {
  assert.equal(titlePt(sheetTitle('Max', 0)), 32);
  assert.ok(titlePt(sheetTitle('Wwwwwwwwwwwwww', 1)) < 32);
  assert.ok(html('couch', opts(), { kid: '<b>' }).includes('&lt;b&gt;’s couch builds'));
});

test('every untested card says so, and a tested build does not', () => {
  for (const o of ['letter.2.6.full', 'a4.1.4.line', 'a4.2.4.less']) {
    const out = html('two-couch-addon', opts(o));
    assert.equal(count(out, '<span class="ut">Not yet kid-tested</span>'), cardCount(opts(o)), o);
  }
  const tested = suggest(BUILDS, 'couch').ids.map(id => ({ ...byId(id), tested: true }));
  assert.ok(!sheetHtml(tested, { pal, setupId: 'couch', opts: opts() }).includes('Not yet kid-tested'));
});

test('picture size and sides give 12, 8, 6 or 4 cards on the right number of pages', () => {
  for (const [o, cards, pages] of [['letter.2.6.full', 12, 2], ['letter.2.4.full', 8, 2], ['a4.1.6.less', 6, 1], ['a4.1.4.line', 4, 1]]) {
    const op = opts(o), out = html('couch-addon', op);
    assert.equal(cardCount(op), cards, o);
    assert.equal(pageCount(op), pages, o);
    assert.equal(count(out, '<article class="page'), pages, o);
    assert.equal(count(out, 'class="pcard '), cards, o);
  }
});

test('the chosen builds are dealt onto pages in order', () => {
  const ids = suggest(BUILDS, 'couch-addon').ids;
  assert.deepEqual(sheetPages(ids, opts('letter.2.6.full')), [ids.slice(0, 6), ids.slice(6, 12)]);
  assert.deepEqual(sheetPages(ids.slice(0, 8), opts('letter.2.4.full')), [ids.slice(0, 4), ids.slice(4, 8)]);
  assert.deepEqual(sheetPages(ids.slice(0, 6), opts('letter.1.6.full')), [ids.slice(0, 6)]);
  const numbers = [...html('couch-addon').matchAll(/class="num">(\d+)</g)].map(m => +m[1]);
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('paper is guessed from the language: Letter for North America, A4 elsewhere', () => {
  for (const lang of ['en-US', 'en-CA', 'fr-CA', 'es-MX', 'es-US', 'en_US', 'zh-Hant-US']) assert.equal(guessPaper(lang), 'letter', lang);
  for (const lang of ['en-GB', 'de-DE', 'fr-FR', 'en-AU', 'es-ES', 'ja', 'en', '', undefined]) assert.equal(guessPaper(lang), 'a4', String(lang));
});

test('saved options round-trip, and anything odd falls back to the defaults', () => {
  for (const o of ['letter.2.6.full', 'a4.1.4.line', 'a4.2.6.less']) assert.equal(formatOpts(parseOpts(o, 'en-GB')), o);
  assert.deepEqual(parseOpts('', 'en-US'), { paper: 'letter', sides: 1, per: 6, ink: 'full' });
  assert.deepEqual(parseOpts('', 'en-GB'), { paper: 'a4', sides: 1, per: 6, ink: 'full' });
  assert.deepEqual(parseOpts('tabloid.9.99.glitter', 'de-DE'), { paper: 'a4', sides: 1, per: 6, ink: 'full' });
  assert.deepEqual(parseOpts('constructor.1.4.toString', 'en-US'), { paper: 'letter', sides: 1, per: 4, ink: 'full' });
});

test('the page size follows the paper choice', () => {
  assert.ok(pageCss(opts('letter.2.6.full')).includes('@page { size: 8.5in 11in; margin: 0; }'));
  assert.ok(pageCss(opts('a4.2.6.full')).includes('@page { size: 210mm 297mm; margin: 0; }'));
  assert.ok(pageCss(opts('a4.2.6.full')).includes('.page { width: 210mm; height: 297mm; }'));
});

test('the print checklist has five lines that follow the choices', () => {
  const two = Object.fromEntries(checklist(opts('letter.2.6.full'))), one = Object.fromEntries(checklist(opts('a4.1.4.line')));
  assert.deepEqual(Object.keys(two), ['Paper size', 'Two-sided', 'Scale', 'Background graphics', 'Pages']);
  assert.equal(two['Paper size'], 'US Letter'); assert.equal(one['Paper size'], 'A4');
  assert.ok(two['Two-sided'].startsWith('On')); assert.equal(one['Two-sided'], 'Off');
  assert.ok(two.Scale.startsWith('100%'));
  assert.equal(two['Background graphics'], 'On'); assert.equal(one['Background graphics'], 'Either');
  assert.equal(two.Pages, '2'); assert.equal(one.Pages, '1');
});

test('the footer says how to use the sheet, what it is for, and which page it is', () => {
  const f = footerText('two-couch', 0, 2);
  assert.equal(f.hint, 'Point at one to build it. Color the star when it is built.');
  assert.equal(f.setup, '2 play couches · A grown-up stays close');
  assert.equal(f.page, 'Page 1 of 2');
  assert.equal(footerText('couch', 1, 2).page, 'Page 2 of 2');
  assert.equal(footerText('couch', 0, 1).page, '');
  const out = text(html('two-couch'));
  assert.ok(out.includes('2 play couches · A grown-up stays close') && out.includes('Page 2 of 2'));
  assert.ok(!out.includes('round add-on'));
});

test('the footer key names every theme beside its shape, in every ink', () => {
  for (const o of ['letter.2.6.full', 'letter.2.6.less', 'letter.2.6.line']) {
    const out = html('couch-addon', opts(o));
    for (const [id, name] of Object.entries(setups.THEMES)) assert.ok(out.includes(`<use href="#cc-${id}"/></svg>${name.replace('&', '&amp;')}`), `${o} ${id}`);
  }
});

test('cards are buttons, the header uses the mark, and nothing on the paper is an emoji heading', () => {
  const out = html('couch-addon');
  assert.equal(count(out, '<button type="button" class="pcard '), 12);
  assert.equal(count(out, 'href="#cc-mark"'), 2);
  assert.equal(count(out, 'href="#cc-star"'), 12);
  assert.ok(!/[\u{1F300}-\u{1FAFF}⭐★]/u.test(text(out)));
});

test('the color-in sheet draws outlines only, and kept marks follow the kept list', () => {
  const ids = suggest(BUILDS, 'couch', 4).ids, list = ids.map(byId);
  const line = sheetHtml(list, { pal, setupId: 'couch', opts: opts('letter.1.4.line') });
  const fills = new Set([...line.matchAll(/<path d="[^"]*" fill="(#[0-9a-f]{6})"/g)].map(m => m[1]));
  assert.deepEqual([...fills], ['#ffffff']);
  assert.equal(count(line, 'class="kept"'), 0);
  assert.equal(count(sheetHtml(list, { pal, setupId: 'couch', opts: opts('letter.1.4.full'), kept: [ids[1], ids[3]] }), 'class="kept"'), 2);
});

test('no sheet text uses a brand name', () => {
  for (const setup of OWNED_IDS) assert.ok(!/nugget|chunk/i.test(text(html(setup)) + askHtml()), setup);
});

test('the count line and the phone bar summarise the sheet', () => {
  assert.equal(countLine(12, 24), '12 of the 24 builds you can make');
  assert.deepEqual(summary('Max', 12, opts()), { title: 'Max’s sheet', sub: '12 builds · US Letter · two-sided' });
  assert.deepEqual(summary('', 4, opts('a4.1.4.line')), { title: 'Your sheet', sub: '4 builds · A4 · one side' });
});

test('a link carries the set-up, colors, options and builds, and reads back the same', () => {
  const sheet = keep(suggest(BUILDS, 'couch-addon', 8), suggest(BUILDS, 'couch-addon', 8).ids[2]);
  const state = { setup: 'couch-addon', colors: { nug: '#2f8f8a', nug2: '', chk: '#E9B441' }, opts: opts('a4.2.4.less'), sheet };
  const back = readLink(linkHash(state), BUILDS, 'en-US');
  assert.equal(back.setup, 'couch-addon');
  assert.deepEqual(back.colors, { nug: '#2f8f8a', nug2: '', chk: '#e9b441' });
  assert.deepEqual(back.opts, state.opts);
  assert.deepEqual(back.sheet, sheet);
  assert.equal(linkHash(back), linkHash({ ...state, colors: back.colors }));
});

test('the child’s name is never in the link', () => {
  const hash = linkHash({ kid: 'Zebedee', name: 'Zebedee', setup: 'couch', colors: { nug: '#4f7cb8', nug2: '', chk: '#9db08a' }, opts: opts(), sheet: suggest(BUILDS, 'couch') });
  assert.ok(!/zebedee/i.test(hash) && !/[?&#]k(id)?=/.test(hash));
  assert.deepEqual([...new URLSearchParams(hash.slice(1)).keys()], ['s', 'n', 'n2', 'c', 'o', 'b']);
  assert.equal(Object.hasOwn(readLink(hash, BUILDS), 'kid'), false);
});

test('a rubbish link is turned down without throwing', () => {
  const good = linkHash({ setup: 'couch', colors: { nug: '#4f7cb8', nug2: '', chk: '#9db08a' }, opts: opts(), sheet: suggest(BUILDS, 'couch') });
  for (const bad of ['', '#', '#top', '#%E0%A4%A', '#s=couch', '#b=couch:race-car', '#s=nonsense&b=nonsense:race-car', '#s=toString&b=toString:x',
    '#s=couch&b=two-couch:race-car', '#s=couch&b=couch:not-a-build.also-not', '#s=couch&b=<script>', good.replace('s=couch', 's=__proto__'), null, undefined, 42, {}]) {
    assert.doesNotThrow(() => readLink(bad, BUILDS), String(bad));
    assert.equal(readLink(bad, BUILDS), null, String(bad));
  }
  // odd colors and options are dropped, the builds still come through
  const odd = readLink('#s=couch&n=red&c=%3Cb%3E&o=huge&b=' + encodeURIComponent(suggest(BUILDS, 'couch').ids.slice(0, 3).join('.')).replace(/^/, 'couch:'), BUILDS, 'en-GB');
  assert.deepEqual(odd.colors, { nug: '', nug2: '', chk: '' });
  assert.equal(odd.opts.paper, 'a4');
  assert.equal(odd.sheet.ids.length, 6);
  assert.deepEqual(odd.sheet.ids.slice(0, 3), suggest(BUILDS, 'couch').ids.slice(0, 3));
});

test('a link only asks before replacing choices when there are some', () => {
  assert.equal(hasSaved(mem()), false);
  assert.equal(hasSaved(mem({ 'cc-kid': 'Max', 'cc-nug': '#c9504a' })), false);
  for (const k of ['answered', 'setup', 'sheet', 'sheetopts']) assert.equal(hasSaved(mem({ ['cc-' + k]: 'x' })), true, k);
});

test('a white numeral is readable on every theme’s number badge', () => {
  const css = readFileSync(new URL('../css/brand.css', import.meta.url), 'utf8');
  const token = name => { const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css)[1].trim(); return m.startsWith('var(') ? token(m.slice(6, -1)) : m; };
  const lum = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  // 3:1 is the bar for large bold text; the numerals print at 25pt or more
  for (const theme of Object.keys(setups.THEMES)) assert.ok(1.05 / (lum(token(theme)) + 0.05) >= 3, `${theme} ${token(theme)}`);
});
