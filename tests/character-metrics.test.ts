import { expect, it } from 'vitest';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { newProfile, depart } from '../src/core/world/profile';
import { heroCatalog, memberDef, starred, wear } from '../src/core/world/world';
import { createBattle, resolveCommand, targetOptions, withParty } from '../src/core/battle/engine';
import type { ActionId } from '../src/core/battle/types';
import { characterSkillMetric, characterStats } from '../src/ui/character-metrics';
import { characterEquipmentComparison } from '../src/ui/character-view';
import type { Item } from '../src/core/world/types';

const template = lookup(map.tutorialEncounterId)!;
const setup = () => depart(newProfile(map,77),map,lookup,1234).run;
it('trial wear replaces rather than adds gear, updates sets/wounds and never mutates the real run', () => {
  const s = setup(); s.members.guardian = { stars:3, dupes:0, level:5, exp:0, wound:20, gear:{ body:{uid:1,slot:'body',rarity:0,level:10,affixes:[],set:'dawn'},head:{uid:2,slot:'head',rarity:0,level:1,affixes:[],set:'dawn'} } };
  const candidate: Item = {uid:0,slot:'body',rarity:0,level:1,affixes:[],set:'shadow'}; s.found=[candidate]; s.hp.guardian=11;
  const snapshot = structuredClone(s), next=wear(s,map,lookup,'guardian','found',0).state;
  const h=memberDef(lookup,map,s.members,'guardian')!, n=memberDef(lookup,map,next.members,'guardian')!;
  expect(n.maxHp).toBeLessThan(h.maxHp); expect(next.hp.guardian).toBe(11); expect(s).toEqual(snapshot);
  const html=characterEquipmentComparison(s,next,map,h,n,candidate,template);
  expect(html).toContain('2 ชิ้น ยังไม่ครบ'); expect(html).toContain('2 ชิ้น ทำงาน');
  expect(html).toContain('HP ปัจจุบัน 11 → 11'); expect(html).toContain('<h3>ผลต่อสกิล</h3>');
});
it('shows effective defense/leech caps and deployed team luck while keeping reserve trail regen', () => {
  const s=setup(); s.roster.reserve=['lio']; s.members.lio={stars:1,dupes:0,gear:{ boots:{uid:1,slot:'boots',rarity:1,level:99,affixes:['regen']},head:{uid:2,slot:'head',rarity:1,level:99,affixes:['luck']} }};
  const h={...memberDef(lookup,map,s.members,'guardian')!,armour:99,resist:99,leech:99};
  const stats=characterStats(s,map,h,template), value=(id:string)=>stats.find(v=>v.id===id)!.value;
  expect(value('armour')).toBe(template.rules.defenseCap); expect(value('resist')).toBe(template.rules.defenseCap); expect(value('leech')).toBe(template.rules.leechCap); expect(value('party-luck')).toBe(0);
  const reserve=characterStats(s,map,memberDef(lookup,map,s.members,'lio')!,template);
  expect(reserve.find(v=>v.id==='regen')!.value).toBeGreaterThan(0); expect(reserve.find(v=>v.id==='luck')!.value).toBeGreaterThan(0);
});
it('all ten classes expose finite stats and meaningful active metrics, including fixed effects and star unlocks', () => {
  const s=setup();
  for(const base of heroCatalog(lookup,map)) {
    // The Knight's star skills are tree nodes now (A6); a migrated ★5 company keeps them as grants.
    s.members[base.id]={stars:5,dupes:0,level:8,exp:0,...(base.id==='guardian'?{grants:['c1s','a4']}:{})}; s.hp[base.id]=1;
    const h=memberDef(lookup,map,s.members,base.id)!;
    expect(characterStats(s,map,h,template).every(v=>Number.isFinite(v.value)&&v.help.length>10)).toBe(true);
    for(const a of h.actions) { const v=characterSkillMetric(a,h,template); expect(v.target.length).toBeGreaterThan(0); if(v.value!==undefined) expect(Number.isFinite(v.value)).toBe(true); }
    expect(h.actions).toContain(base.unlocks!.skill);
  }
  // Every Knight tree skill has a readable metric.
  const k=starred(heroCatalog(lookup,map).find(h=>h.id==='guardian')!,1,map,1,{},undefined,{grants:['a3s','b2','c3'],loadout:['bulwark','challenge','rouse']});
  expect(k.actions).toEqual(['attack','bulwark','challenge','rouse']);
  for(const a of ['bulwark','challenge','rouse'] as const){const v=characterSkillMetric(a,k,template);expect(v.target.length).toBeGreaterThan(0);}
  expect(characterSkillMetric('bulwark',k,template).value).toBe(60);
});
it('displayed damage/healing/song powers agree with real resolver events before and after a gear swap', () => {
  for(const [id,action] of [['guardian','bash'],['weaver','bolt'],['healer','heal'],['lio','valor'],['lio','finale']] as const) {
    const s=setup(); const base=heroCatalog(lookup,map).find(h=>h.id===id)!;
    s.members[id]={stars:5,dupes:0,level:5,exp:0}; if(!s.roster.deployed.includes(id)) s.roster.reserve.push(id);
    s.found=[{uid:0,slot:'charm',rarity:1,level:9,affixes:['attack']}];
    for(const state of [s,wear(s,map,lookup,id,'found',0).state]) {
      const hero={...starred(base,5,map,5,{},state.members[id]!.gear),speed:1000,maxHp:1000};
      const data={...withParty(template,[hero]),enemies:template.enemies.map(e=>({...e,maxHp:10000}))};
      const songs: ('valor' | 'mend' | undefined)[] = action==='finale' ? ['valor','mend'] : [undefined];
      for (const song of songs) {
      const b=createBattle(data,{hp:{[id]:1}}); if(song) b.song={heroId:id,action:song};
      const targetId=action==='heal'||action==='valor'||action==='finale'?id:targetOptions(b,data,id,action as ActionId).find(t=>t.valid)!.id;
      const metric=characterSkillMetric(action,hero,data), result=resolveCommand(b,data,{beat:b.beat,heroId:id,action:action as ActionId,targetId});
      const type=action==='heal'||song==='mend'?'heal':action==='valor'?'song':'damage';
      const event=result.events.find(e=>e.type===type&&e.sourceId===id)!;
      expect(event.amount).toBe(song==='mend'?metric.secondary!.value:metric.value);
      }
    }
  }
});
