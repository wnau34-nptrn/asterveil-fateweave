import type { EncounterDefinition } from '../../core/battle/types';
import { heroes } from '../heroes/team';
import { enemies } from '../enemies/veilbound';
export const veilSiege: EncounterDefinition = {
  id: 'veil-siege', version: 13, name: 'ศึกปิดรอยแยก', heroes,
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
    // Scout (2C-2): ambush hits harder before the target acts this round; shadow step dodges the next hit.
    ambush: { name: 'จู่โจมก่อน', english: 'Ambush', icon: '⚔', power: 12, cooldown: 2 },
    evade: { name: 'ก้าวเงา', english: 'Shadow Step', icon: '↯', power: 0, cooldown: 3 },
    // Hammer warden (2C-2): taunt pulls every enemy move onto him (reduced) until his next turn; slam is plain damage.
    taunt: { name: 'ยั่วยุ', english: 'Challenge', icon: '⛨', power: 0, cooldown: 3 },
    slam: { name: 'ทุบค้อนรูน', english: 'Rune Slam', icon: '⚒', power: 18, cooldown: 2 },
    // Bard (2C-2): one song plays until switched or the bard falls. Valor adds power to every hero hit;
    // mending heals every standing ally by its power as each new round begins.
    valor: { name: 'เพลงกล้า', english: 'Song of Valor', icon: '♪', power: 4, cooldown: 2 },
    mend: { name: 'เพลงฟื้น', english: 'Song of Mending', icon: '♫', power: 5, cooldown: 2 },
    // ★3 skills (draft numbers; docs/EXPEDITION_DESIGN.md "Star unlocks").
    rally: { name: 'ตั้งรับหมู่', english: 'Rally Guard', icon: '♜', power: 0, cooldown: 3 },
    finisher: { name: 'ปลิดชีพ', english: 'Finishing Lunge', icon: '➶', power: 16, cooldown: 2 },
    sigil: { name: 'ตรึงเวท', english: 'Sigil Bind', icon: '✧', power: 8, cooldown: 3 },
    sanctuary: { name: 'พรคุ้มภัย', english: 'Sanctuary', icon: '✚', power: 0, cooldown: 3 },
    spearwall: { name: 'กำแพงทวน', english: 'Spear Wall', icon: '⟋', power: 8, cooldown: 3 },
    weakshot: { name: 'ศรจุดอ่อน', english: 'Weak-point Shot', icon: '➶', power: 16, cooldown: 2 },
    bomb: { name: 'ขวดระเบิด', english: 'Blast Flask', icon: '⚗', power: 10, cooldown: 3 },
    backstab: { name: 'ลอบแทง', english: 'Backstab', icon: '↯', power: 20, cooldown: 2 },
    quake: { name: 'ทุบปฐพี', english: 'Earthshaker', icon: '⚒', power: 14, cooldown: 2 },
    finale: { name: 'บทสุดท้าย', english: 'Finale', icon: '♪', power: 16, cooldown: 3 },
  },
  rules: { guardReduction: 0.65, markDuration: 2, markedBonus: 22, corrodeDuration: 2, corrodeBonus: 6, ambushBonus: 12, tauntReduction: 0.35,
    rallyReduction: 0.35, finisherThreshold: 0.4, echoBonus: 0.5, afterglowCap: 8, heavyCounter: 0.5,
    weakshotBonus: 12, quakeBonus: 10, shadowCounter: 8, stoneskinReduction: 0.5, resound: 0.5, finaleHeal: 12 },
};
