// Boot, data loading and screen flow.
// Flow (docs/research-onboarding.md §8): title (tap) → trial file (NEXT) → deal → cards
// → ending card (tap) → "The / Trial / is over" → succession trial file (NEXT) → deal.
import { Engine, buildData, DAYS, fillText } from './engine.js';
import { createSwipe } from './swipe.js';
import * as storage from './storage.js';
import { prepareRun, ordinal, tagNumber, lifeLabel, runEpithet } from './onboarding.js';
import {
  $, esc, showScreen, hudIcons, buildMeters, renderMeters, setMetersDim, renderDots, renderCard,
  fadePrompt, endEnter, enterDuration, setLeaning, setBoard, renderFooter, goalList, showBanner, starBurst,
  portraitThumb, setCat, catHead, toast, reducedMotion, ICONS, segDigits,
} from './ui.js';

export const GAME_CONFIG = {
  difficultyMods: { easy: 0, normal: 1, hard: 2 },
  chaosUnlockEndings: 3,
  epithets: {
    win: ['the Adopted', 'the Kept', 'the Forever', 'the Beloved'],
    lose: ['the Returned', 'the Briefly Loved', 'the Unready', 'the Overdue', 'the Unreturnable'],
    chaos: ['the Destroyer', 'the Wrecking Ball', 'the Unbothered'],
  },
  titleStatus: ['KNOCKING THINGS OFF THE LOGO', 'ANTAGONIZING THE ROOMBA', 'WARMING UP THE LAPTOP',
    'COUNTING THE KIBBLE', 'SHEDDING ON THE GOOD COUCH', 'STARING AT A WALL'],
  titleStatusMs: 1500,
  titleReadyMs: 1200,
  overAutoMs: 4200,     // "The Trial is over" moves on by itself after a loss
  successionSlideMs: 1500,
  hintDelayMs: 600,     // after the first card lands
  hintRestMs: 1800,
};

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[nine-reigns] could not load ${url}: ${e.message}`);
    return null;
  }
}

export async function loadData() {
  const deck = params.get('deck') || 'data/cards/index.json';
  const deckBase = deck.slice(0, deck.lastIndexOf('/') + 1);
  const [index, characters, owners, endings, achievements, cosmetics] = await Promise.all([
    fetchJSON(deck), fetchJSON('data/characters.json'), fetchJSON('data/owners.json'),
    fetchJSON('data/endings.json'), fetchJSON('data/achievements.json'), fetchJSON('data/cosmetics.json'),
  ]);
  const files = (index && (index.files || (Array.isArray(index) ? index : []))) || [];
  const loaded = await Promise.all(files.map((f) => fetchJSON(deckBase + f)));
  const cards = [];
  loaded.forEach((file, i) => {
    const list = Array.isArray(file) ? file : file && Array.isArray(file.cards) ? file.cards : null;
    if (!list) { if (file) console.warn(`[nine-reigns] ${files[i]}: no "cards" array, skipped`); return; }
    for (const c of list) {
      if (c && c.id && c.char && (c.left || c.right)) cards.push(c);
      else console.warn(`[nine-reigns] ${files[i]}: invalid card skipped`, c && c.id);
    }
  });
  return {
    raw: { cards, characters, owners, endings, achievements },
    cosmetics: cosmetics || { coats: [], patterns: [], accessories: [] },
  };
}

// ---------- app ----------
const app = {
  data: null,
  cosmetics: null,
  engine: null,
  meta: null,
  swipe: null,
  beat: null,        // 'ending' while the ending card is on screen
  lastPrompt: '',    // narration cards keep the previous prompt (dimmed)
  banners: Promise.resolve(),
  returnTo: 'title', // where gallery/cosmetics go back to
  timers: {},
};

function later(name, fn, ms) {
  clearTimeout(app.timers[name]);
  app.timers[name] = setTimeout(fn, ms);
}
function cancel(name) { clearTimeout(app.timers[name]); }

function cosmeticUnlocked(item) {
  return !!item.unlocked || app.meta.unlocked.includes(item.id);
}

function lookFrom(sel, mood) {
  const c = app.cosmetics;
  const coat = (c.coats || []).find((x) => x.id === sel.coat) || (c.coats || [])[0];
  return { coat, pattern: sel.pattern, accessory: sel.accessory, mood };
}

function currentLook(mood) {
  const s = app.engine && app.engine.state;
  return lookFrom((s && s.profile && s.profile.cosmetic) || app.meta.cosmetic, mood);
}

// Who the parametric portraits (owner, partner) should look like this run.
function peopleFrom(s) {
  const p = s && s.profile;
  if (!p) return {};
  return { owner: p.owner && p.owner.id, ownerName: p.owner && p.owner.name, partner: p.partnerName };
}

function endingsSeenCount() { return Object.keys(app.meta.endingsSeen).length; }
function chaosUnlocked() { return endingsSeenCount() >= GAME_CONFIG.chaosUnlockEndings; }
function saveMeta() { storage.saveMeta(app.meta); }

// ---------- sound (optional, off by default) ----------
let audioCtx = null;
function blip(freq = 440, ms = 70, type = 'triangle', vol = 0.05) {
  if (!app.meta.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* no audio */ }
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

// ---------- names ----------
function epithetFor(e, name) {
  if (e.epithet) return e.epithet;
  const pool = GAME_CONFIG.epithets[e.kind] || GAME_CONFIG.epithets.lose;
  let h = 0;
  for (const ch of name + e.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

// "Biscuit the Kitten": the latest deed's epithet; at the end, the ending's if none.
function fullName(s) {
  const name = s.profile.catName;
  const ep = runEpithet(s, app.data.achievements) || (s.over && s.ending ? epithetFor(s.ending, name) : null);
  return ep ? `${name} ${ep}` : name;
}

function goalsView(s = app.engine.state) {
  return s.activeAch.map((id) => app.data.achievements.find((a) => a.id === id)).filter(Boolean)
    .map((a) => ({ ...a, desc: (a.desc || a.title).replace(/\.$/, ''), done: s.achDone.includes(a.id) }));
}

// ---------- title ----------
function renderTitle() {
  stopTitle();
  const bits = [];
  const total = app.data.endings.length;
  if (app.meta.adoptions) bits.push(`Adoptions ${app.meta.adoptions}`);
  if (app.meta.runs) bits.push(`Endings ${endingsSeenCount()}${total ? `/${total}` : ''}`);
  if (app.meta.chaosHigh) bits.push(`Chaos best ${app.meta.chaosHigh}`);
  $('title-foot').textContent = bits.join(' · ');
  const lines = GAME_CONFIG.titleStatus;
  let i = Math.floor(Math.random() * lines.length);
  $('title-status').textContent = lines[i];
  $('title-play').innerHTML = ICONS.down;
  $('title-play').classList.remove('ready');
  app.timers.titleStatus = setInterval(() => { i = (i + 1) % lines.length; $('title-status').textContent = lines[i]; }, GAME_CONFIG.titleStatusMs);
  later('titleReady', () => { $('title-play').innerHTML = ICONS.play; $('title-play').classList.add('ready'); }, reducedMotion() ? 0 : GAME_CONFIG.titleReadyMs);
  showScreen('title');
}
function stopTitle() { clearInterval(app.timers.titleStatus); cancel('titleReady'); }

function onTitleTap() {
  stopTitle();
  const s = app.engine && app.engine.state;
  if (s && s.over) showOver();
  else if (s && s.card === '__trial_file') showFile();
  else if (s) enterGame({ deal: true });
  else { startRun('normal'); showFile(); }
}

// ---------- runs ----------
function startRun(mode = 'normal', opts = {}) {
  const meta = app.meta;
  const newbie = meta.adoptions < 1;
  const modCount = mode === 'chaos' ? 1 : newbie ? 0 : (GAME_CONFIG.difficultyMods[meta.difficulty] ?? 1);
  app.engine = new Engine(app.data, { meta: { flags: meta.flags } });
  const seed = params.get('seed');
  app.engine.newRun({
    mode,
    modCount,
    seed: seed != null && !opts.ignoreSeed ? Number(seed) : undefined,
    cosmetic: { ...meta.cosmetic },
    firstRun: meta.runs === 0,
    firstWin: newbie,
    achievementsDone: meta.achievementsDone,
    ...opts.run,
  });
  prepareRun(app.engine, meta);
  storage.saveRun(app.engine.state);
  app.beat = null;
  app.lastPrompt = '';
}

// ---------- trial file (and succession) ----------
const TRACK_STEPS = DAYS;
function trackPos(day) { return Math.max(0, Math.min(1, day / TRACK_STEPS)); }

function setMarker(pos, animate) {
  const m = $('track-marker');
  m.style.transition = animate && !reducedMotion() ? `left ${GAME_CONFIG.successionSlideMs}ms cubic-bezier(.5,0,.3,1)` : 'none';
  m.style.left = `${(pos * 100).toFixed(2)}%`;
}

function fileOwnerLine(s) {
  const p = s.profile;
  if (s.mode === 'chaos') return `Chaos Mode · ${p.owner.name}'s ${p.home}`;
  const mods = p.mods.map((m) => ({ allergies: 'allergies', partner: `+ ${p.partnerName}`, dog: `+ ${p.dogName} the dog` }[m]));
  return [`${p.owner.name} · ${p.owner.quirkLabel}`, `${p.home[0].toUpperCase()}${p.home.slice(1)}${mods.length ? ` · ${mods.join(' · ')}` : ''}`]
    .map(esc).join('<br>');
}

function renderFileFor(s) {
  const p = s.profile;
  const n = p.catNo || 1;
  $('file-day').innerHTML = `<span class="file-day-label">Day</span>${segDigits(1)}`;
  $('track-cat').innerHTML = catHead(lookFrom(p.cosmetic || app.meta.cosmetic, 'happy'));
  $('file-name').textContent = p.catName;
  $('file-sub').textContent = n === 1 ? '0 days on trial' : `${ordinal(n)} Cat`;
  $('file-life').textContent = n === 1 ? '' : lifeLabel(n);
  $('file-meta').innerHTML = `<span class="file-tag">${ICONS.tag}<b>#${tagNumber(n)}</b></span><span class="file-owner">${fileOwnerLine(s)}</span>`;
  $('file-goals').innerHTML = goalList(goalsView(s));
  setMarker(trackPos(0.5), false);
}

// opts.prev: { name, days, day, won } of the cat that just finished → succession beat.
function showFile(opts = {}) {
  const s = app.engine.state;
  const screen = $('screen-file');
  $('track-ticks').innerHTML = Array.from({ length: TRACK_STEPS - 1 }, () => '<i></i>').join('');
  $('file-flash').textContent = '';
  $('file-flash').classList.remove('show');
  showScreen('file');
  const prev = opts.prev;
  if (!prev) {
    screen.classList.remove('passing');
    renderFileFor(s);
    return;
  }
  // Phase A: the old cat's marker slides back to the shelter (or on to the forever home).
  screen.classList.add('passing');
  $('file-day').innerHTML = `<span class="file-day-label">Day</span>${segDigits(prev.day)}`;
  $('track-cat').innerHTML = catHead(prev.look);
  $('file-name').textContent = prev.name;
  $('file-sub').textContent = prev.won ? 'Adopted' : `${prev.days} ${prev.days === 1 ? 'day' : 'days'} on trial`;
  $('file-life').textContent = '';
  $('file-meta').innerHTML = '';
  $('file-goals').innerHTML = '';
  setMarker(trackPos(prev.day - 0.5), false);
  const slide = () => setMarker(prev.won ? 1 : 0, true);
  const phaseB = () => {
    cancel('succA'); cancel('succB'); cancel('succSlide');
    screen.removeEventListener('pointerdown', skip);
    screen.classList.remove('passing');
    renderFileFor(s);
    const f = $('file-flash');
    f.textContent = 'Long live the Cat!';
    f.classList.remove('show');
    void f.offsetWidth;
    f.classList.add('show');
    blip(660, 180, 'sine', 0.05);
  };
  const skip = (e) => { if (!e.target.closest('button')) phaseB(); };
  screen.addEventListener('pointerdown', skip);
  if (reducedMotion()) { later('succB', phaseB, 900); return; }
  later('succSlide', slide, 350);
  later('succB', phaseB, 350 + GAME_CONFIG.successionSlideMs + 250);
}

function fileNext() {
  if (!app.engine) return;
  cancel('succB');
  const s = app.engine.state;
  if (s.card === '__trial_file') {
    app.engine.choose('right'); // the engine's own trial card: pure, no time or drift
    storage.saveRun(s);
  }
  enterGame({ deal: true });
}

// ---------- game ----------
function enterGame(opts = {}) {
  const s = app.engine.state;
  if (s.over) { showOver(); return; }
  if (s.card === '__trial_file') { app.engine.choose('right'); storage.saveRun(s); }
  showScreen('game');
  renderGame(opts.deal ? 'deal' : 'flip');
}

function footerView(s) {
  const st = app.engine.stats();
  return {
    name: fullName(s),
    days: st.daysSurvived,
    day: s.day,
    slot: s.slot,
    chaos: s.mode === 'chaos' ? s.chaos : null,
    goals: goalsView(s),
  };
}

function killerMeter(s) {
  const e = s.ending;
  if (!e) return null;
  const def = app.data.endingById[e.id];
  const t = def && def.trigger;
  if (t && t.meter) return t.meter;
  if (t && t.chaos === 'home') return 'home';
  if (e.kind !== 'win' && s.meters.joy <= 0) return 'joy';
  if (e.kind !== 'win' && s.meters.home <= 0) return 'home';
  return null;
}

function renderGame(animate, deltas) {
  const eng = app.engine;
  const s = eng.state;
  stopHint();
  renderMeters(s.meters, deltas, { off: s.mode === 'chaos' ? ['joy'] : [], killer: s.over ? killerMeter(s) : null, calm: s.over });
  renderDots(null);
  renderFooter(footerView(s));
  if (s.over) { renderEndingCard(animate); return; }
  setBoard(null);
  const view = eng.current();
  const ui = view.ui || {};
  const narration = view.char === 'narrator';
  setMetersDim(!!ui.dim, { delay: animate ? enterDuration(animate) * 0.5 : 0 });
  renderCard(view, {
    look: currentLook('happy'),
    people: peopleFrom(s),
    animate,
    narration,
    prompt: narration ? app.lastPrompt : null,
    promptDim: narration,
  });
  if (!narration) app.lastPrompt = view.text;
  app.swipe.arm();
  if (ui.hint) later('hintStart', startHint, enterDuration(animate) + GAME_CONFIG.hintDelayMs);
}

function renderEndingCard(animate) {
  const s = app.engine.state;
  const e = s.ending;
  const kind = e.kind;
  setMetersDim(false);
  setBoard(kind);
  const view = {
    text: e.text,
    left: { label: '…' }, right: { label: '…' },
    character: { id: 'cat', name: e.title, color: kind === 'win' ? '#fdeec0' : '#210f00' },
    crisis: null,
  };
  renderCard(view, { look: currentLook(), animate, ending: kind, people: peopleFrom(s) });
  app.beat = 'ending';
  app.swipe.arm();
}

function recordEnding() {
  const s = app.engine.state;
  const e = s.ending;
  const m = app.meta;
  m.endingsSeen[e.id] = (m.endingsSeen[e.id] || 0) + 1;
  m.runs += 1;
  if (e.kind === 'win') m.adoptions += 1;
  if (s.mode === 'chaos') m.chaosHigh = Math.max(m.chaosHigh, s.chaos);
  saveMeta();
}

function handleAchievements(list) {
  const s = app.engine.state;
  for (const a of list) {
    if (!app.meta.achievementsDone.includes(a.id)) app.meta.achievementsDone.push(a.id);
    const u = a.unlocks || {};
    let extra = '';
    if (u.cosmetic && !app.meta.unlocked.includes(u.cosmetic)) {
      app.meta.unlocked.push(u.cosmetic);
      extra = ' · new look under the bed';
    }
    if (u.flag) app.meta.flags[u.flag] = true;
    const top = a.epithet ? `${s.profile.catName} ${a.epithet}` : a.title;
    const deed = `${(a.desc || a.title).replace(/\.$/, '')}${extra}`;
    app.banners = app.banners.then(() => { blip(880, 160, 'sine', 0.06); return showBanner(top, deed); });
  }
  if (list.length) saveMeta();
}

function commit(side) {
  if (app.beat === 'ending') { showOver(); return; }
  const played = app.engine.getCard(app.engine.state.card);
  const res = app.engine.choose(side);
  if (!res) return;
  // Flash only what the choice itself touched (Reigns), not the passive drift.
  const fx = (played[side] && played[side].fx) || {};
  const flash = {};
  for (const m of Object.keys(res.deltas)) flash[m] = fx[m] ? res.deltas[m] || fx[m] : 0;
  storage.saveRun(app.engine.state);
  blip(side === 'left' ? 330 : 392, 60);
  buzz(8);
  if (res.events.includes('sneeze')) toast('Achoo! Allergies.');
  if (res.crisis) buzz(30);
  if (res.ending) {
    recordEnding();
    buzz([20, 40, 20]);
  }
  handleAchievements(res.achievements);
  renderGame('flip', flash);
}

// ---------- the first card's hand hint ----------
// The card drags itself left, right and back, twice, until the player touches it.
function startHint() {
  stopHint();
  const card = $('card');
  if (!card.isConnected || app.swipe.dragging) return;
  const hand = document.createElement('div');
  hand.className = 'hint-hand';
  hand.innerHTML = ICONS.hand;
  card.appendChild(hand);
  app.hint = { hand };
  if (reducedMotion()) { hand.classList.add('still'); return; }
  const w = card.getBoundingClientRect().width;
  const x = w * 0.3;
  const moves = [[-x, 560, 620], [x, 820, 620], [0, 560, 360], [-x, 560, 620], [x, 820, 620], [0, 560, GAME_CONFIG.hintRestMs]];
  let i = 0;
  const step = () => {
    if (!app.hint) return;
    const [to, ms, hold] = moves[i % moves.length];
    app.swipe.drive(to, ms);
    i++;
    later('hint', step, ms + hold);
  };
  step();
}

function stopHint() {
  cancel('hint'); cancel('hintStart');
  if (!app.hint) return;
  app.hint.hand.remove();
  app.hint = null;
}

// ---------- the end ----------
function showOver() {
  const s = app.engine.state;
  const e = s.ending;
  if (!e) { enterGame(); return; }
  app.beat = null;
  stopHint();
  const kind = e.kind;
  const words = kind === 'win' ? ["You're", 'Adopted!', 'for good'] : kind === 'chaos' ? ['The', 'Chaos', 'is over'] : ['The', 'Trial', 'is over'];
  $('over-stack').innerHTML = words.map((w, i) => `<span class="s${i + 1}">${esc(w)}</span>`).join('');
  $('over-stack').setAttribute('aria-label', words.join(' '));
  const n = s.profile.catNo || 1;
  $('over-tag').innerHTML = `${kind === 'win' ? ICONS.collar : kind === 'chaos' ? ICONS.chaos : ICONS.tag}<b>#${tagNumber(n)}</b>`;
  $('over-name').textContent = fullName(s);
  const last = s.trialCompleted ? DAYS : s.day;
  $('over-days').textContent = s.mode === 'chaos'
    ? `Chaos ${s.chaos} · best ${app.meta.chaosHigh}`
    : `Day 1 – Day ${last}`;
  $('over-title').textContent = e.title;
  const screen = $('screen-over');
  screen.classList.remove('win', 'lose', 'chaos');
  screen.classList.add(kind);
  $('over-stars').innerHTML = kind === 'win' ? starBurst(22) : '';
  showScreen('over');
  app.overShownAt = performance.now();
  if (kind !== 'win') later('overAuto', goSuccession, GAME_CONFIG.overAutoMs);
}

function goSuccession() {
  cancel('overAuto');
  const s = app.engine && app.engine.state;
  if (!s) { renderTitle(); return; }
  const st = app.engine.stats();
  const prev = {
    name: fullName(s),
    days: st.daysSurvived,
    day: s.trialCompleted ? DAYS : s.day,
    won: !!(s.ending && s.ending.kind === 'win'),
    look: lookFrom(s.profile.cosmetic || app.meta.cosmetic, 'happy'),
  };
  storage.clearRun();
  startRun('normal', { ignoreSeed: true });
  showFile({ prev });
}

// ---------- swipe + keys ----------
function setupSwipe() {
  app.swipe = createSwipe($('card'), {
    onStart() { stopHint(); endEnter(); },
    onMove(side) {
      setLeaning(!!side && app.beat !== 'ending');
      if (!app.engine || app.beat === 'ending' || !side) { renderDots(null); return; }
      renderDots(app.engine.preview(side));
    },
    onCancel() { renderDots(null); setLeaning(false); },
    onCommit(side) { renderDots(null); commit(side); },
    onTap() { if (app.beat === 'ending') showOver(); },
    // The prompt fades out while the card leaves; the next one fades in during the flip.
    onFly() { if (app.beat !== 'ending') fadePrompt(); },
  });
  const press = (side) => {
    if (document.body.dataset.screen !== 'game' || !$('modal-menu').hidden) return;
    app.swipe.commit(side);
  };
  $('btn-left').addEventListener('click', () => press('left'));
  $('btn-right').addEventListener('click', () => press('right'));
  const hover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (hover) {
    for (const [id, side] of [['btn-left', 'left'], ['btn-right', 'right']]) {
      $(id).addEventListener('mouseenter', () => app.swipe.lean(side));
      $(id).addEventListener('mouseleave', () => { if (!app.swipe.locked) app.swipe.reset(); });
    }
  }

  document.addEventListener('keydown', (e) => {
    const screen = document.body.dataset.screen;
    const modalOpen = !$('modal-menu').hidden || !$('modal-settings').hidden;
    if (modalOpen) {
      if (e.key === 'Escape') closeModals();
      return;
    }
    if (screen === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onTitleTap(); return; }
    if (screen === 'over' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); overNext(); return; }
    if (screen !== 'game') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.repeat) return;
      const side = e.key === 'ArrowLeft' ? 'left' : 'right';
      if (app.beat === 'ending') { showOver(); return; }
      // First press previews, second press commits.
      if (app.swipe.leaned === side) app.swipe.commit(side);
      else app.swipe.lean(side);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (app.beat === 'ending') { e.preventDefault(); showOver(); return; }
      if (app.swipe.leaned) { e.preventDefault(); app.swipe.commit(app.swipe.leaned); }
    } else if (e.key === 'Escape') {
      app.swipe.reset();
    }
  });
}

function overNext() {
  if (app.engine && app.engine.state && app.engine.state.over) goSuccession();
}

// ---------- gallery & cosmetics ----------
function renderGallery() {
  const seen = app.meta.endingsSeen;
  const endings = app.data.endings;
  $('gallery-sub').textContent = `${endingsSeenCount()} of ${endings.length} endings seen${chaosUnlocked() ? '' : ` · Chaos Mode unlocks at ${GAME_CONFIG.chaosUnlockEndings}`}`;
  $('gallery').innerHTML = endings.map((e) => {
    const ch = app.data.characters[e.char] || {};
    const isSeen = !!seen[e.id];
    return `<div class="g-item${isSeen ? '' : ' unseen'}">${portraitThumb(e.char, ch.color, { owner: 'albert', ownerName: 'Albert' })}
      <span class="g-kind">${esc(e.kind)}</span><span class="g-title">${isSeen ? esc(e.title) : '???'}</span></div>`;
  }).join('') || '<p class="list-sub">No endings loaded.</p>';
  $('ach-list').innerHTML = app.data.achievements.filter((a) => a.mode !== 'chaos' || chaosUnlocked()).map((a) => {
    const done = app.meta.achievementsDone.includes(a.id);
    return `<li class="${done ? 'done' : 'locked'}"><span class="box">${done ? ICONS.check : ''}</span><span><b>${esc(a.epithet ? `${a.epithet}` : a.title)}</b><small>${esc(a.desc || '')}</small></span></li>`;
  }).join('');
  showScreen('gallery');
}

function unlockHint(id) {
  const a = app.data.achievements.find((x) => x.unlocks && x.unlocks.cosmetic === id);
  return a ? `Unlock: ${a.desc || a.title}` : 'Locked';
}

function renderCosmetics() {
  const c = app.cosmetics;
  const sel = app.meta.cosmetic;
  $('cos-preview').innerHTML = '';
  setCat('cos-preview', lookFrom(sel, 'happy'));
  const groups = [['coat', 'Coat', c.coats || []], ['pattern', 'Pattern', c.patterns || []], ['accessory', 'Accessory', c.accessories || []]];
  $('cos-groups').innerHTML = groups.map(([key, label, items]) => `<div class="cos-group"><h3>${label}</h3><div class="cos-opts">${
    items.map((it) => {
      const ok = cosmeticUnlocked(it);
      const sw = key === 'coat' ? `<span class="swatch" style="background:${esc(it.fur)}"></span>` : '';
      return `<button class="cos-opt" data-key="${key}" data-id="${esc(it.id)}" aria-pressed="${sel[key] === it.id}" ${ok ? '' : `disabled title="${esc(unlockHint(it.id))}"`}>${sw}${esc(it.name)}</button>`;
    }).join('')}</div></div>`).join('');
  showScreen('cosmetics');
}

// The pending run (still on its trial file) wears the newly picked look.
function syncPendingCosmetic() {
  const s = app.engine && app.engine.state;
  if (s && !s.over && s.card === '__trial_file') {
    s.profile.cosmetic = { ...app.meta.cosmetic };
    storage.saveRun(s);
  }
}

function goBack() {
  if (app.returnTo === 'file' && app.engine) showFile();
  else if (app.returnTo === 'over' && app.engine && app.engine.state.over) showOver();
  else renderTitle();
}

// ---------- modals ----------
function renderSettings() {
  const pending = app.engine && app.engine.state && !app.engine.state.over && app.engine.state.card === '__trial_file';
  $('btn-sound').textContent = `Sound: ${app.meta.settings.sound ? 'on' : 'off'}`;
  $('btn-sound').setAttribute('aria-pressed', String(app.meta.settings.sound));
  $('difficulty').hidden = app.meta.adoptions < 1;
  for (const b of document.querySelectorAll('#difficulty .seg')) {
    b.setAttribute('aria-checked', String(b.dataset.diff === app.meta.difficulty));
  }
  const chaosOk = chaosUnlocked() && pending;
  $('btn-chaos').hidden = !chaosOk;
  if (chaosOk) $('btn-chaos').textContent = app.engine.state.mode === 'chaos' ? 'Back to a normal trial' : 'Chaos Mode';
}

function openSettings() { renderSettings(); $('modal-settings').hidden = false; }
function closeModals() { $('modal-settings').hidden = true; $('modal-menu').hidden = true; }

// Re-roll a run that hasn't started yet (difficulty / mode changed on the trial file).
function rerollPending(mode) {
  const s = app.engine && app.engine.state;
  if (!s || s.over || s.card !== '__trial_file') return;
  startRun(mode, { ignoreSeed: true, run: { catName: s.profile.catName } });
  showFile();
}

// ---------- wiring ----------
function wire() {
  $('btn-start').addEventListener('click', onTitleTap);
  $('btn-file-next').addEventListener('click', fileNext);
  $('btn-over-next').addEventListener('click', (e) => { e.stopPropagation(); overNext(); });
  // (ignore the click that finishes the tap which opened this screen)
  $('screen-over').addEventListener('click', (e) => {
    if (!e.target.closest('button') && performance.now() - (app.overShownAt || 0) > 450) overNext();
  });
  for (const nav of document.querySelectorAll('.hud-icons')) {
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-hud]');
      if (!b) return;
      cancel('overAuto'); cancel('succB'); cancel('succSlide');
      app.returnTo = document.body.dataset.screen;
      if (b.dataset.hud === 'gallery') renderGallery();
      else if (b.dataset.hud === 'cosmetics') renderCosmetics();
      else openSettings();
    });
  }
  for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', goBack);
  $('btn-sound').addEventListener('click', () => {
    app.meta.settings.sound = !app.meta.settings.sound;
    saveMeta();
    renderSettings();
    blip(523, 90);
  });
  $('difficulty').addEventListener('click', (e) => {
    const b = e.target.closest('.seg');
    if (!b) return;
    app.meta.difficulty = b.dataset.diff;
    saveMeta();
    renderSettings();
    if (document.body.dataset.screen === 'file') rerollPending(app.engine.state.mode);
  });
  $('btn-chaos').addEventListener('click', () => {
    closeModals();
    rerollPending(app.engine.state.mode === 'chaos' ? 'normal' : 'chaos');
  });
  $('btn-settings-close').addEventListener('click', closeModals);
  for (const m of [$('modal-settings'), $('modal-menu')]) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
  $('cos-groups').addEventListener('click', (e) => {
    const b = e.target.closest('.cos-opt');
    if (!b || b.disabled) return;
    app.meta.cosmetic[b.dataset.key] = b.dataset.id;
    saveMeta();
    syncPendingCosmetic();
    renderCosmetics();
  });
  $('btn-menu').addEventListener('click', () => {
    if (!app.engine) return;
    $('menu-goals').innerHTML = goalList(goalsView());
    $('modal-menu').hidden = false;
  });
  $('btn-resume').addEventListener('click', closeModals);
  $('btn-quit').addEventListener('click', () => { closeModals(); renderTitle(); });
  $('btn-abandon').addEventListener('click', () => {
    closeModals();
    storage.clearRun();
    app.engine = null;
    renderTitle();
  });
}

function sanitizeCosmetic() {
  const c = app.cosmetics;
  const sel = app.meta.cosmetic;
  const fix = (key, items, dflt) => {
    const it = items.find((x) => x.id === sel[key]);
    if (!it || !cosmeticUnlocked(it)) sel[key] = (items.find(cosmeticUnlocked) || { id: dflt }).id;
  };
  fix('coat', c.coats || [], 'orange');
  fix('pattern', c.patterns || [], 'none');
  fix('accessory', c.accessories || [], 'none');
}

async function boot() {
  if (params.has('reset')) storage.resetAll();
  const { raw, cosmetics } = await loadData();
  app.data = buildData(raw);
  app.cosmetics = cosmetics;
  app.meta = storage.loadMeta();
  sanitizeCosmetic();
  buildMeters();
  hudIcons();
  setupSwipe();
  wire();
  const saved = storage.loadRun();
  if (saved && saved.profile && saved.meters) {
    app.engine = new Engine(app.data, { meta: { flags: app.meta.flags } });
    app.engine.load(saved);
  }
  $('loading').hidden = true;
  if (app.engine && params.has('resume')) onTitleTap();
  else renderTitle();

  if (DEBUG) {
    window.__game = {
      app,
      get engine() { return app.engine; },
      get state() { return app.engine && app.engine.state; },
      start(mode = 'normal', run = {}) { startRun(mode, { run }); enterGame({ deal: true }); },
      choose(side) { commit(side); },
      swipe(side) { return app.swipe.commit(side); },
      set(meters) { Object.assign(app.engine.state.meters, meters); renderGame(false); },
      meta: () => app.meta,
      fill: fillText,
      screen: () => document.body.dataset.screen,
    };
    document.body.dataset.debug = '1';
  }
}

boot().catch((e) => {
  console.error(e);
  const l = $('loading');
  l.hidden = false;
  l.textContent = 'Something went wrong loading the game. Try reloading.';
});
