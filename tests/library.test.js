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
