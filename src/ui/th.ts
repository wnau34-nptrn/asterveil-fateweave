import {bossNames,bossDescription} from './boss-equipment';
import type { ActionId, PassiveId, BattleEvent, BattleState, EncounterDefinition, Intent, TalentCap, TalentRule } from '../core/battle/types';
import type { EquipmentRules, ExpGain, ExpeditionState, Gear, GearSlot, GearStat, Item, PotionId, PotionRules, ResourceId, Resources, SetDefinition, SetId, TalentNodeDef, MapEventKind, EventChoice, EventRules, QuestObjective, SideQuestDefinition, SideQuestKind, ShopItemId } from '../core/world/types';
import type { GearSpecial, HeroDefinition } from '../core/battle/types';
import { setCounts, statLines } from '../core/world/equipment';
import { ambushBonusOf, capAmount, corrodeBonusOf, finaleHealPower, guardReductionOf, hasCap, skillPower, songPower, talentRule, tauntReductionOf } from '../core/battle/engine';
import type { IconName } from './icons';
export const thaiFont = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
export const heroText: Record<string, { name: string; role: string; help: string; icon: string }> = {
  guardian: { name: 'เอกิส', role: 'อัศวิน', help: 'รับแทนเพื่อนและหยุดการโจมตี', icon: '♜' },
  garran: { name: 'การ์แรน', role: 'ทหารหอก', help: 'ตั้งทวนแทงสวนการโจมตีกายภาพ', icon: '⟋' },
  mira: { name: 'มิร่า', role: 'นักธนู', help: 'ยิงสกัดให้ศัตรูไปลงมือท้ายสุด', icon: '➶' },
  lio: { name: 'ลิโอ', role: 'นักกวีรูน', help: 'บรรเลงเพลงค้างไว้ เพิ่มพลังโจมตีหรือฟื้นเลือดทั้งทีม', icon: '♪' },
  brann: { name: 'แบรนน์', role: 'ผู้พิทักษ์ค้อน', help: 'ยั่วยุให้ศัตรูทุกตัวตีตัวเองและรับเบาลง', icon: '⛨' },
  sefa: { name: 'เซฟา', role: 'นักสอดแนม', help: 'จู่โจมก่อนศัตรูขยับและก้าวเงาหลบการโจมตี', icon: '↯' },
  toma: { name: 'โทมะ', role: 'นักเล่นแร่', help: 'กรดกัดกร่อนและยาเร่งให้เพื่อนลงมือก่อน', icon: '⚗' },
  tracer: { name: 'ไลรา', role: 'นักดาบ', help: 'ติดตราแล้วฟันเจาะจุด', icon: '➶' },
  weaver: { name: 'ไอรา', role: 'จอมเวท', help: 'ศรเวทและโล่ป้องกัน', icon: '✧' },
  healer: { name: 'เซเรน', role: 'นักบวช', help: 'รักษาคนเดียวหรือฟื้นฟูทั้งทีม', icon: '✚' },
};
const names: Record<string, string> = { lio: 'ลิโอ', brann: 'แบรนน์', sefa: 'เซฟา', toma: 'โทมะ', mira: 'มิร่า', garran: 'การ์แรน', guardian: 'เอกิส', tracer: 'ไลรา', weaver: 'ไอรา', healer: 'เซเรน', raider: 'นักจู่โจม', brute: 'อสูรรอยแยก', party: 'ทั้งทีม' };
export function actorName(id: string | undefined, data: EncounterDefinition): string {
  // Enemies carry the battle's monster level (2D-1).
  const foe = id ? data.enemies.find(e => e.id === id) : undefined;
  if (foe && data.level) return `Lv${data.level} ${foe.displayName ?? foe.name}`;
  return id ? data.enemies.find(e => e.id === id)?.displayName ?? names[id] ?? data.heroes.find(h => h.id === id)?.name ?? data.enemies.find(e => e.id === id)?.name ?? 'เป้าหมาย' : 'ทีม';
}
export function intentName(intent: Intent): string {
  return ({ 'Raking Slash': 'ฟันกวาด', 'Rift Bolt': 'ลำแสงรอยแยก', 'Crushing Blow': 'ทุบหนัก', 'Shadow Knife': 'มีดเงา', 'Rift Fury': 'โทสะรอยแยก', 'War Cry': 'คำรามศึก',
    'Seed Spark': 'ประกายเมล็ด', 'Tusk Charge': 'พุ่งงา', 'Thorn Pounce': 'ตะครุบหนาม', 'Spore Hex': 'คำสาปสปอร์', 'Thorn Bloom': 'หนามผลิบาน',
    'Briar Lash': 'แส้หนาม', 'Rune Lash': 'แส้อักขระ', 'Ribbon Snare': 'ริบบิ้นรัด', 'Crystal Fist': 'หมัดผลึก', 'Horn Charge': 'พุ่งเขา', 'Shard Burst': 'ผลึกระเบิด' } as Record<string, string>)[intent.name] ?? intent.name;
}
export function skillDescription(action: ActionId, heroId: string, data: EncounterDefinition): string {
  const skill = { ...data.skills[action], power: skillPower(data, heroId, action) };
  const hero = data.heroes.find(h => h.id === heroId)!;
  const cooldown = skill.cooldown ? ` ใช้แล้วพร้อมอีกครั้งใน ${skill.cooldown} รอบ` : '';
  const text: Record<ActionId, string> = {
    attack: `โจมตีศัตรู ${hero.attack}${hero.empoweredByStatuses ? ` หรือ ${hero.attack + data.rules.markedBonus} เมื่อเป้าหมายติดตรา (ใช้ตราหมด)` : ''} กำจัดผู้โจมตีได้ก็หยุดการโจมตีของมัน`,
    guard: `เอกิสรับการโจมตีแทนคนที่ศัตรูเล็ง ลดความเสียหาย ${Math.round(guardReductionOf(data, heroId) * 100)}% ปัดความเสียหายที่เหลือขึ้น แล้วใช้โล่ก่อนเลือด ป้องกันการโจมตีศัตรูถัดไปที่แสดงไว้ หมดเมื่อรับการโจมตีหรือถึงเทิร์นเอกิสอีกครั้ง`,
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
    acid: `ปาขวดกรด ${skill.power} แล้วเป้าหมายถูกกัดกร่อน ${data.rules.corrodeDuration} รอบรวมรอบนี้ ทุกการโจมตีของทีมใส่ตัวนี้แรงขึ้น +${corrodeBonusOf(data, heroId)}`,
    ambush: `จู่โจม ${skill.power} หรือ ${skill.power + ambushBonusOf(data, heroId)} ถ้าเป้าหมายยังไม่ได้ลงมือในรอบนี้ (ดูคิว SPD) ใช้ได้ดีกับศัตรูที่ช้ากว่า`,
    evade: `ก้าวเงาเตรียมหลบ การโจมตีของศัตรูครั้งแรกที่โดนเซฟา (กายภาพหรือพลังงาน) จะพลาดทั้งหมด อยู่จนหลบแล้วหรือถึงเทิร์นของตัวเองอีกครั้ง`,
    taunt: `ยั่วยุศัตรูทุกตัว ตั้งแต่ตอนนี้จนถึงเทิร์นถัดไปของแบรนน์ การโจมตีของศัตรูทุกครั้ง (กายภาพหรือพลังงาน) จะเล็งมาที่แบรนน์ และเขารับเบาลง ${Math.round(tauntReductionOf(data, heroId) * 100)}% แผนโจมตีศัตรูจะแสดงเป้าใหม่ทันที`,
    slam: `ทุบค้อนรูนสร้างความเสียหาย ${skill.power} ให้ศัตรูหนึ่งตัว`,
    valor: `บรรเลงเพลงกล้าค้างไว้ ทุกการโจมตีของทีมแรงขึ้น +${songPower(data, heroId, 'valor')} (รวมสกิลและการสวน) จนกว่าจะเปลี่ยนเพลงหรือลิโอล้ม เล่นได้ทีละเพลง`,
    mend: `บรรเลงเพลงฟื้นค้างไว้ ทุกคนที่ยังยืนอยู่ฟื้นเลือด ${songPower(data, heroId, 'mend')} เมื่อเริ่มแต่ละรอบใหม่ จนกว่าจะเปลี่ยนเพลงหรือลิโอล้ม เล่นได้ทีละเพลง`,
    haste: `ให้ยาเร่งเพื่อนที่ยังยืนอยู่ 1 คน (รวมตัวเอง) รอบถัดไปคนนั้นได้ลงมือก่อนทุกคน รอบนี้ลำดับไม่เปลี่ยน`,
    rally: `ตั้งรับหมู่ เพื่อนทุกคนที่ยังยืนอยู่ (รวมเอกิส) ลดความเสียหาย ${data.rules.rallyReduction * 100}% จากการโจมตีครั้งแรกที่โดน จนถึงเทิร์นถัดไปของเอกิส`,
    finisher: `ปลิดชีพ ${skill.power} หรือ ${skill.power * 2} ถ้าเลือดศัตรูต่ำกว่า ${data.rules.finisherThreshold * 100}% ไม่ใช้ตรา`,
    sigil: `ตรึงเวท ${skill.power} และยกเลิกท่าพลังงานครั้งถัดไปของเป้าหมาย ท่ากายภาพยังโจมตีตามปกติ (กระแทกโล่ใช้หยุดกายภาพ)`,
    sanctuary: `อวยพรเพื่อนที่ยังยืนอยู่ 1 คน (รวมตัวเอง) เลือดจะไม่ลดต่ำกว่า 1 จนถึงเทิร์นถัดไปของเซเรน`,
    spearwall: `ตั้งกำแพงทวน ทุกครั้งที่ศัตรูโจมตีกายภาพใส่เพื่อนแนวหน้า (รวมตัวเอง) จะโดนแทงสวน ${skill.power} จนถึงเทิร์นถัดไปของการ์แรน`,
    weakshot: `ยิงศรจุดอ่อน ${skill.power} หรือ ${skill.power + data.rules.weakshotBonus} ถ้าเป้าหมายถูกยิงสกัดเลื่อนเทิร์นอยู่`,
    bomb: `ปาขวดระเบิดใส่ศัตรูทุกตัว ตัวละ ${skill.power} ตัวที่ถูกกัดกร่อนอยู่โดนแรงขึ้นตามโบนัสกรด`,
    backstab: `ลอบแทง ${skill.power} ใส่ศัตรูที่ไม่ได้เล็งเซฟาในท่าถัดไป (ดูเป้าที่ศัตรูประกาศ)`,
    quake: `ทุบปฐพี ${skill.power} หรือ ${skill.power + data.rules.quakeBonus} ถ้าท่าถัดไปของเป้าหมายเล็งแบรนน์อยู่ (เข้าคู่กับยั่วยุ)`,
    challenge: `ท้าดวลศัตรู 1 ตัว ท่าถัดไปของมันจะเล็งเอกิสแทน (แผนโจมตีแสดงเป้าใหม่ทันที) ไม่ทำความเสียหาย`,
    bulwark: `ตั้งปราการหิน ตั้งแต่ตอนนี้จนถึงเทิร์นถัดไปของเอกิส ศัตรูทุกตัวเล็งเอกิส และเขารับเบาลง ${data.skills.bulwark.power}%`,
    rouse: `ปลุกพล ทุกคนที่ยังยืนอยู่ฟื้นเลือด ${skill.power}% ของเลือดสูงสุดของตัวเอง ไม่ชุบชีวิต`,
    finale: `จบเพลงที่บรรเลงอยู่แล้วปล่อยพลังทันที: เพลงกล้า = โจมตีศัตรูทุกตัว ${skill.power} · เพลงฟื้น = ฟื้นเลือดทุกคน ${finaleHealPower(data, heroId)} ต้องมีเพลงของลิโอเล่นอยู่`,
  };
  const passive = hero.passive && passiveText[hero.passive].actions.includes(action) ? ` · ★5 ${passiveText[hero.passive].name}: ${passiveText[hero.passive].help(data)}` : '';
  return text[action] + passive + talentNotes(action, heroId, data) + cooldown;
}
// ---- Talent tree (2D-1b) ----
// Branch names per class (A, B), matching docs/EXPEDITION_DESIGN.md "Talent tree".
// Big skill trees (A6): three branch names per class, matching docs/design/SKILL_TREE_KNIGHT_TH.md.
export const bigBranches: Record<string, readonly [string, string, string]> = { guardian: ['ปราการ', 'ลงทัณฑ์', 'ธงนำ'] };
export const talentBranches: Record<string, readonly [string, string]> = {
  guardian: ['ผู้ลงทัณฑ์', 'ปราการ'], tracer: ['ดาบเจาะ', 'นักเต้นดาบ'], weaver: ['เวทโจมตี', 'เวทป้องกัน'], healer: ['ผู้เยียวยา', 'ผู้คุ้มครอง'],
  garran: ['ทวนรุก', 'ทวนรับ'], mira: ['นักแม่นธนู', 'ฝนธนู'], toma: ['กรดกัดกร่อน', 'ยาเสริม'], sefa: ['นักลอบ', 'นักหลบ'],
  brann: ['ค้อนรูน', 'ปราการหิน'], lio: ['เพลงรบ', 'เพลงปลอบ'],
};
const ruleText: Record<TalentRule, { actions: readonly ActionId[]; help: (n: number) => string }> = {
  guardReduction: { actions: [], help: n => `ตั้งรับแทนลดความเสียหายเพิ่ม ${Math.round(n * 100)}%` },
  tauntReduction: { actions: [], help: n => `ยั่วยุลดความเสียหายที่รับเพิ่ม ${Math.round(n * 100)}%` },
  corrodeBonus: { actions: [], help: n => `กรดกัดกร่อนแรงขึ้น +${n}` },
  ambushBonus: { actions: [], help: n => `โบนัสจู่โจมก่อน +${n}` },
  executeHeal: { actions: ['execute'], help: n => `ฟันเจาะจุดใส่ศัตรูที่ติดตรา ฟื้นเลือดตัวเอง ${n}` },
  healBarrier: { actions: ['heal'], help: n => `รักษาแล้วให้โล่ ${n} ด้วย (ไม่ซ้อนกัน)` },
  hasteHeal: { actions: ['haste'], help: n => `ยาเร่งฟื้นเลือดให้คนที่ได้ ${n}` },
  dodgeHeal: { actions: ['evade'], help: n => `หลบได้แล้วฟื้นเลือดตัวเอง ${n}` },
};
const capText: Record<TalentCap, { actions: readonly ActionId[]; help: (n: number) => string }> = {
  retribution: { actions: ['bash'], help: n => `กระแทกโล่ที่หยุดท่ากายภาพได้ทำดาเมจเพิ่ม ${n}` },
  guardcounter: { actions: ['guard'], help: n => `ทุกครั้งที่รับการโจมตีแทน โต้กลับผู้โจมตี ${n} + 20% ของพลังโจมตี` },
  deepmark: { actions: ['attack', 'execute', 'finisher'], help: n => `ทุกการโจมตีของไลราใส่ศัตรูที่ติดตรา +${n}` },
  relentless: { actions: ['execute'], help: () => 'ล้มศัตรูได้แล้วฟันเจาะจุดพร้อมใช้ทันที' },
  splitbolt: { actions: ['bolt'], help: () => 'ศรเวทโดนศัตรูตัวอื่นด้วยครึ่งหนึ่ง' },
  wardreflect: { actions: ['ward'], help: n => `โล่เวทที่รับการโจมตีได้สะท้อนใส่ผู้โจมตี ${n} (ครั้งเดียว)` },
  twinheal: { actions: ['heal'], help: () => 'รักษาแล้วเพื่อนที่เลือดเหลือน้อยที่สุดอีกคนได้ครึ่งหนึ่ง' },
  solace: { actions: ['heal'], help: n => `คนที่ได้รักษารับความเสียหายลดลง ${n}% จนถึงเทิร์นถัดไปของเซเรน` },
  pierceline: { actions: ['pierce'], help: () => 'แทงทะลวงโดนศัตรูตัวอื่นด้วยครึ่งหนึ่ง' },
  frontwall: { actions: ['brace', 'spearwall'], help: n => `ระหว่างตั้งทวน แนวหน้ารับความเสียหายกายภาพลดลง ${n}%` },
  hunter: { actions: ['attack', 'hinder', 'volley', 'weakshot'], help: n => `ทุกการโจมตีของมิร่าใส่ศัตรูที่ถูกสกัด +${n}` },
  volleyhinder: { actions: ['volley'], help: () => 'ห่าธนูสกัดศัตรูที่เร็วที่สุดให้ลงมือท้ายสุดในรอบถัดไป' },
  acidspread: { actions: ['acid'], help: () => 'ขวดกรดทำให้ศัตรูตัวอื่นถูกกัดกร่อนด้วย (ไม่มีดาเมจ)' },
  quickbrew: { actions: ['haste'], help: () => 'ยาเร่งพร้อมใช้อีกครั้งเร็วขึ้น 1 รอบ' },
  shadowlayer: { actions: ['ambush'], help: () => 'ใช้จู่โจมก่อนแล้วได้ก้าวเงาทันที' },
  doubleshadow: { actions: ['evade'], help: () => 'ก้าวเงาหลบได้ 2 ครั้ง' },
  hammercounter: { actions: ['taunt'], help: n => `ระหว่างยั่วยุ ทุกครั้งที่โดนตีจะทุบสวน ${n}` },
  stoneregen: { actions: ['taunt'], help: n => `เริ่มเทิร์นตอนเลือดต่ำกว่าครึ่ง ฟื้นเลือด ${n}` },
  chorus: { actions: ['valor'], help: n => `ระหว่างเพลงกล้า การโจมตีของศัตรูทุกครั้งเบาลง ${n}` },
  overture: { actions: ['mend'], help: () => 'เริ่มศึกพร้อมเพลงฟื้นที่บรรเลงอยู่แล้ว' },
  twoguard: { actions: ['guard'], help: n => `ตั้งรับแทนกันได้ 2 ครั้งจากศัตรูตัวใดก็ได้จนถึงเทิร์นถัดไป แต่ลดความเสียหายน้อยลง ${n}%` },
  reflectbash: { actions: ['bash'], help: n => `กระแทกโล่หยุดท่าพลังงานได้ด้วย แต่ดาเมจลดลง ${n}%` },
  brightbanner: { actions: ['rally'], help: n => `ตั้งรับหมู่แล้วทุกคนได้โล่ ${n} (ไม่ซ้อนกัน)` },
  valorbanner: { actions: ['rally'], help: n => `ตั้งรับหมู่แล้วทุกการโจมตีของทีมแรงขึ้น ${n}% ถึงจบรอบ` },
  fatebanner: { actions: [], help: n => `เริ่มศึก ทุกคนได้โล่ ${n}% ของเลือดสูงสุดเอกิส` },
};
const talentStatName = { hp: 'เลือดสูงสุด', attack: 'พลังโจมตี', skill: 'พลังเสริม', armour: 'เกราะ' } as const;
// What one node does (per rank for multi-rank nodes); `data` names the skills.
export function talentHelp(node: TalentNodeDef, data: EncounterDefinition): string {
  const e = node.effect; const per = node.max > 1 ? ' ต่อขั้น' : '';
  if ('stat' in e) return `${talentStatName[e.stat]} +${e.percent}%${per}`;
  if ('power' in e) return `${data.skills[e.power].name} +${e.amount}${per}`;
  if ('rule' in e) return ruleText[e.rule].help(e.amount) + per;
  if ('unlock' in e) return `ปลดสกิล ${data.skills[e.unlock].name}: ${skillDescription(e.unlock, data.heroes[0]!.id, data)}`;
  if ('passive' in e) return `พาสซีฟ ${passiveText[e.passive].name}: ${passiveText[e.passive].help(data)}`;
  return capText[e.cap].help(e.amount ?? 0);
}
// Talent effects that change this skill, appended to its description in battle.
function talentNotes(action: ActionId, heroId: string, data: EncounterDefinition): string {
  const t = data.heroes.find(h => h.id === heroId)?.talents; if (!t) return '';
  const notes = [
    ...Object.keys(t.rules ?? {}).filter(r => ruleText[r as TalentRule].actions.includes(action)).map(r => ruleText[r as TalentRule].help(talentRule(data, heroId, r as TalentRule))),
    ...Object.keys(t.caps ?? {}).filter(c => hasCap(data, heroId, c as TalentCap) && capText[c as TalentCap].actions.includes(action)).map(c => capText[c as TalentCap].help(capAmount(data, heroId, c as TalentCap))),
  ];
  return notes.length ? ` · ความถนัด: ${notes.join(' · ')}` : '';
}
// ★5 passives (always on): name, short effect, and the skills they change.
export const passiveText: Record<PassiveId, { name: string; actions: readonly ActionId[]; help: (data: EncounterDefinition) => string }> = {
  stand: { name: 'ยืนหยัด', actions: ['guard', 'rally'], help: () => 'ครั้งแรกในศึกที่การโจมตีซึ่งเอกิสป้องกัน (ตั้งรับแทนหรือตั้งรับหมู่) จะทำให้ล้ม จะเหลือเลือด 1 แทน' },
  keeneye: { name: 'ตาเหยี่ยว', actions: ['mark'], help: d => `ตราที่ไลราติดอยู่ได้ ${d.rules.markDuration + 1} รอบ` },
  echo: { name: 'โล่ตอบสนอง', actions: ['ward'], help: d => `โล่เวทหนาขึ้น ${d.rules.echoBonus * 100}% เมื่อใส่ให้คนที่ศัตรูประกาศว่าจะโจมตี` },
  afterglow: { name: 'แสงอุ่น', actions: ['heal', 'prayer', 'finale'], help: d => `การรักษาที่เกินเลือดเต็มกลายเป็นโล่ สูงสุด ${d.rules.afterglowCap}` },
  heavycounter: { name: 'สวนหนัก', actions: ['brace'], help: d => `ตั้งทวนแทงสวนแรงขึ้น ${d.rules.heavyCounter * 100}%` },
  tailwind: { name: 'ลมใต้ปีก', actions: ['volley'], help: d => `ห่าธนูพร้อมใช้อีกครั้งใน ${d.skills.volley.cooldown - 1} รอบ` },
  potent: { name: 'สูตรเข้มข้น', actions: ['acid', 'bomb'], help: d => `กรดกัดกร่อนอยู่ได้ ${d.rules.corrodeDuration + 1} รอบ` },
  shadowcounter: { name: 'เงาสวน', actions: ['evade'], help: d => `หลบได้แล้วแทงสวนผู้โจมตี ${d.rules.shadowCounter}` },
  stoneskin: { name: 'ผิวหิน', actions: ['taunt'], help: d => `ยั่วยุลดความเสียหายที่รับ ${d.rules.stoneskinReduction * 100}%` },
  resound: { name: 'เพลงก้อง', actions: ['valor', 'mend'], help: d => `ผลของเพลงแรงขึ้น ${d.rules.resound * 100}%` },
};
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
    'Already playing this song.': 'กำลังบรรเลงเพลงนี้อยู่แล้ว',
    'Already hasted.': 'ได้ยาเร่งสำหรับรอบหน้าแล้ว',
    'No song is playing.': 'ต้องบรรเลงเพลงอยู่ก่อน',
    'This enemy is aiming at the scout.': 'ศัตรูตัวนี้เล็งเซฟาอยู่',
    'The preview is stale. Select an action again.': 'จังหวะเปลี่ยนแล้ว กรุณาเลือกใหม่',
  } as Record<string, string>)[reason] ?? 'คำสั่งนี้ยังใช้ไม่ได้ กรุณาเลือกใหม่';
}
export function eventThai(event: BattleEvent, after: BattleState, data: EncounterDefinition): string {
  const target = actorName(event.targetId, data); const source = actorName(event.sourceId, data);
  switch (event.type) {
    case 'damage': return `${target} เสียเลือด ${event.amount ?? 0}${event.absorbed ? ` (โล่รับไว้ ${event.absorbed})` : ''}`;
    case 'guard': return `${source}${event.sourceId === event.targetId ? 'ตั้งรับ' : `รับการโจมตีแทน${target}`} ลดความเสียหาย ${Math.round(guardReductionOf(data, event.sourceId) * 100)}%`;
    case 'mark': return `${target} ติดตรา ${data.rules.markDuration} รอบ รวมรอบนี้`;
    case 'barrier': return `${target} ได้รับโล่เพิ่ม ${event.amount}`;
    case 'heal': return event.text === 'Leech.' ? `${target} ดูดเลือด ${event.amount}` : `${target} ฟื้นเลือด ${event.amount}`;
    case 'interrupt': return `${target} จะเสียเทิร์นโจมตีกายภาพครั้งถัดไป`;
    case 'cancel': return event.cause === 'sealed' ? 'ตรึงเวทยกเลิกท่าพลังงานของศัตรูได้' : event.cause === 'interrupted' ? 'กระแทกโล่หยุดการโจมตีกายภาพของศัตรูได้' : 'กำจัดผู้โจมตีได้ การโจมตีของมันถูกยกเลิก';
    case 'down': return `${target}${data.heroes.some(h => h.id === event.targetId) ? 'ล้มแล้ว' : 'ถูกกำจัดแล้ว'}`;
    case 'brace': return after.counter?.wall || event.text.startsWith('Spear wall') ? `${source}ตั้งกำแพงทวน · ทุกการตีกายภาพใส่แนวหน้าจะโดนสวน ${event.amount}` : `${source}ตั้งทวน · ศัตรูที่ตีแนวหน้าด้วยกายภาพจะโดนสวน ${event.amount}`;
    case 'rally': if (event.text === 'Valor banner.') return `${source}ชูธงขวัญกล้า · ทุกการโจมตีของทีมแรงขึ้น ${event.amount}% ถึงจบรอบ`;
      return `${source}ตั้งรับหมู่ · การโจมตีครั้งแรกที่ทุกคนโดนเบาลง ${data.rules.rallyReduction * 100}%`;
    case 'sigil': return `${target}ถูกตรึงเวท · ท่าพลังงานครั้งถัดไปจะถูกยกเลิก`;
    case 'sanctuary': return event.text.startsWith('Sanctuary keeps') ? `พรคุ้มภัยทำให้${target}ยังยืนอยู่ด้วยเลือด 1` : `${target}ได้รับพรคุ้มภัย · เลือดไม่ต่ำกว่า 1 จนถึงเทิร์นถัดไปของ${source}`;
    case 'stand': return event.text.startsWith('Last stand') ? `อุปกรณ์ยืนหยัดทำให้${target}รอดด้วยเลือด 1` : `${source}ยืนหยัด · ${target}รอดด้วยเลือด 1`;
    case 'finale': return `${source}บรรเลงบทสุดท้าย · ${event.text === 'Finale of valor.' ? 'โจมตีศัตรูทุกตัว' : 'ฟื้นเลือดทั้งทีม'}`;
    case 'counter': return event.text === 'The ward reflects the hit.' ? `โล่เวทของ${source}สะท้อนใส่${target} ${event.amount}` : event.text === 'The knight counters.' ? `${source}โต้กลับ${target} ${event.amount}` : event.text === 'The warden hammers back.' ? `${source}ทุบสวน${target} ${event.amount}` : event.text === 'Thorns strike back.' ? `หนามของ${source}สวน${target} ${event.amount}` : `${source}แทงสวน${target} ${event.amount}`;
    case 'corrode': return `${target}ถูกกัดกร่อน · ทุกการโจมตีของทีม +${event.amount}`;
    case 'haste': return `${target}จะลงมือก่อนทุกคนในรอบถัดไป`;
    case 'song': return `${source}เริ่มบรรเลงเพลงใหม่ ค้างไว้จนเปลี่ยนเพลง`;
    case 'taunt': if (event.text === 'Challenge.') return `${source}ท้าดวล${target} · ท่าถัดไปของมันจะเล็ง${source}`;
      if (event.text === 'Bulwark.') return `${source}ตั้งปราการหิน · ศัตรูทุกตัวจะเล็ง${source}จนถึงเทิร์นถัดไป (รับเบาลง ${event.amount}%)`;
      return `${source}ยั่วยุ · ศัตรูทุกตัวจะเล็ง${source}จนถึงเทิร์นถัดไป (รับเบาลง ${Math.round(tauntReductionOf(data, event.sourceId) * 100)}%)`;
    case 'evade': return `${source}ก้าวเงา · การโจมตีครั้งแรกที่โดนจะพลาด`;
    case 'dodge': return `${target}หลบการโจมตีของ${source}ได้`;
    case 'delay': return `${target}จะลงมือท้ายสุดในรอบถัดไป`;
    case 'outcome': return after.outcome === 'victory' ? 'ชนะแล้ว! รอยแยกสงบลง' : 'แพ้แล้ว ลองจัดแผนใหม่';
  }
}
export const resourceText: Record<ResourceId, { name: string; use: string }> = {
  ore: { name: 'แร่ดาว', use: 'พากลับค่าย ใช้อัปดาว ปรุงยา และตีอุปกรณ์' },
  gold: { name: 'เหรียญทอง', use: 'พากลับค่าย ใช้จ้างทหารรับจ้างเท่านั้น' },
  ember: { name: 'ถ่านคืนชีพ', use: 'ชุบสมาชิกที่ล้ม 1 คนที่แคมป์' },
  seal: { name: 'ตราสัญญา', use: 'พากลับค่าย ใช้แทนตัวซ้ำได้ครึ่งหนึ่งเมื่ออัปดาว' },
};
export const resourceOrder: readonly ResourceId[] = ['ore', 'gold', 'ember', 'seal'];
// Victory EXP (2D-1): the deployed lead's gain, any level-ups, and a note when the level gap cut it.
export function expThai(exp: Record<string, ExpGain> | undefined, state: ExpeditionState): string {
  if (!exp) return '';
  const lead = exp[state.roster.deployed[0]!]; if (!lead) return '';
  const ups = Object.entries(exp).filter(([, g]) => g.levelsUp > 0).map(([id, g]) => `${heroText[id]?.name ?? id} Lv${g.level}`);
  const cut = Object.values(exp).some(g => g.percent < 100);
  return ` · EXP +${lead.gained}${cut ? ' (บางคนได้น้อยลงเพราะเลเวลสูงกว่ามอน)' : ''}${ups.length ? ` · เลเวลอัป ${ups.join(', ')}` : ''}`;
}
export function lootThai(loot: Resources): string {
  const parts = resourceOrder.filter(id => loot[id] > 0).map(id => `${resourceText[id].name} +${loot[id]}`);
  return parts.length ? parts.join(' · ') : 'ไม่มีของตก';
}
// ---- Equipment (2D-2) ----
export const slotText: Record<GearSlot, string> = { weapon: 'อาวุธ', head: 'หมวก', body: 'เกราะ', gloves: 'ถุงมือ', boots: 'รองเท้า', charm: 'เครื่องราง' };
export const slotIcon = { weapon: 'gearWeapon', head: 'gearHead', body: 'gearBody', gloves: 'gearGloves', boots: 'gearBoots', charm: 'gearCharm' } as const;
export const rarityText = ['ธรรมดา', 'ดี', 'หายาก', 'ล้ำค่า', 'ตำนาน'] as const;
const weaponText: Record<string, string> = { guardian: 'ดาบอัศวิน', tracer: 'ดาบนักดวล', weaver: 'คทาเวท', healer: 'ไม้เท้าศักดิ์สิทธิ์', garran: 'ทวน', mira: 'ธนู', toma: 'ชุดขวดแร่', sefa: 'มีดสั้น', brann: 'ค้อนรูน', lio: 'พิณรูน' };
const statText: Record<GearStat, (n: number) => string> = {
  hp: n => `เลือด +${n}`, attack: n => `พลังโจมตี +${n}%`, support: n => `พลังเสริม +${n}%`, speed: n => `SPD +${n}`, armour: n => `เกราะ +${n}%`,
  resist: n => `ต้านพลังงาน +${n}%`, leech: n => `ดูดเลือด +${n}%`, barrier: n => `โล่เริ่มศึก ${n}`, regen: n => `ฟื้นฟูระหว่างเดิน +${n}`, luck: n => `โชค +${n}`,
};
export const specialText: Record<GearSpecial, string> = {
  laststand: 'ครั้งแรกในศึกที่จะล้ม เหลือเลือด 1', markhunter: 'โจมตีศัตรูที่ติดตรา +8', renewal: 'ฟื้นเลือด 4 เมื่อเริ่มเทิร์นของตัวเอง',
};
export const itemName = (item: Item): string => `${item.boss?bossNames[item.boss]:`${item.slot === 'weapon' ? weaponText[item.hero!] ?? 'อาวุธ' : slotText[item.slot]}${rarityText[item.rarity]}`}${item.plus ? ` +${item.plus}` : ''}`;
export const statName: Record<GearStat, string> = { hp: 'เลือด', attack: 'พลังโจมตี', support: 'พลังเสริม', speed: 'SPD', armour: 'เกราะ', resist: 'ต้านพลังงาน', leech: 'ดูดเลือด', barrier: 'โล่เริ่มศึก', regen: 'ฟื้นฟูระหว่างเดิน', luck: 'โชค' };
// Base stats first, then affixes; a legendary special and the set at the end.
// Each value shows the best its roll could have been (stats design: rolls are 80–120%).
export function itemLines(rules: EquipmentRules, item: Item): string[] {
  return [...(item.boss?[`◆ เฉพาะผู้คุมรอยแยก · ${bossDescription(item.boss,item.boss==='focus'?rules.boss.damage:rules.boss.barrier)}`]:[]), ...statLines(rules, item).map(l => `${statText[l.stat](l.value)}${l.value < l.max ? ` (สูงสุด ${l.max})` : ''}`), ...(item.special ? [`★ ${specialText[item.special]}`] : []),
    ...(item.set ? [`ชุด${setText[item.set]}`] : []), ...(item.transferSlot!==undefined?[`ถ่ายโอนได้เฉพาะคุณสมบัติช่อง ${item.transferSlot+1}`]:[])];
}
// ---- Equipment sets (2D-3) ----
export const setText: Record<SetId, string> = { dawn: 'ผู้พิทักษ์รุ่งอรุณ', wind: 'สายลมเร็ว', shadow: 'นักล่าเงา', thorn: 'หนามสวน', starveil: 'เวทแสงดาว', mender: 'ผู้เยียวยา' };
const twoText = (t: SetDefinition['two']) => t.map(x => x.stat === 'speed' ? `SPD +${x.value}` : `${({ hp: 'เลือด', attack: 'พลังโจมตี', support: 'พลังเสริม' } as const)[x.stat]} +${x.value}%`).join(' · ');
const fourText = (f: SetDefinition['four']) => ({
  barrier: `เริ่มศึกพร้อมโล่ ${f.amount}`, firstStrike: 'รอบแรกของศึกลงมือก่อนทุกคน', freshHit: `ตีศัตรูที่ยังไม่ลงมือในรอบนี้ +${f.amount}`,
  thorns: `โดนตีกายภาพแล้วสวน ${f.amount}`, freeCast: 'สกิลแรกในแต่ละศึกไม่ติดคูลดาวน์', overflow: `รักษาเกินเลือดเต็มกลายเป็นโล่ (สูงสุด ${f.amount})`,
})[f.kind];
export const setBonusText = (rules: EquipmentRules, id: SetId) => ({ two: twoText(rules.sets[id].two), four: fourText(rules.sets[id].four) });
// The sets a member wears, with pieces and which bonuses are active.
export function wornSets(rules: EquipmentRules, gear: Gear | undefined): { id: SetId; name: string; pieces: number; two: string; four: string }[] {
  return (Object.entries(setCounts(gear)) as [SetId, number][]).map(([id, pieces]) => ({ id, name: setText[id], pieces, ...setBonusText(rules, id) }));
}
export const itemOwner = (item: Item): string => item.hero ? `เฉพาะ${heroText[item.hero]?.name ?? ''}` : 'ใส่ได้ทุกคน';
// ---- Map potions (2D-5) ----
export const potionIcon = { salve: 'potionSalve', tonic: 'potionTonic', repel: 'potionRepel' } as const;
export const potionText: Record<PotionId, { name: string; help: (r: PotionRules) => string }> = {
  salve: { name: 'ยาฟื้นแผล', help: r => `ฟื้นเลือด ${r.salvePercent}% ให้สมาชิกที่ยังยืนอยู่ 1 คน` },
  tonic: { name: 'ยาฟื้นหมู่', help: r => `ฟื้นเลือด ${r.tonicPercent}% ให้ทุกคนที่ยังยืนอยู่` },
  repel: { name: 'ยาไล่อสูร', help: r => `${r.repelSteps} ก้าวถัดไปไม่เจอศัตรูสุ่ม (บอสยังขวางทาง)` },
};
// ---- Camp NPCs (ART-CHAR-NPC-001): names, roles and a few lines each (live Thai text, never baked into art). ----
export const npcText: Record<'smith' | 'broker' | 'trainer' | 'keeper' | 'herbalist' | 'scout', { name: string; role: string; lines: readonly string[] }> = {
  smith: { name: 'ลุงบอร์ก', role: 'ช่างตีเหล็ก', lines: ['เอาของมาเลย จะตีให้เงาวับ!', 'ตีบวกที่ร้านข้าไม่มีวันพัง รับประกันด้วยค้อนเล่มนี้', 'สามชิ้นหลอมเป็นหนึ่ง ของดีขึ้นอีกขั้น'] },
  broker: { name: 'พีโน่', role: 'นายหน้าจ้างทหาร', lines: ['มีนักรบฝีมือดีมาใหม่ ราคาพิเศษเฉพาะท่านเลยนะ', 'จ้างคนเดิมซ้ำได้ตัวซ้ำไว้อัปดาว คุ้มสุดๆ', 'ป้ายเปลี่ยนใหม่ทุกครั้งที่ท่านกลับจากการเดินทาง'] },
  trainer: { name: 'ครูฮัลดา', role: 'ครูฝึก', lines: ['ถนัดทางเดียวให้สุด ดีกว่าทำได้ทุกอย่างครึ่งๆ', 'เลเวลขึ้นเมื่อไหร่ มาลงแต้มกับข้า', 'ลงแต้มผิดก็รีเซ็ตได้ ไม่ต้องกลัว'] },
  keeper: { name: 'มิมี่', role: 'ผู้ดูแลคลัง', lines: ['ใส่ให้พอดีตัวนะคะ ชุดครบสี่ชิ้นได้โบนัสใหญ่', 'คลังเก็บได้หกสิบชิ้น ถ้าเต็มจะแยกชิ้นให้อัตโนมัติค่ะ', 'ของหายากแยกชิ้นต้องกดยืนยันสองครั้งนะคะ'] },
  herbalist: { name: 'เฟิร์น', role: 'นักปรุงยา', lines: ['ยาใหม่ร้อนๆ เพิ่งต้มเสร็จเลย!', 'พกไปได้อย่างละสามขวดนะ อย่าลืม', 'ยาไล่อสูรช่วยให้เดินผ่านทุ่งได้เงียบๆ'] },
  scout: { name: 'คาเอล', role: 'ผู้นำทาง', lines: ['ทางข้างหน้ามืด เตรียมทีมให้พร้อม', 'ตัวสำรองสลับได้ในกระเป๋า เว้นตอนต่อสู้ เลือกให้ดี', 'ศัตรูเล็งตามหมายเลขช่อง จัดแถวให้ดี'] },
};
// ---- Rift seal (3B): objective lines with live progress. ----
export function questLine(o: QuestObjective, state: ExpeditionState): string {
  if (o.kind === 'chests') return `เปิดกล่องสมบัติ ${o.count} กล่อง (${Math.min(o.count, state.openedChests.length)}/${o.count})`;
  return o.kind === 'elite' ? 'ชนะยักษ์หินแห่งรอยแผล (มินิบอส)' : 'ชำระรอยแยกเล็กในรอยแผล';
}
// ---- Map events (3A): live Thai text for each event and choice; numbers come from the rules. ----
export const eventText: Record<MapEventKind, { name: string; scene: string; icon: IconName }> = {
  bandits: { name: 'ด่านโจร', scene: 'กลุ่มโจรตั้งด่านขวางทาง พวกมันเฝ้าของที่ปล้นมา', icon: 'danger' },
  shrine: { name: 'ศาลเก่า', scene: 'ศาลหินเรืองแสงจาง ๆ พลังของมันรักษาได้แต่ต้องแลกกับบางอย่าง', icon: 'star' },
  merchant: { name: 'พ่อค้าเร่', scene: 'พ่อค้าเร่แวะพักริมทาง ขายยาแลกแร่ดาว', icon: 'pack' },
  traveller: { name: 'นักเดินทางบาดเจ็บ', scene: 'นักเดินทางคนหนึ่งบาดเจ็บนั่งพิงต้นไม้ ขอยาสักขวด', icon: 'talk' },
  rift: { name: 'รอยแยกเล็ก', scene: 'รอยแยกเล็ก ๆ กำลังสั่น มีบางอย่างกำลังจะคลานออกมา', icon: 'boss' },
};
export function choiceText(choice: EventChoice, r: EventRules): { label: string; help: string } {
  switch (choice) {
    case 'fight': return { label: 'สู้', help: '' };
    case 'sneak': return { label: 'ลอบผ่าน', help: 'ไม่ต้องสู้ แต่ศัตรูในโซนจะตื่นตัวเต็มที่' };
    case 'pray': return { label: 'สวดขอพร', help: `คนที่ยืนอยู่ฟื้นเลือด ${r.prayHeal}% แต่เลือดสูงสุดทุกคนลด ${r.prayWound}% ตลอดรอบนี้` };
    case 'offer': return { label: 'ถวายแร่', help: `จ่ายแร่ดาว ${r.offerOre} ได้ตราสัญญา ${r.offerSeal}` };
    case 'buy-salve': return { label: `ซื้อยาฟื้นแผล · ${r.merchant.salve} แร่`, help: '' };
    case 'buy-tonic': return { label: `ซื้อยาฟื้นหมู่ · ${r.merchant.tonic} แร่`, help: '' };
    case 'buy-repel': return { label: `ซื้อยาไล่อสูร · ${r.merchant.repel} แร่`, help: '' };
    case 'help': return { label: 'ให้ยาฟื้นแผล', help: `ใช้ยาฟื้นแผล 1 ขวด ได้แร่ดาว ${r.traveller.ore} และตราสัญญา ${r.traveller.seal}` };
  }
}
export const eventChoices: Record<MapEventKind, readonly EventChoice[]> = {
  bandits: ['fight', 'sneak'], shrine: ['pray', 'offer'], merchant: ['buy-salve', 'buy-tonic', 'buy-repel'], traveller: ['help'], rift: ['fight'],
};
export const eventReasonText: Record<string, string> = { ore: 'แร่ดาวไม่พอ', salve: 'ไม่มียาฟื้นแผล', carry: 'พกเต็มแล้ว', busy: 'ทำตอนนี้ไม่ได้', choice: 'ทำไม่ได้' };
// ---- Camp side quests (3D): each NPC's request and its reward, in Thai. ----
export const sideQuestText: Record<SideQuestKind, { name: string; ask: (n: number) => string }> = {
  rareChests: { name: 'แร่จากกล่องหายาก', ask: n => `เปิดกล่องสมบัติหายาก ${n} กล่อง แล้วเล่าให้ข้าฟังว่าข้างในมีอะไร` },
  wins: { name: 'ผลงานให้ลูกค้าดู', ask: n => `ชนะการต่อสู้ให้ได้ ${n} ครั้ง ข้าจะเอาไปโฆษณาให้ทหารรับจ้างอยากมาร่วม` },
  elites: { name: 'บททดสอบของครู', ask: n => `ปราบศัตรูหัวหน้าให้ได้ ${n} ตัว พิสูจน์ว่าทีมพร้อมรับมือของแข็ง` },
  secrets: { name: 'ห้องลับในกำแพง', ask: n => `หาทางลับในกำแพงร้าวให้เจอ ${n} แห่ง ของที่ซ่อนไว้ต้องมาอยู่ในคลังนะคะ` },
  herbs: { name: 'สมุนไพรเรืองแสง', ask: n => `เก็บสมุนไพรเรืองแสง ${n} ต้นจากในแผนที่ แล้วกลับมาถึงแคมป์อย่างปลอดภัยนะ` },
  puzzles: { name: 'ไขกลไกโบราณ', ask: n => `ไขกลไกโบราณ (หินรูน ก้อนหิน คันโยก) ให้ได้ ${n} อย่าง` },
};
export function rewardText(r: SideQuestDefinition['reward']): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`เหรียญทอง ${r.gold}`); if (r.ore) parts.push(`แร่ดาว ${r.ore}`);
  if (r.seal) parts.push(`ตราสัญญา ${r.seal}`); if (r.dust) parts.push(`ฝุ่นดาว ${r.dust}`);
  for (const [id, n] of Object.entries(r.potions ?? {}) as [PotionId, number][]) if (n) parts.push(`${potionText[id].name} ${n} ขวด`);
  return parts.join(' · ');
}
// ---- Camp market (4A): goods sold by the broker for gold coins. ----
export const shopText: Record<ShopItemId, { name: string; help: string }> = {
  seal: { name: 'ตราสัญญา', help: 'ใช้แทนตัวซ้ำได้ถึงครึ่งหนึ่งของที่ต้องใช้ตอนอัปดาว' },
  contract: { name: 'ใบสัญญาซ้ำ', help: 'เพิ่มตัวซ้ำให้สมาชิกที่เลือกหนึ่งตัว ไว้อัปดาว' },
  gearbox: { name: 'หีบอุปกรณ์', help: 'อุปกรณ์ระดับหายากขึ้นไป เลเวลเท่าสมาชิกที่เลเวลสูงสุด' },
  repel: { name: 'ยาไล่อสูร', help: 'เก็บไว้ในคลังยา พกไปได้ตอนออกเดินทาง' },
};

// A member's battle stats in one line (stats design 2026-10-17); defence and leech appear only when worn.
export function heroStatLine(h: HeroDefinition, hp?: number): string {
  return [`เลือด ${hp !== undefined ? `${hp}/` : ''}${h.maxHp}`, `พลังโจมตี ${h.attack}`, `พลังเสริม +${h.skillBonus ?? 0}%`, `SPD ${h.speed}`,
    ...(h.armour ? [`เกราะ ${h.armour}%`] : []), ...(h.resist ? [`ต้านพลังงาน ${h.resist}%`] : []), ...(h.leech ? [`ดูดเลือด ${h.leech}%`] : [])].join(' · ');
}
