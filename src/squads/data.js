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
    faceFrom: 11, // J, Q, K, A also roll a bonus from their class's pool
    returnChips: [5, 15, 30, 50, 80], // bonus chips a unit carries back into the deck, per rarity
  },

  // ---- Classes (suit = class). Every unit has its class mechanic, scaled by its power
  // (rarity + number). Stats at power 1. *(my call on every number)* ----
  classes: {
    knight: { name: 'Knight', row: 'front', hp: 140, atk: 5, interval: 1.2, range: 1.3, speed: 2.2,
      mechanic: 'Armor', armor: 2.2 }, // flat damage taken off every hit (x power)
    rogue: { name: 'Rogue', row: 'front', hp: 55, atk: 8, interval: 0.85, range: 1.1, speed: 3.6,
      mechanic: 'Crit', crit: 0.25, critMult: 2 }, // chance to hit for double; jumps to the back line
    witch: { name: 'Witch', row: 'back', hp: 55, atk: 8, interval: 1.6, range: 5.5, speed: 1.8,
      mechanic: 'Burn', burn: 3.2, burnFor: 4 }, // damage per second for burnFor s, ignores Armor (x power)
    priestess: { name: 'Priestess', row: 'back', hp: 65, atk: 3.5, interval: 1.5, range: 5, speed: 1.8,
      mechanic: 'Shield', shield: 24, shieldEvery: 3 }, // shields the most hurt ally (x power)
  },
  // Face cards (J, Q, K, A) also roll one bonus from their class's pool at birth.
  bonuses: {
    knight: {
      bulwark: { name: 'Bulwark', text: '+60% Armor', armor: 0.6 },
      chivalry: { name: 'Chivalry', text: 'allies gain 30% of its Armor', share: 0.3 },
      taunt: { name: 'Taunt', text: 'nearby enemies must hit it', radius: 2.8 },
    },
    witch: {
      inferno: { name: 'Inferno', text: '+60% Burn', burn: 0.6 },
      chill: { name: 'Chill', text: 'its target attacks 35% slower', slow: 0.35, for: 3 },
      splash: { name: 'Splash', text: 'hits enemies next to its target for 50%', radius: 1.7, share: 0.5 },
    },
    priestess: {
      aegis: { name: 'Aegis', text: '+60% Shields', shield: 0.6 },
      mend: { name: 'Mend', text: 'also heals half its Shield', heal: 0.5 },
      bless: { name: 'Bless', text: 'shielded ally hits 30% harder', dmg: 0.3 },
    },
    rogue: {
      keen: { name: 'Keen', text: '+20% Crit chance', crit: 0.2 },
      poison: { name: 'Poison', text: 'hits stack poison (1/s each, up to 5)', dps: 1, for: 4, max: 5 },
      ambush: { name: 'Ambush', text: 'first hit always crits' },
    },
  },

  // ---- Heroes: one per class; you pick two at run start. Each hero's skill boosts its own class. ----
  heroes: {
    knight: { name: 'Warden Ortha', cls: 'knight', power: 2.2, skill: 'Every Knight in your army gives all allies 20% of its Armor', armorShare: 0.2 },
    witch: { name: 'Hexmother Vey', cls: 'witch', power: 2.2, skill: 'Witch Burn +50%; when a burning enemy dies, its Burn jumps to the nearest enemy', burn: 0.5 },
    priestess: { name: 'Mother Selune', cls: 'priestess', power: 2.2, skill: 'Allies holding a Shield deal +35% damage', shieldedDmg: 0.35 },
    rogue: { name: 'Shade Corvin', cls: 'rogue', power: 2.2, skill: 'Rogue crits hit for triple; a Rogue that gets a kill attacks again at once', critMult: 3 },
  },
  startHeroes: ['knight', 'witch'], // the default pair (bots and the check)

  // ---- Relics: after each won fight, pick 1 of 3 (one always matches a hero you run). ----
  relics: {
    knightPlate: { cls: 'knight', name: 'Tempered Plate', text: 'Knights have 50% more Armor', armor: 0.5 },
    knightOath: { cls: 'knight', name: 'Last Oath', text: 'When a Knight falls, allies gain its Armor for the rest of the fight' },
    witchKindle: { cls: 'witch', name: 'Slow Kindling', text: 'Burn lasts twice as long', burnFor: 2 },
    witchSear: { cls: 'witch', name: 'Searing Brand', text: 'Burning enemies take 25% more damage from everything', dmg: 0.25 },
    priestWard: { cls: 'priestess', name: 'Greater Ward', text: 'Shields are 50% bigger', shield: 0.5 },
    priestThorn: { cls: 'priestess', name: 'Thorned Ward', text: 'A Shield that breaks deals its amount back to the attacker' },
    rogueEdge: { cls: 'rogue', name: 'Honed Edge', text: '+20% Crit chance for Rogues', crit: 0.2 },
    rogueMark: { cls: 'rogue', name: "Killer's Mark", text: 'A Rogue kill makes its next attack a sure crit' },
    pokerDiscard: { cls: 'poker', name: 'Loose Sleeve', text: '+1 discard per round', discards: 1 },
    pokerPair: { cls: 'poker', name: 'Twin Choice', text: 'When a pair births a unit, you pick which of the two suits' },
    pokerFace: { cls: 'poker', name: 'Royal Court', text: 'Face-card units roll 2 bonuses and you pick 1' },
    pokerLuck: { cls: 'poker', name: 'Lucky Coin', text: '+15% chance to roll up a rarity', luck: 0.15 },
  },

  // ---- Skeleton armies: same classes and rules as yours; make-up varies by round, size
  // grows with your army (8 + round - 1 skeletons). *(my call)* ----
  skeletons: {
    warrior: { name: 'Bone Warrior', cls: 'knight' },
    brute: { name: 'Bone Brute', cls: 'knight', bonus: 'taunt' },
    stalker: { name: 'Bone Stalker', cls: 'rogue' },
    caster: { name: 'Bone Caster', cls: 'witch' },
    acolyte: { name: 'Grave Acolyte', cls: 'priestess' },
    king: { name: 'Bone King', cls: 'knight', bonus: 'taunt', hpMult: 3, atkMult: 1.8 },
  },
  enemyRounds: [
    { power: 0.8, lean: 'Shield wall', units: ['warrior', 'warrior', 'warrior', 'warrior', 'caster', 'caster', 'acolyte', 'stalker'] },
    { power: 0.92, lean: 'Stalker raid', units: ['warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'acolyte'] },
    { power: 1.1, lean: 'Caster horde', units: ['brute', 'warrior', 'warrior', 'caster', 'caster', 'caster', 'caster', 'caster', 'acolyte', 'acolyte'] },
    { power: 1.35, lean: 'Iron line', units: ['brute', 'brute', 'warrior', 'warrior', 'warrior', 'warrior', 'caster', 'caster', 'acolyte', 'acolyte', 'stalker'] },
    { power: 1.65, lean: 'Night raid', units: ['brute', 'warrior', 'stalker', 'stalker', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'acolyte', 'acolyte', 'caster'] },
    { power: 2.15, lean: 'Grave choir', units: ['brute', 'warrior', 'warrior', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'acolyte', 'acolyte', 'stalker', 'stalker', 'warrior'] },
    { power: 2.75, lean: 'Bone legion', units: ['brute', 'brute', 'warrior', 'warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'warrior'] },
    { power: 3.4, lean: 'The Bone King', units: ['king', 'brute', 'warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'acolyte', 'warrior'] },
  ],

  // ---- The fight ----
  fight: {
    tick: 0.1, // seconds per sim step
    damageScale: 1.5, // every hit, Burn, Shield x this: sets fight length
    damagePerRound: 0.1, // ...plus 10% per round, so bigger late armies still finish near 20 s
    enemyPower: 2.5, // every skeleton's power x this (on top of the round's power); set by hand so greedy clears ~30% *(placeholder)*
    maxTime: 60, // still going at 60 s: the side with more health left (by share) wins
    spread: 0.3, // each hit rolls x (1 ± spread): fights are a slope, not a cliff
    rows: { front: 1.6, back: 4.2 }, // distance from the middle line, metres
    slotGap: 1.0, // gap between units in a row
    separation: 0.7, // allies closer than this push apart
    shieldCap: 0.6, // a unit's Shield can't exceed this share of its max health
  },

  // ---- Combat power: one number per army, the bar to clear. It reads every fighter as built
  // (mechanics, bonuses, hero skills and relics already in its stats) against the other army's
  // average hit and Armor. Army power = scale x sqrt(effective health x damage per second). *(my call)*
  combatPower: { scale: 0.5, fightSeconds: 20, armorWorth: 0.6, shieldWorth: 0.4 }, // worths fitted to sim fights

  // ---- Deck return (sim only tonight; the run on screen is a later lane) ----
  // Which card a returning unit replaces. Three candidates; the sim reports drift for each.
  returnRules: ['lowest', 'lowestSameSuit', 'source'],
  returnRule: 'lowest', // Brian's brief: "start with the lowest number"

  // ---- Bots (npm run sim) ----
  bots: {
    discardBelow: 60, // both bots discard when their best hand scores under this (and discards remain)
    classWeight: 2.5, // class-aware bot: how much a needed class is worth against raw score
    heroClassShare: 0.6, // class-aware bot: share of the new six it wants in its heroes' classes
    frontShare: 0.4, // class-aware bot: share of the army it wants in the front line
    keepHeroClass: 2, // class-aware bot: keeps a unit of its heroes' classes over one up to twice as strong
  },

  // ---- Targets (Brian's). npm run sim says pass / fail for each in BALANCE.md. ----
  targets: {
    greedyClear: { min: 20, max: 35 }, // % of runs the greedy bot clears
    classAwareLead: { min: 10 }, // points more than greedy
    heroEventsPerRound: { min: 0.7, max: 1.3 },
    heroBuildLead: { min: 10 }, // points: army built around its heroes vs an equal-power army that ignores them
    evenFight: { min: 25, max: 75 }, // % an army wins against one of about the same power
    mixedBeatsMono: true, // a one-class army wins less often than a mixed front + back army
    round8FourKindPlus: { max: 25 }, // % of round-8 hands that are four of a kind or better
    earlyLegendary: { min: 5, max: 15 }, // % of runs with a Legendary born in rounds 1-3
    round1RarePlus: { max: 20 }, // % of round-1 births that are Rare or better (Brian: earn rarity)
    powerPredicts: { min: 70 }, // % of fights the side with more combat power wins (lower than before: fights are a slope now)
    fightSeconds: { min: 15, max: 25 },
    runMinutes: { min: 15, max: 25 },
  },
  // Time a person takes (for the run-length estimate only). *(my call)*
  pace: { thinkPerHand: 9, thinkPerDiscard: 4, preFight: 3, postFight: 4, keep: 6, relic: 6 },

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
  simRuns: 300, // runs per bot in npm run sim
};
