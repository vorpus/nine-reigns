// Shared test fixtures (not game content).
export const owners = {
  owners: [
    { id: 'maya', name: 'Maya', quirk: 'wfh', quirkLabel: 'works from home', weight: 10 },
    { id: 'albert', name: 'Albert', quirk: 'gamer', quirkLabel: 'is Albert', weight: 0 },
  ],
  catNames: ['Mochi'], partnerNames: ['Sam'], dogNames: ['Rex'],
};

export const characters = { characters: {
  owner: { name: '{owner}', emoji: '🧑', color: '#f0c' },
  shelter: { name: 'Shelter', emoji: '🏠', color: '#ccc' },
  narrator: { name: 'Narrator', emoji: '📜', color: '#ddd' },
  instinct: { name: 'THE INSTINCT', emoji: '😼', color: '#a33' },
} };

const flat = (id, extra = {}) => ({
  id, char: 'owner', text: `Card ${id} for {cat} and {owner}`,
  left: { label: 'L', fx: {} }, right: { label: 'R', fx: {} }, ...extra,
});

export const cards = [
  flat('a'), flat('b'), flat('c'),
  flat('intro_one', { bag: 'intro', noTime: true }),
  flat('chain_x', { bag: 'chain', noTime: true }),
  flat('ci_high', { bag: 'crisis_instinct_high', char: 'instinct' }),
  flat('cb_low', { bag: 'crisis_belly_low' }),
];

export const endings = { endings: [
  { id: 'joy_partner', title: 'P', kind: 'lose', char: 'owner', text: 'partner', trigger: { meter: 'joy', at: 'low' }, when: [{ mod: 'partner' }] },
  { id: 'joy_generic', title: 'J', kind: 'lose', char: 'owner', text: 'joy', trigger: { meter: 'joy', at: 'low' } },
  { id: 'home_generic', title: 'H', kind: 'lose', char: 'owner', text: 'home', trigger: { meter: 'home', at: 'low' } },
  { id: 'win_top', title: 'W1', kind: 'win', char: 'owner', text: 'top', trigger: { win: true }, when: [{ meter: 'joy', gte: 90 }] },
  { id: 'win_plain', title: 'W', kind: 'win', char: 'owner', text: 'win', trigger: { win: true } },
  { id: 'trial_fail', title: 'F', kind: 'lose', char: 'owner', text: 'fail', trigger: { trialFail: true } },
  { id: 'chaos_home', title: 'CH', kind: 'chaos', char: 'owner', text: 'boom', trigger: { chaos: 'home' } },
  { id: 'chaos_time', title: 'CT', kind: 'chaos', char: 'owner', text: 'time', trigger: { chaos: 'time' } },
  { id: 'escaped', title: 'E', kind: 'lose', char: 'owner', text: '{cat} left' },
] };

export const achievements = { achievements: [
  { id: 'knock3', title: 'K', desc: '', goal: [{ flagGte: ['knocked', 3] }], unlocks: { cosmetic: 'bow_tie' } },
  { id: 'winner', title: 'W', desc: '', goal: [{ won: true }], unlocks: { flag: 'veteran' } },
] };

export function rawData(extraCards = [], opts = {}) {
  return {
    cards: [...(opts.noBase ? [] : cards), ...extraCards],
    endings, owners, characters, achievements,
  };
}
