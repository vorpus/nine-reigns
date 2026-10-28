// Small flat SVG icons and the segment-style display digits. Strings only, no DOM.
// All icons use currentColor so CSS sets their color.

const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const fill = (d, extra = '') => `<path d="${d}" fill="currentColor"${extra}/>`;

// ---------- segment digits ----------
// Squared, LCD-like numerals (Reigns' year counter). Each glyph sits in an 8x14 box.
const GLYPHS = {
  0: 'M0 0H8V14H0Z',
  1: 'M1.6 2.2L4.4 0V14',
  2: 'M0 0H8V7H0V14H8',
  3: 'M0 0H8V14H0M2.2 7H8',
  4: 'M0 0V7H8M8 0V14',
  5: 'M8 0H0V7H8V14H0',
  6: 'M8 0H0V14H8V7H0',
  7: 'M0 0H8V14',
  8: 'M0 0H8V14H0ZM0 7H8',
  9: 'M8 7H0V0H8V14H0',
  '-': 'M1.5 7H6.5',
};

export function segDigits(value, cls = 'seg-digits') {
  const str = String(value);
  const sw = 2.3;
  const adv = 12.5;
  const parts = [];
  let x = sw / 2;
  for (const ch of str) {
    if (GLYPHS[ch]) parts.push(`<path transform="translate(${x.toFixed(2)} ${sw / 2})" d="${GLYPHS[ch]}"/>`);
    x += adv;
  }
  const w = (str.length * adv - (adv - 8) + sw).toFixed(2);
  const h = (14 + sw).toFixed(2);
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" style="aspect-ratio:${w}/${h}" role="img" aria-label="${str}"><g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="round">${parts.join('')}</g></svg>`;
}

// ---------- HUD / menu ----------
export const ICONS = {
  // Memento Meowri (gallery): an open book
  book: svg('0 0 24 24', fill('M2 5.5C5 4.5 8.5 4.6 11.2 6.6V20.4C8.5 18.6 5 18.5 2 19.5z') + fill('M22 5.5C19 4.5 15.5 4.6 12.8 6.6V20.4C15.5 18.6 19 18.5 22 19.5z')),
  // Under the Bed (cosmetics): a cat head
  cat: svg('0 0 24 24', fill('M3.5 2.5L8.6 7.6H15.4L20.5 2.5L21.2 13C21.2 18.2 17.2 21.6 12 21.6S2.8 18.2 2.8 13zM7.6 11.6V14.4H10.2V11.6zM13.8 11.6V14.4H16.4V11.6z', ' fill-rule="evenodd"')),
  gear: svg('0 0 24 24', fill('M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z', ' fill-rule="evenodd"')),
  back: svg('0 0 24 24', `<path d="M15 4L7 12L15 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>`),
  left: svg('0 0 24 24', `<path d="M15 4L7 12L15 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>`),
  right: svg('0 0 24 24', `<path d="M9 4L17 12L9 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>`),
  next: svg('0 0 24 24', `<path d="M9.5 6L15.5 12L9.5 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/>`),
  check: svg('0 0 16 16', `<path d="M2.5 8.5L6.2 12L13.5 3.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/>`),
  cross: svg('0 0 16 16', `<path d="M3 3L13 13M13 3L3 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>`),
  // title: "loading" down-triangle and "ready" play triangle
  down: svg('0 0 24 24', `<path d="M4 6H20L12 19Z" fill="none" stroke="currentColor" stroke-width="2"/>`),
  play: svg('0 0 24 24', fill('M6 3.5L20.5 12L6 20.5Z')),
  // shelter (left end of the track) and forever home (right end)
  shelter: svg('0 0 24 24', fill('M1.5 22V10.5L12 2.5L22.5 10.5V22H14.6V15.6H9.4V22ZM10.2 7.6V9.4H8.4V11.2H10.2V13H12V11.2H13.8V9.4H12V7.6Z', ' fill-rule="evenodd"')),
  home: svg('0 0 24 24', fill('M1.5 22V10.5L12 2.5L22.5 10.5V22ZM12 18.6L7.8 14.4C6.6 13.1 7.1 10.8 8.9 10.4C10.1 10.1 11.3 10.7 12 11.7C12.7 10.7 13.9 10.1 15.1 10.4C16.9 10.8 17.4 13.1 16.2 14.4Z', ' fill-rule="evenodd"')),
  // the shelter tag: our tombstone
  tag: svg('0 0 24 32', fill('M5 3H19L23 8V30H1V8ZM12 6A2 2 0 1 0 12 10A2 2 0 1 0 12 6ZM5 15H19V17H5ZM5 20H15V22H5Z', ' fill-rule="evenodd"') + `<path d="M12 8C10 4 6 2 3 1" fill="none" stroke="currentColor" stroke-width="1.4"/>`),
  // a heart collar tag: the adoption equivalent
  collar: svg('0 0 24 32', `<path d="M4 2C8 6 16 6 20 2" fill="none" stroke="currentColor" stroke-width="2"/>` + fill('M12 7A10 10 0 1 1 12 27A10 10 0 1 1 12 7ZM12 22.5L7.6 18.1C6.2 16.7 6.8 14.2 8.8 13.8C10.1 13.5 11.3 14.1 12 15.2C12.7 14.1 13.9 13.5 15.2 13.8C17.2 14.2 17.8 16.7 16.4 18.1Z', ' fill-rule="evenodd"')),
  chaos: svg('0 0 24 32', fill('M12 3L15 12L23 10L17 17L22 26L13 21L9 30L8 20L1 18L8 13L5 5L11 10Z')),
  // time of day
  morning: svg('0 0 24 24', fill('M4 17A8 8 0 0 1 20 17ZM1 19H23V21H1ZM11 3H13V7H11ZM3.6 7.4L5 6L7.8 8.8L6.4 10.2ZM20.4 7.4L19 6L16.2 8.8L17.6 10.2Z')),
  afternoon: svg('0 0 24 24', fill('M12 6.5A5.5 5.5 0 1 1 12 17.5A5.5 5.5 0 1 1 12 6.5ZM11 0.5H13V4H11ZM11 20H13V23.5H11ZM0.5 11H4V13H0.5ZM20 11H23.5V13H20ZM3.5 5L5 3.5L7.4 5.9L5.9 7.4ZM16.6 18.1L18.1 16.6L20.5 19L19 20.5ZM3.5 19L5.9 16.6L7.4 18.1L5 20.5ZM16.6 5.9L19 3.5L20.5 5L18.1 7.4Z')),
  evening: svg('0 0 24 24', fill('M6 19A6 6 0 0 1 18 19ZM1 19H23V21H1ZM9 9H15L12 13Z')),
  night: svg('0 0 24 24', fill('M15.5 2.5A9.6 9.6 0 1 0 21.5 17.6A8 8 0 0 1 15.5 2.5Z')),
  // the auto hand hint on the first card
  hand: svg('0 0 34 36', `<path d="M12 3.2C12 1.8 13 .8 14.3 .8S16.6 1.8 16.6 3.2V13.2H17C17.2 12 18.1 11.2 19.2 11.2C20.4 11.2 21.3 12.1 21.3 13.3V13.9C21.7 13.1 22.5 12.6 23.4 12.6C24.6 12.6 25.5 13.5 25.5 14.7V15.6C25.9 15 26.6 14.6 27.4 14.6C28.6 14.6 29.5 15.6 29.5 16.8V22.2C29.5 27.2 25.9 30.8 20.9 30.8H18.9C15.9 30.8 13.5 29.6 11.9 27.2L4.6 20.7C3.8 19.5 4.1 18 5.2 17.3C6.3 16.6 7.8 16.8 8.6 17.9L12 21.2Z" fill="#fffbef" stroke="#2a1500" stroke-width="1.7" stroke-linejoin="round"/><path d="M16.6 13.2V18.6M21.3 13.9V18.6M25.5 15.6V18.8" fill="none" stroke="#2a1500" stroke-width="1.5" stroke-linecap="round"/>`),
};

// Carrier door over the cat on a lost run's ending card ("sitting in the carrier, unimpressed").
export function carrierOverlay() {
  const bars = [62, 82, 100, 118, 138].map((x) => `<rect x="${x - 2.5}" y="34" width="5" height="140" fill="#c9c2b4"/><rect x="${x}" y="34" width="2.5" height="140" fill="#9a9384"/>`).join('');
  return `<svg class="carrier" viewBox="0 0 200 200" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <path fill-rule="evenodd" fill="#5d544c" d="M0 0H200V200H0ZM44 26H156Q166 26 166 36V172Q166 182 156 182H44Q34 182 34 172V36Q34 26 44 26Z"/>
    <path fill="#4a423b" d="M100 0H200V200H100V182H156Q166 182 166 172V36Q166 26 156 26H100Z"/>
    <rect x="34" y="26" width="132" height="10" fill="#b9b2a4"/><rect x="34" y="170" width="132" height="10" fill="#9a9384"/>
    ${bars}
    <rect x="44" y="96" width="112" height="5" fill="#b9b2a4"/>
    <rect x="150" y="90" width="12" height="18" rx="2" fill="#8a8172"/>
  </svg>`;
}
