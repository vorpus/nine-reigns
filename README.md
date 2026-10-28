# nine-reigns

A *Reigns*-style swipe-card game for the browser. You are a newly adopted cat
on a two-week trial: swipe left or right through fourteen days of counters,
charger cables and 3 AM zoomies, and keep your human happy enough to adopt you
for good. Static site, no build step, no dependencies. Mobile-first.

**Play:** https://vorpus.github.io/nine-reigns/

- Spec: [`docs/PRD.md`](docs/PRD.md)
- Data formats (cards, endings, owners, achievements, cosmetics):
  [`docs/data-format.md`](docs/data-format.md)

## Run locally

Any static file server pointed at `web/` works:

```sh
python3 -m http.server -d web 8000   # then open http://localhost:8000
# or
npx serve web
```

Opening `index.html` straight from disk won't work (ES modules need HTTP).

Handy URL params:

| Param | Effect |
|---|---|
| `?debug=1` | exposes `window.__game` (state, `start()`, `choose('left')`, `set({joy: 90})`) |
| `?seed=123` | deterministic new runs |
| `?reset=1` | wipes the saved run and all meta progress |
| `?resume=1` | jump straight back into a saved run |
| `?deck=path/index.json` | load a different card manifest (paths relative to it) |

## Check

Node 20+ is the only requirement (no `npm install`).

```sh
node tools/validate.js          # schema + reference checks for web/data; non-zero exit on errors
node --test tests/*.test.js     # engine unit tests (use fixtures, not the real content)
node tools/sim.js               # balance report: win rate, run length, endings, crises, card draw counts
node tools/sim.js --runs 5000 --strategy smart --mods 2
node tools/sim.js --runs 1000 --matrix   # every strategy x complication + Chaos Mode (see docs/balance.md)
```

`npm run validate`, `npm test` and `npm run sim` are aliases.

## Share image and icons

`web/og.png` (1200×630), `web/apple-touch-icon.png` and `web/favicon.svg` are
generated from `tools/og.html` (which reuses the game CSS and cat SVG):

```sh
node tools/og.js                # needs Playwright + Chromium
```

Re-run it after restyling.

## Layout

```
web/                 the deployed site
  index.html
  css/tokens.css     colors, fonts, sizes, timings (restyle here)
  css/style.css
  js/engine.js       pure game rules (also imported by tools and tests)
  js/swipe.js        pointer/touch gesture
  js/ui.js           DOM rendering
  js/catsvg.js       the player's cat portrait
  js/icons.js        HUD icons, segment digits, hand hint
  js/onboarding.js   first-run tutorial wiring, cat numbers, epithets
  fonts/             Space Mono woff2 (SIL OFL, see fonts/OFL.txt)
  js/storage.js      localStorage save/meta
  js/main.js         boot + screen flow
  data/              cards, endings, owners, characters, achievements, cosmetics
tools/               validate.js, sim.js, og.js
tests/               node --test suites + fixtures
```

## Deploy

`.github/workflows/pages.yml` validates, tests and publishes `web/` on every
push to `main` (or via *Run workflow*). One-time setup: in the GitHub repo go to
**Settings → Pages → Build and deployment → Source** and choose **GitHub
Actions**. `.github/workflows/ci.yml` runs the same checks on pull requests and
other branches.
