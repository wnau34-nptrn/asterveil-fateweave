import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { chapterOne as map } from '../src/content/world/chapter1';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { MAGIC_DAMAGE_SKILLS, PERCENT_SKILLS, SUPPORT_SKILLS, beginBattle, currentHeroId, previewCommand, replay, resolveCommand, skillCooldown, skillPower, targetOptions, withParty } from '../src/core/battle/engine';
import { battleData, battleState, heroCatalog, starred } from '../src/core/world/world';
import { depart, newProfile } from '../src/core/world/profile';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { characterSkillMetric } from '../src/ui/character-metrics';
import { affixPool, itemStats } from '../src/core/world/equipment';
import type { Item } from '../src/core/world/types';
import { legacyEnvelope } from './fixtures/legacy-save';

const hero = heroCatalog(lookup, map).find(h=>h.id==='weaver')!;
const powers = (magic: number, physical: number) => withParty(veilSiege, [{...hero, skillBonus:magic, damageBonus:physical}]);
describe('Magic Power replaces support as the shared magical scaling stat',()=>{
  it('magical damage and support scale together; physical attacks and percentage controls do not',()=>{
    const plain=powers(0,0),magic=powers(100,0),attack=powers(0,100);
    for(const a of [...MAGIC_DAMAGE_SKILLS,...SUPPORT_SKILLS]){
      expect(skillPower(magic,hero.id,a),a).toBe(skillPower(plain,hero.id,a)*2);
      expect(skillPower(attack,hero.id,a),a).toBe(skillPower(plain,hero.id,a));
      expect(skillCooldown(magic,hero.id,a),a).toBe(skillCooldown(plain,hero.id,a));
      expect(characterSkillMetric(a,magic.heroes[0]!,magic).scaling,a).toContain('พลังเวท');
    }
    for(const a of ['bash','execute','pierce','volley','ambush','slam','quake','knives'] as const){
      expect(skillPower(magic,hero.id,a)).toBe(skillPower(plain,hero.id,a));
      expect(skillPower(attack,hero.id,a)).toBe(skillPower(plain,hero.id,a)*2);
    }
    for(const a of PERCENT_SKILLS)expect(skillPower(magic,hero.id,a),a).toBe(skillPower(plain,hero.id,a));
  });
  it('a real spell uses the same power in its UI metric, preview, resolution and replay',()=>{
    const h={...starred(hero,1,map,1,{a1:2,c1:2},{weapon:{uid:1,slot:'weapon' as const,hero:hero.id,rarity:1 as const,level:5,affixes:['support' as const]}}),speed:1000};
    const data=withParty(veilSiege,[h]);const state=beginBattle(data).state;
    const command={heroId:h.id,beat:state.beat,action:'bolt' as const,targetId:targetOptions(state,data,h.id,'bolt').find(t=>t.valid)!.id};
    const result=resolveCommand(state,data,command);
    expect(previewCommand(state,data,command)).toEqual(result);
    expect(replay(data,result.state.commands)).toEqual(result.state);
    const damage=result.turns[0]!.events.find(e=>e.type==='damage'&&e.sourceId===h.id)!.amount;
    expect(damage).toBe(characterSkillMetric('bolt',h,data).value);
    expect(damage).toBeGreaterThan(veilSiege.skills.bolt.power);
    expect(h.damageBonus).toBe(0);
  });
  it('mage weapons roll Magic Power while retaining leech; class recommendations use magic',()=>{
    expect(map.equipment.supportHeroes).toContain('weaver');
    expect(itemStats(map.equipment,{slot:'weapon',hero:'weaver',level:5,rarity:1,uid:1,affixes:[]})).toEqual({support:14});
    expect(affixPool(map.equipment,'weapon','weaver')).toContain('leech');
    expect(affixPool(map.equipment,'weapon','weaver')).not.toContain('attack');
  });
});
const write=(game:Game)=>{let raw='';saveGame({getItem:()=>null,setItem:(_k,v)=>raw=v},game);return raw;};
it('v40 preserves a mage weapon and all investment metadata, converts Attack to Magic and restarts its pending battle',()=>{
  const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;
  const weapon:Item={uid:1,slot:'weapon',hero:'weaver',level:5,rarity:2,affixes:['attack','leech'],q:{main:113,affixes:[97,118]},plus:2,investment:{ore:9,dust:2},locked:true};
  p.members.weaver!.gear={weapon};p.nextItem=2;
  const game=depart(p,map,lookup,77);game.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{...game.run.hp},commands:[{heroId:'weaver',beat:0,action:'bolt',targetId:'f1'}]};
  const old=legacyEnvelope(JSON.parse(write(game)));old.version=40;
  const migrated=parseGame(JSON.stringify(old),map,lookup);
  const expected={...weapon,affixes:['support','leech']};
  expect(migrated.profile.members.weaver!.gear!.weapon).toEqual(expected);
  expect(migrated.run!.members.weaver!.gear!.weapon).toEqual(expected);
  expect(migrated.profile.bank).toEqual(game.profile.bank);expect(migrated.run!.resources).toEqual(game.run.resources);
  expect(migrated.run!.battle!.commands).toEqual([]);expect(migrated.run!.battle!.entry).toEqual(game.run.battle.entry);
  expect(parseGame(write(migrated),map,lookup)).toEqual({profile:migrated.profile,run:migrated.run});
  old.version=20;expect(parseGame(JSON.stringify(old),map,lookup).profile.members.weaver!.gear!.weapon).toEqual(expected);
});

it('v41 preserves a real pending spell replay with magic gear instead of restarting it again',()=>{
 const p=newProfile(map,17);p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.tutorialDone=true;
 p.party={deployed:['weaver'],reserve:p.company.filter(id=>id!=='weaver')};p.members.weaver!.gear={weapon:{uid:1,slot:'weapon',hero:'weaver',level:5,rarity:1,affixes:['support']}};p.nextItem=2;
 const game=depart(p,map,lookup,77);game.run.battle={kind:'random',encounterId:map.tutorialEncounterId,entry:{weaver:game.run.hp.weaver!},commands:[]};
 const data=battleData(game.run,map,lookup)!,state=battleState(game.run,map,lookup)!;expect(currentHeroId(state,data)).toBe('weaver');
 const result=resolveCommand(state,data,{heroId:'weaver',beat:state.beat,action:'bolt',targetId:targetOptions(state,data,'weaver','bolt').find(t=>t.valid)!.id});
 game.run.battle.commands=result.state.commands;expect(game.run.battle.commands).toHaveLength(1);
 expect(parseGame(write(game),map,lookup)).toEqual(game);
 const old=legacyEnvelope(JSON.parse(write(game)));old.version=40;old.profile.members.weaver.gear.weapon.affixes=['attack'];old.run.members.weaver.gear.weapon.affixes=['attack'];
 expect(parseGame(JSON.stringify(old),map,lookup).run!.battle!.commands).toEqual([]);
});
