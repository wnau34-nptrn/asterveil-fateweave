import { describe, expect, it } from 'vitest';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { rosterBatch1 } from '../src/content/heroes/roster-batch1';
import { beginBattle, cooldownTargets, currentHeroId, previewCommand, replay, resolveCommand, saintRatioOf, skillCooldown, targetOptions } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, HeroState, TalentCap, TurnStage } from '../src/core/battle/types';

type Caps = Partial<Record<TalentCap, number>>;
function fixture(id: string, action: ActionId, caps: Caps = {}, foes = 1): EncounterDefinition {
  const caster = rosterBatch1.find(h => h.id === id)!;
  return {
    ...veilSiege,
    heroes: [{ ...caster, speed: 1000, actions: action === 'attack' ? ['attack'] : ['attack', action], talents: { caps } },
      ...veilSiege.heroes.filter(h => h.id !== 'healer').map((h, i) => ({ ...h, speed: 500 - i, maxHp: 100, actions: ['attack', 'bash', 'ward', 'heal'] as ActionId[] }))],
    enemies: [{ id: 'f1', row: 'front', name: 'Test front', maxHp: 1000, speed: 1, color: 0 },
      ...(foes > 1 ? [{ id: 'f2' as const, row: 'front' as const, name: 'Test second', maxHp: 1000, speed: 1, color: 0 }] : [])],
    intents: [{ sourceId: 'f1', targetSlot: 1, name: 'Wait', damage: 0, kind: 'physical' },
      ...(foes > 1 ? [{ sourceId: 'f2', targetSlot: 1, name: 'Wait', damage: 0, kind: 'physical' as const }] : [])],
  };
}
const entry = (d: EncounterDefinition, hp: Record<string, number> = {}) => ({ hp: Object.fromEntries(d.heroes.map((h, i) => [h.id, hp[h.id] ?? (i ? 10 + i : h.maxHp)])) });
const hero = (state: BattleState, id: string): HeroState => state.heroes.find(h => h.id === id)!;
function command(s: BattleState, id: string, action: ActionId, targetId = 'f1', extra: Partial<Command> = {}): Command {
  return { heroId: id, action, targetId, beat: s.beat, ...extra };
}
function cast(d: EncounterDefinition, s: BattleState, id: string, action: ActionId, targetId = 'f1', extra: Partial<Command> = {}): TurnStage {
  const cmd = command(s, id, action, targetId, extra);
  const result = resolveCommand(s, d, cmd);
  expect(previewCommand(s, d, cmd)).toEqual(result);
  return result.turns[0]!;
}
const heals = (frame: TurnStage) => frame.events.filter(e => e.type === 'heal');
const damage = (frame: TurnStage, id = 'f1') => frame.events.filter(e => e.type === 'damage' && e.targetId === id).reduce((n, e) => n + (e.amount ?? 0), 0);
function waiting(s: BattleState, id: string, cds: HeroState['cooldowns']): void { hero(s, id).cooldowns = cds; }

describe('C12 Saint: actual damage becomes allied healing', () => {
  it('converts 30% of real HP damage, selects the lowest HP ratio, excludes self and never revives', () => {
    const d = fixture('metta', 'saintstrike');
    const s = beginBattle(d, entry(d, { metta: 1, guardian: 0, tracer: 10, weaver: 20 })).state;
    const frame = cast(d, s, 'metta', 'saintstrike');
    expect(damage(frame)).toBe(20);
    expect(heals(frame)).toMatchObject([{ targetId: 'tracer', amount: 6 }]);
    expect(hero(frame.state, 'metta').hp).toBe(1);
    expect(hero(frame.state, 'guardian').hp).toBe(0);
    expect(hero(frame.state, 'tracer').hp).toBe(16);
  });

  it('uses party order for tied injury ratios and caps healing at missing HP', () => {
    const d = fixture('metta', 'saintstrike');
    const s = beginBattle(d, entry(d, { guardian: 99, tracer: 99, weaver: 100 })).state;
    const frame = cast(d, s, 'metta', 'saintstrike');
    expect(heals(frame)).toMatchObject([{ targetId: 'guardian', amount: 1 }]);
    expect(hero(frame.state, 'guardian').hp).toBe(100);
    expect(hero(frame.state, 'tracer').hp).toBe(99);
  });

  it('does not inflate conversion with overkill or heal full-HP allies', () => {
    const d = fixture('metta', 'saintstrike');
    const s = beginBattle(d, entry(d)).state;
    s.enemies[0]!.hp = 5;
    const frame = cast(d, s, 'metta', 'saintstrike');
    expect(heals(frame)).toMatchObject([{ targetId: 'guardian', amount: 1 }]);
    const full = beginBattle(d).state;
    expect(heals(cast(d, full, 'metta', 'saintstrike'))).toHaveLength(0);
  });

  it('preserves the existing nonlethal thorns floor and excludes reflected damage from conversion', () => {
    const d = fixture('metta', 'saintstrike');
    d.rules = { ...d.rules, traits: { thornsPercent: 20, veilguardPercent: 25, enrageBelow: 50, enragePercent: 30 } };
    d.enemies = d.enemies.map(e => ({ ...e, traits: ['thorns' as const] }));
    const s = beginBattle(d, entry(d, { metta: 3 })).state;
    const frame = cast(d, s, 'metta', 'saintstrike');
    expect(hero(frame.state, 'metta').hp).toBe(1);
    expect(damage(frame)).toBe(20);
    expect(heals(frame)).toMatchObject([{ targetId: 'guardian', amount: 6 }]);
  });

  it('sums actual multi-target damage before flooring the conversion once', () => {
    const d = fixture('metta', 'saintarc', {}, 2);
    d.skills = { ...d.skills, saintarc: { ...d.skills.saintarc, power: 5 } };
    const s = beginBattle(d, entry(d)).state;
    const frame = cast(d, s, 'metta', 'saintarc', 'enemies');
    expect(damage(frame, 'f1') + damage(frame, 'f2')).toBe(10);
    expect(heals(frame).reduce((n, e) => n + e.amount!, 0)).toBe(3);
  });

  it('keeps the fixed healing budget when split in two or three, and gives a lone recipient the entire budget', () => {
    for (const [caps, count] of [[{}, 2], [{ shareThree: 0 }, 3]] as [Caps, number][]) {
      const d = fixture('metta', 'sharewound', caps);
      d.skills = { ...d.skills, sharewound: { ...d.skills.sharewound, power: 17 } };
      const s = beginBattle(d, entry(d)).state;
      const frame = cast(d, s, 'metta', 'sharewound');
      expect(heals(frame)).toHaveLength(count);
      expect(heals(frame).reduce((n, e) => n + e.amount!, 0)).toBe(5);
      const one = beginBattle(d, entry(d, { guardian: 10, tracer: 100, weaver: 100 })).state;
      expect(heals(cast(d, one, 'metta', 'sharewound'))).toMatchObject([{ targetId: 'guardian', amount: 5 }]);
    }
  });

  it('applies class ratios, threshold choice, finishing condition and long-cooldown tradeoff', () => {
    const d = fixture('metta', 'communion', { communionRatio: 10, metta1: 5, saintRatio: 5 });
    expect(saintRatioOf(d, 'metta', 'communion')).toBe(65); // Fixed override, no base-only +5.
    expect(saintRatioOf(d, 'metta', 'attack')).toBe(35);
    const frame = cast(d, beginBattle(d, entry(d)).state, 'metta', 'communion');
    expect(heals(frame).reduce((n, e) => n + e.amount!, 0)).toBe(7);
    const vow = fixture('metta', 'vowstrike', { vowThreshold: 50 });
    const v = cast(vow, beginBattle(vow, entry(vow, { guardian: 45, tracer: 100, weaver: 100 })).state, 'metta', 'vowstrike');
    expect(heals(v).reduce((n, e) => n + e.amount!, 0)).toBe(9);
    const finish = fixture('metta', 'saintstrike', { saintFinish: 45 });
    const fs = beginBattle(finish, entry(finish)).state; fs.enemies[0]!.hp = 20;
    expect(heals(cast(finish, fs, 'metta', 'saintstrike'))).toMatchObject([{ amount: 9 }]);
    const last = fixture('metta', 'lastlight', { lastlightRatio: 45 });
    expect(skillCooldown(last, 'metta', 'lastlight')).toBe(5);
    expect(saintRatioOf(last, 'metta', 'lastlight')).toBe(45);
  });

  it('respects Metta personal damage, 60:40 split and lastlight conversion tradeoff', () => {
    const strike = fixture('metta', 'saintstrike', { metta2: 3 });
    expect(damage(cast(strike, beginBattle(strike, entry(strike)).state, 'metta', 'saintstrike'))).toBe(23);
    const split = fixture('metta', 'sharewound', { metta3: 60 });
    split.skills = { ...split.skills, sharewound: { ...split.skills.sharewound, power: 100 } };
    expect(heals(cast(split, beginBattle(split, entry(split)).state, 'metta', 'sharewound'))).toMatchObject([{ targetId: 'guardian', amount: 18 }, { targetId: 'tracer', amount: 12 }]);
    const last = fixture('metta', 'lastlight', { metta4: 50 });
    const frame = cast(last, beginBattle(last, entry(last)).state, 'metta', 'lastlight');
    expect(damage(frame)).toBe(20); expect(heals(frame)).toMatchObject([{ amount: 10 }]);
  });

  it('counts a wounded Thiran toward the two-front bonus while never converting damage into self-healing', () => {
    const d = fixture('thiran', 'vowstrike', { thiran3: 3 });
    const s = beginBattle(d, entry(d, { thiran: 5, guardian: 20, tracer: 100, weaver: 100 })).state;
    const frame = cast(d, s, 'thiran', 'vowstrike');
    expect(damage(frame)).toBe(25);
    expect(heals(frame)).toMatchObject([{ targetId: 'guardian', amount: 11 }]);
    expect(hero(frame.state, 'thiran').hp).toBe(5);
  });

  it('respects Thiran front priority, two-injured-front bonus and fixed-total dual conversion', () => {
    const d = fixture('thiran', 'vowstrike', { thiran2: 0, thiran3: 3, thiran4: 0 });
    const s = beginBattle(d, entry(d, { guardian: 20, tracer: 30, weaver: 1 })).state;
    const frame = cast(d, s, 'thiran', 'vowstrike');
    expect(damage(frame)).toBe(25);
    expect(heals(frame)).toHaveLength(2);
    expect(heals(frame).map(e => e.targetId)).toEqual(['guardian', 'tracer']);
    expect(heals(frame).reduce((n, e) => n + e.amount!, 0)).toBe(11);
  });
});

describe('C12 Dancer: cooldown relief never changes action order', () => {
  it('sorts cooling equipped skills by remaining time then equipped order and excludes ready, attack and every dancer reducer', () => {
    const d = fixture('lalin', 'cadence');
    d.heroes = d.heroes.map(h => h.id === 'guardian' ? { ...h, actions: ['attack', 'heal', 'bash', 'ward', 'cadence', 'duet', 'rounddance', 'deepbeat', 'echofoot', 'closingstep'] as ActionId[] } : h);
    const s = beginBattle(d).state;
    waiting(s, 'guardian', { heal: s.round + 4, bash: s.round + 4, ward: s.round, cadence: 20, duet: 20, rounddance: 20, deepbeat: 20, echofoot: 20, closingstep: 20 });
    expect(cooldownTargets(s, d, 'guardian')).toEqual(['heal', 'bash']);
  });

  it('reduces absolute ready rounds without crossing the current round, self-targeting or changing the queue', () => {
    const d = fixture('lalin', 'cadence');
    const s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 1 });
    const frame = cast(d, s, 'lalin', 'cadence', 'guardian');
    expect(Math.max(0, (hero(frame.state, 'guardian').cooldowns.bash ?? 0) - s.round)).toBe(0);
    expect(frame.state.order).toEqual(s.order);
    expect(frame.state.heroes.map(h => h.hastedRound)).toEqual(s.heroes.map(h => h.hastedRound));
    expect(targetOptions(s, d, 'lalin', 'cadence').find(t => t.id === 'lalin')?.valid).not.toBe(true);
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'cadence', 'lalin'))).toThrow();
  });

  it('rejects no-op and downed allies but allows a useful subset of duet', () => {
    const d = fixture('lalin', 'duet');
    const s = beginBattle(d).state;
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian'))).toThrow();
    waiting(s, 'guardian', { bash: s.round + 2 });
    expect(hero(cast(d, s, 'lalin', 'duet', 'guardian').state, 'guardian').cooldowns.bash).toBe(s.round + 1);
    hero(s, 'guardian').hp = 0;
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian'))).toThrow();
  });

  it('handles both duet modifiers and stronger deepbeat without lowering cooldown below zero remaining', () => {
    for (const caps of [{}, { dancerDuetFocus: 0 }] as Caps[]) {
      const d = fixture('lalin', 'duet', caps), s = beginBattle(d).state;
      waiting(s, 'guardian', { bash: s.round + 4, ward: s.round + 3 });
      const frame = cast(d, s, 'lalin', 'duet', 'guardian');
      expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + (caps.dancerDuetFocus === undefined ? 3 : 2));
      expect(hero(frame.state, 'guardian').cooldowns.ward).toBe(s.round + (caps.dancerDuetFocus === undefined ? 2 : 3));
    }
    const d = fixture('lalin', 'deepbeat', { dancerDeep: 0 }), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 2 });
    expect(Math.max(0, (hero(cast(d, s, 'lalin', 'deepbeat', 'guardian').state, 'guardian').cooldowns.bash ?? 0) - s.round)).toBe(0);
    expect(skillCooldown(d, 'lalin', 'deepbeat')).toBe(5);
    expect(skillCooldown(fixture('lalin', 'cadence', { dancerCadenceQuick: 1 }), 'lalin', 'cadence')).toBe(2);
    expect(skillCooldown(fixture('lalin', 'duet', { dancerDuetQuick: 1 }), 'lalin', 'duet')).toBe(3);
  });

  it('uses the short-wait cadence alternative instead of the longest cooling skill', () => {
    const d = fixture('lalin', 'cadence', { dancerCadenceShort: 0 }), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 4, ward: s.round + 2 });
    const frame = cast(d, s, 'lalin', 'cadence', 'guardian');
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 4);
    expect(hero(frame.state, 'guardian').cooldowns.ward).toBe(s.round + 1);
  });

  it('rounddance relieves every eligible ally, or only the two with the greatest remaining cooldown totals', () => {
    for (const caps of [{}, { dancerRoundPair: 0 }] as Caps[]) {
      const d = fixture('lalin', 'rounddance', caps), s = beginBattle(d).state;
      waiting(s, 'guardian', { bash: s.round + 2 }); waiting(s, 'tracer', { bash: s.round + 4 }); waiting(s, 'weaver', { ward: s.round + 5 });
      const frame = cast(d, s, 'lalin', 'rounddance', 'party');
      expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + (caps.dancerRoundPair === undefined ? 1 : 2));
      expect(hero(frame.state, 'tracer').cooldowns.bash).toBe(s.round + (caps.dancerRoundPair === undefined ? 3 : 2));
      expect(hero(frame.state, 'weaver').cooldowns.ward).toBe(s.round + (caps.dancerRoundPair === undefined ? 4 : 3));
    }
  });

  it('echofoot damages once and selects an eligible ally by cooldown total, or an explicit chosen ally', () => {
    const auto = fixture('lalin', 'echofoot'), s = beginBattle(auto).state;
    waiting(s, 'guardian', { bash: s.round + 4 }); waiting(s, 'tracer', { bash: s.round + 3, ward: s.round + 2 });
    const frame = cast(auto, s, 'lalin', 'echofoot');
    expect(damage(frame)).toBe(12); expect(hero(frame.state, 'tracer').cooldowns.bash).toBe(s.round + 2);
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 4);
    const chosen = fixture('lalin', 'echofoot', { dancerEchoChoose: 0 });
    const cs = beginBattle(chosen).state; waiting(cs, 'guardian', { bash: cs.round + 4 });
    const chosenFrame = cast(chosen, cs, 'lalin', 'echofoot', 'f1', { cooldownTargetId: 'guardian' });
    expect(hero(chosenFrame.state, 'guardian').cooldowns.bash).toBe(cs.round + 3);
    expect(() => resolveCommand(cs, chosen, command(cs, 'lalin', 'echofoot'))).toThrow();
  });

  it('requires a legal selected duet skill only for Lalin personal choice, then applies two-skill relief once', () => {
    const d = fixture('lalin', 'duet', { lalin2: 0 }), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 4, ward: s.round + 2, heal: s.round + 3 });
    const frame = cast(d, s, 'lalin', 'duet', 'guardian', { cooldownAction: 'ward' });
    expect(hero(frame.state, 'guardian').cooldowns.ward).toBe(s.round + 1);
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 3);
    expect(hero(frame.state, 'guardian').cooldowns.heal).toBe(s.round + 3);
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian'))).toThrow();
    for (const action of ['attack', 'cadence'] as ActionId[]) expect(() => resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian', { cooldownAction: action }))).toThrow();
  });

  it('strictly rejects missing, inappropriate or extraneous cooldown choices', () => {
    const d = fixture('lalin', 'cadence'), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 3 });
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'cadence', 'guardian', { cooldownAction: 'bash' }))).toThrow();
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'cadence', 'guardian', { cooldownTargetId: 'guardian' }))).toThrow();
    const echo = fixture('lalin', 'echofoot', { dancerEchoChoose: 0 }), es = beginBattle(echo).state;
    waiting(es, 'guardian', { bash: es.round + 3 });
    expect(() => resolveCommand(es, echo, command(es, 'lalin', 'echofoot', 'f1', { cooldownTargetId: 'lalin' }))).toThrow();
    expect(() => resolveCommand(es, echo, command(es, 'lalin', 'echofoot', 'f1', { cooldownTargetId: 'unknown' }))).toThrow();
    expect(() => resolveCommand(es, echo, command(es, 'lalin', 'attack', 'f1', { cooldownTargetId: 'guardian' }))).toThrow();
  });

  it('applies personal relief bonuses without inventing an extra caster turn', () => {
    const d = fixture('lalin', 'deepbeat', { lalin3: 1 }), s = beginBattle(d, entry(d, { guardian: 20 })).state;
    waiting(s, 'guardian', { bash: s.round + 5 });
    const frame = cast(d, s, 'lalin', 'deepbeat', 'guardian');
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 2);
    const result = resolveCommand(s, d, command(s, 'lalin', 'deepbeat', 'guardian'));
    expect(currentHeroId(result.state, d)).toBe('guardian');
    expect(result.turns.filter(t => t.actorId === 'lalin')).toHaveLength(1);
    const last = fixture('lalin', 'closingstep', { lalin4: 1, dancerClosingQuick: 1 }), ls = beginBattle(last).state;
    waiting(ls, 'guardian', { bash: ls.round + 4, ward: ls.round + 3 });
    const lf = cast(last, ls, 'lalin', 'closingstep', 'guardian');
    expect(hero(lf.state, 'guardian').cooldowns.bash).toBe(ls.round + 2);
    expect(hero(lf.state, 'guardian').cooldowns.ward).toBe(ls.round + 3);
    expect(hero(lf.state, 'lalin').cooldowns.closingstep).toBe(ls.round + 5);
  });

  it('preserves Star-veil free cast when mastery and opening bonuses already make Cadence cooldown zero', () => {
    const d = fixture('lalin', 'cadence', { dancerCadenceQuick: 1, lalin1: 1 });
    d.heroes = d.heroes.map(h => h.id === 'lalin' ? { ...h, actions: ['attack', 'cadence', 'duet'] as ActionId[], skillLevels: { cadence: 5 }, gear: { freeCast: true } } : h);
    const s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 8 });
    const first = resolveCommand(s, d, command(s, 'lalin', 'cadence', 'guardian'));
    expect(hero(first.turns[0]!.state, 'lalin').cooldowns.cadence).toBeUndefined();
    expect(first.state.freeCast ?? []).not.toContain('lalin');
    let next = first.state;
    for (let attempts = 0; attempts < 12 && currentHeroId(next, d) !== 'lalin'; attempts++) {
      next = resolveCommand(next, d, command(next, currentHeroId(next, d)!, 'attack')).state;
    }
    expect(currentHeroId(next, d)).toBe('lalin');
    const second = cast(d, next, 'lalin', 'duet', 'guardian');
    expect(second.state.freeCast).toContain('lalin');
    expect(hero(second.state, 'lalin').cooldowns.duet).toBeUndefined();
  });

  it('uses Lalin/Wila opening cooldown bonuses once per battle, not every later cast', () => {
    for (const [id, action, cap] of [['lalin', 'cadence', 'lalin1'], ['wila', 'rounddance', 'wila1']] as [string, ActionId, TalentCap][]) {
      const d = fixture(id, action, { [cap]: 1 }), s = beginBattle(d).state;
      waiting(s, 'guardian', { bash: 40 });
      const target = action === 'rounddance' ? 'party' : 'guardian';
      const first = resolveCommand(s, d, command(s, id, action, target));
      const ready = s.round + d.skills[action].cooldown - 1;
      expect(hero(first.turns[0]!.state, id).cooldowns[action]).toBe(ready);
      let next = first.state;
      for (let attempts = 0; attempts < 40 && (next.round < ready || currentHeroId(next, d) !== id); attempts++) {
        const actor = currentHeroId(next, d)!;
        next = resolveCommand(next, d, command(next, actor, 'attack')).state;
      }
      expect(next.round).toBe(ready);
      expect(currentHeroId(next, d)).toBe(id);
      const second = cast(d, next, id, action, target);
      expect(hero(second.state, id).cooldowns[action]).toBe(next.round + d.skills[action].cooldown);
    }
  });

  it('Wila duet shares one relief per ally and rounddance refunds its own cooldown only when three allies benefit', () => {
    const d = fixture('wila', 'duet', { wila4: 0 }), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 5 }); waiting(s, 'tracer', { ward: s.round + 3 }); waiting(s, 'weaver', { heal: s.round + 2 });
    const frame = cast(d, s, 'wila', 'duet', 'guardian');
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 4);
    expect(hero(frame.state, 'tracer').cooldowns.ward).toBe(s.round + 2);
    expect(hero(frame.state, 'weaver').cooldowns.heal).toBe(s.round + 2);
    const round = fixture('wila', 'rounddance', { wila3: 1 }), rs = beginBattle(round).state;
    for (const id of ['guardian', 'tracer', 'weaver']) waiting(rs, id, { bash: rs.round + 3 });
    const rf = cast(round, rs, 'wila', 'rounddance', 'party');
    expect(hero(rf.state, 'wila').cooldowns.rounddance).toBe(rs.round + 4);
  });
});

describe('C12 command history remains replayable', () => {
  it('Saint damaging actions and ordinary echofoot have identical preview and replay results', () => {
    for (const [id, actions] of [['metta', ['attack', 'saintstrike', 'communion', 'saintarc', 'vowstrike', 'sharewound', 'lastlight']], ['lalin', ['echofoot']]] as [string, ActionId[]][]) {
      for (const action of actions) {
        const d = fixture(id, action, {}, action === 'saintarc' ? 2 : 1), initial = entry(d);
        const s = beginBattle(d, initial).state;
        const target = targetOptions(s, d, id, action).find(t => t.valid)!;
        const c = command(s, id, action, target.id), result = resolveCommand(s, d, c);
        expect(previewCommand(s, d, c)).toEqual(result);
        expect(replay(d, result.state.commands, initial)).toEqual(result.state);
        expect(() => resolveCommand(s, d, { ...c, beat: c.beat + 1 })).toThrow();
      }
    }
  });

  it('keeps explicit chosen skill/recipient fields in replayable command history', () => {
    for (const [action, caps, extra] of [
      ['duet', { lalin2: 0 }, { cooldownAction: 'ward' }],
      ['echofoot', { dancerEchoChoose: 0 }, { cooldownTargetId: 'guardian' }],
    ] as [ActionId, Caps, Partial<Command>][]) {
      const d = fixture('lalin', action, caps);
      d.heroes = d.heroes.map(h => h.id === 'guardian' ? { ...h, speed: 2000, actions: ['attack', 'ward'] as ActionId[] } : h);
      const initial = entry(d), s = beginBattle(d, initial).state;
      const ward = resolveCommand(s, d, command(s, 'guardian', 'ward', 'guardian')).state;
      const cmd = command(ward, 'lalin', action, action === 'echofoot' ? 'f1' : 'guardian', extra);
      const result = resolveCommand(ward, d, cmd);
      expect(previewCommand(ward, d, cmd)).toEqual(result);
      expect(result.state.commands.at(-1)).toMatchObject(extra);
      expect(replay(d, result.state.commands, initial)).toEqual(result.state);
    }
  });

  it('replays every cooldown-only action from a real prior cast rather than a manually seeded fixture', () => {
    for (const action of ['cadence', 'duet', 'rounddance', 'deepbeat', 'closingstep'] as ActionId[]) {
      const d = fixture('lalin', action);
      d.heroes = d.heroes.map(h => h.id === 'guardian' ? { ...h, speed: 2000, actions: ['attack', 'ward'] as ActionId[] } : h);
      const initial = entry(d), s = beginBattle(d, initial).state;
      const ward = resolveCommand(s, d, command(s, 'guardian', 'ward', 'guardian')).state;
      expect(currentHeroId(ward, d)).toBe('lalin');
      const c = command(ward, 'lalin', action, action === 'rounddance' ? 'party' : 'guardian'), result = resolveCommand(ward, d, c);
      expect(previewCommand(ward, d, c)).toEqual(result);
      expect(Math.max(0, (hero(result.turns[0]!.state, 'guardian').cooldowns.ward ?? 0) - ward.round)).toBe(['deepbeat', 'closingstep'].includes(action) ? 0 : 1);
      expect(replay(d, result.state.commands, initial)).toEqual(result.state);
    }
  });
});
