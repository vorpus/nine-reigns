// DOM rendering helpers. No game rules here.
import { catSVG } from './catsvg.js';

export const UI_CONFIG = {
  meterIcons: { joy: '❤️', home: '🏠', instinct: '🐾', belly: '🐟' },
  meterNames: { joy: 'Joy', home: 'Home', instinct: 'Instinct', belly: 'Belly' },
  dangerLow: 15,
  dangerHigh: 85,
  toastMs: 2600,
  flipMs: 280,
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
    el.innerHTML = `<div class="meter-icon"><span class="meter-empty">${UI_CONFIG.meterIcons[m]}</span><span class="meter-full">${UI_CONFIG.meterIcons[m]}</span></div><div class="meter-dot"></div>`;
    wrap.appendChild(el);
  }
}

// Fill-only display. The icon's colored copy is clipped from the top so the
// fill height reads without relying on color.
export function renderMeters(meters, deltas, opts = {}) {
  for (const el of document.querySelectorAll('.meter')) {
    const m = el.dataset.meter;
    const v = meters[m];
    // The glyph spans roughly 10%..90% of its box; clip from the top so the
    // colored part rises with the value. A sliver stays visible at 0.
    el.style.setProperty('--clip', `${(10 + (100 - v) * 0.78).toFixed(1)}%`);
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
      setTimeout(() => el.classList.remove('up', 'down'), 600);
    }
  }
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
  const portrait = $('portrait');
  if (view.character.id === 'cat') {
    portrait.innerHTML = catSVG(look);
  } else {
    portrait.innerHTML = `<span aria-hidden="true">${esc(view.character.emoji)}</span>${opts.badge ? `<span class="ending-badge">${esc(opts.badge)}</span>` : ''}`;
  }
  $('btn-left').setAttribute('aria-label', `Left: ${view.left.label}`);
  $('btn-right').setAttribute('aria-label', `Right: ${view.right.label}`);
  if (opts.animate) {
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
  }
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
