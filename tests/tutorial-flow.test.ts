import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { MAPS } from '../src/content/world/maps';
import { resolveCommand } from '../src/core/battle/engine';
import { applyCommand } from '../src/core/command/game-command';
import { activeGuides, claimRunGuide, depart, featureOpen, newProfile } from '../src/core/world/profile';
import type { Commander, ExpeditionState, Profile } from '../src/core/world/types';
import { battleData, battleState, finishBattle, levelOf, recordBattle, startPrologue } from '../src/core/world/world';
import { talentPoints } from '../src/core/world/talents';
import { battleLesson } from '../src/ui/tutorial';
import { GAME_CONTEXT } from '../src/server/worker';

// OD-54 (owner 2026-11-19, docs/design/TUTORIAL_FLOW_TH.md): the prologue win reaches camp Lv2 (a first tree point),
// gear and the tree open without clearing a map, and one calming draught is given once per company.
const commander: Commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
const fresh = (): Profile => ({ ...newProfile(ruinsMap, 5, ruinsMap.firstCompany), commander });
function afterPrologue(): ExpeditionState {
  const s = startPrologue(depart(fresh(), ruinsMap, encounterById, 77).run, ruinsMap).state;
  const data = battleData(s, ruinsMap, encounterById)!; let b = battleState(s, ruinsMap, encounterById)!;
  while (b.outcome === 'active') { const l = battleLesson(b, data)!; b = resolveCommand(b, data, { beat: b.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; }
  return finishBattle(recordBattle(s, ruinsMap, encounterById, b.commands), ruinsMap, encounterById).state;
}

describe('OD-54 tutorial flow rules', () => {
  it('R1: the prologue win reaches camp Lv2 and gives the first tree point', () => {
    const s = afterPrologue();
    expect(s.tutorialDone).toBe(true); expect(levelOf(ruinsMap, s)).toBe(2);
    expect(talentPoints(ruinsMap, levelOf(ruinsMap, s), 0)).toBe(1);
  });
  it('R2: gear and the tree are open before any map is cleared; the forge still waits for map 1', () => {
    const p = fresh();
    expect(featureOpen(p, MAPS, 'gear')).toBe(true); expect(featureOpen(p, MAPS, 'tree')).toBe(true);
    expect(featureOpen(p, MAPS, 'forge')).toBe(false); expect(featureOpen(p, MAPS, 'team')).toBe(false);
  });
  it('the calming draught is given once on the map, within the carry limit, and never in battle', () => {
    const p = fresh(); const run = afterPrologue(); run.draft = undefined;
    const r = claimRunGuide(p, run, MAPS, ruinsMap, 'guide-calm');
    if ('reason' in r) throw new Error(r.reason);
    expect(r.run.potions.calm).toBe(run.potions.calm + 1); expect(r.profile.guides?.['guide-calm']).toBe('claimed');
    expect(claimRunGuide(r.profile, r.run, MAPS, ruinsMap, 'guide-calm')).toEqual({ reason: 'unknown' });
    expect(activeGuides(r.profile, MAPS).some(g => g.id === 'guide-calm')).toBe(false);
    expect(claimRunGuide(p, { ...run, potions: { ...run.potions, calm: ruinsMap.potions.carry } }, MAPS, ruinsMap, 'guide-calm')).toEqual({ reason: 'carry' });
    expect(claimRunGuide(p, { ...run, battle: { kind: 'random', encounterId: 'slime-pair', entry: {}, commands: [] } }, MAPS, ruinsMap, 'guide-calm')).toEqual({ reason: 'busy' });
    expect(claimRunGuide(p, run, MAPS, ruinsMap, 'guide-wear')).toEqual({ reason: 'unknown' });
  });
  it('the command applies the same change and is refused the second time', () => {
    const game = { profile: fresh(), run: afterPrologue() };
    const once = applyCommand(game, { kind: 'claimRunGuide', id: 'guide-calm' }, { ...GAME_CONTEXT, seeds: () => 1 } as never);
    if (!('game' in once)) throw new Error(JSON.stringify(once));
    expect(once.game.run!.potions.calm).toBe(game.run.potions.calm + 1);
    expect(applyCommand(once.game, { kind: 'claimRunGuide', id: 'guide-calm' }, { ...GAME_CONTEXT, seeds: () => 1 } as never)).toEqual({ rejected: 'unknown' });
  });
});
