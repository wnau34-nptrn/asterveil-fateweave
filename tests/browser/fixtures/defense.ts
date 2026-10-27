// Source-only QA: real renderer, playback and resolver; never a production entry point.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { beginBattle, resolveCommand, targetKind, targetOptions } from '../../../src/core/battle/engine';
import { DEFENSE_ATLAS, defenseCues } from '../../../src/game/visuals/defense-fx';
import type { ActionId, BattleEvent, BattleState, EncounterDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params=new URLSearchParams(location.search),runtime=params.get('runtime')==='1',scenario=params.get('scenario')??'normal';
const skill = (params.get('skill') ?? 'guard') as ActionId;
const role = ['brace','spearwall','hold'].includes(skill) ? 'Spear' : ['stonearmor','guardstone'].includes(skill) ? 'Warden' : ['halo','sanctuary'].includes(skill) ? 'Priest' : skill === 'aegis' ? 'Mage' : 'Knight';
const actor = [...heroes,...mercenaries].find(h => h.role === role)!;
const allies = [actor,...heroes.filter(h => h.id !== actor.id).slice(0,3)];
const data: EncounterDefinition = {...structuredClone(veilSiege),
  heroes: allies.map((h,i) => ({...h,speed:i===0?200:50,...i===0?{actions:[...new Set<ActionId>(['attack',skill])]}:{}})),
  enemies: veilSiege.enemies.map(e => ({...e,speed:100})),
  intents: veilSiege.enemies.map(e => ({sourceId:e.id,targetSlot:runtime&&skill==='guardstone'?3:scenario==='save'?2:1,name:'QA announced attack',damage:scenario==='blocked'?4:scenario==='save'?200:scenario==='partial'?20:12,
    kind:runtime&&(['blocked','partial'].includes(scenario)||skill==='halo'||skill==='guardstone')?'energy' as const:'physical' as const,
    ...(runtime&&skill==='hold'&&scenario==='counter'?{all:true}:{})})),
};
const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,scenario==='save'&&h.id==='tracer'?1:scenario==='stone'&&h.id===actor.id?50:h.maxHp]))};
localStorage.setItem('asterveil.fateweave.presentation.v1',JSON.stringify({speed:params.get('speed')??'normal',intensity:params.get('intensity')??'standard'}));
localStorage.setItem('asterveil.fateweave.tutorial.v1','off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!,data);
const scene = new BattleScene(data,id => ui.choose(id,'canvas'),() => ui.sceneReady(),() => ui.fieldLayoutChanged());
const impacts:{at:number;action?:ActionId;side:string;events:string[];resolved:BattleEvent[]}[]=[];
const play=scene.play.bind(scene);
scene.play=(turn,life)=>{impacts.push({at:Date.now()/1000,action:turn.action,side:turn.side,events:turn.events.map(e=>e.type),resolved:turn.events});play(turn,life);};
ui.attach(scene);
new Phaser.Game({type:Phaser.AUTO,parent:'game',transparent:true,scale:{mode:Phaser.Scale.NONE,width:320,height:240},scene:[scene],fps:{target:60},audio:{noAudio:true}});
ui.open({kind:'random',data,entry,commands:[],
  commit:state => {localStorage.setItem('defense-committed',JSON.stringify(state));return true;},leaveLabel:() => '',leave:() => {}});
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());

function primeState(state:BattleState){
  if(scenario==='dodged')state.heroes.find(h=>h.id===actor.id)!.evading=true;
  if(scenario==='cancelled')for(const e of state.enemies)e.interruptedRound=state.round;
}
function selectedTarget(state:BattleState){
  const options = targetOptions(state,data,actor.id,skill).filter(t=>t.valid);
  const preferred = skill==='guardstone' ? 'weaver' : skill==='sanctuary' ? 'tracer' : '';
  const id = (options.find(t=>t.id===preferred) ?? options.find(t=>t.id!==actor.id) ?? options[0])?.id;
  if(!id)throw new Error(`No legal target for ${skill}`);return id;
}
function resolution(){
  const state=beginBattle(data,entry,true).state;primeState(state);
  return resolveCommand(state,data,{beat:state.beat,heroId:actor.id,action:skill,targetId:selectedTarget(state)},true);
}
function painted(atlas=DEFENSE_ATLAS){
  const items:{frame:string;x:number;y:number;width:number;height:number;alpha:number;rotation:number}[]=[];
  const visit=(list:Phaser.GameObjects.GameObject[])=>{for(const item of list){
    if(item instanceof Phaser.GameObjects.Container)visit(item.list);
    if(item instanceof Phaser.GameObjects.Image&&item.texture.key===atlas)items.push({frame:item.frame.name,x:item.x,y:item.y,width:item.displayWidth,height:item.displayHeight,alpha:item.alpha,rotation:item.rotation});
  }};visit(scene.children.getChildren());return items;
}
const qa = {impacts,painted,frames:()=>painted().map(p=>p.frame),bladeFrames:()=>painted('blade-fx').map(p=>p.frame),
  point:(id:string)=>{const p=scene.actorPanels.get(id)!;return {x:p.x,y:p.y-p.size*.48,footY:p.y};},
  target:()=>selectedTarget(ui.state),
  prime:()=>{primeState(ui.state);ui.attach(scene);},
  sequence:()=>resolution().turns,
  cues:()=>resolution().turns.flatMap(t=>defenseCues(t,data)),
  stop:()=>scene.stopEffects(),
  preview:(index:number)=>{const turn=resolution().turns[index]!;scene.stopEffects();scene.play(turn,450);return defenseCues(turn,data);},
  labelsAbovePaint:()=>{let above=true;const visit=(list:Phaser.GameObjects.GameObject[])=>{
    const paint=list.flatMap((i,n)=>i instanceof Phaser.GameObjects.Image&&i.texture.key===DEFENSE_ATLAS?[n]:[]),labels=list.flatMap((i,n)=>i instanceof Phaser.GameObjects.Text?[n]:[]);
    if(paint.length&&labels.length&&Math.min(...labels)<Math.max(...paint))above=false;
    for(const item of list)if(item instanceof Phaser.GameObjects.Container)visit(item.list);
  };visit(scene.children.getChildren());return above;},
  storyboardAnchors:() => {
  const state = beginBattle(data,entry,true).state;
  const mode = targetKind(skill);
  const targetId = selectedTarget(state);
  const result = resolveCommand(state,data,{beat:state.beat,heroId:actor.id,action:skill,targetId},true);
  const turn = result.turns.find(t => t.actorId===actor.id && t.action===skill)!;
  if (!turn) throw new Error(`No resolved stage for ${skill}`);
  const rect = scene.game.canvas.getBoundingClientRect();
  const point = (id:string) => {const slot=scene.actorPanels.get(id)!;return {id,x:rect.left+slot.x,y:rect.top+slot.y-slot.size*.48,size:slot.size};};
  const ids = skill==='aegis' ? turn.events.filter(e=>e.type==='barrier').map(e=>e.targetId!)
    : skill==='rally' ? turn.after!.rally!.ids
    : skill==='bulwark' || skill==='brace' || skill==='spearwall' ? data.heroes.filter(h=>h.lane==='front').map(h=>h.id)
    : skill==='hold' ? data.heroes.filter(h=>h.lane==='back').map(h=>h.id)
    : skill==='halo' ? data.heroes.map(h=>h.id)
    : turn.events.filter(e=>['guard','buff','barrier','sanctuary'].includes(e.type)).map(e=>e.targetId!);
  return {source:point(actor.id),targets:[...new Set(ids)].map(point),events:turn.events,mode,targetId};
}};
declare global {interface Window {defenseQA:typeof qa}}
window.defenseQA=qa;
