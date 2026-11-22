// Poker Squads: every number the game uses. Ask for changes by name
// ("birth.upChance to 0.6"); ?tune=birth.upChance:0.6 tries one in the browser.
// Poker numbers come from RESEARCH.md (checked by Brian 2026-11-22: fine for prototyping).
// Everything else is a first guess *(my call)* until tuned; nothing is tuned yet.

export const SUITS = ['S', 'H', 'C', 'D']; // Spades, Hearts, Clubs, Diamonds
export const CLASS_OF = { S: 'knight', H: 'priestess', C: 'witch', D: 'rogue' };
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const SQUADS = {
  // ---- The deck and a round (Brian's numbers) ----
  round: { handSize: 8, maxPlay: 5, hands: 6, discards: 4, armySize: 6 }, // one army: 2 heroes + 6 unit slots (Brian)
  run: { rounds: 8, lives: 3 },

  // ---- Poker scoring: RESEARCH.md. [base chips, base mult] ----
  poker: {
    hands: {
      flushFive: [160, 16], // two sources agree
      flushHouse: [140, 14], // two sources agree
      fiveKind: [120, 12], // two sources agree
      straightFlush: [100, 8], // two sources agree (royal flush scores the same)
      fourKind: [60, 7], // two sources agree
      fullHouse: [40, 4], // two sources agree
      flush: [35, 4], // two sources agree
      straight: [30, 4], // two sources agree
      threeKind: [30, 3], // two sources agree
      twoPair: [20, 2], // two sources agree
      pair: [10, 2], // two sources agree
      highCard: [5, 1], // two sources agree
    },
    // Chips per rank (2..14, Ace = 14). 2-10 face value, J/Q/K 10, Ace 11: two sources agree.
    rankChips: { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 10, 12: 10, 13: 10, 14: 11 },
  },

  // ---- The birth ----
  birth: {
    // Score needed for each guaranteed tier (common, uncommon, rare, epic, legendary).
    // Raised (Brian: Rares and Epics must be hard to get early). Roughly, with a starting deck:
    // pairs and two pairs = Common, three of a kind = Uncommon, a strong flush / full house =
    // Rare (a straight usually needs the luck roll), four of a kind = Epic, a straight flush = Legendary. *(my call on the exact numbers)*
    rarityThresholds: [0, 140, 320, 600, 1100],
    // The luck roll (staged on screen): chance to roll up one tier =
    // luckBase + upChance x (how far the score is toward the next tier).
    luckBase: 0.05,
    upChance: 0.25,
    jumpChance: 0.03, // chance to jump two tiers = jumpChance x the same fraction
    // Power: rarity is the big step, the number (2..Ace) the spread inside it. A Common Ace
    // lands at rankSpread of the way to an Uncommon 2 ("just under").
    tierPower: [1, 1.6, 2.5, 4, 6.5, 10], // the 6th entry is only the top of Legendary's spread
    rankSpread: 0.9,
    abilityFrom: 11, // J, Q, K, A have their class ability; 2-10 are plain bodies
    returnChips: [5, 15, 30, 50, 80], // bonus chips a unit carries back into the deck, per rarity
  },

  // ---- Classes (suit = class). Stats at power 1; hp and atk scale with power. *(my call)* ----
  classes: {
    knight: { name: 'Knight', row: 'front', hp: 130, atk: 9, range: 1.3, speed: 2.2, interval: 1.2, armor: 0.15 },
    rogue: { name: 'Rogue', row: 'front', hp: 75, atk: 13, range: 1.1, speed: 3.6, interval: 0.85, armor: 0 },
    witch: { name: 'Witch', row: 'back', hp: 55, atk: 11, range: 5.5, speed: 1.8, interval: 1.6, armor: 0 },
    priestess: { name: 'Priestess', row: 'back', hp: 65, atk: 4, range: 5, speed: 1.8, interval: 1.5, armor: 0 },
  },
  // Damage multiplier attacker class -> target class: the counter loop.
  // Rogues kill Witches and Priestesses, Knights stop Rogues, Witches punish Knights.
  counters: {
    rogue: { witch: 1.6, priestess: 1.6 },
    knight: { rogue: 1.6 },
    witch: { knight: 1.35 },
  },
  // Class abilities (only units born from J, Q, K, A, and all heroes).
  abilities: {
    knight: { name: 'Hold the Line', tauntRadius: 2.6, damageTaken: 0.7 }, // enemies near it must hit it; it takes 30% less
    rogue: { name: 'Shadowstep', dive: true }, // goes straight for the enemy back line
    witch: { name: 'Hex Burst', splashRadius: 1.7, splash: 0.6 }, // 60% damage to everyone near the target
    priestess: { name: 'Mend', healEvery: 2.4, heal: 16, shield: 8 }, // heals and shields the most hurt ally (x power)
  },

  // ---- Heroes: one per class; you command two. Each aura buffs the whole army, more for its own class. ----
  heroes: {
    knight: { name: 'Warden Ortha', cls: 'knight', power: 2.2, aura: { stat: 'hp', all: 0.15, own: 0.35 },
      skill: { name: 'Bulwark', every: 6, shield: 22 } },
    witch: { name: 'Hexmother Vey', cls: 'witch', power: 2.2, aura: { stat: 'atk', all: 0.1, own: 0.3 },
      skill: { name: 'Cinder Rain', every: 7, damage: 26, radius: 2.2 } },
    priestess: { name: 'Mother Selune', cls: 'priestess', power: 2.2, aura: { stat: 'hp', all: 0.1, own: 0.3 },
      skill: { name: 'Sanctuary', every: 7, heal: 24 } },
    rogue: { name: 'Shade Corvin', cls: 'rogue', power: 2.2, aura: { stat: 'atk', all: 0.1, own: 0.3 },
      skill: { name: 'Death Mark', every: 6, damage: 45 } },
  },
  startHeroes: ['knight', 'witch'], // tonight's slice: two fixed heroes

  // ---- Skeleton army. Each skeleton fights as a class. Power per round. *(my call)* ----
  skeletons: {
    warrior: { cls: 'knight', ability: true, model: 'skelWarrior' },
    minion: { cls: 'knight', ability: false, model: 'skelMinion' },
    rogue: { cls: 'rogue', ability: true, model: 'skelRogue' },
    mage: { cls: 'witch', ability: true, model: 'skelMage' },
    boss: { cls: 'knight', ability: true, model: 'skelBoss', hpMult: 3, atkMult: 2.4 },
  },
  // One skeleton army per round (8 skeletons; round 8 has the boss).
  enemyRounds: [
    { power: 1.0, units: ['warrior', 'warrior', 'minion', 'minion', 'minion', 'rogue', 'mage', 'mage'] },
    { power: 1.25, units: ['warrior', 'warrior', 'minion', 'minion', 'rogue', 'rogue', 'mage', 'mage'] },
    { power: 1.55, units: ['warrior', 'warrior', 'warrior', 'minion', 'rogue', 'rogue', 'mage', 'mage'] },
    { power: 1.9, units: ['warrior', 'warrior', 'warrior', 'warrior', 'rogue', 'rogue', 'rogue', 'mage'] },
    { power: 2.3, units: ['warrior', 'warrior', 'warrior', 'rogue', 'rogue', 'mage', 'mage', 'mage'] },
    { power: 2.75, units: ['warrior', 'warrior', 'warrior', 'warrior', 'rogue', 'rogue', 'rogue', 'mage'] },
    { power: 3.25, units: ['warrior', 'warrior', 'warrior', 'rogue', 'rogue', 'mage', 'mage', 'mage'] },
    { power: 3.6, units: ['boss', 'warrior', 'warrior', 'rogue', 'rogue', 'mage', 'mage'] }, // round 8: the boss army
  ],

  // ---- The fight ----
  fight: {
    tick: 0.1, // seconds per sim step
    damageScale: 0.55, // every attack, skill and heal x this: sets fight length without touching the class table
    enemyPower: 1.6, // every skeleton's power x this (on top of the round's power); set so the greedy bot clears ~30% *(placeholder)*
    maxTime: 45, // a fight still going after this is a loss
    crit: 0.1, critMult: 1.6, spread: 0.12,
    rows: { front: 1.6, back: 4.2 }, // distance from the middle line, metres
    slotGap: 1.1, // gap between units in a row
    separation: 0.75, // allies closer than this push apart
  },

  // ---- Combat power: one number per army, the bar to clear (Brian). *(my call on the formula)*
  // Army power = scale x sqrt(total effective health x total damage per second), where
  // effective health counts armour, Hold the Line and shields, and damage per second counts
  // Hex Burst splash, healing and hero skills. npm run sim reports how well it predicts wins.
  combatPower: { scale: 0.5, splashTargets: 1.5, healWorth: 1, shieldWorth: 1, skillTargets: 2.5 },

  // ---- Deck return (sim only tonight; the run on screen is a later lane) ----
  // Which card a returning unit replaces. Three candidates; the sim reports drift for each.
  returnRules: ['lowest', 'lowestSameSuit', 'source'],
  returnRule: 'lowest', // Brian's brief: "start with the lowest number"

  // ---- Bots (npm run sim) ----
  bots: {
    discardBelow: 60, // both bots discard when their best hand scores under this (and discards remain)
    classWeight: 0.5, // class-aware bot: how much a needed class is worth against raw score
    want: { knight: 2, priestess: 1, witch: 2, rogue: 1 }, // the class-aware bot's ideal six
  },

  // ---- Targets (Brian's). npm run sim says pass / fail for each in BALANCE.md. ----
  targets: {
    greedyClear: { min: 20, max: 35 }, // % of runs the greedy bot clears
    classAwareLead: { min: 10 }, // points more than greedy
    heroEventsPerRound: { min: 0.7, max: 1.3 },
    round8FourKindPlus: { max: 25 }, // % of round-8 hands that are four of a kind or better
    earlyLegendary: { min: 5, max: 15 }, // % of runs with a Legendary born in rounds 1-3
    round1RarePlus: { max: 20 }, // % of round-1 births that are Rare or better (Brian: earn rarity)
    powerPredicts: { min: 80 }, // % of fights the side with more combat power wins
    fightSeconds: { min: 15, max: 25 },
    runMinutes: { min: 15, max: 25 },
  },
  // Time a person takes (for the run-length estimate only). *(my call)*
  pace: { thinkPerHand: 9, thinkPerDiscard: 4, preFight: 3, postFight: 4 },

  // ---- On screen (view only; the sim ignores these). Milliseconds. ----
  reveal: {
    gather: 380, // played cards fly to the centre
    count: 650, // chips x mult count up
    rollBase: 650, // the rarity needle sweeps to the score's guaranteed tier
    luck: 1300, // the luck roll: a marker races over the roll-up zone and settles
    luckResult: 450, // beat after the marker lands (longer when it rolls up)
    rollPerTier: 350,
    pick: 520, // the roulette over scoring cards that picks the unit's card
    drop: 700, // pause before the unit card pops out
    dropHighExtra: 700, // extra hang time for Epic and Legendary
    settle: 350,
    hop: 450, // the unit card joins the army
    discard: 300, // discarded cards drop away
    deal: 260, // new cards slide into the hand
    endDelay: 900, // pause after the last blow before the result
  },
  simRuns: 400, // runs per bot per return rule in npm run sim
};
