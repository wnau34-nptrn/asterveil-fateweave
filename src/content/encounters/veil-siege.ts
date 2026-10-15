import type { EncounterDefinition } from '../../core/battle/types';
import { heroes } from '../heroes/team';
import { enemies } from '../enemies/veilbound';
export const veilSiege: EncounterDefinition = {
  id: 'veil-siege', version: 9, name: 'ศึกปิดรอยแยก', heroes,
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
    // Spear (2C-2): brace power is the counter damage.
    brace: { name: 'ตั้งทวน', english: 'Brace', icon: '⟋', power: 14, cooldown: 2 },
    pierce: { name: 'แทงทะลวง', english: 'Piercing Thrust', icon: '➹', power: 22, cooldown: 2 },
    // Archer (2C-2): hinder delays the target to the end of next round's queue; volley hits all.
    hinder: { name: 'ยิงสกัด', english: 'Hindering Shot', icon: '⇥', power: 12, cooldown: 2 },
    volley: { name: 'ห่าธนู', english: 'Volley', icon: '⇶', power: 10, cooldown: 3 },
    // Alchemist (2C-2): acid corrodes (every hero hit +corrodeBonus); haste makes an ally act first next round.
    acid: { name: 'ขวดกรด', english: 'Acid Flask', icon: '⚗', power: 8, cooldown: 2 },
    haste: { name: 'ยาเร่ง', english: 'Haste Tonic', icon: '⇡', power: 0, cooldown: 3 },
  },
  rules: { guardReduction: 0.65, markDuration: 2, markedBonus: 22, corrodeDuration: 2, corrodeBonus: 6 },
};
