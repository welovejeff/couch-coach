import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { OWNED } from '../js/setups.js';
import { createPrefs, SWATCHES, DEFAULTS, colorName } from '../js/prefs.js';
import { barModel, buildCount, ELSE } from '../js/setup-bar.js';

const prefsWith = values => { const m = new Map(Object.entries(values).map(([k, v]) => ['cc-' + k, v])); return createPrefs({ getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) }); };

test('with nothing chosen the bar asks, and says every build is showing', () => {
  const m = barModel(prefsWith({}));
  assert.equal(m.chosen, false);
  assert.equal(m.action, 'Choose');
  assert.ok(m.note.includes(String(BUILDS.length)));
});

test('the bar shows one colour dot per thing the family owns', () => {
  assert.equal(barModel(prefsWith({ setup: 'couch' })).dots.length, 1);
  assert.equal(barModel(prefsWith({ setup: 'couch-addon' })).dots.length, 2);
  assert.deepEqual(barModel(prefsWith({ setup: 'two-couch-addon', nug: '#111111', nug2: '#222222', chk: '#333333' })).dots, ['#111111', '#222222', '#333333']);
  assert.equal(barModel(prefsWith({ setup: 'two-couch' })).title, '2 couches');
});

test('each owned set-up opens 17, 29, 29 and 41 builds', () => {
  assert.deepEqual(['couch', 'couch-addon', 'two-couch', 'two-couch-addon'].map(buildCount), [17, 29, 29, 41]);
});

test('every "something else" choice falls back to a real set-up or to everything', () => {
  for (const v of Object.values(ELSE)) assert.ok(v.closest === '' || OWNED[v.closest]);
});

test('the default colours are named swatches, and unknown colours are called Custom', () => {
  assert.equal(colorName(DEFAULTS.nug), 'Blue');
  assert.equal(colorName(DEFAULTS.chk), 'Sage');
  assert.equal(colorName('#123456'), 'Custom');
  assert.equal(new Set(SWATCHES.map(s => s[1])).size, SWATCHES.length);
});
