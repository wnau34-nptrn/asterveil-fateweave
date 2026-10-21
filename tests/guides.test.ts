import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/content/world/maps';
import { ruinsMap } from '../src/content/world/chapter-ruins';
import { activeGuides, claimGuide, guideDone, newProfile } from '../src/core/world/profile';

// Guided tasks (master plan A4): shown once their system opens; claimed once when done, or skipped.
describe('guided tasks', () => {
  const after1 = () => ({ ...newProfile(ruinsMap, 3, ['guardian', 'tracer', 'weaver', 'healer']), tutorialDone: true, cleared: [ruinsMap.id] });
  it('only tasks of open systems show; veterans see none', () => {
    expect(activeGuides(newProfile(ruinsMap, 3, ['guardian']), MAPS)).toEqual([]);
    expect(activeGuides(after1(), MAPS).map(g => g.id)).toEqual(['guide-wear', 'guide-enhance', 'guide-talent', 'guide-brew']);
    expect(activeGuides({ ...after1(), veteran: true }, MAPS)).toEqual([]);
  });
  it('a task pays once when done, can be skipped, and then disappears', () => {
    const p = after1(); expect(guideDone(p, 'brew')).toBe(false);
    expect(claimGuide(p, MAPS, 'guide-brew').event).toEqual({ type: 'blocked', reason: 'notDone' });
    const brewed = { ...p, potions: { ...p.potions, salve: 1 } };
    const r = claimGuide(brewed, MAPS, 'guide-brew'); expect(r.event).toEqual({ type: 'guide', id: 'guide-brew', skipped: false });
    expect(r.profile.potions.salve).toBe(2); expect(activeGuides(r.profile, MAPS).some(g => g.id === 'guide-brew')).toBe(false);
    expect(claimGuide(r.profile, MAPS, 'guide-brew').event.type).toBe('blocked');
    const s = claimGuide(p, MAPS, 'guide-talent', true); expect(s.profile.guides).toEqual({ 'guide-talent': 'skipped' }); expect(s.profile.bank).toEqual(p.bank);
  });
});
