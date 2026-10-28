#!/usr/bin/env node
// Headless balance simulator.
// Usage: node tools/sim.js [--runs 2000] [--strategy random|greedy|smart|all] [--mods 0-2|random|allergies,dog]
//                          [--mode normal|chaos] [--seed 1] [--top 10] [--matrix] [--json]
//
// Strategies (what each one is allowed to know):
//   random  coin flip every card.
//   greedy  "greedy-joy": reads the true fx of both sides and takes whichever leaves Joy highest
//           (ties: coin flip). Ignores every other meter. Chaos Mode: most chaos points.
//   smart   a sensible human. Knows only what the screen shows: meter fills (read +-5), the
//           preview dots (which meters move, small < 10 or big >= 10, read as 5 and 12) and the
//           card text. Direction is guessed from the text: right 80% of the time (a wrong guess
//           sticks for that card side and meter for the whole run). Picks 10% of cards on a whim.
//           Doesn't know which choices end the run. Keeps Joy and Home healthy and steers
//           Instinct/Belly away from 0/100. Env overrides: SIM_GUESS, SIM_WHIM, SIM_NOISE.
//   oracle  the same heuristic with perfect knowledge of the true fx and card endings (an upper
//           bound, reported for reference only).
//
// --matrix prints one compact table: every strategy x mods (random, 0, allergies, partner, dog, 2)
// plus Chaos Mode.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Engine, buildData, mulberry32, METERS, MODS as ALL_MODS, CONFIG, crisisResetValue } from '../web/js/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'web', 'data');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}
const flag = (name) => process.argv.includes(`--${name}`);

function readJSON(rel) {
  const p = join(dataDir, rel);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { console.warn(`skip ${rel}: ${e.message}`); return null; }
}

export function loadDataFromDisk() {
  const index = readJSON('cards/index.json') || { files: [] };
  const cards = [];
  for (const f of index.files || []) {
    const d = readJSON(`cards/${f}`);
    const list = Array.isArray(d) ? d : d && d.cards;
    if (Array.isArray(list)) cards.push(...list);
  }
  return buildData({
    cards,
    characters: readJSON('characters.json'),
    owners: readJSON('owners.json'),
    endings: readJSON('endings.json'),
    achievements: readJSON('achievements.json'),
  });
}

// ---------- strategies ----------
const clampM = (v) => Math.max(0, Math.min(100, v));
const GUESS_RIGHT = Number(process.env.SIM_GUESS || 0.8); // direction guessed right from the text
const WHIM = Number(process.env.SIM_WHIM || 0.1); // share of cards picked for the joke, not the meters
const FILL_NOISE = Number(process.env.SIM_NOISE || 5); // reading a fill bar: +-5 points

// fx as a strategy sees it. perfect: true numbers. Otherwise: dots + a direction guess.
function seenFx(eng, side, rng, perfect) {
  const card = eng.getCard(eng.state.card);
  const ch = card[side] || {};
  const out = {};
  for (const k of METERS) {
    const d = (ch.fx && ch.fx[k]) || 0;
    if (!d) continue;
    if (perfect) { out[k] = d; continue; }
    const key = `${card.id}:${side}:${k}`;
    const g = eng._guess || (eng._guess = {});
    if (g[key] == null) g[key] = rng() < GUESS_RIGHT ? 1 : -1;
    out[k] = Math.sign(d) * g[key] * (Math.abs(d) >= CONFIG.bigDot ? 12 : 5);
  }
  return { fx: out, ch, end: perfect ? !!ch.end : false };
}

function project(eng, side, rng, perfect = true, base = eng.state.meters) {
  const { fx, ch, end } = seenFx(eng, side, rng, perfect);
  const m = { ...base };
  for (const k of METERS) m[k] = clampM(m[k] + (fx[k] || 0));
  for (const [k, d] of Object.entries(CONFIG.drift)) m[k] = clampM(m[k] + d);
  if (eng.state.cardIsCrisis) m[eng.state.cardIsCrisis.meter] = crisisResetValue(eng.state.cardIsCrisis);
  return { m, ch, fx, end };
}

const chaosPts = (ch) => (ch.chaos != null ? ch.chaos : Math.max(0, -((ch.fx && ch.fx.home) || 0)));
const coin = (rng) => (rng() < 0.5 ? 'left' : 'right');
const argmax = (l, r, rng) => (l === r ? coin(rng) : l > r ? 'left' : 'right');

function sensible(perfect) {
  return (eng, rng) => {
    if (!perfect && WHIM && rng() < WHIM) return coin(rng);
    const base = { ...eng.state.meters };
    if (!perfect) for (const k of METERS) base[k] = clampM(base[k] + Math.round((rng() * 2 - 1) * FILL_NOISE));
    const score = (side) => {
      const { m, ch, fx, end } = project(eng, side, rng, perfect, base);
      if (eng.state.mode === 'chaos') return (perfect ? chaosPts(ch) : Math.max(0, -(fx.home || 0))) + rng() * 0.01;
      if (end || m.joy <= 0 || m.home <= 0) return -1000 + rng();
      // Concave in Joy and Home, so the lower one gets the attention; mind the win line late on.
      let s = 12 * Math.sqrt(m.joy) + 12 * Math.sqrt(m.home);
      if (eng.state.day >= 10 && m.joy < CONFIG.winJoy + 5) s -= (CONFIG.winJoy + 5 - m.joy) * 0.5;
      for (const k of ['instinct', 'belly']) {
        const d = Math.abs(m[k] - 50);
        if (d > 30) s -= (d - 30) * 2;
      }
      return s + rng() * 0.01;
    };
    return score('left') >= score('right') ? 'left' : 'right';
  };
}

export const strategies = {
  random: (eng, rng) => coin(rng),
  greedy: (eng, rng) => {
    if (eng.state.mode === 'chaos') return argmax(chaosPts(project(eng, 'left', rng).ch), chaosPts(project(eng, 'right', rng).ch), rng);
    return argmax(project(eng, 'left', rng).m.joy, project(eng, 'right', rng).m.joy, rng);
  },
  smart: sensible(false),
  oracle: sensible(true),
};

// mods: 'random' (0-2 random), a number 0-3, or a list of mod names
function resolveMods(mods, rng) {
  if (mods === 'random') return { modCount: Math.floor(rng() * 3) };
  if (Array.isArray(mods)) return { mods };
  if (/^\d$/.test(String(mods))) return { modCount: Number(mods) };
  return { mods: String(mods).split(',').filter((m) => ALL_MODS.includes(m)) };
}

export function runOne(data, strat, seed, { mods = 'random', mode = 'normal' } = {}) {
  const rng = mulberry32(seed * 7919 + 13);
  const eng = new Engine(data, { meta: { flags: {} } });
  eng.newRun({ seed, mode, ...resolveMods(mods, rng) });
  eng.choose('right'); // trial file
  const drawn = [];
  const crisisBags = {};
  let crises = 0;
  let guard = 0;
  while (!eng.state.over && guard++ < 500) {
    drawn.push(eng.state.card);
    const res = eng.choose(strategies[strat](eng, rng));
    if (res.crisis) { crises++; const b = `${res.crisis.meter}_${res.crisis.dir}`; crisisBags[b] = (crisisBags[b] || 0) + 1; }
  }
  return { state: eng.state, drawn, crises, crisisBags, mods: eng.state.profile.mods };
}

// Ending family: win | joy0 | home0 | trial | card | chaos
export function endingFamily(data, id) {
  const e = data.endingById[id];
  if (!e) return id.startsWith('__end_') ? ({ __end_joy: 'joy0', __end_home: 'home0', __end_trial: 'trial', __end_win: 'win' }[id] || 'card') : 'card';
  if (e.kind === 'win') return 'win';
  if (e.kind === 'chaos') return 'chaos';
  const t = e.trigger;
  if (!t) return 'card';
  if (t.meter === 'joy') return 'joy0';
  if (t.meter === 'home') return 'home0';
  if (t.trialFail) return 'trial';
  return 'card';
}

const quant = (arr, q) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };

export function simulate(data, strat, { runs = 2000, seed = 1, mods = 'random', mode = 'normal' } = {}) {
  const endings = {}, families = {}, drawCounts = {}, crisisRuns = {};
  let wins = 0, swipes = 0, days = 0, crises = 0, runsWithCrisis = 0;
  const chaosScores = [];
  const winsByMods = [0, 0, 0, 0], runsByMods = [0, 0, 0, 0];
  for (let i = 0; i < runs; i++) {
    const r = runOne(data, strat, seed + i, { mods, mode });
    const e = r.state.ending || { id: '(none)', kind: '?' };
    endings[e.id] = (endings[e.id] || 0) + 1;
    const fam = endingFamily(data, e.id);
    families[fam] = (families[fam] || 0) + 1;
    if (e.kind === 'win') { wins++; winsByMods[r.mods.length]++; }
    runsByMods[r.mods.length]++;
    swipes += r.state.swipe;
    days += r.state.trialCompleted ? 14 : r.state.day - 1 + r.state.slot / 4;
    crises += r.crises;
    if (r.crises) runsWithCrisis++;
    for (const b of Object.keys(r.crisisBags)) crisisRuns[b] = (crisisRuns[b] || 0) + 1;
    chaosScores.push(r.state.chaos);
    for (const id of r.drawn) drawCounts[id] = (drawCounts[id] || 0) + 1;
  }
  return {
    strat, runs, mode, mods, wins, winRate: wins / runs, avgSwipes: swipes / runs, avgDays: days / runs,
    crisesPerRun: crises / runs, runsWithCrisis, crisisRuns, endings, families, drawCounts, winsByMods, runsByMods,
    chaos: { avg: chaosScores.reduce((a, b) => a + b, 0) / runs, p25: quant(chaosScores, 0.25), median: quant(chaosScores, 0.5), p75: quant(chaosScores, 0.75) },
  };
}

function pct(n, d) { return d ? `${((100 * n) / d).toFixed(1)}%` : '-'; }
const BAGS4 = ['instinct_high', 'instinct_low', 'belly_high', 'belly_low'];
const FAMS = ['joy0', 'home0', 'trial', 'card'];

function printReport(r, top) {
  const R = r.runs;
  console.log(`\n=== strategy: ${r.strat} · ${R} runs · mode ${r.mode} · mods ${r.mods} ===`);
  if (r.mode === 'chaos') console.log(`chaos score       avg ${r.chaos.avg.toFixed(1)} · p25 ${r.chaos.p25} · median ${r.chaos.median} · p75 ${r.chaos.p75}`);
  else console.log(`win rate          ${pct(r.wins, R)}   (by complications: ${r.runsByMods.slice(0, 4).map((n, k) => (n ? `${k}:${pct(r.winsByMods[k], n)}` : null)).filter(Boolean).join(' ')})`);
  console.log(`avg run length    ${r.avgSwipes.toFixed(1)} swipes, ${r.avgDays.toFixed(1)} days`);
  console.log(`crises            ${r.crisesPerRun.toFixed(2)} per run, ${pct(r.runsWithCrisis, R)} of runs have one`);
  console.log(`crisis bags       ${BAGS4.map((b) => `${b} ${pct(r.crisisRuns[b] || 0, R)}`).join(' · ')}  (share of runs)`);
  if (r.mode !== 'chaos') {
    const losses = R - r.wins;
    console.log(`loss causes       ${FAMS.map((f) => `${f} ${pct(r.families[f] || 0, losses)}`).join(' · ')}  (share of losses)`);
  }
  console.log('endings:');
  for (const [id, n] of Object.entries(r.endings).sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(28)} ${String(n).padStart(6)}  ${pct(n, R)}`);
  const sorted = Object.entries(r.drawCounts).sort((a, b) => b[1] - a[1]);
  console.log(`most drawn:  ${sorted.slice(0, top).map(([id, n]) => `${id}(${n})`).join(', ')}`);
  console.log(`least drawn: ${sorted.slice(-top).reverse().map(([id, n]) => `${id}(${n})`).join(', ')}`);
}

function matrix(data, runs, seed) {
  const modsList = ['random', '0', 'allergies', 'partner', 'dog', '2'];
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\n${pad('strategy', 8)} ${pad('mods', 10)} ${pad('win', 6)} ${pad('swipes', 6)} ${pad('crisis/run', 10)} ` +
    `${BAGS4.map((b) => pad(b.replace('instinct', 'inst'), 10)).join(' ')}  loss: ${FAMS.map((f) => pad(f, 6)).join(' ')}`);
  const ever = new Set();
  for (const strat of Object.keys(strategies)) {
    for (const mods of modsList) {
      const r = simulate(data, strat, { runs, seed, mods });
      for (const id of Object.keys(r.drawCounts)) ever.add(id);
      const losses = runs - r.wins;
      console.log(`${pad(strat, 8)} ${pad(mods, 10)} ${pad(pct(r.wins, runs), 6)} ${pad(r.avgSwipes.toFixed(1), 6)} ${pad(r.crisesPerRun.toFixed(2), 10)} ` +
        `${BAGS4.map((b) => pad(pct(r.crisisRuns[b] || 0, runs), 10)).join(' ')}        ${FAMS.map((f) => pad(pct(r.families[f] || 0, losses), 6)).join(' ')}`);
    }
  }
  console.log('\nChaos Mode (mods random):');
  for (const strat of Object.keys(strategies)) {
    const r = simulate(data, strat, { runs, seed, mode: 'chaos' });
    for (const id of Object.keys(r.drawCounts)) ever.add(id);
    const ends = Object.entries(r.endings).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${pct(n, runs)}`).join(', ');
    console.log(`${pad(strat, 8)} score avg ${r.chaos.avg.toFixed(0)} p25 ${r.chaos.p25} median ${r.chaos.median} p75 ${r.chaos.p75} · swipes ${r.avgSwipes.toFixed(1)} · ${ends}`);
  }
  return ever;
}

function main() {
  const RUNS = Number(arg('runs', 2000));
  const STRAT = arg('strategy', 'all');
  const MODS = arg('mods', 'random');
  const MODE = arg('mode', 'normal');
  const SEED = Number(arg('seed', 1));
  const TOP = Number(arg('top', 10));
  const data = loadDataFromDisk();
  const userCards = Object.keys(data.cards).filter((id) => !id.startsWith('__'));
  console.log(`Loaded ${userCards.length} cards, ${data.endings.length} endings, ${data.owners.owners.length} owners.`);
  let ever = new Set();
  if (flag('matrix')) {
    ever = matrix(data, RUNS, SEED);
  } else {
    const list = STRAT === 'all' ? Object.keys(strategies) : [STRAT];
    const out = [];
    for (const s of list) {
      if (!strategies[s]) { console.error(`unknown strategy ${s}`); process.exit(2); }
      const r = simulate(data, s, { runs: RUNS, seed: SEED, mods: MODS, mode: MODE });
      out.push(r);
      for (const id of Object.keys(r.drawCounts)) ever.add(id);
      if (!flag('json')) printReport(r, TOP);
    }
    if (flag('json')) { console.log(JSON.stringify(out.map(({ drawCounts, ...rest }) => rest))); return; }
  }
  const never = userCards.filter((id) => !ever.has(id));
  console.log(`\nnever drawn (${never.length}): ${never.join(', ') || '-'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
