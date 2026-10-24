import { beginBattle, resolveCommand, targetOptions, defenseOf, finaleHealPower, skillPower, songPower, usesMagicPower, targetKind, withParty } from '../core/battle/engine';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { gearTotals } from '../core/world/equipment';
import type { ExpeditionState, MapDefinition } from '../core/world/types';
import { partyLuck } from '../core/world/world';

export interface CharacterStat { id: string; name: string; value: number; unit: string; help: string }
// A labelled hypothetical battle, projected by the real resolver. No saves, loot or profile mutation.
export function markedSkillExample(action:ActionId,h:HeroDefinition,template:EncounterDefinition):number|undefined {
  if(targetKind(action)!=='enemy'||(action!=='attack'&&template.skills[action].power<=0)||!h.actions.includes(action))return;
  // Backstab requires the enemy to aim at somebody else. Keep that legal context explicit,
  // rather than throwing while a Scout's shared sheet is rendering.
  const ally:HeroDefinition={id:'boss-preview-ally',name:'เพื่อนตัวอย่าง',role:'Preview',lane:'back',maxHp:100000,attack:1,speed:1,actions:['attack'],color:0};
  const data=withParty({...template,enemies:template.enemies.map(e=>({...e,maxHp:100000,speed:1})),intents:template.intents.map(i=>({...i,targetSlot:1}))},[{...h,speed:1000},ally]);
  const state=beginBattle(data).state,target=targetOptions(state,data,h.id,action).find(t=>t.valid);
  const enemy=state.enemies.find(e=>e.id===target?.id);if(!enemy)return;enemy.markedUntil=state.round+2;
  const resolved=resolveCommand(state,data,{heroId:h.id,beat:state.beat,action,targetId:enemy.id});
  return resolved.turns.find(t=>t.side==='hero')?.events.filter(e=>e.type==='damage'&&e.sourceId===h.id&&e.targetId===enemy.id).reduce((n,e)=>n+(e.amount??0),0);
}
export type CharacterState = Pick<ExpeditionState,'members'|'hp'|'roster'>;
// Readonly UI projections. All growth, caps, gear/set totals and skill powers use the game helpers.
export function characterStats(s: CharacterState, map: MapDefinition, h: HeroDefinition, template: EncounterDefinition): CharacterStat[] {
  const data = withParty(template, [h]), gear = gearTotals(map, s.members[h.id]?.gear);
  const stat = (id: string, name: string, value: number, unit: string, help: string): CharacterStat => ({ id, name, value, unit, help });
  return [
    stat('hp', 'เลือดสูงสุด', h.maxHp, '', `เลือดปัจจุบัน ${s.hp[h.id] ?? 0}/${h.maxHp} · เมื่อเหลือ 0 จะล้ม เปลี่ยนอุปกรณ์เพิ่มเลือดสูงสุดไม่ฟื้นเลือดหรือชุบชีวิต บาดแผลลดเลือดสูงสุด`),
    stat('attack', 'พลังโจมตี', h.attack, '', 'กำหนดพลังโจมตีปกติ และอัตราเติบโตของท่าดาเมจกายภาพ เทียบกับค่าตั้งต้นของอาชีพ ไม่เพิ่มพลังรักษาหรือโล่'),
    stat('speed', 'ความเร็ว (SPD)', h.speed, '', 'ค่ามากลงมือก่อนในแต่ละรอบ ไม่เพิ่มจำนวนเทิร์น ดาวและเลเวลไม่เพิ่ม SPD เมื่อเท่ากันใช้ลำดับทีมก่อนศัตรู การเร่งหรือเลื่อนเทิร์นมีผลเหนือลำดับ SPD'),
    stat('support', 'พลังเวท', h.skillBonus ?? 0, '%', 'เพิ่มดาเมจเวท พลังรักษา โล่ และเพลง ไม่เพิ่มดาเมจกายภาพ ท่าที่เป็นเปอร์เซ็นต์ลดความเสียหายหรือผลควบคุมไม่ได้แรงขึ้นจากค่านี้'),
    stat('armour', 'เกราะที่ใช้จริง', defenseOf(data, h.id, 'physical'), '%', `ลดความเสียหายกายภาพก่อนใช้โล่ รวมจากอุปกรณ์ ${h.armour ?? 0}% · ใช้จริงไม่เกิน ${data.rules.defenseCap}% ไม่ลดความเสียหายพลังงาน`),
    stat('resist', 'ต้านพลังงานที่ใช้จริง', defenseOf(data, h.id, 'energy'), '%', `ลดความเสียหายพลังงานก่อนใช้โล่ รวมจากอุปกรณ์ ${h.resist ?? 0}% · ใช้จริงไม่เกิน ${data.rules.defenseCap}% ไม่ลดความเสียหายกายภาพ`),
    stat('leech', 'ดูดเลือดที่ใช้จริง', Math.min(data.rules.leechCap, h.leech ?? 0), '%', `ฟื้นเลือดจากดาเมจที่ตัวเองทำได้จริง ปัดลงและไม่เกินเลือดสูงสุด รวม ${h.leech ?? 0}% · ใช้จริงไม่เกิน ${data.rules.leechCap}%`),
    stat('barrier', 'โล่เริ่มศึก', h.gear?.barrier ?? 0, '', 'ได้รับโล่นี้ตอนเริ่มการต่อสู้ โล่รับความเสียหายก่อนเลือด ไม่ใช่การฟื้นเลือดบนแผนที่'),
    stat('regen', 'ฟื้นฟูระหว่างเดิน', gear.regen, '', `ทุก ${map.equipment.regenSteps} ก้าว ฟื้นเลือดตามค่านี้ให้สมาชิกที่พามาและยังยืนอยู่ รวมตัวสำรอง ไม่เกินเลือดสูงสุด ไม่ชุบชีวิต`),
    stat('luck', 'โชคของตัวละคร', gear.luck, '', 'นำโชคของตัวหลักทุกคนมารวมกันเพื่อเพิ่มโอกาสดรอปอุปกรณ์จากศึกสุ่ม ตัวสำรองไม่เพิ่มโชคทีม ไม่เพิ่มคุณภาพของที่ดรอป'),
    stat('party-luck', 'โบนัสโอกาสดรอปของทีม', partyLuck(s, map), '%', `รวมโชคของตัวหลักทั้งทีม ใช้ได้สูงสุด ${map.equipment.luckCap}% บวกกับโอกาสดรอปพื้นฐานของศึกสุ่ม ไม่รับประกันว่าจะดรอป`),
  ];
}

export function characterSkillMetric(action: ActionId, h: HeroDefinition, template: EncounterDefinition): { label: string; value?: number; secondary?: { label: string; value: number }; scaling: string; target: string } {
  const data = withParty(template, [h]);
  const effects: Partial<Record<ActionId,string>> = {bulwark:'เพื่อนแนวหน้าทุกคน',rouse:'เพื่อนเลือดต่ำสุด 1 คน',hold:'เพื่อนแนวหลังทุกคน',warcry:'เพื่อนแนวหน้าทุกคน',halo:'เพื่อนทุกคน',dread:'ทุกท่าของศัตรู',sweep:'ศัตรูแถวหน้า (แถวหลังเมื่อหน้าว่าง)',quake:'ศัตรูแถวหน้า (แถวหลังเมื่อหน้าว่าง)',tremor:'ศัตรูแถวหน้า (แถวหลังเมื่อหน้าว่าง)',pin:'ศัตรูแถวหน้า'};
  const target = effects[action] ?? ({ self: 'ตัวเอง', ally: 'เพื่อน 1 คน', party: 'เพื่อนทุกคน', enemy: 'ศัตรู 1 ตัว', enemies: 'ศัตรูทุกตัว' })[targetKind(action)];
  if (['halo', 'fury', 'guardstone', 'dread'].includes(action)) return { label: action === 'fury' ? 'เพิ่มพลังโจมตี (%)' : 'ลดความเสียหาย (%)', value: skillPower(data, h.id, action), scaling: 'ค่าคงที่ เพิ่มด้วยเลเวลสกิล/โหนด', target };
  if (action === 'stonearmor') return { label: 'โล่ % ของเลือดสูงสุด', value: skillPower(data, h.id, action), scaling: 'อิงเลือดสูงสุด ไม่อิงพลังโจมตี', target };
  if (action === 'revive') return { label: 'เลือดที่ชุบ (% เลือดสูงสุด)', value: skillPower(data, h.id, action), scaling: 'สัดส่วนคงที่ เลเวลเพิ่มโล่ผู้ใช้/ลดคูลดาวน์', target };
  if (action === 'rally') return { label: 'ผลพิเศษ', scaling: 'อ่านเงื่อนไขของท่า', target: 'เพื่อนทุกคน' };
  if (action === 'bulwark') return { label: 'ลดความเสียหายที่รับ (%)', value: skillPower(data, h.id, action), scaling: 'ค่าคงที่ ไม่อิงค่าสถานะ', target };
  if (action === 'attack') return { label: 'โจมตีพื้นฐาน', value: h.attack, scaling: 'อิงพลังโจมตี', target };
  if (action === 'finale') return { label: 'เพลงกล้า · ดาเมจต่อเป้าหมาย', value: skillPower(data,h.id,action), secondary: { label: 'เพลงฟื้น · ฟื้นเลือดต่อคน', value: finaleHealPower(data,h.id) }, scaling: 'ดาเมจและรักษาอิงพลังเวท', target: 'ศัตรู/เพื่อนทุกคน ตามเพลง' };
  if (action === 'valor' || action === 'mend') return { label: action === 'valor' ? 'โบนัสต่อการโจมตี' : 'ฟื้นเลือดต่อคน/รอบ', value: songPower(data, h.id, action), scaling: 'อิงพลังเวท', target: 'เพื่อนทุกคน' };
  if (!data.skills[action].power) return { label: 'ผลพิเศษ', scaling: 'อ่านเงื่อนไขของท่า', target };
  return { label: action === 'ward' || action === 'aegis' ? 'โล่พื้นฐาน' : action === 'heal' || action === 'prayer' || action === 'bless' ? 'ฟื้นเลือดพื้นฐานต่อคน' : action === 'brace' || action === 'spearwall' || action === 'warcry' ? 'พลังสวนพื้นฐาน' : 'ดาเมจพื้นฐานต่อเป้าหมาย', value: skillPower(data, h.id, action), scaling: usesMagicPower(action) ? 'อิงพลังเวท' : 'อิงพลังโจมตี', target };
}
