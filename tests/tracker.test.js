import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { suggest, add } from '../js/sheet-state.js';
import { tapResult, trackerWords, miniPaperHtml } from '../js/tracker.js';

const byId = id => BUILDS.find(b => b.id === id);
const one = { pages: 1, per: 6, count: 6 }, two = { pages: 2, per: 6, count: 12 };
const picked = (n, count) => { let s = suggest(BUILDS, 'couch-addon', count); for (const id of [...s.ids].slice(0, n)) s = add(s, id); return s; };
const spare = s => BUILDS.find(b => b.setup !== 'two-couch' && !s.ids.includes(b.id)).id;

test('a tap adds a build, and a tap on a pick takes it off', () => {
  const s = picked(2, 6);
  assert.equal(tapResult(s, s.ids[0], one, false), 'off');
  assert.equal(tapResult(s, s.ids[4], one, false), 'on');
  assert.equal(tapResult(s, spare(s), one, false), 'on');
});

test('the seventh pick starts page two, unless one page was chosen on purpose', () => {
  const s = picked(6, 6);
  assert.equal(tapResult(s, spare(s), one, false), 'grow');
  assert.equal(tapResult(s, spare(s), one, true), 'blocked');
  const full = picked(12, 12);
  assert.equal(tapResult(full, spare(full), two, false), 'blocked');
});

test('the tracker says where the sheet is up to and what the button does', () => {
  assert.deepEqual(trackerWords(picked(3, 6), one), { head: '3 of 6 picked', note: 'We fill the other 3.', full: false, done: false, button: 'Open sheet', long: '3 of 6 picked. We fill the other 3.' });
  assert.equal(trackerWords(picked(5, 6), one).note, 'We fill the last spot.');
  const full = trackerWords(picked(6, 6), one);
  assert.equal(full.head, 'Page one is full');
  assert.equal(full.note, 'Pick one more to start page two.');
  assert.equal(full.button, 'Print 1 page');
  assert.equal(trackerWords(picked(6, 6), one, { chosen: true }).note, 'Your page is full.');
  assert.equal(trackerWords(picked(7, 12), two, { grew: true }).note, 'Page two started. We fill the other 5.');
  const all = trackerWords(picked(12, 12), two);
  assert.equal(all.head, 'All 12 picked');
  assert.equal(all.button, 'Print 2 pages');
  assert.equal(trackerWords(picked(12, 12), two, { blocked: true }).note, 'Take one off to add another.');
  assert.equal(trackerWords(picked(6, 6), one, { chosen: true, blocked: true }).note, 'Take one off, or add page two.');
});

test('the mini paper shows picks solid and suggestions pale, one cell per build', () => {
  const s = picked(2, 6), html = miniPaperHtml(s, one, byId, { fresh: s.ids[1] });
  assert.equal(html.split('<i class="pick').length - 1, 2);
  assert.equal(html.split('<i class="sug').length - 1, 4);
  assert.equal(html.split('mp-page').length - 1, 1);
  assert.ok(html.includes('mp-peek') && html.includes(' new'));
  assert.ok(!miniPaperHtml(s, one, byId).includes('>+<'));
  assert.ok(miniPaperHtml(picked(6, 6), one, byId).includes('>+<'));
  assert.ok(!miniPaperHtml(picked(6, 6), one, byId, { chosen: true }).includes('>+<'));
  const both = miniPaperHtml(picked(9, 12), two, byId);
  assert.equal(both.split('"mp-page').length - 1, 2);
  assert.ok(!both.includes('mp-peek'));
});
