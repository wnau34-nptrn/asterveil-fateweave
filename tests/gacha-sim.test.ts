import { expect, it } from 'vitest';
import { MAPS as maps } from '../src/content/world/maps';
import { emptyGacha, gachaExchange, gachaPull } from '../src/core/world/gacha';
import { newProfile } from '../src/core/world/profile';
import type { GachaRules, MapDefinition, Profile } from '../src/core/world/types';

// P10 economy check (docs/design/GACHA_P10_SPEC_TH.md §4): players run the real `gachaPull`/`gachaExchange` on a ticket
// budget per 28 days, pulling ten at a time and exchanging 80 points for a favourite they do not own. Gacha-only: story,
// hiring board, weekly universal shards and the market are left out, so these times are upper bounds for a real player.
// `SIM_REPORT=1 npm run sim` prints the table; the assertions hold the published-rate facts at a small sample size.
const home = maps[0]!;
const OWNED_AT_OPEN = 7; // characters a company holds when the cabinet opens after MAP2 (story + starter picks, assumed)
const FAVOURITE = 'astrid';

interface Outcome { firstFull: number; favourite: number; ownedAt: Record<number, number>; tenNoFull: number; tens: number; shardsPer28: number; favShardsPer28: number }
function lcg(seed: number) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0); }

function player(map: MapDefinition, budget: number, days: number, seed: number): Outcome {
  const rnd = lcg(seed); const pool = map.gacha.pool;
  let p: Profile = newProfile(map, 1, map.firstCompany);
  p.tutorialDone = true; p.cleared = maps.map(m => m.id); p.gacha = emptyGacha();
  const owned = pool.slice(0, OWNED_AT_OPEN);
  p.company = [...owned]; p.members = Object.fromEntries(owned.map(id => [id, { stars: 1, shards: 0 }]));
  p.party = { deployed: owned.slice(0, 5), reserve: owned.slice(5) };
  let carry = 0, firstFull = -1, favourite = -1, tenNoFull = 0, tens = 0, shards = 0, fav = 0; const ownedAt: Record<number, number> = {};
  for (let day = 1; day <= days; day++) {
    carry += budget / 28; const add = Math.floor(carry); carry -= add; p.gacha!.tickets += add;
    while (p.gacha!.tickets >= 10) {
      const r = gachaPull(p, maps, map, 10, map.gacha.version, rnd()); if (r.event.type !== 'gacha') throw new Error(r.event.type);
      p = r.profile; tens++; const res = r.event.entry.results;
      if (!res.some(x => x.full)) tenNoFull++; else if (firstFull < 0) firstFull = day;
      for (const x of res) { const n = x.full ? (x.grant === 'joined' ? 0 : x.qty) : x.qty; shards += n; if (x.heroId === FAVOURITE) fav += n; }
      if (p.gacha!.points >= map.gacha.exchangePoints) {
        const e = gachaExchange(p, maps, map, FAVOURITE, map.gacha.version); if (e.event.type !== 'gacha') throw new Error(e.event.type);
        p = e.profile; const x = e.event.entry.results[0]!; if (x.grant !== 'joined') { shards += x.qty; fav += x.qty; }
      }
    }
    if (favourite < 0 && p.members[FAVOURITE]) favourite = day;
    if (day % 28 === 0) ownedAt[day / 28] = pool.filter(id => p.members[id]).length - OWNED_AT_OPEN;
  }
  return { firstFull, favourite, ownedAt, tenNoFull, tens, shardsPer28: shards / (days / 28), favShardsPer28: fav / (days / 28) };
}
const pct = (xs: number[], q: number) => { const s = xs.filter(x => x >= 0).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))]! : -1; };
function run(rules: Partial<GachaRules>, budget: number, players: number, days = 364) {
  const map: MapDefinition = { ...home, gacha: { ...home.gacha, ...rules } };
  const out = Array.from({ length: players }, (_, i) => player(map, budget, days, 1000 + i * 7919));
  const avg = (f: (o: Outcome) => number) => out.reduce((a, o) => a + f(o), 0) / players;
  return {
    firstFull: [pct(out.map(o => o.firstFull), 0.5), pct(out.map(o => o.firstFull), 0.9)],
    favourite: [pct(out.map(o => o.favourite), 0.5), pct(out.map(o => o.favourite), 0.9)],
    tenNoFull: out.reduce((a, o) => a + o.tenNoFull, 0) / out.reduce((a, o) => a + o.tens, 0),
    newAt6: avg(o => o.ownedAt[6] ?? 0), newAt13: avg(o => o.ownedAt[13] ?? 0),
    shardsPer28: avg(o => o.shardsPer28), favShardsPer28: avg(o => o.favShardsPer28),
  };
}

it('P10 gacha economy (real rules, 96/80/60 tickets per 28 days)', () => {
  const report = process.env.SIM_REPORT === '1'; const n = report ? 2000 : 30;
  const cases: [string, Partial<GachaRules>, number][] = [
    ['ฐาน 96 ใบ · 7.5% · แลก 80', {}, 96], ['80 ใบ (เล่น 3–4 ครั้ง/สัปดาห์)', {}, 80], ['60 ใบ (เล่นน้อย)', {}, 60],
    ['96 ใบ · แลก 100', { exchangePoints: 100 }, 96], ['96 ใบ · ตัวเต็ม 5%', { fullBp: 500 }, 96], ['96 ใบ · ตัวเต็ม 10%', { fullBp: 1000 }, 96],
    ['96 ใบ · ปลดด้วยเศษ 100', { unlockShards: 100 }, 96],
  ];
  const rows = (report ? cases : cases.slice(0, 2)).map(([name, rules, budget]) => ({ name, ...run(rules, budget, n) }));
  const base = rows[0]!;
  // Published-rate facts: ten pulls without a full copy ≈ 0.925^10 = 45.86%.
  expect(base.tenNoFull).toBeGreaterThan(0.40); expect(base.tenNoFull).toBeLessThan(0.52);
  // The exchange alone brings the favourite within 80 pulls: 80 points at 96 tickets/28 days ≈ day 24 at the latest.
  expect(base.favourite[1]).toBeLessThanOrEqual(25); expect(rows[1]!.favourite[1]).toBeLessThanOrEqual(29);
  if (report) {
    console.log('\n| กรณี | ได้ตัวเต็มแรก วัน (มัธยฐาน/P90) | ได้ตัวโปรด วัน (มัธยฐาน/P90) | สิบครั้งไม่มีตัวเต็ม | ตัวใหม่ (จาก 8) 6 เดือน / 12 เดือน | เศษเฉพาะตัวรวม /28 วัน | เศษตัวโปรด /28 วัน |\n|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.name} | ${r.firstFull.join('/')} | ${r.favourite.join('/')} | ${(r.tenNoFull * 100).toFixed(1)}% | ${r.newAt6.toFixed(1)} / ${r.newAt13.toFixed(1)} | ${r.shardsPer28.toFixed(0)} | ${r.favShardsPer28.toFixed(1)} |`);
  }
}, 900_000);
