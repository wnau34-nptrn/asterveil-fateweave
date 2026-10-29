// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { unitA10Fixture, foeArts } from '../../fixtures/unit-a10';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import type { TurnStage } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params=new URLSearchParams(location.search);
const hero='tracer';
const foe=(params.get('foe')??'raider') as (typeof foeArts)[number];
const fixture=unitA10Fixture(foe,params.get('intent')??undefined,params.get('scenario')??'normal');
localStorage.setItem('asterveil.fateweave.presentation.v1',JSON.stringify({speed:params.get('speed')??'normal',intensity:params.get('intensity')??'standard'}));
localStorage.setItem('asterveil.fateweave.tutorial.v1','off');
fitViewport();
const ui=new BattleUI(document.querySelector('#battle-view')!,fixture.data);
const scene=new BattleScene(fixture.data,id=>ui.choose(id,'canvas'),()=>ui.sceneReady(),()=>ui.fieldLayoutChanged());
const impacts: {at:number;remainingMs:number;turn:TurnStage}[]=[];
const play=scene.play.bind(scene);
scene.play=(turn,life)=>{impacts.push({at:Date.now()/1000,remainingMs:life??650,turn});play(turn,life);};
ui.attach(scene);
scene.setBattleVisible(true);
new Phaser.Game({type:Phaser.AUTO,parent:'game',transparent:true,scale:{mode:Phaser.Scale.NONE,width:320,height:240},scene:[scene],fps:{target:60},audio:{noAudio:true}});
let opened=false;
const load=()=>{ui.open({kind:'random',data:fixture.data,entry:fixture.entry,commands:opened?ui.state.commands:(JSON.parse(localStorage.getItem('unit-a10-committed')??'null') as {commands:typeof fixture.prelude}|null)?.commands??fixture.prelude,
 commit:s=>{localStorage.setItem('unit-a10-committed',JSON.stringify(s));return true;},leaveLabel:()=>'',leave:()=>{}});opened=true;};
load();
new ResizeObserver(()=>scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(()=>scene.refreshLayout());
const qa={reactionTiming:()=>{
 const motion=(scene as unknown as {unitAnimation:{motions:Map<string,{duration:number;elapsed:number;phase:string}>}}).unitAnimation.motions.get(hero);
 return motion?{duration:motion.duration,remaining:motion.duration-motion.elapsed,phase:motion.phase}:null;
 },impacts,turns:()=>fixture.result.turns,block:(ms=650)=>{
 // Presentation-only: no foe can fully absorb a hit in current content, so this plays the real hero turn with its damage amount forced to 0
 // (the resolver's block signal). Nothing is committed or saved.
 const turn=fixture.result.turns[0]!;
 scene.play({...turn,events:turn.events.map(e=>e.type==='damage'&&e.targetId==='f1'?{...e,amount:0}:e)},ms);
 },target:()=>fixture.command.targetId==='enemies'?`enemies-f1`:fixture.command.targetId,
 expected:()=>fixture.result.state,prelude:()=>fixture.prelude,state:()=>ui.state,load,
 frames:()=>{
 const bodies=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies;
 return Object.fromEntries([...bodies].map(([id,body])=>[id,body.list.filter((c):c is Phaser.GameObjects.Image=>c instanceof Phaser.GameObjects.Image).map(s=>({texture:s.texture.key,frame:s.frame.name,alpha:s.alpha,visible:s.visible,width:s.displayWidth,height:s.displayHeight,originY:s.originY,flipX:s.flipX}))]));
 },cached:()=>scene.textures.getTextureKeys().filter(k=>k.startsWith('unit-pilot-')),
};
declare global {interface Window {unitA10QA:typeof qa}}
window.unitA10QA=qa;
