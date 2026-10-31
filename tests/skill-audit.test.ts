import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { MAPS } from '../src/content/world/maps';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroCatalog } from '../src/core/world/world';
import { actionReason, beginBattle, previewCommand, replay, resolveCommand, skillCooldown, skillPower, roundOrder, currentHeroId, targetKind, targetOptions } from '../src/core/battle/engine';
import type { ActionId, EncounterDefinition } from '../src/core/battle/types';
import { characterSkillMetric } from '../src/ui/character-metrics';
import { newProfile, depart } from '../src/core/world/profile';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { battleLesson } from '../src/ui/tutorial';
import { xpAt } from './fixtures/camp-level';
import { legacyEnvelope } from './fixtures/legacy-save';
const catalog = heroCatalog(lookup,map);
const changed: [string, ActionId[]][] = [
 ['guardian',['bulwark','rouse','rally']], ['tracer',['sweep']], ['weaver',['dispel','sigil']], ['healer',['bless']],
 ['garran',['hold','halt','warcry']], ['mira',['disengage','hinder']], ['sefa',['backstab','decoy','disarm']],
 ['brann',['slam','quake','guardstone','tremor']], ['lio',['dread','note','finale']],
];
function fixture(id: string, action: ActionId): EncounterDefinition {
 const caster = catalog.find(h=>h.id===id)!;
 const others = catalog.filter(h=>h.id!==id).slice(0,3);
 return {...veilSiege,heroes:[{...caster,speed:1000,actions:['attack',action],talents: action==='finale'?{caps:{overture:0}}:undefined},...others],enemies:veilSiege.enemies.map(e=>({...e,maxHp:10000})),intents:veilSiege.intents.map(i=>({...i,damage:1}))};
}
describe('C11 skill contract',()=>{
 for(const [id,actions] of changed) for(const action of actions) it(`${id} ${action}: effect, cooldown, preview and replay`,()=>{
  const d=fixture(id,action),entry={hp:Object.fromEntries(d.heroes.map(h=>[h.id,Math.floor(h.maxHp/2)]))};
  const s=beginBattle(d,entry).state;
  const target=targetOptions(s,d,id,action).find(t=>t.valid)!;expect(target,action).toBeDefined();
  const cmd={beat:s.beat,heroId:id,action,targetId:target.id},r=resolveCommand(s,d,cmd);
  expect(previewCommand(s,d,cmd)).toEqual(r);expect(replay(d,r.state.commands,entry)).toEqual(r.state);
  const frame=r.turns[0]!.state;expect(frame.heroes.find(h=>h.id===id)!.cooldowns[action]).toBe(s.round+skillCooldown(d,id,action));
  expect(actionReason(frame,d,id,action)).toMatch(/Cooldown/);
  expect(r.turns[0]!.events.length).toBeGreaterThan(0);
  expect(()=>resolveCommand(s,d,{...cmd,beat:cmd.beat+1})).toThrow(/stale/);
  const down=structuredClone(s);down.heroes.find(h=>h.id===id)!.hp=0;expect(targetOptions(down,d,id,action).every(t=>!t.valid)).toBe(true);
 });
 it('sweep marks the lowest surviving HP in the struck row',()=>{
  const d=fixture('tracer','sweep');d.enemies=d.enemies.map(e=>({...e,row:'front'}));const s=beginBattle(d).state;s.enemies[0]!.hp=50;s.enemies[1]!.hp=70;
  const r=resolveCommand(s,d,{heroId:'tracer',action:'sweep',targetId:'enemies',beat:s.beat}).turns[0]!;
  expect(r.events.find(e=>e.type==='mark')!.targetId).toBe(s.enemies[0]!.id);expect(r.state.enemies[0]!.markedUntil).toBe(3);
 });
 it('dispel clears steadfast and sigilward shields the intended ally only when the seal lands',()=>{
  const d=fixture('weaver','dispel'),s=beginBattle(d).state;s.enemies[0]!.steadyRound=9;
  expect(resolveCommand(s,d,{heroId:'weaver',action:'dispel',targetId:s.enemies[0]!.id,beat:s.beat}).turns[0]!.state.enemies[0]!.steadyRound).toBeUndefined();
  const seal=fixture('weaver','sigil');seal.heroes=seal.heroes.map((h,i)=>i? h:{...h,talents:{caps:{sigilward:10}}});const start=beginBattle(seal).state;
  const hit=resolveCommand(start,seal,{heroId:'weaver',action:'sigil',targetId:'f1',beat:start.beat}).turns[0]!.state;
  expect(hit.heroes.find(h=>h.id===seal.heroes[2]!.id)!.barrier).toBe(10);expect(hit.enemies.find(e=>e.id==='f1')!.delayedRound).toBeUndefined();
  const physical=resolveCommand(start,seal,{heroId:'weaver',action:'sigil',targetId:'b1',beat:start.beat}).turns[0]!.state;
  expect(physical.heroes.every(h=>!h.barrier)).toBe(true);
 });
 it('renew ticks exactly twice and expires, with no attack buff',()=>{
  const d=fixture('healer','bless'),entry={hp:Object.fromEntries(d.heroes.map(h=>[h.id,10]))};let s=beginBattle(d,entry).state;
  const events=[];let r=resolveCommand(s,d,{heroId:'healer',action:'bless',targetId:d.heroes[1]!.id,beat:s.beat});events.push(...r.events);s=r.state;
  while(s.round<4&&s.outcome==='active'){const id=currentHeroId(s,d)!,target=targetOptions(s,d,id,'attack').find(t=>t.valid)!;r=resolveCommand(s,d,{heroId:id,action:'attack',targetId:target.id,beat:s.beat});events.push(...r.events);s=r.state;}
  expect(events.filter(e=>e.type==='heal'&&e.text==='Renew.')).toHaveLength(2);expect(s.heroes[1]!.renew).toBeUndefined();expect(s.heroes[1]!.empowered).toBeUndefined();
 });
 it('warcry counters only the first physical hit per covered ally and expires at caster turn',()=>{
  const d=fixture('garran','warcry');d.intents=d.intents.map(i=>({...i,kind:'physical',targetSlot:1}));let s=beginBattle(d).state;
  let r=resolveCommand(s,d,{heroId:'garran',action:'warcry',targetId:'garran',beat:s.beat});const events=[...r.events];s=r.state;
  while(s.round<2){const id=currentHeroId(s,d)!,target=targetOptions(s,d,id,'attack').find(t=>t.valid)!;r=resolveCommand(s,d,{heroId:id,action:'attack',targetId:target.id,beat:s.beat});events.push(...r.events);s=r.state;}
  expect(events.filter(e=>e.type==='counter'&&e.text==='War cry counter.')).toHaveLength(1);expect(s.warcry).toBeNull();
 });
 it('heavyhinder affects exactly two future queues; covershot adds its real damage',()=>{
  const d=fixture('mira','hinder');d.heroes=d.heroes.map((h,i)=>i?h:{...h,talents:{caps:{heavyhinder:0}}});const s=beginBattle(d).state;
  const st=resolveCommand(s,d,{heroId:'mira',action:'hinder',targetId:'b1',beat:s.beat}).turns[0]!.state;
  expect(roundOrder(st,d,2).at(-1)).toBe('b1');expect(roundOrder(st,d,3).at(-1)).toBe('b1');expect(roundOrder(st,d,4).at(-1)).not.toBe('b1');
  const cover=fixture('mira','disengage');cover.heroes=cover.heroes.map((h,i)=>i?h:{...h,talents:{caps:{covershot:6}}});const cs=beginBattle(cover).state;
  expect(resolveCommand(cs,cover,{heroId:'mira',action:'disengage',targetId:'f1',beat:cs.beat}).turns[0]!.events.find(e=>e.type==='damage')!.amount).toBe(16);
 });
 it('the archer advisor delays an energy foe aiming elsewhere only when an ally gains a turn before it',()=>{
  const d=fixture('mira','disengage');d.enemies=d.enemies.map(e=>({...e,speed:500}));d.intents=d.intents.map(i=>({...i,kind:'energy',targetSlot:1}));
  const s=beginBattle(d).state;expect(s.intent).toMatchObject({kind:'energy'});expect(s.intent!.targetId).not.toBe('mira');
  const l=battleLesson(s,d)!;expect(l.action).toBe('disengage');
  const r=resolveCommand(s,d,{beat:s.beat,heroId:l.heroId,action:l.action,targetId:l.targetId});
  expect(r.turns[0]!.state.order.at(-1)).toBe(s.intent!.sourceId);
  const late={...d,enemies:d.enemies.map(e=>({...e,speed:1}))};
  expect(battleLesson(beginBattle(late).state,late)!.action).not.toBe('disengage');
 });
 it('note age caps at three full rounds and songnote modifies damage without weakening',()=>{
  const d=fixture('lio','note');d.heroes=d.heroes.map((h,i)=>i?h:{...h,talents:{caps:{songnote:20}}});const s=beginBattle(d).state;
  s.song={heroId:'lio',action:'valor',since:-20};const r=resolveCommand(s,d,{heroId:'lio',action:'note',targetId:'f1',beat:s.beat}).turns[0]!;
  expect(r.events.find(e=>e.type==='damage')!.amount).toBe(Math.round((14+9)*1.2)+4);expect(r.events.some(e=>e.type==='weaken')).toBe(false);
 });
 it('own shadow step clears the giver expiry of a previously granted shadow',()=>{
  const d=fixture('sefa','evade'),s=beginBattle(d).state;s.heroes[0]!.evadeBy='guardian';
  const r=resolveCommand(s,d,{heroId:'sefa',action:'evade',targetId:'sefa',beat:s.beat});expect(r.turns[0]!.state.heroes[0]!.evadeBy).toBeUndefined();
 });
 it('Aegis rejects a no-op, but allows a useful level barrier to its caster',()=>{
  const d=fixture('weaver','aegis'),s=beginBattle(d).state;
  for(const h of s.heroes)h.barrier=100;
  expect(targetOptions(s,d,'weaver','aegis')[0]!.valid).toBe(false);
  s.heroes[0]!.barrier=0;expect(targetOptions(s,d,'weaver','aegis')[0]!.valid).toBe(true);
  expect(targetKind('quake')).toBe('enemies');expect(targetKind('rouse')).toBe('self');
 });
 it('metrics show effect units and real level-scaled power',()=>{
  const base=catalog[0]!,h={...base,skillLevels:{bulwark:3}};
  expect(characterSkillMetric('bulwark',h,veilSiege).target).toBe('เพื่อนแนวหน้าทุกคน');
  expect(characterSkillMetric('bulwark',h,veilSiege).value).toBe(skillPower({...veilSiege,heroes:[h]},h.id,'bulwark'));
  for(const action of ['halo','fury','revive','stonearmor'] as ActionId[]){const metric=characterSkillMetric(action,h,veilSiege);expect(metric.label).toContain('%');expect(metric.scaling).not.toBe('อิงพลังโจมตี');}
 });
});
const write=(game:Parameters<typeof saveGame>[1])=>{let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>{raw=v;}},game);return raw;};
describe('C11 save v41 → v42',()=>{
 it('refunds changed trees, keeps alchemist tree/tomes/grants and resets locked loadouts',()=>{
  const p=newProfile(map,1);p.company.push('toma');p.members.toma={stars:1,dupes:0,talents:{a1:1}}; p.campXp = Math.max(p.campXp, xpAt(6));
  p.members.guardian={stars:1,dupes:0,talents:{c1:1,c1s:1},loadout:['guard','rally'],skillLevels:{rally:2}}; p.campXp = Math.max(p.campXp, xpAt(6));
  const old=legacyEnvelope(JSON.parse(write({profile:p,run:null})));old.version=41;
  const game=parseGame(JSON.stringify(old),map,lookup);
  expect(game.profile.members.guardian!.talents).toBeUndefined();expect(game.profile.members.guardian!.loadout).toBeUndefined();
  expect(game.profile.members.guardian!.skillLevels).toEqual({rally:2});expect(game.profile.members.toma!.talents).toEqual({a1:1});
  expect(JSON.parse(write(game)).version).toBe(44);expect(parseGame(write(game),map,lookup)).toEqual({profile:game.profile,run:null});
 });
 it('restarts a changed active skill replay from recorded entry HP without duplicating rewards',()=>{
  const p=newProfile(map,2);const game=depart(p,map,lookup,3),run=game.run;
  run.battle={kind:'random',encounterId:'veil-siege',entry:{...run.hp},commands:[{heroId:'tracer',beat:1,action:'sweep',targetId:'enemies'}]};
  const old=JSON.parse(write(game));old.version=41;
  const back=parseGame(JSON.stringify(old),map,lookup);
  expect(back.run!.battle!.commands).toEqual([]);expect(back.run!.battle!.entry).toEqual(run.battle.entry);expect(back.profile.bank).toEqual(p.bank);
 });
 it('restarts an old hard-boss replay even when its recorded command is an unchanged basic attack',()=>{
  const p=newProfile(map,9);p.tutorialDone=true;p.cleared=MAPS.map(m=>m.id);
  const game=depart(p,map,lookup,3,{maps:MAPS}),run=game.run;
  run.battle={kind:'boss',encounterId:map.bossEncounterId,entry:{...run.hp},commands:[{heroId:'tracer',beat:1,action:'attack',targetId:'f1'}]};
  const old=JSON.parse(write(game));old.version=41;const back=parseGame(JSON.stringify(old),map,lookup,MAPS);
  expect(back.run!.hard).toBe(true);expect(back.run!.battle!.commands).toEqual([]);expect(back.run!.battle!.entry).toEqual(run.hp);
 });
 it('settles a run with refunded trees home, retaining its investment',()=>{
  const p=newProfile(map,4);p.members.guardian={stars:1,dupes:0,talents:{a1:1}}; p.campXp = Math.max(p.campXp, xpAt(6));
  const game=depart(p,map,lookup,3),old=legacyEnvelope(JSON.parse(write(game)));old.version=41;
  const back=parseGame(JSON.stringify(old),map,lookup);expect(back.run).toBeNull();expect(back.profile.members.guardian!.talents).toBeUndefined();
 });
});
