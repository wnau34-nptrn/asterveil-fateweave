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

  it('uses the short-wait cadence alternative instead of the longest cooling skill', () => {
    const d = fixture('lalin', 'cadence', { dancerCadenceShort: 0 }), s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 4, ward: s.round + 2 });
    const frame = cast(d, s, 'lalin', 'cadence', 'guardian');
    expect(hero(frame.state, 'guardian').cooldowns.bash).toBe(s.round + 4);
    expect(hero(frame.state, 'guardian').cooldowns.ward).toBe(s.round + 1);
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

});

describe('Skill rework 2026-11-05: Cerise has direct effects', () => {
  it('cadence shields another ally from round 1 (nothing cooling) without stacking, and still recovers a cooldown', () => {
    const d = fixture('lalin', 'cadence');
    const s = beginBattle(d).state;
    expect(targetOptions(s, d, 'lalin', 'cadence').find(t => t.id === 'guardian')?.valid).toBe(true);
    const first = cast(d, s, 'lalin', 'cadence', 'guardian');
    expect(first.events.filter(e => e.type === 'barrier')).toMatchObject([{ sourceId: 'lalin', targetId: 'guardian', amount: 8 }]);
    expect(hero(first.state, 'guardian').barrier).toBe(8);
    // An ally already holding a larger barrier gains nothing extra (the larger value stands).
    const shielded = structuredClone(s); hero(shielded, 'guardian').barrier = 12; waiting(shielded, 'guardian', { bash: s.round + 2 });
    const second = cast(d, shielded, 'lalin', 'cadence', 'guardian');
    expect(hero(second.state, 'guardian').barrier).toBe(12);
    expect(hero(second.state, 'guardian').cooldowns.bash).toBe(s.round + 1);
  });

});

describe('Dancer rework 2026-11-05 (save v48): quicken cap, echo, beats, steady', () => {
  const dance = (actions: ActionId[], caps: Caps = {}, foes = 1, hit = 0): EncounterDefinition => {
    const base = fixture('lalin', 'attack', caps, foes);
    return { ...base, heroes: base.heroes.map(h => h.id === 'lalin' ? { ...h, actions: ['attack', ...actions] } : h.id === 'guardian' ? { ...h, actions: [...h.actions, 'revive'] as ActionId[] } : h),
      intents: base.intents.map(i => i.sourceId === 'f1' ? { ...i, damage: hit } : i) };
  };
  const play = (d: EncounterDefinition, s: BattleState, id: string, action: ActionId, targetId = 'f1') => resolveCommand(s, d, command(s, id, action, targetId)).state;

  it('cadence quickens one skill once per use, never to before the round after its use, and long skills once per battle', () => {
    const d = dance(['cadence']); const s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 2, revive: s.round + 5 });
    const first = cast(d, s, 'lalin', 'cadence', 'guardian');
    // Longest first: revive (once per battle), then bash would be next.
    expect(hero(first.state, 'guardian').cooldowns.revive).toBe(s.round + 4);
    expect(hero(first.state, 'guardian').quickenedBattle).toEqual(['revive']);
    expect(cooldownTargets(first.state, d, 'guardian')).toEqual(['bash']);
    // Bash used this round (ready in two rounds) can only come one round earlier, and only once until it is used again.
    const t = structuredClone(s); delete hero(t, 'guardian').cooldowns.revive;
    const q = cast(d, t, 'lalin', 'cadence', 'guardian');
    expect(hero(q.state, 'guardian').cooldowns.bash).toBe(s.round + 1);
    expect(cooldownTargets(q.state, d, 'guardian')).toEqual([]);
    expect(targetOptions(q.state, d, 'lalin', 'cadence').find(o => o.id === 'guardian')).toBeDefined();
  });

  it('a skill quickened once can be quickened again only after its next use', () => {
    const d = dance(['cadence']); const s = beginBattle(d).state;
    const after = play(d, s, 'lalin', 'cadence', 'guardian');
    hero(after, 'guardian').quickened = ['bash'];
    expect(currentHeroId(after, d)).toBe('guardian');
    expect(hero(play(d, after, 'guardian', 'bash'), 'guardian').quickened).toBeUndefined();
    expect(hero(play(d, after, 'guardian', 'attack'), 'guardian').quickened).toEqual(['bash']);
  });
  it('duet echoes 40% of the bound ally\'s next skill damage once; a basic attack is not echoed without Cerise p2', () => {
    const d = dance(['duet']); const s = beginBattle(d).state;
    cast(d, s, 'lalin', 'duet', 'guardian');
    const bound = resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian'));
    expect(hero(bound.state, 'guardian').echo).toEqual([{ heroId: 'lalin', percent: 40, until: s.round + 1 }]);
    const g = resolveCommand(bound.state, d, command(bound.state, 'guardian', 'bash'));
    expect(previewCommand(bound.state, d, command(bound.state, 'guardian', 'bash'))).toEqual(g);
    const own = damage(g.turns[0]!) - g.turns[0]!.events.filter(e => e.text === 'Echo.').reduce((n, e) => n + (e.amount ?? 0), 0);
    expect(g.turns[0]!.events.filter(e => e.text === 'Echo.')).toMatchObject([{ type: 'damage', sourceId: 'lalin', targetId: 'f1', amount: Math.floor(own * 0.4) }]);
    expect(hero(g.state, 'guardian').echo).toBeUndefined();
    const plain = resolveCommand(bound.state, d, command(bound.state, 'guardian', 'attack'));
    expect(plain.turns[0]!.events.some(e => e.text === 'Echo.')).toBe(false);
    expect(hero(plain.state, 'guardian').echo).toHaveLength(1);
    const p2 = dance(['duet'], { lalin2: 0 }); const ps = beginBattle(p2).state;
    const pb = play(p2, ps, 'lalin', 'duet', 'guardian');
    expect(resolveCommand(pb, p2, command(pb, 'guardian', 'attack')).turns[0]!.events.some(e => e.text === 'Echo.')).toBe(true);
  });

  it('another ally\'s skill gives the dancer one beat (cap 3); a basic attack gives none; closing step spends them on every foe', () => {
    const d = dance(['closingstep'], {}, 2); let s = beginBattle(d).state;
    s = play(d, s, 'lalin', 'attack');
    const g = play(d, s, 'guardian', 'bash'); expect(hero(g, 'lalin').beats).toBe(1);
    const t = play(d, g, 'tracer', 'attack'); expect(hero(t, 'lalin').beats).toBe(1);
    const capped = structuredClone(t); hero(capped, 'lalin').beats = 3;
    expect(hero(play(d, capped, 'tracer' === currentHeroId(capped, d) ? 'tracer' : 'weaver', 'ward', 'weaver'), 'lalin').beats).toBe(3);
    const fresh = beginBattle(d).state; hero(fresh, 'lalin').beats = 2;
    const step = cast(d, fresh, 'lalin', 'closingstep', 'enemies');
    expect(damage(step, 'f1')).toBe(18); expect(damage(step, 'f2')).toBe(18);
    expect(hero(step.state, 'lalin').beats).toBeUndefined();
    const none = cast(d, beginBattle(d).state, 'lalin', 'closingstep', 'enemies');
    expect(damage(none, 'f1')).toBe(6);
  });

  it('round dance shields every other standing ally (or the two lowest with the pair node) and adds a beat per ally', () => {
    const d = dance(['rounddance']); const s = beginBattle(d, entry(d, { guardian: 50, tracer: 90, weaver: 70 })).state;
    const all = cast(d, s, 'lalin', 'rounddance', 'party');
    expect(all.events.filter(e => e.type === 'barrier').map(e => [e.targetId, e.amount])).toEqual([['guardian', 8], ['tracer', 8], ['weaver', 8]]);
    expect(hero(all.state, 'lalin').beats).toBe(3);
    const pd = dance(['rounddance'], { dancerRoundPair: 0 }); const ps = beginBattle(pd, entry(pd, { guardian: 50, tracer: 90, weaver: 70 })).state;
    const pair = cast(pd, ps, 'lalin', 'rounddance', 'party');
    expect(pair.events.filter(e => e.type === 'barrier').map(e => [e.targetId, e.amount])).toEqual([['guardian', 12], ['weaver', 12]]);
    expect(hero(pair.state, 'lalin').beats).toBe(2);
  });

  it('deep beat cuts every hit on the party this round by 40% and sends the cut back at the attacker; echo foot strikes and adds a beat', () => {
    const d = dance(['deepbeat'], {}, 1, 20);
    const run = (first: ActionId) => {
      let s = beginBattle(d).state; s = play(d, s, 'lalin', first, first === 'deepbeat' ? 'party' : 'f1');
      const before = s.enemies[0]!.hp;
      for (const id of ['guardian', 'tracer', 'weaver']) s = play(d, s, id, 'attack');
      return { taken: 100 - hero(s, 'guardian').hp, s, before };
    };
    const base = run('attack').taken; expect(base).toBeGreaterThan(0);
    const steady = run('deepbeat');
    expect(steady.taken).toBe(Math.ceil(base * 0.6));
    // The full foe turn includes the counter step from the dancer.
    let s = beginBattle(d).state; s = play(d, s, 'lalin', 'deepbeat', 'party');
    for (const id of ['guardian', 'tracer']) s = play(d, s, id, 'attack');
    const last = resolveCommand(s, d, command(s, 'weaver', 'attack'));
    expect(last.events.filter(e => e.text === 'Counter step.')).toMatchObject([{ sourceId: 'lalin', targetId: 'f1', amount: base - Math.ceil(base * 0.6) }]);
    expect(previewCommand(s, d, command(s, 'weaver', 'attack'))).toEqual(last);
    const e = dance(['echofoot']); const es = beginBattle(e).state;
    const foot = cast(e, es, 'lalin', 'echofoot');
    expect(damage(foot)).toBe(12); expect(hero(foot.state, 'lalin').beats).toBe(1);
  });

  it('no dance accepts a cooling-skill or recipient choice any more, and replay reproduces the resolver', () => {
    const d = dance(['duet', 'echofoot']); const s = beginBattle(d).state;
    waiting(s, 'guardian', { bash: s.round + 2 });
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'duet', 'guardian', { cooldownAction: 'bash' }))).toThrow();
    expect(() => resolveCommand(s, d, command(s, 'lalin', 'echofoot', 'f1', { cooldownTargetId: 'guardian' }))).toThrow();
    const s0 = beginBattle(d).state;
    const c1 = command(s0, 'lalin', 'duet', 'guardian'); const s1 = resolveCommand(s0, d, c1).state;
    const c2 = command(s1, 'guardian', 'bash'); const s2 = resolveCommand(s1, d, c2).state;
    expect(replay(d, [c1, c2])).toEqual(s2);
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

});
