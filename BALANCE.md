# Balance report

Written by `npm run sim` on 2026-11-22 02:15 UTC (55 s). Do not edit by hand.

Poker numbers checked by Brian (fine for prototyping). Rarity thresholds and skeleton strength were set by hand for N3 (Rare+ in round 1 under 20%, greedy clears ~30%); the full three-candidate tuning is lane C. Hero events and the on-screen run are later lanes; the run here is sim only.

## Headline

7 of 8 targets pass (one not built yet). 400 seeded runs per bot per return rule; return rule in use: "lowest".

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 25% | **PASS** |
| Class-aware bot clears more than greedy by | 10+ points | -2 points (23%) | **FAIL** |
| Hero events per round | 0.7-1.3 | not built yet | - |
| Round-8 hands that are four of a kind or better (rule "lowest") | under 25% | 20% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 10% | **PASS** |
| Round-1 births that are Rare or better | under 20% | 16% | **PASS** |
| Combat power calls the winner | 80%+ of fights | 85% | **PASS** |
| Fight length | 15-25 s | 22.1 s average | **PASS** |
| Run length (estimate, cleared runs) | 15-25 min | 15.1 min | **PASS** |

**Class barely matters yet.** Playing for classes clears -2 points versus playing for raw score. In this build, rarity (score) decides fights far more than the class mix. You asked to know this.

## Deck drift: three rules for which card a returning unit replaces

Each round six units come back as cards and replace six deck cards; the deck stays at 52.

| rule | what it replaces | round-8 four of a kind or better | greedy clears | class-aware clears | Legendary in rounds 1-3 |
|---|---|---|---|---|---|
| lowest (in use) | the lowest number in the deck, any suit (the brief) | 20% (1452 hands) | 25% | 23% | 10% |
| lowestSameSuit | the lowest number of its own suit (suits stay 13 each) | 15% (1194 hands) | 12% | 16% | 9% |
| source | the exact card it was born from (ranks and suits never change; cards only gain chips) | 0% (24 hands) | 0% | 0% | 4% |

Round-by-round share of four of a kind or better (greedy bot):

| rule | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| lowest | 1% | 1% | 2% | 3% | 6% | 10% | 13% | 20% |
| lowestSameSuit | 1% | 1% | 2% | 3% | 5% | 7% | 12% | 15% |
| source | 1% | 1% | 1% | 1% | 1% | 0% | 0% | 0% |

## The run (greedy bot, rule in use)

| round | reached | won | fight s | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|
| 1 | 400 | 100% | 15.7 | 156 | 51% / 33% / 14% / 1% / 0% |
| 2 | 400 | 100% | 17.2 | 192 | 41% / 33% / 22% / 3% / 1% |
| 3 | 400 | 90% | 23.2 | 236 | 30% / 34% / 29% / 6% / 1% |
| 4 | 400 | 59% | 23.6 | 295 | 19% / 32% / 37% / 11% / 1% |
| 5 | 400 | 54% | 22.8 | 393 | 9% / 29% / 40% / 19% / 4% |
| 6 | 386 | 45% | 23.8 | 499 | 4% / 22% / 38% / 29% / 7% |
| 7 | 323 | 48% | 23.4 | 642 | 1% / 15% / 30% / 40% / 13% |
| 8 (boss) | 242 | 42% | 30.4 | 869 | 0% / 6% / 18% / 53% / 23% |

- Lives left at the end of cleared runs: 1.97 on average. Fights that hit the 45 s limit (counted as losses): 38 of 2951.
- Fight length: shortest 8.0 s, longest 45.0 s.
- Hands played in round 1: Two Pair 48%, Pair 15%, Straight 11%, Flush 9%, Full House 9%, Three of a Kind 8%, Four of a Kind 1%, High Card 0%, Straight Flush 0%.
- Hands played in round 8: Full House 41%, Straight 24%, Four of a Kind 15%, Two Pair 10%, Flush 4%, Five of a Kind 3%, Straight Flush 1%, Flush House 1%, Three of a Kind 1%, Flush Five 0%.

## Combat power: does the number mean anything?

It calls the winner in 85% of all fights, and 79% of fights in rounds 3-8 (the closer ones).

Win rate by how your army's power compares with the skeletons' (greedy bot, every fight):

| your power / skeleton power | fights | you win |
|---|---|---|
| 0-0.6 | 14 | 0% |
| 0.6-0.8 | 334 | 4% |
| 0.8-0.9 | 367 | 27% |
| 0.9-1 | 417 | 54% |
| 1-1.1 | 429 | 81% |
| 1.1-1.25 | 485 | 93% |
| 1.25-1.5 | 508 | 99% |
| 1.5+ | 397 | 100% |

## Who does the work (greedy bot, all fights)

- Share of damage plus healing: heroes 32%, Knights 12%, Priestesses 13%, Witches 23%, Rogues 20%.
- The top unit in each fight does 32% of its side's work on average (8 fighters, so an even split would be 13%).
- Hero skills fire 5.7 times a fight (two heroes); Priestess heals 6.5 times a fight.

## The slice on screen (one round, fresh deck, round-1 skeletons)

- Greedy bot wins the slice's fight 100% of the time; fights last 15.7 s.
- Same seed, same round: yes. Same seed, same run: yes.
