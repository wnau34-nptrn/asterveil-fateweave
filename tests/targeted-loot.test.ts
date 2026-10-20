import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {chooseHuntTarget,huntedReward,startHunt} from '../src/core/world/targeted-loot';
import {rollItem,itemValid,itemStats} from '../src/core/world/equipment';
import {newProfile,depart,settle,dismiss} from '../src/core/world/profile';
import {rollPercent,newExpedition,battleData,battleState,recordBattle,finishBattle} from '../src/core/world/world';
import {currentHeroId,resolveCommand} from '../src/core/battle/engine';
import {parseGame,saveGame} from '../src/core/save/expedition-save';
import type {ExpeditionState} from '../src/core/world/types';
const ids=['guardian','tracer','weaver','healer'],all=['guardian','tracer','weaver','healer','garran','mira','toma','sefa','brann','lio'];
const stream=(seed:number)=>{let n=0;return ()=>rollPercent(seed,n++);};
it('selects only owned classes without fees/RNG and retains separate pity through switches and dismissal',()=>{
  const p=newProfile(map,17);p.hunt={pity:{guardian:7,tracer:5}};const snap=structuredClone(p),out=chooseHuntTarget(p,'guardian');expect(out.profile.bank).toEqual(p.bank);expect(out.profile.forge).toBe(p.forge);expect(out.profile.hunt).toEqual({target:'guardian',pity:{guardian:7,tracer:5}});expect(p).toEqual(snap);
  expect(chooseHuntTarget(p,'unknown').profile).toBe(p);expect(chooseHuntTarget(p,'mira').profile).toBe(p);
  const switched=chooseHuntTarget(out.profile,'tracer').profile;expect(startHunt(switched)).toEqual({target:'tracer',misses:5});expect(startHunt(chooseHuntTarget(switched,'guardian').profile).misses).toBe(7);
  const bench=structuredClone(p);bench.company.push('lio');bench.members.lio={stars:1,dupes:0};const benchGame=depart(chooseHuntTarget(bench,'lio').profile,map,lookup,7);expect(benchGame.run.roster.deployed).not.toContain('lio');expect(benchGame.run.hunt!.target).toBe('lio');
  const dismissed=dismiss(switched,map,'tracer').profile;expect(dismissed.hunt!.target).toBeUndefined();expect(dismissed.hunt!.pity.tracer).toBe(5);
});
it('without a target consumes exactly the legacy stream and preserves every item value',()=>{
  for(let seed=0;seed<40;seed++){
    const a=stream(seed),b=stream(seed),c=stream(seed),plan={misses:0};
    for(let n=0;n<20;n++){const expected=rollItem(map.equipment,a,5,map.equipment.rarityWeights,ids,['dawn','wind']);expect(huntedReward(map.equipment,b,5,map.equipment.rarityWeights,ids,['dawn','wind'])).toEqual(expected);expect(huntedReward(map.equipment,c,5,map.equipment.rarityWeights,ids,['dawn','wind'],plan)).toEqual(expected);}
    expect(plan.misses).toBe(0);const next=a();expect(b()).toBe(next);expect(c()).toBe(next);
  }
});
it('guarantees the threshold weapon with class-correct support stats, original rarity weights, Lv and zone set rules',()=>{
  for(let seed=0;seed<100;seed++){
    const plan={target:'toma',misses:11};const item=huntedReward(map.equipment,stream(seed),9,[0,0,100,0,0],ids,['starveil','mender'],plan);
    expect(item).toMatchObject({slot:'weapon',hero:'toma',level:9,rarity:2});expect(plan.misses).toBe(0);expect(itemValid(map,{...item,uid:1},all)).toBe(true);expect(itemStats(map.equipment,item).support).toBeGreaterThan(0);if(item.set)expect(['starveil','mender']).toContain(item.set);
  }
});
it('never exceeds the pity bound and simulates a controlled target boost rather than extra items',()=>{
  let ordinary=0,focused=0,baseWeapons=0,targetWeapons=0;const total=24000;
  for(let seed=0;seed<1000;seed++){
    const a=stream(seed),b=stream(seed),plan={target:'guardian',misses:0};
    for(let n=0;n<24;n++){
      const old=rollItem(map.equipment,a,5,map.equipment.rarityWeights,ids,['dawn','wind']),item=huntedReward(map.equipment,b,5,map.equipment.rarityWeights,ids,['dawn','wind'],plan);
      ordinary+=Number(old.hero==='guardian');focused+=Number(item.hero==='guardian');baseWeapons+=Number(old.slot==='weapon');targetWeapons+=Number(item.slot==='weapon');expect(plan.misses).toBeLessThan(12);
    }
  }
  expect(focused).toBeGreaterThan(ordinary*2);expect(targetWeapons/total-baseWeapons/total).toBeLessThan(.08);
  if(process.env.TARGET_LOOT_REPORT)console.log(JSON.stringify({drops:total,normalTarget:ordinary/total,focusedTarget:focused/total,normalWeapons:baseWeapons/total,focusedWeapons:targetWeapons/total}));
});
it('freezes the target for an expedition and stores counters on every return, including wipes',()=>{
  const p=chooseHuntTarget(newProfile(map,17),'guardian').profile;p.hunt!.pity.guardian=4;p.hunt!.pity.tracer=8;
  const game=depart(p,map,lookup,77);expect(game.run.hunt).toEqual({target:'guardian',misses:4});const switched=chooseHuntTarget(p,'tracer').profile;expect(game.run.hunt!.target).toBe('guardian');expect(switched.hunt!.target).toBe('tracer');game.run.hunt!.misses=11;
  for(const outcome of ['complete','withdrawn','wiped'] as const){const home=settle(p,game.run,outcome,map);expect(home.hunt!.pity).toEqual({guardian:11,tracer:8});expect(startHunt(home).misses).toBe(11);}
});
const easyLookup=(id:string)=>{const data=lookup(id);return data?{...data,enemies:data.enemies.map(e=>({...e,maxHp:1,speed:0}))}:undefined;};
function win(s:ExpeditionState){const data=battleData(s,map,easyLookup)!;let state=battleState(s,map,easyLookup)!;while(state.outcome==='active')state=resolveCommand(state,data,{beat:state.beat,heroId:currentHeroId(state,data)!,action:'attack',targetId:state.enemies.find(e=>e.hp>0)!.id}).state;return finishBattle(recordBattle(s,map,easyLookup,state.commands),map,easyLookup);}
it('actual victory applies one guarantee, tutorial applies none and boss keeps its original three-drop quantity',()=>{
  const base=depart(chooseHuntTarget(newProfile(map,17),'healer').profile,map,easyLookup,77).run;base.tutorialDone=true;base.hunt!.misses=11;base.dry=5;
  const random={...base,battle:{kind:'random' as const,encounterId:map.tutorialEncounterId,entry:{...base.hp},commands:[]}};
  const out=win(random);expect(out.state.found).toHaveLength(1);expect(out.state.found[0]).toMatchObject({slot:'weapon',hero:'healer'});expect(out.state.hunt!.misses).toBe(0);expect(base.hunt!.misses).toBe(11);
  let checkedNoDrop=false;for(let seed=0;seed<20&&!checkedNoDrop;seed++){const none=win({...random,seed,dry:0});if(!none.state.found.length){expect(none.state.hunt!.misses).toBe(11);checkedNoDrop=true;}}expect(checkedNoDrop).toBe(true);
  const tutorial=win({...random,battle:{...random.battle,kind:'tutorial'}});expect(tutorial.state.found).toEqual([]);expect(tutorial.state.hunt!.misses).toBe(11);
  const boss=win({...random,battle:{...random.battle,kind:'boss',encounterId:map.bossEncounterId}});expect(boss.state.found).toHaveLength(map.equipment.bossDrops);expect(boss.state.found[0]).toMatchObject({slot:'weapon',hero:'healer'});
});
it('save v25 roundtrips counters and active battle, rejects invalid or mismatched plans and keeps old run RNG unchanged',()=>{
  const p=chooseHuntTarget(newProfile(map,17),'guardian').profile;p.hunt!.pity.guardian=9;const game=depart(p,map,lookup,77);game.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...game.run.hp},commands:[]};let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},game);expect(JSON.parse(raw).version).toBe(26);expect(parseGame(raw,map,lookup)).toEqual(game);
  for(const change of [(g:typeof game)=>{g.run.hunt!.misses=12;},(g:typeof game)=>{g.run.hunt!.target='tracer';},(g:typeof game)=>{g.profile.hunt!.pity.guardian=-1;},(g:typeof game)=>{g.profile.hunt!.target='mira';}]){const bad=structuredClone(game);change(bad);expect(()=>parseGame(JSON.stringify({version:25,...bad}),map,lookup)).toThrow();}
  const oldRun=newExpedition(map,lookup,77),legacy=parseGame(JSON.stringify({version:24,profile:newProfile(map,17),run:oldRun}),map,lookup);expect(legacy.run).toEqual(oldRun);expect(legacy.run!.hunt).toBeUndefined();expect(legacy.profile.hunt).toEqual({pity:{}});
});
