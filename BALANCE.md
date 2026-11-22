# Balance report

Written by `npm run sim` on 2026-11-22 04:22 UTC (32 s). Do not edit by hand. 300 seeded runs per bot; heroes Warden Ortha + Hexmother Vey; deck return rule "lowest".

A lost fight ends the run. Skeleton strength, the round curve and shop prices were set by hand once (greedy near 25%, 2-3 buys a shop); no further tuning (prototype rule).

## Headline

14 of 16 targets pass.

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 24% | **PASS** |
| Class-aware bot clears more than greedy by | 10+ points | +33 points (57%) | **PASS** |
| Army built around its heroes vs same-strength army that ignores them (one fight) | 10+ points | 82% vs 0% (+82) | **PASS** |
| ...and over whole runs (bot aiming at its heroes vs away from them) | 10+ points | 57% vs 19% (+38) | **PASS** |
| One-class army wins less often than a mixed front + back army | mono below mixed | mono 3%, mixed 14% | **PASS** |
| Armies of about equal power (within 8%): you win | 25-75% | 58% (511 fights) | **PASS** |
| Combat power calls the winner | 70%+ | 92% | **PASS** |
| Round-1 births that are Rare or better | under 20% | 16% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 6% | **PASS** |
| Round-8 hands that are four of a kind or better | under 25% | 25% | **PASS** |
| Fight length (all fights) | 15-25 s | 13.3 s | **FAIL** |
| Fight length with a late-run army (round 8: 2 heroes + 13 units) | 15-25 s | 15.4 s | **PASS** |
| Run length (estimate, cleared runs) | 15-25 min | 16.0 min | **PASS** |
| Highest-scoring hand is also the best play | clearly below before | 54% (was 55%) | **FAIL** |
| Purchases per shop (greedy / class-aware) | 2-3 | 2.2 / 2.0 | **PASS** |
| Bounties met per round without chasing them (greedy) | 1-2 | 1.70 | **PASS** |
| Hero events per round | 0.7-1.3 | not built (cut from this pass) | - |

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

It calls the winner in 92% of fights (89% in rounds 3-8).

| your power / skeleton power | fights | you win |
|---|---|---|
| 0-0.7 | 20 | 5% |
| 0.7-0.85 | 144 | 17% |
| 0.85-0.92 | 116 | 28% |
| 0.92-1 | 211 | 51% |
| 1-1.08 | 300 | 63% |
| 1.08-1.2 | 532 | 82% |
| 1.2-1.4 | 1067 | 95% |
| 1.4+ | 3091 | 99% |

## The run (greedy bot)

| round | skeletons | reached | won | fight s | timeouts | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|---|---|
| 1 | Shield wall (8) | 300 | 100% | 11.4 | 0 | 156 | 51% / 33% / 14% / 2% / 0% |
| 2 | Stalker raid (9) | 300 | 96% | 9.9 | 0 | 185 | 43% / 33% / 21% / 2% / 0% |
| 3 | Caster horde (10) | 288 | 85% | 14.5 | 1 | 226 | 32% / 31% / 31% / 5% / 1% |
| 4 | Iron line (11) | 246 | 82% | 18.6 | 8 | 299 | 19% / 32% / 39% / 8% / 2% |
| 5 | Night raid (12) | 202 | 79% | 12.2 | 4 | 403 | 9% / 28% / 40% / 19% / 5% |
| 6 | Grave choir (13) | 160 | 82% | 13.5 | 0 | 545 | 3% / 20% / 36% / 31% / 10% |
| 7 | Bone legion (14) | 131 | 82% | 13.3 | 0 | 761 | 0% / 9% / 24% / 46% / 20% |
| 8 | The Bone King (15) | 108 | 68% | 15.4 | 1 | 1052 | 0% / 2% / 12% / 47% / 38% |

- Fights that hit the 60 s limit (decided on health left): 14 of 1735.
- greedy: 2.19 purchases per shop; 1.70 bounties met per round; 13.5 gold earned per round.
- class-aware: 2.04 purchases per shop; 1.85 bounties met per round; 15.1 gold earned per round.

## Does a strong early keep decide the run? (greedy bot)

| unit kept after round 1 | runs | cleared |
|---|---|---|
| common | 10 | 10% |
| uncommon | 95 | 15% |
| rare | 165 | 26% |
| epic | 28 | 54% |
| legendary | 2 | 0% |

- Won round 1: 24% clear (300 runs). Lost round 1: NaN% clear (0 runs).

## Hand choice: is the highest-scoring hand the best play?

At 468 hand decisions (class-aware bot, 12 runs), "best play" = the hand that adds the most combat power to the army, given its class odds, rarity odds and trait. It is also the highest-scoring hand **54%** of the time now, against **55%** with traits switched off (about how the game played before this pass).

## The shop: does anything dominate? (class-aware bot)

| item | bought (per run) | runs that bought it clear | runs that did not clear |
|---|---|---|---|
| Talent: Rear Guard | 0.95 | 61% | 0% |
| Talent: Shared Oath | 0.94 | 61% | 0% |
| Talent: Spiked Plate | 0.93 | 61% | 0% |
| Talent: Choking Smoke | 0.85 | 67% | 0% |
| Talent: Kindled Blades | 0.85 | 68% | 0% |
| Talent: Warded Flame | 0.81 | 70% | 0% |
| Relic: Slow Kindling | 0.70 | 78% | 10% |
| Relic: Last Oath | 0.68 | 78% | 13% |
| Relic: Tempered Plate | 0.67 | 79% | 13% |
| Relic: Searing Brand | 0.64 | 83% | 12% |
| Rite: Rite of Clubs | 0.49 | 74% | 46% |
| Rite: Rite of Spades | 0.45 | 71% | 49% |
| Doctrine: Two Pair | 0.44 | 76% | 47% |
| Rite: Cull | 0.35 | 78% | 49% |
| Doctrine: Full House | 0.29 | 85% | 47% |
| Rite: Gild | 0.29 | 85% | 48% |
| Doctrine: Straight | 0.28 | 75% | 52% |
| Doctrine: Pair | 0.23 | 78% | 52% |
| Doctrine: Flush | 0.23 | 82% | 51% |
| Doctrine: Three of a Kind | 0.22 | 72% | 54% |
| Rite: Crown | 0.19 | 87% | 51% |
| Rite: Echo | 0.19 | 88% | 51% |
| Doctrine: Four of a Kind | 0.12 | 91% | 53% |
| Doctrine: Straight Flush | 0.09 | 93% | 54% |

## Who does the work (greedy bot, all fights)

- Share of damage plus shields: heroes 12%, Knights 9%, Priestesses 20%, Witches 38%, Rogues 21%.
- The top unit does 32% of its army's work on average.
- Hands played in round 1: Two Pair 47%, Pair 15%, Straight 11%, Flush 9%, Full House 9%, Three of a Kind 8%, Four of a Kind 0%, High Card 0%, Straight Flush 0%.
- Same seed, same run: yes.
