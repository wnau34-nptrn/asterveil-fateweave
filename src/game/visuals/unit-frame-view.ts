import { unitDownedFrame, unitIdleFrame, unitSample, type UnitFrames } from './unit-frames';

export interface FrameImage {
  setFrame(frame: number): unknown;
  setAlpha(alpha: number): unknown;
  setVisible(visible: boolean): unknown;
}
// Only two instances of an already-loaded texture; no new atlas or render target.
export function unitFrameView(art: string, primary: FrameImage, next: FrameImage, alive: () => boolean, align: () => void): UnitFrames {
  let looped: number | undefined;
  return {
    show: (pose, phase, progress, clip, duration) => {
      const sample = unitSample(pose, phase, progress, clip, art, duration);
      if (!sample) return false;
      looped = undefined;
      primary.setFrame(sample.from); primary.setAlpha(1 - sample.mix);
      next.setFrame(sample.to); next.setAlpha(sample.mix); next.setVisible(sample.mix > 0);
      align(); return true;
    },
    idle: elapsed => {
      const frame = unitIdleFrame(art, elapsed);
      if (frame === undefined || frame === looped || !alive()) return;
      looped = frame; primary.setFrame(frame); primary.setAlpha(1); next.setAlpha(0); next.setVisible(false);
    },
    reset: () => {
      looped = undefined;
      primary.setFrame(alive() ? 0 : unitDownedFrame(art)); primary.setAlpha(1);
      next.setAlpha(0); next.setVisible(false);
    },
  };
}
