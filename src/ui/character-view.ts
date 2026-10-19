import type { EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { ExpeditionState, MapDefinition, TalentNode } from '../core/world/types';
import { withParty } from '../core/battle/engine';
import { expToNext } from '../core/world/world';
import { memberTalentReason, talentPoints, talentsSpent } from '../core/world/talents';
import { icon } from './icons';
import { heroText, passiveText, skillDescription, talentBranches, talentHelp } from './th';

export const characterTabs = { overview: 'ภาพรวม', gear: 'อุปกรณ์', skills: 'สกิล', talents: 'ความถนัด' } as const;
export type CharacterTab = keyof typeof characterTabs;

export function characterOverview(s: ExpeditionState, map: MapDefinition, h: HeroDefinition): string {
  const m = s.members[h.id]!, level = m.level ?? 1;
  return `<p>${heroText[h.id]!.help}</p><p>Lv${level} · ${level < map.progression.levelCap ? `EXP ${m.exp ?? 0}/${expToNext(map, level)}` : 'เลเวลสูงสุด'}${m.wound ? ` · บาดแผล −${m.wound}% เลือดสูงสุด` : ''}</p>
    <dl class="hire-stats"><div><dt>เลือด</dt><dd>${s.hp[h.id] ?? 0}/${h.maxHp}</dd></div><div><dt>พลังโจมตี</dt><dd>${h.attack}</dd></div><div><dt>ความเร็ว</dt><dd>${h.speed}</dd></div><div><dt>พลังเสริม</dt><dd>+${h.skillBonus ?? 0}%</dd></div>${[['เกราะ', h.armour ?? 0], ['ต้านพลังงาน', h.resist ?? 0], ['ดูดเลือด', h.leech ?? 0]].map(([name, value]) => `<div><dt>${name}</dt><dd>${value}%</dd></div>`).join('')}</dl><p class="camp-note">ค่าสถานะปัจจุบันรวมเลเวล ดาว ความถนัด อุปกรณ์ และบาดแผล</p>`;
}

export function characterSkills(h: HeroDefinition, base: HeroDefinition, stars: number, template: EncounterDefinition): string {
  const data = withParty(template, [h]), unlock = base.unlocks;
  const actions = [...h.actions, ...(unlock && !h.actions.includes(unlock.skill) ? [unlock.skill] : [])];
  return `<h3>สกิล Active</h3><ul class="hire-skills">${actions.map(a => `<li>${icon(a)}<div><b>${data.skills[a].name}</b><small>${h.actions.includes(a) ? data.skills[a].cooldown ? `คูลดาวน์ ${data.skills[a].cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น' : 'ยังล็อก · ปลดที่ ★3'}</small><p>${skillDescription(a, h.id, data)}</p></div></li>`).join('')}</ul>${unlock ? `<h3>สกิลติดตัวประจำอาชีพ</h3><div class="character-passive"><strong>${passiveText[unlock.passive].name}</strong><p>${stars >= 5 ? 'ปลดล็อกแล้ว' : 'ยังล็อก · ปลดที่ ★5'}</p><p>${passiveText[unlock.passive].help(data)}</p></div>` : ''}<p class="camp-note">ความถนัดจากแต้มเลเวลเลือกได้ในแท็บความถนัด</p>`;
}

export function characterTalents(s: ExpeditionState, map: MapDefinition, id: string, data: EncounterDefinition): string {
  const m = s.members[id]!, nodes = map.talents[id];
  if (!nodes) return '<p>ตัวละครนี้ไม่มีต้นไม้ความถนัด</p>';
  const points = talentPoints(map, m), free = points - talentsSpent(m.talents), branches = talentBranches[id] ?? ['สาย A', 'สาย B'];
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงขั้นก่อนหน้า', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const node = (n: TalentNode) => {
    const def = nodes.find(v => v.id === n)!, rank = m.talents?.[n] ?? 0, reason = memberTalentReason(map, id, m, n);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' ? 'locked' : 'open';
    return `<button id="character-talent-${n}" data-world="character-talent" data-node="${n}" class="talent-node${n.endsWith('3') ? ' capstone' : ''}" data-state="${state}" aria-disabled="${!!reason}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, data)}</small><small>${reason ? why[reason] : 'แตะเพื่อลง 1 แต้ม'}</small></button>`;
  };
  return `<section class="talent-tree" aria-label="ต้นไม้ความถนัดของ${heroText[id]!.name}"><p class="talent-points" role="status">แต้มเหลือ <strong>${free}</strong>/${points} · ได้ 1 แต้มทุกเลเวลอัป</p><div class="talent-root">${node('root')}</div><div class="talent-branches">${(['a', 'b'] as const).map((b, i) => `<div class="talent-branch"><h4>${branches[i]}</h4>${node(`${b}1`)}${node(`${b}2`)}<p class="talent-gate">ยอดสาย: ลงสายนี้ครบ 4 แต้ม</p>${node(`${b}3`)}</div>`).join('')}</div><p class="camp-note">ลงแต้มได้ทันทีนอกการต่อสู้ · คืนแต้มและเปลี่ยนสายได้ฟรีที่ครูฝึกในค่าย</p></section>`;
}
