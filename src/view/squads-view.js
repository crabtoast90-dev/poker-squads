// One round on screen, all cards: the hand, the odds, the birth reveal, the squad pick and
// the fight (cards trading hits with health bars). No rules here: every outcome comes from
// the sim (src/squads/); this file stages it on the game clock, so test runs repeat exactly.
import { RARITIES, CLASS_OF } from '../squads/data.js';
import { createRound, act, preview, squadsForFight, roundDigest } from '../squads/sim.js';
import { createFight, stepFight, topUnit } from '../squads/fight.js';
import { greedy } from '../squads/bots.js';
import { digest } from '../squads/rng.js';
import { cardElement, cardName, SUIT_SYMBOL, SUIT_COLOR, rankLabel } from './cards.js';

const RARITY_NAME = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const RARITY_HEX = ['#b8c0c8', '#4cc26a', '#3d8bff', '#a65cff', '#ffb627'];
const CLASS_SUIT = { knight: 'S', priestess: 'H', witch: 'C', rogue: 'D' };
const SKELETON_NAME = { warrior: 'Bone Warrior', minion: 'Bone Minion', rogue: 'Bone Stalker', mage: 'Bone Caster', boss: 'Bone King' };
const ease = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const pct = (p) => `${Math.round(p * 100)}%`;

export function createSquadsView({ data, seed, audio, $, top, onRestart }) {
  const st = createRound(data, seed, { top });
  const hudEl = $('sq-hud');
  let mode = 'play'; // play | discard | reveal | choose | hop | ready | fight | end
  let selected = [];
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
  const floaters = [];
  const cardEls = new Map(); // fight unit id -> element

  hudEl.hidden = false;
  for (const id of ['sq-end', 'reveal', 'choose', 'battle', 'fight-ctl']) $(id).hidden = true;
  $('again').onclick = onRestart;
  st.heroes.forEach((key, s) => { $(`to-squad-${s}`).querySelector('b').textContent = data.heroes[key].name; });

  // ---- Unit cards ----
  function unitCard(u) {
    const el = document.createElement('div');
    const suit = u.side === 'e' ? null : u.suit ?? CLASS_SUIT[u.cls];
    el.className = `ucard${u.hero ? ' hero' : ''}${u.side === 'e' ? ' enemy' : ''}${u.rarity != null && !u.hero ? ` rar-${RARITIES[u.rarity]}` : ''}`;
    if (suit) el.style.setProperty('--suit', SUIT_COLOR[suit]);
    const head = u.side === 'e' ? `<b class="rk">☠</b>` : u.hero ? `<b class="rk">♛${SUIT_SYMBOL[suit]}</b>` : `<b class="rk">${rankLabel(u.rank)}${SUIT_SYMBOL[suit]}</b>`;
    const name = u.side === 'e' ? SKELETON_NAME[u.name] : u.hero ? u.name : `${RARITY_NAME[u.rarity]} ${data.classes[u.cls].name}`;
    const ab = u.side !== 'e' && !u.hero && u.ability ? `<em>${data.abilities[u.cls].name}</em>` : '';
    el.innerHTML = `${head}<span class="nm">${name}</span>${ab}<span class="st">♥ <b class="hpn">${u.hp}</b> ⚔ ${u.atk.toFixed(0)}</span><span class="hp"><i></i></span>`;
    return el;
  }
  // The board: both sides as the fight would line them up right now.
  function drawBoard() {
    const f = fight ?? createFight(data, squadsForFight(st), st.roundIndex, 0);
    cardEls.clear();
    for (const side of ['p', 'e']) for (const s of [0, 1]) {
      const box = $(`${side === 'p' ? 'squad' : 'foes'}-${s}-cards`);
      box.innerHTML = '';
      for (const u of f.units.filter((x) => x.side === side && x.squad === s)) {
        const el = unitCard(u);
        box.appendChild(el);
        cardEls.set(u.id, el);
      }
      if (side === 'p') for (let i = st.squads[s].length; i < data.round.squadSize; i++) {
        const e = document.createElement('div');
        e.className = 'ucard empty';
        e.textContent = 'open slot';
        box.appendChild(e);
      }
    }
    for (const s of [0, 1]) {
      $(`squad-${s}`).classList.toggle('full', st.squads[s].length >= data.round.squadSize);
      $(`to-squad-${s}`).disabled = st.squads[s].length >= data.round.squadSize;
      $(`to-squad-${s}`).querySelector('span').textContent = `${st.squads[s].length}/${data.round.squadSize}`;
    }
    $('hands-left').textContent = st.handsLeft;
    $('discards-left').textContent = st.discardsLeft;
    $('units-made').textContent = `${st.squads[0].length + st.squads[1].length}/${data.round.squadSize * 2}`;
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
    const cards = selected.map((id) => st.hand.find((c) => c.id === id)).filter(Boolean);
    const pv = cards.length ? preview(data, cards) : null;
    $('play').disabled = mode !== 'play' || !pv || st.handsLeft <= 0;
    $('discard').disabled = mode !== 'play' || !pv || st.discardsLeft <= 0;
    $('odds').classList.toggle('empty', !pv);
    if (!pv) {
      $('odds-hand').textContent = 'Pick up to 5 cards';
      $('odds-score').textContent = '';
      $('odds-class').innerHTML = '';
      $('odds-rarity').innerHTML = '';
      return;
    }
    $('odds-hand').textContent = pv.name;
    $('odds-score').innerHTML = `<b class="chips">${pv.chips}</b> × <b class="mult">${pv.mult}</b> = <b>${pv.score}</b>`;
    $('odds-class').innerHTML = Object.entries(pv.classOdds).sort((a, b) => b[1] - a[1])
      .map(([suit, p]) => `<span class="co" style="--suit:${SUIT_COLOR[suit]}"><i>${SUIT_SYMBOL[suit]}</i>${data.classes[CLASS_OF[suit]].name} ${pct(p)}</span>`).join('');
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
    $('choose').hidden = m !== 'choose';
    $('battle').hidden = m !== 'ready';
    $('fight-ctl').hidden = m !== 'fight';
    $('reveal').hidden = !(m === 'reveal' || m === 'choose' || m === 'hop');
    for (const s of [0, 1]) $(`squad-${s}`).classList.toggle('pickable', m === 'choose' && st.squads[s].length < data.round.squadSize);
    drawOdds();
  }

  $('play').onclick = () => { if (mode === 'play' && selected.length) play(); };
  $('discard').onclick = () => { if (mode === 'play' && selected.length) discard(); };
  $('to-squad-0').onclick = () => assign(0);
  $('to-squad-1').onclick = () => assign(1);
  $('squad-0').onclick = () => assign(0);
  $('squad-1').onclick = () => assign(1);
  $('battle').onclick = () => { if (mode === 'ready') startFight(); };
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; $('speed').textContent = `${speed}x`; };
  $('skip').onclick = () => { if (mode === 'fight') skipFight(); };

  function discard() {
    audio.unlock();
    const ids = selected.slice();
    const before = new Set(st.hand.map((c) => c.id));
    act(st, { type: 'discard', ids });
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
    act(st, { type: 'play', ids });
    selected = [];
    const L = st.last;
    const u = L.unit;
    const auto = st.lastAssign?.unit === u.id && st.lastAssign.auto;
    reveals++;
    lastReveal = { hand: L.hand, score: L.score, tier: L.tier, rarity: u.rarity, unit: `${RARITY_NAME[u.rarity]} ${cardName(u)} ${data.classes[u.cls].name}`, auto };
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
    const tRoll = tCount + R.rollBase + R.rollPerTier * ups;
    const tPick = tRoll + (scoring.length > 1 ? R.pick : 160);
    const tLand = tPick + R.drop + (high ? R.dropHighExtra : 0);
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
      { at: tCount, frame: (t) => {
        const sweep = R.rollBase * 0.7;
        if (t < sweep) {
          const pos = target * ease(clamp01(t / sweep));
          const tk = Math.floor(pos * 4);
          if (tk > ticks) { ticks = tk; audio.tick(tk); }
          drawMeter(pos, Math.min(4, Math.floor(pos)), false);
        } else if (t < R.rollBase) drawMeter(target, L.tier, false);
        else {
          const extra = Math.min(ups, Math.floor((t - R.rollBase) / R.rollPerTier) + 1);
          drawMeter(ups ? Math.min(5, Math.max(target, L.tier + extra)) : target, ups ? L.tier + extra : L.tier, ups > 0);
        }
      } },
      ...Array.from({ length: ups }, (_, k) => ({ at: tCount + R.rollBase + k * R.rollPerTier, fn: () => { audio.upgrade(L.tier + k + 1); flash(RARITY_HEX[L.tier + k + 1], 0.35); setTier(L.tier + k + 1, true); } })),
      { at: tCount + R.rollBase, fn: () => { if (!ups) setTier(u.rarity, false); } },
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
        const el = unitCard(createFight(data, [{ hero: st.heroes[0], units: [u] }, { hero: st.heroes[1], units: [] }], 0, 0).units[1]);
        el.classList.add('born');
        $('rv-newborn').appendChild(el);
        if (high) flash(RARITY_HEX[u.rarity], u.rarity === 4 ? 0.7 : 0.45);
        audio.land(u.rarity);
        $('rv-unit').innerHTML = u.ability ? `Ability: <i>${data.abilities[u.cls].name}</i>` : 'Plain body (no ability)';
      } },
      { at: tLand + R.settle, fn: () => {
        if (auto) {
          const s = st.squads[0].includes(u) ? 0 : 1;
          $('rv-unit').innerHTML += ` · squad full: joins ${data.heroes[st.heroes[s]].name}`;
          hop(s);
        } else setMode('choose');
      } },
    ];
    startTimeline(steps, null);
    pendingReveal = { before };
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

  function assign(s) {
    if (mode !== 'choose' || st.squads[s].length >= data.round.squadSize) return;
    audio.unlock();
    act(st, { type: 'assign', squad: s });
    hop(s);
  }
  function hop(s) {
    setMode('hop');
    audio.hop();
    drawBoard();
    $(`squad-${s}`).classList.remove('bump');
    void $(`squad-${s}`).offsetWidth;
    $(`squad-${s}`).classList.add('bump');
    const newest = cardEls.get(`p${s}${st.squads[s].length - 1}`);
    newest?.classList.add('born');
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
    setMode('fight');
  }
  const unitOf = (id) => fight.units.find((u) => u.id === id);
  function handleEvent(ev, quiet) {
    if (ev.type === 'end') return;
    if (ev.type === 'down') { cardEls.get(ev.who)?.classList.add('down'); if (!quiet) audio.down(); return; }
    if (quiet) return;
    const who = unitOf(ev.who);
    const el = cardEls.get(ev.who);
    if (el) { el.classList.remove('strike', 'strike-up'); void el.offsetWidth; el.classList.add(who.side === 'p' ? 'strike-up' : 'strike'); }
    if (ev.type === 'attack' || ev.type === 'skill') {
      for (const [id, dmg] of ev.hits ?? []) floater(id, `-${dmg}`, ev.crit || ev.type === 'skill' ? 'crit' : 'dmg');
      if (ev.type === 'skill') floater(ev.who, ev.name, 'skillname');
      if (ev.targets) for (const id of ev.targets) floater(id, ev.name === 'Bulwark' ? '+shield' : '+heal', 'heal');
      audio.hit(ev.crit);
    } else if (ev.type === 'heal') {
      floater(ev.target, `+${ev.amount}`, 'heal');
      audio.heal();
    }
  }
  function floater(id, text, cls) {
    const el = cardEls.get(id);
    if (!el || floaters.length > 40) return;
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
      el.querySelector('.hpn').textContent = Math.max(0, u.hp);
      el.classList.toggle('shielded', u.shield > 0);
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
    $('sq-result').textContent = fight.result === 'win' ? 'Victory' : 'Defeat';
    $('sq-result').className = fight.result;
    const desc = t.hero ? `${t.name} (hero)` : `${RARITY_NAME[t.rarity]} ${rankLabel(t.rank)}${SUIT_SYMBOL[t.suit]} ${data.classes[t.cls].name}`;
    $('sq-mvp').innerHTML = `Carried by <b>${desc}</b>: ${Math.round((100 * (t.dealt + t.healed)) / tot)}% of your squads' work · ${fight.time.toFixed(1)} s`;
    $('sq-end').hidden = false;
    if (fight.result === 'win') audio.win(); else audio.lose();
  }

  drawBoard();
  drawHand();
  setMode('play');

  return {
    st,
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
    bot() {
      if (mode === 'play' || mode === 'choose') return greedy(st);
      if (mode === 'ready') return { type: 'battle' };
      return null;
    },
    state() {
      return {
        mode, phase: st.phase, reveals, selected: selected.slice(),
        hand: st.hand.map((c) => c.id), handsLeft: st.handsLeft, discardsLeft: st.discardsLeft,
        squads: st.squads.map((sq) => sq.map((u) => `${RARITY_NAME[u.rarity]} ${cardName(u)} ${data.classes[u.cls].name}`)),
        lastReveal, roundDigest: roundDigest(st), speed, skipped,
        fight: fight ? { time: fight.time, result: fight.result, events: fight.events.length, digest: `${fight.events.length} events ${digest(fight.events)}` } : null,
      };
    },
    dispose() {
      hudEl.hidden = true;
      hudEl.classList.remove('fighting');
      timeline = null;
    },
  };
}
