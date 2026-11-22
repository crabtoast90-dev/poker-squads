// The sim core: deck, birth, and one round (6 hands -> 6 units in one army -> the fight).
// Pure and deterministic: no DOM, no Math.random, no clock. Player input enters as actions
// ({ type: 'play' | 'discard', ids }), so the check and the bots drive the exact same code
// the buttons do.
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
export function rarityOdds(data, score) {
  const thr = data.birth.rarityThresholds;
  let tier = 0;
  while (tier + 1 < thr.length && score >= thr[tier + 1]) tier++;
  const odds = RARITIES.map(() => 0);
  if (tier === RARITIES.length - 1) { odds[tier] = 1; return { tier, frac: 1, odds }; }
  const frac = (score - thr[tier]) / (thr[tier + 1] - thr[tier]);
  const up = Math.min(0.95, data.birth.luckBase + data.birth.upChance * frac);
  const jump = tier + 2 < RARITIES.length ? data.birth.jumpChance * frac : 0;
  odds[tier] = 1 - up - jump;
  odds[tier + 1] = up;
  if (jump) odds[tier + 2] = jump;
  return { tier, frac, odds };
}

export function unitPower(data, rarity, rank) {
  const tp = data.birth.tierPower;
  return tp[rarity] + (tp[rarity + 1] - tp[rarity]) * data.birth.rankSpread * ((rank - 2) / 12);
}

export function makeUnit(data, card, rarity, n) {
  return {
    id: `u${n}`, source: card.id, rank: card.rank, suit: card.suit, cls: CLASS_OF[card.suit], rarity,
    power: +unitPower(data, rarity, card.rank).toFixed(4), ability: card.rank >= data.birth.abilityFrom,
  };
}

// What the player sees before committing a hand: the hand, the score and both sets of odds.
export function preview(data, cards) {
  const ev = evaluate(data, cards);
  if (!ev) return null;
  return { ...ev, classOdds: classOdds(ev.scoring), rarity: rarityOdds(data, ev.score) };
}

// Roll the birth for a scored hand: which scoring card it copies, then the rarity.
export function rollBirth(data, rng, ev, n) {
  const pick = Math.floor(rng() * ev.scoring.length);
  const card = ev.scoring[pick];
  const { tier, odds } = rarityOdds(data, ev.score);
  const r = rng();
  let rarity = tier;
  let acc = 0;
  for (let i = tier; i < odds.length; i++) {
    acc += odds[i];
    if (r < acc) { rarity = i; break; }
    rarity = i;
  }
  return { unit: makeUnit(data, card, rarity, n), pick, roll: r, tier };
}

// ---- One round ----
// opts: { heroes: [key, key], deck: cards (default a fresh 52), roundIndex }
export function createRound(data, seed, opts = {}) {
  const rng = makeRng(seed);
  const deck = (opts.deck ?? standardDeck()).map((c) => ({ ...c }));
  const st = {
    seed, rng, data,
    roundIndex: opts.roundIndex ?? 0,
    heroes: opts.heroes ?? data.startHeroes.slice(),
    draw: shuffle(rng, deck), used: [], hand: [],
    handsLeft: data.round.hands, discardsLeft: data.round.discards,
    born: 0, army: [], last: null,
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
  // Keep the order the player chose (it doesn't change the score, but keeps logs readable).
  return ids.map((id) => cards.find((c) => c.id === id));
}


export function act(st, a) {
  const { data } = st;
  if (a.type === 'play') {
    if (st.phase !== 'play' || st.handsLeft <= 0) throw new Error(`can't play in phase ${st.phase}`);
    const cards = take(st, a.ids);
    const ev = evaluate(data, cards);
    st.handsLeft--;
    st.used.push(...cards);
    const b = rollBirth(data, st.rng, ev, ++st.born);
    st.last = { ...ev, scoring: ev.scoring.map((c) => c.id), played: cards.map((c) => c.id), ...b };
    st.log.push({ type: 'play', ids: a.ids, hand: ev.hand, score: ev.score, unit: b.unit });
    refill(st);
    st.army.push(b.unit); // one army: every unit just joins
    if (st.army.length >= data.round.armySize || st.handsLeft <= 0) {
      st.phase = 'fight';
      st.fight = createFight(data, armyForFight(st), st.roundIndex, fightSeed(st));
    }
  } else if (a.type === 'discard') {
    if (st.phase !== 'play' || st.discardsLeft <= 0) throw new Error(`can't discard in phase ${st.phase}`);
    const cards = take(st, a.ids);
    st.discardsLeft--;
    st.used.push(...cards);
    st.log.push({ type: 'discard', ids: a.ids });
    refill(st);
  } else throw new Error(`unknown action ${a.type}`);
  return st;
}

export const armyForFight = (st) => ({ heroes: st.heroes, units: st.army });
export const fightSeed = (st) => (st.seed * 7919 + st.roundIndex * 104729 + 17) >>> 0;

// Fingerprint of the hands and births of a round (the fight has its own).
export const roundDigest = (st) => `${st.log.length} steps ${digest(st.log)}`;
