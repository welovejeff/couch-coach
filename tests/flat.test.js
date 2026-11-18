import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { drawBuild, palette, sortedTiles, roleHex } from '../js/flat.js';
import { baseFlat, second } from '../js/pieces.js';

const pal = palette({ nug: '#3f86d6', nug2: '', chk: '#f4b63a' });

test('every build depth-sorts with no unresolved ordering cycle', () => {
  for (const b of BUILDS) {
    const { tiles, cycles } = sortedTiles(b);
    assert.ok(tiles.length > 0, b.id);
    assert.equal(cycles, 0, b.id);
  }
});

test('drawings keep emoji out of SVG text elements', () => {
  for (const b of BUILDS) {
    const svg = drawBuild(b, pal);
    assert.ok(svg.startsWith('<svg'), b.id);
    assert.ok(!/<text[\s>]/.test(svg), `${b.id} has an SVG text element`);
  }
  const withSticker = BUILDS.find(b => b.stickers.length);
  assert.ok(drawBuild(withSticker, pal).includes('<foreignObject'));
});

test('the second couch is drawn in its own colour when one is set', () => {
  const two = palette({ nug: '#3f86d6', nug2: '#d6403f', chk: '#f4b63a' });
  assert.equal(roleHex(two, 'base'), '#3f86d6');
  assert.equal(roleHex(two, 'base2'), '#d6403f');
  const twoCouches = { name: 't', pieces: [baseFlat(0, 0, 0, 'x'), second(baseFlat(0, 40, 0, 'x'))] };
  assert.notEqual(drawBuild(twoCouches, two), drawBuild(twoCouches, pal));
});

test('with no second colour the second couch takes the first couch colour', () => {
  assert.equal(roleHex(pal, 'base2'), roleHex(pal, 'base'));
});
