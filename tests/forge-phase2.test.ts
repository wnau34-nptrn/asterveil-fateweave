import { expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { newProfile, equip, depart, settle, salvage } from '../src/core/world/profile';
import { enhanceTo, findItem, fuse, fuseMaterials, fuseReason, fusionRefund, itemLevelCap, itemLevelCost, raiseItemLevel } from '../src/core/world/forge';
import { itemValid, itemStats } from '../src/core/world/equipment';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import type { Item } from '../src/core/world/types';
const piece=(uid:number,patch:Partial<Item>={}):Item=>({uid,slot:'weapon',hero:'guardian',rarity:0,level:1,affixes:[],set:'dawn',q:{main:113,affixes:[]},...patch});
const setup=()=>({...newProfile(map,17),tutorialDone:true,items:[piece(1),piece(2),piece(3),piece(4,{locked:true}),piece(5)],nextItem:6,bank:{ore:1000,dust:1000,gold:20,seal:3}});
it('levels atomically to the area cap, retains all rolls and +, refunds only actual paid level costs',()=>{
  const p=enhanceTo(setup(),map,1,5).profile,original=structuredClone(p),item=p.items[0]!;
  expect(itemLevelCost(map,item,3)).toEqual({ore:20,dust:2});
  const out=raiseItemLevel(p,map,1,3).profile;
  expect(out.items[0]).toEqual({...item,level:3,levelInvestment:{ore:20,dust:2}});
  expect(p).toEqual(original);expect(out.forge).toBe(p.forge);expect(itemStats(map.equipment,out.items[0]!).attack).toBeGreaterThan(itemStats(map.equipment,item).attack!);
  const sequential=raiseItemLevel(raiseItemLevel(p,map,1,2).profile,map,1,3).profile;expect(out).toEqual(sequential);
  for(const target of [1,0,4,99,NaN,2.5])expect(raiseItemLevel(p,map,1,target).profile).toBe(p);
  const poor={...p,bank:{...p.bank,ore:19}};expect(raiseItemLevel(poor,map,1,3).profile).toBe(poor);
  const lowDust={...p,bank:{...p.bank,dust:0}};expect(raiseItemLevel(lowDust,map,1,3).profile).toBe(lowDust);
  const recycled=salvage(out,map,[1]).profile;expect(recycled.bank).toMatchObject({ore:1002,dust:1001});expect(salvage(recycled,map,[1]).profile).toBe(recycled);
});
it('unlocks only defeated area milestones permanently on return, including respawns, wipes and completion',()=>{
  let p=setup();p.members.guardian!.level=10;expect(itemLevelCap(p,map)).toBe(3);
  let game=depart(p,map,lookup,5);expect(settle(p,game.run!,'withdrawn',map).forgeLevel).toBe(3);
  game.run!.elitesDefeated=['gate-meadow'];p=settle(p,game.run!,'wiped',map) as typeof p;expect(itemLevelCap(p,map)).toBe(6);
  game=depart(p,map,lookup,6);game.run!.respawns={'gate-meadow':1};expect(settle(p,game.run!,'withdrawn',map).forgeLevel).toBe(6);
  game.run!.elitesDefeated=['gate-thicket'];expect(settle(p,game.run!,'withdrawn',map).forgeLevel).toBe(9);
  game.run!.elitesDefeated=['scar-golem'];expect(settle(p,game.run!,'wiped',map).forgeLevel).toBe(10);
  game.run!.elitesDefeated=[];expect(settle(p,game.run!,'complete',map).forgeLevel).toBe(10);
});
it('keeps full +, class, set, level, original qualities/affixes and ledgers through deterministic fusion',()=>{
  let p=raiseItemLevel(enhanceTo(setup(),map,1,5).profile,map,1,3).profile;p=equip(p,'guardian',1).profile;
  const before=findItem(p,1)!.item,out=fuse(p,map,1,[2,3]);expect(out).toEqual(fuse(p,map,1,[2,3]));
  const i=findItem(out.profile,1)!.item;expect(i).toMatchObject({...before,rarity:1,affixes:expect.any(Array),q:expect.any(Object)});expect(i.affixes).toHaveLength(1);expect(i.q!.main).toBe(113);expect(itemValid(map,i,p.company)).toBe(true);
  expect(out.profile.items.map(i=>i.uid)).toEqual([4,5]);expect(out.profile.bank).toEqual(p.bank);
});
it('manual donor selection refunds enhancement and level investment once without their base salvage',()=>{
  let p=raiseItemLevel(enhanceTo(setup(),map,2,3).profile,map,2,3).profile;
  expect(fuseMaterials(p,map,1).map(i=>i.uid)).toEqual([3,5]);
  expect(fusionRefund(p,map,[2,3])).toEqual({ore:35,dust:6});const before=p.bank;
  p=fuse(p,map,1,[2,3]).profile;expect(p.bank).toEqual({...before,ore:before.ore+35,dust:before.dust+6});
  expect(fuse(p,map,1,[2,3]).profile).toBe(p);expect(p.items[0]!.investment).toEqual({ore:0,dust:0});
});
it('rejects stale, locked, worn, wrong-type, duplicate, main and overflow donors without spending or RNG',()=>{
  const p=setup();for(const ids of [[2],[2,3,5],[2,2],[1,2],[2,4],[2,999]])expect(fuse(p,map,1,ids).profile).toBe(p);
  const worn=equip(p,'guardian',2).profile;expect(fuse(worn,map,1,[2,3]).profile).toBe(worn);
  p.items[1]!.slot='body';delete p.items[1]!.hero;expect(fuse(p,map,1,[2,3]).profile).toBe(p);
  const full=setup();full.bank.ore=9999999;full.items[1]!.plus=1;expect(fuseReason(full,map,1,[2,3])).toBe('full');expect(fuse(full,map,1,[2,3]).profile).toBe(full);
});
it('v23 preserves level capital through run provenance; v22 migration respects prior completion without inventing capital',()=>{
  const p=equip(raiseItemLevel(setup(),map,1,3).profile,'guardian',1).profile,game=depart(p,map,lookup,8);let raw='';saveGame({getItem:()=>null,setItem:(_k,s)=>{raw=s;}},game);
  expect(JSON.parse(raw).version).toBe(38);expect(parseGame(raw,map,lookup)).toEqual(game);
  const corrupt=JSON.parse(raw);corrupt.run.members.guardian.gear.weapon.levelInvestment.ore++;expect(()=>parseGame(JSON.stringify(corrupt),map,lookup)).toThrow();
  const legacy=setup();const old={version:22,profile:legacy,run:null};delete old.profile.forgeLevel;expect(parseGame(JSON.stringify(old),map,lookup).profile.forgeLevel).toBe(3);old.profile.completes=1;const migrated=parseGame(JSON.stringify(old),map,lookup).profile;expect(migrated.forgeLevel).toBe(10);expect(migrated.items[0]!.levelInvestment).toBeUndefined();
});
it('rejects corrupted level ledgers and unlock tiers, permits unchanged existing gear above the upgrade cap',()=>{
  const p=setup();for(const value of [null,{ore:-1,dust:0},{ore:1.5,dust:0},{ore:0},{ore:0,dust:0,extra:1},{ore:Number.MAX_SAFE_INTEGER+1,dust:0}])expect(itemValid(map,{...piece(1),levelInvestment:value} as Item,p.company)).toBe(false);
  expect(()=>parseGame(JSON.stringify({version:23,profile:{...p,forgeLevel:99},run:null}),map,lookup)).toThrow();
  p.items[0]!.level=10;expect(itemValid(map,p.items[0]!,p.company)).toBe(true);expect(raiseItemLevel(p,map,1,11).profile).toBe(p);
});
