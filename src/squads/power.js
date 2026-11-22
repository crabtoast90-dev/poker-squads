// Combat power: one number per army, the bar to clear (Brian's ask). Pure.
// Army power = scale x sqrt(total effective health x total damage per second). Effective
// health counts armour and Hold the Line; damage per second counts Hex Burst splash, healing,
// shields and hero skills (all as "per second" worth). Counters are left out on purpose: the
// number is an estimate, and npm run sim reports how often it calls the winner.
import { createFight } from './fight.js';
import { rarityOdds, makeUnit } from './sim.js';

function fighterWorth(data, u, allies) {
  const C = data.combatPower;
  const ds = data.fight.damageScale;
  let ehp = u.maxHp / (1 - u.armor);
  if (u.cls === 'knight' && u.ability) ehp /= data.abilities.knight.damageTaken;
  let dps = u.atk / u.interval;
  if (u.cls === 'witch' && u.ability) dps *= 1 + data.abilities.witch.splash * C.splashTargets;
  if (u.cls === 'priestess' && u.ability) {
    const p = data.abilities.priestess;
    dps += ((p.heal * C.healWorth + p.shield * C.shieldWorth) * ds * u.power) / p.healEvery;
  }
  if (u.skill) {
    const k = u.skill;
    if (u.cls === 'knight') dps += (k.shield * ds * u.power * allies * C.shieldWorth) / k.every;
    if (u.cls === 'witch') dps += (k.damage * ds * u.power * C.skillTargets) / k.every;
    if (u.cls === 'priestess') dps += (k.heal * ds * u.power * allies * C.healWorth) / k.every;
    if (u.cls === 'rogue') dps += (k.damage * ds * u.power) / k.every;
  }
  return { ehp, dps };
}

export function sidePower(data, fighters) {
  let ehp = 0;
  let dps = 0;
  for (const u of fighters) {
    const w = fighterWorth(data, u, fighters.length);
    ehp += w.ehp;
    dps += w.dps;
  }
  return Math.round(data.combatPower.scale * Math.sqrt(ehp * dps));
}

// Both armies' power for an army (heroes + units so far) against a round's skeletons.
export function armyPowers(data, army, roundIndex) {
  const f = createFight(data, army, roundIndex, 0);
  return { mine: sidePower(data, f.units.filter((u) => u.side === 'p')), foes: sidePower(data, f.units.filter((u) => u.side === 'e')) };
}

// One unit's own worth inside the army (shown on its card).
export function unitPower(data, army, roundIndex, index) {
  const f = createFight(data, army, roundIndex, 0);
  const mine = f.units.filter((u) => u.side === 'p');
  const without = mine.filter((u) => u.id !== `p${index}`);
  return sidePower(data, mine) - sidePower(data, without);
}

// What a hand would add to your army's power on average, over its class and rarity odds.
export function expectedGain(data, army, roundIndex, ev) {
  const base = armyPowers(data, army, roundIndex).mine;
  const { odds } = rarityOdds(data, ev.score);
  let gain = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const card of ev.scoring) {
    for (let r = 0; r < odds.length; r++) {
      if (!odds[r]) continue;
      const u = makeUnit(data, card, r, 99);
      const g = armyPowers(data, { heroes: army.heroes, units: [...army.units, u] }, roundIndex).mine - base;
      gain += (g * odds[r]) / ev.scoring.length;
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
  }
  return { avg: Math.round(gain), lo, hi };
}
