import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Music } from '../src/platform/music';

class TestAudio {
  static instances: TestAudio[] = [];
  paused = true;
  volume = 0;
  loop = false;
  preload = '';
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  constructor(readonly src: string) { TestAudio.instances.push(this); }
}

describe('music isolation during an effects sample', () => {
  let music: Music;
  let win: EventTarget;
  let doc: EventTarget & { hidden: boolean; documentElement: { dataset: Record<string, string> } };
  let save: ReturnType<typeof vi.fn<(key: string, value: string) => void>>;
  const current = () => TestAudio.instances.at(-1)!;
  beforeEach(() => {
    vi.useFakeTimers(); TestAudio.instances = [];
    win = Object.assign(new EventTarget(), { setInterval, setTimeout });
    doc = Object.assign(new EventTarget(), { hidden: false, documentElement: { dataset: {} } });
    vi.stubGlobal('window', win); vi.stubGlobal('document', doc); vi.stubGlobal('Audio', TestAudio);
    save = vi.fn(); music = new Music({ getItem: () => null, setItem: (key, value) => { save(key, value); }, removeItem: vi.fn() });
    music.play('camp'); win.dispatchEvent(new Event('pointerdown'));
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('pauses incoming and outgoing tracks, then restores the current music without saving preferences', () => {
    music.play('battle'); expect(TestAudio.instances.every(a => !a.paused)).toBe(true);
    music.pauseForEffectPreview(); expect(TestAudio.instances.every(a => a.paused)).toBe(true);
    vi.advanceTimersByTime(1999); expect(current().paused).toBe(true);
    vi.advanceTimersByTime(1); expect(current().paused).toBe(false);
    expect(TestAudio.instances[0]!.paused).toBe(true);
    expect(music.settings).toEqual({ muted: false, volume: .6 }); expect(save).not.toHaveBeenCalled();
  });

  it('extends isolation for repeated samples and respects a track change', () => {
    music.pauseForEffectPreview(); vi.advanceTimersByTime(1500); music.pauseForEffectPreview();
    music.play('boss'); vi.advanceTimersByTime(1000);
    expect(TestAudio.instances.every(a => a.paused)).toBe(true);
    vi.advanceTimersByTime(1000); expect(current().src).toContain('bgm_boss.mp3');
    expect(current().paused).toBe(false); expect(TestAudio.instances[0]!.paused).toBe(true);
  });

  it('keeps music muted if the player switches it off during the sample', () => {
    music.pauseForEffectPreview(); music.setMuted(true); vi.advanceTimersByTime(3000);
    expect(current().paused).toBe(true); expect(music.settings.muted).toBe(true);
    music.setMuted(false); expect(current().paused).toBe(false);
  });

  it('never resumes in the background and uses the latest volume when returning', () => {
    music.pauseForEffectPreview(); music.setVolume(.25); doc.hidden = true;
    vi.advanceTimersByTime(3000); expect(current().paused).toBe(true);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(1000);
    expect(current().paused).toBe(false); expect(current().volume).toBe(.25);
  });
});
