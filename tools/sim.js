#!/usr/bin/env node
// Headless balance simulator.
// Usage: node tools/sim.js [--runs 2000] [--strategy random|greedy|smart|all] [--mods 0-2|random] [--mode normal|chaos] [--seed 1] [--top 10]
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine, buildData, mulberry32, METERS, CONFIG } from '../web/js/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'web', 'data');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}
const RUNS = Number(arg('runs', 2000));
const STRAT = arg('strategy', 'all');
const MODS = arg('mods', 'random');
const MODE = arg('mode', 'normal');
const SEED = Number(arg('seed', 1));
const TOP = Number(arg('top', 10));

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
function project(eng, side) {
  const card = eng.getCard(eng.state.card);
  const ch = card[side] || {};
  const m = { ...eng.state.meters };
  for (const k of METERS) m[k] = Math.max(0, Math.min(100, m[k] + ((ch.fx && ch.fx[k]) || 0)));
  for (const [k, d] of Object.entries(CONFIG.drift)) m[k] = Math.max(0, Math.min(100, m[k] + d));
  return { m, ch };
}

const strategies = {
  random: (eng, rng) => (rng() < 0.5 ? 'left' : 'right'),
  greedy: (eng, rng) => {
    const l = project(eng, 'left').m.joy;
    const r = project(eng, 'right').m.joy;
    return l === r ? (rng() < 0.5 ? 'left' : 'right') : l > r ? 'left' : 'right';
  },
  smart: (eng, rng) => {
    const score = (side) => {
      const { m, ch } = project(eng, side);
      if (eng.state.mode === 'chaos') return (ch.chaos != null ? ch.chaos : Math.max(0, -((ch.fx && ch.fx.home) || 0))) - (m.home <= 0 ? 0 : 0);
      let s = 0;
      if (ch.end) s -= 1000;
      if (m.joy <= 0 || m.home <= 0) s -= 1000;
      s += m.joy * 1.2 + Math.min(m.home, 60) * 0.6;
      for (const k of ['instinct', 'belly']) {
        const d = Math.abs(m[k] - 50);
        s -= d > 35 ? (d - 35) * 6 : d * 0.15;
      }
      if (m.home < 25) s -= (25 - m.home) * 3;
      return s + rng() * 0.01;
    };
    return score('left') >= score('right') ? 'left' : 'right';
  },
};

function runOne(data, strat, seed) {
  const rng = mulberry32(seed * 7919 + 13);
  const eng = new Engine(data, { meta: { flags: {} } });
  const modCount = MODS === 'random' ? Math.floor(rng() * 3) : Number(MODS);
  eng.newRun({ seed, modCount, mode: MODE });
  eng.choose('right'); // trial file
  const drawn = [];
  let crises = 0;
  let guard = 0;
  while (!eng.state.over && guard++ < 500) {
    drawn.push(eng.state.card);
    const res = eng.choose(strategies[strat](eng, rng));
    if (res.crisis) crises++;
  }
  return { state: eng.state, drawn, crises, mods: eng.state.profile.mods };
}

function pct(n, d) { return d ? `${((100 * n) / d).toFixed(1)}%` : '-'; }

function report(data, strat) {
  const endings = {};
  const drawCounts = {};
  let wins = 0, swipes = 0, days = 0, crises = 0, runsWithCrisis = 0, chaos = 0;
  const winsByMods = [0, 0, 0, 0], runsByMods = [0, 0, 0, 0];
  for (let i = 0; i < RUNS; i++) {
    const r = runOne(data, strat, SEED + i);
    const e = r.state.ending || { id: '(none)', kind: '?' };
    endings[e.id] = (endings[e.id] || 0) + 1;
    if (e.kind === 'win') { wins++; winsByMods[r.mods.length]++; }
    runsByMods[r.mods.length]++;
    swipes += r.state.swipe;
    days += r.state.trialCompleted ? 14 : r.state.day - 1 + r.state.slot / 4;
    crises += r.crises;
    if (r.crises) runsWithCrisis++;
    chaos += r.state.chaos;
    for (const id of r.drawn) drawCounts[id] = (drawCounts[id] || 0) + 1;
  }
  console.log(`\n=== strategy: ${strat} · ${RUNS} runs · mode ${MODE} · mods ${MODS} ===`);
  if (MODE === 'chaos') console.log(`avg chaos score   ${(chaos / RUNS).toFixed(1)}`);
  else console.log(`win rate          ${pct(wins, RUNS)}   (by complications: ${runsByMods.slice(0, 3).map((n, k) => `${k}:${pct(winsByMods[k], n)}`).join(' ')})`);
  console.log(`avg run length    ${(swipes / RUNS).toFixed(1)} swipes, ${(days / RUNS).toFixed(1)} days`);
  console.log(`crises            ${(crises / RUNS).toFixed(2)} per run, ${pct(runsWithCrisis, RUNS)} of runs have one`);
  console.log('endings:');
  for (const [id, n] of Object.entries(endings).sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(28)} ${String(n).padStart(6)}  ${pct(n, RUNS)}`);
  const sorted = Object.entries(drawCounts).sort((a, b) => b[1] - a[1]);
  console.log(`most drawn:  ${sorted.slice(0, TOP).map(([id, n]) => `${id}(${n})`).join(', ')}`);
  console.log(`least drawn: ${sorted.slice(-TOP).reverse().map(([id, n]) => `${id}(${n})`).join(', ')}`);
  return drawCounts;
}

const data = loadDataFromDisk();
const userCards = Object.keys(data.cards).filter((id) => !id.startsWith('__'));
console.log(`Loaded ${userCards.length} cards, ${data.endings.length} endings, ${data.owners.owners.length} owners.`);
const list = STRAT === 'all' ? Object.keys(strategies) : [STRAT];
const ever = new Set();
for (const s of list) {
  if (!strategies[s]) { console.error(`unknown strategy ${s}`); process.exit(2); }
  for (const id of Object.keys(report(data, s))) ever.add(id);
}
const never = userCards.filter((id) => !ever.has(id));
console.log(`\nnever drawn (${never.length}): ${never.join(', ') || '-'}`);
