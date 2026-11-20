import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS } from '../js/builds.js';
import { OWNED_IDS, fits } from '../js/setups.js';
import { candidates, suggest, add, isFull } from '../js/sheet-state.js';
import { cardModel, cardHtml, buildHref } from '../js/card.js';
import { COPY } from '../js/brand.js';
import { headline, gallerySections, parkedTitle, countLine, seenBuild, seenHtml, listHtml, CAN_TITLE } from '../js/gallery.js';

const ids = list => list.map(b => b.id);
const keepAll = sheet => sheet.ids.reduce((s, id) => add(s, id), sheet);

test('the headline counts the library', () => {
  assert.equal(headline(BUILDS), '41 build ideas for your play couch');
  assert.equal(headline(BUILDS.slice(0, 1)), '1 build idea for your play couch');
});

test('nothing chosen: every build, in three sections by set-up, smallest first', () => {
  const m = gallerySections(BUILDS, {});
  assert.equal(m.chosen, false);
  assert.deepEqual(m.sections.map(s => s.title), ['1 play couch', '1 play couch + round add-on', '2 play couches']);
  assert.deepEqual(m.sections.map(s => s.builds.length), [17, 12, 12]);
  assert.equal(m.sections[0].note, 'Everyone can make these');
  assert.ok(m.sections.every(s => s.builds.every(b => b.setup === s.key)));
  assert.equal(m.count, BUILDS.length);
  assert.deepEqual(m.parked, []);
});

test('nothing chosen: each section mixes the themes instead of running one kind in a row', () => {
  for (const s of gallerySections(BUILDS, {}).sections) assert.equal(new Set(s.builds.slice(0, 3).map(b => b.theme)).size, 3, s.title);
});

test('a chosen set-up splits into builds the family can make and parked ones', () => {
  const expected = {
    'couch': [17, ['12 more builds need the round add-on', '12 more builds need a second play couch']],
    'couch-addon': [29, ['12 more builds need a second play couch']],
    'two-couch': [29, ['12 more builds need the round add-on']],
    'two-couch-addon': [41, []],
  };
  assert.deepEqual(Object.keys(expected), OWNED_IDS);
  for (const owned of OWNED_IDS) {
    const m = gallerySections(BUILDS, { owned }), [can, parked] = expected[owned];
    assert.equal(m.chosen, true);
    assert.equal(m.sections.length, 1);
    assert.equal(m.sections[0].title, CAN_TITLE);
    assert.equal(m.sections[0].builds.length, can, owned);
    assert.equal(m.count, can);
    assert.ok(m.sections[0].builds.every(b => fits(b.setup, owned)));
    assert.deepEqual(m.parked.map(p => p.title), parked, owned);
    assert.ok(m.parked.every(p => p.builds.every(b => !fits(b.setup, owned))));
    // nothing is lost and nothing shows twice
    assert.equal(new Set([...ids(m.sections[0].builds), ...m.parked.flatMap(p => ids(p.builds))]).size, BUILDS.length);
  }
});

test('the can-make section keeps the order the sheet suggests: builds that use everything owned first', () => {
  for (const owned of OWNED_IDS) assert.deepEqual(ids(gallerySections(BUILDS, { owned }).sections[0].builds), ids(candidates(BUILDS, owned)));
  assert.ok(gallerySections(BUILDS, { owned: 'couch-addon' }).sections[0].builds.slice(0, 12).every(b => b.setup === 'couch-addon'));
});

test('parked rows say what is missing and never repeat a group', () => {
  assert.equal(parkedTitle(1, ['round add-on']), '1 more build needs the round add-on');
  assert.equal(parkedTitle(3, ['round add-on', '2 couches']), '3 more builds need the round add-on and a second play couch');
  const keys = gallerySections(BUILDS, { owned: 'couch' }).parked.map(p => p.key);
  assert.deepEqual(keys, ['Needs round add-on', 'Needs 2 couches']);
});

test('the theme filter narrows every section and every parked row', () => {
  const none = gallerySections(BUILDS, { theme: 'fort' });
  assert.equal(none.sections.length, 3);
  assert.equal(none.count, BUILDS.filter(b => b.theme === 'fort').length);
  assert.ok(none.sections.every(s => s.builds.every(b => b.theme === 'fort')));

  const chosen = gallerySections(BUILDS, { owned: 'couch', theme: 'go' });
  assert.ok(chosen.count > 0 && chosen.count < 12);
  assert.ok(chosen.sections[0].builds.every(b => b.theme === 'go' && b.setup === 'couch'));
  assert.ok(chosen.parked.length > 0);
  assert.ok(chosen.parked.every(p => p.builds.every(b => b.theme === 'go')));
  assert.match(chosen.parked[0].title, /^\d+ more builds? needs? /);
});

test('a theme that matches nothing leaves no sections with nothing chosen, and an empty can-make section otherwise', () => {
  const onlyForts = BUILDS.filter(b => b.theme === 'fort');
  const none = gallerySections(onlyForts, { theme: 'go' });
  assert.deepEqual(none.sections, []);
  assert.equal(none.count, 0);
  const chosen = gallerySections(onlyForts, { owned: 'couch', theme: 'go' });
  assert.equal(chosen.count, 0);
  assert.deepEqual(chosen.sections[0].builds, []);
  for (const m of [none, chosen]) assert.match(listHtml(m, { owned: m.chosen ? 'couch' : '', theme: 'go' }), /data-act="all-themes"[^>]*>Show everything</);
});

test('the count line', () => {
  assert.equal(countLine(36), '36 builds');
  assert.equal(countLine(1), '1 build');
  assert.equal(countLine(12, 'couch'), '12 builds you can make with 1 couch');
  assert.equal(countLine(24, 'couch-addon'), '24 builds you can make with 1 couch + add-on');
  assert.equal(countLine(1, 'two-couch-addon'), '1 build you can make with 2 couches + add-on');
  assert.equal(countLine(36, 'not-a-set-up'), '36 builds');
});

test('the build a video link names, and nothing for an unknown or missing id', () => {
  assert.equal(seenBuild(BUILDS, 'race-car').name, 'Race Car');
  assert.equal(seenBuild(BUILDS, 'no-such-build'), null);
  assert.equal(seenBuild(BUILDS, null), null);
  assert.equal(seenBuild(BUILDS, ''), null);
});

test('the "From the video" card links to the build page and keeps the untested label', () => {
  const html = seenHtml(seenBuild(BUILDS, 'race-car'), 'couch');
  assert.match(html, /From the video/);
  assert.match(html, /href="build\.html\?b=race-car">See how to build it</);
  assert.match(html, /Not yet kid-tested/);
  assert.match(html, /Needs round add-on/);
  assert.doesNotMatch(seenHtml(seenBuild(BUILDS, 'race-car'), 'couch-addon'), /Needs/);
});

test("each card links to its own build's page and carries the untested label", () => {
  for (const b of BUILDS) {
    assert.equal(cardModel(b).href, `build.html?b=${b.id}`);
    assert.ok(cardHtml(b).includes(`href="build.html?b=${b.id}"`));
  }
  assert.equal(buildHref({ id: 'race-car' }), 'build.html?b=race-car');
  assert.equal(cardModel({ ...BUILDS[0], tested: false }).label, 'Not yet kid-tested');
  assert.equal(cardModel({ ...BUILDS[0], tested: false }).label, COPY.untested);
  assert.equal(cardModel({ ...BUILDS[0], tested: true }).label, '');
  assert.ok(cardHtml({ ...BUILDS[0], tested: false }).includes('Not yet kid-tested'));
});

test('cards offer "Add to sheet" only when there is a sheet, and never on parked builds', () => {
  const count = html => html.split('data-add=').length - 1;
  assert.equal(count(listHtml(gallerySections(BUILDS, {}), {})), 0);
  const owned = 'couch', sheet = add(suggest(BUILDS, owned), suggest(BUILDS, owned).ids[0]);
  const closed = listHtml(gallerySections(BUILDS, { owned }), { owned, sheet });
  assert.equal(count(closed), 17);
  assert.equal(closed.split('aria-pressed="true"').length - 1, 1);
  assert.equal(closed.split('class="card ').length - 1, 41);
  assert.doesNotMatch(closed, /<details[^>]* open/);
  const open = listHtml(gallerySections(BUILDS, { owned }), { owned, sheet, openRows: new Set(['Needs 2 couches']) });
  assert.equal(open.split(/<details[^>]* open/).length - 1, 1);
});
