import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kidNames, nameFields, joinNames, nameList, owners, MAX_KIDS } from '../js/names.js';
import { sheetTitle, titlePt } from '../js/sheet.js';
import { sheetName } from '../js/tracker.js';

test('one, two and three children read naturally', () => {
  assert.equal(owners('Max'), 'Max’s');
  assert.equal(owners('Cole,Thomas'), 'Cole and Thomas’s');
  assert.equal(owners('Cole, Thomas ,Ada'), 'Cole, Thomas and Ada’s');
  assert.equal(nameList('Cole,Thomas'), 'Cole and Thomas');
  assert.equal(owners(''), '');
  assert.equal(owners(' , '), '');
});

test('empty fields are kept for the editor and dropped from what is printed', () => {
  assert.deepEqual(nameFields('Cole,,Thomas'), ['Cole', '', 'Thomas']);
  assert.deepEqual(kidNames('Cole,,Thomas'), ['Cole', 'Thomas']);
  assert.deepEqual(nameFields(''), ['']);
  assert.equal(nameFields('a,b,c,d,e,f').length, MAX_KIDS);
  assert.equal(joinNames(['Co,le', 'Thomas']), 'Co le,Thomas');
});

test('the sheet title and the tracker name every child', () => {
  assert.equal(sheetTitle('Cole,Thomas', 0), 'Cole and Thomas’s couch builds');
  assert.equal(sheetTitle('Cole,Thomas', 1), 'More of Cole and Thomas’s builds');
  assert.ok(titlePt(sheetTitle('Cole,Thomas,Charlotte', 1)) < titlePt(sheetTitle('Max', 1)));
  assert.equal(sheetName('Cole,Thomas'), 'Cole and Thomas’s sheet');
  assert.equal(sheetName(''), 'Your sheet');
});
