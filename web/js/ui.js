// DOM rendering helpers. No game rules here.
import { catSVG } from './catsvg.js';
import { portrait, meterSVG, METER_SPAN } from './portraits.js';

export const UI_CONFIG = {
  meterIcons: { joy: '❤️', home: '🏠', instinct: '🐾', belly: '🐟' }, // text fallback only; meters draw meterSVG()
  meterNames: { joy: 'Joy', home: 'Home', instinct: 'Instinct', belly: 'Belly' },
  dangerLow: 15,
  dangerHigh: 85,
  toastMs: 2600,
  flipMs: 280,
  flashMs: 1000, // meter flash: hold ~0.3 s, fade ~0.7 s (see .meter.up/.down in style.css)
};

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SCREENS = ['title', 'game', 'ending', 'arrive', 'gallery', 'cosmetics'];
export function showScreen(name) {
  for (const s of SCREENS) $(`screen-${s}`).hidden = s !== name;
  document.body.dataset.screen = name;
}

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
    el.innerHTML = `<div class="meter-dot"></div><div class="meter-icon">${meterSVG(m, 'meter-empty')}${meterSVG(m, 'meter-full')}</div>`;
    wrap.appendChild(el);
  }
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
    const lowDanger = v <= UI_CONFIG.dangerLow;
    const highDanger = (m === 'instinct' || m === 'belly') && v >= UI_CONFIG.dangerHigh;
    el.classList.toggle('danger', lowDanger || highDanger);
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
    const size = preview ? preview[el.dataset.meter] : null;
    dot.className = `meter-dot${size ? ` ${size}` : ''}`;
  }
}

export function renderCard(view, look, opts = {}) {
  const card = $('card');
  $('prompt').textContent = view.text;
  $('choice-left').textContent = view.left.label;
  $('choice-right').textContent = view.right.label;
  $('char-name').textContent = view.character.name;
  card.style.setProperty('--card-color', view.character.color);
  card.classList.toggle('crisis', !!view.crisis);
  card.setAttribute('aria-label', `${view.character.name}. Left: ${view.left.label}. Right: ${view.right.label}.`);
  const el = $('portrait');
  const p = { ...(opts.people || {}), look, title: view.character.name };
  const neutral = portrait(view.character.id, p);
  const badge = opts.badge ? `<span class="ending-badge">${esc(opts.badge)}</span>` : '';
  card.classList.remove('leaning');
  if (neutral) {
    const drag = portrait(view.character.id, { ...p, expression: 'drag' });
    el.innerHTML = `<div class="pf pf-neutral">${neutral}</div><div class="pf pf-drag" aria-hidden="true">${drag}</div>${badge}`;
  } else {
    el.innerHTML = `<span class="pf-emoji" aria-hidden="true">${esc(view.character.emoji)}</span>${badge}`;
  }
  $('btn-left').setAttribute('aria-label', `Left: ${view.left.label}`);
  $('btn-right').setAttribute('aria-label', `Right: ${view.right.label}`);
  if (opts.animate) {
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
  }
}

// Swap the portrait to its drag expression ("> <") while a choice is leaned.
export function setLeaning(on) {
  $('card').classList.toggle('leaning', !!on);
}

// Small portrait for lists (gallery etc.).
export function portraitThumb(charId, color, people = {}) {
  const svg = portrait(charId, people);
  return `<span class="thumb" style="--card-color:${esc(color || '#d9c7a7')}">${svg || ''}</span>`;
}

export function renderGoals(list) {
  $('goals').innerHTML = list.map((a) => `<span class="goal${a.done ? ' done' : ''}" title="${esc(a.title)}: ${esc(a.desc)}">${esc(a.icon || '⭐')}</span>`).join('');
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
