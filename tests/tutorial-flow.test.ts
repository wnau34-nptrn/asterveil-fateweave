import { describe, expect, it } from 'vitest';
import { encounterById } from '../src/content/encounters/catalog';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { MAPS } from '../src/content/world/maps';
import { resolveCommand } from '../src/core/battle/engine';
import { applyCommand } from '../src/core/command/game-command';
import { activeGuides, claimRunGuide, depart, featureOpen, newProfile } from '../src/core/world/profile';
import type { Commander, ExpeditionState, Profile } from '../src/core/world/types';
import { battleData, battleState, findTiles, finishBattle, levelOf, memberDef, recordBattle, startPrologue } from '../src/core/world/world';
import { battleLessonTip, lobbyLesson, worldLesson, type LessonId } from '../src/ui/lessons';
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

describe('OD-54 lessons on the map (ui/lessons.ts)', () => {
  const all = ['levelup', 'wear', 'tree', 'lanes', 'walk'] as const;
  const max = (run: ExpeditionState) => (id: string) => memberDef(encounterById, ruinsMap, run, id)!.maxHp;
  it('follows the design order after the prologue and stops once a map is cleared', () => {
    const p = fresh(), run = afterPrologue(); run.draft = undefined; const seen: LessonId[] = [];
    for (const id of all) { expect(worldLesson(p, run, ruinsMap, MAPS, seen, max(run))?.id).toBe(id); seen.push(id); }
    expect(worldLesson(p, run, ruinsMap, MAPS, seen, max(run))).toBeUndefined();
    expect(worldLesson({ ...p, cleared: [ruinsMap.id] }, run, ruinsMap, MAPS, [], max(run))).toBeUndefined();
  });
  it('low HP, fatigue with the draught, the elite and the boss each show once their moment comes', () => {
    const p = fresh(), run = afterPrologue(); run.draft = undefined; const seen: LessonId[] = [...all];
    const hurt = structuredClone(run); hurt.hp[hurt.roster.deployed[0]!] = 1;
    expect(worldLesson(p, hurt, ruinsMap, MAPS, seen, max(hurt))?.id).toBe('lowhp');
    const tired = structuredClone(run); tired.fatigue = { [tired.roster.deployed[0]!]: 5 };
    expect(worldLesson(p, tired, ruinsMap, MAPS, seen, max(tired))?.id).toBe('fatigue');
    expect(worldLesson(p, tired, ruinsMap, MAPS, [...seen, 'fatigue'], max(tired))).toMatchObject({ id: 'calm', action: 'calm' });
    // A veteran company still learns about fatigue, but the draught is gone once claimed.
    expect(worldLesson({ ...p, guides: { 'guide-calm': 'claimed' } }, tired, ruinsMap, MAPS, [...seen, 'fatigue'], max(tired))).toBeUndefined();
    const boss = findTiles(ruinsMap, 'boss')[0]!; const near = structuredClone(run); near.position = { x: boss.x, y: boss.y + 1 };
    expect(worldLesson(p, near, ruinsMap, MAPS, seen, max(near))?.id).toBe('boss');
    const elite = ruinsMap.elites.find(e => !e.forced);
    if (elite) { const by = structuredClone(run); by.position = { x: elite.x, y: elite.y }; expect(worldLesson(p, by, ruinsMap, MAPS, seen, max(by))?.id).toBe('elite'); }
  });
  it('the first battle and the first camp visit each have one tip', () => {
    expect(battleLessonTip(fresh(), 'random', [])?.target).toBe('#intent');
    expect(battleLessonTip(fresh(), 'tutorial', [])).toBeUndefined();
    expect(battleLessonTip(fresh(), 'random', ['battle'])).toBeUndefined();
    expect(lobbyLesson(fresh(), [])?.id).toBe('home'); expect(lobbyLesson({ ...fresh(), veteran: true }, [])).toBeUndefined();
  });
});
