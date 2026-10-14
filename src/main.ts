import Phaser from 'phaser';
import { encounterById } from './content/encounters/catalog';
import { chapterOne } from './content/world/chapter1';
import { BattleScene } from './game/scenes/BattleScene';
import { BattleUI } from './ui/battle-ui';
import { GameShell } from './ui/game-shell';
import './ui/styles.css';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = '<section id="title-view" class="view title-view"></section><section id="world-view" class="view world-view" hidden></section><section id="battle-view" class="view battle-view view-off"></section>';
const views = { title: app.querySelector<HTMLElement>('#title-view')!, world: app.querySelector<HTMLElement>('#world-view')!, battle: app.querySelector<HTMLElement>('#battle-view')! };
const ui = new BattleUI(views.battle, encounterById(chapterOne.tutorialEncounterId)!);
let battleVisible = false;
const scene = new BattleScene(ui.encounter, id => ui.choose(id, 'canvas'), () => { ui.sceneReady(); if (!battleVisible) game.loop.sleep(); }, () => ui.fieldLayoutChanged());
ui.attach(scene);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101c36',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [scene],
  fps: { target: 30 },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: true },
});
const shell = new GameShell(app, chapterOne, encounterById, ui, views);
// Pause the battle renderer while exploring; resume and re-measure on entry.
shell.setBattleVisibilityListener(visible => {
  battleVisible = visible;
  if (!scene.isReady) return;
  if (visible) { game.loop.wake(); scene.refreshLayout(); } else game.loop.sleep();
});
