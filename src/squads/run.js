// A whole run, sim only (the run on screen is a later lane): 8 rounds, 3 lives, and the six
// units of each round return to the deck as cards. Hero events are not built yet.
import { createRound, act, standardDeck } from './sim.js';
import { stepFight } from './fight.js';

// Which deck card a returning unit replaces. Each rule returns an index into deck.
export const RETURN_RULES = {
  // Brian's brief: start with the lowest number (any suit). Ties: smaller bonus, then deck order.
  lowest: (deck, unit, taken) => pickLowest(deck, taken, () => true),
  // The lowest number of the unit's own suit, so suits stay at 13 cards each.
  lowestSameSuit: (deck, unit, taken) => pickLowest(deck, taken, (c) => c.suit === unit.suit),
  // The card the unit was born from: the deck keeps its ranks and suits, cards just get stronger.
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

// Play a whole run with a bot. Returns per-round stats for BALANCE.md.
export function runRun(data, seed, bot, rule = data.returnRule) {
  let deck = standardDeck();
  let lives = data.run.lives;
  const rounds = [];
  let cleared = false;
  for (let r = 0; r < data.run.rounds && lives > 0; r++) {
    const st = createRound(data, (seed * 1000003 + r * 7717) >>> 0, { deck, roundIndex: r });
    let hands = 0;
    let discards = 0;
    while (st.phase !== 'fight') {
      const a = bot(st);
      if (a.type === 'play') hands++;
      if (a.type === 'discard') discards++;
      act(st, a);
    }
    const f = st.fight;
    while (!f.result) stepFight(data, f);
    const plays = st.log.filter((l) => l.type === 'play');
    const units = st.army.slice();
    if (f.result === 'lose') lives--;
    if (r === data.run.rounds - 1 && f.result === 'win') cleared = true;
    rounds.push({ round: r + 1, result: f.result, time: f.time, timeout: f.events.at(-1).timeout, hands: plays.map((p) => p.hand), scores: plays.map((p) => p.score), rarities: units.map((u) => u.rarity), units, discards, handsPlayed: hands, fight: f, lives });
    deck = returnUnits(data, deck, units, rule, r + 1);
  }
  return { seed, cleared, lives, rounds, deck };
}
