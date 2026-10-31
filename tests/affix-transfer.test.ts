import {expect,it} from 'vitest';
import {chapterOne as map} from '../src/content/world/chapter1';
import {encounterById as lookup} from '../src/content/encounters/catalog';
import {newProfile,equip,depart,salvage,settle} from '../src/core/world/profile';
import {transferAffix,transferCandidate,transferReason,fuse,fuseMaterials,reroll,raiseItemLevel} from '../src/core/world/forge';
import {itemValid,itemStats} from '../src/core/world/equipment';
import {protectedItem,recycleSelection} from '../src/core/world/storage';
import {parseGame,saveGame} from '../src/core/save/expedition-save';
import type {Item} from '../src/core/world/types';
const main=():Item=>({uid:1,slot:'body',rarity:3,level:6,affixes:['hp','armour','regen'],q:{main:109,affixes:[80,95,105]},set:'dawn',plus:5,investment:{ore:30,dust:9},levelInvestment:{ore:20,dust:2},locked:true});
const donor=():Item=>({uid:2,slot:'body',rarity:2,level:3,affixes:['support','resist'],q:{main:90,affixes:[120,88]},plus:2,investment:{ore:9,dust:2},levelInvestment:{ore:20,dust:2}});
const setup=()=>({...newProfile(map,17),forgeLevel:9,tutorialDone:true,items:[main(),donor()],nextItem:3,bank:{ore:100,dust:100,gold:20,seal:5}});
it('transfers only a chosen kind/quality, binds one slot, preserves main development/set/lock and refunds donor capital without base salvage',()=>{
  const p=setup(),copy=structuredClone(p),out=transferAffix(p,map,1,0,2,0),item=out.profile.items[0]!;expect(out.event).toEqual({type:'forged',uid:1,action:'transfer'});
  expect(item).toEqual({...main(),affixes:['support','armour','regen'],q:{main:109,affixes:[120,95,105]},transferSlot:0});expect(out.profile.items).toHaveLength(1);expect(out.profile.bank).toEqual({ore:117,dust:101,gold:20,seal:4});expect(out.profile.forge).toBe(p.forge);expect(out.profile.hunt).toEqual(p.hunt);expect(out.profile.nextItem).toBe(3);expect(p).toEqual(copy);expect(out).toEqual(transferAffix(p,map,1,0,2,0));
  const low={...donor(),level:1};expect(transferCandidate(map,main(),0,low,0)).toEqual(item);expect(itemStats(map.equipment,item).support).toBeGreaterThan(itemStats(map.equipment,main()).support??0);
});
it('permits repeat transfers only in the bound slot and keeps that binding through rarity fusion, reroll and item Lv',()=>{
  let p=transferAffix(setup(),map,1,0,2,0).profile;p.items.push({...donor(),uid:3,q:{main:90,affixes:[81,88]}});p.nextItem=4;expect(transferAffix(p,map,1,1,3,0).profile).toBe(p);p=transferAffix(p,map,1,0,3,0).profile;expect(p.items[0]!.q!.affixes[0]).toBe(81);
  p.items.push({...main(),uid:4,locked:undefined,plus:undefined,investment:undefined,levelInvestment:undefined},{...main(),uid:5,locked:undefined,plus:undefined,investment:undefined,levelInvestment:undefined});p.nextItem=6;
  const fused=fuse(p,map,1,[4,5]).profile;expect(fused.items[0]).toMatchObject({rarity:4,transferSlot:0});expect(reroll(fused,map,1,1).profile.items[0]!.transferSlot).toBe(0);expect(raiseItemLevel(fused,map,1,7).profile.items[0]!.transferSlot).toBe(0);
});
it('rejects stale/locked/worn/incompatible/duplicate/unchanged donors, invalid indices and insufficient/overflow wallets atomically',()=>{
  const p=setup();for(const args of [[999,0,2,0],[1,0,999,0],[1,-1,2,0],[1,3,2,0],[1,0,2,9],[1,0,1,0]])expect(transferAffix(p,map,args[0]!,args[1]!,args[2]!,args[3]!).profile).toBe(p);
  for(const patch of [{locked:true},{slot:'head'},{affixes:['armour','resist']},{affixes:['hp','resist'],q:{main:90,affixes:[80,88]}}]){const bad=structuredClone(p);Object.assign(bad.items[1]!,patch);expect(transferAffix(bad,map,1,0,2,0).profile).toBe(bad);}
  const worn=equip(p,'healer',2).profile;expect(transferAffix(worn,map,1,0,2,0).profile).toBe(worn);
  const weapon={...p,items:[{...main(),slot:'weapon' as const,hero:'guardian'},{...donor(),slot:'weapon' as const,hero:'healer'}]};expect(transferAffix(weapon,map,1,0,2,0).profile).toBe(weapon);
  for(const bank of [{ore:11,dust:100,seal:5,gold:20},{ore:100,dust:2,seal:5,gold:20},{ore:100,dust:100,seal:0,gold:20},{ore:9999999,dust:100,seal:5,gold:20}]){const poor={...p,bank};expect(transferAffix(poor,map,1,0,2,0).profile).toBe(poor);}
});
it('materializes legacy 100% qualities without invented paid capital and protects tuned gear from bulk recycling and automatic donor selection',()=>{
  const p=setup();delete p.items[0]!.q;delete p.items[0]!.locked;p.items[0]!.plus=undefined;p.items[0]!.investment=undefined;p.items[0]!.levelInvestment=undefined;
  const out=transferAffix(p,map,1,0,2,0).profile,item=out.items[0]!;expect(item.q).toEqual({main:100,affixes:[120,100,100]});expect(protectedItem(item)).toBe(true);expect(recycleSelection(out,map,'bag',[1]).profile).toBe(out);
  out.items.push({...main(),uid:3,locked:undefined,plus:undefined,investment:undefined,levelInvestment:undefined});out.nextItem=4;expect(fuseMaterials(out,map,3).map(i=>i.uid)).not.toContain(1);
  const back=salvage(out,map,[1]).profile;expect(back.bank.ore-out.bank.ore).toBe(map.equipment.salvage[3]!.ore);expect(back.bank.dust-out.bank.dust).toBe(map.equipment.salvage[3]!.dust);
});
it('v26 roundtrips bound gear through active battle ownership, take-home and v25 migration; rejects malformed binding and forged run provenance',()=>{
  const p=equip(transferAffix(setup(),map,1,0,2,0).profile,'guardian',1).profile,game=depart(p,map,lookup,77);game.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...game.run.hp},commands:[]};let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},game);expect(JSON.parse(raw).version).toBe(44);expect(parseGame(raw,map,lookup)).toEqual(game);expect(settle(p,game.run,'withdrawn',map).members.guardian!.gear!.body!.transferSlot).toBe(0);
  for(const value of [-1,3,0.5,null,'0']){const bad=JSON.parse(raw);bad.run.members.guardian.gear.body.transferSlot=value;expect(()=>parseGame(JSON.stringify(bad),map,lookup)).toThrow();}
  const mismatch=JSON.parse(raw);mismatch.run.members.guardian.gear.body.transferSlot=1;expect(()=>parseGame(JSON.stringify(mismatch),map,lookup)).toThrow();
  const old=setup();const migrated=parseGame(JSON.stringify({version:25,profile:old,run:null}),map,lookup);expect(migrated.profile.items).toEqual(old.items);expect(migrated.profile.items[0]!.transferSlot).toBeUndefined();
});
it('validates bound metadata and forbids camp transfer metadata on newly found UID-zero gear',()=>{
  const item=transferCandidate(map,main(),0,donor(),0)!;expect(itemValid(map,item,['guardian'])).toBe(true);expect(itemValid(map,{...item,uid:0},['guardian'],true)).toBe(false);expect(itemValid(map,{...item,q:undefined},['guardian'])).toBe(false);
  expect(transferReason(setup(),map,1,0,2,0)).toBe('');
});
