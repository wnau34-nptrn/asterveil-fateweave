import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroCatalog } from '../src/core/world/world';
import { actionReason, beginBattle, previewCommand, replay, resolveCommand, skillCooldown, skillPower, targetKind, targetOptions } from '../src/core/battle/engine';
import type { ActionId, EncounterDefinition } from '../src/core/battle/types';
import { characterSkillMetric } from '../src/ui/character-metrics';
import { newProfile, depart } from '../src/core/world/profile';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
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
 it('Aegis rejects a no-op, but allows a useful level barrier to its caster',()=>{
  const d=fixture('weaver','aegis'),s=beginBattle(d).state;
  for(const h of s.heroes)h.barrier=100;
  expect(targetOptions(s,d,'weaver','aegis')[0]!.valid).toBe(false);
  s.heroes[0]!.barrier=0;expect(targetOptions(s,d,'weaver','aegis')[0]!.valid).toBe(true);
  expect(targetKind('quake')).toBe('enemies');expect(targetKind('rouse')).toBe('self');
 });
 it('metrics show effect units and real level-scaled power',()=>{
  const base=catalog[0]!,h={...base,skillLevels:{bulwark:3}};
  expect(characterSkillMetric('bulwark',h,veilSiege).value).toBe(skillPower({...veilSiege,heroes:[h]},h.id,'bulwark'));
  for(const action of ['halo','fury','revive','stonearmor'] as ActionId[]){const metric=characterSkillMetric(action,h,veilSiege);expect(metric.label).toContain('%');expect(metric.scaling).not.toBe('อิงพลังโจมตี');}
 });
});
const write=(game:Parameters<typeof saveGame>[1])=>{let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>{raw=v;}},game);return raw;};
describe('C11 save v41 → v42',()=>{
 it('refunds changed trees, keeps alchemist tree/tomes/grants and resets locked loadouts',()=>{
  const p=newProfile(map,1);p.company.push('toma');p.members.toma={stars:1,dupes:0,level:6,exp:0,talents:{a1:1}};
  p.members.guardian={stars:1,dupes:0,level:6,exp:0,talents:{c1:1,c1s:1},loadout:['guard','rally'],skillLevels:{rally:2}};
  const old=JSON.parse(write({profile:p,run:null}));old.version=41;
  const game=parseGame(JSON.stringify(old),map,lookup);
  expect(game.profile.members.guardian!.talents).toBeUndefined();expect(game.profile.members.guardian!.loadout).toBeUndefined();
  expect(game.profile.members.guardian!.skillLevels).toEqual({rally:2});expect(game.profile.members.toma!.talents).toEqual({a1:1});
  expect(JSON.parse(write(game)).version).toBe(42);expect(parseGame(write(game),map,lookup)).toEqual(game);
 });
 it('restarts a changed active skill replay from recorded entry HP without duplicating rewards',()=>{
  const p=newProfile(map,2);const game=depart(p,map,lookup,3),run=game.run;
  run.battle={kind:'random',encounterId:'veil-siege',entry:{...run.hp},commands:[{heroId:'tracer',beat:1,action:'sweep',targetId:'enemies'}]};
  const old=JSON.parse(write(game));old.version=41;
  const back=parseGame(JSON.stringify(old),map,lookup);
  expect(back.run!.battle!.commands).toEqual([]);expect(back.run!.battle!.entry).toEqual(run.battle.entry);expect(back.profile.bank).toEqual(p.bank);
 });
 it('settles a run with refunded trees home, retaining its investment',()=>{
  const p=newProfile(map,4);p.members.guardian={stars:1,dupes:0,level:6,exp:0,talents:{a1:1}};
  const game=depart(p,map,lookup,3),old=JSON.parse(write(game));old.version=41;
  const back=parseGame(JSON.stringify(old),map,lookup);expect(back.run).toBeNull();expect(back.profile.members.guardian!.talents).toBeUndefined();
 });
});
