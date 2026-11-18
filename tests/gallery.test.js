import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { visibleBuilds, cardModel, buildHref, showsSecondColor, EMPTY_MESSAGE } from '../js/gallery.js';
import { createPrefs } from '../js/prefs.js';

test('one couch plus the round add-on, no theme: 24 builds and no two-couch build', () => {
  const list = visibleBuilds(BUILDS, { owned: 'couch-addon', theme: '' });
  assert.equal(list.length, 24);
  assert.ok(list.every(b => b.setup !== 'two-couch'));
});

test('forts with two couches owned: only fort builds the visitor can make', () => {
  const list = visibleBuilds(BUILDS, { owned: 'two-couch', theme: 'fort' });
  assert.ok(list.length > 0);
  assert.ok(list.every(b => b.theme === 'fort' && b.setup !== 'couch-addon'));
});

test('with nothing chosen the gallery shows every build', () => {
  assert.equal(visibleBuilds(BUILDS, { owned: '', theme: '' }).length, BUILDS.length);
});

test('a combination that matches nothing returns an empty list, and there is a message for it', () => {
  assert.deepEqual(visibleBuilds([], { owned: 'couch', theme: 'go' }), []);
  assert.ok(EMPTY_MESSAGE.length > 0);
});

test('an untested build card carries the not-yet-kid-tested label', () => {
  assert.equal(cardModel({ ...BUILDS[0], tested: false }).label, 'Not yet kid-tested');
  assert.equal(cardModel({ ...BUILDS[0], tested: true }).label, '');
});

test("each card links to its own build's page", () => {
  for (const b of BUILDS) assert.equal(cardModel(b).href, `build.html?b=${b.id}`);
  assert.equal(buildHref({ id: 'race-car' }), 'build.html?b=race-car');
});

test('the second couch colour control shows only for two couches', () => {
  assert.equal(showsSecondColor('two-couch'), true);
  assert.equal(showsSecondColor('couch-addon'), false);
  assert.equal(showsSecondColor(''), false);
});

test('a colour saved from the gallery is what another page reads', () => {
  const m = new Map(), store = { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) };
  createPrefs(store).set('nug', '#00aa55');
  assert.equal(createPrefs(store).colors().nug, '#00aa55');
});
