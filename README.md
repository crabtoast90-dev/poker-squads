# Poker Squads

**Play: https://crabtoast90-dev.github.io/poker-squads/** (`?seed=N` picks the deal, `?mode=squads` skips the start screen, `?tune=fight.enemyPower:3` tries a number by name, `?deck=S14,H14,C14,D14` draws those cards first, `?debug` shows FPS)

A prototype: play poker hands, each hand is born as a unit (suit = class, score = rarity), send it to one of two heroes' squads, then watch the squads auto-fight skeletons. It tests whether a big hand feels paid the moment its unit is revealed.

How it was built and why: `PLAN.md` (what shipped), `DECISIONS.md` (every call), `BALANCE.md` (the sim's report), `RESEARCH.md` (every source number), `LOG.md` (sessions, time and scores).

## For developers

- Run locally: `npm install`, then `npm run dev`.
- Self-check: `npm run check` (builds, plays a round through the buttons headless on laptop and phone, screenshots to `check-output/`). `npm run check -- --url=https://crabtoast90-dev.github.io/poker-squads/` checks the live site.
- Balance report: `npm run sim` (rewrites `BALANCE.md`). All numbers are in `src/squads/data.js`.
- Code: `src/squads/` is the pure, seeded sim (scorer, deck, birth, round, fight, bots, run); `src/view/` only shows what it decided.
- Session time: `npm run log-time` (see `CLAUDE.md`, End of every session).
