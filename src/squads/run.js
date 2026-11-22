// A whole run: pick 2 heroes, then 8 rounds. Each round posts 3 bounties, then 6 hands ->
// 6 new units -> the fight. Lose a fight and the run is over; beat the round-8 boss to win.
// After a win: keep 1 of the round's 6 units (the other 5 become deck cards), then the shop
// (rites, doctrines, hero talents, relics, bought with gold). Pure and deterministic; the
// screen and the bots drive it with the same actions:
//   { type: 'heroes', picks }  round actions ('play' / 'discard' / 'choose')  { type: 'resolve' }
//   { type: 'keep', id }  { type: 'buy', slot }  { type: 'rite', picks: [card ids] }
//   { type: 'reroll' }  { type: 'leave' }
import { createRound, act as roundAct, standardDeck, makeRng, shuffle } from './sim.js';
import { stepFight } from './fight.js';
import { CLASS_OF, SUITS, RARITIES } from './data.js';

// Which deck card a returning unit replaces. Each rule returns an index into deck.
export const RETURN_RULES = {
  lowest: (deck, unit, taken) => pickLowest(deck, taken, () => true),
  lowestSameSuit: (deck, unit, taken) => pickLowest(deck, taken, (c) => c.suit === unit.suit),
  source: (deck, unit, taken) => {
    const i = deck.findIndex((c, k) => c.id === unit.source && !taken.has(k));
    return i >= 0 ? i : pickLowest(deck, taken, (c) => c.suit === unit.suit);
  },
};

function pickLowest(deck, taken, ok) {
  let best = -1;
  deck.forEach((c, i) => {
    if (taken.has(i) || !ok(c)) return;
    const b = deck[best];
    if (best < 0 || c.rank < b.rank || (c.rank === b.rank && c.bonus < b.bonus)) best = i;
  });
  if (best < 0) return pickLowest(deck, taken, () => true);
  return best;
}

// Returning units become plain cards (suit, number, rarity chips); traits stay behind.
export function returnUnits(data, deck, units, rule, roundNo) {
  const out = deck.slice();
  const taken = new Set();
  for (const u of units) {
    const i = RETURN_RULES[rule](out, u, taken);
    taken.add(i);
    out[i] = { id: `r${roundNo}${u.id}`, rank: u.rank, suit: u.suit, bonus: data.birth.returnChips[u.rarity], rarity: u.rarity };
  }
  return out;
}

const roundSeed = (seed, r) => (seed * 1000003 + r * 7717) >>> 0;
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export function createRun(data, seed, opts = {}) {
  const run = {
    data, seed, rng: makeRng((seed ^ 0x9e3779b9) >>> 0), rule: opts.rule ?? data.returnRule, top: opts.top ?? [],
    heroes: null, heroLevels: {}, relics: (opts.relics ?? []).slice(), talents: [], doctrines: {}, kept: [], deck: standardDeck(),
    gold: opts.gold ?? 0, roundIndex: 0, round: null, phase: 'heroes', bounties: [], shop: null, rite: null,
    lastFight: null, lastPay: null, history: [], log: [], won: false, bought: [],
  };
  if (opts.heroes) runAct(run, { type: 'heroes', picks: opts.heroes });
  return run;
}

// ---- Bounties ----
function postBounties(run) {
  const { data } = run;
  const B = data.bounties;
  const keys = Object.keys(B.pool);
  const heroSuits = run.heroes.map((h) => Object.keys(CLASS_OF).find((s) => CLASS_OF[s] === data.heroes[h].cls));
  const out = [];
  const pool = keys.slice();
  while (out.length < B.offered && pool.length) {
    const key = pool.splice(Math.floor(run.rng() * pool.length), 1)[0];
    const b = { key, gold: Math.round(B.pool[key].gold * (1 + B.perRound * run.roundIndex)), done: false };
    if (key === 'twoSuit') {
      const off = SUITS.filter((s) => !heroSuits.includes(s));
      b.suit = run.rng() < B.offSuitLean ? pick(run.rng, off) : pick(run.rng, SUITS);
    }
    out.push(b);
  }
  run.bounties = out;
}

export function bountyText(data, b) {
  const t = data.bounties.pool[b.key].text;
  return b.suit ? t.replace('{suit}', { S: 'Spade', H: 'Heart', C: 'Club', D: 'Diamond' }[b.suit]) : t;
}

// Is a bounty met by this round so far (fight = the finished fight, or null mid-round)?
export function bountyMet(data, b, st, fight) {
  const births = st.log.filter((l) => l.type === 'birth');
  const plays = st.log.filter((l) => l.type === 'play');
  const classes = new Set(births.map((l) => l.unit.cls));
  const hands = births.map((l) => l.hand);
  const BIG = ['fullHouse', 'fourKind', 'straightFlush', 'fiveKind', 'flushHouse', 'flushFive'];
  switch (b.key) {
    case 'straight': return hands.some((h) => h === 'straight' || h === 'straightFlush');
    case 'flush': return hands.some((h) => ['flush', 'straightFlush', 'flushHouse', 'flushFive'].includes(h));
    case 'fullHouse': return hands.some((h) => BIG.includes(h));
    case 'twoSuit': return births.filter((l) => l.unit.suit === b.suit).length >= 2;
    case 'threeClasses': return classes.size >= 3;
    case 'fourClasses': return classes.size >= 4;
    case 'lowHand': return plays.some((p) => (p.hand === 'pair' || p.hand === 'highCard') && p.score >= 300);
    case 'thrifty': return st.phase === 'fight' && st.discardsLeft >= 2;
    case 'face': return births.some((l) => l.unit.rank >= data.birth.faceFrom);
    case 'rare': return births.some((l) => l.unit.rarity >= 2);
    case 'heroes': return !!fight?.result && fight.result === 'win' && fight.units.filter((u) => u.hero && u.side === 'p').every((u) => u.alive);
    case 'standing': {
      if (!fight?.result || fight.result !== 'win') return false;
      const mine = fight.units.filter((u) => u.side === 'p');
      return mine.filter((u) => u.alive).length * 2 >= mine.length;
    }
    default: return false;
  }
}

function startRound(run) {
  run.round = createRound(run.data, roundSeed(run.seed, run.roundIndex), {
    deck: run.deck, roundIndex: run.roundIndex, heroes: run.heroes, kept: run.kept, relics: run.relics,
    talents: run.talents, doctrines: run.doctrines, heroLevels: run.heroLevels, top: run.roundIndex === 0 ? run.top : [],
  });
  postBounties(run);
  run.phase = 'round';
}

// ---- The shop ----
function stockShop(run) {
  const { data } = run;
  const S = data.shop;
  const rng = run.rng;
  const take = (list, n) => { const l = list.slice(); const out = []; while (out.length < n && l.length) out.push(l.splice(Math.floor(rng() * l.length), 1)[0]); return out; };
  const items = [];
  for (const k of take(Object.keys(data.rites), S.rites)) items.push({ shelf: 'rite', id: k, price: S.price.rite });
  for (const k of take(Object.keys(data.traitOf).filter((h) => h !== 'highCard' && !['fiveKind', 'flushHouse', 'flushFive'].includes(h)), S.doctrines)) items.push({ shelf: 'doctrine', id: k, price: S.price.doctrine });
  for (const h of run.heroes) {
    const free = Object.keys(data.talents).filter((k) => data.talents[k].hero === h && !run.talents.includes(k));
    for (const k of take(free, S.talentsPerHero)) items.push({ shelf: 'talent', id: k, price: S.price.talent });
  }
  const freeRelics = Object.keys(data.relics).filter((k) => !run.relics.includes(k));
  const heroCls = run.heroes.map((h) => data.heroes[h].cls);
  const match = take(freeRelics.filter((k) => heroCls.includes(data.relics[k].cls)), 1);
  const relics = [...match, ...take(freeRelics.filter((k) => !match.includes(k)), S.relics - match.length)];
  for (const k of shuffle(rng, relics)) items.push({ shelf: 'relic', id: k, price: S.price.relic });
  return items.map((it, slot) => ({ ...it, slot, sold: false }));
}

function openShop(run) {
  run.gold += run.data.gold.beforeShop;
  run.shop = { items: stockShop(run), rerolls: 0, rerollPrice: run.data.shop.reroll };
  run.phase = 'shop';
}

// Deal 8 deck cards for a rite (the player chooses among these only).
function dealRite(run, key) {
  const deal = shuffle(run.rng, run.deck).slice(0, run.data.shop.riteDeal).map((c) => c.id);
  run.rite = { key, deal };
  run.phase = 'rite';
}

function applyRite(run, picks) {
  const { data } = run;
  const r = data.rites[run.rite.key];
  const deal = new Set(run.rite.deal);
  if (picks.some((id) => !deal.has(id)) || new Set(picks).size !== picks.length) throw new Error('rite picks must be distinct cards from the deal');
  if (picks.length > r.max) throw new Error(`${r.name}: at most ${r.max} cards`);
  const card = (id) => run.deck.find((c) => c.id === id);
  if (r.kind === 'convert') for (const id of picks) card(id).suit = r.suit;
  else if (r.kind === 'cull') {
    const room = Math.max(0, run.deck.length - data.shop.minDeck);
    const cut = new Set(picks.slice(0, room));
    run.deck = run.deck.filter((c) => !cut.has(c.id));
  } else if (r.kind === 'echo') {
    const src = card(picks[0]);
    for (const id of picks.slice(1)) Object.assign(card(id), { rank: src.rank, suit: src.suit, bonus: src.bonus, rarity: src.rarity });
  } else if (r.kind === 'crown') for (const id of picks) { const c = card(id); if (c.rank < data.birth.faceFrom) c.rank = 11 + Math.floor(run.rng() * 4); }
  else if (r.kind === 'gild') for (const id of picks) { const c = card(id); c.rarity = Math.min(RARITIES.length - 1, c.rarity == null ? 0 : c.rarity + 1); c.bonus = data.birth.returnChips[c.rarity]; }
  run.rite = null;
  run.phase = 'shop';
}

function nextRound(run) {
  run.roundIndex++;
  if (run.roundIndex >= run.data.run.rounds) { run.phase = 'over'; return; }
  startRound(run);
}

export function runAct(run, a) {
  const { data } = run;
  run.log.push(a.type === 'play' || a.type === 'discard' ? { type: a.type, n: a.ids.length } : a);
  if (a.type === 'heroes') {
    if (run.phase !== 'heroes') throw new Error('heroes already picked');
    if (a.picks.length !== 2 || a.picks[0] === a.picks[1] || !a.picks.every((k) => data.heroes[k])) throw new Error(`pick two different heroes: ${a.picks}`);
    run.heroes = a.picks.slice();
    for (const h of run.heroes) run.heroLevels[h] = 1;
    startRound(run);
  } else if (a.type === 'play' || a.type === 'discard' || a.type === 'choose') {
    if (run.phase !== 'round') throw new Error(`no round to play (phase ${run.phase})`);
    roundAct(run.round, a);
  } else if (a.type === 'resolve') {
    const st = run.round;
    if (run.phase !== 'round' || st.phase !== 'fight') throw new Error('no fight to resolve');
    const f = st.fight;
    while (!f.result) stepFight(data, f);
    // A hero that was swapped out joins the deck as a Legendary Ace of its suit.
    const SUIT = { knight: 'S', priestess: 'H', witch: 'C', rogue: 'D' };
    for (const [k, old] of st.retired.entries()) {
      const i = pickLowest(run.deck, new Set(), () => true);
      run.deck = run.deck.slice();
      run.deck[i] = { id: `hero-${old}-${run.roundIndex}-${k}`, rank: 14, suit: SUIT[data.heroes[old].cls], bonus: data.birth.returnChips[4], rarity: 4 };
    }
    const last = run.roundIndex === data.run.rounds - 1;
    const won = f.result === 'win';
    if (last && won) run.won = true;
    // Gold: the win, unused discards, bounties met, Blood Money.
    const pay = { win: won ? data.gold.win : 0, discards: won ? st.discardsLeft * data.gold.perDiscard : 0, bounties: [], kills: won ? f.gold : 0 };
    for (const b of run.bounties) if (won && bountyMet(data, b, st, f)) { b.done = true; pay.bounties.push({ key: b.key, gold: b.gold }); }
    pay.total = pay.win + pay.discards + pay.kills + pay.bounties.reduce((s, b) => s + b.gold, 0);
    run.gold += pay.total;
    run.lastPay = pay;
    run.lastFight = { result: f.result, time: f.time };
    run.history.push({ heroEvents: st.log.filter((l) => l.type === 'hero').length, heroes: run.heroes.slice(), round: run.roundIndex + 1, result: f.result, time: f.time, timeout: f.events.at(-1).timeout, hands: st.log.filter((l) => l.type === 'play').map((l) => l.hand), scores: st.log.filter((l) => l.type === 'play').map((l) => l.score), rarities: st.army.map((u) => u.rarity), units: st.army.slice(), kept: run.kept.slice(), relics: run.relics.slice(), talents: run.talents.slice(), doctrines: { ...run.doctrines }, discards: st.log.filter((l) => l.type === 'discard').length, fight: f, pay, bountiesMet: pay.bounties.length, gold: run.gold });
    run.phase = !won || last ? 'over' : 'keep';
  } else if (a.type === 'keep') {
    if (run.phase !== 'keep') throw new Error('nothing to keep');
    const st = run.round;
    const unit = st.army.find((u) => u.id === a.id);
    if (!unit) throw new Error(`not one of this round's units: ${a.id}`);
    run.kept.push({ ...unit, kept: true });
    run.history.at(-1).keptNow = unit;
    run.deck = returnUnits(data, run.deck, st.army.filter((u) => u !== unit), run.rule, run.roundIndex + 1);
    openShop(run);
  } else if (a.type === 'buy') {
    if (run.phase !== 'shop') throw new Error('the shop is closed');
    const it = run.shop.items[a.slot];
    if (!it || it.sold) throw new Error('nothing in that slot');
    if (run.gold < it.price) throw new Error('not enough gold');
    run.gold -= it.price;
    it.sold = true;
    run.bought.push({ round: run.roundIndex + 1, shelf: it.shelf, id: it.id });
    if (it.shelf === 'relic') run.relics.push(it.id);
    else if (it.shelf === 'talent') run.talents.push(it.id);
    else if (it.shelf === 'doctrine') run.doctrines[it.id] = (run.doctrines[it.id] ?? 1) + 1;
    else if (it.shelf === 'rite') dealRite(run, it.id);
  } else if (a.type === 'rite') {
    if (run.phase !== 'rite') throw new Error('no rite in progress');
    applyRite(run, a.picks);
  } else if (a.type === 'reroll') {
    if (run.phase !== 'shop' || run.gold < run.shop.rerollPrice) throw new Error('cannot reroll');
    run.gold -= run.shop.rerollPrice;
    run.shop.rerolls++;
    run.shop.rerollPrice += data.shop.rerollStep;
    run.shop.items = stockShop(run);
  } else if (a.type === 'leave') {
    if (run.phase !== 'shop') throw new Error('the shop is closed');
    run.shop = null;
    nextRound(run);
  } else throw new Error(`unknown run action ${a.type}`);
  return run;
}

// Play a whole run with a bot (a function run -> action). Returns the run with its history.
export function runRun(data, seed, bot, rule = data.returnRule, opts = {}) {
  const run = createRun(data, seed, { rule, ...opts });
  for (let guard = 0; run.phase !== 'over' && guard < 3000; guard++) runAct(run, bot(run));
  return run;
}
