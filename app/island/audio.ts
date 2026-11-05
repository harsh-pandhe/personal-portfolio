// Every sound on the island is synthesised with WebAudio: no audio files to download.
// Nothing plays until the visitor turns sound on (browsers block autoplay anyway).
import { world } from "./store";

type Bus = { ctx: AudioContext; master: GainNode; amb: GainNode; music: GainNode; fx: GainNode; noise: AudioBuffer };

let bus: Bus | null = null;
let soundOn = false;
let musicOn = false;
let ambTimer: ReturnType<typeof setInterval> | null = null;
let seqTimer: ReturnType<typeof setInterval> | null = null;
const ambNodes: { waves?: GainNode; wind?: GainNode; rain?: GainNode; crickets?: GainNode } = {};

function ensure(): Bus | null {
  if (typeof window === "undefined") return null;
  if (bus) return bus;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  const mk = (v: number) => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(master);
    return g;
  };
  // two seconds of white noise, reused by every noisy sound
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  bus = { ctx, master, amb: mk(0.9), music: mk(0.55), fx: mk(0.7), noise };
  return bus;
}

function noiseSrc(b: Bus, loop = true) {
  const s = b.ctx.createBufferSource();
  s.buffer = b.noise;
  s.loop = loop;
  return s;
}

/* ---------------- ambience ---------------- */
function startAmbience(b: Bus) {
  const { ctx } = b;
  const chain = (type: BiquadFilterType, f: number, q: number, gain: number) => {
    const src = noiseSrc(b);
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(flt).connect(g).connect(b.amb);
    src.start();
    return g;
  };
  ambNodes.waves = chain("lowpass", 420, 0.4, 0.0);
  ambNodes.wind = chain("bandpass", 380, 0.5, 0.03);
  ambNodes.rain = chain("highpass", 1400, 0.3, 0.0);
  // crickets: a high tone chopped by a fast square LFO
  const osc = ctx.createOscillator();
  osc.frequency.value = 4600;
  const am = ctx.createGain();
  am.gain.value = 0;
  const lfo = ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = 28;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain).connect(am.gain);
  const cg = ctx.createGain();
  cg.gain.value = 0;
  osc.connect(am).connect(cg).connect(b.amb);
  osc.start();
  lfo.start();
  ambNodes.crickets = cg;

  let t = 0;
  ambTimer = setInterval(() => {
    t += 0.25;
    const now = ctx.currentTime;
    const n = world.night;
    // waves swell slowly
    ambNodes.waves!.gain.setTargetAtTime(0.16 + Math.sin(t * 0.7) * 0.07, now, 0.4);
    ambNodes.wind!.gain.setTargetAtTime(0.025 + world.rain * 0.04, now, 0.6);
    ambNodes.rain!.gain.setTargetAtTime(world.rain * 0.22, now, 0.5);
    // crickets chirp in bursts at night
    ambNodes.crickets!.gain.setTargetAtTime(n > 0.5 && Math.sin(t * 2.3) > 0.2 ? 0.012 * (1 - world.rain) : 0, now, 0.05);
    // birds by day, when it's dry
    if (n < 0.4 && world.rain < 0.3 && Math.random() < 0.07) chirp(b);
  }, 250);
}

function chirp(b: Bus) {
  const { ctx } = b;
  const count = 2 + Math.floor(Math.random() * 3);
  const base = 2400 + Math.random() * 1600;
  for (let i = 0; i < count; i++) {
    const t0 = ctx.currentTime + i * 0.11;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(base, t0);
    o.frequency.exponentialRampToValueAtTime(base * 1.45, t0 + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.03, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    o.connect(g).connect(b.amb);
    o.start(t0);
    o.stop(t0 + 0.1);
  }
}

/* ---------------- music: a lo-fi loop by day, a brighter gala track for the show ---------------- */
const MIDI = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const LOFI = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
];
const GALA = [
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [48, 52, 55, 60], // C
  [55, 59, 62, 67], // G
];

function tone(b: Bus, freq: number, t: number, dur: number, type: OscillatorType, gain: number, cutoff = 2400, out: AudioNode = b.music) {
  const o = b.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const f = b.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function kick(b: Bus, t: number, gain = 0.55) {
  const o = b.ctx.createOscillator();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(b.music);
  o.start(t);
  o.stop(t + 0.32);
}

function hit(b: Bus, t: number, type: BiquadFilterType, f: number, dur: number, gain: number, out: AudioNode = b.music) {
  const s = noiseSrc(b, false);
  const flt = b.ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.value = f;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(flt).connect(g).connect(out);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.02);
}

function startMusic(b: Bus) {
  stopMusic();
  let step = 0;
  let next = b.ctx.currentTime + 0.1;
  seqTimer = setInterval(() => {
    const gala = world.gala > 0.5;
    const bpm = gala ? 112 : 74;
    const s16 = 60 / bpm / 4;
    const chords = gala ? GALA : LOFI;
    while (next < b.ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 16) % chords.length;
      const i = step % 16;
      const c = chords[bar];
      const swing = !gala && i % 2 ? s16 * 0.18 : 0;
      const t = next + swing;
      if (i === 0) {
        c.forEach((n) => tone(b, MIDI(n), t, s16 * 15, "triangle", gala ? 0.035 : 0.045, gala ? 1800 : 1100));
        tone(b, MIDI(c[0] - 12), t, s16 * 6, "sine", 0.16, 400);
      }
      if (i === 8) tone(b, MIDI(c[0] - 12), t, s16 * 6, "sine", 0.13, 400);
      if (gala) {
        if (i % 4 === 0) kick(b, t, 0.5);
        if (i % 2 === 0) tone(b, MIDI(c[(i / 2) % 4] + 12), t, s16 * 1.6, "sawtooth", 0.035, 2600);
        if (i === 4 || i === 12) hit(b, t, "bandpass", 1900, 0.16, 0.25);
        hit(b, t, "highpass", 8000, 0.03, i % 2 ? 0.05 : 0.09);
      } else {
        if (i === 0 || i === 10) kick(b, t, 0.42);
        if (i === 4 || i === 12) hit(b, t, "bandpass", 1600, 0.18, 0.16);
        if (i % 2 === 0) hit(b, t, "highpass", 7000, 0.035, 0.045);
        // a few soft keys from the chord, an octave up
        if ((i === 3 || i === 7 || i === 14) && Math.random() < 0.7) tone(b, MIDI(c[Math.floor(Math.random() * 4)] + 12), t, s16 * 6, "sine", 0.05, 2000);
        // vinyl crackle
        if (Math.random() < 0.25) hit(b, t + Math.random() * s16, "highpass", 3000, 0.01, 0.02);
      }
      next += s16;
      step++;
    }
  }, 60);
}

function stopMusic() {
  if (seqTimer) clearInterval(seqTimer);
  seqTimer = null;
}

/* ---------------- public API ---------------- */
export function setSound(on: boolean) {
  const b = ensure();
  if (!b) return;
  soundOn = on;
  if (on) {
    b.ctx.resume();
    if (!ambTimer) startAmbience(b);
    b.master.gain.setTargetAtTime(0.8, b.ctx.currentTime, 0.2);
    if (musicOn && !seqTimer) startMusic(b);
  } else {
    b.master.gain.setTargetAtTime(0, b.ctx.currentTime, 0.15);
    stopMusic();
  }
}

export function setMusic(on: boolean) {
  musicOn = on;
  const b = ensure();
  if (!b) return;
  if (on && soundOn) startMusic(b);
  else stopMusic();
}

export type Sfx = "click" | "open" | "close" | "medal" | "thunder" | "firework" | "chapter";

export function sfx(name: Sfx) {
  if (!soundOn || !bus) return;
  const b = bus;
  const t = b.ctx.currentTime + 0.01;
  switch (name) {
    case "click":
      tone(b, 1180, t, 0.05, "sine", 0.08, 4000, b.fx);
      break;
    case "open": {
      const s = noiseSrc(b, false);
      const f = b.ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(380, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.32);
      const g = b.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      s.connect(f).connect(g).connect(b.fx);
      s.start(t);
      s.stop(t + 0.42);
      tone(b, 660, t + 0.08, 0.25, "sine", 0.05, 3000, b.fx);
      break;
    }
    case "close":
      tone(b, 520, t, 0.12, "sine", 0.06, 3000, b.fx);
      tone(b, 390, t + 0.06, 0.16, "sine", 0.05, 3000, b.fx);
      break;
    case "chapter":
      [0, 7, 12].forEach((n, i) => tone(b, MIDI(64 + n), t + i * 0.09, 0.9, "triangle", 0.05, 2400, b.fx));
      break;
    case "medal":
      [72, 76, 79, 84].forEach((n, i) => tone(b, MIDI(n), t + i * 0.08, 0.5, "triangle", 0.09, 5000, b.fx));
      break;
    case "thunder":
      hit(b, t, "lowpass", 160, 2.8, 0.5, b.fx);
      hit(b, t + 0.15, "lowpass", 500, 1.2, 0.25, b.fx);
      break;
    case "firework":
      hit(b, t, "lowpass", 220, 0.6, 0.35, b.fx);
      for (let i = 0; i < 10; i++) hit(b, t + 0.15 + Math.random() * 0.6, "highpass", 3500, 0.03, 0.08, b.fx);
      break;
  }
}
