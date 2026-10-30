import {describe,it,expect} from 'vitest';
import {foeSignatureCues,foeSignatureMoves,isFoeSignatureMove,type FoeSignatureMove} from '../src/game/visuals/foe-signature-fx';
import {foeSignatureFixture} from './fixtures/foe-signature-fx';
import {encounters} from '../src/content/encounters/catalog';
import {SPECIES} from '../src/content/enemies/species';
import art from '../src/game/visuals/foe-signature-art.json';
import atlas from '../public/assets/fx/foe_signature_fx.json';
import sources from '../incoming/ART-VFX-FOE-SIGNATURE-001/production-sources.json';
import layers from '../incoming/ART-VFX-FOE-SIGNATURE-001/layers.json';

const moves=Object.keys(foeSignatureMoves) as FoeSignatureMove[];
const bossSignature=['Thorn Tempest','Thorn Bloom','Thorn Rage','Gather Thorns','Thorn Storm','Rift Gathering','Rift Cataclysm','Rift Wave','Rift Beam','War Cry','Horn Charge','Stampede','Call the Hunt','Call the Rift','Rift Awakening'];

describe('foe signature VFX routing follows authoritative enemy turns',()=>{
 it('ships 40 layers (10 moves x prepare/travel/impact/settle) with art-sheet hashes and pivots',()=>{
  expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(art).sort());expect(Object.keys(art)).toHaveLength(40);
  for(const slug of Object.values(foeSignatureMoves))for(const beat of ['prepare','travel','impact','settle'])expect(art).toHaveProperty(`${slug}_${beat}`);
  const a=art as unknown as Record<string,{pivot:number[]}>;
  expect(a['veil-quake_travel']!.pivot).toEqual([.5,.875]);expect(a['seed-spark_travel']!.pivot).toEqual([.5,.5]);
  expect(Object.keys(sources.frames)).toHaveLength(40);
  const hashes=new Set(layers.layers.map(l=>l.sha256));for(const sha of Object.values(sources.frames))expect(hashes.has(sha)).toBe(true);
 });
 it('every routed name is a real announced move in content, none is a boss signature, kinds match the art',()=>{
  const used=new Map<string,Set<string>>();
  for(const e of encounters)for(const i of e.intents){(used.get(i.name)??used.set(i.name,new Set()).get(i.name)!).add(i.kind);}
  for(const s of Object.values(SPECIES))for(const m of s.moves){(used.get(m.name)??used.set(m.name,new Set()).get(m.name)!).add(m.kind);}
  for(const name of moves){
   expect(used.has(name),name).toBe(true);
   expect([...used.get(name)!],name).toEqual([name==='Veil Quake'?'physical':'energy']);
   expect(bossSignature).not.toContain(name);
  }
  expect(isFoeSignatureMove('Thorn Pounce')).toBe(false);expect(isFoeSignatureMove(undefined)).toBe(false);expect(isFoeSignatureMove('toString')).toBe(false);
  // Every content move named in the table keeps its row/kind, so the routing table cannot silently drift from the game.
  const named=new Set([...used.keys()].filter(isFoeSignatureMove));expect([...named].sort()).toEqual([...moves].sort());
 });
 for(const move of moves)it(`${move}: the recipient is the hero who really took the hit`,()=>{
  const f=foeSignatureFixture(move,'hit'),copy=JSON.stringify(f.turn),cues=foeSignatureCues(f.turn);
  expect(f.turn.intent?.name).toBe(move);expect(cues).toHaveLength(1);
  expect(f.turn.events).toContain(cues[0]!.event);expect(cues[0]).toMatchObject({move,sourceId:f.turn.actorId,targetId:'healer',outcome:'hit',total:1});
  expect(JSON.stringify(f.turn)).toBe(copy);
 });
 it('a Guard redirect paints the guarding hero, not the announced target',()=>{
  const f=foeSignatureFixture('Rift Bolt','guard'),cue=foeSignatureCues(f.turn)[0]!;
  expect(f.turn.intent?.targetId).toBe('weaver');expect(cue.targetId).toBe('guardian');expect(cue.event.targetId).toBe('guardian');expect(cue.outcome).toBe('hit');
 });
 it('a dodge is a miss: travel only, outcome dodged',()=>{
  for(const move of ['Seed Spark','Veil Quake'] as const){
   const f=foeSignatureFixture(move,'dodge'),cues=foeSignatureCues(f.turn);
   expect(f.turn.events.map(e=>e.type)).toEqual(['dodge']);expect(cues).toHaveLength(1);expect(cues[0]).toMatchObject({outcome:'dodged',targetId:'sefa'});
  }
 });
 it('a fully absorbed hit reads blocked, not hit',()=>{
  const f=foeSignatureFixture('Spore Hex','blocked'),cue=foeSignatureCues(f.turn)[0]!;
  expect(cue.event).toMatchObject({type:'damage',amount:0});expect(cue.event.absorbed).toBeGreaterThan(0);expect(cue.outcome).toBe('blocked');
 });
 it('an `all` intent draws one cue per actual recipient',()=>{
  const f=foeSignatureFixture('Star Flame','all'),cues=foeSignatureCues(f.turn);
  expect(cues.map(c=>c.targetId).sort()).toEqual(['guardian','healer','weaver']);expect(new Set(cues.map(c=>c.event)).size).toBe(3);expect(cues.every(c=>c.total===3)).toBe(true);
 });
 it('a cancelled move paints nothing',()=>{
  const f=foeSignatureFixture('Rune Lash','hit');
  expect(foeSignatureCues({...f.turn,events:[{type:'cancel',text:'cancelled',sourceId:f.turn.actorId}]})).toHaveLength(0);
  expect(foeSignatureCues({...f.turn,events:[...f.turn.events,{type:'cancel',text:'cancelled'}]})).toHaveLength(0);
 });
 it('hero turns, boss moves and unknown intents never route here',()=>{
  const f=foeSignatureFixture('Rift Bolt','hit'),hero=f.turns.find(t=>t.side==='hero')!;
  expect(foeSignatureCues(hero)).toHaveLength(0);
  for(const name of bossSignature)expect(foeSignatureCues({...f.turn,intent:{...f.turn.intent!,name}})).toHaveLength(0);
  expect(foeSignatureCues({...f.turn,intent:null})).toHaveLength(0);
 });
 it('only the foe\'s own damage events count (a hero counter is not a recipient)',()=>{
  const f=foeSignatureFixture('Veil Quake','hit'),extra={type:'counter' as const,text:'x',sourceId:'healer',targetId:f.turn.actorId,amount:5};
  expect(foeSignatureCues({...f.turn,events:[...f.turn.events,extra]})).toHaveLength(1);
 });
});
