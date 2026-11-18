import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toThree, solidBasis } from '../js/viewer3d.js';

test("the library's x, y and z directions map to three.js x, z and y", () => {
  assert.deepEqual(toThree([1, 0, 0]), [1, 0, 0]);
  assert.deepEqual(toThree([0, 1, 0]), [0, 0, 1]);
  assert.deepEqual(toThree([0, 0, 1]), [0, 1, 0]);
});

test('a solid pushed along the library z axis rises along three.js y', () => {
  assert.deepEqual(solidBasis('z')[2], [0, 1, 0]);
  assert.deepEqual(solidBasis('x')[2], [1, 0, 0]);
  assert.deepEqual(solidBasis('y')[2], [0, 0, 1]);
});
