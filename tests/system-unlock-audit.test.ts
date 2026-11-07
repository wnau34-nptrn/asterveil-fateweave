import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { ruinsMap as map } from '../src/content/world/chapter-ruins';
import { forestMap } from '../src/content/world/chapter-forest';
import { MAPS } from '../src/content/world/maps';
import { parseGame } from '../src/core/save/expedition-save';
import { activeGuides, claimGuide, depart, featureOpen, newProfile, placeMember, setPartyLane, settle } from '../src/core/world/profile';
import { applyPreset, savePreset } from '../src/core/world/presets';
import { currentSave } from './fixtures/current-save';

const fresh = () => ({ ...newProfile(map, 3, ['guardian', 'tracer', 'weaver', 'healer']), tutorialDone: true });
describe('SYSTEM-UNLOCK-AUDIT-001: non-veteran campaign rights', () => {
  it('opens only on successful settlement, survives map 2 entry, map 1 replay and save loading', () => {
    const p = fresh(); const run = depart(p, map, lookup, 7).run;
    expect(p.veteran).toBeUndefined(); expect(featureOpen(p, MAPS, 'team')).toBe(false);
    for (const outcome of ['withdrawn', 'wiped'] as const) {
      const home = settle(p, run, outcome, map);
      expect(home.cleared).toEqual([]); expect(featureOpen(home, MAPS, 'team')).toBe(false);
    }
    const home = settle(p, run, 'complete', map);
    expect(home.cleared).toEqual([map.id]); expect(featureOpen(home, MAPS, 'team')).toBe(true);
    for (const destination of [forestMap, map]) {
      const trip = depart(home, destination, lookup, 9);
      const loaded = parseGame(currentSave({ profile: trip.profile, run: trip.run }), map, lookup, MAPS);
      expect(loaded.profile.veteran).toBeUndefined(); expect(featureOpen(loaded.profile, MAPS, 'team')).toBe(true);
      expect(loaded.profile.cleared).toEqual([map.id]);
    }
    const loaded = parseGame(currentSave({ profile: home, run: null }), map, lookup, MAPS).profile;
    expect(featureOpen(loaded, MAPS, 'team')).toBe(true); expect(loaded).toEqual(home);
    let changed = placeMember(loaded, map, 'tracer', 'reserve');
    expect(changed.event.type).toBe('party'); expect(changed.profile.party.reserve).toContain('tracer');
    changed = setPartyLane(changed.profile, map, lookup, 'guardian', 'back');
    expect(changed.event.type).toBe('party');
    const saved = savePreset(changed.profile, map, lookup, 0);
    expect(saved.event.type).toBe('party');
    const moved = placeMember(saved.profile, map, 'tracer', 'deployed');
    expect(moved.event.type).toBe('party');
    const restored = applyPreset(moved.profile, map, 0);
    expect(restored.event.type).toBe('party'); expect(restored.profile.party).toEqual(saved.profile.party);
  });
  it('opens the reserve guide once without repeating its reward or resetting previous guides', () => {
    const p = { ...fresh(), cleared: [map.id], guides: { 'guide-wear': 'skipped' as const } };
    expect(activeGuides(p, MAPS).map(g => g.id)).toContain('guide-reserve');
    const moved = placeMember(p, map, 'tracer', 'reserve').profile;
    const claimed = claimGuide(moved, MAPS, 'guide-reserve');
    expect(claimed.event.type).toBe('guide'); expect(claimed.profile.guides?.['guide-wear']).toBe('skipped');
    expect(claimGuide(claimed.profile, MAPS, 'guide-reserve').event.type).toBe('blocked');
  });
});
