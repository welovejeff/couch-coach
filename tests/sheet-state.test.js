import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { fits } from '../js/setups.js';
import { suggest, normalise, add, remove, swap, keep, move, shuffle, spares, isFull, encode, decode, candidates, takeOff, another, resize, picksLost, sheetSize, setPages, loadSheet } from '../js/sheet-state.js';

const byId = id => BUILDS.find(b => b.id === id);

test('a suggested sheet starts with builds written for exactly what the family owns', () => {
  for (const own of ['couch', 'couch-addon', 'two-couch']) {
    const s = suggest(BUILDS, own);
    assert.equal(s.ids.length, 12);
    assert.ok(s.ids.every(id => byId(id).setup === own), own);
  }
});

test('two couches with the round add-on gets four builds from each set-up', () => {
  const s = suggest(BUILDS, 'two-couch-addon');
  for (const setup of ['couch', 'couch-addon', 'two-couch']) assert.equal(s.ids.filter(id => byId(id).setup === setup).length, 4, setup);
});

test('every candidate is a build the family can make, and none repeats', () => {
  for (const own of ['couch', 'couch-addon', 'two-couch', 'two-couch-addon']) {
    const list = candidates(BUILDS, own);
    assert.ok(list.every(b => fits(b.setup, own)));
    assert.equal(new Set(list).size, list.length);
  }
  assert.equal(candidates(BUILDS, 'couch-addon').length, 29);
  assert.deepEqual(candidates(BUILDS, ''), []);
});

test('the first row of a suggestion mixes the three themes', () => {
  const s = suggest(BUILDS, 'couch');
  assert.equal(new Set(s.ids.slice(0, 3).map(id => byId(id).theme)).size, 3);
});

test('picks sit first in the order they were picked, and the last suggestion makes room', () => {
  const s = suggest(BUILDS, 'couch-addon'), [a, b] = spares(s, BUILDS, 'couch-addon').map(x => x.id), last = s.ids[11];
  const t = add(add(s, a), s.ids[4]);
  assert.deepEqual(t.ids.slice(0, 2), [a, s.ids[4]]);
  assert.deepEqual(t.kept, [a, s.ids[4]]);
  assert.equal(new Set(t.ids).size, 12);
  assert.ok(!t.ids.includes(last));
  assert.deepEqual(add(t, a), t);
  assert.equal(add(t, b).ids[2], b);
  assert.ok(!remove(t, a).kept.includes(a));
});

test('taking a pick off closes the gap and a suggestion fills the end', () => {
  let s = suggest(BUILDS, 'couch');
  const [a, b, c] = s.ids;
  for (const id of [a, b, c]) s = add(s, id);
  const t = takeOff(s, b, BUILDS, 'couch');
  assert.deepEqual(t.ids.slice(0, 2), [a, c]);
  assert.deepEqual(t.kept, [a, c]);
  assert.equal(new Set(t.ids).size, 12);
});

test('"show another" swaps a suggestion for a build not on the sheet, and leaves picks alone', () => {
  const s = add(suggest(BUILDS, 'couch-addon'), suggest(BUILDS, 'couch-addon').ids[0]), sug = s.ids[5];
  const t = another(s, sug, BUILDS, 'couch-addon');
  assert.ok(!t.ids.includes(sug) && new Set(t.ids).size === 12 && t.ids[5] !== sug);
  assert.notEqual(another(t, t.ids[5], BUILDS, 'couch-addon').ids[5], t.ids[5]);
  assert.deepEqual(another(s, s.ids[0], BUILDS, 'couch-addon'), s);
  // with every build the family can make already on the sheet, there is nothing else to show
  const only = BUILDS.filter(b => b.setup === 'couch').slice(0, 12), full = suggest(only, 'couch');
  assert.deepEqual(another(full, full.ids[3], only, 'couch'), full);
});

test('a sheet starts as one page of six, and grows or shrinks with the page count', () => {
  const m = new Map(), prefs = { get: k => m.get(k) ?? '', set: (k, v) => m.set(k, v) };
  assert.deepEqual(sheetSize(prefs), { pages: 1, per: 6, count: 6 });
  m.set('setup', 'couch-addon');
  assert.equal(loadSheet(prefs, BUILDS).ids.length, 6);
  setPages(prefs, 2);
  assert.equal(prefs.get('sheetopts'), '.2..');
  assert.equal(loadSheet(prefs, BUILDS).ids.length, 12);
  m.set('sheetopts', 'a4.2.4.line'); setPages(prefs, 1);
  assert.equal(prefs.get('sheetopts'), 'a4.1.4.line');
  assert.deepEqual(sheetSize(prefs), { pages: 1, per: 4, count: 4 });
});

test('shrinking to one page keeps the first picks and says how many come off', () => {
  let s = suggest(BUILDS, 'couch-addon');
  const order = [...s.ids];
  for (const id of [order[11], order[10], order[0], order[1], order[2], order[3], order[4], order[5]]) s = add(s, id);
  assert.equal(picksLost(s, 6), 2);
  const t = resize(s, BUILDS, 'couch-addon', 6);
  assert.deepEqual(t.ids, s.ids.slice(0, 6));
  assert.deepEqual(t.kept, s.ids.slice(0, 6));
  const back = resize(t, BUILDS, 'couch-addon', 12);
  assert.equal(back.ids.length, 12);
  assert.deepEqual(back.ids.slice(0, 6), t.ids);
  assert.equal(picksLost(t, 12), 0);
});

test('a sheet where every card is kept takes no more', () => {
  let s = suggest(BUILDS, 'couch-addon');
  for (const id of s.ids) s = keep(s, id, true);
  assert.ok(isFull(s));
  assert.deepEqual(add(s, spares(s, BUILDS, 'couch-addon')[0].id), s);
});

test('swap, move and shuffle leave 12 different builds and never drop a kept one', () => {
  let s = suggest(BUILDS, 'couch-addon');
  const first = s.ids[0], spare = spares(s, BUILDS, 'couch-addon')[0].id;
  s = swap(s, s.ids[3], spare);
  s = move(s, first, 1);
  assert.equal(s.ids[1], first);
  assert.deepEqual(move(s, s.ids[0], -1), s);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const t = shuffle(keep(s, first, true), BUILDS, 'couch-addon', rand);
  assert.equal(new Set(t.ids).size, 12);
  assert.equal(t.ids[1], first);
  assert.equal(t.ids[3], spare);
  assert.notDeepEqual(t.ids, s.ids);
});

test('changing the set-up keeps chosen builds that still fit and replaces the rest', () => {
  let s = suggest(BUILDS, 'couch-addon');
  const couchOnly = candidates(BUILDS, 'couch-addon').find(b => b.setup === 'couch').id;
  s = add(keep(s, s.ids[0], true), couchOnly);
  const t = normalise(s, BUILDS, 'couch');
  assert.equal(t.ids.length, 12);
  assert.ok(t.ids.every(id => byId(id).setup === 'couch'));
  assert.deepEqual(t.kept, [couchOnly]);
});

test('a stored sheet survives a round trip, and rubbish is replaced by a suggestion', () => {
  const s = keep(suggest(BUILDS, 'two-couch'), suggest(BUILDS, 'two-couch').ids[2], true);
  assert.deepEqual(decode(encode(s)), s);
  assert.equal(decode('<script>'), null);
  assert.deepEqual(normalise(decode('nonsense'), BUILDS, 'couch').ids, suggest(BUILDS, 'couch').ids);
  assert.equal(normalise({ for: 'couch', ids: ['gone', 'gone'], kept: ['gone'] }, BUILDS, 'couch').ids.length, 12);
});
