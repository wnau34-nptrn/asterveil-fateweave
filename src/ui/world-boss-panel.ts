import { sharedPercent, wbBook, wbClaimReason, wbWeekDamage, wbWeekOf, type WorldBossShared } from '../core/world/world-boss';
import { partyLine } from '../core/world/tomes';
import type { MapDefinition, Profile } from '../core/world/types';
import type { SharedBoss, WorldBossStatus } from '../platform/server-client';
import { icon } from './icons';
import { sweepText } from './th';

// P11-04 part 2: the World Boss tab of the camp quest board. A pure view of the profile's World Boss book and, in server
// play, of the shared HP the server reports (`ServerClient.worldBoss()`); offline there is no shared bar. Every action
// is a command (`worldBoss` from the battle, `claimWorldBoss` here); nothing is worked out in this file but wording.
const dayLabel = (day: number): string => { const d = new Date(day * 86_400_000); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const weekEnd = (week: number): number => week * 7 + 3;
export const claimText: Record<string, string> = {
  progress: 'ทั้งเซิร์ฟเวอร์ยังไม่ถึงเป้า', absent: 'ต้องร่วมสู้ในสัปดาห์นั้นก่อน', claimed: 'รับแล้ว', offline: 'ต้องเล่นออนไลน์จึงรับได้',
  expired: 'หมดเวลารับ', full: 'รางวัลเกินเพดานคลัง · ใช้ทรัพยากรก่อน', locked: 'ยังไม่เปิด', day: 'ยังไม่รู้วันที่', unknown: '',
};
export const attemptReasonText: Record<string, string> = {
  used: 'ใช้สิทธิ์ครบแล้ว · สัปดาห์หน้ามีบอสใหม่', team: 'ต้องมีทีมสนามอย่างน้อย 1 คน', locked: 'เปิดพร้อมกระดานเควสต์', expired: 'นาฬิกาเครื่องย้อนกลับ · ใช้สัปดาห์ปัจจุบันของเซิร์ฟเวอร์',
  stale: 'ครั้งนี้ถูกบันทึกไปแล้ว', unfinished: 'ศึกยังไม่จบ', noDamage: 'ไม่ได้ลดเลือดบอส · ไม่นับและไม่เสียสิทธิ์', illegal: 'ส่งผลศึกไม่ผ่านการตรวจ', full: 'รางวัลเกินเพดานคลัง · ใช้ทรัพยากรก่อน',
  day: 'ยังไม่รู้วันที่',
};

function sharedFor(status: WorldBossStatus | null | undefined, week: number, claimWeek: number): WorldBossShared | undefined {
  const s: SharedBoss | null | undefined = claimWeek === week ? status?.current : claimWeek === week - 1 ? status?.last : undefined;
  return s ? { week: s.week, hp: s.hp, left: s.left } : undefined;
}
// Shared milestones ready to claim (this week and last week).
export function worldBossReady(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined): number {
  const home = maps[0]; if (!home) return 0; const week = wbWeekOf(day); let n = 0;
  for (const claimWeek of [week, week - 1]) for (const m of home.worldBoss.shared) if (!wbClaimReason(p, maps, m.id, claimWeek, week, sharedFor(status, week, claimWeek))) n++;
  return n;
}
// '' when the next attempt can start (the battle itself refuses anything else at the server); else why not.
export function worldBossStartReason(p: Profile, maps: readonly MapDefinition[], day: number): string {
  const home = maps[0]; if (!home) return 'locked';
  const w = wbBook(p, wbWeekOf(day)).weeks.at(-1)!;
  if (w.attempts >= home.worldBoss.attempts) return 'used';
  if (!p.party.deployed.length) return 'team';
  return '';
}

const bar = (s: SharedBoss): string => {
  const pct = sharedPercent(s);
  return `<div class="wb-shared" role="group" aria-label="เลือดส่วนกลางของบอสสัปดาห์นี้"><div class="wb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" style="--wb-pct:${pct}%"><span></span></div>
    <p class="wb-bar-text">เลือดส่วนกลาง <b>${Math.max(0, s.left).toLocaleString('th-TH')} / ${s.hp.toLocaleString('th-TH')}</b> · ทั้งเซิร์ฟเวอร์ลดไปแล้ว <b>${pct}%</b> · ผู้ร่วมสู้ ${s.accounts} บัญชี</p></div>`;
};

export function worldBossBody(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined, online: boolean): string {
  const home = maps[0]!; const rules = home.worldBoss; const week = wbWeekOf(day); const book = wbBook(p, week);
  const w = book.weeks.find(x => x.week === week)!; const line = partyLine(home, p.party.deployed);
  const reason = worldBossStartReason(p, maps, day);
  const head = `<section class="wb-card" id="wb-card" aria-label="บอสโลกสัปดาห์นี้"><div class="wb-head"><span class="wb-emblem">${icon('flag')}</span><div><h3>บอสโลก · ผู้คุมรอยแยก</h3><small>สัปดาห์นี้ · ถึง ${dayLabel(weekEnd(week))} · สูงสุด ${rules.maxRounds} รอบต่อครั้ง</small></div></div>
    <p class="wb-attempts" id="wb-attempts">ใช้สิทธิ์แล้ว <b>${w.attempts}/${rules.attempts}</b> ครั้ง${w.attempts ? ` · ดาเมจรวม <b>${wbWeekDamage(w).damage.toLocaleString('th-TH')}</b> · ครั้งที่ดีที่สุด <b>${wbWeekDamage(w).best.toLocaleString('th-TH')}</b>` : ''}</p>
    ${online ? (status?.current ? bar(status.current) : '<p class="camp-note" id="wb-bar-missing">ยังอ่านเลือดส่วนกลางจากเซิร์ฟเวอร์ไม่ได้ · ลองเปิดแท็บนี้อีกครั้ง</p>') : '<p class="camp-note" id="wb-offline">เล่นออฟไลน์: ไม่มีแถบเลือดส่วนกลางและรางวัลส่วนรวม · รางวัลเข้าร่วมกับรางวัลส่วนตัวยังได้ตามปกติ</p>'}
    <p class="camp-note">ลงสนามด้วยทีมสนามของค่ายเลือดเต็ม · นับเฉพาะเลือดที่บอสเสียจริง · ศึกต้องจบ (ชนะ แพ้ หรือครบ ${rules.maxRounds} รอบ) จึงนับสิทธิ์ · ส่งผลครั้งเดียวตอนจบศึก</p>
    <p class="side-quest-reward">รางวัลเข้าร่วมต่อครั้ง: ${sweepText(rules.attemptReward, line)}</p>
    <button id="wb-start" data-lobby="wb-start" class="primary"${reason ? ' disabled' : ''}>${reason ? attemptReasonText[reason] ?? 'ยังเข้าไม่ได้' : `เข้าสู้บอสโลก · ครั้งที่ ${w.attempts + 1}/${rules.attempts}`}</button></section>`;

  const personal = rules.personal.map(m => {
    const done = w.claimed.includes(m.id); const more = Math.max(0, m.attempts - w.attempts);
    return `<section class="side-quest board-task" id="wb-${m.id}" data-state="${done ? 'claimed' : 'open'}"><div class="board-task-body"><span class="side-quest-head">${icon('flag')}<b>ร่วมสู้ครบ ${m.attempts} ครั้ง</b><small>${done ? 'ได้รับแล้ว' : `อีก ${more} ครั้ง · จ่ายพร้อมครั้งนั้น`}</small></span><p class="side-quest-reward">รางวัล: ${sweepText(m.reward, line)}</p></div></section>`;
  }).join('');

  const sharedRows = [week, week - 1].map(claimWeek => {
    const wk = book.weeks.find(x => x.week === claimWeek); const now = claimWeek === week;
    if (!now && !wk?.attempts) return '';
    const shared = sharedFor(status, week, claimWeek);
    const rows = rules.shared.filter(m => now || !wk!.claimed.includes(m.id)).map(m => {
      const why = wbClaimReason(p, maps, m.id, claimWeek, week, shared); const ready = !why; const done = why === 'claimed';
      const pct = shared ? sharedPercent(shared) : 0;
      const status2 = ready ? 'รับรางวัลได้' : done ? 'รับแล้ว' : why === 'progress' ? `ทั้งเซิร์ฟเวอร์ ${pct}% / ${m.percent}%` : claimText[why] ?? '';
      return `<section class="side-quest board-task" id="wb-${m.id}-${claimWeek}" data-state="${done ? 'claimed' : ready ? 'ready' : 'open'}"><div class="board-task-body"><span class="side-quest-head">${icon('flag')}<b>ทั้งเซิร์ฟเวอร์ลดเลือดบอส ${m.percent}%</b><small>${status2}</small></span><p class="side-quest-reward">รางวัล: ${sweepText(m.reward, line)}</p></div>${ready ? `<button id="wb-claim-${m.id}-${claimWeek}" data-lobby="wb-claim" data-id="${m.id}" data-week="${claimWeek}" class="primary">รับรางวัล</button>` : ''}</section>`;
    }).join('');
    return rows ? `<h3 class="board-period">${now ? 'รางวัลส่วนรวมสัปดาห์นี้' : `รางวัลส่วนรวมสัปดาห์ที่แล้ว · รับได้ถึง ${dayLabel(weekEnd(week))}`}</h3>${rows}` : '';
  }).join('');
  const sharedHtml = online ? sharedRows : `<h3 class="board-period">รางวัลส่วนรวม</h3><p class="camp-note">ได้เมื่อเล่นออนไลน์และทั้งเซิร์ฟเวอร์ลดเลือดบอสถึงเป้า ต้องร่วมสู้ในสัปดาห์นั้น (รับได้ถึงสัปดาห์ถัดไป)</p>`;
  return `<div class="quest-board wb-board">${head}<h3 class="board-period">รางวัลส่วนตัว</h3>${personal}${sharedHtml}</div>`;
}
