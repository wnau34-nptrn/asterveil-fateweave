import type { ExpeditionState, MapDefinition, WorldEvent } from '../core/world/types';
import { campProgress } from '../core/world/world';
import { gearArt } from './equip-art';
import { icon, type IconName } from './icons';
import { portrait } from './portraits';
import { itemLines, itemName, rarityText, tomeThai } from './th';

export interface BattleRewards {
  event: Extract<WorldEvent, { type: 'victory' }>;
  before: ExpeditionState;
  after: ExpeditionState;
  title: string;
}
// Disposable presentation only. No persistence or reward mutations belong here.
export function showBattleRewards(root: HTMLElement, map: MapDefinition, reward: BattleRewards, done: () => void): void {
  const { event, before, after } = reward;
  const dialog = document.createElement('dialog');
  dialog.className = 'battle-rewards';
  dialog.setAttribute('aria-labelledby', 'rewards-title');
  // P01: one camp EXP for the whole company; everyone brought (and everyone at home) shares the level.
  const percent = (s: ExpeditionState) => { const c = campProgress(map, s.campXp); return c.need ? Math.min(100, c.exp / c.need * 100) : 100; };
  const gain = event.exp;
  const brought = [...after.roster.deployed, ...after.roster.reserve];
  const members = gain ? `<li class="reward-member reward-camp" data-member="camp"><div><b>เลเวลค่าย</b><span>Lv ${gain.level} · +${gain.gained} EXP</span><div class="reward-exp" role="progressbar" aria-label="EXP ของค่าย" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent(after)}"><i style="width:${percent(after)}%;--from:${percent(before)}%;--full:${gain.levelsUp > 0 ? 100 : percent(after)}%"></i></div>${gain.levelsUp > 0 ? `<strong class="reward-level">ค่ายเลเวลอัป! Lv ${gain.level}</strong>` : ''}${gain.percent < 100 ? '<small>ได้ EXP น้อยลงเพราะเลเวลค่ายสูงกว่าศัตรู</small>' : ''}<small>ทุกคนในค่ายใช้เลเวลนี้ ทั้งในทีม สำรอง และที่ค่าย</small><span class="reward-camp-team" aria-hidden="true">${brought.map(id => portrait(id)).join('')}</span></div></li>` : '';
  const items = (event.items ?? (event.item ? [event.item] : [])).map(i => `<li data-rarity="${i.rarity}"><details><summary class="item-card-head">${gearArt(i)}<span>${itemName(i)}<small data-rarity="${i.rarity}">Lv${i.level} · ${rarityText[i.rarity]}</small></span></summary><p>${itemLines(map.equipment, i).join('<br>')}</p></details></li>`).join('');
  const resources = ([['ore', 'แร่ดาว', event.loot.ore], ['gold', 'เหรียญทอง', event.loot.gold], ['seal', 'ตราสัญญา', event.loot.seal], ['dust', 'ฝุ่นดาว', event.dust ?? 0], ['star', 'แก่นรอยแยก', event.riftCore ?? 0]] as [IconName, string, number][]).filter(([, , n]) => n > 0).map(([glyph, label, n]) => `<li>${icon(glyph)} ${label} <b>+${n}</b></li>`).join('');
  dialog.innerHTML = `<header><small>รางวัลการต่อสู้</small><h2 id="rewards-title">${reward.title}</h2></header><div class="rewards-scroll"><h3>ประสบการณ์</h3><ul class="reward-members" style="--reward-columns:1">${members}</ul>${items ? `<h3>อุปกรณ์ที่ได้รับ</h3><ul class="reward-items">${items}</ul>` : ''}${resources || event.tomes ? `<h3>ทรัพยากร</h3><ul class="reward-resources">${resources}${tomeThai(event.tomes) ? `<li>${icon('tab-skills')} ${tomeThai(event.tomes)}</li>` : ''}</ul>` : ''}</div><button class="primary" autofocus>ไปต่อ →</button>`;
  const close = () => { dialog.close(); dialog.remove(); done(); };
  dialog.querySelector('button')!.onclick = close;
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); close(); } });
  root.append(dialog); dialog.showModal(); dialog.querySelector('button')!.focus();
}
