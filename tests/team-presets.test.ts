import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { battleData, recordBattle, recommendedLane, setLane, swapMembers, battleLanes } from '../src/core/world/world';
import { createBattle, currentHeroId, resolveCommand, targetOptions } from '../src/core/battle/engine';
import { parseGame, saveGame, type Game } from '../src/core/save/expedition-save';
import { formation } from '../src/core/world/formation';
import { depart, dismiss, newProfile, placeMember, reserveSlots, setArchived, setPartyLane } from '../src/core/world/profile';
import { applyPreset, applyRunPreset, campPresetPlan, clearPreset, matchesPreset, presetNameReason, renamePreset, runPresetPlan, savePreset } from '../src/core/world/presets';
import { PRESET_SLOTS, type ExpeditionState, type Profile } from '../src/core/world/types';
import { currentSave } from './fixtures/current-save';

// Team presets (owner 2026-11-06, save v55; four slots and twelve-character names are drafts).
const rec = recommendedLane(lookup, map);
const ids = ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'brann', 'lio', 'metta', 'lalin'];
const company = (cleared: string[] = ['ruined-border', 'deep-forest', 'veil-frontier']): Profile => ({
  ...newProfile(map, 3), tutorialDone: true, cleared, company: [...ids], members: Object.fromEntries(ids.map(id => [id, { stars: 1, dupes: 0 }])),
  party: { deployed: ['guardian', 'tracer', 'weaver', 'healer', 'garran'], reserve: ['mira', 'brann', 'lio'] },
});
const write = (game: Game): string => { let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game); return raw; };

describe('team presets at the camp', () => {
  it('saves the team with its columns, applies it in one step and marks the matching preset', () => {
    let p = setPartyLane(company(), map, lookup, 'weaver', 'front').profile;
    const saved = savePreset(p, map, lookup, 0, 'บุกบอส');
    expect(saved.event).toEqual({ type: 'party', preset: 0, presetAction: 'save' });
    p = saved.profile; expect(p.presets).toEqual([{ name: 'บุกบอส', deployed: p.party.deployed, reserve: p.party.reserve, lanes: formation(p.party, rec) }]);
    // Rearrange by hand, then the preset puts everything back exactly (field order, reserve and columns).
    let q = placeMember(p, map, 'metta', 'deployed', 'guardian').profile; q = setPartyLane(q, map, lookup, 'weaver', 'back').profile;
    expect(matchesPreset(q.party, q.presets![0], formation(q.party, rec))).toBe(false);
    const back = applyPreset(q, map, 0); expect(back.event).toEqual({ type: 'party', preset: 0, presetAction: 'apply' });
    expect(back.profile.party.deployed).toEqual(p.party.deployed); expect(back.profile.party.reserve).toEqual(p.party.reserve);
    expect(formation(back.profile.party, rec)).toEqual(formation(p.party, rec));
    expect(matchesPreset(back.profile.party, back.profile.presets![0], formation(back.profile.party, rec))).toBe(true);
    // Only the party changes.
    expect({ ...back.profile, party: q.party }).toEqual(q);
  });
  it('keeps names short and valid; rename and clear touch one slot; out-of-range slots are refused', () => {
    expect(presetNameReason('')).toBe('empty'); expect(presetNameReason('   ')).toBe('empty');
    expect(presetNameReason('ทีมบุกบอสใหญ่')).toBe(''); expect(presetNameReason('กขคฆงจฉชซฌญฎฏ')).toBe('long'); expect(presetNameReason('a\u0007b')).toBe('invalid');
    let p = savePreset(company(), map, lookup, 2).profile;
    expect(p.presets).toEqual([null, null, expect.objectContaining({ name: 'ชุด 3' })]);
    expect(savePreset(p, map, lookup, PRESET_SLOTS).event).toEqual({ type: 'blocked', reason: 'unknown' });
    expect(renamePreset(p, 0, 'x').event).toEqual({ type: 'blocked', reason: 'unknown' });
    p = renamePreset(p, 2, '  สายรับ ').profile; expect(p.presets![2]!.name).toBe('สายรับ');
    // Saving over a slot keeps its name unless a new one is given.
    p = savePreset(placeMember(p, map, 'lio', 'deployed', 'tracer').profile, map, lookup, 2).profile; expect(p.presets![2]).toMatchObject({ name: 'สายรับ', deployed: ['guardian', 'lio', 'weaver', 'healer', 'garran'] });
    expect(clearPreset(p, 2).profile.presets).toBeUndefined(); expect(clearPreset(p, 1).event.type).toBe('blocked');
  });
  it('fills only the reserve slots unlocked now; the rest wait in the camp and nobody is lost', () => {
    let p = savePreset(company(), map, lookup, 0).profile; p = { ...p, presets: [{ ...p.presets![0]!, reserve: ['mira', 'brann', 'lio', 'metta', 'lalin'] }] };
    p = { ...p, cleared: [] }; expect(reserveSlots(p, map)).toBe(3);
    expect(campPresetPlan(p, map, 0)!.left).toEqual(['metta', 'lalin']);
    const out = applyPreset(p, map, 0); expect(out.event).toEqual({ type: 'party', preset: 0, presetAction: 'apply', left: ['metta', 'lalin'] });
    expect(out.profile.party.reserve).toEqual(['mira', 'brann', 'lio']); expect(out.profile.company).toEqual(p.company);
  });
  it('takes applied members out of the archive; a dismissed member leaves every preset', () => {
    let p = placeMember(company(), map, 'garran', 'bench').profile; p = savePreset(placeMember(p, map, 'garran', 'deployed').profile, map, lookup, 0).profile;
    p = setArchived(placeMember(p, map, 'garran', 'bench').profile, 'garran', true).profile; expect(p.archived).toEqual(['garran']);
    expect(applyPreset(p, map, 0).profile.archived).toBeUndefined();
    const solo = savePreset(p, map, lookup, 1).profile; const only = { ...solo, presets: [solo.presets![0]!, { name: 'เดี่ยว', deployed: ['lio'], reserve: ['metta'], lanes: { lio: 'back' as const } }] };
    const d = dismiss(only, map, 'lio').profile;
    expect(d.presets![1]).toEqual({ name: 'เดี่ยว', deployed: ['metta'], reserve: [], lanes: {} });
    expect(dismiss(dismiss(only, map, 'lio').profile, map, 'metta').profile.presets).toEqual([expect.objectContaining({ deployed: ['guardian', 'tracer', 'weaver', 'healer', 'garran'] })]);
  });
});

describe('team presets on the map', () => {
  const run = (): { p: Profile; s: ExpeditionState } => {
    let p = savePreset(company(), map, lookup, 0, 'หลัก').profile;
    p = placeMember(p, map, 'lio', 'deployed', 'guardian').profile; p = placeMember(p, map, 'metta', 'reserve', 'mira').profile;
    p = savePreset(p, map, lookup, 1, 'สลับ').profile;
    p = applyPreset(p, map, 0).profile;
    return { p, s: depart(p, map, lookup, 9).run };
  };
  it('rearranges only the members brought; saved members left at the camp are reported', () => {
    const { p, s } = run();
    const out = applyRunPreset(s, p.presets![1]!, 1);
    // Metta stayed at the camp: the saved field comes out, the saved reserve next, and Mira (brought, not saved) keeps a seat.
    expect(out.event).toEqual({ type: 'roster', preset: 1, absent: ['metta'] });
    expect(out.state.roster.deployed).toEqual(['lio', 'tracer', 'weaver', 'healer', 'garran']); expect(out.state.roster.reserve).toEqual(['brann', 'guardian', 'mira']);
    expect({ ...out.state, roster: s.roster }).toEqual(s);
    // Saved field members who stayed home leave room: with the reserve full, current field members step up first.
    const small = { ...s, reserveSlots: 3 }; const plan = runPresetPlan(small, { name: 'x', deployed: ['metta', 'tracer'], reserve: [], lanes: {} })!;
    expect(plan.roster.deployed).toEqual(['tracer', 'guardian', 'weaver', 'healer', 'garran']); expect(plan.roster.reserve).toEqual(['mira', 'brann', 'lio']); expect(plan.absent).toEqual(['metta']);
    expect([...plan.roster.deployed, ...plan.roster.reserve].sort()).toEqual([...s.roster.deployed, ...s.roster.reserve].sort()); expect(plan.roster.reserve.length).toBeLessThanOrEqual(3);
  });
  it('equals doing the same swaps by hand, keeps fatigue/HP and is refused during a battle', () => {
    let { p, s } = run(); s = { ...s, fatigue: { guardian: 4, mira: 2 } };
    p = savePreset(placeMember(p, map, 'mira', 'deployed', 'guardian').profile, map, lookup, 2).profile;
    const viaPreset = applyRunPreset(s, p.presets![2]!, 2).state; const byHand = swapMembers(s, 'guardian', 'mira').state;
    expect(viaPreset.roster.deployed).toEqual(byHand.roster.deployed); expect(viaPreset.roster.reserve.sort()).toEqual(byHand.roster.reserve.slice().sort());
    expect(viaPreset.fatigue).toEqual(s.fatigue); expect(viaPreset.hp).toEqual(s.hp);
    expect(battleLanes(viaPreset, map, lookup)).toEqual(battleLanes(byHand, map, lookup));
    const fighting = { ...s, battle: { kind: 'random' as const, encounterId: map.tutorialEncounterId, entry: Object.fromEntries(s.roster.deployed.map(id => [id, s.hp[id]!])), commands: [], lanes: {} } };
    expect(applyRunPreset(fighting, p.presets![2]!, 2)).toEqual({ state: fighting, event: { type: 'blocked', reason: 'busy' } });
    expect(applyRunPreset(s, undefined, 3).event.type).toBe('blocked');
  });
  it('a battle started after a preset replays the same as one after the hand-made team', () => {
    const r = run(); const s = r.s; const p = savePreset(placeMember(r.p, map, 'mira', 'deployed', 'guardian').profile, map, lookup, 2).profile;
    const start = (st: ExpeditionState): ExpeditionState => ({ ...st, battle: { kind: 'random', encounterId: map.tutorialEncounterId, entry: Object.fromEntries(st.roster.deployed.map(id => [id, st.hp[id]!])), commands: [], lanes: Object.fromEntries(st.roster.deployed.flatMap(id => st.roster.lanes?.[id] ? [[id, st.roster.lanes[id]!]] : [])) } });
    const a = start(applyRunPreset(s, p.presets![2]!, 2).state), b = start(setLane(swapMembers(s, 'guardian', 'mira').state, map, lookup, 'mira', formation(p.presets![2]!, rec).mira!).state);
    const da = battleData(a, map, lookup)!, db = battleData(b, map, lookup)!;
    expect(da.heroes.map(h => [h.id, h.lane])).toEqual(db.heroes.map(h => [h.id, h.lane]));
    let sa = createBattle(da); const cmd = { beat: sa.beat, heroId: currentHeroId(sa, da)!, action: 'attack' as const, targetId: targetOptions(sa, da, currentHeroId(sa, da)!, 'attack').find(t => t.valid)!.id };
    sa = resolveCommand(sa, da, cmd).state; const sb = resolveCommand(createBattle(db), db, cmd).state;
    expect(sa).toEqual(sb);
    const recA = recordBattle(a, map, lookup, sa.commands), recB = recordBattle(b, map, lookup, sb.commands); expect(recA.hp).toEqual(recB.hp);
  });
  it('needs at least one saved field member who was brought', () => {
    const { s } = run();
    expect(runPresetPlan(s, { name: 'x', deployed: ['lalin'], reserve: [], lanes: {} })).toBeUndefined();
  });
});

describe('save v55 team presets', () => {
  it('round-trips presets with a run; an older profile has none; forged presets are rejected', () => {
    const { p, s } = (() => { const x = savePreset(company(), map, lookup, 1, 'สายรับ').profile; return { p: x, s: depart(x, map, lookup, 9).run }; })();
    const raw = write({ profile: p, run: s }); expect(JSON.parse(raw).version).toBe(55);
    expect(parseGame(raw, map, lookup, MAPS)).toEqual({ profile: p, run: s });
    const old = JSON.parse(raw); old.version = 54; delete old.profile.presets; expect(parseGame(JSON.stringify(old), map, lookup, MAPS).profile.presets).toBeUndefined();
    const forged = (f: (j: { profile: { presets: unknown[] } }) => void) => { const j = JSON.parse(raw); f(j); return () => parseGame(JSON.stringify(j), map, lookup, MAPS); };
    expect(forged(j => { (j.profile.presets[1] as { deployed: string[] }).deployed.push('kael'); })).toThrow();
    expect(forged(j => { (j.profile.presets[1] as { deployed: string[] }).deployed = []; })).toThrow();
    expect(forged(j => { (j.profile.presets[1] as { reserve: string[] }).reserve.push('guardian'); })).toThrow();
    expect(forged(j => { (j.profile.presets[1] as { name: string }).name = 'ยาวเกินไปมากจริงๆนะ'; })).toThrow();
    expect(forged(j => { (j.profile.presets[1] as { lanes: Record<string, string> }).lanes.kael = 'front'; })).toThrow();
    expect(forged(j => { j.profile.presets.push(null); })).toThrow();
    expect(forged(j => { j.profile.presets = [null, null, null, null, j.profile.presets[1]]; })).toThrow();
    expect(forged(j => { (j.profile.presets[1] as Record<string, unknown>).extra = 1; })).toThrow();
    expect(() => parseGame(currentSave({ profile: p, run: null } as never), map, lookup, MAPS)).not.toThrow();
  });
});
