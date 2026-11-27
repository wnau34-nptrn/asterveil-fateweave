// Hero life fixture (owner 2026-11-27 items 1–3, 6): real UI/scene/resolver, never imported by the shipped game.
// Five classes (Knight, Mage at 25% HP, Dancer with a starting barrier, Archer, Bard); `?end=victory` = a 1 HP foe,
// `?end=defeat` = a lone 1 HP Knight against a faster foe.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { rosterBatch1, rosterBatch1Skills } from '../../../src/content/heroes/roster-batch1';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import type { EncounterDefinition, HeroDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const end = new URLSearchParams(location.search).get('end');
const pool: HeroDefinition[] = [...heroes, ...mercenaries, ...rosterBatch1];
const pick = (id: string) => pool.find(h => h.id === id)!;
const cast = end === 'defeat' ? ['guardian'] : ['guardian', 'weaver', 'lalin', 'mira', 'lio'];
const data: EncounterDefinition = { ...structuredClone(veilSiege), id: 'hero-life-qa', level: 4,
  heroes: cast.map((id, i) => ({ ...pick(id), maxHp: 100, speed: 200 - i * 10, ...(id === 'lalin' ? { gear: { barrier: 20 } } : {}) })),
  enemies: [{ id: 'f1', row: 'front', name: 'ด้วงหนาม', art: 'foe_thorn_beetle', maxHp: end === 'victory' ? 1 : 500, speed: end === 'defeat' ? 250 : 50, color: 0x77ff77 }],
  phases: [], skills: { ...veilSiege.skills, ...rosterBatch1Skills },
  intents: [{ sourceId: 'f1', targetSlot: 0, name: 'Raking Slash', damage: end === 'defeat' ? 50 : 2, kind: 'physical' as const }],
};
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, data);
const scene = new BattleScene(data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], audio: { noAudio: true } });
const entry = { hp: Object.fromEntries(data.heroes.map(h => [h.id, end === 'defeat' ? 1 : h.id === 'weaver' ? 25 : 100])) };
ui.open({ kind: 'random', data, entry, commands: [], commit: () => true, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
const qa = { life: () => scene.lifeProbe() };
declare global { interface Window { heroLifeQA: typeof qa } }
window.heroLifeQA = qa;
