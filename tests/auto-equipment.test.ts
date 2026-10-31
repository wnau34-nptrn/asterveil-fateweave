import { filteredEquipment, newGearFilters } from '../src/ui/gear-inventory';
import { expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { depart, newProfile } from '../src/core/world/profile';
import { heroCatalog, heroDef, memberDef } from '../src/core/world/world';
import { applyCampEquipment, applyRunEquipment, campEquipment, planEquipment, runEquipment, type AutoEquipmentPlan } from '../src/core/world/auto-equipment';
import { setCounts } from '../src/core/world/equipment';
import { parseGame } from '../src/core/save/expedition-save';
import { GEAR_SLOTS, type Item } from '../src/core/world/types';
const data=lookup(map.tutorialEncounterId)!,base=heroDef(lookup,map,'guardian')!;
const item=(patch:Partial<Item>):Item=>({uid:0,slot:'body',rarity:0,level:1,affixes:[],...patch});
const setup=()=>{const p=newProfile(map,77);p.tutorialDone=true;return depart(p,map,lookup,1234);};
it('seeds complete sets, respects class, rolls and forged stats, and plans deterministically without mutating a run',()=>{
  const game=setup(),s=game.run;s.found=GEAR_SLOTS.map(slot=>item({slot,...(slot==='weapon'?{hero:'guardian'}:{}),set:'wind'}));
  s.found.push(item({slot:'weapon',hero:'tracer',level:99}),item({slot:'weapon',hero:'guardian',level:10,plus:5,q:{main:120,affixes:[]}}));
  const before=structuredClone(s),plan=planEquipment(map,data,base,s.members.guardian!,runEquipment(s),'attack','wind');
  expect(plan).toEqual(planEquipment(map,data,base,s.members.guardian!,runEquipment(s),'attack','wind'));expect(s).toEqual(before);
  const out=applyRunEquipment(s,map,lookup,plan);expect(out.event.type).toBe('equipped');expect(setCounts(out.state.members.guardian!.gear).wind).toBeGreaterThanOrEqual(4);
  expect(out.state.members.guardian!.gear!.weapon!.hero).toBe('guardian');expect(out.state.members.guardian!.gear!.weapon!.plus).toBe(5);
  expect(planEquipment(map,data,base,out.state.members.guardian!,runEquipment(out.state),'attack','wind').choices).toHaveLength(0);
});
it('atomically caps HP at the final loadout, preserves all item provenance, steps and RNG, and round-trips v21',()=>{
  const game=setup(),s=game.run;s.members.guardian!.gear={body:item({uid:1,level:30}),head:item({level:1,slot:'head'})};game.profile.members.guardian!.gear={body:item({uid:1,level:30})};game.profile.nextItem=2;
  s.found=[item({level:1}),item({level:99,slot:'head'})];s.hp.guardian=memberDef(lookup, map, s, 'guardian')!.maxHp;
  const hp=s.hp.guardian,entries=runEquipment(s),plan:AutoEquipmentPlan={heroId:'guardian',member:structuredClone(s.members.guardian!),goal:'survival',choices:entries.map(e=>({slot:e.item.slot,key:e.key,item:structuredClone(e.item)}))};
  const out=applyRunEquipment(s,map,lookup,plan).state;expect(out.hp.guardian).toBe(hp);expect(out.members.guardian!.gear!.head!.level).toBe(99);
  expect(out.spare.map(i=>i.uid)).toEqual([1]);expect(out.found).toHaveLength(1);expect(out.found[0]!.uid).toBe(0);expect(out.steps).toBe(s.steps);expect(out.rolls).toBe(s.rolls);
  expect(parseGame(JSON.stringify({version:21,profile:game.profile,run:out}),map,lookup).run).toEqual(out);
});
it('rejects stale items/members, duplicate slots, foreign weapons, nonmembers, battle and ended runs without partial equips',()=>{
  const s=setup().run;s.found=[item({level:8})];const plan=planEquipment(map,data,base,s.members.guardian!,runEquipment(s),'survival');
  const altered=structuredClone(s);altered.found[0]!.level=9;expect(applyRunEquipment(altered,map,lookup,plan).state).toBe(altered);
  const ranked=structuredClone(s);ranked.members.guardian!.stars=2;expect(applyRunEquipment(ranked,map,lookup,plan).state).toBe(ranked);
  expect(applyRunEquipment(s,map,lookup,{...plan,choices:[...plan.choices,...plan.choices]}).state).toBe(s);
  const weapon=item({slot:'weapon',hero:'tracer'}),wrong=structuredClone(s);wrong.found=[weapon];
  expect(applyRunEquipment(wrong,map,lookup,{...plan,choices:[{slot:'weapon',key:'found:0',item:weapon}]}).state).toBe(wrong);
  expect(applyRunEquipment(s,map,lookup,{...plan,heroId:'lio'}).state).toBe(s);
  for(const completed of [true]){const blocked={...s,completed};expect(applyRunEquipment(blocked,map,lookup,plan).state).toBe(blocked);}
  const battle={...s,battle:{kind:'random' as const,encounterId:data.id,entry:s.hp,commands:[]}};expect(applyRunEquipment(battle,map,lookup,plan).state).toBe(battle);
});
it('allows reserve/fallen members without healing, keeps current equal-value gear, and never steals another member equipment',()=>{
  const s=setup().run;s.roster.deployed=['tracer','weaver','healer'];s.roster.reserve=['guardian'];s.hp.guardian=0;
  s.members.tracer!.gear={body:item({uid:7,level:99})};s.found=[item({level:4})];
  const plan=planEquipment(map,data,base,s.members.guardian!,runEquipment(s),'survival'),out=applyRunEquipment(s,map,lookup,plan).state;
  expect(out.hp.guardian).toBe(0);expect(out.members.tracer!.gear).toEqual(s.members.tracer!.gear);expect(out.members.guardian!.gear!.body!.level).toBe(4);
  out.found.push(item({level:4}));expect(planEquipment(map,data,base,out.members.guardian!,runEquipment(out),'survival').choices).toHaveLength(0);
});
it('camp commits return replaced items without capacity loss, salvage, currency changes or duplicate UIDs',()=>{
  const p=newProfile(map,77);p.members.guardian!.gear={head:item({uid:1,slot:'head'}),boots:item({uid:2,slot:'boots'})};
  p.items=Array.from({length:map.equipment.bagCap},(_,n)=>item({uid:n+3,slot:n===0?'head':n===1?'boots':'body',level:10}));p.nextItem=map.equipment.bagCap+3;
  const entries=campEquipment(p),plan:AutoEquipmentPlan={heroId:'guardian',member:structuredClone(p.members.guardian!),goal:'survival',choices:entries.slice(0,2).map(e=>({slot:e.item.slot,key:e.key,item:e.item}))};
  const out=applyCampEquipment(p,plan);expect(out.event.type).toBe('equipped');expect(out.profile.items).toHaveLength(map.equipment.bagCap);expect(out.profile.bank).toEqual(p.bank);
  const ids=[...out.profile.items,...Object.values(out.profile.members.guardian!.gear!)].map(i=>i.uid);expect(new Set(ids).size).toBe(ids.length);expect(out.profile.items.some(i=>i.uid===1)).toBe(true);
  expect(parseGame(JSON.stringify({version:21,profile:out.profile,run:null}),map,lookup).profile).toEqual({ ...out.profile, boardPool: heroCatalog(lookup, map).filter(h => !['metta', 'thiran', 'lalin', 'wila'].includes(h.id)).map(h => h.id) });
});

it('combines inventory filters and stable sorting without moving or mutating items',()=>{
  const entries=[
    {key:'found:0',item:item({set:'wind',level:4}),label:''},
    {key:'spare:0',item:item({uid:2,set:'wind',slot:'weapon',hero:'tracer',rarity:2,level:8}),label:''},
    {key:'spare:1',item:item({uid:3,slot:'head',rarity:1,level:6}),label:''},
    {key:'found:1',item:item({set:'dawn',level:2}),label:''},
  ],snapshot=structuredClone(entries),f=newGearFilters();
  f.set='wind';expect(filteredEquipment(entries,f).map(e=>e.key)).toEqual(['spare:0','found:0']);
  f.compatible=true;expect(filteredEquipment(entries,f,'guardian').map(e=>e.key)).toEqual(['found:0']);
  f.compatible=false;f.source='owned';f.rarity='2';f.slot='weapon';expect(filteredEquipment(entries,f).map(e=>e.key)).toEqual(['spare:0']);
  Object.assign(f,newGearFilters());f.set='none';expect(filteredEquipment(entries,f).map(e=>e.key)).toEqual(['spare:1']);
  Object.assign(f,newGearFilters());f.sort='level';expect(filteredEquipment(entries,f).map(e=>e.key)).toEqual(['spare:0','spare:1','found:0','found:1']);
  expect(entries).toEqual(snapshot);
});
