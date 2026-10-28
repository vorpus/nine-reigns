# Reigns — Game-Design Research

A design reference for building a static, mobile-first web game on the Reigns swipe mechanic. It covers what Reigns does and why it works. Our own theme comes later.

**Confidence tags:** **[V]** means two or more sources agree, or the developer said it. **[S]** means one source, usually a fan wiki or one review. **[U]** means unverified: it comes from general knowledge or gameplay footage and should be checked before we rely on it.

---

## 0. Series at a glance

| Title | Year | Twist on the formula | Meters |
|---|---|---|---|
| **Reigns** | Aug 2016 (iOS/Android/PC; Switch 2018) | Medieval king, a dynasty of successors, and a Devil curse meta-arc | Church, People, Army, Treasury **[V]** |
| **Her Majesty** | Dec 2017 | Play the queen consort. Adds **items dragged onto cards**, a **zodiac sign per reign** and hints/shortcuts | Same four, re-skinned **[V]** |
| **Game of Thrones** | Oct 2018 | Several **playable characters with perks**, Melisandre's "visions" framing, minigames (joust, tavern fights) | Same four **[V]** |
| **Beyond** | Nov 2020 (Apple Arcade; PC/Switch 2024) | Sci-fi rock band touring planets, space dogfights, gigs, death sends you back to the last planet | Different set (one review lists Power/Oxygen/Crew Morale/Shield) **[S/U]** |
| **Three Kingdoms** | Nov 2022 (Netflix; later PC/Switch) | Turn-based **card battles** with recruitable heroes, async PvP | Four meters **[U]** |
| **The Witcher** | Feb 2026 | Licensed spin-off | not researched |

Original team (Nerial, London; publisher Devolver; Unity): **François Alliot** (design, code, writing), **Mieko Murakami** (art; the Tinder-swipe idea was hers), **Disasterpeace** with Mateo Lugo (music). Production took about 6 months **[V]**. More than 2M copies sold by 2019 **[S]**. Her Majesty: writer **Leigh Alexander**, art by Arnaud de Bock, music by Jim Guthrie **[V]**. A free 10th-anniversary update (Aug 2026) added about 190 cards, new objectives, deaths and a hidden ending **[V]**.

---

## 1. Core loop

- **One card on screen at a time.** Each card shows a character portrait and a short prompt from an advisor or petitioner, usually 1–2 sentences. The character's name appears under the card **[V/U]**.
- **Binary answer.** Swipe **left or right**. Each direction has its own **short choice label** (2–5 words, e.g. "Yes", "Burn them", "Not now") that appears **only while you drag** that way. The prompt is the question and the labels are the answers. Labels often subvert the plain yes/no for humor **[U, consistent with all gameplay footage]**.
- **Resolve.** Release past the threshold and the card flies off. Meter changes animate, then the next card is drawn.
- **Time.** In the original, **each swipe advances one year** of the reign. Reviews say "the turn ends and a year passes" and "each swipe counts as one year" **[V, 2 reviews; exceptions such as sub-events not confirmed]**. A global calendar persists across kings (the "Meet the Devil" deed happens around year 666, and "Pass the first millennium" is a deed) **[S]**. Score = years in power; reigns rarely last past ~30 years early on **[S]**.
- **Reign end.** A meter hits 0 or full, or a story card kills you directly. A **death card** and a death illustration follow, and then the **next ruler** takes the throne at once **[V]**.
- **Between reigns.** Completed objectives are shown and new ones assigned. Unlocked cards and characters enter the deck **[V]**.

## 2. Resources: the four meters

- **Church, People, Army, Treasury**, shown as four icons at the **top of the screen**. Each icon "fills" like a liquid level **[V]**. Values are hidden; you only see the fill.
- **Choice preview.** Drag a card partway and **dots appear under the meters that choice will affect**. A **bigger dot means a bigger change**. The **direction (up/down) is never shown** **[V for "hint of which metrics will be affected… how it will change is not revealed"; dot size = magnitude is widely documented but U on exact sizes]**. Typically 2 dot sizes (small/large).
- **Two-sided failure.** A reign ends when **any meter hits 0 or 100%** **[V]**. Too much power kills you as surely as too little: an all-powerful Church martyrs you, a maxed Army stages a coup, too much Treasury and you choke on your wealth. This is **the central design idea**:
  - No meter can be "maxed for safety". Every meter is a band you must keep near the middle.
  - "Good" choices become dangerous. Pleasing the People when People is already high is a mistake.
  - Most choices trade off two or more meters, so a single swipe is a small puzzle about direction and magnitude under uncertainty.
  - Eight distinct stat deaths (4 meters × 2 ends) give each one its own death card and flavor.
- **Hint upgrade.** In Reigns, eating the **orange mushroom** grants "Clarity": **numbers and question marks replace the dots**, showing exact values **[S, wiki]**. This works as a reward and an accessibility valve.
- **Death mitigators (status effects).** Built structures can save you **once** from a specific stat death, at a cost: a Barn stops People hitting 0 (costs Army), High Walls do the same for Army, a Cathedral for Church (costs Treasury), a School for People at max **[S, wiki]**. The general's coup at max Army has no counter **[S]**.
- **Drift over time.** Some events add **per-tick drift** (Crusade, Silk Road, Black Death, Slaver). A meter rises or falls continuously until the event ends. Some of it is **real-time per second**, which pressures slow players **[S, wiki + review complaint about rushed crusades]**.
- **Danger tell.** Alliot describes a subtle **blinking indicator** when advisors are getting angry: "no one will notice," but it adds tension **[V, interview]**.

## 3. Death, succession and meta-progression

- **Death is the "level end".** Each of the 8 stat-extreme deaths has its own card scene, and many story deaths exist on top of those (duels, dungeon traps, illness, assassinations, old age). **Reigns has 29 deaths** ("Memento Mori" gallery), **Her Majesty 31**, and **GoT 29** **[V]**. Death type can depend on **state** as well as the meter. Example: Army max **with a male heir** means the son kills you, **without** one you are locked away **[S, wiki]**. So the same failure plays out differently depending on context.
- **Dynasty.** Play continues as the next king (King X the Y). The world, calendar, built structures and some characters **persist** across reigns **[V]**. Decisions by earlier kings affect later ones **[V]**.
- **Objectives / "Royal Deeds".** **Three objectives** are active per reign **[S, review]**, drawn from **45 deeds** in Reigns **[S, wiki]** and 49 in GoT **[S]**. Examples: govern 5/20/40/60/80 years, win a duel, try the blue mushroom, recruit the Spy, build a cathedral, date a pigeon. Completing a deed gives the king an **epithet** ("the Duelist", "the Lover") and **unlocks new cards or characters** into the deck **[V]**. Some deeds stay hidden as "???" until discovered **[S]**.
- **Collection screens.** Deaths gallery, character portraits and a card-discovery counter. These metas push completionists toward a "one more reign" habit **[V]**.
- **Meta-arc (Reigns).** Around year 666 the **Devil** appears. The dynasty is cursed to repeat. To break it you must **unmask the Senator** (deed "the Doomed"), learn from the Lady that the Devil must be given an **impossible task**, find **Kloc** the skeleton in the **dungeon** (the "Pungeon"), free him with strawberries, and so on. The Devil's visits are limited, so you can miss the window. Guides list **3 endings** **[V across fan guides; exact steps vary, U]**. This is a long chain spread over many reigns, so each short run serves a longer goal.
- **Her Majesty.** **Inventory of up to 5 items** that you drag onto cards. Items can **bypass the two options**, create new outcomes or prevent a death. Using the wrong item too often can itself kill you ("Not an avid gamer" death) **[V]**. Each queen has a **zodiac sign**, and some cards and solutions only work under certain signs **[V]**. The ending is a multi-reign puzzle (All-Mother, blank spellbook, a duel with your mirror self) **[S]**. Alliot: "we tried to help the players… [instead of hiding] everything deep in the game" and added **hints and shortcuts so players wait less for specific cards** **[V]**.
- **Game of Thrones.** You play as different characters, each with **perks** that counter specific dangers (Daenerys summons a dragon, Tyrion finds coin). Melisandre's visions explain the respawn **[V]**.

## 4. Card system and content architecture

**Selection algorithm ("the bag"), as Alliot describes it [V, Game Developer deep dive]:**
1. Start with **every card** in the game.
2. **Remove cards whose conditions don't match state.** Examples: no queen cards if unmarried, no strong-church cards if Church is weak.
3. **Remove recently played cards** (a cooldown).
4. Give each remaining card a **size (weight)**. Bigger cards are more likely to be drawn.
5. **Draw one at random.** The bag is **rebuilt after every swipe**.

- **Event dominance through weighting.** When a war starts, its ~10 cards are heavy and crowd the bag, so war dominates. When the war ends they drop out and condition-free filler (the Jester) becomes more likely again. You get pacing without any scripting.
- **Sub-bags for special modes.** Duels and the dungeon **lock play into a tiny sub-bag**. A **one-card bag** is simply a **linear scripted sequence** (the Devil encounters). One mechanism covers random, weighted and fully authored play **[V]**.
- **Quality-based narrative.** It loosely follows Failbetter's (Fallen London) QBN: global "qualities" (flags, counters, meters) gate cards **[V]**.
- **Content layering (writing order) [V]:** (1) one-shot cards → (2) mini-storylines spanning a few reigns → (3) add-ons: new characters and events permanently added to the deck → (4) the Devil arc → (5) set pieces that lead players somewhere unexpected.
- **Follow-ups.** A choice sets a flag or counter, and that flag makes a follow-up card eligible, often with high weight. Examples: the Explorer asks for money repeatedly until he finds the New World; the Minstrel's war song pays off later **[S, wiki]**. Chains can span reigns.
- **Characters.** ~38–40 recurring characters in Reigns (Priest, General, Jester, Witch, Doctor, Spy, Dog "Rex", Devil, Skeleton…) **[S, wiki list]**. Each has a voice and a theme. The portrait is the main visual on the card.
- **Status effects / items (Reigns).** **4 slots** at the bottom of the screen show ongoing states: objects (Excalibur), infrastructure (hospital), king conditions (old age), events (plague). A 5th one pushes out the oldest **[S, wiki]**. These are visible flags.
- **Minigames / special events:** **Duels** (a rock-paper-scissors-like card exchange against the Skeleton, Barbarian, Nobleman, Prince; losing kills you), **the Pungeon** (a door-choice maze with alchemical symbols in which all meters drain over time; treasure, torch, key, Excalibur, traps), **dice game** with Loosetongue, **hunts** (random outcome) **[S, wiki]**. Her Majesty adds pistol duels; GoT adds jousting and tavern fights; Beyond adds dogfights and gigs; Three Kingdoms adds turn-based card battles.
- **Card counts.** Reigns ≈ **800** at launch (fan counts 770–870 across patches; one claim of ~887 after the anniversary update; +190 in 2026). Her Majesty ≈ **1,200–1,300** **[S, both "citation needed" level]**. The first playable had **50 cards**, and Alliot says the game "started to show something" at that point **[V]**. So the loop works with a small deck, and depth comes from volume plus conditions.
- **Why random + authored works.** Once players notice that some cards react to their past, they read meaning into **every** card. It is hard to tell random cards from authored ones (did the blue mushroom come from the witch or the plague?) **[V, Alliot]**. Alliot calls the system "a grammar" for surprises, with no fixed content cap, and says its imperfections suit the weird tone **[V]**.

## 5. What makes it deep

- **Partial information.** You know *which* meters will move and roughly *how much*, but not *which way*. You must infer direction from the text, which makes reading the card a skill.
- **Two-sided bounds.** A balancing act on four axes at once. Every "good" outcome can tip a meter over its bound.
- **Delayed consequences.** Flags set now unlock cards later, sometimes many reigns later (the Explorer, the Witch's old-age curse, the doctor becoming executioner and then a plague).
- **Conditional deaths and saves.** Infrastructure and items change which death you get or whether you survive one. This rewards longer-term investment.
- **Survival vs. objectives.** Deeds often demand risky behavior (start a crusade, try a mushroom, enter the dungeon), which pulls against staying balanced. Players deliberately "spend" a reign to chase an objective.
- **Meta-knowledge as progression.** Players learn card behavior across runs. The real progression is the player's own knowledge plus an expanding deck.
- **Emergent strategy.** Players deliberately push a meter high to set up a needed outcome, or use a death type to complete a deed.

## 6. What makes it fun

- **The gesture.** Alliot: weighting swipes with consequences on 4 dimensions "gave a lot of meaning to very simple swiping gestures." He also said of Tinder: "a dating app, but they forgot it's a toy" **[V]**. Swiping is tactile: card tilt, a flick, then an instant result.
- **Tone and writing.** Deadpan, absurd, Monty-Python-ish ("Python-esque text adventure roguelike") **[V]**. Short prompts with a punchline in the choice labels. Werewolf weddings, dating a pigeon, a talking vase **[S]**. Influences: Oulipo-style constraint writing, Brexit-style binary politics **[V]**. Her Majesty's writing rule: each card must **express the character, reveal something about the world, and give enough information to guess what each swipe does** **[V, Leigh Alexander]**.
- **Brevity.** A reign lasts minutes. You can play one-handed in a queue, and each run is a complete arc.
- **"One more reign".** Instant restart after death, plus three fresh objectives, plus new cards trickling in.
- **Failure as content.** Deaths are illustrated, funny and collectible, so losing feels like a reward.
- **Readable at a glance.** Flat, faceless, geometric character art (Murakami) on solid colors. Each character is recognizable by silhouette and color **[V for art credit; style description U]**.
- **Audio.** An ambient, adaptive soundtrack. Her Majesty adapts sound to swipe tempo **[V]**. Characters speak **gibberish vocal barks**, which are charming but became "grating after an hour" for at least one reviewer **[S]**.
- **Device play.** Her Majesty uses vibration and a fake screen-glitch "ghost in the machine" **[V]**.

## 7. Criticisms and how sequels responded

| Criticism | Source signal | Sequel response |
|---|---|---|
| **Repetition**: the same cards come back, and "lack of variety" over long play | Reigns reviews, Guardian, OpenCritic; Her Majesty (NGN); Beyond (Guardian: "within a couple of hours") **[V]** | More cards (HM ~1.2k), recency cooldowns, characters with perks (GoT), zodiac rotation (HM) |
| **Shallow agency**: binary choices, "a balancing act more than a moral dilemma" | Guardian, reviews **[V]** | Items as a third option (HM), minigames (GoT), card battles (3K) |
| **Opaque / waiting on RNG**: needed cards appear at random, so progress stalls | Alliot's own comments on HM **[V]**; dice and hunt RNG **[S]** | HM hints and shortcuts; items trigger events directly |
| **Confusing cards / obscure puzzles**: unclear effects, cryptic meta-quests | Guardian ("poorly designed and confusing"); PC Gamer on the HM zodiac; obscure Devil steps **[V]** | Partly unaddressed. Puzzles stayed cryptic, and the HM zodiac drew criticism of its own |
| **Harsh reset / real-time pressure** | Gaming Trend (crusades rush you) **[S]** | — |
| **Minigames shallow** | Beyond gigs "repetitive, inconsequential"; dogfights frustrating **[S]** | Lesson: bolt-on minigames add little unless they connect to the meters and story |

## 8. UI/UX details for a mobile web build

Layout and behavior below are from gameplay footage and general knowledge **[U]** unless noted. They are consistent across the series.

**Layout (portrait), top to bottom**
1. **Meter bar**: 4 icons in a row, each filling from the bottom. **Preview dots** appear just below each icon while you drag **[V for dots/hint]**.
2. **Prompt text**: the card's question, above the card, 1–3 short lines.
3. **Card**: about 60–70% of screen width, a square-ish portrait card. While you drag, the **choice label overlays the top of the card** (left label when dragging left, right label when dragging right).
4. **Character name** below the card.
5. **Footer**: ruler name and **years in power**, plus status/item slots (4 in Reigns, 5 in HM) **[S]**.
- A dark, solid background. Card back(s) peek behind to suggest a deck.

**Drag behavior (spec to implement)**
- The card follows the finger horizontally (and slightly vertically) and **rotates around a pivot below the card** (about ±10–15°), proportional to dx.
- **Label fades in** with |dx| and **dots fade in** once past a small dead-zone (~10–15% of width). This lets players "peek" without committing, and peeking is a core skill **[V]**.
- **Commit threshold**: around 30–40% of card width, or a fast flick (velocity). Below the threshold the card **springs back** on release.
- On commit: the card flies off in the swipe direction with its current rotation. Meters animate their fill change (the icon flashes, the fill grows or shrinks) **[U]**. Then the next card flips or slides in (~200–300 ms).
- Desktop: mouse drag plus **←/→ keys**. A key press could show the preview first and commit on a second press, or show the preview on hold. Tap or click to dismiss info-only cards.
- Info/narration cards with a single "continue" (both directions do the same thing) keep the pace in chains.
- Haptics: `navigator.vibrate` (Android only) on commit and death.

**Feedback and polish**
- Strong **death sequence**: a dedicated card, an illustration, the reign summary (name, epithet, years), then the next ruler.
- **Danger states**: a subtle pulse or blink on a meter near either extreme **[V, Alliot's "blinking"]**.
- **Minimal text**: one tap-free gesture per decision. No menus during play.
- **Accessibility**: respect `prefers-reduced-motion`, keep the meters' fill readable without relying on color, offer an optional numeric-hint mode (the "orange mushroom" as a setting).

## 9. Takeaways for our build

### Replicate (priority order)
1. **Swipe card with drag preview**: tilt, a choice label per side, **meter dots showing which meters move and how much, never the direction**, a commit threshold and spring-back. This is the whole game feel. Build it first and tune it.
2. **Four meters that fail at both ends.** Keep values hidden (fill only), start around 50, and give **8 distinct stat deaths**.
3. **Weighted, conditional bag draw** rebuilt every turn, with **cooldowns**. A single mechanism covers filler, events, chains and scripted sequences (one-card bags).
4. **Flags/counters + follow-up cards** for delayed consequences and short chains.
5. **Persistent meta**: dynasty succession, **3 active objectives** per run that unlock new cards, a death gallery, and save state in `localStorage`.
6. **Funny, short writing**: a prompt of at most ~140 characters, labels of at most ~20 characters, each card showing character + world + a guessable consequence.
7. A **long meta-arc** that spans runs (the Devil equivalent), to give a direction beyond survival.
8. **Instant restart** and short runs.

### Pitfalls to avoid
- **Repetition**: write enough cards. Aim for 150–250 for a v1, knowing Reigns started to work at 50 and shipped about 800. Use cooldowns and condition-gated variety.
- **RNG-blocked progress**: give objectives and meta-quests **shortcuts or rising weights** so a needed card shows up reliably (HM's lesson).
- **Obscure puzzles**: drop hints through characters. Never require trial-and-error across many runs without hints.
- **Unreadable consequences**: if text doesn't let players guess the direction, the choice is a coin flip. Playtest for "guessability".
- **Real-time drain**: avoid it, or keep it gentle. It clashes with relaxed mobile play.
- **Bolt-on minigames**: only add them if they reuse the swipe and affect the meters.
- **Grating audio loops**: keep barks short and varied, and offer a mute.

### Data model sketch

```jsonc
// cards.json — authored content
{
  "id": "general_new_weapon",
  "character": "general",            // portrait, name, voice
  "text": "Sire, my engineers built a fire-spitting tube. Shall we test it?",
  "weight": 10,                       // bag "size"; can be an expression
  "cooldown": 30,                     // turns before it can reappear
  "unique": false,                    // once per game / per reign
  "priority": 0,                      // >0 = forced next (chains, one-card bag)
  "conditions": [                     // ALL must pass
    { "flag": "met_general" },
    { "meter": "army", "lt": 70 },
    { "not": { "flag": "weapon_tested" } },
    { "counter": "reign_year", "gte": 5 }
  ],
  "left":  { "label": "Too dangerous",
             "effects": { "army": -10, "treasury": +5 },
             "set": { "general_angry": "+1" } },
  "right": { "label": "Light it!",
             "effects": { "army": +15, "people": -5 },
             "set": { "weapon_tested": true },
             "next": "general_weapon_backfire",    // queued follow-up (sets priority)
             "chance": [ { "p": 0.3, "next": "death_explosion" } ] }
}

// deaths.json — stat deaths resolved by first matching rule
{ "meter": "army", "at": "max",
  "variants": [ { "if": { "flag": "has_heir" }, "card": "death_son_coup" },
                { "card": "death_locked_away" } ] }

// objectives.json
{ "id": "duelist", "title": "the Duelist", "goal": { "flag": "won_duel" },
  "unlocks": ["cards:skeleton_*"] }

// save (localStorage)
{ "meters": { "church":50, "people":50, "army":50, "treasury":50 },
  "flags": {}, "counters": { "year": 0, "reign_year": 0, "reigns": 3 },
  "cooldowns": { "card_id": 12 }, "queue": [], "statuses": [],
  "meta": { "unlockedCards": [], "deathsSeen": [], "objectivesDone": [], "activeObjectives": [] } }
```

Engine notes: meters clamp to 0–100 and death is checked after applying effects. The **preview dot size** comes from |effect| (e.g. 1–9 = small dot, 10 and up = big dot). Effects of 0 show no dot. A `bag` can be scoped (`"bag": "dungeon"`) so special modes draw from a sub-deck. Advance `year` per swipe, except on cards flagged `"noTime": true`.

---

## Unverified / uncertain

- Exact preview dot sizes and thresholds; the swipe commit threshold, rotation and animation timings. These come from footage and convention, not from any source.
- Whether *every* card, including chain and sub-event cards, advances the year in the original.
- Exact card totals (fan counts conflict; Wikipedia's HM figure is "citation needed").
- Beyond's and Three Kingdoms' exact meter names. Exact Devil-arc steps and number of endings (fan guides differ).
- The Reigns fandom wiki is incomplete and fan-edited. Its pages are flagged as unsure in places.

## Sources

- Game Developer: *Game Design Deep Dive: Creating an adaptive narrative in Reigns* (Alliot): https://gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-
- Game Developer: *How Reigns' lead developer made politics feel as goofy as Tinder*: https://gamedeveloper.com/design/how-i-reigns-i-lead-developer-made-politics-feel-as-goofy-as-tinder
- Game Developer: *Why being trapped in a loop makes Reigns: Her Majesty so satisfying*: https://gamedeveloper.com/design/why-being-trapped-in-a-loop-makes-i-reigns-her-majesty-i-so-satisfying
- GDC 2017, Alliot: *The Casual (but Regal) Swipe*: https://gdcvault.com/play/1024278/The-Casual-(but-Regal)-Swipe and summary https://gamedeveloper.com/design/video-swipe-rite---crafting-i-reigns-i-elegant-game-mechanics
- GDC 2018, Leigh Alexander, Her Majesty narrative design: https://gamedeveloper.com/design/video-the-narrative-design-of-i-reigns-her-majesty-i-
- GamesBeat: *Building Reigns: Her Majesty's queendom*: https://gamesbeat.com/?p=149613
- PC Gamer: *How Reigns and its sequel make their 'Tinderocracy' work*: https://pcgamer.com/how-reigns-and-its-forthcoming-sequel-make-their-tinderocracy-work
- Wikipedia: Reigns https://en.wikipedia.org/wiki/Reigns_(video_game) · Her Majesty https://en.wikipedia.org/wiki/Reigns:_Her_Majesty
- Reigns Fandom wiki (via API): Deaths, Royal Deeds, Strategy, Items, The Pungeon, Kloc, Deaths (Her Majesty): https://reigns.fandom.com/wiki/Deaths · https://reigns.fandom.com/wiki/Royal_Deeds · https://reigns.fandom.com/wiki/Strategy · https://reigns.fandom.com/wiki/The_Pungeon
- MacStories: *Game Day: Reigns* https://www.macstories.net/reviews/game-day-reigns/ · *Reigns: Game of Thrones review* https://www.macstories.net/?p=56754
- Gaming Trend review: https://gamingtrend.com/reviews/well-never-be-royals-reigns-review/
- TouchArcade Game of the Week: https://toucharcade.com/2016/08/12/toucharcade-game-of-the-week-reigns/ · HM review https://toucharcade.com/2017/12/07/reigns-her-majesty-review/
- PC Gamer HM review: https://www.pcgamer.com/reigns-her-majesty-review/
- OpenCritic Reigns: https://opencritic.com/game/3110/reigns/reviews · Beyond: https://opencritic.com/game/16590/reigns-beyond
- Guardian, *Reigns Beyond review*: https://www.inkl.com/news/reigns-beyond-review-sci-fi-silliness-meets-rock-band-road-trip · God is a Geek: https://godisageek.com/reviews/reigns-beyond-review/
- Trusted Reviews GoT: https://trustedreviews.com/reviews/reigns-game-thrones · Gamereactor GoT: https://www.gamereactor.eu/reigns-game-of-thrones-review/
- Three Kingdoms: https://indigo-pearl.prezly.com/reigns-three-kingdoms-brings-epic-tale-of-romance--war-to-netflix-today · https://www.mobygames.com/game/203229/reigns-three-kingdoms/
- 10th anniversary update: https://www.pocketgamer.com/reigns/10th-anniversary/ · https://allthings.how/reigns-10th-anniversary-update-190-new-cards-free-on-pc-and-mobile/
- Fan guides, Devil arc: https://www.appunwrapper.com/2016/08/12/reigns-walkthrough-guide-how-to-trick-the-devil/ · Steam card-count threads: https://steamcommunity.com/app/474750/discussions/0/343786195673618704
- Swipe interaction prototype analysis: https://kat-reilly.squarespace.com/journal/2016/10/14/reigns-card-interaction
