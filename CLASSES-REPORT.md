# Poker Squads: why class doesn't matter yet (report for the design chat)

Written 2026-11-22 from the live build (https://crabtoast90-dev.github.io/poker-squads/) and its sim. Plain language, no code. All numbers are live in the game's data file and can be changed by name.

## The problem in one line
A bot that picks hands for the classes its army needs clears runs **2 points less** often than a bot that just plays the highest score (target: **10+ points more**). Class choice currently has no payoff.

## The game as it stands (what you'd be designing against)
- 6 poker hands a round, each born as one unit. **Suit = class**, the unit copies one random scoring card. **Score = rarity** (thresholds 0 / 140 / 320 / 600 / 1100, plus a luck roll to rank up). Units from **J, Q, K, A have their class ability**; 2–10 are plain bodies.
- One army: 2 heroes (Warden Ortha, Knight; Hexmother Vey, Witch) + 6 unit slots, vs one army of 8 skeletons. No placement: Knights and Rogues stand in front, Witches and Priestesses behind.
- A combat power number for each army is the bar to clear. It calls the winner in 85% of fights (79% in rounds 3–8).

## The four classes today

| Class (suit) | Role | Health | Attack | Reach | Ability (J–A only) |
|---|---|---|---|---|---|
| Knight (♠) | front line | 130 | 9 every 1.2 s | melee | **Hold the Line**: nearby enemies must hit it; takes 30% less damage |
| Rogue (♦) | front, fast | 75 | 13 every 0.85 s | melee | **Shadowstep**: goes straight for the enemy back line |
| Witch (♣) | back line | 55 | 11 every 1.6 s | long | **Hex Burst**: 60% splash to everyone near its target |
| Priestess (♥) | back line | 65 | 4 every 1.5 s | long | **Mend**: heals and shields the most hurt ally every 2.4 s |

Counter loop (damage multipliers): Rogue ×1.6 vs Witch and Priestess; Knight ×1.6 vs Rogue; Witch ×1.35 vs Knight. The skeletons use the same classes (Bone Warrior/Minion = Knight, Bone Stalker = Rogue, Bone Caster = Witch).

## What the sim shows (round-4 skeletons, six Uncommon units, 300 fights each)

| Army | All 8s (no ability) | All Queens (ability) | Queens, but abilities switched off |
|---|---|---|---|
| 6 Knights | 0% win | **100%** | 0% |
| 6 Witches | 0% | **100%** | 0% |
| 6 Priestesses | 0% | **99%** | 0% |
| 6 Rogues | 0% | **0%** | 0% |
| Balanced (2 Knights, 2 Witches, 1 Priestess, 1 Rogue) | 0% | **100%** | 0% |
| 3 Knights + 3 Witches | 0% | **100%** | 0% |

Who does the work across all fights: heroes 32%, Witches 23%, Rogues 20%, Priestesses 13%, Knights 12%. The top unit in a fight does about a third of the army's work.

## Diagnosis: four reasons class doesn't matter
1. **Ability or not is the real choice, not class.** The same army swings from 0% to 100% depending only on whether its cards are faces. A Queen is barely stronger than an 8 as a number (abilities off: still 0%), so the face-card ability is doing all the work. Any class with its ability wins; any class without loses.
2. **A one-class army works as well as a mixed one.** Six Witches with abilities win as often as a balanced army. Nothing rewards a front line plus a back line, or punishes having no healer or no tank.
3. **Counters don't bite.** Doubling every counter multiplier changed almost nothing (only six Priestesses fell, from 99% to 52%). The skeleton army is mostly Knights every round and you can't see its make-up as a choice to answer, so there's nothing to counter. Rogues are just weak (they dive into a wall of Knights, which beat them).
4. **Fights are a cliff, not a slope.** Results are near 0% or near 100%: a given army either clearly wins or clearly loses. Small class advantages can't show up when nothing is close.

Also worth knowing: the power number undervalues abilities. Six Witch Queens show 291 power against the skeletons' 361 (they look behind) yet win 100%.

## Levers to discuss (pick a direction; each is a small, testable change)
- **A. Make the skeleton army a puzzle to answer.** Each round shows a skeleton army with a clear lean (a Caster horde, a Stalker raid, a Warrior wall), and the counter multipliers get much bigger (×2–3). Class then means "answer this round's army". The power number would count counters against the visible army.
- **B. Reward a mixed army.** For example: no Knight in front means the back line gets hit first; a Priestess only heals if there's a front line to protect; a bonus for having all four classes (or a pair of each). Class then means "build a complete army".
- **C. Tie class to the heroes.** Make hero auras much stronger for their own class (today +30–35% vs +10–15%), so a Witch-led army wants Witches. Class then means "build around your heroes". It also sets up hero events and hero swaps.
- **D. Shrink the face-card cliff.** Give number cards a weaker version of the class ability (e.g. a 7 heals for 7/14 of a Queen) instead of none. Then class matters on every card, not just J–A, and the number means something. This one also helps your "the number felt meaningless" note.
- **E. Make fights a slope.** More randomness or a longer fight so close armies trade wins. On its own this doesn't make class matter, but it lets small class edges show.

My read: **D plus A** is the smallest swing with the biggest effect. D removes the ability cliff that swamps everything; A gives class a reason to exist each round. C is a cheap add-on that also feeds the hero lane.

## What I need back from the chat
1. Which direction (or mix) for class: A, B, C, D, E, or something else.
2. If A: should the skeleton army's make-up be shown before you play your hands (so you can plan for it)? I'd recommend yes.
3. If D: should number cards get a scaled ability, or a different, smaller ability?
4. Any change to the counter loop itself (Rogues > Witches and Priestesses, Knights > Rogues, Witches > Knights)?
5. A target for "class matters", if not the brief's "class-aware bot clears 10+ points more than greedy". For example, add "a one-class army wins less often than a mixed one."

Bring the answers back to the code session. I'll build it, rerun the sim, and report the class-aware lead.
