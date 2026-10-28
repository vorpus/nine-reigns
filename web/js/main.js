// Boot, data loading and screen flow.
import { Engine, buildData, METERS, DAYS, fillText } from './engine.js';
import { createSwipe } from './swipe.js';
import * as storage from './storage.js';
import { $, esc, showScreen, buildMeters, renderMeters, renderDots, renderCard, renderGoals, toast, setCat, setLeaning, portraitThumb, UI_CONFIG } from './ui.js';
import { meterSVG } from './portraits.js';

export const GAME_CONFIG = {
  difficultyMods: { easy: 0, normal: 1, hard: 2 },
  chaosUnlockEndings: 3,
  epithets: {
    win: ['the Adopted', 'the Kept', 'the Forever', 'the Beloved'],
    lose: ['the Returned', 'the Briefly Loved', 'the Unready', 'the Overdue', 'the Unreturnable'],
    chaos: ['the Destroyer', 'the Wrecking Ball', 'the Unbothered'],
  },
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
  beat: null, // 'ending' while the ending card is on screen
  busy: false,
};

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

// ---------- title ----------
function renderTitle() {
  const saved = app.engine && app.engine.state && !app.engine.state.over;
  $('btn-continue').hidden = !saved;
  $('btn-continue').classList.toggle('btn-primary', !!saved);
  $('btn-play').classList.toggle('btn-primary', !saved);
  $('btn-play').style.order = saved ? '1' : '';
  $('btn-play').textContent = saved ? 'New cat' : 'Play';
  $('btn-chaos').hidden = !chaosUnlocked();
  $('difficulty').hidden = app.meta.adoptions < 1;
  for (const b of document.querySelectorAll('#difficulty .seg')) {
    b.setAttribute('aria-checked', String(b.dataset.diff === app.meta.difficulty));
  }
  $('btn-sound').textContent = app.meta.settings.sound ? '🔊' : '🔇';
  $('btn-sound').setAttribute('aria-pressed', String(app.meta.settings.sound));
  const total = app.data.endings.length;
  const bits = [];
  if (app.meta.adoptions) bits.push(`Adoptions: ${app.meta.adoptions}`);
  if (app.meta.runs) bits.push(`Endings seen: ${endingsSeenCount()}${total ? `/${total}` : ''}`);
  if (app.meta.chaosHigh) bits.push(`Chaos best: ${app.meta.chaosHigh}`);
  $('title-foot').textContent = bits.join(' · ');
  setCat('title-cat', lookFrom(app.meta.cosmetic, 'happy'));
  showScreen('title');
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
  storage.saveRun(app.engine.state);
  app.beat = null;
}

function showArrive() {
  const p = app.engine.state.profile;
  setCat('arrive-cat', currentLook('happy'));
  $('arrive-name').textContent = p.catName;
  $('arrive-sub').textContent = app.engine.state.mode === 'chaos'
    ? `has been released into ${p.owner.name}'s ${p.home}. Chaos Mode.`
    : `is going home with ${p.owner.name} on a two-week trial.`;
  showScreen('arrive');
}

function enterGame() {
  showScreen('game');
  renderGame(true);
}

function goalsView() {
  const s = app.engine.state;
  return s.activeAch.map((id) => app.data.achievements.find((a) => a.id === id)).filter(Boolean)
    .map((a) => ({ ...a, done: s.achDone.includes(a.id) }));
}

function renderGame(animate, deltas) {
  const eng = app.engine;
  const s = eng.state;
  renderMeters(s.meters, deltas, { off: s.mode === 'chaos' ? ['joy'] : [] });
  renderDots(null);
  $('cat-name').textContent = s.profile.catName;
  $('time').textContent = s.mode === 'chaos' ? `${eng.timeLabel()} · Chaos ${s.chaos}` : eng.timeLabel();
  renderGoals(goalsView());
  if (s.over) { renderEndingCard(animate); return; }
  renderCard(eng.current(), currentLook('happy'), { animate, people: peopleFrom(s) });
  app.swipe.arm();
}

function renderEndingCard(animate) {
  const s = app.engine.state;
  const e = s.ending;
  const ch = app.data.characters[e.char] || {};
  const view = {
    text: e.text,
    left: { label: '…' }, right: { label: '…' },
    character: { id: e.char, name: e.title, emoji: ch.emoji || '📋', color: ch.color || '#d8ccb4' },
    crisis: null,
  };
  renderCard(view, currentLook(e.kind === 'win' ? 'happy' : 'sad'), { animate, badge: 'THE END', people: peopleFrom(s) });
  app.beat = 'ending';
  app.swipe.arm();
}

function epithetFor(e, name) {
  if (e.epithet) return e.epithet;
  const pool = GAME_CONFIG.epithets[e.kind] || GAME_CONFIG.epithets.lose;
  let h = 0;
  for (const ch of name + e.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
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

function showEndingScreen() {
  const eng = app.engine;
  const s = eng.state;
  const e = s.ending;
  const st = eng.stats();
  const kind = $('ending-kind');
  kind.className = `ending-kind ${e.kind}`;
  kind.textContent = e.kind === 'win' ? 'Adopted' : e.kind === 'chaos' ? 'Chaos Mode' : 'Back to the shelter';
  setCat('ending-cat', currentLook(e.kind === 'lose' ? 'sad' : 'smug'));
  $('ending-epithet').textContent = `${s.profile.catName} ${epithetFor(e, s.profile.catName)}`;
  $('ending-days').textContent = s.mode === 'chaos'
    ? `Chaos score ${s.chaos} · best ${app.meta.chaosHigh}`
    : e.kind === 'win' ? `Adopted after ${DAYS} days with ${s.profile.owner.name}`
      : `Survived ${st.daysSurvived} day${st.daysSurvived === 1 ? '' : 's'} with ${s.profile.owner.name}`;
  $('ending-title').textContent = e.title;
  $('ending-text').textContent = e.text;
  $('ending-stats').innerHTML = METERS.map((m) => `<div class="stat" title="${UI_CONFIG.meterNames[m]}"><span class="stat-icon">${meterSVG(m)}</span><span class="stat-bar"><i style="width:${s.meters[m]}%"></i></span></div>`).join('');
  $('ending-ach').innerHTML = goalsView().map((a) => `<li class="${a.done ? 'done' : 'todo'}">${a.done ? '✔' : '○'} ${esc(a.icon || '')} ${esc(a.title)}</li>`).join('');
  app.beat = null;
  showScreen('ending');
}

function handleAchievements(list) {
  for (const a of list) {
    if (!app.meta.achievementsDone.includes(a.id)) app.meta.achievementsDone.push(a.id);
    const u = a.unlocks || {};
    let extra = '';
    if (u.cosmetic && !app.meta.unlocked.includes(u.cosmetic)) {
      app.meta.unlocked.push(u.cosmetic);
      extra = ' · new look unlocked';
    }
    if (u.flag) app.meta.flags[u.flag] = true;
    toast(`${a.icon || '⭐'} ${a.title}${extra}`);
    blip(880, 160, 'sine', 0.06);
  }
  if (list.length) saveMeta();
}

function commit(side) {
  if (app.beat === 'ending') {
    showEndingScreen();
    return;
  }
  const res = app.engine.choose(side);
  if (!res) return;
  storage.saveRun(app.engine.state);
  blip(side === 'left' ? 330 : 392, 60);
  buzz(8);
  if (res.events.includes('sneeze')) toast('🤧 Achoo! Allergies.');
  if (res.crisis) buzz(30);
  handleAchievements(res.achievements);
  if (res.ending) {
    recordEnding();
    buzz([20, 40, 20]);
  }
  renderGame(true, res.deltas);
}

function setupSwipe() {
  app.swipe = createSwipe($('card'), {
    onMove(side) {
      setLeaning(!!side);
      if (!app.engine || app.beat === 'ending' || !side) { renderDots(null); return; }
      renderDots(app.engine.preview(side));
    },
    onCancel() { renderDots(null); setLeaning(false); },
    onCommit(side) { renderDots(null); commit(side); },
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
    if (document.body.dataset.screen !== 'game' || !$('modal-menu').hidden) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.repeat) return;
      const side = e.key === 'ArrowLeft' ? 'left' : 'right';
      // First press previews, second press commits.
      if (app.swipe.leaned === side) app.swipe.commit(side);
      else app.swipe.lean(side);
    } else if ((e.key === 'Enter' || e.key === ' ') && app.swipe.leaned) {
      e.preventDefault();
      app.swipe.commit(app.swipe.leaned);
    } else if (e.key === 'Escape') {
      app.swipe.reset();
    }
  });
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
  $('ach-list').innerHTML = app.data.achievements.map((a) => {
    const done = app.meta.achievementsDone.includes(a.id);
    return `<li class="${done ? 'done' : 'locked'}"><span class="a-icon">${esc(a.icon || '⭐')}</span><span>${esc(a.title)}<small>${esc(a.desc || '')}</small></span></li>`;
  }).join('');
  showScreen('gallery');
}

function unlockHint(id) {
  const a = app.data.achievements.find((x) => x.unlocks && x.unlocks.cosmetic === id);
  return a ? `Unlock: ${a.title}` : 'Locked';
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
      return `<button class="cos-opt" data-key="${key}" data-id="${esc(it.id)}" aria-pressed="${sel[key] === it.id}" ${ok ? '' : `disabled title="${esc(unlockHint(it.id))}"`}>${sw}${ok ? '' : '🔒 '}${esc(it.name)}</button>`;
    }).join('')}</div></div>`).join('');
  showScreen('cosmetics');
}

// ---------- wiring ----------
function wire() {
  $('btn-play').addEventListener('click', () => {
    const first = app.meta.runs === 0;
    startRun('normal');
    if (first) enterGame(); else showArrive();
  });
  $('btn-continue').addEventListener('click', enterGame);
  $('btn-chaos').addEventListener('click', () => { startRun('chaos'); showArrive(); });
  $('btn-arrive').addEventListener('click', enterGame);
  $('btn-next').addEventListener('click', () => { storage.clearRun(); startRun('normal', { ignoreSeed: true }); showArrive(); });
  $('btn-ending-title').addEventListener('click', () => { storage.clearRun(); app.engine = null; renderTitle(); });
  $('btn-gallery').addEventListener('click', renderGallery);
  $('btn-cosmetics').addEventListener('click', renderCosmetics);
  $('btn-sound').addEventListener('click', () => {
    app.meta.settings.sound = !app.meta.settings.sound;
    saveMeta();
    renderTitle();
    blip(523, 90);
  });
  $('difficulty').addEventListener('click', (e) => {
    const b = e.target.closest('.seg');
    if (!b) return;
    app.meta.difficulty = b.dataset.diff;
    saveMeta();
    renderTitle();
  });
  for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', renderTitle);
  $('cos-groups').addEventListener('click', (e) => {
    const b = e.target.closest('.cos-opt');
    if (!b || b.disabled) return;
    app.meta.cosmetic[b.dataset.key] = b.dataset.id;
    saveMeta();
    renderCosmetics();
  });
  $('btn-menu').addEventListener('click', () => { $('modal-menu').hidden = false; });
  $('btn-resume').addEventListener('click', () => { $('modal-menu').hidden = true; });
  $('btn-quit').addEventListener('click', () => { $('modal-menu').hidden = true; renderTitle(); });
  $('btn-abandon').addEventListener('click', () => {
    $('modal-menu').hidden = true;
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
  setupSwipe();
  wire();
  const saved = storage.loadRun();
  if (saved && saved.profile && saved.meters) {
    app.engine = new Engine(app.data, { meta: { flags: app.meta.flags } });
    app.engine.load(saved);
  }
  $('loading').hidden = true;
  if (app.engine && app.engine.state.over) showEndingScreen();
  else if (app.engine && params.has('resume')) enterGame();
  else renderTitle();

  if (DEBUG) {
    window.__game = {
      app,
      get engine() { return app.engine; },
      get state() { return app.engine && app.engine.state; },
      start(mode = 'normal', run = {}) { startRun(mode, { run }); enterGame(); },
      choose(side) { commit(side); },
      swipe(side) { return app.swipe.commit(side); },
      set(meters) { Object.assign(app.engine.state.meters, meters); renderGame(false); },
      meta: () => app.meta,
      fill: fillText,
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
