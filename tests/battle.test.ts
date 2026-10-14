import { describe,expect,it } from 'vitest';
import { actionReason,createBattle,currentHeroId,plannedIntents,previewCommand,replay,resolveCommand,targetOptions,validateCommand } from '../src/core/battle/engine';
import type { ActionId,BattleState,Command } from '../src/core/battle/types';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
const act=(s:BattleState,heroId:string,action:ActionId,targetId:string)=>resolveCommand(s,data,{beat:s.beat,heroId,action,targetId});
const at=(id:string)=>{let s=createBattle(data);while(currentHeroId(s,data)!==id)s=act(s,currentHeroId(s,data)!,'attack','raider').state;return s;};
describe('owned sequential hero turns',()=>{
 it('starts with Knight, keeps independent states and has four classes/front-back formation',()=>{
  const a=createBattle(data),b=createBattle(data);expect(currentHeroId(a,data)).toBe('guardian');
  expect(data.heroes.map(h=>h.lane)).toEqual(['front','front','back','back']);
  expect(new Set(data.heroes.map(h=>h.role)).size).toBe(4);data.heroes.forEach(h=>expect(h.actions).toHaveLength(3));
  expect(a.heroes.map(h=>h.hp)).toEqual([76,56,48,46]);expect(a).not.toHaveProperty('crystal');
  a.heroes[0]!.cooldowns.bash=99;expect(b.heroes[0]!.cooldowns).toEqual({});
 });
 it('rejects every other living hero at commit, preview and target selection without mutation',()=>{
  const s=createBattle(data),before=structuredClone(s);
  for(const hero of data.heroes.slice(1)) {
   const c={beat:1,heroId:hero.id,action:'attack' as const,targetId:'brute'};
   expect(validateCommand(s,data,c)).toContain('turn');expect(()=>resolveCommand(s,data,c)).toThrow('turn');
   expect(()=>previewCommand(s,data,c)).toThrow('turn');expect(targetOptions(s,data,hero.id,'attack').every(t=>!t.valid)).toBe(true);
  }
  expect(s).toEqual(before);expect(actionReason(s,data,'guardian','heal')).toContain('does not have');
 });
 it('advances only after one committed command, wraps and reconstructs the owner by replay',()=>{
  let s=createBattle(data);const owners=[];
  for(let i=0;i<5;i++){const heroId=currentHeroId(s,data)!;owners.push(heroId);s=act(s,heroId,'attack','brute').state;expect(replay(data,s.commands)).toEqual(s);}
  expect(owners).toEqual(['guardian','tracer','weaver','healer','guardian']);expect(currentHeroId(s,data)).toBe('tracer');
 });
 it('skips a hero killed by the response and advances after an acting Knight falls intercepting',()=>{
  let s=createBattle(data);s.heroes[1]!.hp=1;s=act(s,'guardian','attack','brute').state;
  expect(s.heroes[1]!.hp).toBe(0);expect(currentHeroId(s,data)).toBe('weaver');
  const guard=createBattle(data);guard.heroes[0]!.hp=1;const r=act(guard,'guardian','guard','tracer');
  expect(r.state.heroes[0]!.hp).toBe(0);expect(r.state.heroes[1]!.hp).toBe(56);expect(currentHeroId(r.state,data)).toBe('tracer');
 });
 it('keeps stage snapshots independent and frozen while final state advances owner/intent',()=>{
  const s=createBattle(data),before=structuredClone(s),r=act(s,'guardian','bash','brute');
  expect(r.stages.hero.state.enemies[1]!.hp).toBe(146);expect(r.stages.hero.state.heroes[1]!.hp).toBe(56);
  expect(r.stages.enemy.state.heroes[1]!.hp).toBe(44);expect(r.stages.hero.state.intent).toEqual(s.intent);expect(r.stages.enemy.state.intent).toEqual(s.intent);
  expect(r.stages.enemy.state.beat).toBe(1);expect(r.state.beat).toBe(2);expect(currentHeroId(r.state,data)).toBe('tracer');
  r.stages.hero.state.enemies[1]!.hp=0;expect(r.stages.enemy.state.enemies[1]!.hp).toBe(146);expect(r.state.enemies[1]!.hp).toBe(146);expect(s).toEqual(before);
 });
 it('Guard intercepts the announced front or rear target and rounds before barrier absorption',()=>{
  const s=createBattle(data);s.heroes[0]!.barrier=10;const r=act(s,'guardian','guard','tracer');
  expect(r.state.heroes[0]).toMatchObject({hp:76,barrier:5});expect(r.state.heroes[1]!.hp).toBe(56);
  expect(r.stages.enemy.events[0]).toMatchObject({amount:0,absorbed:5});
  const rear={...data,intents:data.intents.map(i=>({...i,kind:'energy' as const,targetId:'weaver',damage:28}))};
  const n=resolveCommand(createBattle(rear),rear,{beat:1,heroId:'guardian',action:'guard',targetId:'weaver'}).state;
  expect(n.heroes[0]!.hp).toBe(66);expect(n.heroes[2]!.hp).toBe(48);
  expect(()=>act(createBattle(data),'guardian','guard','healer')).toThrow('announced target');
 });
 it('physical front screening changes after front heroes fall; energy reaches the rear',()=>{
  const d={...data,intents:data.intents.map(i=>({...i,targetId:'healer'}))};const s=createBattle(d);
  expect(s.intent?.targetId).toBe('guardian');expect(plannedIntents(s,d)[0]?.targetId).toBe('healer');
  s.heroes[0]!.hp=0;s.heroes[1]!.hp=0;expect(plannedIntents(s,d)[1]?.targetId).toBe('healer');
 });
 it('Bash cancels only the announced physical source',()=>{
  const s=createBattle(data),r=act(s,'guardian','bash','raider');expect(r.state.enemies[0]!.hp).toBe(46);
  expect(r.stages.enemy.events[0]).toMatchObject({type:'cancel',cause:'interrupted'});
  expect(act(s,'guardian','bash','brute').state.heroes[1]!.hp).toBe(44);
  const d={...data,intents:data.intents.map(i=>({...i,kind:'energy' as const}))};
  const energy=resolveCommand(createBattle(d),d,{beat:1,heroId:'guardian',action:'bash',targetId:'raider'});
  expect(energy.stages.enemy.events.some(e=>e.type==='cancel')).toBe(false);
 });
 it('cooldowns still reject early reuse when only one living hero remains',()=>{
  const s=createBattle(data);s.heroes.slice(1).forEach(h=>{h.hp=0;});let n=act(s,'guardian','bash','raider').state;
  expect(currentHeroId(n,data)).toBe('guardian');expect(actionReason(n,data,'guardian','bash')).toBe('Cooldown: 2');
  expect(()=>act(n,'guardian','bash','raider')).toThrow('Cooldown');n=act(n,'guardian','attack','brute').state;
  expect(actionReason(n,data,'guardian','bash')).toBe('Cooldown: 1');n=act(n,'guardian','guard','guardian').state;
  expect(actionReason(n,data,'guardian','bash')).toBe('');expect(act(n,'guardian','bash','raider').state.heroes[0]!.cooldowns.bash).toBe(7);
 });
 it('Mark survives the three intervening hero turns and is consumed by the next Duelist',()=>{
  let s=act(at('tracer'),'tracer','mark','brute').state;expect(s.enemies[1]!.markedUntil).toBe(7);
  s=act(s,'weaver','attack','raider').state;s=act(s,'healer','heal','weaver').state;s=act(s,'guardian','guard','healer').state;
  expect(currentHeroId(s,data)).toBe('tracer');expect(s.enemies[1]!.markedUntil).toBe(7);
  const r=act(s,'tracer','execute','brute');expect(r.stages.hero.events[0]).toMatchObject({amount:50});expect(r.state.enemies[1]!.markedUntil).toBe(0);
  expect(act(s,'tracer','attack','brute').stages.hero.events[0]).toMatchObject({amount:38});
 });
 it('an unused Mark expires after the next Duelist turn, without other classes consuming it',()=>{
  let s=act(at('tracer'),'tracer','mark','brute').state;
  s=act(s,'weaver','ward','weaver').state;expect(s.enemies[1]!.markedUntil).toBe(7);
  s=act(s,'healer','heal','tracer').state;s=act(s,'guardian','guard','healer').state;s=act(s,'tracer','mark','raider').state;
  expect(s.beat).toBe(7);expect(s.enemies[1]!.markedUntil).toBe(0);expect(s.enemies[0]!.markedUntil).toBe(11);
 });
 it('Mage Ward absorbs the current hit before HP and never stacks a full barrier',()=>{
  const s=at('weaver');const r=act(s,'weaver','ward','guardian');
  expect(r.state.heroes[0]).toMatchObject({hp:76,barrier:2});expect(r.stages.enemy.events[0]).toMatchObject({amount:0,absorbed:12});
  s.heroes[2]!.barrier=14;expect(targetOptions(s,data,'weaver','ward').find(t=>t.id==='weaver')?.valid).toBe(false);
 });
 it('Priest Heal occurs before the response and clamps at maximum HP',()=>{
  const s=at('healer');s.heroes[1]!.hp=10;const r=act(s,'healer','heal','tracer');
  expect(r.stages.hero.state.heroes[1]!.hp).toBe(30);expect(r.stages.enemy.state.heroes[1]!.hp).toBe(4);
  s.heroes[0]!.hp=73;expect(act(s,'healer','heal','guardian').stages.hero.events[0]).toMatchObject({amount:3});
 });
 it('Prayer heals living injured allies only, retains cooldown and refuses a full-health party',()=>{
  const s=at('healer');s.heroes[0]!.hp=60;s.heroes[1]!.hp=40;s.heroes[2]!.hp=0;
  const r=act(s,'healer','prayer','party');expect(r.state.heroes.map(h=>h.hp)).toEqual([70,24,0,46]);
  expect(r.stages.hero.events).toHaveLength(2);expect(r.state.heroes[3]!.cooldowns.prayer).toBe(8);
  expect(()=>act(s,'healer','heal','weaver')).toThrow('down');
  const full=at('healer');full.heroes.forEach((h,i)=>{h.hp=data.heroes[i]!.maxHp;});expect(()=>act(full,'healer','prayer','party')).toThrow('full health');
 });
 it('rejects stale beats, foreign encounter IDs, downed actors and invalid targets',()=>{
  const s=createBattle(data),c:Command={beat:1,heroId:'guardian',action:'attack',targetId:'brute'};
  expect(validateCommand(s,data,{...c,beat:0})).toContain('stale');expect(validateCommand({...s,encounterId:'other'},data,c)).toContain('mismatch');
  expect(()=>act(s,'guardian','attack','party')).toThrow('Invalid target');s.heroes[0]!.hp=0;expect(()=>act(s,'guardian','attack','brute')).toThrow('down');
 });
 it('overkill clamps and killing the frozen source cancels its response',()=>{
  const s=createBattle(data);s.enemies[0]!.hp=2;const r=act(s,'guardian','attack','raider');
  expect(r.stages.hero.events[0]).toMatchObject({amount:2});expect(r.stages.enemy.events[0]).toMatchObject({type:'cancel',cause:'defeated'});
  expect(r.state.heroes[1]!.hp).toBe(56);
 });
 it('real outcomes stop ownership and future commands',()=>{
  const s=createBattle(data);s.enemies[0]!.hp=1;s.enemies[1]!.hp=0;const win=act(s,'guardian','attack','raider').state;
  expect(win.outcome).toBe('victory');expect(currentHeroId(win,data)).toBeUndefined();expect(()=>act(win,'guardian','attack','raider')).toThrow('ended');
  const loss=createBattle(data);loss.heroes.forEach(h=>{h.hp=h.id==='guardian'?1:0;});loss.intent={...loss.intent!,targetId:'guardian'};
  const n=act(loss,'guardian','attack','brute').state;expect(n.outcome).toBe('defeat');expect(currentHeroId(n,data)).toBeUndefined();
 });
 it('previews every legal owned skill exactly and replay matches unmodified legal prefixes',()=>{
  for(const hero of data.heroes)for(const injured of [false,true]){
   const s=at(hero.id);if(injured)s.heroes.forEach(h=>{h.hp=Math.max(1,h.hp-5);});
   for(const action of hero.actions)for(const target of targetOptions(s,data,hero.id,action).filter(t=>t.valid)){
    const c={beat:s.beat,heroId:hero.id,action,targetId:target.id},before=structuredClone(s);const r=resolveCommand(s,data,c);
    expect(previewCommand(s,data,c)).toEqual(r);expect(s).toEqual(before);expect([...r.stages.hero.events,...r.stages.enemy.events]).toEqual(r.events);
    if(!injured)expect(replay(data,r.state.commands)).toEqual(r.state);
   }
  }
 });
});
