import type { EncounterDefinition } from '../../core/battle/types';
import { veilSiege } from './veil-siege';

// Every encounter reuses the four-hero party, skills and numeric rules.
// Enemy ids are the two field positions: `raider` (back, normal size) and `brute` (front, large).
// `art` picks the illustrated Veil Frontier foe (ART-CHAR-MERC-ENEMY-001); without it the
// original Raider/Brute frames are shown. Physical foes use physical moves, energy foes energy moves.
export const rearAmbush: EncounterDefinition = {
  ...veilSiege, id: 'rear-ambush', version: 11, name: 'ศึกเงาล่าแนวหลัง',
  enemies: [
    { id: 'raider', speed: 110, name: 'Rift Weaver', displayName: 'ผู้ทอรอยแยก', maxHp: 90, color: 0x5b63c9, art: 'foe_riftweaver' },
    { id: 'brute', speed: 70, name: 'Rift Channeler', displayName: 'อสูรส่งพลัง', maxHp: 180, color: 0x9785f2 },
  ],
  intents: [
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 3, name: 'Rune Lash', damage: 24, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 3, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    // Its rune ribbons bind one front-liner: the single physical move, so Shield Bash can stop it.
    { sourceId: 'raider', targetSlot: 1, name: 'Ribbon Snare', damage: 23, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 27, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 2, name: 'Rune Lash', damage: 23, kind: 'energy' },
  ],
};

export const riftWarden: EncounterDefinition = {
  ...veilSiege, id: 'rift-warden', version: 11, name: 'ศึกผู้คุมรอยแยก',
  // The Veilbound Sentinel, an ancient gate guardian cracked by the rift (mini boss art: gold and violet).
  enemies: [{ id: 'brute', speed: 70, name: 'Rift Warden', displayName: 'ผู้คุมรอยแยก', maxHp: 350, color: 0xd9bf86, art: 'foe_sentinel' }],
  intents: [
    { sourceId: 'brute', targetSlot: 1, name: 'Crushing Blow', damage: 29, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 25, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 0, name: 'Crushing Blow', damage: 33, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 3, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 1, name: 'Raking Slash', damage: 21, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 29, kind: 'energy' },
  ],
};

// One-time teaching battle. Each scheduled move gives one class skill a reason to exist:
// R1 Mark → physical hit on Lyra → Ward/Guard the energy blast → Heal; R2 consume Mark → Bash the physical.
export const firstClash: EncounterDefinition = {
  ...veilSiege, id: 'first-clash', version: 9, name: 'การปะทะครั้งแรก',
  enemies: [
    { id: 'raider', speed: 110, name: 'Veil Scout', displayName: 'หน่วยสอดแนมเวล', maxHp: 56, color: 0xee80bd },
    { id: 'brute', speed: 70, name: 'Young Brute', displayName: 'อสูรหนุ่ม', maxHp: 100, color: 0x9785f2 },
  ],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 10, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 16, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 0, name: 'Raking Slash', damage: 10, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 1, name: 'Crushing Blow', damage: 14, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 3, name: 'Shadow Knife', damage: 12, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 16, kind: 'energy' },
  ],
};

export const scoutPatrol: EncounterDefinition = {
  ...veilSiege, id: 'scout-patrol', version: 9, name: 'ภูตเมล็ดลม',
  enemies: [{ id: 'raider', speed: 110, name: 'Dandelion Sprite', displayName: 'ภูตแดนดิไลออน', maxHp: 64, color: 0xa6dfce, art: 'foe_sprite' }],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Seed Spark', damage: 11, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 3, name: 'Seed Spark', damage: 12, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 0, name: 'Seed Spark', damage: 11, kind: 'energy' },
  ],
};

export const riftWhelp: EncounterDefinition = {
  ...veilSiege, id: 'rift-whelp', version: 9, name: 'หมูป่าหลังตะไคร่',
  enemies: [{ id: 'brute', speed: 70, name: 'Mossback Tusker', displayName: 'หมูป่าหลังตะไคร่', maxHp: 120, color: 0x718746, art: 'foe_tusker' }],
  intents: [
    { sourceId: 'brute', targetSlot: 1, name: 'Tusk Charge', damage: 18, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 0, name: 'Tusk Charge', damage: 16, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 1, name: 'Tusk Charge', damage: 18, kind: 'physical' },
  ],
};

export const thicketAmbush: EncounterDefinition = {
  ...veilSiege, id: 'thicket-ambush', version: 9, name: 'ราชินีแห่งพงหนาม',
  // Elite art (gold crown): the Thorn Matriarch fights with briars (physical) and blooms (energy).
  enemies: [
    { id: 'raider', speed: 110, name: 'Hollow Mycon', displayName: 'เห็ดหมอผีกลวง', maxHp: 66, color: 0x427f87, art: 'foe_mycon' },
    { id: 'brute', speed: 70, name: 'Thorn Matriarch', displayName: 'ราชินีหนาม', maxHp: 140, color: 0x397e77, art: 'foe_matriarch' },
  ],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Spore Hex', damage: 12, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 3, name: 'Thorn Bloom', damage: 20, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 2, name: 'Spore Hex', damage: 14, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 1, name: 'Briar Lash', damage: 20, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 0, name: 'Spore Hex', damage: 12, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 2, name: 'Thorn Bloom', damage: 22, kind: 'energy' },
  ],
};

export const shadowStalker: EncounterDefinition = {
  ...veilSiege, id: 'shadow-stalker', version: 9, name: 'ลิงซ์หนามพราง',
  enemies: [{ id: 'raider', speed: 110, name: 'Briar Stalker', displayName: 'ลิงซ์หนามพราง', maxHp: 96, color: 0x397e77, art: 'foe_stalker' }],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Thorn Pounce', damage: 18, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 0, name: 'Thorn Pounce', damage: 16, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 1, name: 'Thorn Pounce', damage: 18, kind: 'physical' },
  ],
};

// Rift Scar: a Shard Golem (normal) with a Crystal Juggernaut (elite art: gold banding), both mostly physical.
export const crystalStampede: EncounterDefinition = {
  ...veilSiege, id: 'crystal-stampede', version: 4, name: 'ฝูงผลึกบุกตะลุย',
  enemies: [
    { id: 'raider', speed: 75, name: 'Shard Golem', displayName: 'โกเลมเศษผลึก', maxHp: 100, color: 0x9454d6, art: 'foe_golem' },
    { id: 'brute', speed: 60, name: 'Crystal Juggernaut', displayName: 'ด้วงเกราะผลึก', maxHp: 180, color: 0x9454d6, art: 'foe_juggernaut' },
  ],
  intents: [
    { sourceId: 'raider', targetSlot: 0, name: 'Crystal Fist', damage: 16, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 1, name: 'Horn Charge', damage: 24, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 1, name: 'Crystal Fist', damage: 18, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Shard Burst', damage: 22, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 0, name: 'Crystal Fist', damage: 16, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 0, name: 'Horn Charge', damage: 26, kind: 'physical' },
  ],
};

export const encounters: readonly EncounterDefinition[] = [firstClash, scoutPatrol, riftWhelp, thicketAmbush, shadowStalker, veilSiege, rearAmbush, crystalStampede, riftWarden];
export const encounterById = (id: string): EncounterDefinition | undefined => encounters.find(e => e.id === id);
