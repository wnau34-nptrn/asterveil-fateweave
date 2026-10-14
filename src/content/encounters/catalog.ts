import type { EncounterDefinition } from '../../core/battle/types';
import { veilSiege } from './veil-siege';

export const rearAmbush: EncounterDefinition = {
  ...veilSiege, id: 'rear-ambush', version: 3, name: 'ศึกเงาล่าแนวหลัง',
  enemies: [
    { id: 'raider', speed: 110, name: 'Shadow Hunter', displayName: 'ผู้ล่าเงา', maxHp: 90, color: 0xee80bd },
    { id: 'brute', speed: 70, name: 'Rift Channeler', displayName: 'อสูรส่งพลัง', maxHp: 180, color: 0x9785f2 },
  ],
  intents: [
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'raider', targetId: 'healer', name: 'Shadow Knife', damage: 24, kind: 'energy' },
    { sourceId: 'brute', targetId: 'healer', name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'raider', targetId: 'tracer', name: 'Raking Slash', damage: 23, kind: 'physical' },
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 27, kind: 'energy' },
    { sourceId: 'raider', targetId: 'weaver', name: 'Shadow Knife', damage: 23, kind: 'energy' },
  ],
};

export const riftWarden: EncounterDefinition = {
  ...veilSiege, id: 'rift-warden', version: 3, name: 'ศึกผู้คุมรอยแยก',
  enemies: [{ id: 'brute', speed: 70, name: 'Rift Warden', displayName: 'ผู้คุมรอยแยก', maxHp: 350, color: 0x9785f2 }],
  intents: [
    { sourceId: 'brute', targetId: 'tracer', name: 'Crushing Blow', damage: 29, kind: 'physical' },
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 25, kind: 'energy' },
    { sourceId: 'brute', targetId: 'guardian', name: 'Crushing Blow', damage: 33, kind: 'physical' },
    { sourceId: 'brute', targetId: 'healer', name: 'Rift Bolt', damage: 23, kind: 'energy' },
    { sourceId: 'brute', targetId: 'tracer', name: 'Raking Slash', damage: 21, kind: 'physical' },
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 29, kind: 'energy' },
  ],
};

export interface BattleChoice { data: EncounterDefinition; title: string; description: string }
export const battles: readonly BattleChoice[] = [
  { data: veilSiege, title: 'ศึกปิดรอยแยก', description: 'ฝึกอ่านแผนศัตรู ตั้งรับ และติดตราเพื่อทำคอมโบ' },
  { data: rearAmbush, title: rearAmbush.name, description: 'พลังงานถึงแนวหลัง · ใช้โล่เวทและรักษาให้ทัน หรือกำจัดผู้โจมตี' },
  { data: riftWarden, title: riftWarden.name, description: 'บอสสลับกายภาพกับพลังงาน · เลือกจังหวะขัดการโจมตี ตั้งรับ และทำคอมโบ' },
];
