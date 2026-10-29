import {describe,it,expect} from 'vitest';
import {sefaActions,lioActions,foeArts,foeIntents,unitA6Fixture} from './fixtures/unit-a6';
import {heroes} from '../src/content/heroes/team';
import {mercenaries} from '../src/content/heroes/mercenaries';
import {talentTrees} from '../src/content/heroes/talents';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitDisplayRatio,unitIdleFrame,unitRegistry} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
const clipOf={sefa:{attack:'attack',ambush:'attack',backstab:'skill',disarm:'skill',knives:'knives',evade:'evade',decoy:'evade'},
 lio:{attack:'attack',note:'attack',valor:'skill',mend:'skill',solo:'skill',dread:'dread',finale:'finale'}} as const;
// Contact is the first recover frame of each eight-frame clip block.
const contactOf={attack:5,skill:13,knives:26,dread:26,evade:34,finale:34,snare:26} as const;
const sets={sefa:sefaActions,lio:lioActions} as const;
const actionsOf=(id:'sefa'|'lio')=>{
 const h=[...heroes,...mercenaries].find(h=>h.id===id)!;
 return [...new Set([...h.actions,h.unlocks!.skill,...talentTrees[id]!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort();
};
const foeClip={'Rune Lash':'attack','Rift Needle':'skill','Ribbon Snare':'snare','Spore Dust':'attack'} as const;
describe('A6 Sefa / Lio / Rift Weaver / Spore Puff actual content, clips and layout',()=>{
 for(const id of ['sefa','lio'] as const)it(`covers every ${id} starting/unlock/tree action`,()=>{
  expect(actionsOf(id)).toEqual([...sets[id]].sort());
  for(const a of sets[id])expect(unitClip(id,a,undefined)).toBe((clipOf[id] as Record<string,string>)[a]);
 });
 it('audits every encounter using the two foes and each of their intents',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(foeArts as readonly string[]).includes(e.art??''))){
   for(const intent of data.intents.filter(i=>i.sourceId===e.id)){(found[e.art!]??=new Set()).add(intent.name);expect(unitClip(e.art!,undefined,intent.name)).toBe(foeClip[intent.name as keyof typeof foeClip]);}
  }
  for(const art of foeArts)expect([...found[art]!].sort()).toEqual([...foeIntents[art]].sort());
 });
 for(const id of ['sefa','lio'] as const)for(const action of sets[id]){
  it(`routes ${id} ${action} with cue-owned contact and resolver outcome`,()=>{
   const f=unitA6Fixture(id,action),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
   expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(f.prelude.length+1);
   const clip=unitClip(id,action,undefined)!,contact=contactOf[clip as keyof typeof contactOf];
   for(const p of [0,.1,.5,.99,1])expect(unitSample(pose,'prepare',p,clip,id)!.to).toBeLessThan(contact);
   expect(unitSample(pose,'recover',0,clip,id)!.from).toBe(contact);
  });
 }
 for(const art of foeArts)for(const name of foeIntents[art])it(`uses the real ${name} cue for ${art} without inventing a projectile`,()=>{
  const f=unitA6Fixture('sefa','attack','normal',art,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,name)!;
  expect(clip).toBe(foeClip[name as keyof typeof foeClip]);
  const contact=contactOf[clip as keyof typeof contactOf];
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,art)!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,art)!.from).toBe(contact);
 });
 it('gives each Rift Weaver intent and each Lio/Sefa gesture its own frames',()=>{
  const seq=(clip:'attack'|'skill'|'snare',art:string)=>[...[0,.4,.99].map(p=>unitSample('cast','prepare',p,clip,art)!.from),...[0,.5,.99].map(p=>unitSample('cast','recover',p,clip,art)!.from)];
  expect(new Set([JSON.stringify(seq('attack','foe_riftweaver')),JSON.stringify(seq('skill','foe_riftweaver')),JSON.stringify(seq('snare','foe_riftweaver'))]).size).toBe(3);
  const frames=(clip:string)=>JSON.stringify([0,.5,.99].map(p=>unitSample('song','recover',p,clip as 'skill','lio')!.from));
  expect(new Set(['attack','skill','dread','finale'].map(frames)).size).toBe(4);
 });
 it('uses actual hit, down and enemy-down events',()=>{
  for(const id of ['sefa','lio'] as const){
   const hurt=unitA6Fixture(id,'attack','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get(id)?.pose==='hit')).toBe(true);
   const down=unitA6Fixture(id,'attack','down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get(id)?.pose==='down')).toBe(true);
  }
  for(const art of foeArts){const f=unitA6Fixture('sefa','attack','enemy-down',art);expect(f.result.turns.some(t=>unitReactions(t,f.data).get('f1')?.pose==='down')).toBe(true);}
 });
 it('adds A6 four-figure reaction sprites while preserving unknown fallback',()=>{
  for(const art of ['sefa','lio',...foeArts]){
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(17);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(21);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();
  }
  for(const id of ['sefa','lio']){expect(unitSample('block','reaction',0,undefined,id)!.from).toBe(38);expect(unitSample('block','reaction',1,undefined,id)!.to).toBe(39);}
  for(const art of foeArts)expect(unitSample('block','reaction',.5,undefined,art)).toBeUndefined();
  expect(unitClip('sefa',undefined,'Rune Lash')).toBeUndefined();expect(unitClip('foe_riftweaver','attack',undefined)).toBeUndefined();
 });
 it('keeps shared scale/pivot, lossless budgets and the documented frame layout',()=>{
  const layout={sefa:{frames:40,locked:[1,8,9,16,22,29,30,37]},lio:{frames:40,locked:[1,8,9,16,22,29,30,37]},riftweaver:{frames:30,locked:[1,8,9,16,22,29]},sporepuff:{frames:22,locked:[1,8,9,10,11,12,13,14,15,16]}} as const;
  for(const name of Object.keys(layout) as (keyof typeof layout)[]){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);
   for(const i of layout[name].locked)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
  }
  expect(unitDisplayRatio('sefa')*.42).toBeCloseTo(1);expect(unitDisplayRatio('lio')*.42).toBeCloseTo(1);
  for(const art of foeArts)expect(unitDisplayRatio(art)).toBe(2);
 });
 it('has no hover loop for A6 identities',()=>{
  for(const art of ['sefa','lio',...foeArts]){expect('idleLoop' in unitRegistry[art as keyof typeof unitRegistry]).toBe(false);expect(unitIdleFrame(art,300)).toBeUndefined();}
 });
});
