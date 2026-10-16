import type { ActionId, PassiveId, BattleEvent, BattleState, EncounterDefinition, Intent } from '../core/battle/types';
import type { ExpGain, ExpeditionState, ResourceId, Resources } from '../core/world/types';
import { skillPower, songPower } from '../core/battle/engine';
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
  return ({ 'Raking Slash': 'ฟันกวาด', 'Rift Bolt': 'ลำแสงรอยแยก', 'Crushing Blow': 'ทุบหนัก', 'Shadow Knife': 'มีดเงา',
    'Seed Spark': 'ประกายเมล็ด', 'Tusk Charge': 'พุ่งงา', 'Thorn Pounce': 'ตะครุบหนาม', 'Spore Hex': 'คำสาปสปอร์', 'Thorn Bloom': 'หนามผลิบาน',
    'Briar Lash': 'แส้หนาม', 'Rune Lash': 'แส้อักขระ', 'Ribbon Snare': 'ริบบิ้นรัด', 'Crystal Fist': 'หมัดผลึก', 'Horn Charge': 'พุ่งเขา', 'Shard Burst': 'ผลึกระเบิด' } as Record<string, string>)[intent.name] ?? intent.name;
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
    ambush: `จู่โจม ${skill.power} หรือ ${skill.power + data.rules.ambushBonus} ถ้าเป้าหมายยังไม่ได้ลงมือในรอบนี้ (ดูคิว SPD) ใช้ได้ดีกับศัตรูที่ช้ากว่า`,
    evade: `ก้าวเงาเตรียมหลบ การโจมตีของศัตรูครั้งแรกที่โดนเซฟา (กายภาพหรือพลังงาน) จะพลาดทั้งหมด อยู่จนหลบแล้วหรือถึงเทิร์นของตัวเองอีกครั้ง`,
    taunt: `ยั่วยุศัตรูทุกตัว ตั้งแต่ตอนนี้จนถึงเทิร์นถัดไปของแบรนน์ การโจมตีของศัตรูทุกครั้ง (กายภาพหรือพลังงาน) จะเล็งมาที่แบรนน์ และเขารับเบาลง ${data.rules.tauntReduction * 100}% แผนโจมตีศัตรูจะแสดงเป้าใหม่ทันที`,
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
    finale: `จบเพลงที่บรรเลงอยู่แล้วปล่อยพลังทันที: เพลงกล้า = โจมตีศัตรูทุกตัว ${skill.power} · เพลงฟื้น = ฟื้นเลือดทุกคน ${Math.round(data.rules.finaleHeal * (100 + (hero.skillBonus ?? 0)) / 100)} ต้องมีเพลงของลิโอเล่นอยู่`,
  };
  const passive = hero.passive && passiveText[hero.passive].actions.includes(action) ? ` · ★5 ${passiveText[hero.passive].name}: ${passiveText[hero.passive].help(data)}` : '';
  return text[action] + passive + cooldown;
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
    case 'guard': return `${source}${event.sourceId === event.targetId ? 'ตั้งรับ' : `รับการโจมตีแทน${target}`} ลดความเสียหาย ${data.rules.guardReduction * 100}%`;
    case 'mark': return `${target} ติดตรา ${data.rules.markDuration} รอบ รวมรอบนี้`;
    case 'barrier': return `${target} ได้รับโล่เพิ่ม ${event.amount}`;
    case 'heal': return `${target} ฟื้นเลือด ${event.amount}`;
    case 'interrupt': return `${target} จะเสียเทิร์นโจมตีกายภาพครั้งถัดไป`;
    case 'cancel': return event.cause === 'sealed' ? 'ตรึงเวทยกเลิกท่าพลังงานของศัตรูได้' : event.cause === 'interrupted' ? 'กระแทกโล่หยุดการโจมตีกายภาพของศัตรูได้' : 'กำจัดผู้โจมตีได้ การโจมตีของมันถูกยกเลิก';
    case 'down': return `${target}${data.heroes.some(h => h.id === event.targetId) ? 'ล้มแล้ว' : 'ถูกกำจัดแล้ว'}`;
    case 'brace': return after.counter?.wall || event.text.startsWith('Spear wall') ? `${source}ตั้งกำแพงทวน · ทุกการตีกายภาพใส่แนวหน้าจะโดนสวน ${event.amount}` : `${source}ตั้งทวน · ศัตรูที่ตีแนวหน้าด้วยกายภาพจะโดนสวน ${event.amount}`;
    case 'rally': return `${source}ตั้งรับหมู่ · การโจมตีครั้งแรกที่ทุกคนโดนเบาลง ${data.rules.rallyReduction * 100}%`;
    case 'sigil': return `${target}ถูกตรึงเวท · ท่าพลังงานครั้งถัดไปจะถูกยกเลิก`;
    case 'sanctuary': return event.text.startsWith('Sanctuary keeps') ? `พรคุ้มภัยทำให้${target}ยังยืนอยู่ด้วยเลือด 1` : `${target}ได้รับพรคุ้มภัย · เลือดไม่ต่ำกว่า 1 จนถึงเทิร์นถัดไปของ${source}`;
    case 'stand': return `${source}ยืนหยัด · ${target}รอดด้วยเลือด 1`;
    case 'finale': return `${source}บรรเลงบทสุดท้าย · ${event.text === 'Finale of valor.' ? 'โจมตีศัตรูทุกตัว' : 'ฟื้นเลือดทั้งทีม'}`;
    case 'counter': return `${source}แทงสวน${target} ${event.amount}`;
    case 'corrode': return `${target}ถูกกัดกร่อน · ทุกการโจมตีของทีม +${event.amount}`;
    case 'haste': return `${target}จะลงมือก่อนทุกคนในรอบถัดไป`;
    case 'song': return `${source}เริ่มบรรเลงเพลงใหม่ ค้างไว้จนเปลี่ยนเพลง`;
    case 'taunt': return `${source}ยั่วยุ · ศัตรูทุกตัวจะเล็ง${source}จนถึงเทิร์นถัดไป (รับเบาลง ${data.rules.tauntReduction * 100}%)`;
    case 'evade': return `${source}ก้าวเงา · การโจมตีครั้งแรกที่โดนจะพลาด`;
    case 'dodge': return `${target}หลบการโจมตีของ${source}ได้`;
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
