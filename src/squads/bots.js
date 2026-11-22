// Bots for npm run sim and the check. A bot is a function run -> next action.
// greedy: always plays the highest-scoring hand, keeps the strongest unit, takes the first relic.
// classAware: also plays for the classes its army needs (its heroes' classes, plus a front
// line), keeps the unit that fits its heroes, and takes the relic that matches a hero.
// heroBuild / offHero (sim experiments): classAware aiming at, or away from, its heroes' classes.
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

const FRONT = new Set(['knight', 'rogue']);

// How much the army wants each class right now (0..1).
function needs(run, favour) {
  const { data } = run;
  const st = run.round;
  const all = [...st.kept, ...st.army];
  const n = all.length + 1;
  const have = { knight: 0, priestess: 0, witch: 0, rogue: 0 };
  for (const u of all) have[u.cls]++;
  const front = have.knight + have.rogue;
  const need = {};
  for (const cls of Object.keys(have)) {
    let v = favour.includes(cls) ? data.bots.heroClassShare : (1 - data.bots.heroClassShare) / 2;
    if (FRONT.has(cls) && front / n < data.bots.frontShare) v += 0.5;
    if (!FRONT.has(cls) && front / n > 0.7) v += 0.3;
    need[cls] = v;
  }
  return need;
}

function makeBot({ classes, favour }) {
  return (run) => {
    const { data } = run;
    if (run.phase === 'heroes') return { type: 'heroes', picks: data.startHeroes.slice() };
    const heroCls = run.heroes.map((h) => data.heroes[h].cls);
    const fav = favour === 'heroes' ? heroCls : favour === 'off' ? Object.keys(data.classes).filter((c) => !heroCls.includes(c)) : [];
    if (run.phase === 'keep') {
      const units = run.round.army;
      const score = (u) => u.power * (classes && fav.includes(u.cls) ? data.bots.keepHeroClass : 1) + (u.bonus ? 0.2 : 0);
      return { type: 'keep', id: units.slice().sort((a, b) => score(b) - score(a))[0].id };
    }
    if (run.phase === 'relic') {
      const pick = classes ? run.offers.find((k) => fav.includes(data.relics[k].cls)) ?? run.offers[0] : run.offers[0];
      return { type: 'relic', id: pick };
    }
    const st = run.round;
    if (st.phase === 'fight') return { type: 'resolve' };
    if (st.phase === 'choose') {
      const ch = st.choice;
      if (ch.kind === 'card' && classes) return { type: 'choose', pick: st.pending.ev.scoring.find((c) => fav.includes(CLASS_OF[c.suit]))?.id ?? ch.options[0] };
      return { type: 'choose', pick: ch.options[0] };
    }
    if (!classes) return discardOrPlay(st, bestPlay(data, st.hand, data.round.maxPlay));
    const need = needs(run, fav);
    const value = (ev) => {
      let v = 0;
      for (const [suit, p] of Object.entries(classOdds(ev.scoring))) v += p * need[CLASS_OF[suit]];
      return ev.score * (1 + data.bots.classWeight * v);
    };
    return discardOrPlay(st, bestPlay(data, st.hand, data.round.maxPlay, value));
  };
}

export const greedy = makeBot({ classes: false, favour: 'none' });
export const classAware = makeBot({ classes: true, favour: 'heroes' });
export const offHero = makeBot({ classes: true, favour: 'off' });
export const BOTS = { greedy, classAware };
