# Plan

Each item can be pasted alone into a fresh session. Every session reads `CLAUDE.md` first, follows the merge rule, adds steps to `npm run check`, and reruns `npm run sim` if it touches the sim or `src/squads/data.js`.

**SHARED files** (name them when you touch them; second to merge rebases and rechecks; a fresh-eyes reviewer agent reads the diff, screenshots and BALANCE.md before merging): the card and unit data `src/squads/data.js`, the poker scorer `src/squads/poker.js`, the sim core `src/squads/sim.js` (+ `bots.js`, `run.js`), the fight `src/squads/fight.js`, plus `src/main.js`, `index.html`, `src/style.css`, `scripts/check.mjs`, `scripts/sim.mjs`.

**Current priority (Brian, 2026-11-22): build speed first.** Everything on screen is cards: no 3D, no art, no polish; laptop check only.

## Setup lane: the feel slice + shared core
- [x] **0. Setup.** Starter copied, RESEARCH.md, sim core (deck, scorer, birth, fight, bots, run), first BALANCE.md, one playable round as cards (6 hands with odds and reveal, Knight + Witch heroes, squad pick, one fight with 1x/2x and Skip), Pages deploy, check passing on the live site.
- [ ] **0b. Brian checks RESEARCH.md.** Corrections go into RESEARCH.md, `poker` in data.js, and DECISIONS.md. No tuning before this.

## Lane A: the full 8-round run with deck return
- [ ] **A1. Run on screen.** After the fight: lives (3), round counter, next round's skeletons, round 8 boss, run won/lost screens. The 6 units become cards (suit, number, rarity bonus chips) and replace deck cards by the rule in `returnRule`. Files: `src/view/squads-view.js`, `src/main.js`, `index.html`, `src/style.css`, `scripts/check.mjs`; SHARED `src/squads/sim.js`, `run.js`.
  *Done when:* the check plays a whole run through the buttons (bot moves, Skip on fights) and its deck and results match `runRun` in Node; returned cards show their rarity border and +chips in the hand.
- [ ] **A2. Pick the deck-return rule.** After A1. Brian picks from BALANCE.md's three candidates (or asks for more). Files: SHARED `data.js`, `run.js`.
  *Done when:* BALANCE.md's drift row passes with the picked rule.

## Lane B: heroes and hero events
- [ ] **B1. Pick 2 of 4 heroes at run start.** Files: `index.html`, `src/view/squads-view.js`, SHARED `sim.js`, `data.js`.
  *Done when:* the check starts a run with each pair once and the fight matches Node.
- [ ] **B2. Hero events.** A hand sometimes births a hero event (chance rises with score; class from the suit roll). Own that hero: it levels up. Don't: swap it in (replaced hero becomes a Legendary Ace of its suit in the deck) or level one of yours. The hand is free (still 6 units). Files: SHARED `sim.js`, `data.js`, `fight.js` (hero levels), `bots.js`; view; check.
  *Done when:* BALANCE.md shows events per round, and the check screenshots an event and both choices via `?deck`.

## Lane C: tuning (after 0b, A1 and B2)
- [ ] **C1. Three candidate tuning sets** that each hit every target in BALANCE.md (greedy clears 20-35%, class-aware +10 points, hero events 0.7-1.3/round, round-8 four-of-a-kind-or-better under 25%, early Legendary 5-15% of runs, fights 15-25 s, run 15-25 min). Fix timing or structure before stats. Files: SHARED `data.js`, `scripts/sim.mjs`.
  *Done when:* Brian picks a set and BALANCE.md passes with it.

## Later (only if Brian asks)
- [ ] **D1. Bring back 3D / look.** The 3D version (KayKit figures, light-pillar drop, searched camera poses) was built and then removed before any commit; the reveal timing and sim are unchanged, so a 3D view can sit on top of them.
- [ ] **E1. Phone check and polish.**
