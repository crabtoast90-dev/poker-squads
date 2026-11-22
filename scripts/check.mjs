// npm run check: build, open the site headless, play whole runs through the real buttons on
// the test clock (the page's bot picks each move; the script taps the matching button), save
// screenshots, and fail on console errors, failed requests, a stuck screen, or a run that
// differs from the same run played in Node.
//   npm run check                    build and check this checkout
//   npm run check -- --url=<live>    check a deployed site instead
//   npm run check -- --only=defeat   only the runs whose name contains "defeat"
// Build-speed phase: laptop only (Brian, 2026-11-22). Phone runs come back with polish.
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SQUADS } from '../src/squads/data.js';
import { runRun } from '../src/squads/run.js';
import { greedy } from '../src/squads/bots.js';
import { digest } from '../src/squads/rng.js';
import { applyTune } from '../src/tune.js';

const RUNS = 'check-output';
const KEEP = 5;
const OUT = join(RUNS, new Date().toISOString().replace(/[:.]/g, '-'));
const URL_ARG = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const SEED = 1;
const LOSE_TUNE = 'fight.enemyPower:9';
const RANKUP_TUNE = 'birth.luckBase:0.95';
const ACES = ['S14', 'H14', 'C14', 'D14', 'S13'];

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined;
}

const failures = [];
const log = [];
const summaries = [];
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(RUNS).filter((f) => /^\d{4}-/.test(f)).sort().slice(0, -KEEP)) rmSync(join(RUNS, old), { recursive: true, force: true });

const nodeRun = (data, opts = {}) => {
  const r = runRun(data, SEED, greedy, data.returnRule, opts);
  return { log: digest(r.log), history: digest(r.history.map((h) => [h.result, h.time, h.fight.events.length, digest(h.fight.events)])), won: r.won, rounds: r.history.length };
};
{
  const [a, b] = [nodeRun(SQUADS), nodeRun(SQUADS)];
  if (a.log !== b.log || a.history !== b.history) failures.push('[node] the same run twice differs');
  else summaries.push(`[node] same run twice: identical (${a.rounds} rounds, ${a.won ? 'cleared' : 'lost'})`);
}

let server;
let base = URL_ARG;
if (!base) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port: 4327, strictPort: false }, logLevel: 'warn' });
  base = server.resolvedUrls.local[0];
}
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const shot = (page, name, step) => page.screenshot({ path: join(OUT, `${name}-${step}.png`) });
const sq = async (page) => (await page.evaluate(() => window.__game.state())).squads;
const advance = (page, ms) => page.evaluate((t) => window.__game.advance(t), ms);

async function run(name, script, extra = '') {
  if (ONLY && !name.includes(ONLY)) return;
  const t0 = Date.now();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('console', (msg) => {
    const line = `[${name}] console.${msg.type()}: ${msg.text()}`;
    log.push(line);
    if (msg.type() === 'error') failures.push(line);
  });
  page.on('response', (res) => { if (res.status() >= 400) failures.push(`[${name}] HTTP ${res.status()} ${res.url()}`); });
  page.on('pageerror', (err) => failures.push(`[${name}] page error: ${err.message}`));
  const url = new URL(base);
  url.search = `?test&seed=${SEED}${extra}`;
  await page.goto(url.href.replace('test=', 'test'));
  await page.waitForFunction(() => window.__game?.state().loaded, null, { timeout: 30000 });
  try { await script(page, name); } catch (e) { failures.push(`[${name}] crashed: ${e.message}`); await shot(page, name, 'crash').catch(() => {}); }
  await context.close();
  summaries.push(`[${name}] took ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// Wait on the test clock until the screen is waiting for input.
const WAITING = ['heroes', 'play', 'choose', 'ready', 'fight', 'end', 'keep', 'relic', 'over'];
async function settle(page, name, maxMs = 20000) {
  for (let t = 0; t < maxMs; t += 100) {
    const m = (await sq(page)).mode;
    if (WAITING.includes(m)) return m;
    await advance(page, 100);
  }
  failures.push(`[${name}] stuck in screen ${(await sq(page)).mode}`);
  return null;
}

// One move through the real buttons.
async function tap(page, a) {
  const c = (sel) => page.click(sel);
  if (a.type === 'heroes') { for (const k of a.picks) await c(`.hero-opt[data-hero="${k}"]`); await c('#start-run'); }
  else if (a.type === 'play' || a.type === 'discard') { for (const id of a.ids) await c(`#hand .card[data-id="${id}"]`); await advance(page, 30); await c(a.type === 'play' ? '#play' : '#discard'); }
  else if (a.type === 'choose') await c(`.choice-opt[data-pick="${a.pick}"]`);
  else if (a.type === 'battle') await c('#battle');
  else if (a.type === 'skip') await c('#skip');
  else if (a.type === 'continue') await c('#continue');
  else if (a.type === 'keep') await c(`.keep-opt[data-id="${a.id}"]`);
  else if (a.type === 'relic') await c(`.relic-opt[data-id="${a.id}"]`);
  else throw new Error(`no button for ${a.type}`);
}

// Play the whole run with the page's bot. shots: screenshot the first time each screen appears.
// watchFirstFight: play round 1's fight at 2x instead of skipping it.
async function playRun(page, name, { shots = true, watchFirstFight = false, firstPlay = null } = {}) {
  const seen = new Set();
  let fights = 0;
  for (let i = 0; i < 600; i++) {
    const m = await settle(page, name);
    if (!m || m === 'over') break;
    let a = await page.evaluate(() => window.__game.bot());
    if (!a) { failures.push(`[${name}] no move on screen ${m}`); return; }
    if (firstPlay && a.type === 'play') { a = firstPlay; firstPlay = null; }
    if (shots && !seen.has(m)) { seen.add(m); await shot(page, name, `${String(seen.size).padStart(2, '0')}-${m}`); }
    if (a.type === 'skip' && watchFirstFight && fights === 0) {
      await page.click('#speed');
      let s = await sq(page);
      let shotMid = false;
      for (let k = 0; k < 400 && !s.fight.result; k++) {
        await advance(page, 250);
        s = await sq(page);
        if (!shotMid && s.fight.time > 8) { shotMid = true; if (shots) await shot(page, name, 'fight-mid'); }
      }
      fights++;
      continue;
    }
    if (a.type === 'play' && shots && !seen.has('reveal')) {
      seen.add('reveal');
      for (const id of a.ids) await page.click(`#hand .card[data-id="${id}"]`);
      await advance(page, 30);
      await shot(page, name, 'odds');
      const odds = await page.evaluate(() => ['odds-hand', 'odds-class', 'odds-rarity', 'odds-gain'].map((id) => document.getElementById(id).textContent));
      if (!odds[1] || !odds[2].includes('%') || !/power/.test(odds[3])) failures.push(`[${name}] odds or power gain missing before committing (${odds})`);
      summaries.push(`[${name}] odds before the first hand: ${odds.join(' | ')}`);
      await page.click('#play');
      const R = SQUADS.reveal;
      await advance(page, R.gather + R.count + R.rollBase + R.luck * 0.5);
      await shot(page, name, 'reveal-luck');
      continue;
    }
    if (a.type === 'skip') fights++;
    await tap(page, a);
    if (a.type === 'continue' || a.type === 'skip') await advance(page, SQUADS.reveal.endDelay + 100);
  }
  if (shots) await shot(page, name, 'zz-over');
}

async function compare(page, name, data, opts = {}, want = null) {
  const s = await sq(page);
  const node = nodeRun(data, opts);
  if (s.runPhase !== 'over') failures.push(`[${name}] run did not finish (screen ${s.mode}, run ${s.runPhase})`);
  if (s.runDigest !== node.log || s.historyDigest !== node.history) failures.push(`[${name}] run differs from Node (browser ${s.runDigest} ${s.historyDigest}, Node ${node.log} ${node.history})`);
  else summaries.push(`[${name}] whole run through the buttons matches Node: ${node.rounds} rounds, ${node.won ? 'cleared' : 'lost'}; relics ${s.relics.join(', ') || 'none'}; kept ${s.kept}`);
  if (want !== null && s.won !== want) failures.push(`[${name}] expected ${want ? 'a clear' : 'a loss'}`);
  summaries.push(`## ${name}\n${await page.evaluate(() => window.__game.stateText())}`);
}

async function walk(page, name) {
  await advance(page, 100);
  await shot(page, name, '00-start');
  await page.click('.mode[data-mode="squads"]');
  await advance(page, 200);
  if ((await sq(page)).mode !== 'heroes') failures.push(`[${name}] expected the hero pick`);
  await playRun(page, name, { watchFirstFight: true });
  await compare(page, name, SQUADS);
  await page.click('#new-run');
  await advance(page, 200);
  if ((await sq(page)).mode !== 'heroes') failures.push(`[${name}] New run did not restart`);
}

// Four aces on top: hand one is Four of a Kind, a face card -> a bonus at the reveal.
async function aces(page, name) {
  await advance(page, 200);
  await playRun(page, name, { shots: false, firstPlay: { type: 'play', ids: ACES.slice(0, 4) } });
}

const RELIC_HOOK = 'pokerPair,pokerFace,pokerLuck';
await run('laptop', (page) => walk(page, 'laptop'));
await run('laptop-relic-choices', async (page) => {
  await advance(page, 200);
  await playRun(page, 'laptop-relic-choices', { shots: false });
  const s = await sq(page);
  if (!s.choicesShown) failures.push('[laptop-relic-choices] the Twin Choice / Royal Court choice never appeared');
  else summaries.push(`[laptop-relic-choices] relic choices shown and answered through the buttons: ${s.choicesShown}`);
  await compare(page, 'laptop-relic-choices', SQUADS, { relics: RELIC_HOOK.split(',') });
}, `&mode=squads&relics=${RELIC_HOOK}`);
await run('laptop-rankup', async (page) => {
  await advance(page, 200);
  await playRun(page, 'laptop-rankup', { shots: false });
  await compare(page, 'laptop-rankup', applyTune(SQUADS, RANKUP_TUNE));
}, `&mode=squads&tune=${RANKUP_TUNE}`);
await run('laptop-defeat', async (page) => {
  await advance(page, 200);
  await playRun(page, 'laptop-defeat', { shots: false });
  await shot(page, 'laptop-defeat', 'over');
  await compare(page, 'laptop-defeat', applyTune(SQUADS, LOSE_TUNE), {}, false);
}, `&mode=squads&tune=${LOSE_TUNE}`);

await browser.close();
await server?.close();

const report = [
  `# Check ${failures.length ? 'FAILED' : 'passed'}${ONLY ? ` (ONLY runs matching "${ONLY}")` : ''} — ${new Date().toISOString()}`,
  `target: ${base}`, '', ...summaries, '', '## failures', ...(failures.length ? failures : ['none']), '', '## console', ...(log.length ? log : ['(empty)']),
].join('\n');
writeFileSync(join(OUT, 'summary.txt'), report + '\n');
console.log(report);
console.log(`\nScreenshots and summary in ${OUT}/`);
process.exit(failures.length ? 1 : 0);
