import { describe, expect, it } from 'vitest';
import { eliteBriarLord, encounterById as lookup, riftWarden } from '../src/content/encounters/catalog';
import { heroes } from '../src/content/heroes/team';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { chapterOne as map } from '../src/content/world/chapter1';
import { gameRules } from '../src/content/world/rules';
import { createBattle, currentHeroId, previewCommand, replay, resolveCommand, targetOptions } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition } from '../src/core/battle/types';
import { hardEncounter } from '../src/core/world/world';

// P05 (OD-09): the forest boss / map 3 gate (Briar Lord) and the rift warden wear a bark (veilguard) on normal mode: hits are
// blunted until a Mark, acid or a dispel opens it. Answer every party has: Aira's Mark (the prologue recruit).
const bosses: [string, EncounterDefinition][] = [['briar lord', eliteBriarLord], ['rift warden', riftWarden]];
// Advance with plain attacks until a hero who can hit the boss (f1) has the turn.
function heroOnBoss(data: EncounterDefinition): { s: BattleState; heroId: string } {
  let s = createBattle(data);
  for (let i = 0; i < 40; i++) {
    const heroId = currentHeroId(s, data)!;
    if (targetOptions(s, data, heroId, 'attack').some(o => o.id === 'f1' && o.valid)) return { s, heroId };
    const t = targetOptions(s, data, heroId, 'attack').find(o => o.valid)!;
    s = resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId: t.id }).state;
  }
  throw new Error('no hero reached the boss');
}
const hitOn = (s: BattleState, data: EncounterDefinition, heroId: string) =>
  resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId: 'f1' }).events.find(e => e.type === 'damage' && e.targetId === 'f1')!.amount!;

describe('P05 boss bark', () => {
  it.each(bosses)('the %s wears veilguard at the hard-mode numbers; nothing else in its field does', (_, data) => {
    expect(data.enemies.find(e => e.id === 'f1')!.traits).toEqual(['veilguard']);
    expect(data.enemies.filter(e => e.id !== 'f1').every(e => !e.traits)).toBe(true);
    const { thornsPercent, veilguardPercent, enrageBelow, enragePercent } = gameRules.progression.hardTraits;
    expect(data.rules.traits).toEqual({ thornsPercent, veilguardPercent, enrageBelow, enragePercent });
  });
  it.each(bosses)('the %s takes a quarter less from an unopened hit; a dispelled or marked bark takes it in full; previews match', (_, data) => {
    const { s, heroId } = heroOnBoss(data);
    const opened = structuredClone(s); opened.enemies.find(e => e.id === 'f1')!.dispelledUntil = s.round + 3;
    const bare = hitOn(s, data, heroId), full = hitOn(opened, data, heroId);
    expect(bare).toBe(Math.ceil(full * (1 - data.rules.traits!.veilguardPercent / 100)));
    expect(bare).toBeLessThan(full);
    const marked = structuredClone(s); marked.enemies.find(e => e.id === 'f1')!.markedUntil = s.round + 3;
    expect(hitOn(marked, data, heroId)).toBeGreaterThanOrEqual(full);
    for (const st of [s, opened, marked]) { const c = { beat: st.beat, heroId, action: 'attack' as const, targetId: 'f1' }; expect(previewCommand(st, data, c)).toEqual(resolveCommand(st, data, c)); }
  });
  it('the answer is guaranteed: Aira, recruited in the prologue of every company, carries Mark in her base kit', () => {
    expect(ruinsMap.recruits).toContainEqual({ hero: 'tracer', at: 'prologue' });
    expect(heroes.find(h => h.id === 'tracer')!.actions).toContain('mark');
  });
  it('a battle against the bark replays to the same state', () => {
    let s = createBattle(eliteBriarLord);
    while (s.outcome === 'active' && s.commands.length < 120) {
      const heroId = currentHeroId(s, eliteBriarLord)!; const t = targetOptions(s, eliteBriarLord, heroId, 'attack').find(o => o.valid)!;
      s = resolveCommand(s, eliteBriarLord, { beat: s.beat, heroId, action: 'attack', targetId: t.id }).state;
    }
    expect(replay(eliteBriarLord, s.commands)).toEqual(s);
  });
  it('hard mode keeps its own traits (enrage + veilguard on the boss)', () => {
    expect(hardEncounter(lookup('elite-briar-lord')!, 'boss', map).enemies.find(e => e.id === 'f1')!.traits).toEqual(['enrage', 'veilguard']);
    expect(hardEncounter(riftWarden, 'boss', map).enemies.find(e => e.id === 'f1')!.traits).toEqual(['enrage', 'veilguard']);
  });
});
