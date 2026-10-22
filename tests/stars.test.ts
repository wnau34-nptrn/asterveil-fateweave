import { describe, expect, it } from 'vitest';
import { corrodeBonusOf, createBattle, currentHeroId, nextIntentOf, resolveCommand, skillPower, songPower, targetOptions, withParty } from '../src/core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../src/core/battle/types';
import { veilSiege as siegeBase } from '../src/content/encounters/veil-siege';
import { openField } from './fixtures/open-field';
const veilSiege = openField(siegeBase);
import { encounterById } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { heroDef, starred } from '../src/core/world/world';

// ★3 skills and ★5 passives (docs/EXPEDITION_DESIGN.md "Star unlocks"). Parties are built the way the
// world builds them: catalog definition + stars (`starred`), deployed in slot order.
// The Knight's big tree (A6) unlocks rally and stand as tree nodes; a company that had them from stars keeps them as
// grants (save v34), which is what these star tests model for him.
const legacy = (id: string, stars: number) => id === 'guardian' ? { grants: [...stars >= 3 ? ['c1s'] : [], ...stars >= 5 ? ['a4'] : []] } : undefined;
const member = (id: string, stars: number) => starred(heroDef(encounterById, map, id)!, stars, map, 1, {}, undefined, legacy(id, stars));
const party = (members: [string, number][], base: EncounterDefinition = veilSiege) => withParty(base, members.map(([id, stars]) => member(id, stars)));
const act = (s: BattleState, d: EncounterDefinition, action: ActionId, targetId: string) =>
  resolveCommand(s, d, { beat: s.beat, heroId: currentHeroId(s, d)!, action, targetId });
// Advance with plain attacks on the brute until `id` has the turn.
function until(s: BattleState, d: EncounterDefinition, id: string): BattleState {
  for (let i = 0; i < 40 && currentHeroId(s, d) !== id; i++) s = act(s, d, 'attack', s.enemies.find(e => e.hp > 0)!.id).state;
  expect(currentHeroId(s, d)).toBe(id);
  return s;
}
const hp = (s: BattleState, id: string) => [...s.heroes, ...s.enemies].find(a => a.id === id)!.hp;

describe('star unlocks', () => {
  it('★3 adds the class skill, ★5 switches on the passive; ★1–2 are unchanged', () => {
    for (const id of ['guardian', 'tracer', 'weaver', 'healer', 'garran', 'mira', 'toma', 'sefa', 'brann', 'lio']) {
      const base = heroDef(encounterById, map, id)!;
      expect(member(id, 1)).toEqual(base);
      expect(member(id, 2).actions).toEqual(base.actions); expect(member(id, 2).passive).toBeUndefined();
      expect(member(id, 3).actions).toEqual([...base.actions, base.unlocks!.skill]); expect(member(id, 4).passive).toBeUndefined();
      expect(member(id, 5).passive).toBe(base.unlocks!.passive);
      expect(new Set(member(id, 5).actions).size).toBe(member(id, 5).actions.length);
    }
  });
  it('a ★2 member cannot use the ★3 skill', () => {
    const d = party([['guardian', 2], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'guardian');
    expect(targetOptions(s, d, 'guardian', 'rally')[0]!.reason).toBe('This hero does not have this action.');
  });
});

describe('knight ★3 rally / ★5 stand (Aegis)', () => {
  it('reduces each ally’s first hit until the knight’s next turn', () => {
    const d = party([['guardian', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const r = act(until(createBattle(d), d, 'guardian'), d, 'rally', 'guardian');
    expect([...r.turns[0]!.state.rally!.ids].sort()).toEqual(['guardian', 'healer', 'tracer', 'weaver']);
    // The brute acts next: its Rift Bolt (28) at Eira is reduced 35% and uses up Eira's share only.
    const bolt = r.turns.find(t => t.actorId === 'f1')!.events.find(e => e.type === 'damage')!;
    expect(bolt).toMatchObject({ targetId: 'weaver', amount: Math.ceil(28 * (1 - d.rules.rallyReduction)) });
    expect(r.state.rally!.ids).not.toContain('weaver');
    const s = until(r.state, d, 'guardian');
    expect(s.rally).toBeNull();
  });
  it('stand keeps a protected ally at 1 HP once per battle', () => {
    const d = party([['guardian', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = until(createBattle(d), d, 'guardian');
    s = { ...s, heroes: s.heroes.map(h => h.id === 'weaver' ? { ...h, hp: 5 } : h) };
    const r = act(s, d, 'rally', 'guardian');
    expect(r.events.some(e => e.type === 'stand' && e.targetId === 'weaver')).toBe(true);
    expect(hp(r.state, 'weaver')).toBe(1); expect(r.state.standUsed).toBe(true);
  });
});

describe('duelist ★3 finisher / ★5 keen eye (Lyra)', () => {
  it('finisher doubles below the HP threshold', () => {
    const d = party([['guardian', 1], ['tracer', 3], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'tracer'); const power = skillPower(d, 'tracer', 'finisher');
    const full = act(s, d, 'finisher', 'f1').turns[0]!.events.find(e => e.type === 'damage')!;
    expect(full.amount).toBe(power);
    const low = { ...s, enemies: s.enemies.map(e => e.id === 'f1' ? { ...e, hp: 30 } : e) };
    expect(act(low, d, 'finisher', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(Math.min(30, power * 2));
  });
  it('keen eye makes marks last one round longer', () => {
    const d1 = party([['guardian', 1], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const d5 = party([['guardian', 1], ['tracer', 5], ['weaver', 1], ['healer', 1]]);
    const m1 = act(until(createBattle(d1), d1, 'tracer'), d1, 'mark', 'f1').state.enemies.find(e => e.id === 'f1')!.markedUntil;
    const m5 = act(until(createBattle(d5), d5, 'tracer'), d5, 'mark', 'f1').state.enemies.find(e => e.id === 'f1')!.markedUntil;
    expect(m5).toBe(m1 + 1);
  });
});

describe('mage ★3 sigil / ★5 echo (Eira)', () => {
  it('sigil cancels the target’s next energy move, never a physical one', () => {
    const d = party([['guardian', 1], ['tracer', 1], ['weaver', 3], ['healer', 1]]);
    const s = until(createBattle(d), d, 'weaver');
    expect(nextIntentOf(s, d, 'f1')?.kind).toBe('energy');
    const r = act(s, d, 'sigil', 'f1');
    expect(r.events.some(e => e.type === 'sigil')).toBe(true);
    const next = act(r.state, d, 'attack', 'b1');
    expect(next.turns.find(t => t.actorId === 'f1')!.events[0]).toMatchObject({ type: 'cancel', cause: 'sealed' });
    // In round 2 the raider's next move is physical: sigil only deals damage.
    let t = until(r.state, d, 'weaver'); t = { ...t, heroes: t.heroes.map(h => ({ ...h, cooldowns: {} })) };
    if (nextIntentOf(t, d, 'b1')?.kind === 'physical') expect(act(t, d, 'sigil', 'b1').events.some(e => e.type === 'sigil')).toBe(false);
  });
  it('echo strengthens a ward on the announced target', () => {
    const d = party([['guardian', 1], ['tracer', 1], ['weaver', 5], ['healer', 1]]);
    const s = until(createBattle(d), d, 'weaver'); const target = s.intent!.targetId; const other = s.heroes.find(h => h.id !== target && h.hp > 0)!.id;
    const power = skillPower(d, 'weaver', 'ward');
    expect(act(s, d, 'ward', target).state.heroes.find(h => h.id === target)!.barrier).toBe(Math.round(power * (1 + d.rules.echoBonus)));
    expect(act(s, d, 'ward', other).state.heroes.find(h => h.id === other)!.barrier).toBe(power);
  });
});

describe('priest ★3 sanctuary / ★5 afterglow (Seren)', () => {
  it('sanctuary keeps the ally at 1 HP until the priest’s next turn', () => {
    const d = party([['guardian', 1], ['tracer', 1], ['weaver', 1], ['healer', 3]]);
    let s = until(createBattle(d), d, 'healer');
    const target = nextIntentOf(s, d, 'b1')!.targetId;
    s = { ...s, heroes: s.heroes.map(h => h.id === target ? { ...h, hp: 3 } : h) };
    s = act(s, d, 'sanctuary', target).state;
    expect(s.sanctuary).toEqual({ heroId: 'healer', targetId: target });
    s = until(s, d, 'healer');
    expect(hp(s, target)).toBe(1); expect(s.sanctuary).toBeNull();
  });
  it('afterglow turns overflow healing into a capped barrier', () => {
    const d = party([['guardian', 1], ['tracer', 1], ['weaver', 1], ['healer', 5]]);
    let s = until(createBattle(d), d, 'healer');
    s = { ...s, heroes: s.heroes.map(h => h.id === 'guardian' ? { ...h, hp: h.hp - 2 } : h) };
    const after = act(s, d, 'heal', 'guardian').turns[0]!.state.heroes.find(h => h.id === 'guardian')!;
    expect(after.barrier).toBe(d.rules.afterglowCap);
  });
});

describe('spear ★3 spear wall / ★5 heavy counter (Garran)', () => {
  it('spear wall counters every physical hit on the front lane until Garran’s next turn', () => {
    const d = party([['garran', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = act(until(createBattle(d), d, 'garran'), d, 'spearwall', 'garran').state;
    expect(s.counter).toEqual({ heroId: 'garran', wall: true });
    const counters: number[] = []; let afterFirst: BattleState['counter'] | undefined;
    for (let i = 0; i < 12 && currentHeroId(s, d) !== 'garran'; i++) {
      const r = act(s, d, 'attack', 'f1');
      for (const t of r.turns) if (t.events.some(e => e.type === 'counter')) { counters.push(...t.events.filter(e => e.type === 'counter').map(e => e.amount!)); afterFirst ??= t.state.counter; }
      s = r.state;
    }
    expect(counters.length).toBeGreaterThanOrEqual(1);
    expect(counters.every(a => a === skillPower(d, 'garran', 'spearwall'))).toBe(true);
    // Unlike brace, the wall is not used up by its first counter; it lapses at Garran's turn.
    expect(afterFirst).toEqual({ heroId: 'garran', wall: true });
    expect(s.counter).toBeNull();
  });
  it('heavy counter strengthens brace by half', () => {
    const d = party([['garran', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = act(until(createBattle(d), d, 'garran'), d, 'brace', 'garran').state; let counter;
    for (let i = 0; i < 12 && !counter; i++) { const r = act(s, d, 'attack', 'f1'); counter = r.events.find(e => e.type === 'counter'); s = r.state; }
    expect(counter?.amount).toBe(Math.round(skillPower(d, 'garran', 'brace') * (1 + d.rules.heavyCounter)));
  });
});

describe('archer ★3 weak-point shot / ★5 tailwind (Mira)', () => {
  it('weak-point shot adds its bonus on a hindered enemy', () => {
    const d = party([['mira', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = until(createBattle(d), d, 'mira'); const power = skillPower(d, 'mira', 'weakshot');
    expect(act(s, d, 'weakshot', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(power);
    s = act(s, d, 'hinder', 'f1').state; s = until(s, d, 'mira');
    expect(act(s, d, 'weakshot', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(power + d.rules.weakshotBonus);
  });
  it('tailwind shortens the volley cooldown', () => {
    const d = party([['mira', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'mira');
    expect(act(s, d, 'volley', 'enemies').turns[0]!.state.heroes.find(h => h.id === 'mira')!.cooldowns.volley).toBe(s.round + d.skills.volley.cooldown - 1);
  });
});

describe('alchemist ★3 blast flask / ★5 potent (Toma)', () => {
  it('the blast hits every enemy and corrosion adds to it', () => {
    const d = party([['toma', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = until(createBattle(d), d, 'toma'); const power = skillPower(d, 'toma', 'bomb');
    s = act(s, d, 'acid', 'f1').state; s = until(s, d, 'toma');
    const hits = act(s, d, 'bomb', 'enemies').turns[0]!.events.filter(e => e.type === 'damage');
    expect(hits.find(e => e.targetId === 'b1')!.amount).toBe(power);
    expect(hits.find(e => e.targetId === 'f1')!.amount).toBe(power + corrodeBonusOf(d, 'toma'));
  });
  it('potent corrosion lasts one round longer', () => {
    const d = party([['toma', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'toma');
    expect(act(s, d, 'acid', 'f1').state.enemies.find(e => e.id === 'f1')!.corrodedUntil).toBe(s.round + d.rules.corrodeDuration + 1);
  });
});

describe('scout ★3 backstab / ★5 shadow counter (Sefa)', () => {
  it('backstab only targets an enemy that is not aiming at Sefa', () => {
    const d = party([['sefa', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'sefa');
    for (const option of targetOptions(s, d, 'sefa', 'backstab')) {
      const aiming = nextIntentOf(s, d, option.id)?.targetId === 'sefa';
      expect(option.valid).toBe(!aiming);
      if (aiming) expect(option.reason).toBe('This enemy is aiming at the scout.');
    }
  });
  it('a successful shadow step strikes back', () => {
    // Sefa in slot 1 (front) is the raider's first Raking Slash target, and she acts before it.
    const d = party([['guardian', 1], ['sefa', 5], ['weaver', 1], ['healer', 1]]);
    const s = until(createBattle(d), d, 'sefa');
    expect(nextIntentOf(s, d, 'b1')?.targetId).toBe('sefa');
    const raider = s.enemies.find(e => e.id === 'b1')!.hp;
    const r = act(s, d, 'evade', 'sefa');
    const turn = r.turns.find(t => t.actorId === 'b1')!;
    expect(turn.events.map(e => e.type)).toEqual(['dodge', 'counter']);
    expect(turn.events[1]).toMatchObject({ sourceId: 'sefa', targetId: 'b1', amount: d.rules.shadowCounter });
    expect(hp(r.state, 'b1')).toBe(raider - d.rules.shadowCounter);
  });
});

describe('warden ★3 earthshaker / ★5 stoneskin (Brann)', () => {
  it('earthshaker adds its bonus when the target is aiming at Brann', () => {
    const d = party([['brann', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = until(createBattle(d), d, 'brann'); const power = skillPower(d, 'brann', 'quake');
    const plain = act(s, d, 'quake', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount!;
    expect(plain).toBe(nextIntentOf(s, d, 'f1')?.targetId === 'brann' ? power + d.rules.quakeBonus : power);
    s = act(s, d, 'taunt', 'brann').state; s = until(s, d, 'brann');
    s = { ...s, taunt: { heroId: 'brann', round: s.round } };
    expect(act(s, d, 'quake', 'f1').turns[0]!.events.find(e => e.type === 'damage')!.amount).toBe(power + d.rules.quakeBonus);
  });
  it('stoneskin halves the hits drawn by challenge', () => {
    const d = party([['brann', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = act(until(createBattle(d), d, 'brann'), d, 'taunt', 'brann').state; const hits: { amount: number; damage: number }[] = [];
    for (let i = 0; i < 12 && currentHeroId(s, d) !== 'brann'; i++) {
      const r = act(s, d, 'attack', 'f1');
      for (const t of r.turns) for (const e of t.events) if (e.type === 'damage' && e.targetId === 'brann') hits.push({ amount: e.amount!, damage: t.intent!.damage });
      s = r.state;
    }
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.amount).toBe(Math.ceil(h.damage * (1 - d.rules.stoneskinReduction)));
  });
});

describe('bard ★3 finale / ★5 resound (Lio)', () => {
  it('finale needs a song, ends it and releases it: valor strikes all, mending heals all', () => {
    const d = party([['lio', 3], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    let s = until(createBattle(d), d, 'lio');
    expect(targetOptions(s, d, 'lio', 'finale')[0]!.reason).toBe('No song is playing.');
    s = act(s, d, 'valor', 'lio').state; s = until(s, d, 'lio');
    const valor = act(s, d, 'finale', 'lio');
    expect(valor.turns[0]!.state.song).toBeNull();
    expect(valor.turns[0]!.events.filter(e => e.type === 'damage').map(e => e.amount)).toEqual(s.enemies.filter(e => e.hp > 0).map(e => Math.min(e.hp, skillPower(d, 'lio', 'finale'))));
    let m = act(s, d, 'mend', 'lio').state; m = until(m, d, 'lio');
    m = { ...m, heroes: m.heroes.map(h => ({ ...h, hp: Math.max(1, h.hp - 20), cooldowns: {} })) };
    const healed = act(m, d, 'finale', 'lio').turns[0]!.events.filter(e => e.type === 'heal');
    expect(healed.length).toBe(m.heroes.filter(h => h.hp > 0).length);
  });
  it('resound strengthens both songs by half', () => {
    const d = party([['lio', 5], ['tracer', 1], ['weaver', 1], ['healer', 1]]);
    expect(songPower(d, 'lio', 'valor')).toBe(Math.round(skillPower(d, 'lio', 'valor') * (1 + d.rules.resound)));
    expect(songPower(d, 'lio', 'mend')).toBe(Math.round(skillPower(d, 'lio', 'mend') * (1 + d.rules.resound)));
  });
});

describe('★5 parties still finish encounters', () => {
  // Simple policy: use the ★3 skill when it has a valid target (first valid), otherwise attack the weakest enemy.
  function play(d: EncounterDefinition): BattleState {
    let s = createBattle(d);
    for (let i = 0; i < 200 && s.outcome === 'active'; i++) {
      const id = currentHeroId(s, d)!; const hero = d.heroes.find(h => h.id === id)!;
      const star = targetOptions(s, d, id, hero.unlocks!.skill).find(t => t.valid);
      const weakest = s.enemies.filter(e => e.hp > 0).sort((a, b) => a.hp - b.hp)[0]!;
      s = star ? act(s, d, hero.unlocks!.skill, star.id).state : act(s, d, 'attack', weakest.id).state;
    }
    return s;
  }
  it.each([
    [['guardian', 'tracer', 'weaver', 'healer']],
    [['garran', 'mira', 'toma', 'lio']],
    [['brann', 'sefa', 'weaver', 'healer']],
  ])('%j at ★5 wins veil-siege using their ★3 skills', ids => {
    const d = party(ids.map(id => [id, 5] as [string, number]));
    expect(play(d).outcome).toBe('victory');
  });
});
