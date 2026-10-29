import { describe, expect, it } from 'vitest';
import { riftWarden, vanguardCaptain, encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { createBattle, currentHeroId, enemyIntent, phaseMoves, previewCommand, resolveCommand, roundOrder, targetOptions } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition } from '../src/core/battle/types';
import { hardEncounter } from '../src/core/world/world';
import { foeProfile } from '../src/ui/battle-status';
import { battleLesson } from '../src/ui/tutorial';

// Boss phases (owner 2026-10-22): a reached HP threshold turns the boss's next turn into a summon / move change.
const step = (s: BattleState, d: EncounterDefinition) => {
  const hero = currentHeroId(s, d)!; const target = targetOptions(s, d, hero, 'attack').find(t => t.valid && t.id !== 'f1') ?? targetOptions(s, d, hero, 'attack').find(t => t.valid)!;
  return resolveCommand(s, d, { beat: s.beat, heroId: hero, action: 'attack', targetId: target.id });
};
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;

describe('boss summons', () => {
  const d = vanguardCaptain;
  it('reserves wait off the field: not in the queue, not targetable', () => {
    const s = createBattle(d);
    expect(foe(s, 'b2')).toMatchObject({ hp: 0, absent: true });
    expect(roundOrder(s, d)).not.toContain('b2');
    expect(targetOptions(s, d, currentHeroId(s, d)!, 'attack').find(t => t.id === 'b2')!.valid).toBe(false);
    expect(foeProfile(s, d, 'b2')).toBeUndefined();
  });
  it('at 60% the captain spends its turn calling a hunter, who acts from the next round', () => {
    let s = createBattle(d); foe(s, 'f1').hp = Math.floor(d.enemies.find(e => e.id === 'f1')!.maxHp * .6);
    expect(enemyIntent(s, d, 'f1', s.round)).toMatchObject({ special: 'phase', damage: 0, unstoppable: true, name: 'Call the Hunt' });
    const heroHp = s.heroes.map(h => h.hp); let phaseTurn;
    while (!phaseTurn) { const r = step(s, d); phaseTurn = r.turns.find(t => t.actorId === 'f1'); s = r.state; }
    expect(phaseTurn.events.map(e => e.type)).toEqual(['phase', 'summon']);
    expect(phaseTurn.events.some(e => e.type === 'damage')).toBe(false);
    expect(foe(s, 'b2')).toEqual({ id: 'b2', hp: 60, markedUntil: 0 });
    expect(foe(s, 'f1').phase).toBe(1);
    expect(s.order).not.toContain('b2'); expect(roundOrder(s, d, s.round + 1)).toContain('b2');
    // The captain keeps its opening cycle (its phase has no moves of its own).
    expect(phaseMoves(s, d, 'f1')).toEqual(d.intents.filter(i => i.sourceId === 'f1'));
    expect(enemyIntent(s, d, 'f1', s.round + 1)?.special).toBeUndefined();
    expect(heroHp.length).toBe(4);
  });
  it('the battle is won the moment the boss falls; its minions flee', () => {
    const s = createBattle(d); foe(s, 'f1').hp = 1;
    const hero = currentHeroId(s, d)!; const r = resolveCommand(s, d, { beat: s.beat, heroId: hero, action: 'attack', targetId: 'f1' });
    expect(r.state.outcome).toBe('victory'); expect(r.state.enemies.filter(e => e.hp > 0).length).toBeGreaterThan(0);
  });
  it('a mini-boss (no phases) is won only when every foe is down', () => {
    const d = lookup('mini-veil-golem')!; expect(d.phases).toBeUndefined();
    const s = createBattle(d); foe(s, 'f1').hp = 1;
    const hero = currentHeroId(s, d)!; const r = resolveCommand(s, d, { beat: s.beat, heroId: hero, action: 'attack', targetId: 'f1' });
    expect(foe(r.state, 'f1').hp).toBe(0); expect(r.state.outcome).toBe('active');
  });
});

describe('boss phase two', () => {
  const d = riftWarden;
  it('the warden summons two wisps at 70%, then at 35% charges before its cataclysm and rift waves', () => {
    let s = createBattle(d); const max = d.enemies.find(e => e.id === 'f1')!.maxHp;
    foe(s, 'f1').hp = Math.floor(max * .7);
    while (foe(s, 'f1').phase !== 1) s = step(s, d).state;
    expect(['b1', 'b2'].map(id => foe(s, id).hp)).toEqual(d.enemies.filter(e => e.id === 'b1' || e.id === 'b2').map(e => e.maxHp));
    expect(foe(s, 'f2').absent).toBe(true); // hard mode only
    foe(s, 'f1').hp = Math.floor(max * .35);
    const seen: string[] = []; let aoe;
    while (s.outcome === 'active' && seen.length < 5) {
      const r = step(s, d); s = r.state;
      for (const t of r.turns.filter(x => x.actorId === 'f1')) { seen.push(t.intent!.special ?? t.intent!.name); if (t.intent!.all) aoe = t; }
    }
    expect(seen).toEqual(['phase', 'Rift Gathering', 'Rift Cataclysm', 'Rift Wave', 'Crushing Blow']);
    const standing = aoe!.before ?? aoe!.state;
    expect(aoe!.events.filter(e => e.type === 'damage' || e.type === 'dodge').map(e => e.targetId).sort()).toEqual(standing.heroes.filter(h => h.hp > 0).map(h => h.id).sort());
  });
  it('hard mode starts each phase 10% earlier and calls its hard-mode reserves', () => {
    const hard = hardEncounter(d, 'boss', map);
    expect(hard.phases!.map(p => p.below)).toEqual([80, 45]);
    expect(hard.phases![0]!.summon).toEqual(['b1', 'b2', 'f2']);
    expect(hardEncounter(lookup('elite-briar-lord')!, 'boss', map).phases![0]).toMatchObject({ below: 60, summon: ['b2'] });
  });
  it('previews and replays phase turns exactly; the foe sheet shows the next threshold', () => {
    const s = createBattle(d); foe(s, 'f1').hp = Math.floor(d.enemies.find(e => e.id === 'f1')!.maxHp * .7);
    const hero = currentHeroId(s, d)!; const c = { beat: s.beat, heroId: hero, action: 'attack' as const, targetId: 'f1' };
    expect(previewCommand(s, d, c)).toEqual(resolveCommand(s, d, c));
    expect(foeProfile(createBattle(d), d, 'f1')!.stats.find(r => r.label === 'ช่วงการต่อสู้')!.value).toContain('70%');
  });
  it('the advisor never guards a phase turn or a charge, and still wins the warden', () => {
    let s = createBattle(d);
    while (s.outcome === 'active' && s.commands.length < 200) {
      const l = battleLesson(s, d)!;
      if (s.intent?.special || s.intent?.charge || s.intent?.all) expect(l.action).not.toBe('guard');
      s = resolveCommand(s, d, { beat: s.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state;
    }
    expect(s.outcome).toBe('victory');
  });
});
