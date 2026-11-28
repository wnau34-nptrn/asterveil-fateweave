import { hatchReason } from '../core/world/pets';
import { petBlessing } from '../core/world/pet-blessings';
import type { MapDefinition, PetBlessing, PetDefinition, PetKind, Profile } from '../core/world/types';
import { blessingIcon, petPortrait } from './pet-art';

// PET-3: the camp pet page (hatch an egg, choose the pet for the next expedition). Level-up with food is PET-6, battle
// assists PET-4/5. Pure: every number comes from `map.pets` and the profile; the commands run in the rules.
export const petBlessingText = (kind: PetBlessing, value: number): { name: string; text: string } => ({
  luck: { name: 'โชค', text: `หีบธรรมดามีโอกาส ${value}% เปิดเป็นหีบหายาก` },
  forage: { name: 'หาของ', text: `ทุกหีบและการค้นแคมป์ร้างได้แร่ดาวเพิ่ม +${value}` },
  farsight: { name: 'มองไกล', text: `เปิดหมอกไกลขึ้น +${value} ช่อง` },
  ward: { name: 'ลดการเจอศัตรู', text: `ศึกสุ่มเกิดน้อยลง ${value}% (ไม่ลดอีลิท/บอส/เหตุการณ์)` },
  lantern: { name: 'ไฟนำทาง', text: `เห็นหีบและเหตุการณ์ในหมอกไกลอีก ${value} ช่อง (เห็นเฉพาะจุด พื้นยังมืด)` },
  renewal: { name: 'ฟื้นฟู', text: `เดินครบทุก 10 ก้าว ทีมฟื้น HP ${value}%` },
}[kind]);
const hatchWhy: Record<string, string> = { egg: 'ยังไม่มีไข่ · ชนะบอสแผนที่ 4 และ 5 ครั้งแรกเพื่อรับไข่เลือกได้', owned: '', locked: 'ยังไม่เปิดระบบสัตว์เลี้ยง', unknown: '' };

const levelStep = (map: MapDefinition, def: PetDefinition, level: number): number => petBlessing({ pet: { kind: def.id, level } }, map, def.blessing.kind);

export function petPage(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition): string {
  const book = profile.pets; const eggs = book?.eggs ?? 0; const shards = book?.shards ?? 0;
  const eggLine = `<div class="pet-eggs"><span class="glass-capsule">ไข่เลือกได้ <b>${eggs}</b></span><span class="glass-capsule">เศษไข่ <b>${shards}/${map.pets.eggShards}</b></span></div>`;
  const note = `<p class="camp-note">ฟักไข่แล้วเลือกสัตว์ 1 ตัวพาไปเดินทาง · พรของมันทำงานบนแผนที่ตลอดการเดินทาง และเปลี่ยนตัวได้เฉพาะที่ค่าย</p>`;
  const cards = map.pets.kinds.map(def => card(profile, maps, map, def)).join('');
  const none = book?.owned.length ? `<button class="secondary" data-lobby="pet-choose" data-pet=""${book.chosen ? '' : ' disabled'} aria-pressed="${!book.chosen}">เดินทางโดยไม่พาสัตว์</button>` : '';
  return `<div class="pet-page" aria-labelledby="pet-title">${eggLine}${note}${cards}${none}</div>`;
}
function card(profile: Profile, maps: readonly MapDefinition[], map: MapDefinition, def: PetDefinition): string {
  const book = profile.pets; const own = book?.owned.find(p => p.kind === def.id); const chosen = book?.chosen === def.id;
  const level = own?.level ?? 1;
  const now = petBlessingText(def.blessing.kind, levelStep(map, def, level)); const later = petBlessingText(def.blessing.kind, def.blessing.at6);
  const reason = own ? '' : hatchReason(profile, maps, map, def.id as PetKind);
  const act = own
    ? `<button class="${chosen ? 'primary' : 'secondary'}" data-lobby="pet-choose" data-pet="${def.id}"${chosen ? ' disabled' : ''} aria-pressed="${chosen}">${chosen ? 'พาไปเดินทาง' : 'เลือกพาไป'}</button>`
    : `<button class="primary" data-lobby="pet-hatch" data-pet="${def.id}"${reason ? ' disabled' : ''}>ฟักไข่เป็น${def.name}</button>${reason ? `<span class="pet-why">${hatchWhy[reason] ?? ''}</span>` : ''}`;
  return `<section id="pet-${def.id}" class="pet-card" data-owned="${!!own}" data-chosen="${chosen}">${petPortrait(def.id as PetKind)}
    <div><h3>${def.name}${own ? `<small>Lv${own.level}</small>` : ''}</h3><p>${blessingIcon(def.blessing.kind)}<b>พร${now.name}</b> · ${now.text}</p>${level >= map.pets.blessingLevel ? '' : `<p class="pet-why">เลเวล ${map.pets.blessingLevel} ขึ้นไป: ${later.text}</p>`}</div>
    <div class="pet-actions">${act}</div></section>`;
}
