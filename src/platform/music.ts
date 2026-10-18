import type { StoragePort } from '../core/save/expedition-save';

// Background music (owner-supplied tracks, 2026-10-16). One looping track per view, crossfaded. Browsers only
// allow sound after a user gesture, so playback starts on the first pointer or key press; the page going to the
// background pauses it. Music never affects game state.
export type Track = 'camp' | 'archway' | 'ruins' | 'meadow' | 'battle' | 'boss';
const prefKey = 'asterveil.fateweave.audio.v1';
const FADE_MS = 700;
export interface MusicPrefs { muted: boolean; volume: number }

export class Music {
  private readonly tracks = new Map<Track, HTMLAudioElement>();
  private current: Track | undefined;
  private unlocked = false;
  private prefs: MusicPrefs = { muted: false, volume: 0.6 };
  private fades = new Map<HTMLAudioElement, number>();
  private listeners = new Set<(prefs: MusicPrefs) => void>();
  private previewTimer: number | undefined;

  constructor(private readonly storage: StoragePort | undefined) {
    try {
      const raw = storage?.getItem(prefKey); const p = raw ? JSON.parse(raw) as Partial<MusicPrefs> : {};
      if (typeof p.muted === 'boolean') this.prefs.muted = p.muted;
      if (typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1) this.prefs.volume = p.volume;
    } catch { /* corrupt preference: keep the defaults */ }
    document.documentElement.dataset.musicMuted = String(this.prefs.muted);
    const unlock = () => { if (this.unlocked) return; this.unlocked = true; this.start(); };
    window.addEventListener('pointerdown', unlock, { capture: true }); window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio(this.current)?.pause(); else this.start(); });
  }
  get settings(): MusicPrefs { return { ...this.prefs }; }
  onChange(listener: (prefs: MusicPrefs) => void): void { this.listeners.add(listener); }
  play(track: Track): void {
    if (track === this.current) return;
    const old = this.current; this.current = track; document.documentElement.dataset.music = track;
    if (old) this.fadeTo(this.audio(old)!, 0, true);
    this.start();
  }
  setMuted(muted: boolean): void { this.prefs.muted = muted; this.save(); if (muted) this.tracks.forEach(a => a.pause()); else this.start(); }
  setVolume(volume: number): void {
    this.prefs.volume = Math.min(1, Math.max(0, volume)); this.save();
    const a = this.audio(this.current); if (a && !this.fades.has(a)) a.volume = this.prefs.volume;
  }
  // Pause every track, including an outgoing crossfade. Unlike element volume, pause also works
  // on iPhone: the effects sample must be audible without any music masking it.
  pauseForEffectPreview(): void {
    clearTimeout(this.previewTimer);
    for (const timer of this.fades.values()) clearInterval(timer);
    this.fades.clear(); this.tracks.forEach(a => a.pause());
    this.previewTimer = window.setTimeout(() => { this.previewTimer = undefined; this.start(); }, 2000);
  }
  private save(): void {
    try { this.storage?.setItem(prefKey, JSON.stringify(this.prefs)); } catch { /* not saved: fine for a preference */ }
    for (const l of this.listeners) l(this.settings);
    document.documentElement.dataset.musicMuted = String(this.prefs.muted);
  }
  private audio(track: Track | undefined): HTMLAudioElement | undefined {
    if (!track) return undefined;
    let a = this.tracks.get(track);
    if (!a) { a = new Audio(`${import.meta.env.BASE_URL}assets/music/bgm_${track}.mp3`); a.loop = true; a.preload = 'none'; a.volume = 0; this.tracks.set(track, a); }
    return a;
  }
  // Starts (or resumes) the current track with a fade-in, once sound is allowed and not muted.
  private start(): void {
    const a = this.audio(this.current);
    if (!a || !this.unlocked || this.prefs.muted || document.hidden || this.previewTimer !== undefined) return;
    if (a.paused) { a.volume = 0; a.play().catch(() => { /* blocked or unsupported: stay silent */ }); }
    this.fadeTo(a, this.prefs.volume, false);
  }
  private fadeTo(a: HTMLAudioElement, target: number, stop: boolean): void {
    clearInterval(this.fades.get(a));
    const from = a.volume; const t0 = performance.now();
    const id = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / FADE_MS); a.volume = from + (target - from) * k;
      if (k < 1) return;
      clearInterval(id); this.fades.delete(a); if (stop) a.pause();
    }, 50);
    this.fades.set(a, id);
  }
}
