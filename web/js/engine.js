// Nine Reigns engine: pure, DOM-free game logic. Importable from Node.
// See docs/data-format.md for the data shapes.

export const METERS = ['joy', 'home', 'instinct', 'belly'];
export const SLOTS = ['morning', 'afternoon', 'evening', 'night'];
export const SLOT_LABELS = ['Morning', 'Afternoon', 'Evening', 'Night'];
export const DAYS = 14;
export const HOMES = ['studio', 'apartment', 'house'];
export const MODS = ['allergies', 'partner', 'dog'];
export const QUIRKS = ['wfh', 'nightshift', 'plantparent', 'neatfreak', 'gamer'];
export const BAGS = ['main', 'intro', 'chain', 'chaos',
  'crisis_instinct_high', 'crisis_instinct_low', 'crisis_belly_high', 'crisis_belly_low'];

export const CONFIG = {
  start: { joy: 35, home: 70, instinct: 40, belly: 50 },
  drift: { instinct: 2, belly: -3 },
  winJoy: 60,
  // Value a cat meter resets to after its crisis card resolves (number or per crisis bag).
  crisisReset: 50,
  defaultWeight: 10,
  defaultCooldown: 20,
  sneezeChance: 0.35,
  sneezeJoy: -4,
  bigDot: 10,
  chaosDemolitionBonusPerSlot: 2,
  activeAchievements: 3,
};

export function crisisResetValue(crisis) {
  const r = CONFIG.crisisReset;
  if (typeof r === 'number') return r;
  const v = r && r[`${crisis.meter}_${crisis.dir}`];
  return typeof v === 'number' ? v : 50;
}

// ---------- RNG ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  const fn = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.getState = () => a;
  return fn;
}

function pickWeighted(items, weightOf, rng) {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (total <= 0) return null;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

function pick(arr, rng) {
  return arr.length ? arr[Math.floor(rng() * arr.length) % arr.length] : undefined;
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clamp = (v) => Math.max(0, Math.min(100, v));
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const truthy = (v) => !(v === undefined || v === null || v === false || v === 0 || v === '');

// ---------- Built-in fallback content ----------
export const BUILTIN_CARDS = [
  {
    id: '__filler', char: 'narrator', bag: 'chain', weight: 0,
    text: 'Nothing is happening. You stare at a wall. The wall stares back.',
    left: { label: 'Nap', fx: { belly: -2 } },
    right: { label: 'Stare harder', fx: { instinct: -2 } },
  },
  {
    id: '__crisis_instinct_high', char: 'instinct', bag: 'chain', weight: 0,
    text: 'THE INSTINCT HAS BOILED OVER. SOMETHING MUST BE DESTROYED. NOW.',
    left: { label: 'Bite an ankle', fx: { joy: -15 } },
    right: { label: 'Shred the couch', fx: { home: -15 } },
  },
  {
    id: '__crisis_instinct_low', char: 'vet', bag: 'chain', weight: 0,
    text: "You've become a sad loaf. {owner} is worried enough to call the vet.",
    left: { label: 'Go limp', fx: { joy: -10 } },
    right: { label: 'Hide under bed', fx: { joy: -5, home: -5 } },
  },
  {
    id: '__crisis_belly_high', char: 'owner', bag: 'chain', weight: 0,
    text: 'You ate too much, too fast. The rug is right there.',
    left: { label: 'Aim for the rug', fx: { home: -15 } },
    right: { label: 'Aim for a shoe', fx: { joy: -15 } },
  },
  {
    id: '__crisis_belly_low', char: 'owner', bag: 'chain', weight: 0,
    text: 'It is 4 AM. The bowl is EMPTY (you can see the bottom).',
    left: { label: 'Yowl', fx: { joy: -15 } },
    right: { label: 'Knock things over', fx: { home: -10, joy: -5 } },
  },
];

const FALLBACK_ENDINGS = {
  'meter:joy': { id: '__end_joy', title: 'Return Policy', kind: 'lose', char: 'shelter', text: '{owner} decided this just wasn\'t working out. Back to the shelter, {cat}.' },
  'meter:home': { id: '__end_home', title: 'Deposit Gone', kind: 'lose', char: 'landlord', text: 'The apartment could not take any more. Neither could {owner}.' },
  win: { id: '__end_win', title: 'Adopted!', kind: 'win', char: 'owner', text: '{owner} signed the papers. {cat} is home for good.' },
  trialFail: { id: '__end_trial', title: 'Trial Over', kind: 'lose', char: 'shelter', text: 'Two weeks passed. {owner} liked you, but not quite enough.' },
  'chaos:home': { id: '__end_chaos_home', title: 'Total Demolition', kind: 'chaos', char: 'owner', text: 'The home is rubble. {owner} is sitting in the rubble. Magnificent.' },
  'chaos:time': { id: '__end_chaos_time', title: 'Time\'s Up', kind: 'chaos', char: 'owner', text: 'Fourteen days of mayhem, and the place is still standing. Somehow.' },
  card: { id: '__end_card', title: 'The End', kind: 'lose', char: 'shelter', text: 'And that was that, {cat}.' },
};

const FALLBACK_OWNERS = {
  owners: [
    { id: 'sam', name: 'Sam', quirk: 'wfh', quirkLabel: 'works from home', weight: 10 },
  ],
  catNames: ['Biscuit'],
  partnerNames: ['Alex'],
  dogNames: ['Waffles'],
};

// ---------- Data normalization ----------
export function normalizeCard(c) {
  const card = { ...c };
  card.bag = card.bag || 'main';
  card.weight = card.weight == null ? CONFIG.defaultWeight : card.weight;
  card.cooldown = card.cooldown == null ? CONFIG.defaultCooldown : card.cooldown;
  card.once = !!card.once || card.bag === 'intro';
  card.noTime = !!card.noTime;
  card.when = card.when || [];
  if (!card.left && card.right) card.left = card.right;
  if (!card.right && card.left) card.right = card.left;
  if (!card.left) card.left = card.right = { label: 'Continue' };
  return card;
}

// data: { cards: [], endings: [], owners: {}, characters: {}, achievements: [] }
export function buildData(raw = {}) {
  const cards = {};
  const bags = {};
  for (const c of [...BUILTIN_CARDS, ...(raw.cards || [])]) {
    if (!c || !c.id) continue;
    const card = normalizeCard(c);
    cards[card.id] = card;
  }
  for (const card of Object.values(cards)) {
    (bags[card.bag] = bags[card.bag] || []).push(card);
  }
  const endings = Array.isArray(raw.endings) ? raw.endings : (raw.endings && raw.endings.endings) || [];
  const endingById = {};
  for (const e of endings) if (e && e.id) endingById[e.id] = e;
  const owners = raw.owners && Array.isArray(raw.owners.owners) && raw.owners.owners.length
    ? raw.owners : FALLBACK_OWNERS;
  const ach = Array.isArray(raw.achievements) ? raw.achievements
    : (raw.achievements && raw.achievements.achievements) || [];
  return {
    cards, bags, endings, endingById, owners,
    characters: (raw.characters && (raw.characters.characters || raw.characters)) || {},
    achievements: ach,
  };
}

// ---------- Conditions ----------
// ctx: { state, meta, rng, result }
export function evalCond(cond, ctx) {
  if (!cond || typeof cond !== 'object') return true;
  const { state } = ctx;
  const p = state.profile || {};
  const flags = state.flags || {};
  const num = (k) => Number(flags[k]) || 0;
  for (const key of Object.keys(cond)) {
    const v = cond[key];
    switch (key) {
      case 'flag': if (!truthy(flags[v])) return false; break;
      case 'notFlag': if (truthy(flags[v])) return false; break;
      case 'flagGte': if (!(num(v[0]) >= v[1])) return false; break;
      case 'flagLt': if (!(num(v[0]) < v[1])) return false; break;
      case 'meter': {
        const m = state.meters[v];
        if ('lt' in cond && !(m < cond.lt)) return false;
        if ('gt' in cond && !(m > cond.gt)) return false;
        if ('lte' in cond && !(m <= cond.lte)) return false;
        if ('gte' in cond && !(m >= cond.gte)) return false;
        break;
      }
      case 'lt': case 'gt': case 'lte': case 'gte': break; // handled with meter
      case 'day': {
        const d = state.day;
        if (typeof v === 'number') { if (d !== v) return false; break; }
        if (v.eq != null && d !== v.eq) return false;
        if (v.gte != null && !(d >= v.gte)) return false;
        if (v.lte != null && !(d <= v.lte)) return false;
        if (v.gt != null && !(d > v.gt)) return false;
        if (v.lt != null && !(d < v.lt)) return false;
        break;
      }
      case 'slot': if (!asList(v).includes(SLOTS[state.slot])) return false; break;
      case 'mod': if (!asList(v).every((m) => (p.mods || []).includes(m))) return false; break;
      case 'notMod': if (asList(v).some((m) => (p.mods || []).includes(m))) return false; break;
      case 'home': if (!asList(v).includes(p.home)) return false; break;
      case 'owner': if (!asList(v).includes(p.owner && p.owner.id)) return false; break;
      case 'quirk': if (!asList(v).includes(p.quirk)) return false; break;
      case 'notQuirk': if (asList(v).includes(p.quirk)) return false; break;
      case 'mode': if (state.mode !== v) return false; break;
      case 'seen': if (!(state.seen && state.seen[v])) return false; break;
      case 'notSeen': if (state.seen && state.seen[v]) return false; break;
      case 'meta': {
        const mf = (ctx.meta && ctx.meta.flags) || {};
        const builtin = state.metaSnapshot || {};
        if (!(truthy(mf[v]) || truthy(builtin[v]))) return false;
        break;
      }
      case 'chance': if (!((ctx.rng || Math.random)() < v)) return false; break;
      case 'any': if (!asList(v).some((c) => evalCond(c, ctx))) return false; break;
      case 'not': if (evalCond(v, ctx)) return false; break;
      // run-result conditions
      case 'won': if (!ctx.result || (ctx.result.kind === 'win') !== !!v) return false; break;
      case 'endingKind': if (!ctx.result || ctx.result.kind !== v) return false; break;
      case 'ending': if (!ctx.result || ctx.result.id !== v) return false; break;
      case 'chaosGte': if (!(state.chaos >= v)) return false; break;
      case 'swipesGte': if (!(state.swipe >= v)) return false; break;
      default: break; // unknown keys are ignored (validator flags them)
    }
  }
  return true;
}

export function evalAll(conds, ctx) {
  for (const c of conds || []) if (!evalCond(c, ctx)) return false;
  return true;
}

export const CONDITION_KEYS = ['flag', 'notFlag', 'flagGte', 'flagLt', 'meter', 'lt', 'gt', 'lte', 'gte',
  'day', 'slot', 'mod', 'notMod', 'home', 'owner', 'quirk', 'notQuirk', 'mode', 'seen', 'notSeen',
  'meta', 'chance', 'any', 'not', 'won', 'endingKind', 'ending', 'chaosGte', 'swipesGte'];

// ---------- Placeholders ----------
export function fillText(text, profile) {
  if (typeof text !== 'string') return text;
  const p = profile || {};
  return text
    .replace(/\{cat\}/g, p.catName || 'the cat')
    .replace(/\{owner\}/g, (p.owner && p.owner.name) || 'your human')
    .replace(/\{partner\}/g, p.partnerName || 'the partner')
    .replace(/\{dog\}/g, p.dogName || 'the dog')
    .replace(/\{home\}/g, p.home || 'home');
}

// ---------- Engine ----------
export class Engine {
  // opts: { rng?: () => number, meta?: { flags, ... } }
  constructor(data, opts = {}) {
    this.data = data && data.cards && data.bags ? data : buildData(data);
    this.meta = opts.meta || { flags: {} };
    this.externalRng = opts.rng || null;
    this.state = null;
    this._rng = null;
  }

  rng() {
    if (this.externalRng) return this.externalRng();
    const r = this._rng();
    this.state.rngState = this._rng.getState();
    return r;
  }

  // opts: { mode, mods (array) | modCount, home, ownerId, catName, cosmetic, seed, firstRun, achievementsDone }
  newRun(opts = {}) {
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    this._rng = mulberry32(seed);
    this.state = { rngState: seed };
    const R = () => this.rng();
    const od = this.data.owners;
    let owner = opts.ownerId ? od.owners.find((o) => o.id === opts.ownerId) : null;
    if (!owner) owner = pickWeighted(od.owners, (o) => (o.weight == null ? 10 : o.weight), R) || od.owners[0];
    const home = opts.home || pick(HOMES, R);
    let mods = opts.mods;
    if (!mods) mods = shuffle(MODS, R).slice(0, Math.max(0, Math.min(3, opts.modCount || 0)));
    const profile = {
      owner: { id: owner.id, name: owner.name, quirkLabel: owner.quirkLabel || owner.quirk },
      quirk: owner.quirk,
      home,
      mods: mods.slice(),
      catName: opts.catName || pick(od.catNames || [], R) || 'Biscuit',
      partnerName: pick(od.partnerNames || [], R) || 'Alex',
      dogName: pick(od.dogNames || [], R) || 'Waffles',
      cosmetic: opts.cosmetic || null,
    };
    const mode = opts.mode === 'chaos' ? 'chaos' : 'normal';
    Object.assign(this.state, {
      version: 1,
      mode,
      profile,
      meters: { ...CONFIG.start },
      flags: {},
      day: 1,
      slot: 0,
      swipe: 0,
      chaos: 0,
      lastSeen: {},
      seen: {},
      queue: [],
      crisisQueue: [],
      card: null,
      cardIsCrisis: null,
      over: false,
      ending: null,
      history: [],
      metaSnapshot: { firstRun: !!opts.firstRun, firstWin: !!opts.firstWin },
      trialCompleted: false,
      activeAch: [],
      achDone: [],
    });
    // active achievements
    const doneBefore = new Set(opts.achievementsDone || []);
    const pool = this.data.achievements.filter((a) => !doneBefore.has(a.id) && (!a.mode || a.mode === mode));
    this.state.activeAch = shuffle(pool, R).slice(0, CONFIG.activeAchievements).map((a) => a.id);
    // trial file card first
    this.state.card = '__trial_file';
    return this.state;
  }

  load(state) {
    this.state = state;
    this._rng = mulberry32(state.rngState >>> 0);
    return state;
  }

  trialFileCard() {
    const p = this.state.profile;
    const mods = p.mods.length ? p.mods.map((m) => ({ allergies: 'allergies', partner: `partner (${p.partnerName})`, dog: `dog (${p.dogName})` }[m])).join(', ') : 'none';
    const text = this.state.mode === 'chaos'
      ? `CHAOS MODE. Subject: {cat}. Target: {owner}'s ${p.home}. Wreck it before Day 14. Joy is irrelevant.`
      : `Trial file: {cat}. Owner: {owner}, who ${p.owner.quirkLabel}. Home: ${p.home}. Complications: ${mods}. 14 days to win them over.`;
    return {
      id: '__trial_file', char: 'shelter', bag: 'chain', weight: 0, cooldown: 0, once: true, noTime: true, when: [],
      text,
      left: { label: 'Hide in carrier', fx: {} },
      right: { label: "Let's do this", fx: {} },
      trial: true,
    };
  }

  getCard(id) {
    if (id === '__trial_file') return this.trialFileCard();
    return this.data.cards[id] || this.data.cards.__filler;
  }

  // Current card with text resolved for display.
  current() {
    if (!this.state || this.state.over) return null;
    const card = this.getCard(this.state.card);
    const p = this.state.profile;
    const ch = this.data.characters[card.char] || {};
    const side = (s) => ({ ...s, label: fillText(s.label, p) });
    return {
      ...card,
      text: fillText(card.text, p),
      left: side(card.left),
      right: side(card.right),
      character: {
        id: card.char,
        name: fillText(ch.name || card.char, p),
        emoji: ch.emoji || '❔',
        color: ch.color || '#d9c7a7',
      },
      crisis: this.state.cardIsCrisis,
    };
  }

  // Dots for preview: { joy: 'small' | 'big' } (never direction)
  preview(side) {
    const card = this.getCard(this.state.card);
    const ch = card[side] || {};
    const out = {};
    for (const m of METERS) {
      const d = (ch.fx && ch.fx[m]) || 0;
      if (this.state.mode === 'chaos' && m === 'joy') continue;
      if (d !== 0) out[m] = Math.abs(d) >= CONFIG.bigDot ? 'big' : 'small';
    }
    return out;
  }

  ctx(result) {
    return { state: this.state, meta: this.meta, rng: () => this.rng(), result };
  }

  eligible(card, ignoreCooldown = false) {
    const s = this.state;
    if (card.once && s.seen[card.id]) return false;
    if (!ignoreCooldown && s.lastSeen[card.id] != null && s.swipe - s.lastSeen[card.id] < card.cooldown) return false;
    if (card.id === s.card) return false;
    return evalAll(card.when, this.ctx());
  }

  drawFromBags(bagNames, ignoreCooldown) {
    const pool = [];
    for (const b of bagNames) {
      for (const c of this.data.bags[b] || []) {
        if (c.weight > 0 && this.eligible(c, ignoreCooldown)) pool.push(c);
      }
    }
    return pickWeighted(pool, (c) => c.weight, () => this.rng());
  }

  // Select the next card id. Returns { id, crisis }.
  draw() {
    const s = this.state;
    if (s.crisisQueue.length) {
      const cr = s.crisisQueue.shift();
      const bag = `crisis_${cr.meter}_${cr.dir}`;
      const c = this.drawFromBags([bag], false) || this.drawFromBags([bag], true);
      return { id: c ? c.id : `__${bag}`, crisis: cr };
    }
    while (s.queue.length) {
      const entry = s.queue.shift();
      const ids = asList(entry);
      for (const id of ids) {
        const c = this.data.cards[id];
        if (c && evalAll(c.when, this.ctx())) return { id, crisis: null };
      }
    }
    const mainBags = s.mode === 'chaos' ? ['main', 'chaos'] : ['main'];
    if (s.day === 1 && s.slot === 0 && s.mode !== 'chaos') {
      const c = this.drawFromBags(['intro'], false);
      if (c) return { id: c.id, crisis: null };
    }
    const c = this.drawFromBags(mainBags, false) || this.drawFromBags(mainBags, true);
    return { id: c ? c.id : '__filler', crisis: null };
  }

  findEnding(triggerMatch, fallbackKey, result) {
    for (const e of this.data.endings) {
      if (!e.trigger || !triggerMatch(e.trigger)) continue;
      if (evalAll(e.when, this.ctx(result || { kind: e.kind, id: e.id }))) return e;
    }
    return FALLBACK_ENDINGS[fallbackKey];
  }

  endRun(ending) {
    const s = this.state;
    s.over = true;
    s.ending = {
      id: ending.id, title: ending.title, kind: ending.kind, char: ending.char,
      epithet: ending.epithet || null,
      text: fillText(ending.text, s.profile),
    };
    s.card = null;
    return s.ending;
  }

  // Apply a choice. side: 'left' | 'right'. Returns a result describing what changed.
  choose(side) {
    const s = this.state;
    if (!s || s.over) return null;
    if (side !== 'left' && side !== 'right') throw new Error('side must be left or right');
    const card = this.getCard(s.card);
    const ch = card[side] || {};
    const before = { ...s.meters };
    const events = [];
    if (card.trial) {
      // Trial file: pure intro, no drift or time.
      s.seen[card.id] = 1;
      const nxt = this.draw();
      s.card = nxt.id;
      s.cardIsCrisis = nxt.crisis;
      const zero = {};
      for (const m of METERS) zero[m] = 0;
      return { side, cardId: card.id, deltas: zero, events: ['start'], ending: null, crisis: null, achievements: [] };
    }

    // 1. fx
    for (const m of METERS) {
      const d = (ch.fx && ch.fx[m]) || 0;
      if (d) s.meters[m] = clamp(s.meters[m] + d);
    }
    // A cat meter that touches 0 or 100 at any point this swipe (after fx or after
    // drift) triggers its crisis, so drift can't nudge it back off the edge first.
    const hit = {};
    const markHits = () => {
      for (const m of ['instinct', 'belly']) {
        if (s.meters[m] >= 100) hit[m] = 'high';
        else if (s.meters[m] <= 0) hit[m] = 'low';
      }
    };
    markHits();
    // set
    let snuggled = false;
    if (ch.set) {
      for (const [k, v] of Object.entries(ch.set)) {
        if (typeof v === 'string' && /^[+-]\d+$/.test(v)) {
          const inc = parseInt(v, 10);
          s.flags[k] = (Number(s.flags[k]) || 0) + inc;
          if (k === 'snuggles' && inc > 0) snuggled = true;
        } else {
          s.flags[k] = v;
        }
      }
    }
    if (snuggled && s.profile.mods.includes('allergies') && this.rng() < CONFIG.sneezeChance) {
      s.meters.joy = clamp(s.meters.joy + CONFIG.sneezeJoy);
      events.push('sneeze');
    }
    if (ch.next) s.queue.unshift(ch.next);
    if (s.mode === 'chaos') {
      const pts = ch.chaos != null ? ch.chaos : Math.max(0, -((ch.fx && ch.fx.home) || 0));
      s.chaos += pts;
    }
    // 2. drift
    for (const [m, d] of Object.entries(CONFIG.drift)) s.meters[m] = clamp(s.meters[m] + d);
    markHits();
    // 3. crisis reset
    if (s.cardIsCrisis) {
      s.meters[s.cardIsCrisis.meter] = crisisResetValue(s.cardIsCrisis);
      delete hit[s.cardIsCrisis.meter];
    }

    // bookkeeping
    s.seen[card.id] = (s.seen[card.id] || 0) + 1;
    s.lastSeen[card.id] = s.swipe;
    s.swipe += 1;
    s.history.push(card.id);
    if (s.history.length > 80) s.history.shift();

    // 4. time
    let trialOver = false;
    if (!card.noTime) {
      s.slot += 1;
      if (s.slot >= SLOTS.length) {
        s.slot = 0;
        s.day += 1;
        events.push('newDay');
      }
      if (s.day > DAYS) { trialOver = true; s.trialCompleted = true; s.day = DAYS; s.slot = SLOTS.length - 1; }
    }

    const deltas = {};
    for (const m of METERS) deltas[m] = s.meters[m] - before[m];
    const result = { side, cardId: card.id, deltas, events, ending: null, crisis: null, achievements: [] };

    // 5. endings
    let ending = null;
    if (s.mode === 'normal') {
      if (ch.end) ending = this.data.endingById[ch.end] || { ...FALLBACK_ENDINGS.card, id: ch.end };
      else if (s.meters.joy <= 0) ending = this.findEnding((t) => t.meter === 'joy' && (t.at || 'low') === 'low', 'meter:joy');
      else if (s.meters.home <= 0) ending = this.findEnding((t) => t.meter === 'home' && (t.at || 'low') === 'low', 'meter:home');
      else if (trialOver) {
        ending = s.meters.joy >= CONFIG.winJoy
          ? this.findEnding((t) => t.win, 'win')
          : this.findEnding((t) => t.trialFail, 'trialFail');
      }
    } else {
      if (s.meters.home <= 0) {
        const remaining = (DAYS - s.day) * SLOTS.length + (SLOTS.length - 1 - s.slot);
        s.chaos += Math.max(0, remaining) * CONFIG.chaosDemolitionBonusPerSlot;
        ending = this.findEnding((t) => t.chaos === 'home', 'chaos:home');
      } else if (trialOver) ending = this.findEnding((t) => t.chaos === 'time', 'chaos:time');
    }

    if (ending) {
      result.ending = this.endRun(ending);
    } else {
      // crises
      for (const m of ['instinct', 'belly']) {
        const queued = s.crisisQueue.some((c) => c.meter === m);
        if (queued) continue;
        if (hit[m]) s.crisisQueue.push({ meter: m, dir: hit[m] });
      }
      const nxt = this.draw();
      s.card = nxt.id;
      s.cardIsCrisis = nxt.crisis;
      if (nxt.crisis) result.crisis = nxt.crisis;
    }
    result.achievements = this.checkAchievements();
    return result;
  }

  checkAchievements() {
    const s = this.state;
    const out = [];
    const res = s.over && s.ending ? s.ending : null;
    for (const id of s.activeAch) {
      if (s.achDone.includes(id)) continue;
      const a = this.data.achievements.find((x) => x.id === id);
      if (!a) continue;
      if (evalAll(a.goal || [], this.ctx(res))) { s.achDone.push(id); out.push(a); }
    }
    return out;
  }

  timeLabel() {
    return `Day ${this.state.day} · ${SLOT_LABELS[this.state.slot]}`;
  }

  stats() {
    const s = this.state;
    const daysSurvived = s.trialCompleted ? DAYS : Math.max(0, s.day - 1);
    return { swipes: s.swipe, day: s.day, slot: s.slot, daysSurvived, meters: { ...s.meters }, chaos: s.chaos };
  }
}
