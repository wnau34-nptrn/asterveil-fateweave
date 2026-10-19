import Phaser from 'phaser';
import { encounterById } from './content/encounters/catalog';
import { chapterOne } from './content/world/chapter1';
import { BattleScene } from './game/scenes/BattleScene';
import { BattleUI } from './ui/battle-ui';
import { GameShell } from './ui/game-shell';
import { fitViewport } from './platform/viewport';
import './ui/styles.css';
import './ui/tokens.css';
import './ui/effects.css';
import './ui/world.css';
import './ui/battle-skin.css';
import './ui/game-feel.css';
import './ui/portrait.css';

fitViewport();
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = '<section id="title-view" class="view title-view"></section><section id="commander-view" class="view lobby-view commander-view" hidden></section><section id="lobby-view" class="view lobby-view" hidden></section><section id="world-view" class="view world-view" hidden></section><section id="battle-view" class="view battle-view view-off"></section>';
const views = { title: app.querySelector<HTMLElement>('#title-view')!, commander: app.querySelector<HTMLElement>('#commander-view')!, lobby: app.querySelector<HTMLElement>('#lobby-view')!, world: app.querySelector<HTMLElement>('#world-view')!, battle: app.querySelector<HTMLElement>('#battle-view')! };
const ui = new BattleUI(views.battle, encounterById(chapterOne.tutorialEncounterId)!);
let battleVisible = false;
const scene = new BattleScene(ui.encounter, id => ui.choose(id, 'canvas'), () => { ui.sceneReady(); if (!battleVisible) game.loop.sleep(); }, () => ui.fieldLayoutChanged());
ui.attach(scene);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // Transparent: the battle painting is drawn behind the whole view (rift-backdrop.ts).
  transparent: true,
  // BattleScene.fit() sizes the buffer to the arena at devicePixelRatio for sharp art.
  scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 },
  scene: [scene],
  fps: { target: 30 },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: true },
});
const shell = new GameShell(app, chapterOne, encounterById, ui, views);
// Web fonts and DOM strips can resize the arena without a window resize; re-measure the canvas.
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts?.ready.then(() => scene.refreshLayout());
// Moving to a screen with another pixel density changes no element size.
window.addEventListener('resize', () => scene.refreshLayout());
// Pause the battle renderer while exploring; resume and re-measure on entry.
shell.setBattleVisibilityListener(visible => {
  battleVisible = visible;
  if (!scene.isReady) return;
  if (visible) { game.loop.wake(); scene.refreshLayout(); } else game.loop.sleep();
});
// Startup finished: index.html's boot guard stands down.
(window as unknown as { __fateweaveReady?: boolean }).__fateweaveReady = true;
