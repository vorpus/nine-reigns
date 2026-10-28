import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, buildData, evalCond, fillText, mulberry32, CONFIG } from '../web/js/engine.js';
import { rawData } from './fixtures/fixture.js';

function mk(extra = [], runOpts = {}, dataOpts = {}) {
  const eng = new Engine(buildData(rawData(extra, dataOpts)), { meta: { flags: {} } });
  eng.newRun({ seed: 1, ownerId: 'maya', home: 'apartment', mods: [], ...runOpts });
  return eng;
}
function start(eng) { eng.choose('right'); return eng; } // dismiss trial file

const card = (id, extra = {}) => ({ id, char: 'owner', text: id, left: { label: 'L', fx: {} }, right: { label: 'R', fx: {} }, ...extra });

test('conditions: all types', () => {
  const eng = mk([], { mods: ['dog'], home: 'house' });
  const s = eng.state;
  s.flags = { met: true, knocked: 3, zero: 0 };
  s.meters.joy = 40; s.day = 5; s.slot = 3;
  s.seen = { a: 1 };
  const ctx = { state: s, meta: { flags: { vet: true } }, rng: () => 0.1 };
  const yes = [
    { flag: 'met' }, { notFlag: 'zero' }, { notFlag: 'nope' }, { flagGte: ['knocked', 3] }, { flagLt: ['nope', 1] },
    { meter: 'joy', lt: 50 }, { meter: 'joy', gt: 30, lte: 40 }, { meter: 'joy', gte: 40 },
    { day: { gte: 3, lte: 10 } }, { day: 5 }, { day: { eq: 5 } }, { slot: ['night'] }, { slot: 'night' },
    { mod: 'dog' }, { notMod: 'allergies' }, { home: ['apartment', 'house'] }, { home: 'house' },
    { owner: 'maya' }, { quirk: 'wfh' }, { notQuirk: 'gamer' }, { mode: 'normal' },
    { seen: 'a' }, { notSeen: 'b' }, { meta: 'vet' }, { chance: 0.5 },
    { any: [{ flag: 'nope' }, { flag: 'met' }] }, { not: { flag: 'nope' } },
  ];
  for (const c of yes) assert.equal(evalCond(c, ctx), true, JSON.stringify(c));
  const no = [
    { flag: 'zero' }, { notFlag: 'met' }, { flagGte: ['knocked', 4] }, { meter: 'joy', gt: 40 },
    { day: { gte: 6 } }, { slot: ['morning'] }, { mod: 'partner' }, { notMod: 'dog' }, { home: 'studio' },
    { owner: 'albert' }, { quirk: 'gamer' }, { mode: 'chaos' }, { seen: 'b' }, { meta: 'nope' }, { chance: 0.05 },
    { any: [{ flag: 'nope' }] }, { not: { flag: 'met' } }, { won: true },
  ];
  for (const c of no) assert.equal(evalCond(c, ctx), false, JSON.stringify(c));
});

test('meta firstRun builtin', () => {
  const eng = mk([], { firstRun: true });
  assert.equal(evalCond({ meta: 'firstRun' }, eng.ctx()), true);
  const eng2 = mk([]);
  assert.equal(evalCond({ meta: 'firstRun' }, eng2.ctx()), false);
});

test('trial file comes first and does not advance time', () => {
  const eng = mk();
  assert.equal(eng.state.card, '__trial_file');
  assert.match(eng.current().text, /Mochi/);
  start(eng);
  assert.equal(eng.state.swipe, 0);
  assert.equal(eng.state.day, 1);
  assert.equal(eng.state.meters.belly, CONFIG.start.belly);
});

test('intro bag drawn first on day 1 morning, once', () => {
  const eng = start(mk());
  assert.equal(eng.state.card, 'intro_one');
  eng.choose('left');
  assert.notEqual(eng.state.card, 'intro_one');
  assert.equal(eng.state.slot, 0); // noTime
});

test('draw respects conditions, cooldown and once', () => {
  const only = [
    card('gated', { when: [{ flag: 'never' }] }),
    card('onceA', { once: true, weight: 1000 }),
    card('cd', { cooldown: 3 }),
    card('f1', { cooldown: 0, weight: 1 }), card('f2', { cooldown: 0, weight: 1 }),
  ];
  const eng = start(mk(only, {}, { noBase: true }));
  const drawn = [];
  for (let i = 0; i < 12; i++) { drawn.push(eng.state.card); eng.choose('left'); if (eng.state.over) break; }
  assert.ok(!drawn.includes('gated'));
  assert.equal(drawn.filter((x) => x === 'onceA').length, 1);
  // cd is never drawn twice within 3 swipes
  for (let i = 0; i < drawn.length; i++) if (drawn[i] === 'cd') {
    assert.ok(!drawn.slice(i + 1, i + 3).includes('cd'));
  }
});

test('weighted draw uses injected rng', () => {
  const data = buildData(rawData([card('heavy', { weight: 1000 })]));
  const eng = new Engine(data, { rng: mulberry32(7) });
  eng.newRun({ ownerId: 'maya', home: 'studio', mods: [] });
  eng.state.queue = [];
  eng.state.day = 2;
  const counts = {};
  for (let i = 0; i < 50; i++) { const d = eng.draw(); counts[d.id] = (counts[d.id] || 0) + 1; }
  assert.ok(counts.heavy > 40);
});

test('empty bags fall back without crashing', () => {
  const eng = start(mk([], {}, { noBase: true }));
  assert.equal(eng.state.card, '__filler');
  for (let i = 0; i < 10; i++) eng.choose('left');
  assert.ok(eng.current());
  eng.state.meters.instinct = 99;
  eng.choose('left');
  assert.equal(eng.state.card, '__crisis_instinct_high');
});

test('next queue has priority; branch picks first passing', () => {
  const extra = [
    card('starter', { weight: 100000, once: true, right: { label: 'go', fx: {}, next: 'chain_x' }, left: { label: 'br', next: ['nope_br', 'chain_y'] } }),
    card('nope_br', { bag: 'chain', when: [{ flag: 'never' }] }),
    card('chain_y', { bag: 'chain' }),
  ];
  let eng = start(mk(extra)); eng.choose('left'); // skip intro
  assert.equal(eng.state.card, 'starter');
  eng.choose('right');
  assert.equal(eng.state.card, 'chain_x');
  eng = start(mk(extra)); eng.choose('left');
  eng.choose('left');
  assert.equal(eng.state.card, 'chain_y');
});

test('fx clamp, drift, set increments and literals', () => {
  const extra = [card('big', { weight: 100000, left: { label: 'x', fx: { joy: 500, home: -500, instinct: -10 }, set: { knocked: '+1', butter: true, mood: 'grumpy' } } })];
  const eng = start(mk(extra)); eng.choose('left');
  assert.equal(eng.state.card, 'big');
  eng.state.flags.knocked = 2;
  const r = eng.choose('left');
  assert.equal(eng.state.meters.joy, 100);
  assert.equal(r.ending.id, 'home_generic'); // home hit 0
  assert.equal(eng.state.flags.knocked, 3);
  assert.equal(eng.state.flags.butter, true);
  assert.equal(eng.state.flags.mood, 'grumpy');
});

test('passive drift each swipe', () => {
  const eng = start(mk()); eng.choose('left');
  const { instinct, belly } = eng.state.meters;
  eng.choose('left');
  assert.equal(eng.state.meters.instinct, instinct + 2);
  assert.equal(eng.state.meters.belly, belly - 3);
});

test('placeholders substituted', () => {
  assert.equal(fillText('{cat} {owner} {partner} {dog}', { catName: 'M', owner: { name: 'O' }, partnerName: 'P', dogName: 'D' }), 'M O P D');
  const eng = start(mk()); eng.choose('left');
  assert.match(eng.current().text, /Mochi and Maya/);
  assert.equal(eng.current().character.name, 'Maya');
});

test('crisis trigger and reset to 50', () => {
  const eng = start(mk()); eng.choose('left');
  eng.state.meters.instinct = 99;
  const r = eng.choose('left');
  assert.deepEqual(r.crisis, { meter: 'instinct', dir: 'high' });
  assert.equal(eng.state.card, 'ci_high');
  eng.choose('left');
  assert.equal(eng.state.meters.instinct, 50);
  assert.equal(eng.state.cardIsCrisis, null);
  // belly low
  eng.state.meters.belly = 2;
  eng.choose('left');
  assert.equal(eng.state.card, 'cb_low');
  eng.choose('right');
  assert.equal(eng.state.meters.belly, 50);
});

test('crisis takes priority over next', () => {
  const extra = [card('starter', { weight: 100000, once: true, left: { label: 'go', next: 'chain_x' } })];
  const eng = start(mk(extra)); eng.choose('left');
  eng.state.meters.instinct = 99;
  eng.choose('left');
  assert.equal(eng.state.card, 'ci_high');
  eng.choose('left');
  assert.equal(eng.state.card, 'chain_x');
});

test('ending order: card end > joy > home', () => {
  const extra = [card('doom', { weight: 100000, left: { label: 'x', fx: { joy: -100, home: -100 }, end: 'escaped' }, right: { label: 'y', fx: { joy: -100, home: -100 } } })];
  let eng = start(mk(extra)); eng.choose('left');
  assert.equal(eng.choose('left').ending.id, 'escaped');
  assert.equal(eng.state.ending.text, 'Mochi left');
  eng = start(mk(extra)); eng.choose('left');
  assert.equal(eng.choose('right').ending.id, 'joy_generic');
  eng = start(mk(extra, { mods: ['partner'] })); eng.choose('left');
  assert.equal(eng.choose('right').ending.id, 'joy_partner');
  assert.equal(eng.state.over, true);
  assert.equal(eng.choose('left'), null);
});

test('time advance, noTime, win at day 14', () => {
  const eng = start(mk()); eng.choose('left'); // intro noTime
  assert.equal(eng.timeLabel(), 'Day 1 · Morning');
  eng.choose('left');
  assert.equal(eng.timeLabel(), 'Day 1 · Afternoon');
  let r;
  for (let i = 0; i < 200; i++) {
    eng.state.meters.joy = 95; eng.state.meters.home = 80; eng.state.meters.instinct = 50; eng.state.meters.belly = 50;
    r = eng.choose('left');
    if (r.ending) break;
  }
  assert.equal(r.ending.id, 'win_top');
  assert.equal(eng.state.swipe, 1 + 56); // intro + 56 timed swipes
  assert.equal(eng.stats().daysSurvived, 14);
});

test('trial fail and win tier fallthrough', () => {
  for (const [joy, want] of [[70, 'win_plain'], [40, 'trial_fail']]) {
    const eng = start(mk());
    eng.state.day = 14; eng.state.slot = 3; eng.state.queue = []; eng.state.card = 'a';
    eng.state.meters.joy = joy;
    assert.equal(eng.choose('left').ending.id, want);
  }
});

test('chaos mode: joy irrelevant, chaos scored, home 0 ends', () => {
  const extra = [card('smash', { weight: 100000, left: { label: 's', fx: { joy: -100, home: -30 }, chaos: 7 }, right: { label: 't', fx: { home: -10 } } })];
  const eng = start(mk(extra, { mode: 'chaos' }));
  assert.equal(eng.state.card, 'smash'); // no intro in chaos
  let r = eng.choose('left');
  assert.equal(r.ending, null);
  assert.equal(eng.state.chaos, 7);
  eng.state.card = 'smash';
  r = eng.choose('right'); // default chaos = -home fx
  assert.equal(eng.state.chaos, 17);
  eng.state.card = 'smash'; r = eng.choose('left');
  assert.equal(r.ending.id, 'chaos_home');
  assert.ok(eng.state.chaos > 24); // demolition bonus
  assert.equal(eng.preview('left').joy, undefined);
});

test('chaos mode time ending', () => {
  const eng = start(mk([], { mode: 'chaos' }));
  eng.state.day = 14; eng.state.slot = 3; eng.state.card = 'a';
  assert.equal(eng.choose('left').ending.id, 'chaos_time');
});

test('preview dots sizes', () => {
  const extra = [card('p', { weight: 100000, left: { label: 'x', fx: { joy: 5, home: -10, instinct: 0 } } })];
  const eng = start(mk(extra)); eng.choose('left');
  assert.deepEqual(eng.preview('left'), { joy: 'small', home: 'big' });
});

test('achievements complete during and at end of run', () => {
  const extra = [card('k', { weight: 100000, left: { label: 'x', set: { knocked: '+1' } } })];
  const eng = start(mk(extra)); eng.choose('left');
  assert.deepEqual(eng.state.activeAch.sort(), ['knock3', 'winner']);
  let got = [];
  for (let i = 0; i < 3; i++) eng.state.card = 'k', got = got.concat(eng.choose('left').achievements.map((a) => a.id));
  assert.deepEqual(got, ['knock3']);
  eng.state.day = 14; eng.state.slot = 3; eng.state.meters.joy = 80;
  const r = eng.choose('right');
  assert.equal(r.ending.kind, 'win');
  assert.deepEqual(r.achievements.map((a) => a.id), ['winner']);
});

test('save/load round trip is deterministic', () => {
  const a = start(mk()); for (let i = 0; i < 5; i++) a.choose('left');
  const snap = JSON.parse(JSON.stringify(a.state));
  const b = new Engine(a.data); b.load(JSON.parse(JSON.stringify(snap)));
  for (let i = 0; i < 10; i++) { a.choose('right'); b.choose('right'); }
  assert.deepEqual(a.state, b.state);
});

test('allergies sneeze on snuggles', () => {
  const extra = [card('sn', { weight: 100000, left: { label: 'x', set: { snuggles: '+1' } } })];
  let sneezes = 0;
  for (let seed = 0; seed < 20; seed++) {
    const eng = new Engine(buildData(rawData(extra)));
    eng.newRun({ seed, ownerId: 'maya', home: 'studio', mods: ['allergies'] });
    eng.choose('left'); eng.choose('left');
    if (eng.choose('left').events.includes('sneeze')) sneezes++;
  }
  assert.ok(sneezes > 0 && sneezes < 20);
});
