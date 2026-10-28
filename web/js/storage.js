// localStorage wrapper. Every access is guarded: storage may be unavailable.
const RUN_KEY = 'nine-reigns:run:v1';
const META_KEY = 'nine-reigns:meta:v1';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function defaultMeta() {
  return {
    endingsSeen: {},       // id -> count
    achievementsDone: [],  // ids
    unlocked: [],          // cosmetic ids unlocked by achievements
    flags: {},             // meta flags (card unlocks)
    cosmetic: { coat: 'orange', pattern: 'tabby', accessory: 'none' },
    adoptions: 0,
    runs: 0,
    chaosHigh: 0,
    difficulty: 'normal',
    settings: { sound: false },
  };
}

export function loadMeta() {
  const m = read(META_KEY) || {};
  const d = defaultMeta();
  return {
    ...d, ...m,
    cosmetic: { ...d.cosmetic, ...(m.cosmetic || {}) },
    settings: { ...d.settings, ...(m.settings || {}) },
    flags: { ...(m.flags || {}) },
    endingsSeen: { ...(m.endingsSeen || {}) },
  };
}

export const saveMeta = (meta) => write(META_KEY, meta);
export const loadRun = () => read(RUN_KEY);
export const saveRun = (state) => write(RUN_KEY, state);
export const clearRun = () => write(RUN_KEY, null);
export function resetAll() { write(RUN_KEY, null); write(META_KEY, null); }
