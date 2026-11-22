# Decisions

One dated line per decision. Lines marked *(my call)* are technical or naming calls Claude made; Brian can overturn any of them.

## 2026-11-22 (setup session)
- The game, from Brian's brief: 8-round runs, 6 poker hands a round each born as a unit, two heroes' squads of 3, auto-fight vs skeletons, 3 lives, round 8 boss. Tests whether a big hand feels paid at the reveal.
- Brian: deck 52 standard cards, hand 8, play up to 5, 6 hands and 4 discards; reshuffle played + discarded when the draw pile runs out.
- Brian: suit = class (Spades Knight, Hearts Priestess, Clubs Witch, Diamonds Rogue); unit copies one random scoring card; J/Q/K/A have the class ability; rarity from score with roll-up chance, never down; odds shown before committing.
- Brian: tonight's slice is one round with Knight + Witch heroes fixed; no hero events, deck return or run on screen yet.
- Poker numbers copied from the source game into RESEARCH.md; **placeholders until Brian checks them**; nothing tuned.
- Stack and workflow from the game kit's starter (three.js pinned, Vite, Pages on push to main, `npm run check`, `npm run sim`, `npm run log-time`).
- Hero names: Warden Ortha (Knight), Hexmother Vey (Witch), Mother Selune (Priestess), Shade Corvin (Rogue). Ability names: Hold the Line, Mend, Hex Burst, Shadowstep; hero skills Bulwark, Cinder Rain, Sanctuary, Death Mark. *(my call)*
- Rarity thresholds 0 / 60 / 150 / 300 / 600 (roughly high pair, three of a kind, flush, four of a kind); roll-up chance = 0.5 x progress to the next tier, jump-two = 0.06 x progress. *(my call)*
- Power ladder 1 / 1.6 / 2.5 / 4 / 6.5 per rarity; the number spreads a unit 90% of the way to the next tier, so a Common Ace sits just under an Uncommon 2. *(my call)*
- Class stats and counters: Rogues x1.6 vs Witches and Priestesses, Knights x1.6 vs Rogues, Witches x1.35 vs Knights. Knight ability: taunt and 30% less damage; Rogue: dives the back line; Witch: 60% splash; Priestess: heals and shields the most hurt ally. *(my call)*
- Fight length set by a global damage scale (0.55) and skeleton strength by a global multiplier (1.9), set by hand so round 1 is winnable and fights land near 20 s. This is a placeholder, not tuning. *(my call)*
- A fight still going at 45 s counts as a loss. *(my call)*
- Clearing a run means beating the round-8 boss (with lives left). *(my call)*
- Hero units take the field as fighters (power 2.2) with an aura on their own squad and a skill on a timer. *(my call)*
- Four-colour suits on cards and icons (Spades black, Hearts red, Clubs green, Diamonds blue) so classes read at a glance. *(my call)*
- **Brian (mid-session): build speed first. Stop all 3D and art; units, heroes and enemies are cards with numbers; the fight is cards trading hits with health bars; skip the phone check and any polish.** The 3D view, models and camera work were removed.
- Skeleton card names: Bone Warrior, Bone Minion, Bone Stalker, Bone Caster, Bone King. *(my call)*
- Squad layout: squads 2.3 m either side of centre, 1.1 m between units, so the field fits a phone's width. *(my call)*
- The reveal replaces the hand while it plays: cards gather, chips x mult count up, the rarity needle sweeps (and jumps on a roll-up), a roulette picks the scoring card, then the unit card pops out with a flash for Epic/Legendary. *(my call)*
- Deck return (sim only tonight): three candidate rules measured in BALANCE.md (lowest card any suit, lowest of own suit, the exact source card). The brief's "lowest" is in use until Brian picks. *(my call to offer the other two)*
- The fight's "top unit" = most damage + healing; its card is outlined gold with a "carrying" tag during the fight and is named on the result. *(my call)*
