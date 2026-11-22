// Bots for npm run sim and the check. Each returns the next action for a round state.
// greedy: always plays the highest-scoring hand. classAware: also plays for the classes its
// squads need, and puts each unit where its class helps most. Both discard the same way.
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
  for (const sq of st.squads) for (const u of sq) have[u.cls]++;
  return have;
}

export function greedy(st) {
  if (st.phase === 'assign') return { type: 'assign', squad: st.squads[0].length <= st.squads[1].length ? 0 : 1 };
  if (st.phase !== 'play') return null;
  return discardOrPlay(st, bestPlay(st.data, st.hand, st.data.round.maxPlay));
}

export function classAware(st) {
  const { data } = st;
  const size = data.round.squadSize;
  if (st.phase === 'assign') {
    const u = st.pending;
    const open = [0, 1].filter((s) => st.squads[s].length < size);
    const rowOf = (c) => data.classes[c].row;
    const score = (s) => {
      const sq = st.squads[s];
      let v = 0;
      if (data.heroes[st.heroes[s]].cls === u.cls) v += 2; // the hero's aura is stronger on its own class
      if (rowOf(u.cls) === 'front' && !sq.some((x) => rowOf(x.cls) === 'front')) v += 3; // every squad wants a front line
      if (sq.some((x) => x.cls === u.cls)) v -= 1; // spread classes out
      return v - sq.length * 0.1;
    };
    return { type: 'assign', squad: open.sort((a, b) => score(b) - score(a) || a - b)[0] };
  }
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
