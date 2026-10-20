import type { EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { Item, MapDefinition, TalentNode } from '../core/world/types';
import { withParty } from '../core/battle/engine';
import { expToNext } from '../core/world/world';
import { memberTalentReason, talentPoints, talentsSpent } from '../core/world/talents';
import { icon } from './icons';
import { heroText, itemLines, itemName, passiveText, skillDescription, specialText, talentBranches, talentHelp, wornSets, slotText } from './th';
import { characterSkillMetric, characterStats, type CharacterState } from './character-metrics';
import { gearArt } from './equip-art';

export const characterTabs = { overview: 'ภาพรวม', gear: 'อุปกรณ์', skills: 'สกิล', talents: 'ความถนัด' } as const;
export type CharacterTab = keyof typeof characterTabs;

export function characterOverview(s: CharacterState, map: MapDefinition, h: HeroDefinition, template?: EncounterDefinition): string {
  const m = s.members[h.id]!, level = m.level ?? 1;
  return `<p>${heroText[h.id]!.help}</p><p>Lv${level} · ${level < map.progression.levelCap ? `EXP ${m.exp ?? 0}/${expToNext(map, level)}` : 'เลเวลสูงสุด'}${m.wound ? ` · บาดแผล −${m.wound}% เลือดสูงสุด` : ''}</p>
    <p class="camp-note">ค่าสถานะรวมเลเวล ดาว ความถนัด อุปกรณ์ และบาดแผล · แตะค่าเพื่ออ่านความหมาย</p>${template ? `<div class="character-stat-list">${characterStats(s, map, h, template).map(v => `<details class="character-stat" id="character-stat-${v.id}"><summary><span>${v.name}</span><strong>${v.value}${v.unit}</strong></summary><p>${v.help}</p></details>`).join('')}</div>` : ''}`;
}

export function characterSkills(h: HeroDefinition, base: HeroDefinition, stars: number, template: EncounterDefinition): string {
  const data = withParty(template, [h]), unlock = base.unlocks;
  const actions = [...h.actions, ...(unlock && !h.actions.includes(unlock.skill) ? [unlock.skill] : [])];
  return `<h3>สกิล Active</h3><p class="camp-note">ค่าพื้นฐานตามตัวละครปัจจุบัน · ดาเมจจริงขึ้นกับเงื่อนไขท่า สถานะเป้าหมาย โบนัสอุปกรณ์ และเลือดที่เหลือ การรักษาไม่เกินเลือดสูงสุด</p><ul class="hire-skills character-skills">${actions.map(a => { const metric = characterSkillMetric(a, h, template); return `<li data-skill="${a}">${icon(a)}<div><b>${data.skills[a].name}</b><small>${h.actions.includes(a) ? data.skills[a].cooldown ? `คูลดาวน์ ${data.skills[a].cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น' : 'ยังล็อก · ปลดที่ ★3'}</small><p class="skill-metric">${metric.label}${metric.value === undefined ? '' : ` <strong>${metric.value}</strong>`} · ${metric.target}${metric.secondary ? `<br>${metric.secondary.label} <strong>${metric.secondary.value}</strong>` : ''}</p><small>${metric.scaling}</small><p>${skillDescription(a, h.id, data)}</p></div></li>`; }).join('')}</ul>${unlock ? `<h3>สกิลติดตัวประจำอาชีพ</h3><div class="character-passive"><strong>${passiveText[unlock.passive].name}</strong><p>${stars >= 5 ? 'ปลดล็อกแล้ว' : 'ยังล็อก · ปลดที่ ★5'}</p><p>${passiveText[unlock.passive].help(data)}</p></div>` : ''}<p class="camp-note">ความถนัดจากแต้มเลเวลเลือกได้ในแท็บความถนัด</p>`;
}

const deltaText = (a: number, b: number) => b === a ? 'เท่าเดิม' : `${b > a ? '+' : '−'}${Math.abs(b-a)}`;
const deltaClass = (a: number, b: number) => b === a ? 'same' : b > a ? 'gain' : 'loss';
export function equipmentEffects(s: CharacterState, map: MapDefinition, h: HeroDefinition): string {
  const sets = wornSets(map.equipment, s.members[h.id]?.gear), specials = h.gear?.specials ?? [];
  return [sets.map(v => `<li><b>ชุด${v.name} ${v.pieces}/4</b><small>2 ชิ้น ${v.pieces >= 2 ? 'ทำงาน' : 'ยังไม่ครบ'}: ${v.two}</small><small>4 ชิ้น ${v.pieces >= 4 ? 'ทำงาน' : 'ยังไม่ครบ'}: ${v.four}</small></li>`).join(''), specials.map(v => `<li>★ ${specialText[v]}</li>`).join('')].join('') || '<li>ไม่มีเซ็ตหรือคุณสมบัติพิเศษ</li>';
}
export function characterEquipmentComparison(before: CharacterState, after: CharacterState, map: MapDefinition, h: HeroDefinition, next: HeroDefinition, item: Item | readonly Item[], template: EncounterDefinition, baseCamp = false): string {
  const items = 'slot' in item ? [item] : item; const stats = characterStats(before, map, h, template), proposed = characterStats(after, map, next, template);
  const currentData = withParty(template, [h]), nextData = withParty(template, [next]);
  const card = (it: Item | undefined, label: string) => `<section class="comparison-item"><h4>${label}</h4>${it ? `${gearArt(it)}<b>${itemName(it)} Lv${it.level}</b><small>${itemLines(map.equipment, it).join(' · ')}</small>` : '<p>ช่องว่าง</p>'}</section>`;
  return `<section class="gear-comparison" aria-labelledby="comparison-title"><button id="comparison-back" data-world="comparison-back" class="secondary">← กลับอุปกรณ์</button><h3 id="comparison-title">เปรียบเทียบก่อนสวมใส่</h3><p class="camp-note">กำลังทดลองเท่านั้น · ยังไม่เปลี่ยนอุปกรณ์หรือเซฟ</p><div class="comparison-items">${items.map(it=>card(before.members[h.id]?.gear?.[it.slot], 'สวมอยู่ · '+slotText[it.slot])+card(it, 'ทดลองใส่ · '+slotText[it.slot])).join('')}</div>
    <h3>ค่าสถานะตัวละคร</h3><table class="comparison-table"><thead><tr><th scope="col">ค่า</th><th scope="col">สวมอยู่</th><th scope="col">ทดลอง</th><th scope="col">ผลต่าง</th></tr></thead><tbody>${stats.map((v,i) => `<tr data-stat="${v.id}"><th scope="row">${v.name}</th><td>${v.value}${v.unit}</td><td>${proposed[i]!.value}${v.unit}</td><td class="${deltaClass(v.value, proposed[i]!.value)}">${deltaText(v.value, proposed[i]!.value)}${v.value === proposed[i]!.value ? '' : v.unit}</td></tr>`).join('')}</tbody></table><p class="camp-note">${baseCamp ? 'ค่ายหลัก: แสดงเลือดสูงสุดสำหรับการเดินทางครั้งถัดไป' : `HP ปัจจุบัน ${before.hp[h.id] ?? 0} → ${after.hp[h.id] ?? 0} · เพิ่มเลือดสูงสุดไม่ฟื้นเลือด ลดเลือดสูงสุดจะจำกัด HP ให้ไม่เกินค่าใหม่`}</p>
    <h3>ผลต่อสกิลที่ปลดล็อกแล้ว</h3><p class="camp-note">เทียบพลังพื้นฐานก่อนเงื่อนไขการต่อสู้ ไม่ใช่ดาเมจรับประกัน · เปิดแต่ละท่าเพื่ออ่านก่อน–หลัง โดยเฉพาะท่าที่มีหลายผลและการสวนกลับ</p><div class="comparison-skills">${h.actions.map(a => { const v = characterSkillMetric(a,h,template), n = characterSkillMetric(a,next,template); return `<details data-skill="${a}"><summary><strong>${template.skills[a].name}</strong><span>${v.value === undefined ? 'ผลพิเศษ · ดูเงื่อนไข' : `${v.label} <b>${v.value} → ${n.value}</b> <em class="${deltaClass(v.value,n.value!)}">(${deltaText(v.value,n.value!)})</em>`}</span>${v.secondary && n.secondary ? `<span>${v.secondary.label} <b>${v.secondary.value} → ${n.secondary.value}</b> <em class="${deltaClass(v.secondary.value,n.secondary.value)}">(${deltaText(v.secondary.value,n.secondary.value)})</em></span>` : ''}</summary><small>${v.target} · ${v.scaling} · คูลดาวน์ ${template.skills[a].cooldown} รอบ</small><p><b>สวมอยู่:</b> ${skillDescription(a,h.id,currentData)}</p><p><b>ทดลอง:</b> ${skillDescription(a,next.id,nextData)}</p></details>`; }).join('')}</div>
    <h3>เซ็ตและคุณสมบัติพิเศษทั้งหมด</h3><p class="camp-note">ตรวจโบนัสที่ได้หรือเสียเมื่อเปลี่ยนชิ้น รวมชุด 2/4 ชิ้น ผลตามเงื่อนไขไม่รวมในพลังพื้นฐานด้านบน</p><div class="comparison-effects"><section><h4>สวมอยู่</h4><ul>${equipmentEffects(before,map,h)}</ul></section><section><h4>ทดลองใส่</h4><ul>${equipmentEffects(after,map,next)}</ul></section></div><div class="comparison-footer"><button id="comparison-equip" data-world="comparison-equip" class="primary">สวมใส่${items.length > 1 ? 'ชุดนี้' : 'ชิ้นนี้'}</button><button data-world="comparison-back" class="secondary">ยกเลิก</button></div></section>`;
}

export function characterTalents(s: CharacterState, map: MapDefinition, id: string, data: EncounterDefinition): string {
  const m = s.members[id]!, nodes = map.talents[id];
  if (!nodes) return '<p>ตัวละครนี้ไม่มีต้นไม้ความถนัด</p>';
  const points = talentPoints(map, m), free = points - talentsSpent(m.talents), branches = talentBranches[id] ?? ['สาย A', 'สาย B'];
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงขั้นก่อนหน้า', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const node = (n: TalentNode) => {
    const def = nodes.find(v => v.id === n)!, rank = m.talents?.[n] ?? 0, reason = memberTalentReason(map, id, m, n);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' ? 'locked' : 'open';
    return `<button id="character-talent-${n}" data-world="character-talent" data-node="${n}" class="talent-node${n.endsWith('3') ? ' capstone' : ''}" data-state="${state}" aria-disabled="${!!reason}" aria-label="${def.name} ขั้น ${rank}/${def.max} · ${talentHelp(def,data)}${reason?` · ${why[reason]}`:''}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, data)}</small><small>${reason ? why[reason] : 'แตะเพื่อลง 1 แต้ม'}</small></button>`;
  };
  return `<section class="talent-tree" aria-label="ต้นไม้ความถนัดของ${heroText[id]!.name}"><p class="talent-points" role="status">แต้มเหลือ <strong>${free}</strong>/${points} · ได้ 1 แต้มทุกเลเวลอัป</p><div class="talent-root">${node('root')}</div><div class="talent-branches">${(['a', 'b'] as const).map((b, i) => `<div class="talent-branch"><h4>${branches[i]}</h4>${node(`${b}1`)}${node(`${b}2`)}<p class="talent-gate">ยอดสาย: ลงสายนี้ครบ 4 แต้ม</p>${node(`${b}3`)}</div>`).join('')}</div><p class="camp-note">ลงแต้มได้ทันทีนอกการต่อสู้ · คืนแต้มและเปลี่ยนสายได้ฟรีที่ครูฝึกในค่าย</p></section>`;
}
