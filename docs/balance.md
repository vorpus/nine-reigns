# Balance

Numbers from `node tools/sim.js --runs 1000 --matrix` (seeds 1–1000, mods 0–2
at random unless a column says otherwise). Re-run that after any change to
`CONFIG` in `web/js/engine.js` or to card `fx`.

## Strategies (what each one knows)

| Strategy | Knows |
|---|---|
| `random` | nothing; coin flip |
| `greedy` | "greedy-joy": true fx, takes the side that leaves Joy highest, ignores everything else |
| `smart` | a sensible human: meter fills (±5), preview dots (small = 5, big = 12), direction guessed from the text (right 80% of the time, per card side and meter, fixed for the run), 10% of cards picked on a whim, doesn't know which choices end the run. Keeps Joy/Home up (concave score), steers Instinct/Belly off the edges, minds the win line from Day 10 |
| `oracle` | the same heuristic with the true fx and card endings; an upper bound, not a target |

The `smart` assumptions live at the top of `tools/sim.js` (`SIM_GUESS`,
`SIM_WHIM`, `SIM_NOISE` env vars override them). Sensitivity: at 85% guessing
smart wins ~80%, at 75% ~64%.

## Results

Before = commit `3fca0cf` data + engine, measured with the same new simulator.

| | Before win | Before swipes | After win | After swipes | Target |
|---|---|---|---|---|---|
| random | 0.2% | 33.7 | **3.9%** | 42.7 | 3–12%, ≥ 25 swipes |
| greedy | 0.0% | 30.5 | **16.9%** | 54.4 | 15–35% |
| smart | 7.3% | 45.9 | **69.4%** | 64.0 | 55–70% |
| oracle | 63.0% | 62.4 | 99.2% | 66.7 | (reference) |

Loss causes (share of losses), after:

| | Joy 0 | Home 0 | Trial failed | Card ending |
|---|---|---|---|---|
| random (before) | 14% | **85%** | 0.2% | 0.2% |
| random | 53% | 40% | 7% | 0.2% |
| smart (before) | 0.5% | **98%** | 0.5% | 0.5% |
| smart | 6% | **59%** | 35% | 0.3% |
| greedy | 0% | 100% | 0% | 0% |

Smart still loses mostly to Home (target ≤ 45% missed): Home is the meter a
careful player spends to vent Instinct. Pushing it lower cost random its win
rate in every variant tried (joy pressure kills random first).

Crisis bags, share of runs where each fires (before → after):

| | instinct high | instinct low | belly high | belly low |
|---|---|---|---|---|
| random | 47% → 55% | **0% → 46%** | **0% → 16%** | 73% → 24% |
| greedy | 100% → 100% | 0% → 10% | 0% → 9% | 69% → 27% |
| smart | 68% → 63% | 0% → 5% | 0% → 18% | 84% → 23% |

Complications (win rate, after):

| mods | random | greedy | smart |
|---|---|---|---|
| none | 4.4% | 22.4% | 73.7% |
| allergies | 4.5% | 18.5% | 65.9% |
| partner | 3.5% | 10.3% | 70.8% |
| dog | 5.0% | 19.6% | 70.5% |
| two | 4.1% | 9.7% | 63.5% |

Dog for random is within noise of none; smart and greedy find every
complication harder.

Chaos Mode (after; before every strategy hit `chaos_masterpiece` ~100%):

| | score p25 / median / p75 | endings |
|---|---|---|
| random | 59 / 70 / 85 | masterpiece 37%, tame 36%, timeout 27% |
| greedy (max chaos) | 108 / 117 / 124 | masterpiece 100% |
| smart | 91 / 102 / 112 | masterpiece 97% |

`chaos_timeout_tame` now fires below 65 chaos (was 150): about the median of
runs that time out. The `wrecking_ball` achievement (150 chaos) stays a stretch
goal.

Never drawn: only the `tut_*` cards, which need `meta.firstRun` (the sim never
sets it). `crisis_instinct_low_*`, `crisis_belly_high_*` and
`chain_vet_carrier_called` were never drawn before.

## Levers changed

Engine (`web/js/engine.js`):
- **Crisis detection bug**: a meter clamped to 0/100 by fx was pushed back off
  the edge by drift before the check (Instinct 0 → 2, Belly 100 → 97), so the
  instinct-low and belly-high crises could never fire. Now any touch of 0/100
  during the swipe queues the crisis.
- `CONFIG.start`: Joy 35 → 55, Home 70 → 75. `CONFIG.chaosStart`: Home 100 in
  Chaos Mode (new).
- `CONFIG.drift`: Joy −2 (new), Instinct +2, Belly −3 → −2.
- `CONFIG.crisisReset`: per bag; Instinct resets to 35 after a Feral Outburst
  (others 50). `crisisResetValue()` exported.

Cards (direction never flipped; text unchanged):
- Home drain: non-destructive vents lose their Home cost (chatter, yelling,
  pouncing into a bag, zoomies, sitting on the fridge…); medium damage
  −15 → −10, minor −10 → −5. A few tidy/restraint options repair Home +5
  (try the post, bring the earbud back, surrender the sweater, respect the foil…).
- Joy: bad-behaviour costs −10 → −5 and −15 → −10 on regular cards, so random
  play survives; Joy drift does the pressing instead.
- Instinct: sleepy/cozy choices now lower Instinct (nap, sleep at their feet,
  try the fancy bed, melt into a puddle, take a nap…).
- Belly: food choices raised a step (10 → 15, 15 → 20, 20 → 25), "Beg for a
  fourth" 10 → 20; overeating now happens.
- Crises: Home cost partly moved to Joy, then all crisis costs ×1.3 (rounded
  to 5, max 25).
- Dog: affection toward the dog raises Instinct more, dog crises and "Bat it
  off couch" cost Home, the friendship payoff gives a bit less Joy.
- `endings.json`: `chaos_timeout_tame` threshold 150 → 65.

Labels: no label can exceed 24 chars after substitution (longest: "Go sit with
Chewbacca", "Groom Chewbacca's ear", 21). The validator now checks labels
against the longest owner/partner/dog/cat names.

## Re-running

```
node tools/sim.js --runs 1000 --matrix          # full table (~2 min)
node tools/sim.js --runs 2000 --strategy smart  # one strategy, endings and draw counts
node tools/sim.js --mode chaos --runs 1000
SIM_GUESS=0.85 node tools/sim.js --strategy smart
```
