// Phase 4E: whole-map balance simulation. A scripted player runs a company through several expeditions using only
// the pure rules (world, profile, battle). Battles are played by the teaching advisor (`battleLesson`), so results
// describe a careful-but-not-optimal player. Nothing here changes rules; it only measures them.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { resolveCommand, targetOptions, currentHeroId } from '../../src/core/battle/engine';
import { buy, buyReason, refreshBoard, refreshReason, claimQuest, claimReason, createCommander, depart, equip, hire, hireReason, boardOffers, learnTalent, newProfile, salvage, settle, talentReason, upgrade, upgradeReason, brew, brewReason } from '../../src/core/world/profile';
import { enhance, enhanceCost, enhanceReason, smelt, smeltReason } from '../../src/core/world/forge';
import { boulderAt, openPit, passableWall, runePuzzleAt } from '../../src/core/world/puzzles';
import type { BattleKind, Direction, ExpeditionState, GearSlot, Item, Point, Profile, RunOutcome } from '../../src/core/world/types';
import { GEAR_SLOTS } from '../../src/core/world/types';
import {
  atCamp, atMuster, monsterLevelAt, battleData, battleState, canOpenChest, canRest, canRevive, eliteAt, eventAt, finishBattle, findTiles, memberDef, move, openChest,
  pendingEvent, questComplete, rollPercent, recordBattle, rest, revive, rosterIds, startPrologue, swapMembers, tileAt, usePotion, chooseEvent, eventChoiceReason, potionReason,
} from '../../src/core/world/world';
import { battleLesson } from '../../src/ui/tutorial';

export type Policy = 'rush' | 'explorer';
// How battles are played: the teaching advisor (reads every intent: an upper bound), a casual player who follows
// the advice on about 70% of turns and otherwise attacks, or blind basic attacks on the first valid target (a lower bound).
export type Style = 'advisor' | 'casual' | 'attack';
// `low`: the party's lowest HP% at any point of the battle (summed over battles fought).
export interface BattleStat { fought: number; won: number; hpAfter: number; low: number }
export interface ExpeditionReport {
  index: number; outcome: RunOutcome; steps: number; wins: number; defeats: number; lowestHp: number;
  battles: Partial<Record<string, BattleStat>>;
  gained: { ore: number; gold: number; seal: number; dust: number }; items: number[]; chests: number; elites: number; objectives: number;
  bossBeaten: boolean; level: number; stars: number; company: number; claimed: string[];
}
export interface CompanyReport { seed: number; policy: Policy; style: Style; expeditions: ExpeditionReport[]; profile: Profile }

const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const key = (p: Point) => `${p.x},${p.y}`;

interface Task { id: string; at: Point; done: (s: ExpeditionState) => boolean; ready?: (s: ExpeditionState) => boolean; then?: Direction }

// What the scripted player wants to do on this map. The rush player does only the rift seal; the explorer
// also takes every chest, herb, puzzle, secret and optional elite it can reach.
function tasks(policy: Policy): Task[] {
  const golem = map.elites.find(e => e.mini)!; const rift = map.events.find(e => e.kind === 'rift')!;
  const list: Task[] = [
    { id: golem.id, at: golem, done: s => s.elitesDefeated.includes(golem.id) },
    { id: rift.id, at: rift, done: s => s.eventsDone.includes(rift.id) },
  ];
  if (policy === 'rush') return list;
  for (const c of map.chests) list.push({ id: c.id, at: c, done: s => s.openedChests.includes(c.id) });
  for (const h of map.herbs) list.push({ id: h.id, at: h, done: s => s.herbs.includes(h.id) });
  for (const e of map.elites.filter(e => !e.forced && !e.mini)) list.push({ id: e.id, at: e, done: s => s.elitesDefeated.includes(e.id) || !!s.respawns[e.id] });
  for (const e of map.events.filter(e => e.kind !== 'rift' && e.kind !== 'merchant')) list.push({ id: e.id, at: e, done: s => s.eventsDone.includes(e.id) });
  for (const r of map.puzzles.runes) r.stones.forEach((st, i) => list.push({ id: `${r.id}:${i}`, at: st,
    done: s => s.solved.includes(r.id) || (s.runes[r.id] ?? 0) > i, ready: s => (s.runes[r.id] ?? 0) === i }));
  for (const l of map.puzzles.levers) l.levers.forEach((at, i) => list.push({ id: `${l.id}:${i}`, at, done: s => s.solved.includes(l.id) || s.levers.includes(`${l.id}:${i}`) }));
  for (const b of map.puzzles.boulders) {
    const d = { x: Math.sign(b.pit.x - b.at.x), y: Math.sign(b.pit.y - b.at.y) };
    const then = (Object.entries(dirs) as [Direction, Point][]).find(([, o]) => same(o, d))![0];
    list.push({ id: b.id, at: { x: b.at.x - d.x, y: b.at.y - d.y }, done: s => s.solved.includes(b.id), then });
  }
  return list;
}

// Breadth-first search from the party. Tiles that would start something unwanted (an undone optional elite or
// event, a rune stone, the boss) are reached only as goals, never walked through. The merchant is never finished,
// so the party walks past it (its dialog opens and is left).
function search(s: ExpeditionState, policy: Policy, goals: Set<string>): Map<string, [string, Direction]> {
  const prev = new Map<string, [string, Direction]>(); const queue = [s.position]; const seen = new Set([key(s.position)]);
  while (queue.length) {
    const p = queue.shift()!;
    if (!same(p, s.position) && goals.has(key(p))) continue;
    for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
      const n = { x: p.x + o.x, y: p.y + o.y }; const t = tileAt(map, n); const k = key(n);
      if (!t || seen.has(k)) continue;
      if (t.kind === 'wall' && !passableWall(s, map, n)) continue;
      if (t.kind === 'wall' && policy === 'rush' && map.puzzles.secrets.some(x => same(x, n)) && !s.secrets.some(id => map.puzzles.secrets.find(x => x.id === id && same(x, n)))) continue;
      if (openPit(s, map, n) || boulderAt(s, map, n)) continue;
      const elite = eliteAt(map, n);
      const avoid = (t.kind === 'boss' && !s.bossDefeated) || (elite && !elite.forced && !s.elitesDefeated.includes(elite.id))
        || (eventAt(map, n)?.kind !== 'merchant' && pendingEvent(s, map, n)) || runePuzzleAt(map, n);
      if (avoid && !goals.has(k)) continue;
      seen.add(k); prev.set(k, [key(p), d]); queue.push(n);
    }
  }
  return prev;
}
function firstStep(prev: Map<string, [string, Direction]>, from: Point, to: Point): { dir: Direction; length: number } | undefined {
  let cur = key(to); let length = 0; let dir: Direction | undefined;
  while (cur !== key(from)) { const step = prev.get(cur); if (!step) return undefined; dir = step[1]; cur = step[0]; length++; }
  return dir ? { dir, length } : undefined;
}

const hpPercent = (s: ExpeditionState, ids = s.roster.deployed) => {
  let hp = 0, max = 0;
  for (const id of ids) { hp += s.hp[id]!; max += memberDef(lookup, map, s.members, id)!.maxHp; }
  return max ? hp / max * 100 : 0;
};

// The advisor plays the battle to the end, then the world applies it.
function fight(s: ExpeditionState, report: ExpeditionReport, style: Style): { state: ExpeditionState; wiped: boolean } {
  const b = s.battle!; const mini = b.kind === 'elite' && map.elites.find(e => e.id === b.source)?.mini;
  const label = b.kind === 'elite' ? (mini ? 'mini' : map.elites.find(e => e.id === b.source)?.forced ? 'elite-forced' : 'elite-optional') : b.kind === 'event' ? `event-${map.events.find(e => e.id === b.source)?.kind}` : b.kind;
  const data = battleData(s, map, lookup)!; let bs = battleState(s, map, lookup)!;
  const max = data.heroes.reduce((a, h) => a + h.maxHp, 0); const now = () => bs.heroes.reduce((a, h) => a + h.hp, 0) / max * 100; let low = now();
  for (let guard = 0; bs.outcome === 'active' && guard < 400; guard++) {
    const follow = style === 'advisor' || (style === 'casual' && rollPercent(s.seed ^ 0x9e3779b9, s.rolls * 997 + bs.commands.length) < 70);
    const l = follow ? battleLesson(bs, data) : undefined;
    if (l) { bs = resolveCommand(bs, data, { beat: bs.beat, heroId: l.heroId, action: l.action, targetId: l.targetId }).state; low = Math.min(low, now()); continue; }
    const hero = currentHeroId(bs, data)!; const t = targetOptions(bs, data, hero, 'attack').find(o => o.valid)!;
    bs = resolveCommand(bs, data, { beat: bs.beat, heroId: hero, action: 'attack', targetId: t.id }).state; low = Math.min(low, now());
  }
  const r = finishBattle(recordBattle(s, map, lookup, bs.commands), map, lookup);
  const st = (report.battles[label] ??= { fought: 0, won: 0, hpAfter: 0, low: 0 }); st.fought++; st.low += low;
  if (r.event.type === 'victory') { st.won++; st.hpAfter += hpPercent(r.state); report.lowestHp = Math.min(report.lowestHp, hpPercent(r.state)); }
  else report.lowestHp = 0;
  return { state: r.state, wiped: r.event.type === 'defeat' && !!r.event.wiped };
}

// At a camp or the entrance: revive with embers, field standing reserves for the fallen, rest when hurt.
function campCare(s: ExpeditionState): ExpeditionState {
  if (atCamp(s, map)) for (const id of rosterIds(s)) if (canRevive(s, map, id)) s = revive(s, map, lookup, id).state;
  if (atMuster(s, map)) for (const d of [...s.roster.deployed]) {
    if (s.hp[d]) continue;
    const r = s.roster.reserve.find(id => s.hp[id]! > 0); if (r) s = swapMembers(s, map, d, r).state;
  }
  if (canRest(s, map) && hpPercent(s, rosterIds(s)) < 90) s = rest(s, map, lookup).state;
  return s;
}
// After a fight: a salve for anyone under a third, a tonic when the whole party is low.
function patchUp(s: ExpeditionState): ExpeditionState {
  if (hpPercent(s) < 50 && !potionReason(s, map, lookup, 'tonic')) s = usePotion(s, map, lookup, 'tonic').state;
  for (const id of s.roster.deployed) {
    const max = memberDef(lookup, map, s.members, id)!.maxHp;
    if (s.hp[id]! > 0 && s.hp[id]! < max / 3 && !potionReason(s, map, lookup, 'salve', id)) s = usePotion(s, map, lookup, 'salve', id).state;
  }
  return s;
}
function chooseFor(s: ExpeditionState): ExpeditionState {
  const ev = pendingEvent(s, map); if (!ev) return s;
  const ok = (c: Parameters<typeof chooseEvent>[3]) => !eventChoiceReason(s, map, c);
  const pick = ev.kind === 'rift' ? 'fight' : ev.kind === 'bandits' ? (hpPercent(s) >= 60 ? 'fight' : 'sneak')
    : ev.kind === 'shrine' ? (ok('offer') ? 'offer' : hpPercent(s) < 50 ? 'pray' : undefined)
    : ev.kind === 'traveller' ? (ok('help') ? 'help' : undefined) : ok('buy-salve') && s.resources.ore >= 40 ? 'buy-salve' : undefined;
  return pick && ok(pick) ? chooseEvent(s, map, lookup, pick).state : s;
}

function runExpedition(start: ExpeditionState, policy: Policy, style: Style, report: ExpeditionReport): { state: ExpeditionState; outcome: RunOutcome } {
  let s = start; const plan = tasks(policy); const skipped = new Set<string>(); const goal = findTiles(map, 'goal')[0]!; const boss = findTiles(map, 'boss')[0]!;
  const camps = [...findTiles(map, 'camp'), findTiles(map, 'start')[0]!];
  for (let guard = 0; guard < 3000; guard++) {
    if (s.completed) return { state: s, outcome: 'complete' };
    if (atMuster(s, map)) s = campCare(s);
    const standing = rosterIds(s).filter(id => s.hp[id]! > 0).length;
    // Too weak to go on and nothing left to heal with: walk home and withdraw.
    const spent = !s.restReady && hpPercent(s) < 35 && s.potions.tonic === 0 && s.potions.salve === 0;
    const pending = plan.filter(t => !t.done(s) && !skipped.has(t.id) && (t.ready?.(s) ?? true));
    // On a push spot: push the boulder.
    const push = pending.find(t => t.then && same(t.at, s.position));
    if (push) { const r = move(s, map, push.then!); if (r.event.type === 'blocked') skipped.add(push.id); else s = r.state; if (s.battle) { const f = fight(s, report, style); s = f.state; if (f.wiped) return { state: s, outcome: 'wiped' }; } continue; }
    const leaving = standing <= 1 && !s.resources.ember || spent;
    if (leaving && atMuster(s, map)) return { state: s, outcome: 'withdrawn' };
    // The nearest reachable target; work that cannot be reached yet (behind a closed door) waits.
    const nearest = (targets: Point[]) => {
      const prev = search(s, policy, new Set(targets.map(key)));
      return targets.map(t => ({ t, step: same(t, s.position) ? undefined : firstStep(prev, s.position, t) })).filter(x => x.step).sort((a, b) => a.step!.length - b.step!.length)[0];
    };
    let best = leaving ? nearest(camps.filter(c => tileAt(map, c)!.kind === 'start' || same(c, s.camp ?? c)))
      : hpPercent(s) < 45 && s.restReady ? nearest(findTiles(map, 'camp')) : undefined;
    // A fallen member who can be revived (or replaced) sends the party back to camp first.
    const down = s.roster.deployed.some(id => !s.hp[id]) && (s.resources.ember > 0 || s.roster.reserve.some(id => s.hp[id]! > 0));
    if (!best && !leaving && down && !atMuster(s, map)) best = nearest(s.resources.ember > 0 ? findTiles(map, 'camp') : camps);
    // Work through the zones in order: only tasks within two levels of the easiest pending one.
    const lv = (p: Point) => monsterLevelAt(map, p) ?? 0; const easiest = Math.min(...pending.map(t => lv(t.at)));
    if (!best && !leaving) best = nearest(pending.filter(t => lv(t.at) <= easiest + 2).map(t => t.at)) ?? nearest(pending.map(t => t.at));
    if (!best && !leaving && questComplete(s, map)) best = nearest([s.bossDefeated ? goal : boss]);
    if (!best) return { state: s, outcome: 'withdrawn' };
    const r = move(s, map, best.step!.dir);
    if (r.event.type === 'blocked') { const t = plan.find(x => same(x.at, best.t)); if (t) skipped.add(t.id); else return { state: s, outcome: 'withdrawn' }; continue; }
    s = r.state;
    if (r.event.type === 'event') { s = chooseFor(s); if (!s.battle && pendingEvent(s, map)) { const t = plan.find(x => same(x.at, s.position)); if (t) skipped.add(t.id); } }
    if (s.battle) {
      const f = fight(s, report, style); s = f.state;
      if (f.wiped) return { state: s, outcome: 'wiped' };
      s = patchUp(s);
    }
    if (canOpenChest(s, map)) s = openChest(s, map).state;
  }
  return { state: s, outcome: 'withdrawn' };
}

// Between expeditions a sensible player claims quests, hires, upgrades, spends talents, equips the best pieces,
// salvages commons when the bag fills and brews salves with what is left.
const score = (i: Item) => i.rarity * 10 + i.level + (i.plus ?? 0) * 2;
function lobby(p: Profile): { profile: Profile; claimed: string[] } {
  const claimed: string[] = [];
  for (const q of map.sideQuests) if (!claimReason(p, map, q.id)) { p = claimQuest(p, map, q.id).profile; claimed.push(q.id); }
  // Market (4A): seals, a contract for the deployed member closest to the next star, and a gear box.
  while (!buyReason(p, map, 'seal') && p.bank.gold > 120 && p.bank.seal < 3) p = buy(p, map, 'seal').profile;
  const pick = [...p.party.deployed].sort((x, y) => p.members[y]!.stars - p.members[x]!.stars).find(id => !buyReason(p, map, 'contract', id));
  if (pick && p.bank.gold > 200) p = buy(p, map, 'contract', pick).profile;
  if (!buyReason(p, map, 'gearbox') && p.bank.gold > 150) p = buy(p, map, 'gearbox').profile;
  // Hire everything useful on the board, redrawing it (paid) while gold is plentiful.
  for (let round = 0; ; round++) {
    for (let i = 0; i < boardOffers(p, map, lookup).length; i++) if (!hireReason(p, map, lookup, i)) p = hire(p, map, lookup, i).profile;
    if (round >= map.shop.refreshCosts.length || refreshReason(p, map) || p.bank.gold < 100) break;
    p = refreshBoard(p, map).profile;
  }
  const ids = [...p.party.deployed, ...p.party.reserve];
  for (let changed = true; changed;) { changed = false; for (const id of ids) if (!upgradeReason(p, map, id)) { p = upgrade(p, map, id).profile; changed = true; } }
  for (const id of ids) for (let changed = true; changed;) {
    changed = false;
    for (const n of map.talents[id] ?? []) if (!talentReason(p, map, id, n.id)) { p = learnTalent(p, map, id, n.id).profile; changed = true; break; }
  }
  for (const id of ids) for (const slot of GEAR_SLOTS as readonly GearSlot[]) {
    const worn = p.members[id]?.gear?.[slot];
    const best = p.items.filter(i => i.slot === slot && (slot !== 'weapon' || i.hero === id)).sort((a, b) => score(b) - score(a))[0];
    if (best && (!worn || score(best) > score(worn))) p = equip(p, id, best.uid).profile;
  }
  // Smelt surplus ore into veil dust (keeping 300 ore), then enhance.
  while (p.bank.ore > 300 && !smeltReason(p, map, 1)) p = smelt(p, map, 1).profile;
  // Forge: enhance the deployed members' worn pieces while ore and dust last (keeping 80 ore for brewing).
  for (let changed = true; changed;) {
    changed = false;
    for (const id of p.party.deployed) for (const item of Object.values(p.members[id]?.gear ?? {})) {
      if (!item || enhanceReason(p, map, item.uid)) continue;
      const cost = enhanceCost(map, item)!; if (p.bank.ore - cost.ore < 80) continue;
      p = enhance(p, map, item.uid).profile; changed = true;
    }
  }
  if (p.items.length > map.equipment.bagCap - 10) p = salvage(p, map, p.items.filter(i => i.rarity === 0).map(i => i.uid)).profile;
  while (p.potions.salve < map.potions.carry && !brewReason(p, map, 'salve') && p.bank.ore > 60) p = brew(p, map, 'salve').profile;
  return { profile: p, claimed };
}

export function simulateCompany(seed: number, policy: Policy, expeditions: number, style: Style = 'advisor'): CompanyReport {
  let p = createCommander(newProfile(map, seed), { name: 'จำลอง', crest: 'star', color: 'gold' }).profile;
  const out: ExpeditionReport[] = [];
  for (let index = 1; index <= expeditions; index++) {
    const shop = lobby(p); p = shop.profile;
    const d = depart(p, map, lookup, (seed * 7919 + index * 104729) >>> 0); p = d.profile; let s = d.run;
    const report: ExpeditionReport = { index, outcome: 'withdrawn', steps: 0, wins: 0, defeats: 0, lowestHp: 100, battles: {}, gained: { ore: 0, gold: 0, seal: 0, dust: 0 },
      items: [0, 0, 0, 0, 0], chests: 0, elites: 0, objectives: 0, bossBeaten: false, level: 0, stars: 0, company: p.company.length, claimed: shop.claimed };
    if (!p.tutorialDone) { s = startPrologue(s, map).state; for (let tries = 0; s.battle && tries < 5; tries++) s = fight(s, report, style).state; }
    const r = runExpedition(s, policy, style, report); s = r.state;
    const before = { ...p.bank };
    p = settle(p, s, r.outcome, map);
    Object.assign(report, {
      outcome: r.outcome, steps: s.steps, wins: s.wins, defeats: s.defeats, chests: s.openedChests.length, elites: s.elitesDefeated.length,
      objectives: map.quest.objectives.filter(o => o.kind === 'chests' ? s.openedChests.length >= o.count : o.kind === 'elite' ? s.elitesDefeated.includes(o.target) : s.eventsDone.includes(o.target)).length,
      bossBeaten: s.bossDefeated, gained: { ore: p.bank.ore - before.ore, gold: p.bank.gold - before.gold, seal: p.bank.seal - before.seal, dust: p.bank.dust - before.dust },
      level: Math.min(...p.party.deployed.map(id => p.members[id]!.level ?? 1)), stars: Math.max(...p.party.deployed.map(id => p.members[id]!.stars)),
    });
    if (r.outcome !== 'wiped') for (const i of s.found) report.items[i.rarity]!++;
    out.push(report);
  }
  return { seed, policy, style, expeditions: out, profile: p };
}

// ---- Report ----
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '–';
const f1 = (n: number) => n.toFixed(1);
export function report(companies: CompanyReport[]): string {
  const lines: string[] = [];
  for (const [policy, style] of [['rush', 'advisor'], ['explorer', 'advisor'], ['rush', 'casual'], ['explorer', 'casual'], ['explorer', 'attack']] as [Policy, Style][]) {
    const cs = companies.filter(c => c.policy === policy && c.style === style); if (!cs.length) continue;
    const n = cs[0]!.expeditions.length;
    lines.push(`### ${policy === 'rush' ? 'Rush (rift seal only)' : 'Explorer (every chest, herb, puzzle, secret and optional elite)'}, ${style === 'advisor' ? 'advisor battles' : style === 'casual' ? 'casual battles (advice on ~70% of turns)' : 'blind basic attacks'} · ${cs.length} companies × ${n} expeditions`, '',
      '| Exp. | Complete | Withdrawn | Wiped | Steps | Wins | Defeats | Lowest HP% | Ore | Gold | Seal | Dust | Items (C/U/R/E/L) | Chests | Min level | Max ★ | Company |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (let i = 0; i < n; i++) {
      const es = cs.map(c => c.expeditions[i]!); const k = (o: RunOutcome) => es.filter(e => e.outcome === o).length;
      const items = [0, 1, 2, 3, 4].map(r => f1(avg(es.map(e => e.items[r]!)))).join('/');
      lines.push(`| ${i + 1} | ${pct(k('complete'), es.length)} | ${pct(k('withdrawn'), es.length)} | ${pct(k('wiped'), es.length)} | ${Math.round(avg(es.map(e => e.steps)))} | ${f1(avg(es.map(e => e.wins)))} | ${f1(avg(es.map(e => e.defeats)))} | ${Math.round(avg(es.map(e => e.lowestHp)))} | ${Math.round(avg(es.map(e => e.gained.ore)))} | ${Math.round(avg(es.map(e => e.gained.gold)))} | ${f1(avg(es.map(e => e.gained.seal)))} | ${Math.round(avg(es.map(e => e.gained.dust)))} | ${items} | ${f1(avg(es.map(e => e.chests)))} | ${f1(avg(es.map(e => e.level)))} | ${f1(avg(es.map(e => e.stars)))} | ${f1(avg(es.map(e => e.company)))} |`);
    }
    const all = cs.flatMap(c => c.expeditions); const kinds = [...new Set(all.flatMap(e => Object.keys(e.battles)))].sort();
    lines.push('', '| Battle | Fought | Won | Lowest party HP% during (avg) | HP% after a win |', '|---|---|---|---|---|');
    for (const kd of kinds) {
      const st = all.map(e => e.battles[kd]).filter(Boolean) as BattleStat[]; const fought = st.reduce((a, b) => a + b.fought, 0); const won = st.reduce((a, b) => a + b.won, 0);
      lines.push(`| ${kd} | ${fought} | ${pct(won, fought)} | ${Math.round(st.reduce((a, b) => a + b.low, 0) / fought)} | ${won ? Math.round(st.reduce((a, b) => a + b.hpAfter, 0) / won) : '–'} |`);
    }
    const first = cs.map(c => c.expeditions.find(e => e.outcome === 'complete')?.index);
    lines.push('', `First completed expedition: ${first.map(x => x ?? '–').join(', ')} (median ${median(first)}).`);
    const bank = (k: 'ore' | 'gold' | 'seal' | 'dust') => Math.round(avg(cs.map(c => c.profile.bank[k])));
    lines.push('', `Bank after the last expedition (average): ore ${bank('ore')}, gold ${bank('gold')}, seal ${bank('seal')}, dust ${bank('dust')}; bag ${Math.round(avg(cs.map(c => c.profile.items.length)))}/${map.equipment.bagCap}.`);
    const claims = map.sideQuests.map(q => { const when = cs.map(c => c.expeditions.find(e => e.claimed.includes(q.id))?.index); const got = when.filter(x => x !== undefined).length;
      const done = cs.filter(c => (c.profile.quests[q.id]?.progress ?? 0) >= q.target).length;
      return `| ${q.npc} | ${q.kind} ${q.target} | ${pct(done, cs.length)} | ${got ? `${f1(avg(when.filter((x): x is number => x !== undefined)))}` : '–'} |`; });
    lines.push('', '| Side quest | Need | Done by the end | Claimed before expedition (avg) |', '|---|---|---|---|', ...claims, '');
  }
  return lines.join('\n');
}
function median(xs: (number | undefined)[]): string {
  const v = xs.filter((x): x is number => x !== undefined).sort((a, b) => a - b); if (!v.length) return 'never';
  return String(v[Math.floor(v.length / 2)]);
}
export type { BattleKind };
