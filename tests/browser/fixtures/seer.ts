// Dev-only QA entry. Real UI, scene, playback and replayable resolver commands.
import Phaser from 'phaser';
import { seerFixture } from '../../fixtures/seer';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { SEAL_ATLAS, sealCues } from '../../../src/game/visuals/arcane-seal-fx';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search);
const fixture = seerFixture(params.get('scenario') === 'star' ? 'star' : 'delay');
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, fixture.data);
const scene = new BattleScene(fixture.data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
const seen: { frame: string; target: unknown }[] = [];
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
ui.open({ kind: 'random', data: fixture.data, entry: fixture.entry, commands: [], commit: s => { localStorage.setItem('seer-committed', JSON.stringify(s)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
// Every painted seal image seen so far (the round-end star lands on a later stage, so the spec polls).
function sample() {
  const visit = (list: Phaser.GameObjects.GameObject[]) => { for (const item of list) {
    if (item instanceof Phaser.GameObjects.Container) visit(item.list);
    if (item instanceof Phaser.GameObjects.Image && item.texture.key === SEAL_ATLAS && !seen.some(s => s.frame === item.frame.name && s.target === item.getData('sealTarget'))) seen.push({ frame: item.frame.name, target: item.getData('sealTarget') });
  } }; visit(scene.children.getChildren()); return seen;
}
const qa = { sample, cues: () => fixture.turns.flatMap(t => sealCues(t).map(c => ({ skill: c.skill, targetId: c.targetId }))), skill: () => fixture.skill, state: () => ui.state };
declare global { interface Window { seerQA: typeof qa } }
window.seerQA = qa;
