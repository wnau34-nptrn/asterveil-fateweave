import { expect, test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { MAPS } from '../../src/content/world/maps';
import { gameRules } from '../../src/content/world/rules';
import { beginBattle, currentHeroId, interruptBlock, nextIntentOf, resolveCommand, targetOptions, validateCommand } from '../../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, TurnStage } from '../../src/core/battle/types';
import { campLevel } from '../../src/core/world/world';
import { newProfile } from '../../src/core/world/profile';
import { wbEncounter, wbPlay } from '../../src/core/world/world-boss';
import { WB_BOSSES, type Profile, type WbBossId } from '../../src/core/world/types';
import { simulateCampaign, type Policy } from '../sim/balance-sim';
import { battleLesson } from '../../src/ui/tutorial';
import { morvaneLesson } from '../../src/ui/world-boss-advice';

// P11-05 World Boss trio — probe (docs/design/WORLD_BOSS_TRIO_P11_05_TH.md). Step 1 (2026-11-16): the three encounters
// are the real v1 content (`src/content/encounters/world-boss-trio.ts`) on the real rules R1 breakable charge (Valdrakk)
// and R2 court + summon (Morvane); the first design run bounded those two rules by "answered/ignored" variants instead.
// `TRIO_OUT=<dir> npx vitest run tests/probe/p1105-world-boss-trio.test.ts` writes the step 6 validation tables.

const OLD = gameRules.worldBoss;
const MAX_ROUNDS = OLD.maxRounds;
const home = MAPS[0]!;
type Style = 'boss-first' | 'adds-first' | 'advisor' | 'answer' | 'pressure' | 'morvane-coach';
interface Sample {
  damage: number;
  hp: number;
  startHp: number;
  downs: number;
  result: string;
  bossHit: number;
  addsHit: number;
  addsDown: number;
  phase: boolean;
  mechanic: string;
}

function choice(state: BattleState, data: EncounterDefinition, style: Style, boss?: WbBossId): Command {
  const heroId = currentHeroId(state, data)!;
  const base = { beat: state.beat, heroId };
  const available = (action: ActionId, targetId: string): Command | undefined => {
    const cmd = { ...base, action, targetId };
    return validateCommand(state, data, cmd) ? undefined : cmd;
  };
  const intent = nextIntentOf(state, data, 'f1');
  if (style === 'answer' && boss === 'kragmor') {
    if (state.intent?.sourceId === 'f1' && state.intent.name === 'Mountain Fall') {
      const guard = available('guard', state.intent.targetId);
      if (guard) return guard;
    }
    const titan = state.enemies.find(e => e.id === 'f1')!;
    if (titan.markedUntil <= state.round && (titan.corrodedUntil ?? 0) <= state.round) {
      const open = available('mark', 'f1') ?? available('acid', 'f1');
      if (open) return open;
    }
  }
  if (style === 'answer' && boss === 'valdrakk') {
    if (intent?.breakable && !interruptBlock(state, data, 'f1', intent)) {
      const bash = available('bash', 'f1');
      if (bash) return bash;
    }
    if (intent?.name === 'Worldshard Dive') {
      const protect = available('halo', heroId) ?? available('ward', intent.targetId);
      if (protect) return protect;
    }
  }
  if (boss === 'morvane' && style === 'pressure') {
    if (state.enemies.filter(e => e.hp > 0 && e.id !== 'f1').length >= 2) {
      for (const action of ['volley', 'storm', 'sweep', 'quake'] as const) {
        const target = targetOptions(state, data, heroId, action).find(t => t.valid);
        const area = target && available(action, target.id);
        if (area) return area;
      }
    }
  }
  if (style === 'advisor' || style === 'answer' || style === 'pressure' || style === 'morvane-coach') {
    const lesson = (style === 'morvane-coach' ? morvaneLesson : battleLesson)(state, data);
    if (lesson) {
      const { action, targetId, recipientId, cooldownAction, cooldownTargetId } = lesson;
      // Keep defensive plays and area damage, but put single-target offense into the boss when legal.
      if (style === 'pressure' && ['attack', 'bolt', 'mark', 'execute', 'pierce', 'dispel'].includes(action)) {
        const focusBoss = available(action, 'f1');
        if (focusBoss) return focusBoss;
      }
      return { ...base, action, targetId, recipientId, cooldownAction, cooldownTargetId };
    }
  }
  const targets = targetOptions(state, data, heroId, 'attack').filter(t => t.valid);
  const target = targets.find(t => (t.id === 'f1') === (style !== 'adds-first')) ?? targets[0]!;
  return { ...base, action: 'attack', targetId: target.id };
}

function sample(data: EncounterDefinition, style: Style, boss?: WbBossId): Sample {
  const opening = beginBattle(data);
  const turns: TurnStage[] = [...opening.turns];
  let state = opening.state;
  while (state.outcome === 'active' && state.round <= MAX_ROUNDS) {
    const resolved = resolveCommand(state, data, choice(state, data, style, boss));
    turns.push(...resolved.turns);
    state = resolved.state;
  }
  const replay = wbPlay(data, state.commands, MAX_ROUNDS);
  expect(replay.done).toBe(true);
  expect(replay.state).toEqual(state);
  const attemptTurns = turns.filter(t => t.round <= MAX_ROUNDS);
  const enemyTurns = attemptTurns.filter(t => t.side === 'enemy');
  const bossTurns = enemyTurns.filter(t => t.actorId === 'f1');
  const events = attemptTurns.flatMap(t => t.events);
  const hpLost = (fromBoss: boolean) => enemyTurns.filter(t => (t.actorId === 'f1') === fromBoss).flatMap(t => t.events)
    .filter(e => e.type === 'damage' && state.heroes.some(h => h.id === e.targetId))
    .reduce((total, e) => total + (e.amount ?? 0), 0);
  const attacks = (name: string) => bossTurns.filter(t => t.intent?.name === name);
  const countEvent = (stages: TurnStage[], type: TurnStage['events'][number]['type']) => stages.flatMap(t => t.events).filter(e => e.type === type).length;
  let mechanic = '—';
  if (boss === 'kragmor') {
    const falls = attacks('Mountain Fall');
    mechanic = `${falls.length} Fall, ${falls.flatMap(t => t.events).filter(e => e.type === 'damage' && state.heroes.some(h => h.id === e.targetId)).map(e => e.amount).join('/') || '—'} HP; ${events.filter(e => e.targetId === 'f1' && (e.type === 'mark' || e.type === 'corrode')).length} mark/acid`;
  } else if (boss === 'valdrakk') {
    mechanic = `${countEvent(attacks('Wing Gathering'), 'cancel')} breaks, ${countEvent(attacks('Staggered'), 'stagger')} staggers, ${attacks('Worldshard Dive').length} dive turns (${countEvent(attacks('Worldshard Dive'), 'damage')} hits)`;
  } else if (boss === 'morvane') {
    const calls = bossTurns.filter(t => t.intent?.summon);
    const court = bossTurns.filter(t => t.intent?.damage).map(t => t.intent?.court ?? 0);
    mechanic = `${calls.length} calls, ${countEvent(calls, 'cancel')} sealed, ${countEvent(calls, 'summon')} returned; court ${court.join('/') || '—'}%`;
  }
  return {
    damage: replay.damage,
    hp: state.heroes.reduce((sum, h) => sum + Math.max(0, h.hp), 0),
    startHp: opening.initial.heroes.reduce((sum, h) => sum + h.hp, 0),
    downs: state.heroes.filter(h => h.hp <= 0).length,
    result: state.outcome === 'active' ? `cap R${MAX_ROUNDS}` : `${state.outcome} R${replay.rounds}`,
    bossHit: hpLost(true), addsHit: hpLost(false),
    addsDown: events.filter(e => e.type === 'down' && e.targetId !== 'f1' && data.enemies.some(foe => foe.id === e.targetId)).length,
    phase: bossTurns.some(t => t.intent?.special === 'phase'),
    mechanic,
  };
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
const rules = OLD.trio;
const reward = (r: { ore: number; gold: number; shard?: number }, boss: number): Reward =>
  ({ ore: r.ore, gold: r.gold, shard: r.shard ?? 0, boss });
const TRIO = {
  attempt: reward(rules.attemptReward, rules.attemptShards),
  personal: rules.personal.map(m => ({ at: m.attempts, r: reward(m.reward, m.shards) })),
  shared: rules.shared.map(m => ({ r: reward(m.reward, m.shards) })),
  craft: rules.craft,
  hp: rules.hp,
};
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
// Same tier and campaign seed across all bosses. Population and allocation are model inputs; damage is measured.
function sharedRun(accounts: number, focus: number, perAttempt: number, seed: number, tiers: number[][][], morvanePerAttempt = perAttempt): { fall50: number[]; fall100: number[] } {
  const rnd = lcg(seed); const players = Array.from({ length: accounts }, () => {
    const t = rnd();
    const pool = tiers[t < 0.25 ? 0 : t < 0.70 ? 1 : 2]!;
    return { dmg: pool[Math.floor(rnd() * pool.length)]!, fav: Math.floor(rnd() * 3), plays: 3 + Math.floor(rnd() * 3), active: rnd() < 0.8 };
  });
  let last = [0, 0, 0]; const fall50 = [0, 0, 0], fall100 = [0, 0, 0];
  for (let w = 0; w < 8; w++) {
    const hp = last.map((a, i) => Math.min(TRIO.hp.max, Math.max(TRIO.hp.min, a * (WB_BOSSES[i] === 'morvane' ? morvanePerAttempt : perAttempt)))); const dealt = [0, 0, 0]; const tries = [0, 0, 0];
    players.forEach(p => { if (!p.active && rnd() < 0.5) return; for (let a = 0; a < p.plays; a++) { const b = rnd() < focus ? p.fav : Math.floor(rnd() * 3); const damage = p.dmg[b]!; if (damage > 0) { dealt[b]! += damage; tries[b]!++; } } });
    if (w >= 2) for (let b = 0; b < 3; b++) { if (dealt[b]! >= hp[b]! / 2) fall50[b]!++; if (dealt[b]! >= hp[b]!) fall100[b]!++; }
    last = tries;
  }
  return { fall50, fall100 };
}

test.skipIf(!process.env.TRIO_OUT)('world boss trio probe', () => {
  const dir = process.env.TRIO_OUT!;
  const lines = ['| ค่ายและทีม (ตามลำดับลงสนาม) | Lv | บอส | วิธีเล่น | ดาเมจ | HP คงเหลือ | ล้มตอนจบ | จบ | HP เสียจากบอส/ลูกน้อง¹ | กำจัดลูกน้อง | เฟส 70% | กลไก |',
    '|---|---:|---|---|---:|---:|---:|---|---|---:|---|---|'];
  const tiers: number[][][] = [[], [], []];
  const lowerCourtTiers: number[][][] = [[], [], []];
  const mixedTiers: number[][][] = [[], [], []];
  const coachedTiers: number[][][] = [[], [], []];
  const mixedCoachedTiers: number[][][] = [[], [], []];
  const coaching = ['| ค่าย | ดาเมจเดิม → coach | HP คงเหลือเดิม → coach | ล้มเดิม → coach | จบเดิม → coach | กลไกด้วย coach |',
    '|---|---:|---:|---|---|---|'];
  const tuning = ['| ค่าย | วิธี | ดาเมจบอส เดิม → ทดลอง | HP คงเหลือ เดิม → ทดลอง | คืนชีพ เดิม → ทดลอง |',
    '|---|---|---:|---:|---|'];
  for (const [index, [name, profile]] of companies().entries()) {
    const profileDamage: number[] = [];
    let lowerCourtDamage = 0;
    let pressureDamage = 0;
    let coachedDamage = 0;
    for (const boss of [undefined, ...WB_BOSSES]) {
      const data = wbEncounter(profile, home, lookup, boss)!;
      const styles: Style[] = ['boss-first', 'adds-first', 'advisor'];
      if (boss === 'kragmor' || boss === 'valdrakk') styles.push('answer');
      if (boss === 'morvane') styles.push('pressure');
      // Sensitivity only: weaker court HP, with the same full-health revive and same resolver.
      const candidate = boss === 'morvane'
        ? { ...data, enemies: data.enemies.map(e => e.boss ? e : { ...e, maxHp: Math.round(e.maxHp * 0.8) }) }
        : undefined;
      for (const style of styles) {
        const r = sample(data, style, boss);
        if (boss && style === 'advisor') profileDamage.push(r.damage);
        if (boss === 'morvane' && style === 'advisor') {
          const coached = sample(data, 'morvane-coach', boss);
          coachedDamage = coached.damage;
          coaching.push(`| ${name} | ${r.damage} → ${coached.damage} | ${r.hp}/${r.startHp} → ${coached.hp}/${coached.startHp} | ${r.downs} → ${coached.downs} | ${r.result} → ${coached.result} | ${coached.mechanic} |`);
        }
        if (style === 'pressure') pressureDamage = r.damage;
        if (candidate && style !== 'boss-first') {
          const trial = sample(candidate, style, boss);
          if (style === 'advisor') lowerCourtDamage = trial.damage;
          tuning.push(`| ${name} | ${style} | ${r.damage} → ${trial.damage} | ${r.hp}/${r.startHp} → ${trial.hp}/${trial.startHp} | ${r.mechanic} → ${trial.mechanic} |`);
        }
        lines.push(`| ${name} · ${data.heroes.map(h => h.id).join(', ')} | ${campLevel(home, profile.campXp)} | ${boss ?? 'warden'} | ${style} | ${r.damage} | ${r.hp}/${r.startHp} | ${r.downs} | ${r.result} | ${r.bossHit}/${r.addsHit} | ${r.addsDown} | ${r.phase ? 'yes' : '—'} | ${r.mechanic} |`);
      }
    }
    const tier = index === 0 ? 0 : index % 2 ? 1 : 2;
    tiers[tier]!.push(profileDamage);
    lowerCourtTiers[tier]!.push([profileDamage[0]!, profileDamage[1]!, lowerCourtDamage]);
    mixedTiers[tier]!.push(profileDamage, [profileDamage[0]!, profileDamage[1]!, pressureDamage]);
    const coached = [profileDamage[0]!, profileDamage[1]!, coachedDamage];
    coachedTiers[tier]!.push(coached);
    mixedCoachedTiers[tier]!.push(profileDamage, coached);
  }
  lines.push('', '¹ ผลรวม damage events ที่ลง HP ในเทิร์นศัตรูตามผู้โจมตี ไม่หักฮีลและไม่รวมความเสียหายนอกเทิร์นศัตรู');
  writeFileSync(`${dir}/damage.md`, lines.join('\n') + '\n');

  writeFileSync(`${dir}/morvane-sensitivity.md`, tuning.join('\n') + '\n');

  // OE projections assume every listed shared milestone is claimable when online.
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
  const s = ['ลำดับตัวเลข Kragmor / Valdrakk / Morvane ใช้ดาเมจ advisor จาก damage.md (เริ่มต้น 25%, จบแมพ 3 45%, หลังแคมเปญ 30%)', '', '| บัญชี | เลือกตัวโปรด | HP/ครั้งที่เล่นสัปดาห์ก่อน | ถึง 50% (สัปดาห์ 3–8 ต่อบอส) | ล้ม 100% |', '|---|---|---|---|---|'];
  for (const accounts of [2, 5, 10, 20, 200, 2000]) for (const focus of [0.34, 0.7]) for (const per of [400, 450, 550]) {
    const r = sharedRun(accounts, focus, per, 7 + accounts, tiers);
    s.push(`| ${accounts} | ${Math.round(focus * 100)}% | ${per} | ${r.fall50.join(' / ')} จาก 6 | ${r.fall100.join(' / ')} จาก 6 |`);
  }
  s.push('', 'สัดส่วนจาก 30 seeds × 6 สัปดาห์ต่อกลุ่ม ใช้ HP/ครั้งจาก rules', '',
    '| บัญชี | เลือกตัวโปรด | โปรไฟล์ดาเมจ | ถึง 50% | ล้ม 100% |', '|---|---|---|---|---|');
  for (const accounts of [10, 20, 200]) for (const focus of [0.34, 0.7]) {
    for (const [label, population] of [['ปัจจุบัน', tiers], ['ทดลอง HP ลูกน้อง Morvane 80%', lowerCourtTiers], ['Morvane 50% advisor / 50% pressure', mixedTiers]] as const) {
      const hits = [0, 0, 0], kills = [0, 0, 0];
      const populations = 30;
      for (let seed = 1; seed <= populations; seed++) {
        const result = sharedRun(accounts, focus, TRIO.hp.perAttempt, seed * 1009, population);
        result.fall50.forEach((v, i) => { hits[i]! += v; });
        result.fall100.forEach((v, i) => { kills[i]! += v; });
      }
      const rate = (counts: number[]) => counts.map(n => (100 * n / (populations * 6)).toFixed(0) + '%').join(' / ');
      s.push(`| ${accounts} | ${Math.round(focus * 100)}% | ${label} | ${rate(hits)} | ${rate(kills)} |`);
    }
  }
  writeFileSync(`${dir}/shared-hp.md`, s.join('\n') + '\n');

  const draft = home.draft!;
  const pairs = draft.pool.flatMap((a, i) => draft.pool.slice(i + 1).map(b => [a, b]))
    .filter(pair => pair.some(id => draft.support.includes(id)));
  coaching.push('', 'ทีมหลังจบแมพ 1 จากคู่รับสมัครของเกม · เล่นแผนที่จริงด้วย rush/explorer',
    '', '| คู่รับสมัคร | ทีมที่ลง | แผน / seed | ดาเมจเดิม → coach | HP คงเหลือเดิม → coach | จบเดิม → coach |',
    '|---|---|---|---:|---:|---|');
  for (const pair of pairs) for (const [policy, seed] of [['rush', 11], ['explorer', 23]] as const) {
    // Stop on the first completed map so the fixture carries no progress from later maps.
    let profile = simulateCampaign(seed, policy, 'advisor', 0, 0, 1, pair).profile;
    for (let limit = 2; limit <= 3 && !profile.cleared.includes(home.id); limit++) {
      profile = simulateCampaign(seed, policy, 'advisor', 0, 0, limit, pair).profile;
    }
    expect(profile.cleared).toEqual([home.id]);
    const data = wbEncounter(profile, home, lookup, 'morvane')!;
    const prev = sample(data, 'advisor', 'morvane');
    const next = sample(data, 'morvane-coach', 'morvane');
    expect(next.damage).toBeGreaterThan(0);
    expect(next.result).toBe(`cap R${MAX_ROUNDS}`);
    coaching.push(`| ${pair.join(' + ')} | ${data.heroes.map(h => h.id).join(', ')} | ${policy} #${seed} | ${prev.damage} → ${next.damage} | ${prev.hp}/${prev.startHp} → ${next.hp}/${next.startHp} | ${prev.result} → ${next.result} |`);
  }

  coaching.push('', 'สัดส่วนรอบที่ชุมชนถึงรางวัล · 30 seeds × 6 สัปดาห์ต่อกลุ่ม · ลำดับ Kragmor / Valdrakk / Morvane', '',
    '| บัญชี | เลือกตัวโปรด | การเล่น Morvane | HP Morvane/ครั้ง | ถึง 50% | ล้ม 100% |', '|---|---|---|---:|---|---|');
  for (const accounts of [10, 20, 200]) for (const focus of [0.34, 0.7]) {
    for (const [label, population, per] of [
      ['advisor เดิมทั้งหมด', tiers, TRIO.hp.perAttempt],
      ['coach ครึ่งกลุ่ม', mixedCoachedTiers, TRIO.hp.perAttempt],
      ['coach ทั้งกลุ่ม', coachedTiers, TRIO.hp.perAttempt],
      ['coach ครึ่งกลุ่ม (ทดลอง HP)', mixedCoachedTiers, 350],
      ['coach ครึ่งกลุ่ม (ทดลอง HP)', mixedCoachedTiers, 300],
    ] as const) {
      const hits = [0, 0, 0], kills = [0, 0, 0];
      for (let seed = 1; seed <= 30; seed++) {
        const result = sharedRun(accounts, focus, TRIO.hp.perAttempt, seed * 1009, population, per);
        result.fall50.forEach((v, i) => { hits[i]! += v; });
        result.fall100.forEach((v, i) => { kills[i]! += v; });
      }
      const rate = (counts: number[]) => counts.map(n => (100 * n / 180).toFixed(0) + '%').join(' / ');
      coaching.push(`| ${accounts} | ${Math.round(focus * 100)}% | ${label} | ${per} | ${rate(hits)} | ${rate(kills)} |`);
    }
  }
  writeFileSync(`${dir}/morvane-advisor.md`, coaching.join('\n') + '\n');
}, 3_600_000);
