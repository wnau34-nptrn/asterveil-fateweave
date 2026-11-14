import type { Commander, ExpeditionState, MapDefinition, WorldEvent } from '../core/world/types';
import { campProgress } from '../core/world/world';
import { gearArt } from './equip-art';
import { icon, type IconName } from './icons';
import { commanderBadge } from './commander-ui';
import { itemLines, itemName, rarityText, tomeThai } from './th';

export interface BattleRewards {
  event: Extract<WorldEvent, { type: 'victory' }>;
  before: ExpeditionState;
  after: ExpeditionState;
  title: string;
  commander?: Commander | null;
}
// Disposable presentation only. No persistence or reward mutations belong here.
export function showBattleRewards(root: HTMLElement, map: MapDefinition, reward: BattleRewards, done: () => void): void {
  const { event, before, after } = reward;
  const dialog = document.createElement('dialog');
  dialog.className = 'battle-rewards';
  dialog.setAttribute('aria-labelledby', 'rewards-title');
  // P01: use the existing shared progression and resolved gain; this panel never grants EXP.
  const previous = campProgress(map, before.campXp), current = campProgress(map, after.campXp);
  const gain = event.exp, capped = current.need === 0, leveled = (gain?.levelsUp ?? 0) > 0;
  const percent = capped ? 100 : current.exp / current.need * 100;
  const from = leveled ? 0 : previous.need ? previous.exp / previous.need * 100 : 100;
  const badge = reward.commander ? commanderBadge(reward.commander) : `<span class="commander-crest" aria-hidden="true">${icon('flag')}</span>`;
  const members = gain ? `<li class="reward-camp${leveled ? ' leveled' : ''}${capped ? ' capped' : ''}" data-member="camp" aria-labelledby="reward-camp-title">
    <div class="reward-camp-hero"><div class="reward-camp-crest">${badge}</div><div><h3 id="reward-camp-title">${leveled ? 'เลเวลค่ายเพิ่ม!' : 'เลเวลค่าย'}</h3>
    <p class="reward-camp-level"><span>Lv</span> <strong>${current.level}</strong>${leveled ? `<span class="reward-level">Lv ${previous.level} → Lv ${current.level}</span>` : ''}</p></div></div>
    ${gain.gained > 0 ? `<p class="reward-gain"><strong>+${gain.gained}</strong> EXP ค่าย</p>` : !capped ? '<p class="reward-no-gain">ไม่ได้รับ EXP เพิ่มจากศึกนี้</p>' : ''}
    <div class="reward-exp" role="progressbar" aria-label="EXP ของค่าย" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${capped ? 'ถึงเลเวลสูงสุดของเนื้อหาปัจจุบันแล้ว' : `${current.exp} จาก ${current.need} EXP เลเวล ${current.level}`}"><i style="width:${percent}%;--from:${from}%"></i>${!capped && gain.gained > 0 ? `<span class="reward-exp-gain" style="left:${from}%;width:${Math.max(0, percent - from)}%"></span>` : ''}</div>
    ${capped ? '<p class="reward-progress-note reward-cap">ถึงเลเวลสูงสุดของเนื้อหาปัจจุบันแล้ว</p>' : `<div class="reward-exp-meta"><span>${current.exp} / ${current.need} EXP</span><span>อีก ${current.need - current.exp} EXP ถึง Lv ${current.level + 1}</span></div>`}
    ${!capped && gain.percent < 100 ? '<p class="reward-progress-note">ได้ EXP น้อยลงเพราะเลเวลค่ายสูงกว่าศัตรู</p>' : ''}<p class="reward-shared">สมาชิกทุกคนใช้เลเวลค่ายร่วมกัน</p></li>` : '';
  const items = (event.items ?? (event.item ? [event.item] : [])).map(i => `<li data-rarity="${i.rarity}"><details><summary class="item-card-head">${gearArt(i)}<span>${itemName(i)}<small data-rarity="${i.rarity}">Lv${i.level} · ${rarityText[i.rarity]}</small></span></summary><p>${itemLines(map.equipment, i).join('<br>')}</p></details></li>`).join('');
  const resources = ([['ore', 'แร่ดาว', event.loot.ore], ['gold', 'เหรียญทอง', event.loot.gold], ['seal', 'เศษกลาง', event.loot.shard], ['dust', 'ฝุ่นดาว', event.dust ?? 0], ['star', 'แก่นรอยแยก', event.riftCore ?? 0]] as [IconName, string, number][]).filter(([, , n]) => n > 0).map(([glyph, label, n]) => `<li>${icon(glyph)} ${label} <b>+${n}</b></li>`).join('');
  dialog.innerHTML = `<header><small>รางวัลการต่อสู้</small><h2 id="rewards-title">${reward.title}</h2></header><div class="rewards-scroll"><ul class="reward-members" style="--reward-columns:1">${members}</ul>${items ? `<h3>อุปกรณ์ที่ได้รับ</h3><ul class="reward-items">${items}</ul>` : ''}${resources || event.tomes ? `<h3>ทรัพยากร</h3><ul class="reward-resources">${resources}${tomeThai(event.tomes) ? `<li>${icon('tab-skills')} ${tomeThai(event.tomes)}</li>` : ''}</ul>` : ''}</div><button class="primary" autofocus>ไปต่อ →</button>`;
  const close = () => { dialog.close(); dialog.remove(); done(); };
  dialog.querySelector('button')!.onclick = close;
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  root.append(dialog); dialog.showModal(); dialog.querySelector('button')!.focus();
}
