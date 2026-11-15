import { boardBook, boardClaimReason, count, objectiveDone, weekOf } from '../core/world/board';
import { partyLine } from '../core/world/tomes';
import type { BoardObjective, BoardSet, BoardTab, MapDefinition, Profile, SweepReward } from '../core/world/types';
import { icon } from './icons';
import { boardKindText, boardReasonText, boardTaskName, contractText, sweepText } from './th';

// P05-06 quest board (camp sheet): daily, weekly and contract tabs beside the camp's one-time side quests. Pure view of
// the board book on the device's day; every claim goes through the `claimBoard` command.
export type QuestTab = BoardTab | 'camp';
export const QUEST_TABS: readonly QuestTab[] = ['daily', 'weekly', 'contract', 'camp'];
const tabName: Record<QuestTab, string> = { daily: 'รายวัน', weekly: 'รายสัปดาห์', contract: 'สัญญา', camp: 'งานค่าย' };
const dayLabel = (day: number): string => { const d = new Date(day * 86_400_000); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
// The last day of a week (Sunday).
const weekEnd = (week: number): number => week * 7 + 3;

export function questTabs(tab: QuestTab, ready: Readonly<Record<QuestTab, number>>): string {
  return `<div class="hire-tabs quest-tabs" role="tablist">${QUEST_TABS.map(t => `<button id="quest-tab-${t}" role="tab" data-lobby="quest-tab" data-tab="${t}" aria-selected="${t === tab}" class="${t === tab ? 'active' : ''}"><span>${tabName[t]}</span>${ready[t] ? `<small class="trip-badge">${ready[t]}</small>` : ''}</button>`).join('')}</div>`;
}
// Claimable rewards per tab (the camp tab's count comes from the side quests).
export function boardReady(p: Profile, maps: readonly MapDefinition[], day: number): Record<BoardTab, number> {
  const home = maps[0]; const out = { daily: 0, weekly: 0, contract: 0 }; if (!home) return out;
  const book = boardBook(p, home.board, day);
  for (const s of book.days) for (const o of home.board.daily) if (!boardClaimReason(p, maps, 'daily', o.id, s.day, day)) out.daily++;
  for (const w of book.weeks) {
    for (const o of home.board.weekly) if (!boardClaimReason(p, maps, 'weekly', o.id, w.week, day)) out.weekly++;
    for (const c of home.board.contracts) if (!boardClaimReason(p, maps, 'contract', c.id, w.week, day)) out.contract++;
  }
  return out;
}

const progressLine = (o: BoardObjective, set: BoardSet): string =>
  `${boardKindText[o.kind](o.target)} <b>${Math.min(count(set, o.kind), o.target)}/${o.target}</b>${o.alt ? ` · หรือ ${boardKindText[o.alt.kind](o.alt.target)} <b>${Math.min(count(set, o.alt.kind), o.alt.target)}/${o.alt.target}</b>` : ''}`;
function card(id: string, name: string, body: string, reward: SweepReward | undefined, reason: string, claim: string, p: Profile, home: MapDefinition): string {
  const state = reason === 'claimed' ? 'claimed' : reason ? 'open' : 'ready';
  const status = state === 'ready' ? 'รับรางวัลได้' : boardReasonText[reason] ?? 'กำลังดำเนินการ';
  const line = partyLine(home, p.party.deployed);
  return `<section class="side-quest board-task" id="board-${id}" data-state="${state}" aria-label="${name}"><div class="board-task-body"><span class="side-quest-head">${icon('flag')}<b>${name}</b><small>${status}</small></span><p class="side-quest-ask">${body}</p>${reward ? `<p class="side-quest-reward">รางวัล: ${sweepText(reward, line)}</p>` : ''}</div>${state === 'ready' ? claim : ''}</section>`;
}
const claimButton = (tab: BoardTab, id: string, period: number, label = 'รับรางวัล'): string =>
  `<button id="board-claim-${tab}-${id}-${period}" data-lobby="board-claim" data-tab="${tab}" data-id="${id}" data-period="${period}" class="primary">${label}</button>`;

export function questBoardBody(p: Profile, maps: readonly MapDefinition[], day: number, tab: BoardTab): string {
  const home = maps[0]!; const rules = home.board; const book = boardBook(p, rules, day);
  const note = `<p class="camp-note">ความคืบหน้าเก็บเองจากการเดินทางที่จบแล้ว · ใช้วันที่และเวลาของเครื่องนี้ (วันใหม่เริ่มเที่ยงคืน สัปดาห์เริ่มวันจันทร์)</p>`;
  if (tab === 'daily') {
    const sets = [...book.days].reverse();
    return `<div class="quest-board">${note}${sets.map((s, i) => {
      const head = i === 0 ? `วันนี้ ${dayLabel(s.day)}` : `งานค้างวันที่ ${dayLabel(s.day)} · ทำต่อและรับได้ถึง ${dayLabel(s.day + rules.keepDays - 1)}`;
      return `<h3 class="board-period">${head}</h3>${rules.daily.map(o => card(`${o.id}-${s.day}`, boardTaskName[o.id] ?? o.id, progressLine(o, s), o.reward, boardClaimReason(p, maps, 'daily', o.id, s.day, day), claimButton('daily', o.id, s.day), p, home)).join('')}`;
    }).join('')}<p class="camp-note">วันที่พลาดไปเปิดเป็นงานค้างได้สูงสุด ${rules.keepDays - 1} วัน · การเดินทางนับให้วันนี้ก่อน ส่วนที่เกินช่วยงานค้างวันเก่าสุด</p></div>`;
  }
  const weeks = [...book.weeks].reverse();
  if (tab === 'weekly') return `<div class="quest-board">${note}${weeks.map(w => {
    const now = w.week === weekOf(day);
    const head = now ? `สัปดาห์นี้ · ถึง ${dayLabel(weekEnd(w.week))}` : `สัปดาห์ที่แล้ว · รับรางวัลที่ทำครบได้ถึง ${dayLabel(weekEnd(w.week + 1))}`;
    const list = rules.weekly.filter(o => now || (objectiveDone(o, w) && !w.claimed.includes(o.id)));
    return list.length ? `<h3 class="board-period">${head}</h3>${list.map(o => card(`${o.id}-${w.week}`, boardTaskName[o.id] ?? o.id, progressLine(o, w), o.reward, boardClaimReason(p, maps, 'weekly', o.id, w.week, day), claimButton('weekly', o.id, w.week), p, home)).join('')}` : '';
  }).join('')}</div>`;
  const steps = maps.filter(m => m.contract).map(m => `${m.name} ${m.contract!.swiftSteps}`).join(' · ');
  return `<div class="quest-board">${note}<p class="camp-note">สัญญาจ้างไม่มีค่าธรรมเนียมและไม่มีโทษเมื่อทำไม่สำเร็จ · นับเมื่อผ่านแผนที่ · รับได้สัญญาละครั้งต่อสัปดาห์ ได้รางวัลของแผนที่ที่ยากที่สุดที่ทำสำเร็จ</p>${weeks.map(w => {
    const now = w.week === weekOf(day);
    const list = rules.contracts.filter(c => now || (w.jobs[c.id]?.length && !w.claimed.includes(c.id)));
    return list.length ? `<h3 class="board-period">${now ? `สัปดาห์นี้ · ถึง ${dayLabel(weekEnd(w.week))}` : `สัปดาห์ที่แล้ว · รับได้ถึง ${dayLabel(weekEnd(w.week + 1))}`}</h3>${list.map(c => {
      const t = contractText[c.kind]; const at = maps.filter(m => w.jobs[c.id]?.includes(m.id)).sort((a, b) => b.chapter - a.chapter);
      const ask = `${t.ask}${c.kind === 'swift' ? ` (ก้าวสูงสุด: ${steps})` : ''}${at.length ? ` · ทำสำเร็จที่ ${at.map(m => m.name).join(', ')}` : ''}`;
      const reward = at[0]?.contract?.reward;
      return card(`${c.id}-${w.week}`, t.name, ask, reward, boardClaimReason(p, maps, 'contract', c.id, w.week, day), claimButton('contract', c.id, w.week), p, home);
    }).join('')}` : '';
  }).join('')}<p class="camp-note">รางวัลต่อแผนที่: ${maps.filter(m => m.contract).map(m => `${m.name} ${sweepText(m.contract!.reward, partyLine(home, p.party.deployed))}`).join(' · ')}</p></div>`;
}
