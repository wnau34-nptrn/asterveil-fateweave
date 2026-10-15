import type { ActionId, BattleEvent, BattleState, EncounterDefinition, Intent } from '../core/battle/types';
import type { ResourceId, Resources } from '../core/world/types';
import { skillPower } from '../core/battle/engine';
export const thaiFont = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
export const heroText: Record<string, { name: string; role: string; help: string; icon: string }> = {
  guardian: { name: 'เอกิส', role: 'อัศวิน', help: 'รับแทนเพื่อนและหยุดการโจมตี', icon: '♜' },
  garran: { name: 'การ์แรน', role: 'ทหารหอก', help: 'ตั้งทวนแทงสวนการโจมตีกายภาพ', icon: '⟋' },
  mira: { name: 'มิร่า', role: 'นักธนู', help: 'ยิงสกัดให้ศัตรูไปลงมือท้ายสุด', icon: '➶' },
  toma: { name: 'โทมะ', role: 'นักเล่นแร่', help: 'กรดกัดกร่อนและยาเร่งให้เพื่อนลงมือก่อน', icon: '⚗' },
  tracer: { name: 'ไลรา', role: 'นักดาบ', help: 'ติดตราแล้วฟันเจาะจุด', icon: '➶' },
  weaver: { name: 'ไอรา', role: 'จอมเวท', help: 'ศรเวทและโล่ป้องกัน', icon: '✧' },
  healer: { name: 'เซเรน', role: 'นักบวช', help: 'รักษาคนเดียวหรือฟื้นฟูทั้งทีม', icon: '✚' },
};
const names: Record<string, string> = { toma: 'โทมะ', mira: 'มิร่า', garran: 'การ์แรน', guardian: 'เอกิส', tracer: 'ไลรา', weaver: 'ไอรา', healer: 'เซเรน', raider: 'นักจู่โจม', brute: 'อสูรรอยแยก', party: 'ทั้งทีม' };
export function actorName(id: string | undefined, data: EncounterDefinition): string {
  return id ? data.enemies.find(e => e.id === id)?.displayName ?? names[id] ?? data.heroes.find(h => h.id === id)?.name ?? data.enemies.find(e => e.id === id)?.name ?? 'เป้าหมาย' : 'ทีม';
}
export function intentName(intent: Intent): string {
  return ({ 'Raking Slash': 'ฟันกวาด', 'Rift Bolt': 'ลำแสงรอยแยก', 'Crushing Blow': 'ทุบหนัก', 'Shadow Knife': 'มีดเงา' } as Record<string, string>)[intent.name] ?? intent.name;
}
export function skillDescription(action: ActionId, heroId: string, data: EncounterDefinition): string {
  const skill = { ...data.skills[action], power: skillPower(data, heroId, action) };
  const hero = data.heroes.find(h => h.id === heroId)!;
  const cooldown = skill.cooldown ? ` ใช้แล้วพร้อมอีกครั้งใน ${skill.cooldown} รอบ` : '';
  const text: Record<ActionId, string> = {
    attack: `โจมตีศัตรู ${hero.attack}${hero.empoweredByStatuses ? ` หรือ ${hero.attack + data.rules.markedBonus} เมื่อเป้าหมายติดตรา (ใช้ตราหมด)` : ''} กำจัดผู้โจมตีได้ก็หยุดการโจมตีของมัน`,
    guard: `เอกิสรับการโจมตีแทนคนที่ศัตรูเล็ง ลดความเสียหาย ${data.rules.guardReduction * 100}% ปัดความเสียหายที่เหลือขึ้น แล้วใช้โล่ก่อนเลือด ป้องกันการโจมตีศัตรูถัดไปที่แสดงไว้ หมดเมื่อรับการโจมตีหรือถึงเทิร์นเอกิสอีกครั้ง`,
    bash: `โจมตี ${skill.power} และหยุดเทิร์นถัดไปของเป้าหมายหากการโจมตีนั้นเป็นกายภาพ พลังงานยังโจมตีต่อได้`,
    mark: `ยังไม่ทำความเสียหาย ติดตรา ${data.rules.markDuration} รอบรวมรอบนี้ เพื่อให้ไลราโจมตีหรือฟันเจาะจุดแรงขึ้น ${data.rules.markedBonus} (ใช้ตราหมดเมื่อโจมตี)`,
    execute: `ฟันเจาะจุด ${skill.power} หรือ ${skill.power + data.rules.markedBonus} เมื่อเป้าหมายติดตรา ใช้ตราหมด`,
    bolt: `ยิงศรเวทสร้างความเสียหาย ${skill.power} ให้ศัตรูหนึ่งตัว`,
    ward: `ให้โล่ ${skill.power} แก่เพื่อนที่ยังยืนอยู่ 1 คน โล่รับความเสียหายก่อนเลือด ไม่ซ้อนกัน อยู่จนถูกใช้หมด`,
    heal: `ฟื้นเลือด ${skill.power} ให้เพื่อนที่ยังยืนอยู่ 1 คน ไม่เกินเลือดสูงสุด`,
    prayer: `ฟื้นเลือดคนละ ${skill.power} ให้ทุกคนที่ยังยืนอยู่ ไม่เกินเลือดสูงสุด ไม่ชุบชีวิต`,
    brace: `ตั้งทวนรอ เมื่อศัตรูโจมตีกายภาพใส่เพื่อนแนวหน้าคนใดก็ได้ (รวมตัวเอง) ครั้งแรก จะแทงสวนกลับ ${skill.power} หลังโดนตี อยู่จนสวนแล้วหรือถึงเทิร์นของตัวเองอีกครั้ง พลังงานไม่ทำให้สวน`,
    pierce: `แทงทะลวงสร้างความเสียหาย ${skill.power} ให้ศัตรูหนึ่งตัว`,
    hinder: `ยิงสกัด ${skill.power} และเป้าหมายจะไปลงมือท้ายสุดในรอบถัดไป (ลำดับรอบนี้ไม่เปลี่ยน) ใช้ขวางศัตรูที่เร็วก่อนที่มันจะได้ตีก่อนทีม`,
    volley: `ยิงห่าธนูใส่ศัตรูทุกตัว ตัวละ ${skill.power}`,
    acid: `ปาขวดกรด ${skill.power} แล้วเป้าหมายถูกกัดกร่อน ${data.rules.corrodeDuration} รอบรวมรอบนี้ ทุกการโจมตีของทีมใส่ตัวนี้แรงขึ้น +${data.rules.corrodeBonus}`,
    haste: `ให้ยาเร่งเพื่อนที่ยังยืนอยู่ 1 คน (รวมตัวเอง) รอบถัดไปคนนั้นได้ลงมือก่อนทุกคน รอบนี้ลำดับไม่เปลี่ยน`,
  };
  return text[action] + cooldown;
}
export function reasonThai(reason: string): string {
  if (!reason) return '';
  if (reason.startsWith('Cooldown: ')) return `คูลดาวน์ · พร้อมใน ${reason.slice(10)} รอบ`;
  return ({
    'The encounter has ended.': 'การต่อสู้จบแล้ว',
    'This hero is down.': 'ฮีโร่คนนี้ล้มแล้ว',
    'It is not this hero’s turn.': 'ยังไม่ถึงเทิร์นฮีโร่คนนี้',
    'This hero does not have this action.': 'อาชีพนี้ไม่มีสกิลนี้',
    'This enemy is down.': 'ศัตรูตัวนี้ถูกกำจัดแล้ว',
    'Guard must protect the announced target.': 'ศัตรูไม่ได้เล็งคนนี้',
    'This ally is at full health.': 'เลือดเต็มแล้ว',
    'The living party is at full health.': 'ทีมที่ยังยืนอยู่มีเลือดเต็มแล้ว',
    'This ally already has this barrier.': 'มีโล่เวทเต็มแล้ว',
    'Invalid target.': 'เลือกเป้าหมายใหม่',
    'Already braced.': 'ตั้งทวนอยู่แล้ว',
    'Already hasted.': 'ได้ยาเร่งสำหรับรอบหน้าแล้ว',
    'The preview is stale. Select an action again.': 'จังหวะเปลี่ยนแล้ว กรุณาเลือกใหม่',
  } as Record<string, string>)[reason] ?? 'คำสั่งนี้ยังใช้ไม่ได้ กรุณาเลือกใหม่';
}
export function eventThai(event: BattleEvent, after: BattleState, data: EncounterDefinition): string {
  const target = actorName(event.targetId, data); const source = actorName(event.sourceId, data);
  switch (event.type) {
    case 'damage': return `${target} เสียเลือด ${event.amount ?? 0}${event.absorbed ? ` (โล่รับไว้ ${event.absorbed})` : ''}`;
    case 'guard': return `${source}${event.sourceId === event.targetId ? 'ตั้งรับ' : `รับการโจมตีแทน${target}`} ลดความเสียหาย ${data.rules.guardReduction * 100}%`;
    case 'mark': return `${target} ติดตรา ${data.rules.markDuration} รอบ รวมรอบนี้`;
    case 'barrier': return `${target} ได้รับโล่เพิ่ม ${event.amount}`;
    case 'heal': return `${target} ฟื้นเลือด ${event.amount}`;
    case 'interrupt': return `${target} จะเสียเทิร์นโจมตีกายภาพครั้งถัดไป`;
    case 'cancel': return event.cause === 'interrupted' ? 'กระแทกโล่หยุดการโจมตีกายภาพของศัตรูได้' : 'กำจัดผู้โจมตีได้ การโจมตีของมันถูกยกเลิก';
    case 'down': return `${target}${data.heroes.some(h => h.id === event.targetId) ? 'ล้มแล้ว' : 'ถูกกำจัดแล้ว'}`;
    case 'brace': return `${source}ตั้งทวน · ศัตรูที่ตีแนวหน้าด้วยกายภาพจะโดนสวน ${event.amount}`;
    case 'counter': return `${source}แทงสวน${target} ${event.amount}`;
    case 'corrode': return `${target}ถูกกัดกร่อน · ทุกการโจมตีของทีม +${event.amount}`;
    case 'haste': return `${target}จะลงมือก่อนทุกคนในรอบถัดไป`;
    case 'delay': return `${target}จะลงมือท้ายสุดในรอบถัดไป`;
    case 'outcome': return after.outcome === 'victory' ? 'ชนะแล้ว! รอยแยกสงบลง' : 'แพ้แล้ว ลองจัดแผนใหม่';
  }
}
export const resourceText: Record<ResourceId, { name: string; use: string }> = {
  ore: { name: 'แร่ดาว', use: 'พากลับค่าย ใช้จ้างและอัปดาวทหารรับจ้าง' },
  ember: { name: 'ถ่านม่านเวล', use: 'ชุบสมาชิกที่ล้ม 1 คนที่แคมป์' },
  seal: { name: 'ตราสัญญา', use: 'พากลับค่าย ใช้แทนตัวซ้ำ 1 ชิ้นเมื่ออัปดาว' },
};
export const resourceOrder: readonly ResourceId[] = ['ore', 'ember', 'seal'];
export function lootThai(loot: Resources): string {
  const parts = resourceOrder.filter(id => loot[id] > 0).map(id => `${resourceText[id].name} +${loot[id]}`);
  return parts.length ? parts.join(' · ') : 'ไม่มีของตก';
}
