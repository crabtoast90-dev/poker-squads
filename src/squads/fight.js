// The fight: pure and deterministic. Your army (2 heroes + kept units + this round's 6)
// against one skeleton army. No placement: Knights and Rogues stand in front, Witches and
// Priestesses behind. Everyone hits the enemy front line until it falls; Rogues jump to the
// back line. Every unit carries its class mechanic (Armor, Burn, Shield, Crit) scaled by its
// power; face cards add a bonus; heroes and relics change the numbers. Player side z > 0.
import { makeRng } from './rng.js';

const R = (x) => Math.round(x * 1000) / 1000;
const H = (x) => Math.round(x * 100) / 100;

function lineUp(members, side, data) {
  const { rows, slotGap } = data.fight;
  const sign = side === 'p' ? 1 : -1;
  for (const row of ['front', 'back']) {
    const inRow = members.filter((m) => m.row === row);
    inRow.forEach((m, i) => {
      m.x = R((i - (inRow.length - 1) / 2) * slotGap);
      m.z = R(sign * rows[row]);
    });
  }
}

// One fighter with its class mechanic, face bonuses, hand trait, hero skills, relics and
// talents folded into its numbers.
function fighter(data, id, side, o, ctx) {
  const c = data.classes[o.cls];
  const ds = ctx.ds;
  const P = o.power;
  const bonuses = [o.bonus, o.bonus2].filter(Boolean);
  const bsum = (k) => bonuses.reduce((s, x) => s + (data.bonuses[o.cls][x][k] ?? 0), 0);
  const has = (r) => ctx.relics.includes(r);
  const hero = (k) => ctx.heroes.includes(k);
  // Hand trait strength: x (1 + perLevel x (doctrine level - 1)).
  const traits = o.traits ?? [];
  const tk = 1 + data.doctrine.traitPerLevel * ((ctx.doctrines[o.hand] ?? 1) - 1);
  const T = data.traits;
  const tr = (k) => traits.includes(k);
  const statMult = (tr('veteran') ? 1 + T.veteran.stats * tk : 1) * (tr('champion') ? 1 + T.champion.stats * tk : 1);
  const mech = tr('devout') ? 1 + T.devout.mech * tk : 1;
  const u = {
    id, side, cls: o.cls, row: c.row, name: o.name, hero: !!o.hero, rank: o.rank, suit: o.suit, rarity: o.rarity,
    power: P, bonus: o.bonus ?? null, bonuses, traits, hand: o.hand ?? null, kept: !!o.kept,
    maxHp: H(c.hp * P * (o.hpMult ?? 1) * statMult * (tr('sturdy') ? 1 + T.sturdy.hp * tk : 1)), shield: 0, alive: true,
    atk: c.atk * ds * P * (o.atkMult ?? 1) * statMult, interval: c.interval / (tr('swift') ? 1 + T.swift.speed * tk : 1), range: c.range, speed: c.speed,
    armor: 0, crit: 0, critMult: 2, burn: 0, burnFor: 0, shieldAmt: 0, shieldEvery: 0,
    banner: tr('banner') ? T.banner.dmg * tk : 0, guard: tr('guardian') ? T.guardian.shield * tk * ds * P : 0, dmgMult: 1,
    cd: 0.3 + (id.length % 3) * 0.15, shieldCd: 1.2, first: true, sureCrit: false,
    burning: null, poison: [], chill: 0, blessed: 0, dotAcc: 0, dotT: 0,
    x: 0, z: 0, target: null, dealt: 0, healed: 0,
  };
  u.hp = u.maxHp;
  if (o.cls === 'knight') u.armor = c.armor * ds * P * mech * (1 + bsum('armor')) * (has('knightPlate') ? 1 + data.relics.knightPlate.armor : 1);
  u.ownArmor = R(u.armor);
  if (o.cls === 'rogue') {
    u.crit = Math.min(0.9, (c.crit + bsum('crit') + (has('rogueEdge') ? data.relics.rogueEdge.crit : 0)) * mech);
    u.critMult = hero('rogue') ? data.heroes.rogue.critMult : c.critMult;
  }
  if (o.cls === 'witch') {
    u.burn = c.burn * ds * P * mech * (1 + bsum('burn')) * (hero('witch') ? 1 + data.heroes.witch.burn : 1);
    u.burnFor = c.burnFor * (has('witchKindle') ? data.relics.witchKindle.burnFor : 1);
  }
  if (o.cls === 'priestess') {
    u.shieldAmt = c.shield * ds * P * mech * (1 + bsum('shield')) * (has('priestWard') ? 1 + data.relics.priestWard.shield : 1);
    u.shieldEvery = c.shield ? c.shieldEvery : 0;
  }
  return u;
}

// Army-wide effects after everyone is built: Chivalry and Warden Ortha share Armor (talents
// can bend that), Banners lift their class's damage, Guardians and Morning Prayer shield all.
function armyAuras(data, list, ctx) {
  const tal = (k) => ctx.talents.includes(k);
  let shared = 0;
  let ortha = 0;
  for (const k of list) {
    if (k.cls === 'knight' && k.bonuses.includes('chivalry')) shared += k.armor * data.bonuses.knight.chivalry.share;
    if (!ctx.heroes.includes('knight')) continue;
    if (k.cls === 'knight') ortha += k.armor * data.heroes.knight.armorShare;
    if (k.cls === 'rogue' && tal('knightRogues')) ortha += data.classes.knight.armor * ctx.ds * k.power * data.heroes.knight.armorShare;
  }
  const guard = list.reduce((s, u) => s + u.guard, 0);
  const dawn = tal('priestDawn') ? data.talents.priestDawn.shield * ctx.ds * data.heroes.priestess.power : 0;
  for (const u of list) {
    u.armor = R(u.armor + shared + ortha * (tal('knightRear') && u.row === 'back' ? 2 : 1));
    u.dmgMult = 1 + list.reduce((s, b) => s + (b.banner && b.cls === u.cls ? b.banner : 0), 0);
    u.shield = H(Math.min(u.maxHp * data.fight.shieldCap, guard + dawn));
  }
}

// army: { heroes: [key, key], units: [unit, ...] (kept first), relics: [id, ...] }
export function createFight(data, army, roundIndex, seed) {
  // Damage grows each round so bigger late armies still finish in about 20 s.
  const ds = data.fight.damageScale * (1 + data.fight.damagePerRound * roundIndex);
  const ctx = { heroes: army.heroes, relics: army.relics ?? [], talents: army.talents ?? [], doctrines: army.doctrines ?? {}, ds };
  const mine = [];
  army.heroes.forEach((key, s) => {
    const h = data.heroes[key];
    mine.push(fighter(data, `h${s}`, 'p', { cls: h.cls, name: h.name, hero: true, power: h.power }, ctx));
  });
  army.units.forEach((u, i) => mine.push(fighter(data, `p${i}`, 'p', u, ctx)));
  armyAuras(data, mine, ctx);
  lineUp(mine, 'p', data);
  const er = data.enemyRounds[Math.min(roundIndex, data.enemyRounds.length - 1)];
  const ectx = { heroes: [], relics: [], talents: [], doctrines: {}, ds };
  const foes = er.units.map((k, i) => {
    const sk = data.skeletons[k];
    return fighter(data, `e${i}`, 'e', { cls: sk.cls, name: sk.name, bonus: sk.bonus, power: er.power * data.fight.enemyPower, hpMult: sk.hpMult, atkMult: sk.atkMult }, ectx);
  });
  armyAuras(data, foes, ectx);
  lineUp(foes, 'e', data);
  return { rng: makeRng(seed), units: [...mine, ...foes], ctx: { p: ctx, e: ectx }, time: 0, ticks: 0, result: null, events: [], gold: 0, talentCrit: data.talents.rogueSense.crit };
}

const alive = (f, side) => f.units.filter((u) => u.alive && u.side === side);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
function nearest(from, list) {
  let best = null;
  let bd = Infinity;
  for (const u of list) {
    const d = dist2(from, u);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
const sideHas = (f, side, relic) => f.ctx[side].relics.includes(relic);
const sideHero = (f, side, key) => f.ctx[side].heroes.includes(key);
const sideTalent = (f, side, key) => f.ctx[side].talents.includes(key);
const other = (side) => (side === 'p' ? 'e' : 'p');
// Smell of Smoke: Rogues gain Crit for each burning enemy.
function critChance(f, u) {
  if (!sideTalent(f, u.side, 'rogueSense')) return u.crit;
  const burning = f.units.filter((e) => e.alive && e.side !== u.side && e.burning).length;
  return Math.min(0.95, u.crit + burning * f.talentCrit);
}

// Who u attacks: a Taunt in reach first; Rogues the back line; everyone else the front line
// until it falls (an army with no front line has its back line hit from the start).
function pickTarget(data, f, u, foes) {
  const tr = data.bonuses.knight.taunt.radius;
  const taunts = foes.filter((e) => e.bonuses.includes('taunt') && dist2(u, e) <= tr * tr);
  if (taunts.length) return nearest(u, taunts);
  const cur = u.target && foes.find((e) => e.id === u.target);
  const front = foes.filter((e) => e.row === 'front');
  const back = foes.filter((e) => e.row === 'back');
  const pool = u.cls === 'rogue' ? (back.length ? back : front) : front.length ? front : back;
  if (u.cls === 'witch' && u.burn) {
    // Witches spread Burn: once their target burns at least as hot, move to one that doesn't.
    const fresh = pool.filter((e) => !e.burning || e.burning.dps < u.burn || e.burning.left < 1);
    if (cur && fresh.includes(cur)) return cur;
    if (fresh.length) return nearest(u, fresh);
  }
  if (cur && pool.includes(cur)) return cur;
  // A fresh target: one of the two nearest in the pool, by the fight's dice (fights stay a slope).
  const sorted = pool.slice().sort((a, b) => dist2(u, a) - dist2(u, b) || (a.id < b.id ? -1 : 1));
  return sorted[sorted.length > 1 && f.rng() < 0.4 ? 1 : 0];
}

// Damage that has already passed Armor (or ignores it): Shields soak first.
function wound(data, f, from, to, amount, out, kind) {
  if (!to.alive || amount <= 0) return 0;
  if (to.burning && sideHas(f, from.side, 'witchSear')) amount *= 1 + data.relics.witchSear.dmg;
  if (kind === 'hit' && to.cls === 'rogue' && sideTalent(f, to.side, 'rogueCover') && f.units.some((k) => k.alive && k.side === to.side && k.cls === 'knight')) amount *= 1 - data.talents.rogueCover.cut;
  amount = H(amount);
  const hadShield = to.shield;
  const soak = Math.min(to.shield, amount);
  to.shield = H(to.shield - soak);
  if (to.shield <= 0) to.blessed = 0;
  const real = Math.min(to.hp, amount - soak);
  to.hp = H(to.hp - real);
  from.dealt = H(from.dealt + real + soak);
  if (out) out.push([to.id, Math.round(amount)]);
  else to.dotAcc += amount;
  // Last Light: a Shield that breaks heals its holder.
  if (hadShield > 0 && to.shield <= 0 && to.hp > 0 && sideTalent(f, to.side, 'priestLight')) to.hp = H(Math.min(to.maxHp, to.hp + hadShield * data.talents.priestLight.heal));
  // Thorned Ward: a Shield that breaks hits back for its amount.
  if (hadShield > 0 && to.shield <= 0 && kind === 'hit' && sideHas(f, to.side, 'priestThorn') && from.alive) {
    wound(data, f, to, from, hadShield, null, 'thorn');
    f.events.push({ t: f.ticks, type: 'thorn', who: to.id, target: from.id, amount: Math.round(hadShield) });
  }
  if (to.hp <= 0 && to.alive) die(data, f, to, from, kind);
  return real + soak;
}

function die(data, f, u, by, kind = 'hit') {
  u.alive = false;
  f.events.push({ t: f.ticks, type: 'down', who: u.id, by: by.id });
  const friends = alive(f, u.side);
  // Hexmother Vey: a dying burning enemy passes its Burn to the nearest of its allies.
  if (u.burning && sideHero(f, u.side === 'p' ? 'e' : 'p', 'witch') && friends.length) {
    const next = nearest(u, friends);
    ignite(next, u.burning);
    f.events.push({ t: f.ticks, type: 'jump', who: u.id, target: next.id });
  }
  // Last Oath: a fallen Knight's Armor goes to its allies.
  if (u.cls === 'knight' && sideHas(f, u.side, 'knightOath')) for (const a of friends) a.armor = R(a.armor + u.ownArmor);
  // Killer's Mark and Shade Corvin: a Rogue kill.
  if (kind === 'hit' && by.cls === 'rogue' && by.side !== u.side && by.side === 'p' && sideTalent(f, 'p', 'rogueBounty')) f.gold += 1;
  if (kind === 'hit' && by.cls === 'rogue' && by.side !== u.side && by.alive) {
    if (sideHas(f, by.side, 'rogueMark')) by.sureCrit = true;
    if (sideHero(f, by.side, 'rogue')) by.cd = 0;
  }
}

// Armor takes a flat amount off each hit, but never more than armorCap of it.
const afterArmor = (data, dmg, t, f) => {
  const steel = f && t.cls === 'knight' && t.shield > 0 && sideTalent(f, t.side, 'priestSteel') ? 1 + data.talents.priestSteel.armor : 1;
  return Math.max(1, dmg * (1 - data.fight.armorCap), dmg - t.armor * steel);
};

// Burn: the stronger Burn stays (a weaker one only tops up the time left).
function ignite(t, burn) {
  if (!t.alive) return;
  if (!t.burning || burn.dps >= t.burning.dps) t.burning = { ...burn };
  else t.burning.left = Math.max(t.burning.left, burn.left);
}

function attack(data, f, u, t, foes) {
  const B = data.bonuses;
  let dmg = u.atk * (1 + (f.rng() * 2 - 1) * data.fight.spread);
  let crit = false;
  if (u.cls === 'rogue') {
    crit = u.sureCrit || (u.first && u.bonuses.includes('ambush')) || f.rng() < critChance(f, u);
    u.sureCrit = false;
    if (crit) dmg *= t.burning && sideTalent(f, u.side, 'witchCrit') ? Math.max(3, u.critMult * 1.5) : u.critMult; // Kindled Blades: triple, or 1.5x on top of Corvin's triple
  }
  u.first = false;
  dmg *= u.dmgMult;
  if (u.blessed) dmg *= 1 + u.blessed;
  if (u.shield > 0 && sideHero(f, u.side, 'priestess')) dmg *= 1 + data.heroes.priestess.shieldedDmg;
  const hits = [];
  wound(data, f, u, t, afterArmor(data, dmg, t, f), hits, 'hit');
  // Spiked Plate: allies with Armor reflect part of a hit.
  if (t.armor > 0 && u.alive && sideTalent(f, t.side, 'knightSpikes')) wound(data, f, t, u, dmg * data.talents.knightSpikes.reflect, null, 'thorn');
  if (u.cls === 'witch') {
    ignite(t, { dps: u.burn * (u.shield > 0 && sideTalent(f, u.side, 'witchWard') ? 1 + data.talents.witchWard.burn : 1), left: u.burnFor, from: u.id });
    if (u.bonuses.includes('chill') && t.alive) t.chill = B.witch.chill.for;
    if (u.bonuses.includes('splash')) {
      const r2 = B.witch.splash.radius ** 2;
      for (const e of foes) if (e !== t && e.alive && dist2(e, t) <= r2) wound(data, f, u, e, afterArmor(data, dmg * B.witch.splash.share, e, f), hits, 'hit');
    }
  }
  if (u.bonuses.includes('poison') && t.alive) {
    t.poison.push({ dps: B.rogue.poison.dps * f.ctx[u.side].ds * u.power, left: B.rogue.poison.for, from: u.id });
    if (t.poison.length > B.rogue.poison.max) t.poison.shift();
  }
  f.events.push({ t: f.ticks, type: 'attack', who: u.id, target: t.id, crit, hits });
}

function castShield(data, f, u, friends) {
  let low = null;
  for (const a of friends) if (!low || a.hp / a.maxHp < low.hp / low.maxHp) low = a;
  if (!low) return;
  const cap = low.maxHp * data.fight.shieldCap;
  const amt = H(Math.min(u.shieldAmt, Math.max(0, cap - low.shield)));
  low.shield = H(low.shield + amt);
  let heal = 0;
  if (u.bonuses.includes('mend')) { heal = H(Math.min(low.maxHp - low.hp, u.shieldAmt * data.bonuses.priestess.mend.heal)); low.hp = H(low.hp + heal); }
  if (u.bonuses.includes('bless')) low.blessed = data.bonuses.priestess.bless.dmg;
  u.healed = H(u.healed + amt + heal);
  f.events.push({ t: f.ticks, type: 'shield', who: u.id, target: low.id, amount: Math.round(amt), heal: Math.round(heal) });
}

export function stepFight(data, f) {
  if (f.result) return [];
  const dt = data.fight.tick;
  const start = f.events.length;
  f.ticks++;
  f.time = R(f.ticks * dt);
  // Damage over time (Burn, Poison) ignores Armor; reported once a second per target.
  for (const u of f.units) {
    if (!u.alive) continue;
    const src = (id) => f.units.find((x) => x.id === id);
    if (u.burning) {
      wound(data, f, src(u.burning.from), u, u.burning.dps * dt, null, 'dot');
      if (u.burning && (u.burning.left -= dt) <= 1e-9) u.burning = null;
    }
    for (const p of u.poison) if (u.alive) wound(data, f, src(p.from), u, p.dps * dt, null, 'dot');
    u.poison = u.poison.filter((p) => (p.left -= dt) > 1e-9);
    if (u.chill > 0) u.chill = Math.max(0, u.chill - dt);
    if ((u.dotT += dt) >= 1 - 1e-9) {
      u.dotT = 0;
      if (u.dotAcc >= 0.5) f.events.push({ t: f.ticks, type: 'dot', target: u.id, amount: Math.round(u.dotAcc), burn: !!u.burning });
      u.dotAcc = 0;
    }
  }
  for (const u of f.units) {
    if (!u.alive) continue;
    const foes = alive(f, u.side === 'p' ? 'e' : 'p');
    if (!foes.length) break;
    const smoke = u.burning && sideTalent(f, other(u.side), 'witchSmoke') ? data.talents.witchSmoke.slow : 0;
    u.cd -= dt / (1 + (u.chill > 0 ? data.bonuses.witch.chill.slow : 0) + smoke);
    if (u.shieldEvery) {
      u.shieldCd -= dt;
      if (u.shieldCd <= 0) { u.shieldCd = u.shieldEvery; castShield(data, f, u, alive(f, u.side)); }
    }
    const t = pickTarget(data, f, u, foes);
    if (!t) continue;
    u.target = t.id;
    const d = Math.sqrt(dist2(u, t));
    if (d > u.range) {
      const step = Math.min(u.speed * dt, d - u.range * 0.9);
      u.x = R(u.x + ((t.x - u.x) / d) * step);
      u.z = R(u.z + ((t.z - u.z) / d) * step);
    } else if (u.cd <= 0) {
      u.cd = u.interval;
      attack(data, f, u, t, foes);
    }
  }
  // Allies push apart so lines don't stack into one body.
  const sep = data.fight.separation;
  const live = f.units.filter((u) => u.alive);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (a.side !== b.side) continue;
      const d2 = dist2(a, b);
      if (d2 >= sep * sep) continue;
      const d = Math.sqrt(d2) || 0.001;
      const push = (sep - d) / 2;
      const nx = d2 ? (a.x - b.x) / d : 1;
      const nz = d2 ? (a.z - b.z) / d : 0;
      a.x = R(a.x + nx * push); a.z = R(a.z + nz * push);
      b.x = R(b.x - nx * push); b.z = R(b.z - nz * push);
    }
  }
  const p = alive(f, 'p');
  const e = alive(f, 'e');
  if (!e.length || !p.length || f.time >= data.fight.maxTime) {
    const share = (side) => { const all = f.units.filter((u) => u.side === side); return all.reduce((s, u) => s + Math.max(0, u.hp), 0) / all.reduce((s, u) => s + u.maxHp, 0); };
    f.result = !e.length ? 'win' : !p.length ? 'lose' : share('p') >= share('e') ? 'win' : 'lose';
    f.events.push({ t: f.ticks, type: 'end', result: f.result, time: f.time, timeout: !!(e.length && p.length) });
  }
  return f.events.slice(start);
}

export function runFight(data, army, roundIndex, seed) {
  const f = createFight(data, army, roundIndex, seed);
  while (!f.result) stepFight(data, f);
  return f;
}

// Who did the most: damage dealt plus shields and healing, per player unit.
export function topUnit(f) {
  let best = null;
  for (const u of f.units) if (u.side === 'p' && (!best || u.dealt + u.healed > best.dealt + best.healed)) best = u;
  return best;
}
