import { describe, expect, it } from 'vitest';
import { createBattle, resolveCommand, songPower, withParty } from '../src/core/battle/engine';
import { veilSiege as data } from '../src/content/encounters/veil-siege';
import { mercenaries } from '../src/content/heroes/mercenaries';
import { unitStatuses } from '../src/ui/battle-status';

describe('battle status inspection', () => {
  it('projects real turn snapshots without mutating or revealing later consumed protection', () => {
    let s = createBattle(data);
    s = resolveCommand(s, data, { beat: s.beat, heroId: 'tracer', action: 'mark', targetId: 'brute' }).state;
    const marked = structuredClone(s);
    const result = resolveCommand(s, data, { beat: s.beat, heroId: 'weaver', action: 'ward', targetId: 'weaver' });
    s = result.state;
    const before = structuredClone(s);
    expect(unitStatuses(s, data, 'weaver').find(r => r.id === 'barrier')?.detail).toContain(String(s.heroes.find(h => h.id === 'weaver')!.barrier));
    expect(unitStatuses(marked, data, 'brute').find(r => r.id === 'mark')?.duration).toContain('2 รอบ รวมรอบนี้');
    const guarded = resolveCommand(s, data, { beat: s.beat, heroId: 'guardian', action: 'guard', targetId: 'weaver' });
    const first = guarded.turns[0]!.state;
    expect(unitStatuses(first, data, 'weaver').map(r => r.id)).toContain('guard');
    expect(unitStatuses(guarded.state, data, 'weaver').map(r => r.id)).not.toContain('guard');
    const attacked = resolveCommand(s, data, { beat: s.beat, heroId: 'guardian', action: 'bash', targetId: 'raider' });
    expect(unitStatuses(attacked.turns[0]!.state, data, 'weaver').map(r => r.id)).toContain('barrier');
    expect(unitStatuses(attacked.state, data, 'weaver').map(r => r.id)).not.toContain('barrier');
    expect(s).toEqual(before);
  });

  it('drops expired round effects and suppresses stale effects on downed/finished units', () => {
    const s = createBattle(data);
    Object.assign(s.enemies[0]!, { markedUntil: 3, corrodedUntil: 2, corrodeBonus: 7, delayedRound: 2, interruptedRound: 2 });
    s.round = 2;
    const rows = unitStatuses(s, data, s.enemies[0]!.id);
    expect(rows.map(r => r.id)).toEqual(['mark', 'delay', 'interrupt']);
    expect(rows[0]!.duration).toContain('เหลือ 1 รอบ');
    s.round = 3;
    expect(unitStatuses(s, data, s.enemies[0]!.id)).toEqual([]);
    s.round = 1; s.enemies[0]!.hp = 0;
    expect(unitStatuses(s, data, s.enemies[0]!.id)).toEqual([]);
    s.heroes[0]!.barrier = 18; s.outcome = 'victory';
    expect(unitStatuses(s, data, s.heroes[0]!.id)).toEqual([]);
  });

  it('shows songs on every living recipient and uses the caster’s scaled power', () => {
    const bard = { ...mercenaries.find(h => h.id === 'lio')!, skillBonus: 30, passive: 'resound' as const };
    const d = withParty(data, [bard, ...data.heroes.slice(0, 3)]);
    const s = createBattle(d); s.song = { heroId: 'lio', action: 'valor' };
    for (const h of s.heroes) {
      const song = unitStatuses(s, d, h.id).find(r => r.id === 'song');
      expect(song?.detail).toContain('ทุกคน'); expect(song?.detail).toContain('ลิโอ');
      expect(song?.detail).toContain(`แรงขึ้น ${songPower(d, 'lio', 'valor')}`);
      expect(song?.duration).toContain('เปลี่ยนเพลง');
    }
    s.heroes.find(h => h.id === 'lio')!.hp = 0;
    expect(unitStatuses(s, d, 'guardian').map(r => r.id)).not.toContain('song');
  });

  it('describes charges and caster-turn expiry instead of inventing round durations', () => {
    const s = createBattle(data), h = s.heroes[0]!;
    Object.assign(h, { barrier: 18, reflect: { heroId: 'weaver', amount: 4 }, evading: true, evadeExtra: 1, hastedRound: 2 });
    s.sanctuary = { heroId: 'healer', targetId: h.id };
    s.rally = { heroId: 'guardian', ids: [h.id] };
    s.solace = { heroId: 'healer', targetId: h.id };
    const rows = unitStatuses(s, data, h.id);
    expect(rows.find(r => r.id === 'evade')?.detail).toContain('2 ครั้ง');
    expect(rows.find(r => r.id === 'haste')?.duration).toBe('มีผลในรอบ 2 เท่านั้น');
    expect(rows.find(r => r.id === 'sanctuary')?.duration).toContain('เทิร์นถัดไปของเซเรน');
    expect(rows.find(r => r.id === 'reflect')?.detail).toContain('4');
    s.rally.ids = [];
    expect(unitStatuses(s, data, h.id).map(r => r.id)).not.toContain('rally');
  });

  it('uses the actual corrosion bonus and distinguishes energy seals from physical interruption', () => {
    const s = createBattle(data);
    const e = s.enemies.find(e => e.id === 'brute')!;
    Object.assign(e, { corrodedUntil: 4, corrodeBonus: 11, interruptedRound: 1 });
    const rows = unitStatuses(s, data, e.id);
    expect(rows.find(r => r.id === 'corrode')?.detail).toContain('11');
    expect(rows.find(r => r.id === 'interrupt')?.name).toBe('ผนึกพลัง');
    Object.assign(s.enemies.find(e => e.id === 'raider')!, { interruptedRound: 1 });
    expect(unitStatuses(s, data, 'raider').find(r => r.id === 'interrupt')?.name).toBe('ขัดจังหวะ');
  });

  it('projects front-lane counter protection and both sides of taunt, with downed casters removed', () => {
    const spear = mercenaries.find(h => h.id === 'garran')!, hammer = mercenaries.find(h => h.id === 'brann')!;
    const d = withParty(data, [spear, hammer, data.heroes[2]!, data.heroes[3]!]);
    const s = createBattle(d); s.counter = { heroId: spear.id, wall: true }; s.taunt = { heroId: hammer.id, round: 1 };
    expect(unitStatuses(s, d, hammer.id).map(r => r.id)).toEqual(['counter', 'taunt']);
    expect(unitStatuses(s, d, 'weaver').map(r => r.id)).not.toContain('counter');
    expect(unitStatuses(s, d, 'brute').map(r => r.id)).toContain('taunted');
    s.heroes.find(h => h.id === hammer.id)!.hp = 0;
    expect(unitStatuses(s, d, 'brute').map(r => r.id)).not.toContain('taunted');
  });
});
