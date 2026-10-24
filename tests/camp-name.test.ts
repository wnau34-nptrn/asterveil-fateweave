import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame } from '../src/core/save/expedition-save';
import { NAME_MAX, commanderReason, createCommander, defaultCamp, newProfile, renameCamp } from '../src/core/world/profile';

// The ค่ายทหารรับจ้าง's name (owner 2026-10-21): chosen with the commander, renamed in the lobby, saved in v29.
const base = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายดาวเหนือ' };
describe('camp name', () => {
  it('follows the commander name rules', () => {
    expect(commanderReason(base)).toBe('');
    expect(commanderReason({ ...base, camp: '  ' })).toBe('camp');
    expect(commanderReason({ ...base, camp: 'ก'.repeat(NAME_MAX + 1) })).toBe('camp');
    expect(commanderReason({ ...base, camp: '<ค่าย>' })).toBe('camp');
    expect(createCommander(newProfile(map, 1), { ...base, camp: '  ค่าย   ดาวเหนือ ' }).profile.commander!.camp).toBe('ค่าย ดาวเหนือ');
  });
  it('can be renamed in the lobby, never to an invalid or unchanged name', () => {
    const p = createCommander(newProfile(map, 1), base).profile;
    const r = renameCamp(p, 'ค่ายเหยี่ยวเงิน');
    expect(r.event).toEqual({ type: 'commander' }); expect(r.profile.commander).toEqual({ ...base, camp: 'ค่ายเหยี่ยวเงิน' });
    expect(renameCamp(p, '').event).toEqual({ type: 'blocked', reason: 'camp' });
    expect(renameCamp(p, base.camp).event).toEqual({ type: 'blocked', reason: 'unchanged' });
    expect(renameCamp(newProfile(map, 1), 'ค่าย').event).toEqual({ type: 'blocked', reason: 'commander' });
  });
  it('older saves get "ค่าย" + the commander name, cut to the limit; v29 requires the field', () => {
    expect(defaultCamp('อารี')).toBe('ค่ายอารี'); expect([...defaultCamp('ก'.repeat(NAME_MAX))].length).toBe(NAME_MAX);
    const { camp: _, ...old } = base; void _;
    const profile = { ...newProfile(map, 1), commander: old };
    expect(parseGame(JSON.stringify({ version: 28, profile, run: null }), map, lookup).profile.commander).toEqual({ ...old, camp: 'ค่ายอารี' });
    expect(() => parseGame(JSON.stringify({ version: 29, profile, run: null }), map, lookup)).toThrow();
    expect(() => parseGame(JSON.stringify({ version: 29, profile: { ...profile, commander: { ...base, camp: '' } }, run: null }), map, lookup)).toThrow();
  });
});
