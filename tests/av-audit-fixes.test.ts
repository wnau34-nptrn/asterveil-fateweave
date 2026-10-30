import { describe, expect, it } from 'vitest';
import { eliteBriarLord, encounters, riftWarden, vanguardCaptain } from '../src/content/encounters/catalog';
import { createBattle, currentHeroId, resolveCommand, targetOptions } from '../src/core/battle/engine';
import type { BattleState, EncounterDefinition, TurnStage } from '../src/core/battle/types';
import { basicCues, basicWeapon } from '../src/game/visuals/basic-attack-fx';
import { bossCues, bossMoves, chargeHolds } from '../src/game/visuals/boss-signature-fx';
import art from '../src/game/visuals/boss-signature-art.json';
import { hitLift } from '../src/game/visuals/combat-effects';
import { unitReactions } from '../src/game/visuals/unit-animation-map';
import { unitClip, unitRelease, unitSample } from '../src/game/visuals/unit-frames';
import { unitA4Fixture } from './fixtures/unit-a4';
import { unitA5Fixture } from './fixtures/unit-a5';

// Presentation fixes from the 2026-10-29 animation/VFX audit. Every cue is checked against real resolver output.
const step = (s: BattleState, d: EncounterDefinition) => {
  const hero = currentHeroId(s, d)!, options = targetOptions(s, d, hero, 'attack');
  const target = options.find(t => t.valid && t.id !== 'f1') ?? options.find(t => t.valid)!;
  return resolveCommand(s, d, { beat: s.beat, heroId: hero, action: 'attack', targetId: target.id });
};
const foe = (s: BattleState, id: string) => s.enemies.find(e => e.id === id)!;

describe('AV03 basic attacks follow the weapon', () => {
  it('Mira looses an arrow and Toma throws a flask on the real recipient; the resolver turn is unchanged', () => {
    for (const [hero, weapon] of [['mira', 'arrow'], ['toma', 'flask']] as const) {
      const f = unitA4Fixture(hero, 'attack'), turn = f.result.turns[0]!;
      expect(turn.action).toBe('attack');
      expect(basicWeapon(turn, f.data)).toBe(weapon);
      const hits = turn.events.filter(e => e.sourceId === hero && (e.type === 'damage' || e.type === 'dodge'));
      expect(basicCues(turn, f.data).map(c => c.event)).toEqual(hits);
      expect(hits.length).toBe(1);
    }
  });
  it('never changes other classes, skills or enemy turns', () => {
    const f = unitA4Fixture('mira', 'hinder');
    expect(basicCues(f.result.turns[0]!, f.data)).toEqual([]);
    const lyra = unitA5Fixture('garran', 'attack');
    expect(basicCues(lyra.result.turns[0]!, lyra.data)).toEqual([]);
    for (const t of f.result.turns.filter(t => t.side === 'enemy')) expect(basicCues(t, f.data)).toEqual([]);
  });
});

describe('AV04 projectiles leave on the body release frame', () => {
  it('every Mira projectile clip, Toma basic throw and Sefa knives release on their contact frame from a measured point', () => {
    for (const [art, actions] of [['mira', ['attack', 'hinder', 'weakshot', 'pin', 'track', 'volley', 'disengage']], ['toma', ['attack']], ['sefa', ['knives']]] as const) {
      for (const action of actions) {
        const clip = unitClip(art, action, undefined)!, release = unitRelease(art, clip)!;
        expect(release, `${art} ${action}`).toBeDefined();
        // The release frame is the clip's first recover (contact) frame, reached exactly when the flight starts.
        expect(unitSample('shoot', 'recover', 0, clip, art)!.from).toBe(release.frame);
        expect(unitSample('shoot', 'prepare', release.at - .001, clip, art)!.from).not.toBe(release.frame);
        expect(unitSample('shoot', 'prepare', release.at, clip, art)!.from).toBe(release.frame);
        expect(release.point[0]).toBeGreaterThan(.3); // in front of the body, toward the foe
      }
    }
    // Toma's skill gestures paint no flight, so they keep the shipped windup.
    expect(unitRelease('toma', unitClip('toma', 'haste', undefined))).toBeUndefined();
  });
});

describe('AV02 counters read as ripostes', () => {
  it('Garran answers a braced hit with his riposte frames in the same window, but gear reflections stay a hurt pose', () => {
    const f = unitA5Fixture('garran', 'brace', 'hurt'), turn = f.result.turns.find(t => t.events.some(e => e.type === 'counter' && e.sourceId === 'garran'))!;
    expect(turn).toBeDefined();
    expect(unitReactions(turn, f.data).get('garran')!.pose).toBe('counter');
    const thorns: TurnStage = { ...turn, events: turn.events.map(e => e.type === 'counter' ? { ...e, text: 'Thorns strike back.' } : e) };
    expect(unitReactions(thorns, f.data).get('garran')!.pose).not.toBe('counter');
    const down: TurnStage = { ...turn, events: [...turn.events, { type: 'down', targetId: 'garran', text: '' }], after: undefined };
    expect(unitReactions(down, f.data).get('garran')!.pose).toBe('down');
  });
  it('maps Lyra finisher/sweep to the cut, lunge to the thrust, and leaves mark/parry stance procedural', () => {
    expect(unitClip('tracer', 'finisher', undefined)).toBe('attack');
    expect(unitClip('tracer', 'sweep', undefined)).toBe('attack');
    expect(unitClip('tracer', 'lunge', undefined)).toBe('skill');
    expect(unitClip('tracer', 'mark', undefined)).toBeUndefined();
    expect(unitClip('tracer', 'parry', undefined)).toBeUndefined();
    expect(unitSample('counter', 'reaction', .5, undefined, 'tracer')!.from).toBe(13);
  });
});

describe('AV05 generic hit lift keeps detail', () => {
  it('is additive and well below white, softer in quiet mode', () => {
    for (const energy of [false, true]) {
      const full = hitLift(energy, false), quiet = hitLift(energy, true);
      for (const shift of [16, 8, 0]) {
        expect((full >> shift) & 255).toBeLessThan(0x70);
        expect((quiet >> shift) & 255).toBeLessThanOrEqual((full >> shift) & 255);
      }
    }
  });
});

describe('AV07 boss signature and charge holds', () => {
  it('every routed move is a real intent or phase name with a full three-beat art set', () => {
    const names = new Set(encounters.flatMap(e => [...e.intents.map(i => i.name), ...(e.phases ?? []).map(p => p.name)]));
    for (const move of Object.keys(bossMoves)) {
      expect(names.has(move), move).toBe(true);
      for (const beat of ['prepare', 'peak', 'settle']) expect(Object.keys(art)).toContain(`${move.toLowerCase().replace(/ /g, '-')}_${beat}`);
    }
  });
  it('the Warden holds a charge only between a performed Rift Gathering and its Cataclysm, then clears', () => {
    const d = riftWarden; let state = createBattle(d);
    const max = d.enemies.find(e => e.id === 'f1')!.maxHp;
    foe(state, 'f1').hp = Math.floor(max * .7);
    while (foe(state, 'f1').phase !== 1) state = step(state, d).state;
    foe(state, 'f1').hp = Math.floor(max * .35);
    const log: string[] = [];
    while (state.outcome === 'active' && !log.includes('Rift Wave')) {
      const r = step(state, d);
      for (const turn of r.turns) {
        const holds = chargeHolds(turn.after ?? turn.state, d, turn.actorId);
        if (turn.actorId === 'f1') {
          log.push(turn.intent!.special ?? turn.intent!.name);
          // Charge and phase turns paint no damage anywhere.
          if (turn.intent!.charge || turn.intent!.special) expect(turn.events.some(e => e.type === 'damage')).toBe(false);
          if (turn.intent!.name === 'Rift Gathering') {
            expect(bossCues(turn).map(c => c.at)).toEqual(['caster']);
            expect(holds).toEqual([{ enemyId: 'f1', charge: 'Rift Gathering', release: 'Rift Cataclysm', kind: 'unstoppable', frame: 'rift-cataclysm_prepare' }]);
          } else expect(holds).toEqual([]);
          if (turn.intent!.name === 'Rift Wave') {
            const struck = turn.events.filter(e => e.sourceId === 'f1' && (e.type === 'damage' || e.type === 'dodge')).map(e => e.targetId);
            expect(bossCues(turn).map(c => c.id)).toEqual(struck);
          }
        } else if (log.at(-1) === 'Rift Gathering') {
          // Held through every other actor's turn, and restored from a saved copy of the state (reload/repaint).
          expect(holds.map(h => h.enemyId)).toEqual(['f1']);
          expect(chargeHolds(JSON.parse(JSON.stringify(turn.after ?? turn.state)), d, turn.actorId)).toEqual(holds);
        }
      }
      state = r.state;
    }
    expect(log).toEqual(['phase', 'Rift Gathering', 'Rift Cataclysm', 'Rift Wave']);
  });
  it('an interrupted charge, a downed or absent boss shows no hold', () => {
    const d = eliteBriarLord; let s = createBattle(d);
    const max = d.enemies.find(e => e.id === 'f1')!.maxHp; foe(s, 'f1').hp = Math.floor(max * .5);
    let held: BattleState | undefined;
    for (let i = 0; i < 40 && !held && s.outcome === 'active'; i++) {
      const r = step(s, d);
      for (const t of r.turns) if (t.actorId === 'f1' && t.intent?.name === 'Gather Thorns') held = structuredClone(r.state);
      s = r.state;
    }
    expect(held).toBeDefined();
    expect(chargeHolds(held!, d)[0]).toMatchObject({ charge: 'Gather Thorns', release: 'Thorn Tempest', kind: 'unstoppable' });
    // A seal/interrupt recorded on the charge round voids the hold (the resolver cancelled that gathering).
    const interrupted = structuredClone(held!); foe(interrupted, 'f1').interruptedRound = held!.round;
    expect(chargeHolds(interrupted, d)).toEqual([]);
    const absent = structuredClone(held!); foe(absent, 'f1').absent = true; expect(chargeHolds(absent, d)).toEqual([]);
    const down = structuredClone(held!); foe(down, 'f1').hp = 0; expect(chargeHolds(down, d)).toEqual([]);
  });
  it('War Cry is the Captain\'s offensive shout on real recipients; Horn Charge and Stampede never hold a turn', () => {
    let s = createBattle(vanguardCaptain); let cry: TurnStage | undefined;
    for (let i = 0; i < 30 && !cry && s.outcome === 'active'; i++) { const r = step(s, vanguardCaptain); cry = r.turns.find(t => t.intent?.name === 'War Cry'); s = r.state; }
    expect(cry).toBeDefined();
    expect(cry!.events.some(e => e.type === 'buff')).toBe(false);
    expect(bossCues(cry!).map(c => c.id)).toEqual(cry!.events.filter(e => e.sourceId === cry!.actorId && (e.type === 'damage' || e.type === 'dodge')).map(e => e.targetId));
    for (const d of encounters.filter(e => e.intents.some(i => i.name === 'Horn Charge' || i.name === 'Stampede'))) {
      let st = createBattle(d);
      for (let i = 0; i < 12 && st.outcome === 'active'; i++) { st = step(st, d).state; expect(chargeHolds(st, d)).toEqual([]); }
    }
  });
});
