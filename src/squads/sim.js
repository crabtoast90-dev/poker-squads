// The sim core: deck, birth, and one round (6 hands -> 6 new units join the army -> the fight).
// Pure and deterministic: no DOM, no Math.random, no clock. Player input enters as actions
// ({ type: 'play' | 'discard', ids }, { type: 'choose', pick }), so the check and the bots drive
// the exact same code the buttons do.
import { SUITS, CLASS_OF, RARITIES } from './data.js';
import { evaluate } from './poker.js';
import { createFight } from './fight.js';
import { makeRng, digest } from './rng.js';

export { makeRng, digest };

// ---- Deck ----
export function standardDeck() {
  const out = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) out.push({ id: `${suit}${rank}`, rank, suit, bonus: 0, rarity: null });
  return out;
}

export function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Birth ----
// Class odds: the unit copies one random scoring card, so each suit's chance is its share.
export function classOdds(scoring) {
  const odds = {};
  for (const c of scoring) odds[c.suit] = (odds[c.suit] ?? 0) + 1 / scoring.length;
  return odds;
}

// Rarity odds: the score sets a guaranteed tier; the luck roll can lift it one tier (a small
// base chance plus more the closer the score is to the next tier) or, rarely, two. Never down.
// luck: extra roll-up chance (the Lucky Coin relic).
export function rarityOdds(data, score, luck = 0) {
  const thr = data.birth.rarityThresholds;
  let tier = 0;
  while (tier + 1 < thr.length && score >= thr[tier + 1]) tier++;
  const odds = RARITIES.map(() => 0);
  if (tier === RARITIES.length - 1) { odds[tier] = 1; return { tier, frac: 1, odds }; }
  const frac = (score - thr[tier]) / (thr[tier + 1] - thr[tier]);
  const up = Math.min(0.95, data.birth.luckBase + luck + data.birth.upChance * frac);
  const jump = tier + 2 < RARITIES.length ? Math.min(0.95 - up, data.birth.jumpChance * frac) : 0;
  odds[tier] = 1 - up - jump;
  odds[tier + 1] = up;
  if (jump) odds[tier + 2] = jump;
  return { tier, frac, odds };
}

export function unitPower(data, rarity, rank) {
  const tp = data.birth.tierPower;
  return tp[rarity] + (tp[rarity + 1] - tp[rarity]) * data.birth.rankSpread * ((rank - 2) / 12);
}

export function makeUnit(data, card, rarity, n, bonus = null, hand = null, bonus2 = null) {
  return {
    id: `u${n}`, source: card.id, rank: card.rank, suit: card.suit, cls: CLASS_OF[card.suit], rarity,
    power: +unitPower(data, rarity, card.rank).toFixed(4), bonus, bonus2, hand, traits: hand ? data.traitOf[hand] : [],
  };
}

const luckOf = (data, relics = []) => (relics.includes('pokerLuck') ? data.relics.pokerLuck.luck : 0);

// What the player sees before committing a hand: the hand, the score and both sets of odds.
export function preview(data, cards, relics = [], levels = {}) {
  const ev = evaluate(data, cards, levels);
  if (!ev) return null;
  return { ...ev, traits: data.traitOf[ev.hand], level: levels[ev.hand] ?? 1, classOdds: classOdds(ev.scoring), rarity: rarityOdds(data, ev.score, luckOf(data, relics)) };
}

// ---- One round ----
// opts: { heroes, deck, roundIndex, kept: [units], relics, talents, doctrines: { hand: level }, top: [card ids drawn first] }
export function createRound(data, seed, opts = {}) {
  const rng = makeRng(seed);
  const deck = (opts.deck ?? standardDeck()).map((c) => ({ ...c }));
  const relics = opts.relics ?? [];
  const st = {
    seed, rng, data,
    roundIndex: opts.roundIndex ?? 0,
    heroes: opts.heroes ?? data.startHeroes.slice(),
    kept: (opts.kept ?? []).slice(), relics, talents: (opts.talents ?? []).slice(), doctrines: { ...(opts.doctrines ?? {}) },
    heroLevels: opts.heroLevels ?? {}, retired: [],
    draw: shuffle(rng, deck), used: [], hand: [],
    handsLeft: data.round.hands,
    discardsLeft: data.round.discards + (relics.includes('pokerDiscard') ? data.relics.pokerDiscard.discards : 0),
    born: 0, army: [], last: null, pending: null, choice: null,
    phase: 'play', fight: null, log: [],
  };
  // ?deck=S14,H14 (test hook): put these cards on top of the draw pile, drawn first.
  for (const id of [...(opts.top ?? [])].reverse()) {
    const i = st.draw.findIndex((c) => c.id === id);
    if (i >= 0) st.draw.push(...st.draw.splice(i, 1));
  }
  refill(st);
  return st;
}

function refill(st) {
  while (st.hand.length < st.data.round.handSize) {
    if (!st.draw.length) {
      if (!st.used.length) break;
      st.draw = shuffle(st.rng, st.used);
      st.used = [];
      st.log.push({ type: 'reshuffle', size: st.draw.length });
    }
    st.hand.push(st.draw.pop());
  }
}

function take(st, ids) {
  const set = new Set(ids);
  if (!ids.length || set.size !== ids.length || ids.length > st.data.round.maxPlay) throw new Error(`bad card list ${ids}`);
  const cards = st.hand.filter((c) => set.has(c.id));
  if (cards.length !== ids.length) throw new Error(`cards not in hand: ${ids}`);
  st.hand = st.hand.filter((c) => !set.has(c.id));
  return ids.map((id) => cards.find((c) => c.id === id));
}

// The birth, step by step; it pauses when a relic gives the player a choice.
// Steps: card (which scoring card it copies) -> rarity (the luck roll) -> bonus (face cards).
function continueBirth(st) {
  const { data } = st;
  const b = st.pending;
  if (!b.card) {
    const suits = new Set(b.ev.scoring.map((c) => c.suit));
    if (st.relics.includes('pokerPair') && b.ev.hand === 'pair' && suits.size > 1 && !b.cardChosen) {
      st.choice = { kind: 'card', options: b.ev.scoring.map((c) => c.id) };
      st.phase = 'choose';
      return;
    }
    b.pick = Math.floor(st.rng() * b.ev.scoring.length);
    b.card = b.ev.scoring[b.pick];
  }
  if (b.rarity == null) {
    const { tier, odds } = rarityOdds(data, b.ev.score, luckOf(data, st.relics));
    const r = st.rng();
    let rarity = tier;
    let acc = 0;
    for (let i = tier; i < odds.length; i++) {
      acc += odds[i];
      rarity = i;
      if (r < acc) break;
    }
    Object.assign(b, { tier, roll: r, rarity });
  }
  if (b.bonus === undefined) {
    if (b.card.rank >= data.birth.faceFrom) {
      const pool = Object.keys(data.bonuses[CLASS_OF[b.card.suit]]);
      const first = pool[Math.floor(st.rng() * pool.length)];
      if (st.relics.includes('pokerFace')) {
        const rest = pool.filter((k) => k !== first);
        const second = rest[Math.floor(st.rng() * rest.length)];
        st.choice = { kind: 'bonus', options: [first, second], cls: CLASS_OF[b.card.suit] };
        st.phase = 'choose';
        b.bonus = null;
        b.bonusPending = true;
        return;
      }
      b.bonus = first;
    } else b.bonus = null;
  }
  if (b.bonusPending) return;
  rollVeteran(st);
  if (rollHeroEvent(st)) return;
  finishBirth(st);
}

// Hero event: a strong hand can birth a hero instead of a unit (the hand is given back).
function rollHeroEvent(st) {
  const { data } = st;
  const b = st.pending;
  if (b.heroRolled) return false;
  b.heroRolled = true;
  if (st.rng() >= data.heroEvents.chance[b.rarity]) return false;
  if (st.log.filter((l) => l.type === 'hero').length >= data.heroEvents.maxPerRound) return false;
  const cls = CLASS_OF[b.card.suit];
  st.handsLeft++;
  b.hero = { cls, own: st.heroes.includes(cls) };
  if (b.hero.own) { levelHero(st, cls); finishHeroEvent(st, `level:${st.heroes.indexOf(cls)}`); return true; }
  st.choice = { kind: 'hero', cls, options: ['level:0', 'level:1', 'swap:0', 'swap:1'] };
  st.phase = 'choose';
  // What the reveal shows while the player decides.
  st.last = { ...b.ev, scoring: b.ev.scoring.map((c) => c.id), played: b.played, unit: makeUnit(data, b.card, b.rarity, 'pending'), pick: b.ev.scoring.indexOf(b.card), roll: b.roll, tier: b.tier, chosen: b.chosen ?? null, hero: { ...b.hero, outcome: null } };
  return true;
}
const levelHero = (st, key) => { st.heroLevels[key] = (st.heroLevels[key] ?? 1) + 1; };

function finishHeroEvent(st, outcome) {
  const { data } = st;
  const b = st.pending;
  const [how, i] = outcome.split(':');
  const slot = Number(i);
  if (!b.hero.own) {
    if (how === 'swap') {
      const old = st.heroes[slot];
      st.heroes[slot] = b.hero.cls;
      st.heroLevels[b.hero.cls] = st.heroLevels[b.hero.cls] ?? 1;
      st.retired.push(old);
    } else levelHero(st, st.heroes[slot]);
  }
  const unit = makeUnit(data, b.card, b.rarity, `${st.roundIndex}_h${st.born}`, b.bonus, b.ev.hand, b.bonus2 ?? null);
  b.hero.outcome = outcome;
  b.hero.levels = { ...st.heroLevels };
  b.hero.heroes = st.heroes.slice();
  st.last = { ...b.ev, scoring: b.ev.scoring.map((c) => c.id), played: b.played, unit, pick: b.ev.scoring.indexOf(b.card), roll: b.roll, tier: b.tier, chosen: b.chosen ?? null, hero: b.hero };
  st.log.push({ type: 'hero', hand: b.ev.hand, score: b.ev.score, cls: b.hero.cls, outcome, heroes: st.heroes.slice() });
  st.pending = null;
  st.choice = null;
  st.phase = 'play';
}

// Veteran (two pair): rolls a class bonus; a face card, which already has one, rolls a second.
function rollVeteran(st) {
  const b = st.pending;
  if (!st.data.traitOf[b.ev.hand].includes('veteran') || b.bonus2 !== undefined) return;
  const pool = Object.keys(st.data.bonuses[CLASS_OF[b.card.suit]]).filter((k) => k !== b.bonus);
  const roll = pool[Math.floor(st.rng() * pool.length)];
  if (b.bonus) b.bonus2 = roll;
  else b.bonus = roll;
}

function finishBirth(st) {
  const { data } = st;
  const b = st.pending;
  const unit = makeUnit(data, b.card, b.rarity, `${st.roundIndex}_${++st.born}`, b.bonus, b.ev.hand, b.bonus2 ?? null);
  st.last = { ...b.ev, scoring: b.ev.scoring.map((c) => c.id), played: b.played, unit, pick: b.ev.scoring.indexOf(b.card), roll: b.roll, tier: b.tier, chosen: b.chosen ?? null };
  st.log.push({ type: 'birth', hand: b.ev.hand, score: b.ev.score, unit });
  st.army.push(unit);
  st.pending = null;
  st.choice = null;
  st.phase = 'play';
  if (st.army.length >= data.round.armySize || st.handsLeft <= 0) {
    st.phase = 'fight';
    st.fight = createFight(data, armyForFight(st), st.roundIndex, fightSeed(st));
  }
}

export function act(st, a) {
  const { data } = st;
  if (a.type === 'play') {
    if (st.phase !== 'play' || st.handsLeft <= 0) throw new Error(`can't play in phase ${st.phase}`);
    const cards = take(st, a.ids);
    const ev = evaluate(data, cards, st.doctrines);
    st.handsLeft--;
    st.used.push(...cards);
    st.log.push({ type: 'play', ids: a.ids, hand: ev.hand, score: ev.score });
    refill(st);
    st.pending = { ev, played: cards.map((c) => c.id) };
    continueBirth(st);
  } else if (a.type === 'discard') {
    if (st.phase !== 'play' || st.discardsLeft <= 0) throw new Error(`can't discard in phase ${st.phase}`);
    const cards = take(st, a.ids);
    st.discardsLeft--;
    st.used.push(...cards);
    st.log.push({ type: 'discard', ids: a.ids });
    refill(st);
  } else if (a.type === 'choose') {
    if (st.phase !== 'choose') throw new Error(`can't choose in phase ${st.phase}`);
    const ch = st.choice;
    if (!ch.options.includes(a.pick)) throw new Error(`not an option: ${a.pick}`);
    st.log.push({ type: 'choose', kind: ch.kind, pick: a.pick });
    st.choice = null;
    st.phase = 'play';
    const b = st.pending;
    if (ch.kind === 'hero') { finishHeroEvent(st, a.pick); return st; }
    if (ch.kind === 'card') { b.card = b.ev.scoring.find((c) => c.id === a.pick); b.cardChosen = true; b.chosen = 'card'; }
    else { b.bonus = a.pick; b.bonusPending = false; b.chosen = 'bonus'; }
    if (b.bonusPending) return st;
    if (ch.kind === 'bonus') { rollVeteran(st); if (!rollHeroEvent(st)) finishBirth(st); }
    else continueBirth(st);
  } else throw new Error(`unknown action ${a.type}`);
  return st;
}

export const armyForFight = (st) => ({ heroes: st.heroes, heroLevels: st.heroLevels, units: [...st.kept, ...st.army], relics: st.relics, talents: st.talents, doctrines: st.doctrines });
export const fightSeed = (st) => (st.seed * 7919 + st.roundIndex * 104729 + 17) >>> 0;

// Fingerprint of the hands and births of a round (the fight has its own).
export const roundDigest = (st) => `${st.log.length} steps ${digest(st.log)}`;
