# Nine Reigns — Product Requirements

A swipe-card game in the style of *Reigns* (see `docs/research.md`). You are a
newly adopted cat on a **two-week trial**. Swipe left or right through the
chaos of a new home and make your human happy enough to keep you for good.

Static web app, hosted on GitHub Pages. Mobile-first, playable on desktop.

## 1. Pillars

1. **Funny first.** Every card should get at least a smirk. The comedy comes
   from cat logic colliding with a new cat parent's slowly eroding dignity.
2. **The swipe is the game.** It has to feel great on a phone before anything
   else matters.
3. **Being a cat is a balancing act.** Being a perfect pet bottles up your
   instincts; letting them out wrecks the apartment.
4. **Short runs, instant restart.** A run is about 5–8 minutes, and failure is
   just more content.

## 2. Core loop

- One run is **14 days**. Each day has **4 slots**: Morning, Afternoon,
  Evening, Night. That makes **56 swipes** for a full run. Each swipe moves
  time forward one slot, unless the card has `noTime`.
- Each card shows:
  - a character (portrait + name)
  - a prompt (at most ~140 characters)
  - two choices (at most ~20 characters each), shown on the card as you drag
    it left or right
- Dragging partway shows **preview dots** on the meters the choice will change
  (small dot for |Δ| < 10, big dot for ≥ 10). The dots never say which way.
- Release past the threshold to commit. Release before it and the card springs
  back. Keyboard ←/→ and on-screen buttons also work.
- **Win:** reach the end of Night on Day 14 with Joy ≥ 60. You're adopted, and
  the ending tier depends on Joy and the other meters.
- **Lose:** an ending card fires: a meter crisis that hits 0, or a card ending.
  You go back to the shelter, and a new run brings a new cat.

## 3. Meters

Four meters run from 0 to 100. Only the fill is shown, never numbers.

| Meter | Icon | Side | Start | At 0 | At 100 |
|---|---|---|---|---|---|
| **Joy**: how much the owner loves you | ❤️ | Owner | 35 | **Ending**: returned to the shelter (variants by flags/mods) | No failure. Joy over 90 gives a small bonus. |
| **Home**: state of the apartment / owner's patience with damage | 🏠 | Owner | 70 | **Ending**: "the deposit is gone" / the landlord or partner draws the line | No failure. |
| **Instinct**: bottled-up cat energy | 🐾 | Cat | 40 | **Crisis**: *Sad Loaf*. You're listless, so it's a vet visit. | **Crisis**: *Feral Outburst* (bite, claw, zoomies, knock things over) |
| **Belly**: hunger / fullness | 🐟 | Cat | 50 | **Crisis**: *4 AM Yowl*. You must demand food. | **Crisis**: *Rug Surprise* (overeating ends on the rug) |

### Rules

- **Passive drift** applies every swipe after effects: Instinct +2 and Belly −3.
  Being a good cat costs nothing up front, but the pressure keeps rising.
- **Crises** are forced cards drawn from `crisis_<meter>_<low|high>`. They
  usually hurt Joy and/or Home, and the choice is how *much* and *which*. After
  a crisis resolves, that meter resets to 50. A crisis is never game over by
  itself, but its fallout can be.
- **Ending checks** run after each swipe in this order: card `end` → Joy 0 →
  Home 0 → crises.
- The tension: affection (purring, snuggling, comforting) raises Joy but also
  raises Instinct. Chaos (biting, clawing, throwing things on the floor) lowers
  Instinct but costs Joy or Home. Food raises Belly; begging for it costs Joy.

## 4. Runs, owners, households

Each run draws a **trial file**, shown on an intro card:

- **Owner**: name, plus one quirk that tilts the deck (e.g. *works from home*,
  *night-shift nurse*, *plant parent*, *neat freak*, *gamer*). It comes from
  `owners.json`. Easter egg: an owner named **Albert** with his own small card
  set.
- **Home**: `studio`, `apartment` (has a balcony) or `house` (has stairs and a
  yard window). Each one unlocks location-specific cards.
- **Complications** (difficulty), 0–2 of: `allergies` (snuggles can make the
  owner sneeze and cost Joy), `partner` (a second human with opinions, who
  also has a hand in Home endings), `dog` (a rival, with Instinct spikes).
  New players get 0. Complications unlock as difficulty options after the
  first adoption.
- **Your cat**: a random shelter name plus the coat/breed currently selected
  from unlocked cosmetics.

## 5. Card content

### Tone

- Cards are written from the household's point of view, with the cat's inner
  voice as a recurring character (**"The Instinct"**, in all caps, unhinged).
- Choice labels are what the *cat* does: `Ignore` / `Knock it off`,
  `Purr` / `Bite`.
- Humor relies on specificity: the 3 AM sprint, the one glass of water the cat
  targets, the $80 cat tree vs. the cardboard box it came in.
- Cats never die or get hurt. Endings are about being rehomed, escaping, or
  being "voluntold" to the neighbor. They are light, never sad.

### Required themes: the new-cat-parent problem list

Counters and tables you're not allowed on · chewing charger cables · tracking
litter through the house · knocking glasses off tables · 3 AM zoomies ·
scratching the couch instead of the post · eating houseplants · ignoring the
expensive bed for the box · locked bathroom doors · bags and boxes · the
laptop keyboard · the Roomba · hairballs · the vet and the carrier · bath
attempts · catnip · the red dot · the Christmas tree · the window bird ·
food bowls "empty" (bottom visible) · open closets · toilet paper rolls ·
sitting on the work call · sleeping on the owner's face · gifts (dead bugs,
hair ties).

### Characters

`owner`, `instinct` (inner voice), `partner`, `dog`, `vet`, `neighbor`,
`landlord`, `roomba`, `plant`, `bird` (window bird), `reddot`, `shelter`
(volunteer), `albert`, `narrator` (system/intro). Each has an SVG portrait (`web/js/portraits.js`, emoji as fallback)
and a background color in `characters.json`.

### Volume

v1 targets **≥ 150 cards**:

| Category | Count |
|---|---|
| Daily life with the owner | ~40 |
| New-parent problems | ~45 |
| Home and complication-specific | ~30 |
| Crises, endings, chains, intro, Albert | ~35 |

Cooldowns keep repeats rare within a run.

### Chains

Short multi-card arcs use flags and `next`. Examples:

- **The Roomba Saga**: first contact → rivalry → riding it.
- **The Vet Visit**: carrier hunt → car → betrayal.
- **The Bird Outside**: staring → chattering → the window is open.
- **The Neighbor's Tuna**: escape-ending bait.

## 6. Meta progression (localStorage)

- **Cat-chievements**: 3 active goals per run, drawn from about 20. Examples:
  *Knock 5 things off tables*, *Get adopted with a dog in the house*, *Sleep
  on the owner's face*. Completing one unlocks a cosmetic or new cards.
- **Cosmetics**: coat colors (orange, tuxedo, calico, black, grey, cream…),
  patterns, and accessories (bell collar, bow tie, tiny hat). They're purely
  visual on the player's cat portrait (SVG with tintable fills).
- **Endings gallery**: every ending seen, with silhouettes for unseen ones.
- **Chaos Mode** (unlocks after seeing 3 endings): "just break stuff".
  - Goal is inverted: score a **Chaos** total by wrecking Home before the
    owner snaps.
  - It uses the same deck, scored by an extra `chaos` value on choices; Joy
    doesn't matter.
  - The run ends when Home hits 0 (a high score) or Day 14 arrives.

## 7. UX

- **Layout (portrait)**:
  - Top: 4 meter icons with fill and preview dots.
  - Then: the prompt text.
  - Center: the card with the portrait and the character name below it.
  - Bottom: "Day 3 · Evening" and the cat's name.
- **Desktop**: centered column (max ~440 px wide). Mouse drag, ←/→ keys, and
  click buttons.
- **Card physics**:
  - The card follows the finger and rotates up to ~12°.
  - The choice label fades in on the card's top edge.
  - The commit threshold is ~35% of the card width or a fast flick.
  - On commit the card flies off and the next card flips in.
  - Meters animate their change: a pulse, green or red flash.
- `prefers-reduced-motion` turns off flips and tilt. Sound is optional, with a
  mute toggle, and is off by default.
- Saves after every swipe, so reloading resumes the run.
- No network calls besides loading the game's own files. No analytics.

## 8. Technical design

- **Stack**: vanilla HTML/CSS/JS (ES modules), no build step, no runtime
  dependencies. It's served as static files from `web/` and deployed with a
  GitHub Actions Pages workflow.
- **Layout**:
  - `web/index.html`
  - `web/css/`
  - `web/js/`:
    - `engine.js`: pure, DOM-free game logic
    - `ui.js`
    - `swipe.js`
    - `storage.js`
    - `main.js`
  - `web/data/`:
    - `cards/*.json`
    - `characters.json`
    - `owners.json`
    - `endings.json`
    - `achievements.json`
    - `cosmetics.json`
- **Card draw**: the Reigns "bag".
  - Every turn, filter out cards whose conditions fail or that are on
    cooldown.
  - Then pick by weight.
  - The `next` queue and forced crises take priority over the bag.
- **Tooling**:
  - `node tools/validate.js` checks every card against the schema, plus
    reference integrity (`next`, `char`, `end` ids exist).
  - `node --test` covers engine unit tests.
  - Both run in CI.

### Card schema

```jsonc
{
  "id": "counter_first_jump",          // unique, snake_case
  "char": "owner",                     // characters.json id
  "text": "You're on the kitchen counter. Your human has seen you. Eye contact is happening.",
  "bag": "main",                       // main | crisis_instinct_high | crisis_instinct_low | crisis_belly_high | crisis_belly_low | intro | chaos
  "weight": 10,                        // default 10
  "cooldown": 20,                      // swipes before it can reappear (default 20)
  "once": false,                       // at most once per run
  "noTime": false,                     // doesn't advance the clock (chain middles)
  "when": [                            // ALL must pass; omit for always
    { "flag": "met_roomba" },          // truthy flag
    { "notFlag": "roomba_friend" },
    { "flagGte": ["knocked", 3] },     // counter flag ≥ n
    { "meter": "joy", "lt": 50 },      // also gt
    { "day": { "gte": 3, "lte": 10 } },
    { "slot": ["night"] },             // morning | afternoon | evening | night
    { "mod": "dog" }, { "notMod": "allergies" },
    { "home": ["apartment", "house"] },
    { "owner": "albert" }, { "quirk": "wfh" }
  ],
  "left":  { "label": "Get down",  "fx": { "joy": 5, "instinct": 5 } },
  "right": { "label": "Lick the butter", "fx": { "joy": -10, "belly": 10, "instinct": -10 },
             "set": { "knocked": "+1", "butter_thief": true },   // "+1" increments
             "next": "counter_butter_followup",                   // forced next card
             "end": null,                                          // ending id → run ends
             "chaos": 5 }                                         // Chaos Mode score
}
```

The meters in `fx` are `joy`, `home`, `instinct`, `belly`. Typical magnitudes
are 5 (small), 10 (normal) and 15–25 (big). The `"chaos"` field on a choice
is optional.

### Endings schema (`endings.json`)

`{ "id", "title", "text", "kind": "lose" | "win" | "chaos", "char" }`

Meter endings are chosen by `{ meter, when[] }` rules, first match wins. Win
tiers are keyed by the Joy band plus special conditions.

## 9. Milestones

1. **M1 Playable core**: engine, swipe UI, meters, about 40 cards, win/lose,
   save/resume, Pages deploy.
2. **M2 Content**: 150+ cards, chains, crises, endings, owners, homes,
   complications.
3. **M3 Meta**: achievements, cosmetics, endings gallery, Chaos Mode.
4. **M4 Polish**: animation tuning, sounds, balance passes from simulated runs
   (a headless random/greedy bot reports win rate and run length).

## 10. Out of scope for v1

Real-time co-op or two playable cats (a later variant could add a second cat's
deck), modeling real floor plans, accounts or cloud saves, monetization.
