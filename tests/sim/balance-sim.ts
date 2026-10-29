import { collectOverflow, protectedItem, recycleSelection } from '../../src/core/world/storage';
// Phase 4E: whole-map balance simulation. A scripted player runs a company through several expeditions using only
// the pure rules (world, profile, battle). Battles are played by the teaching advisor (`battleLesson`), so results
// describe a careful-but-not-optimal player. Nothing here changes rules; it only measures them.
import { encounterById as lookup } from '../../src/content/encounters/catalog';
import { chapterOne } from '../../src/content/world/chapter1';
import { MAPS } from '../../src/content/world/maps';
import type { MapDefinition } from '../../src/core/world/types';
import { levelableSkills, raiseSkill, skillLevelCost, skillLevelOf, tomeCount, tomeLine, tradeTomes } from '../../src/core/world/tomes';
import { TREE_BUILDS } from './tree-sim';
import { resolveCommand, targetOptions, currentHeroId } from '../../src/core/battle/engine';
import { buy, buyReason, chooseLoadout, refreshBoard, refreshReason, claimQuest, claimReason, createCommander, depart, equip, hire, hireReason, boardOffers, learnTalent, newProfile, salvage, settle, talentReason, upgrade, upgradeReason, brew, brewReason, homeItems } from '../../src/core/world/profile';
import { enhance, enhanceCost, enhanceReason, smelt, smeltReason } from '../../src/core/world/forge';
import { boulderAt, openPit, passableWall, runePuzzleAt } from '../../src/core/world/puzzles';
import type { ActionId, BattleState } from '../../src/core/battle/types';
import type { BattleKind, Direction, ExpeditionState, GearSlot, Item, Lane, Point, Profile, MemberProgress, RunOutcome } from '../../src/core/world/types';
import { GEAR_SLOTS } from '../../src/core/world/types';
import {
  atCamp, atMuster, monsterLevelAt, battleData, battleState, canOpenChest, canRest, canRevive, eliteAt, eventAt, finishBattle, findTiles, memberDef, move, openChest,
  newExpedition, draftPick, heroDef, loadoutActions, pendingEvent, questComplete, rollPercent, recordBattle, rest, revive, rosterIds, startPrologue, swapMembers, tileAt, usePotion, chooseEvent, eventChoiceReason, potionReason,
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

// The map being played. The single-map sweep keeps map 3 (veil-frontier, the old whole game); the campaign
// (`simulateCampaign`) points it at each expedition's map before departing. Battles and lobby read it.
let map: MapDefinition = chapterOne;
let checks = false;
// Battles about to start, kept for tuning probes (`capture` set by the caller).
export const captured: { company: string; mapId: string; label: string; hard: boolean; state: ExpeditionState }[] = []; let capture = false; let company = '';
export const setCapture = (on: boolean) => { capture = on; captured.length = 0; };
export const useMap = (m: MapDefinition) => { map = m; };

const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const key = (p: Point) => `${p.x},${p.y}`;

interface Task { id: string; at: Point; done: (s: ExpeditionState) => boolean; ready?: (s: ExpeditionState) => boolean; then?: Direction }

// What the scripted player wants to do on this map. The rush player does only the rift seal; the explorer
// also takes every chest, herb, puzzle, secret and optional elite it can reach.
function tasks(policy: Policy): Task[] {
  const golem = map.elites.find(e => e.mini); const rift = map.events.find(e => e.kind === 'rift');
  const list: Task[] = [];
  if (golem) list.push({ id: golem.id, at: golem, done: s => s.elitesDefeated.includes(golem.id) });
  if (rift) list.push({ id: rift.id, at: rift, done: s => s.eventsDone.includes(rift.id) });
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

// Plays a battle to the end in the given style (no world effects).
export function playOut(s: ExpeditionState, style: Style): { bs: BattleState; low: number } {
  const data = battleData(s, map, lookup)!; let bs = battleState(s, map, lookup)!;
  const max = data.heroes.reduce((a, h) => a + h.maxHp, 0); const now = () => bs.heroes.reduce((a, h) => a + h.hp, 0) / max * 100; let low = now();
  for (let guard = 0; bs.outcome === 'active' && guard < 400; guard++) {
    const follow = style === 'advisor' || (style === 'casual' && rollPercent(s.seed ^ 0x9e3779b9, s.rolls * 997 + bs.commands.length) < 70);
    const l = follow ? battleLesson(bs, data) : undefined;
    if (l) { bs = resolveCommand(bs, data, { beat: bs.beat, heroId: l.heroId, action: l.action, targetId: l.targetId, ...("cooldownAction" in l ? { cooldownAction: l.cooldownAction } : {}), ...("cooldownTargetId" in l ? { cooldownTargetId: l.cooldownTargetId } : {}) }).state; low = Math.min(low, now()); continue; }
    const hero = currentHeroId(bs, data)!; const t = targetOptions(bs, data, hero, 'attack').find(o => o.valid)!;
    bs = resolveCommand(bs, data, { beat: bs.beat, heroId: hero, action: 'attack', targetId: t.id }).state; low = Math.min(low, now());
  }
  return { bs, low };
}
// A10 checks on the same elite and boss fights, without world effects: blind basic attacks, and (bosses) the same
// party two levels lower. Counted under `<label>:attack` and `<label>:under2`.
function shadows(s: ExpeditionState, label: string, report: ExpeditionReport): void {
  const add = (key: string, won: boolean) => { const st = (report.battles[key] ??= { fought: 0, won: 0, hpAfter: 0, low: 0 }); st.fought++; if (won) st.won++; };
  add(`${label}:attack`, playOut(s, 'attack').bs.outcome === 'victory');
  if (label !== 'boss') return;
  // Same HP share of the lower max HP.
  const low = structuredClone(s); for (const id of rosterIds(low)) low.members[id]!.level = Math.max(1, (low.members[id]!.level ?? 1) - 2);
  for (const id of Object.keys(low.battle!.entry)) low.battle!.entry[id] = Math.floor(s.battle!.entry[id]! * memberDef(lookup, map, low.members, id)!.maxHp / memberDef(lookup, map, s.members, id)!.maxHp);
  add(`${label}:under2`, playOut(low, 'advisor').bs.outcome === 'victory');
}
// The chosen style plays the battle to the end, then the world applies it.
function fight(s: ExpeditionState, report: ExpeditionReport, style: Style): { state: ExpeditionState; wiped: boolean } {
  const b = s.battle!; const mini = b.kind === 'elite' && map.elites.find(e => e.id === b.source)?.mini;
  const label = b.kind === 'elite' ? (mini ? 'mini' : map.elites.find(e => e.id === b.source)?.forced ? 'elite-forced' : 'elite-optional') : b.kind === 'event' ? `event-${map.events.find(e => e.id === b.source)?.kind}` : b.kind;
  if (checks && (b.kind === 'boss' || b.kind === 'elite')) shadows(s, label, report);
  if (capture && (b.kind === 'boss' || b.kind === 'elite')) captured.push({ company, mapId: map.id, label, hard: !!s.hard, state: structuredClone(s) });
  const { bs, low } = playOut(s, style);
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
    const r = s.roster.reserve.find(id => s.hp[id]! > 0); if (r) s = swapMembers(s, d, r).state;
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
    const r = move(s, map, best.step!.dir, lookup);
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
const skillGoldFloor = 20; let skillGold = 0;
const equipped = (p: Profile, id: string): ActionId[] => { const base = heroDef(lookup, map, id); return base ? loadoutActions(base, map, p.members[id]?.talents, p.members[id]).filter(a => levelableSkills(lookup, map, id, p.members[id]).includes(a)) : []; };
const score = (i: Item) => i.rarity * 10 + i.level + (i.plus ?? 0) * 2;
function lobby(p: Profile): { profile: Profile; claimed: string[] } {
  const claimed: string[] = [];
  // Team (owner 2026-10-23 recruitment): once the priest has joined, a party without her fields her in place of its
  // first recruit other than the Knight, Lyra and a bard, as a player who reads the team page would (without her,
  // map 3's first run wipes far more often: docs/MASTER_PLAN_TH.md A2). `SIM_NO_PRIEST=1` keeps the starting four.
  if (!process.env.SIM_NO_PRIEST && p.company.includes('healer') && !p.party.deployed.includes('healer')) {
    const out = p.party.deployed.find(id => id !== 'guardian' && id !== 'tracer' && id !== 'lio');
    if (out) p = { ...p, party: { ...p.party, deployed: p.party.deployed.map(id => id === out ? 'healer' : id), reserve: [...p.party.reserve.filter(id => id !== 'healer'), out] } };
  }
  for (const q of map.sideQuests) if (!claimReason(p, map, q.id)) { p = claimQuest(p, map, q.id).profile; claimed.push(q.id); }
  // Talents: a class with an example build (tests/sim/tree-sim.ts, its first one) follows it and equips its skills;
  // spare points (and classes without a build) go to the first open node.
  for (const id of [...p.party.deployed, ...p.party.reserve]) {
    const build = TREE_BUILDS.find(b => b.id === id && b.campaign !== false);
    for (const [node, want] of Object.entries(build?.talents ?? {})) while ((p.members[id]?.talents?.[node] ?? 0) < want! && !talentReason(p, map, id, node)) p = learnTalent(p, map, id, node).profile;
    for (let changed = true; changed;) {
      changed = false;
      for (const n of map.talents[id] ?? []) if (!talentReason(p, map, id, n.id)) { p = learnTalent(p, map, id, n.id).profile; changed = true; break; }
    }
    const loadout = build?.loadout.filter(a => levelableSkills(lookup, map, id, p.members[id]).includes(a));
    if (loadout?.length) p = chooseLoadout(p, map, lookup, id, loadout).profile;
  }
  // Skill tomes (once open, before the market): raise the deployed members' equipped skills, each member's first
  // (main) skill before the others and the lowest level first, while the camp keeps `skillGoldFloor` gold for hiring and the market.
  for (let raised = true; raised;) {
    raised = false;
    const picks = p.party.deployed.flatMap(id => equipped(p, id).map((action, slot) => ({ id, action, slot, level: skillLevelOf(p.members[id], action) }))).sort((a, b) => a.slot - b.slot || a.level - b.level);
    for (const k of picks) {
      const gold = p.bank.gold; const r = raiseSkill(p, MAPS, map, lookup, k.id, k.action);
      if (r.event.type !== 'skillLevel' || r.profile.bank.gold < skillGoldFloor) continue;
      p = r.profile; skillGold += gold - p.bank.gold; raised = true; break;
    }
    // A level that waits on a bigger tome: trade the size below up at the trainer when there are enough.
    if (!raised) for (const k of picks) {
      const cost = skillLevelCost(map, k.level); if (!cost || cost.size === 'small' || (p.tomes?.[tomeLine(map, k.id)][cost.size] ?? 0) >= cost.tomes) continue;
      const below = cost.size === 'large' ? 'medium' : 'small'; const t = tradeTomes(p, MAPS, map, tomeLine(map, k.id), below);
      if (t.event.type === 'tomeTrade') { p = t.profile; raised = true; break; }
    }
  }
  // Market (4A): seals, a contract for the deployed member closest to the next star, and a gear box.
  while (!buyReason(p, map, 'seal') && p.bank.gold > 120 && p.bank.seal < 3) p = buy(p, map, 'seal').profile;
  const pick = [...p.party.deployed].sort((x, y) => p.members[y]!.stars - p.members[x]!.stars).find(id => !buyReason(p, map, 'contract', id));
  if (pick && p.bank.gold > 200) p = buy(p, map, 'contract', pick).profile;
  if (!buyReason(p, map, 'gearbox') && p.bank.gold > 150) p = buy(p, map, 'gearbox').profile;
  // Purchase duplicates only for the deployed party. Bench-only acquisitions are not improvements to this fixed-team campaign policy.
  for (let round = 0; ; round++) {
    for (const [i, id] of boardOffers(p, map, lookup).entries()) if (p.party.deployed.includes(id) && !hireReason(p, map, lookup, i)) p = hire(p, map, lookup, i).profile;
    if (round >= map.shop.refreshCosts.length || refreshReason(p, map) || p.bank.gold < 100) break;
    p = refreshBoard(p, map).profile;
  }
  const ids = [...p.party.deployed, ...p.party.reserve];
  for (let changed = true; changed;) { changed = false; for (const id of ids) if (!upgradeReason(p, map, id)) { p = upgrade(p, map, id).profile; changed = true; } }
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
  // Items that came home past the bag cap wait in overflow and block departure: salvage the loose ones, keep the rest.
  if (p.overflow?.length) {
    const loose = p.overflow.filter(i => !protectedItem(i)).map(i => i.uid);
    if (loose.length) p = recycleSelection(p, map, 'overflow', loose).profile;
    if (p.overflow?.length) p = collectOverflow(p, map, p.overflow.map(i => i.uid)).profile;
  }
  while (p.potions.salve < map.potions.carry && !brewReason(p, map, 'salve') && p.bank.ore > 60) p = brew(p, map, 'salve').profile;
  return { profile: p, claimed };
}

// `lanes`: a formation set before every departure (formation comparison; missing = class lanes).
export function simulateCompany(seed: number, policy: Policy, expeditions: number, style: Style = 'advisor', lanes?: Record<string, Lane>): CompanyReport {
  let p = createCommander(newProfile(map, seed), { name: 'จำลอง', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }).profile;
  // A10: veil-frontier starts at Lv6, so the four starters arrive one level below it, as from map 2 (the campaign
  // itself is `simulateCampaign`).
  const arrive = Math.max(1, Math.min(...map.zones.filter(z => z.levels).map(z => z.levels![0])) - 1);
  for (const m of Object.values(p.members)) m.level = arrive;
  const out: ExpeditionReport[] = [];
  for (let index = 1; index <= expeditions; index++) {
    const shop = lobby(p); p = shop.profile;
    if (lanes) p = { ...p, party: { ...p.party, lanes: { ...lanes } } };
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
    for (const i of homeItems(s, r.outcome, map)) report.items[i.rarity]!++;
    out.push(report);
  }
  return { seed, policy, style, expeditions: out, profile: p };
}

// ---- Campaign (A10) ----
// A brand-new company (the Knight alone) plays maps 1 → 2 → 3 in order with story recruits, big trees (example builds),
// equipped skills, formation by class lane and skill tomes, then replays veil-frontier `replays` times on normal and
// `hard` times on hard mode. Each expedition goes to the first map not yet cleared.
export interface CampaignExpedition extends ExpeditionReport { mapId: string; hard: boolean; attempt: number; skillGold: number; mainSkill: number; skillAvg: number; topSkill: number; tomes: number; levels: number[] }
export interface CampaignReport { seed: number; policy: Policy; style: Style; expeditions: CampaignExpedition[]; profile: Profile }
// `starters`: the two mercenaries the new company recruits after the prologue (default: an offer chosen by the seed).
export function simulateCampaign(seed: number, policy: Policy, style: Style = 'advisor', replays = 3, hard = 2, limit = 16, starters?: readonly string[]): CampaignReport {
  map = MAPS[0]!; checks = true; company = `${seed}:${policy}:${style}`;
  let p = createCommander(newProfile(map, seed, map.firstCompany), { name: 'จำลอง', crest: 'star', color: 'gold', camp: 'ค่ายอารี' }).profile;
  const out: CampaignExpedition[] = []; const last = MAPS[MAPS.length - 1]!;
  let normalAfter = 0, hardRuns = 0;
  for (let index = 1; index <= limit; index++) {
    const next = MAPS.find(m => !p.cleared.includes(m.id)); const isHard = !next && normalAfter >= replays;
    if (!next && normalAfter >= replays && hardRuns >= hard) break;
    map = next ?? last;
    skillGold = 0;
    const shop = lobby(p); p = shop.profile;
    const attempt = out.filter(e => e.mapId === map.id && e.hard === isHard).length + 1;
    // Skill levels the party departs with (raised in this lobby).
    const lv = p.party.deployed.map(id => equipped(p, id).map(a => skillLevelOf(p.members[id], a)));
    const d = depart(p, map, lookup, (seed * 7919 + index * 104729) >>> 0, isHard ? { maps: MAPS } : undefined); p = d.profile; let s = d.run;
    const report: CampaignExpedition = { index, outcome: 'withdrawn', steps: 0, wins: 0, defeats: 0, lowestHp: 100, battles: {}, gained: { ore: 0, gold: 0, seal: 0, dust: 0 },
      items: [0, 0, 0, 0, 0], chests: 0, elites: 0, objectives: 0, bossBeaten: false, level: 0, stars: 0, company: p.company.length, claimed: shop.claimed,
      mapId: map.id, hard: isHard, attempt, skillGold, mainSkill: 0, skillAvg: 0, topSkill: 1, tomes: 0, levels: [] };
    if (!p.tutorialDone) { s = startPrologue(s, map).state; for (let tries = 0; s.battle && tries < 5; tries++) s = fight(s, report, style).state; }
    // Starter recruitment (owner 2026-10-23): the chosen pair, else an offer picked by the seed.
    for (let n = 0; s.draft; n++) {
      const want = starters?.[n]; const d = s.draft;
      s = draftPick(want ? { ...s, draft: { ...d, offers: [want] } } : s, map, want ? 0 : (seed + n) % d.offers.length, lookup).state;
    }
    const r = runExpedition(s, policy, style, report); s = r.state;
    const before = { ...p.bank }; p = settle(p, s, r.outcome, map);
    if (!next) { if (isHard) hardRuns++; else normalAfter++; }
    const ids = p.party.deployed;
    Object.assign(report, {
      outcome: r.outcome, steps: s.steps, wins: s.wins, defeats: s.defeats, chests: s.openedChests.length, elites: s.elitesDefeated.length, bossBeaten: s.bossDefeated,
      gained: { ore: p.bank.ore - before.ore, gold: p.bank.gold - before.gold, seal: p.bank.seal - before.seal, dust: p.bank.dust - before.dust },
      levels: ids.map(id => p.members[id]!.level ?? 1), level: Math.min(...ids.map(id => p.members[id]!.level ?? 1)), stars: Math.max(...ids.map(id => p.members[id]!.stars)), company: p.company.length,
      mainSkill: avg(lv.map(l => Math.max(1, ...l))), skillAvg: avg(lv.flat()), topSkill: Math.max(1, ...lv.flat()), tomes: tomeCount(p.tomes),
    });
    out.push(report);
  }
  map = chapterOne; checks = false;
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

// ---- Campaign report (A10) ----
const stageName = (e: CampaignExpedition) => `${MAPS.find(m => m.id === e.mapId)?.name ?? e.mapId}${e.hard ? ' (ยาก)' : ''} #${e.attempt}`;
export function campaignReport(campaigns: CampaignReport[]): string {
  const lines: string[] = [];
  for (const [policy, style] of [['rush', 'advisor'], ['explorer', 'advisor'], ['rush', 'casual'], ['explorer', 'casual']] as [Policy, Style][]) {
    const cs = campaigns.filter(c => c.policy === policy && c.style === style); if (!cs.length) continue;
    lines.push(`### ${policy === 'rush' ? 'Rush (objectives only)' : 'Explorer (everything on the map)'}, ${style === 'advisor' ? 'advisor battles' : 'casual battles (advice on ~70% of turns)'} · ${cs.length} companies`, '',
      '| Stage | Runs | Complete | Wiped | Wins | Party Lv (min/avg) | Best equipped skill Lv at departure (avg per member) | All equipped skills Lv | Gold gained | Gold on skills before it | Tomes held after |',
      '|---|---|---|---|---|---|---|---|---|---|---|');
    const all = cs.flatMap(c => c.expeditions); const stages = [...new Set(all.map(stageName))];
    for (const st of stages) {
      const es = all.filter(e => stageName(e) === st);
      lines.push(`| ${st} | ${es.length} | ${pct(es.filter(e => e.outcome === 'complete').length, es.length)} | ${pct(es.filter(e => e.outcome === 'wiped').length, es.length)} | ${f1(avg(es.map(e => e.wins)))} | ${f1(avg(es.map(e => e.level)))}/${f1(avg(es.map(e => avg(e.levels))))} | ${f1(avg(es.map(e => e.mainSkill)))} | ${f1(avg(es.map(e => e.skillAvg)))} | ${Math.round(avg(es.map(e => e.gained.gold)))} | ${Math.round(avg(es.map(e => e.skillGold)))} | ${Math.round(avg(es.map(e => e.tomes)))} |`);
    }
    // Battles by map: the real fights, then the A10 checks on the same elite/boss fights.
    lines.push('', '| Map | Battle | Fought | Won | Lowest party HP% during (avg) | HP% after a win |', '|---|---|---|---|---|---|');
    for (const m of MAPS) for (const hard of [false, true]) {
      const es = all.filter(e => e.mapId === m.id && e.hard === hard); if (!es.length) continue;
      for (const kd of [...new Set(es.flatMap(e => Object.keys(e.battles)))].sort()) {
        const s = es.map(e => e.battles[kd]).filter(Boolean) as BattleStat[]; const fought = s.reduce((a, b) => a + b.fought, 0); const won = s.reduce((a, b) => a + b.won, 0);
        const check = kd.includes(':');
        lines.push(`| ${m.name}${hard ? ' (ยาก)' : ''} | ${kd} | ${fought} | ${pct(won, fought)} | ${check ? '–' : Math.round(s.reduce((a, b) => a + b.low, 0) / fought)} | ${check || !won ? '–' : Math.round(s.reduce((a, b) => a + b.hpAfter, 0) / won)} |`);
      }
    }
    // First boss attempt per map (the first run that reached the boss).
    const firsts = MAPS.map(m => {
      const got = cs.map(c => c.expeditions.find(e => e.mapId === m.id && !e.hard && e.battles.boss)).filter((e): e is CampaignExpedition => !!e);
      return `${m.name} ${pct(got.filter(e => e.bossBeaten).length, got.length)} (party Lv ${f1(avg(got.map(e => avg(e.levels))))}, boss Lv ${m.bossLevel})`;
    });
    lines.push('', `First boss attempt won: ${firsts.join(' · ')}.`);
    const frontier = MAPS[MAPS.length - 1]!.id;
    const pace = (n: number) => f1(avg(cs.map(c => c.expeditions.filter(e => e.mapId === frontier && !e.hard)[n]?.mainSkill ?? NaN).filter(x => !Number.isNaN(x))));
    const five = cs.map(c => { const e = c.expeditions.find(x => x.topSkill >= 5); return e ? stageName(e) : 'never'; });
    const income = all.reduce((a, e) => a + e.gained.gold, 0), spent = all.reduce((a, e) => a + e.skillGold, 0);
    lines.push('', `Best equipped skill per member when departing veil-frontier run 2 / 3 / 4 (after 1 / 2 / 3 clears): ${pace(1)} / ${pace(2)} / ${pace(3)}. First skill at Lv5 departs on: ${[...new Set(five)].map(x => `${x} ×${five.filter(y => y === x).length}`).join(', ')}. Gold on skill levels: ${pct(spent, income)} of the gold gained.`, '');
  }
  return lines.join('\n');
}

// A fixed standard squad traverses the actual map, with carried HP, camp care, encounters and boss/goal rules.
// No hiring, equipment drops or lobby optimization is applied mid-run. Story arrivals can occupy reserves only.
export function rosterMap(m: MapDefinition, seed: number, ids: readonly string[], members: Record<string, MemberProgress>): { complete: boolean; hp: number; wins: number } {
  map = m; checks = false;
  const report: ExpeditionReport = { index: 1, outcome: 'withdrawn', steps: 0, wins: 0, defeats: 0, lowestHp: 100, battles: {}, gained: { ore: 0, gold: 0, seal: 0, dust: 0 }, items: [0,0,0,0,0], chests: 0, elites: 0, objectives: 0, bossBeaten: false, level: 0, stars: 1, company: 4, claimed: [] };
  const s = newExpedition(m, lookup, seed, { roster: { deployed: [...ids], reserve: [] }, members }, true);
  const result = runExpedition(s, 'rush', 'advisor', report);
  const hp = hpPercent(result.state);
  map = chapterOne;
  return { complete: result.outcome === 'complete', hp, wins: result.state.wins };
}
