import { describe, expect, it } from 'vitest';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { weekOf } from '../src/core/world/board';
import { affixPool } from '../src/core/world/equipment';
import { newProfile } from '../src/core/world/profile';
import type { MapDefinition, Profile } from '../src/core/world/types';
import { worldBossBanner, worldBossPage, worldBossReady, worldBossStartReason, type WbPageState } from '../src/ui/world-boss-panel';
import { intentRuleThai } from '../src/ui/th';
import type { Intent } from '../src/core/battle/types';
import type { WorldBossStatus } from '../src/platform/server-client';

// P11-04 part 2 / P11-05 step 4: the World Boss page is a pure view of the book and the shared bars the server reports.
// The warden pages run on the shipped rules (week W = 2968, before the trio's first week 2969, OD-52); the trio pages on a rules copy that sets `from`.
const D = 20_773; const W = weekOf(D);
const TRIO: readonly MapDefinition[] = MAPS.map((m, i) => i === 0 ? { ...m, worldBoss: { ...m.worldBoss, trio: { ...m.worldBoss.trio, from: W } } } : m);
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { ...commander }, cleared: MAPS.map(m => m.id), ...patch });
const status = (current: number, last: number | null = null): WorldBossStatus => ({ week: W,
  current: { week: W, hp: 5000, left: 5000 - current, accounts: 12 }, last: last === null ? null : { week: W - 1, hp: 5000, left: 5000 - last, accounts: 9 } });
const bars = (taken: Record<string, number>, lastTaken: Record<string, number> = {}): WorldBossStatus => ({ week: W, current: null, last: null,
  bars: (['kragmor', 'valdrakk', 'morvane'] as const).map(boss => ({ boss, week: W, hp: 2000, left: 2000 - (taken[boss] ?? 0), accounts: 4, attempts: 8 })),
  lastBars: Object.keys(lastTaken).map(boss => ({ boss: boss as 'kragmor', week: W - 1, hp: 2000, left: 2000 - lastTaken[boss]!, accounts: 4, attempts: 8 })) });
const played = (attempts: number, claimed: string[] = [], week = W): Profile => base({ worldBoss: { weeks: [{ week, attempts, bosses: {}, ...(attempts ? { legacy: { attempts, damage: attempts * 300, best: 300 } } : {}), claimed }] } });
const trioPlayed = (boss: 'kragmor' | 'valdrakk' | 'morvane', attempts: number, claimed: string[] = [], week = W, extra: Partial<Profile> = {}): Profile =>
  base({ worldBoss: { weeks: [{ week, attempts, bosses: { [boss]: { attempts, damage: attempts * 300, best: 300 } }, claimed }] }, ...extra });
const view = (tab: WbPageState['tab'], extra: Partial<WbPageState> = {}): WbPageState => ({ tab, pick: 'kragmor', ...extra });

describe('World Boss page, warden weeks (before trio.from)', () => {
  it('shows the week, the attempts and the personal milestones; offline has no shared bar', () => {
    const fight = worldBossPage(played(2, ['p-2']), MAPS, D, null, false, view('fight'));
    expect(fight).toContain('2/5'); expect(fight).toContain('id="wb-offline"'); expect(fight).not.toContain('class="wb-bar"'); expect(fight).toContain('ครั้งที่ 3/5'); expect(fight).not.toContain('wb-boss-card'); expect(fight).not.toContain('wb-fight-advice');
    const rewards = worldBossPage(played(2, ['p-2']), MAPS, D, null, false, view('rewards'));
    expect(rewards).toContain('id="wb-p-2" data-state="claimed"'); expect(rewards).toContain('id="wb-p-4" data-state="open"'); expect(rewards).toContain('อีก 2 ครั้ง'); expect(rewards).not.toContain('wb-claim');
  });
  it('four tabs of at least 44px buttons and no quest-board World Boss tab', () => {
    const html = worldBossPage(played(0), MAPS, D, null, false, view('fight'));
    for (const t of ['fight', 'rewards', 'craft', 'bosses']) expect(html).toContain(`id="wb-tab-${t}"`);
    expect(html).toContain('aria-selected="true"');
  });
  it('online shows the shared HP bar and a claim only once the server has reached the percent (and we took part)', () => {
    const none = worldBossPage(played(1), MAPS, D, status(1000), true, view('fight'));
    expect(none).toContain('aria-valuenow="20"');
    expect(worldBossPage(played(1), MAPS, D, status(1000), true, view('rewards'))).toContain('ทั้งเซิร์ฟเวอร์ 20% / 50%');
    expect(worldBossPage(played(1), MAPS, D, status(1000), true, view('rewards'))).not.toContain('data-lobby="wb-claim"');
    const half = worldBossPage(played(1), MAPS, D, status(2500), true, view('rewards'));
    expect(half).toContain(`data-lobby="wb-claim" data-id="s-50" data-week="${W}"`); expect(half).not.toContain('data-id="s-100"');
    expect(worldBossReady(played(1), MAPS, D, status(2500))).toBe(1); expect(worldBossReady(played(1), MAPS, D, status(5000))).toBe(2);
    expect(worldBossReady(played(0), MAPS, D, status(5000))).toBe(0); expect(worldBossReady(played(1, ['s-50']), MAPS, D, status(2500))).toBe(0);
    expect(worldBossReady(played(1), MAPS, D, null)).toBe(0);
  });
  it('last week stays claimable for those who took part, and only what is unclaimed shows', () => {
    const p = base({ worldBoss: { weeks: [{ week: W - 1, attempts: 3, bosses: {}, legacy: { attempts: 3, damage: 900, best: 300 }, claimed: ['p-2'] }, { week: W, attempts: 0, bosses: {}, claimed: [] }] } });
    const html = worldBossPage(p, MAPS, D, status(0, 5000), true, view('rewards'));
    expect(html).toContain(`data-id="s-50" data-week="${W - 1}"`); expect(html).toContain(`data-id="s-100" data-week="${W - 1}"`);
    expect(worldBossReady(p, MAPS, D, status(0, 5000))).toBe(2);
    const done = worldBossPage(base({ worldBoss: { weeks: [{ week: W - 1, attempts: 3, bosses: {}, legacy: { attempts: 3, damage: 900, best: 300 }, claimed: ['s-50', 's-100'] }] } }), MAPS, D, status(0, 5000), true, view('rewards'));
    expect(done).not.toContain(`data-week="${W - 1}"`);
  });
  it('the start button closes when the five attempts are used or there is no field team', () => {
    expect(worldBossStartReason(base(), MAPS, D)).toBe(''); expect(worldBossStartReason(played(5), MAPS, D)).toBe('used');
    const noTeam = base(); noTeam.party = { ...noTeam.party, deployed: [] }; expect(worldBossStartReason(noTeam, MAPS, D)).toBe('team');
    expect(worldBossPage(played(5), MAPS, D, null, false, view('fight'))).toMatch(/id="wb-start"[^>]*disabled/);
    expect(worldBossPage(base(), MAPS, D, null, false, view('fight'))).not.toMatch(/id="wb-start"[^>]*disabled/);
    expect(worldBossStartReason(base(), MAPS, D, 'kragmor')).toBe('boss');
  });
  it('the craft and bosses tabs read without the trio live', () => {
    expect(worldBossPage(base(), MAPS, D, null, false, view('craft'))).toContain('id="wb-item-valdrakk"');
    expect(worldBossPage(base(), MAPS, D, null, false, view('bosses'))).toContain('ทำลายได้');
  });
});

describe('World Boss page, trio weeks (rules copy with trio.from)', () => {
  it('the camp banner opens after map 1 and counts the allowance and ready rewards', () => {
    expect(worldBossBanner(base({ cleared: [] }), MAPS, D, null, false)).toBe('');
    const html = worldBossBanner(trioPlayed('kragmor', 2), TRIO, D, bars({ kragmor: 1000 }), false);
    expect(html).toContain('id="lobby-wboss"'); expect(html).toContain('สิทธิ์ 2/5'); expect(html).toContain('data-trio="true"'); expect(html).toContain('trip-badge');
    expect(worldBossBanner(base(), MAPS, D, null, false)).toContain('data-trio="false"');
  });
  it('fight shows three boss cards with shared bars online, and the start button needs the allowance', () => {
    const html = worldBossPage(trioPlayed('valdrakk', 1), TRIO, D, bars({ kragmor: 500, valdrakk: 1000 }), true, view('fight', { pick: 'valdrakk' }));
    for (const b of ['kragmor', 'valdrakk', 'morvane']) expect(html).toContain(`id="wb-pick-${b}"`);
    expect(html).toContain('id="wb-pick-valdrakk" class="wb-boss-card" data-lobby="wb-pick" data-boss="valdrakk" aria-pressed="true"');
    expect(html.match(/id="wb-fight-guide"/g)).toHaveLength(1);
    expect(html).toContain('แนวทางก่อนสู้ Valdrakk');
    expect(html).toContain('เก็บ Bash ไว้ใช้เมื่อท่าถัดไปคือ Wing Gathering');
    expect(html).toContain('aria-valuenow="25"'); expect(html).toContain('aria-valuenow="50"'); expect(html).toContain('เริ่มศึก Valdrakk · ครั้งที่ 2/5'); expect(html).toContain('ใช้สิทธิ์แล้ว <b>1/5</b>');
    const used = worldBossPage(trioPlayed('kragmor', 5), TRIO, D, null, false, view('fight'));
    expect(used).toMatch(/id="wb-start"[^>]*disabled/); expect(used).toContain('id="wb-offline"'); expect(used).not.toContain('wb-mini');
    expect(worldBossStartReason(base(), TRIO, D)).toBe('boss'); expect(worldBossStartReason(base(), TRIO, D, 'morvane')).toBe('');
  });
  it('rewards: p-2/p-4 with shards, three bosses of s-50/s-100 claims judged by their own bar, and last week incl. the warden', () => {
    const p = trioPlayed('morvane', 2, [], W);
    const html = worldBossPage(p, TRIO, D, bars({ kragmor: 1100, morvane: 1000 }), true, view('rewards'));
    expect(html).toContain('id="wb-p-2"'); expect(html).toContain('id="wb-p-4"');
    expect(html).toContain(`data-id="morvane:s-50" data-week="${W}"`); expect(html).not.toContain('data-id="morvane:s-100"');
    expect(html).not.toContain('data-id="kragmor:s-50"');  // took no part on that boss
    expect(worldBossReady(p, TRIO, D, bars({ morvane: 2000 }))).toBe(2); expect(worldBossReady(p, TRIO, D, bars({ kragmor: 2000 }))).toBe(0);
    const old = base({ worldBoss: { weeks: [{ week: W - 1, attempts: 3, bosses: { kragmor: { attempts: 1, damage: 100, best: 100 } }, legacy: { attempts: 2, damage: 600, best: 300 }, claimed: ['kragmor:s-50'] }, { week: W, attempts: 0, bosses: {}, claimed: [] }] } });
    const st: WorldBossStatus = { ...bars({}, { kragmor: 2000 }), last: { week: W - 1, hp: 5000, left: 0, accounts: 9 } };
    const last = worldBossPage(old, TRIO, D, st, true, view('rewards'));
    expect(last).toContain(`data-id="kragmor:s-100" data-week="${W - 1}"`); expect(last).not.toContain(`data-id="kragmor:s-50" data-week="${W - 1}"`);
    expect(last).toContain(`data-id="s-50" data-week="${W - 1}"`);  // the old warden's milestone
  });
  it('craft: locked until the forge opens, the sheet needs the affixes and the shards', () => {
    const closed = worldBossPage(base({ cleared: [] }), TRIO, D, null, false, view('craft'));
    expect(closed).toContain('lobby-locked'); expect(closed).toMatch(/id="wb-craft-kragmor"[^>]*disabled/);
    expect(worldBossPage(base(), TRIO, D, null, false, view('craft'))).not.toContain('lobby-locked');
    const need = TRIO[0]!.equipment.affixCount[4]! - 1; const pool = affixPool(TRIO[0]!.equipment, 'body').filter(a => a !== 'hp');
    const rich = trioPlayed('kragmor', 1, [], W, { bossShards: { kragmor: 40 }, bank: { ore: 99, gold: 0, shard: 0, dust: 99 } });
    const sheet = worldBossPage(rich, TRIO, D, null, false, view('craft', { craft: { boss: 'kragmor', affixes: [] } }));
    expect(sheet).toContain('id="wb-craft-sheet"'); expect(sheet).toMatch(/id="wb-craft-confirm"[^>]*disabled/);
    const ready = worldBossPage(rich, TRIO, D, null, false, view('craft', { craft: { boss: 'kragmor', affixes: pool.slice(0, need), set: 'dawn' } }));
    expect(ready).not.toMatch(/id="wb-craft-confirm"[^>]*disabled/); expect(ready).toContain('data-set="dawn" class="wb-chip" aria-pressed="true"');
    const poor = worldBossPage(trioPlayed('kragmor', 1, [], W, { bossShards: { kragmor: 39 } }), TRIO, D, null, false, view('craft', { craft: { boss: 'kragmor', affixes: pool.slice(0, need) } }));
    expect(poor).toMatch(/id="wb-craft-confirm"[^>]*disabled/); expect(poor).toContain('เศษบอสยังไม่พอ');
  });
  it('the bosses tab explains the answer and the cost of ignoring it for each boss', () => {
    const html = worldBossPage(base(), TRIO, D, null, false, view('bosses'));
    for (const b of ['kragmor', 'valdrakk', 'morvane']) expect(html).toContain(`id="wb-info-${b}"`);
    expect(html.match(/ไม่ตอบก็สู้ได้แต่/g)).toHaveLength(3);
  });
});

describe('intent labels from the resolver (P11-05)', () => {
  const intent = (patch: Partial<Intent>): Intent => ({ sourceId: 'f1', targetSlot: 0, name: 'X', damage: 20, kind: 'physical', targetId: 'h1', beat: 1, round: 1, ...patch } as Intent);
  it('names the breakable charge, the court bonus, the stagger and the summon', () => {
    expect(intentRuleThai(intent({ charge: true, breakable: true, damage: 0 }))).toContain('ทำลายได้');
    expect(intentRuleThai(intent({ charge: true, damage: 0 }))).not.toContain('ทำลายได้');
    expect(intentRuleThai(intent({ court: 20 }))).toContain('ราชสำนัก +20%');
    expect(intentRuleThai(intent({ special: 'stagger', damage: 0 }))).toContain('เสียหลัก');
    expect(intentRuleThai(intent({ summon: ['f2'], damage: 0 }))).toContain('เรียกลูกน้อง');
  });
});

// Leaderboard (owner 2026-11-28 “เพิ่ม Leader board”): the rank tab is a view of the server's board.
describe('World Boss page, rank tab', () => {
  const rows = [
    { rank: 1, handle: 'ค่าย-AAAAA', total: 9000, attempts: 5, best: 2500, you: false },
    { rank: 2, handle: 'ค่าย-BBBBB', total: 4200, attempts: 3, best: 1800, you: true },
  ];
  it('lists handles by damage, marks the player, and adds their rank when it is past the list', () => {
    const html = worldBossPage(base(), MAPS, D, null, true, view('rank', { board: { week: W, boss: 'all', players: 2, rows, you: { rank: 2, total: 4200, attempts: 3, best: 1800 } } }));
    expect(html).toContain('id="wb-tab-rank"');
    expect(html).toContain('ค่าย-AAAAA'); expect(html).toMatch(/wb-rank-row you"[^>]*aria-current="true"/); expect(html).toContain('(คุณ)');
    expect(html).not.toContain('wb-rank-you');
    const far = worldBossPage(base(), MAPS, D, null, true, view('rank', { board: { week: W, boss: 'all', players: 40, rows: [rows[0]!], you: { rank: 31, total: 300, attempts: 1, best: 300 } } }));
    expect(far).toContain('อันดับของคุณ <b>31</b> / 40');
  });
  it('says when it is loading, unavailable, offline or empty; boss picks only in trio weeks', () => {
    expect(worldBossPage(base(), MAPS, D, null, true, view('rank'))).toContain('กำลังโหลดอันดับ');
    expect(worldBossPage(base(), MAPS, D, null, true, view('rank', { board: null }))).toContain('โหลดอันดับไม่ได้');
    expect(worldBossPage(base(), MAPS, D, null, false, view('rank'))).toContain('ต้องเชื่อมต่อเซิร์ฟเวอร์');
    const empty = worldBossPage(base(), MAPS, D, null, true, view('rank', { board: { week: W, boss: 'all', players: 0, rows: [], you: null } }));
    expect(empty).toContain('ยังไม่มีใครลงบอสนี้'); expect(empty).toContain('ลงบอสอย่างน้อย 1 ครั้ง');
    expect(empty).not.toContain('wb-rank-boss-kragmor');
    expect(worldBossPage(base(), TRIO, D, null, true, view('rank', { board: null }))).toContain('id="wb-rank-boss-kragmor"');
  });
});
