// DOM rendering helpers. No game rules here.
import { catSVG } from './catsvg.js';
import { portrait, meterSVG, METER_SPAN } from './portraits.js';
import { ICONS, segDigits, carrierOverlay } from './icons.js';

export const UI_CONFIG = {
  meterIcons: { joy: '❤️', home: '🏠', instinct: '🐾', belly: '🐟' }, // text fallback only; meters draw meterSVG()
  meterNames: { joy: 'Joy', home: 'Home', instinct: 'Instinct', belly: 'Belly' },
  slotIcons: ['morning', 'afternoon', 'evening', 'night'],
  slotNames: ['Morning', 'Afternoon', 'Evening', 'Night'],
  dangerLow: 15,
  dangerHigh: 85,
  toastMs: 2600,
  flipMs: 380,      // next card flips on its vertical axis (Reigns ~0.35–0.40 s)
  dealStagger: 150, // 3 card backs dealt this far apart at the start of a run
  dealMs: 260,
  flashMs: 1000,    // meter flash: hold ~0.3 s, fade ~0.7 s (see .meter.up/.down in style.css)
  lightStagger: 120, // meters switch on one by one after the tutorial
  bannerMs: 3600,
};

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "*word*" in card text is a key noun, shown in red (Reigns' first prompt).
export const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em class="hl">$1</em>');
export const plain = (s) => String(s == null ? '' : s).replace(/\*/g, '');

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

const SCREENS = ['title', 'file', 'game', 'over', 'gallery', 'cosmetics'];
export function showScreen(name) {
  for (const s of SCREENS) $(`screen-${s}`).hidden = s !== name;
  document.body.dataset.screen = name;
}

export function hudIcons() {
  for (const nav of document.querySelectorAll('.hud-icons')) {
    nav.innerHTML = `<button class="hud-btn" data-hud="gallery" aria-label="Memento Meowri (endings)">${ICONS.book}</button>`
      + `<button class="hud-btn" data-hud="cosmetics" aria-label="Under the Bed (your cat)">${ICONS.cat}</button>`
      + `<button class="hud-btn" data-hud="settings" aria-label="Settings">${ICONS.gear}</button>`;
  }
  for (const b of document.querySelectorAll('[data-back]')) b.innerHTML = ICONS.back;
  $('btn-left').innerHTML = ICONS.left;
  $('btn-right').innerHTML = ICONS.right;
  for (const n of document.querySelectorAll('.next-dot')) n.innerHTML = ICONS.next;
  for (const n of document.querySelectorAll('.track-shelter')) n.innerHTML = ICONS.shelter;
  for (const n of document.querySelectorAll('.track-home')) n.innerHTML = ICONS.home;
}

// ---------- meters ----------
export function buildMeters() {
  const wrap = $('meters');
  wrap.innerHTML = '';
  for (const m of Object.keys(UI_CONFIG.meterIcons)) {
    const el = document.createElement('div');
    el.className = 'meter';
    el.dataset.meter = m;
    el.setAttribute('role', 'meter');
    el.setAttribute('aria-label', UI_CONFIG.meterNames[m]);
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.innerHTML = `<div class="meter-dot"></div><div class="meter-icon">${meterSVG(m, 'meter-empty')}${meterSVG(m, 'meter-full')}</div><div class="meter-mark">${ICONS.cross}</div>`;
    wrap.appendChild(el);
  }
  $('title-band').innerHTML = Object.keys(UI_CONFIG.meterIcons).map((m) => meterSVG(m)).join('');
}

// Fill-only display. The icon's bright copy is clipped from the top so the
// fill rises from the bottom of the silhouette (Reigns style).
export function renderMeters(meters, deltas, opts = {}) {
  for (const el of document.querySelectorAll('.meter')) {
    const m = el.dataset.meter;
    const v = meters[m];
    el.style.setProperty('--clip', `${meterClip(m, v).toFixed(1)}%`);
    el.setAttribute('aria-valuenow', String(Math.round(v)));
    el.classList.toggle('off', !!(opts.off && opts.off.includes(m)));
    el.classList.toggle('killer', opts.killer === m);
    const lowDanger = v <= UI_CONFIG.dangerLow;
    const highDanger = (m === 'instinct' || m === 'belly') && v >= UI_CONFIG.dangerHigh;
    el.classList.toggle('danger', !opts.calm && (lowDanger || highDanger));
    const d = deltas ? deltas[m] : 0;
    if (d) {
      el.classList.remove('up', 'down');
      void el.offsetWidth; // restart animation
      el.classList.add(d > 0 ? 'up' : 'down');
      clearTimeout(el._flash);
      el._flash = setTimeout(() => el.classList.remove('up', 'down'), UI_CONFIG.flashMs);
    }
  }
}

// Meters are "off" (dim brown) during the tutorial and switch on one by one.
export function setMetersDim(dim, opts = {}) {
  const els = [...document.querySelectorAll('.meter')];
  const wasDim = els.some((el) => el.classList.contains('dim'));
  els.forEach((el, i) => {
    clearTimeout(el._light);
    if (dim) { el.classList.add('dim'); el.classList.remove('lighting'); return; }
    if (!wasDim) { el.classList.remove('dim'); return; }
    const delay = (opts.delay || 0) + (reducedMotion() ? 0 : i * UI_CONFIG.lightStagger);
    el._light = setTimeout(() => {
      el.classList.remove('dim');
      el.classList.add('lighting');
      setTimeout(() => el.classList.remove('lighting'), 700);
    }, delay);
  });
}

// Top inset (in %) for the fill clip: the silhouette's own top..bottom span
// maps to 100..0. A sliver stays visible at 0.
export function meterClip(m, v) {
  const [top, bottom] = METER_SPAN[m] || [0, 100];
  const t = Math.max(0, Math.min(100, v)) / 100;
  return bottom - (bottom - top) * (0.03 + 0.97 * t);
}

export function renderDots(preview) {
  for (const el of document.querySelectorAll('.meter')) {
    const dot = el.querySelector('.meter-dot');
    const size = preview && !el.classList.contains('dim') ? preview[el.dataset.meter] : null;
    dot.className = `meter-dot${size ? ` ${size}` : ''}`;
  }
}

// ---------- prompt + card ----------
export function fadePrompt() {
  $('prompt').classList.add('out');
}

export function setPrompt(text, opts = {}) {
  const el = $('prompt');
  el.innerHTML = rich(text);
  el.classList.toggle('dim', !!opts.dim);
  el.classList.toggle('caption', !!opts.caption);
  // Long text (endings run to ~300 chars) steps the size down so it fits the band.
  const n = plain(text).length;
  el.classList.toggle('long', n > 150 && n <= 220);
  el.classList.toggle('xlong', n > 220);
  el.classList.remove('out', 'in');
  if (opts.animate && !reducedMotion()) { void el.offsetWidth; el.classList.add('in'); }
}

// view: engine.current() shape, or an ending view.
// opts: { look, people, animate: 'flip' | 'deal' | false, narration, ending: 'lose'|'win'|'chaos',
//         prompt (override text), promptDim }
export function renderCard(view, opts = {}) {
  const card = $('card');
  const narration = !!opts.narration;
  setPrompt(opts.prompt != null ? opts.prompt : view.text, {
    dim: !!opts.promptDim,
    caption: !!opts.ending,
    animate: !!opts.animate && !opts.promptDim,
  });
  $('choice-left').textContent = plain(view.left.label);
  $('choice-right').textContent = plain(view.right.label);
  $('char-name').textContent = narration ? '' : plain(view.character.name);
  card.style.setProperty('--card-color', view.character.color);
  card.classList.toggle('crisis', !!view.crisis);
  card.classList.toggle('narration', narration);
  card.classList.remove('ending-lose', 'ending-win', 'ending-chaos');
  if (opts.ending) card.classList.add(`ending-${opts.ending}`);
  card.setAttribute('aria-label', narration
    ? `${plain(view.text)} Left: ${plain(view.left.label)}. Right: ${plain(view.right.label)}.`
    : `${plain(view.character.name)}. Left: ${plain(view.left.label)}. Right: ${plain(view.right.label)}.`);
  const el = $('portrait');
  card.classList.remove('leaning');
  if (narration) {
    el.innerHTML = `<div class="narration-text">${rich(view.text)}</div>`;
  } else if (opts.ending) {
    const mood = opts.ending === 'win' ? 'happy' : 'smug';
    el.innerHTML = `<div class="pf pf-neutral">${catSVG({ ...opts.look, mood })}</div>${opts.ending === 'lose' ? carrierOverlay() : ''}`;
  } else {
    const p = { ...(opts.people || {}), look: opts.look, title: plain(view.character.name) };
    const neutral = portrait(view.character.id, p);
    if (neutral) {
      const drag = portrait(view.character.id, { ...p, expression: 'drag' });
      el.innerHTML = `<div class="pf pf-neutral">${neutral}</div><div class="pf pf-drag" aria-hidden="true">${drag}</div>`;
    } else {
      el.innerHTML = `<span class="pf-emoji" aria-hidden="true">${esc(view.character.emoji)}</span>`;
    }
  }
  $('btn-left').setAttribute('aria-label', `Left: ${plain(view.left.label)}`);
  $('btn-right').setAttribute('aria-label', `Right: ${plain(view.right.label)}`);
  playEnter(opts.animate);
}

// Card arrival: 'deal' slides three backs in (150 ms apart) then flips the top
// one; 'flip' just flips. Both are skipped under prefers-reduced-motion.
let enterTimer = null;
function playEnter(mode) {
  const stage = $('stage');
  const card = $('card');
  clearTimeout(enterTimer);
  stage.classList.remove('dealing');
  card.classList.remove('enter');
  if (!mode || reducedMotion()) return;
  void card.offsetWidth;
  if (mode === 'deal') stage.classList.add('dealing');
  card.classList.add('enter');
  const total = mode === 'deal' ? 2 * UI_CONFIG.dealStagger + UI_CONFIG.dealMs + UI_CONFIG.flipMs : UI_CONFIG.flipMs;
  enterTimer = setTimeout(endEnter, total + 30);
}

// Stop an arrival animation early (the player grabbed the card).
export function endEnter() {
  clearTimeout(enterTimer);
  $('stage').classList.remove('dealing');
  $('card').classList.remove('enter');
}

export function enterDuration(mode) {
  if (!mode || reducedMotion()) return 0;
  return mode === 'deal' ? 2 * UI_CONFIG.dealStagger + UI_CONFIG.dealMs + UI_CONFIG.flipMs : UI_CONFIG.flipMs;
}

// Swap the portrait to its drag expression ("> <") while a choice is leaned.
export function setLeaning(on) {
  $('card').classList.toggle('leaning', !!on);
}

export function setBoard(kind) {
  const g = $('screen-game');
  g.classList.toggle('dead', kind === 'lose' || kind === 'chaos');
  g.classList.toggle('won', kind === 'win');
}

// ---------- footer ----------
// f: { name, days, day, slot, chaos (number|null), goals: [{title, desc, done}] }
export function renderFooter(f) {
  $('cat-name').textContent = f.name;
  $('foot-days').innerHTML = f.chaos != null
    ? `${segDigits(f.chaos)}<span>chaos</span>`
    : `${segDigits(f.days)}<span>${f.days === 1 ? 'day' : 'days'} on trial</span>`;
  const slot = UI_CONFIG.slotIcons[f.slot] || 'morning';
  $('foot-day').innerHTML = `<span class="foot-slot" title="${UI_CONFIG.slotNames[f.slot]}">${ICONS[slot]}</span><span class="foot-day-label">Day</span>${segDigits(f.day)}`;
  $('foot-day').setAttribute('aria-label', `Day ${f.day}, ${UI_CONFIG.slotNames[f.slot]}`);
  $('goals').innerHTML = f.goals.map((a) => `<span class="goal-slot${a.done ? ' done' : ''}" title="${esc(a.title)}">${a.done ? ICONS.check : ''}</span>`).join('');
  $('btn-menu').setAttribute('aria-label', `Day ${f.day}, ${UI_CONFIG.slotNames[f.slot]}. Goals: ${f.goals.filter((g) => g.done).length} of ${f.goals.length} done. Open menu.`);
}

export function goalList(goals) {
  return goals.map((a) => `<li class="${a.done ? 'done' : ''}"><span class="box">${a.done ? ICONS.check : ''}</span><span>${esc(a.desc || a.title)}</span></li>`).join('');
}

// ---------- deed banner ----------
// Pink strip over the card: epithet on top, deed under it, star burst.
export function showBanner(top, deed) {
  const b = $('banner');
  b.innerHTML = `<div class="banner-top">${esc(top)}</div><div class="banner-deed"><span class="banner-check">${ICONS.check}</span>${esc(deed)}</div>${starBurst(14)}`;
  b.hidden = false;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  return new Promise((resolve) => {
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      b.removeEventListener('pointerdown', close);
      b.classList.remove('show');
      b.classList.add('hide');
      setTimeout(() => { b.hidden = true; b.classList.remove('hide'); resolve(); }, 220);
    };
    b.addEventListener('pointerdown', close);
    setTimeout(close, UI_CONFIG.bannerMs);
  });
}

export function starBurst(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.3;
    const r = 90 + (i % 4) * 40;
    out += `<i class="star" style="--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r * 0.6)}px;--d:${(i % 5) * 60}ms"></i>`;
  }
  return `<span class="burst" aria-hidden="true">${out}</span>`;
}

// ---------- misc ----------
// Small portrait for lists (gallery etc.).
export function portraitThumb(charId, color, people = {}) {
  const svg = portrait(charId, people);
  return `<span class="thumb" style="--card-color:${esc(color || '#d9c7a7')}">${svg || ''}</span>`;
}

export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), UI_CONFIG.toastMs);
}

export function setCat(id, look) {
  $(id).innerHTML = catSVG(look);
}

// Just the cat's head (for the track marker).
export function catHead(look) {
  return catSVG(look, { noTail: true }).replace('viewBox="0 0 200 200"', 'viewBox="38 4 124 124"');
}

export { ICONS, segDigits };
