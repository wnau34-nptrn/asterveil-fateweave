import {heroBossEffect} from './boss-equipment';
import type { ActionId, EncounterDefinition, HeroDefinition } from '../core/battle/types';
import type { Item, MapDefinition, MemberProgress, TalentNode, TalentNodeDef } from '../core/world/types';
import { withParty } from '../core/battle/engine';
import { expToNext, skillChoices } from '../core/world/world';
import { isBigTree, memberTalentReason, talentPoints, talentsSpent } from '../core/world/talents';
import { icon } from './icons';
import { heroArt, starRow } from './portraits';
import { heroText, itemLines, itemName, itemOwner, passiveText, rarityText, setText, skillDescription, specialText, bigBranches, talentBranches, talentHelp, wornSets, slotIcon, slotText, gearStatName, statText } from './th';
import { statLines } from '../core/world/equipment';
import { markedSkillExample, characterSkillMetric, characterStats, type CharacterState } from './character-metrics';
import { gearArt, setEmblem } from './equip-art';

export const characterTabs = { overview: 'ภาพรวม', gear: 'อุปกรณ์', skills: 'สกิล', talents: 'ความถนัด' } as const;
export type CharacterTab = keyof typeof characterTabs;
// ART-UI-ICONS-002 line icons for tabs and stats (decorative; the Thai label stays).
export const characterTabIcons = { overview: 'tab-overview', gear: 'tab-gear', skills: 'tab-skills', talents: 'tab-tree' } as const;
const statIcons: Record<string, Parameters<typeof icon>[0]> = { hp: 'stat-hp', attack: 'stat-attack', speed: 'stat-speed', support: 'stat-support', armour: 'stat-armour', resist: 'stat-resist', leech: 'stat-leech', barrier: 'stat-barrier', regen: 'stat-regen', luck: 'stat-luck', 'party-luck': 'stat-luck' };

// ART-UI-MODERN-001 overview: the hero in a lit ring with level and stars, an EXP bar, role chips, then stat chips
// (each opens its explanation).
export function characterOverview(s: CharacterState, map: MapDefinition, h: HeroDefinition, template?: EncounterDefinition): string {
  const m = s.members[h.id]!, level = m.level ?? 1, max = level >= map.progression.levelCap, need = max ? 1 : expToNext(map, level), exp = max ? 1 : m.exp ?? 0;
  return `<div class="overview-hero"><div class="hero-ring">${heroArt(h.id)}<span class="hero-badge">Lv${level} ${starRow(m.stars, map.company.maxStars)}</span></div>
    <div class="exp-row"><span>${max ? 'เลเวลสูงสุด' : `EXP ${exp}/${need}`}</span>${m.wound ? `<span class="down">บาดแผล −${m.wound}% เลือดสูงสุด</span>` : ''}</div><div class="ui-meter" role="presentation"><i style="width:${Math.round(exp / need * 100)}%"></i></div>
    <div class="role-chips"><span class="ui-pill">${icon(h.lane === 'front' ? 'stat-armour' : 'stat-luck')}${h.lane === 'front' ? 'แนวหน้า' : 'แนวหลัง'}</span><span class="ui-pill">${heroText[h.id]!.role}</span></div></div>
    <p class="hero-help">${heroText[h.id]!.help}</p>${template ? `<div class="character-stat-list">${characterStats(s, map, h, template).map(v => `<details class="character-stat" id="character-stat-${v.id}"><summary><span>${statIcons[v.id] ? icon(statIcons[v.id]!) : ''}${v.name}</span><strong>${v.value}${v.unit}</strong></summary><p>${v.help}</p></details>`).join('')}</div><p class="camp-note">รวมเลเวล ดาว ความถนัด อุปกรณ์ และบาดแผล · แตะค่าเพื่ออ่านความหมาย</p>` : ''}`;
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
  const currentData = withParty(template, [h]), nextData = withParty(template, [next]), rules = map.equipment, worn = (it: Item) => before.members[h.id]?.gear?.[it.slot];
  const delta = (a: number, b: number, unit: string) => b === a ? '' : `<em class="${b > a ? 'up' : 'down'}">${b > a ? '▲' : '▼'} ${Math.abs(b - a)}${unit}</em>`;
  // ART-UI-MODERN-001 board 02: one piece gets its head card, main stat with ▲▼, affix quality bars and the worn comparison;
  // an automatic plan lists each swap.
  const head = (it: Item) => { const was = worn(it), set = it.set && wornSets(rules, after.members[h.id]?.gear).find(v => v.id === it.set), had = it.set && wornSets(rules, before.members[h.id]?.gear).find(v => v.id === it.set);
    return `<div class="item-card-head">${gearArt(it)}<div><small data-rarity="${it.rarity}">${rarityText[it.rarity]} · ${slotText[it.slot]}</small><b>${itemName(it)}</b><small>Lv${it.level}${it.plus ? ` +${it.plus}` : ''} · ${itemOwner(it)}</small></div></div>
      <div class="item-pills">${it.set ? `<span class="ui-pill">${setEmblem(it.set)}ชุด${setText[it.set]} · ${had ? had.pieces : 0}/4 → ${set ? set.pieces : 0}/4</span>` : ''}<span class="ui-pill">${icon(slotIcon[it.slot])}${was ? `แทน ${itemName(was)}` : 'ช่องว่าง'}</span></div>`; };
  const detail = (it: Item) => { const was = worn(it), lines = statLines(rules, it), old = was ? statLines(rules, was).filter(l => !l.affix) : [], [lo, hi] = rules.quality;
    const main = lines.filter(l => !l.affix).map(l => { const [name, unit] = gearStatName[l.stat], prev = old.find(o => o.stat === l.stat)?.value ?? 0;
      return `<section class="main-stat"><span>${name}หลัก</span><strong>${l.value}${unit}</strong>${delta(prev, l.value, unit)}<small>ที่สวมอยู่ ${prev}${unit} → ${l.value}${unit}</small></section>`; }).join('');
    const affixes = lines.filter(l => l.affix).map((l, i) => { const q = it.q?.affixes[i] ?? 100; return `<li><span>${statText[l.stat](l.value)}</span><b>${q}%</b><div class="ui-meter"><i style="width:${Math.round((q - lo) / (hi - lo) * 100)}%"></i></div></li>`; }).join('');
    const extra = [...(it.boss ? [itemLines(rules, it)[0]!] : []), ...(it.special ? [specialText[it.special]] : []), ...(it.transferSlot !== undefined ? [`ถ่ายโอนได้เฉพาะคุณสมบัติช่อง ${it.transferSlot + 1}`] : [])];
    return `${main}${affixes ? `<div class="affix-head"><h4>คุณสมบัติรอง</h4><small>คุณภาพ ${lo}–${hi}%</small></div><ul class="affix-list">${affixes}</ul>` : ''}${extra.length ? `<p class="item-extra">${extra.join(' · ')}</p>` : ''}`; };
  const swaps = `<ul class="swap-list">${items.map(it => { const was = worn(it); return `<li>${was ? gearArt(was) : `<span class="gear-art">${icon(slotIcon[it.slot])}</span>`}<span aria-hidden="true">→</span>${gearArt(it)}<div><b>${itemName(it)} Lv${it.level}</b><small>${slotText[it.slot]} · ${was ? `แทน ${itemName(was)}` : 'ช่องว่าง'}</small></div></li>`; }).join('')}</ul>`;
  const one = items.length === 1 ? items[0]! : undefined;
  return `<section class="gear-comparison" aria-labelledby="comparison-title"><div class="comparison-head"><button id="comparison-back" data-world="comparison-back" class="secondary" aria-label="กลับอุปกรณ์">${icon('close')}</button><h3 id="comparison-title">${one ? 'รายละเอียดอุปกรณ์' : 'ชุดแนะนำ'}</h3></div><p class="camp-note">ทดลองเท่านั้น · ยังไม่เปลี่ยนอุปกรณ์หรือเซฟ</p>
    ${one ? `<div class="item-card detail-card" data-rarity="${one.rarity}">${head(one)}</div>${detail(one)}` : swaps}
    <section class="compare-card"><h4>เทียบที่สวมอยู่</h4><table class="comparison-table"><thead class="sr-only"><tr><th scope="col">ค่า</th><th scope="col">สวมอยู่</th><th scope="col">ทดลอง</th><th scope="col">ผลต่าง</th></tr></thead><tbody>${stats.map((v,i) => { const b = proposed[i]!.value; return `<tr data-stat="${v.id}" class="${deltaClass(v.value, b)}"><th scope="row">${statIcons[v.id] ? icon(statIcons[v.id]!) : ''}${v.name}</th><td>${v.value}${v.unit}</td><td>${b}${v.unit}</td><td class="${deltaClass(v.value, b)}">${v.value === b ? '' : `${b > v.value ? '▲' : '▼'} ${Math.abs(b - v.value)}${v.unit}`}<span class="sr-only">${deltaText(v.value, b)}</span></td></tr>`; }).join('')}</tbody></table><p class="camp-note">${baseCamp ? 'ค่ายหลัก: แสดงเลือดสูงสุดสำหรับการเดินทางครั้งถัดไป' : `HP ปัจจุบัน ${before.hp[h.id] ?? 0} → ${after.hp[h.id] ?? 0} · เพิ่มเลือดสูงสุดไม่ฟื้นเลือด ลดเลือดสูงสุดจะจำกัด HP ให้ไม่เกินค่าใหม่`}</p></section>
    <h3>ผลต่อสกิล</h3><p class="camp-note">พลังพื้นฐานก่อนเงื่อนไขการต่อสู้ ไม่ใช่ดาเมจรับประกัน · แตะท่าเพื่ออ่านก่อน–หลัง</p><div class="comparison-skills">${h.actions.map(a => { const v = characterSkillMetric(a,h,template), n = characterSkillMetric(a,next,template),showBoss=h.gear?.boss?.power==='focus'||next.gear?.boss?.power==='focus',marked=showBoss?markedSkillExample(a,h,template):undefined,proposedMarked=showBoss?markedSkillExample(a,next,template):undefined; return `<details data-skill="${a}"><summary><strong>${template.skills[a].name}</strong><span>${v.value === undefined ? 'ผลพิเศษ · ดูเงื่อนไข' : `${v.label} <b>${v.value} → ${n.value}</b> <em class="${deltaClass(v.value,n.value!)}">(${deltaText(v.value,n.value!)})</em>`}</span>${v.secondary && n.secondary ? `<span>${v.secondary.label} <b>${v.secondary.value} → ${n.secondary.value}</b> <em class="${deltaClass(v.secondary.value,n.secondary.value)}">(${deltaText(v.secondary.value,n.secondary.value)})</em></span>` : ''}</summary><small>${v.target} · ${v.scaling} · คูลดาวน์ ${template.skills[a].cooldown} รอบ</small><p><b>สวมอยู่:</b> ${skillDescription(a,h.id,currentData)}</p>${marked===undefined?'':`<p class="boss-skill-example">ตัวอย่างศัตรูติดตรา ยังไม่ลงมือและเล็งเพื่อน รอบแรก สิทธิ์พร้อม: <b>${marked} → ${proposedMarked}</b> ดาเมจเป้าหมายหลัก · ไม่มีสถานะอื่น</p>`}<p><b>ทดลอง:</b> ${skillDescription(a,next.id,nextData)}</p></details>`; }).join('')}</div>
    <h3>เซ็ตและคุณสมบัติพิเศษ</h3><p class="camp-note">โบนัสชุด 2/4 ชิ้นที่ได้หรือเสีย · ผลตามเงื่อนไขไม่รวมในพลังพื้นฐานด้านบน</p><div class="comparison-effects"><section><h4>สวมอยู่</h4><ul>${equipmentEffects(before,map,h)}</ul></section><section><h4>ทดลองใส่</h4><ul>${equipmentEffects(after,map,next)}</ul></section></div><div class="comparison-footer"><button id="comparison-equip" data-world="comparison-equip" class="primary">${icon('act-confirm')}สวมใส่${items.length > 1 ? 'ชุดนี้' : ''}</button>${baseCamp && one && one.uid > 0 ? `<button data-world="character-forge" data-uid="${one.uid}" class="secondary">${icon('tab-forge')}พัฒนา</button>` : ''}<button data-world="comparison-back" class="secondary">ยกเลิก</button></div></section>`;
}

// Big skill trees (A6) as a node graph (ART-UI-MODERN-001 board 04): three branch columns of four tiers joined by
// lines (gold where both ends have ranks). Node shapes: skill circle, choice diamond, passive square, capstone crest.
// Tapping a node only selects it; its card below spends the point. Then the battle loadout and a shape legend.
const statNodeIcon = { hp: 'stat-hp', attack: 'stat-attack', skill: 'stat-support', armour: 'stat-armour' } as const;
function bigTalents(s: CharacterState, map: MapDefinition, id: string, data: EncounterDefinition, h: HeroDefinition, base: HeroDefinition, selected?: string): string {
  const m = s.members[id]!, nodes = map.talents[id]!, hd = withParty(data, [h]);
  const points = talentPoints(map, m, id), free = points - talentsSpent(m.talents), names = bigBranches[id] ?? ['สาย A', 'สาย B', 'สาย C'];
  const tiers = map.progression.treeTiers, branches = ['a', 'b', 'c'] as const;
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงชั้นก่อนหน้าในสายนี้', choice: 'เลือกอีกทางไว้แล้ว', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const info = (def: TalentNodeDef) => {
    const granted = !!m.grants?.includes(def.id), rank = granted ? def.max : m.talents?.[def.id] ?? 0, reason = memberTalentReason(map, id, m, def.id);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' || reason === 'level' || reason === 'choice' ? 'locked' : 'open';
    const note = granted ? 'ได้ฟรีจากดาวเดิม' : reason === 'level' ? `เปิดที่ Lv${tiers[(def.tier ?? 1) - 1]}` : reason ? why[reason]! : 'ลงได้ 1 แต้ม';
    const kind = 'unlock' in def.effect ? 'skill' : def.choice ? 'choice' : def.tier === 4 ? 'capstone' : 'passive';
    const e = def.effect, glyph: Parameters<typeof icon>[0] = 'unlock' in e ? e.unlock : 'stat' in e ? statNodeIcon[e.stat] : (def.choice ?? nodes.find(n => n.branch === def.branch && n.choice)?.choice ?? 'stat-level') as ActionId;
    return { rank, reason, state, note, kind, glyph };
  };
  const ranked = (b: string, t: number) => nodes.some(n => n.branch === b && n.tier === t && info(n).rank > 0);
  const pick = nodes.find(n => n.id === selected) ?? nodes.find(n => info(n).state === 'open' && !info(n).reason) ?? nodes[0]!;
  const node = (def: TalentNodeDef) => { const v = info(def);
    return `<div class="node-wrap"><button id="character-talent-${def.id}" data-world="talent-pick" data-node="${def.id}" class="talent-node ${v.kind}" data-state="${v.state}" aria-pressed="${def === pick}" aria-label="${def.name} ขั้น ${v.rank}/${def.max} · ${talentHelp(def, hd)} · ${v.note}">${icon(v.glyph)}<i>${v.rank}/${def.max}</i></button><small class="node-name" aria-hidden="true">${def.name}</small></div>`; };
  const grid = `<div class="tree-grid"><span></span>${names.map(n => `<h4>${n}</h4>`).join('')}${[1, 2, 3, 4].map(t => `<span class="tree-lv">Lv${tiers[t - 1]}</span>${branches.map(b => { const row = nodes.filter(n => n.branch === b && n.tier === t);
    return `<div class="tree-cell${row.length > 1 ? ' pair' : ''}" data-tier="${t}" data-up="${t > 1 && ranked(b, t - 1) && ranked(b, t) ? 'lit' : ''}" data-down="${t < 4 && ranked(b, t) && ranked(b, t + 1) ? 'lit' : ''}">${row.map(node).join('')}</div>`; }).join('')}`).join('')}</div>`;
  const p = info(pick), kindText = { skill: 'สกิล', choice: 'ปรับสกิล · เลือก 1 ใน 2', passive: 'พาสซีฟ', capstone: 'ขั้นสูงสุด' }[p.kind];
  const card = `<section class="item-card node-card" aria-label="โหนดที่เลือก"><div class="node-card-head"><span class="node-glyph ${p.kind}" data-state="${p.state}">${icon(p.glyph)}</span><div><b>${pick.name}</b><small>${kindText} · ชั้น ${pick.tier} · ${p.rank}/${pick.max}</small></div></div><p>${talentHelp(pick, hd)}</p><div class="node-card-foot"><small class="node-note">${p.note}</small><button id="character-talent-learn" data-world="character-talent" data-node="${pick.id}" class="primary" aria-disabled="${!!p.reason}">${icon('act-confirm')}ลงแต้ม</button></div></section>`;
  const choices = skillChoices(base, map, m.talents, m.grants), now: ActionId[] = h.actions.filter(a => a !== 'attack'), size = map.progression.loadoutSize;
  const loadout = choices.map(a => { const on = now.includes(a), why = !on && now.length >= size ? `ติดครบ ${size} ช่องแล้ว ถอดก่อน` : on && now.length <= 1 ? 'ต้องติดอย่างน้อย 1 สกิล' : '';
    return `<button id="character-loadout-${a}" data-world="character-loadout" data-skill="${a}" class="loadout-skill" aria-pressed="${on}" aria-disabled="${!!why}" aria-label="${hd.skills[a].name} · ${on ? 'ติดอยู่' : 'ยังไม่ติด'}${why ? ` · ${why}` : ''}">${icon(a)}<b>${hd.skills[a].name}</b><small>${on ? 'ติดอยู่' : why || 'แตะเพื่อติด'}</small></button>`; }).join('');
  return `<section class="talent-tree big-tree node-tree" aria-label="ต้นไม้สกิลของ${heroText[id]!.name}"><div class="tree-head"><h3>เส้นทาง${heroText[id]!.role}</h3><span class="ui-pill talent-points" role="status">${icon('stat-level')}<span>แต้มเหลือ <strong>${free}</strong>/${points}</span></span></div>
    ${grid}${card}
    <div class="loadout-head"><h3>สกิลที่ติดตั้ง</h3><span>${now.length}/${size}</span></div><div class="loadout-list">${loadout}</div>
    <p class="tree-legend" aria-hidden="true"><span class="lg skill"></span>สกิล <span class="lg choice"></span>ปรับสกิล <span class="lg passive"></span>พาสซีฟ <span class="lg capstone"></span>ขั้นสูงสุด</p>
    <p class="camp-note">ได้ 1 แต้มทุกเลเวลอัปและทุกดาว · ศึกมี 4 ปุ่ม: โจมตีปกติ + สกิลที่ติดไว้ · คืนแต้มฟรีที่ครูฝึกในค่าย</p></section>`;
}
export function characterTalents(s: CharacterState, map: MapDefinition, id: string, data: EncounterDefinition, h?: HeroDefinition, base?: HeroDefinition, selected?: string): string {
  const m = s.members[id]!, nodes = map.talents[id];
  if (!nodes) return '<p>ตัวละครนี้ไม่มีต้นไม้ความถนัด</p>';
  if (isBigTree(nodes) && h && base) return bigTalents(s, map, id, data, h, base, selected);
  const points = talentPoints(map, m, id), free = points - talentsSpent(m.talents), branches = talentBranches[id] ?? ['สาย A', 'สาย B'];
  const why: Record<string, string> = { max: 'เต็มแล้ว', locked: 'ต้องลงขั้นก่อนหน้า', points: 'แต้มไม่พอ', unknown: 'ไม่พบความถนัด' };
  const node = (n: TalentNode) => {
    const def = nodes.find(v => v.id === n)!, rank = m.talents?.[n] ?? 0, reason = memberTalentReason(map, id, m, n);
    const state = rank >= def.max ? 'full' : rank ? 'partial' : reason === 'locked' ? 'locked' : 'open';
    return `<button id="character-talent-${n}" data-world="character-talent" data-node="${n}" class="talent-node${n.endsWith('3') ? ' capstone' : ''}" data-state="${state}" aria-disabled="${!!reason}" aria-label="${def.name} ขั้น ${rank}/${def.max} · ${talentHelp(def,data)}${reason?` · ${why[reason]}`:''}"><b>${def.name}</b><i>${rank}/${def.max}</i><small>${talentHelp(def, data)}</small><small>${reason ? why[reason] : 'แตะเพื่อลง 1 แต้ม'}</small></button>`;
  };
  return `<section class="talent-tree" aria-label="ต้นไม้ความถนัดของ${heroText[id]!.name}"><p class="talent-points" role="status">แต้มเหลือ <strong>${free}</strong>/${points} · ได้ 1 แต้มทุกเลเวลอัป</p><div class="talent-root">${node('root')}</div><div class="talent-branches">${(['a', 'b'] as const).map((b, i) => `<div class="talent-branch"><h4>${branches[i]}</h4>${node(`${b}1`)}${node(`${b}2`)}<p class="talent-gate">ยอดสาย: ลงสายนี้ครบ 4 แต้ม</p>${node(`${b}3`)}</div>`).join('')}</div><p class="camp-note">ลงแต้มได้ทันทีนอกการต่อสู้ · คืนแต้มและเปลี่ยนสายได้ฟรีที่ครูฝึกในค่าย</p></section>`;
}
