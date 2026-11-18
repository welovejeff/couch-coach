import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPrefs } from '../js/prefs.js';

const memory = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) }; };

test('a stored colour is read back', () => {
  const p = createPrefs(memory());
  p.set('nug', '#112233');
  assert.equal(p.get('nug'), '#112233');
  assert.equal(p.colors().nug, '#112233');
});

test('a blocked store falls back to the default colours', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const p = createPrefs(blocked);
  p.set('nug', '#112233');
  assert.deepEqual(p.colors(), { nug: '#3f86d6', nug2: '#3f86d6', chk: '#f4b63a' });
});

test('the second couch colour defaults to the first, then keeps its own', () => {
  const p = createPrefs(memory());
  p.set('nug', '#112233');
  assert.equal(p.colors().nug2, '#112233');
  p.set('nug2', '#445566');
  assert.equal(p.colors().nug2, '#445566');
});

test('values are stored under the cc- prefix', () => {
  const store = memory(), p = createPrefs(store);
  p.set('kid', 'Max');
  assert.equal(store.getItem('cc-kid'), 'Max');
});
