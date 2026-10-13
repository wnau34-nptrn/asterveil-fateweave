import Phaser from 'phaser';
import { veilSiege } from './content/encounters/veil-siege';
import { BattleScene } from './game/scenes/BattleScene';
import { BattleUI } from './ui/battle-ui';
import './ui/styles.css';

const ui = new BattleUI(document.querySelector<HTMLElement>('#app')!, veilSiege);
const scene = new BattleScene(veilSiege, id => ui.choose(id), () => ui.sceneReady());
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
