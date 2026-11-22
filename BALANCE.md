# Balance report

Written by `npm run sim` on 2026-11-22 02:49 UTC (26 s). Do not edit by hand. 300 seeded runs per bot; heroes Warden Ortha + Hexmother Vey; deck return rule "lowest".

Skeleton strength and fight pace were set by hand to land the greedy bot near 30% and fights near 20 s; a real tuning pass (three candidate sets) is lane C.

## Headline

11 of 13 targets pass.

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 26% | **PASS** |
| Class-aware bot clears more than greedy by | 10+ points | +13 points (39%) | **PASS** |
| Army built around its heroes vs same-strength army that ignores them (one fight) | 10+ points | 45% vs 0% (+45) | **PASS** |
| ...and over whole runs (bot aiming at its heroes vs away from them) | 10+ points | 39% vs 5% (+34) | **PASS** |
| One-class army wins less often than a mixed front + back army | mono below mixed | mono 5%, mixed 13% | **PASS** |
| Armies of about equal power (within 8%): you win | 25-75% | 37% (928 fights) | **PASS** |
| Combat power calls the winner | 70%+ | 72% | **PASS** |
| Round-1 births that are Rare or better | under 20% | 15% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 3% | **FAIL** |
| Round-8 hands that are four of a kind or better | under 25% | 12% | **PASS** |
| Fight length (all fights) | 15-25 s | 21.5 s | **PASS** |
| Fight length with a late-run army (round 8: 2 heroes + 13 units) | 15-25 s | 34.9 s | **FAIL** |
| Run length (estimate, cleared runs) | 15-25 min | 17.4 min | **PASS** |
| Hero events per round | 0.7-1.3 | not built (cut from this pass) | - |

## Does class matter? (one fight, six Uncommon 9s, 200 fights each; skeletons set to 1.85x so a plain mixed army wins about half)

| army (heroes Ortha + Vey) | wins |
|---|---|
| Built around Ortha + Vey (3 Knights, 3 Witches) | 45% |
| Ignores them (3 Rogues, 3 Priestesses) | 0% |

| army shape (averaged over all six hero pairs) | wins |
|---|---|
| 6 Knights | 4% |
| 6 Witches | 0% |
| 6 Rogues | 16% |
| 6 Priestesses | 0% |
| Mixed: 3 Knights + 3 Witches | 21% |
| Mixed: 2 Knights, 1 Rogue, 2 Witches, 1 Priestess | 26% |
| Mixed: 2 Rogues, 2 Witches, 2 Priestesses | 0% |
| Mixed: 3 Knights + 3 Priestesses | 3% |

## Combat power: does the number mean anything?

It calls the winner in 72% of fights (70% in rounds 3-8).

| your power / skeleton power | fights | you win |
|---|---|---|
| 0-0.7 | 471 | 32% |
| 0.7-0.85 | 513 | 36% |
| 0.85-0.92 | 308 | 37% |
| 0.92-1 | 446 | 37% |
| 1-1.08 | 482 | 37% |
| 1.08-1.2 | 711 | 59% |
| 1.2-1.4 | 1027 | 75% |
| 1.4+ | 1732 | 94% |

## The run (greedy bot)

| round | skeletons | reached | won | fight s | timeouts | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|---|---|
| 1 | Shield wall (8) | 300 | 74% | 20.7 | 1 | 156 | 51% / 34% / 13% / 2% / 0% |
| 2 | Stalker raid (9) | 300 | 69% | 13.5 | 2 | 178 | 44% / 34% / 20% / 3% / 0% |
| 3 | Caster horde (10) | 300 | 70% | 21.3 | 17 | 214 | 36% / 31% / 28% / 4% / 0% |
| 4 | Iron line (11) | 272 | 69% | 23.1 | 16 | 252 | 27% / 32% / 33% / 7% / 1% |
| 5 | Night raid (12) | 237 | 63% | 15.4 | 7 | 300 | 19% / 32% / 39% / 9% / 2% |
| 6 | Grave choir (13) | 208 | 75% | 23.6 | 15 | 354 | 11% / 31% / 40% / 17% / 2% |
| 7 | Bone legion (14) | 189 | 52% | 27.2 | 24 | 438 | 4% / 26% / 43% / 21% / 6% |
| 8 | The Bone King (15) | 166 | 47% | 34.9 | 48 | 526 | 2% / 20% / 38% / 31% / 9% |

- Fights that hit the 60 s limit (decided on health left): 130 of 1972.
- Relics the class-aware bot took (per run): Slow Kindling 0.84, Tempered Plate 0.81, Searing Brand 0.80, Last Oath 0.75, Greater Ward 0.24, Twin Choice 0.18, Royal Court 0.17, Thorned Ward 0.16, Killer's Mark 0.16, Honed Edge 0.14, Lucky Coin 0.14, Loose Sleeve 0.12.

## Does a strong early keep decide the run? (greedy bot)

| unit kept after round 1 | runs | cleared |
|---|---|---|
| common | 11 | 0% |
| uncommon | 102 | 24% |
| rare | 155 | 28% |
| epic | 30 | 33% |
| legendary | 2 | 50% |

- Won round 1: 32% clear (222 runs). Lost round 1: 10% clear (78 runs).

## Who does the work (greedy bot, all fights)

- Share of damage plus shields: heroes 15%, Knights 11%, Priestesses 21%, Witches 33%, Rogues 21%.
- The top unit does 29% of its army's work on average.
- Hands played in round 1: Two Pair 47%, Pair 16%, Straight 11%, Flush 9%, Full House 9%, Three of a Kind 8%, Four of a Kind 0%, High Card 0%, Straight Flush 0%.
- Same seed, same run: yes.
