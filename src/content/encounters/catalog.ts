import type { EncounterDefinition } from '../../core/battle/types';
import { veilSiege } from './veil-siege';
import { SPECIES, foes } from '../enemies/species';
import { rosterBatch1 as BATCH_ONE } from '../heroes/roster-batch1';
import { gameRules } from '../world/rules';
import type { EnemySlot, IntentDefinition } from '../../core/battle/types';

// Every encounter reuses the four-hero party, skills and numeric rules.
// Bosses (`boss`) are steadfast: a cancelled turn shields their next round from Bash/Sigil; their signature move
// (`unstoppable`) can never be cancelled (owner 2026-10-22).
// Enemy ids are the field slots `f1`/`f2`/`f3` (front row) and `b1`/`b2`/`b3` (back row); front-row foes screen the back
// row. New sets are built from `SPECIES` with `foes`; older ones keep their hand-written numbers.
// `art` picks the illustrated Veil Frontier foe (ART-CHAR-MERC-ENEMY-001); without it the
// original Raider/Brute frames are shown. Physical foes use physical moves, energy foes energy moves.
export const rearAmbush: EncounterDefinition = {
  ...veilSiege, id: 'rear-ambush', version: 17, level: 8, name: 'ศึกเงาล่าแนวหลัง',
  enemies: [
    { id: 'b1', row: 'back', speed: 110, name: 'Rift Weaver', displayName: 'ผู้ทอรอยแยก', maxHp: 75, color: 0x5b63c9, art: 'foe_riftweaver' },
    { id: 'f1', row: 'front', large: true, speed: 70, name: 'Rift Channeler', displayName: 'อสูรส่งพลัง', maxHp: 180, color: 0x9785f2, art: 'foe_rift_channeler' },
  ],
  intents: [
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 3, name: 'Rune Lash', damage: 24, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 3, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    // Its rune ribbons bind one front-liner: the single physical move, so Shield Bash can stop it.
    { sourceId: 'b1', targetSlot: 1, name: 'Ribbon Snare', damage: 23, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 27, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 2, name: 'Rune Lash', damage: 23, kind: 'energy' },
  ],
};

// P05 (OD-09, draft): a boss's bark (`veilguard`, the hard-mode trait at the hard-mode numbers) blunts hits until a Mark,
// acid or a dispel opens it. Aira's Mark (prologue recruit, every company) is the answer every party has; a party that
// never answers kills it slower and eats more of its announced moves. `softened` trims the unanswered chip of a boss's
// helpers so the damage sits in the moves a player can read and answer (docs/validation/p05-2026-11-14/README_TH.md).
const { thornsPercent, veilguardPercent, enrageBelow, enragePercent } = gameRules.progression.hardTraits;
const barkRules = { ...veilSiege.rules, traits: { thornsPercent, veilguardPercent, enrageBelow, enragePercent } };
const softened = (xs: readonly IntentDefinition[], ids: readonly EnemySlot[], percent: number): IntentDefinition[] =>
  xs.map(m => (ids.includes(m.sourceId as EnemySlot) ? { ...m, damage: Math.round(m.damage * percent / 100) } : m));

// P02: the reference party of five-foe fields (the four plus Corin, the Saint, in front).
const fiveHeroes = [...veilSiege.heroes, BATCH_ONE.find(h => h.id === 'metta')!];
// Boss phases (owner 2026-10-22): at 70% the warden calls two rift wisps from the back row (hard mode: also a second
// shard crawler, if there is room); at 35% it charges, then strikes with a cataclysm and rift waves that hit the whole
// party. P02 (owner 2026-10-31): the warden no longer stands alone at the start: a shard crawler (f2) and a rift wisp
// (b3) guard it from round 1, so the full field reaches five when it calls the rift (draft). P05: the warden wears its bark
// and its wisps hit 70% as hard (their chip cost every style the same ~170 HP; casual rush first tries lost the warden 18%).
const wardenWisps = foes(10, [['b1', SPECIES.riftWisp, { reserve: true }], ['b2', SPECIES.riftWisp, { reserve: true }], ['f2', SPECIES.shardCrawler], ['b3', SPECIES.riftWisp], ['f3', SPECIES.shardCrawler, { reserve: true }]]);
// P11-04: the World Boss copy's HP (draft; tests/probe/p1104-world-boss.test.ts).
export const WORLD_BOSS_HP = 2400;
export const riftWarden: EncounterDefinition = {
  ...veilSiege, heroes: fiveHeroes, id: 'rift-warden', version: 21, level: 10, name: 'ศึกผู้คุมรอยแยก',
  phases: [{ sourceId: 'f1', below: 70, summon: ['b1', 'b2'], hardSummon: ['f3'], name: 'Call the Rift' }, { sourceId: 'f1', below: 35, name: 'Rift Awakening' }],
  rules: barkRules,
  // The Veilbound Sentinel, an ancient gate guardian cracked by the rift (mini boss art: gold and violet).
  enemies: [...wardenWisps.enemies, { id: 'f1', row: 'front', large: true, boss: true, speed: 70, name: 'Rift Warden', displayName: 'ผู้คุมรอยแยก', maxHp: 350, color: 0xd9bf86, art: 'foe_sentinel', traits: ['veilguard'] }],
  intents: [...softened(wardenWisps.intents, ['b1', 'b2', 'b3'], 70),
    { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 29, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 25, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Crushing Blow', damage: 33, kind: 'physical', unstoppable: true },
    { sourceId: 'f1', targetSlot: 3, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Raking Slash', damage: 21, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 29, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Rift Gathering', damage: 0, kind: 'energy', charge: true, phase: 2 },
    { sourceId: 'f1', targetSlot: 0, name: 'Rift Cataclysm', damage: 52, kind: 'physical', unstoppable: true, phase: 2 },
    { sourceId: 'f1', targetSlot: 0, name: 'Rift Wave', damage: 20, kind: 'energy', all: true, phase: 2 },
    { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 29, kind: 'physical', phase: 2 },
  ],
};

// One-time teaching battle. Each scheduled move gives one class skill a reason to exist:
// R1 Mark → physical hit on Lyra → Ward/Guard the energy blast → Heal; R2 consume Mark → Bash the physical.
export const firstClash: EncounterDefinition = {
  // The prologue fight: Vargoth's vanguard attacks the ruined frontier fort as the commander wakes (lore 2026-10-16).
  ...veilSiege, id: 'first-clash', version: 16, level: 1, name: 'กองหน้าของวาร์กอธ',
  enemies: [
    { id: 'b1', row: 'back', speed: 110, name: 'Vargoth Hunter', displayName: 'นักล่าเผ่าอสูร', maxHp: 56, color: 0xee80bd, art: 'foe_hunter' },
    { id: 'f1', row: 'front', large: true, speed: 70, name: 'Vargoth Guard', displayName: 'องครักษ์อสูร', maxHp: 100, color: 0x9785f2, art: 'foe_vargoth_guard' },
  ],
  intents: [
    { sourceId: 'b1', targetSlot: 1, name: 'Raking Slash', damage: 10, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 16, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 0, name: 'Raking Slash', damage: 10, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 14, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Shadow Knife', damage: 12, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 2, name: 'Rift Bolt', damage: 16, kind: 'energy' },
  ],
};

export const scoutPatrol: EncounterDefinition = {
  ...veilSiege, id: 'scout-patrol', version: 15, level: 2, name: 'ภูตเมล็ดลม',
  enemies: [{ id: 'b1', row: 'back', speed: 110, name: 'Dandelion Sprite', displayName: 'ภูตแดนดิไลออน', maxHp: 64, color: 0xa6dfce, art: 'foe_sprite' }],
  intents: [
    { sourceId: 'b1', targetSlot: 1, name: 'Seed Spark', damage: 11, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 3, name: 'Seed Spark', damage: 12, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 0, name: 'Seed Spark', damage: 11, kind: 'energy' },
  ],
};

export const riftWhelp: EncounterDefinition = {
  ...veilSiege, id: 'rift-whelp', version: 15, level: 2, name: 'หมูป่าหลังตะไคร่',
  enemies: [{ id: 'f1', row: 'front', large: true, speed: 70, name: 'Mossback Tusker', displayName: 'หมูป่าหลังตะไคร่', maxHp: 120, color: 0x718746, art: 'foe_tusker' }],
  intents: [
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 18, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 0, name: 'Tusk Charge', damage: 16, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 18, kind: 'physical' },
  ],
};

const matriarchBeetle = foes(5, [['f2', SPECIES.thornBeetle]]);
export const thicketAmbush: EncounterDefinition = {
  ...veilSiege, id: 'thicket-ambush', version: 15, level: 5, name: 'ราชินีแห่งพงหนาม',
  // Elite art (gold crown): the Thorn Matriarch fights with briars (physical) and blooms (energy).
  enemies: [...matriarchBeetle.enemies,
    { id: 'b1', row: 'back', speed: 110, name: 'Hollow Mycon', displayName: 'เห็ดหมอผีกลวง', maxHp: 66, color: 0x427f87, art: 'foe_mycon' },
    { id: 'f1', row: 'front', large: true, speed: 70, name: 'Thorn Matriarch', displayName: 'ราชินีหนาม', maxHp: 140, color: 0x397e77, art: 'foe_matriarch' },
  ],
  intents: [...matriarchBeetle.intents,
    { sourceId: 'b1', targetSlot: 1, name: 'Spore Hex', damage: 12, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 3, name: 'Thorn Bloom', damage: 20, kind: 'energy' },
    { sourceId: 'b1', targetSlot: 2, name: 'Spore Hex', damage: 14, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Briar Lash', damage: 20, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 0, name: 'Spore Hex', damage: 12, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 2, name: 'Thorn Bloom', damage: 22, kind: 'energy' },
  ],
};

export const shadowStalker: EncounterDefinition = {
  ...veilSiege, id: 'shadow-stalker', version: 15, level: 5, name: 'ลิงซ์หนามพราง',
  enemies: [{ id: 'f1', row: 'front', speed: 110, name: 'Briar Stalker', displayName: 'ลิงซ์หนามพราง', maxHp: 96, color: 0x397e77, art: 'foe_stalker' }],
  intents: [
    { sourceId: 'f1', targetSlot: 1, name: 'Thorn Pounce', damage: 18, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 0, name: 'Thorn Pounce', damage: 16, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Thorn Pounce', damage: 18, kind: 'physical' },
  ],
};

// Rift Scar: a Shard Golem (normal) with a Crystal Juggernaut (elite art: gold banding), both mostly physical.
export const crystalStampede: EncounterDefinition = {
  ...veilSiege, id: 'crystal-stampede', version: 10, level: 8, name: 'ฝูงผลึกบุกตะลุย',
  enemies: [
    { id: 'f2', row: 'front', speed: 75, name: 'Shard Golem', displayName: 'โกเลมเศษผลึก', maxHp: 100, color: 0x9454d6, art: 'foe_golem' },
    { id: 'f1', row: 'front', large: true, speed: 60, name: 'Crystal Juggernaut', displayName: 'ด้วงเกราะผลึก', maxHp: 180, color: 0x9454d6, art: 'foe_juggernaut' },
  ],
  intents: [
    { sourceId: 'f2', targetSlot: 0, name: 'Crystal Fist', damage: 16, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Horn Charge', damage: 24, kind: 'physical' },
    { sourceId: 'f2', targetSlot: 1, name: 'Crystal Fist', damage: 18, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Shard Burst', damage: 22, kind: 'energy' },
    { sourceId: 'f2', targetSlot: 0, name: 'Crystal Fist', damage: 16, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 0, name: 'Horn Charge', damage: 26, kind: 'physical' },
  ],
};

// Phase 3A elites guard the one-tile gates between zones (level = zone top + 2). Each brings one extra signature move.
// A spore puff drifts behind the chief. P05 (draft): the sprite's chip −25% and the chief's announced charges +25%
// (blind attacks pay for not bashing or guarding them; answering parties leave the gate with more HP).
const chiefSprite = foes(5, [['b2', SPECIES.sporePuff]]);
export const eliteTuskChief: EncounterDefinition = {
  ...veilSiege, id: 'elite-tusk-chief', version: 8, level: 5, name: 'จ่าฝูงแห่งทุ่ง',
  enemies: [...chiefSprite.enemies,
    { id: 'b1', row: 'back', speed: 110, name: 'Dandelion Sprite', displayName: 'ภูตแดนดิไลออน', maxHp: 70, color: 0xa6dfce, art: 'foe_sprite' },
    { id: 'f1', row: 'front', large: true, speed: 70, name: 'Tusker Chief', displayName: 'จ่าฝูงหมูป่าหลังตะไคร่', maxHp: 190, color: 0x718746, art: 'foe_tusker' },
  ],
  intents: [...chiefSprite.intents,
    { sourceId: 'b1', targetSlot: 2, name: 'Seed Spark', damage: 10, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 25, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Seed Spark', damage: 11, kind: 'energy' },
    // Signature: the chief's stampede, the round's heaviest physical hit (Shield Bash can stop it).
    { sourceId: 'f1', targetSlot: 0, name: 'Stampede', damage: 33, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 2, name: 'Seed Spark', damage: 10, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 25, kind: 'physical' },
  ],
};
// Boss phase (owner 2026-10-22): at 50% the lord rages, gathers thorns, then lashes the whole party with a thorn
// tempest (hard mode: a second spore puff joins). P05 (draft): the lord wears its bark and its own moves hit ~10% harder,
// the stalker's pounce ~20% softer, so blind attacks no longer win the forest boss and the map 3 gate most of the time.
const lordSpore = foes(8, [['b1', SPECIES.sporePuff], ['b2', SPECIES.sporePuff, { reserve: true }]]);
export const eliteBriarLord: EncounterDefinition = {
  ...veilSiege, id: 'elite-briar-lord', version: 11, level: 8, name: 'เจ้าป่าหนาม',
  phases: [{ sourceId: 'f1', below: 50, hardSummon: ['b2'], name: 'Thorn Rage' }],
  rules: barkRules,
  enemies: [...lordSpore.enemies,
    { id: 'f2', row: 'front', speed: 110, name: 'Briar Stalker', displayName: 'ลิงซ์หนามพราง', maxHp: 100, color: 0x397e77, art: 'foe_stalker' },
    { id: 'f1', row: 'front', large: true, speed: 70, boss: true, name: 'Briar Lord', displayName: 'เจ้าป่าหนาม', maxHp: 200, color: 0x397e77, art: 'foe_matriarch', traits: ['veilguard'] },
  ],
  intents: [...lordSpore.intents,
    { sourceId: 'f2', targetSlot: 1, name: 'Thorn Pounce', damage: 15, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 3, name: 'Thorn Bloom', damage: 24, kind: 'energy' },
    { sourceId: 'f2', targetSlot: 0, name: 'Thorn Pounce', damage: 14, kind: 'physical' },
    // Signature: a storm of thorns at the back line (energy: Sigil Bind or a Ward answer it).
    { sourceId: 'f1', targetSlot: 2, name: 'Thorn Storm', damage: 30, kind: 'energy', unstoppable: true },
    { sourceId: 'f2', targetSlot: 1, name: 'Thorn Pounce', damage: 15, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Briar Lash', damage: 24, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 0, name: 'Gather Thorns', damage: 0, kind: 'energy', charge: true, phase: 1 },
    // OD-09 (claude 2026-11-04): Gather Thorns telegraphs the Tempest; a Sigil Bind seals it, barriers/heals soften it, and
    // a party that ignores it takes 28 each (was 13 and unsealable, so plain attacks won the forest boss 50–71% of the time).
    { sourceId: 'f1', targetSlot: 0, name: 'Thorn Tempest', damage: 28, kind: 'energy', all: true, phase: 1 },
    { sourceId: 'f1', targetSlot: 1, name: 'Briar Lash', damage: 26, kind: 'physical', phase: 1 },
  ],
};

// Mini-boss (3B): a stone golem guarding the scar's side pocket with a rift weaver. Optional, but beating it is one of
// the rift seal's three objectives. Physical golem, energy weaver. P05-04 (v11): hard mode keeps its bark (traits merge).
export const miniVeilGolem: EncounterDefinition = {
  ...veilSiege, rules: barkRules, id: 'mini-veil-golem', version: 11, level: 9, name: 'ยักษ์หินแห่งรอยแผล',
  enemies: [
    { id: 'b1', row: 'back', speed: 105, name: 'Rift Weaver', displayName: 'ผู้ถักรอยแยก', maxHp: 80, color: 0x8a6cc7, art: 'foe_riftweaver' },
    { id: 'f1', row: 'front', large: true, speed: 65, boss: true, name: 'Veil Golem', displayName: 'ยักษ์หินรอยแยก', maxHp: 200, color: 0x7d8a96, art: 'foe_golem', traits: ['veilguard'] },
  ],
  intents: softened([
    { sourceId: 'b1', targetSlot: 2, name: 'Rift Needle', damage: 18, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Stone Fist', damage: 22, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Rift Needle', damage: 18, kind: 'energy' },
    // Signature: a quake that lands on the front line hardest (physical: Guard or Bash answer it).
    { sourceId: 'f1', targetSlot: 1, name: 'Veil Quake', damage: 30, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 2, name: 'Rift Needle', damage: 19, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Stone Fist', damage: 22, kind: 'physical' },
  ], ['b1'], 50).map(m => (m.sourceId === 'f1' ? { ...m, damage: Math.round(m.damage * 1.8) } : m)),
};

// Map 1 boss (chapters, draft): the captain of Vargoth's vanguard holds the fort gate. One signature hit per cycle
// teaches Guard (physical) and Ward (energy) before the frontier.
// The captain's own guard holds the second front slot. Boss phase (owner 2026-10-22): at 60% the captain calls a
// second hunter into the back row (teaches summons; no second phase).
const captainGuard = foes(3, [['f2', SPECIES.vargothGuard]]);
const captainHunter = { id: 'b2', row: 'back', reserve: true, speed: 110, name: 'Vargoth Hunter', displayName: 'นักล่าเผ่าอสูร', maxHp: 60, color: 0xee80bd, art: 'foe_hunter' } as const;
export const vanguardCaptain: EncounterDefinition = {
  ...veilSiege, id: 'vanguard-captain', version: 7, level: 3, name: 'หัวหน้ากองหน้าของวาร์กอธ',
  phases: [{ sourceId: 'f1', below: 60, summon: ['b2'], name: 'Call the Hunt' }],
  enemies: [...captainGuard.enemies, captainHunter,
    { id: 'b1', row: 'back', speed: 110, name: 'Vargoth Hunter', displayName: 'นักล่าเผ่าอสูร', maxHp: 60, color: 0xee80bd, art: 'foe_hunter' },
    { id: 'f1', row: 'front', large: true, speed: 70, boss: true, name: 'Vanguard Captain', displayName: 'หัวหน้ากองหน้า', maxHp: 170, color: 0x9785f2, art: 'foe_captain' },
  ],
  intents: [...captainGuard.intents,
    { sourceId: 'b1', targetSlot: 2, name: 'Raking Slash', damage: 11, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Crushing Blow', damage: 16, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Shadow Knife', damage: 12, kind: 'energy' },
    // Signature: the captain's war cry, an energy blast on the front line (Ward answers it, Bash cannot).
    { sourceId: 'f1', targetSlot: 0, name: 'War Cry', damage: 22, kind: 'energy', unstoppable: true },
    { sourceId: 'b1', targetSlot: 1, name: 'Raking Slash', damage: 11, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 2, name: 'Crushing Blow', damage: 16, kind: 'physical' },
    { sourceId: 'b2', targetSlot: 3, name: 'Shadow Knife', damage: 12, kind: 'energy' },
    { sourceId: 'b2', targetSlot: 1, name: 'Raking Slash', damage: 11, kind: 'physical' },
  ],
};

// ---- Four-slot sets (A7 step 2). Map 1 ซากชายแดน at Lv2. ----
const S = SPECIES;
export const slimePair: EncounterDefinition = { ...veilSiege, id: 'slime-pair', version: 4, level: 2, name: 'สไลม์คู่',
  ...foes(2, [['f1', S.dewSlime], ['b1', S.emberSlime]]) };
export const batSwarm: EncounterDefinition = { ...veilSiege, id: 'bat-swarm', version: 4, level: 2, name: 'ค้างคาวรุม',
  ...foes(2, [['f1', S.dewSlime], ['b1', S.ruinBat], ['b2', S.ruinBat]]) };
export const slimeNest: EncounterDefinition = { ...veilSiege, id: 'slime-nest', version: 4, level: 2, name: 'รังสไลม์',
  ...foes(2, [['f1', S.dewSlime], ['f2', S.dewSlime], ['b1', S.emberSlime], ['b2', S.ruinBat]]) };
export const tuskerBats: EncounterDefinition = { ...veilSiege, id: 'tusker-bats', version: 4, level: 2, name: 'หมูป่ากับค้างคาว',
  ...foes(2, [['f1', S.tusker], ['b1', S.ruinBat]]) };
// Map 2 เส้นทางป่าทึบ at Lv5.
export const beetleSpore: EncounterDefinition = { ...veilSiege, id: 'beetle-spore', version: 4, level: 5, name: 'ด้วงกับสปอร์',
  ...foes(5, [['f1', S.thornBeetle], ['b1', S.sporePuff]]) };
export const beetleWall: EncounterDefinition = { ...veilSiege, id: 'beetle-wall', version: 4, level: 5, name: 'กำแพงด้วง',
  ...foes(5, [['f1', S.thornBeetle], ['f2', S.thornBeetle], ['b1', S.sporePuff]]) };
export const stalkerSpore: EncounterDefinition = { ...veilSiege, id: 'stalker-spore', version: 4, level: 5, name: 'ลิงซ์ซุ่ม',
  ...foes(5, [['f1', S.stalker], ['b1', S.sporePuff]]) };
export const forestSwarm: EncounterDefinition = { ...veilSiege, id: 'forest-swarm', version: 4, level: 5, name: 'ป่าคืนชีพ',
  ...foes(5, [['f1', S.thornBeetle], ['f2', S.thornBeetle], ['b1', S.sporePuff], ['b2', S.sporePuff]]) };
// Map 3 แนวรอยแยก at Lv8.
export const channelerWisps: EncounterDefinition = { ...veilSiege, id: 'channeler-wisps', version: 4, level: 8, name: 'อสูรส่งพลังกับวิญญาณ',
  ...foes(8, [['f1', S.riftChanneler], ['b1', S.riftWisp], ['b2', S.riftWisp]]) };
export const crawlerPack: EncounterDefinition = { ...veilSiege, id: 'crawler-pack', version: 4, level: 8, name: 'ฝูงแมงมุม',
  ...foes(8, [['f1', S.shardCrawler], ['f2', S.shardCrawler], ['b1', S.riftWisp]]) };
export const riftHost: EncounterDefinition = { ...veilSiege, id: 'rift-host', version: 4, level: 8, name: 'ทัพรอยแยก',
  ...foes(8, [['f1', S.riftChanneler], ['f2', S.shardCrawler], ['b1', S.riftWisp]]) };

// P02 (OD-05, draft): five-foe sets that use the appended slots `f3`/`b3` (3 front/2 back and 2 front/3 back). The last
// foe opens on the fifth party slot so the fifth hero is aimed at too; older sets keep their slot 0–3 moves. Their
// reference party is five (the four plus Corin, the Saint, in front).
const fifth = (set: Pick<EncounterDefinition, 'enemies' | 'intents'>): Pick<EncounterDefinition, 'enemies' | 'intents'> => {
  const last = set.enemies.at(-1)!.id; const first = set.intents.findIndex(i => i.sourceId === last);
  return { ...set, intents: set.intents.map((i, n) => n === first ? { ...i, targetSlot: 4 } : i) };
};
// Map 2 at Lv5: a thorn host, three front.
export const thornHost: EncounterDefinition = { ...veilSiege, heroes: fiveHeroes, id: 'thorn-host', version: 1, level: 5, name: 'ทัพหนามป่าลึก',
  ...fifth(foes(5, [['f1', S.thornBeetle], ['f2', S.stalker], ['f3', S.thornBeetle], ['b1', S.sporePuff], ['b2', S.sporePuff]])) };
// Map 3 at Lv8: a rift legion, three back.
export const riftLegion: EncounterDefinition = { ...veilSiege, heroes: fiveHeroes, id: 'rift-legion', version: 1, level: 8, name: 'กองทัพวิญญาณรอยแยก',
  ...fifth(foes(8, [['f1', S.shardCrawler], ['f2', S.shardCrawler], ['b1', S.riftWisp], ['b2', S.riftWisp], ['b3', S.riftWisp]])) };

// P11-04 World Boss (draft): the rift warden's field with a warden that cannot fall inside an attempt's eight rounds, so
// every attempt counts the damage it lands (the warden's own phases still come at 70% / 35% of this copy's HP).
export const worldBossWarden: EncounterDefinition = {
  ...riftWarden, id: 'world-boss-warden', version: 1, name: 'บอสโลก: ผู้คุมรอยแยก',
  enemies: riftWarden.enemies.map(e => e.id === 'f1' ? { ...e, maxHp: WORLD_BOSS_HP } : e),
};

// P11-05 World Boss trio v1 (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §1, draft numbers from the design probe). Each keeps
// the warden's field shape (five heroes, bark rules) and a boss with the World Boss HP that cannot fall inside an attempt's
// eight rounds. Registered in the catalog from step 2 (save v65); offered from `WorldBossTrioRules.from` (week 2969, OD-52).
const boss = (name: string, displayName: string, speed: number, extra: Partial<EncounterDefinition['enemies'][number]> = {}) =>
  ({ id: 'f1' as const, row: 'front' as const, large: true, boss: true, speed, name, displayName, maxHp: WORLD_BOSS_HP, color: 0xd9bf86, art: 'foe_sentinel', ...extra });
const mv = (name: string, slot: number, damage: number, kind: 'physical' | 'energy', more: Partial<IntentDefinition> = {}): IntentDefinition =>
  ({ sourceId: 'f1', targetSlot: slot, name, damage, kind, ...more });

// Kragmor, the Riftborn Titan: armour (veilguard; Mark/acid/dispel open it), a charge before an unstoppable fall on the
// front slot (Guard/taunt/stone/barriers or a Seer delay answer it), a quake on the whole party (healing answers it).
const kragAdds = foes(10, [['f2', SPECIES.shardCrawler], ['b3', SPECIES.riftWisp]]);
export const wbKragmor: EncounterDefinition = {
  ...riftWarden, id: 'wb-kragmor', version: 1, name: 'บอสโลก: คราก์มอร์',
  phases: [{ sourceId: 'f1', below: 70, name: 'Fault Awakening' }],
  enemies: [...kragAdds.enemies, boss('Kragmor', 'คราก์มอร์', 60, { traits: ['veilguard'], art: 'foe_kragmor' })],
  intents: [...kragAdds.intents,
    mv('Stone Fist', 1, 30, 'physical'), mv('Titan Gathering', 0, 0, 'physical', { charge: true }), mv('Mountain Fall', 0, 50, 'physical', { unstoppable: true }),
    mv('Rift Quake', 0, 14, 'physical', { all: true }), mv('Boulder Hurl', 3, 26, 'physical'), mv('Stone Fist', 2, 30, 'physical'),
    // 70%: the charge comes every third turn.
    mv('Titan Gathering', 0, 0, 'physical', { charge: true, phase: 1 }), mv('Mountain Fall', 0, 56, 'physical', { unstoppable: true, phase: 1 }), mv('Rift Quake', 0, 18, 'physical', { all: true, phase: 1 }),
  ],
};

// Valdrakk, the Worldshard Beast: fast (SPD 125), energy gusts and a breakable wing charge (R1): Bash/Sigil that cancels it
// staggers the dive that follows; otherwise the dive strikes the whole party (Ward/Halo/healing answer it).
const valdAdds = foes(10, [['b1', SPECIES.riftWisp], ['b2', SPECIES.riftWisp]]);
export const wbValdrakk: EncounterDefinition = {
  ...riftWarden, id: 'wb-valdrakk', version: 1, name: 'บอสโลก: วัลดรัค',
  phases: [{ sourceId: 'f1', below: 70, name: 'Sky Rend' }],
  enemies: [...valdAdds.enemies, boss('Valdrakk', 'วัลดรัค', 125, { art: 'foe_valdrakk' })],
  intents: [...valdAdds.intents,
    mv('Shard Talon', 1, 26, 'physical'), mv('Wing Gust', 2, 22, 'energy'), mv('Wing Gathering', 0, 0, 'physical', { charge: true, breakable: true }),
    mv('Worldshard Dive', 0, 20, 'energy', { all: true }), mv('Shard Talon', 0, 28, 'physical'), mv('Wing Gust', 3, 22, 'energy'),
    mv('Wing Gathering', 0, 0, 'physical', { charge: true, breakable: true, phase: 1 }), mv('Worldshard Dive', 0, 24, 'energy', { all: true, phase: 1 }),
    mv('Shard Talon', 1, 30, 'physical', { phase: 1 }),
  ],
};

// Morvane, the Severed Monarch: a court of three (two hands in front, a wisp behind; they hit 70% as hard, as the warden's
// wisps do). Each standing court foe raises the monarch's moves by 10% (R2), and every fourth turn it calls the fallen
// court back; area attacks answer it.
const COURT = ['f2', 'f3', 'b2'] as const;
const court = foes(10, [['f2', SPECIES.shardCrawler], ['f3', SPECIES.shardCrawler], ['b2', SPECIES.riftWisp]]);
export const wbMorvane: EncounterDefinition = {
  ...riftWarden, id: 'wb-morvane', version: 1, name: 'บอสโลก: มอร์เวน',
  phases: [{ sourceId: 'f1', below: 70, name: 'Severed Crown' }],
  enemies: [...court.enemies, boss('Morvane', 'มอร์เวน', 80, { court: { percent: 10, by: COURT }, art: 'foe_morvane' })],
  intents: [...court.intents.map(m => ({ ...m, damage: Math.round(m.damage * 0.7) })),
    mv('Six-Hand Rend', 1, 24, 'physical'), mv('Severing Bolt', 3, 22, 'energy'), mv('Call the Court', 0, 0, 'energy', { summon: COURT }),
    mv('Fate Lash', 2, 26, 'energy'), mv('Six-Hand Rend', 0, 28, 'physical'), mv('Shadow Tide', 0, 14, 'energy', { all: true }),
    mv('Severing Bolt', 2, 26, 'energy', { phase: 1 }), mv('Call the Court', 0, 0, 'energy', { summon: COURT, phase: 1 }), mv('Shadow Tide', 0, 18, 'energy', { all: true, phase: 1 }),
  ],
};

// World Bosses (balanced on written slots, P11-05) drop the assassin aims their court kinds carry (enemy aim B, owner 2026-11-19).
function noAims(e: EncounterDefinition): EncounterDefinition {
  return e.intents.some(m => m.aim) ? { ...e, intents: e.intents.map(m => m.aim ? Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'aim')) as typeof m : m) } : e;
}
export const WORLD_BOSS_TRIO: readonly EncounterDefinition[] = [wbKragmor, wbValdrakk, wbMorvane].map(e => noAims(e));

// Enemy aim (owner 2026-11-19 "ทำ D + C + B", docs/design/ENEMY_AIM_PROPOSAL_TH.md): C — front-row foes that are not bosses
// strike the target of the first other standing foe ('pack'); D — a boss aims its third move of every three (per phase)
// at the lowest HP percent ('weakest'; every second move lost guarded fights from 60% HP); B is set on the assassin kinds (`species.ts`). World Bosses keep their written
// slots. An encounter whose moves gain an aim is one version newer, so a battle saved before is refused safely.
const AIM_EXEMPT = new Set(['world-boss-warden', 'wb-kragmor', 'wb-valdrakk', 'wb-morvane']);
function withAims(e: EncounterDefinition): EncounterDefinition {
  if (AIM_EXEMPT.has(e.id)) return noAims(e);
  const seen = new Map<string, number>();
  const intents = e.intents.map(m => {
    const foe = e.enemies.find(f => f.id === m.sourceId); const key = `${m.sourceId}:${m.phase ?? 0}`;
    const i = seen.get(key) ?? 0; seen.set(key, i + 1);
    if (m.aim || !foe || m.all || m.charge || m.special || m.summon) return m;
    if (foe.boss) return i % 3 === 2 ? { ...m, aim: 'weakest' as const } : m;
    return foe.row === 'front' ? { ...m, aim: 'pack' as const } : m;
  });
  return intents.some(m => m.aim) ? { ...e, version: e.version + 1, intents } : e;
}
export const encounters: readonly EncounterDefinition[] = [firstClash, scoutPatrol, riftWhelp, thicketAmbush, shadowStalker, veilSiege, rearAmbush, crystalStampede, riftWarden, eliteTuskChief, eliteBriarLord, miniVeilGolem, vanguardCaptain,
  slimePair, batSwarm, slimeNest, tuskerBats, beetleSpore, beetleWall, stalkerSpore, forestSwarm, channelerWisps, crawlerPack, riftHost, thornHost, riftLegion, worldBossWarden].map(withAims);
// P11-05 step 2: the catalog lookup also knows the World Boss trio (world rules, saves and replays name them). They stay out of
// `encounters` (the rule tests walk it and assert the advisor wins from full HP, which a World Boss never allows by design).
// `presentedEncounters` is what the presentation coverage and the texture-budget audit walk: `encounters` plus every trio boss
// whose moves have body clips (Kragmor with WB-A, step 5; Valdrakk/Morvane join with WB-B/WB-C). They are fought from
// `WorldBossTrioRules.from` (week 2969, OD-52).
export const presentedEncounters: readonly EncounterDefinition[] = [...encounters, wbKragmor, wbValdrakk, wbMorvane];
const lookupList: readonly EncounterDefinition[] = [...encounters, ...WORLD_BOSS_TRIO];
export const encounterById = (id: string): EncounterDefinition | undefined => lookupList.find(e => e.id === id);
