// Sounds made in code (Web Audio synth): no audio files. Off in ?test runs.
// Rarity decides how big a birth sounds: Common a soft blip, Legendary a rising fanfare.
export function createAudio({ enabled }) {
  let ctx = null;
  let master = null;
  let muted = false;
  const ok = () => {
    if (!enabled || muted) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  };
  function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
    if (!ok()) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.2, at = 0, freq = 800 } = {}) {
    if (!ok()) return;
    const t = ctx.currentTime + at;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 7;
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  return {
    unlock: () => ok(),
    setMuted(m) { muted = m; },
    get muted() { return muted; },
    select: () => tone(660, 0.06, { type: 'triangle', vol: 0.12 }),
    whoosh: () => noise(0.35, { vol: 0.25, freq: 1800 }),
    chip: (i) => tone(NOTES[i % NOTES.length], 0.09, { type: 'square', vol: 0.07 }),
    mult: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.12, slide: 2 }); },
    tick: (i) => tone(900 + i * 40, 0.03, { type: 'square', vol: 0.05 }),
    upgrade: (tier) => { for (let i = 0; i < 3; i++) tone(NOTES[tier + i * 2] ?? 1500, 0.22, { type: 'triangle', vol: 0.18, at: i * 0.07 }); },
    pick: () => tone(1200, 0.05, { type: 'triangle', vol: 0.08 }),
    // The landing: a thump, then a chord that grows with rarity.
    land(rarity) {
      tone(90, 0.4, { type: 'sine', vol: 0.5, slide: 0.5 });
      noise(0.3 + rarity * 0.1, { vol: 0.25 + rarity * 0.05, freq: 500 });
      const chord = [[0], [0, 2], [0, 2, 4], [0, 2, 4, 5], [0, 2, 4, 5, 7]][rarity];
      chord.forEach((n, i) => tone(NOTES[n] / (rarity >= 3 ? 1 : 2), 0.6 + rarity * 0.35, { type: rarity >= 3 ? 'sawtooth' : 'triangle', vol: 0.1, at: 0.04 + i * (rarity >= 3 ? 0.09 : 0.03), attack: 0.02 }));
      if (rarity === 4) for (let i = 0; i < 8; i++) tone(NOTES[7] * 1.5, 0.15, { type: 'sine', vol: 0.06, at: 0.6 + i * 0.07 });
    },
    rise: (rarity) => tone(200, 0.6 + rarity * 0.2, { type: 'sawtooth', vol: 0.04 + rarity * 0.02, slide: 3 + rarity }),
    hop: () => tone(440, 0.12, { type: 'triangle', vol: 0.12, slide: 1.6 }),
    hit: (big) => noise(0.08, { vol: big ? 0.18 : 0.07, freq: big ? 1400 : 2400 }),
    heal: () => tone(990, 0.2, { type: 'sine', vol: 0.06 }),
    skill: () => { tone(140, 0.5, { type: 'sawtooth', vol: 0.12, slide: 0.6 }); noise(0.4, { vol: 0.15, freq: 900 }); },
    down: () => tone(180, 0.3, { type: 'triangle', vol: 0.1, slide: 0.5 }),
    win: () => [0, 2, 4, 7].forEach((n, i) => tone(NOTES[n], 0.35, { type: 'triangle', vol: 0.16, at: i * 0.12 })),
    lose: () => [4, 2, 0].forEach((n, i) => tone(NOTES[n] / 2, 0.45, { type: 'triangle', vol: 0.14, at: i * 0.18 })),
  };
}
