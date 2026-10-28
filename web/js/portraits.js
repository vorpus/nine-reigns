// Character portraits as inline SVG strings. Flat, faceted, Reigns-ish:
// every surface is 2–4 tones (light / mid / shadow facets), light from the
// upper left, no outlines. All art lives in a 200x200 viewBox and is drawn
// to fill a square card (busts run off the bottom edge).
//
// portrait(charId, opts) -> svg string (cached)
//   opts.owner   owner id (fixed look from OWNER_LOOKS, else derived from the name)
//   opts.ownerName
//   opts.partner partner name (look derived from it, deterministic)
//   opts.seed    extra salt for parametric looks (e.g. the run seed)
//   opts.look    cat look for charId 'cat' (see catsvg.js)
//   opts.title   accessible label
import { catSVG } from './catsvg.js';

// ---------- color + shape helpers ----------
function rgb(h) {
  let s = String(h).replace('#', '');
  if (s.length === 3) s = s.replace(/./g, '$&$&');
  const n = parseInt(s, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const INK = '#2a2128';
const dk = (c, t = 0.2) => mix(c, '#2a1e28', t);
const lt = (c, t = 0.18) => mix(c, '#fff3df', t);
// polygon from "x,y x,y ..." (commas optional)
const pg = (pts, fill, extra = '') => `<polygon points="${pts}" fill="${fill}"${extra}/>`;
const pa = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const ln = (d, stroke, w = 3, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const ci = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
// mirror a point list across x=100
const mir = (pts) => pts.trim().split(/\s+/).map((p) => { const [x, y] = p.split(','); return `${200 - x},${y}`; }).join(' ');
const both = (pts, fill, fillR = fill) => pg(pts, fill) + pg(mir(pts), fillR);

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- palettes ----------
export const SKIN = ['#f3d6bd', '#ebc4a0', '#dcae86', '#c99470', '#b07a55', '#93603f', '#774a30', '#5c3825'];
export const HAIR = ['#2b2326', '#45302a', '#6b4630', '#9a6a3e', '#c9a063', '#b4574a', '#a8a29c', '#e6e0d6'];
export const CLOTH = ['#5b6b8c', '#8e4b4b', '#6f8a5b', '#c79a4a', '#7a5c86', '#3f6f73', '#b5654a', '#4a4e5a', '#a8876a', '#5d7f99'];
export const HAIRSTYLES = ['buzz', 'bun', 'curly', 'long', 'bob', 'ponytail', 'bald', 'messy', 'beanie', 'sidepart', 'afro'];
const TOPS = ['tee', 'sweater', 'hoodie', 'collar', 'cardigan', 'turtleneck'];

// Hand-picked looks for the owners in owners.json. Generic and kind.
export const OWNER_LOOKS = {
  albert: { skin: SKIN[1], hair: 'messy', hairColor: '#4a3328', top: 'hoodie', topColor: '#d9a441', eyes: 'tired', mouth: 'grin', stubble: true, extras: ['headset'] },
  grace: { skin: SKIN[6], hair: 'bun', hairColor: HAIR[0], top: 'sweater', topColor: '#8e4b4b', earrings: true, eyes: 'sleepy', mouth: 'smile' },
  andy: { skin: SKIN[3], hair: 'buzz', hairColor: HAIR[0], top: 'sweater', topColor: '#6f8a5b', glasses: true, beard: 'short', mouth: 'smile' },
  dyang: { skin: SKIN[2], hair: 'ponytail', hairColor: HAIR[0], top: 'hoodie', topColor: '#8e4b4b', glasses: true, eyes: 'focus', mouth: 'flat' },
  dcai: { skin: SKIN[1], hair: 'sidepart', hairColor: HAIR[1], top: 'collar', topColor: '#3f6f73', glasses: true, mouth: 'smile' },
  navo: { skin: SKIN[5], hair: 'afro', hairColor: HAIR[0], top: 'tee', topColor: '#c79a4a', earrings: true, mouth: 'grin', extras: ['leaf'] },
  li: { skin: SKIN[0], hair: 'long', hairColor: HAIR[0], top: 'cardigan', topColor: '#7a5c86', earrings: true, mouth: 'smile', extras: ['earbud'] },
  tri: { skin: SKIN[2], hair: 'bob', hairColor: HAIR[1], top: 'turtleneck', topColor: '#4a4e5a', mouth: 'flat', eyes: 'dot' },
  nate: { skin: SKIN[4], hair: 'bald', hairColor: HAIR[1], top: 'collar', topColor: '#b5654a', beard: 'full', mouth: 'smile' },
  grant: { skin: SKIN[0], hair: 'beanie', hairColor: HAIR[5], top: 'tee', topColor: '#4a4e5a', beanieColor: '#c79a4a', eyes: 'tired', mouth: 'smile', beard: 'stubble' },
};

// Deterministic look from any string (name + seed).
export function lookFromSeed(key, avoid) {
  let h = hash(key);
  const take = (arr) => { const v = arr[h % arr.length]; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return v; };
  let hair = take(HAIRSTYLES);
  if (avoid && avoid.hair === hair) hair = HAIRSTYLES[(HAIRSTYLES.indexOf(hair) + 3) % HAIRSTYLES.length];
  const look = {
    skin: take(SKIN),
    hair,
    hairColor: take(HAIR.slice(0, 7)),
    top: take(TOPS),
    topColor: take(CLOTH),
    glasses: take([0, 0, 1]) === 1,
    earrings: take([0, 0, 1]) === 1,
    beard: take([null, null, null, 'short', 'full', 'stubble']),
    eyes: take(['dot', 'dot', 'dot', 'sleepy', 'tired']),
    mouth: take(['smile', 'smile', 'grin', 'flat']),
  };
  if (look.hair === 'bald' && !look.beard) look.beard = 'full';
  if (avoid && avoid.topColor === look.topColor) look.topColor = CLOTH[(CLOTH.indexOf(look.topColor) + 4) % CLOTH.length];
  if (look.hair === 'beanie') look.beanieColor = take(CLOTH);
  return look;
}

export function ownerLook(id, name) {
  return OWNER_LOOKS[id] || lookFromSeed(`owner:${name || id || 'human'}`);
}

// ---------- the person builder ----------
// Layer order: backdrop, back hair, torso, neck, head, face, beard, front hair, props.

const HEAD = '100,40 122,44 133,62 134,86 126,106 110,120 90,120 74,106 66,86 67,62 78,44';
const HEAD_SHADE = '100,40 122,44 133,62 134,86 126,106 110,120 100,120';
const HEAD_LIGHT = '78,44 100,40 88,52 74,70 67,62';
const JAW = '80,108 100,114 120,108 110,120 90,120';
const TORSO = '18,208 26,168 46,150 80,140 120,140 154,150 174,168 182,208';
const TORSO_SHADE = '100,140 120,140 154,150 174,168 182,208 100,208';
const TORSO_LIGHT = '26,168 46,150 70,143 52,170 40,208 18,208';

// Reigns cards are one solid color; kept as a hook for future texture.
function backdrop() { return ''; }

// Expression for the portrait being drawn: false = neutral, true = drag ("> <").
let DRAG = false;
const SQUINT = (x1, x2, y, w = 9, h = 6, sw = 3.4) => ln(`M${x1 - w / 2} ${y - h} L${x1 + w / 2} ${y} L${x1 - w / 2} ${y + h} M${x2 + w / 2} ${y - h} L${x2 - w / 2} ${y} L${x2 + w / 2} ${y + h}`, INK, sw);

function hairBack(L) {
  const c = L.hairColor, s = dk(c, 0.25);
  switch (L.hair) {
    case 'long':
      return pg('60,64 70,38 100,28 130,38 140,64 146,150 130,164 122,112 78,112 70,164 54,150', c)
        + pg('130,38 140,64 146,150 130,164 126,112 132,70', s);
    case 'bob':
      return pg('60,60 70,38 100,30 130,38 140,60 142,114 126,120 124,92 76,92 74,120 58,114', c)
        + pg('130,38 140,60 142,114 126,120 128,70', s);
    case 'ponytail':
      return pg('122,44 146,52 156,84 150,128 140,140 138,104 134,64', s)
        + pg('122,44 146,52 150,74 136,64', c);
    case 'bun':
      return pg('100,16 111,20 115,30 111,40 100,44 89,40 85,30 89,20', c)
        + pg('100,16 111,20 115,30 111,40 100,44 104,30', s);
    case 'afro': {
      const ring = [[100, 24, 18], [78, 28, 17], [122, 28, 17], [62, 42, 16], [138, 42, 16], [54, 60, 15], [146, 60, 15], [52, 80, 14], [148, 80, 14], [58, 98, 12], [142, 98, 12], [86, 22, 12], [114, 22, 12]];
      return pg('60,50 140,50 146,100 54,100', c) + ring.map(([x, y, r]) => ci(x, y, r, x > 104 ? s : c)).join('')
        + ci(80, 26, 6, lt(c, 0.14)) + ci(62, 46, 5, lt(c, 0.14)) + ci(98, 18, 5, lt(c, 0.14));
    }
    case 'curly':
      return [[68, 60, 13], [132, 60, 13], [64, 80, 11], [136, 80, 11], [66, 96, 9], [134, 96, 9]]
        .map(([x, y, r]) => ci(x, y, r, x > 100 ? s : c)).join('');
    default: return '';
  }
}

function hairFront(L) {
  const c = L.hairColor, s = dk(c, 0.25), h = lt(c, 0.15);
  switch (L.hair) {
    case 'buzz': {
      const b = mix(c, L.skin, 0.25);
      return pg('67,70 69,54 78,42 100,36 122,42 131,54 133,70 128,58 114,50 86,50 72,58', b)
        + pg('114,40 122,42 131,54 133,70 128,58 120,50', dk(b, 0.2));
    }
    case 'sidepart':
      return pg('64,80 63,56 74,40 96,32 122,34 136,48 137,76 130,60 118,52 104,56 84,52 72,62 70,80', c)
        + pg('122,34 136,48 137,76 130,60 120,46', s)
        + pg('74,40 96,32 92,40 76,52', h);
    case 'messy':
      return pg('64,82 61,60 66,48 58,40 72,38 74,26 88,34 94,20 106,32 118,22 120,36 136,32 132,46 142,52 136,62 137,82 130,62 116,54 104,60 92,52 80,58 72,64 70,82', c)
        + pg('120,36 136,32 132,46 142,52 136,62 137,82 130,62 122,50', s)
        + pg('94,20 106,32 100,40 88,34', h)
        + pg('92,52 104,60 96,72', c);
    case 'bun':
    case 'ponytail':
      return pg('66,78 66,56 76,42 100,35 124,42 134,56 134,78 128,60 112,50 100,48 88,50 72,60', c)
        + pg('112,38 124,42 134,56 134,78 128,60 118,48', s)
        + pg('76,42 100,35 88,44 72,58', h)
        + (L.hair === 'ponytail' ? pg('132,52 140,56 138,64 130,62', '#c25b4e') : '');
    case 'long':
      return pg('66,82 66,56 76,40 100,32 124,40 134,56 134,82 128,62 110,50 104,58 98,50 80,54 72,64', c)
        + pg('110,36 124,40 134,56 134,82 128,62 116,46', s)
        + pg('76,40 100,32 86,44 70,62', h);
    case 'bob':
      return pg('66,76 68,52 80,38 100,33 120,38 132,52 134,76 128,64 100,66 72,64', c)
        + pg('112,35 120,38 132,52 134,76 128,64 118,64', s)
        + pg('80,38 100,33 86,46 70,60', h);
    case 'curly':
      return [[72, 46, 13], [88, 36, 13], [104, 33, 13], [119, 38, 13], [130, 50, 12], [80, 56, 9], [118, 54, 9], [100, 48, 10]]
        .map(([x, y, r], i) => ci(x, y, r, i === 3 || i === 4 || i === 6 ? s : c)).join('')
        + ci(84, 34, 5, h) + ci(100, 30, 4, h);
    case 'afro':
      return pg('66,72 70,52 84,40 100,37 116,40 130,52 134,72 124,56 100,52 76,56', c)
        + pg('116,40 130,52 134,72 124,56', s) + ci(76, 46, 8, c) + ci(94, 40, 8, c) + ci(110, 40, 8, s) + ci(126, 48, 8, s);
    case 'beanie': {
      const b = L.beanieColor || '#c79a4a';
      return pg('66,78 66,62 134,62 134,78 128,70 72,70', c)
        + pg('64,64 66,46 80,32 100,26 120,32 134,46 136,64', b)
        + pg('114,28 120,32 134,46 136,64 124,64 124,44', dk(b, 0.2))
        + pg('80,32 100,26 90,36 72,52 66,46', lt(b, 0.15))
        + pg('62,58 138,58 140,72 60,72', dk(b, 0.12))
        + [70, 80, 90, 100, 110, 120, 130].map((x) => pg(`${x - 1},60 ${x + 1},60 ${x + 1},70 ${x - 1},70`, dk(b, 0.28))).join('')
        + ci(100, 22, 8, lt(b, 0.35)) + pa('M100 14a8 8 0 0 1 8 8h-8z', lt(b, 0.5));
    }
    case 'bald':
      return both('66,70 70,62 72,84 66,86', c) + pg('82,46 96,42 90,50 80,56', '#fff', ' opacity=".18"');
    default: return '';
  }
}

function torso(L) {
  const c = L.topColor, s = dk(c, 0.22), h = lt(c, 0.14), d = dk(c, 0.38);
  let out = pg(TORSO, c) + pg(TORSO_LIGHT, h) + pg(TORSO_SHADE, s);
  switch (L.top) {
    case 'hoodie':
      out += pg('62,150 72,128 100,122 128,128 138,150 122,154 100,156 78,154', d)
        + pg('72,128 100,122 128,128 120,136 100,132 80,136', s)
        + pg('84,142 116,142 108,170 100,174 92,170', dk(L.skin, 0.1))
        + ln('M90 152 L88 182 M110 152 L112 182', lt(c, 0.5), 2.4)
        + ci(88, 184, 2.4, lt(c, 0.6)) + ci(112, 184, 2.4, lt(c, 0.6));
      break;
    case 'sweater':
      out += pg('82,140 118,140 112,152 100,156 88,152', dk(L.skin, 0.08))
        + pg('78,138 84,138 90,150 100,154 110,150 116,138 122,138 116,156 100,162 84,156', d);
      break;
    case 'tee':
      out += pg('84,140 116,140 110,152 100,155 90,152', dk(L.skin, 0.08))
        + pg('82,139 86,139 92,151 100,154 108,151 114,139 118,139 112,155 100,158 88,155', s);
      break;
    case 'collar':
      out += pg('86,140 114,140 100,168', dk(L.skin, 0.08))
        + pg('84,138 100,160 92,168 76,146', '#efe8dc') + pg('116,138 100,160 108,168 124,146', '#d9d0c2')
        + ci(100, 176, 2, d) + ci(100, 190, 2, d);
      break;
    case 'vneck':
      out += pg('84,140 116,140 100,166', dk(L.skin, 0.08))
        + pg('80,138 86,138 100,162 114,138 120,138 100,172', s)
        + pg('132,168 150,168 150,186 132,186', s) + pg('140,160 144,160 144,176 140,176', '#e9e3d8');
      break;
    case 'cardigan': {
      const inner = '#e9dfcf';
      out += pg('80,140 120,140 112,208 88,208', inner) + pg('84,140 116,140 108,150 92,150', dk(L.skin, 0.08))
        + pg('100,154 112,152 108,208 100,208', dk(inner, 0.1))
        + pg('80,140 72,142 82,208 94,208', dk(c, 0.1)) + pg('120,140 128,142 118,208 106,208', s)
        + ci(92, 176, 2.2, lt(c, 0.45)) + ci(90, 192, 2.2, lt(c, 0.45));
      break;
    }
    case 'turtleneck':
      out += pg('86,116 114,116 116,146 100,150 84,146', c) + pg('104,116 114,116 116,146 104,149', s)
        + [92, 100, 108].map((x) => ln(`M${x} 122 v20`, d, 1.6, ' opacity=".5"')).join('');
      break;
    case 'scrubs':
      break;
    default: break;
  }
  return out;
}

function neckAndHead(L) {
  const k = L.skin, ks = dk(k, 0.16), kd = dk(k, 0.3), kh = lt(k, 0.12);
  let out = pg('88,108 100,108 100,146 87,146', ks) + pg('100,108 112,108 113,146 100,146', kd)
    + pg('88,112 112,112 112,124 100,129 88,124', dk(k, 0.36));
  out += both('67,72 59,70 57,84 62,96 70,94', k, kd) + both('61,76 64,88 67,86', ks, dk(k, 0.42));
  out += pg(HEAD, k) + pg(HEAD_LIGHT, kh) + pg(HEAD_SHADE, ks);
  return out;
}

function face(L) {
  const k = L.skin, kd = dk(k, 0.32), brow = dk(L.hairColor === '#e6e0d6' ? '#a8a29c' : L.hairColor, 0.15);
  let out = '';
  if (L.eyes === 'stern') out += pg('79,70 95,75 95,79 79,74', brow) + pg('121,70 105,75 105,79 121,74', brow);
  else if (L.eyes === 'tired') out += pg('80,72 95,70 95,73.5 80,75.5', brow) + pg('120,72 105,70 105,73.5 120,75.5', brow);
  if (DRAG) out += SQUINT(88, 112, 83);
  else if (L.eyes === 'happy') out += ln('M83 85 q5 -6 10 0 M107 85 q5 -6 10 0', INK, 3.2);
  else if (L.eyes === 'sleepy') out += pg('84,82 92,82 92,89 84,89', INK) + pg('108,82 116,82 116,89 108,89', INK) + ln('M82 82 h12 M106 82 h12', kd, 2.6);
  else out += pg('86.2,76 89.8,76 89.8,90 86.2,90', INK) + pg('110.2,76 113.8,76 113.8,90 110.2,90', INK);
  if (L.eyes === 'tired') out += ln('M84 94 q4 2.5 8 0 M108 94 q4 2.5 8 0', kd, 2);
  return out;
}

function mouth(L) {
  const m = dk(L.skin, 0.55);
  switch (L.mouth) {
    case 'grin': return pa('M90 104 h20 q-2 10 -10 10 q-8 0 -10 -10z', '#5a2a2e') + pa('M92 104 h16 v3 h-16z', '#f4ede2') + pa('M95 111 q5 -3 10 0 q-5 3 -10 0z', '#d9706a');
    case 'flat': return ln('M93 107 h14', m, 2.6);
    case 'stern': return ln('M92 108 q8 -3 16 0', m, 2.6);
    case 'o': return `<ellipse cx="100" cy="108" rx="3.5" ry="4.5" fill="${m}"/>`;
    default: return ln('M92 105 q8 7 16 0', m, 2.6);
  }
}

function beard(L) {
  if (!L.beard) return '';
  const c = L.beard === 'stubble' ? mix(L.hairColor, L.skin, 0.55) : L.hairColor;
  const op = L.beard === 'stubble' ? ' opacity=".55"' : '';
  if (L.beard === 'short' || L.beard === 'stubble') {
    return pg('68,90 74,104 88,118 100,121 112,118 126,104 132,90 126,100 114,110 100,112 86,110 74,100', c, op)
      + pg('88,102 100,99 112,102 110,106 100,104 90,106', c, op);
  }
  return pg('66,84 70,102 82,120 100,130 118,120 130,102 134,84 128,96 116,102 100,100 84,102 72,96', c)
    + pg('118,120 130,102 134,84 128,96 120,112', dk(c, 0.25))
    + pg('86,102 100,98 114,102 112,107 100,104 88,107', dk(c, 0.1))
    + pg('92,110 108,110 104,114 96,114', dk(L.skin, 0.4));
}

function glasses() {
  return `<g fill="#fff" fill-opacity=".14" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"><path d="M78 78 h20 l-2 12 h-16z M102 78 h20 l-2 12 h-16z"/></g>`
    + ln('M98 81 h4 M78 80 l-10 -3 M122 80 l10 -3', INK, 2.2);
}

function extras(L) {
  let out = '';
  if (L.earrings) out += ci(61, 100, 2.6, '#e2b552') + ci(139, 100, 2.6, '#c99a3c');
  for (const x of L.extras || []) {
    if (x === 'headset') {
      out += ln('M60 84 C56 14 144 14 140 84', '#2f2c35', 6) + ln('M66 50 C76 26 124 26 134 50', '#4a4652', 2, ' opacity=".8"')
        + pg('52,72 64,70 68,100 56,102 50,90', '#3a3640') + pg('148,72 136,70 132,100 144,102 150,90', '#2a272f')
        + pg('52,80 56,80 57,94 53,94', '#c25b4e') + pg('148,80 144,80 143,94 147,94', '#a8443c')
        + ln('M60 100 Q64 116 84 112', '#2f2c35', 3) + ci(86, 112, 3.4, '#3a3640');
    } else if (x === 'earbud') {
      out += pg('56,84 62,82 63,90 57,92', '#f4efe6') + pg('59,92 62,92 62,100 59,100', '#e2dcd0');
    } else if (x === 'leaf') {
      out += pa('M128 40 q16 -14 30 -8 q-6 18 -30 8z', '#5f8a45') + pa('M128 40 q16 -14 30 -8 q-14 2 -30 8z', '#77a35a') + ln('M126 44 l6 -4', '#4d7038', 2);
    }
  }
  return out;
}

export function person(L, opts = {}) {
  L = { eyes: 'dot', mouth: 'smile', ...L };
  return [
    opts.noBackdrop ? '' : backdrop(),
    '<g transform="translate(100 160) scale(1.16) translate(-100 -160)">',
    hairBack(L),
    `<g transform="translate(0 -8)">${torso(L)}</g>`,
    opts.underHead || '',
    neckAndHead(L),
    beard(L),
    face(L),
    mouth(L),
    hairFront(L),
    L.glasses ? glasses() : '',
    extras(L),
    opts.over ? `<g transform="translate(0 -8)">${opts.over}</g>` : '',
    '</g>',
  ].join('');
}

// ---------- named characters ----------
const VET = { skin: SKIN[4], hair: 'curly', hairColor: HAIR[1], top: 'vneck', topColor: '#5f9a93', glasses: true, mouth: 'smile', eyes: 'dot' };
const NEIGHBOR = { skin: SKIN[2], hair: 'curly', hairColor: '#d8d2c8', top: 'cardigan', topColor: '#9a6f97', glasses: true, eyes: 'happy', mouth: 'smile' };
const LANDLORD = { skin: SKIN[1], hair: 'bald', hairColor: '#7b746c', top: 'collar', topColor: '#6b5a48', eyes: 'stern', mouth: 'stern' };
const SHELTER = { skin: SKIN[5], hair: 'ponytail', hairColor: HAIR[2], top: 'tee', topColor: '#3f6f73', eyes: 'dot', mouth: 'grin', earrings: true };

function stethoscope() {
  return ln('M76 146 Q74 172 92 178 M124 146 Q128 172 108 178', '#3d4250', 3.4)
    + ln('M92 178 Q100 182 108 178', '#3d4250', 3.4)
    + ci(100, 186, 7, '#aab3bf') + ci(100, 186, 4, '#7e8794') + pa('M95 182 a6 6 0 0 1 6 -2', 'none', ` stroke="#e6ebf0" stroke-width="1.6"`);
}

function clipboard(x, y, rot, paper = '#f4efe4') {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${pg('0,0 44,0 44,58 0,58', '#a8744a')}${pg('30,0 44,0 44,58 36,58', '#8d5f3b')}`
    + `${pg('5,7 39,7 39,54 5,54', paper)}${pg('30,7 39,7 39,54 34,54', dk(paper, 0.08))}${pg('14,-4 30,-4 30,8 14,8', '#7d8794')}${pg('24,-4 30,-4 30,8 24,8', '#5f6874')}`
    + [16, 24, 32, 40].map((yy) => pg(`10,${yy} 32,${yy} 32,${yy + 2.4} 10,${yy + 2.4}`, '#b9b1a3')).join('') + '</g>';
}

function keys(x, y) {
  return `<g transform="translate(${x} ${y})">${ln('M0 0 a7 7 0 1 0 0.1 0', '#c9a24a', 2.6)}`
    + `${pg('2,12 6,12 8,30 4,32 3,26 0,26', '#d9b45a')}${pg('-6,10 -3,13 -12,26 -15,24 -12,20 -14,18', '#b6c0c9')}</g>`;
}

function lanyard() {
  return ln('M80 142 L94 176 M120 142 L106 176', '#3f6f73', 3) + pg('88,174 112,174 112,198 88,198', '#f4efe4') + pg('88,174 112,174 112,180 88,180', '#3f6f73') + ci(100, 188, 4, '#c9a063');
}

function apron() {
  const a = '#6f8a5b', s = dk(a, 0.22);
  return pg('66,164 134,164 141,210 59,210', a) + pg('116,164 134,164 141,210 120,210', s)
    + ln('M70 166 L84 140 M130 166 L116 140', a, 4)
    + pg('86,180 114,180 114,210 86,210', dk(a, 0.12))
    + ci(100, 190, 3.2, lt(a, 0.5)) + ci(94, 184, 1.8, lt(a, 0.5)) + ci(100, 182, 1.8, lt(a, 0.5)) + ci(106, 184, 1.8, lt(a, 0.5));
}

function pearls() {
  let s = '';
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = 84 + 32 * t, y = 140 + Math.sin(t * Math.PI) * 10;
    s += ci(x.toFixed(1), y.toFixed(1), 2.6, '#f3eee4') + ci((x - 0.8).toFixed(1), (y - 0.8).toFixed(1), 1, '#fff');
  }
  return s;
}

function tunaCan() {
  return `<g transform="translate(18 156) rotate(-10)">${pg('0,6 40,6 40,40 0,40', '#b6c0c9')}${pg('28,6 40,6 40,40 28,40', '#8e98a3')}`
    + `${pg('0,14 40,14 40,32 0,32', '#3f6f73')}${pa('M8 23 q8 -7 18 0 l6 -5 v10 l-6 -5 q-10 7 -18 0z', '#f0c96b')}${pg('0,0 40,0 40,8 0,8', '#d4dbe1')}</g>`;
}

const DRAW = {
  vet: () => person(VET, { over: stethoscope() + clipboard(136, 150, 12) }),
  neighbor: () => person(NEIGHBOR, { over: pearls() + ln('M78 82 Q70 110 76 140 M122 82 Q130 110 124 140', '#c9a24a', 1.4, ' opacity=".8"') + tunaCan() }),
  landlord: () => person({ ...LANDLORD }, {
    over: pg('96,148 104,148 108,186 100,196 92,186', '#7c2f2f') + pg('100,148 104,148 108,186 100,196', '#5f2424')
      + pa('M86 103 q14 -8 28 0 q-4 6 -14 3 q-10 3 -14 -3z', '#8b847b') + clipboard(18, 148, -10) + keys(156, 150),
  }),
  shelter: () => person(SHELTER, { over: apron() + lanyard() }),
  instinct,
  dog,
  roomba,
  plant,
  bird,
  reddot,
  narrator,
};

function instinct() {
  const glow = '#e9e05a';
  return [
    pg('0,0 90,0 0,110', '#000', ' opacity=".18"'), pg('200,40 200,200 110,200', '#000', ' opacity=".28"'),
    pg('0,200 0,150 60,200', '#000', ' opacity=".12"'),
    // head
    pg('30,58 22,6 70,40 100,34 130,40 178,6 170,58 186,104 168,152 132,178 100,184 68,178 32,152 14,104', '#0f0b0e'),
    pg('22,6 70,40 52,42 36,60 30,58', '#2b1b22'), pg('178,6 130,40 148,42 164,60 170,58', '#241820'),
    pg('34,48 32,22 56,40', '#5a2430'), pg('166,48 168,22 144,40', '#4a1e28'),
    pg('100,34 130,40 170,58 186,104 168,152 132,178 100,184 150,120', '#161015'),
    // eye glow
    `<g fill="${glow}"><ellipse cx="66" cy="92" rx="34" ry="26" opacity=".08"/><ellipse cx="136" cy="88" rx="38" ry="30" opacity=".08"/><ellipse cx="66" cy="92" rx="24" ry="17" opacity=".14"/><ellipse cx="136" cy="88" rx="27" ry="20" opacity=".14"/></g>`,
    // eyes (mismatched: unhinged)
    DRAG ? ln('M50 78 L82 92 L52 104 M156 70 L118 88 L154 104', glow, 9)
      : pa('M46 94 L60 78 L86 84 L80 100 L58 104z', glow) + pa('M60 78 L86 84 L80 100z', '#c9b53c')
      + pa('M112 90 L128 70 L160 76 L158 98 L130 106z', glow) + pa('M128 70 L160 76 L158 98z', '#c9b53c')
      + pa('M66 82 L70 81 L72 100 L67 101z', '#0f0b0e') + pa('M137 74 L143 74 L144 103 L138 104z', '#0f0b0e')
      + ci(76, 88, 2.2, '#fffbe0') + ci(152, 82, 2.6, '#fffbe0'),
    // nose + grin
    pg('92,118 108,118 100,126', '#6b2d3a'),
    pa('M58 132 L76 140 L100 136 L124 140 L146 128 L132 152 L100 158 L68 152z', '#3a0f18'),
    pg('76,140 82,152 86,139', '#f3ead6') + pg('92,137 98,151 102,136', '#f3ead6') + pg('112,137 116,150 120,139', '#f3ead6') + pg('128,138 132,148 140,132', '#f3ead6'),
    // whisker shards
    ln('M40 128 L6 120 M42 136 L4 142 M160 124 L196 114 M158 132 L196 138', '#5a2430', 2),
  ].join('');
}

function dog() {
  const g = '#d9a35a', gl = lt(g, 0.22), gs = dk(g, 0.2), gd = dk(g, 0.36), cream = '#f1d9a6';
  return [
    backdrop(),
    // chest
    pg('20,200 34,160 64,140 136,140 166,160 180,200', g), pg('34,160 64,140 74,150 54,200 20,200', gl), pg('136,140 166,160 180,200 140,200 140,160', gs),
    pg('76,148 100,158 124,148 116,200 84,200', cream), pg('100,158 124,148 116,200 100,200', dk(cream, 0.1)),
    // collar + tag
    pa('M64 140 Q100 162 136 140 L134 150 Q100 172 66 150z', '#a8443c'), pa('M100 160 Q120 154 134 146 L134 150 Q100 172 66 150 L66 147 Q84 158 100 160z', '#8a3530'),
    pg('100,162 108,168 104,178 96,178 92,168', '#e2b552'), pg('100,162 108,168 104,178 100,178', '#c99a3c'),
    `<g transform="rotate(-7 100 90)">`,
    // ears (behind head)
    pg('54,52 38,58 28,98 36,128 50,124 62,84', gd), pg('146,52 162,58 172,98 164,128 150,124 138,84', dk(g, 0.45)),
    // head
    pg('100,30 126,36 146,56 150,84 140,112 120,128 80,128 60,112 50,84 54,56 74,36', g),
    pg('74,36 100,30 86,44 64,60 54,56', gl), pg('126,36 146,56 150,84 140,112 128,120 136,84 132,56', gs),
    // ears front facets
    pg('54,52 40,60 32,96 40,122 50,120 58,86 66,60', gs), pg('146,52 160,60 168,96 160,122 150,120 142,86 134,60', gd),
    // muzzle
    pg('78,92 100,86 122,92 128,112 116,128 84,128 72,112', cream), pg('100,86 122,92 128,112 116,128 104,128', dk(cream, 0.1)),
    // brows (hopeful)
    pg('72,64 88,60 90,64 74,69', gd), pg('110,60 126,64 126,69 110,64', gd),
    // eyes
    DRAG ? SQUINT(82, 118, 76, 10, 6, 3.6) : ci(82, 76, 6, '#2b2124') + ci(118, 76, 6, '#2b2124') + ci(84, 74, 2, '#fff') + ci(120, 74, 2, '#fff'),
    // nose + mouth + tongue
    pg('90,96 110,96 112,102 100,110 88,102', '#2b2124'), pg('92,97 100,97 96,101', '#5a4a4e'),
    ln('M100 110 v6 M88 116 q12 8 24 0', '#6b4a3a', 2.4),
    pa('M104 118 h14 v14 q0 8 -7 8 q-7 0 -7 -8z', '#e07a7a'), pa('M111 118 h7 v14 q0 8 -7 8z', '#c9636a'), ln('M111 122 v10', '#b4545a', 1.4),
    '</g>',
  ].join('');
}

function roomba() {
  const top = '#d9dde3', mid = '#b8bec8', side = '#4a4f5c', dark = '#353943';
  return [
        // wall / floor
    pg('0,124 200,108 200,200 0,200', '#000', ' opacity=".22"'), pg('0,124 200,108 200,114 0,130', '#fff', ' opacity=".55"'),
    pg('0,200 0,170 70,200', '#000', ' opacity=".08"'), pg('140,200 200,160 200,200', '#fff', ' opacity=".06"'),
    // shadow
    `<ellipse cx="100" cy="172" rx="80" ry="16" fill="#000" opacity=".18"/>`,
    // side band
    pg('22,128 40,112 70,104 130,104 160,112 178,128 178,148 160,164 130,172 70,172 40,164 22,148', side),
    pg('130,104 160,112 178,128 178,148 160,164 130,172 150,140', dark),
    // top face
    pg('22,128 40,112 70,104 130,104 160,112 178,128 160,142 130,150 70,150 40,142', mid),
    pg('40,112 70,104 100,104 80,124 40,134 26,128', top),
    pg('130,104 160,112 178,128 160,142 130,150 140,124', dk(mid, 0.1)),
    // center button
    pg('84,118 100,112 116,118 116,128 100,134 84,128', '#9aa1ac'), pg('100,112 116,118 116,128 100,134', '#8a919c'), ci(100, 123, 3, '#cfd5dc'),
    // bumper front
    pg('40,152 70,160 130,160 160,152 160,158 130,168 70,168 40,158', '#2a2d35'),
    // the LED + judging brow
    `<g fill="#ff4a3d"><ellipse cx="100" cy="146" rx="22" ry="9" opacity=".12"/><ellipse cx="100" cy="146" rx="12" ry="5.5" opacity=".25"/></g>`,
    DRAG ? pg('90,144 110,144 110,148 90,148', '#ff4a3d') : ci(100, 146, 4.5, '#ff4a3d') + ci(99, 145, 1.5, '#ffd9d0'),
    pg('84,138 112,134 113,137 85,141', '#2a2d35'),
    // brush + crumbs
    ln('M30 156 l-14 8 M32 160 l-12 14 M36 162 l-4 14', '#3b3f49', 2),
    ci(170, 182, 2.4, '#c9a063'), ci(178, 176, 1.6, '#c9a063'), ci(18, 186, 2, '#c9a063'),
  ].join('');
}

function plant() {
  const pot = '#c4734f', potL = lt(pot, 0.2), potS = dk(pot, 0.2), potD = dk(pot, 0.35);
  const l1 = '#4f7f3a', l2 = '#3f6a2e', l3 = '#6c9a4c', vg = '#cdd38a';
  const leaf = (x, y, r, s, c1, c2) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${pa('M0 0 C-14 -8 -16 -26 0 -34 C16 -26 14 -8 0 0z', c1)}${pa('M0 0 C14 -8 16 -26 0 -34z', c2)}${ln('M0 -4 L0 -28', vg, 1.6, ' opacity=".55"')}</g>`;
  return [
    backdrop(),
    // vines behind
    ln('M58 104 Q30 130 34 176 M142 104 Q172 128 166 184', l2, 3),
    leaf(34, 140, -150, 0.7, l2, l1), leaf(30, 172, -170, 0.7, l1, l2), leaf(168, 150, 150, 0.7, l2, l1), leaf(166, 186, 175, 0.65, l1, l2),
    // leaves on top
    leaf(70, 100, -40, 1.05, l1, l2), leaf(100, 96, -6, 1.15, l3, l1), leaf(130, 100, 38, 1.05, l1, l2),
    leaf(84, 104, -70, 0.85, l3, l1), leaf(118, 104, 66, 0.85, l3, l1),
    // a bite taken out of one leaf
    ci(108, 66, 6, '#93b47e', ' style="fill:var(--card-color,#93b47e)"'), ci(113, 72, 4, '#93b47e', ' style="fill:var(--card-color,#93b47e)"'),
    // pot
    pg('52,104 148,104 148,120 52,120', potL), pg('120,104 148,104 148,120 120,120', pot),
    pg('58,120 142,120 132,188 68,188', pot), pg('58,120 82,120 80,188 68,188', potL), pg('118,120 142,120 132,188 116,188', potS),
    pg('58,120 142,120 141,126 59,126', potD),
    // face
    DRAG ? SQUINT(86, 114, 146, 8, 5) : ci(86, 146, 4, INK) + ci(114, 146, 4, INK) + ci(87.4, 144.6, 1.3, '#fff') + ci(115.4, 144.6, 1.3, '#fff'),
    pg('80,136 92,133 92,136 81,139', potD), pg('108,133 120,136 119,139 108,136', potD),
    ln('M93 162 q4 -4 7 0 q3 4 7 0', INK, 2.4),
    `<ellipse cx="76" cy="156" rx="6" ry="3.5" fill="#e0786a" opacity=".35"/><ellipse cx="124" cy="156" rx="6" ry="3.5" fill="#e0786a" opacity=".35"/>`,
    // drip tray
    pg('62,188 138,188 134,196 66,196', potS),
  ].join('');
}

function bird() {
  const frame = '#efe4cf', frameS = '#cdbfa6', g = '#8d93a1', gl = lt(g, 0.22), gs = dk(g, 0.22), gd = dk(g, 0.38);
  return [
    // sky facets
    pg('0,0 120,0 0,90', '#fff', ' opacity=".12"'), pg('200,0 200,120 90,140', '#000', ' opacity=".08"'),
    // cloud
    pg('120,46 134,36 150,38 162,30 180,38 186,52 112,52', '#e8f1f7'), pg('150,38 162,30 180,38 186,52 160,52', '#d0e0eb'),
    // window frame
    pg('0,0 14,0 14,200 0,200', frame), pg('186,0 200,0 200,200 186,200', frameS), pg('0,0 200,0 200,12 0,12', frame), pg('94,0 106,0 106,150 94,150', frame), pg('100,0 106,0 106,150 100,150', frameS),
    // sill
    pg('0,150 200,150 200,166 0,166', '#e9dcc4'), pg('0,166 200,166 200,200 0,200', '#c9b897'), pg('0,166 200,166 200,172 0,172', '#a8977a'),
    // pigeon tail
    pg('146,128 186,140 182,150 140,146', gd),
    // body
    pg('54,120 70,96 100,86 132,94 152,118 150,142 128,158 80,158 58,146', g),
    pg('70,96 100,86 88,104 64,124 54,120', gl), pg('132,94 152,118 150,142 128,158 112,158 136,126', gs),
    // wing
    pg('92,108 134,102 154,126 140,146 104,140', gs), pg('104,116 136,110 148,128', gd), pg('110,128 140,124 146,138 118,138', gd),
    // neck shimmer + head
    pg('62,100 86,94 92,118 70,124', '#6c9f86'), pg('76,96 88,94 92,118 80,120', '#8a6fa0'),
    pg('52,64 66,48 86,50 94,66 90,90 66,98 52,86', g), pg('52,64 66,48 76,49 60,70 52,76', gl), pg('86,50 94,66 90,90 80,94 86,70', gs),
    // eye + beak
    DRAG ? ln('M61 61 L69 66 L61 71', INK, 3) : ci(66, 66, 6, '#e7894a') + ci(66, 66, 3, INK) + ci(67, 65, 1, '#fff'),
    pg('52,70 36,76 52,78', '#3a3640'), pg('48,68 54,66 54,72', '#efe8dc'),
    // smug brow
    pg('58,56 74,58 74,61 58,60', gd),
    // feet
    ln('M86 158 v8 M80 166 h12 M114 158 v8 M108 166 h12', '#d98a8a', 2.6),
  ].join('');
}

function reddot() {
  return [
    // wall facets over the card color
    pg('0,0 80,0 0,90', '#fff', ' opacity=".05"'), pg('120,0 200,0 200,160 150,164', '#000', ' opacity=".14"'),
    // baseboard + floor
    pg('0,176 200,160 200,170 0,186', '#fff', ' opacity=".12"'), pg('0,186 200,170 200,200 0,200', '#000', ' opacity=".4"'),
    // the cat's shadow, watching from the bottom right
    `<g fill="#000" opacity=".3">${pg('128,200 132,150 142,124 152,148 170,146 182,122 188,150 196,200')}</g>`,
    // beam
    pa('M200 20 L84 112 L88 116z', '#ff3b30', ' opacity=".08"'),
    // glow + dot
    `<g fill="#ff3b30"><circle cx="86" cy="114" r="${DRAG ? 46 : 38}" opacity=".06"/><circle cx="86" cy="114" r="24" opacity=".12"/><circle cx="86" cy="114" r="14" opacity=".28"/></g>`,
    ci(86, 114, 7.5, '#ff3b30'), ci(86, 114, 4, '#ff8a7a'), ci(85, 113, 1.8, '#fff1ec'),
    // motion ticks
    ln('M104 100 l8 -6 M106 114 h10 M104 128 l8 6', '#ff6a5a', 2, ' opacity=".5"'),
  ].join('');
}

function narrator() {
  const f = '#d9b06a', fl = lt(f, 0.2), fs = dk(f, 0.18), paper = '#f6f0e2';
  return [
    backdrop(),
    `<ellipse cx="100" cy="182" rx="88" ry="10" fill="#000" opacity=".12"/>`,
    // back cover + tab
    pg('22,40 70,40 78,30 116,30 124,40 178,40 182,176 18,176', fs),
    // paper stack
    pg('34,48 166,52 162,170 38,170', '#e7ddc8'),
    `<g transform="rotate(-3 100 110)">${pg('36,44 164,44 164,168 36,168', paper)}${pg('120,44 164,44 164,168 140,168', dk(paper, 0.05))}`
    + `<text x="50" y="68" font-family="Georgia, serif" font-size="13" font-weight="700" letter-spacing="2" fill="#4a3f3a">TRIAL FILE</text>`
    + [80, 92, 104, 116, 128, 140].map((y, i) => pg(`50,${y} ${i % 3 === 2 ? 118 : 146},${y} ${i % 3 === 2 ? 118 : 146},${y + 4} 50,${y + 4}`, '#cfc5b2')).join('')
    + `</g>`,
    // paper clip
    ln('M146 34 v28 a5 5 0 0 0 10 0 v-24', '#8e98a3', 2.6),
    // paw stamp
    `<g transform="translate(128 130) rotate(-14)" fill="#b8423a" opacity=".85">`
    + `<circle r="22" fill="none" stroke="#b8423a" stroke-width="3"/><ellipse cx="0" cy="5" rx="8" ry="6.5"/><ellipse cx="-9" cy="-5" rx="3.6" ry="4.6"/><ellipse cx="-3" cy="-10" rx="3.6" ry="4.6"/><ellipse cx="4" cy="-10" rx="3.6" ry="4.6"/><ellipse cx="10" cy="-4" rx="3.6" ry="4.6"/></g>`,
    // front cover flap (folded open at the bottom)
    pg('14,166 186,166 192,190 8,190', f), pg('14,166 186,166 187,170 13,170', fl), pg('140,166 186,166 192,190 150,190', fs),
  ].join('');
}

// ---------- public API ----------
export const PORTRAIT_IDS = ['owner', 'partner', 'albert', 'cat', 'instinct', 'dog', 'vet', 'neighbor', 'landlord', 'roomba', 'plant', 'bird', 'reddot', 'shelter', 'narrator'];

const cache = new Map();

function wrap(body, title) {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(title || '').replace(/[<>&"]/g, '')}" preserveAspectRatio="xMidYMid slice" shape-rendering="geometricPrecision">${body}</svg>`;
}

export function portrait(charId, opts = {}) {
  if (charId === 'cat') return catSVG(opts.look || {}, { title: opts.title, className: 'cat-portrait', expression: opts.expression });
  const drag = opts.expression === 'drag';
  const key = `${drag ? 'D' : 'N'}|${charId}|${opts.owner || ''}|${opts.ownerName || ''}|${opts.partner || ''}|${opts.seed || ''}|${opts.title || ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let body = null;
  DRAG = drag;
  if (charId === 'owner') body = person(ownerLook(opts.owner, opts.ownerName));
  else if (charId === 'albert') body = person(OWNER_LOOKS.albert);
  else if (charId === 'partner') {
    const avoid = ownerLook(opts.owner, opts.ownerName);
    body = person(lookFromSeed(`partner:${opts.partner || 'Alex'}:${opts.seed || ''}`, avoid));
  } else if (DRAW[charId]) body = DRAW[charId]();
  DRAG = false;
  if (body == null) return null;
  const svg = wrap(body, opts.title || charId);
  cache.set(key, svg);
  return svg;
}

export function hasPortrait(charId) {
  return PORTRAIT_IDS.includes(charId);
}

// ---------- meter icons ----------
// Silhouettes in a 24x24 box that span y 2..22 so the fill math in ui.js is simple.
export const METER_PATHS = {
  joy: 'M12 21.5 L3.2 12.6 C0.4 9.6 1.4 4.4 5.6 3.1 C8.2 2.3 10.6 3.4 12 5.6 C13.4 3.4 15.8 2.3 18.4 3.1 C22.6 4.4 23.6 9.6 20.8 12.6z',
  home: 'M12 2.5 L22.5 11.2 L19.6 11.2 L19.6 21.5 L14.4 21.5 L14.4 15 L9.6 15 L9.6 21.5 L4.4 21.5 L4.4 11.2 L1.5 11.2z',
  instinct: 'M12 11.4 C15.6 11.4 19.4 15.4 19.4 18.6 C19.4 21.4 16.8 21.8 15 21.2 C13.6 20.8 12.8 20.4 12 20.4 C11.2 20.4 10.4 20.8 9 21.2 C7.2 21.8 4.6 21.4 4.6 18.6 C4.6 15.4 8.4 11.4 12 11.4z M6.2 5.4 C7.8 5.2 9 7 8.8 8.9 C8.6 10.8 7.2 12 5.8 11.6 C4.4 11.2 3.8 9.4 4.2 7.6 C4.5 6.4 5.2 5.5 6.2 5.4z M17.8 5.4 C18.8 5.5 19.5 6.4 19.8 7.6 C20.2 9.4 19.6 11.2 18.2 11.6 C16.8 12 15.4 10.8 15.2 8.9 C15 7 16.2 5.2 17.8 5.4z M10 2.5 C11.4 2.5 12 4.2 11.8 6 C11.6 7.8 10.4 8.8 9.4 8.4 C8.4 8 8 6.4 8.4 4.8 C8.6 3.4 9.2 2.5 10 2.5z M14 2.5 C14.8 2.5 15.4 3.4 15.6 4.8 C16 6.4 15.6 8 14.6 8.4 C13.6 8.8 12.4 7.8 12.2 6 C12 4.2 12.6 2.5 14 2.5z',
  belly: 'M2 12 C4.6 7.2 9 5.2 13.4 6.2 C15.2 6.6 16.8 7.6 18 9 L22.4 5.2 L21.2 12 L22.4 18.8 L18 15 C16.8 16.4 15.2 17.4 13.4 17.8 C9 18.8 4.6 16.8 2 12z M7.4 10.4 a1.3 1.3 0 1 0 0.1 0z',
};
// The visible top/bottom of each glyph (in % of the box) so the clip lines up with the shape.
export const METER_SPAN = { joy: [10.8, 89.6], home: [10.4, 89.6], instinct: [10.4, 91], belly: [21.7, 78.3] };

export function meterSVG(id, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${METER_PATHS[id] || ''}" fill="currentColor" fill-rule="evenodd"/></svg>`;
}
