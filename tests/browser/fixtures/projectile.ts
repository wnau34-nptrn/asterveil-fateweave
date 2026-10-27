// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { projectileFixture } from '../../fixtures/projectile';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { PROJECTILE_ATLAS, projectileCues, type ProjectileSkill } from '../../../src/game/visuals/projectile-fx';
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
const fixture = projectileFixture((params.get('skill') ?? 'hinder') as ProjectileSkill, params.get('scenario') ?? 'normal');
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; action?: string; side: string; resolved: BattleEvent[]; cues: ReturnType<typeof projectileCues>; before: TurnStage['before']; after: TurnStage['after'] }[] = [];
const play = scene.play.bind(scene);
scene.play = (turn, life) => { impacts.push({ at: Date.now()/1000, remainingMs: life ?? 650, actorId: turn.actorId, action: turn.action, side: turn.side, resolved: turn.events, cues: projectileCues(turn), before: turn.before, after: turn.after }); play(turn, life); };
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('projectile-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
function painted(atlas = PROJECTILE_ATLAS) {
  const items: { frame: string; x: number; y: number; width: number; height: number; alpha: number; rim: boolean }[] = [];
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === atlas) items.push({ frame: item.frame.name, x: item.x, y: item.y, width: item.displayWidth, height: item.displayHeight, alpha: item.alpha, rim: !!item.getData('healingRim') });
  } }; visit(scene.children.getChildren()); return items;
}
const qa = { impacts,painted,rings:()=>{
    let count=0;const visit=(items:Phaser.GameObjects.GameObject[])=>{for(const item of items){if(item instanceof Phaser.GameObjects.Container)visit(item.list);if(item instanceof Phaser.GameObjects.Arc)count++;}};const effects=(scene as unknown as {effects?:Phaser.GameObjects.Container}).effects;visit(effects?.list??[]);return count;
  },sequence:()=>fixture.turns,commands:()=>fixture.commands,prelude:()=>fixture.prelude,
  expectedCaptureState:()=>params.get('skill')==='track'&&params.get('scenario')!=='normal'&&params.has('scenario')?fixture.finalState:fixture.cast.state,
  target:()=>fixture.targetId==='enemies'?`enemies-${fixture.data.enemies[0]!.id}`:fixture.targetId,state:()=>ui.state,cues:()=>fixture.turns.flatMap(projectileCues),
  point:(id:string)=>scene.projectileAnchor(id)!,stop:()=>scene.stopEffects(),
  load:()=>ui.open({kind:'random',data:fixture.data,entry:fixture.entry,commands:ui.state.commands,commit:()=>true,leaveLabel:()=>'',leave:()=>{}}),
  preview:(i:number)=>{const turn=fixture.turns[i]!;scene.stopEffects();scene.play(turn,450);return projectileCues(turn);},
  flight:()=>{
    const entries:{frame:string;x:number;y:number;sourceId:string;targetId:string;progress:number;visible:boolean;alpha:number}[]=[];
    const visit=(list:Phaser.GameObjects.GameObject[])=>{for(const item of list){if(item instanceof Phaser.GameObjects.Container)visit(item.list);
      if(item instanceof Phaser.GameObjects.Image&&item.texture.key===PROJECTILE_ATLAS&&item.frame.name.endsWith('_flight'))entries.push({frame:item.frame.name,x:item.x,y:item.y,sourceId:item.getData('projectileSource') as string,targetId:item.getData('projectileTarget') as string,progress:item.getData('projectileProgress') as number,visible:item.visible,alpha:item.alpha});}};
    visit(scene.children.getChildren());return entries;
  },
  independentSource:()=>{
    const bodies=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies;
    const body=bodies.get(fixture.actor.id)!,sprite=body.list.find(c=>c instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
    const m=sprite.getWorldTransformMatrix(),rect=scene.game.canvas.getBoundingClientRect(),ratio=scene.game.canvas.width/rect.width;
    const pilot=sprite.texture.key.startsWith('unit-pilot-')?2:1,knife=fixture.actor.role==='Scout';
    const p=m.transformPoint(sprite.width*(knife?-.4:.36)/pilot,-sprite.height*(knife?.58:.86)/pilot);
    return {x:p.x/ratio,y:p.y/ratio};
  },
  nudge:()=>{const body=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies.get(fixture.actor.id)!;body.setPosition(body.x+7,body.y-4).setRotation(.08);},
  behindUnits:()=>{const root=scene.children.getChildren().find(c=>c instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container;
    return root.list[0] instanceof Phaser.GameObjects.Container&&(root.list[0] as Phaser.GameObjects.Container).list.some(c=>c instanceof Phaser.GameObjects.Image&&c.texture.key===PROJECTILE_ATLAS);},
};
declare global {interface Window {projectileQA:typeof qa}}
window.projectileQA=qa;
