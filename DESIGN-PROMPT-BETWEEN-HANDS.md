# Design room prompt: decisions between hands

Paste everything below the line into the design chat.

---

I'm designing **Poker Squads**, a roguelike prototype. Help me brainstorm one thing: **a layer of real decisions between rounds (and maybe between hands)** that slows the hand-playing loop down and adds new ways to optimise a build. Think of the role a shop plays between blinds in Balatro, but it doesn't have to be a shop.

## The game as it plays today
- **A run:** pick 2 of 4 heroes, then 8 rounds, 3 lives. Round 8 is a boss army.
- **Each round:**
  - A standard 52-card deck, hand of 8, play up to 5 cards, 6 hands and 4 discards.
  - Every hand scores as poker (chips × mult) and is **born as one unit**.
  - **Suit decides the class.** Spades are Knights (Armor), Hearts are Priestesses (Shield the most hurt ally), Clubs are Witches (Burn that ignores Armor and spreads), Diamonds are Rogues (Crit, jump to the enemy back line).
  - **Score decides rarity** through thresholds plus a visible "luck roll" to rank up. Rarity is the big power step; the card's number is the spread inside it.
  - Face cards (J, Q, K, A) also roll one bonus from their class's pool of 3.
- **Before you play:** the screen shows the hand, its score, the class odds, the rarity odds, and how much combat power the hand would add. You also see the skeleton army you'll face, with its own power number: the bar to clear.
- **The fight:** your army (2 heroes + kept units + this round's 6) auto-fights the skeletons. Knights and Rogues are the front line, Witches and Priestesses the back line. No placement.
- **After the fight:**
  - **Keep 1** of the round's 6 units for good; the other 5 become cards in your deck.
  - **After a win, pick 1 of 3 relics.** There are 12: two per class, plus four poker relics: +1 discard; you pick which suit a pair copies; face cards roll 2 bonuses and you pick 1; +15% rank-up chance. One offer always matches a hero you run.
- **Heroes:** each hero's skill boosts its own class, so the heroes you pick decide your build.

## What playtesting says (my words)
- Synergies to play for added interest, but it **feels linear**: once I pick heroes, I know which suits I want.
- **The hand-playing loop has too little decision-making.** I'm rapid-firing hands, and my decision variables don't change enough from hand to hand or round to round.
- I want **real downtime between hands or rounds**, with deep decisions, and **more vectors for build optimisation and strategy**.

## What a good answer looks like
Give me **5–7 distinct concepts**. For each one:
1. **Name** and a one-paragraph pitch.
2. **When it happens** (between rounds, between hands, mid-round), roughly how long it takes, and what the player looks at.
3. **The decision it creates:** what's traded against what, and why it isn't obvious.
4. **What it touches:** the deck, the units or army, heroes, relics, the poker scoring, the skeleton army, economy.
5. **How it changes hand play:** does it make me play hands differently, not just between rounds?
6. **Build vectors it opens:** new strategies or archetypes it makes possible.
7. **Risks:** solved choices, too much reading, power creep, fights getting all-or-nothing again.
8. **Smallest testable version:** cards and buttons only, no new art, something I could build in one session.

Then **rank them**, and recommend **one to prototype first and one to pair with it**.

## Things worth exploring (not a requirement)
- **A currency** earned from hands, scores, kills or wins, and what spends it: units, cards, deck edits, relic rerolls, hero upgrades.
- **Deck shaping:** removing, upgrading, copying or changing a card's suit, given that suit = class.
- **The skeleton army as a puzzle:** scouting it, choosing between several armies or routes, risk-and-reward fights.
- **Army management:** selling or merging kept units, promoting a unit, a bench, swapping heroes.
- **Changing how hands score:** temporary rules for a round, hand-type upgrades, bonuses for specific hands. Today every hand counts the same toward rarity.
- **Pressure inside a round:** for example, hands left vs. power still needed, or holding a hand back for a better one.
- **Reasons not to always play your highest-scoring hand.**

## Constraints
- **It's a prototype.** We're testing whether it's fun to play poker hands born as units for an auto-fight, and whether a big hand feels paid at the reveal. New systems should feed that, not bury it.
- **Cards-only screen for now:** no 3D or bespoke art.
- **On-screen names must be original.** Don't use Balatro's name, joker names or art. Citing it as a reference here is fine.
- **Reopening cuts is fine.** These were cut from the original brief and are on the table: a shop, consumables, army-wide poker-hand bonuses, anything between runs. Say which ones you're reopening and why.
- **Don't add more heroes or hero events** in this pass.
- **Small swings.** Prefer one strong new decision layer over several shallow ones.
