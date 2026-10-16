import type { ExpeditionState, Item, MapDefinition, Profile, RunOutcome } from '../core/world/types';
import { storyArt } from '../game/visuals/assets';
import { gearArt } from './equip-art';
import { icon, type IconName } from './icons';
import { heroText, itemName, sideQuestText } from './th';
import { portrait } from './world-ui';
import type { StoryPanel } from './story-ui';

// 4F: the expedition summary shown once when a run ends, before the lobby. It is built from the profile before
// and after `settle` plus the finished run, so it owns no rules and needs no save of its own.
export interface RunSummary {
  outcome: RunOutcome; firstClear: boolean;
  steps: number; wins: number; defeats: number; elites: number; chests: number; puzzles: number; secrets: number; herbs: number;
  kept: { ore: number; gold: number; seal: number; dust: number }; items: Item[]; salvaged: number;
  levels: { id: string; from: number; to: number }[];
  quests: { id: string; npc: string; from: number; to: number; target: number; ready: boolean }[];
}
export function runSummary(before: Profile, run: ExpeditionState, after: Profile, outcome: RunOutcome, map: MapDefinition): RunSummary {
  const kept = { ore: after.bank.ore - before.bank.ore, gold: after.bank.gold - before.bank.gold, seal: after.bank.seal - before.bank.seal, dust: after.bank.dust - before.bank.dust };
  const known = new Set(before.items.map(i => i.uid));
  const items = after.items.filter(i => !known.has(i.uid)).sort((a, b) => b.rarity - a.rarity);
  const levels = Object.keys(run.members).filter(id => after.members[id])
    .map(id => ({ id, from: before.members[id]?.level ?? 1, to: after.members[id]!.level ?? 1 })).filter(l => l.to > l.from);
  const quests = map.sideQuests.map(q => ({ id: q.id, npc: q.npc, from: before.quests[q.id]?.progress ?? 0, to: after.quests[q.id]?.progress ?? 0, target: q.target, ready: !after.quests[q.id]?.claimed && (after.quests[q.id]?.progress ?? 0) >= q.target }))
    .filter(q => q.to > q.from);
  return {
    outcome, firstClear: outcome === 'complete' && before.completes === 0,
    steps: run.steps, wins: run.wins, defeats: run.defeats, elites: run.elitesDefeated.length, chests: run.openedChests.length,
    puzzles: run.solved.length, secrets: run.secrets.length, herbs: outcome === 'wiped' ? 0 : run.herbs.length,
    kept, items, salvaged: after.last?.salvaged ?? 0, levels, quests,
  };
}

// The first time the rift warden falls, Vargoth answers before the summary (lore 2026-10-16).
export const firstClearStory: readonly StoryPanel[] = [
  { speaker: 'vargoth', scene: 'rift', text: 'แม่ทัพของข้าล้มแล้วหรือ… ผู้ทอชะตา เจ้าเก่งกว่าที่ข้าคิดไว้' },
  { speaker: 'vargoth', scene: 'retreat', text: 'แต่รอยแยกยังมีอีกมาก และเผ่าของข้ายังไม่หมด เดินลึกเข้ามาอีกเถิด ข้าจะรอ' },
  { speaker: 'guardian', scene: 'retreat', text: 'ชายแดนปลอดภัยแล้ว… อย่างน้อยก็ตอนนี้ กลับค่ายไปฉลองกันก่อนเถอะ ผู้บัญชาการ' },
];

const titles: Record<RunOutcome, { title: string; sub: string; scene: 'awaken' | 'rift' | 'retreat' }> = {
  complete: { title: 'สำเร็จการเดินทาง', sub: 'ผู้คุมรอยแยกล้มแล้ว · ทุกอย่างที่หามาได้กลับค่ายครบ', scene: 'retreat' },
  withdrawn: { title: 'ถอนตัวกลับค่าย', sub: 'ทีมกลับมาอย่างปลอดภัย · ของที่หามาได้กลับค่ายครบ', scene: 'awaken' },
  wiped: { title: 'ทีมล้มทั้งหมด', sub: 'เก็บทรัพยากรได้ครึ่งเดียว · อุปกรณ์และสมุนไพรที่พบหายไป · เลเวลยังอยู่', scene: 'rift' },
};

export class SummaryUI {
  private done: (() => void) | undefined;
  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition) {
    root.id = 'summary-view'; root.className = 'summary-view'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'summary-title');
    root.addEventListener('click', e => { if ((e.target as HTMLElement).closest('#summary-done')) this.finish(); });
    root.ownerDocument.addEventListener('keydown', e => { if (!root.hidden && e.key === 'Escape') { e.preventDefault(); this.finish(); } });
  }
  get open(): boolean { return !this.root.hidden; }
  show(s: RunSummary, done: () => void): void {
    this.done = done; const t = titles[s.outcome];
    const stat = (glyph: IconName, label: string, value: number) => `<li>${icon(glyph)}<b>${value}</b><small>${label}</small></li>`;
    const haul = ([['ore', 'แร่ดาว', s.kept.ore], ['gold', 'เหรียญทอง', s.kept.gold], ['seal', 'ตราสัญญา', s.kept.seal], ['dust', 'ฝุ่นดาว', s.kept.dust]] as [IconName, string, number][])
      .filter(([, , n]) => n > 0).map(([g, l, n]) => `<li>${icon(g)}<b>+${n}</b><small>${l}</small></li>`).join('');
    const items = s.items.slice(0, 12).map(i => `<li title="${itemName(i)} Lv${i.level}">${gearArt(i)}<small>${itemName(i)}</small></li>`).join('');
    const levels = s.levels.map(l => `<li>${portrait(l.id)}<span><b>${heroText[l.id]?.name ?? l.id}</b><small>Lv${l.from} → <em>Lv${l.to}</em></small></span></li>`).join('');
    const quests = s.quests.map(q => { const kind = this.map.sideQuests.find(x => x.id === q.id)!.kind;
      return `<li class="${q.ready ? 'ready' : ''}"><b>${sideQuestText[kind].name}</b><span class="summary-bar"><i style="width:${Math.round(q.to / q.target * 100)}%"></i></span><small>${q.to}/${q.target}${q.ready ? ' · พร้อมรับรางวัลที่ค่าย!' : ` (+${q.to - q.from})`}</small></li>`; }).join('');
    this.root.dataset.outcome = s.outcome;
    this.root.style.setProperty('--summary-bg', `url(${storyArt(`story_${t.scene}`)})`);
    this.root.innerHTML = `<div class="summary-card">
      <header><p class="eyebrow">${this.map.name}</p><h2 id="summary-title">${t.title}</h2><p>${t.sub}</p></header>
      <div class="summary-body">
        <ul class="summary-stats">${stat('footprints', 'ก้าว', s.steps)}${stat('star', 'ชนะศึก', s.wins)}${stat('danger', 'ถอยทัพ', s.defeats)}${stat('boss', 'อีลิท', s.elites)}${stat('chest', 'กล่อง', s.chests)}${stat('set', 'ปริศนา', s.puzzles)}</ul>
        <h3>${icon('pack')} ได้กลับค่าย</h3>${haul ? `<ul class="summary-haul">${haul}</ul>` : '<p class="summary-none">ไม่มีทรัพยากรกลับมา</p>'}
        ${items ? `<h3>${icon('gearWeapon')} อุปกรณ์ใหม่ <small>${s.items.length} ชิ้น${s.salvaged ? ` · คลังเต็ม แยกชิ้นอัตโนมัติ ${s.salvaged}` : ''}</small></h3><ul class="summary-items">${items}</ul>` : ''}
        ${levels ? `<h3>${icon('starFilled')} เลเวลขึ้น</h3><ul class="summary-levels">${levels}</ul>` : ''}
        ${quests ? `<h3>${icon('flag')} เควสต์ในค่าย</h3><ul class="summary-quests">${quests}</ul>` : ''}
      </div>
      <button id="summary-done" class="primary">${icon('camp')}<span>กลับค่าย</span></button></div>`;
    this.root.hidden = false;
    this.root.querySelector<HTMLElement>('#summary-done')?.focus({ preventScroll: true });
  }
  private finish(): void {
    if (this.root.hidden) return;
    this.root.hidden = true; this.root.innerHTML = '';
    const done = this.done; this.done = undefined; done?.();
  }
}
