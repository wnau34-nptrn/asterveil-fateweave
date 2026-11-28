import type { HeroDefinition } from '../battle/types';
import { memberDef, recommendedLane, type EncounterLookup } from './world';
import { reserveSlots } from './profile';
import { LANE_SLOTS, PARTY_SLOTS, type Lane, type MapDefinition, type Profile, type ProfileResult, type Roster } from './types';

// Auto team (owner 2026-11-28 “เพิ่มปุ่มจัดทีมอัตโนมัติ ที่หน้าจัดทีม กดปุ่มเดียวจัดทีมให้ทั้งตัวจริงและสำรอง”): one camp
// command that fills the field and the reserve from the company. Deterministic and pure: the same company always gets
// the same team. A recommendation by the members' current numbers (stars, camp level, talents, gear, wounds), not a
// battle simulation. Rules:
// - Members put away in the archive stay put away; everyone else in the company may be picked.
// - The field (up to 5) keeps the strongest healer (Priest/Saint) and the strongest guard (Knight/Warden) when the company
//   has one, then the strongest others, at most 3 per lane by each class's own lane (a field still short then takes the
//   strongest left, who stand in the other lane); the reserve takes the next strongest.
// - Everyone picked stands in their class lane (custom lanes are cleared for them); field order is front, then back.
const HEALERS = new Set(['Priest', 'Saint']), GUARDS = new Set(['Knight', 'Warden']);

// A single strength number from the member's current numbers. Damage dealers, healers and guards all grow with these.
export function memberPower(h: HeroDefinition): number {
  return h.maxHp + h.attack * 4 + (h.skillBonus ?? 0) * 2 + (h.damageBonus ?? 0) + (h.armour ?? 0) + (h.resist ?? 0) + h.speed / 10;
}

export interface AutoTeamPlan { roster: Roster; power: Record<string, number> }
export function autoTeamPlan(profile: Profile, map: MapDefinition, lookup: EncounterLookup): AutoTeamPlan | undefined {
  const lane = recommendedLane(lookup, map), archived = new Set(profile.archived ?? []);
  const defs = profile.company.filter(id => !archived.has(id)).map(id => ({ id, h: memberDef(lookup, map, profile, id) }))
    .filter((x): x is { id: string; h: HeroDefinition } => !!x.h);
  if (!defs.length) return undefined;
  const power: Record<string, number> = Object.fromEntries(defs.map(x => [x.id, memberPower(x.h)]));
  // Strongest first; ties by stars, then the company's own order (stable).
  const order = profile.company.filter(id => id in power);
  const ranked = [...defs].sort((a, b) => power[b.id]! - power[a.id]! || (profile.members[b.id]?.stars ?? 1) - (profile.members[a.id]?.stars ?? 1) || order.indexOf(a.id) - order.indexOf(b.id));
  const field: string[] = [], count: Record<Lane, number> = { front: 0, back: 0 };
  const take = (id: string, anyLane = false): boolean => {
    const l = lane(id); if (field.includes(id) || field.length >= PARTY_SLOTS || (!anyLane && count[l] >= LANE_SLOTS)) return false;
    field.push(id); count[l]++; return true;
  };
  const best = (roles: Set<string>) => ranked.find(x => roles.has(x.h.role));
  for (const pick of [best(HEALERS), best(GUARDS)]) if (pick) take(pick.id);
  for (const x of ranked) take(x.id);
  // Still room but one lane is full (a company of mostly one lane): the strongest left take it; the formation stands the
  // extra ones in the other lane, as it does for any team.
  for (const x of ranked) take(x.id, true);
  const deployed = [...field.filter(id => lane(id) === 'front'), ...field.filter(id => lane(id) === 'back')];
  const reserve = ranked.map(x => x.id).filter(id => !field.includes(id)).slice(0, reserveSlots(profile, map));
  const lanes = { ...profile.party.lanes }; for (const id of [...deployed, ...reserve]) delete lanes[id];
  return { roster: { deployed, reserve, ...(Object.keys(lanes).length ? { lanes } : {}) }, power };
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
export function autoTeam(initial: Profile, map: MapDefinition, lookup: EncounterLookup): ProfileResult {
  const plan = autoTeamPlan(initial, map, lookup);
  if (!plan) return { profile: initial, event: { type: 'blocked', reason: 'unknown' } };
  const lanes = initial.party.lanes ?? {}, picked = [...plan.roster.deployed, ...plan.roster.reserve];
  const changed = !same(initial.party.deployed, plan.roster.deployed) || !same(initial.party.reserve, plan.roster.reserve) || picked.some(id => id in lanes);
  if (!changed) return { profile: initial, event: { type: 'party', auto: true, changed: false } };
  const profile = structuredClone(initial); profile.party = plan.roster;
  return { profile, event: { type: 'party', auto: true, changed: true } };
}
