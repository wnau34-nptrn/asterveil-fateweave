import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { createBattle, currentActorId, enemyIntent, targetOptions, previewCommand, resolveCommand } from '../src/core/battle/engine';
import type { EncounterDefinition, IntentAim } from '../src/core/battle/types';

// Enemy aim proposal (docs/design/ENEMY_AIM_PROPOSAL_TH.md): `IntentDefinition.aim` chooses among the heroes the move may
// reach. veil-siege: guardian (Knight, front) · tracer (Duelist, front) · weaver (Mage, back) · healer (Priest, back);
// f1 opens with Rift Bolt (energy, slot 2), b1 with Raking Slash (physical, slot 1).
const aimed = (aim: IntentAim, source = 'f1'): EncounterDefinition =>
  ({ ...veilSiege, intents: veilSiege.intents.map(m => m.sourceId === source ? { ...m, aim } : m) });
const hp = (s: ReturnType<typeof createBattle>, id: string, v: number) => { s.heroes.find(h => h.id === id)!.hp = v; };

describe('enemy aim rules', () => {
  it('no aim keeps the written slot', () => {
    expect(enemyIntent(createBattle(veilSiege), veilSiege, 'f1', 1)!.targetId).toBe('weaver');
  });
  it('weakest: the lowest HP percent among reachable heroes; a tie keeps the slot hero', () => {
    const d = aimed('weakest'), s = createBattle(d);
    expect(enemyIntent(s, d, 'f1', 1)!.targetId).toBe('weaver');
    hp(s, 'healer', 10); expect(enemyIntent(s, d, 'f1', 1)!.targetId).toBe('healer');
  });
  it('weakest on a physical move still only reaches the front while it stands', () => {
    const d = aimed('weakest', 'b1'), s = createBattle(d); hp(s, 'healer', 1); hp(s, 'guardian', 20);
    expect(enemyIntent(s, d, 'b1', 1)!.targetId).toBe('guardian');
  });
  it('support: the first support-role hero, else the slot', () => {
    const d = aimed('support'), s = createBattle(d);
    expect(enemyIntent(s, d, 'f1', 1)!.targetId).toBe('healer');
    hp(s, 'healer', 0); expect(enemyIntent(s, d, 'f1', 1)!.targetId).toBe('weaver');
  });
  it('pack: the target of the first other standing foe', () => {
    const d = aimed('pack', 'b1'), s = createBattle(d);
    expect(enemyIntent(s, d, 'b1', 1)!.targetId).toBe(enemyIntent(s, d, 'f1', 1)!.targetId === 'weaver' ? 'tracer' : enemyIntent(s, d, 'f1', 1)!.targetId);
  });
  it('a taunt still overrides any aim', () => {
    const d = aimed('weakest'), s = createBattle(d); hp(s, 'healer', 10); s.taunt = { heroId: 'guardian', round: 1 };
    expect(enemyIntent(s, d, 'f1', 1)!.targetId).toBe('guardian');
  });
  it('preview equals the resolved result and replay is deterministic with aims set', () => {
    const d = aimed('weakest'); let s = createBattle(d); hp(s, 'healer', 10);
    for (let i = 0; i < 6 && s.outcome === 'active'; i++) {
      const id = currentActorId(s)!; const hero = s.heroes.find(h => h.id === id);
      if (!hero) break;
      const cmd = { beat: s.beat, heroId: id, action: 'attack' as const, targetId: targetOptions(s, d, id, 'attack').find(o => o.valid)!.id };
      const preview = previewCommand(s, d, cmd); const next = resolveCommand(s, d, cmd);
      expect(preview.state).toEqual(next.state); expect(resolveCommand(s, d, cmd).state).toEqual(next.state); s = next.state;
    }
  });
});
