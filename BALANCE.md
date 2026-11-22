# Balance report

Written by `npm run sim` on 2026-11-22 01:47 UTC (58 s). Do not edit by hand.

**Numbers are placeholders.** The poker table waits for Brian's check of RESEARCH.md, and nothing has been tuned against these targets yet. Hero events and the on-screen run are later lanes; the run here is sim only.

## Headline

3 of 6 targets pass (one not built yet). 400 seeded runs per bot per return rule; return rule in use: "lowest".

| target | aim | now | |
|---|---|---|---|
| Greedy bot clears the run | 20-35% | 36% | **FAIL** |
| Class-aware bot clears more than greedy by | 10+ points | +5 points (41%) | **FAIL** |
| Hero events per round | 0.7-1.3 | not built yet | - |
| Round-8 hands that are four of a kind or better (rule "lowest") | under 25% | 20% | **PASS** |
| Runs with a Legendary born in rounds 1-3 | 5-15% | 75% | **FAIL** |
| Fight length | 15-25 s | 21.8 s average | **PASS** |
| Run length (estimate, cleared runs) | 15-25 min | 16.6 min | **PASS** |

**Class barely matters yet.** Playing for classes clears only 5 points more than playing for raw score. In this build, rarity (score) decides fights far more than the class mix. You asked to know this.

## Deck drift: three rules for which card a returning unit replaces

Each round six units come back as cards and replace six deck cards; the deck stays at 52.

| rule | what it replaces | round-8 four of a kind or better | greedy clears | class-aware clears | Legendary in rounds 1-3 |
|---|---|---|---|---|---|
| lowest (in use) | the lowest number in the deck, any suit (the brief) | 20% (2100 hands) | 36% | 41% | 75% |
| lowestSameSuit | the lowest number of its own suit (suits stay 13 each) | 14% (2034 hands) | 31% | 37% | 72% |
| source | the exact card it was born from (ranks and suits never change; cards only gain chips) | 0% (132 hands) | 0% | 0% | 54% |

Round-by-round share of four of a kind or better (greedy bot):

| rule | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| lowest | 1% | 1% | 2% | 3% | 6% | 9% | 13% | 20% |
| lowestSameSuit | 1% | 1% | 2% | 3% | 4% | 7% | 11% | 14% |
| source | 1% | 1% | 0% | 1% | 0% | 0% | 0% | 0% |

## The run (greedy bot, rule in use)

| round | reached | won | fight s | avg score | Common / Uncommon / Rare / Epic / Legendary born |
|---|---|---|---|---|---|
| 1 | 400 | 100% | 16.9 | 156 | 1% / 53% / 24% / 21% / 2% |
| 2 | 400 | 96% | 18.6 | 204 | 0% / 40% / 29% / 25% / 6% |
| 3 | 400 | 92% | 20.6 | 271 | 0% / 25% / 31% / 32% / 13% |
| 4 | 400 | 78% | 20.9 | 373 | 0% / 14% / 26% / 34% / 26% |
| 5 | 400 | 82% | 22.4 | 498 | 0% / 6% / 21% / 31% / 41% |
| 6 | 394 | 68% | 22.8 | 661 | 0% / 3% / 13% / 26% / 58% |
| 7 | 381 | 72% | 23.7 | 864 | 0% / 0% / 6% / 19% / 74% |
| 8 (boss) | 350 | 41% | 29.7 | 1141 | 0% / 0% / 2% / 12% / 86% |

- Lives left at the end of cleared runs: 2.37 on average. Fights that hit the 45 s limit (counted as losses): 45 of 3125.
- Fight length: shortest 8.3 s, longest 45.0 s.
- Hands played in round 1: Two Pair 48%, Pair 15%, Straight 11%, Flush 9%, Full House 9%, Three of a Kind 8%, Four of a Kind 1%, High Card 0%, Straight Flush 0%.
- Hands played in round 8: Full House 40%, Straight 23%, Four of a Kind 15%, Two Pair 13%, Flush 3%, Five of a Kind 3%, Flush House 1%, Three of a Kind 1%, Straight Flush 0%, Pair 0%.

## Who does the work (greedy bot, all fights)

- Share of damage plus healing: heroes 17%, Knights 15%, Priestesses 16%, Witches 26%, Rogues 27%.
- The top unit in each fight does 28% of its side's work on average (8 fighters, so an even split would be 13%).
- Hero skills fire 5.2 times a fight (two heroes); Priestess heals 6.6 times a fight.

## The slice on screen (one round, fresh deck, round-1 skeletons)

- Greedy bot wins the slice's fight 100% of the time; fights last 17.1 s.
- Same seed, same round: yes. Same seed, same run: yes.
