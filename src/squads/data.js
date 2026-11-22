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
  run: { rounds: 8 }, // losing a fight ends the run; beating the round-8 boss wins it (Brian)

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
      mechanic: 'Burn', burn: 3.2, burnFor: 4 }, // damage per second for burnFor s, ignores Armor (x power); Witches spread it to unburnt enemies
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
  // Hero events (Brian's brief): a high-tier hand can birth a hero event instead of a unit; that
  // hand is free. Its class comes from the card the hand copied. Own that hero: it levels up.
  // Don't: swap it in for one of yours (the one leaving becomes a Legendary Ace of its suit in
  // the deck) or level one of yours instead. Chance by the hand's final rarity. *(my call on numbers)*
  heroEvents: { chance: [0, 0.03, 0.07, 0.2, 0.4], perLevel: 0.3, maxPerRound: 2 },

  // ---- Relics: bought in the shop (2 on the shelf; one always matches a hero you run). ----
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

  // ---- Hand traits: the poker hand stamps one trait on the unit (Brian). A doctrine level
  // raises the trait's strength: x (1 + perLevel x (level - 1)). *(my call on the numbers)*
  traits: {
    sturdy: { name: 'Sturdy', text: 'extra health', hp: 0.4 },
    veteran: { name: 'Veteran', text: 'rolls a class bonus (a face card rolls a second)', stats: 0.1 },
    banner: { name: 'Banner', text: 'allies of its class hit harder', dmg: 0.15 },
    swift: { name: 'Swift', text: 'attacks faster', speed: 0.3 },
    devout: { name: 'Devout', text: 'its class mechanic is doubled', mech: 1 },
    guardian: { name: 'Guardian', text: 'shields the whole army at fight start', shield: 14 },
    champion: { name: 'Champion', text: 'a large stat boost', stats: 0.6 },
  },
  traitOf: {
    highCard: [], pair: ['sturdy'], twoPair: ['veteran'], threeKind: ['banner'], straight: ['swift'], flush: ['devout'],
    fullHouse: ['guardian'], fourKind: ['champion'], fiveKind: ['champion'], flushHouse: ['champion'], flushFive: ['champion'],
    straightFlush: ['swift', 'devout'],
  },
  // Doctrines: level up one hand type for the run (+chips, +mult, stronger trait). Stackable.
  doctrine: { chips: 10, mult: 1, traitPerLevel: 0.5 },

  // ---- Gold and bounties ----
  gold: { win: 4, perDiscard: 1, beforeShop: 10 }, // plus bounties; Blood Money pays 1 per Rogue kill; +10 before each shop (Brian)
  // 3 bounties a round; pay x (1 + perRound x round). *(my call on the numbers)*
  bounties: {
    perRound: 0.15, offered: 3, offSuitLean: 0.7,
    pool: {
      straight: { text: 'Birth a unit from a straight', gold: 3 },
      flush: { text: 'Birth a unit from a flush', gold: 3 },
      fullHouse: { text: 'Birth a unit from a full house or better', gold: 5 },
      twoSuit: { text: 'Birth two {suit} units', gold: 3 },
      threeClasses: { text: 'Birth three different classes', gold: 2 },
      fourClasses: { text: 'Birth all four classes this round', gold: 5 },
      lowHand: { text: 'Score 300+ with a pair or a high card', gold: 4 },
      thrifty: { text: 'End the round with 2+ discards unused', gold: 3 },
      face: { text: 'Birth a face-card unit', gold: 2 },
      rare: { text: 'Birth a Rare or better unit', gold: 3 },
      heroes: { text: 'Win the fight with both heroes alive', gold: 3 },
      standing: { text: 'Win the fight with half your army standing', gold: 3 },
    },
  },

  // ---- The shop: after every win, after you keep your unit (Brian). Prices *(my call)*. ----
  shop: { rites: 2, doctrines: 2, relics: 2, talentsPerHero: 1, reroll: 2, rerollStep: 1,
    price: { rite: 7, doctrine: 6, talent: 8, relic: 8 }, riteDeal: 8, minDeck: 30 },
  rites: {
    convertS: { name: 'Rite of Spades', kind: 'convert', suit: 'S', text: 'up to 3 of 8 become Spades', max: 3 },
    convertH: { name: 'Rite of Hearts', kind: 'convert', suit: 'H', text: 'up to 3 of 8 become Hearts', max: 3 },
    convertC: { name: 'Rite of Clubs', kind: 'convert', suit: 'C', text: 'up to 3 of 8 become Clubs', max: 3 },
    convertD: { name: 'Rite of Diamonds', kind: 'convert', suit: 'D', text: 'up to 3 of 8 become Diamonds', max: 3 },
    cull: { name: 'Cull', kind: 'cull', text: 'remove up to 3 of 8 from the deck', max: 3 },
    echo: { name: 'Echo', kind: 'echo', text: 'pick 1 of 8; up to 2 others become copies of it', max: 3 },
    crown: { name: 'Crown', kind: 'crown', text: 'up to 2 of 8 become face cards of their suit', max: 2 },
    gild: { name: 'Gild', kind: 'gild', text: 'up to 3 of 8 go up one rarity (more chips)', max: 3 },
  },
  // Hero talents: 3 per hero; the shop offers 1 per hero you run. Bought once each.
  talents: {
    knightRogues: { hero: 'knight', name: 'Shared Oath', text: 'Rogues count as Knights for her skill' },
    knightRear: { hero: 'knight', name: 'Rear Guard', text: 'her Armor bonus is doubled on back-line allies' },
    knightSpikes: { hero: 'knight', name: 'Spiked Plate', text: 'allies with Armor reflect 20% of hit damage', reflect: 0.2 },
    witchCrit: { hero: 'witch', name: 'Kindled Blades', text: 'burning enemies take triple damage from Rogue crits' },
    witchSmoke: { hero: 'witch', name: 'Choking Smoke', text: 'Burn also slows the target\'s attacks by 25%', slow: 0.25 },
    witchWard: { hero: 'witch', name: 'Warded Flame', text: 'a Witch holding a Shield burns 50% hotter', burn: 0.5 },
    priestSteel: { hero: 'priestess', name: 'Steel Grace', text: 'a Shield on a Knight also adds 40% Armor', armor: 0.4 },
    priestLight: { hero: 'priestess', name: 'Last Light', text: 'a Shield that breaks heals its holder for half its size', heal: 0.5 },
    priestDawn: { hero: 'priestess', name: 'Morning Prayer', text: 'every ally starts the fight with a small Shield', shield: 10 },
    rogueSense: { hero: 'rogue', name: 'Smell of Smoke', text: 'Rogues gain 5% Crit per burning enemy', crit: 0.05 },
    rogueBounty: { hero: 'rogue', name: 'Blood Money', text: 'Rogue kills pay 1 gold' },
    rogueCover: { hero: 'rogue', name: 'Covered Advance', text: 'Rogues take 25% less damage while a Knight stands', cut: 0.25 },
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
    { power: 0.6, lean: 'Shield wall', units: ['warrior', 'warrior', 'warrior', 'warrior', 'caster', 'caster', 'acolyte', 'stalker'] },
    { power: 0.8, lean: 'Stalker raid', units: ['warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'acolyte'] },
    { power: 1.0, lean: 'Caster horde', units: ['brute', 'warrior', 'warrior', 'caster', 'caster', 'caster', 'caster', 'caster', 'acolyte', 'acolyte'] },
    { power: 1.35, lean: 'Iron line', units: ['brute', 'brute', 'warrior', 'warrior', 'warrior', 'warrior', 'caster', 'caster', 'acolyte', 'acolyte', 'stalker'] },
    { power: 1.75, lean: 'Night raid', units: ['brute', 'warrior', 'stalker', 'stalker', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'acolyte', 'acolyte', 'caster'] },
    { power: 2.2, lean: 'Grave choir', units: ['brute', 'warrior', 'warrior', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'acolyte', 'acolyte', 'stalker', 'stalker', 'warrior'] },
    { power: 2.7, lean: 'Bone legion', units: ['brute', 'brute', 'warrior', 'warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'warrior'] },
    { power: 3.2, lean: 'The Bone King', units: ['king', 'brute', 'warrior', 'warrior', 'stalker', 'stalker', 'stalker', 'caster', 'caster', 'caster', 'caster', 'acolyte', 'acolyte', 'acolyte', 'warrior'] },
  ],

  // ---- The fight ----
  fight: {
    tick: 0.1, // seconds per sim step
    damageScale: 1.5, // every hit, Burn, Shield x this: sets fight length
    damagePerRound: 0.1, // ...plus 10% per round, so bigger late armies still finish near 20 s
    enemyPower: 3.3, // every skeleton's power x this (on top of the round's power); set by hand so greedy clears ~30% *(placeholder)*
    maxTime: 60, // still going at 60 s: the side with more health left (by share) wins
    spread: 0.3, // each hit rolls x (1 ± spread): fights are a slope, not a cliff
    rows: { front: 1.6, back: 4.2 }, // distance from the middle line, metres
    slotGap: 1.0, // gap between units in a row
    separation: 0.7, // allies closer than this push apart
    shieldCap: 0.6, // a unit's Shield can't exceed this share of its max health
    armorCap: 0.75, // Armor never takes more than 75% off a hit
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
    purchasesPerShop: { min: 2, max: 3 },
    bountiesPerRound: { min: 1, max: 2 },
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
