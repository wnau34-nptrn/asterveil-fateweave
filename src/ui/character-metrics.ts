import { beginBattle, resolveCommand, defenseOf, finaleHealPower, skillPower, songPower, SUPPORT_SKILLS, targetKind, withParty } from '../core/battle/engine';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import { gearTotals } from '../core/world/equipment';
import type { ExpeditionState, MapDefinition } from '../core/world/types';
import { partyLuck } from '../core/world/world';

export interface CharacterStat { id: string; name: string; value: number; unit: string; help: string }
// A labelled hypothetical battle, projected by the real resolver. No saves, loot or profile mutation.
export function markedSkillExample(action:ActionId,h:HeroDefinition,template:EncounterDefinition):number|undefined {
  if(targetKind(action)!=='enemy'||(action!=='attack'&&template.skills[action].power<=0)||!h.actions.includes(action))return;
  const data=withParty({...template,enemies:template.enemies.map(e=>({...e,maxHp:100000,speed:1}))},[{...h,speed:1000}]);
  const state=beginBattle(data).state,enemy=state.enemies[0]!;enemy.markedUntil=state.round+2;
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
    stat('attack', 'พลังโจมตี', h.attack, '', 'กำหนดพลังโจมตีปกติ และอัตราเติบโตของท่าทำความเสียหาย เทียบกับค่าตั้งต้นของอาชีพ ไม่เพิ่มพลังรักษาหรือโล่'),
    stat('speed', 'ความเร็ว (SPD)', h.speed, '', 'ค่ามากลงมือก่อนในแต่ละรอบ ไม่เพิ่มจำนวนเทิร์น ดาวและเลเวลไม่เพิ่ม SPD เมื่อเท่ากันใช้ลำดับทีมก่อนศัตรู การเร่งหรือเลื่อนเทิร์นมีผลเหนือลำดับ SPD'),
    stat('support', 'พลังเสริม', h.skillBonus ?? 0, '%', 'เพิ่มพลังรักษา โล่ และเพลง ไม่เพิ่มดาเมจท่าโจมตี ท่าที่เป็นเปอร์เซ็นต์ลดความเสียหายหรือผลควบคุมไม่ได้แรงขึ้นจากค่านี้'),
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
  const target = ({ self: 'ตัวเอง', ally: 'เพื่อน 1 คน', party: 'เพื่อนทุกคน', enemy: 'ศัตรู 1 ตัว', enemies: 'ศัตรูทุกตัว' })[targetKind(action)];
  if (action === 'rally') return { label: 'ผลพิเศษ', scaling: 'อ่านเงื่อนไขของท่า', target: 'เพื่อนทุกคน' };
  if (action === 'attack') return { label: 'โจมตีพื้นฐาน', value: h.attack, scaling: 'อิงพลังโจมตี', target };
  if (action === 'finale') return { label: 'เพลงกล้า · ดาเมจต่อเป้าหมาย', value: skillPower(data,h.id,action), secondary: { label: 'เพลงฟื้น · ฟื้นเลือดต่อคน', value: finaleHealPower(data,h.id) }, scaling: 'โจมตีอิงพลังโจมตี · รักษาอิงพลังเสริม', target: 'ศัตรู/เพื่อนทุกคน ตามเพลง' };
  if (action === 'valor' || action === 'mend') return { label: action === 'valor' ? 'โบนัสต่อการโจมตี' : 'ฟื้นเลือดต่อคน/รอบ', value: songPower(data, h.id, action), scaling: 'อิงพลังเสริม', target: 'เพื่อนทุกคน' };
  if (!data.skills[action].power) return { label: 'ผลพิเศษ', scaling: 'อ่านเงื่อนไขของท่า', target };
  return { label: action === 'ward' ? 'โล่พื้นฐาน' : action === 'heal' || action === 'prayer' ? 'ฟื้นเลือดพื้นฐานต่อคน' : action === 'brace' || action === 'spearwall' ? 'พลังสวนพื้นฐาน' : 'ดาเมจพื้นฐานต่อเป้าหมาย', value: skillPower(data, h.id, action), scaling: SUPPORT_SKILLS.includes(action) ? 'อิงพลังเสริม' : 'อิงพลังโจมตี', target };
}
