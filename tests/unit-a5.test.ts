import {describe,it,expect} from 'vitest';
import {garranActions,brannActions,foeArts,foeIntents,unitA5Fixture} from './fixtures/unit-a5';
import {heroes} from '../src/content/heroes/team';
import {mercenaries} from '../src/content/heroes/mercenaries';
import {talentTrees} from '../src/content/heroes/talents';
import {encounters} from '../src/content/encounters/catalog';
import {unitClip,unitSample,unitDisplayRatio,unitIdleFrame,unitRegistry} from '../src/game/visuals/unit-frames';
import {unitPose,unitReactions} from '../src/game/visuals/unit-animation-map';
import manifest from '../src/game/visuals/unit-atlases.json';
import {readFileSync} from 'node:fs';
const clipOf={garran:{attack:'attack',pierce:'attack',halt:'attack',brace:'stance',spearwall:'stance',hold:'stance',warcry:'skill'},
 brann:{attack:'attack',slam:'skill',quake:'skill',tremor:'skill',taunt:'taunt',stonearmor:'brace',guardstone:'brace'}} as const;
// Contact is the first recover frame of each eight-frame clip block.
const contactOf={attack:5,skill:13,stance:26,taunt:26,brace:34} as const;
const sets={garran:garranActions,brann:brannActions} as const;
const actionsOf=(id:'garran'|'brann')=>{
 const h=[...heroes,...mercenaries].find(h=>h.id===id)!;
 return [...new Set([...h.actions,h.unlocks!.skill,...talentTrees[id]!.flatMap(n=>'unlock' in n.effect?[n.effect.unlock]:[])])].sort();
};
const foeClip={'Tusk Charge':'attack',Stampede:'skill','Thorn Pounce':'attack','Thorn Bite':'attack'} as const;
describe('A5 Garran / Brann / Mossback Tusker / Briar Stalker / Thorn Beetle actual content, clips and layout',()=>{
 for(const id of ['garran','brann'] as const)it(`covers every ${id} starting/unlock/tree action`,()=>{
  expect(actionsOf(id)).toEqual([...sets[id]].sort());
  for(const a of sets[id])expect(unitClip(id,a,undefined)).toBe((clipOf[id] as Record<string,string>)[a]);
 });
 it('audits every encounter using the three foes and each of their intents',()=>{
  const found:Record<string,Set<string>>={};
  for(const data of encounters)for(const e of data.enemies.filter(e=>(foeArts as readonly string[]).includes(e.art??''))){
   for(const intent of data.intents.filter(i=>i.sourceId===e.id)){(found[e.art!]??=new Set()).add(intent.name);expect(unitClip(e.art!,undefined,intent.name)).toBe(foeClip[intent.name as keyof typeof foeClip]);}
  }
  for(const art of foeArts)expect([...found[art]!].sort()).toEqual([...foeIntents[art]].sort());
 });
 for(const id of ['garran','brann'] as const)for(const action of sets[id]){
  it(`routes ${id} ${action} with cue-owned contact and resolver outcome`,()=>{
   const f=unitA5Fixture(id,action),turn=f.result.turns[0]!,pose=unitPose(turn,f.data)!;
   expect(turn.action).toBe(action);expect(f.result.state.commands).toHaveLength(1);
   const clip=unitClip(id,action,undefined)!,contact=contactOf[clip as keyof typeof contactOf];
   for(const p of [0,.1,.5,.99,1])expect(unitSample(pose,'prepare',p,clip,id)!.to).toBeLessThan(contact);
   expect(unitSample(pose,'recover',0,clip,id)!.from).toBe(contact);
  });
 }
 for(const art of foeArts)for(const name of foeIntents[art])it(`uses the real ${name} cue for ${art} without inventing a projectile`,()=>{
  const f=unitA5Fixture('garran','attack','normal',art,name),turn=f.result.turns.find(t=>t.side==='enemy')!;
  expect(turn.intent!.name).toBe(name);
  const pose=unitPose(turn,f.data)!,clip=unitClip(art,undefined,name)!;
  expect(clip).toBe(foeClip[name as keyof typeof foeClip]);
  const contact=clip==='skill'?13:5;
  for(const p of [0,.5,1])expect(unitSample(pose,'prepare',p,clip,art)!.to).toBeLessThan(contact);
  expect(unitSample(pose,'recover',0,clip,art)!.from).toBe(contact);
 });
 it('reads Tusk Charge and Stampede differently (clip, frames and sheet source)',()=>{
  const seq=(clip:'attack'|'skill')=>[...[0,.4,.99].map(p=>unitSample('smash','prepare',p,clip,'foe_tusker')!.from),...[0,.5,.99].map(p=>unitSample('smash','recover',p,clip,'foe_tusker')!.from)];
  expect(unitClip('foe_tusker',undefined,'Tusk Charge')).toBe('attack');expect(unitClip('foe_tusker',undefined,'Stampede')).toBe('skill');
  expect(seq('attack')).not.toEqual(seq('skill'));
  const a=JSON.parse(readFileSync('public/assets/units/'+manifest.tusker.atlas,'utf8')).frames;
  // Stampede's three crouch poses are distinct from each other; Tusk Charge repeats one prep pose.
  const prep=(start:number)=>[start+1,start+2,start+3].map(i=>JSON.stringify(a[i].frame));
  expect(new Set(prep(9)).size).toBe(3);expect(new Set(prep(1)).size).toBeLessThan(3);
 });
 it('uses actual hit, down and enemy-down events',()=>{
  for(const id of ['garran','brann'] as const){
   const hurt=unitA5Fixture(id,'attack','hurt');expect(hurt.result.turns.some(t=>unitReactions(t,hurt.data).get(id)?.pose==='hit')).toBe(true);
   const down=unitA5Fixture(id,'attack','down');expect(down.result.turns.some(t=>unitReactions(t,down.data).get(id)?.pose==='down')).toBe(true);
  }
  for(const art of foeArts){const f=unitA5Fixture('garran','attack','enemy-down',art);expect(f.result.turns.some(t=>unitReactions(t,f.data).get('f1')?.pose==='down')).toBe(true);}
 });
 it('adds A5 four-figure reaction sprites while preserving unknown fallback',()=>{
  for(const art of ['garran','brann',...foeArts]){
   expect(unitSample('hit','reaction',0,undefined,art)!.from).toBe(17);expect(unitSample('down','reaction',1,undefined,art)!.to).toBe(21);
   expect(unitSample('dodge','reaction',.5,undefined,art)).toBeUndefined();expect(unitSample('counter','reaction',.5,undefined,art)).toBeUndefined();expect(unitClip(art,'future',undefined)).toBeUndefined();
  }
  expect(unitSample('block','reaction',0,undefined,'garran')!.from).toBe(30);expect(unitSample('block','reaction',1,undefined,'garran')!.to).toBe(31);
  expect(unitSample('block','reaction',0,undefined,'brann')!.from).toBe(38);expect(unitSample('block','reaction',1,undefined,'brann')!.to).toBe(39);
  for(const art of foeArts)expect(unitSample('block','reaction',.5,undefined,art)).toBeUndefined();
  expect(unitClip('garran',undefined,'Thorn Bite')).toBeUndefined();expect(unitClip('foe_tusker','attack',undefined)).toBeUndefined();
 });
 it('keeps shared scale/pivot, lossless budgets and the documented frame layout',()=>{
  const layout={garran:{frames:32,locked:[1,8,9,16,22,29]},brann:{frames:40,locked:[1,8,9,16,22,29,30,37]},tusker:{frames:22,locked:[1,8,9,16]},stalker:{frames:22,locked:[9,10,11,12,13,14,15,16]},beetle:{frames:22,locked:[9,10,11,12,13,14,15,16]}} as const;
  for(const name of Object.keys(layout) as (keyof typeof layout)[]){const m=manifest[name],a=JSON.parse(readFileSync('public/assets/units/'+m.atlas,'utf8'));
   expect(m.decodedBytes).toBe(m.width*m.height*4);expect(m.decodedBytes).toBeLessThanOrEqual(6*1024*1024);expect(m.downloadBytes).toBeLessThanOrEqual(1_500_000);expect(Object.keys(a.frames)).toHaveLength(layout[name].frames);expect(m.frames).toBe(layout[name].frames);
   for(const i of layout[name].locked)expect(a.frames[i]).toEqual(a.frames[0]);
   for(const v of Object.values(a.frames) as {sourceSize:{w:number;h:number};spriteSourceSize:{x:number;y:number;w:number;h:number}}[]){expect(v.sourceSize).toEqual({w:512,h:512});expect(v.spriteSourceSize.y+v.spriteSourceSize.h).toBeLessThanOrEqual(500);}
  }
  expect(unitDisplayRatio('garran')*.42).toBeCloseTo(1);expect(unitDisplayRatio('brann')*.37).toBeCloseTo(1);
  for(const art of foeArts)expect(unitDisplayRatio(art)).toBe(2);
 });
 it('has no hover loop for A5 identities',()=>{
  for(const art of ['garran','brann',...foeArts]){expect('idleLoop' in unitRegistry[art as keyof typeof unitRegistry]).toBe(false);expect(unitIdleFrame(art,300)).toBeUndefined();}
 });
});
