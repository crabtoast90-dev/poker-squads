# Balance report

Written by `npm run sim` on 2026-11-22 05:03 UTC (31 s). Do not edit by hand. 300 seeded runs per bot; heroes Warden Ortha + Hexmother Vey; deck return rule "lowest".

A lost fight ends the run. Skeleton strength, the round curve and shop prices were set by hand once (greedy near 25%, 2-3 buys a shop); no further tuning (prototype rule).

## Headline

11 of 17 targets pass.

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 39% | **FAIL** |
| Class-aware bot clears more than greedy by | 10+ points | +19 points (57%) | **PASS** |
| Army built around its heroes vs same-strength army that ignores them (one fight) | 10+ points | 82% vs 0% (+82) | **PASS** |
| ...and over whole runs (bot aiming at its heroes vs away from them) | 10+ points | 57% vs 19% (+39) | **PASS** |
| One-class army wins less often than a mixed front + back army | mono below mixed | mono 3%, mixed 14% | **PASS** |
| Armies of about equal power (within 8%): you win | 25-75% | 59% (528 fights) | **PASS** |
| Combat power calls the winner | 70%+ | 92% | **PASS** |
| Round-1 births that are Rare or better | under 20% | 15% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 7% | **PASS** |
| Round-8 hands that are four of a kind or better | under 25% | 24% | **PASS** |
| Fight length (all fights) | 15-25 s | 13.3 s | **FAIL** |
| Fight length with a late-run army (round 8: 2 heroes + 13 units) | 15-25 s | 13.5 s | **FAIL** |
| Run length (estimate, cleared runs) | 15-25 min | 17.6 min | **PASS** |
| Highest-scoring hand is also the best play | clearly below before | 58% (was 54%) | **FAIL** |
| Purchases per shop (greedy / class-aware) | 2-3 | 3.8 / 3.3 | **FAIL** |
| Bounties met per round without chasing them (greedy) | 1-2 | 1.77 | **PASS** |
| Hero events per round (greedy / class-aware) | 0.7-1.3 | 0.63 / 0.51 | **FAIL** |

## Does class matter? (one fight, six Uncommon 9s, 200 fights each; skeletons set to 2.02x so a plain mixed army wins about half)

| army (heroes Ortha + Vey) | wins |
|---|---|
| Built around Ortha + Vey (3 Knights, 3 Witches) | 82% |
| Ignores them (3 Rogues, 3 Priestesses) | 0% |

| army shape (averaged over all six hero pairs) | wins |
|---|---|
| 6 Knights | 1% |
| 6 Witches | 0% |
| 6 Rogues | 11% |
| 6 Priestesses | 0% |
| Mixed: 3 Knights + 3 Witches | 27% |
| Mixed: 2 Knights, 1 Rogue, 2 Witches, 1 Priestess | 19% |
| Mixed: 2 Rogues, 2 Witches, 2 Priestesses | 0% |
| Mixed: 3 Knights + 3 Priestesses | 9% |

## Combat power: does the number mean anything?

It calls the winner in 92% of fights (90% in rounds 3-8).

| your power / skeleton power | fights | you win |
|---|---|---|
| 0-0.7 | 16 | 13% |
| 0.7-0.85 | 109 | 11% |
| 0.85-0.92 | 118 | 37% |
| 0.92-1 | 205 | 47% |
| 1-1.08 | 323 | 67% |
| 1.08-1.2 | 531 | 85% |
| 1.2-1.4 | 1093 | 95% |
| 1.4+ | 2799 | 99% |

## The run (greedy bot)

| round | skeletons | reached | won | fight s | timeouts | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|---|---|
| 1 | Shield wall (8) | 300 | 98% | 13.4 | 0 | 156 | 53% / 32% / 14% / 1% / 0% |
| 2 | Stalker raid (9) | 294 | 89% | 11.0 | 0 | 193 | 41% / 33% / 23% / 3% / 0% |
| 3 | Caster horde (10) | 263 | 79% | 16.5 | 3 | 267 | 25% / 36% / 32% / 6% / 1% |
| 4 | Iron line (11) | 208 | 88% | 17.3 | 3 | 381 | 12% / 29% / 40% / 16% / 2% |
| 5 | Night raid (12) | 182 | 85% | 11.1 | 0 | 547 | 5% / 21% / 37% / 30% / 8% |
| 6 | Grave choir (13) | 154 | 94% | 11.7 | 0 | 772 | 1% / 10% / 27% / 44% / 17% |
| 7 | Bone legion (14) | 144 | 94% | 10.7 | 0 | 1079 | 0% / 3% / 16% / 39% / 42% |
| 8 | The Bone King (15) | 136 | 85% | 13.5 | 0 | 1427 | 0% / 1% / 6% / 30% / 62% |

- Fights that hit the 60 s limit (decided on health left): 6 of 1681.
- greedy: 3.76 purchases per shop; 1.77 bounties met per round; 14.2 gold earned per round.
- class-aware: 3.27 purchases per shop; 1.86 bounties met per round; 15.2 gold earned per round.

## Does a strong early keep decide the run? (greedy bot)

| unit kept after round 1 | runs | cleared |
|---|---|---|
| common | 7 | 0% |
| uncommon | 105 | 31% |
| rare | 157 | 43% |
| epic | 22 | 64% |
| legendary | 3 | 33% |

- Won round 1: 39% clear (294 runs). Lost round 1: 0% clear (6 runs).

## Hand choice: is the highest-scoring hand the best play?

At 521 hand decisions (class-aware bot, 12 runs), "best play" = the hand that adds the most combat power to the army, given its class odds, rarity odds and trait. It is also the highest-scoring hand **58%** of the time now, against **54%** with traits switched off (about how the game played before this pass).

## The shop: does anything dominate? (class-aware bot)

| item | bought (per run) | runs that bought it clear | runs that did not clear |
|---|---|---|---|
| Talent: Spiked Plate | 0.91 | 63% | 0% |
| Talent: Warded Flame | 0.91 | 63% | 0% |
| Talent: Shared Oath | 0.91 | 63% | 0% |
| Talent: Rear Guard | 0.91 | 63% | 0% |
| Talent: Choking Smoke | 0.90 | 63% | 0% |
| Talent: Kindled Blades | 0.90 | 63% | 0% |
| Doctrine: Two Pair | 0.84 | 82% | 27% |
| Relic: Slow Kindling | 0.84 | 69% | 0% |
| Rite: Rite of Spades | 0.84 | 74% | 38% |
| Rite: Rite of Clubs | 0.82 | 74% | 39% |
| Relic: Last Oath | 0.80 | 72% | 0% |
| Relic: Tempered Plate | 0.80 | 72% | 0% |
| Rite: Cull | 0.79 | 79% | 33% |
| Rite: Gild | 0.79 | 78% | 32% |
| Relic: Searing Brand | 0.77 | 74% | 0% |
| Doctrine: Flush | 0.73 | 78% | 35% |
| Doctrine: Full House | 0.68 | 79% | 37% |
| Rite: Echo | 0.64 | 79% | 37% |
| Doctrine: Straight | 0.64 | 77% | 40% |
| Rite: Crown | 0.62 | 78% | 40% |
| Doctrine: Pair | 0.62 | 75% | 43% |
| Doctrine: Three of a Kind | 0.58 | 81% | 40% |
| Doctrine: Four of a Kind | 0.54 | 80% | 41% |
| Doctrine: Straight Flush | 0.52 | 76% | 45% |

## Who does the work (greedy bot, all fights)

- Share of damage plus shields: heroes 13%, Knights 9%, Priestesses 19%, Witches 37%, Rogues 21%.
- The top unit does 31% of its army's work on average.
- Hands played in round 1: Two Pair 47%, Pair 15%, Straight 12%, Full House 9%, Flush 9%, Three of a Kind 8%, Four of a Kind 0%, High Card 0%, Straight Flush 0%.
- Same seed, same run: yes.
