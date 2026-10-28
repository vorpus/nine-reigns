// Player cat portrait as an inline SVG string. Flat, geometric, tintable.
// look: { coat: {fur, shade, belly}, pattern: id, accessory: id, mood: 'happy'|'sad'|'smug' }

const DEFAULT_COAT = { fur: '#e8964a', shade: '#c9732c', belly: '#f8dfc0' };

function patternLayer(id, c) {
  switch (id) {
    case 'tabby':
      return `<g fill="${c.shade}">
        <path d="M88 52 l4 14 l4 -14z M100 48 l4 16 l4 -16z M112 52 l4 14 l4 -14z" transform="translate(-4 0)"/>
        <path d="M58 130 h20 l-4 6 h-16z M122 130 h20 l-2 6 h-16z M60 150 h18 l-4 6 h-14z M122 150 h18 l-2 6 h-14z"/>
      </g>`;
    case 'tuxedo_bib':
      return `<path d="M84 104 L100 150 L116 104 Q100 112 84 104z" fill="#f6f2ea"/>
        <path d="M86 92 Q100 104 114 92 L110 84 Q100 92 90 84z" fill="#f6f2ea"/>`;
    case 'socks':
      return `<g fill="#f6f2ea"><rect x="70" y="170" width="22" height="12" rx="6"/><rect x="108" y="170" width="22" height="12" rx="6"/></g>`;
    case 'spots':
      return `<g fill="${c.shade}"><circle cx="66" cy="140" r="7"/><circle cx="136" cy="128" r="6"/><circle cx="128" cy="156" r="5"/><circle cx="118" cy="56" r="6"/></g>`;
    case 'calico_patches':
      return `<g><path d="M60 120 q12 -10 22 4 q-4 18 -22 14z" fill="#d78a45"/><path d="M120 140 q14 -8 20 8 q-6 14 -20 6z" fill="#3a3640"/>
        <path d="M70 46 q14 -6 20 10 q-12 8 -22 2z" fill="#d78a45"/><path d="M114 50 q10 -2 14 8 q-8 6 -14 0z" fill="#3a3640"/></g>`;
    default:
      return '';
  }
}

function accessoryLayer(id) {
  switch (id) {
    case 'bell_collar':
      return `<path d="M72 100 Q100 116 128 100" stroke="#c0392b" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="100" cy="113" r="7" fill="#f2c14e" stroke="#b8860b" stroke-width="1.5"/><rect x="97" y="114" width="6" height="2" fill="#7a5a10"/>`;
    case 'bow_tie':
      return `<g fill="#3b6ea5"><path d="M100 108 L82 98 L82 118z"/><path d="M100 108 L118 98 L118 118z"/><circle cx="100" cy="108" r="5" fill="#2a5080"/></g>`;
    case 'tiny_hat':
      return `<g><rect x="84" y="4" width="32" height="22" rx="3" fill="#2b2730"/><rect x="74" y="24" width="52" height="6" rx="3" fill="#2b2730"/><rect x="84" y="18" width="32" height="5" fill="#c0392b"/></g>`;
    case 'flower':
      return `<g transform="translate(132 30)"><circle r="6" cx="0" cy="-7" fill="#f28fb1"/><circle r="6" cx="7" cy="0" fill="#f28fb1"/><circle r="6" cx="0" cy="7" fill="#f28fb1"/><circle r="6" cx="-7" cy="0" fill="#f28fb1"/><circle r="4" fill="#f7d154"/></g>`;
    case 'glasses':
      return `<g fill="none" stroke="#2b2730" stroke-width="3"><circle cx="84" cy="70" r="11"/><circle cx="116" cy="70" r="11"/><path d="M95 70 h10"/></g>`;
    case 'bandana':
      return `<path d="M70 98 Q100 112 130 98 L100 132z" fill="#c0392b"/><g fill="#f6f2ea"><circle cx="92" cy="108" r="2"/><circle cx="108" cy="108" r="2"/><circle cx="100" cy="118" r="2"/></g>`;
    case 'crown':
      return `<path d="M76 30 L80 8 L90 22 L100 4 L110 22 L120 8 L124 30z" fill="#f2c14e" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="100" cy="18" r="3" fill="#c0392b"/>`;
    default:
      return '';
  }
}

export function catSVG(look = {}, opts = {}) {
  const c = { ...DEFAULT_COAT, ...(look.coat || {}) };
  const mood = look.mood || 'happy';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const eyes = mood === 'sad'
    ? `<path d="M76 72 q8 -6 16 0" stroke="#2b2730" stroke-width="4" fill="none" stroke-linecap="round"/>
       <path d="M108 72 q8 -6 16 0" stroke="#2b2730" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : mood === 'smug'
      ? `<path d="M76 70 h16" stroke="#2b2730" stroke-width="5" stroke-linecap="round"/><path d="M108 70 h16" stroke="#2b2730" stroke-width="5" stroke-linecap="round"/>`
      : `<ellipse cx="84" cy="70" rx="7" ry="9" fill="#2b2730"/><ellipse cx="116" cy="70" rx="7" ry="9" fill="#2b2730"/>
         <circle cx="86" cy="66" r="2.5" fill="#fff"/><circle cx="118" cy="66" r="2.5" fill="#fff"/>`;
  const label = opts.title ? `<title>${opts.title}</title>` : '';
  return `<svg${cls} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.title || 'Your cat'}">${label}
  <path d="M136 176 Q178 170 172 128 Q168 108 152 112" stroke="${c.fur}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M60 182 Q52 120 80 100 L120 100 Q148 120 140 182z" fill="${c.fur}"/>
  <path d="M82 182 Q78 130 100 116 Q122 130 118 182z" fill="${c.belly}"/>
  <rect x="70" y="168" width="22" height="16" rx="8" fill="${c.fur}"/><rect x="108" y="168" width="22" height="16" rx="8" fill="${c.fur}"/>
  <path d="M58 40 L66 6 L92 32z" fill="${c.fur}"/><path d="M142 40 L134 6 L108 32z" fill="${c.fur}"/>
  <path d="M66 34 L69 16 L82 30z" fill="#f2a7a0"/><path d="M134 34 L131 16 L118 30z" fill="#f2a7a0"/>
  <ellipse cx="100" cy="66" rx="48" ry="40" fill="${c.fur}"/>
  <ellipse cx="100" cy="84" rx="22" ry="15" fill="${c.belly}"/>
  ${patternLayer(look.pattern, c)}
  ${eyes}
  <path d="M95 80 h10 l-5 6z" fill="#e07a7a"/>
  <path d="M100 86 q-5 7 -10 3 M100 86 q5 7 10 3" stroke="#2b2730" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <g stroke="#2b2730" stroke-width="1.6" stroke-linecap="round" opacity=".55">
    <path d="M70 82 h-20 M70 88 l-18 4 M130 82 h20 M130 88 l18 4"/>
  </g>
  <ellipse cx="72" cy="84" rx="6" ry="3.5" fill="#f2a7a0" opacity=".55"/><ellipse cx="128" cy="84" rx="6" ry="3.5" fill="#f2a7a0" opacity=".55"/>
  ${accessoryLayer(look.accessory)}
</svg>`;
}
