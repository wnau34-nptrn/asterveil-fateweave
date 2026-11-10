// Isolated rendering fixture: real UI/scene/resolver, never imported by the shipped game.
import Phaser from 'phaser';
import { veilSiege } from '../../../src/content/encounters/veil-siege';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { beginBattle, resolveCommand } from '../../../src/core/battle/engine';
import { fitViewport } from '../../../src/platform/viewport';
import type { EncounterDefinition } from '../../../src/core/battle/types';
import '../../../src/ui/styles.css';
import '../../../src/ui/tokens.css';
import '../../../src/ui/effects.css';
import '../../../src/ui/world.css';
import '../../../src/ui/battle-skin.css';
import '../../../src/ui/game-feel.css';
import '../../../src/ui/portrait.css';
import '../../../src/ui/components.css';

const params = new URLSearchParams(location.search);
const enemyAfterHero = params.has('enemy-after-hero'), statusPreview = params.has('statuses'), largeHp = params.has('large-hp');
const data: EncounterDefinition = { ...structuredClone(veilSiege), id: 'hud-qa', level: 4,
  heroes: [...heroes, mercenaries.find(h => h.id === 'garran')!].map((h, i) => ({ ...h, maxHp: 100, speed: i === 1 ? 200 : 110 - i })),
  enemies: [
    { id: 'f1', row: 'front', boss: true, large: true, name: 'ราชาผู้เฝ้ารอยแยก', art: 'foe_golem', maxHp: largeHp ? 9999 : 500, traits: statusPreview ? ['thorns', 'veilguard', 'enrage'] : [], speed: enemyAfterHero ? 190 : 100, color: 0xff7777 },
    { id: 'f2', row: 'front', name: 'ด้วงหนาม', art: 'foe_thorn_beetle', maxHp: 100, speed: 90, color: 0x77ff77 },
    { id: 'f3', row: 'front', name: 'ด้วงหนาม', art: 'foe_thorn_beetle', maxHp: 100, speed: 85, color: 0x77ff77 },
    { id: 'b1', row: 'back', name: 'ภูตสปอร์', art: 'foe_spore_puff', maxHp: 100, speed: 80, color: 0x77ff77 },
    { id: 'b2', row: 'back', name: 'ภูตสปอร์', art: 'foe_spore_puff', maxHp: 100, speed: 75, color: 0x77ff77 },
  ], phases: [],
  rules: { ...veilSiege.rules, traits: statusPreview ? { thornsPercent: 10, veilguardPercent: 20, enrageBelow: 40, enragePercent: 25 } : veilSiege.rules.traits },
  intents: ['f1', 'f2', 'f3', 'b1', 'b2'].map(sourceId => ({ sourceId, targetSlot: 0, name: 'Raking Slash', damage: 2, kind: 'physical' as const })),
};
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
const ui = new BattleUI(document.querySelector('#battle-view')!, data);
const scene = new BattleScene(data, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 30 }, audio: { noAudio: true } });
const entry = { hp: Object.fromEntries(data.heroes.map((h, i) => [h.id, [100, 40, 25, 60, 90][i]!])) };
const initial = beginBattle(data, entry).state;
const commands = statusPreview ? resolveCommand(initial, data, { beat: initial.beat, heroId: 'tracer', action: 'mark', targetId: 'f1' }).state.commands : [];
ui.open({ kind: 'boss', data, entry, commands,
  commit: state => { localStorage.setItem('hud-committed', JSON.stringify(state)); return true; }, leaveLabel: () => '', leave: () => {} });
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
void document.fonts.ready.then(() => scene.refreshLayout());
const qa = { slots: () => [...scene.actorPanels].map(([id, slot]) => ({ id, ...slot })) };
declare global { interface Window { battleHudQA: typeof qa } }
window.battleHudQA = qa;
