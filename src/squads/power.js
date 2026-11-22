// Combat power: one number per army, the bar to clear. Pure.
// It reads every fighter as built (class mechanic, face bonus, hero skills and relics are
// already in its stats) against the other army: Armor is worth more against small hits and
// nothing against Burn; Crit, Burn, Poison and Splash add to damage; Shields (and Mend) add to
// health; Bless and Mother Selune add damage for the share of the army a Shield covers.
// Army power = scale x sqrt(effective health x damage per second). Counters fall out of the
// matchup (Burn vs Armor, Rogues vs a soft back line) rather than a table.
import { createFight } from './fight.js';
import { rarityOdds, makeUnit } from './sim.js';

function sideStats(data, mine, theirs, f) {
  const B = data.bonuses;
  const T = data.combatPower.fightSeconds;
  // What their hits look like: average hit size and the share of their damage that ignores Armor.
  let hitW = 0;
  let hitSum = 0;
  let dotDps = 0;
  let allDps = 0;
  for (const e of theirs) {
    const rate = 1 / e.interval;
    hitW += rate;
    hitSum += e.atk * rate;
    allDps += e.atk * rate;
    if (e.burn) { dotDps += e.burn; allDps += e.burn; }
  }
  const avgHit = hitSum / (hitW || 1);
  const dotShare = dotDps / (allDps || 1);
  const avgArmor = theirs.reduce((s, e) => s + e.armor, 0) / (theirs.length || 1);
  const heroes = f.ctx[mine[0]?.side ?? 'p'].heroes;
  const relics = f.ctx[mine[0]?.side ?? 'p'].relics;

  let ehp = 0;
  let dps = 0;
  let shieldRate = 0;
  const poisoners = mine.filter((u) => u.bonus === 'poison').length || 1;
  for (const u of mine) {
    const cut = Math.min(data.fight.armorCap, (data.combatPower.armorWorth * u.armor) / Math.max(1, avgHit));
    ehp += u.maxHp / (1 - cut * (1 - dotShare));
    const raw = u.atk * (1 + u.crit * (u.critMult - 1));
    let hit = Math.max(raw * (1 - data.fight.armorCap), raw - avgArmor);
    if (u.bonus === 'ambush') hit *= 1.05;
    if (u.cls === 'rogue' && heroes.includes('rogue')) hit *= 1.12; // attacks again after a kill
    if (u.cls === 'rogue' && relics.includes('rogueMark')) hit *= 1.05;
    let d = hit / u.interval;
    if (u.bonus === 'splash') d *= 1 + B.witch.splash.share * 0.8;
    // A Witch keeps Burn going on about burnFor / interval targets (it spreads Burn), as many as there are.
    if (u.burn) d += u.burn * Math.min(theirs.length || 1, u.burnFor / u.interval) * (heroes.includes('witch') ? 1.15 : 1);
    if (u.bonus === 'poison') d += B.rogue.poison.dps * f.ctx.p.ds * u.power * Math.min(B.rogue.poison.max / poisoners, B.rogue.poison.for / u.interval);
    if (u.bonus === 'chill') d *= 1.15; // its target hits back slower
    if (relics.includes('witchSear') && theirs.length) d *= 1.08;
    dps += d;
    if (u.shieldEvery) {
      const per = u.shieldAmt * (1 + (u.bonus === 'mend' ? B.priestess.mend.heal : 0));
      ehp += (data.combatPower.shieldWorth * per * T) / u.shieldEvery;
      shieldRate += 1 / u.shieldEvery;
    }
    if (u.bonus === 'taunt') ehp += u.maxHp * 0.15; // soaks hits meant for softer allies
  }
  // Damage from holding a Shield (Bless, Mother Selune): about 3 s of cover per Shield cast.
  const cover = Math.min(1, (shieldRate * 3) / (mine.length || 1));
  let shieldedBonus = 0;
  if (heroes.includes('priestess')) shieldedBonus += data.heroes.priestess.shieldedDmg;
  if (mine.some((u) => u.bonus === 'bless')) shieldedBonus += B.priestess.bless.dmg * 0.5;
  dps *= 1 + shieldedBonus * cover;
  if (relics.includes('knightOath')) ehp *= 1 + 0.04 * mine.filter((u) => u.cls === 'knight').length;
  if (relics.includes('priestThorn')) dps *= 1 + 0.1 * cover;
  // No front line: the back line is hit from the first second.
  if (mine.length && !mine.some((u) => u.row === 'front')) ehp *= 0.8;
  return { ehp, dps };
}

export function sidePowers(data, f) {
  const p = f.units.filter((u) => u.side === 'p');
  const e = f.units.filter((u) => u.side === 'e');
  const k = data.combatPower.scale;
  const sp = sideStats(data, p, e, f);
  const se = sideStats(data, e, p, f);
  return { mine: Math.round(k * Math.sqrt(sp.ehp * sp.dps)), foes: Math.round(k * Math.sqrt(se.ehp * se.dps)) };
}

// Both armies' power for an army (heroes + units so far + relics) against a round's skeletons.
export function armyPowers(data, army, roundIndex) {
  return sidePowers(data, createFight(data, army, roundIndex, 0));
}

// One unit's share of the army's power (shown on its card).
export function unitPower(data, army, roundIndex, index) {
  const all = armyPowers(data, army, roundIndex).mine;
  const without = { ...army, units: army.units.filter((_, i) => i !== index) };
  return all - armyPowers(data, without, roundIndex).mine;
}

// What a hand would add to your army's power on average, over its class and rarity odds.
// Face cards are counted at their average bonus.
export function expectedGain(data, army, roundIndex, ev, luck = 0) {
  const base = armyPowers(data, army, roundIndex).mine;
  const { odds } = rarityOdds(data, ev.score, luck);
  let gain = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const card of ev.scoring) {
    for (let r = 0; r < odds.length; r++) {
      if (!odds[r]) continue;
      const pool = card.rank >= data.birth.faceFrom ? Object.keys(data.bonuses[{ S: 'knight', H: 'priestess', C: 'witch', D: 'rogue' }[card.suit]]) : [null];
      let g = 0;
      for (const bonus of pool) {
        const u = makeUnit(data, card, r, 'x', bonus);
        g += (armyPowers(data, { ...army, units: [...army.units, u] }, roundIndex).mine - base) / pool.length;
      }
      gain += (g * odds[r]) / ev.scoring.length;
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
  }
  return { avg: Math.round(gain), lo: Math.round(lo), hi: Math.round(hi) };
}
