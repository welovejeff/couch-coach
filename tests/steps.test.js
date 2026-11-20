import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import {
  stepsOf, pageModel, captionFor, nextStep, prevStep, describeSteps, clampStep, mainLabel, stepModel, pieceLine,
  partsOf, leftOver, floorSpace, verdictFor, nextBuilds, nextBuildsNote, neighbours,
} from '../js/steps.js';
import { baseFlat, baseFolded, baseCorner, baseTent, cushFlat, cushFolded, cushion, box, lean, tri, hoop, hoopUp, puck, pad, wheel, second, solidsOf } from '../js/pieces.js';

const folded = { id: 'f', name: 'F', theme: 'go', setup: 'couch', tested: false, pieces: [baseFolded(0, 0, 0), tri(0, 0, 11, 'x'), tri(0, 18, 11, 'x')] };
const say = (...pieces) => describeSteps(pieces.flat()).map(s => s.text);
const find = id => BUILDS.find(b => b.id === id);

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

test('captions name the step and say what to do, and stepping stays in range', () => {
  const steps = stepsOf(folded);
  assert.equal(captionFor(steps, 0), 'All 3 pieces');
  assert.equal(captionFor(steps, 2), 'Step 2 of 3: Set a triangle pillow down on top of the base, point up.');
  assert.equal(nextStep(steps, 0), 1);
  assert.equal(nextStep(steps, 3), 3);
  assert.equal(prevStep(1), 1);
  assert.equal(prevStep(3), 2);
});

/* ---------- step sentences ---------- */
test('a sentence says how the piece lies: flat, folded, on its edge, as a tent, on its end', () => {
  assert.deepEqual(say(baseFlat(0, 0, 0, 'x')), ['Lay the base flat on the floor.']);
  assert.deepEqual(say(baseFolded(0, 0, 0)), ['Fold the base in half and lay it on the floor.']);
  assert.deepEqual(say(baseCorner(0, 0)), ['Stand the base on its long edge on the floor and bend it into a corner.']);
  assert.deepEqual(say(baseTent(0, 0)), ['Stand the base up like a tent on the floor, with the fold at the top.']);
  assert.deepEqual(say(tri(0, 0, 0, 'z')), ['Stand the triangle pillow on its end on the floor.']);
  assert.deepEqual(say(tri(0, 0, 0, 'y')), ['Set the triangle pillow down on the floor, point up.']);
  assert.deepEqual(say(wheel(14, 33)), ['Stand the puck on its rim on the floor, like a wheel.']);
  assert.deepEqual(say(hoopUp(33, 16.5, 0)), ['Stand the hoop up on its rim on the floor.']);
});

test('a sentence says what the piece rests on, and which one when two are down', () => {
  assert.equal(say(baseFlat(0, 0, 0, 'x'), cushFolded(33, 0, 5.5))[1], 'Fold the cushion in half and lay it on top of the base.');
  assert.equal(say(pad(0, 0, 0), puck(0, 0, 3.25), puck(0, 0, 8.75))[2], 'Lay the other puck flat on top of the first puck.');
  assert.equal(say(baseCorner(0, 0), cushFolded(-5.5, -5.5, 33))[1], 'Fold the cushion in half and lay it across the top of the base.');
  const rig = say(baseFlat(0, 0, 0, 'x'), second(baseFlat(66, 0, 0, 'x')), cushFlat(0, 0, 5.5, 'x'), second(cushFolded(99, 0, 5.5)));
  assert.equal(rig[2], 'Lay a cushion flat on top of the first base.');
  assert.equal(rig[3], 'Fold the other cushion in half and lay it on top of the second base.');
  assert.equal(say(baseFlat(0, 0, 0, 'x'), second(baseFlat(0, 48, 0, 'x')), cushFlat(16.5, 7.5, 5.5, 'y'))[2], 'Lay the cushion flat on top of the bases.');
});

test('pucks go inside the hoop and the pad goes on top of it', () => {
  assert.deepEqual(say(hoop(0, 0, 0), puck(0, 0, 0), puck(0, 0, 5.5), pad(0, 0, 11)), [
    'Lay the hoop flat on the floor.', 'Lay a puck flat inside the hoop.',
    'Lay the other puck flat inside the hoop, on top of the first puck.', 'Lay the round pad flat on top of the hoop.',
  ]);
  assert.equal(say(puck(0, 0, 0), hoop(0, 0, 0))[1], 'Lower the hoop over the puck.');
});

test('a half-sloping cushion is a slide when it runs down and a ramp when it is propped up', () => {
  const slide = cushion(box(0, 0, 11, 33, 33, 3.25), lean('x', 33, 11, 64.1, 0, 0, 3.25, 1));
  const ramp = cushion(box(33, 0, 5.5, 33, 33, 3.25), lean('x', 33, 5.5, 2.9, 19, 0, 3.25, -1));
  assert.equal(say(baseFolded(0, 0, 0), slide)[1], 'Lay half of the cushion flat on top of the base and let the rest slope down like a slide.');
  assert.equal(say(baseFlat(0, 0, 0, 'x'), ramp)[1], 'Lay half of the cushion flat on top of the base and prop the rest up like a ramp.');
});

test('pieces of a kind are named a, another, the last; a pair is a and the other', () => {
  assert.deepEqual(say(tri(0, 0, 0, 'y'), tri(40, 0, 0, 'y')).map(t => t.split(' ').slice(1, 3).join(' ')), ['a triangle', 'the other']);
  const four = say(tri(0, 0, 0, 'y'), tri(40, 0, 0, 'y'), second(tri(80, 0, 0, 'y'), tri(120, 0, 0, 'y')));
  assert.deepEqual(four.map(t => t.split(' ')[1] + ' ' + t.split(' ')[2]), ['a triangle', 'another triangle', 'another triangle', 'the last']);
});

test('every build gets one finished sentence per piece, and none falls back to "where the picture shows"', () => {
  for (const b of BUILDS) for (const s of stepsOf(b)) {
    assert.match(s.text, /^[A-Z].*\.$/, b.id);
    assert.doesNotMatch(s.text, /picture shows|undefined/, `${b.id}: ${s.text}`);
  }
});

test('the piece line counts within its kind, and names the couch in a two-couch build', () => {
  const race = stepsOf(find('race-car'));
  assert.equal(pieceLine(race[0]), 'Base');
  assert.equal(pieceLine(race[2]), 'Triangle pillow · 1 of 2');
  assert.equal(pieceLine(race[3]), 'Triangle pillow · 2 of 2');
  const rig = stepsOf(find('big-rig'));
  assert.equal(pieceLine(rig[1], true), 'Base · second couch');
  assert.equal(pieceLine(rig[4], true), 'Triangle pillow · first couch · 2 of 2');
});

/* ---------- the step-through ---------- */
test('the main button starts, counts pieces, finishes, then points to the next build', () => {
  assert.deepEqual(mainLabel(0, 8), { text: 'Start building', small: '8 steps' });
  assert.deepEqual(mainLabel(3, 8), { text: 'Next piece', small: '3 of 8' });
  assert.deepEqual(mainLabel(8, 8), { text: 'Finish', small: '' });
  assert.deepEqual(mainLabel(9, 8), { text: 'Pick the next build', small: '' });
});

test('steps run from 0 (before you start) to one past the last piece (finished)', () => {
  assert.equal(clampStep(-1, 8), 0);
  assert.equal(clampStep(4, 8), 4);
  assert.equal(clampStep(99, 8), 9);
  assert.equal(clampStep(NaN, 8), 0);
});

test('the step card reads before, during and after the build', () => {
  const steps = stepsOf(find('castle'));
  assert.equal(stepModel(steps, 0, 'About 10 × 4.5 ft of floor').say, 'Clear about 10 × 4.5 ft of floor, then put down one piece at a time.');
  assert.deepEqual(stepModel(steps, 4), { state: 'step', kicker: 'Step 4 of 8', say: 'Stand a triangle pillow on its end on the floor.', more: '' });
  const done = stepModel(steps, 9);
  assert.equal(done.say, 'All 8 pieces are down.');
  assert.match(done.more, /^Check it stands firm before anyone climbs on/);
});

/* ---------- parts ---------- */
test('the parts list counts each kind of piece and adds up to the build', () => {
  const rows = partsOf(stepsOf(find('castle')));
  assert.deepEqual(rows.map(r => [r.name, r.need]), [['Base', 1], ['Cushion', 1], ['Triangle pillow', 2], ['Round pad', 1], ['Hoop', 1], ['Puck', 2]]);
  assert.ok(rows.every(r => r.note === '' && !r.now && !r.done));
  for (const b of BUILDS) assert.equal(partsOf(stepsOf(b)).reduce((n, r) => n + r.need, 0), b.pieces.flat().length, b.id);
});

test('parts rows tick off as steps pass and the current kind is marked', () => {
  const steps = stepsOf(find('castle'));   // base, hoop, cushion, triangle, triangle, pad, puck, puck
  const at4 = Object.fromEntries(partsOf(steps, 4).map(r => [r.type, r]));
  assert.equal(at4.triangle.note, '1 of 2 down');
  assert.equal(at4.triangle.now, true);
  assert.equal(at4.base.note, 'Down');
  assert.equal(at4.pad.note, '', 'a single piece has no count until it is down');
  assert.equal(partsOf(steps, 5).find(r => r.type === 'triangle').note, 'All down');
  assert.equal(at4.base.done, true);
  assert.equal(at4.base.now, false);
  assert.equal(at4.puck.note, '0 of 2 down');
  assert.ok(partsOf(steps, 9).every(r => r.done && !r.now));
});

test('a two-couch build lists each couch\'s pieces on their own rows', () => {
  const rows = partsOf(stepsOf(find('big-rig')), 2);
  assert.deepEqual(rows.map(r => `${r.name}/${r.from}/${r.need}`), ['Base/First couch/1', 'Base/Second couch/1', 'Cushion/First couch/1', 'Cushion/Second couch/1', 'Triangle pillow/First couch/2', 'Triangle pillow/Second couch/2']);
  assert.equal(rows[1].now, true);
  assert.equal(partsOf(stepsOf(find('castle')))[0].from, '');
});

test('left-over pieces are named, and nothing is said when the build uses them all', () => {
  assert.equal(leftOver(find('castle')), '');
  assert.equal(leftOver({ ...folded, setup: 'couch-addon' }), 'Not used in this build: 1 cushion, 1 round pad, 1 hoop, 2 pucks.');
});

/* ---------- header facts, verdict, where next ---------- */
test('floor space is the footprint rounded up to half a foot, longest side first', () => {
  assert.equal(floorSpace({ pieces: [baseFlat(0, 0, 0, 'x')] }).text, 'About 5.5 × 3 ft of floor');     // 66 × 33 in
  assert.equal(floorSpace({ pieces: [baseFlat(0, 0, 0, 'y')] }).text, 'About 5.5 × 3 ft of floor');
  assert.equal(floorSpace({ pieces: [box72()] }).text, 'About 6 × 2 ft of floor');                       // exact feet stay put
  assert.equal(floorSpace(find('castle')).text, 'About 10 × 4.5 ft of floor');
});
function box72() { return { type: 'base', couch: 1, solids: [box(0, 0, 0, 72, 24, 5)] }; }

test('the verdict says whether the saved set-up can make the build', () => {
  assert.deepEqual(verdictFor('couch', 'couch-addon'), { kind: 'ok', text: 'You have every piece for this', note: '' });
  assert.deepEqual(verdictFor('couch-addon', 'couch'), { kind: 'short', text: 'You need a round add-on for this one', note: 'Your set-up is 1 play couch.' });
  assert.equal(verdictFor('two-couch', 'couch-addon').text, 'You need 2 couches for this one');
  assert.equal(verdictFor('two-couch', 'two-couch-addon').kind, 'ok');
  assert.deepEqual(verdictFor('two-couch', ''), { kind: 'unknown', text: 'Made for: 2 play couches', note: '' });
});

test('next builds fit the same set-up, leave this one out, and put the same theme first', () => {
  const castle = find('castle'), picks = nextBuilds(BUILDS, castle);
  assert.equal(picks.length, 4);
  assert.ok(picks.every(b => b.setup === 'couch-addon' && b.id !== 'castle'));
  assert.ok(picks.slice(0, 3).every(b => b.theme === 'fort'));
  assert.equal(nextBuildsNote(castle), 'These all use 1 play couch + round add-on.');
});

test('next builds stay within what the visitor owns, or the build\'s own set-up when they cannot make it', () => {
  const boat = find('speed-boat');
  const mine = nextBuilds(BUILDS, boat, 'couch-addon');
  assert.ok(mine.every(b => b.setup === 'couch'), 'same set-up comes before bigger ones');
  assert.equal(nextBuildsNote(boat, 'couch-addon'), 'Nothing extra needed. These all work with 1 play couch + round add-on.');
  assert.ok(nextBuilds(BUILDS, find('castle'), 'couch').every(b => b.setup === 'couch-addon'));
  assert.equal(nextBuilds([boat], boat).length, 0);
});

test('previous and next build wrap around the library', () => {
  const first = BUILDS[0], last = BUILDS[BUILDS.length - 1];
  assert.equal(neighbours(BUILDS, first.id).prev, last);
  assert.equal(neighbours(BUILDS, last.id).next, first);
  assert.equal(neighbours(BUILDS, BUILDS[1].id).prev, first);
});

test('a build that leans on the sofa or a wall says so in its steps, its card and its first screen', async () => {
  const { usesLabel } = await import('../js/setups.js'), { sceneOf } = await import('../js/pieces.js');
  const slide = BUILDS.find(b => b.id === 'sofa-slide'), den = BUILDS.find(b => b.id === 'wall-den'), plain = BUILDS.find(b => b.id === 'little-slide');
  assert.equal(stepsOf(slide)[0].text, 'Lay half of the base on the sofa seat and let the rest slope down to the floor.');
  assert.equal(stepsOf(den)[1].text, 'Lean the base on its long edge against the wall, with its foot on the cushion.');
  assert.deepEqual([slide, den, plain].map(usesLabel), ['Uses your sofa', 'Uses a wall', '']);
  assert.match(stepModel(stepsOf(slide), 0, 'About 5 × 3 ft of floor', slide.prop).say, /^Clear about 5 × 3 ft of floor in front of your sofa,/);
  // the sofa is drawn but is not a piece: no step, no part, and it is never faded out
  assert.equal(stepsOf(slide).length, 4);
  assert.ok(sceneOf(slide).some(s => s.role === 'prop' && s.piece === -1));
  assert.equal(sceneOf(plain).length, solidsOf(plain).length);
});

test('the first screen says who does the building', () => {
  assert.match(stepModel(stepsOf(BUILDS[0]), 0).more, /A grown-up does the building: let your kid pick the build and pass you the pieces\.$/);
});
