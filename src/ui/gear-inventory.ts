import type { EquipmentEntry } from '../core/world/auto-equipment';
import { GEAR_SLOTS, SET_IDS, type GearSlot, type SetId } from '../core/world/types';
import { icon } from './icons';
import { rarityText, setText, slotText } from './th';

export interface GearFilters { kind?:'all'|'boss'|'normal'; set: 'all'|'none'|SetId; slot: 'all'|GearSlot; rarity: string; source: 'all'|'found'|'owned'; sort: 'rarity'|'level'|'set'; compatible: boolean }
export const newGearFilters = (): GearFilters => ({kind:'all',set:'all',slot:'all',rarity:'all',source:'all',sort:'rarity',compatible:false});
export function filteredEquipment(entries: readonly EquipmentEntry[],f: GearFilters,heroId?: string): EquipmentEntry[] {
  return entries.filter(e=>(!f.kind||f.kind==='all'||(f.kind==='boss'?!!e.item.boss:!e.item.boss))&&(f.set==='all'||(f.set==='none'?!e.item.set:e.item.set===f.set))&&(f.slot==='all'||e.item.slot===f.slot)&&(f.rarity==='all'||e.item.rarity===Number(f.rarity))&&(f.source==='all'||(f.source==='found'?e.item.uid===0:e.item.uid>0))&&(!f.compatible||!heroId||e.item.slot!=='weapon'||e.item.hero===heroId))
    .sort((a,b)=>f.sort==='level'?b.item.level-a.item.level||b.item.rarity-a.item.rarity:f.sort==='set'?(a.item.set??'zz').localeCompare(b.item.set??'zz')||b.item.rarity-a.item.rarity:b.item.rarity-a.item.rarity||b.item.level-a.item.level);
}
// `chips`: the character bag shows quick chips, so every select moves into the folded "more filters" panel.
export function gearFilters(f: GearFilters,prefix: string,heroId?: string,chips=false): string {
  const select=(field:keyof GearFilters,label:string,values:[string,string][])=>`<label>${label}<select id="${prefix}gear-filter-${field}" data-gear-filter="${field}">${values.map(([value,text])=>`<option value="${value}"${String(f[field])===value?' selected':''}>${text}</option>`).join('')}</select></label>`;
  const set=select('set','เซ็ต',[['all','ทุกเซ็ต'],['none','ไม่มีเซ็ต'],...SET_IDS.map(id=>[id,`ชุด${setText[id]}`] as [string,string])]);
  return `<div class="gear-filters">${chips?'':set}<details class="gear-extra-filters"><summary>${chips?`${icon('act-filter')}ตัวกรอง`:'กรองเพิ่มเติม / เรียงรายการ'}</summary><div class="gear-filter-grid">${chips?set:''}${select('kind','ประเภท',[['all','ทุกประเภท'],['boss','เฉพาะบอส'],['normal','อุปกรณ์ทั่วไป']])}${select('slot','ช่องอุปกรณ์',[['all','ทุกช่อง'],...GEAR_SLOTS.map(id=>[id,slotText[id]] as [string,string])])}${select('rarity','ความหายาก',[['all','ทุกระดับ'],...rarityText.map((t,i)=>[String(i),t] as [string,string])])}${select('source','ที่มา',[['all','ทุกที่มา'],['found','เจอรอบนี้'],['owned','ของที่มีอยู่']])}${select('sort','เรียงตาม',[['rarity','ความหายาก'],['level','เลเวล'],['set','เซ็ต']])}</div>${heroId?`<label class="gear-compatible"><input type="checkbox" id="${prefix}gear-filter-compatible" data-gear-filter="compatible"${f.compatible?' checked':''}> ใช้ได้กับตัวละครนี้เท่านั้น</label>`:''}<button id="${prefix}gear-filter-reset" data-gear-reset class="secondary">ล้างตัวกรอง</button></details></div>`;
}
export function changeGearFilter(f: GearFilters,control: HTMLInputElement|HTMLSelectElement): void {
  const field=control.dataset.gearFilter as keyof GearFilters;
  if(field==='kind'&&['all','boss','normal'].includes(control.value))f.kind=control.value as GearFilters['kind'];
  else if(field==='compatible')f.compatible=(control as HTMLInputElement).checked;
  else if(field==='set'&&(control.value==='all'||control.value==='none'||SET_IDS.includes(control.value as SetId)))f.set=control.value as GearFilters['set'];
  else if(field==='slot'&&(control.value==='all'||GEAR_SLOTS.includes(control.value as GearSlot)))f.slot=control.value as GearFilters['slot'];
  else if(field==='rarity'&&(control.value==='all'||/^[0-4]$/.test(control.value)))f.rarity=control.value;
  else if(field==='source'&&['all','found','owned'].includes(control.value))f.source=control.value as GearFilters['source'];
  else if(field==='sort'&&['rarity','level','set'].includes(control.value))f.sort=control.value as GearFilters['sort'];
}
