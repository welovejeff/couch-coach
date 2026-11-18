import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { sheetBuilds, sheetPages, sheetSetup, sheetHtml, footerLine, colorControls } from '../js/sheet.js';
import { palette } from '../js/flat.js';

const pal = palette({ nug: '#3f86d6', nug2: '', chk: '#f4b63a' });
const html = setupId => sheetHtml(sheetBuilds(BUILDS, setupId), { kid: '', pal, setupId });

test('with two couches chosen the 12 cards are all two-couch builds', () => {
  const list = sheetBuilds(BUILDS, 'two-couch');
  assert.equal(list.length, 12);
  assert.ok(list.every(b => b.setup === 'two-couch'));
});

test('with no set-up stored the sheet defaults to one couch plus the round add-on', () => {
  assert.equal(sheetSetup(''), 'couch-addon');
  assert.equal(sheetSetup('nonsense'), 'couch-addon');
  assert.equal(sheetSetup('couch'), 'couch');
});

test('an untested build carries the label on its printed card', () => {
  assert.ok(html('couch').includes('Not yet kid-tested'));
  const tested = BUILDS.filter(b => b.setup === 'couch').map(b => ({ ...b, tested: true }));
  assert.ok(!sheetHtml(tested, { kid: '', pal, setupId: 'couch' }).includes('Not yet kid-tested'));
});

test('the 12 builds split six to a page in library order', () => {
  const list = sheetBuilds(BUILDS, 'couch-addon'), pages = sheetPages(list);
  assert.deepEqual(pages.map(p => p.length), [6, 6]);
  assert.deepEqual([...pages[0], ...pages[1]].map(b => b.id), list.map(b => b.id));
});

test('with two couches the footer names two play couches and no round add-on', () => {
  assert.equal(footerLine('two-couch'), '2 play couches');
  const out = html('two-couch');
  assert.ok(out.includes('2 play couches'));
  assert.ok(!out.includes('round add-on'));
});

test('no sheet text uses a brand name', () => {
  for (const setup of ['couch', 'couch-addon', 'two-couch']) assert.ok(!/nugget|chunk/i.test(html(setup).replace(/<svg[\s\S]*?<\/svg>/g, '')), setup);
});

test('colour controls follow the set-up', () => {
  assert.deepEqual(colorControls('two-couch'), { nug2: true, chk: false });
  assert.deepEqual(colorControls('couch-addon'), { nug2: false, chk: true });
  assert.deepEqual(colorControls('couch'), { nug2: false, chk: false });
});
