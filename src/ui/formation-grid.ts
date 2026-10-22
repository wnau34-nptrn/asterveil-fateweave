import type { Lane } from '../core/world/types';
import { icon } from './icons';
import { portrait } from './portraits';
import { heroText } from './th';

// Formation picker (owner 2026-10-22), shared by the camp team page and the map bag: our side of the field as
// 2 columns × 3 cells, rear on the left as in battle. Tap a member, then an empty cell or a member of the other
// column to move or trade lanes. Cells follow the field: a column's lone member stands in the middle.
export interface FormationModel {
  prefix: string; attr: 'lobby' | 'world'; deployed: readonly string[]; lanes: Readonly<Record<string, Lane>>;
  recommended: (id: string) => Lane; picked?: string; disabled?: boolean; hp?: (id: string) => number;
}
export const laneName = (lane: Lane): string => lane === 'front' ? 'แนวหน้า' : 'แนวหลัง';
const CELLS: Record<number, readonly number[]> = { 0: [], 1: [1], 2: [0, 2], 3: [0, 1, 2] };
export function formationGrid(m: FormationModel): string {
  const column = (lane: Lane) => {
    const ids = m.deployed.filter(id => m.lanes[id] === lane); const at = CELLS[ids.length]!;
    const cells = [0, 1, 2].map(row => {
      const id = ids[at.indexOf(row)];
      if (!id) {
        const target = !!m.picked && m.lanes[m.picked] !== lane && !m.disabled;
        return `<button class="formation-cell empty${target ? ' target' : ''}" data-${m.attr}="lane-cell" data-lane="${lane}" aria-label="${laneName(lane)} ช่องว่าง${target ? ` · ย้าย${heroText[m.picked!]!.name}มาที่นี่` : ''}"${target ? '' : ' disabled'}><span>ว่าง</span></button>`;
      }
      const text = heroText[id]!, off = m.recommended(id) !== lane, slot = m.deployed.indexOf(id) + 1, down = m.hp && m.hp(id) <= 0;
      return `<button id="${m.prefix}-lane-${id}" class="formation-cell${off ? ' off-lane' : ''}${down ? ' fallen' : ''}" data-${m.attr}="lane-pick" data-hero="${id}" data-lane="${lane}" aria-pressed="${m.picked === id}"${m.disabled ? ' disabled' : ''}
        aria-label="${laneName(lane)} · ช่อง ${slot} ${text.name} ${text.role}${off ? ` · แนะนำ${laneName(m.recommended(id))}` : ''}${down ? ' · ล้มแล้ว' : ''}"><i class="slot-no">${slot}</i>${portrait(id)}<b>${text.name}</b>${off ? `<small class="lane-warn">${icon('info')}แนะนำ${laneName(m.recommended(id)).slice(3)}</small>` : `<small>${text.role}</small>`}</button>`;
    }).join('');
    return `<div class="formation-column" data-lane="${lane}" role="group" aria-label="${laneName(lane)} ${ids.length}/3"><h4>${laneName(lane)} <small>${ids.length}/3</small></h4>${cells}</div>`;
  };
  const off = m.deployed.filter(id => m.recommended(id) !== m.lanes[id]);
  const hint = m.picked ? `เลือก${heroText[m.picked]!.name}แล้ว · แตะช่องว่างหรือคนในอีกแนวเพื่อย้ายหรือสลับ แตะซ้ำเพื่อยกเลิก`
    : m.disabled ? 'จัดแผนได้นอกการต่อสู้เท่านั้น' : 'แตะสมาชิก แล้วแตะช่องว่างหรือคนในอีกแนว · แนวละไม่เกิน 3 คน';
  return `<section class="formation" aria-labelledby="${m.prefix}-formation-title"><h3 id="${m.prefix}-formation-title">${icon('flag')} แผนการยืน <span class="camp-embers">ใช้ทุกศึก</span></h3>
    <div class="formation-grid">${column('back')}<span class="formation-facing" aria-hidden="true">${icon('right')}</span>${column('front')}</div>
    <p class="camp-note formation-rule">แนวหน้ารับการโจมตีกายภาพก่อน · ยืนแนวหน้าตีแถวหลังศัตรูไม่ได้ขณะแถวหน้าศัตรูยังยืน (ยกเว้นสกิลตีทะลุ) · ยืนแนวหลังตีได้ทุกช่อง</p>
    ${off.length ? `<p class="camp-note lane-warn">${icon('info')} ${off.map(id => `${heroText[id]!.name} (${heroText[id]!.role}) ปกติยืน${laneName(m.recommended(id))}`).join(' · ')}</p>` : ''}
    <p class="camp-note" id="${m.prefix}-formation-hint" aria-live="polite">${hint}</p></section>`;
}
// What a tap does: pick/unpick, or move the picked member (trading with `other` when the cell is taken).
export function formationTap(picked: string | undefined, lanes: Readonly<Record<string, Lane>>, hero: string | undefined, lane: Lane): { picked?: string; move?: { id: string; lane: Lane; other?: string } } {
  if (!picked || !(picked in lanes)) return hero ? { picked: hero } : {};
  if (hero === picked) return {};
  if (lanes[picked] === lane) return hero ? { picked: hero } : {};
  return { move: { id: picked, lane, ...(hero ? { other: hero } : {}) } };
}
