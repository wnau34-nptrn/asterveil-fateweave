// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { unitA2Fixture } from '../../fixtures/unit-a2';
import type { ActionId } from '../../../src/core/battle/types';
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
const fixture=unitA2Fixture((params.get('skill')??'attack') as ActionId,params.get('scenario')??'normal',params.get('intent')??'Rift Bolt');
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
const load=()=>{ui.open({kind:'random',data:fixture.data,entry:fixture.entry,commands:opened?ui.state.commands:(JSON.parse(localStorage.getItem('unit-a2-committed')??'null') as {commands:typeof fixture.prelude}|null)?.commands??fixture.prelude,
 commit:s=>{localStorage.setItem('unit-a2-committed',JSON.stringify(s));return true;},leaveLabel:()=>'',leave:()=>{}});opened=true;};
load();
new ResizeObserver(()=>scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(()=>scene.refreshLayout());
const qa={reactionTiming:()=>{
 const motion=(scene as unknown as {unitAnimation:{motions:Map<string,{duration:number;elapsed:number;phase:string}>}}).unitAnimation.motions.get('guardian');
 return motion?{duration:motion.duration,remaining:motion.duration-motion.elapsed,phase:motion.phase}:null;
 },alchemyPoint:()=>{
 const body=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies.get('guardian')!;
 const sprite=body.list.find((c):c is Phaser.GameObjects.Image=>c instanceof Phaser.GameObjects.Image)!;
 // Independently use the documented seed normalization, including the live world matrix. The held static seed
 // (anatomy hold) fills its 512px cell, the A2 atlas draws it at .36.
 const n=sprite.texture.key==='unit-pilot-aegis'?.36:1;
 const point=sprite.getWorldTransformMatrix().transformPoint(.4*512*n,-.35*512*n);
 const dpr=scene.game.canvas.width/scene.game.canvas.getBoundingClientRect().width;
 const earth=sprite.getWorldTransformMatrix().transformPoint(-.31*512*n,-.80*512*n);
 const projectile=sprite.getWorldTransformMatrix().transformPoint(.36*512*n,-.86*512*n);
 return {actual:scene.alchemyAnchor('guardian','fury')!,expected:{x:point.x/dpr,y:point.y/dpr},earthActual:scene.earthAnchor('guardian','bash')!,earthExpected:{x:earth.x/dpr,y:earth.y/dpr},projectileActual:scene.projectileAnchor('guardian')!,projectileExpected:{x:projectile.x/dpr,y:projectile.y/dpr}};
 },impacts,turns:()=>fixture.result.turns,otherEncounter:()=>{
 const data={...fixture.data,heroes:fixture.data.heroes.filter(h=>h.id==='healer').map(h=>({...h,id:'toma'})),enemies:fixture.data.enemies.map(e=>({...e,art:'brute'}))};
 ui.open({kind:'random',data,entry:{hp:{toma:46}},commands:[],commit:()=>true,leaveLabel:()=>'',leave:()=>{}});
 },target:()=>fixture.command.targetId==='enemies'?`enemies-f1`:fixture.command.targetId,
 expected:()=>fixture.result.state,state:()=>ui.state,load,
 frames:()=>{
 const bodies=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies;
 return Object.fromEntries([...bodies].map(([id,body])=>[id,body.list.filter((c):c is Phaser.GameObjects.Image=>c instanceof Phaser.GameObjects.Image).map(s=>({texture:s.texture.key,frame:s.frame.name,alpha:s.alpha,visible:s.visible,width:s.displayWidth,height:s.displayHeight,originY:s.originY}))]));
 },cached:()=>scene.textures.getTextureKeys().filter(k=>k.startsWith('unit-pilot-')),
};
declare global {interface Window {unitA2QA:typeof qa}}
window.unitA2QA=qa;
