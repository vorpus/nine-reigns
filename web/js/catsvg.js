// Player cat portrait as an inline SVG string. Flat, faceted, tintable.
// look: { coat: {fur, shade, belly, eye?}, pattern: id, accessory: id, mood: 'happy'|'sad'|'smug' }
// opts: { className, title, noTail, expression: 'neutral' | 'drag' }

const DEFAULT_COAT = { fur: '#e8964a', shade: '#c9732c', belly: '#f8dfc0' };
const INK = '#2b2730';

function mix(a, b, t) {
  const p = (h) => { let s = String(h).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const pg = (pts, fill, extra = '') => `<polygon points="${pts}" fill="${fill}"${extra}/>`;
const mir = (pts) => pts.trim().split(/\s+/).map((q) => { const [x, y] = q.split(','); return `${200 - x},${y}`; }).join(' ');

// Shared shapes (also used by patterns so markings sit on the facets).
const HEAD = '58,52 80,36 100,32 120,36 142,52 154,76 144,98 122,110 100,113 78,110 56,98 46,76';
const HEAD_SHADE = '126,40 142,52 154,76 144,98 122,110 110,112 130,96 138,74';
const HEAD_LIGHT = '58,52 80,36 100,32 84,44 62,64 50,70';
const BODY = '58,190 62,148 76,116 100,108 124,116 138,148 142,190';
const BODY_SHADE = '114,111 124,116 138,148 142,190 118,190 126,148';
const BODY_LIGHT = '76,116 90,111 74,150 72,190 58,190 62,148';
const EAR = '54,62 60,10 96,38';
const EAR_IN = '63,50 66,23 84,40';

function patternLayer(id, c) {
  switch (id) {
    case 'tabby':
      return `<g fill="${c.shade}">${pg('86,40 92,58 98,38')}${pg('100,36 104,56 108,36')}${pg('110,38 112,56 118,40')}
        ${pg('48,78 64,80 62,84 47,84')}${pg('152,78 136,80 138,84 153,84')}
        ${pg('62,144 80,140 79,146 62,151')}${pg('60,162 78,158 77,164 59,168')}${pg('138,144 120,140 121,146 138,151')}${pg('140,162 122,158 123,164 141,168')}</g>`;
    case 'tuxedo_bib':
      return `${pg('82,112 100,108 118,112 115,150 100,172 85,150', '#f6f2ea')}${pg('100,108 118,112 115,150 100,172', '#e4dfd6')}
        ${pg('84,84 100,76 116,84 120,98 108,106 92,106 80,98', '#f6f2ea')}`;
    case 'socks':
      return `<g fill="#f6f2ea">${pg('66,178 94,178 95,192 65,192')}${pg('106,178 134,178 135,192 105,192')}</g>`;
    case 'spots':
      return `<g fill="${c.shade}">${pg('64,140 74,136 78,146 68,150')}${pg('130,126 138,130 134,138 126,134')}${pg('124,156 132,154 134,162 126,164')}${pg('114,44 124,44 126,54 116,56')}${pg('62,72 70,66 72,76')}</g>`;
    case 'calico_patches':
      return `<g>${pg('62,124 80,118 86,138 70,150 60,144', '#d78a45')}${pg('118,140 138,142 140,164 120,162', '#3a3640')}
        ${pg('66,48 84,38 94,48 80,62 62,64', '#d78a45')}${pg('112,40 124,40 136,50 124,58', '#3a3640')}</g>`;
    default:
      return '';
  }
}

function accessoryLayer(id) {
  switch (id) {
    case 'bell_collar':
      return `${pg('72,108 100,118 128,108 128,116 100,126 72,116', '#b8433a')}${pg('100,118 128,108 128,116 100,126', '#963630')}
        ${pg('100,118 108,122 109,130 100,134 91,130 92,122', '#f2c14e')}${pg('100,118 108,122 109,130 100,134', '#d6a43a')}${pg('97,129 103,129 103,131 97,131', '#7a5a10')}`;
    case 'bow_tie':
      return `${pg('100,118 80,106 80,130', '#3b6ea5')}${pg('100,118 120,106 120,130', '#2f5a88')}${pg('94,112 106,112 106,124 94,124', '#24497a')}`;
    case 'tiny_hat':
      return `${pg('84,6 116,6 116,30 84,30', '#2b2730')}${pg('104,6 116,6 116,30 104,30', '#1d1b22')}${pg('84,20 116,20 116,26 84,26', '#b8433a')}${pg('72,28 128,28 124,36 76,36', '#2b2730')}`;
    case 'flower':
      return `<g transform="translate(134 34)">${pg('0,-14 5,-5 -5,-5', '#f28fb1')}${pg('14,0 5,5 5,-5', '#e57aa0')}${pg('0,14 -5,5 5,5', '#e57aa0')}${pg('-14,0 -5,-5 -5,5', '#f28fb1')}${pg('-5,-5 5,-5 5,5 -5,5', '#f7d154')}</g>`;
    case 'glasses':
      return `<g fill="#fff" fill-opacity=".14" stroke="${INK}" stroke-width="3" stroke-linejoin="round"><path d="M68 64 h26 l-3 16 h-20z M106 64 h26 l-3 16 h-20z"/></g><path d="M94 68 h12" stroke="${INK}" stroke-width="3"/>`;
    case 'bandana':
      return `${pg('70,106 100,118 130,106 100,146', '#b8433a')}${pg('100,118 130,106 100,146', '#963630')}<g fill="#f6f2ea">${pg('90,120 93,122 90,124 87,122')}${pg('108,120 111,122 108,124 105,122')}${pg('100,130 103,132 100,134 97,132')}</g>`;
    case 'crown':
      return `${pg('76,38 80,10 92,26 100,6 108,26 120,10 124,38', '#f2c14e')}${pg('100,6 108,26 120,10 124,38 100,38', '#d6a43a')}${pg('96,24 104,24 104,32 96,32', '#b8433a')}`;
    default:
      return '';
  }
}

export function catSVG(look = {}, opts = {}) {
  const c = { ...DEFAULT_COAT, ...(look.coat || {}) };
  const mood = look.mood || 'happy';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const furL = mix(c.fur, '#fff6e8', 0.16);
  const furS = mix(c.fur, '#2a1e28', 0.16);
  const deep = mix(c.shade, '#1a1418', 0.25);
  const bellyS = mix(c.belly, c.shade, 0.18);
  const dark = !!c.eye;
  const eyeFill = c.eye || INK;
  const lineInk = dark ? mix(c.belly, '#ffffff', 0.2) : INK;
  let eyes;
  if (mood === 'sad') {
    eyes = `${pg('74,70 90,70 88,80 76,80', eyeFill)}${pg('110,70 126,70 124,80 112,80', eyeFill)}
      ${dark ? `${pg('80,71 84,71 84,79 80,79', '#1a1720')}${pg('116,71 120,71 120,79 116,79', '#1a1720')}` : ''}
      ${pg('86,71 89,71 88,74', '#fff')}${pg('122,71 125,71 124,74', '#fff')}
      ${pg('70,64 88,58 89,61 72,67', lineInk)}${pg('130,64 112,58 111,61 128,67', lineInk)}
      ${pg('76,84 80,84 81,94 77,96 75,92', '#8fc3e8')}`;
  } else if (mood === 'smug') {
    eyes = `${pg('72,72 92,70 92,75 73,76', eyeFill)}${pg('108,70 128,72 127,76 108,75', eyeFill)}
      ${pg('72,66 92,63 92,66 72,69', lineInk, ' opacity=".7"')}${pg('108,63 128,66 128,69 108,66', lineInk, ' opacity=".7"')}`;
  } else if (opts.expression === 'drag') {
    eyes = `<path d="M75 64 L88 71 L75 78 M125 64 L112 71 L125 78" stroke="${eyeFill === INK ? INK : lineInk}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    eyes = `${pg('82,62 90,68 89,78 82,82 75,78 74,68', eyeFill)}${pg('118,62 126,68 125,78 118,82 111,78 110,68', eyeFill)}
      ${dark ? `${pg('82,64 84,72 82,80 80,72', '#1a1720')}${pg('118,64 120,72 118,80 116,72', '#1a1720')}` : ''}
      ${pg('84,65 87,67 85,70', '#fff')}${pg('120,65 123,67 121,70', '#fff')}`;
  }
  const label = opts.title ? `<title>${opts.title}</title>` : '';
  const tail = opts.noTail ? '' : `<path d="M134 184 L164 176 L176 148 L168 122 L160 118" stroke="${c.fur}" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M150 180 L164 176 L176 148" stroke="${furS}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
  return `<svg${cls} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.title || 'Your cat'}">${label}
  ${tail}
  ${pg(BODY, c.fur)}${pg(BODY_LIGHT, furL)}${pg(BODY_SHADE, furS)}
  ${pg('86,114 100,110 114,114 112,142 100,158 88,142', c.belly)}${pg('100,110 114,114 112,142 100,158', bellyS)}
  ${pg('66,176 94,176 96,192 64,192', c.fur)}${pg('106,176 134,176 136,192 104,192', c.fur)}${pg('124,176 134,176 136,192 124,192', furS)}
  <path d="M74 186 v6 M84 186 v6 M114 186 v6 M124 186 v6" stroke="${deep}" stroke-width="1.6" opacity=".6"/>
  ${pg(EAR, c.fur)}${pg(mir(EAR), furS)}${pg('60,10 96,38 80,40', furL)}${pg(mir('60,10 96,38 80,40'), deep, ' opacity=".35"')}
  ${pg(EAR_IN, '#eaa59b')}${pg(mir(EAR_IN), '#d98f86')}
  ${pg(HEAD, c.fur)}${pg(HEAD_LIGHT, furL)}${pg(HEAD_SHADE, furS)}
  ${pg('50,78 40,92 60,100', c.fur)}${pg('150,78 160,92 140,100', furS)}
  ${pg('84,84 100,78 116,84 120,96 108,106 92,106 80,96', c.belly)}${pg('100,78 116,84 120,96 108,106 100,106', bellyS)}
  ${patternLayer(look.pattern, c)}
  ${eyes}
  ${pg('93,86 107,86 100,93', '#d97d7d')}${pg('100,86 107,86 100,93', '#c26a6c')}
  ${mood === 'sad'
    ? `<path d="M100 93 v3 M92 102 l8 -5 l8 5" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M100 93 v3 q-3.5 4 -7.5 1.5 M100 96 q3.5 4 7.5 1.5" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`}
  <g stroke="${lineInk}" stroke-width="1.5" stroke-linecap="round" opacity=".5">
    <path d="M74 92 l-26 -4 M74 97 l-24 4 M126 92 l26 -4 M126 97 l24 4"/>
  </g>
  ${pg('66,88 76,86 76,92 66,93', '#ef8f86', ' opacity=".45"')}${pg('134,88 124,86 124,92 134,93', '#ef8f86', ' opacity=".45"')}
  ${accessoryLayer(look.accessory)}
</svg>`;
}
