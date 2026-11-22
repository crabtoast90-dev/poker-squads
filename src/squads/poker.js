// The poker scorer: pure. Cards are { id, rank (2..14, Ace 14), suit ('S','H','C','D'), bonus }.
// Score = (hand's base chips + chips of the scoring cards) x hand's base mult. Only scoring cards count.

export const HAND_NAMES = {
  flushFive: 'Flush Five', flushHouse: 'Flush House', fiveKind: 'Five of a Kind', straightFlush: 'Straight Flush',
  fourKind: 'Four of a Kind', fullHouse: 'Full House', flush: 'Flush', straight: 'Straight',
  threeKind: 'Three of a Kind', twoPair: 'Two Pair', pair: 'Pair', highCard: 'High Card',
};
// Hands that count as "four of a kind or better" for the deck-drift target.
export const FOUR_PLUS = new Set(['fourKind', 'straightFlush', 'fiveKind', 'flushHouse', 'flushFive']);

function straightOf(cards) {
  if (cards.length !== 5) return false;
  const r = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b);
  if (r.length !== 5) return false;
  if (r[4] - r[0] === 4) return true;
  return r.join() === '2,3,4,5,14'; // Ace low
}

// Which hand the played cards make, and which of them score.
export function classify(cards) {
  const byRank = new Map();
  for (const c of cards) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  // groups: biggest first, then higher rank
  const groups = [...byRank.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const sizes = groups.map((g) => g.length);
  const flush = cards.length === 5 && cards.every((c) => c.suit === cards[0].suit);
  const straight = straightOf(cards);
  const all = cards;
  if (sizes[0] === 5 && flush) return { hand: 'flushFive', scoring: all };
  if (sizes[0] === 3 && sizes[1] === 2 && flush) return { hand: 'flushHouse', scoring: all };
  if (sizes[0] === 5) return { hand: 'fiveKind', scoring: all };
  if (straight && flush) return { hand: 'straightFlush', scoring: all };
  if (sizes[0] === 4) return { hand: 'fourKind', scoring: groups[0] };
  if (sizes[0] === 3 && sizes[1] === 2) return { hand: 'fullHouse', scoring: all };
  if (flush) return { hand: 'flush', scoring: all };
  if (straight) return { hand: 'straight', scoring: all };
  if (sizes[0] === 3) return { hand: 'threeKind', scoring: groups[0] };
  if (sizes[0] === 2 && sizes[1] === 2) return { hand: 'twoPair', scoring: [...groups[0], ...groups[1]] };
  if (sizes[0] === 2) return { hand: 'pair', scoring: groups[0] };
  return { hand: 'highCard', scoring: [groups[0][0]] };
}

export function cardChips(data, c) {
  return data.poker.rankChips[c.rank] + (c.bonus ?? 0);
}

// levels: doctrine level per hand type (default 1): each level past 1 adds chips and mult.
export function evaluate(data, cards, levels = {}) {
  if (!cards.length) return null;
  const { hand, scoring } = classify(cards);
  const up = (levels[hand] ?? 1) - 1;
  const base = data.poker.hands[hand][0] + up * data.doctrine.chips;
  const mult = data.poker.hands[hand][1] + up * data.doctrine.mult;
  const chips = base + scoring.reduce((s, c) => s + cardChips(data, c), 0);
  return { hand, name: HAND_NAMES[hand], scoring, base, chips, mult, score: chips * mult };
}

// Every way to play 1..max cards from the hand (8 cards: 218 ways).
export function subsets(cards, max) {
  const out = [];
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let bits = 0;
    for (let m = mask; m; m &= m - 1) bits++;
    if (bits > max) continue;
    const pick = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(cards[i]);
    out.push(pick);
  }
  return out;
}

// The best play by a value function (default: raw score). Ties go to playing more cards
// (kickers cycle the deck), then to the earlier subset (deterministic).
export function bestPlay(data, hand, max, value = (ev) => ev.score, levels = {}) {
  let best = null;
  for (const cards of subsets(hand, max)) {
    const ev = evaluate(data, cards, levels);
    const v = value(ev, cards);
    if (!best || v > best.v || (v === best.v && cards.length > best.cards.length)) best = { v, ev, cards };
  }
  return best;
}
