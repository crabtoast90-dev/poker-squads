// The run on screen, all cards: pick 2 heroes; each round play 6 hands (odds, power gain,
// the birth reveal with its luck roll and face bonus), watch the fight (cards trading hits),
// after a win keep 1 of the round's 6 units and visit the shop; a lost fight ends the run.
// No rules here: every outcome comes from the sim (src/squads/); this file stages it on the
// game clock, so test runs repeat exactly and match Node.
import { RARITIES, CLASS_OF } from '../squads/data.js';
import { preview, armyForFight, roundDigest, rarityOdds } from '../squads/sim.js';
import { createRun, runAct, bountyText, bountyMet } from '../squads/run.js';
import { HAND_NAMES } from '../squads/poker.js';
import { armyPowers, unitPower, expectedGain } from '../squads/power.js';
import { createFight, stepFight, topUnit } from '../squads/fight.js';
import { greedy } from '../squads/bots.js';
import { digest } from '../squads/rng.js';
import { cardElement, cardName, SUIT_SYMBOL, SUIT_COLOR, rankLabel } from './cards.js';

const RARITY_NAME = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const RARITY_HEX = ['#b8c0c8', '#4cc26a', '#3d8bff', '#a65cff', '#ffb627'];
const CLASS_SUIT = { knight: 'S', priestess: 'H', witch: 'C', rogue: 'D' };
const MECH_ICON = { knight: '🛡', witch: '🔥', priestess: '✚', rogue: '✦' };
const ease = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const pct = (p) => `${Math.round(p * 100)}%`;

export function createSquadsView({ data, seed, audio, $, top, relics = [], onRestart }) {
  const run = createRun(data, seed, { top, relics });
  let st = null; // the current round
  const hudEl = $('sq-hud');
  let mode = 'heroes'; // heroes | play | discard | choose | reveal | hop | ready | fight | end | keep | shop | rite | over
  let selected = [];
  let heroPicks = [];
  let timeline = null;
  const anims = [];
  let fight = null;
  let speed = 1;
  let fightAcc = 0;
  let skipped = false;
  let reveals = 0;
  let lastReveal = null;
  let pendingReveal = null;
  let flashLeft = 0;
  let power = null;
  const floaters = [];
  const cardEls = new Map(); // fight unit id -> element
  const luck = () => (run.relics.includes('pokerLuck') ? data.relics.pokerLuck.luck : 0);

  hudEl.hidden = false;
  for (const id of ['sq-end', 'reveal', 'battle', 'fight-ctl', 'choice', 'keep', 'shop', 'rite', 'run-over']) $(id).hidden = true;
  $('again').onclick = onRestart;
  $('new-run').onclick = onRestart;

  // ---- Hero pick ----
  function drawHeroPick() {
    $('hero-pick').hidden = false;
    $('hero-opts').innerHTML = Object.entries(data.heroes).map(([k, h]) => `<button class="hero-opt${heroPicks.includes(k) ? ' on' : ''}" data-hero="${k}" style="--suit:${SUIT_COLOR[CLASS_SUIT[h.cls]]}"><b class="rk">♛${SUIT_SYMBOL[CLASS_SUIT[h.cls]]}</b><b>${h.name}</b><span class="cl">${data.classes[h.cls].name} · ${data.classes[h.cls].mechanic}</span><span>${h.skill}</span></button>`).join('');
    for (const el of $('hero-opts').querySelectorAll('.hero-opt')) el.onclick = () => pickHero(el.dataset.hero);
    $('start-run').disabled = heroPicks.length !== 2;
  }
  function pickHero(k) {
    if (mode !== 'heroes') return;
    audio.unlock();
    heroPicks = heroPicks.includes(k) ? heroPicks.filter((x) => x !== k) : [...heroPicks, k].slice(-2);
    audio.select();
    drawHeroPick();
  }
  $('start-run').onclick = () => {
    if (mode !== 'heroes' || heroPicks.length !== 2) return;
    runAct(run, { type: 'heroes', picks: heroPicks });
    $('hero-pick').hidden = true;
    startRound();
  };

  function startRound() {
    st = run.round;
    fight = null;
    skipped = false;
    speed = 1;
    $('speed').textContent = '1x';
    hudEl.classList.remove('fighting');
    for (const id of ['sq-end', 'keep', 'shop', 'rite', 'fight-log']) $(id).hidden = true;
    $('board').hidden = false;
    $('bottom').hidden = false;
    drawBoard();
    drawHand();
    setMode('play');
  }

  // ---- Unit cards ----
  function mechText(u) {
    if (u.cls === 'knight') return `Armor ${u.armor.toFixed(1)}`;
    if (u.cls === 'witch') return `Burn ${u.burn.toFixed(1)}/s`;
    if (u.cls === 'priestess') return `Shield ${Math.round(u.shieldAmt)}`;
    return `Crit ${Math.round(u.crit * 100)}%${u.critMult > 2 ? ' ×3' : ''}`;
  }
  function unitCard(u, worth = null) {
    const el = document.createElement('div');
    const suit = u.side === 'e' ? CLASS_SUIT[u.cls] : u.suit ?? CLASS_SUIT[u.cls];
    el.className = `ucard${u.hero ? ' hero' : ''}${u.side === 'e' ? ' enemy' : ''}${u.kept ? ' kept' : ''}${u.rarity != null && !u.hero ? ` rar-${RARITIES[u.rarity]}` : ''}`;
    el.style.setProperty('--suit', SUIT_COLOR[suit]);
    const head = u.side === 'e' ? `<b class="rk">☠<small>${SUIT_SYMBOL[suit]}</small></b>` : u.hero ? `<b class="rk">♛${SUIT_SYMBOL[suit]}</b>` : `<b class="rk">${rankLabel(u.rank)}${SUIT_SYMBOL[suit]}${u.kept ? '<small>★</small>' : ''}</b>`;
    const name = u.side === 'e' || u.hero ? u.name : `${RARITY_NAME[u.rarity]} ${data.classes[u.cls].name}`;
    const bonus = (u.bonuses ?? []).map((k) => `<em>${data.bonuses[u.cls][k].name}</em>`).join('') + (u.traits?.length ? `<span class="trait">${u.traits.map((t) => data.traits[t].name).join(' + ')}${u.hand && (run.doctrines[u.hand] ?? 1) > 1 ? ` Lv${run.doctrines[u.hand]}` : ''}</span>` : '');
    el.dataset.tip = unitTip(u);
    const skill = u.hero ? `<span class="skill">Lv ${u.level ?? 1} · ${heroOf(u).skill}</span>` : '';
    el.innerHTML = `${head}<span class="nm">${name}</span>${skill}<span class="mech">${MECH_ICON[u.cls]} ${mechText(u)}</span>${bonus}${worth != null ? `<span class="pw">+${worth} power</span>` : ''}<span class="st">♥ <b class="hpn">${Math.round(u.hp)}</b> ⚔ ${u.atk.toFixed(0)}</span><span class="hp"><i></i></span>`;
    return el;
  }
  const MECH_TEXT = {
    knight: 'Armor: takes a flat amount off every hit (never more than 75% of it).',
    witch: 'Burn: her hits set a burn that ignores Armor; she spreads it to enemies not yet burning.',
    priestess: 'Shield: every few seconds shields the most hurt ally.',
    rogue: 'Crit: a chance to hit for double; jumps straight to the enemy back line.',
  };
  const heroOf = (u) => Object.values(data.heroes).find((h) => h.name === u.name) ?? data.heroes[u.cls];
  function unitTip(u) {
    const lines = [];
    const title = u.side === 'e' || u.hero ? u.name : `${RARITY_NAME[u.rarity]} ${rankLabel(u.rank)}${SUIT_SYMBOL[u.suit]} ${data.classes[u.cls].name}${u.kept ? ' (kept)' : ''}`;
    lines.push(`<b>${title}</b>`);
    if (u.hero) {
      lines.push(`Hero, level ${u.level ?? 1}. Skill: ${heroOf(u).skill}`);
      const tal = run.talents.filter((k) => data.talents[k].hero === u.cls);
      if (tal.length) lines.push(`Talents: ${tal.map((k) => `${data.talents[k].name} (${data.talents[k].text})`).join('; ')}`);
    }
    lines.push(`${MECH_ICON[u.cls]} ${mechText(u)}. ${MECH_TEXT[u.cls]}`);
    for (const k of u.bonuses ?? []) lines.push(`Bonus <b>${data.bonuses[u.cls][k].name}</b>: ${data.bonuses[u.cls][k].text}`);
    for (const t of u.traits ?? []) lines.push(`Trait <b>${data.traits[t].name}</b> (from ${HAND_NAMES[u.hand]}${(run.doctrines[u.hand] ?? 1) > 1 ? `, doctrine Lv ${run.doctrines[u.hand]}` : ''}): ${data.traits[t].text}`);
    lines.push(`Health ${Math.round(u.maxHp)} · hit ${u.atk.toFixed(0)} every ${u.interval.toFixed(2)} s${u.armor ? ` · Armor ${u.armor.toFixed(1)}` : ''}${u.shield ? ` · starts with Shield ${Math.round(u.shield)}` : ''}`);
    return lines.join('<br>');
  }

  // The board: both armies as the fight would line them up right now, with their power.
  function drawBoard() {
    const army = armyForFight(st);
    const f = fight ?? createFight(data, army, st.roundIndex, 0);
    cardEls.clear();
    for (const side of ['p', 'e']) {
      const box = $(side === 'p' ? 'army-cards' : 'foes-cards');
      box.innerHTML = '';
      for (const u of f.units.filter((x) => x.side === side)) {
        const i = u.id.startsWith('p') ? Number(u.id.slice(1)) : -1;
        const el = unitCard(u, i >= 0 && !fight ? unitPower(data, army, st.roundIndex, i) : null);
        box.appendChild(el);
        cardEls.set(u.id, el);
      }
      if (side === 'p') for (let i = st.army.length; i < data.round.armySize; i++) {
        const e = document.createElement('div');
        e.className = 'ucard empty';
        e.textContent = 'open slot';
        box.appendChild(e);
      }
    }
    const p = armyPowers(data, army, st.roundIndex);
    power = p;
    const er = data.enemyRounds[st.roundIndex];
    $('foes-lean').textContent = er.lean;
    $('cp-foes').textContent = `⚡ ${p.foes}`;
    $('cp-mine').textContent = `⚡ ${p.mine}`;
    const gap = p.mine - p.foes;
    $('verdict').innerHTML = gap >= 0 ? `<b class="ahead">Ahead by ${gap}</b>: the stronger army usually wins` : `<b class="behind">Behind by ${-gap}</b>${st.handsLeft ? `: ${st.handsLeft} hand${st.handsLeft === 1 ? '' : 's'} left to close it` : ''}`;
    $('round-no').textContent = `${st.roundIndex + 1}/${data.run.rounds}`;
    $('gold').textContent = run.gold;
    $('bounties').innerHTML = run.bounties.map((b) => {
      const met = bountyMet(data, b, st, fight?.result ? fight : null);
      return `<span class="bounty${met ? ' met' : ''}">${met ? '✔' : '◇'} ${bountyText(data, b)} <b>${b.gold}g</b></span>`;
    }).join('');
    $('hands-left').textContent = st.handsLeft;
    $('discards-left').textContent = st.discardsLeft;
    $('units-made').textContent = `${st.army.length}/${data.round.armySize}`;
    $('relics').innerHTML = [
      ...run.relics.map((k) => `<span class="relic-chip" data-tip="<b>${data.relics[k].name}</b> (relic)<br>${data.relics[k].text}">${data.relics[k].name}</span>`),
      ...run.talents.map((k) => `<span class="relic-chip talent" data-tip="<b>${data.talents[k].name}</b> (${data.heroes[data.talents[k].hero].name})<br>${data.talents[k].text}${run.heroes.includes(data.talents[k].hero) ? '' : '<br>(inactive: hero not in your army)'}">${data.talents[k].name}</span>`),
      ...Object.entries(run.doctrines).map(([h, l]) => `<span class="relic-chip doctrine" data-tip="<b>${HAND_NAMES[h]} Lv ${l}</b><br>+${(l - 1) * data.doctrine.chips} chips, +${(l - 1) * data.doctrine.mult} mult; trait ${data.traitOf[h].map((t) => data.traits[t].name).join(' + ') || 'none'} at ${Math.round(100 * (1 + data.doctrine.traitPerLevel * (l - 1)))}% strength">${HAND_NAMES[h]} Lv ${l}</span>`),
    ].join('') || '<span class="none">no relics, talents or doctrines yet</span>';
    $('heroes-line').innerHTML = run.heroes.map((h) => `<span data-tip="<b>${data.heroes[h].name}</b> (${data.classes[data.heroes[h].cls].name}, Lv ${run.heroLevels[h] ?? 1})<br>${data.heroes[h].skill}">${data.heroes[h].name} Lv ${run.heroLevels[h] ?? 1}</span>`).join(' + ');
  }

  // ---- The hand ----
  function drawHand(dealIn = []) {
    const hand = $('hand');
    hand.innerHTML = '';
    const sorted = st.hand.slice().sort((a, b) => b.rank - a.rank || a.suit.localeCompare(b.suit));
    for (const c of sorted) {
      const el = cardElement(c, c.rarity != null ? RARITIES[c.rarity] : null);
      if (selected.includes(c.id)) el.classList.add('sel');
      el.onclick = () => toggle(c.id);
      hand.appendChild(el);
    }
    const els = [...hand.children].filter((e) => dealIn.includes(e.dataset.id));
    if (els.length) anims.push({ t: 0, dur: data.reveal.deal, frame: (k) => els.forEach((e) => (e.style.transform = k >= 1 ? '' : `translateY(${(1 - ease(k)) * 50}px)`)) });
    drawOdds();
  }
  function toggle(id) {
    if (mode !== 'play') return;
    audio.unlock();
    if (selected.includes(id)) selected = selected.filter((x) => x !== id);
    else if (selected.length < data.round.maxPlay) selected.push(id);
    audio.select();
    for (const el of $('hand').children) el.classList.toggle('sel', selected.includes(el.dataset.id));
    drawOdds();
  }
  function drawOdds() {
    if (!st) return;
    const cards = selected.map((id) => st.hand.find((c) => c.id === id)).filter(Boolean);
    const pv = cards.length ? preview(data, cards, run.relics, run.doctrines) : null;
    $('play').disabled = mode !== 'play' || !pv || st.handsLeft <= 0;
    $('discard').disabled = mode !== 'play' || !pv || st.discardsLeft <= 0;
    $('odds').classList.toggle('empty', !pv);
    if (!pv) {
      for (const id of ['odds-score', 'odds-class', 'odds-rarity', 'odds-gain']) $(id).innerHTML = '';
      $('odds-hand').textContent = 'Pick up to 5 cards';
      return;
    }
    $('odds-hand').innerHTML = `${pv.name}${pv.level > 1 ? ` <small>Lv ${pv.level}</small>` : ''} <span class="trait">${pv.traits.length ? `Trait: ${pv.traits.map((t) => `${data.traits[t].name} (${data.traits[t].text})`).join(' + ')}` : 'no trait'}</span>${pv.rarity.tier >= 2 || pv.rarity.odds.slice(2).some((p) => p > 0) ? ` <span class="herochance">hero chance ${pct(pv.rarity.odds.reduce((a, p, i) => a + p * data.heroEvents.chance[i], 0))}</span>` : ''}`;
    $('odds-score').innerHTML = `<b class="chips">${pv.chips}</b> × <b class="mult">${pv.mult}</b> = <b>${pv.score}</b>`;
    const faces = pv.scoring.filter((c) => c.rank >= data.birth.faceFrom).length;
    $('odds-class').innerHTML = Object.entries(pv.classOdds).sort((a, b) => b[1] - a[1])
      .map(([suit, p]) => `<span class="co" style="--suit:${SUIT_COLOR[suit]}"><i>${SUIT_SYMBOL[suit]}</i>${data.classes[CLASS_OF[suit]].name} ${pct(p)}</span>`).join('') + (faces ? `<span class="co face">face bonus ${pct(faces / pv.scoring.length)}</span>` : '');
    const g = expectedGain(data, armyForFight(st), st.roundIndex, pv, luck());
    $('odds-gain').innerHTML = `Adds about <b>+${g.avg} power</b> <small>(${g.lo} to ${g.hi})</small>${power ? ` → ${power.mine + g.avg} vs skeletons ${power.foes}` : ''}`;
    $('odds-rarity').innerHTML = pv.rarity.odds.map((p, i) => `<span class="ro rar-${RARITIES[i]}${p > 0 ? ' on' : ''}" style="flex:${p > 0 ? 1 + p * 3 : 0.6}"><b>${RARITY_NAME[i]}</b><s>${RARITY_NAME[i][0]}</s>${p > 0 ? pct(p) : ''}</span>`).join('');
  }

  // ---- Timelines on the game clock ----
  function startTimeline(steps, nextMode) {
    timeline = { t: 0, steps: steps.map((s) => ({ ...s, done: false })), end: Math.max(...steps.map((s) => s.at)), nextMode };
  }
  function runTimeline(dt) {
    if (!timeline) return;
    const tl = timeline;
    tl.t += dt;
    for (const s of tl.steps) {
      if (s.frame && tl.t >= s.at) s.frame(tl.t - s.at);
      if (!s.done && s.fn && tl.t >= s.at) { s.done = true; s.fn(); }
    }
    if (tl.t >= tl.end && timeline === tl) {
      timeline = null;
      if (tl.nextMode) setMode(tl.nextMode);
    }
  }
  function setMode(m) {
    mode = m;
    hudEl.dataset.mode = m;
    $('battle').hidden = m !== 'ready';
    $('fight-ctl').hidden = m !== 'fight';
    $('reveal').hidden = !(m === 'reveal' || m === 'hop');
    drawOdds();
  }

  $('play').onclick = () => { if (mode === 'play' && selected.length) play(); };
  $('discard').onclick = () => { if (mode === 'play' && selected.length) discard(); };
  $('battle').onclick = () => { if (mode === 'ready') startFight(); };
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; $('speed').textContent = `${speed}x`; };
  $('skip').onclick = () => { if (mode === 'fight') skipFight(); };
  $('continue').onclick = () => { if (mode === 'end') afterFight(); };

  function discard() {
    audio.unlock();
    const ids = selected.slice();
    const before = new Set(st.hand.map((c) => c.id));
    runAct(run, { type: 'discard', ids });
    selected = [];
    const els = [...$('hand').children].filter((e) => ids.includes(e.dataset.id));
    audio.whoosh();
    setMode('discard');
    startTimeline([
      { at: 0, frame: (t) => els.forEach((e) => { const k = clamp01(t / data.reveal.discard); e.style.transform = `translateY(${k * 100}px)`; e.style.opacity = 1 - k; }) },
      { at: data.reveal.discard, fn: () => { drawBoard(); drawHand(st.hand.map((c) => c.id).filter((id) => !before.has(id))); } },
    ], 'play');
  }

  // ---- The birth reveal ----
  function play() {
    audio.unlock();
    const ids = selected.slice();
    const playedCards = ids.map((id) => st.hand.find((c) => c.id === id));
    const before = new Set(st.hand.map((c) => c.id));
    runAct(run, { type: 'play', ids });
    selected = [];
    pendingReveal = { before, playedCards };
    if (st.phase === 'choose' && st.choice.kind !== 'hero') showChoice();
    else reveal();
  }

  // A relic gave a choice (which suit a pair copies; which of two face bonuses): pick, then reveal.
  let choicesShown = 0;
  function showChoice() {
    choicesShown++;
    setMode('choose');
    const ch = st.choice;
    const box = $('choice');
    box.hidden = false;
    const scoring = st.pending.ev.scoring;
    $('choice-title').textContent = ch.kind === 'hero' ? `A hero rises: ${data.heroes[ch.cls].name}! Swap one of yours for them, or level one of yours.` : ch.kind === 'card' ? `${data.relics.pokerPair.name}: which card does the unit copy?` : `${data.relics.pokerFace.name}: pick the face bonus`;
    $('choice-opts').innerHTML = ch.options.map((o) => {
      if (ch.kind === 'hero') {
        const [how, i] = o.split(':');
        const cur = run.heroes[Number(i)];
        const SUITS = { knight: '♠', priestess: '♥', witch: '♣', rogue: '♦' };
        return how === 'level'
          ? `<button class="choice-opt" data-pick="${o}"><b>Level up ${data.heroes[cur].name}</b> Lv ${run.heroLevels[cur] ?? 1} → ${(run.heroLevels[cur] ?? 1) + 1}</button>`
          : `<button class="choice-opt" data-pick="${o}"><b>Swap ${data.heroes[cur].name} out</b> for ${data.heroes[ch.cls].name} (${data.heroes[ch.cls].skill}). ${data.heroes[cur].name} becomes a Legendary A${SUITS[data.heroes[cur].cls]} in your deck.</button>`;
      }
      if (ch.kind === 'card') { const c = scoring.find((x) => x.id === o); return `<button class="choice-opt" data-pick="${o}" style="--suit:${SUIT_COLOR[c.suit]}"><b>${cardName(c)}</b> ${data.classes[CLASS_OF[c.suit]].name}</button>`; }
      const b = data.bonuses[ch.cls][o];
      return `<button class="choice-opt" data-pick="${o}"><b>${b.name}</b> ${b.text}</button>`;
    }).join('');
    for (const el of box.querySelectorAll('.choice-opt')) el.onclick = () => choose(el.dataset.pick);
  }
  function choose(pick) {
    if (mode !== 'choose') return;
    runAct(run, { type: 'choose', pick });
    $('choice').hidden = true;
    if (st.phase === 'choose' && st.choice.kind !== 'hero') showChoice();
    else reveal();
  }

  function heroOutcome(h) {
    const [how, i] = h.outcome.split(':');
    const who = h.heroes[Number(i)];
    if (h.own || how === 'level') return `<b class="herotext">${data.heroes[who].name} levels up to Lv ${h.levels[who]}!</b> The hand was free.`;
    return `<b class="herotext">${data.heroes[h.cls].name} joins your army!</b> The hero they replaced is now a Legendary Ace in your deck. The hand was free.`;
  }

  function reveal() {
    const { playedCards } = pendingReveal;
    const L = st.last;
    const u = L.unit;
    reveals++;
    lastReveal = { hand: L.hand, score: L.score, tier: L.tier, rarity: u.rarity, upChance: +(rarityOdds(data, L.score, luck()).odds.slice(L.tier + 1).reduce((a, b) => a + b, 0)).toFixed(3), rankedUp: u.rarity > L.tier, hero: L.hero ? L.hero.cls : null, unit: `${RARITY_NAME[u.rarity]} ${cardName(u)} ${data.classes[u.cls].name}` };
    setMode('reveal');
    const R = data.reveal;
    const rv = $('rv-cards');
    rv.innerHTML = '';
    $('rv-newborn').innerHTML = '';
    const scoringSet = new Set(L.scoring);
    const flyers = playedCards.map((c) => {
      const el = cardElement(c, c.rarity != null ? RARITIES[c.rarity] : null);
      if (!scoringSet.has(c.id)) el.classList.add('kicker');
      rv.appendChild(el);
      return { el, c };
    });
    const scoring = flyers.filter((f) => scoringSet.has(f.c.id));
    const picked = scoring.find((f) => f.c.id === L.scoring[L.pick]) ?? scoring[0];
    for (const id of ['rv-hand', 'rv-score', 'rv-tier', 'rv-unit']) $(id).textContent = '';
    $('rv-tier').className = '';
    $('rv-meter').hidden = true;
    const ups = u.rarity - L.tier;
    const high = u.rarity >= 3;
    const tCount = R.gather + R.count;
    const tLuck = tCount + R.rollBase;
    const canLuck = L.tier < RARITIES.length - 1;
    const luckOdds = rarityOdds(data, L.score, luck()).odds;
    const upChance = luckOdds.slice(L.tier + 1).reduce((a, b) => a + b, 0);
    const tRoll = canLuck ? tLuck + R.luck + R.luckResult + R.rollPerTier * ups : tLuck;
    const tPick = tRoll + (scoring.length > 1 ? R.pick : 160);
    const tLand = tPick + R.drop + (high ? R.dropHighExtra : 0);
    $('rv-luck').hidden = true;
    const thr = data.birth.rarityThresholds;
    const meterPos = (score) => {
      let i = 0;
      while (i + 1 < thr.length && score >= thr[i + 1]) i++;
      if (i === thr.length - 1) return Math.min(5, 4 + (score - thr[i]) / thr[i]);
      return i + (score - thr[i]) / (thr[i + 1] - thr[i]);
    };
    const target = meterPos(L.score);
    let ticks = 0;
    const setTier = (r, up) => {
      const el = $('rv-tier');
      el.textContent = up ? `${RARITY_NAME[r]}!` : RARITY_NAME[r];
      el.className = `rar-${RARITIES[r]}${up ? ' up' : ''}`;
      void el.offsetWidth;
      el.classList.add('pop');
    };
    const steps = [
      { at: 0, fn: () => audio.whoosh() },
      { at: 0, frame: (t) => { const k = ease(clamp01(t / R.gather)); for (const f of flyers) f.el.style.transform = k >= 1 ? '' : `translateY(${(1 - k) * 80}px)`; } },
      { at: R.gather, fn: () => { $('rv-hand').textContent = L.name; $('rv-hand').classList.remove('pop'); void $('rv-hand').offsetWidth; $('rv-hand').classList.add('pop'); } },
      { at: R.gather, frame: (t) => {
        const k = clamp01(t / (R.count * 0.75));
        const done = t >= R.count * 0.8;
        $('rv-score').innerHTML = `<b class="chips">${Math.round(L.base + (L.chips - L.base) * k)}</b> × <b class="mult">${done ? L.mult : '?'}</b>${t >= R.count ? ` = <b class="total">${L.score}</b>` : ''}`;
        const lit = Math.floor(k * scoring.length + 0.001);
        scoring.forEach((f, i) => f.el.classList.toggle('lit', i < lit));
      } },
      ...scoring.map((f, i) => ({ at: R.gather + (R.count * 0.75 * (i + 0.5)) / scoring.length, fn: () => audio.chip(i) })),
      { at: R.gather + R.count * 0.8, fn: () => audio.mult() },
      { at: tCount, fn: () => { $('rv-meter').hidden = false; drawMeter(0, L.tier, false); } },
      // The needle sweeps to the score: that is the guaranteed tier.
      { at: tCount, frame: (t) => {
        if (t > R.rollBase + R.luck) return;
        const sweep = R.rollBase * 0.7;
        const pos = t < sweep ? target * ease(clamp01(t / sweep)) : target;
        const tk = Math.floor(pos * 4);
        if (tk > ticks) { ticks = tk; audio.tick(tk); }
        drawMeter(pos, Math.min(L.tier, Math.floor(pos)), false);
      } },
      { at: tLuck, fn: () => setTier(L.tier, false) },
      // The luck roll: a marker races over the bar and settles where the sim's roll landed.
      // Landing in the coloured zone ranks the unit up (the gold sliver: two tiers).
      ...(canLuck ? [
        { at: tLuck, fn: () => {
          $('rv-luck').hidden = false;
          $('luck-label').innerHTML = `Luck roll: <b>${pct(upChance)}</b> to rank up to ${RARITY_NAME[L.tier + 1]}${luckOdds[L.tier + 2] ? ` <small>(${pct(luckOdds[L.tier + 2])} of that skips to ${RARITY_NAME[L.tier + 2]})</small>` : ''}`;
          const z = $('rv-luck').querySelectorAll('.z');
          z[0].style.width = `${luckOdds[L.tier] * 100}%`;
          z[1].style.width = `${(luckOdds[L.tier + 1] ?? 0) * 100}%`;
          z[1].style.background = RARITY_HEX[L.tier + 1];
          z[2].style.width = `${(luckOdds[L.tier + 2] ?? 0) * 100}%`;
          z[2].style.background = RARITY_HEX[Math.min(4, L.tier + 2)];
          $('rv-luck').className = '';
          ticks = 0;
        } },
        { at: tLuck, frame: (t) => {
          if (t > R.luck) return;
          const k = clamp01(t / R.luck);
          const amp = (1 - k) ** 2;
          const pos = clamp01(L.roll + amp * Math.sin(t / 38) * 0.9);
          $('luck-marker').style.left = `${(k >= 1 ? L.roll : pos) * 100}%`;
          const tk = Math.floor(t / 70);
          if (tk !== ticks && k < 0.85) { ticks = tk; audio.tick(tk % 6); }
        } },
        { at: tLuck + R.luck, fn: () => {
          $('luck-marker').style.left = `${L.roll * 100}%`;
          if (ups) {
            $('rv-luck').className = 'won';
            $('luck-label').innerHTML = `<b>RANK UP!</b> ${RARITY_NAME[L.tier]} → ${RARITY_NAME[u.rarity]}`;
          } else {
            $('rv-luck').className = 'lost';
            $('luck-label').innerHTML = `No luck: stays ${RARITY_NAME[L.tier]}`;
          }
        } },
        ...Array.from({ length: ups }, (_, k) => ({ at: tLuck + R.luck + k * R.rollPerTier, fn: () => { audio.upgrade(L.tier + k + 1); flash(RARITY_HEX[L.tier + k + 1], 0.45); setTier(L.tier + k + 1, true); drawMeter(Math.min(5, L.tier + k + 1.5), L.tier + k + 1, true); } })),
      ] : []),
      { at: tRoll, fn: () => { ticks = -1; } },
      { at: tRoll, frame: (t) => {
        if (scoring.length < 2) { picked.el.classList.add('chosen'); return; }
        const k = clamp01(t / R.pick);
        const hops = 6 + scoring.length;
        const n = Math.floor((1 - (1 - k) ** 2) * hops);
        const idx = scoring.indexOf(picked);
        const at = k >= 1 ? idx : (idx - hops + n + scoring.length * 10) % scoring.length;
        scoring.forEach((f, i) => f.el.classList.toggle('chosen', i === at));
        if (n !== ticks) { ticks = n; audio.pick(); }
      } },
      { at: tPick, fn: () => { for (const f of flyers) if (f !== picked) f.el.classList.add('gone'); audio.rise(u.rarity); } },
      // The unit card is born: it grows out of the picked card.
      { at: tLand, fn: () => {
        rv.innerHTML = '';
        const army = armyForFight(st);
        let el;
        if (L.hero) {
          const fh = createFight(data, { ...army, heroes: [L.hero.cls, ...army.heroes.filter((h) => h !== L.hero.cls)].slice(0, 2) }, st.roundIndex, 0).units.find((x) => x.id === 'h0');
          el = unitCard(fh);
          el.classList.add('herobirth');
          flash('#ffd35a', 0.8);
        } else {
          const idx = army.units.indexOf(u);
          const fu = createFight(data, army, st.roundIndex, 0).units.find((x) => x.id === `p${idx}`);
          el = unitCard(fu, unitPower(data, army, st.roundIndex, idx));
        }
        el.classList.add('born');
        $('rv-newborn').appendChild(el);
        if (high) flash(RARITY_HEX[u.rarity], u.rarity === 4 ? 0.7 : 0.45);
        audio.land(u.rarity);
        if (L.hero) { $('rv-tier').textContent = 'HERO!'; $('rv-tier').className = 'rar-legendary up pop'; $('rv-unit').innerHTML = L.hero.own || st.phase !== 'choose' ? heroOutcome(L.hero) : `<b class="herotext">${data.heroes[L.hero.cls].name} answers the call!</b> The hand was free.`; return; }
        $('rv-unit').innerHTML = `${data.classes[u.cls].mechanic}${u.bonus ? ` + bonus <b class="bonusname">${data.bonuses[u.cls][u.bonus].name}</b>: ${data.bonuses[u.cls][u.bonus].text}` : ' (number card: no bonus)'}`;
      } },
      { at: tLand + R.settle, fn: () => { if (st.phase === 'choose' && st.choice.kind === 'hero') showChoice(); else join(); } },
    ];
    startTimeline(steps, null);
  }

  function drawMeter(pos, tier, hot) {
    $('rv-needle').style.left = `${(Math.min(5, pos) / 5) * 100}%`;
    for (const [i, el] of [...$('rv-meter').querySelectorAll('.seg')].entries()) {
      el.classList.toggle('lit', i <= tier);
      el.classList.toggle('hot', hot && i === tier);
    }
  }
  function flash(color, amount) {
    $('flash').style.background = `radial-gradient(circle at 50% 60%, ${color}cc, ${color}00 70%)`;
    flashLeft = amount;
  }

  // The newborn joins the army; the power numbers update.
  function join() {
    setMode('hop');
    audio.hop();
    drawBoard();
    if (!st.last?.hero) cardEls.get(`p${st.kept.length + st.army.length - 1}`)?.classList.add('born');
    $('army').classList.remove('bump');
    void $('army').offsetWidth;
    $('army').classList.add('bump');
    startTimeline([{ at: data.reveal.hop, fn: () => {
      $('rv-newborn').innerHTML = '';
      drawHand(st.hand.map((c) => c.id).filter((x) => !pendingReveal.before.has(x)));
    } }], st.phase === 'fight' ? 'ready' : 'play');
  }

  // ---- The fight: cards trading hits ----
  function startFight() {
    audio.unlock();
    fight = st.fight;
    drawBoard();
    hudEl.classList.add('fighting');
    fightAcc = 0;
    $('fight-log').hidden = false;
    logStart();
    setMode('fight');
  }
  const unitOf = (id) => fight.units.find((u) => u.id === id);
  // A readable log of what matters in the fight.
  const nameOf = (id) => { const u = unitOf(id); if (!u) return id; return u.side === 'e' ? u.name : u.hero ? u.name : `${rankLabel(u.rank)}${SUIT_SYMBOL[u.suit]} ${data.classes[u.cls].name}`; };
  function logLine(html, cls = '') {
    const el = $('fight-log');
    const row = document.createElement('div');
    row.className = cls;
    row.innerHTML = `<i>${fight.time.toFixed(1)}s</i> ${html}`;
    el.prepend(row);
    while (el.children.length > 14) el.lastChild.remove();
  }
  function logStart() {
    $('fight-log').innerHTML = '';
    const mine = fight.units.filter((u) => u.side === 'p');
    const notes = [];
    const armor = mine.find((u) => u.cls !== 'knight')?.armor ?? 0;
    if (armor > 0) notes.push(`every ally has at least ${armor.toFixed(1)} Armor (Ortha / Chivalry)`);
    const sh = mine[0]?.shield ?? 0;
    if (sh > 0) notes.push(`every ally starts with a ${Math.round(sh)} Shield (Guardian / Morning Prayer)`);
    for (const u of mine) if (u.banner) notes.push(`${nameOf(u.id)}'s Banner: ${data.classes[u.cls].name}s hit ${Math.round(u.banner * 100)}% harder`);
    if (notes.length) logLine(`<b>Before the first blow:</b> ${notes.join('; ')}.`, 'note');
  }
  function handleEvent(ev, quiet) {
    if (ev.type === 'end') return;
    if (!quiet) {
      const side = (id) => unitOf(id)?.side === 'p' ? 'me' : 'foe';
      if (ev.type === 'down') logLine(`<b>${nameOf(ev.who)}</b> falls to ${nameOf(ev.by)}`, side(ev.who) === 'me' ? 'bad' : 'good');
      else if (ev.type === 'attack' && ev.crit) logLine(`${nameOf(ev.who)} <b>crits</b> ${nameOf(ev.target)} for ${ev.hits[0]?.[1] ?? ''}`, side(ev.who) === 'me' ? 'good' : 'bad');
      else if (ev.type === 'attack' && ev.hits.length > 1) logLine(`${nameOf(ev.who)} splashes ${ev.hits.length} enemies`, side(ev.who) === 'me' ? 'good' : 'bad');
      else if (ev.type === 'jump') logLine(`Burn jumps from ${nameOf(ev.who)} to ${nameOf(ev.target)} (Vey)`, 'good');
      else if (ev.type === 'thorn') logLine(`${nameOf(ev.who)}'s broken Shield hits ${nameOf(ev.target)} back for ${ev.amount}`, side(ev.who) === 'me' ? 'good' : 'bad');
      else if (ev.type === 'shield' && side(ev.who) === 'me' && ev.amount >= 20) logLine(`${nameOf(ev.who)} shields ${nameOf(ev.target)} for ${ev.amount}${ev.heal ? ` and heals ${ev.heal}` : ''}`, 'good');
    }
    if (ev.type === 'down') { cardEls.get(ev.who)?.classList.add('down'); if (!quiet) audio.down(); return; }
    if (quiet) return;
    if (ev.type === 'dot') { floater(ev.target, `-${ev.amount}`, ev.burn ? 'burn' : 'poison'); return; }
    if (ev.type === 'jump') { floater(ev.target, 'Burn jumps!', 'burn'); return; }
    if (ev.type === 'thorn') { floater(ev.target, `-${ev.amount} thorns`, 'crit'); return; }
    const who = unitOf(ev.who);
    const el = cardEls.get(ev.who);
    if (el && who) { el.classList.remove('strike', 'strike-up'); void el.offsetWidth; el.classList.add(who.side === 'p' ? 'strike-up' : 'strike'); }
    if (ev.type === 'attack') {
      for (const [id, dmg] of ev.hits) floater(id, `-${dmg}${ev.crit ? '!' : ''}`, ev.crit ? 'crit' : 'dmg');
      audio.hit(ev.crit);
    } else if (ev.type === 'shield') {
      floater(ev.target, `+${ev.amount} shield${ev.heal ? ` +${ev.heal}` : ''}`, 'heal');
      audio.heal();
    }
  }
  function floater(id, text, cls) {
    const el = cardEls.get(id);
    if (!el || floaters.length > 50) return;
    const f = document.createElement('span');
    f.className = `floater ${cls}`;
    f.textContent = text;
    el.appendChild(f);
    floaters.push({ el: f, t: 0 });
  }
  function drawHp() {
    for (const u of fight.units) {
      const el = cardEls.get(u.id);
      if (!el) continue;
      el.querySelector('.hp i').style.width = `${(100 * Math.max(0, u.hp)) / u.maxHp}%`;
      el.querySelector('.hpn').textContent = Math.max(0, Math.round(u.hp));
      el.classList.toggle('shielded', u.shield > 0);
      el.classList.toggle('burning', !!u.burning);
    }
  }
  let topId = null;
  function markTop() {
    const t = topUnit(fight);
    if (t && t.id !== topId) {
      if (topId) cardEls.get(topId)?.classList.remove('top');
      topId = t.id;
      cardEls.get(topId)?.classList.add('top');
    }
  }
  function skipFight() {
    skipped = true;
    while (!fight.result) for (const ev of stepFight(data, fight)) handleEvent(ev, true);
    drawHp();
    endFight();
  }
  function endFight() {
    if (mode === 'end') return;
    setMode('end');
    markTop();
    const t = topUnit(fight);
    const mine = fight.units.filter((u) => u.side === 'p');
    const tot = mine.reduce((s, u) => s + u.dealt + u.healed, 0) || 1;
    const timeout = fight.events.at(-1).timeout;
    $('sq-result').textContent = fight.result === 'win' ? 'Victory' : 'Defeat';
    $('sq-result').className = fight.result;
    const desc = t.hero ? `${t.name} (hero)` : `${RARITY_NAME[t.rarity]} ${rankLabel(t.rank)}${SUIT_SYMBOL[t.suit]} ${data.classes[t.cls].name}`;
    $('sq-mvp').innerHTML = `Carried by <b>${desc}</b>: ${Math.round((100 * (t.dealt + t.healed)) / tot)}% of your army's work · ${fight.time.toFixed(1)} s${timeout ? ' (time ran out: decided on health left)' : ''}${fight.result === 'lose' ? '<br><b>The run is over.</b>' : `<br>Gold: win ${data.gold.win} + unused discards ${st.discardsLeft}${run.bounties.filter((b) => bountyMet(data, b, st, fight)).map((b) => ` + bounty ${b.gold}`).join('')}`}`;
    drawBoard();
    const rows = mine.slice().sort((a, b) => b.dealt + b.healed - (a.dealt + a.healed)).slice(0, 6);
    $('sq-mvp').innerHTML += `<table class="dmg">${rows.map((u) => `<tr><td>${nameOf(u.id)}${u.traits?.length ? ` <small>${u.traits.map((t) => data.traits[t].name).join('+')}</small>` : ''}</td><td>${Math.round(u.dealt)} dmg</td><td>${u.healed ? `${Math.round(u.healed)} shield` : ''}</td><td><i style="width:${Math.round((100 * (u.dealt + u.healed)) / tot)}px"></i></td></tr>`).join('')}</table>`;
    $('sq-end').hidden = false;
    if (fight.result === 'win') audio.win(); else audio.lose();
  }

  // ---- After the fight: keep one, then a relic (after a win) ----
  function afterFight() {
    runAct(run, { type: 'resolve' });
    $('sq-end').hidden = true;
    if (run.phase === 'over') return showOver();
    setMode('keep');
    hudEl.classList.remove('fighting');
    $('keep').hidden = false;
    const army = armyForFight(st);
    const f = createFight(data, army, st.roundIndex, 0);
    const opts = $('keep-opts');
    opts.innerHTML = '';
    st.army.forEach((u, i) => {
      const idx = st.kept.length + i;
      const el = unitCard(f.units.find((x) => x.id === `p${idx}`), unitPower(data, army, st.roundIndex, idx));
      el.classList.add('keep-opt');
      el.dataset.id = u.id;
      el.onclick = () => keep(u.id);
      opts.appendChild(el);
    });
  }
  function keep(id) {
    if (mode !== 'keep') return;
    runAct(run, { type: 'keep', id });
    $('keep').hidden = true;
    audio.hop();
    showShop();
  }

  // ---- The shop: rites, doctrines, hero talents, relics; reroll; leave ----
  const SHELF = { rite: 'Rite', doctrine: 'Doctrine', talent: 'Hero talent', relic: 'Relic' };
  function itemText(it) {
    if (it.shelf === 'rite') return [data.rites[it.id].name, data.rites[it.id].text];
    if (it.shelf === 'doctrine') { const l = run.doctrines[it.id] ?? 1; const tr = data.traitOf[it.id].map((t) => data.traits[t].name).join(' + '); return [`${HAND_NAMES[it.id]} Lv ${l + 1}`, `+${data.doctrine.chips} chips, +${data.doctrine.mult} mult${tr ? `; ${tr} stronger` : ''}`]; }
    if (it.shelf === 'talent') { const t = data.talents[it.id]; return [t.name, `${data.heroes[t.hero].name}: ${t.text}`]; }
    const r = data.relics[it.id];
    const heroCls = run.heroes.map((h) => data.heroes[h].cls);
    return [r.name, `${r.text}${heroCls.includes(r.cls) ? ' (matches your hero)' : ''}`];
  }
  function showShop() {
    setMode('shop');
    $('shop').hidden = false;
    $('rite').hidden = true;
    $('shop-gold').textContent = `${run.gold} (incl. +${data.gold.beforeShop} shop stipend)`;
    $('shop-items').innerHTML = run.shop.items.map((it) => {
      const [name, text] = itemText(it);
      return `<button class="shop-item shelf-${it.shelf}${it.sold ? ' sold' : ''}" data-slot="${it.slot}" ${it.sold || it.price > run.gold ? 'disabled' : ''}><span class="tag">${SHELF[it.shelf]}</span><b>${name}</b><span>${text}</span><span class="price">${it.sold ? 'bought' : `${it.price}g`}</span></button>`;
    }).join('');
    for (const el of $('shop-items').querySelectorAll('.shop-item')) el.onclick = () => buy(Number(el.dataset.slot));
    $('reroll').textContent = `Reroll (${run.shop.rerollPrice}g)`;
    $('reroll').disabled = run.gold < run.shop.rerollPrice;
    drawBoard();
  }
  function buy(slot) {
    if (mode !== 'shop') return;
    runAct(run, { type: 'buy', slot });
    audio.upgrade(2);
    if (run.phase === 'rite') showRite();
    else showShop();
  }
  $('reroll').onclick = () => { if (mode === 'shop' && run.gold >= run.shop.rerollPrice) { runAct(run, { type: 'reroll' }); audio.whoosh(); showShop(); } };
  $('leave-shop').onclick = () => { if (mode !== 'shop') return; runAct(run, { type: 'leave' }); $('shop').hidden = true; if (run.phase === 'over') return showOver(); startRound(); };

  // A rite: 8 cards dealt from the deck; choose among them (Echo: the first pick is copied).
  let ritePicks = [];
  function showRite() {
    setMode('rite');
    ritePicks = [];
    $('shop').hidden = true;
    $('rite').hidden = false;
    const r = data.rites[run.rite.key];
    $('rite-title').textContent = r.name;
    $('rite-text').textContent = r.kind === 'echo' ? 'Pick the card to copy first, then up to 2 cards to turn into it.' : `Pick ${r.text}.`;
    drawRite();
  }
  function drawRite() {
    const box = $('rite-cards');
    box.innerHTML = '';
    for (const id of run.rite.deal) {
      const c = run.deck.find((x) => x.id === id);
      const el = cardElement(c, c.rarity != null ? RARITIES[c.rarity] : null);
      el.classList.add('rite-card');
      const i = ritePicks.indexOf(id);
      if (i >= 0) { el.classList.add('sel'); el.dataset.order = i + 1; }
      el.onclick = () => toggleRite(id);
      box.appendChild(el);
    }
    $('rite-done').textContent = ritePicks.length ? `Apply to ${ritePicks.length} card${ritePicks.length > 1 ? 's' : ''}` : 'Skip (no cards)';
  }
  function toggleRite(id) {
    if (mode !== 'rite') return;
    const max = data.rites[run.rite.key].max;
    ritePicks = ritePicks.includes(id) ? ritePicks.filter((x) => x !== id) : ritePicks.length < max ? [...ritePicks, id] : ritePicks;
    audio.select();
    drawRite();
  }
  $('rite-done').onclick = () => { if (mode !== 'rite') return; runAct(run, { type: 'rite', picks: ritePicks }); audio.upgrade(1); showShop(); };

  function showOver() {
    setMode('over');
    hudEl.classList.remove('fighting');
    for (const id of ['sq-end', 'keep', 'shop', 'rite']) $(id).hidden = true;
    $('board').hidden = true;
    $('bottom').hidden = true;
    $('run-over').hidden = false;
    $('ro-title').textContent = run.won ? 'Run cleared!' : 'Run over';
    $('ro-title').className = run.won ? 'win' : 'lose';
    $('ro-sum').innerHTML = `${run.history.map((h) => `R${h.round} ${h.result === 'win' ? '✔' : '✘'}`).join(' · ')}<br>Heroes: ${run.heroes.map((h) => data.heroes[h].name).join(' + ')} · kept ${run.kept.length} units · relics: ${run.relics.map((k) => data.relics[k].name).join(', ') || 'none'} · talents: ${run.talents.map((k) => data.talents[k].name).join(', ') || 'none'} · gold left ${run.gold}`;
    if (run.won) audio.win(); else audio.lose();
  }

  // Hover tooltips: any element with data-tip.
  const tip = $('tip');
  hudEl.onmouseover = (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    tip.style.left = `${Math.min(innerWidth - 300, Math.max(4, r.left))}px`;
    tip.style.top = `${r.bottom + 6 + 160 > innerHeight ? r.top - 6 - tip.offsetHeight : r.bottom + 6}px`;
  };
  hudEl.onmouseleave = () => { tip.hidden = true; };

  drawHeroPick();
  setMode('heroes');

  return {
    update(dtMs) {
      runTimeline(dtMs);
      for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t += dtMs; a.frame(clamp01(a.t / a.dur)); if (a.t >= a.dur) anims.splice(i, 1); }
      if (mode === 'fight' && !fight.result) {
        const tickMs = data.fight.tick * 1000;
        fightAcc += dtMs * speed;
        let n = 0;
        while (fightAcc >= tickMs && !fight.result) { fightAcc -= tickMs; for (const ev of stepFight(data, fight)) handleEvent(ev, false); n++; }
        if (n) { drawHp(); markTop(); }
        if (fight.result) startTimeline([{ at: data.reveal.endDelay, fn: endFight }], null);
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dtMs;
        f.el.style.transform = `translate(-50%, ${-f.t / 25}px)`;
        f.el.style.opacity = f.t < 500 ? 1 : 1 - (f.t - 500) / 300;
        if (f.t > 800) { f.el.remove(); floaters.splice(i, 1); }
      }
      if (flashLeft > 0) flashLeft = Math.max(0, flashLeft - dtMs / 900);
      $('flash').style.opacity = flashLeft;
    },
    // The next move as the screen offers it (the check taps the matching button).
    bot() {
      if (mode === 'heroes') return { type: 'heroes', picks: data.startHeroes.slice() };
      if (mode === 'ready') return { type: 'battle' };
      if (mode === 'fight') return { type: 'skip' };
      if (mode === 'end') return { type: 'continue' };
      if (['play', 'choose', 'keep', 'shop', 'rite'].includes(mode)) return greedy(run);
      return null;
    },
    state() {
      return {
        mode, runPhase: run.phase, choicesShown, round: st ? st.roundIndex + 1 : 0, gold: run.gold, bounties: run.bounties.map((b) => b.key), talents: run.talents.slice(), doctrines: { ...run.doctrines }, bought: run.bought.length, relics: run.relics.slice(), kept: run.kept.length, won: run.won,
        phase: st?.phase, reveals, selected: selected.slice(), hand: st ? st.hand.map((c) => c.id) : [],
        handsLeft: st?.handsLeft, discardsLeft: st?.discardsLeft,
        army: st ? st.army.map((u) => `${RARITY_NAME[u.rarity]} ${cardName(u)} ${data.classes[u.cls].name}${u.bonus ? ` (${data.bonuses[u.cls][u.bonus].name})` : ''}`) : [], power,
        lastReveal, roundDigest: st ? roundDigest(st) : null, speed, skipped,
        runDigest: digest(run.log), historyDigest: digest(run.history.map((h) => [h.result, h.time, h.fight.events.length, digest(h.fight.events)])),
        fight: fight ? { time: fight.time, result: fight.result, events: fight.events.length, digest: `${fight.events.length} events ${digest(fight.events)}` } : null,
      };
    },
    dispose() {
      hudEl.hidden = true;
      hudEl.classList.remove('fighting');
      timeline = null;
      for (const id of ['run-over', 'keep', 'shop', 'rite', 'hero-pick', 'choice']) $(id).hidden = true;
      $('board').hidden = false;
      $('bottom').hidden = false;
    },
  };
}
