import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { wbKragmor, wbMorvane, wbValdrakk } from '../../src/content/encounters/world-boss-trio';
import { MAPS } from '../../src/content/world/maps';
import { gameRules } from '../../src/content/world/rules';
import { createBattle } from '../../src/core/battle/engine';
import type { EncounterDefinition } from '../../src/core/battle/types';
import { campLevel } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import { wbEncounter, wbPlay } from '../../src/core/world/world-boss';
import type { Profile } from '../../src/core/world/types';
import { simulateCampaign, type Policy } from '../sim/balance-sim';
import { wbTurns } from '../fixtures/world-boss';

// P11-05 World Boss trio — probe (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md). Step 1 (2026-11-16): the three encounters
// are the real v1 content (`src/content/encounters/world-boss-trio.ts`) on the real rules R1 breakable charge (Valdrakk)
// and R2 court + summon (Morvane); the first design run bounded those two rules by "answered/ignored" variants instead.
// `TRIO_OUT=<dir> npx vitest run tests/probe/p1105-world-boss-trio.test.ts` writes damage.md, budget.md, shared-hp.md.

const MAX_ROUNDS = gameRules.worldBoss.maxRounds;
const VARIANTS: [string, EncounterDefinition][] = [
  ['ผู้คุม (ปัจจุบัน)', lookup('world-boss-warden')!], ['คราก์มอร์', wbKragmor], ['วัลดรัค', wbValdrakk], ['มอร์เวน', wbMorvane],
];
const home = MAPS[0]!;
// The camp's field team placed into a draft encounter exactly as `wbEncounter` places it into the warden copy.
function fielded(p: Profile, data: EncounterDefinition): EncounterDefinition {
  const placed = wbEncounter(p, home, lookup)!;
  return { ...data, heroes: placed.heroes };
}
function cell(data: EncounterDefinition, style: 'advisor' | 'attack'): string {
  const r = wbPlay(data, wbTurns(data, MAX_ROUNDS, style), MAX_ROUNDS);
  const start = createBattle(data).heroes.reduce((v, h) => v + h.hp, 0); const end = r.state.heroes.reduce((v, h) => v + Math.max(0, h.hp), 0);
  const down = r.state.heroes.filter(h => h.hp <= 0).length;
  return `${r.damage} · HP ${end - start >= 0 ? '+' : '−'}${Math.abs(end - start)} · ล้ม ${down}${r.state.outcome === 'defeat' ? ` (แพ้ R${r.rounds})` : ''}`;
}
function companies(): [string, Profile][] {
  const out: [string, Profile][] = [['เริ่มใหม่ ผ่านแมพ 1', { ...newProfile(home, 7), tutorialDone: true, cleared: [home.id] }]];
  for (const policy of ['rush', 'explorer'] as Policy[]) for (const seed of [1001, 1038]) {
    out.push([`จบแมพ 3 ${policy} #${seed}`, simulateCampaign(seed, policy, 'casual', 0, 0).profile]);
    out.push([`หลังแคมเปญ ${policy} #${seed}`, simulateCampaign(seed, policy, 'casual', 2, 1).profile]);
  }
  return out;
}

// ---- Weekly value (P04-06 ore-equivalent: ore + 2 × gold + 12 × universal shard) ----
interface Reward { ore: number; gold: number; shard: number; boss: number }
const value = (r: Reward) => r.ore + 2 * r.gold + 12 * r.shard;
// Draft P11-05 rewards (design §2). `boss` = that boss's own shards (not tradeable; valued separately below).
export const TRIO = {
  attempt: { ore: 4, gold: 2, shard: 0, boss: 3 }, attempts: 5,
  personal: [{ id: 'p-2', at: 2, r: { ore: 0, gold: 0, shard: 1, boss: 2 } }, { id: 'p-4', at: 4, r: { ore: 0, gold: 0, shard: 1, boss: 3 } }],
  // Per boss, online only, for an account that finished an attempt on that boss that week.
  shared: [{ id: 's-50', percent: 50, r: { ore: 0, gold: 2, shard: 0, boss: 2 } }, { id: 's-100', percent: 100, r: { ore: 0, gold: 0, shard: 0, boss: 3 } }],
  craft: { shards: 40, ore: 30, dust: 10 }, bank: 200,
  // The week's HP per boss: last week's finished attempts on that boss × perAttempt, within [min, max].
  hp: { perAttempt: 400, min: 1500, max: 5_000_000 },
};
const OLD = gameRules.worldBoss;
const add = (a: Reward, b: Reward, k = 1): Reward => ({ ore: a.ore + k * b.ore, gold: a.gold + k * b.gold, shard: a.shard + k * b.shard, boss: a.boss + k * b.boss });
const Z: Reward = { ore: 0, gold: 0, shard: 0, boss: 0 };
// One week: `n` attempts spread over `bosses` distinct bosses (the first boss gets the remainder), online or not.
function week(n: number, bosses: number, online: boolean): { total: Reward; perBoss: number[] } {
  const per = Array.from({ length: bosses }, (_, i) => Math.floor(n / bosses) + (i < n % bosses ? 1 : 0));
  const shardBy = per.map(k => k * TRIO.attempt.boss); let total = add(Z, TRIO.attempt, n);
  // Personal milestones pay the shards of the boss of the attempt that reached them (attempt 2 and 4 in play order:
  // the sim plays the first boss first).
  const order = per.flatMap((k, i) => Array<number>(k).fill(i));
  for (const m of TRIO.personal) if (n >= m.at) { total = add(total, m.r); shardBy[order[m.at - 1]!]! += m.r.boss; }
  if (online) for (let i = 0; i < bosses; i++) for (const m of TRIO.shared) { total = add(total, m.r); shardBy[i]! += m.r.boss; }
  return { total, perBoss: shardBy };
}
const oldWeek = (): number => value({ ...Z, ...OLD.attemptReward, shard: 0 }) * OLD.attempts
  + OLD.personal.reduce((v, m) => v + value({ ...Z, ...m.reward, shard: m.reward.shard ?? 0 }), 0)
  + OLD.shared.reduce((v, m) => v + value({ ...Z, ...m.reward, shard: m.reward.shard ?? 0 }), 0);

// ---- Shared HP: does a normal week fall? Deterministic population, previous-week participation sets the HP. ----
function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
// Damage per attempt by tier (p1104 damage.md, advisor): starter 155, end of map 3 ~520, after the campaign ~830.
const TIERS = [{ share: 0.25, dmg: 155 }, { share: 0.45, dmg: 520 }, { share: 0.30, dmg: 830 }];
function sharedRun(accounts: number, focus: number, perAttempt: number, seed: number): { fall50: number[]; fall100: number[] } {
  const rnd = lcg(seed); const players = Array.from({ length: accounts }, () => {
    const t = rnd(); let acc = 0; const tier = TIERS.find(x => (acc += x.share) >= t) ?? TIERS[2]!;
    return { dmg: tier.dmg * (0.85 + 0.3 * rnd()), fav: Math.floor(rnd() * 3), plays: 3 + Math.floor(rnd() * 3), active: rnd() < 0.8 };
  });
  let last = [0, 0, 0]; const fall50 = [0, 0, 0], fall100 = [0, 0, 0];
  for (let w = 0; w < 8; w++) {
    const hp = last.map(a => Math.min(TRIO.hp.max, Math.max(TRIO.hp.min, a * perAttempt))); const dealt = [0, 0, 0]; const tries = [0, 0, 0];
    players.forEach(p => { if (!p.active && rnd() < 0.5) return; for (let a = 0; a < p.plays; a++) { const b = rnd() < focus ? p.fav : Math.floor(rnd() * 3); dealt[b]! += p.dmg; tries[b]!++; } });
    if (w >= 2) for (let b = 0; b < 3; b++) { if (dealt[b]! >= hp[b]! / 2) fall50[b]!++; if (dealt[b]! >= hp[b]!) fall100[b]!++; }
    last = tries;
  }
  return { fall50, fall100 };
}

test.skipIf(!process.env.TRIO_OUT)('world boss trio probe', () => {
  const dir = process.env.TRIO_OUT!;
  // Damage, HP lost and downs per attempt.
  const head = `| ค่าย | Lv | ${VARIANTS.map(v => v[0]).join(' | ')} |`;
  const lines = ['ดาเมจต่อบอส · HP ทีมที่เสีย · ฮีโร่ล้ม (แปดรอบ) — บน: advisor, ล่าง: ตีธรรมดา', '', head, `|---|---|${VARIANTS.map(() => '---').join('|')}|`];
  for (const [name, p] of companies()) {
    for (const style of ['advisor', 'attack'] as const)
      lines.push(`| ${style === 'advisor' ? name : '↳ ตีธรรมดา'} | ${style === 'advisor' ? `Lv${campLevel(home, p.campXp)}` : ''} | ${VARIANTS.map(([, d]) => cell(fielded(p, d), style)).join(' | ')} |`);
  }
  writeFileSync(`${dir}/damage.md`, lines.join('\n') + '\n');

  // Weekly budget.
  const b = ['| สัปดาห์ | แร่ | ทอง | เศษกลาง | แร่เทียบ (ซื้อขายได้) | เศษบอสรวม | เศษบอสต่อตัว |', '|---|---|---|---|---|---|---|'];
  for (const online of [true, false]) for (const n of [3, 4, 5]) for (const k of [1, 2, 3]) {
    if (k > n) continue; const w = week(n, k, online);
    b.push(`| ${online ? 'ออนไลน์' : 'ออฟไลน์'} ${n} ครั้ง / ${k} บอส | ${w.total.ore} | ${w.total.gold} | ${w.total.shard} | ${value(w.total)} | ${w.total.boss} | ${w.perBoss.join(' / ')} |`);
  }
  const max = week(5, 3, true).total; const freed = oldWeek() - value(max);
  b.push('', `เดิม (ผู้คุม) สูงสุด ${oldWeek()} แร่เทียบ/สัปดาห์ · ใหม่ (5 ครั้ง สามบอส ออนไลน์) ${value(max)} · ส่วนที่ย้ายไปเป็นเศษบอส ${freed} แร่เทียบ ÷ ${max.boss} เศษ ≈ ${(freed / max.boss).toFixed(2)} แร่เทียบ/เศษ`);
  b.push(`สูตร P04-06: งานรายสัปดาห์ 409 + กวาด 14 ครั้ง 672 + บอส ${value(max)} + เศษบอส ${freed} = ${409 + 672 + value(max) + freed} (เพดาน 1200)`);
  b.push('', '| เป้าของ (เศษ ' + TRIO.craft.shards + ') | สัปดาห์ถึงของชิ้นแรก |', '|---|---|');
  for (const online of [true, false]) for (const n of [3, 5]) {
    const focus = week(n, 1, online).perBoss[0]!; const spread = week(n, 3, online).perBoss;
    b.push(`| ${online ? 'ออนไลน์' : 'ออฟไลน์'} ${n} ครั้ง ตีตัวเดียว | ${(TRIO.craft.shards / focus).toFixed(1)} |`);
    if (n >= 3) b.push(`| ${online ? 'ออนไลน์' : 'ออฟไลน์'} ${n} ครั้ง กระจายสามตัว (ครบสามชิ้น) | ${(TRIO.craft.shards / Math.min(...spread)).toFixed(1)} |`);
  }
  writeFileSync(`${dir}/budget.md`, b.join('\n') + '\n');

  // Shared HP.
  const s = ['| บัญชี | เลือกตัวโปรด | HP/ครั้งที่เล่นสัปดาห์ก่อน | ถึง 50% (สัปดาห์ 3–8 ต่อบอส) | ล้ม 100% |', '|---|---|---|---|---|'];
  for (const accounts of [2, 5, 20, 200, 2000]) for (const focus of [0.34, 0.7]) for (const per of [400, 450, 550]) {
    const r = sharedRun(accounts, focus, per, 7 + accounts);
    s.push(`| ${accounts} | ${Math.round(focus * 100)}% | ${per} | ${r.fall50.join(' / ')} จาก 6 | ${r.fall100.join(' / ')} จาก 6 |`);
  }
  writeFileSync(`${dir}/shared-hp.md`, s.join('\n') + '\n');
}, 3_600_000);
