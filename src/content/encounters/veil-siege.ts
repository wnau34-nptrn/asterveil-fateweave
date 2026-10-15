import type { EncounterDefinition } from '../../core/battle/types';
import { heroes } from '../heroes/team';
import { enemies } from '../enemies/veilbound';
export const veilSiege: EncounterDefinition = {
  id: 'veil-siege', version: 6, name: 'ศึกปิดรอยแยก', heroes,
  enemies,
  intents: [
    { sourceId: 'raider', targetSlot: 1, name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 28, kind: 'energy' },
    { sourceId: 'raider', targetSlot: 0, name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetSlot: 1, name: 'Crushing Blow', damage: 26, kind: 'physical' },
    { sourceId: 'raider', targetSlot: 3, name: 'Shadow Knife', damage: 14, kind: 'energy' },
    { sourceId: 'brute', targetSlot: 2, name: 'Rift Bolt', damage: 28, kind: 'energy' },
  ],
  skills: {
    attack: { name: 'โจมตี', english: 'Attack', icon: '⚔', power: 0, cooldown: 0 },
    guard: { name: 'ตั้งรับแทน', english: 'Guard', icon: '♜', power: 0, cooldown: 0 },
    bash: { name: 'กระแทกโล่', english: 'Shield Bash', icon: '✹', power: 18, cooldown: 2 },
    mark: { name: 'ติดตรา', english: 'Mark', icon: '◇', power: 0, cooldown: 0 },
    execute: { name: 'ฟันเจาะจุด', english: 'Precision Strike', icon: '➶', power: 28, cooldown: 2 },
    bolt: { name: 'ศรเวท', english: 'Arcane Bolt', icon: '✧', power: 26, cooldown: 2 },
    ward: { name: 'โล่เวท', english: 'Ward', icon: '⬡', power: 14, cooldown: 2 },
    heal: { name: 'รักษา', english: 'Heal', icon: '✚', power: 20, cooldown: 2 },
    prayer: { name: 'พรฟื้นฟู', english: 'Prayer', icon: '❋', power: 10, cooldown: 3 },
  },
  rules: { guardReduction: 0.65, markDuration: 2, markedBonus: 22 },
};
