// A whole run: pick 2 heroes, then 8 rounds. Each round: 6 hands -> 6 new units -> the fight.
// After every fight you keep 1 of the round's 6 units for good; the other 5 become cards in the
// deck. After a won fight you pick 1 of 3 relics. 3 lives; round 8 is the Bone King.
// Pure and deterministic; the screen and the bots drive it with the same actions:
//   { type: 'heroes', picks: [key, key] }  round actions ('play' / 'discard' / 'choose')
//   { type: 'resolve' } (after the fight)  { type: 'keep', id }  { type: 'relic', id }
import { createRound, act as roundAct, standardDeck, makeRng } from './sim.js';
import { stepFight } from './fight.js';

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

export function createRun(data, seed, opts = {}) {
  const run = {
    data, seed, rng: makeRng((seed ^ 0x9e3779b9) >>> 0), rule: opts.rule ?? data.returnRule, top: opts.top ?? [],
    heroes: null, relics: (opts.relics ?? []).slice(), kept: [], deck: standardDeck(), lives: data.run.lives,
    roundIndex: 0, round: null, phase: 'heroes', offers: null, lastFight: null, history: [], log: [], won: false,
  };
  if (opts.heroes) runAct(run, { type: 'heroes', picks: opts.heroes });
  return run;
}

function startRound(run) {
  run.round = createRound(run.data, roundSeed(run.seed, run.roundIndex), {
    deck: run.deck, roundIndex: run.roundIndex, heroes: run.heroes, kept: run.kept, relics: run.relics,
    top: run.roundIndex === 0 ? run.top : [],
  });
  run.phase = 'round';
}

// Relic offers: 3 the run doesn't own yet; one always matches a hero you run.
function offerRelics(run) {
  const { data } = run;
  const free = Object.keys(data.relics).filter((k) => !run.relics.includes(k));
  const heroCls = run.heroes.map((h) => data.heroes[h].cls);
  const matching = free.filter((k) => heroCls.includes(data.relics[k].cls));
  const out = [];
  if (matching.length) out.push(matching[Math.floor(run.rng() * matching.length)]);
  const rest = free.filter((k) => !out.includes(k));
  while (out.length < 3 && rest.length) out.push(rest.splice(Math.floor(run.rng() * rest.length), 1)[0]);
  // Shuffle so the matching relic isn't always in the same spot.
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(run.rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function nextRound(run) {
  run.roundIndex++;
  if (run.roundIndex >= run.data.run.rounds || run.lives <= 0) { run.phase = 'over'; return; }
  startRound(run);
}

export function runAct(run, a) {
  const { data } = run;
  run.log.push(a.type === 'play' || a.type === 'discard' ? { type: a.type, n: a.ids.length } : a);
  if (a.type === 'heroes') {
    if (run.phase !== 'heroes') throw new Error('heroes already picked');
    if (a.picks.length !== 2 || a.picks[0] === a.picks[1] || !a.picks.every((k) => data.heroes[k])) throw new Error(`pick two different heroes: ${a.picks}`);
    run.heroes = a.picks.slice();
    startRound(run);
  } else if (a.type === 'play' || a.type === 'discard' || a.type === 'choose') {
    if (run.phase !== 'round') throw new Error(`no round to play (phase ${run.phase})`);
    roundAct(run.round, a);
  } else if (a.type === 'resolve') {
    const st = run.round;
    if (run.phase !== 'round' || st.phase !== 'fight') throw new Error('no fight to resolve');
    const f = st.fight;
    while (!f.result) stepFight(data, f);
    if (f.result === 'lose') run.lives--;
    const last = run.roundIndex === data.run.rounds - 1;
    if (last && f.result === 'win') run.won = true;
    run.lastFight = { result: f.result, time: f.time };
    run.history.push({ round: run.roundIndex + 1, result: f.result, time: f.time, timeout: f.events.at(-1).timeout, hands: st.log.filter((l) => l.type === 'play').map((l) => l.hand), scores: st.log.filter((l) => l.type === 'play').map((l) => l.score), rarities: st.army.map((u) => u.rarity), units: st.army.slice(), kept: run.kept.slice(), relics: run.relics.slice(), discards: st.log.filter((l) => l.type === 'discard').length, fight: f, lives: run.lives });
    if (last || run.lives <= 0) run.phase = 'over';
    else run.phase = 'keep';
  } else if (a.type === 'keep') {
    if (run.phase !== 'keep') throw new Error('nothing to keep');
    const st = run.round;
    const unit = st.army.find((u) => u.id === a.id);
    if (!unit) throw new Error(`not one of this round's units: ${a.id}`);
    run.kept.push({ ...unit, kept: true });
    run.history.at(-1).keptNow = unit;
    run.deck = returnUnits(data, run.deck, st.army.filter((u) => u !== unit), run.rule, run.roundIndex + 1);
    if (run.lastFight.result === 'win') {
      run.offers = offerRelics(run);
      run.phase = run.offers.length ? 'relic' : 'between';
      if (!run.offers.length) nextRound(run);
    } else nextRound(run);
  } else if (a.type === 'relic') {
    if (run.phase !== 'relic' || !run.offers.includes(a.id)) throw new Error(`not on offer: ${a.id}`);
    run.relics.push(a.id);
    run.offers = null;
    nextRound(run);
  } else throw new Error(`unknown run action ${a.type}`);
  return run;
}

// Play a whole run with a bot (a function run -> action). Returns the run with its history.
export function runRun(data, seed, bot, rule = data.returnRule, opts = {}) {
  const run = createRun(data, seed, { rule, ...opts });
  for (let guard = 0; run.phase !== 'over' && guard < 2000; guard++) runAct(run, bot(run));
  return run;
}
