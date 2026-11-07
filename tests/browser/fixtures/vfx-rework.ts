// Presentation-only fixture. Prelude and captured outcomes all use real resolver commands.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { beginBattle, currentHeroId, resolveCommand, targetOptions } from '../../../src/core/battle/engine';
import type { ActionId, Command, EncounterDefinition, EnemySlot, TurnStage } from '../../../src/core/battle/types';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { encounterUnitSheets } from '../../../src/game/visuals/optional-unit-assets';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search), scenario = params.get('scenario') ?? 'coat';
const actorId = scenario.startsWith('arcane') ? 'weaver' : scenario === 'clash' ? 'kael' : 'sefa';
const skill: ActionId = ({ coat:'knives',stack:'attack',tick:'attack',burst:'disarm',storm:'backstab',early:'backstab',shadow:'evade','arcane-gain':'bolt','arcane-release':'dispel',clash:'storedfist' } as Record<string, ActionId>)[scenario]!;
const actor = [...heroes,...mercenaries].find(h => h.id === actorId)!;
const actions: ActionId[] = actorId === 'sefa' ? ['attack','knives','disarm','backstab','evade','guard'] : actorId === 'weaver' ? ['attack','bolt','dispel','guard'] : ['attack','gatherfist','storedfist','guard'];
const data: EncounterDefinition = { ...structuredClone(veilSiege),
 heroes:[{...actor,speed:scenario==='tick'?40:200,maxHp:500,actions},...heroes.filter(h=>h.id!==actorId).slice(0,2).map(h=>({...h,speed:scenario==='tick'?200:50,maxHp:500,actions:['attack','guard'] as ActionId[]}))],
 enemies:veilSiege.enemies.slice(0,2).map((e,i)=>({...e,id:`f${i+1}` as EnemySlot,row:'front',speed:100,maxHp:scenario==='early'&&i===0?1:500})),
 intents:veilSiege.enemies.slice(0,2).map((_e,i)=>({sourceId:`f${i+1}` as EnemySlot,targetSlot:0,name:'Raking Slash',damage:12,kind:'physical'})),
};
const entry={hp:Object.fromEntries(data.heroes.map(h=>[h.id,h.maxHp]))};
let state=beginBattle(data,entry,true).state;
const prelude:Command[]=[];
const commandFor=(id:string,action:ActionId):Command=>({beat:state.beat,heroId:id,action,targetId:(targetOptions(state,data,id,action).find(t=>t.valid&&t.id==='f1')??targetOptions(state,data,id,action).find(t=>t.valid))!.id});
const playSetup=(action:ActionId)=>{const command=commandFor(actorId,action);prelude.push(command);state=resolveCommand(state,data,command,true).state;};
const nextActor=()=>{for(let i=0;i<15&&currentHeroId(state,data)!==actorId;i++){const id=currentHeroId(state,data)!;const command=commandFor(id,'guard');prelude.push(command);state=resolveCommand(state,data,command,true).state;}};
if(scenario==='tick')nextActor();
if(scenario==='stack'||scenario==='tick'||scenario==='burst'){playSetup('knives');nextActor();}
if(scenario==='burst'){playSetup('attack');nextActor();}
if(scenario==='arcane-release')for(let i=0;i<3;i++){while(!targetOptions(state,data,actorId,'bolt').some(t=>t.valid)){playSetup('guard');nextActor();}playSetup('bolt');nextActor();}
const command=commandFor(actorId,skill), expected=resolveCommand(state,data,command,true);
localStorage.setItem('asterveil.fateweave.presentation.v1',JSON.stringify({speed:params.get('speed')??'normal',intensity:params.get('intensity')??'standard'}));
localStorage.setItem('asterveil.fateweave.tutorial.v1','off');
fitViewport();
const ui=new BattleUI(document.querySelector('#battle-view')!,data);
const scene=new BattleScene(data,id=>ui.choose(id,'canvas'),()=>ui.sceneReady(),()=>ui.fieldLayoutChanged());
const impacts:{at:number;remainingMs:number;turn:TurnStage}[]=[];
const play=scene.play.bind(scene);scene.play=(turn,life)=>{impacts.push({at:Date.now()/1000,remainingMs:life??650,turn});play(turn,life);};
ui.attach(scene);scene.setBattleVisible(true);
new Phaser.Game({type:Phaser.AUTO,parent:'game',transparent:true,scale:{mode:Phaser.Scale.NONE,width:320,height:240},scene:[scene],fps:{target:60},audio:{noAudio:true}});
ui.open({kind:'random',data,entry,commands:prelude,commit:s=>{localStorage.setItem('rework-committed',JSON.stringify(s));return true;},leaveLabel:()=>'',leave:()=>{}});
new ResizeObserver(()=>scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(()=>scene.refreshLayout());
function painted(){const frames:{texture:string;frame:string;alpha:number;x:number;y:number;width:number;height:number}[]=[];const visit=(items:Phaser.GameObjects.GameObject[])=>{for(const item of items){if(item instanceof Phaser.GameObjects.Container)visit(item.list);if(item instanceof Phaser.GameObjects.Image&&item.visible&&item.alpha>.01&&item.texture.key.includes('rework'))frames.push({texture:item.texture.key,frame:item.frame.name,alpha:item.alpha,x:item.x,y:item.y,width:item.displayWidth,height:item.displayHeight});}};visit(scene.children.getChildren());return frames;}
const qa={skill,target:command.targetId==='enemies'?'enemies-f1':command.targetId,impacts,expected:()=>expected.state,turns:()=>expected.turns,state:()=>ui.state,painted,ready:()=>scene.textures.getTextureKeys().some(k=>k.includes('rework')),
 // Capture waits for optional animation uploads; this does not alter production battle readiness.
 artReady:()=>!scene.load.isLoading()&&encounterUnitSheets(data).every(name=>scene.textures.exists(`unit-pilot-${name}`))};
declare global{interface Window{vfxReworkQA:typeof qa}}
window.vfxReworkQA=qa;
