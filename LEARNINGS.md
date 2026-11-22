# Poker Squads: learnings (concept shelved 2026-11-22)

**The question:** is it fun to play poker hands that are born as units for an auto-fight, and does a big hand feel paid the moment its unit is revealed?

**The answer, in Brian's words:** not in this direction.

> 1. The core game loop is basically just Balatro with extra theming, which seems like a sidegrade. It is making things a bit higher fantasy yes, but it's also making it less immediate understandable and resonant, and more complex and taking longer to resolve. If I were to continue this direction, I'd need to really find what makes the core gameplay different from Balatro.
>
> 2. The mix of strategic build optimization and random outputs from your actions just isn't working. Strategy games with randomization need to allow you to react to the randomization and make decisions based on the new information (such as shops), and the actions the player takes need to be high agency in that response so they can actually formulate a strategy. It feels bad to try and play for X strategy and just draw bad hands for it or have your unit roll the wrong class.

The playable build stays live at https://crabtoast90-dev.github.io/poker-squads/, with the code, sim and docs in this repo.

## How it went (all on 2026-11-22)

| pass | what changed | fun / look | Brian's note |
|---|---|---|---|
| Setup | Poker scoring, one round as cards (3D built, then dropped for build speed), two squads | 2.7 / 2.3 | "Very low appreciability/understanding of the actual payout"; rarity felt deterministic, numbers meaningless; no bar to clear |
| N1-N3 | One army, combat power for both sides, rarity raised, the luck roll staged | 3.4 / 2.8 | Big hand "definitely improved with the combat score" |
| Classes | Class mechanics on every unit, face bonuses, 4 heroes, formation, keep one, relics, full 8-round run | not scored | "Synergies to play for adds some interest... a bit linear"; hand loop is "rapid fire" |
| Decision depth | Hand traits, bounties, gold, shop (rites, doctrines, talents, relics), one loss ends the run | not scored | Traits unreadable, combat not parsable; bounties met by accident; needs hero upgrades |
| Readability + heroes | Tooltips, fight log, +10 gold, hero events | not scored | Never saw a hero in 3 rounds; concept shelved |

## What worked
- **A visible bar to clear.** The combat-power number for both armies (and "Adds about +45 power" before each hand) did the most for "does a big hand feel paid". It was the one change Brian scored up clearly (fun 2.7 → 3.4). Big payoffs need a yardstick on screen.
- **Staging the luck.** Showing the rank-up chance as a bar with a marker that settles was read as a moment, not as math.
- **Hero synergies gave something to play for.** Armies built around their heroes won far more in the sim (one fight: 82% vs 0%; whole runs: 57% vs 19%), and Brian felt the pull. But it narrowed play ("linear").

## What didn't
1. **A sidegrade of the source game.** The hand loop is the source game's hand loop. Everything added on top (units, classes, fights) made it slower and harder to read, without changing what the player decides while playing hands.
2. **Random outputs from strategic inputs.** Which class a hand births (a random scoring card) and its rarity (a roll) sat between the player's choice and the result. Playing for a build then felt like hoping. The shop was the only place to react to new information, and it came once a round.
3. **Decisions inside a round didn't move.** The sim measured it: the highest-scoring hand was also the best play 54% of the time with traits and 55% without (58% after the last pass). Traits climbed with hand rank, so they rewarded the hand you were already going to play. Brian reported the same thing as "rapid fire playing hands".
4. **The auto-fight wasn't readable.** Even as cards with a log, it was hard to see why a fight was won. Card power was judged "entirely by a matching class to my Hero and the +X power number". Systems you can't read add complexity without adding decisions.
5. **Generic objectives get met by accident.** Bounties that describe normal good play (birth a Rare, three classes, two unused discards) were met 1.7 times a round "as if they didn't exist".
6. **Rare highlights can be invisible in a short test.** Hero events at ~0.6 a round meant Brian saw none in 3 rounds. A feature the tester never sees can't be judged.

## Process learnings (for the game kit)
- **Sims caught the structural problems before a human did:**
  - Class didn't matter, because the face-card ability decided every fight (0% to 100% on the same army).
  - Fights were all-or-nothing.
  - The highest-scoring hand stayed the best play.
  
  Put the "is the top-scoring move the best move?" measure in from day one for any game about choices.
- **Fresh-eyes reviewers earned their keep.** Each pass, a reviewer that hadn't built the change found real rule bugs before merge:
  - A weaker Burn overwrote a stronger one.
  - Last Oath stacked Armor to immunity.
  - Two relics and one talent did nothing.
  - A hero swapped back in still became an Ace.
  - A reveal replayed.
- **Readability before depth.** Tooltips, a fight log and damage tables came last; they should come with the first system they explain.
- **Cards-only build speed was the right call.** Dropping 3D for cards turned an 8-minute check into a 15-second one and let four rule passes land in one day.
- **Don't spend tuning time on prototypes.** Brian's rule was right. Most of what was learned came from structure, not numbers.

## If this is ever revisited
Answer Brian's first point before building anything else: what does the player decide that the source game doesn't ask? Directions that answer point 2:
- **Let the player choose the output, not roll it.** For example, pick which scoring card the unit copies, or let suit set the class with no roll.
- **More reaction windows.** Information and choices between every hand, not once per round.
- **A fight the player can read or steer.** Even one decision per fight would help.
