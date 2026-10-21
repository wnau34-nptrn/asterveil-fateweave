import type { StoragePort } from '../core/save/expedition-save';

// Sound effects (owner chose code-synthesised placeholders, 2026-10-16): every sound is built with Web Audio
// oscillators and filtered noise, so there are no files to load. A sound can later be replaced by a recorded file
// under the same name. Sounds start only after the first user gesture and never affect game state.
export type SfxName =
  | 'click' | 'open' | 'close' | 'step' | 'bump' | 'encounter' | 'chest' | 'chestRare' | 'rest' | 'rune' | 'runeReset' | 'lever' | 'push' | 'door' | 'secret' | 'herb'
  | 'hit' | 'zap' | 'crit' | 'guard' | 'barrier' | 'heal' | 'buff' | 'debuff' | 'miss' | 'down' | 'cancel' | 'victory' | 'defeat'
  | 'coin' | 'upgrade' | 'anvil' | 'claim' | 'potion';
const prefKey = 'asterveil.fateweave.sfx.v1';
export interface SfxPrefs { muted: boolean; volume: number }

interface Tone { type?: OscillatorType; freq: number; to?: number; at?: number; dur: number; gain?: number; attack?: number }
interface Noise { at?: number; dur: number; freq: number; q?: number; gain?: number; type?: BiquadFilterType; to?: number }
// Recipes: tones and noise bursts, times in seconds from the start of the sound.
const recipes: Record<SfxName, { tones?: Tone[]; noise?: Noise[] }> = {
  click: { tones: [{ type: 'triangle', freq: 1400, dur: .04, gain: .12 }] },
  open: { tones: [{ type: 'sine', freq: 520, to: 780, dur: .12, gain: .14 }] },
  close: { tones: [{ type: 'sine', freq: 700, to: 440, dur: .1, gain: .12 }] },
  step: { noise: [{ dur: .06, freq: 380, q: 1.2, gain: .18, type: 'lowpass' }] },
  bump: { tones: [{ type: 'square', freq: 120, to: 90, dur: .08, gain: .08 }] },
  encounter: { tones: [{ type: 'sawtooth', freq: 880, to: 220, dur: .35, gain: .1 }, { type: 'square', freq: 196, at: .3, dur: .25, gain: .08 }, { type: 'square', freq: 233, at: .3, dur: .25, gain: .06 }],
    noise: [{ dur: .35, freq: 2000, to: 300, q: .8, gain: .12, type: 'bandpass' }] },
  chest: { tones: [{ type: 'triangle', freq: 660, dur: .1, gain: .14 }, { type: 'triangle', freq: 990, at: .08, dur: .16, gain: .14 }] },
  chestRare: { tones: [{ type: 'triangle', freq: 784, dur: .1, gain: .14 }, { type: 'triangle', freq: 988, at: .08, dur: .1, gain: .14 }, { type: 'triangle', freq: 1319, at: .16, dur: .3, gain: .16 }, { type: 'sine', freq: 2637, at: .16, dur: .3, gain: .05 }] },
  rest: { tones: [{ type: 'sine', freq: 262, dur: .6, gain: .1, attack: .08 }, { type: 'sine', freq: 330, at: .1, dur: .6, gain: .09, attack: .08 }, { type: 'sine', freq: 392, at: .2, dur: .7, gain: .09, attack: .08 }] },
  rune: { tones: [{ type: 'sine', freq: 880, to: 1320, dur: .25, gain: .13 }, { type: 'sine', freq: 1760, at: .05, dur: .3, gain: .05 }] },
  runeReset: { tones: [{ type: 'sine', freq: 660, to: 330, dur: .3, gain: .12 }] },
  lever: { tones: [{ type: 'square', freq: 180, to: 120, dur: .09, gain: .1 }], noise: [{ at: .05, dur: .07, freq: 900, q: 3, gain: .15, type: 'bandpass' }] },
  push: { noise: [{ dur: .4, freq: 220, q: .7, gain: .3, type: 'lowpass' }], tones: [{ type: 'sine', freq: 70, to: 50, dur: .4, gain: .12 }] },
  door: { tones: [{ type: 'sawtooth', freq: 110, to: 70, dur: .6, gain: .07 }], noise: [{ dur: .6, freq: 300, q: .7, gain: .2, type: 'lowpass' }] },
  secret: { tones: [{ type: 'sine', freq: 523, dur: .12, gain: .1 }, { type: 'sine', freq: 659, at: .1, dur: .12, gain: .1 }, { type: 'sine', freq: 1047, at: .2, dur: .3, gain: .1 }] },
  herb: { tones: [{ type: 'sine', freq: 1175, dur: .12, gain: .08 }, { type: 'sine', freq: 1568, at: .08, dur: .2, gain: .08 }] },
  hit: { noise: [{ dur: .12, freq: 1200, q: .9, gain: .35, type: 'bandpass' }], tones: [{ type: 'sine', freq: 140, to: 60, dur: .12, gain: .2 }] },
  zap: { tones: [{ type: 'sawtooth', freq: 1400, to: 300, dur: .22, gain: .09 }, { type: 'sine', freq: 2200, to: 600, dur: .2, gain: .05 }] },
  crit: { noise: [{ dur: .16, freq: 1800, q: 1, gain: .35, type: 'bandpass' }], tones: [{ type: 'square', freq: 1320, dur: .08, gain: .06 }, { type: 'sine', freq: 160, to: 50, dur: .18, gain: .22 }] },
  guard: { tones: [{ type: 'square', freq: 620, dur: .14, gain: .06 }, { type: 'square', freq: 930, dur: .14, gain: .05 }], noise: [{ dur: .05, freq: 3000, q: 2, gain: .12, type: 'bandpass' }] },
  barrier: { tones: [{ type: 'sine', freq: 440, to: 880, dur: .3, gain: .1 }, { type: 'sine', freq: 660, to: 1320, at: .05, dur: .3, gain: .06 }] },
  heal: { tones: [{ type: 'sine', freq: 523, dur: .15, gain: .1 }, { type: 'sine', freq: 659, at: .1, dur: .15, gain: .1 }, { type: 'sine', freq: 784, at: .2, dur: .3, gain: .1 }] },
  buff: { tones: [{ type: 'triangle', freq: 392, to: 784, dur: .25, gain: .1 }] },
  debuff: { tones: [{ type: 'triangle', freq: 600, to: 250, dur: .25, gain: .1 }] },
  miss: { noise: [{ dur: .18, freq: 2500, to: 800, q: .6, gain: .12, type: 'bandpass' }] },
  down: { tones: [{ type: 'triangle', freq: 330, to: 110, dur: .45, gain: .14 }], noise: [{ at: .3, dur: .15, freq: 250, gain: .2, type: 'lowpass' }] },
  cancel: { tones: [{ type: 'square', freq: 300, dur: .06, gain: .07 }, { type: 'square', freq: 200, at: .07, dur: .1, gain: .07 }] },
  victory: { tones: [{ type: 'triangle', freq: 523, dur: .14, gain: .13 }, { type: 'triangle', freq: 659, at: .13, dur: .14, gain: .13 }, { type: 'triangle', freq: 784, at: .26, dur: .14, gain: .13 }, { type: 'triangle', freq: 1047, at: .39, dur: .5, gain: .15 }, { type: 'sine', freq: 523, at: .39, dur: .5, gain: .08 }] },
  defeat: { tones: [{ type: 'triangle', freq: 392, dur: .3, gain: .12 }, { type: 'triangle', freq: 311, at: .28, dur: .3, gain: .12 }, { type: 'triangle', freq: 262, at: .56, dur: .6, gain: .12 }] },
  coin: { tones: [{ type: 'square', freq: 988, dur: .06, gain: .06 }, { type: 'square', freq: 1319, at: .06, dur: .14, gain: .06 }] },
  upgrade: { tones: [{ type: 'triangle', freq: 523, to: 1047, dur: .3, gain: .1 }, { type: 'sine', freq: 1568, at: .25, dur: .3, gain: .08 }] },
  anvil: { tones: [{ type: 'square', freq: 1760, dur: .12, gain: .05 }, { type: 'triangle', freq: 880, dur: .3, gain: .08 }], noise: [{ dur: .04, freq: 4000, q: 2, gain: .15, type: 'bandpass' }] },
  claim: { tones: [{ type: 'triangle', freq: 659, dur: .1, gain: .12 }, { type: 'triangle', freq: 880, at: .09, dur: .1, gain: .12 }, { type: 'triangle', freq: 1319, at: .18, dur: .3, gain: .13 }] },
  potion: { tones: [{ type: 'sine', freq: 300, to: 900, dur: .2, gain: .08 }, { type: 'sine', freq: 500, to: 1200, at: .1, dur: .2, gain: .06 }] },
};

export class Sfx {
  private ctx: AudioContext | undefined;
  private out: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private prefs: SfxPrefs = { muted: false, volume: 0.7 };
  private storage: StoragePort | undefined;
  private last = new Map<SfxName, number>();
  private unlocked = false;
  init(storage: StoragePort | undefined): void {
    this.storage = storage;
    try {
      const raw = storage?.getItem(prefKey); const p = raw ? JSON.parse(raw) as Partial<SfxPrefs> : {};
      if (typeof p.muted === 'boolean') this.prefs.muted = p.muted;
      if (typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1) this.prefs.volume = p.volume;
    } catch { /* corrupt preference: keep the defaults */ }
    // Safari can interrupt Web Audio after the first gesture (app switching, screen lock, calls).
    // Keep retrying on gestures: a denied or interrupted resume must not permanently silence effects.
    const unlock = () => { this.unlocked = true; this.resume(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => { if (this.unlocked && !document.hidden) this.resume(); });
  }
  get settings(): SfxPrefs { return { ...this.prefs }; }
  // Explicit preview button: resume within its gesture, then schedule the sample after resume completes.
  // A true result means Web Audio accepted playback, not proof of sound from a physical speaker.
  async preview(): Promise<boolean> {
    if (this.prefs.muted || this.prefs.volume === 0 || document.hidden) return false;
    this.unlocked = true; this.resume();
    const ctx = this.ctx; if (!ctx) return false;
    try { if (ctx.state !== 'running') await ctx.resume(); } catch { return false; }
    if (ctx.state !== 'running') return false;
    this.last.delete('hit'); this.play('hit'); return true;
  }
  setMuted(muted: boolean): void { this.prefs.muted = muted; this.save(); if (!muted && this.unlocked) this.resume(); }
  setVolume(volume: number): void { this.prefs.volume = Math.min(1, Math.max(0, volume)); this.save(); if (this.out) this.out.gain.value = this.prefs.volume; }
  private save(): void { try { this.storage?.setItem(prefKey, JSON.stringify(this.prefs)); } catch { /* fine for a preference */ } }
  private resume(): void {
    if (!this.unlocked || this.prefs.muted || document.hidden) return;
    // Match background music's playback session where Safari exposes the Audio Session API.
    // Older Safari and other browsers can omit it or reject the request; gesture recovery still works.
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session && session.type !== 'playback') session.type = 'playback';
    } catch { /* optional platform support */ }
    const ctx = this.context();
    if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => { /* retry on the next gesture */ });
  }
  private context(): AudioContext | undefined {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    try { this.ctx = new Ctor(); } catch { return undefined; }
    this.last.clear();
    this.ctx.addEventListener('statechange', () => {
      if (this.ctx?.state === 'interrupted') this.resume();
    });
    this.out = this.ctx.createGain(); this.out.gain.value = this.prefs.volume; this.out.connect(this.ctx.destination);
    const len = this.ctx.sampleRate; this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0); let seed = 1;
    for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    return this.ctx;
  }
  // Plays a sound now; the same sound within 40 ms is dropped so bursts of events do not stack into noise.
  play(name: SfxName): () => void {
    const silent = () => {};
    document.documentElement.dataset.sfx = name;
    if (this.prefs.muted || document.hidden) return silent;
    const ctx = this.ctx;
    if (!ctx || !this.out || ctx.state !== 'running') { this.resume(); return silent; }
    const now = ctx.currentTime; if (now - (this.last.get(name) ?? -1) < .04) return silent; this.last.set(name, now);
    const voices: AudioScheduledSourceNode[] = [];
    const r = recipes[name];
    for (const t of r.tones ?? []) {
      const o = ctx.createOscillator(); const g = ctx.createGain(); const start = now + (t.at ?? 0); const end = start + t.dur;
      o.type = t.type ?? 'sine'; o.frequency.setValueAtTime(t.freq, start); if (t.to) o.frequency.exponentialRampToValueAtTime(t.to, end);
      g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(t.gain ?? .1, start + (t.attack ?? .01)); g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g).connect(this.out); o.start(start); o.stop(end + .02);
      voices.push(o);
    }
    for (const n of r.noise ?? []) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer!; const f = ctx.createBiquadFilter(); const g = ctx.createGain();
      const start = now + (n.at ?? 0); const end = start + n.dur;
      f.type = n.type ?? 'bandpass'; f.frequency.setValueAtTime(n.freq, start); if (n.to) f.frequency.exponentialRampToValueAtTime(n.to, end); f.Q.value = n.q ?? 1;
      g.gain.setValueAtTime(n.gain ?? .2, start); g.gain.exponentialRampToValueAtTime(0.0001, end);
      src.connect(f).connect(g).connect(this.out); src.start(start, Math.random() * .5); src.stop(end + .02);
      voices.push(src);
    }
    return () => { for (const voice of voices.splice(0)) { try { voice.stop(); voice.disconnect?.(); } catch { /* Already ended or closed. */ } } };
  }
}
// One shared instance: the shell sets its storage; views call `sfx.play`.
export const sfx = new Sfx();
