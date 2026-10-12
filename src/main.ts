import Phaser from 'phaser';
import { crystalRift } from './content/encounters/crystal-rift';
import { BattleScene } from './game/scenes/BattleScene';
import { BattleUI } from './ui/battle-ui';
import './ui/styles.css';

const ui = new BattleUI(document.querySelector<HTMLElement>('#app')!, crystalRift);
const scene = new BattleScene(crystalRift, id => ui.choose(id));
ui.attach(scene);
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101c36',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [scene],
  fps: { target: 30 },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: true },
});
