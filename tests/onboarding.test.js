import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine, buildData } from '../web/js/engine.js';
import { prepareRun, tutorialEntry, ordinal, tagNumber, lifeLabel, runEpithet } from '../web/js/onboarding.js';

// Real game data: the tutorial is content, so test it as shipped.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, 'web/data', p), 'utf8'));
const index = read('cards/index.json');
const raw = {
  cards: index.files.flatMap((f) => read(`cards/${f}`).cards),
  characters: read('characters.json'), owners: read('owners.json'),
  endings: read('endings.json'), achievements: read('achievements.json'),
};
const data = buildData(raw);

function run(runs, mode = 'normal') {
  const eng = new Engine(data, { meta: { flags: {} } });
  eng.newRun({ seed: 7, mode, mods: [], firstRun: runs === 0, firstWin: true });
  prepareRun(eng, { runs });
  eng.choose('right'); // trial file
  return eng;
}

// Swipe through the deck, always right, collecting card ids.
function ids(eng, n) {
  const out = [eng.state.card];
  for (let i = 1; i < n && !eng.state.over; i++) { eng.choose('right'); out.push(eng.state.card); }
  return out;
}

test('first run opens on the Instinct tutorial with dimmed meters and one goal', () => {
  const eng = run(0);
  const seq = ids(eng, 10);
  assert.deepEqual(seq, ['tut_new_cat', 'tut_cage_nine', 'tut_all_mad', 'tut_balance', 'tut_voice_quiet',
    'tut_volunteer', 'tut_memory_foam', 'tut_gerald', 'tut_one_scoop', 'tut_glass']);
  const c = data.cards;
  assert.ok(c.tut_new_cat.ui.hint && c.tut_new_cat.ui.dim);
  assert.ok(!c.tut_volunteer.ui, 'meters light on the volunteer card');
  assert.deepEqual(eng.state.activeAch, ['kitten']);
  assert.equal(eng.state.profile.catNo, 1);
});

test('tutorial does not advance time until the volunteer card', () => {
  const eng = run(0);
  for (let i = 0; i < 5; i++) eng.choose('left');
  assert.equal(eng.state.card, 'tut_volunteer');
  assert.equal(eng.state.day, 1);
  assert.equal(eng.state.slot, 0);
  eng.choose('left');
  assert.equal(eng.state.slot, 1);
});

test('kitten goal completes on Day 2 and gives the epithet', () => {
  const eng = run(0);
  let got = [];
  while (eng.state.day < 2 && !eng.state.over) got = got.concat(eng.choose('left').achievements);
  assert.deepEqual(got.map((a) => a.id), ['kitten']);
  assert.equal(runEpithet(eng.state, data.achievements), 'the Kitten');
});

test('second cat gets the curse beat, third cat gets no tutorial', () => {
  const two = run(1);
  assert.deepEqual(ids(two, 6), ['tut_curse_new_cat', 'tut_curse_kidding', 'tut_curse_remember',
    'tut_curse_red_dot', 'tut_curse_maybe', 'tut_curse_curls_up']);
  assert.equal(two.state.activeAch.length, 3);
  assert.equal(two.state.profile.catNo, 2);
  const three = run(2);
  assert.equal(tutorialEntry(three), null);
  assert.ok(!three.state.card.startsWith('tut_'));
  const chaos = run(1, 'chaos');
  assert.ok(!chaos.state.card.startsWith('tut_'));
});

test('dynasty labels', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 102].map(ordinal),
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '102nd']);
  assert.equal(tagNumber(1), 603);
  assert.equal(tagNumber(2), 604);
  assert.equal(lifeLabel(2), 'Life 2 of 9');
  assert.equal(lifeLabel(10), 'Extra life');
});
