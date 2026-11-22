// npm run sim: play many seeded runs headlessly with two bots and three deck-return rules,
// and rewrite BALANCE.md in plain words against the targets in src/squads/data.js.
// Rerun after any tuning change and quote the headline back.
import { writeFileSync } from 'node:fs';
import { SQUADS, RARITIES } from '../src/squads/data.js';
import { runRun } from '../src/squads/run.js';
import { BOTS } from '../src/squads/bots.js';
import { FOUR_PLUS, HAND_NAMES } from '../src/squads/poker.js';
import { createRound, act, roundDigest } from '../src/squads/sim.js';
import { stepFight } from '../src/squads/fight.js';
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

// ---- Play everything ----
const results = {}; // results[rule][bot] = runs
for (const rule of D.returnRules) {
  results[rule] = {};
  for (const [name, bot] of Object.entries(BOTS)) results[rule][name] = Array.from({ length: N }, (_, i) => runRun(D, i + 1, bot, rule));
}
const main = results[D.returnRule];

const clearPct = (runs) => (100 * runs.filter((r) => r.cleared).length) / runs.length;
const round8FourPlus = (runs) => {
  const hands = runs.flatMap((r) => r.rounds.filter((x) => x.round === D.run.rounds).flatMap((x) => x.hands));
  return { pct: hands.length ? (100 * hands.filter((h) => FOUR_PLUS.has(h)).length) / hands.length : NaN, n: hands.length };
};
const earlyLegendary = (runs) => (100 * runs.filter((r) => r.rounds.slice(0, 3).some((x) => x.rarities.includes(4))).length) / runs.length;
const allRounds = (runs) => runs.flatMap((r) => r.rounds);

// Person-time estimate of a round on screen.
const R = D.reveal;
function revealSec(u, tier) {
  const ups = u.rarity - tier;
  return (R.gather + R.count + R.rollBase + R.rollPerTier * ups + R.pick + R.drop + (u.rarity >= 3 ? R.dropHighExtra : 0) + R.settle + R.hop) / 1000;
}
function roundMinutes(x) {
  const P = D.pace;
  const reveals = x.units.reduce((s, u) => s + revealSec(u, 0), 0);
  return (x.handsPlayed * P.thinkPerHand + x.discards * P.thinkPerDiscard + reveals + x.units.length * P.assignClick + P.preFight + x.time + P.postFight) / 60;
}
const runMinutes = (r) => r.rounds.reduce((s, x) => s + roundMinutes(x), 0);

// ---- Measure ----
const g = main.greedy;
const c = main.classAware;
const gClear = clearPct(g);
const cClear = clearPct(c);
const lead = cClear - gClear;
const drift = round8FourPlus(g);
const early = earlyLegendary(g);
const fights = allRounds(g).map((x) => x.time);
const fightAvg = avg(fights);
const cleared = g.filter((r) => r.cleared);
const runMin = avg((cleared.length ? cleared : g).map(runMinutes));
const timeouts = allRounds(g).filter((x) => x.timeout).length;

const verdicts = [
  ['Greedy bot clears the run', `${T.greedyClear.min}-${T.greedyClear.max}%`, pct(gClear), gClear >= T.greedyClear.min && gClear <= T.greedyClear.max],
  ['Class-aware bot clears more than greedy by', `${T.classAwareLead.min}+ points`, `${lead >= 0 ? '+' : ''}${lead.toFixed(0)} points (${pct(cClear)})`, lead >= T.classAwareLead.min],
  ['Hero events per round', `${T.heroEventsPerRound.min}-${T.heroEventsPerRound.max}`, 'not built yet', null],
  [`Round-8 hands that are four of a kind or better (rule "${D.returnRule}")`, `under ${T.round8FourKindPlus.max}%`, pct(drift.pct), drift.pct < T.round8FourKindPlus.max],
  ['Runs with a Legendary born in rounds 1-3', `${T.earlyLegendary.min}-${T.earlyLegendary.max}%`, pct(early), early >= T.earlyLegendary.min && early <= T.earlyLegendary.max],
  ['Fight length', `${T.fightSeconds.min}-${T.fightSeconds.max} s`, `${fightAvg.toFixed(1)} s average`, fightAvg >= T.fightSeconds.min && fightAvg <= T.fightSeconds.max],
  ['Run length (estimate, cleared runs)', `${T.runMinutes.min}-${T.runMinutes.max} min`, `${runMin.toFixed(1)} min`, runMin >= T.runMinutes.min && runMin <= T.runMinutes.max],
];
const passed = verdicts.filter((v) => v[3] === true).length;
const judged = verdicts.filter((v) => v[3] !== null).length;

// ---- Write ----
line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC (${((Date.now() - t0) / 1000).toFixed(0)} s). Do not edit by hand.`);
line();
line('**Numbers are placeholders.** The poker table waits for Brian\'s check of RESEARCH.md, and nothing has been tuned against these targets yet. Hero events and the on-screen run are later lanes; the run here is sim only.');
line();
line('## Headline');
line();
line(`${passed} of ${judged} targets pass (one not built yet). ${N} seeded runs per bot per return rule; return rule in use: "${D.returnRule}".`);
line();
line('| target | aim | now | |');
line('|---|---|---|---|');
for (const [what, aim, now, ok] of verdicts) line(`| ${what} | ${aim} | ${now} | ${ok === null ? '-' : PF(ok)} |`);
line();
if (lead < T.classAwareLead.min) line(`**Class barely matters yet.** Playing for classes clears only ${lead.toFixed(0)} points more than playing for raw score. In this build, rarity (score) decides fights far more than the class mix. You asked to know this.`);
line();

line('## Deck drift: three rules for which card a returning unit replaces');
line();
line('Each round six units come back as cards and replace six deck cards; the deck stays at 52.');
line();
line('| rule | what it replaces | round-8 four of a kind or better | greedy clears | class-aware clears | Legendary in rounds 1-3 |');
line('|---|---|---|---|---|---|');
const RULE_TEXT = {
  lowest: 'the lowest number in the deck, any suit (the brief)',
  lowestSameSuit: 'the lowest number of its own suit (suits stay 13 each)',
  source: 'the exact card it was born from (ranks and suits never change; cards only gain chips)',
};
for (const rule of D.returnRules) {
  const d = round8FourPlus(results[rule].greedy);
  line(`| ${rule}${rule === D.returnRule ? ' (in use)' : ''} | ${RULE_TEXT[rule]} | ${pct(d.pct)} (${d.n} hands) | ${pct(clearPct(results[rule].greedy))} | ${pct(clearPct(results[rule].classAware))} | ${pct(earlyLegendary(results[rule].greedy))} |`);
}
line();
line('Round-by-round share of four of a kind or better (greedy bot):');
line();
line(`| rule | ${Array.from({ length: D.run.rounds }, (_, i) => `R${i + 1}`).join(' | ')} |`);
line(`|---|${'---|'.repeat(D.run.rounds)}`);
for (const rule of D.returnRules) {
  const cells = [];
  for (let r = 1; r <= D.run.rounds; r++) {
    const hands = results[rule].greedy.flatMap((x) => x.rounds.filter((y) => y.round === r).flatMap((y) => y.hands));
    cells.push(hands.length ? pct((100 * hands.filter((h) => FOUR_PLUS.has(h)).length) / hands.length) : '-');
  }
  line(`| ${rule} | ${cells.join(' | ')} |`);
}
line();

line('## The run (greedy bot, rule in use)');
line();
const byRound = (runs) => Array.from({ length: D.run.rounds }, (_, i) => runs.flatMap((r) => r.rounds.filter((x) => x.round === i + 1)));
line('| round | reached | won | fight s | avg score | Common / Uncommon / Rare / Epic / Legendary born |');
line('|---|---|---|---|---|---|');
byRound(g).forEach((rs, i) => {
  const rar = RARITIES.map((_, k) => rs.flatMap((x) => x.rarities).filter((q) => q === k).length);
  const tot = rar.reduce((s, x) => s + x, 0) || 1;
  line(`| ${i + 1}${i === D.run.rounds - 1 ? ' (boss)' : ''} | ${rs.length} | ${pct((100 * rs.filter((x) => x.result === 'win').length) / (rs.length || 1))} | ${avg(rs.map((x) => x.time)).toFixed(1)} | ${avg(rs.flatMap((x) => x.scores)).toFixed(0)} | ${rar.map((x) => pct((100 * x) / tot)).join(' / ')} |`);
});
line();
line(`- Lives left at the end of cleared runs: ${avg(cleared.map((r) => r.lives)).toFixed(2)} on average. Fights that hit the ${D.fight.maxTime} s limit (counted as losses): ${timeouts} of ${allRounds(g).length}.`);
line(`- Fight length: shortest ${Math.min(...fights).toFixed(1)} s, longest ${Math.max(...fights).toFixed(1)} s.`);
const hand1 = {};
const hand8 = {};
for (const r of g) for (const x of r.rounds) for (const h of x.hands) { if (x.round === 1) hand1[h] = (hand1[h] ?? 0) + 1; if (x.round === D.run.rounds) hand8[h] = (hand8[h] ?? 0) + 1; }
const handLine = (m) => { const tot = Object.values(m).reduce((s, x) => s + x, 0) || 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([h, n]) => `${HAND_NAMES[h]} ${pct((100 * n) / tot)}`).join(', '); };
line(`- Hands played in round 1: ${handLine(hand1)}.`);
line(`- Hands played in round 8: ${handLine(hand8)}.`);
line();

line('## Who does the work (greedy bot, all fights)');
line();
const share = { hero: 0, knight: 0, priestess: 0, witch: 0, rogue: 0 };
const topShare = [];
let skills = 0;
let heals = 0;
let nf = 0;
for (const x of allRounds(g)) {
  const f = x.fight;
  nf++;
  const mine = f.units.filter((u) => u.side === 'p');
  const tot = mine.reduce((s, u) => s + u.dealt + u.healed, 0) || 1;
  for (const u of mine) share[u.hero ? 'hero' : u.cls] += (u.dealt + u.healed) / tot;
  topShare.push(Math.max(...mine.map((u) => (u.dealt + u.healed) / tot)));
  skills += f.events.filter((e) => e.type === 'skill').length;
  heals += f.events.filter((e) => e.type === 'heal').length;
}
line(`- Share of damage plus healing: heroes ${pct((100 * share.hero) / nf)}, Knights ${pct((100 * share.knight) / nf)}, Priestesses ${pct((100 * share.priestess) / nf)}, Witches ${pct((100 * share.witch) / nf)}, Rogues ${pct((100 * share.rogue) / nf)}.`);
line(`- The top unit in each fight does ${pct(100 * avg(topShare))} of its side's work on average (8 fighters, so an even split would be 13%).`);
line(`- Hero skills fire ${(skills / nf).toFixed(1)} times a fight (two heroes); Priestess heals ${(heals / nf).toFixed(1)} times a fight.`);
line();

line('## The slice on screen (one round, fresh deck, round-1 skeletons)');
line();
const slice = Array.from({ length: N }, (_, i) => {
  const st = createRound(D, i + 1);
  while (st.phase !== 'fight') act(st, BOTS.greedy(st));
  return st;
});
let sliceWins = 0;
const sliceTimes = [];
for (const st of slice) { const f = st.fight; while (!f.result) stepFight(D, f); if (f.result === 'win') sliceWins++; sliceTimes.push(f.time); }
line(`- Greedy bot wins the slice's fight ${pct((100 * sliceWins) / N)} of the time; fights last ${avg(sliceTimes).toFixed(1)} s.`);
const a = createRound(D, 1);
const b = createRound(D, 1);
while (a.phase !== 'fight') act(a, BOTS.greedy(a));
while (b.phase !== 'fight') act(b, BOTS.greedy(b));
line(`- Same seed, same round: ${roundDigest(a) === roundDigest(b) ? 'yes' : 'NO, the sim is not deterministic'}. Same seed, same run: ${digest(runRun(D, 1, BOTS.greedy).rounds.map((x) => x.scores)) === digest(runRun(D, 1, BOTS.greedy).rounds.map((x) => x.scores)) ? 'yes' : 'NO'}.`);

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
