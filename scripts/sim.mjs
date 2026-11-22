// npm run sim: play many seeded runs with bots, run fight experiments, and rewrite BALANCE.md
// in plain words against the targets in src/squads/data.js. Quote the headline back.
import { writeFileSync } from 'node:fs';
import { SQUADS, RARITIES } from '../src/squads/data.js';
import { runRun } from '../src/squads/run.js';
import { greedy, classAware, offHero } from '../src/squads/bots.js';
import { FOUR_PLUS, HAND_NAMES } from '../src/squads/poker.js';
import { runFight, createFight } from '../src/squads/fight.js';
import { makeUnit } from '../src/squads/sim.js';
import { sidePowers, expectedGain } from '../src/squads/power.js';
import { subsets, evaluate } from '../src/squads/poker.js';
import { createRound, act } from '../src/squads/sim.js';
import { digest } from '../src/squads/rng.js';

const D = SQUADS;
const T = D.targets;
const N = D.simRuns;
const out = [];
const line = (s = '') => out.push(s);
const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const pct = (x) => `${Math.round(x)}%`;
const PF = (ok) => (ok ? '**PASS**' : '**FAIL**');
const t0 = Date.now();

// ---- Runs ----
const play = (bot) => Array.from({ length: N }, (_, i) => runRun(D, i + 1, bot));
const runs = { greedy: play(greedy), classAware: play(classAware), offHero: play(offHero) };
const clear = (rs) => (100 * rs.filter((r) => r.won).length) / rs.length;
const fights = (rs) => rs.flatMap((r) => r.history);
const g = runs.greedy;
const gClear = clear(g);
const cClear = clear(runs.classAware);
const oClear = clear(runs.offHero);

// Power vs outcome over every fight of every bot.
const calls = Object.values(runs).flatMap((rs) => fights(rs).map((x) => {
  const f = createFight(D, { heroes: D.startHeroes, units: [...x.kept, ...x.units], relics: x.relics, talents: x.talents, doctrines: x.doctrines }, x.round - 1, 0);
  const p = sidePowers(D, f);
  return { ratio: p.mine / p.foes, win: x.result === 'win', round: x.round };
}));
const callRate = (l) => (100 * l.filter((c) => (c.ratio >= 1) === c.win).length) / (l.length || 1);
const even = calls.filter((c) => c.ratio >= 0.92 && c.ratio < 1.08);
const evenWin = (100 * even.filter((c) => c.win).length) / (even.length || 1);

// ---- Fight experiments: same six units (Uncommon 9s; Queens get their first bonus), only classes change ----
const S = { knight: 'S', priestess: 'H', witch: 'C', rogue: 'D' };
function armyOf(classes, face = false) {
  return classes.map((cls, i) => makeUnit(D, { id: `x${i}`, rank: face ? 12 : 9, suit: S[cls] }, 1, i, face ? Object.keys(D.bonuses[cls])[i % 3] : null));
}
function winRate(heroes, classes, round, face = false, n = 200, data = XD) {
  let w = 0;
  for (let s = 1; s <= n; s++) if (runFight(data, { heroes, units: armyOf(classes, face) }, round, s).result === 'win') w++;
  return (100 * w) / n;
}
const EXP_ROUND = 2; // round-3 skeletons (Caster horde)
// Skeleton strength for the experiments: set so a plain mixed army (2 Knights, 1 Rogue,
// 2 Witches, 1 Priestess) under Ortha + Vey wins about half its fights. Every other army is
// then compared at that same strength.
let XD = D;
{
  const REF = ['knight', 'knight', 'rogue', 'witch', 'witch', 'priestess'];
  let lo = 0.2;
  let hi = 4;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const data = { ...D, fight: { ...D.fight, enemyPower: mid } };
    if (winRate(D.startHeroes, REF, EXP_ROUND, false, 80, data) > 50) lo = mid; else hi = mid;
  }
  XD = { ...D, fight: { ...D.fight, enemyPower: (lo + hi) / 2 } };
}
const H = D.startHeroes; // Warden Ortha + Hexmother Vey
const builds = {
  'Built around Ortha + Vey (3 Knights, 3 Witches)': ['knight', 'knight', 'knight', 'witch', 'witch', 'witch'],
  'Ignores them (3 Rogues, 3 Priestesses)': ['rogue', 'rogue', 'rogue', 'priestess', 'priestess', 'priestess'],
};
const buildRates = Object.fromEntries(Object.entries(builds).map(([k, v]) => [k, winRate(H, v, EXP_ROUND)]));
const [builtRate, ignoreRate] = Object.values(buildRates);
const shapes = {
  '6 Knights': Array(6).fill('knight'), '6 Witches': Array(6).fill('witch'), '6 Rogues': Array(6).fill('rogue'), '6 Priestesses': Array(6).fill('priestess'),
  'Mixed: 3 Knights + 3 Witches': ['knight', 'knight', 'knight', 'witch', 'witch', 'witch'],
  'Mixed: 2 Knights, 1 Rogue, 2 Witches, 1 Priestess': ['knight', 'knight', 'rogue', 'witch', 'witch', 'priestess'],
  'Mixed: 2 Rogues, 2 Witches, 2 Priestesses': ['rogue', 'rogue', 'witch', 'witch', 'priestess', 'priestess'],
  'Mixed: 3 Knights + 3 Priestesses': ['knight', 'knight', 'knight', 'priestess', 'priestess', 'priestess'],
};
// Mono vs mixed with heroes that favour nobody in particular: one of each pair, averaged over all 6 hero pairs.
const pairs = [['knight', 'witch'], ['knight', 'priestess'], ['knight', 'rogue'], ['witch', 'priestess'], ['witch', 'rogue'], ['priestess', 'rogue']];
const shapeRates = Object.fromEntries(Object.entries(shapes).map(([k, v]) => [k, avg(pairs.map((p) => winRate(p, v, EXP_ROUND, false, 60)))]));
const monoAvg = avg(Object.entries(shapeRates).filter(([k]) => k.startsWith('6 ')).map(([, v]) => v));
const mixedAvg = avg(Object.entries(shapeRates).filter(([k]) => k.startsWith('Mixed')).map(([, v]) => v)); // every mixed army has a front line (Knights or Rogues) and a back line

// ---- Hand choice: does the top-scoring hand add the most power? ----
const CHOICE_RUNS = 12;
function choiceAgreement(data) {
  let n = 0;
  let same = 0;
  for (let seed = 1; seed <= CHOICE_RUNS; seed++) {
    const run = runRun(data, seed, (r) => {
      const a = classAware(r);
      if (a.type === 'play' && r.round.phase === 'play') {
        const st = r.round;
        const army = { heroes: st.heroes, units: [...st.kept, ...st.army], relics: st.relics, talents: st.talents, doctrines: st.doctrines };
        // Candidates: the 6 best-scoring plays with different scoring cards.
        const seen = new Set();
        const cands = subsets(st.hand, data.round.maxPlay).map((c) => evaluate(data, c, st.doctrines)).sort((x, y) => y.score - x.score).filter((ev) => { const k = ev.scoring.map((c) => c.id).sort().join(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
        const gains = cands.map((ev) => expectedGain(data, army, st.roundIndex, ev).avg);
        const best = gains.indexOf(Math.max(...gains));
        n++;
        if (best === 0) same++;
      }
      return a;
    });
  }
  return { n, rate: (100 * same) / (n || 1) };
}
const noTraits = { ...D, traitOf: Object.fromEntries(Object.keys(D.traitOf).map((k) => [k, []])) };
const nowC = choiceAgreement(D);
const beforeC = choiceAgreement(noTraits);
const choiceSample = { n: nowC.n, now: nowC.rate, before: beforeC.rate };

// ---- Other measures ----
const allF = fights(g);
const r1 = g.flatMap((r) => r.history[0].rarities);
const r1RarePlus = (100 * r1.filter((q) => q >= 2).length) / (r1.length || 1);
const early = (100 * g.filter((r) => r.history.slice(0, 3).some((x) => x.rarities.includes(4))).length) / g.length;
const r8hands = g.flatMap((r) => r.history.filter((x) => x.round === 8).flatMap((x) => x.hands));
const drift = (100 * r8hands.filter((h) => FOUR_PLUS.has(h)).length) / (r8hands.length || 1);
const fightAvg = avg(allF.map((x) => x.time));
const late = allF.filter((x) => x.round === 8);
const lateAvg = avg(late.map((x) => x.time));
const timeouts = allF.filter((x) => x.timeout).length;
const P = D.pace;
const R = D.reveal;
const revealSec = (R.gather + R.count + R.rollBase + R.luck + R.luckResult + R.pick + R.drop + R.settle + R.hop) / 1000;
const roundMin = (x) => (x.hands.length * (P.thinkPerHand + revealSec) + x.discards * P.thinkPerDiscard + P.preFight + x.time + P.postFight + P.keep + (x.result === 'win' ? P.relic : 0)) / 60;
const runMin = avg(g.filter((r) => r.won).map((r) => r.history.reduce((s, x) => s + roundMin(x), 0)));

const heroRate = (rs) => avg(rs.flatMap((r) => r.history.map((x) => x.heroEvents)));
const shopRate = (rs) => rs.reduce((n, r) => n + r.bought.length, 0) / (rs.reduce((n, r) => n + r.history.filter((x) => x.result === 'win' && x.round < D.run.rounds).length, 0) || 1);
const verdicts = [
  ['Greedy bot clears the run', `${T.greedyClear.min}-${T.greedyClear.max}%`, pct(gClear), gClear >= T.greedyClear.min && gClear <= T.greedyClear.max],
  ['Class-aware bot clears more than greedy by', `${T.classAwareLead.min}+ points`, `${cClear - gClear >= 0 ? '+' : ''}${Math.round(cClear - gClear)} points (${pct(cClear)})`, cClear - gClear >= T.classAwareLead.min],
  ['Army built around its heroes vs same-strength army that ignores them (one fight)', `${T.heroBuildLead.min}+ points`, `${Math.round(builtRate)}% vs ${Math.round(ignoreRate)}% (+${Math.round(builtRate - ignoreRate)})`, builtRate - ignoreRate >= T.heroBuildLead.min],
  ['...and over whole runs (bot aiming at its heroes vs away from them)', `${T.heroBuildLead.min}+ points`, `${pct(cClear)} vs ${pct(oClear)} (+${Math.round(cClear - oClear)})`, cClear - oClear >= T.heroBuildLead.min],
  ['One-class army wins less often than a mixed front + back army', 'mono below mixed', `mono ${pct(monoAvg)}, mixed ${pct(mixedAvg)}`, monoAvg < mixedAvg],
  ['Armies of about equal power (within 8%): you win', `${T.evenFight.min}-${T.evenFight.max}%`, `${pct(evenWin)} (${even.length} fights)`, evenWin >= T.evenFight.min && evenWin <= T.evenFight.max],
  ['Combat power calls the winner', `${T.powerPredicts.min}%+`, pct(callRate(calls)), callRate(calls) >= T.powerPredicts.min],
  ['Round-1 births that are Rare or better', `under ${T.round1RarePlus.max}%`, pct(r1RarePlus), r1RarePlus < T.round1RarePlus.max],
  ['Runs with a Legendary born in rounds 1-3', `${T.earlyLegendary.min}-${T.earlyLegendary.max}%`, pct(early), early >= T.earlyLegendary.min && early <= T.earlyLegendary.max],
  ['Round-8 hands that are four of a kind or better', `under ${T.round8FourKindPlus.max}%`, pct(drift), drift < T.round8FourKindPlus.max],
  ['Fight length (all fights)', `${T.fightSeconds.min}-${T.fightSeconds.max} s`, `${fightAvg.toFixed(1)} s`, fightAvg >= T.fightSeconds.min && fightAvg <= T.fightSeconds.max],
  ['Fight length with a late-run army (round 8: 2 heroes + 13 units)', `${T.fightSeconds.min}-${T.fightSeconds.max} s`, `${lateAvg.toFixed(1)} s`, lateAvg >= T.fightSeconds.min && lateAvg <= T.fightSeconds.max],
  ['Run length (estimate, cleared runs)', `${T.runMinutes.min}-${T.runMinutes.max} min`, `${runMin.toFixed(1)} min`, runMin >= T.runMinutes.min && runMin <= T.runMinutes.max],
  ['Highest-scoring hand is also the best play', 'clearly below before', `${pct(choiceSample.now)} (was ${pct(choiceSample.before)})`, choiceSample.now <= choiceSample.before - 10],
  ['Purchases per shop (greedy / class-aware)', `${T.purchasesPerShop.min}-${T.purchasesPerShop.max}`, `${shopRate(g).toFixed(1)} / ${shopRate(runs.classAware).toFixed(1)}`, [g, runs.classAware].every((rs) => shopRate(rs) >= T.purchasesPerShop.min && shopRate(rs) <= T.purchasesPerShop.max)],
  ['Bounties met per round without chasing them (greedy)', `${T.bountiesPerRound.min}-${T.bountiesPerRound.max}`, avg(g.flatMap((r) => r.history.map((x) => x.bountiesMet))).toFixed(2), (() => { const v = avg(g.flatMap((r) => r.history.map((x) => x.bountiesMet))); return v >= T.bountiesPerRound.min && v <= T.bountiesPerRound.max; })()],
  ['Hero events per round (greedy / class-aware)', `${T.heroEventsPerRound.min}-${T.heroEventsPerRound.max}`, `${heroRate(g).toFixed(2)} / ${heroRate(runs.classAware).toFixed(2)}`, heroRate(g) >= T.heroEventsPerRound.min && heroRate(g) <= T.heroEventsPerRound.max],
];
const passed0 = 0;
const passed = verdicts.filter((v) => v[3] === true).length;
const judged = verdicts.filter((v) => v[3] !== null).length;

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC (${((Date.now() - t0) / 1000).toFixed(0)} s). Do not edit by hand. ${N} seeded runs per bot; heroes Warden Ortha + Hexmother Vey; deck return rule "${D.returnRule}".`);
line();
line('A lost fight ends the run. Skeleton strength, the round curve and shop prices were set by hand once (greedy near 25%, 2-3 buys a shop); no further tuning (prototype rule).');
line();
line('## Headline');
line();
line(`${passed} of ${judged} targets pass.`);
line();
line('| target | aim | now | |');
line('|---|---|---|---|');
for (const [what, aim, now, ok] of verdicts) line(`| ${what} | ${aim} | ${now} | ${ok === null ? '-' : PF(ok)} |`);
line();

line(`## Does class matter? (one fight, six Uncommon 9s, 200 fights each; skeletons set to ${XD.fight.enemyPower.toFixed(2)}x so a plain mixed army wins about half)`);
line();
line('| army (heroes Ortha + Vey) | wins |');
line('|---|---|');
for (const [k, v] of Object.entries(buildRates)) line(`| ${k} | ${pct(v)} |`);
line();
line('| army shape (averaged over all six hero pairs) | wins |');
line('|---|---|');
for (const [k, v] of Object.entries(shapeRates)) line(`| ${k} | ${pct(v)} |`);
line();

line('## Combat power: does the number mean anything?');
line();
line(`It calls the winner in ${pct(callRate(calls))} of fights (${pct(callRate(calls.filter((c) => c.round >= 3)))} in rounds 3-8).`);
line();
line('| your power / skeleton power | fights | you win |');
line('|---|---|---|');
for (const [lo, hi] of [[0, 0.7], [0.7, 0.85], [0.85, 0.92], [0.92, 1], [1, 1.08], [1.08, 1.2], [1.2, 1.4], [1.4, 99]]) {
  const b = calls.filter((c) => c.ratio >= lo && c.ratio < hi);
  if (b.length) line(`| ${hi > 50 ? `${lo}+` : `${lo}-${hi}`} | ${b.length} | ${pct((100 * b.filter((c) => c.win).length) / b.length)} |`);
}
line();

line('## The run (greedy bot)');
line();
line('| round | skeletons | reached | won | fight s | timeouts | avg score | Common / Uncommon / Rare / Epic / Legendary born |');
line('|---|---|---|---|---|---|---|---|');
for (let r = 1; r <= D.run.rounds; r++) {
  const rs = allF.filter((x) => x.round === r);
  const rar = RARITIES.map((_, k) => rs.flatMap((x) => x.rarities).filter((q) => q === k).length);
  const tot = rar.reduce((s, x) => s + x, 0) || 1;
  line(`| ${r} | ${D.enemyRounds[r - 1].lean} (${D.enemyRounds[r - 1].units.length}) | ${rs.length} | ${pct((100 * rs.filter((x) => x.result === 'win').length) / (rs.length || 1))} | ${avg(rs.map((x) => x.time)).toFixed(1)} | ${rs.filter((x) => x.timeout).length} | ${avg(rs.flatMap((x) => x.scores)).toFixed(0)} | ${rar.map((x) => pct((100 * x) / tot)).join(' / ')} |`);
}
line();
line(`- Fights that hit the ${D.fight.maxTime} s limit (decided on health left): ${timeouts} of ${allF.length}.`);
for (const [name, rs] of [['greedy', g], ['class-aware', runs.classAware]]) {
  const shops = rs.reduce((n, r) => n + r.history.filter((x) => x.result === 'win' && x.round < D.run.rounds).length, 0);
  line(`- ${name}: ${(rs.reduce((n, r) => n + r.bought.length, 0) / (shops || 1)).toFixed(2)} purchases per shop; ${avg(rs.flatMap((r) => r.history.map((x) => x.bountiesMet))).toFixed(2)} bounties met per round; ${avg(rs.flatMap((r) => r.history.map((x) => x.pay.total))).toFixed(1)} gold earned per round.`);
}
line();

line('## Does a strong early keep decide the run? (greedy bot)');
line();
line('| unit kept after round 1 | runs | cleared |');
line('|---|---|---|');
for (let q = 0; q < RARITIES.length; q++) {
  const rs = g.filter((r) => r.history[0]?.keptNow?.rarity === q);
  if (rs.length) line(`| ${RARITIES[q]} | ${rs.length} | ${pct(clear(rs))} |`);
}
const r1won = g.filter((r) => r.history[0].result === 'win');
const r1lost = g.filter((r) => r.history[0].result === 'lose');
line();
line(`- Won round 1: ${pct(clear(r1won))} clear (${r1won.length} runs). Lost round 1: ${pct(clear(r1lost))} clear (${r1lost.length} runs).`);
line();

line('## Hand choice: is the highest-scoring hand the best play?');
line();
line(`At ${choiceSample.n} hand decisions (class-aware bot, ${CHOICE_RUNS} runs), "best play" = the hand that adds the most combat power to the army, given its class odds, rarity odds and trait. It is also the highest-scoring hand **${pct(choiceSample.now)}** of the time now, against **${pct(choiceSample.before)}** with traits switched off (about how the game played before this pass).`);
line();

line('## The shop: does anything dominate? (class-aware bot)');
line();
line('| item | bought (per run) | runs that bought it clear | runs that did not clear |');
line('|---|---|---|---|');
{
  const ca = runs.classAware;
  const ids = [...new Set(ca.flatMap((r) => r.bought.map((b) => `${b.shelf}:${b.id}`)))];
  const rows = ids.map((k) => {
    const [shelf, id] = k.split(':');
    const has = ca.filter((r) => r.bought.some((b) => b.shelf === shelf && b.id === id));
    const not = ca.filter((r) => !r.bought.some((b) => b.shelf === shelf && b.id === id));
    const name = shelf === 'doctrine' ? `Doctrine: ${HAND_NAMES[id]}` : shelf === 'rite' ? `Rite: ${D.rites[id].name}` : shelf === 'talent' ? `Talent: ${D.talents[id].name}` : `Relic: ${D.relics[id].name}`;
    return [name, ca.reduce((n, r) => n + r.bought.filter((b) => b.shelf === shelf && b.id === id).length, 0) / N, clear(has), clear(not), has.length];
  }).filter((r) => r[4] >= 5).sort((a, b) => b[1] - a[1]);
  for (const [name, per, c1, c0] of rows) line(`| ${name} | ${per.toFixed(2)} | ${pct(c1)} | ${pct(c0)} |`);
}
line();

line('## Who does the work (greedy bot, all fights)');
line();
const share = { hero: 0, knight: 0, priestess: 0, witch: 0, rogue: 0 };
const top = [];
for (const x of allF) {
  const mine = x.fight.units.filter((u) => u.side === 'p');
  const tot = mine.reduce((s, u) => s + u.dealt + u.healed, 0) || 1;
  for (const u of mine) share[u.hero ? 'hero' : u.cls] += (u.dealt + u.healed) / tot;
  top.push(Math.max(...mine.map((u) => (u.dealt + u.healed) / tot)));
}
line(`- Share of damage plus shields: heroes ${pct((100 * share.hero) / allF.length)}, Knights ${pct((100 * share.knight) / allF.length)}, Priestesses ${pct((100 * share.priestess) / allF.length)}, Witches ${pct((100 * share.witch) / allF.length)}, Rogues ${pct((100 * share.rogue) / allF.length)}.`);
line(`- The top unit does ${pct(100 * avg(top))} of its army's work on average.`);
const hand1 = {};
for (const r of g) for (const h of r.history[0].hands) hand1[h] = (hand1[h] ?? 0) + 1;
const tot1 = Object.values(hand1).reduce((s, x) => s + x, 0) || 1;
line(`- Hands played in round 1: ${Object.entries(hand1).sort((a, b) => b[1] - a[1]).map(([h, n]) => `${HAND_NAMES[h]} ${pct((100 * n) / tot1)}`).join(', ')}.`);
const same = digest(runRun(D, 1, greedy).log) === digest(runRun(D, 1, greedy).log);
line(`- Same seed, same run: ${same ? 'yes' : 'NO, the sim is not deterministic'}.`);

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
