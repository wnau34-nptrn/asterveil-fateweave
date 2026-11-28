import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { autoTeam, autoTeamPlan, memberPower } from '../src/core/world/auto-team';
import { formation } from '../src/core/world/formation';
import { newProfile, reserveSlots } from '../src/core/world/profile';
import { LANE_SLOTS, PARTY_SLOTS, type Profile } from '../src/core/world/types';
import { heroDef, memberDef, recommendedLane } from '../src/core/world/world';

// Auto team (owner 2026-11-28 “เพิ่มปุ่มจัดทีมอัตโนมัติ … กดปุ่มเดียวจัดทีมให้ทั้งตัวจริงและสำรอง”).
const ALL = ['guardian', 'tracer', 'weaver', 'healer', 'mira', 'toma', 'sefa', 'brann', 'lio', 'garran', 'metta', 'lalin', 'kael', 'wynne', 'astrid'];
function company(ids: readonly string[], stars: Record<string, number> = {}, patch: Partial<Profile> = {}): Profile {
  const p = newProfile(home, 7, ids); p.tutorialDone = true; p.cleared = MAPS.slice(0, 3).map(m => m.id);
  for (const [id, s] of Object.entries(stars)) p.members[id]!.stars = s;
  p.party = { deployed: [ids[0]!], reserve: [] };
  return { ...p, ...patch };
}
const lane = recommendedLane(lookup, home), role = (id: string) => heroDef(lookup, home, id)!.role;

describe('auto team', () => {
  it('fills 5 on the field and the reserve to its slots, healer and guard kept, at most 3 per lane, front first', () => {
    const p = company(ALL, { mira: 5, kael: 4, wynne: 4, toma: 3 });
    const plan = autoTeamPlan(p, home, lookup)!;
    expect(plan.roster.deployed).toHaveLength(PARTY_SLOTS);
    expect(plan.roster.reserve).toHaveLength(reserveSlots(p, home));
    expect(new Set([...plan.roster.deployed, ...plan.roster.reserve]).size).toBe(PARTY_SLOTS + reserveSlots(p, home));
    expect(plan.roster.deployed.some(id => ['Priest', 'Saint'].includes(role(id)))).toBe(true);
    expect(plan.roster.deployed.some(id => ['Knight', 'Warden'].includes(role(id)))).toBe(true);
    for (const l of ['front', 'back'] as const) expect(plan.roster.deployed.filter(id => lane(id) === l).length).toBeLessThanOrEqual(LANE_SLOTS);
    const lanes = plan.roster.deployed.map(lane); expect(lanes).toEqual([...lanes].sort((a, b) => (a === 'front' ? 0 : 1) - (b === 'front' ? 0 : 1)));
    // The stars a player raised count: the ★5 archer plays.
    expect(plan.roster.deployed).toContain('mira');
    // The reserve holds the next strongest, strongest first.
    const power = (id: string) => memberPower(memberDef(lookup, home, p, id)!);
    const rest = ALL.filter(id => !plan.roster.deployed.includes(id)).sort((a, b) => power(b) - power(a));
    expect(plan.roster.reserve).toEqual(rest.slice(0, reserveSlots(p, home)));
  });

  it('keeps archived members out, clears custom lanes for those picked, and is the same every time', () => {
    const p = company(ALL, {}, { archived: ['healer'] });
    p.party = { deployed: ['guardian'], reserve: ['tracer'], lanes: { guardian: 'back', lio: 'front' } };
    const a = autoTeam(p, home, lookup), b = autoTeam(p, home, lookup);
    expect(a).toEqual(b); expect(a.event).toEqual({ type: 'party', auto: true, changed: true });
    const team = [...a.profile.party.deployed, ...a.profile.party.reserve];
    expect(team).not.toContain('healer');
    // Metta (Saint) heals when the Priest is put away.
    expect(a.profile.party.deployed).toContain('metta');
    expect(a.profile.party.lanes?.guardian).toBeUndefined();
    if (!team.includes('lio')) expect(a.profile.party.lanes?.lio).toBe('front');
    // Each picked member stands in their class lane.
    const f = formation(a.profile.party, lane); for (const id of a.profile.party.deployed) expect(f[id]).toBe(lane(id));
    // The input is untouched; a second press changes nothing.
    expect(p.party.deployed).toEqual(['guardian']);
    expect(autoTeam(a.profile, home, lookup)).toEqual({ profile: a.profile, event: { type: 'party', auto: true, changed: false } });
  });

  it('a small company fields everyone it has; a lane takes 3 first, then the field fills from the strongest left', () => {
    const small = company(['guardian', 'healer']);
    expect(autoTeamPlan(small, home, lookup)!.roster).toEqual({ deployed: ['guardian', 'healer'], reserve: [] });
    const fronts = ALL.filter(id => lane(id) === 'front'), backs = ALL.filter(id => lane(id) === 'back');
    const p = company([...fronts, backs[0]!], Object.fromEntries(fronts.map(id => [id, 5])));
    const plan = autoTeamPlan(p, home, lookup)!;
    expect(plan.roster.deployed).toContain(backs[0]); expect(plan.roster.deployed).toHaveLength(PARTY_SLOTS);
    // The formation stands the fourth front-liner in the back row.
    const f = formation(plan.roster, lane); expect(Object.values(f).filter(l => l === 'front')).toHaveLength(LANE_SLOTS);
  });

  it('an empty choice is refused without a change', () => {
    const p = company(['guardian'], {}, { archived: ['guardian'] });
    expect(autoTeam(p, home, lookup)).toEqual({ profile: p, event: { type: 'blocked', reason: 'unknown' } });
  });
});
