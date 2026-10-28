// First-run onboarding and run "flavour" (Reigns-style dynasty numbers, epithets).
// Pure and DOM-free, so tests can import it. See docs/research-onboarding.md §8.
import { evalAll } from './engine.js';

export const ONBOARDING = {
  firstTag: 603,          // shelter intake # of cat 1 (Reigns' year 603)
  lives: 9,
  firstRunGoal: 'kitten', // the one goal on the very first trial file
};

// Called right after engine.newRun(). Decides the cat's number, which tutorial
// (if any) opens the deck, and the first run's single goal. Mutates and
// returns engine.state; everything it sets is saved with the run.
//   meta: the player's saved meta (storage.js), read only
export function prepareRun(engine, meta = {}) {
  const s = engine.state;
  const runs = meta.runs || 0;
  s.profile.catNo = runs + 1;
  // Built-in meta condition for the second cat's "that's our curse" beat.
  s.metaSnapshot.secondCat = s.mode === 'normal' && runs === 1;
  if (s.mode !== 'normal') return s;
  const entry = tutorialEntry(engine);
  if (entry) s.queue.push(entry.id);
  if (s.metaSnapshot.firstRun && engine.data.achievements.some((a) => a.id === ONBOARDING.firstRunGoal)) {
    s.activeAch = [ONBOARDING.firstRunGoal];
  }
  return s;
}

// The first card flagged `ui.entry` whose `when` passes opens the deck.
export function tutorialEntry(engine) {
  const ctx = engine.ctx();
  for (const c of Object.values(engine.data.cards)) {
    if (c.ui && c.ui.entry && evalAll(c.when, ctx)) return c;
  }
  return null;
}

export function ordinal(n) {
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${suf}`;
}

export function tagNumber(catNo) {
  return ONBOARDING.firstTag + Math.max(1, catNo || 1) - 1;
}

export function lifeLabel(catNo) {
  return catNo <= ONBOARDING.lives ? `Life ${catNo} of ${ONBOARDING.lives}` : 'Extra life';
}

// Latest epithet earned this run ("the Kitten"), or null.
export function runEpithet(state, achievements) {
  for (let i = state.achDone.length - 1; i >= 0; i--) {
    const a = achievements.find((x) => x.id === state.achDone[i]);
    if (a && a.epithet) return a.epithet;
  }
  return null;
}
