import type { EncounterDefinition } from '../../core/battle/types';
import { veilSiege } from './veil-siege';
import { SPECIES, foes } from '../enemies/species';

// Every encounter reuses the four-hero party, skills and numeric rules.
// Bosses (`boss`) are steadfast: a cancelled turn shields their next round from Bash/Sigil; their signature move
// (`unstoppable`) can never be cancelled (owner 2026-10-22).
// Enemy ids are the four field slots `f1`/`f2` (front row) and `b1`/`b2` (back row); front-row foes screen the back
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

// Boss phases (owner 2026-10-22): at 70% the warden calls two rift wisps from the back row (hard mode: also a shard
// crawler beside it); at 35% it charges, then strikes with a cataclysm and rift waves that hit the whole party.
const wardenWisps = foes(10, [['b1', SPECIES.riftWisp, { reserve: true }], ['b2', SPECIES.riftWisp, { reserve: true }], ['f2', SPECIES.shardCrawler, { reserve: true }]]);
export const riftWarden: EncounterDefinition = {
  ...veilSiege, id: 'rift-warden', version: 19, level: 10, name: 'ศึกผู้คุมรอยแยก',
  phases: [{ sourceId: 'f1', below: 70, summon: ['b1', 'b2'], hardSummon: ['f2'], name: 'Call the Rift' }, { sourceId: 'f1', below: 35, name: 'Rift Awakening' }],
  // The Veilbound Sentinel, an ancient gate guardian cracked by the rift (mini boss art: gold and violet).
  enemies: [...wardenWisps.enemies, { id: 'f1', row: 'front', large: true, boss: true, speed: 70, name: 'Rift Warden', displayName: 'ผู้คุมรอยแยก', maxHp: 350, color: 0xd9bf86, art: 'foe_sentinel' }],
  intents: [...wardenWisps.intents,
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
// A spore puff drifts behind the chief.
const chiefSprite = foes(5, [['b2', SPECIES.sporePuff]]);
export const eliteTuskChief: EncounterDefinition = {
  ...veilSiege, id: 'elite-tusk-chief', version: 7, level: 5, name: 'จ่าฝูงแห่งทุ่ง',
  enemies: [...chiefSprite.enemies,
    { id: 'b1', row: 'back', speed: 110, name: 'Dandelion Sprite', displayName: 'ภูตแดนดิไลออน', maxHp: 70, color: 0xa6dfce, art: 'foe_sprite' },
    { id: 'f1', row: 'front', large: true, speed: 70, name: 'Tusker Chief', displayName: 'จ่าฝูงหมูป่าหลังตะไคร่', maxHp: 190, color: 0x718746, art: 'foe_tusker' },
  ],
  intents: [...chiefSprite.intents,
    { sourceId: 'b1', targetSlot: 2, name: 'Seed Spark', damage: 13, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 20, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Seed Spark', damage: 14, kind: 'energy' },
    // Signature: the chief's stampede, the round's heaviest physical hit (Shield Bash can stop it).
    { sourceId: 'f1', targetSlot: 0, name: 'Stampede', damage: 26, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 2, name: 'Seed Spark', damage: 13, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 1, name: 'Tusk Charge', damage: 20, kind: 'physical' },
  ],
};
// Boss phase (owner 2026-10-22): at 50% the lord rages, gathers thorns, then lashes the whole party with a thorn
// tempest (hard mode: a second spore puff joins).
const lordSpore = foes(8, [['b1', SPECIES.sporePuff], ['b2', SPECIES.sporePuff, { reserve: true }]]);
export const eliteBriarLord: EncounterDefinition = {
  ...veilSiege, id: 'elite-briar-lord', version: 9, level: 8, name: 'เจ้าป่าหนาม',
  phases: [{ sourceId: 'f1', below: 50, hardSummon: ['b2'], name: 'Thorn Rage' }],
  enemies: [...lordSpore.enemies,
    { id: 'f2', row: 'front', speed: 110, name: 'Briar Stalker', displayName: 'ลิงซ์หนามพราง', maxHp: 100, color: 0x397e77, art: 'foe_stalker' },
    { id: 'f1', row: 'front', large: true, speed: 70, boss: true, name: 'Briar Lord', displayName: 'เจ้าป่าหนาม', maxHp: 200, color: 0x397e77, art: 'foe_matriarch' },
  ],
  intents: [...lordSpore.intents,
    { sourceId: 'f2', targetSlot: 1, name: 'Thorn Pounce', damage: 19, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 3, name: 'Thorn Bloom', damage: 22, kind: 'energy' },
    { sourceId: 'f2', targetSlot: 0, name: 'Thorn Pounce', damage: 18, kind: 'physical' },
    // Signature: a storm of thorns at the back line (energy: Sigil Bind or a Ward answer it).
    { sourceId: 'f1', targetSlot: 2, name: 'Thorn Storm', damage: 27, kind: 'energy', unstoppable: true },
    { sourceId: 'f2', targetSlot: 1, name: 'Thorn Pounce', damage: 19, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 1, name: 'Briar Lash', damage: 22, kind: 'physical' },
    { sourceId: 'f1', targetSlot: 0, name: 'Gather Thorns', damage: 0, kind: 'energy', charge: true, phase: 1 },
    { sourceId: 'f1', targetSlot: 0, name: 'Thorn Tempest', damage: 13, kind: 'energy', all: true, unstoppable: true, phase: 1 },
    { sourceId: 'f1', targetSlot: 1, name: 'Briar Lash', damage: 24, kind: 'physical', phase: 1 },
  ],
};

// Mini-boss (3B): a stone golem guarding the scar's side pocket with a rift weaver. Optional, but beating it is one of
// the rift seal's three objectives. Physical golem, energy weaver.
export const miniVeilGolem: EncounterDefinition = {
  ...veilSiege, id: 'mini-veil-golem', version: 9, level: 9, name: 'ยักษ์หินแห่งรอยแผล',
  enemies: [
    { id: 'b1', row: 'back', speed: 105, name: 'Rift Weaver', displayName: 'ผู้ถักรอยแยก', maxHp: 80, color: 0x8a6cc7, art: 'foe_riftweaver' },
    { id: 'f1', row: 'front', large: true, speed: 65, boss: true, name: 'Veil Golem', displayName: 'ยักษ์หินรอยแยก', maxHp: 200, color: 0x7d8a96, art: 'foe_golem' },
  ],
  intents: [
    { sourceId: 'b1', targetSlot: 2, name: 'Rift Needle', damage: 18, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Stone Fist', damage: 22, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 3, name: 'Rift Needle', damage: 18, kind: 'energy' },
    // Signature: a quake that lands on the front line hardest (physical: Guard or Bash answer it).
    { sourceId: 'f1', targetSlot: 1, name: 'Veil Quake', damage: 30, kind: 'physical' },
    { sourceId: 'b1', targetSlot: 2, name: 'Rift Needle', damage: 19, kind: 'energy' },
    { sourceId: 'f1', targetSlot: 0, name: 'Stone Fist', damage: 22, kind: 'physical' },
  ],
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

export const encounters: readonly EncounterDefinition[] = [firstClash, scoutPatrol, riftWhelp, thicketAmbush, shadowStalker, veilSiege, rearAmbush, crystalStampede, riftWarden, eliteTuskChief, eliteBriarLord, miniVeilGolem, vanguardCaptain,
  slimePair, batSwarm, slimeNest, tuskerBats, beetleSpore, beetleWall, stalkerSpore, forestSwarm, channelerWisps, crawlerPack, riftHost];
export const encounterById = (id: string): EncounterDefinition | undefined => encounters.find(e => e.id === id);
