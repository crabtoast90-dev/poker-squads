import { createAudio } from './view/audio.js';
import { createClock, STEP } from './clock.js';
import { applyTune } from './tune.js';
import { SQUADS as SQUADS_DATA } from './squads/data.js';
import { createSquadsView } from './view/squads-view.js';

// Start screen, then the round, all as cards. Rules live in the sim (src/squads/); this file
// only shows what it holds.
const params = new URLSearchParams(location.search);
const TEST = params.has('test'); // ?test: the clock only moves when the check calls advance()
const seed = Number(params.get('seed') ?? (TEST ? 1 : Math.floor(Date.now() % 100000) + 1)); // ?seed=N picks the deal
const SQUADS = applyTune(SQUADS_DATA, params.get('tune')); // ?tune=fight.enemyPower:3 tries numbers by name
const TOP = params.get('deck')?.split(',').filter(Boolean) ?? []; // ?deck=S14,H14: these cards are drawn first
const $ = (id) => document.getElementById(id);
const audio = createAudio({ enabled: !TEST });

let screen = 'start';
let view = null;

function enter() {
  leave();
  screen = 'squads';
  $('start').hidden = true;
  $('back').hidden = false;
  view = createSquadsView({ data: SQUADS, seed, audio, $, top: TOP, onRestart: () => enter() });
}
function leave() {
  view?.dispose();
  view = null;
  screen = 'start';
  $('start').hidden = false;
  $('back').hidden = true;
}
for (const b of document.querySelectorAll('.mode')) { b.disabled = false; b.addEventListener('click', () => { audio.unlock(); enter(); }); }
$('loading').hidden = true;
$('back').addEventListener('click', leave);
$('mute').addEventListener('click', () => { audio.setMuted(!audio.muted); $('mute').textContent = audio.muted ? '🔇' : '🔊'; });

const clock = createClock({ manual: TEST });
function step(dt) {
  clock.tick(dt);
  view?.update(dt * 1000);
}

function stateText() {
  const lines = [`screen: ${screen}; seed ${seed}; test clock ${TEST ? `on (${clock.time.toFixed(2)} s)` : 'off'}${params.get('tune') ? `; tune ${params.get('tune')}` : ''}${TOP.length ? `; deck top ${TOP.join(',')}` : ''}`];
  if (view) {
    const v = view.state();
    lines.push(`round: ${v.mode}; hands left ${v.handsLeft}, discards left ${v.discardsLeft}; reveals ${v.reveals}`);
    if (v.lastReveal) lines.push(`  last birth: ${v.lastReveal.hand} scoring ${v.lastReveal.score} -> ${v.lastReveal.unit}`);
    v.squads.forEach((sq, s) => lines.push(`  squad ${s}: ${sq.join(', ') || '(empty)'}`));
    if (v.fight) lines.push(`  fight: ${v.fight.time.toFixed(1)} s, ${v.fight.events} events${v.fight.result ? `, ${v.fight.result}` : ''}${v.skipped ? ' (skipped)' : ''}`);
  }
  return lines.join('\n');
}

window.__game = {
  state: () => ({ screen, loaded: true, seed, time: clock.time, squads: view?.state() ?? null }),
  stateText,
  enter,
  leave,
  bot: () => view?.bot() ?? null,
  advance(ms) { for (let t = 0; t < ms / 1000 - 1e-9; t += STEP) step(STEP); },
};

if (params.get('mode') === 'squads') enter();
if (!TEST) {
  let last = performance.now();
  const loop = (t) => { step(Math.min(0.1, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
