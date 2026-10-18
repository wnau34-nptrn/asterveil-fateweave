import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sfx } from '../src/platform/sfx';

const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const node = () => ({ connect: vi.fn((target: unknown) => target) });
class TestAudioContext extends EventTarget {
  static instances: TestAudioContext[] = [];
  state: AudioContextState = 'suspended';
  currentTime = 1;
  sampleRate = 8;
  destination = {};
  tones: { start: ReturnType<typeof vi.fn> }[] = [];
  noises: { start: ReturnType<typeof vi.fn> }[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor() { super(); TestAudioContext.instances.push(this); }
  createGain() { return { ...node(), gain: param() }; }
  createBuffer() { return { getChannelData: () => new Float32Array(this.sampleRate) }; }
  createOscillator() {
    const tone = { ...node(), frequency: param(), type: 'sine', start: vi.fn(), stop: vi.fn() };
    this.tones.push(tone); return tone;
  }
  createBufferSource() {
    const noise = { ...node(), buffer: undefined, start: vi.fn(), stop: vi.fn() };
    this.noises.push(noise); return noise;
  }
  createBiquadFilter() { return { ...node(), type: 'bandpass', frequency: param(), Q: { value: 0 } }; }
}

describe('sound effect audio lifecycle', () => {
  let win: EventTarget;
  let doc: EventTarget & { hidden: boolean; documentElement: { dataset: Record<string, string> } };
  let effects: Sfx;
  const context = () => TestAudioContext.instances.at(-1)!;
  const tap = () => win.dispatchEvent(new Event('pointerdown'));
  beforeEach(() => {
    TestAudioContext.instances = [];
    win = Object.assign(new EventTarget(), { AudioContext: TestAudioContext });
    doc = Object.assign(new EventTarget(), { hidden: false, documentElement: { dataset: {} } });
    vi.stubGlobal('window', win); vi.stubGlobal('document', doc); vi.stubGlobal('navigator', {});
    effects = new Sfx(); effects.init(undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('waits for a gesture, then starts attack noise and skill tones', () => {
    effects.play('hit'); expect(TestAudioContext.instances).toHaveLength(0);
    tap(); effects.play('hit'); effects.play('zap');
    expect(context().noises[0]!.start).toHaveBeenCalledOnce();
    expect(context().tones).toHaveLength(3);
    for (const tone of context().tones) expect(tone.start).toHaveBeenCalledOnce();
  });

  it('recovers on a later tap after an earlier resume was denied', async () => {
    // Browser policy may reject the first resume; consuming the listener here used to lose audio forever.
    const original = TestAudioContext.prototype.createBuffer;
    vi.spyOn(TestAudioContext.prototype, 'createBuffer').mockImplementationOnce(function (this: TestAudioContext) {
      this.resume.mockRejectedValueOnce(new Error('NotAllowedError'));
      return original.call(this);
    });
    tap(); await Promise.resolve(); expect(context().state).toBe('suspended');
    tap(); effects.play('hit');
    expect(context().resume).toHaveBeenCalledTimes(2);
    expect(context().noises[0]!.start).toHaveBeenCalledOnce();
  });

  it('recovers after the context is suspended again during the session', () => {
    tap(); const ctx = context(); ctx.state = 'suspended';
    tap(); effects.play('heal');
    expect(TestAudioContext.instances).toHaveLength(1);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ctx.tones).toHaveLength(3);
  });

  it('resumes after returning to the page and handles Safari interruption', () => {
    tap(); const ctx = context();
    doc.hidden = true; ctx.state = 'interrupted'; ctx.dispatchEvent(new Event('statechange'));
    effects.play('hit'); expect(ctx.resume).toHaveBeenCalledTimes(1); expect(ctx.tones).toHaveLength(0);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); effects.play('hit');
    expect(ctx.resume).toHaveBeenCalledTimes(2); expect(ctx.tones).toHaveLength(1);
    ctx.state = 'interrupted'; ctx.dispatchEvent(new Event('statechange'));
    expect(ctx.resume).toHaveBeenCalledTimes(3);
  });

  it('does not unlock on visibility alone or override mute', () => {
    doc.dispatchEvent(new Event('visibilitychange')); expect(TestAudioContext.instances).toHaveLength(0);
    effects.setMuted(true); tap(); effects.play('hit'); expect(TestAudioContext.instances).toHaveLength(0);
    effects.setMuted(false); effects.play('hit'); expect(context().noises[0]!.start).toHaveBeenCalledOnce();
  });

  it('recreates a closed context and clears its old sound throttle', () => {
    tap(); effects.play('hit'); const old = context(); old.state = 'closed';
    tap(); effects.play('hit');
    expect(TestAudioContext.instances).toHaveLength(2);
    expect(context().noises[0]!.start).toHaveBeenCalledOnce();
  });

  it('uses Safari playback sessions when supported, with a safe fallback when rejected', () => {
    const audioSession = { type: 'auto' }; vi.stubGlobal('navigator', { audioSession });
    tap(); expect(audioSession.type).toBe('playback');
    vi.stubGlobal('navigator', { get audioSession() { throw new Error('unsupported'); } });
    context().state = 'suspended'; tap(); effects.play('zap');
    expect(context().tones).toHaveLength(2);
  });

  it('retries from keyboard input and keeps the fallback AudioContext constructor', () => {
    vi.stubGlobal('window', Object.assign(win, { AudioContext: undefined, webkitAudioContext: TestAudioContext }));
    win.dispatchEvent(new Event('keydown')); context().state = 'suspended';
    win.dispatchEvent(new Event('keydown')); effects.play('guard');
    expect(context().resume).toHaveBeenCalledTimes(2); expect(context().noises[0]!.start).toHaveBeenCalledOnce();
  });

  it('tries to recover a suspended context during playback without replaying missed effects', () => {
    tap(); context().state = 'suspended'; effects.play('hit');
    expect(context().resume).toHaveBeenCalledTimes(2); expect(context().noises).toHaveLength(0);
    effects.play('zap'); expect(context().tones).toHaveLength(2);
  });

  it('previews after resuming without needing a second gesture', async () => {
    expect(await effects.preview()).toBe(true);
    expect(context().noises[0]!.start).toHaveBeenCalledOnce();
    expect(context().tones[0]!.start).toHaveBeenCalledOnce();
  });

  it('does not let a preview silently change mute or zero-volume preferences', async () => {
    effects.setMuted(true); expect(await effects.preview()).toBe(false);
    expect(effects.settings.muted).toBe(true); expect(TestAudioContext.instances).toHaveLength(0);
    effects.setMuted(false); effects.setVolume(0); expect(await effects.preview()).toBe(false);
    expect(effects.settings.volume).toBe(0);
  });
});
