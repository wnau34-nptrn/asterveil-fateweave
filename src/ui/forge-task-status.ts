// UX audit P1-5 (docs/UX_GAMEFEEL_AUDIT.md): each forge task card says whether it can be done now, read from the
// same rule checks the forge uses (no separate arithmetic). Presentation only: nothing here changes a profile.
import { enhanceReason, fuseReason, itemLevelCap, itemLevelCost, rerollReason, smeltLeft, smeltReason } from '../core/world/forge';
import type { Item, MapDefinition, Profile } from '../core/world/types';

export type ForgeTaskId = 'enhance' | 'level' | 'fuse' | 'reroll' | 'transfer' | 'craft' | 'recycle' | 'smelt';
export interface ForgeTaskStatus { state: 'ready' | 'blocked' | 'empty' | 'info'; text: string }

const owned = (p: Profile): Item[] => [...p.items, ...Object.values(p.members).flatMap(m => Object.values(m.gear ?? {}).filter((i): i is Item => !!i))];
const count = (n: number) => `${n} ชิ้น`;

export function forgeTaskStatus(p: Profile, map: MapDefinition, task: ForgeTaskId): ForgeTaskStatus | undefined {
  const all = owned(p);
  const ready = (ok: (i: Item) => boolean, done: (i: Item) => boolean, doneText: string, shortText: string): ForgeTaskStatus => {
    if (!all.length) return { state: 'empty', text: 'ยังไม่มีอุปกรณ์' };
    const n = all.filter(ok).length; if (n) return { state: 'ready', text: `ทำได้ ${count(n)}` };
    return all.every(done) ? { state: 'blocked', text: doneText } : { state: 'blocked', text: shortText };
  };
  switch (task) {
    case 'enhance': return ready(i => enhanceReason(p, map, i.uid) === '', i => enhanceReason(p, map, i.uid) === 'maxed', 'ขั้น + เต็มทุกชิ้น', 'แร่หรือฝุ่นไม่พอ');
    case 'level': {
      const cap = itemLevelCap(p, map);
      const can = (i: Item) => { const c = i.level < cap ? itemLevelCost(map, i, i.level + 1) : undefined; return !!c && p.bank.ore >= c.ore && p.bank.dust >= c.dust; };
      return ready(can, i => i.level >= cap, `ถึงเพดาน Lv${cap} ทุกชิ้น`, 'แร่หรือฝุ่นไม่พอ');
    }
    case 'fuse': return ready(i => fuseReason(p, map, i.uid) === '', i => fuseReason(p, map, i.uid) === 'maxed', 'สีสูงสุดทุกชิ้น', 'วัตถุดิบสีเดียวกันไม่พอ');
    case 'reroll': return ready(i => i.affixes.some((_, k) => rerollReason(p, map, i.uid, k) === ''), i => i.affixes.every((_, k) => rerollReason(p, map, i.uid, k) === 'maxed'), 'ไม่มีคุณสมบัติรองให้สุ่ม', 'เศษกลางไม่พอ');
    case 'transfer': return all.length < 2 ? { state: 'empty', text: all.length ? 'ต้องมีอุปกรณ์ 2 ชิ้นขึ้นไป' : 'ยังไม่มีอุปกรณ์' } : { state: 'info', text: `มีอุปกรณ์ ${count(all.length)}` };
    case 'recycle': return p.items.length ? { state: 'info', text: `ในคลัง ${count(p.items.length)}` } : { state: 'empty', text: 'ไม่มีชิ้นในคลัง' };
    case 'smelt': {
      const why = smeltReason(p, map, 1);
      return !why ? { state: 'ready', text: `โควตาเหลือ ${smeltLeft(p, map)} ฝุ่น` } : why === 'limit' ? { state: 'blocked', text: 'ครบโควตารอบนี้' } : why === 'ore' ? { state: 'blocked', text: 'แร่ไม่พอ' } : { state: 'blocked', text: 'ฝุ่นเต็มคลัง' };
    }
    default: return undefined;   // craft: the recipe page explains its own costs per class and level
  }
}
