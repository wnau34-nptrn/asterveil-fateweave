import { describe, expect, it } from 'vitest';
import { HIT_STOP_MS, hitStopMs } from '../src/ui/battle-playback';
import type { BattleEvent, TurnStage } from '../src/core/battle/types';

// UX audit P2-2 part 2: hit-stop only on a heavy landed hit (down or interrupt), never when reduced.
const stage = (events: Partial<BattleEvent>[]): TurnStage => ({ actorId: 'guardian', side: 'hero', beat: 1, round: 1, intent: null, state: {} as TurnStage['state'], events: events.map(e => ({ text: '', ...e })) as BattleEvent[] });
describe('hitStopMs', () => {
  const hit = { type: 'damage' as const, amount: 9, targetId: 'f1' };
  it('holds a down or an interrupt that landed', () => {
    expect(hitStopMs(stage([hit, { type: 'down', targetId: 'f1' }]), false, false)).toBe(HIT_STOP_MS);
    expect(hitStopMs(stage([{ type: 'counter', amount: 3 }, { type: 'interrupt' }]), false, false)).toBe(HIT_STOP_MS);
    expect(HIT_STOP_MS).toBeGreaterThanOrEqual(40); expect(HIT_STOP_MS).toBeLessThanOrEqual(60);
  });
  it('skips ordinary hits, blocked hits, cancels and every reduced setting', () => {
    expect(hitStopMs(stage([hit]), false, false)).toBe(0);
    expect(hitStopMs(stage([{ type: 'damage', amount: 0 }, { type: 'down' }]), false, false)).toBe(0);
    expect(hitStopMs(stage([hit, { type: 'down' }, { type: 'cancel' }]), false, false)).toBe(0);
    expect(hitStopMs(stage([hit, { type: 'down' }]), true, false)).toBe(0);
    expect(hitStopMs(stage([hit, { type: 'down' }]), false, true)).toBe(0);
  });
});
