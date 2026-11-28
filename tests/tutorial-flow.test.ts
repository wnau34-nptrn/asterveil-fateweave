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
    // AUTO: locked on map 1, then taught once in a random battle or the World Boss (never in a boss/elite fight).
    expect(battleLessonTip(fresh(), 'random', ['battle'], MAPS)).toBeUndefined();
    const map2 = { ...fresh(), cleared: [MAPS[0]!.id] };
    expect(battleLessonTip(map2, 'random', [], MAPS)).toMatchObject({ id: 'auto', target: '#battle-auto' });
    expect(battleLessonTip(map2, 'worldBoss', [], MAPS)?.id).toBe('auto');
    expect(battleLessonTip(map2, 'boss', [], MAPS)).toBeUndefined();
    expect(battleLessonTip(map2, 'random', ['auto'], MAPS)).toBeUndefined();
    expect(featureOpen(fresh(), MAPS, 'auto')).toBe(false); expect(featureOpen(map2, MAPS, 'auto')).toBe(true); expect(featureOpen({ ...fresh(), veteran: true }, MAPS, 'auto')).toBe(true);
    expect(lobbyLesson(fresh(), MAPS, [])?.id).toBe('home'); expect(lobbyLesson({ ...fresh(), veteran: true }, MAPS, [])).toBeUndefined();
  });
});

describe('OD-54 stage C: camp lessons follow the NPC cards and newly opened systems', () => {
  const claimedAll = (p: Profile): Profile => ({ ...p, guides: Object.fromEntries(MAPS[0]!.guides.map(g => [g.id, 'claimed' as const])) });
  it('points at the system the current card asks for, then at its claim button once done', () => {
    const p = fresh();
    expect(lobbyLesson(p, MAPS, ['home'])).toMatchObject({ id: 'card:guide-wear', target: '#lobby-tab-gear' });
    const worn = structuredClone(p); const id = worn.party.deployed[0]!;
    worn.members[id] = { ...worn.members[id]!, gear: { body: { uid: 1, slot: 'body', rarity: 1, level: 1, affixes: [], q: { main: 100, affixes: [] } } } };
    expect(lobbyLesson(worn, MAPS, ['home'])).toMatchObject({ id: 'claim:guide-wear', target: '#guide-claim' });
    expect(lobbyLesson(worn, MAPS, ['home', 'claim:guide-wear'])).toBeUndefined();
  });
  it('shows a system once, only when the map that opens it was the last one cleared', () => {
    const after1 = claimedAll({ ...fresh(), cleared: [MAPS[0]!.id] });
    expect(lobbyLesson(after1, MAPS, ['home'])).toMatchObject({ id: 'open:quests', target: '#lobby-board' });
    // OD-59: after map 1 the World Boss and the fate-weave cabinet open too, each pointed at once, in this order.
    expect(lobbyLesson(after1, MAPS, ['home', 'open:quests'])).toMatchObject({ id: 'open:wboss', target: '#lobby-wboss' });
    expect(lobbyLesson(after1, MAPS, ['home', 'open:quests', 'open:wboss'])).toMatchObject({ id: 'open:gacha', target: '#lobby-gacha' });
    // Owner 2026-11-28: AUTO opens with map 2 (after map 1); the camp says so, the next ordinary battle teaches the button.
    expect(lobbyLesson(after1, MAPS, ['home', 'open:quests', 'open:wboss', 'open:gacha'])).toMatchObject({ id: 'open:auto', target: '#lobby-depart' });
    expect(lobbyLesson(after1, MAPS, ['home', 'open:quests', 'open:wboss', 'open:gacha', 'open:auto'])).toMatchObject({ id: 'open:team' });
    expect(lobbyLesson(after1, MAPS, ['home', 'open:quests', 'open:wboss', 'open:gacha', 'open:auto', 'open:team'])?.id).toBe('farm');
    // The ticket pointer: after a first pull, once 10 tickets are waiting again.
    const pulled = { ...after1, gacha: { tickets: 10, points: 10, serial: 1, history: [] } }, all: LessonId[] = ['home', 'open:quests', 'open:wboss', 'open:gacha', 'open:auto', 'open:team'];
    expect(lobbyLesson(pulled, MAPS, all)).toMatchObject({ id: 'tickets', target: '#lobby-gacha' });
    expect(lobbyLesson({ ...pulled, gacha: { ...pulled.gacha, tickets: 9 } }, MAPS, all)?.id).toBe('farm');
    const after2 = { ...after1, cleared: MAPS.slice(0, 2).map(m => m.id) };
    expect(lobbyLesson(after2, MAPS, ['home'])?.id).toBe('open:market');
    // A company far ahead does not get every earlier system at once.
    const after3 = { ...after1, cleared: MAPS.slice(0, 3).map(m => m.id) };
    expect(lobbyLesson(after3, MAPS, ['home'])?.id).toBe('open:fuse');
    expect(lobbyLesson({ ...after3, veteran: true }, MAPS, [])).toBeUndefined();
  });

  it('farming lessons: replay pointer last, sweep row in the maps sheet, hunt and boss targets in the hunt sheet', () => {
    const m1 = MAPS[0]!, after1 = claimedAll({ ...fresh(), cleared: [m1.id] }), done: LessonId[] = ['home', 'open:quests', 'open:wboss', 'open:gacha', 'open:auto', 'open:team'];
    // The replay pointer waits for the camp's own lessons, then points at the maps button.
    expect(lobbyLesson(after1, MAPS, ['home'])?.id).toBe('open:quests');
    expect(lobbyLesson(after1, MAPS, done)).toMatchObject({ id: 'farm', target: '#lobby-maps' });
    expect(lobbyLesson(after1, MAPS, [...done, 'farm'])).toBeUndefined();
    expect(lobbyLesson(fresh(), MAPS, ['home', 'card:guide-wear', 'claim:guide-wear'])).toBeUndefined();
    // The sweep row (real numbers from the map) shows once the maps sheet is open after the first clear, once only.
    // Another map's card is showing: select the cleared map first, then the row appears.
    expect(lobbyLesson(after1, MAPS, ['home'], 'maps', MAPS[1]!.id)).toMatchObject({ id: 'sweeppick', target: `#map-node-${m1.id}` });
    const sw = lobbyLesson(after1, MAPS, ['home'], 'maps', m1.id)!;
    expect(sw).toMatchObject({ id: 'sweep', target: `#map-sweep-row-${m1.id}` });
    expect(sw.text).toContain(`เสบียง ${m1.sweep.cost}`); expect(sw.text).toContain(`${m1.sweep.perMapDaily} ครั้ง`); expect(sw.text).toContain(`${m1.sweep.cap}`);
    expect(lobbyLesson(after1, MAPS, ['home', 'sweep'], 'maps', m1.id)?.id).not.toBe('sweep');
    expect(lobbyLesson(fresh(), MAPS, ['home'], 'maps', m1.id)?.id).not.toBe('sweep');
    // Hunt opens after map 2; its target is pointed at inside the hunt sheet. The boss target needs map 3.
    const after2 = { ...after1, cleared: MAPS.slice(0, 2).map(m => m.id) };
    expect(lobbyLesson(after2, MAPS, ['home'], 'hunt')).toMatchObject({ id: 'hunt', target: '#hunt-target' });
    expect(lobbyLesson(after2, MAPS, ['home', 'hunt'], 'hunt')?.id).not.toBe('bosstarget');
    expect(lobbyLesson(after1, MAPS, ['home'], 'hunt')?.id).not.toBe('hunt');
    const after3 = { ...after1, cleared: MAPS.slice(0, 3).map(m => m.id) };
    expect(lobbyLesson(after3, MAPS, ['home', 'hunt'], 'hunt')).toMatchObject({ id: 'bosstarget', target: '#boss-target' });
    expect(lobbyLesson(after3, MAPS, ['home', 'hunt', 'bosstarget'], 'hunt')?.id).not.toBe('bosstarget');
    expect(lobbyLesson(after3, MAPS, ['home', 'open:fuse'], undefined)).toMatchObject({ id: 'open:bossCharm', target: '#lobby-tab-hunt' });
    // A veteran company never gets them.
    expect(lobbyLesson({ ...after3, veteran: true }, MAPS, [], 'hunt')).toBeUndefined();
  });
});
