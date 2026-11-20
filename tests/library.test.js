import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { checkLibrary, SETUP_IDS, THEMES } from '../js/setups.js';

test('every build passes the library check', () => {
  assert.deepEqual(checkLibrary(BUILDS), []);
});

test('giving a build an extra piece fails the check', () => {
  const b = BUILDS[0], extra = { ...b, pieces: [...b.pieces, b.pieces[0]] };
  assert.ok(checkLibrary([extra]).length > 0);
});

test('every build has a unique id, a name, a known set-up and a theme', () => {
  assert.equal(new Set(BUILDS.map(b => b.id)).size, BUILDS.length);
  for (const b of BUILDS) {
    assert.ok(b.name && SETUP_IDS.includes(b.setup) && THEMES[b.theme], b.id);
    assert.match(b.id, /^[a-z0-9-]+$/);
  }
});

test('each set-up has at least 12 floor-only builds, three or more per theme, and one couch has three that lean on something', () => {
  assert.deepEqual(BUILDS.filter(b => b.prop).map(b => [b.id, b.setup, b.prop.kind]), [['toy-car-ramp', 'couch', 'sofa'], ['wall-den', 'couch', 'wall'], ['sofa-slide', 'couch', 'sofa']]);
  for (const setup of SETUP_IDS) {
    const list = BUILDS.filter(b => b.setup === setup && !b.prop);
    assert.equal(list.length, setup === 'couch' ? 14 : 12, setup);
    for (const theme of Object.keys(THEMES)) assert.ok(list.filter(b => b.theme === theme).length >= 3, `${setup} ${theme}`);
  }
});

test('only two-couch builds use a second couch', () => {
  for (const b of BUILDS) {
    const usesSecond = b.pieces.flat().some(p => p.couch === 2);
    assert.equal(usesSecond, b.setup === 'two-couch', b.id);
  }
});
