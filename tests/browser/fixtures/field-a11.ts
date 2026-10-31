// Dev-only QA entry (W8 / A11): the real BattleUI + BattleScene open catalog encounters one after another with a full party,
// so the spec can check every body draws its atlas, duplicates share one texture and nothing accumulates across encounters.
import Phaser from 'phaser';
import { BattleScene } from '../../../src/game/scenes/BattleScene';
import { BattleUI } from '../../../src/ui/battle-ui';
import { fitViewport } from '../../../src/platform/viewport';
import { encounterById } from '../../../src/content/encounters/catalog';
import { heroes } from '../../../src/content/heroes/team';
import { mercenaries } from '../../../src/content/heroes/mercenaries';
import { encounterUnitSheets } from '../../../src/game/visuals/optional-unit-assets';
import { usesBossSignature } from '../../../src/game/visuals/boss-signature-fx';
import { isFoeSignatureMove } from '../../../src/game/visuals/foe-signature-fx';
import { isSdSkill } from '../../../src/game/visuals/saint-dance-fx';
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
const roster = [...heroes, ...mercenaries];
// Heaviest atlases first (worst case for the texture budget); a fifth member for the OD-05 team of five.
const partyIds = (params.get('party') ?? 'tracer,lalin,healer,brann,lio').split(',');
const lanes: Record<string, 'front' | 'back'> = { tracer: 'front', brann: 'front', lalin: 'back', healer: 'back', lio: 'back' };
const field = (id: string): EncounterDefinition => {
  const base = encounterById(id)!;
  return { ...base, heroes: partyIds.map(h => ({ ...roster.find(r => r.id === h)!, lane: lanes[h] ?? roster.find(r => r.id === h)!.lane })) };
};
localStorage.setItem('asterveil.fateweave.presentation.v1', JSON.stringify({ speed: 'normal', intensity: 'standard' }));
localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
fitViewport();
let current = field(params.get('encounter') ?? 'vanguard-captain');
const ui = new BattleUI(document.querySelector('#battle-view')!, encounterById(current.id)!);
const scene = new BattleScene(encounterById(current.id)!, id => ui.choose(id, 'canvas'), () => ui.sceneReady(), () => ui.fieldLayoutChanged());
ui.attach(scene);
scene.setBattleVisible(true);
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', transparent: true, scale: { mode: Phaser.Scale.NONE, width: 320, height: 240 }, scene: [scene], fps: { target: 60 }, audio: { noAudio: true } });
const open = (id: string) => {
  current = field(id);
  ui.open({ kind: 'random', data: current, entry: { hp: Object.fromEntries(current.heroes.map(h => [h.id, h.maxHp])) }, commands: [], commit: () => true, leaveLabel: () => '', leave: () => {} });
};
open(current.id);
new ResizeObserver(() => scene.refreshLayout()).observe(document.querySelector('#game')!);
const OPTIONAL_FX = ['boss-signature-fx', 'foe-signature-fx', 'saint-dance-fx'];
const qa = {
  open,
  expectedSheets: () => encounterUnitSheets(current).map(s => `unit-pilot-${s}`).sort(),
  cached: () => scene.textures.getTextureKeys().filter(k => k.startsWith('unit-pilot-')).sort(),
  // Same rule as BattleScene.encounterFx.
  expectedFx: () => [usesBossSignature(current) && 'boss-signature-fx', current.intents.some(i => isFoeSignatureMove(i.name)) && 'foe-signature-fx',
    current.heroes.some(h => h.actions.some(a => isSdSkill(a))) && 'saint-dance-fx'].filter((k): k is string => !!k).sort(),
  optionalFx: () => scene.textures.getTextureKeys().filter(k => OPTIONAL_FX.includes(k)).sort(),
  // Decoded RGBA bytes of every texture the scene holds (all sources), by group.
  bytes: () => {
    const out = { unit: 0, fx: 0, other: 0 };
    for (const key of scene.textures.getTextureKeys()) {
      const t = scene.textures.get(key), n = t.source.reduce((s, src) => s + src.width * src.height * 4, 0);
      if (key.startsWith('unit-pilot-')) out.unit += n; else if (key.endsWith('-fx')) out.fx += n; else out.other += n;
    }
    return out;
  },
  bodies: () => {
    const bodies = (scene as unknown as { bodies: Map<string, Phaser.GameObjects.Container> }).bodies;
    return Object.fromEntries([...bodies].map(([id, body]) => [id, body.list.filter((c): c is Phaser.GameObjects.Image => c instanceof Phaser.GameObjects.Image).map(s => s.texture.key)]));
  },
  standing: () => current.enemies.filter(e => !e.reserve).length + current.heroes.length,
};
declare global { interface Window { fieldA11QA: typeof qa } }
window.fieldA11QA = qa;
