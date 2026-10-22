import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {veilSiege} from '../src/content/encounters/veil-siege';
import {BOSS_POWERS,bossReward,chooseBossTarget,startBossPlan} from '../src/core/world/boss-equipment';
import {beginBattle,bossPowerReady,currentHeroId,previewCommand,replay,resolveCommand,targetOptions,withParty} from '../src/core/battle/engine';
import {newProfile,depart,settle,salvage,equip} from '../src/core/world/profile';
import {battleData,battleState,recordBattle,finishBattle,rollPercent,wear,heroCatalog,starred} from '../src/core/world/world';
import {gearTotals,itemStats,itemValid,setCounts} from '../src/core/world/equipment';
import {enhanceTo,fuse,fuseMaterials,lockEquipment,reroll,transferAffix,transferCandidate} from '../src/core/world/forge';
import {protectedItem,recycleSelection} from '../src/core/world/storage';
import {parseGame,saveGame} from '../src/core/save/expedition-save';
import {markedSkillExample} from '../src/ui/character-metrics';
import {unitStatuses} from '../src/ui/battle-status';
import type {BossPower,Command,EncounterDefinition} from '../src/core/battle/types';
import type {ExpeditionState,Item} from '../src/core/world/types';
const ids=['guardian','tracer','weaver','healer'];
const gear=(boss:BossPower,uid=1):Item=>({uid,boss,slot:'charm',rarity:4,level:11,affixes:['attack','support','hp'],q:{main:100,affixes:[100,100,100]},set:'shadow'});
function fixture(power:BossPower,id='tracer',enemies=1):EncounterDefinition {
  const base=veilSiege.heroes.find(h=>h.id===id)!;
  const hero={...base,speed:1000,maxHp:200,gear:{boss:{power,amount:power==='focus'?4:6}}};
  return {...withParty(veilSiege,[hero]),enemies:Array.from({length:enemies},(_,i)=>({id:(['f1','f2','b1','b2'] as const)[i]!,row:'front' as const,name:'Enemy',maxHp:10000,speed:0,color:0})),intents:Array.from({length:enemies},(_,i)=>({sourceId:['f1','f2','b1','b2'][i]!,targetSlot:0,name:'hit',damage:10,kind:'physical' as const}))};
}
it('separates free boss targeting from class targets, snapshots it and preserves per-boss pity through all return outcomes',()=>{
  const p=newProfile(map,7),copy=structuredClone(p),selected=chooseBossTarget(p,map,'focus').profile;expect(p).toEqual(copy);expect(selected.bank).toEqual(p.bank);expect(selected.forge).toBe(p.forge);expect(selected.hunt).toEqual(p.hunt);
  selected.bossLoot![map.bossEncounterId]={target:'focus',misses:2,rewarded:true};const switched=chooseBossTarget(selected,map,'lantern').profile;expect(startBossPlan(switched,map)).toMatchObject({target:'lantern',misses:2,rewarded:true});
  const game=depart(switched,map,lookup,11);expect(game.run.bossLoot).toEqual(startBossPlan(switched,map));expect(game.run.bossLoot).not.toBe(switched.bossLoot![map.bossEncounterId]);
  for(const result of ['complete','withdrawn','wiped'] as const)expect(settle(switched,game.run,result,map).bossLoot).toEqual(switched.bossLoot);
  expect(chooseBossTarget(p,map,'bad' as BossPower).profile).toBe(p);
});
it('first victory guarantees one targeted legendary with normal set chance, valid affixes/quality and no generic special',()=>{
  let hasSet=0,noSet=0;const sets=new Set<string>();
  for(const target of BOSS_POWERS)for(let seed=0;seed<120;seed++){
    const plan=startBossPlan(chooseBossTarget(newProfile(map,1),map,target).profile,map);let n=0;
    const item=bossReward(map,plan,()=>rollPercent(seed,n++),11)!;
    expect(item).toMatchObject({uid:0,boss:target,slot:'charm',rarity:4,level:11});expect(item.special).toBeUndefined();expect(itemValid(map,item,ids,true)).toBe(true);expect(item.affixes[0]).toBe(({aegis:'hp',focus:'attack',lantern:'support'} as const)[target]);expect(plan).toMatchObject({misses:0,rewarded:true});
    if(item.set){hasSet++;sets.add(item.set);}else noSet++;
  }
  expect(sets.size).toBe(6);expect(hasSet).toBeGreaterThan(160);expect(noSet).toBeGreaterThan(90);
});
it('hard-four resets on actual reward, ordinary misses do not grant items, and boss power works with normal two/four-piece sets',()=>{
  const plan={...startBossPlan(newProfile(map,2),map),rewarded:true};
  for(let n=1;n<4;n++){expect(bossReward(map,plan,()=>99,11)).toBeUndefined();expect(plan.misses).toBe(n);}
  const item=bossReward(map,plan,()=>99,11)!;expect(item.boss).toBe('aegis');expect(plan.misses).toBe(0);
  const charm=gear('focus'),head:Item={uid:2,slot:'head',rarity:0,level:11,affixes:[],set:'shadow'};
  expect(setCounts({charm,head}).shadow).toBe(2);expect(gearTotals(map,{charm,head}).attackPercent).toBe(itemStats(map.equipment,charm).attack!+8);expect(gearTotals(map,{charm,head}).gear?.boss).toEqual({power:'focus',amount:4});
  const full={charm,head,body:{...head,uid:3,slot:'body' as const},boots:{...head,uid:4,slot:'boots' as const}};expect(gearTotals(map,full).gear?.freshHit).toBe(6);
});
const easyLookup=(id:string)=>{const data=lookup(id);return data?{...data,enemies:data.enemies.map(e=>({...e,maxHp:1,speed:0}))}:undefined;};
function win(run:ExpeditionState){const data=battleData(run,map,easyLookup)!;let s=battleState(run,map,easyLookup)!;while(s.outcome==='active')s=resolveCommand(s,data,{heroId:currentHeroId(s,data)!,beat:s.beat,action:'attack',targetId:targetOptions(s,data,currentHeroId(s,data)!,'attack').find(t=>t.valid)!.id}).state;return finishBattle(recordBattle(run,map,easyLookup,s.commands),map,easyLookup);}
it('actual boss victory adds only its independent bonus and preserves all three ordinary drops, RNG and weapon-pity results against legacy runs',()=>{
  const fresh=depart(newProfile(map,17),map,easyLookup,77).run;fresh.battle={kind:'boss',encounterId:map.bossEncounterId,entry:{...fresh.hp},commands:[]};
  const legacy=structuredClone(fresh);delete legacy.bossLoot;const original=structuredClone(fresh),a=win(fresh),b=win(legacy);
  expect(a.state.found.slice(0,3)).toEqual(b.state.found);expect(a.state.found).toHaveLength(4);expect(a.state.rolls).toBe(b.state.rolls);expect(a.state.hunt).toEqual(b.state.hunt);expect(a.state.found[3]!.boss).toBe('aegis');expect(fresh).toEqual(original);expect(()=>finishBattle(a.state,map,easyLookup)).toThrow();
  for(const kind of ['tutorial','random','elite'] as const){const s=structuredClone(fresh);s.battle!.kind=kind;const result=win(s);expect(result.state.found.some(i=>i.boss)).toBe(false);expect(result.state.bossLoot).toEqual(fresh.bossLoot);}
});
it('focus adds exactly once to the marked primary hit, includes leech/replay/preview, and never adds to splash, marks or unmarked hits',()=>{
  const data=fixture('focus'),state=beginBattle(data).state;state.enemies[0]!.markedUntil=3;
  const cmd:Command={beat:state.beat,heroId:'tracer',action:'execute',targetId:'f1'},r=resolveCommand(state,data,cmd);
  expect(r).toEqual(previewCommand(state,data,cmd));expect(r.turns[0]!.events.find(e=>e.type==='damage')!.amount).toBe(54);expect(state.heroes[0]!.bossUsedRound).toBeUndefined();expect(r.turns[0]!.state.heroes[0]!.bossUsedRound).toBe(1);
  const used=structuredClone(state);used.heroes[0]!.bossUsedRound=1;expect(resolveCommand(used,data,cmd).turns[0]!.events.find(e=>e.type==='damage')!.amount).toBe(50);
  const leechData=structuredClone(data);leechData.heroes=[{...leechData.heroes[0]!,leech:10}];const hurt=structuredClone(state);hurt.heroes[0]!.hp=100;expect(resolveCommand(hurt,leechData,cmd).turns[0]!.state.heroes[0]!.hp).toBe(105);
  const unmarked=beginBattle(data).state;expect(resolveCommand(unmarked,data,{...cmd,beat:unmarked.beat}).turns[0]!.events.find(e=>e.type==='damage')!.amount).toBe(28);
  const mark=resolveCommand(beginBattle(data).state,data,{...cmd,action:'mark'});expect(mark.turns[0]!.state.heroes[0]!.bossUsedRound).toBeUndefined();
  const mage=fixture('focus','weaver',2);mage.heroes=[{...mage.heroes[0]!,talents:{caps:{splitbolt:0}}}];const m=beginBattle(mage).state;m.enemies.forEach(e=>e.markedUntil=3);const hit=resolveCommand(m,mage,{beat:m.beat,heroId:'weaver',action:'bolt',targetId:'f1'}).turns[0]!.events.filter(e=>e.type==='damage');expect(hit.map(e=>e.amount)).toEqual([30,13]);
  const normal=beginBattle(data).state,attack={beat:normal.beat,heroId:'tracer',action:'attack' as const,targetId:'f1'},done=resolveCommand(normal,data,attack).state;expect(replay(data,[attack])).toEqual(done);expect(markedSkillExample('execute',data.heroes[0]!,data)).toBe(54);
});
it('aegis grants a post-hit shield floor once per round, never prevents death or triggers on fully absorbed damage',()=>{
  const data=fixture('aegis','tracer',2),s=beginBattle(data).state,cmd={beat:s.beat,heroId:'tracer',action:'mark' as const,targetId:'f1'},out=resolveCommand(s,data,cmd);
  expect(out.turns[1]!.state.heroes[0]).toMatchObject({hp:190,barrier:6,bossUsedRound:1});expect(out.turns[2]!.state.heroes[0]).toMatchObject({hp:186,barrier:0,bossUsedRound:1});expect(bossPowerReady(out.state,data,'tracer','aegis')).toBe(6);
  const shielded=structuredClone(s);shielded.heroes[0]!.barrier=20;const shieldOut=resolveCommand(shielded,data,cmd);expect(shieldOut.state.heroes[0]!.hp).toBe(200);expect(shieldOut.state.heroes[0]!.bossUsedRound).toBeUndefined();
  const fatal=structuredClone(s);fatal.heroes[0]!.hp=5;const down=resolveCommand(fatal,data,cmd).state.heroes[0]!;expect(down.hp).toBe(0);expect(down.barrier).toBe(0);expect(down.bossUsedRound).toBeUndefined();
});
it('lantern applies only after actual Heal to another ally, respects greater existing shields and existing afterglow/talents',()=>{
  const data=fixture('lantern','healer');data.heroes=[data.heroes[0]!,{...veilSiege.heroes[0]!,speed:500,maxHp:200}];const s=beginBattle(data).state;s.heroes[1]!.hp=100;
  const command={beat:s.beat,heroId:'healer',action:'heal' as const,targetId:'guardian'},out=resolveCommand(s,data,command).turns[0]!.state;
  expect(out.heroes[1]).toMatchObject({hp:120,barrier:6});expect(out.heroes[0]!.bossUsedRound).toBe(1);
  const high=structuredClone(s);high.heroes[1]!.barrier=20;const protectedAlly=resolveCommand(high,data,command).turns[0]!.state;expect(protectedAlly.heroes[1]!.barrier).toBe(20);expect(protectedAlly.heroes[0]!.bossUsedRound).toBe(1);
  const self=structuredClone(s);self.heroes[0]!.hp=100;const selfHeal=resolveCommand(self,data,{...command,targetId:'healer'}).turns[0]!.state;expect(selfHeal.heroes[0]!.bossUsedRound).toBeUndefined();expect(selfHeal.heroes[0]!.barrier).toBe(0);
  const prayer=resolveCommand(s,data,{...command,action:'prayer',targetId:'party'}).turns[0]!.state;expect(prayer.heroes[0]!.bossUsedRound).toBeUndefined();expect(prayer.heroes[1]!.barrier).toBe(0);
  const glowData=structuredClone(data);glowData.heroes=[{...data.heroes[0]!,passive:'afterglow'},data.heroes[1]!];const glowState=structuredClone(s);glowState.heroes[1]!.hp=190;const glow=resolveCommand(glowState,glowData,command).turns[0]!.state;expect(glow.heroes[1]!.barrier).toBe(Math.max(6,Math.min(10,data.rules.afterglowCap)));
  const statuses=unitStatuses(out,data,'healer');expect(statuses.find(v=>v.id==='boss')!.duration).toContain('ใช้สิทธิ์รอบนี้แล้ว');expect(unitStatuses(s,data,'healer').find(v=>v.id==='boss')!.duration).toContain('พร้อม');
});
it('unique identity survives equip/development/transfer; never becomes a material or protected bulk recycle and explicit recycling refunds exact capital once',()=>{
  const p=newProfile(map,1);p.items=[gear('focus'),{uid:2,slot:'charm',rarity:0,level:3,affixes:[]},{uid:3,slot:'charm',rarity:1,level:3,affixes:['speed'],q:{main:100,affixes:[120]}}];p.nextItem=4;p.bank={ore:10000,dust:10000,gold:0,seal:20};
  const upgraded=enhanceTo(p,map,1,3).profile;expect(upgraded.items[0]).toMatchObject({boss:'focus',set:'shadow',plus:3});const tuned=transferAffix(upgraded,map,1,2,3,0).profile;expect(tuned.items[0]).toMatchObject({boss:'focus',set:'shadow',transferSlot:2});expect(reroll(tuned,map,1,0).profile.items[0]!.boss).toBe('focus');
  expect(transferCandidate(map,p.items[2]!,0,p.items[0]!,0)).toBeUndefined();expect(fuseMaterials(p,map,1)).toEqual([]);expect(fuse(p,map,1).profile).toBe(p);expect(protectedItem(p.items[0]!)).toBe(true);expect(recycleSelection(p,map,'bag',[1]).profile).toBe(p);expect(salvage(p,map,[1,2]).profile).toBe(p);
  const locked=lockEquipment(tuned,1).profile;expect(salvage(locked,map,[1]).profile).toBe(locked);const unlocked=lockEquipment(locked,1).profile,investment=unlocked.items[0]!.investment!,recycled=salvage(unlocked,map,[1]);expect(recycled.profile.bank.ore-unlocked.bank.ore).toBe(12+investment.ore);expect(recycled.profile.bank.dust-unlocked.bank.dust).toBe(15+investment.dust);expect(salvage(recycled.profile,map,[1]).profile).toBe(recycled.profile);
});
it('v27 validates identity, provenance and boss counter state, preserves legacy active battle replay and never invents old-run bonus',()=>{
  const p=newProfile(map,1);p.items=[gear('focus')];p.nextItem=2;const game=depart(equip(p,'tracer',1).profile,map,lookup,17);game.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...game.run.hp},commands:[]};let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>raw=v},game);expect(JSON.parse(raw).version).toBe(36);expect(parseGame(raw,map,lookup)).toEqual(game);
  for(const corrupt of [(g:typeof game)=>g.run.bossLoot!.misses=4,(g:typeof game)=>g.run.bossLoot!.target='focus',(g:typeof game)=>g.run.bossLoot!.rewarded=true,(g:typeof game)=>g.run.members.tracer!.gear!.charm!.boss='lantern']){const c=structuredClone(game);corrupt(c);expect(()=>parseGame(JSON.stringify({version:27,...c}),map,lookup)).toThrow();}
  for(const item of [{...gear('focus'),special:'renewal'}, {...gear('focus'),slot:'body'}, {...gear('focus'),rarity:3}, {...gear('focus'),boss:'unknown'}])expect(itemValid(map,item as Item,ids)).toBe(false);
  const legacy=depart(newProfile(map,3),map,lookup,17);delete legacy.run.bossLoot;legacy.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...legacy.run.hp},commands:[]};const before=battleState(legacy.run,map,lookup);const loaded=parseGame(JSON.stringify({version:26,...legacy}),map,lookup);expect(loaded.run!.bossLoot).toBeUndefined();expect(battleState(loaded.run!,map,lookup)).toEqual(before);
});
it('found boss gear can be worn and returns locked into inventory or overflow without losing its normal set',()=>{
  const p=newProfile(map,1),run=depart(p,map,lookup,2).run;run.found=[{...gear('lantern'),uid:0}];const home=settle(p,run,'complete',map);expect(home.items[0]).toMatchObject({boss:'lantern',locked:true,set:'shadow'});
  const worn=wear(run,map,lookup,'healer','found',0).state,returned=settle(p,worn,'complete',map);expect(returned.members.healer!.gear!.charm).toMatchObject({boss:'lantern',locked:true,set:'shadow'});expect(returned.items).toHaveLength(0);
  p.items=Array.from({length:map.equipment.bagCap},(_,i)=>({uid:i+1,slot:'head',level:1,rarity:0,affixes:[]}));p.nextItem=61;const full=settle(p,run,'withdrawn',map);expect(full.overflow![0]).toMatchObject({boss:'lantern',locked:true,set:'shadow'});expect(full.items).toHaveLength(60);
});
it('a fourth boss reward crossing 99 finds roundtrips without discarding any item',()=>{
  const game=depart(newProfile(map,7),map,easyLookup,77);game.run.found=Array.from({length:97},()=>({uid:0,slot:'head',rarity:0,level:1,affixes:[]}));game.run.battle={kind:'boss',encounterId:map.bossEncounterId,entry:{...game.run.hp},commands:[]};game.run=win(game.run).state;expect(game.run.found).toHaveLength(101);expect(parseGame(JSON.stringify({version:27,...game}),map,easyLookup).run!.found).toHaveLength(101);
});
it('bonus economy converges to the hard-four distribution and never adds more than one item per victory',()=>{
  const p={...startBossPlan(newProfile(map,4),map),rewarded:true};let wins=0,rewards=0,maxGap=0,gap=0;
  for(let seed=0;seed<12000;seed++){let n=0;const item=bossReward(map,p,()=>rollPercent(seed^0x6b05d017,n++),11);wins++;gap++;if(item){rewards++;maxGap=Math.max(maxGap,gap);gap=0;expect(item.boss).toBe('aegis');}}
  expect(maxGap).toBe(4);expect(rewards/wins).toBeGreaterThan(.35);expect(rewards/wins).toBeLessThan(.38);
});
it('resolver-backed boss skill examples support every class, including Backstab against an enemy aiming at an ally',()=>{
  for(const base of heroCatalog(lookup,map)){
    const h=starred(base,5,map,6,{}, {charm:gear('focus')});
    for(const action of h.actions)expect(()=>markedSkillExample(action,h,lookup(map.tutorialEncounterId)!)).not.toThrow();
    if(h.id==='sefa')expect(markedSkillExample('backstab',h,lookup(map.tutorialEncounterId)!)).toBeGreaterThan(0);
  }
});
