# Research: poker hand scoring (source game: Balatro)

The docs may name the source game; the screen never does. These numbers are copied into `src/squads/data.js` (`poker.hands` and `poker.rankChips`).

**Status: checked by Brian on 2026-11-22: "fine for prototyping".**

Confidence marks: **confirmed** = from the game itself or its official material; **two sources agree** = two independent sites give the same number; **best guess** = one source, or my reading.

## Base chips and mult per poker hand (level 1)

Score = (hand's base chips + chips of the scoring cards) x hand's base mult. Only scoring cards count (a kicker in a Pair adds nothing).

| Hand | Base chips | Base mult | Confidence | Sources |
|---|---|---|---|---|
| High Card | 5 | 1 | two sources agree | [1] [2] |
| Pair | 10 | 2 | two sources agree | [1] [2] |
| Two Pair | 20 | 2 | two sources agree | [1] [2] |
| Three of a Kind | 30 | 3 | two sources agree | [1] [2] |
| Straight | 30 | 4 | two sources agree | [1] [2] |
| Flush | 35 | 4 | two sources agree | [1] [2] |
| Full House | 40 | 4 | two sources agree | [1] [2] |
| Four of a Kind | 60 | 7 | two sources agree | [1] [2] |
| Straight Flush | 100 | 8 | two sources agree | [1] [2] |
| Royal Flush | 100 | 8 | two sources agree (it is a Straight Flush, scored the same) | [1] [3] |
| Five of a Kind | 120 | 12 | two sources agree | [3] [4] |
| Flush House | 140 | 14 | two sources agree | [3] [4] |
| Flush Five | 160 | 16 | two sources agree | [3] [4] |

Why the last three matter here: a returning unit becomes a copy of an existing card, so the deck can hold two King of Spades. That makes Five of a Kind, Flush House and Flush Five possible, and deck drift is how often they show up.

## Chips per card rank (scoring cards only)

| Rank | Chips | Confidence | Sources |
|---|---|---|---|
| 2-10 | face value (2 to 10) | two sources agree | [2] [5] |
| Jack, Queen, King | 10 | two sources agree | [2] [5] |
| Ace | 11 | two sources agree | [2] [5] |

## Rules read from the same sources
- A hand of 8 cards; play up to 5; 4 hands and 3 discards per round in the source (this game uses 6 hands and 4 discards: Brian's call, not copied). Confidence: two sources agree [2] [5].
- An Ace counts high or low in a straight (A-2-3-4-5). Confidence: best guess (standard poker; one source [2]).
- Played cards that are not part of the hand (kickers) score nothing. Confidence: two sources agree [2] [5].

## Not copied (cut or changed on purpose)
- Hand levels (planet cards), jokers, enhancements, editions, seals: cut (see `IDEAS.md`).
- The source's blind targets: not used; rarity thresholds are this game's own numbers (`birth.rarityThresholds` in the data file).

## Sources
1. Prima Games, "All Poker Hands and their Chips and Mults": https://primagames.com/gaming/all-poker-hands-and-their-chips-and-mults-in-balatro
2. Game Mechanics notes, "Balatro poker scoring": https://saschb2b.github.io/game-mechanics/games/balatro/poker-scoring
3. Dot Esports, "All hands in Balatro": https://dotesports.com/indies/news/all-hands-in-balatro
4. Sportskeeda, "Planet cards in Balatro" (lists every hand's base values, secret hands included): https://sportskeeda.com/mobile-games/planet-cards-balatro-details-get
5. Gameplay.tips, "Balatro score calculation explanatory guide": https://gameplay.tips/guides/balatro-score-calculation-explanatory-guide.html

Found by web search on 2026-11-22; the pages were read through search summaries, not opened one by one, so "two sources agree" here means two sites gave the same number in their summaries.
