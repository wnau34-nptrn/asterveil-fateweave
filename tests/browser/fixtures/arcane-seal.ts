// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { sealFixture } from '../../fixtures/arcane-seal';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { SEAL_ATLAS, sealCues, type SealSkill } from '../../../src/game/visuals/arcane-seal-fx';
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
const fixture = sealFixture((params.get('skill') ?? 'mark') as SealSkill, params.get('scenario') ?? 'normal');
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: params.get('speed') ?? 'normal', intensity: params.get('intensity') ?? 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const impacts: { at: number; remainingMs: number; actorId: string; action?: string; side: string; resolved: BattleEvent[]; cues: ReturnType<typeof sealCues>; before: TurnStage['before']; after: TurnStage['after'] }[] = [];
const play = scene.play.bind(scene);
scene.play = (turn, life) => { impacts.push({ at: Date.now()/1000, remainingMs: life ?? 650, actorId: turn.actorId, action: turn.action, side: turn.side, resolved: turn.events, cues: sealCues(turn), before: turn.before, after: turn.after }); play(turn, life); };
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: fixture.prelude,
  commit: s => { localStorage.setItem('seal-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
function painted(atlas = SEAL_ATLAS) {
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
 target:()=>fixture.targetId==='enemies'?`enemies-${fixture.data.enemies[0]!.id}`:fixture.targetId,action:()=>fixture.command.action,expectedCaptureState:()=>fixture.captureState,cues:()=>fixture.turns.flatMap(sealCues),
 point:(id:string,spot:'hand'|'centre'|'feet')=>scene.sealAnchor(id,spot)!,
 stop:()=>scene.stopEffects(),
 nudge:(id:string)=>{const body=(scene as unknown as {bodies:Map<string,Phaser.GameObjects.Container>}).bodies.get(id)!;body.setRotation(.08);},
};
declare global {interface Window {sealQA:typeof qa}}
window.sealQA=qa;
