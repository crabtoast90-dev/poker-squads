# Poker Squads

**Shelved 2026-11-22: read `LEARNINGS.md` before doing anything here.**

When the user asks for ideas, options, or a plan, give them that and stop.

## The game
A prototype that answers one question: is it fun to play poker hands that are born as units for an auto-fight, and does a big hand feel paid the moment its unit is revealed? A run is 8 rounds; each round you play 6 poker hands (52-card deck, hand of 8, play up to 5, 4 discards), each hand is born as a unit (suit = class, score = rarity), you send it to one of your two heroes' squads, then the squads auto-fight skeletons. **Current priority: build speed.** Everything on screen is cards (units, heroes, skeletons as cards with numbers; the fight is cards trading hits with health bars). No 3D, art, phone check or polish until Brian says so.
- On screen: original names only. Never show the source game's name, art or joker names (docs may cite it: `RESEARCH.md`). Cards, flashes and sounds made in code.
- Cut (in `IDEAS.md`, not the build): shop, relics/jokers, consumables, bespoke art, more heroes, boss rules, meta between runs, army-wide hand bonuses, opening volley, card-soldier court theme.

The user (Brian) is a game designer, not a programmer: report in plain language, no code. He makes design, feel and look calls; you make every technical call. Log his calls in `DECISIONS.md`; log yours there too, marked *(my call)*.

## How it's built
- **Sim first.** Rules live in `src/squads/` (pure, seeded, no three.js/DOM/`Math.random`/clock): `data.js` (every number, by name), `poker.js` (scorer), `sim.js` (deck, birth, round), `fight.js`, `bots.js`, `run.js` (the whole run: heroes, rounds, bounties, gold, keep, shop, rites), `power.js` (combat power). `src/view/` and `src/main.js` only stage what the sim decided. Player input enters as actions (`heroes`, `play`, `discard`, `choose`, `resolve`, `keep`, `buy`, `rite`, `reroll`, `leave`).
- **Numbers** only in `src/squads/data.js`. Poker numbers come from `RESEARCH.md` with its confidence marks.
- **`npm run sim`** rewrites `BALANCE.md` against Brian's targets (pass/fail). Quote the headline back. **Prototype rule (Brian): no significant time on tuning.** Report misses and move on; only fix numbers that make the build unplayable or hide what a feature does. For tuning, offer three candidate sets that each hit every target; fix timing or structure before stats.
- Stack: three.js (pinned), Vite, plain JS. Credit any asset in `CREDITS.md` the same day; never fetch art mid-session.
- Test hooks: `?test` (manual clock, `__game.advance(ms)`), `?seed=N`, `?mode=squads`, `?tune=fight.enemyPower:3`, `?deck=S14,H14` (cards drawn first), `?relics=pokerFace,pokerPair` (start holding relics), `__game.state()/stateText()/bot()`.

## Self-check
`npm run check` (~15 s) plays whole runs through the real buttons on laptop (bot picks the moves; phone runs are off during the build-speed phase), screenshots the reveal stages and the fight, and fails on console errors, failed requests, a stuck screen, or a round/fight that differs from Node. `npm run check -- --url=https://crabtoast90-dev.github.io/poker-squads/` checks the live site; `--only=legendary` for quick iteration. Open the screenshots and say in one line what you see before merging.

## Deploy and merge rule
Every push to `main` deploys: https://crabtoast90-dev.github.io/poker-squads/
Work on your own branch. Check passes and screenshots opened → rebase on main, recheck if main moved, merge, push. One merge at a time. If a lane touches shared files (`src/squads/*`, `src/main.js`, `scripts/*`) or its check failed once, a fresh-eyes reviewer agent that did not build it reads the diff, screenshots and `BALANCE.md` before the merge.

## Files to keep up to date
`PLAN.md` (tick when merged), `DECISIONS.md`, `IDEAS.md`, `RESEARCH.md`, `CREDITS.md`. Kit upkeep: if this project improves the starter, update `game-kit/` in practice-rpg and merge it to its main.

## End of every session
Ask for fresh fun and look scores (1-5), "Did the big hand feel paid?" and "Anything annoy you this session?" Put answers in Brian's words in the `LOG.md` row (time columns `-`), commit, then as the very last step run `npm run log-time -- --row="<session name>" --session=<session id>`, commit and merge `timelog/` and `LOG.md`.
