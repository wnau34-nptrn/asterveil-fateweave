import type { EncounterDefinition } from '../../core/battle/types';
import { heroes } from '../heroes/team';
import { enemies } from '../enemies/veilbound';
export const veilSiege: EncounterDefinition = {
  id: 'veil-siege', version: 4, name: 'Veil Siege', heroes,
  enemies,
  intents: [
    { sourceId: 'raider', targetId: 'tracer', name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 28, kind: 'energy' },
    { sourceId: 'raider', targetId: 'guardian', name: 'Raking Slash', damage: 12, kind: 'physical' },
    { sourceId: 'brute', targetId: 'tracer', name: 'Crushing Blow', damage: 26, kind: 'physical' },
    { sourceId: 'raider', targetId: 'healer', name: 'Shadow Knife', damage: 14, kind: 'energy' },
    { sourceId: 'brute', targetId: 'weaver', name: 'Rift Bolt', damage: 28, kind: 'energy' },
  ],
  skills: {
    attack: { name: 'โจมตี', english: 'Attack', icon: '⚔', power: 0, cooldown: 0 },
    guard: { name: 'ตั้งรับแทน', english: 'Guard', icon: '♜', power: 0, cooldown: 0 },
    bash: { name: 'กระแทกโล่', english: 'Shield Bash', icon: '✹', power: 18, cooldown: 3 },
    mark: { name: 'ติดตรา', english: 'Mark', icon: '◇', power: 0, cooldown: 0 },
    execute: { name: 'ฟันเจาะจุด', english: 'Precision Strike', icon: '➶', power: 28, cooldown: 3 },
    bolt: { name: 'ศรเวท', english: 'Arcane Bolt', icon: '✧', power: 26, cooldown: 3 },
    ward: { name: 'โล่เวท', english: 'Ward', icon: '⬡', power: 14, cooldown: 3 },
    heal: { name: 'รักษา', english: 'Heal', icon: '✚', power: 20, cooldown: 3 },
    prayer: { name: 'พรฟื้นฟู', english: 'Prayer', icon: '❋', power: 10, cooldown: 4 },
  },
  rules: { guardReduction: 0.65, markDuration: 5, markedBonus: 22 },
};
