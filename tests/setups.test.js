import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMake, checkBuild, fits, inventory, untestedLabel } from '../js/setups.js';
import { baseFlat, cushFlat, tri, hoop, second } from '../js/pieces.js';

const mk = (id, setup, pieces = [baseFlat(0, 0, 0, 'x')]) => ({ id, name: id, theme: 'go', setup, tested: false, pieces });
const lib = [mk('a', 'couch'), mk('b', 'couch-addon'), mk('c', 'two-couch')];
const ids = list => list.map(b => b.id);

test('one couch plus the round add-on can make one-couch and add-on builds, not two-couch ones', () => {
  assert.deepEqual(ids(canMake(lib, 'couch-addon')), ['a', 'b']);
});

test('one couch can make only one-couch builds', () => {
  assert.deepEqual(ids(canMake(lib, 'couch')), ['a']);
});

test('two couches can make one-couch and two-couch builds, nothing needing the round add-on', () => {
  assert.deepEqual(ids(canMake(lib, 'two-couch')), ['a', 'c']);
});

test('with nothing chosen every build is shown', () => {
  assert.deepEqual(ids(canMake(lib, '')), ['a', 'b', 'c']);
});

test('inventories count pieces per set-up', () => {
  assert.deepEqual(inventory('two-couch'), { base: 2, cushion: 2, triangle: 4, pad: 0, hoop: 0, puck: 0 });
  assert.equal(inventory('couch-addon').puck, 2);
  assert.ok(fits('couch', 'two-couch') && !fits('couch-addon', 'two-couch'));
});

test('a one-couch build with three triangle pillows fails, naming the build and the piece', () => {
  const errors = checkBuild(mk('too-many', 'couch', [tri(0, 0, 0, 'x'), tri(0, 20, 0, 'x'), tri(0, 40, 0, 'x')]));
  assert.equal(errors.length, 2);
  assert.match(errors[0], /too-many/);
  assert.match(errors[0], /3 × Triangle pillow/);
});

test('a one-couch build cannot use the round add-on or a second couch', () => {
  assert.match(checkBuild(mk('x', 'couch', [hoop(0, 0, 0)]))[0], /Hoop/);
  assert.match(checkBuild(mk('y', 'couch', [second(cushFlat(0, 0, 0, 'x'))]))[0], /second couch/);
});

test('a two-couch build may not take two bases from the same couch', () => {
  const errors = checkBuild(mk('z', 'two-couch', [baseFlat(0, 0, 0, 'x'), baseFlat(0, 40, 0, 'x')]));
  assert.match(errors[0], /2 × Base from one couch/);
});

test('unknown set-ups and themes are reported', () => {
  assert.match(checkBuild(mk('q', 'three-couch'))[0], /unknown set-up/);
  assert.match(checkBuild({ ...mk('r', 'couch'), theme: 'space' })[0], /unknown theme/);
});

test('an untested build carries the label and a tested one does not', () => {
  assert.equal(untestedLabel(mk('a', 'couch')), 'Not yet kid-tested');
  assert.equal(untestedLabel({ ...mk('a', 'couch'), tested: true }), '');
});
