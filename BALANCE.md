# Balance report

Written by `npm run sim` on 2026-11-22 03:02 UTC (26 s). Do not edit by hand. 300 seeded runs per bot; heroes Warden Ortha + Hexmother Vey; deck return rule "lowest".

Skeleton strength and fight pace were set by hand to land the greedy bot near 30% and fights near 20 s; a real tuning pass (three candidate sets) is lane C.

## Headline

12 of 13 targets pass.

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 22% | **PASS** |
| Class-aware bot clears more than greedy by | 10+ points | +11 points (33%) | **PASS** |
| Army built around its heroes vs same-strength army that ignores them (one fight) | 10+ points | 84% vs 0% (+84) | **PASS** |
| ...and over whole runs (bot aiming at its heroes vs away from them) | 10+ points | 33% vs 8% (+25) | **PASS** |
| One-class army wins less often than a mixed front + back army | mono below mixed | mono 3%, mixed 15% | **PASS** |
| Armies of about equal power (within 8%): you win | 25-75% | 26% (966 fights) | **PASS** |
| Combat power calls the winner | 70%+ | 79% | **PASS** |
| Round-1 births that are Rare or better | under 20% | 15% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 4% | **FAIL** |
| Round-8 hands that are four of a kind or better | under 25% | 12% | **PASS** |
| Fight length (all fights) | 15-25 s | 15.1 s | **PASS** |
| Fight length with a late-run army (round 8: 2 heroes + 13 units) | 15-25 s | 17.0 s | **PASS** |
| Run length (estimate, cleared runs) | 15-25 min | 16.3 min | **PASS** |
| Hero events per round | 0.7-1.3 | not built (cut from this pass) | - |

## Does class matter? (one fight, six Uncommon 9s, 200 fights each; skeletons set to 1.83x so a plain mixed army wins about half)

| army (heroes Ortha + Vey) | wins |
|---|---|
| Built around Ortha + Vey (3 Knights, 3 Witches) | 84% |
| Ignores them (3 Rogues, 3 Priestesses) | 0% |

| army shape (averaged over all six hero pairs) | wins |
|---|---|
| 6 Knights | 1% |
| 6 Witches | 0% |
| 6 Rogues | 11% |
| 6 Priestesses | 0% |
| Mixed: 3 Knights + 3 Witches | 29% |
| Mixed: 2 Knights, 1 Rogue, 2 Witches, 1 Priestess | 20% |
| Mixed: 2 Rogues, 2 Witches, 2 Priestesses | 1% |
| Mixed: 3 Knights + 3 Priestesses | 10% |

## Combat power: does the number mean anything?

It calls the winner in 79% of fights (76% in rounds 3-8).

| your power / skeleton power | fights | you win |
|---|---|---|
| 0-0.7 | 30 | 0% |
| 0.7-0.85 | 229 | 4% |
| 0.85-0.92 | 234 | 7% |
| 0.92-1 | 441 | 17% |
| 1-1.08 | 525 | 34% |
| 1.08-1.2 | 878 | 60% |
| 1.2-1.4 | 1357 | 77% |
| 1.4+ | 2380 | 93% |

## The run (greedy bot)

| round | skeletons | reached | won | fight s | timeouts | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|---|---|
| 1 | Shield wall (8) | 300 | 91% | 16.5 | 0 | 156 | 51% / 34% / 13% / 2% / 0% |
| 2 | Stalker raid (9) | 300 | 84% | 11.9 | 1 | 178 | 43% / 34% / 20% / 3% / 0% |
| 3 | Caster horde (10) | 300 | 72% | 16.7 | 6 | 214 | 34% / 32% / 29% / 4% / 0% |
| 4 | Iron line (11) | 296 | 64% | 18.3 | 10 | 251 | 26% / 33% / 33% / 7% / 1% |
| 5 | Night raid (12) | 272 | 51% | 11.5 | 3 | 305 | 16% / 32% / 39% / 11% / 2% |
| 6 | Grave choir (13) | 238 | 60% | 15.5 | 7 | 360 | 10% / 31% / 38% / 18% / 3% |
| 7 | Bone legion (14) | 192 | 61% | 13.5 | 1 | 428 | 5% / 25% / 42% / 22% / 6% |
| 8 | The Bone King (15) | 153 | 43% | 17.0 | 8 | 540 | 2% / 18% / 36% / 34% / 11% |

- Fights that hit the 60 s limit (decided on health left): 36 of 2051.
- Relics the class-aware bot took (per run): Slow Kindling 0.93, Tempered Plate 0.90, Last Oath 0.88, Searing Brand 0.87, Greater Ward 0.22, Killer's Mark 0.22, Lucky Coin 0.22, Royal Court 0.21, Thorned Ward 0.21, Twin Choice 0.21, Honed Edge 0.17, Loose Sleeve 0.17.

## Does a strong early keep decide the run? (greedy bot)

| unit kept after round 1 | runs | cleared |
|---|---|---|
| common | 11 | 18% |
| uncommon | 102 | 21% |
| rare | 155 | 23% |
| epic | 30 | 23% |
| legendary | 2 | 50% |

- Won round 1: 24% clear (272 runs). Lost round 1: 4% clear (28 runs).

## Who does the work (greedy bot, all fights)

- Share of damage plus shields: heroes 16%, Knights 9%, Priestesses 20%, Witches 37%, Rogues 18%.
- The top unit does 33% of its army's work on average.
- Hands played in round 1: Two Pair 47%, Pair 16%, Straight 11%, Flush 9%, Full House 9%, Three of a Kind 8%, Four of a Kind 0%, High Card 0%, Straight Flush 0%.
- Same seed, same run: yes.
