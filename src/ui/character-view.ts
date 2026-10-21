import {heroBossEffect} from './boss-equipment';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { Item, MapDefinition, MemberProgress, TalentNode, TalentNodeDef } from '../core/world/types';
import { withParty } from '../core/battle/engine';
import { expToNext, skillChoices } from '../core/world/world';
import { isBigTree, memberTalentReason, talentPoints, talentsSpent } from '../core/world/talents';
import { icon } from './icons';
import { heroText, itemLines, itemName, passiveText, skillDescription, specialText, bigBranches, talentBranches, talentHelp, wornSets, slotText } from './th';
import { markedSkillExample, characterSkillMetric, characterStats, type CharacterState } from './character-metrics';
import { gearArt } from './equip-art';

export const characterTabs = { overview: 'ภาพรวม', gear: 'อุปกรณ์', skills: 'สกิล', talents: 'ความถนัด' } as const;
export type CharacterTab = keyof typeof characterTabs;
// ART-UI-ICONS-002 line icons for tabs and stats (decorative; the Thai label stays).
export const characterTabIcons = { overview: 'tab-overview', gear: 'tab-gear', skills: 'tab-skills', talents: 'tab-tree' } as const;
const statIcons: Record<string, Parameters<typeof icon>[0]> = { hp: 'stat-hp', attack: 'stat-attack', speed: 'stat-speed', support: 'stat-support', armour: 'stat-armour', resist: 'stat-resist', leech: 'stat-leech', barrier: 'stat-barrier', regen: 'stat-regen', luck: 'stat-luck', 'party-luck': 'stat-luck' };

export function characterOverview(s: CharacterState, map: MapDefinition, h: HeroDefinition, template?: EncounterDefinition): string {
  const m = s.members[h.id]!, level = m.level ?? 1;
  return `<p>${heroText[h.id]!.help}</p><p>Lv${level} · ${level < map.progression.levelCap ? `EXP ${m.exp ?? 0}/${expToNext(map, level)}` : 'เลเวลสูงสุด'}${m.wound ? ` · บาดแผล −${m.wound}% เลือดสูงสุด` : ''}</p>
    <p class="camp-note">ค่าสถานะรวมเลเวล ดาว ความถนัด อุปกรณ์ และบาดแผล · แตะค่าเพื่ออ่านความหมาย</p>${template ? `<div class="character-stat-list">${characterStats(s, map, h, template).map(v => `<details class="character-stat" id="character-stat-${v.id}"><summary><span>${statIcons[v.id] ? icon(statIcons[v.id]!) : ''}${v.name}</span><strong>${v.value}${v.unit}</strong></summary><p>${v.help}</p></details>`).join('')}</div>` : ''}`;
}

// Big skill trees (A6): every tree skill with its state (in the loadout, unlocked, or the node that unlocks it).
function treeSkillState(map: MapDefinition, h: HeroDefinition, base: HeroDefinition, m: MemberProgress, data: EncounterDefinition): { actions: ActionId[]; note: (a: ActionId, cd: number) => string; passive: string } {
  const tree = map.talents[h.id]!, choices = skillChoices(base, map, m.talents, m.grants);
  const locked = tree.flatMap(n => 'unlock' in n.effect && !choices.includes(n.effect.unlock) ? [n.effect.unlock] : []);
  const nodeOf = (a: ActionId) => tree.find(n => 'unlock' in n.effect && n.effect.unlock === a);
  const passive = tree.find(n => 'passive' in n.effect) as TalentNodeDef & { effect: { passive: NonNullable<HeroDefinition['passive']> } } | undefined;
  const note = (a: ActionId, cd: number) => h.actions.includes(a) ? `ติดอยู่ · ${cd ? `คูลดาวน์ ${cd} รอบ` : 'ใช้ได้ทุกเทิร์น'}` : choices.includes(a) ? 'ปลดแล้ว · ยังไม่ได้ติด (เลือกในแท็บความถนัด)' : `ยังล็อก · ปลดที่โหนด ${nodeOf(a)?.name ?? ''} ชั้น ${nodeOf(a)?.tier ?? ''}`;
  return { actions: [...h.actions, ...choices.filter(a => !h.actions.includes(a)), ...locked], note,
    passive: passive ? `<h3>พาสซีฟจากต้นไม้</h3><div class="character-passive"><strong>${passiveText[passive.effect.passive].name}</strong><p>${h.passive === passive.effect.passive ? 'ปลดล็อกแล้ว' : `ยังล็อก · ปลดที่โหนด ${passive.name} ชั้น ${passive.tier}`}</p><p>${passiveText[passive.effect.passive].help(data)}</p></div>` : '' };
}
export function characterSkills(h: HeroDefinition, base: HeroDefinition, stars: number, template: EncounterDefinition, map?: MapDefinition, member?: MemberProgress): string {
  const data = withParty(template, [h]), tree = map && member && isBigTree(map.talents[h.id]) ? treeSkillState(map, h, base, member, data) : undefined;
  const unlock = tree ? undefined : base.unlocks;
  const actions = tree ? tree.actions : [...h.actions, ...(unlock && !h.actions.includes(unlock.skill) ? [unlock.skill] : [])];
  return `${h.gear?.boss?`<h3>พลังอุปกรณ์บอส</h3><ul class="boss-power-list">${heroBossEffect(h)}</ul>`:''}<h3>สกิล Active</h3><p class="camp-note">ค่าพื้นฐานตามตัวละครปัจจุบัน · ดาเมจจริงขึ้นกับเงื่อนไขท่า สถานะเป้าหมาย โบนัสอุปกรณ์ และเลือดที่เหลือ การรักษาไม่เกินเลือดสูงสุด</p><ul class="hire-skills character-skills">${actions.map(a => { const metric = characterSkillMetric(a, h, template),marked=h.gear?.boss?.power==='focus'?markedSkillExample(a,h,template):undefined; return `<li data-skill="${a}">${icon(a)}<div><b>${data.skills[a].name}</b><small>${tree ? tree.note(a, data.skills[a].cooldown) : h.actions.includes(a) ? data.skills[a].cooldown ? `คูลดาวน์ ${data.skills[a].cooldown} รอบ` : 'ใช้ได้ทุกเทิร์น' : 'ยังล็อก · ปลดที่ ★3'}</small><p class="skill-metric">${metric.label}${metric.value === undefined ? '' : ` <strong>${metric.value}</strong>`} · ${metric.target}${metric.secondary ? `<br>${metric.secondary.label} <strong>${metric.secondary.value}</strong>` : ''}</p><small>${metric.scaling}</small><p>${skillDescription(a, h.id, data)}</p>${marked===undefined?'':`<p class="boss-skill-example">ตัวอย่างศัตรูติดตรา ยังไม่ลงมือและเล็งเพื่อน รอบแรก สิทธิ์พร้อม: ดาเมจเป้าหมายหลัก ${marked} · ไม่มีสถานะอื่น ไม่ใช่ดาเมจรับประกัน</p>`}</div></li>`; }).join('')}</ul>${unlock ? `<h3>สกิลติดตัวประจำอาชีพ</h3><div class="character-passive"><strong>${passiveText[unlock.passive].name}</strong><p>${stars >= 5 ? 'ปลดล็อกแล้ว' : 'ยังล็อก · ปลดที่ ★5'}</p><p>${passiveText[unlock.passive].help(data)}</p></div>` : tree?.passive ?? ''}<p class="camp-note">${tree ? 'ปลดและติดสกิลได้ในแท็บความถนัด · ดาวให้แต้มต้นไม้ +1 ต่อดาว' : 'ความถนัดจากแต้มเลเวลเลือกได้ในแท็บความถนัด'}</p>`;
}

const deltaText = (a: number, b: number) => b === a ? 'เท่าเดิม' : `${b > a ? '+' : '−'}${Math.abs(b-a)}`;
const deltaClass = (a: number, b: number) => b === a ? 'same' : b > a ? 'gain' : 'loss';
export function equipmentEffects(s: CharacterState, map: MapDefinition, h: HeroDefinition): string {
  const sets = wornSets(map.equipment, s.members[h.id]?.gear), specials = h.gear?.specials ?? [];
  return [sets.map(v => `<li><b>ชุด${v.name} ${v.pieces}/4</b><small>2 ชิ้น ${v.pieces >= 2 ? 'ทำงาน' : 'ยังไม่ครบ'}: ${v.two}</small><small>4 ชิ้น ${v.pieces >= 4 ? 'ทำงาน' : 'ยังไม่ครบ'}: ${v.four}</small></li>`).join(''), specials.map(v => `<li>★ ${specialText[v]}</li>`).join(''),heroBossEffect(h)].join('') || '<li>ไม่มีเซ็ตหรือคุณสมบัติพิเศษ</li>';
}
export function characterEquipmentComparison(before: CharacterState, after: CharacterState, map: MapDefinition, h: HeroDefinition, next: HeroDefinition, item: Item | readonly Item[], template: EncounterDefinition, baseCamp = false): string {
  const items = 'slot' in item ? [item] : item; const stats = characterStats(before, map, h, template), proposed = characterStats(after, map, next, template);
  const currentData = withParty(template, [h]), nextData = withParty(template, [next]);
  const card = (it: Item | undefined, label: string) => `<section class="comparison-item"><h4>${label}</h4>${it ? `${gearArt(it)}<b>${itemName(it)} Lv${it.level}</b><small>${itemLines(map.equipment, it).join(' · ')}</small>` : '<p>ช่องว่าง</p>'}</section>`;
  return `<section class="gear-comparison" aria-labelledby="comparison-title"><button id="comparison-back" data-world="comparison-back" class="secondary">← กลับอุปกรณ์</button><h3 id="comparison-title">เปรียบเทียบก่อนสวมใส่</h3><p class="camp-note">กำลังทดลองเท่านั้น · ยังไม่เปลี่ยนอุปกรณ์หรือเซฟ</p><div class="comparison-items">${items.map(it=>card(before.members[h.id]?.gear?.[it.slot], 'สวมอยู่ · '+slotText[it.slot])+card(it, 'ทดลองใส่ · '+slotText[it.slot])).join('')}</div>
    <h3>ค่าสถานะตัวละคร</h3><table class="comparison-table"><thead><tr><th scope="col">ค่า</th><th scope="col">สวมอยู่</th><th scope="col">ทดลอง</th><th scope="col">ผลต่าง</th></tr></thead><tbody>${stats.map((v,i) => `<tr data-stat="${v.id}"><th scope="row">${v.name}</th><td>${v.value}${v.unit}</td><td>${proposed[i]!.value}${v.unit}</td><td class="${deltaClass(v.value, proposed[i]!.value)}">${deltaText(v.value, proposed[i]!.value)}${v.value === proposed[i]!.value ? '' : v.unit}</td></tr>`).join('')}</tbody></table><p class="camp-note">${baseCamp ? 'ค่ายหลัก: แสดงเลือดสูงสุดสำหรับการเดินทางครั้งถัดไป' : `HP ปัจจุบัน ${before.hp[h.id] ?? 0} → ${after.hp[h.id] ?? 0} · เพิ่มเลือดสูงสุดไม่ฟื้นเลือด ลดเลือดสูงสุดจะจำกัด HP ให้ไม่เกินค่าใหม่`}</p>
    <h3>ผลต่อสกิลที่ปลดล็อกแล้ว</h3><p class="camp-note">เทียบพลังพื้นฐานก่อนเงื่อนไขการต่อสู้ ไม่ใช่ดาเมจรับประกัน · เปิดแต่ละท่าเพื่ออ่านก่อน–หลัง โดยเฉพาะท่าที่มีหลายผลและการสวนกลับ</p><div class="comparison-skills">${h.actions.map(a => { const v = characterSkillMetric(a,h,template), n = characterSkillMetric(a,next,template),showBoss=h.gear?.boss?.power==='focus'||next.gear?.boss?.power==='focus',marked=showBoss?markedSkillExample(a,h,template):undefined,proposedMarked=showBoss?markedSkillExample(a,next,template):undefined; return `<details data-skill="${a}"><summary><strong>${template.skills[a].name}</strong><span>${v.value === undefined ? 'ผลพิเศษ · ดูเงื่อนไข' : `${v.label} <b>${v.value} → ${n.value}</b> <em class="${deltaClass(v.value,n.value!)}">(${deltaText(v.value,n.value!)})</em>`}</span>${v.secondary && n.secondary ? `<span>${v.secondary.label} <b>${v.secondary.value} → ${n.secondary.value}</b> <em class="${deltaClass(v.secondary.value,n.secondary.value)}">(${deltaText(v.secondary.value,n.secondary.value)})</em></span>` : ''}</summary><small>${v.target} · ${v.scaling} · คูลดาวน์ ${template.skills[a].cooldown} รอบ</small><p><b>สวมอยู่:</b> ${skillDescription(a,h.id,currentData)}</p>${marked===undefined?'':`<p class="boss-skill-example">ตัวอย่างศัตรูติดตรา ยังไม่ลงมือและเล็งเพื่อน รอบแรก สิทธิ์พร้อม: <b>${marked} → ${proposedMarked}</b> ดาเมจเป้าหมายหลัก · ไม่มีสถานะอื่น</p>`}<p><b>ทดลอง:</b> ${skillDescription(a,next.id,nextData)}</p></details>`; }).join('')}</div>
    <h3>เซ็ตและคุณสมบัติพิเศษทั้งหมด</h3><p class="camp-note">ตรวจโบนัสที่ได้หรือเสียเมื่อเปลี่ยนชิ้น รวมชุด 2/4 ชิ้น ผลตามเงื่อนไขไม่รวมในพลังพื้นฐานด้านบน</p><div class="comparison-effects"><section><h4>สวมอยู่</h4><ul>${equipmentEffects(before,map,h)}</ul></section><section><h4>ทดลองใส่</h4><ul>${equipmentEffects(after,map,next)}</ul></section></div><div class="comparison-footer"><button id="comparison-equip" data-world="comparison-equip" class="primary">${icon('act-confirm')}สวมใส่${items.length > 1 ? 'ชุดนี้' : 'ชิ้นนี้'}</button><button data-world="comparison-back" class="secondary">ยกเลิก</button></div></section>`;
}

// Big skill trees (A6): three branches of four tiers, then the battle loadout picker.
function bigTalents(s: CharacterState, map: MapDefinition, id: string, data: EncounterDefinition, h: HeroDefinition, base: HeroDefinition): string {
  const m = s.members[id]!, nodes = map.talents[id]!, hd = withParty(data, [h]);
  const points = talentPoints(map, m, id), free = points - talentsSpent(m.talents), names = bigBranches[id] ?? ['สาย A', 'สาย B', 'สาย C'];
  const tiers = map.progression.treeTiers;
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงชั้นก่อนหน้าในสายนี้', choice: 'เลือกอีกทางไว้แล้ว', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const node = (def: TalentNodeDef) => {
    const granted = !!m.grants?.includes(def.id), rank = granted ? def.max : m.talents?.[def.id] ?? 0, reason = memberTalentReason(map, id, m, def.id);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' || reason === 'level' || reason === 'choice' ? 'locked' : 'open';
    const note = granted ? 'ได้ฟรีจากดาวเดิม' : reason === 'level' ? `เปิดที่ Lv${tiers[(def.tier ?? 1) - 1]}` : reason ? why[reason] : 'แตะเพื่อลง 1 แต้ม';
    const kind = 'unlock' in def.effect ? ' skill' : def.choice ? ' choice' : def.tier === 4 ? ' capstone' : '';
    return `<button id="character-talent-${def.id}" data-world="character-talent" data-node="${def.id}" class="talent-node${kind}" data-state="${state}" aria-disabled="${!!reason}" aria-label="${def.name} ขั้น ${rank}/${def.max} · ${talentHelp(def, hd)} · ${note}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, hd)}</small><small>${note}</small></button>`;
  };
  const branch = (b: 'a' | 'b' | 'c', i: number) => `<div class="talent-branch" data-branch="${b}"><h4>${names[i]}</h4>${[1, 2, 3, 4].map(t => { const row = nodes.filter(n => n.branch === b && n.tier === t);
    return `<div class="talent-tier" data-tier="${t}"><p class="talent-gate">ชั้น ${t} · Lv${tiers[t - 1]}${row.some(n => n.choice) ? ' · เลือก 1 ใน 2' : ''}</p><div class="talent-row">${row.map(node).join('')}</div></div>`; }).join('')}</div>`;
  const choices = skillChoices(base, map, m.talents, m.grants), now: ActionId[] = h.actions.filter(a => a !== 'attack'), size = map.progression.loadoutSize;
  const loadout = choices.map(a => { const on = now.includes(a), why = !on && now.length >= size ? `ติดครบ ${size} ช่องแล้ว ถอดก่อน` : on && now.length <= 1 ? 'ต้องติดอย่างน้อย 1 สกิล' : '';
    return `<button id="character-loadout-${a}" data-world="character-loadout" data-skill="${a}" class="loadout-skill" aria-pressed="${on}" aria-disabled="${!!why}" aria-label="${hd.skills[a].name} · ${on ? 'ติดอยู่' : 'ยังไม่ติด'}${why ? ` · ${why}` : ''}">${icon(a)}<b>${hd.skills[a].name}</b><small>${on ? 'ติดอยู่' : why || 'แตะเพื่อติด'}</small></button>`; }).join('');
  return `<section class="talent-tree big-tree" aria-label="ต้นไม้สกิลของ${heroText[id]!.name}"><p class="talent-points" role="status">แต้มเหลือ <strong>${free}</strong>/${points} · ได้ 1 แต้มทุกเลเวลอัปและทุกดาว</p>
    <h3>สกิลติดตัวในศึก (${now.length}/${size})</h3><div class="loadout-list">${loadout}</div><p class="camp-note">ศึกมี 4 ปุ่ม: โจมตีปกติ + สกิลที่ติดไว้ · เปลี่ยนได้ที่ค่ายหรือบนแผนที่นอกการต่อสู้</p>
    <div class="talent-branches big">${(['a', 'b', 'c'] as const).map(branch).join('')}</div><p class="camp-note">ลงแต้มได้ทันทีนอกการต่อสู้ · คืนแต้มและเปลี่ยนสายได้ฟรีที่ครูฝึกในค่าย</p></section>`;
}
export function characterTalents(s: CharacterState, map: MapDefinition, id: string, data: EncounterDefinition, h?: HeroDefinition, base?: HeroDefinition): string {
  const m = s.members[id]!, nodes = map.talents[id];
  if (!nodes) return '<p>ตัวละครนี้ไม่มีต้นไม้ความถนัด</p>';
  if (isBigTree(nodes) && h && base) return bigTalents(s, map, id, data, h, base);
  const points = talentPoints(map, m, id), free = points - talentsSpent(m.talents), branches = talentBranches[id] ?? ['สาย A', 'สาย B'];
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงขั้นก่อนหน้า', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const node = (n: TalentNode) => {
    const def = nodes.find(v => v.id === n)!, rank = m.talents?.[n] ?? 0, reason = memberTalentReason(map, id, m, n);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' ? 'locked' : 'open';
    return `<button id="character-talent-${n}" data-world="character-talent" data-node="${n}" class="talent-node${n.endsWith('3') ? ' capstone' : ''}" data-state="${state}" aria-disabled="${!!reason}" aria-label="${def.name} ขั้น ${rank}/${def.max} · ${talentHelp(def,data)}${reason?` · ${why[reason]}`:''}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, data)}</small><small>${reason ? why[reason] : 'แตะเพื่อลง 1 แต้ม'}</small></button>`;
  };
  return `<section class="talent-tree" aria-label="ต้นไม้ความถนัดของ${heroText[id]!.name}"><p class="talent-points" role="status">แต้มเหลือ <strong>${free}</strong>/${points} · ได้ 1 แต้มทุกเลเวลอัป</p><div class="talent-root">${node('root')}</div><div class="talent-branches">${(['a', 'b'] as const).map((b, i) => `<div class="talent-branch"><h4>${branches[i]}</h4>${node(`${b}1`)}${node(`${b}2`)}<p class="talent-gate">ยอดสาย: ลงสายนี้ครบ 4 แต้ม</p>${node(`${b}3`)}</div>`).join('')}</div><p class="camp-note">ลงแต้มได้ทันทีนอกการต่อสู้ · คืนแต้มและเปลี่ยนสายได้ฟรีที่ครูฝึกในค่าย</p></section>`;
}
