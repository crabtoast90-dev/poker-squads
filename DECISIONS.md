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

## 2026-11-22 (Brian's playtest notes on the setup slice)
- Brian: rarity felt deterministic and the card number felt meaningless. Epics and Rares must be hard to get early (it is a roguelike: the deck should grow into better units over the run). Don't take too big a swing for the prototype.
- Brian: scrap the two squads. Two heroes command one army with 6 unit slots.
- Brian: the player needs a bar to clear, like a blind. Show a "combat power" estimate for the enemy army and for your own.
- Brian: the poker table in RESEARCH.md is fine for prototyping (checked 2026-11-22).
- Brian: N3 = raise the rarity thresholds (a) and stage the roll-up as a visible luck moment (c), with rarity-up moments sometimes happening inside that ceremony. Build N1, N2, N3.
- One army: both heroes' auras apply to every unit, and stack (a Witch gets Vey's own-class bonus plus Ortha's all-class bonus). One skeleton army of 8 per round. *(my call)*
- Combat power = 0.5 x sqrt(total effective health x total damage per second), counting armour, Hold the Line, Hex Burst splash, healing, shields and hero skills; counters left out. It calls the winner in 85% of sim fights; at equal power you win about 55-80%. *(my call)*
- The odds panel shows the average power a hand would add (with its range), so a hand's payoff reads as "closes the gap by N". Each unit card shows "+N power", its own share of the army. *(my call)*
- Rarity thresholds 0 / 140 / 320 / 600 / 1100. Luck roll chance = 5% + 25% x progress to the next tier; two-tier jump = 3% x progress. Round 1: 16% of births are Rare or better (target under 20%). *(my call on the numbers, Brian on the direction)*
- Skeleton strength multiplier 1.6 so the greedy bot clears 25% (target 20-35%). A placeholder ahead of lane C tuning. *(my call)*
- The luck roll on screen: a bar whose coloured end is the rank-up chance; a marker races and settles where the sim's roll landed, then "RANK UP!" with a flash and chime, or "No luck". *(my call)*
- Brian: classes next, decided in the design chat; Claude wrote CLASSES-REPORT.md as the brief for it.

## 2026-11-22 (classes pass, Brian's spec from the design chat)
- Brian: every unit carries its class mechanic scaled by power (Knight Armor, Witch Burn ignoring Armor, Priestess Shield on the most hurt ally, Rogue Crit + back-line jump). Old J-A abilities and the flat counter table removed.
- Brian: face cards roll 1 bonus from a class pool of 3 (Knight Bulwark/Chivalry/Taunt, Witch Inferno/Chill/Splash, Priestess Aegis/Mend/Bless, Rogue Keen/Poison/Ambush), shown at the reveal.
- Brian: 4 heroes, pick 2 at run start; Ortha and Vey kept; skills boost their own class. No hero events or swaps this pass.
- Brian: formation rules (front line hit first; Rogues jump; no front line = back line hit from the start); skeleton make-up varies by round and is shown before you play.
- Brian: keep 1 of the round's 6 after every fight; 1 of 3 relics after every win (12 relics, one offer always matches a hero).
- Brian: fights a slope (equal power = 25-75% win); power counts mechanics, hero skills and relics.
- Priestess hero: Mother Selune; Rogue hero: Shade Corvin. Bonus names: Bulwark, Chivalry, Taunt, Inferno, Chill, Splash, Aegis, Mend, Bless, Keen, Poison, Ambush. Relic names: Tempered Plate, Last Oath, Slow Kindling, Searing Brand, Greater Ward, Thorned Ward, Honed Edge, Killer's Mark, Loose Sleeve, Twin Choice, Royal Court, Lucky Coin. *(my call)*
- Ortha's skill reads "every Knight gives all allies 20% of its Armor" (scales with the Knights you draft instead of a flat number). Heroes no longer have timed skills; their skill is passive. *(my call)*
- Class numbers (power 1): Knight 140 hp, 5 attack, Armor 2.2; Rogue 55 hp, 8 attack, 25% crit; Witch 55 hp, 8 attack, Burn 3.2/s for 4 s; Priestess 65 hp, Shield 24 every 3 s (a Shield is capped at 60% of max health). Set so a mixed front + back army beats any one-class army. *(my call)*
- Skeleton armies: 8 skeletons in round 1, one more each round (your army also grows by one keep a round); leans Shield wall, Stalker raid, Caster horde, Iron line, Night raid, Grave choir, Bone legion, The Bone King. New skeletons: Bone Brute (Taunt), Grave Acolyte (Priestess), Bone King (boss Knight with Taunt). *(my call)*
- Fights a slope: each hit rolls ±30%, and a fresh target is one of the two nearest; damage grows 10% per round so big late armies finish sooner; at 60 s the side with more health left (by share) wins. *(my call)*
- Combat power = 0.5 × sqrt(effective health × damage per second), read from every fighter as built, against the other army's average hit and Armor; Armor and Shield worths fitted to sim fights (0.6, 0.4). *(my call)*
- When a relic gives a choice (Twin Choice, Royal Court), you choose right after playing, before the reveal; the reveal then plays out the chosen unit. *(my call; it spoils the class a moment early)*
- After round 8 there is no keep (the run is over). A lost fight still lets you keep one; only a win offers a relic. *(my call on the first; Brian on the second)*
- Skeleton strength (2.5x, round curve 0.8 to 3.4) and bot weights set by hand so greedy clears ~26% and class-aware ~39%. Placeholder ahead of lane C tuning. *(my call)*
- Review fixes *(my call)*: the stronger Burn stays on a target (a weaker one only tops up its time); Witches spread Burn (once their target burns as hot, they move to an unburnt enemy), which is what makes Slow Kindling matter; Armor never takes more than 75% off a hit; Last Oath passes the fallen Knight's own Armor (not Armor it was sharing); a Poison kill no longer counts as a Rogue kill; relic offers are shuffled so the hero-matching one isn't always first. Late skeleton rounds eased (round 6-8 power 1.95 / 2.25 / 2.6; overall 2.45x).
- Brian: early playtest prototypes don't get significant tuning time. Report sim targets that miss and move on; only fix numbers that make the build unplayable or hide what a feature does.

## 2026-11-22 (decision-depth pass, Brian's spec)
- Brian: the poker hand stamps a trait on the unit (Sturdy, Veteran, Banner, Swift, Devout, Guardian, Champion; straight flush = Swift + Devout); traits don't return to the deck.
- Brian: 3 bounties a round (12 in the pool) paying gold; gold from wins, bounties and 1 per unused discard; a shop after every win (after the keep) with rites, doctrines, hero talents and relics plus a reroll that gets dearer; the free relic pick and the 3 lives removed: a lost fight ends the run.
- Trait numbers: Sturdy +40% health; Veteran +10% stats plus its bonus roll; Banner +15% damage to its class; Swift attacks 30% faster; Devout doubles the class mechanic (Crit chance doubled, capped at 90%); Guardian shields every ally for 14 x power at the start; Champion +60% stats. Each doctrine level adds +10 chips, +1 mult and +50% trait strength. Doctrine levels apply to every unit of that hand type, including ones already born. *(my call)*
- Talent names: Shared Oath, Rear Guard, Spiked Plate (Ortha); Kindled Blades, Choking Smoke, Warded Flame (Vey); Steel Grace, Last Light, Morning Prayer (Selune); Smell of Smoke, Blood Money, Covered Advance (Corvin). Rite names: Rite of Spades/Hearts/Clubs/Diamonds, Cull, Echo, Crown, Gild. *(my call)*
- Prices: rite 7, doctrine 6, talent 8, relic 8 gold; reroll 2, +1 each use. Win pays 4; bounties pay 2-5 (+15% per round). Gives about 2 purchases per shop. Cull can't take the deck under 30 cards. Crown turns a number card into a random J-A of its suit. Gild on a plain card makes it Common (+5 chips). *(my call)*
- Bounties are paid only after a win (a loss ends the run). "Two {suit} units" picks a suit your heroes don't use 70% of the time. *(my call)*
- Skeleton curve redone for "one loss ends the run": round 1 is gentle (0.6) and it climbs to 3.2 by round 8, at 2.95x overall; set once so greedy clears ~24%. *(my call, placeholder)*
- Review fixes *(my call)*: Kindled Blades is 1.5x on top of Shade Corvin's triple (it did nothing with him); the power number now counts the fight-time talents; the shop's power readout no longer double-counts the kept unit. Not changed (Brian's spec): the 'Score 300+ with a pair or a high card' bounty is almost never met (1 in 338 offers), impossible in round 1.

## 2026-11-22 (Brian's notes after the decision-depth pass)
- Brian: traits and hero skills must be readable (hover), and the fight must be followable. Built: hover tooltips on every unit, hero, relic, talent and doctrine (class mechanic in words, bonuses, trait and its source hand and doctrine level, health, hit size, speed, Armor, starting Shield); hero cards show level and skill; a fight log (crits, kills, splashes, Burn jumps, big Shields, thorns, plus the pre-fight auras); a damage table on the result panel.
- Brian: +10 gold before each shop. Built as stated (purchases rise to ~3.5 a shop; not re-priced).
- Brian: heroes level up or get replaced by heroes from high-tier hands. Built from the original brief's hero events: a hand can birth a hero event instead of a unit (the hand is free); class from the card it copied; own that hero = it levels up; otherwise swap it in (the one leaving becomes a Legendary Ace of its suit in the deck) or level one of yours.
- Hero event chance by the hand's final rarity: Common 0%, Uncommon 3%, Rare 7%, Epic 20%, Legendary 40%; at most 2 a round. A hero level = +30% power. A hero who comes back keeps their old level. Talents only work while their hero is in the army. The pre-play panel shows the hand's hero chance. *(my call)*
- The hero swap / level choice comes after the reveal (the reveal plays "HERO!" with the hero's card), unlike the relic choices, which come before. *(my call)*
- Skeletons 3.3x overall (from 2.95) to offset the +10 gold and hero levels. *(my call)*
- Brian's note on bounties ("generic enough that I hit 2 or 3 playing as if they didn't exist") is open: options offered, nothing built.
- Review fixes *(my call)*: a hero swapped back in within the same round no longer also becomes an Ace; the hero choice no longer replays the whole reveal; hero-event card ids are unique; the check now plays a run that swaps heroes. Known: with Royal Court, a face-bonus pick is thrown away if that hand turns into a hero event.
