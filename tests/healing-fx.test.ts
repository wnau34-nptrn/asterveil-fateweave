import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { healingCues } from '../src/game/visuals/healing-fx';
import { defenseCues } from '../src/game/visuals/defense-fx';
import { healingFixture, healingSkillList } from './fixtures/healing';
import { resolveCommand } from '../src/core/battle/engine';

describe('painted healing follows actual resolver events', () => {
  for (const skill of healingSkillList) it(`${skill} routes its actual cast recipients`, () => {
    const f = healingFixture(skill), turn = f.turns[0]!;
    const cues = healingCues(turn).filter(c => c.kind === 'cast');
    expect(cues.length).toBeGreaterThan(0); expect(cues.every(c => c.skill === skill)).toBe(true);
    for (const cue of cues) expect(turn.events).toContain(cue.event);
    if (skill === 'rouse') { expect(cues[0]!.targetId).toBe(turn.state.guard!.targetId); expect(turn.events.some(e => e.type === 'heal')).toBe(false); }
    if (skill === 'revive') expect(turn.before!.heroes.find(h => h.id === cues[0]!.targetId)).toMatchObject({ hp: 0, fell: true });
  });
  for (const skill of ['bless', 'mend'] as const) it(`${skill} has no cast heal and heals only at actual upkeep`, () => {
    const f = healingFixture(skill);
    expect(f.turns[0]!.events.some(e => e.type === 'heal')).toBe(false);
    const ticks = f.turns.flatMap(healingCues).filter(c => c.kind === 'tick');
    expect(ticks.length).toBe(skill === 'bless' ? 1 : 4);
    expect(ticks.every(c => c.skill === skill && c.event.type === 'heal' && c.event.amount! > 0)).toBe(true);
    const upkeep = f.turns.find(t => healingCues(t).some(c => c.kind === 'tick'))!;
    expect(upkeep.actorId).not.toBe(f.actor.id);
  });
  it('Rouse covers multiple attackers and does not duplicate defense redirects', () => {
    const f = healingFixture('rouse'), hits = f.turns.filter(t => t.side === 'enemy');
    expect(hits).toHaveLength(2);
    for (const t of hits) {
      const cue = healingCues(t).find(c => c.kind === 'redirect')!;
      expect(cue).toBeDefined(); expect(cue.targetId).toBe(f.actor.id);
      expect(t.events.find(e => e.type === 'damage')!.targetId).toBe(cue.targetId);
      expect(defenseCues(t, f.data).some(c => c.kind === 'redirect')).toBe(false);
    }
    expect(hits[1]!.actorId).not.toBe(hits[1]!.before!.guard!.sourceId);
  });
  it('twin heal and overflow acknowledge only actual restored HP and separate real barrier', () => {
    const twin = healingFixture('heal', 'twin').turns[0]!;
    expect(healingCues(twin).filter(c => c.kind === 'cast')).toHaveLength(2);
    const overflow = healingFixture('heal', 'overflow').turns[0]!;
    expect(healingCues(overflow).find(c => c.kind === 'cast')!.event.amount).toBe(1);
    expect(healingCues(overflow).find(c => c.kind === 'barrier')!.event.amount).toBeGreaterThan(0);
  });
  it('full HP is unavailable to Heal and Prayer does not fabricate healed recipients', () => {
    expect(healingFixture('heal', 'full').cast).toBeUndefined();
    expect(healingFixture('prayer', 'full').cast).toBeUndefined();
  });
  it('long prayer echo is a later upkeep cue, without replaying the cast', () => {
    const f = healingFixture('prayer', 'echo');
    expect(healingCues(f.turns[0]!).every(c => c.kind === 'cast')).toBe(true);
    const ticks = f.turns.flatMap(healingCues).filter(c => c.kind === 'tick');
    expect(ticks.length).toBeGreaterThan(0); expect(ticks.every(c => c.skill === 'prayer')).toBe(true);
  });
  it('Mend life rhythm barriers at cast stay separate from later heals', () => {
    const f = healingFixture('mend', 'barrier');
    expect(healingCues(f.turns[0]!).filter(c => c.kind === 'barrier')).toHaveLength(4);
    expect(f.turns[0]!.events.some(e => e.type === 'heal')).toBe(false);
  });
  it('Mend solo amplification comes from real heal amounts, without extra visual hits', () => {
    const f = healingFixture('mend', 'solo');
    const ticks = f.turns.flatMap(healingCues).filter(c => c.kind === 'tick');
    const solo = f.turns.find(t => t.action === 'solo')!;
    const boosted = ticks.filter(c => c.targetId === solo.targetId);
    expect(boosted.some(c => c.event.amount! >= 15)).toBe(true);
  });
  for (const skill of ['bless', 'mend'] as const) it(`${skill} does not heal after its source falls`, () => {
    const f = healingFixture(skill, 'source-down');
    expect(f.turns.some(t => t.events.some(e => e.type === 'down' && e.targetId === f.actor.id))).toBe(true);
    expect(f.turns.flatMap(healingCues).filter(c => c.kind === 'tick')).toEqual([]);
  });
  it('invalid revive target still fails in the unchanged resolver', () => {
    const f = healingFixture('revive');
    expect(() => resolveCommand(f.state, f.data, { beat: f.state.beat, heroId: f.actor.id, action: 'revive', targetId: f.actor.id }, true)).toThrow();
  });
});
