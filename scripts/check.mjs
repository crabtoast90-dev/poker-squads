// npm run check: build, open the site headless on laptop and phone, play a whole round
// through the real buttons on the test clock, save screenshots, and fail on console
// errors, failed requests, a frozen state, figures out of frame, or a browser round or
// fight that differs from the same round played in Node.
//   npm run check                    build and check this checkout
//   npm run check -- --url=<live>    check a deployed site instead
//   npm run check -- --only=phone    only the runs whose name contains "phone"
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SQUADS } from '../src/squads/data.js';
import { createRound, act, roundDigest } from '../src/squads/sim.js';
import { stepFight } from '../src/squads/fight.js';
import { greedy } from '../src/squads/bots.js';
import { digest } from '../src/squads/rng.js';
import { applyTune } from '../src/tune.js';

const RUNS = 'check-output';
const KEEP = 5;
const OUT = join(RUNS, new Date().toISOString().replace(/[:.]/g, '-'));
const URL_ARG = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const SEED = 1;
const LOSE_TUNE = 'fight.enemyPower:6'; // skeletons strong enough to win, to check the Defeat path
const ACES = ['S14', 'H14', 'C14', 'D14', 'S13']; // ?deck: four aces on top -> a Legendary on hand one

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

// The same round in Node: the greedy bot plays it (the browser bot is the same function).
// firstPlay: an action to play first (the Legendary run plays its four aces by hand).
function nodeRound(data, top = [], firstPlay = null) {
  const st = createRound(data, SEED, { top });
  if (firstPlay) act(st, firstPlay);
  while (st.phase !== 'fight') act(st, greedy(st));
  const f = st.fight;
  while (!f.result) stepFight(data, f);
  return { round: roundDigest(st), fight: `${f.events.length} events ${digest(f.events)}`, result: f.result, time: f.time };
}

// Node determinism.
for (const seed of [1, 2, 3]) {
  const run = () => { const st = createRound(SQUADS, seed); while (st.phase !== 'fight') act(st, greedy(st)); while (!st.fight.result) stepFight(SQUADS, st.fight); return roundDigest(st) + digest(st.fight.events); };
  if (run() !== run()) failures.push(`[node] seed ${seed}: two runs differ`);
  else summaries.push(`[node] seed ${seed} round twice: identical`);
}

let server;
let base = URL_ARG;
if (!base) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port: 4327, strictPort: false }, logLevel: 'warn' });
  base = server.resolvedUrls.local[0];
}
const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const shot = (page, name, step) => page.screenshot({ path: join(OUT, `${name}-${step}.png`) });
const state = (page) => page.evaluate(() => window.__game.state());
const advance = (page, ms) => page.evaluate((t) => window.__game.advance(t), ms);
const sq = async (page) => (await state(page)).squads;

async function run(name, contextOptions, script, extra = '') {
  if (ONLY && !name.includes(ONLY)) return;
  const t0 = Date.now();
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on('console', (msg) => {
    const line = `[${name}] console.${msg.type()}: ${msg.text()}`;
    if (!/GPU stall|GL Driver Message/.test(line)) log.push(line);
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

// Every figure's feet and head inside the part of the screen the HUD leaves free.
function checkFraming(name, s, where) {
  const { top, bottom } = s.band;
  for (const f of s.framing) {
    const [fx, fy] = f.feet;
    const [hx, hy] = f.head;
    if (Math.abs(fx) > 0.9 || Math.abs(hx) > 0.9 || fy < bottom - 0.02 || hy > top + 0.02) failures.push(`[${name}] ${where}: ${f.id} outside the free band (feet ${f.feet}, head ${f.head}, band ${bottom}..${top})`);
  }
}

async function checkAlive(page, name) {
  const a = (await state(page)).figures.map((f) => f.clipTime);
  await advance(page, 300);
  const b = (await state(page)).figures.map((f) => f.clipTime);
  if (!a.length || a.every((t, i) => t === b[i])) failures.push(`[${name}] figures frozen: animation clock did not move`);
}

// Wait on the test clock until the round is waiting for input again.
async function settle(page, name, maxMs = 15000) {
  for (let t = 0; t < maxMs; t += 100) {
    const m = (await sq(page)).mode;
    if (['play', 'choose', 'ready', 'end'].includes(m)) return m;
    await advance(page, 100);
  }
  failures.push(`[${name}] stuck in mode ${(await sq(page)).mode}`);
  return null;
}

// Play one action through the real buttons.
async function doAction(page, click, a) {
  if (a.type === 'play' || a.type === 'discard') {
    for (const id of a.ids) await click(`#hand .card[data-id="${id}"]`);
    await advance(page, 50);
    await click(a.type === 'play' ? '#play' : '#discard');
  } else if (a.type === 'assign') await click(`#to-squad-${a.squad}`);
  else if (a.type === 'battle') await click('#battle');
}

// Play the round to the fight with the bot through the buttons, screenshotting the first reveal.
async function playRound(page, name, click, { shots = true, firstPlay = null } = {}) {
  let n = 0;
  let shotReveal = false;
  for (let i = 0; i < 40; i++) {
    const m = await settle(page, name);
    if (m === 'ready') break;
    if (!m) return;
    const a = i === 0 && firstPlay ? firstPlay : await page.evaluate(() => window.__game.bot());
    if (!a) { failures.push(`[${name}] bot had no move in mode ${m}`); return; }
    if (a.type === 'play' && shots && n === 0 && !firstPlay) {
      for (const id of a.ids) await click(`#hand .card[data-id="${id}"]`);
      await advance(page, 50);
      await shot(page, name, '2-odds');
      const odds = await page.evaluate(() => [document.getElementById('odds-hand').textContent, document.getElementById('odds-class').textContent, document.getElementById('odds-rarity').textContent]);
      if (!odds[1] || !odds[2].includes('%')) failures.push(`[${name}] odds not shown before committing (${odds})`);
      summaries.push(`[${name}] odds before the first hand: ${odds.join(' | ')}`);
      await click('#play');
      n++;
    } else {
      await doAction(page, click, a);
      if (a.type === 'play') n++;
    }
    if (a.type === 'play' && shots && !shotReveal) {
      shotReveal = true;
      const R = SQUADS.reveal;
      await advance(page, R.gather + R.count + 50);
      await shot(page, name, '3-reveal-score');
      await advance(page, R.rollBase + 200);
      await shot(page, name, '4-reveal-rarity');
      await settle(page, name);
      await shot(page, name, '5-born');
    }
  }
  const s = await sq(page);
  if (s.mode !== 'ready') failures.push(`[${name}] round did not reach the fight (mode ${s.mode})`);
  if (s.squads.flat().length !== 6) failures.push(`[${name}] expected 6 units, got ${s.squads.flat().length}`);
  summaries.push(`[${name}] round played through the buttons: ${n} hands, squads: ${s.squads.map((x) => x.join(', ')).join(' | ')}`);
  if (shots) await shot(page, name, '6-squads-ready');
}

async function playFight(page, name, click, data, top, { want, skip, firstPlay, shots = true } = {}) {
  const node = nodeRound(data, top, firstPlay);
  await click('#battle');
  await advance(page, 200);
  if (shots) await shot(page, name, '7-fight-start');
  if (skip) {
    await click('#skip');
  } else {
    await click('#speed'); // 2x
    let s = await sq(page);
    if (s.speed !== 2) failures.push(`[${name}] 2x toggle did not switch speed`);
    let shotMid = false;
    for (let i = 0; i < 600 && !s.fight?.result; i++) {
      await advance(page, 250);
      s = await sq(page);
      if (!shotMid && s.fight.time > 6) {
        shotMid = true;
        if (shots) await shot(page, name, '8-mid-fight');
      }
    }
  }
  await advance(page, data.reveal.endDelay + 400);
  const s = await sq(page);
  if (shots || skip) await shot(page, name, '9-result');
  if (!s.fight?.result) return failures.push(`[${name}] fight did not finish on screen`);
  if (!(await page.isVisible('#sq-end'))) failures.push(`[${name}] result banner not shown`);
  if (s.roundDigest !== node.round) failures.push(`[${name}] round differs from Node (browser ${s.roundDigest}, Node ${node.round})`);
  else if (s.fight.digest !== node.fight || s.fight.result !== node.result) failures.push(`[${name}] fight differs from Node (browser ${s.fight.result} ${s.fight.digest}, Node ${node.result} ${node.fight})`);
  else summaries.push(`[${name}] round and fight match Node: ${s.fight.result} in ${s.fight.time.toFixed(1)} s (${node.fight})${skip ? ', via Skip' : ''}`);
  if (want && s.fight.result !== want) failures.push(`[${name}] expected ${want}, got ${s.fight.result}`);
  summaries.push(`## ${name} result\n${await page.evaluate(() => window.__game.stateText())}`);
}

async function walk(page, name, click) {
  await advance(page, 100);
  let s = await state(page);
  if (s.screen !== 'start') failures.push(`[${name}] expected the start screen, got ${s.screen}`);
  await shot(page, name, '0-start');
  await click('.mode[data-mode="squads"]');
  await advance(page, 300);
  s = await state(page);
  if (s.screen !== 'squads') failures.push(`[${name}] round: screen ${s.screen}`);
  if (s.squads.hand.length !== SQUADS.round.handSize) failures.push(`[${name}] hand has ${s.squads.hand.length} cards`);
  await shot(page, name, '1-round');
  await playRound(page, name, click);
  await playFight(page, name, click, SQUADS, []);
  await click('#again');
  await advance(page, 300);
  s = await sq(page);
  if (s.reveals !== 0 || s.mode !== 'play' || s.fight) failures.push(`[${name}] Play again did not restart the round`);
  await click('#back');
  await advance(page, 100);
  if ((await state(page)).screen !== 'start') failures.push(`[${name}] back did not return to the start screen`);
}

// ?deck puts four aces on top: hand one is Four of a Kind -> a guaranteed Legendary.
async function legendary(page, name, click) {
  await advance(page, 300);
  const first = { type: 'play', ids: ACES.slice(0, 4) };
  for (const id of first.ids) await click(`#hand .card[data-id="${id}"]`);
  await advance(page, 50);
  await shot(page, name, '1-odds');
  await click('#play');
  const R = SQUADS.reveal;
  await advance(page, R.gather + R.count + R.rollBase + 100);
  await shot(page, name, '2-rarity');
  await advance(page, R.pick + R.drop * 0.6);
  await shot(page, name, '3-drop');
  await advance(page, R.drop * 0.4 + R.dropHighExtra + 80);
  await shot(page, name, '4-land');
  await settle(page, name);
  const s = await sq(page);
  if (!s.lastReveal || s.lastReveal.rarity !== 4) failures.push(`[${name}] four aces did not give a Legendary (${JSON.stringify(s.lastReveal)})`);
  else summaries.push(`[${name}] four aces -> ${s.lastReveal.unit}`);
  await shot(page, name, '5-choose');
  await playRound(page, name, click, { shots: false, firstPlay: null });
  await playFight(page, name, click, SQUADS, ACES, { skip: true, firstPlay: first, shots: false });
}

async function tunedLoss(page, name, click) {
  await advance(page, 300);
  if ((await state(page)).screen !== 'squads') failures.push(`[${name}] ?mode=squads did not skip the start screen`);
  await playRound(page, name, click, { shots: false });
  await playFight(page, name, click, applyTune(SQUADS, LOSE_TUNE), [], { want: 'lose', skip: true, shots: false });
}

async function debugOverlay(page, name) {
  await advance(page, 100);
  if (!(await page.isVisible('#fps'))) failures.push(`[${name}] ?debug did not show the FPS overlay`);
  summaries.push(`[${name}] ?debug overlay visible`);
}

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel)],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel)],
};
// Build-speed phase: laptop only (Brian, 2026-11-22). Phone runs come back with polish.
const [lopts, linput] = DEVICES.laptop;
await run('laptop', lopts, (page) => walk(page, 'laptop', linput(page)));
await run('laptop-legendary', lopts, (page) => legendary(page, 'laptop-legendary', linput(page)), `&mode=squads&deck=${ACES.join(',')}`);
await run('laptop-defeat', lopts, (page) => tunedLoss(page, 'laptop-defeat', linput(page)), `&mode=squads&tune=${LOSE_TUNE}`);

await browser.close();
await server?.close();

const report = [
  `# Check ${failures.length ? 'FAILED' : 'passed'}${ONLY ? ` (ONLY runs matching "${ONLY}")` : ''} — ${new Date().toISOString()}`,
  `target: ${base}`,
  '',
  ...summaries,
  '',
  '## failures',
  ...(failures.length ? failures : ['none']),
  '',
  '## console',
  ...(log.length ? log : ['(empty)']),
].join('\n');
writeFileSync(join(OUT, 'summary.txt'), report + '\n');
console.log(report);
console.log(`\nScreenshots and summary in ${OUT}/`);
process.exit(failures.length ? 1 : 0);
