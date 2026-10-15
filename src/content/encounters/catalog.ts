import type { EncounterDefinition } from '../../core/battle/types';
import { veilSiege } from './veil-siege';

// Every encounter reuses the four-hero party, skills and numeric rules.
// Enemy ids stay `raider`/`brute`: they select the two illustrated enemy frames.
export const rearAmbush: EncounterDefinition = {
  ...veilSiege, id: 'rear-ambush', version: 6, name: 'ศึกเงาล่าแนวหลัง',
  enemies: [
    { id: 'raider', speed: 110, name: 'Shadow Hunter', displayName: 'ผู้ล่าเงา', maxHp: 90, color: 0xee80bd },
    { id: 'brute', speed: 70, name: 'Rift Channeler', displayName: 'อสูรส่งพลัง', maxHp: 180, color: 0x9785f2 },
  ],
  intents: [
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 3, name: 'Shadow Knife', damage: 24, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 3, name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 23, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 27, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 2, name: 'Shadow Knife', damage: 23, kind: 'energy' },
  ],
};

export const riftWarden: EncounterDefinition = {
  ...veilSiege, id: 'rift-warden', version: 6, name: 'ศึกผู้คุมรอยแยก',
  enemies: [{ id: 'brute', speed: 70, name: 'Rift Warden', displayName: 'ผู้คุมรอยแยก', maxHp: 350, color: 0x9785f2 }],
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
  ...veilSiege, id: 'first-clash', version: 4, name: 'การปะทะครั้งแรก',
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
  ...veilSiege, id: 'scout-patrol', version: 4, name: 'หน่วยลาดตระเวน',
  enemies: [{ id: 'raider', speed: 110, name: 'Veil Patrol', displayName: 'หน่วยลาดตระเวน', maxHp: 64, color: 0xee80bd }],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 11, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 3, name: 'Shadow Knife', damage: 12, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 0, name: 'Raking Slash', damage: 11, kind: 'physical' },
  ],
};

export const riftWhelp: EncounterDefinition = {
  ...veilSiege, id: 'rift-whelp', version: 4, name: 'ลูกอสูรรอยแยก',
  enemies: [{ id: 'brute', speed: 70, name: 'Rift Whelp', displayName: 'ลูกอสูรรอยแยก', maxHp: 120, color: 0x9785f2 }],
  intents: [
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 18, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 0, name: 'Crushing Blow', damage: 16, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 3, name: 'Rift Bolt', damage: 18, kind: 'energy' },
  ],
};

export const thicketAmbush: EncounterDefinition = {
  ...veilSiege, id: 'thicket-ambush', version: 4, name: 'ซุ่มโจมตีในพงหนาม',
  enemies: [
    { id: 'raider', speed: 110, name: 'Thicket Lurker', displayName: 'ผู้ซุ่มพงหนาม', maxHp: 66, color: 0xee80bd },
    { id: 'brute', speed: 70, name: 'Thorn Brute', displayName: 'อสูรพงหนาม', maxHp: 140, color: 0x9785f2 },
  ],
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 3, name: 'Rift Bolt', damage: 20, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 2, name: 'Shadow Knife', damage: 14, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 1, name: 'Crushing Blow', damage: 20, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 0, name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 22, kind: 'energy' },
  ],
};

export const shadowStalker: EncounterDefinition = {
  ...veilSiege, id: 'shadow-stalker', version: 4, name: 'เงาตามล่า',
  enemies: [{ id: 'raider', speed: 110, name: 'Shadow Stalker', displayName: 'เงาตามล่า', maxHp: 96, color: 0xee80bd }],
  intents: [
    { sourceId: 'raider', targetSlot: 3, name: 'Shadow Knife', damage: 18, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 16, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 2, name: 'Shadow Knife', damage: 18, kind: 'energy' },
  ],
};

export const encounters: readonly EncounterDefinition[] = [firstClash, scoutPatrol, riftWhelp, thicketAmbush, shadowStalker, veilSiege, rearAmbush, riftWarden];
export const encounterById = (id: string): EncounterDefinition | undefined => encounters.find(e => e.id === id);
