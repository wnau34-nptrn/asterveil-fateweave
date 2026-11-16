import { describe, expect, it } from 'vitest';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS } from '../src/content/world/maps';
import { weekOf } from '../src/core/world/board';
import { newProfile } from '../src/core/world/profile';
import type { Profile } from '../src/core/world/types';
import { worldBossBody, worldBossReady, worldBossStartReason } from '../src/ui/world-boss-panel';
import type { WorldBossStatus } from '../src/platform/server-client';

// P11-04 part 2: the World Boss tab is a pure view of the book and the shared HP the server reports.
const D = 20_773; const W = weekOf(D);
const commander = { name: 'ทดสอบ', crest: 'star', color: 'gold', camp: 'ค่ายทดสอบ' } as const;
const base = (patch: Partial<Profile> = {}): Profile => ({ ...newProfile(home, 5), tutorialDone: true, commander: { ...commander }, cleared: MAPS.map(m => m.id), ...patch });
const status = (current: number, last: number | null = null): WorldBossStatus => ({ week: W,
  current: { week: W, hp: 5000, left: 5000 - current, accounts: 12 }, last: last === null ? null : { week: W - 1, hp: 5000, left: 5000 - last, accounts: 9 } });
const played = (attempts: number, claimed: string[] = [], week = W): Profile => base({ worldBoss: { weeks: [{ week, attempts, bosses: {}, ...(attempts ? { legacy: { attempts, damage: attempts * 300, best: 300 } } : {}), claimed }] } });

describe('World Boss tab (P11-04 part 2)', () => {
  it('shows the week, the attempts and the personal milestones; offline has no shared bar', () => {
    const html = worldBossBody(played(2, ['p-2']), MAPS, D, null, false);
    expect(html).toContain('2/5'); expect(html).toContain('id="wb-offline"'); expect(html).not.toContain('wb-bar');
    expect(html).toContain('id="wb-p-2" data-state="claimed"'); expect(html).toContain('id="wb-p-4" data-state="open"'); expect(html).toContain('อีก 2 ครั้ง');
    expect(html).toContain('ครั้งที่ 3/5'); expect(html).not.toContain('wb-claim');
  });
  it('online shows the shared HP bar and a claim only once the server has reached the percent (and we took part)', () => {
    const none = worldBossBody(played(1), MAPS, D, status(1000), true);
    expect(none).toContain('aria-valuenow="20"'); expect(none).toContain('ทั้งเซิร์ฟเวอร์ 20% / 50%'); expect(none).not.toContain('data-lobby="wb-claim"');
    const half = worldBossBody(played(1), MAPS, D, status(2500), true);
    expect(half).toContain(`data-lobby="wb-claim" data-id="s-50" data-week="${W}"`); expect(half).not.toContain('data-id="s-100"');
    expect(worldBossReady(played(1), MAPS, D, status(2500))).toBe(1); expect(worldBossReady(played(1), MAPS, D, status(5000))).toBe(2);
    expect(worldBossReady(played(0), MAPS, D, status(5000))).toBe(0); expect(worldBossReady(played(1, ['s-50']), MAPS, D, status(2500))).toBe(0);
    expect(worldBossReady(played(1), MAPS, D, null)).toBe(0);
  });
  it('last week stays claimable for those who took part, and only what is unclaimed shows', () => {
    const p = base({ worldBoss: { weeks: [{ week: W - 1, attempts: 3, bosses: {}, legacy: { attempts: 3, damage: 900, best: 300 }, claimed: ['p-2'] }, { week: W, attempts: 0, bosses: {}, claimed: [] }] } });
    const html = worldBossBody(p, MAPS, D, status(0, 5000), true);
    expect(html).toContain(`data-id="s-50" data-week="${W - 1}"`); expect(html).toContain(`data-id="s-100" data-week="${W - 1}"`);
    expect(worldBossReady(p, MAPS, D, status(0, 5000))).toBe(2);
    const done = worldBossBody(base({ worldBoss: { weeks: [{ week: W - 1, attempts: 3, bosses: {}, legacy: { attempts: 3, damage: 900, best: 300 }, claimed: ['s-50', 's-100'] }] } }), MAPS, D, status(0, 5000), true);
    expect(done).not.toContain(`data-week="${W - 1}"`);
  });
  it('the start button closes when the five attempts are used or there is no field team', () => {
    expect(worldBossStartReason(base(), MAPS, D)).toBe(''); expect(worldBossStartReason(played(5), MAPS, D)).toBe('used');
    const noTeam = base(); noTeam.party = { ...noTeam.party, deployed: [] }; expect(worldBossStartReason(noTeam, MAPS, D)).toBe('team');
    expect(worldBossBody(played(5), MAPS, D, null, false)).toMatch(/id="wb-start"[^>]*disabled/);
    expect(worldBossBody(base(), MAPS, D, null, false)).not.toMatch(/id="wb-start"[^>]*disabled/);
  });
});
