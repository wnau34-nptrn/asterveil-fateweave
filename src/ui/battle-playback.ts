import type { ActionId, TurnStage } from '../core/battle/types';

// Presentation time only. Rule time remains resolver rounds/beats.
const durations: Record<ActionId, number> = {
  attack:600, guard:500, bash:800, mark:500, execute:850, bolt:850, ward:650, heal:650, prayer:700,
  brace:500, pierce:800, hinder:750, volley:900, acid:800, haste:550, ambush:750, evade:500,
  taunt:550, slam:850, valor:600, mend:600, rally:700, finisher:950, sigil:850, sanctuary:750,
  spearwall:700, weakshot:850, bomb:900, backstab:900, quake:1000, finale:950,
  challenge:600, bulwark:650, rouse:750,
  parry:550, lunge:850, sweep:900, storm:950, aegis:700, dispel:850, revive:900, halo:700, bless:650,
  hold:600, halt:850, warcry:650, disengage:800, pin:900, track:850,
  smoke:700, fury:650, catalyst:850, knives:900, decoy:600, disarm:800, stonearmor:650, guardstone:650, tremor:950, dread:600, note:800, solo:650,
};
// `boss`: any boss battle holds its enemy stages a little longer (every map's boss, not only the Rift Warden).
export function stageTiming(turn: TurnStage, reduced: boolean, fast = false, boss = false): { contact: number; end: number } {
  const canceled = turn.events.some(e => e.type === 'cancel');
  const normalEnd = canceled ? 500 : turn.action ? durations[turn.action] : boss || turn.state.encounterId === 'rift-warden' ? 1200 : 800;
  const end = fast ? Math.round(normalEnd * .65) : normalEnd;
  const attack = turn.events.some(e => e.type === 'damage' || e.type === 'dodge');
  // Reduced motion retains readable actor stages, with immediate truthful feedback.
  return { contact: reduced || canceled ? 0 : Math.round(end * (attack ? .35 : .4)), end };
}

export interface PlaybackCue { at: number; run(): void }
// One owner for every pending UI cue and every playing stage sound.
export class BattlePlayback {
  private generation = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private cleanups = new Set<() => void>();
  own(cleanup: () => void): void { this.cleanups.add(cleanup); }
  start(cues: readonly PlaybackCue[]): void {
    this.cancel();
    const generation = this.generation;
    const immediate: PlaybackCue[] = [];
    for (const cue of [...cues].sort((a,b) => a.at-b.at)) {
      if (cue.at === 0) { immediate.push(cue); continue; }
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (this.generation === generation) cue.run();
      }, cue.at);
      this.timers.add(timer);
    }
    for (const cue of immediate) if (this.generation === generation) cue.run();
  }
  cancel(): void {
    this.generation++;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.clear();
  }
}
