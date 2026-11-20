import { settings } from './state.js';

let ctx = null;
let master = null;

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.get('volume');
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function masterGain() { audioCtx(); return master; }
export function setVolume(v) {
  if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
}

export function beep(freq = 880, dur = 0.12, type = 'sine', vol = 0.5) {
  const c = audioCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(masterGain());
  o.start(); o.stop(c.currentTime + dur + 0.05);
}

/* ---- generative music engine: deterministic per-track synth loops ---- */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic
function noteFreq(root, semis) { return root * Math.pow(2, semis / 12); }

export class Synth {
  constructor(seed, rootHz = 220, tempo = 96) {
    const rnd = mulberry(seed);
    this.root = rootHz * (1 + Math.floor(rnd() * 5) / 12);
    this.tempo = tempo + Math.floor(rnd() * 24);
    this.chords = Array.from({ length: 4 }, () => [0, 3, 7, 10, 12].map((x) => x + SCALE[Math.floor(rnd() * 5)] * (rnd() > 0.7 ? 12 : 0)));
    this.rnd = rnd;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.analyser = null;
  }
  start() {
    const c = audioCtx();
    if (!this.analyser) {
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.connect(masterGain());
    }
    this.nextTime = c.currentTime + 0.06;
    this.timer = setInterval(() => this._pump(), 90);
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  _pump() {
    const c = audioCtx();
    const spb = 60 / this.tempo / 2; // 8th notes
    while (this.nextTime < c.currentTime + 0.35) {
      this._voice(this.nextTime, spb);
      this.nextTime += spb;
      this.step++;
    }
  }
  _voice(t, spb) {
    const c = audioCtx();
    const chord = this.chords[Math.floor(this.step / 8) % this.chords.length];
    const bar = Math.floor(this.step / 8);
    const inBar = this.step % 8;
    const dest = this.analyser;
    // pad chord at bar start
    if (inBar === 0) {
      for (const s of chord.slice(0, 3)) {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle'; o.frequency.value = noteFreq(this.root / 2, s);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.4);
        g.gain.linearRampToValueAtTime(0.0001, t + spb * 8);
        o.connect(g); g.connect(dest); o.start(t); o.stop(t + spb * 8 + 0.1);
      }
    }
    // bass on 0 and 4
    if (inBar === 0 || inBar === 4) {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.value = noteFreq(this.root / 2, chord[0]);
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + spb * 3);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + spb * 3.2);
    }
    // arpeggio / melody
    if (this.rnd() > 0.32) {
      const s = chord[Math.floor(this.rnd() * chord.length)] + (this.rnd() > 0.82 ? 12 : 0);
      const o = c.createOscillator(); const g = c.createGain(); const f = c.createBiquadFilter();
      o.type = this.rnd() > 0.5 ? 'square' : 'sawtooth';
      o.frequency.value = noteFreq(this.root, s);
      f.type = 'lowpass'; f.frequency.value = 1400 + this.rnd() * 2400; f.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + spb * 1.8);
      o.connect(f); f.connect(g); g.connect(dest);
      o.start(t); o.stop(t + spb * 2);
    }
    // hat
    if (inBar % 2 === 1) {
      const len = 0.05;
      const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g = c.createGain(); g.gain.value = 0.045;
      src.connect(f); f.connect(g); g.connect(dest); src.start(t);
    }
    void bar;
  }
}
