# Data format

Exact shapes the engine (`web/js/engine.js`) and validator (`tools/validate.js`)
read. `docs/PRD.md` §8 is the base card schema; this file pins down the details
and everything the PRD leaves open. Run `node tools/validate.js` after editing
any data file.

All files live under `web/data/`. JSON only (no comments, no trailing commas).

## Card files

`web/data/cards/index.json` lists the card files to load:

```json
{ "files": ["intro.json", "daily.json", "problems.json", "household.json",
            "crises.json", "chains.json", "albert.json"] }
```

A missing or invalid file is skipped with a console warning. Each card file is

```json
{ "cards": [ { ...card }, { ...card } ] }
```

(a bare array of cards is also accepted). Card ids are unique **across all
files**, `snake_case`.

### Card fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | string | required | unique, `snake_case` |
| `char` | string | required | id from `characters.json` |
| `text` | string | required | ≤ 140 chars target, validator warns > 200 |
| `bag` | string | `"main"` | see Bags |
| `weight` | number | `10` | `0` = never drawn from a bag (only via `next`) |
| `cooldown` | number | `20` | swipes before it can be drawn again |
| `once` | bool | `false` | at most once per run |
| `noTime` | bool | `false` | swipe does not advance the clock |
| `when` | condition[] | `[]` | ALL must pass |
| `left`, `right` | choice | required | if one side is omitted it mirrors the other (info card) |

### Choice fields

| Field | Type | Notes |
|---|---|---|
| `label` | string | required, **≤ 24 chars (error)**, aim ≤ 20 |
| `fx` | object | keys `joy`, `home`, `instinct`, `belly`; integers. Clamped 0–100 |
| `set` | object | flag → value. `"+1"`, `"+3"`, `"-1"` increment a counter (missing = 0); anything else is stored literally (`true`, `false`, `"x"`, `5`) |
| `next` | string \| string[] | forced follow-up. A string is queued. An array is a **branch**: when it comes up, the first id whose `when` passes is shown |
| `end` | string | ending id from `endings.json`; the run ends after this swipe (ignored in Chaos Mode) |
| `chaos` | number | Chaos Mode score. If absent, Chaos Mode scores `max(0, -fx.home)` |

Forced `next` cards ignore cooldown, `once` and `weight`, but a single
string `next` whose `when` fails is skipped.

### Bags

| Bag | Drawn when |
|---|---|
| `main` | normal draw |
| `intro` | Day 1 Morning, before `main`, while any eligible intro card remains. Intro cards are implicitly `once`; usually also `noTime` |
| `chain` | never drawn; only reachable via `next` |
| `chaos` | Chaos Mode only, mixed into `main` |
| `crisis_instinct_high`, `crisis_instinct_low`, `crisis_belly_high`, `crisis_belly_low` | forced when that meter hits 100 / 0 |

If a bag has nothing eligible the engine falls back to `main` ignoring
cooldowns, then to a built-in filler card. Crisis bags fall back to built-in
generic crisis cards. Nothing crashes on empty content.

### Conditions (`when`)

All listed conditions must pass. Every type:

```jsonc
{ "flag": "met_roomba" }                 // flag truthy (non-zero, non-false, non-empty)
{ "notFlag": "roomba_friend" }           // flag falsy / unset
{ "flagGte": ["knocked", 3] }            // numeric flag >= n (unset = 0)
{ "flagLt": ["knocked", 3] }             // numeric flag < n
{ "meter": "joy", "lt": 50 }             // any of lt / gt / lte / gte, combinable
{ "day": { "gte": 3, "lte": 10 } }       // also "eq"; a bare number means eq
{ "slot": ["night"] }                    // morning | afternoon | evening | night (string or array)
{ "mod": "dog" }  { "notMod": "allergies" }   // allergies | partner | dog
{ "home": ["apartment", "house"] }       // studio | apartment | house (string or array)
{ "owner": "albert" }                    // owner id (string or array)
{ "quirk": "wfh" }                       // wfh | nightshift | plantparent | neatfreak | gamer (string or array)
{ "notQuirk": "gamer" }
{ "mode": "chaos" }                      // normal | chaos
{ "seen": "card_id" }  { "notSeen": "card_id" }  // card shown earlier this run
{ "meta": "unlock_flag" }                // permanent unlock from an achievement
{ "meta": "firstRun" }                   // built-in: true on the player's very first run ever
{ "meta": "firstWin" }                   // built-in: true until the player has been adopted once
{ "chance": 0.3 }                        // passes with probability p (rolled per check)
{ "any": [ {...}, {...} ] }              // OR
{ "not": {...} }                         // negation
```

Achievements and endings may additionally use the run-result conditions
(only true once the run has ended): `{ "won": true }`, `{ "endingKind": "lose" }`,
`{ "ending": "id" }`, `{ "chaosGte": 100 }`, `{ "swipesGte": 40 }`.

### Text placeholders

`{cat}`, `{owner}`, `{partner}`, `{dog}`, `{home}` are substituted in card
text, labels, character names and ending text.

## Turn order (engine)

1. Apply chosen side: `fx` (clamped), `set`, queue `next`, add `chaos`.
2. Passive drift: Instinct +2, Belly −3 (every swipe, including `noTime`).
3. If the card was a crisis card, reset that meter to 50.
4. Advance time one slot unless `noTime` (4 slots/day, 14 days = 56 swipes).
5. Ending checks, first hit wins: card `end` → Joy 0 → Home 0 → trial over
   (after Day 14 Night) → otherwise queue crises for any cat meter at 0/100.
6. Draw next card: crisis → `next` queue → `intro` (Day 1 Morning) → `main`.

Complication rule built into the engine: with `allergies`, any choice that
increments `snuggles` has a 35% chance to make the owner sneeze (Joy −4).

## Endings (`endings.json`)

```json
{ "endings": [
  { "id": "returned_joy", "title": "Return to Sender", "kind": "lose", "char": "shelter",
    "text": "{owner} filled out the return form in pen.",
    "trigger": { "meter": "joy", "at": "low" },
    "when": [ { "mod": "partner" } ] },
  { "id": "adopted_legend", "title": "Forever Home", "kind": "win", "char": "owner",
    "text": "...", "trigger": { "win": true }, "when": [ { "meter": "joy", "gte": 90 } ] }
] }
```

| Field | Notes |
|---|---|
| `id`, `title`, `text`, `char` | required. `text` ≤ ~300 chars |
| `kind` | `lose` \| `win` \| `chaos` |
| `epithet` | optional, Reigns-style title for the cat on the ending beat, e.g. `"the Unreturnable"` → "Biscuit the Unreturnable". Falls back to a generic one |
| `trigger` | omitted = only reachable via a card's `end`. Otherwise one of the shapes below |
| `when` | conditions (same as cards); optional |

Trigger shapes:

| Trigger | Fires when |
|---|---|
| `{ "meter": "joy", "at": "low" }` | Joy hits 0 (normal mode) |
| `{ "meter": "home", "at": "low" }` | Home hits 0 (normal mode) |
| `{ "win": true }` | Day 14 Night ends with Joy ≥ 60 |
| `{ "trialFail": true }` | Day 14 Night ends with Joy < 60 |
| `{ "chaos": "home" }` | Chaos Mode: Home hits 0 |
| `{ "chaos": "time" }` | Chaos Mode: Day 14 ends |

For each trigger the engine scans endings **in file order** and takes the
**first** whose `when` passes. So put specific variants (partner, dog,
Albert, Joy ≥ 90) before the generic one, and always end each trigger group
with a variant that has no `when`. Win tiers: order them high to low, e.g.
`joy gte 90`, `joy gte 75`, then a plain `win`. Built-in fallbacks exist for
every trigger, but content should cover all of them.

## Owners (`owners.json`)

```json
{
  "owners": [
    { "id": "maya", "name": "Maya", "quirk": "wfh", "quirkLabel": "works from home", "weight": 10 },
    { "id": "albert", "name": "Albert", "quirk": "gamer", "quirkLabel": "...", "weight": 2 }
  ],
  "catNames": ["Biscuit", "Mochi"],
  "partnerNames": ["Sam"],
  "dogNames": ["Waffles"]
}
```

Quirks: `wfh`, `nightshift`, `plantparent`, `neatfreak`, `gamer`. The owner id
`albert` exists and gates `albert.json` via `{ "owner": "albert" }`.

## Characters (`characters.json`)

`{ "characters": { "<id>": { "name": "...", "emoji": "🧑", "color": "#f4c99a" } } }`

Ids: `owner`, `instinct`, `partner`, `dog`, `vet`, `neighbor`, `landlord`,
`roomba`, `plant`, `bird`, `reddot`, `shelter`, `albert`, `narrator`, `cat`.
`name` may use placeholders (`owner` is `"{owner}"`). `cat` is drawn as the
player's SVG cat instead of the emoji.

## Achievements (`achievements.json`)

```json
{ "achievements": [
  { "id": "gravity_tester", "title": "Gravity Tester", "icon": "🥛",
    "desc": "Knock 5 things off surfaces in one run.",
    "goal": [ { "flagGte": ["knocked", 5] } ],
    "unlocks": { "cosmetic": "bell_collar" } }
] }
```

Three not-yet-completed achievements are drawn as active goals per run. `goal`
uses card conditions plus the run-result ones; it is checked after every swipe
and at the end of the run, and an active goal completes the first time it
passes. `unlocks` is `{ "cosmetic": "<cosmetic id>" }` or `{ "flag": "<meta
flag>" }`; a meta flag makes `{ "meta": "<flag>" }` card conditions pass in
all later runs.

### Shared counter flags

Content sets these with `"+1"` (or `true` for bools); achievements read them:
`knocked`, `snuggles`, `bites`, `scratched_couch`, `wires_chewed`,
`slept_on_face`, `gifts`, `zoomies`, `counter_trips`, `litter_tracked`,
`plants_eaten`, `roomba_ridden` (bool), `dog_friend` (bool), `vet_survived` (bool).

## Cosmetics (`cosmetics.json`)

```json
{ "coats": [ { "id": "orange", "name": "Orange", "fur": "#f0a04b", "shade": "#d9822b", "belly": "#fbe3c4", "unlocked": true } ],
  "patterns": [ { "id": "tabby", "name": "Tabby stripes", "unlocked": true } ],
  "accessories": [ { "id": "bell_collar", "name": "Bell collar", "unlocked": false } ] }
```

Patterns and accessories are drawn by `web/js/catsvg.js`; their ids must be ones
it knows (`none`, `tabby`, `tuxedo_bib`, `calico_patches`, `socks`, `spots` / `none`,
`bell_collar`, `bow_tie`, `tiny_hat`, `flower`, `glasses`, `bandana`, `crown`).

## First-run onboarding

The title screen is just "Play". On the very first run `{ "meta": "firstRun" }`
passes, so a scripted tutorial can live in the `intro` bag: one `once` intro
card gated on `firstRun` (high weight) whose choices `next` into `chain` cards.
Later runs skip it and just get regular intro cards (or none).
