import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { baseFlat, baseFolded, tri, solidsOf, piecesOf } from '../js/pieces.js';

test('every build converts to solids, at least one per placed piece', () => {
  for (const b of BUILDS) {
    const pieces = piecesOf(b), solids = solidsOf(b);
    assert.ok(pieces.length > 0, b.id);
    for (let i = 0; i < pieces.length; i++) assert.ok(solids.some(s => s.piece === i), `${b.id} piece ${i}`);
    for (const s of solids) assert.ok(s.role && s.len > 0 && s.profile.length >= 3, b.id);
  }
});

test('a flat base along x is 66 long in x; along y it is 66 long in y', () => {
  const size = p => { const xs = p.solids[0].profile.map(q => q[0]), ys = p.solids[0].profile.map(q => q[1]); return [Math.max(...xs), Math.max(...ys)]; };
  assert.deepEqual(size(baseFlat(0, 0, 0, 'x')), [66, 33]);
  assert.deepEqual(size(baseFlat(0, 0, 0, 'y')), [33, 66]);
});

test('a folded base is one piece made of two stacked solids', () => {
  const p = baseFolded(0, 0, 0);
  assert.equal(p.type, 'base');
  assert.deepEqual(p.solids.map(s => s.o[2]), [0, 5.5]);
});

test('solids carry the colour role of their piece', () => {
  const roles = solidsOf({ pieces: [baseFlat(0, 0, 0, 'x'), tri(0, 0, 5.5, 'y')] }).map(s => s.role);
  assert.deepEqual(roles, ['base', 'tri']);
});
