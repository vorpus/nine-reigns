// Swipe gesture for the card. Pointer events cover touch, mouse and pen.
// createSwipe(el, { onMove(side|null, progress 0..1), onCommit(side), onCancel(), canSwipe(),
//                   onStart() (player takes over), onTap() })

export const SWIPE = {
  commitRatio: 0.35,   // fraction of card width to commit
  previewRatio: 0.08,  // dead zone before label/dots show
  flickSpeed: 0.55,    // px/ms
  flickMin: 30,        // px of travel a flick still needs
  maxRotate: 12,       // degrees
  flyMs: 270,          // Reigns: the card drops away and leaves in ~0.27 s
  tapSlop: 8,          // px a press may move and still count as a tap
  springMs: 320,
};

import { reducedMotion } from './ui.js';
export { reducedMotion };

export function createSwipe(el, handlers = {}) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, pointerId = null, downAt = 0;
  let samples = [];
  let locked = false;
  let leaned = null;

  const width = () => el.getBoundingClientRect().width || 300;

  function render(x, y, animate) {
    const rm = reducedMotion();
    const rot = rm ? 0 : Math.max(-1, Math.min(1, x / width())) * SWIPE.maxRotate;
    el.style.transition = animate ? `transform ${animate}ms cubic-bezier(.2,.8,.3,1.2)` : 'none';
    el.style.transform = `translate(${x}px, ${rm ? 0 : y * 0.25}px) rotate(${rot}deg)`;
    const p = Math.min(1, Math.abs(x) / (width() * SWIPE.commitRatio));
    const side = Math.abs(x) < width() * SWIPE.previewRatio ? null : x < 0 ? 'left' : 'right';
    el.style.setProperty('--lp', x < 0 ? p : 0);
    el.style.setProperty('--rp', x > 0 ? p : 0);
    handlers.onMove && handlers.onMove(side, p);
  }

  function reset(animate = true) {
    leaned = null;
    dx = dy = 0;
    render(0, 0, animate ? SWIPE.springMs : 0);
    handlers.onCancel && handlers.onCancel();
  }

  function fly(side) {
    locked = true;
    leaned = null;
    handlers.onFly && handlers.onFly(side);
    const w = window.innerWidth || 800;
    const x = (side === 'left' ? -1 : 1) * (w + width());
    if (reducedMotion()) {
      el.style.transition = 'opacity 120ms';
      el.style.opacity = '0';
      setTimeout(() => done(side), 120);
      return;
    }
    el.style.transition = `transform ${SWIPE.flyMs}ms cubic-bezier(.4,.1,.8,.6)`;
    const rot = (side === 'left' ? -1 : 1) * SWIPE.maxRotate * 2;
    el.style.transform = `translate(${x}px, ${dy * 0.25 + 60}px) rotate(${rot}deg)`;
    setTimeout(() => done(side), SWIPE.flyMs);
  }

  function done(side) {
    handlers.onCommit && handlers.onCommit(side);
  }

  function canSwipe() {
    return !locked && (!handlers.canSwipe || handlers.canSwipe());
  }

  function onDown(e) {
    if (!canSwipe() || dragging) return;
    if (e.button != null && e.button > 0) return;
    handlers.onStart && handlers.onStart();
    dragging = true;
    pointerId = e.pointerId;
    downAt = e.timeStamp;
    startX = e.clientX - dx; // pick up from a lean or a hint drag
    startY = e.clientY;
    samples = [{ x: e.clientX, t: e.timeStamp }];
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.classList.add('dragging');
  }

  function onMoveEv(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    samples.push({ x: e.clientX, t: e.timeStamp });
    if (samples.length > 6) samples.shift();
    render(dx, dy, 0);
  }

  function onUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    el.classList.remove('dragging');
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const v = (last.x - first.x) / dt;
    const far = Math.abs(dx) >= width() * SWIPE.commitRatio;
    const flick = Math.abs(v) >= SWIPE.flickSpeed && Math.abs(dx) >= SWIPE.flickMin && Math.sign(v) === Math.sign(dx);
    const travel = Math.abs(last.x - (samples[0] ? samples[0].x : last.x));
    if (e.type !== 'pointercancel' && (far || flick)) fly(dx < 0 ? 'left' : 'right');
    else if (e.type === 'pointerup' && handlers.onTap && Math.abs(dx) < SWIPE.tapSlop && travel < SWIPE.tapSlop && e.timeStamp - downAt < 500) {
      reset(false);
      handlers.onTap();
    } else reset(true);
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMoveEv, { passive: false });
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', (e) => { if (dragging) onUp(e); });
  // stop iOS from treating the drag as a scroll
  el.addEventListener('touchmove', (e) => { if (dragging) e.preventDefault(); }, { passive: false });

  return {
    // Show a choice without committing (keyboard / button hover).
    lean(side) {
      if (!canSwipe()) return;
      handlers.onStart && handlers.onStart();
      leaned = side;
      dx = (side === 'left' ? -1 : 1) * width() * SWIPE.commitRatio * 0.6;
      dy = 0;
      render(dx, 0, 180);
    },
    get leaned() { return leaned; },
    commit(side) {
      if (!canSwipe()) return false;
      handlers.onStart && handlers.onStart();
      dx = (side === 'left' ? -1 : 1) * width() * 0.4;
      fly(side);
      return true;
    },
    reset() { if (!locked) reset(true); },
    // Move the card without the player (the first card's hand hint).
    drive(x, ms) {
      if (locked || dragging) return;
      dx = x;
      dy = 0;
      render(x, 0, ms);
    },
    get dragging() { return dragging; },
    // New card mounted: unlock and clear transform.
    arm() {
      locked = false;
      leaned = null;
      dx = dy = 0;
      el.style.transition = 'none';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.setProperty('--lp', 0);
      el.style.setProperty('--rp', 0);
    },
    lock() { locked = true; },
    get locked() { return locked; },
  };
}
