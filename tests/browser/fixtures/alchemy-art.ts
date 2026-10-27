// Artwork reference only; real renderer/resolver; no alchemy runtime integration.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { beginBattle, currentHeroId, resolveCommand, targetOptions } from '../../../src/core/battle/engine';
import type { ActionId, Command, EncounterDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

// Definitions only: no injected status, state mutation or invented resolver events.
const query=new URLSearchParams(location.search),skill=(query.get('skill')??'acid') as ActionId,scenario=query.get('scenario')??'base';
const actor=mercenaries.find(h=>h.role==='Alchemist')!;
const party=[actor,...heroes.filter(h=>['Knight','Mage','Priest'].includes(h.role))];
const caps=scenario==='spread'?{acidspread:1}:scenario==='wide'?{smokewide:20}:scenario==='poison'?{smokepoison:1}:{};
const slots:('f1'|'f2'|'b1'|'b2')[]=scenario==='backonly'?['b1','b2']:['f1','f2','b1','b2'];
const data:EncounterDefinition={...structuredClone(veilSiege),
 heroes:party.map((h,i)=>({...h,speed:i===0?200:50,...(i===0?{actions:['attack',skill,...(skill==='catalyst'?['acid' as const]:[])] as ActionId[],talents:{caps}}:{})})),
 enemies:slots.map((id,i)=>({...veilSiege.enemies.find(e=>e.id===(id.startsWith('f')?'f1':'b1'))!,id,row:id.startsWith('f')?'front' as const:'back' as const,maxHp:scenario==='down'&&id==='f1'?1:9999,speed:100-i})),
 intents:slots.map(id=>({sourceId:id,targetSlot:1,name:'QA actual announced attack',damage:1,kind:'physical' as const})),
};
const entry={hp:Object.fromEntries(party.map(h=>[h.id,h.maxHp]))};
let state=beginBattle(data,entry,true).state;
const prelude:Command[]=[];
if(scenario==='corroded'){
 const c:Command={beat:state.beat,heroId:actor.id,action:'acid',targetId:'f1'};
 state=resolveCommand(state,data,c,true).state;prelude.push(c);
 for(let n=0;currentHeroId(state,data)!==actor.id&&n<20;n++){
  const id=currentHeroId(state,data);if(!id)throw new Error('No legal hero');
  const target=targetOptions(state,data,id,'attack').find(t=>t.valid)!;
  const c:Command={beat:state.beat,heroId:id,action:'attack',targetId:target.id};
  state=resolveCommand(state,data,c,true).state;prelude.push(c);
 }
}
if(currentHeroId(state,data)!==actor.id)throw new Error('Wrong reference actor');
const preferred=['haste','fury'].includes(skill)?(scenario==='self'?actor.id:'guardian'):'f1';
const targetId=targetOptions(state,data,actor.id,skill).find(t=>t.valid&&t.id===preferred)?.id??targetOptions(state,data,actor.id,skill).find(t=>t.valid)!.id;
const command:Command={beat:state.beat,heroId:actor.id,action:skill,targetId};
const cast=resolveCommand(state,data,command,true),turn=cast.turns.find(t=>t.actorId===actor.id&&t.action===skill)!;
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({speed:'normal',intensity:'standard'}));
localStorage.setItem('asterveil.fateweave.tutorial.v1','off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!,data);
const scene = new BattleScene(data,id => ui.choose(id,'canvas'),() => ui.sceneReady(),() => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({type:Phaser.AUTO,parent:'game',transparent:true,scale:{mode:Phaser.Scale.NONE,width:320,height:240},scene:[scene],fps:{target:60},audio:{noAudio:true}});
ui.open({kind:'random',data,entry,commands:prelude,commit:() => true,leaveLabel:() => '',leave:() => {}});
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
const qa = { independentPivot: () => {
  const bodies=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies;
  const sprite=bodies.get(actor.id)!.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
  const m=sprite.getWorldTransformMatrix(),rect=scene.game.canvas.getBoundingClientRect(),ratio=scene.game.canvas.width/rect.width;
  return {x:rect.left+m.tx/ratio,footY:rect.top+m.ty/ratio};
}, mask: () => {
  // Independent image transforms; not the point helper being inspected.
  const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;
  const ctx=canvas.getContext('2d')!,rect=scene.game.canvas.getBoundingClientRect();
  const bodies=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies;
  for(const body of bodies.values())for(const child of body.list){
    if(!(child instanceof Phaser.GameObjects.Image)||!child.visible||child.alpha===0)continue;
    const m=child.getWorldTransformMatrix(),f=child.frame,dpr=scene.game.canvas.width/rect.width;
    ctx.save();ctx.setTransform(m.a/dpr,m.b/dpr,m.c/dpr,m.d/dpr,rect.left+m.tx/dpr,rect.top+m.ty/dpr);
    if(child.flipX)ctx.scale(-1,1);
    ctx.drawImage(f.source.image as HTMLImageElement,f.cutX,f.cutY,f.cutWidth,f.cutHeight,
      f.x-child.displayOriginX,f.y-child.displayOriginY,f.cutWidth,f.cutHeight);ctx.restore();
  }
  ctx.fillStyle='#fff';
  for(const label of document.querySelectorAll('.field-unit-name,.field-hp-value,.field-hp-track,.field-statuses')){
    const r=label.getBoundingClientRect();if(r.width&&r.height)ctx.fillRect(Math.floor(r.left)-1,Math.floor(r.top)-1,Math.ceil(r.width)+2,Math.ceil(r.height)+2);
  }
  const pixels=ctx.getImageData(0,0,390,844);
  for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255;pixels.data[i+3]=pixels.data[i+3]!>0?255:0;}
  ctx.putImageData(pixels,0,0);return canvas.toDataURL();
}, capture: () => {
  const rect=scene.game.canvas.getBoundingClientRect();
  const point=(id:string) => {
    const p=scene.healingAnchor(id)!, slot=scene.actorPanels.get(id)!;
    return {id,x:rect.left+p.x,y:rect.top+p.y,footY:rect.top+p.footY,size:slot.size,
      releaseX:rect.left+p.x+slot.size*.1,releaseY:rect.top+p.footY-slot.size*.98};
  };
  const events=turn.events;
  const ids=[...new Set(events.filter(e=>e.sourceId===actor.id && (e.type==='damage'||e.type==='dodge'||e.type==='weaken'||e.type==='corrode'||e.type==='haste'||e.type==='buff')).map(e=>e.targetId!))];
  return {source:point(actor.id),targets:ids.map(point),units:[...scene.actorPanels.keys()].map(point),events,
    castEvents:turn.events,laterTurns:cast.turns.filter(t=>t!==turn),prelude,command,before:state,after:turn.state,scenario,skill,
    committed:ui.state.commands,canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};
} };
declare global { interface Window { alchemyArtQA: typeof qa } }
window.alchemyArtQA=qa;
