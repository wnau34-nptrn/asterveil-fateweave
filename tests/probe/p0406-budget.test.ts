import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { Policy, Style } from '../sim/balance-sim';
import { endgameCompany, simulateWeeks, type Income, type Source, type WeekPlan, type WeekReport } from '../sim/week-sim';
// P04-06: weekly sources and sinks for a company past the campaign, by play pattern (OD-06: 3–5 sessions of one run),
// with and without the sweep and quest board. `BUDGET_OUT=<file> npx vitest run tests/probe/p0406-budget.test.ts`
// writes a Markdown table (BUDGET_N companies per policy, weeks 2–3 of three averaged so the board's first week does not
// start empty).
const PLANS: Record<string, WeekPlan> = {
  'เล่น 3 ไม่ใช้กวาด/กระดาน': { play: [0, 2, 5], sweep: false, board: false },
  'เล่น 3': { play: [0, 2, 5], sweep: true, board: true },
  'เล่น 4': { play: [0, 1, 3, 5], sweep: true, board: true },
  'เล่น 5': { play: [0, 1, 2, 3, 4], sweep: true, board: true },
  'เล่น 5 + ล็อกอินอีก 2 วัน': { play: [0, 1, 2, 3, 4], login: [5, 6], sweep: true, board: true },
  'ล็อกอินทุกวัน ไม่เล่น': { play: [], login: [0, 1, 2, 3, 4, 5, 6], sweep: true, board: true },
};
const sum = (a: Income, b: Income): Income => ({ ore: a.ore + b.ore, gold: a.gold + b.gold, dust: a.dust + b.dust, shard: a.shard + b.shard, tomes: a.tomes + b.tomes });
const scale = (a: Income, k: number): Income => ({ ore: a.ore * k, gold: a.gold * k, dust: a.dust * k, shard: a.shard * k, tomes: a.tomes * k });
const z: Income = { ore: 0, gold: 0, dust: 0, shard: 0, tomes: 0 };
const fmt = (a: Income) => `${Math.round(a.ore)} / ${Math.round(a.gold)} / ${Math.round(a.dust)} / ${Math.round(a.tomes)}`;

test.skipIf(!process.env.BUDGET_OUT)('farm budget', () => {
  const n = Number(process.env.BUDGET_N ?? 4); const style = (process.env.BUDGET_STYLE ?? 'casual') as Style;
  const lines = ['| ผู้เล่น | แบบ | เที่ยว (สำเร็จ) | เล่นจริง แร่/ทอง/ฝุ่น/ตำรา | ของตก (ย่อย แร่/ฝุ่น, ชิ้น) | กวาดล้าง (ครั้ง) | กระดาน (รับ) | รวม | กวาด+กระดาน % ของแร่ | ใช้ในค่าย แร่/ทอง/ฝุ่น | ทีมสิ้นสัปดาห์ 3: ★ / เลเวลสกิล / ตีบวก |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const policy of ['rush', 'explorer'] as Policy[]) {
    const companies = Array.from({ length: n }, (_, i) => { const seed = 1001 + i * 37; return { seed, p: endgameCompany(seed, policy, style) }; });
    for (const [name, plan] of Object.entries(PLANS).filter(([k]) => !process.env.BUDGET_PLANS || process.env.BUDGET_PLANS.split(',').some(x => k.startsWith(x)))) {
      const all = companies.map(c => simulateWeeks(c.p, c.seed, policy, style, plan, 3)); const weeks: WeekReport[] = all.flatMap(w => w.slice(1));
      const end = (f: (w: WeekReport) => number) => (all.reduce((v, w) => v + f(w.at(-1)!), 0) / all.length).toFixed(1);
      const k = 1 / weeks.length; const mean = (s: Source) => scale(weeks.reduce((v, w) => sum(v, w.income[s]), z), k);
      const run = mean('run'), drops = mean('drops'), sw = mean('sweep'), bd = mean('board'); const total = sum(sum(run, drops), sum(sw, bd));
      const spent = scale(weeks.reduce((v, w) => sum(v, w.spent), z), k); const avg = (f: (w: WeekReport) => number) => (weeks.reduce((v, w) => v + f(w), 0) * k).toFixed(1);
      const share = total.ore ? Math.round((sw.ore + bd.ore) / total.ore * 100) : 0;
      lines.push(`| ${name} | ${policy} | ${avg(w => w.runs)} (${avg(w => w.complete)}) | ${fmt(run)} | ${Math.round(drops.ore)}/${Math.round(drops.dust)}, ${avg(w => w.items)} | ${fmt(sw)} (${avg(w => w.sweeps)}) | ${fmt(bd)} (${avg(w => w.claims)}) | ${fmt(total)} | ${share}% | ${Math.round(spent.ore)} / ${Math.round(spent.gold)} / ${Math.round(spent.dust)} | ${end(w => w.stars)} / ${end(w => w.skills)} / ${end(w => w.plus)} |`);
      const blocked = weeks.reduce<Record<string, number>>((v, w) => { for (const [x, c] of Object.entries(w.blocked)) v[x] = (v[x] ?? 0) + c; return v; }, {});
      if (Object.keys(blocked).length) lines.push(`| ↳ ถูกปฏิเสธเพราะคลังเต็ม | ${policy} | ${JSON.stringify(blocked)} | | | | | | | | |`);
    }
  }
  writeFileSync(process.env.BUDGET_OUT!, lines.join('\n') + '\n');
}, 7200000);
