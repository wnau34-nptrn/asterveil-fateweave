import { sfx } from '../platform/sfx';
import type { Item } from '../core/world/types';
import { gearArt } from './equip-art';
import { itemName } from './th';

// Presentation only: a hammer pops up over the finished piece and strikes twice with a ringing clang. The forge result
// is already committed and saved before this runs, and the overlay never takes input or changes state.
const hammer = '<svg class="strike-hammer" viewBox="0 0 64 64" aria-hidden="true"><g stroke="#0a1220" stroke-width="2" stroke-linejoin="round"><rect x="29" y="22" width="7" height="40" rx="3" fill="#a5733a"/><rect x="10" y="6" width="44" height="20" rx="5" fill="#c3cddb"/><rect x="10" y="6" width="12" height="20" rx="4" fill="#8794a8"/><rect x="42" y="6" width="12" height="20" rx="4" fill="#8794a8"/></g></svg>';
export function forgeStrike(root: HTMLElement, item: Item, kind: 'enhance' | 'level', reduced: boolean): void {
  root.querySelector('.forge-strike')?.remove();
  const label = kind === 'enhance' ? `+${item.plus ?? 0}` : `Lv${item.level}`;
  const el = root.ownerDocument.createElement('div');
  el.className = 'forge-strike'; el.setAttribute('aria-hidden', 'true'); if (reduced) el.dataset.reduced = 'true';
  el.innerHTML = `<div class="strike-card"><div class="strike-item">${gearArt(item)}<i class="strike-spark"></i><i class="strike-spark b"></i></div>${hammer}<b class="strike-result">${label}</b><small>${itemName(item)}</small></div>`;
  root.append(el);
  const timers = reduced ? [0] : [330, 700];
  timers.forEach(t => setTimeout(() => sfx.play('clang'), t));
  setTimeout(() => el.remove(), reduced ? 900 : 1700);
}
