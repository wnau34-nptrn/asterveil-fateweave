import type { ExpeditionState, MapDefinition, WorldEvent } from '../core/world/types';
import { expToNext } from '../core/world/world';
import { gearArt } from './equip-art';
import { icon, type IconName } from './icons';
import { portrait } from './portraits';
import { heroText, itemLines, itemName, rarityText, tomeThai } from './th';

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
  const percent = (s: ExpeditionState, id: string) => {
    const m = s.members[id]; const level = m?.level ?? 1;
    return level >= map.progression.levelCap ? 100 : Math.min(100, (m?.exp ?? 0) / expToNext(map, level) * 100);
  };
  const members = Object.entries(event.exp ?? {}).map(([id, gain]) => `<li class="reward-member" data-member="${id}">${portrait(id)}<div><b>${heroText[id]?.name ?? id}</b><span>Lv ${gain.level} · +${gain.gained} EXP</span><div class="reward-exp" role="progressbar" aria-label="EXP ${heroText[id]?.name ?? id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent(after, id)}"><i style="width:${percent(after, id)}%;--from:${percent(before, id)}%;--full:${gain.levelsUp > 0 ? 100 : percent(after, id)}%"></i></div>${gain.levelsUp > 0 ? `<strong class="reward-level">เลเวลอัป! Lv ${gain.level}</strong>` : ''}${gain.percent < 100 ? '<small>ได้ EXP น้อยลงเพราะเลเวลสูงกว่าศัตรู</small>' : ''}</div></li>`).join('');
  const items = (event.items ?? (event.item ? [event.item] : [])).map(i => `<li data-rarity="${i.rarity}"><details><summary class="item-card-head">${gearArt(i)}<span>${itemName(i)}<small data-rarity="${i.rarity}">Lv${i.level} · ${rarityText[i.rarity]}</small></span></summary><p>${itemLines(map.equipment, i).join('<br>')}</p></details></li>`).join('');
  const resources = ([['ore', 'แร่ดาว', event.loot.ore], ['gold', 'เหรียญทอง', event.loot.gold], ['seal', 'ตราสัญญา', event.loot.seal], ['dust', 'ฝุ่นดาว', event.dust ?? 0], ['star', 'แก่นรอยแยก', event.riftCore ?? 0]] as [IconName, string, number][]).filter(([, , n]) => n > 0).map(([glyph, label, n]) => `<li>${icon(glyph)} ${label} <b>+${n}</b></li>`).join('');
  dialog.innerHTML = `<header><small>รางวัลการต่อสู้</small><h2 id="rewards-title">${reward.title}</h2></header><div class="rewards-scroll"><h3>ประสบการณ์</h3><ul>${members}</ul>${items ? `<h3>อุปกรณ์ที่ได้รับ</h3><ul class="reward-items">${items}</ul>` : ''}${resources || event.tomes ? `<h3>ทรัพยากร</h3><ul class="reward-resources">${resources}${tomeThai(event.tomes) ? `<li>${icon('tab-skills')} ${tomeThai(event.tomes)}</li>` : ''}</ul>` : ''}</div><button class="primary" autofocus>ไปต่อ →</button>`;
  const close = () => { dialog.close(); dialog.remove(); done(); };
  dialog.querySelector('button')!.onclick = close;
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); close(); } });
  root.append(dialog); dialog.showModal(); dialog.querySelector('button')!.focus();
}
