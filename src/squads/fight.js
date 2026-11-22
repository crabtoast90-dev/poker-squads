// The fight: pure and deterministic. Your army (2 heroes + up to 6 units) against one
// skeleton army. No placement: each army lines up by class (Knights and Rogues in front,
// Witches and Priestesses behind). Player side is z > 0, skeletons z < 0.
import { makeRng } from './rng.js';

const R = (x) => Math.round(x * 1000) / 1000; // keep positions tidy for the digest

function lineUp(members, side, data) {
  const { rows, slotGap } = data.fight;
  const sign = side === 'p' ? 1 : -1;
  for (const row of ['front', 'back']) {
    const inRow = members.filter((m) => data.classes[m.cls].row === row);
    inRow.forEach((m, i) => {
      m.x = R((i - (inRow.length - 1) / 2) * slotGap);
      m.z = R(sign * rows[row]);
    });
  }
}

function fighter(data, id, side, o) {
  const c = data.classes[o.cls];
  const hp = Math.round(c.hp * o.power * (o.hpMult ?? 1) * (1 + (o.auraHp ?? 0)));
  return {
    id, side, squad: 0, cls: o.cls, name: o.name, hero: !!o.hero, ability: !!o.ability, model: o.model,
    rank: o.rank, suit: o.suit, rarity: o.rarity, power: o.power,
    maxHp: hp, hp, shield: 0, alive: true,
    atk: c.atk * data.fight.damageScale * o.power * (o.atkMult ?? 1) * (1 + (o.auraAtk ?? 0)),
    range: c.range, speed: c.speed, interval: c.interval, armor: c.armor,
    cd: 0.3 + (id.length % 3) * 0.1, healCd: 1, skillCd: o.skill ? o.skill.every * 0.5 : 0, skill: o.skill ?? null,
    x: 0, z: 0, target: null, dealt: 0, healed: 0,
  };
}

// Both heroes' auras on one unit of class cls: { hp, atk } bonuses (the own-class bonus is bigger).
export function auraFor(data, heroes, cls) {
  const out = { hp: 0, atk: 0 };
  for (const key of heroes) {
    const h = data.heroes[key];
    out[h.aura.stat] += cls === h.cls ? h.aura.own : h.aura.all;
  }
  return out;
}

// army: { heroes: [key, key], units: [unit, ...] } from the round.
export function createFight(data, army, roundIndex, seed) {
  const mine = [];
  army.heroes.forEach((key, s) => {
    const h = data.heroes[key];
    const a = auraFor(data, army.heroes, h.cls);
    mine.push(fighter(data, `h${s}`, 'p', { cls: h.cls, name: h.name, hero: true, ability: true, power: h.power, skill: h.skill, model: h.cls, auraHp: a.hp, auraAtk: a.atk }));
  });
  army.units.forEach((u, i) => {
    const a = auraFor(data, army.heroes, u.cls);
    mine.push(fighter(data, `p${i}`, 'p', { ...u, model: u.cls, auraHp: a.hp, auraAtk: a.atk }));
  });
  lineUp(mine, 'p', data);
  const er = data.enemyRounds[Math.min(roundIndex, data.enemyRounds.length - 1)];
  const foes = er.units.map((k, i) => {
    const sk = data.skeletons[k];
    return fighter(data, `e${i}`, 'e', { cls: sk.cls, name: k, ability: sk.ability, power: er.power * data.fight.enemyPower, model: sk.model, hpMult: sk.hpMult, atkMult: sk.atkMult });
  });
  lineUp(foes, 'e', data);
  return { rng: makeRng(seed), units: [...mine, ...foes], time: 0, ticks: 0, result: null, events: [] };
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

function pickTarget(data, f, u, foes) {
  const ab = data.abilities.knight;
  const taunts = foes.filter((e) => e.cls === 'knight' && e.ability && dist2(u, e) <= ab.tauntRadius ** 2);
  if (taunts.length) return nearest(u, taunts);
  if (u.cls === 'rogue' && u.ability) {
    const back = foes.filter((e) => data.classes[e.cls].row === 'back');
    if (back.length) return nearest(u, back);
  }
  return nearest(u, foes);
}

function hurt(data, f, from, to, raw, out, tag) {
  let dmg = raw * (1 - to.armor);
  if (to.cls === 'knight' && to.ability) dmg *= data.abilities.knight.damageTaken;
  dmg = Math.max(1, Math.round(dmg));
  const absorbed = Math.min(to.shield, dmg);
  to.shield -= absorbed;
  const real = Math.min(to.hp, dmg - absorbed);
  to.hp -= real;
  from.dealt += real + absorbed;
  out.push([to.id, dmg]);
  if (to.hp <= 0 && to.alive) {
    to.alive = false;
    f.events.push({ t: f.ticks, type: 'down', who: to.id, by: from.id, tag });
  }
}

export function stepFight(data, f) {
  if (f.result) return [];
  const dt = data.fight.tick;
  const start = f.events.length;
  f.ticks++;
  f.time = R(f.ticks * dt);
  const { crit, critMult, spread } = data.fight;
  for (const u of f.units) {
    if (!u.alive) continue;
    const foes = alive(f, u.side === 'p' ? 'e' : 'p');
    if (!foes.length) break;
    const friends = alive(f, u.side);
    u.cd -= dt;
    // Priestess (ability): heal and shield the most hurt ally.
    if (u.cls === 'priestess' && u.ability) {
      u.healCd -= dt;
      if (u.healCd <= 0) {
        const pa = data.abilities.priestess;
        u.healCd = pa.healEvery;
        let low = null;
        for (const a of friends) if (a.hp < a.maxHp && (!low || a.hp / a.maxHp < low.hp / low.maxHp)) low = a;
        if (low) {
          const amt = Math.min(low.maxHp - low.hp, Math.round(pa.heal * data.fight.damageScale * u.power));
          low.hp += amt;
          low.shield += Math.round(pa.shield * data.fight.damageScale * u.power);
          u.healed += amt;
          f.events.push({ t: f.ticks, type: 'heal', who: u.id, target: low.id, amount: amt });
        }
      }
    }
    // Hero skills.
    if (u.skill) {
      u.skillCd -= dt;
      if (u.skillCd <= 0) {
        u.skillCd = u.skill.every;
        const sq = friends.filter((a) => a.squad === u.squad);
        if (u.cls === 'knight') {
          for (const a of sq) a.shield += Math.round(u.skill.shield * data.fight.damageScale * u.power);
          f.events.push({ t: f.ticks, type: 'skill', who: u.id, name: u.skill.name, targets: sq.map((a) => a.id) });
        } else if (u.cls === 'witch') {
          let centre = null;
          let most = -1;
          for (const e of foes) {
            const n = foes.filter((o) => dist2(o, e) <= u.skill.radius ** 2).length;
            if (n > most) { most = n; centre = e; }
          }
          const hits = [];
          for (const e of foes) if (dist2(e, centre) <= u.skill.radius ** 2) hurt(data, f, u, e, u.skill.damage * data.fight.damageScale * u.power, hits, 'skill');
          f.events.push({ t: f.ticks, type: 'skill', who: u.id, name: u.skill.name, at: [centre.x, centre.z], hits });
        } else if (u.cls === 'priestess') {
          for (const a of sq) a.hp = Math.min(a.maxHp, a.hp + Math.round(u.skill.heal * data.fight.damageScale * u.power));
          f.events.push({ t: f.ticks, type: 'skill', who: u.id, name: u.skill.name, targets: sq.map((a) => a.id) });
        } else if (u.cls === 'rogue') {
          let low = foes[0];
          for (const e of foes) if (e.hp < low.hp) low = e;
          const hits = [];
          hurt(data, f, u, low, u.skill.damage * data.fight.damageScale * u.power, hits, 'skill');
          f.events.push({ t: f.ticks, type: 'skill', who: u.id, name: u.skill.name, hits });
        }
      }
    }
    const t = pickTarget(data, f, u, foes.filter((e) => e.alive));
    if (!t) continue;
    u.target = t.id;
    const d = Math.sqrt(dist2(u, t));
    if (d > u.range) {
      const step = Math.min(u.speed * dt, d - u.range * 0.9);
      u.x = R(u.x + ((t.x - u.x) / d) * step);
      u.z = R(u.z + ((t.z - u.z) / d) * step);
    } else if (u.cd <= 0) {
      u.cd = u.interval;
      const isCrit = f.rng() < crit;
      const roll = 1 + (f.rng() * 2 - 1) * spread;
      const counter = data.counters[u.cls]?.[t.cls] ?? 1;
      const raw = u.atk * roll * counter * (isCrit ? critMult : 1);
      const hits = [];
      hurt(data, f, u, t, raw, hits, 'hit');
      if (u.cls === 'witch' && u.ability) {
        const wa = data.abilities.witch;
        for (const e of foes) if (e !== t && e.alive && dist2(e, t) <= wa.splashRadius ** 2) hurt(data, f, u, e, raw * wa.splash, hits, 'splash');
      }
      f.events.push({ t: f.ticks, type: 'attack', who: u.id, target: t.id, crit: isCrit, hits });
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
  const p = alive(f, 'p').length;
  const e = alive(f, 'e').length;
  if (!e || !p || f.time >= data.fight.maxTime) {
    f.result = !e && p ? 'win' : 'lose';
    f.events.push({ t: f.ticks, type: 'end', result: f.result, time: f.time, timeout: !!(e && p) });
  }
  return f.events.slice(start);
}

export function runFight(data, army, roundIndex, seed) {
  const f = createFight(data, army, roundIndex, seed);
  while (!f.result) stepFight(data, f);
  return f;
}

// Who did the most: damage dealt plus healing, per player unit.
export function topUnit(f) {
  let best = null;
  for (const u of f.units) if (u.side === 'p' && (!best || u.dealt + u.healed > best.dealt + best.healed)) best = u;
  return best;
}
