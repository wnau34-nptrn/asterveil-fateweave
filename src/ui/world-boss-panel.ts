import { morvaneAdvice } from './world-boss-advice';
import { wbArtUrl } from '../game/visuals/world-boss-art';
import { gearArt } from './equip-art';
import { bossCraftReason, isWbBoss, sharedPercent, trioLive, wbBook, wbClaimReason, wbWeekDamage, wbWeekOf, type WorldBossShared } from '../core/world/world-boss';
import { affixPool } from '../core/world/equipment';
import { featureMap, featureOpen } from '../core/world/profile';
import { partyLine } from '../core/world/tomes';
import { SET_IDS, WB_BOSSES, type GearStat, type MapDefinition, type Profile, type SetId, type SweepReward, type WbBossId } from '../core/world/types';
import type { SharedBar, SharedBoss, WbBoard, WbBoardBoss, WorldBossStatus } from '../platform/server-client';
import { bossDescription, bossNames } from './boss-equipment';
import { icon } from './icons';
import { heroText, setText, slotText, statName, sweepText } from './th';
import { portrait } from './portraits';

// P11-04 part 2 + P11-05 step 4: the World Boss page of the camp (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md §6) and its camp
// banner. Pure views of the profile's World Boss book and, in server play, of the shared bars the server reports
// (`ServerClient.worldBoss()`); offline there is no shared bar. Every action is a command (`worldBoss` from the battle,
// `claimWorldBoss`, `craftBossItem`); nothing is worked out in this file but wording. In weeks before `trio.from` (2969, OD-52)
// the page shows the warden of P11-04 on the same four tabs.
const dayLabel = (day: number): string => { const d = new Date(day * 86_400_000); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const weekEnd = (week: number): number => week * 7 + 3;
const n = (v: number): string => Math.max(0, v).toLocaleString('th-TH');
export const claimText: Record<string, string> = {
  progress: 'ทั้งเซิร์ฟเวอร์ยังไม่ถึงเป้า', absent: 'ต้องร่วมสู้ในสัปดาห์นั้นก่อน', claimed: 'รับแล้ว', offline: 'ต้องเล่นออนไลน์จึงรับได้',
  expired: 'หมดเวลารับ', full: 'รางวัลเกินเพดานคลัง · ใช้ทรัพยากรก่อน', locked: 'ยังไม่เปิด', day: 'ยังไม่รู้วันที่', unknown: '',
};
export const attemptReasonText: Record<string, string> = {
  used: 'ใช้สิทธิ์ครบแล้ว · สัปดาห์หน้ามีบอสใหม่', team: 'ต้องมีทีมสนามอย่างน้อย 1 คน', locked: 'เปิดพร้อมกระดานเควสต์', expired: 'นาฬิกาเครื่องย้อนกลับ · ใช้สัปดาห์ปัจจุบันของเซิร์ฟเวอร์',
  stale: 'ครั้งนี้ถูกบันทึกไปแล้ว', unfinished: 'ศึกยังไม่จบ', noDamage: 'ไม่ได้ลดเลือดบอส · ไม่นับและไม่เสียสิทธิ์', illegal: 'ส่งผลศึกไม่ผ่านการตรวจ', full: 'รางวัลเกินเพดานคลัง · ใช้ทรัพยากรก่อน',
  day: 'ยังไม่รู้วันที่', boss: 'เลือกบอสของสัปดาห์นี้',
};
export const craftReasonText: Record<string, string> = {
  affixes: 'เลือกคุณสมบัติให้ครบก่อน', set: 'ชุดที่เลือกไม่ถูกต้อง', pending: 'มีของรอจัดในถาด · จัดการก่อน', bag: 'คลังเต็ม · เก็บหรือรีไซเคิลของก่อน', shards: 'เศษบอสยังไม่พอ',
  ore: 'แร่ดาวยังไม่พอ', dust: 'ฝุ่นดาวยังไม่พอ', full: 'เกินเพดานแล้ว', unknown: 'ไม่รู้จักของชิ้นนี้', locked: 'ยังไม่เปิด',
};

// Page state kept by the camp view (the open tab, the picked boss, the craft sheet).
export type WbTab = 'fight' | 'rewards' | 'rank' | 'craft' | 'bosses';
export const WB_TABS: readonly WbTab[] = ['fight', 'rewards', 'rank', 'craft', 'bosses'];
const tabName: Record<WbTab, string> = { fight: 'ต่อสู้', rewards: 'รางวัล', rank: 'อันดับ', craft: 'สร้างของ', bosses: 'บอส' };
// Leaderboard (owner 2026-11-28 “เพิ่ม Leader board”): which bar and week the rank tab shows; `board` is what the server
// last answered for it (`undefined` while loading, `null` offline or unavailable).
export interface WbRank { boss: WbBoardBoss; last: boolean }
export interface WbCraft { boss: WbBossId; affixes: GearStat[]; set?: SetId }
export interface WbPageState { tab: WbTab; pick: WbBossId; craft?: WbCraft; rank?: WbRank; board?: WbBoard | null }

// Names; the painted emblems and banners come from ART-UI-WORLDBOSS-TRIO-001 (world-boss-art.ts).
export const wbBossText: Record<WbBossId, { name: string; title: string; tag: string; gist: string; answer: string; ignore: string; moves: string }> = {
  kragmor: { name: 'Kragmor', title: 'ไททันรอยแยก', tag: 'เกราะหิน · ชาร์จแล้วทุบ',
    moves: 'Stone Fist · Titan Gathering (ชาร์จ) · Mountain Fall (ทุบแรง ตัดจังหวะไม่ได้ ลงช่องหน้า) · Rift Quake (โดนทั้งทีม) · Boulder Hurl',
    gist: 'ช้าและหนัก มีเกราะศิลา: ดาเมจที่ไม่ใช่เป้าที่ถูกมาร์ก/กัดกร่อนจะถูกลด ท่า Titan Gathering ชาร์จแล้วตามด้วย Mountain Fall',
    answer: 'ใช้ Mark หรือ Acid เปิดเกราะก่อนโจมตี เมื่อเห็น Titan Gathering ให้เตรียม Guard หรือโล่คุ้มกันแนวหน้าจาก Mountain Fall ที่ตัดจังหวะไม่ได้', ignore: 'Mountain Fall ลงคนหน้าเต็มแรง และดาเมจที่ลงกับบอสลดลงเพราะเกราะ' },
  valdrakk: { name: 'Valdrakk', title: 'อสูรโลกแตก', tag: 'เร็วมาก · ชาร์จทำลายได้',
    moves: 'Shard Talon · Wing Gust (พลังงาน) · Wing Gathering (ชาร์จแบบกายภาพ ทำลายได้) · Worldshard Dive (โดนทั้งทีม พลังงาน)',
    gist: 'SPD สูงเกือบทุกคนช้ากว่า ท่า Wing Gathering ชาร์จเพื่อ Worldshard Dive ซึ่งโดนทั้งทีม',
    answer: 'เก็บ Bash ไว้ใช้เมื่อท่าถัดไปคือ Wing Gathering เพื่อตัดชาร์จและหยุด Worldshard Dive ถ้าตัดไม่ทันให้เตรียมโล่รับดาเมจและฮีลหลังท่าโจมตีทั้งทีม', ignore: 'ทุกคนเสีย 20–24 เลือดทุกหกเทิร์น' },
  morvane: { name: 'Morvane', title: 'ราชันด้ายขาด', tag: 'ราชสำนักเสริมพลัง',
    moves: 'Six-Hand Rend · Severing Bolt · Call the Court (เรียกลูกน้องที่ล้มกลับ) · Fate Lash · Shadow Tide (โดนทั้งทีม)',
    gist: 'ลูกน้องที่ยังยืนอยู่ทำให้ท่าบอสแรงขึ้น +10% ต่อตัว และเมื่อใช้ Call the Court จะเรียกลูกน้องที่ล้มกลับ',
    answer: `${morvaneAdvice} · เตรียมรับลูกน้องที่ Call the Court เรียกกลับ`, ignore: 'ท่าบอสแรงขึ้นสูงสุด +30% และลูกน้องตีต่อ' },
};

// The shared bar a milestone is judged against: the warden's (`current`/`last`) or a trio boss's (`bars`/`lastBars`).
type Group = WbBossId | 'warden';
function sharedFor(status: WorldBossStatus | null | undefined, week: number, claimWeek: number, group: Group): WorldBossShared | undefined {
  if (group === 'warden') { const s: SharedBoss | null | undefined = claimWeek === week ? status?.current : claimWeek === week - 1 ? status?.last : undefined; return s ? { week: s.week, hp: s.hp, left: s.left } : undefined; }
  const s = barOf(status, week, claimWeek, group); return s ? { week: s.week, hp: s.hp, left: s.left, boss: group } : undefined;
}
const barOf = (status: WorldBossStatus | null | undefined, week: number, claimWeek: number, boss: Group): SharedBar | undefined =>
  (claimWeek === week ? status?.bars : claimWeek === week - 1 ? status?.lastBars : undefined)?.find(b => b.boss === boss);
const idOf = (group: Group, id: string): string => group === 'warden' ? id : `${group}:${id}`;
interface Row { group: Group; claimWeek: number; id: string; m: { id: string; percent: number; reward: SweepReward; shards?: number } }
// The shared milestones the page lists: this week's live bosses, and last week's of any boss fought then (still unclaimed).
function sharedRows(p: Profile, maps: readonly MapDefinition[], week: number): Row[] {
  const rules = maps[0]!.worldBoss; const book = wbBook(p, week); const out: Row[] = [];
  for (const claimWeek of [week, week - 1]) {
    const wk = book.weeks.find(x => x.week === claimWeek); const now = claimWeek === week; const trio = trioLive(rules, claimWeek);
    const groups: Group[] = [...(trio ? WB_BOSSES : ['warden' as const])];
    if (!now) for (const g of [...WB_BOSSES, 'warden' as const]) if (!groups.includes(g) && (g === 'warden' ? wk?.legacy?.attempts : wk?.bosses[g]?.attempts)) groups.push(g);
    for (const group of groups) {
      if (!now && !(group === 'warden' ? wk?.legacy?.attempts : wk?.bosses[group]?.attempts)) continue;
      for (const m of group === 'warden' ? rules.shared : rules.trio.shared) {
        if (!now && wk!.claimed.includes(idOf(group, m.id))) continue;
        out.push({ group, claimWeek, id: idOf(group, m.id), m: { ...m, shards: 'shards' in m ? m.shards : undefined } as Row['m'] });
      }
    }
  }
  return out;
}
// Shared milestones ready to claim (this week and last week).
export function worldBossReady(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined): number {
  const home = maps[0]; if (!home) return 0; const week = wbWeekOf(day);
  return sharedRows(p, maps, week).filter(r => !wbClaimReason(p, maps, r.id, r.claimWeek, week, sharedFor(status, week, r.claimWeek, r.group))).length;
}
// '' when the next attempt can start (the battle itself refuses anything else at the server); else why not. In a trio week a boss must be picked.
export function worldBossStartReason(p: Profile, maps: readonly MapDefinition[], day: number, boss?: WbBossId): string {
  const home = maps[0]; if (!home) return 'locked';
  const week = wbWeekOf(day); const w = wbBook(p, week).weeks.at(-1)!;
  if (trioLive(home.worldBoss, week) ? !isWbBoss(boss) : boss !== undefined) return 'boss';
  if (w.attempts >= home.worldBoss.attempts) return 'used';
  if (!p.party.deployed.length) return 'team';
  return '';
}

const bar = (s: SharedBoss, label: string): string => {
  const pct = sharedPercent(s);
  return `<div class="wb-shared" role="group" aria-label="${label}"><div class="wb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" style="--wb-pct:${pct}%"><span></span></div>
    <p class="wb-bar-text">เลือดส่วนกลาง <b>${n(s.left)} / ${n(s.hp)}</b> · ลดไปแล้ว <b>${pct}%</b> · ผู้ร่วมสู้ ${s.accounts} บัญชี</p></div>`;
};
// The trio's painted emblem (ART-UI-WORLDBOSS-TRIO-001); decorative, the boss name stays DOM text beside it.
const medallion = (boss: WbBossId): string => `<span class="wb-medal" data-boss="${boss}" aria-hidden="true" style="--emblem:url(${wbArtUrl(`emblem_${boss}`)})"></span>`;

// ---- camp banner (above the bottom nav) ----
export function worldBossBanner(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined, expanded: boolean): string {
  const home = maps[0]; if (!home || !featureOpen(p, maps, 'worldBoss')) return '';
  const week = wbWeekOf(day); const w = wbBook(p, week).weeks.at(-1)!; const ready = worldBossReady(p, maps, day, status); const trio = trioLive(home.worldBoss, week);
  const left = Math.max(1, weekEnd(week) - day + 1);
  return `<button id="lobby-wboss" data-lobby="wboss" class="lobby-wboss" data-trio="${trio}"${trio ? ` style="--banner:url(${wbArtUrl('banner_trio')})"` : ''} aria-controls="lobby-sheet" aria-expanded="${expanded}">${trio ? '' : `<span class="wb-medals" aria-hidden="true"><span class="wb-medal" data-boss="warden">ผ</span></span>`}
    <span class="wb-banner-text"><b>บอสโลก${trio ? '' : ' · ผู้คุมรอยแยก'}</b><small>สิทธิ์ ${w.attempts}/${home.worldBoss.attempts} · เหลือ ${left} วัน</small></span>${ready ? `<small class="trip-badge" aria-label="รางวัลรอรับ ${ready}">${ready}</small>` : ''}${icon('right')}</button>`;
}

// ---- tabs ----
function fightTab(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined, online: boolean, v: WbPageState): string {
  const home = maps[0]!; const rules = home.worldBoss; const week = wbWeekOf(day); const w = wbBook(p, week).weeks.at(-1)!; const trio = trioLive(rules, week);
  const boss = trio ? v.pick : undefined; const reason = worldBossStartReason(p, maps, day, boss); const line = partyLine(home, p.party.deployed);
  const damage = wbWeekDamage(w);
  const attempts = `<p class="wb-attempts" id="wb-attempts">ใช้สิทธิ์แล้ว <b>${w.attempts}/${rules.attempts}</b> ครั้ง${trio ? ' (รวมสามบอส)' : ''} · ถึง ${dayLabel(weekEnd(week))}${w.attempts ? ` · ดาเมจรวม <b>${n(damage.damage)}</b> · ครั้งที่ดีที่สุด <b>${n(damage.best)}</b>` : ''}</p>`;
  const notes = `<p class="camp-note">ลงสนามด้วยทีมสนามของค่ายเลือดเต็ม · นับเฉพาะเลือดที่บอสเสียจริง · ศึกต้องจบ (ชนะ แพ้ หรือครบ ${rules.maxRounds} รอบ) จึงนับสิทธิ์ · ส่งผลครั้งเดียวตอนจบศึก</p>`;
  if (!trio) {
    const shared = online ? (status?.current ? bar(status.current, 'เลือดส่วนกลางของบอสสัปดาห์นี้') : '<p class="camp-note" id="wb-bar-missing">ยังอ่านเลือดส่วนกลางจากเซิร์ฟเวอร์ไม่ได้ · ลองเปิดแท็บนี้อีกครั้ง</p>') : '<p class="camp-note" id="wb-offline">เล่นออฟไลน์: ไม่มีแถบเลือดส่วนกลางและรางวัลส่วนรวม · รางวัลเข้าร่วมกับรางวัลส่วนตัวยังได้ตามปกติ</p>';
    return `<section class="wb-card" id="wb-card" aria-label="บอสโลกสัปดาห์นี้"><div class="wb-head"><span class="wb-emblem">${icon('flag')}</span><div><h3>บอสโลก · ผู้คุมรอยแยก</h3><small>สัปดาห์นี้ · สูงสุด ${rules.maxRounds} รอบต่อครั้ง</small></div></div>
      ${attempts}${shared}${notes}<p class="side-quest-reward">รางวัลเข้าร่วมต่อครั้ง: ${sweepText(rules.attemptReward, line)}</p>${startButton(reason, w.attempts, rules.attempts)}</section>`;
  }
  const cards = WB_BOSSES.map(b => {
    const t = wbBossText[b]; const sel = v.pick === b; const sharedBar = online ? barOf(status, week, week, b) : undefined; const tally = w.bosses[b];
    return `<button id="wb-pick-${b}" class="wb-boss-card" data-lobby="wb-pick" data-boss="${b}" aria-pressed="${sel}"${sel ? ' aria-describedby="wb-fight-advice"' : ''} data-selected="${sel}" style="--banner:url(${wbArtUrl(`banner_${b}`)})"><span class="wb-boss-text"><b>${t.name} <small>${t.title}</small></b><small>${t.tag}</small>
      ${online ? (sharedBar ? `<span class="wb-mini" role="progressbar" aria-label="เลือดส่วนกลาง ${t.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${sharedPercent(sharedBar)}" style="--wb-pct:${sharedPercent(sharedBar)}%"><span></span></span><small>เลือดส่วนกลาง ${n(sharedBar.left)} / ${n(sharedBar.hp)} · ลดแล้ว ${sharedPercent(sharedBar)}%</small>` : '<small>ยังอ่านเลือดส่วนกลางไม่ได้</small>') : ''}
      <small>${tally?.attempts ? `ลงสนาม ${tally.attempts} ครั้ง · ดาเมจดีที่สุด ${n(tally.best)}` : 'ยังไม่เคยสู้สัปดาห์นี้'}</small></span></button>
      ${sel ? `<section class="wb-card wb-prefight" id="wb-fight-guide" aria-labelledby="wb-fight-guide-title"><h4 id="wb-fight-guide-title">แนวทางก่อนสู้ ${t.name}</h4><p id="wb-fight-advice">${t.answer}</p></section>` : ''}`;
  }).join('');
  const t = rules.trio;
  return `<div class="wb-trio" id="wb-trio"><div class="wb-head"><span class="wb-emblem">${icon('flag')}</span><div><h3>บอสโลก · สามตัว</h3><small>เลือกบอสหนึ่งตัวต่อครั้ง · สูงสุด ${rules.maxRounds} รอบ</small></div></div>${attempts}
    ${online ? '' : '<p class="camp-note" id="wb-offline">เล่นออฟไลน์: ไม่มีแถบเลือดส่วนกลางและรางวัลส่วนรวม · รางวัลเข้าร่วมกับรางวัลส่วนตัวยังได้ตามปกติ</p>'}
    <div class="wb-boss-list" role="group" aria-label="เลือกบอส">${cards}</div>${notes}
    <p class="side-quest-reward">รางวัลเข้าร่วมต่อครั้ง: ${sweepText(t.attemptReward, line)} · เศษ ${wbBossText[v.pick].name} ${t.attemptShards}</p>${startButton(reason, w.attempts, rules.attempts, wbBossText[v.pick].name)}</div>`;
}
const startButton = (reason: string, done: number, total: number, boss?: string): string =>
  `<button id="wb-start" data-lobby="wb-start" class="primary"${boss ? ' aria-describedby="wb-fight-advice"' : ''}${reason ? ' disabled' : ''}>${reason ? attemptReasonText[reason] ?? 'ยังเข้าไม่ได้' : `เริ่มศึก${boss ? ` ${boss}` : ''} · ครั้งที่ ${done + 1}/${total}`}</button>`;

const bossShardText = (boss: WbBossId, shards: number): string => `เศษ ${wbBossText[boss].name} ${shards}`;
function rewardsTab(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined, online: boolean): string {
  const home = maps[0]!; const rules = home.worldBoss; const week = wbWeekOf(day); const w = wbBook(p, week).weeks.at(-1)!; const line = partyLine(home, p.party.deployed); const trio = trioLive(rules, week);
  const personal = (trio ? rules.trio.personal : rules.personal).map(m => {
    const done = w.claimed.includes(m.id); const more = Math.max(0, m.attempts - w.attempts); const shards = 'shards' in m ? m.shards : 0;
    return `<section class="side-quest board-task" id="wb-${m.id}" data-state="${done ? 'claimed' : 'open'}"><div class="board-task-body"><span class="side-quest-head">${icon('flag')}<b>ร่วมสู้ครบ ${m.attempts} ครั้ง</b><small>${done ? 'ได้รับแล้ว' : `อีก ${more} ครั้ง · จ่ายพร้อมครั้งนั้น`}</small></span><p class="side-quest-reward">รางวัล: ${sweepText(m.reward, line)}${shards ? ' · เศษของบอสที่สู้ครั้งนั้น ' + shards : ''}</p></div></section>`;
  }).join('');
  const intro = trio ? `<p class="side-quest-reward">รางวัลเข้าร่วมต่อครั้ง: ${sweepText(rules.trio.attemptReward, line)} · เศษของบอสที่สู้ ${rules.trio.attemptShards}</p>` : `<p class="side-quest-reward">รางวัลเข้าร่วมต่อครั้ง: ${sweepText(rules.attemptReward, line)}</p>`;
  const rows = sharedRows(p, maps, week); let sharedHtml = '';
  if (!online) sharedHtml = `<h3 class="board-period">รางวัลส่วนรวม</h3><p class="camp-note" id="wb-offline">ได้เมื่อเล่นออนไลน์และทั้งเซิร์ฟเวอร์ลดเลือดบอสถึงเป้า ต้องร่วมสู้กับบอสนั้นในสัปดาห์นั้น (รับได้ถึงสัปดาห์ถัดไป)</p>`;
  else for (const claimWeek of [week, week - 1]) {
    const mine = rows.filter(r => r.claimWeek === claimWeek); if (!mine.length) continue;
    sharedHtml += `<h3 class="board-period">${claimWeek === week ? 'รางวัลส่วนรวมสัปดาห์นี้' : `รางวัลส่วนรวมสัปดาห์ที่แล้ว · รับได้ถึง ${dayLabel(weekEnd(week))}`}</h3>`;
    for (const r of mine) {
      const shared = sharedFor(status, week, claimWeek, r.group); const why = wbClaimReason(p, maps, r.id, claimWeek, week, shared); const ready = !why; const done = why === 'claimed';
      const pct = shared ? sharedPercent(shared) : 0; const name = r.group === 'warden' ? 'ผู้คุมรอยแยก' : wbBossText[r.group].name;
      const state = ready ? 'รับรางวัลได้' : done ? 'รับแล้ว' : why === 'progress' ? `ทั้งเซิร์ฟเวอร์ ${pct}% / ${r.m.percent}%` : claimText[why] ?? '';
      const shards = r.group !== 'warden' && r.m.shards ? ` · ${bossShardText(r.group, r.m.shards)}` : '';
      sharedHtml += `<section class="side-quest board-task" id="wb-${r.id.replace(':', '-')}-${claimWeek}" data-state="${done ? 'claimed' : ready ? 'ready' : 'open'}"><div class="board-task-body"><span class="side-quest-head">${icon('flag')}<b>${name} · ลดเลือด ${r.m.percent}%</b><small>${state}</small></span><p class="side-quest-reward">รางวัล: ${sweepText(r.m.reward, line)}${shards}</p></div>${ready ? `<button id="wb-claim-${r.id.replace(':', '-')}-${claimWeek}" data-lobby="wb-claim" data-id="${r.id}" data-week="${claimWeek}" class="primary">รับรางวัล</button>` : ''}</section>`;
    }
  }
  return `<div class="wb-rewards">${intro}<h3 class="board-period">รางวัลส่วนตัว</h3>${personal}${sharedHtml}</div>`;
}

function craftTab(p: Profile, maps: readonly MapDefinition[], v: WbPageState): string {
  const home = maps[0]!; const t = home.worldBoss.trio; const open = featureOpen(p, maps, 'craft'); const fm = featureMap(maps, 'craft');
  const lock = open ? '' : `<div class="lobby-locked" role="status">${icon('seal')}<p><b>ยังไม่เปิด</b><span>ผ่านแผนที่ ${fm?.chapter ?? ''} · ${fm?.name ?? ''} ก่อน แล้วโรงตีเหล็กจะสร้างของบอสได้</span></p></div>`;
  const cards = WB_BOSSES.map(b => {
    const it = t.items[b]; const have = p.bossShards?.[b] ?? 0; const amount = home.equipment.boss.trio[it.power].amount; const sel = v.craft?.boss === b;
    return `<section class="wb-item" id="wb-item-${b}" data-selected="${sel}">${gearArt({ uid: 0, slot: it.slot, rarity: 4, level: t.craft.level, affixes: [], boss: it.power })}<div class="wb-item-text"><b>${bossNames[it.power]} <small>${slotText[it.slot]} · ทุกอาชีพ</small></b>
      <p>${bossDescription(it.power, amount)}</p><small>คุณสมบัติแรกคงที่: ${statName[it.first]} · ระดับ ${t.craft.level} ตำนาน คุณภาพเต็ม · ล็อกไว้ ไม่เข้าหลอม/ถ่ายโอน</small>
      <small class="wb-cost">เศษ ${wbBossText[b].name} <b>${have}/${t.craft.shards}</b> · แร่ดาว ${t.craft.ore} · ฝุ่นดาว ${t.craft.dust}</small></div>
      <button id="wb-craft-${b}" data-lobby="wb-craft" data-boss="${b}" class="${sel ? 'secondary' : 'primary'}"${open ? '' : ' disabled'}>${sel ? 'กำลังเลือก' : 'เลือกคุณสมบัติ'}</button></section>`;
  }).join('');
  return `<div class="wb-craft">${lock}<p class="camp-note">เศษบอสได้จากการสู้และรางวัลส่วนรวม (สูงสุด ${t.shardCap} ต่อบอส) · ของที่สร้างไม่สุ่ม: พลังบอสกับคุณสมบัติแรกคงที่ เลือกคุณสมบัติอีกอย่างและชุดเองได้</p>${cards}${open && v.craft ? craftSheet(p, maps, v.craft) : ''}</div>`;
}
function craftSheet(p: Profile, maps: readonly MapDefinition[], c: WbCraft): string {
  const home = maps[0]!; const t = home.worldBoss.trio; const it = t.items[c.boss]; const need = home.equipment.affixCount[4]! - 1;
  const pool = affixPool(home.equipment, it.slot).filter(a => a !== it.first);
  const reason = bossCraftReason(p, maps, c.boss, c.affixes, c.set); const ok = !reason;
  const affixes = pool.map(a => `<button data-lobby="wb-affix" data-stat="${a}" class="wb-chip" aria-pressed="${c.affixes.includes(a)}">${statName[a]}</button>`).join('');
  const sets = [`<button data-lobby="wb-set" data-set="" class="wb-chip" aria-pressed="${c.set === undefined}">ไม่ใส่ชุด</button>`, ...SET_IDS.map(s => `<button data-lobby="wb-set" data-set="${s}" class="wb-chip" aria-pressed="${c.set === s}">${setText[s]}</button>`)].join('');
  return `<section class="wb-sheet" id="wb-craft-sheet" aria-label="สร้าง ${bossNames[it.power]}"><h3>${bossNames[it.power]}</h3>
    <p class="camp-note">คุณสมบัติที่เลือก ${c.affixes.length}/${need} (นอกจาก ${statName[it.first]} ที่คงที่)</p><div class="wb-chips" role="group" aria-label="คุณสมบัติ">${affixes}</div>
    <p class="camp-note">ชุดอุปกรณ์ (ไม่บังคับ)</p><div class="wb-chips" role="group" aria-label="ชุด">${sets}</div>
    <button id="wb-craft-confirm" data-lobby="wb-craft-confirm" class="primary"${ok ? '' : ' disabled'}>${ok ? `สร้าง · เศษ ${t.craft.shards} แร่ดาว ${t.craft.ore} ฝุ่นดาว ${t.craft.dust}` : craftReasonText[reason] ?? 'ยังสร้างไม่ได้'}</button>
    <button id="wb-craft-cancel" data-lobby="wb-craft-cancel" class="secondary">ยกเลิก</button></section>`;
}

function bossesTab(): string {
  return `<div class="wb-bosses"><p class="camp-note">บอสสามตัวไม่มีท่าฆ่าทันทีและไม่มีเครื่องมือบังคับ: ตอบท่าที่ประกาศไว้ได้ก็ได้เปรียบ ไม่ตอบก็สู้ต่อได้แต่เสียเปรียบตามที่ระบุ ลูกน้องใช้สายพันธุ์ปกติ ทีมที่ล้มก่อนรอบสุดท้ายยังนับสิทธิ์</p>
    ${WB_BOSSES.map(b => { const t = wbBossText[b]; return `<section class="wb-info" id="wb-info-${b}">${medallion(b)}<div><h3>${t.name} <small>${t.title}</small></h3><p>${t.gist}</p><p><b>ท่า:</b> ${t.moves}</p><p><b>ตอบได้ด้วย:</b> ${t.answer}</p><p><b>ไม่ตอบก็สู้ได้แต่:</b> ${t.ignore}</p></div></section>`; }).join('')}</div>`;
}

export function worldBossTabs(tab: WbTab, ready: number): string {
  return `<div class="hire-tabs quest-tabs wb-tabs" role="tablist">${WB_TABS.map(t => `<button id="wb-tab-${t}" role="tab" data-lobby="wb-tab" data-tab="${t}" aria-selected="${t === tab}" class="${t === tab ? 'active' : ''}"><span>${tabName[t]}</span>${t === 'rewards' && ready ? `<small class="trip-badge">${ready}</small>` : ''}</button>`).join('')}</div>`;
}
// The rank tab: the week's top camps by damage dealt (anonymous camp handles, the same as chat), the player's own row
// highlighted, and their rank below when it is past the list. Picks: every boss or one bar, this week or last.
function rankTab(maps: readonly MapDefinition[], day: number, online: boolean, v: WbPageState): string {
  if (!online) return '<p class="camp-note wb-rank-note">อันดับต้องเชื่อมต่อเซิร์ฟเวอร์ · เล่นออฟไลน์ดูไม่ได้</p>';
  const rank = v.rank ?? { boss: 'all', last: false }, home = maps[0];
  const bosses: WbBoardBoss[] = home && trioLive(home.worldBoss, wbWeekOf(day) - (rank.last ? 1 : 0)) ? ['all', ...WB_BOSSES] : ['all'];
  const name = (b: WbBoardBoss) => b === 'all' ? 'รวมทุกบอส' : b === 'warden' ? 'ผู้คุมรอยแยก' : wbBossText[b].name;
  const chip = (id: string, label: string, on: boolean, data: string) => `<button id="wb-rank-${id}" data-lobby="wb-rank" ${data} class="ui-chip" aria-pressed="${on}">${label}</button>`;
  const picks = `<div class="wb-rank-picks" role="group" aria-label="เลือกอันดับ">${chip('week', 'สัปดาห์นี้', !rank.last, 'data-last="0"')}${chip('last', 'สัปดาห์ก่อน', rank.last, 'data-last="1"')}</div>`
    + (bosses.length > 1 ? `<div class="wb-rank-picks" role="group" aria-label="เลือกบอส">${bosses.map(b => chip(`boss-${b}`, name(b), rank.boss === b, `data-boss="${b}"`)).join('')}</div>` : '');
  const board = v.board;
  if (board === undefined) return `${picks}<p class="camp-note wb-rank-note" role="status">กำลังโหลดอันดับ…</p>`;
  if (board === null) return `${picks}<p class="camp-note wb-rank-note" role="status">โหลดอันดับไม่ได้ตอนนี้ · ลองเปิดแท็บนี้อีกครั้ง</p>`;
  // A hero the server names that this build has no art for shows its name instead of a face.
  const face = (id: string) => { try { return portrait(id); } catch { return `<small>${heroText[id]?.name ?? id}</small>`; } };
  // The team of the camp's best attempt: camp level, then each fielded hero's face and stars (names for screen readers).
  const team = (t: WbBoard['rows'][number]['team']) => t ? `<span class="wb-rank-team"><span class="wb-rank-level">Lv${t.level}</span>${t.heroes.map(([id, stars]) => `<span class="wb-rank-hero" title="${heroText[id]?.name ?? id} ★${stars}">${face(id)}<i aria-hidden="true">★${stars}</i></span>`).join('')}<span class="sr-only">ทีม: ${t.heroes.map(([id, stars]) => `${heroText[id]?.name ?? id} ★${stars}`).join(', ')}</span></span>` : '<span class="wb-rank-team"><small>ไม่มีข้อมูลทีม</small></span>';
  const row = (r: WbBoard['rows'][number]) => `<li class="wb-rank-row${r.you ? ' you' : ''}"${r.you ? ' aria-current="true"' : ''}><b class="wb-rank-no" data-top="${r.rank <= 3 ? r.rank : 0}">${r.rank}</b><span class="wb-rank-name">${r.handle}${r.you ? ' <small>(คุณ)</small>' : ''}</span><span class="wb-rank-dmg">${n(r.total)}<small>${r.attempts} ครั้ง · สูงสุด ${n(r.best)}</small></span>${team(r.team)}</li>`;
  const mine = board.you && !board.rows.some(r => r.you) ? `<p class="wb-rank-you">อันดับของคุณ <b>${board.you.rank.toLocaleString('th-TH')}</b> / ${board.players.toLocaleString('th-TH')} · ดาเมจ ${n(board.you.total)} (${board.you.attempts} ครั้ง)</p>` : '';
  const none = board.you ? '' : `<p class="camp-note">${rank.last ? 'สัปดาห์ก่อนคุณไม่ได้ลงบอสนี้' : 'ยังไม่มีอันดับ · ลงบอสอย่างน้อย 1 ครั้งเพื่อติดอันดับ'}</p>`;
  return `${picks}<p class="camp-note">ดาเมจรวมของทุกครั้งที่ลงใน${rank.last ? 'สัปดาห์ก่อน' : 'สัปดาห์นี้'} · ${name(rank.boss)} · ผู้เล่น ${board.players.toLocaleString('th-TH')} ค่าย · เท่ากันให้ค่ายที่ลงก่อนอยู่สูงกว่า · ชื่อเป็นรหัสค่ายเดียวกับแชท · ทีมคือทีมของครั้งที่ดาเมจสูงสุด (Lv = เลเวลค่าย)</p>`
    + mine + none + (board.rows.length ? `<ol class="wb-rank-list" aria-label="อันดับดาเมจ">${board.rows.map(row).join('')}</ol>` : '<p class="camp-note">ยังไม่มีใครลงบอสนี้</p>');
}
// The body of the World Boss page: the tabs and the open one.
export function worldBossPage(p: Profile, maps: readonly MapDefinition[], day: number, status: WorldBossStatus | null | undefined, online: boolean, v: WbPageState): string {
  const body = v.tab === 'fight' ? fightTab(p, maps, day, status, online, v) : v.tab === 'rewards' ? rewardsTab(p, maps, day, status, online) : v.tab === 'rank' ? rankTab(maps, day, online, v) : v.tab === 'craft' ? craftTab(p, maps, v) : bossesTab();
  return `${worldBossTabs(v.tab, worldBossReady(p, maps, day, status))}<div class="quest-board wb-board">${body}</div>`;
}
