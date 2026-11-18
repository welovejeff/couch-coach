import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { stepsOf, pageModel, captionFor, nextStep, prevStep } from '../js/steps.js';
import { baseFolded, tri, solidsOf } from '../js/pieces.js';

const folded = { id: 'f', name: 'F', theme: 'go', setup: 'couch', tested: false, pieces: [baseFolded(0, 0, 0), tri(0, 0, 11, 'x'), tri(0, 18, 11, 'x')] };

test('a folded base and two triangle pillows make three steps, not four', () => {
  const steps = stepsOf(folded);
  assert.equal(steps.length, 3);
  assert.equal(steps[0].solids.length, 2);
  assert.deepEqual(steps.map(s => s.label), ['Base', 'Triangle pillow', 'Triangle pillow']);
});

test("step 1 holds only the first piece's solids and the steps together hold every solid", () => {
  for (const b of BUILDS) {
    const steps = stepsOf(b);
    assert.ok(steps[0].solids.every(s => s.piece === 0), b.id);
    assert.equal(steps.reduce((n, s) => n + s.solids.length, 0), solidsOf(b).length, b.id);
  }
});

test('an unknown build id resolves to the not-found state', () => {
  assert.deepEqual(pageModel(BUILDS, 'no-such-build'), { found: false });
  assert.deepEqual(pageModel(BUILDS, null), { found: false });
});

test("an untested build's page carries the not-yet-kid-tested label", () => {
  assert.equal(pageModel([folded], 'f').label, 'Not yet kid-tested');
  assert.equal(pageModel([{ ...folded, tested: true }], 'f').label, '');
});

test('captions name the step and its piece, and stepping stays in range', () => {
  const steps = stepsOf(folded);
  assert.equal(captionFor(steps, 0), 'All 3 pieces');
  assert.equal(captionFor(steps, 2), 'Step 2 of 3: Triangle pillow');
  assert.equal(nextStep(steps, 0), 1);
  assert.equal(nextStep(steps, 3), 3);
  assert.equal(prevStep(1), 1);
  assert.equal(prevStep(3), 2);
});
