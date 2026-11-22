// Bots for npm run sim and the check. Each returns the next action for a round state.
// greedy: always plays the highest-scoring hand. classAware: also plays for the classes its
// army needs. Both discard the same way.
import { CLASS_OF } from './data.js';
import { bestPlay } from './poker.js';
import { classOdds } from './sim.js';

function discardOrPlay(st, best) {
  const { data } = st;
  if (best.ev.score < data.bots.discardBelow && st.discardsLeft > 0) {
    const keep = new Set(best.ev.scoring.map((c) => c.id));
    const toss = st.hand.filter((c) => !keep.has(c.id)).sort((a, b) => a.rank - b.rank).slice(0, data.round.maxPlay);
    if (toss.length) return { type: 'discard', ids: toss.map((c) => c.id) };
  }
  return { type: 'play', ids: best.cards.map((c) => c.id) };
}

function counts(st) {
  const have = { knight: 0, priestess: 0, witch: 0, rogue: 0 };
  for (const u of st.army) have[u.cls]++;
  return have;
}

export function greedy(st) {
  if (st.phase !== 'play') return null;
  return discardOrPlay(st, bestPlay(st.data, st.hand, st.data.round.maxPlay));
}

export function classAware(st) {
  const { data } = st;
  if (st.phase !== 'play') return null;
  const have = counts(st);
  const want = data.bots.want;
  const need = {};
  for (const [cls, n] of Object.entries(want)) need[cls] = Math.max(0, n - have[cls]) / n;
  const value = (ev) => {
    const odds = classOdds(ev.scoring);
    let n = 0;
    for (const [suit, p] of Object.entries(odds)) n += p * need[CLASS_OF[suit]];
    return ev.score * (1 + data.bots.classWeight * n);
  };
  return discardOrPlay(st, bestPlay(data, st.hand, data.round.maxPlay, value));
}

export const BOTS = { greedy, classAware };
