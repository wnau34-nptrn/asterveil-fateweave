// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { unitDisplayRatio } from '../../../src/game/visuals/unit-frames';
import { artOf } from '../../../src/game/visuals/assets';
import { earthFixture } from '../../fixtures/earth';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { EARTH_ATLAS, earthCues, earthHealingEvents, type EarthSkill } from '../../../src/game/visuals/earth-fx';
import type { BattleEvent, TurnStage } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search);
const fixture = earthFixture((params.get('skill') ?? 'bash') as EarthSkill, params.get('scenario') ?? 'normal');
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; action?: string; side: string; resolved: BattleEvent[]; cues: ReturnType<typeof earthCues>; before: TurnStage['before']; after: TurnStage['after'] }[] = [];
const play = scene.play.bind(scene);
scene.play = (turn, life) => { impacts.push({ at: Date.now()/1000, remainingMs: life ?? 650, actorId: turn.actorId, action: turn.action, side: turn.side, resolved: turn.events, cues: earthCues(turn), before: turn.before, after: turn.after }); play(turn, life); };
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('earth-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
function painted(atlas = EARTH_ATLAS) {
  const items: { frame: string; x: number; y: number; width: number; height: number; alpha: number; rim: boolean }[] = [];
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === atlas) items.push({ frame: item.frame.name, x: item.x, y: item.y, width: item.displayWidth, height: item.displayHeight, alpha: item.alpha, rim: !!item.getData('healingRim') });
  } }; visit(scene.children.getChildren()); return items;
}
const qa={impacts,painted,rings:()=>{
 const effects=(scene as unknown as {effects?:Phaser.GameObjects.Container}).effects;
 return effects?.list.filter(c=>c instanceof Phaser.GameObjects.Arc).length??0;
},sequence:()=>fixture.turns,prelude:()=>fixture.prelude,state:()=>ui.state,
 target:()=>fixture.targetId==='enemies'?`enemies-${fixture.data.enemies[0]!.id}`:fixture.targetId,
 expectedCaptureState:()=>fixture.cast.state,cues:()=>fixture.turns.flatMap(earthCues),heals:()=>fixture.turns.flatMap(earthHealingEvents),
 point:(id:string,prepare=false)=>scene.earthAnchor(id,fixture.command.action as EarthSkill,prepare)!,
 stop:()=>scene.stopEffects(),load:()=>ui.open({kind:'random',data:fixture.data,entry:fixture.entry,commands:ui.state.commands,commit:()=>true,leaveLabel:()=>'',leave:()=>{}}),
 preview:(i:number)=>{const turn=fixture.turns[i]!;scene.stopEffects();scene.play(turn,450);return earthCues(turn);},
 independent:(id:string,prepare=false)=>{
  const body=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies.get(id)!;
  const sprite=body.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
  const m=sprite.getWorldTransformMatrix(),rect=scene.game.canvas.getBoundingClientRect(),ratio=scene.game.canvas.width/rect.width;
  const framed=sprite.texture.key.startsWith('unit-pilot-')?unitDisplayRatio(artOf(fixture.data,id)):1,skill=fixture.command.action;
  const x=prepare?.10:skill==='bash'?-.31:skill==='slam'?-.30:0,y=prepare?-.98:skill==='bash'?-.80:skill==='slam'?-.62:.04;
  const point=m.transformPoint(x*sprite.width/framed,y*sprite.height/framed);return {x:point.x/ratio,y:point.y/ratio};
 },
 nudge:(id:string)=>{const body=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies.get(id)!;body.setRotation(.08);},
 behindUnits:()=>{const root=scene.children.getChildren().find(c=>c instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container;
 return root.list[0] instanceof Phaser.GameObjects.Container&&(root.list[0] as Phaser.GameObjects.Container).list.some(c=>c instanceof Phaser.GameObjects.Image&&c.texture.key===EARTH_ATLAS);},
};
declare global {interface Window {earthQA:typeof qa}}
window.earthQA=qa;
