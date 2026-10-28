#!/usr/bin/env node
// Validate all game data. Usage: node tools/validate.js [dataDir] [--quiet]
// Exits 1 on any error. Warnings never fail the build.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METERS, SLOTS, HOMES, MODS, QUIRKS, BAGS, CONDITION_KEYS } from '../web/js/engine.js';
import { PORTRAIT_IDS } from '../web/js/portraits.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dataDir = args.find((a) => !a.startsWith('--')) || join(here, '..', 'web', 'data');
const quiet = args.includes('--quiet');

const LIMITS = { label: 24, labelWarn: 20, text: 200, textWarn: 140, endingText: 400 };
const CHAR_IDS = ['owner', 'instinct', 'partner', 'dog', 'vet', 'neighbor', 'landlord', 'roomba', 'plant', 'bird', 'reddot', 'shelter', 'albert', 'narrator', 'cat'];
const CARD_KEYS = ['id', 'char', 'text', 'bag', 'weight', 'cooldown', 'once', 'noTime', 'when', 'left', 'right', 'note', 'tags'];
const CHOICE_KEYS = ['label', 'fx', 'set', 'next', 'end', 'chaos'];
const PATTERNS = ['none', 'tabby', 'tuxedo_bib', 'calico_patches', 'socks', 'spots'];
const ACCESSORIES = ['none', 'bell_collar', 'bow_tie', 'tiny_hat', 'flower', 'glasses', 'bandana', 'crown'];
const RESULT_KEYS = ['won', 'endingKind', 'ending', 'chaosGte', 'swipesGte'];

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function load(rel, required = true) {
  const p = join(dataDir, rel);
  if (!existsSync(p)) {
    (required ? err : warn)(rel, 'file missing');
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    err(rel, `invalid JSON: ${e.message}`);
    return null;
  }
}

const isInt = (v) => Number.isInteger(v);
const asList = (v) => (Array.isArray(v) ? v : [v]);

// ---------- load ----------
const characters = load('characters.json');
const charMap = (characters && (characters.characters || characters)) || {};
const owners = load('owners.json');
const endingsRaw = load('endings.json');
const endings = Array.isArray(endingsRaw) ? endingsRaw : (endingsRaw && endingsRaw.endings) || [];
const achRaw = load('achievements.json');
const achievements = (achRaw && (achRaw.achievements || achRaw)) || [];
const cosmetics = load('cosmetics.json');
const index = load('cards/index.json');
const files = (index && (index.files || (Array.isArray(index) ? index : []))) || [];

const cards = []; // { card, file }
const perFile = {};
for (const f of files) {
  const data = load(`cards/${f}`);
  if (!data) continue;
  const list = Array.isArray(data) ? data : data.cards;
  if (!Array.isArray(list)) { err(`cards/${f}`, 'expected { "cards": [...] }'); continue; }
  perFile[f] = list.length;
  for (const card of list) cards.push({ card, file: f });
}

const cardIds = new Map();
for (const { card, file } of cards) {
  if (!card || typeof card.id !== 'string') continue;
  if (cardIds.has(card.id)) err(`cards/${file}`, `duplicate card id "${card.id}" (also in ${cardIds.get(card.id).file})`);
  else cardIds.set(card.id, { card, file });
}
const endingIds = new Set();
for (const e of endings) {
  if (!e || !e.id) continue;
  if (endingIds.has(e.id)) err('endings.json', `duplicate ending id "${e.id}"`);
  endingIds.add(e.id);
}
const ownerIds = new Set(((owners && owners.owners) || []).map((o) => o.id));
const cosmeticIds = new Set();
if (cosmetics) {
  for (const group of ['coats', 'patterns', 'accessories']) {
    for (const it of cosmetics[group] || []) {
      if (it.id !== 'none' && cosmeticIds.has(it.id)) err('cosmetics.json', `duplicate cosmetic id "${it.id}" (ids are unique across groups)`);
      cosmeticIds.add(it.id);
    }
  }
}

// ---------- conditions ----------
function checkConds(where, conds, allowResult = false) {
  if (conds == null) return;
  if (!Array.isArray(conds)) { err(where, '`when` must be an array'); return; }
  for (const c of conds) checkCond(where, c, allowResult);
}

function checkCond(where, c, allowResult) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) { err(where, `bad condition ${JSON.stringify(c)}`); return; }
  const keys = Object.keys(c);
  for (const k of keys) {
    if (!CONDITION_KEYS.includes(k)) { err(where, `unknown condition key "${k}"`); continue; }
    if (RESULT_KEYS.includes(k) && !allowResult) err(where, `"${k}" is only valid in achievements/endings`);
    const v = c[k];
    switch (k) {
      case 'flag': case 'notFlag': case 'meta':
        if (typeof v !== 'string') err(where, `${k} expects a string`); break;
      case 'flagGte': case 'flagLt':
        if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'string' || typeof v[1] !== 'number') err(where, `${k} expects ["flag", n]`); break;
      case 'meter':
        if (!METERS.includes(v)) err(where, `unknown meter "${v}"`);
        if (!['lt', 'gt', 'lte', 'gte'].some((x) => x in c)) err(where, 'meter condition needs lt/gt/lte/gte');
        break;
      case 'lt': case 'gt': case 'lte': case 'gte':
        if (!('meter' in c)) err(where, `${k} only valid with "meter"`);
        if (typeof v !== 'number') err(where, `${k} expects a number`);
        break;
      case 'day':
        if (typeof v === 'number') break;
        if (!v || typeof v !== 'object' || !Object.keys(v).every((x) => ['gte', 'lte', 'gt', 'lt', 'eq'].includes(x))) err(where, 'day expects a number or {gte,lte,eq}');
        break;
      case 'slot': for (const s of asList(v)) if (!SLOTS.includes(s)) err(where, `unknown slot "${s}"`); break;
      case 'mod': case 'notMod': for (const s of asList(v)) if (!MODS.includes(s)) err(where, `unknown mod "${s}"`); break;
      case 'home': for (const s of asList(v)) if (!HOMES.includes(s)) err(where, `unknown home "${s}"`); break;
      case 'quirk': case 'notQuirk': for (const s of asList(v)) if (!QUIRKS.includes(s)) err(where, `unknown quirk "${s}"`); break;
      case 'owner': for (const s of asList(v)) if (ownerIds.size && !ownerIds.has(s)) warn(where, `owner "${s}" not in owners.json`); break;
      case 'mode': if (!['normal', 'chaos'].includes(v)) err(where, `unknown mode "${v}"`); break;
      case 'seen': case 'notSeen': if (!cardIds.has(v)) err(where, `${k} references unknown card "${v}"`); break;
      case 'chance': if (typeof v !== 'number' || v < 0 || v > 1) err(where, 'chance expects 0..1'); break;
      case 'any': if (!Array.isArray(v)) err(where, 'any expects an array'); else for (const x of v) checkCond(where, x, allowResult); break;
      case 'not': checkCond(where, v, allowResult); break;
      case 'ending': if (!endingIds.has(v)) err(where, `unknown ending "${v}"`); break;
      case 'endingKind': if (!['win', 'lose', 'chaos'].includes(v)) err(where, `bad endingKind "${v}"`); break;
      default: break;
    }
  }
}

// ---------- cards ----------
const bagCounts = {};
const referencedNext = new Set();
const referencedEnd = new Set();
for (const { card, file } of cards) {
  const where = `cards/${file}:${card && card.id ? card.id : '?'}`;
  if (!card || typeof card !== 'object') { err(where, 'card is not an object'); continue; }
  if (typeof card.id !== 'string' || !/^[a-z0-9_]+$/.test(card.id)) err(where, 'id must be snake_case');
  for (const k of Object.keys(card)) if (!CARD_KEYS.includes(k)) warn(where, `unknown card key "${k}"`);
  if (!charMap[card.char]) err(where, `unknown char "${card.char}"`);
  if (typeof card.text !== 'string' || !card.text.trim()) err(where, 'missing text');
  else if (card.text.length > LIMITS.text) warn(where, `text is ${card.text.length} chars (> ${LIMITS.text})`);
  const bag = card.bag || 'main';
  if (!BAGS.includes(bag)) err(where, `unknown bag "${bag}"`);
  bagCounts[bag] = (bagCounts[bag] || 0) + 1;
  for (const k of ['weight', 'cooldown']) if (k in card && (typeof card[k] !== 'number' || card[k] < 0)) err(where, `${k} must be a number >= 0`);
  for (const k of ['once', 'noTime']) if (k in card && typeof card[k] !== 'boolean') err(where, `${k} must be boolean`);
  checkConds(where, card.when);
  if (!card.left && !card.right) err(where, 'needs left and/or right');
  for (const side of ['left', 'right']) {
    const ch = card[side];
    if (ch == null) continue;
    const w = `${where}.${side}`;
    if (typeof ch !== 'object') { err(w, 'choice must be an object'); continue; }
    for (const k of Object.keys(ch)) if (!CHOICE_KEYS.includes(k)) warn(w, `unknown choice key "${k}"`);
    if (typeof ch.label !== 'string' || !ch.label.trim()) err(w, 'missing label');
    else if (ch.label.length > LIMITS.label) err(w, `label "${ch.label}" is ${ch.label.length} chars (max ${LIMITS.label})`);
    if (ch.fx != null) {
      if (typeof ch.fx !== 'object') err(w, 'fx must be an object');
      else for (const [k, v] of Object.entries(ch.fx)) {
        if (!METERS.includes(k)) err(w, `unknown fx key "${k}"`);
        if (!isInt(v)) err(w, `fx.${k} must be an integer`);
        else if (Math.abs(v) > 50) warn(w, `fx.${k} = ${v} is huge`);
      }
    }
    if (ch.set != null) {
      if (typeof ch.set !== 'object' || Array.isArray(ch.set)) err(w, 'set must be an object');
      else for (const [k, v] of Object.entries(ch.set)) {
        if (typeof v === 'string' && /^[+-]/.test(v) && !/^[+-]\d+$/.test(v)) err(w, `set.${k} "${v}" looks like a bad increment`);
      }
    }
    if (ch.next != null) {
      const ids = asList(ch.next);
      for (const id of ids) {
        if (typeof id !== 'string' || !cardIds.has(id)) err(w, `next references unknown card "${id}"`);
        else referencedNext.add(id);
      }
    }
    if (ch.end != null) {
      if (!endingIds.has(ch.end)) err(w, `end references unknown ending "${ch.end}"`);
      else referencedEnd.add(ch.end);
    }
    if (ch.chaos != null && typeof ch.chaos !== 'number') err(w, 'chaos must be a number');
  }
}
for (const [id, { card, file }] of cardIds) {
  if ((card.bag === 'chain' || card.weight === 0) && !referencedNext.has(id)) warn(`cards/${file}:${id}`, 'chain/weight-0 card is never reached by any `next`');
}
for (const b of BAGS.filter((x) => x.startsWith('crisis_'))) if (!bagCounts[b]) warn('cards', `crisis bag "${b}" is empty (built-in fallback will be used)`);
if (!bagCounts.main) warn('cards', 'main bag is empty');

// ---------- endings ----------
const triggerGroups = {};
for (const e of endings) {
  const where = `endings.json:${e && e.id ? e.id : '?'}`;
  if (!e || typeof e !== 'object') { err(where, 'not an object'); continue; }
  for (const k of ['id', 'title', 'text']) if (typeof e[k] !== 'string' || !e[k]) err(where, `missing ${k}`);
  if (!['win', 'lose', 'chaos'].includes(e.kind)) err(where, `kind must be win|lose|chaos`);
  if (!charMap[e.char]) err(where, `unknown char "${e.char}"`);
  if (typeof e.text === 'string' && e.text.length > LIMITS.endingText) warn(where, `text is ${e.text.length} chars`);
  checkConds(where, e.when, true);
  if (e.trigger != null) {
    const t = e.trigger;
    let key = null;
    if (t.meter) {
      if (!['joy', 'home'].includes(t.meter)) err(where, 'trigger.meter must be joy|home');
      if (t.at && t.at !== 'low') err(where, 'trigger.at must be "low"');
      key = `meter:${t.meter}`;
    } else if (t.win === true) key = 'win';
    else if (t.trialFail === true) key = 'trialFail';
    else if (t.chaos === 'home' || t.chaos === 'time') key = `chaos:${t.chaos}`;
    else err(where, `bad trigger ${JSON.stringify(t)}`);
    if (key) {
      (triggerGroups[key] = triggerGroups[key] || []).push(e);
      const expectKind = key === 'win' ? 'win' : key.startsWith('chaos') ? 'chaos' : 'lose';
      if (e.kind !== expectKind) warn(where, `trigger ${key} usually has kind "${expectKind}"`);
    }
  } else if (!referencedEnd.has(e.id)) warn(where, 'no trigger and no card `end` references it (unreachable)');
}
for (const key of ['meter:joy', 'meter:home', 'win', 'trialFail', 'chaos:home', 'chaos:time']) {
  const g = triggerGroups[key] || [];
  if (!g.length) warn('endings.json', `no ending for trigger ${key} (built-in fallback used)`);
  else if (!g.some((e) => !e.when || !e.when.length)) warn('endings.json', `trigger ${key} has no unconditional fallback variant`);
  else {
    const idx = g.findIndex((e) => !e.when || !e.when.length);
    if (idx < g.length - 1) warn('endings.json', `trigger ${key}: "${g[idx].id}" has no when, so later variants are unreachable`);
  }
}

// ---------- owners ----------
if (owners) {
  if (!Array.isArray(owners.owners) || !owners.owners.length) err('owners.json', 'owners[] missing or empty');
  const seen = new Set();
  for (const o of owners.owners || []) {
    const where = `owners.json:${o.id || '?'}`;
    if (!o.id || !o.name) err(where, 'needs id and name');
    if (seen.has(o.id)) err(where, 'duplicate owner id');
    seen.add(o.id);
    if (!QUIRKS.includes(o.quirk)) err(where, `unknown quirk "${o.quirk}"`);
    if (!o.quirkLabel) warn(where, 'missing quirkLabel');
    if (o.weight != null && typeof o.weight !== 'number') err(where, 'weight must be a number');
  }
  if (!seen.has('albert')) warn('owners.json', 'no "albert" owner');
  for (const k of ['catNames', 'partnerNames', 'dogNames']) {
    if (!Array.isArray(owners[k]) || !owners[k].length) err('owners.json', `${k} missing or empty`);
  }
}

// ---------- characters ----------
for (const id of CHAR_IDS) if (!charMap[id]) err('characters.json', `missing character "${id}"`);
for (const [id, c] of Object.entries(charMap)) {
  if (!c.name || !c.emoji || !c.color) err(`characters.json:${id}`, 'needs name, emoji, color');
  if (!PORTRAIT_IDS.includes(id)) warn(`characters.json:${id}`, 'no SVG portrait in portraits.js (emoji fallback)');
}

// ---------- achievements ----------
const achIds = new Set();
for (const a of achievements) {
  const where = `achievements.json:${a.id || '?'}`;
  if (!a.id || !a.title) err(where, 'needs id and title');
  if (achIds.has(a.id)) err(where, 'duplicate id');
  achIds.add(a.id);
  if (!Array.isArray(a.goal) || !a.goal.length) err(where, 'goal must be a non-empty condition array');
  else checkConds(where, a.goal, true);
  const u = a.unlocks || {};
  if (u.cosmetic && !cosmeticIds.has(u.cosmetic)) err(where, `unlocks unknown cosmetic "${u.cosmetic}"`);
  if (!u.cosmetic && !u.flag) warn(where, 'unlocks nothing');
}
if (achievements.length < 3) warn('achievements.json', 'fewer than 3 achievements');

// ---------- cosmetics ----------
if (cosmetics) {
  for (const c of cosmetics.coats || []) {
    if (!c.fur || !c.shade || !c.belly) err(`cosmetics.json:${c.id}`, 'coat needs fur, shade, belly colors');
  }
  for (const p of cosmetics.patterns || []) if (!PATTERNS.includes(p.id)) err(`cosmetics.json:${p.id}`, 'pattern not drawn by catsvg.js');
  for (const p of cosmetics.accessories || []) if (!ACCESSORIES.includes(p.id)) err(`cosmetics.json:${p.id}`, 'accessory not drawn by catsvg.js');
  for (const g of ['coats', 'patterns', 'accessories']) {
    if (!(cosmetics[g] || []).some((x) => x.unlocked)) err('cosmetics.json', `${g}: nothing unlocked by default`);
  }
}

// ---------- report ----------
const out = [];
out.push(`Cards: ${cards.length} in ${Object.keys(perFile).length} file(s)`);
for (const [f, n] of Object.entries(perFile)) out.push(`  ${f.padEnd(18)} ${n}`);
out.push('Bags:');
for (const [b, n] of Object.entries(bagCounts).sort((a, b) => b[1] - a[1])) out.push(`  ${b.padEnd(22)} ${n}`);
out.push(`Endings: ${endings.length} · Owners: ${((owners && owners.owners) || []).length} · Achievements: ${achievements.length} · Cosmetics: ${cosmeticIds.size}`);
console.log(out.join('\n'));
if (warnings.length && !quiet) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  warn  ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  process.exit(1);
}
console.log(`\nOK${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
