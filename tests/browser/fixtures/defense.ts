// Art-reference fixture only: real renderer and resolver, no production entry point.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { beginBattle, resolveCommand, targetKind, targetOptions } from '../../../src/core/battle/engine';
import type { ActionId, EncounterDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const skill = (new URLSearchParams(location.search).get('skill') ?? 'guard') as ActionId;
const role = ['brace','spearwall','hold'].includes(skill) ? 'Spear' : ['stonearmor','guardstone'].includes(skill) ? 'Warden' : ['halo','sanctuary'].includes(skill) ? 'Priest' : skill === 'aegis' ? 'Mage' : 'Knight';
const actor = [...heroes,...mercenaries].find(h => h.role === role)!;
const allies = [actor,...heroes.filter(h => h.id !== actor.id).slice(0,3)];
const data: EncounterDefinition = {...structuredClone(veilSiege),
  heroes: allies.map((h,i) => ({...h,speed:i===0?200:50,...i===0?{actions:[...new Set<ActionId>(['attack',skill])]}:{}})),
  enemies: veilSiege.enemies.map(e => ({...e,speed:100})),
  intents: veilSiege.enemies.map(e => ({sourceId:e.id,targetSlot:1,name:'Raking Slash',damage:12,kind:'physical' as const})),
};
localStorage.setItem('asterveil.fateweave.tutorial.v1','off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!,data);
const scene = new BattleScene(data,id => ui.choose(id,'canvas'),() => ui.sceneReady(),() => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({type:Phaser.AUTO,parent:'game',transparent:true,scale:{mode:Phaser.Scale.NONE,width:320,height:240},scene:[scene],fps:{target:60},audio:{noAudio:true}});
ui.open({kind:'random',data,entry:{hp:Object.fromEntries(data.heroes.map(h => [h.id,h.maxHp]))},commands:[],
  commit:state => {localStorage.setItem('defense-committed',JSON.stringify(state));return true;},leaveLabel:() => '',leave:() => {}});
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());

const qa = {storyboardAnchors:() => {
  const state = beginBattle(data,undefined,true).state;
  const mode = targetKind(skill);
  const options = targetOptions(state,data,actor.id,skill).filter(t=>t.valid);
  const preferred = skill==='guardstone' ? 'weaver' : skill==='sanctuary' ? 'tracer' : '';
  const targetId = (options.find(t=>t.id===preferred) ?? options.find(t=>t.id!==actor.id) ?? options[0])?.id;
  if (!targetId) throw new Error(`No legal target for ${skill}`);
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
