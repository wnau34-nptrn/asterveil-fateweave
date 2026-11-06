import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { rosterP03 } from '../src/content/heroes/roster-p03';
import { chapterOne as map } from '../src/content/world/chapter1';
import { beginBattle, bigMove, enemyIntent, postponeReason, nextIntentOf, previewCommand, replay, resolveCommand, skillCooldown, targetOptions, upcomingTurns, validateCommand } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, EnemyDefinition, IntentDefinition, TalentCap, TurnStage } from '../src/core/battle/types';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, newProfile } from '../src/core/world/profile';
import { heroCatalog } from '../src/core/world/world';
import { talentsValid } from '../src/core/world/talents';
import { battleLesson } from '../src/ui/tutorial';
import { sealCues } from '../src/game/visuals/arcane-seal-fx';

type Caps = Partial<Record<TalentCap, number>>;
const astrid = rosterP03.find(h => h.id === 'astrid')!;
const foe = (id: 'f1' | 'f2' | 'b1', hp = 1000, speed = 10): EnemyDefinition => ({ id, row: id.startsWith('f') ? 'front' : 'back', name: `Dummy ${id}`, maxHp: hp, speed, color: 0 });
const move = (id: string, name: string, damage: number, extra: Partial<IntentDefinition> = {}): IntentDefinition => ({ sourceId: id, targetSlot: 0, name, damage, kind: 'physical', ...extra });
// Astrid (SPD 90) acts before the practice foes each round.
function fixture(actions: ActionId[], caps: Caps = {}, enemies = [foe('f1'), foe('f2', 1000, 5)], intents?: IntentDefinition[]): EncounterDefinition {
  return { ...veilSiege, heroes: [{ ...astrid, maxHp: 500, actions: ['attack', ...actions], talents: { caps } }], enemies,
    intents: intents ?? [move('f1', 'A', 20), move('f1', 'B', 30), move('f1', 'C', 40), move('f2', 'W', 1)] };
}
function cast(d: EncounterDefinition, s: BattleState, action: ActionId, targetId = 'f1', extra: Partial<Command> = {}): { state: BattleState; turns: TurnStage[] } {
  const command: Command = { beat: s.beat, heroId: 'astrid', action, targetId, ...extra };
  const result = resolveCommand(s, d, command);
  expect(previewCommand(s, d, command)).toEqual(result);
  return { state: result.state, turns: result.turns };
}
const hp = (s: BattleState, id: string) => [...s.heroes, ...s.enemies].find(a => a.id === id)!.hp;

describe('P03 Seer deflect', () => {
  it('bends the attacker\'s next single-target move onto the chosen foe, same power, nothing to the party', () => {
    const d = fixture(['deflectfate']);
    const s = beginBattle(d).state;
    expect(validateCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'deflectfate', targetId: 'f1' })).toBe('Choose the enemy to bend it onto.');
    expect(validateCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'deflectfate', targetId: 'f1', recipientId: 'f1' })).toBe('Choose another standing enemy.');
    const r = cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' });
    const t = r.turns.find(x => x.actorId === 'f1')!;
    expect(t.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'f1', targetId: 'f2', amount: 20, text: 'Deflected.' }]);
    expect(hp(r.state, 'astrid')).toBe(500 - 1);
    expect(r.state.enemies[0]!.deflect).toBeUndefined();
    // Seer rework (save v51): the bend also lands a 6 energy hit on the bent foe.
    expect(r.turns[0]!.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'astrid', targetId: 'f1', amount: 6 }]);
    // A non-deflect action may not carry a recipient.
    expect(validateCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'attack', targetId: 'f1', recipientId: 'f2' })).toBe('This action does not bend a move.');
  });
  it('locked moves (whole-party, charge, unstoppable) and a lone foe cannot be bent; reasons reach the UI', () => {
    for (const extra of [{ all: true }, { charge: true }, { unstoppable: true }]) {
      const d = fixture(['deflectfate'], {}, undefined, [move('f1', 'X', 20, extra), move('f2', 'W', 1)]);
      expect(targetOptions(beginBattle(d).state, d, 'astrid', 'deflectfate').find(o => o.id === 'f1')).toMatchObject({ valid: false, reason: 'This move cannot be bent.' });
    }
    const lone = fixture(['deflectfate'], {}, [foe('f1')], [move('f1', 'A', 20)]);
    expect(targetOptions(beginBattle(lone).state, lone, 'astrid', 'deflectfate')[0]).toMatchObject({ valid: false, reason: 'No other enemy to bend it onto.' });
  });
  it('a foe that already acted this round cannot be bent (a2y lets it wait one more round)', () => {
    const d = fixture(['deflectfate'], {}, [foe('f1', 1000, 200), foe('f2', 1000, 5)]);
    const s = beginBattle(d).state;
    expect(s.round).toBe(1);
    expect(targetOptions(s, d, 'astrid', 'deflectfate').find(o => o.id === 'f1')).toMatchObject({ valid: false, reason: 'This enemy has already acted this round.' });
    const held = fixture(['deflectfate'], { seerDeflectHold: 1 }, [foe('f1', 1000, 200), foe('f2', 1000, 5)]);
    const r = cast(held, beginBattle(held).state, 'deflectfate', 'f1', { recipientId: 'f2' });
    expect(r.turns.flatMap(t => t.events).find(e => e.text === 'Deflected.')).toMatchObject({ targetId: 'f2', amount: 30 });
  });
  it('if the recipient falls first the move takes its original target; a recipient downed by the bent move can win', () => {
    const d = fixture(['deflectfate'], {}, [foe('f1'), foe('f2', 15, 5)]);
    const r = cast(d, beginBattle(d).state, 'deflectfate', 'f1', { recipientId: 'f2' });
    expect(r.turns.flatMap(t => t.events).filter(e => e.type === 'down').map(e => e.targetId)).toEqual(['f2']);
    // A bent move whose recipient has fallen takes its original target and is spent.
    const back = fixture(['deflectfate'], {}, [foe('f1'), foe('f2', 1000, 5)]);
    const st = beginBattle(back).state; st.enemies[1]!.hp = 0; st.enemies[0]!.deflect = { heroId: 'astrid', recipientId: 'f2', until: 1 };
    const after = cast(back, st, 'attack');
    expect(after.turns.find(t => t.actorId === 'f1')!.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'f1', targetId: 'astrid', amount: 20 }]);
    expect(after.state.enemies[0]!.deflect).toBeUndefined();
  });
  it('astrid1 shortens the first deflection; astrid4 a cross-row one; a2x always', () => {
    const d = fixture(['deflectfate'], { astrid1: 1, astrid4: 1, seerDeflectQuick: 1 }, [foe('f1'), foe('f2', 1000, 5), foe('b1', 1000, 4)], [move('f1', 'A', 20), move('f2', 'W', 1), move('b1', 'W', 1)]);
    // Seer rework (save v51): base cooldown 4 → 3.
    expect(skillCooldown(d, 'astrid', 'deflectfate')).toBe(2);
    const s = beginBattle(d).state;
    const same = cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' });
    expect(same.turns[0]!.state.heroes[0]!.cooldowns.deflectfate).toBe(s.round + 1);
    const cross = cast(d, s, 'deflectfate', 'f1', { recipientId: 'b1' });
    expect(cross.turns[0]!.state.heroes[0]!.cooldowns.deflectfate).toBeUndefined();
  });
});

describe('Seer rework (save v51): Delay Fate', () => {
  // Cycle C40 → A20 → B30: C is the big move (top damage of a cycle with different damages).
  const bigFirst = [move('f1', 'C', 40), move('f1', 'A', 20), move('f1', 'B', 30), move('f2', 'W', 1)];
  it('a big move goes one round later: the next move stands in now, the card changes at once, the foe keeps its turn', () => {
    const d = fixture(['turncycle'], {}, undefined, bigFirst);
    const s = beginBattle(d).state;
    expect(bigMove(s, d, 'f1', nextIntentOf(s, d, 'f1'))).toBe(true);
    const preview = previewCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'turncycle', targetId: 'f1' });
    const r = cast(d, s, 'turncycle');
    expect(preview.turns[0]!.events.map(e => e.type)).toEqual(['dial', 'damage']);
    expect(r.turns[0]!.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'astrid', targetId: 'f1', amount: 8 }]);
    // The announced card changes before the foe acts, and still names what was pushed.
    expect(enemyIntent(r.turns[0]!.state, d, 'f1', 1)).toMatchObject({ name: 'A', delayedMove: 'C' });
    const t = r.turns.find(x => x.actorId === 'f1')!;
    expect(t.intent).toMatchObject({ name: 'A' });
    expect(t.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'f1', amount: 20 }]);
    // The big move comes next round, then the cycle carries on one round late.
    expect([2, 3, 4, 5].map(round => enemyIntent(r.state, d, 'f1', round)!.name)).toEqual(['C', 'A', 'B', 'C']);
    expect(enemyIntent(r.state, d, 'f1', 2)!.delayedOnce).toBe(true);
    // SPD and the queue never change.
    const plain = resolveCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'attack', targetId: 'f1' }).state;
    expect(upcomingTurns(r.state, d, 6).map(x => x.actorId)).toEqual(upcomingTurns(plain, d, 6).map(x => x.actorId));
  });
  it('any other move: still usable, the hit alone; the reason says why nothing moved', () => {
    const d = fixture(['turncycle']);
    const s = beginBattle(d).state;
    expect(postponeReason(s, d, 'f1')).toBe('Not a big move.');
    expect(targetOptions(s, d, 'astrid', 'turncycle').find(o => o.id === 'f1')).toMatchObject({ valid: true });
    const r = cast(d, s, 'turncycle');
    expect(r.turns[0]!.events.map(e => e.type)).toEqual(['damage']);
    expect(r.state.enemies[0]!.postpone).toBeUndefined();
    expect(r.turns.find(x => x.actorId === 'f1')!.intent!.name).toBe('A');
  });
  it('once per move: a delayed move cannot be delayed again before it comes out', () => {
    const d = fixture(['turncycle'], {}, undefined, bigFirst);
    const r = cast(d, beginBattle(d).state, 'turncycle');
    expect(r.state.round).toBe(2);
    expect(postponeReason(r.state, d, 'f1')).toBe('This move was already delayed.');
    // Even with the cooldown gone the second Delay Fate only hits.
    const st = structuredClone(r.state); st.heroes[0]!.cooldowns = {};
    const again = cast(d, st, 'turncycle');
    expect(again.turns[0]!.events.map(e => e.type)).toEqual(['damage']);
    expect(again.turns.find(x => x.actorId === 'f1')!.intent!.name).toBe('C');
  });
  it('a move already interrupted or bent that round cannot be delayed', () => {
    const d = fixture(['turncycle'], {}, undefined, bigFirst);
    const cut = beginBattle(d).state; cut.enemies[0]!.interruptedRound = 1;
    expect(postponeReason(cut, d, 'f1')).toBe('This move is already interrupted.');
    const bent = beginBattle(d).state; bent.enemies[0]!.deflect = { heroId: 'astrid', recipientId: 'f2', until: 1 };
    expect(postponeReason(bent, d, 'f1')).toBe('This move is already bent.');
    expect(cast(d, bent, 'turncycle').turns[0]!.events.map(e => e.type)).toEqual(['damage']);
  });
  it('a charge is delayed together with the strike that follows it; a charge with nothing else in its cycle cannot be', () => {
    const d = fixture(['turncycle'], {}, undefined, [move('f1', 'Gather', 0, { charge: true, kind: 'energy' }), move('f1', 'Tempest', 50, { all: true, kind: 'energy' }), move('f1', 'Lash', 20), move('f2', 'W', 1)]);
    const r = cast(d, beginBattle(d).state, 'turncycle');
    expect(r.turns.find(x => x.actorId === 'f1')!.intent!.name).toBe('Lash');
    expect([2, 3, 4].map(round => enemyIntent(r.state, d, 'f1', round)!.name)).toEqual(['Gather', 'Tempest', 'Lash']);
    expect(r.state.enemies[0]!.postpone).toMatchObject({ round: 1, until: 3 });
    expect(postponeReason(r.state, d, 'f1')).toBe('This move was already delayed.');
    const pair = fixture(['turncycle'], {}, undefined, [move('f1', 'Gather', 0, { charge: true }), move('f1', 'Tempest', 50, { all: true }), move('f2', 'W', 1)]);
    expect(postponeReason(beginBattle(pair).state, pair, 'f1')).toBe('Too few moves in its cycle.');
  });
  it('big move = charge/all/unstoppable or the top damage of a cycle with two different damages; never a phase turn', () => {
    const d = fixture(['turncycle'], {}, undefined, [move('f1', 'A', 20), move('f1', 'B', 20), move('f2', 'W', 1)]);
    const s = beginBattle(d).state;
    expect(bigMove(s, d, 'f1', nextIntentOf(s, d, 'f1'))).toBe(false);
    expect(bigMove(s, d, 'f2', nextIntentOf(s, d, 'f2'))).toBe(false);
    for (const extra of [{ all: true }, { charge: true }, { unstoppable: true }]) expect(bigMove(s, d, 'f1', move('f1', 'X', 1, extra))).toBe(true);
    expect(bigMove(s, d, 'f1', { ...move('f1', 'Phase', 0), special: 'phase' })).toBe(false);
  });
  it('b2x shortens; b2y refunds a round only when a move was really delayed', () => {
    const d = fixture(['turncycle'], { seerTurnQuick: 1, seerTurnRefund: 1 }, undefined, bigFirst);
    expect(skillCooldown(d, 'astrid', 'turncycle')).toBe(2);
    const s = beginBattle(d).state;
    const plain = fixture(['turncycle'], { seerTurnQuick: 1, seerTurnRefund: 1 });
    expect(cast(d, s, 'turncycle').state.heroes[0]!.cooldowns.turncycle! + 1).toBe(cast(plain, beginBattle(plain).state, 'turncycle').state.heroes[0]!.cooldowns.turncycle);
  });
});

describe('Seer rework (save v51): Falling Star', () => {
  it('is set this turn and strikes every standing foe as the round ends; b4 adds to a foe whose next move is big', () => {
    const d = fixture(['doubledial'], { seerMeteorBig: 6 }, undefined, [move('f1', 'A', 20), move('f1', 'C', 40), move('f2', 'W', 1)]);
    const s = beginBattle(d).state;
    const r = cast(d, s, 'doubledial');
    expect(r.turns[0]!.events.map(e => e.type)).toEqual(['meteor']);
    const stars = r.turns.flatMap(t => t.events).filter(e => e.text === 'Falling star.');
    // Round 2 brings f1's top move C (big): +6 on it; f2's one-move cycle is not big.
    expect(stars).toMatchObject([{ sourceId: 'astrid', targetId: 'f1', amount: 24 }, { sourceId: 'astrid', targetId: 'f2', amount: 18 }]);
    expect(r.state.meteors).toBeUndefined();
    expect(replay(d, r.state.commands)).toEqual(r.state);
  });
  it('is lost if Astrid falls before the round ends', () => {
    const d = fixture(['doubledial']);
    const s = beginBattle(d).state; s.heroes[0]!.hp = 10;
    const r = cast(d, s, 'doubledial');
    expect(r.state.outcome).toBe('defeat');
    expect(r.turns.flatMap(t => t.events).some(e => e.text === 'Falling star.')).toBe(false);
  });
});

describe('Seer rework (save v51): presentation follows the real events', () => {
  const cuesOf = (turns: TurnStage[]) => turns.flatMap(t => sealCues(t).map(c => [t.actorId, c.skill, c.targetId]));
  it('Deflect Fate marks the bent foe and bursts on its hit; Delay Fate marks only a really delayed move', () => {
    const d = fixture(['deflectfate', 'turncycle'], {}, undefined, [move('f1', 'C', 40), move('f1', 'A', 20), move('f1', 'B', 30), move('f2', 'W', 1)]);
    const s = beginBattle(d).state;
    expect(cuesOf(cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' }).turns)).toEqual([['astrid', 'mark', 'f1'], ['astrid', 'dispel', 'f1']]);
    expect(cuesOf(cast(d, s, 'turncycle').turns)).toEqual([['astrid', 'mark', 'f1'], ['astrid', 'dispel', 'f1']]);
    expect(cuesOf(cast(d, s, 'turncycle', 'f2').turns)).toEqual([['astrid', 'dispel', 'f2']]);
  });
  it('Falling Star marks Astrid as she sets it and paints a storm on each foe struck, on the stage where the round ended', () => {
    const d = fixture(['doubledial']);
    const r = cast(d, beginBattle(d).state, 'doubledial');
    expect(cuesOf(r.turns)).toEqual([['astrid', 'mark', 'astrid'], ['f2', 'storm', 'f1'], ['f2', 'storm', 'f2']]);
  });
});

describe('P03 Seer strikes and branch', () => {
  it('star needle, crossing and read orbit are energy strikes with their conditions', () => {
    const d = fixture(['starneedle', 'crossing', 'readorbit'], { seerNeedleLone: 4, seerNeedleBlocked: 3, seerCrossingHit: 4, seerOrbitLocked: 6, astrid3: 3 });
    const s = beginBattle(d).state;
    const dmg = (r: { turns: TurnStage[] }) => r.turns[0]!.events.find(e => e.type === 'damage' && e.sourceId === 'astrid')!.amount;
    expect(dmg(cast(d, s, 'starneedle'))).toBe(22);
    const cross = cast(d, s, 'crossing');
    expect(dmg(cross)).toBe(16);
    expect(cross.turns.flatMap(t => t.events).find(e => e.text === 'Deflected.')).toMatchObject({ sourceId: 'f1', targetId: 'f2' });
    expect(dmg(cast(d, s, 'readorbit'))).toBe(18);
    const lone = fixture(['starneedle', 'readorbit'], { seerNeedleLone: 4, seerNeedleBlocked: 3, seerOrbitLocked: 6, astrid3: 3 }, [foe('f1')], [move('f1', 'Storm', 20, { all: true })]);
    const l = beginBattle(lone).state;
    expect(dmg(cast(lone, l, 'starneedle'))).toBe(29);
    expect(dmg(cast(lone, l, 'readorbit'))).toBe(27);
  });
  it('replays bent, delayed and falling-star turns to the same state; saves keep the recipient', () => {
    const d = fixture(['deflectfate', 'turncycle', 'doubledial'], {}, undefined, [move('f1', 'C', 40), move('f1', 'A', 20), move('f1', 'B', 30), move('f2', 'W', 1)]);
    let s = beginBattle(d).state;
    s = cast(d, s, 'turncycle').state;
    s = cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' }).state;
    s = cast(d, s, 'doubledial').state;
    expect(replay(d, s.commands)).toEqual(s);
    expect(s.commands.map(c => c.recipientId)).toEqual([undefined, 'f2', undefined]);
  });
  it('the advisor bends a heavy move onto a foe', () => {
    const d = fixture(['deflectfate', 'turncycle']);
    const l = battleLesson(beginBattle(d).state, d)!;
    expect(l).toMatchObject({ action: 'deflectfate', targetId: 'f1', recipientId: 'f2' });
  });
});

describe('P03 Astrid in the world', () => {
  it('joins last in the catalog with a twenty-node tree; save round-trips a deflect command mid-battle', () => {
    const catalog = heroCatalog(lookup, map).map(h => h.id);
    expect(catalog.slice(-3)).toEqual(['kael', 'wynne', 'astrid']);
    expect(map.company.featured).toContain('astrid');
    expect(map.talents.astrid).toHaveLength(20);
    expect(talentsValid(map, 'astrid', 5, { p1: 1, p2: 1 })).toBe(true);
    const p = newProfile(map, 5); p.company.push('astrid'); p.members.astrid = { stars: 1, dupes: 0 };
    p.party = { deployed: ['astrid', 'guardian'], reserve: [] };
    const game = depart(p, map, lookup, 41);
    game.run.battle = { kind: 'random', encounterId: 'veil-siege', entry: Object.fromEntries(game.run.roster.deployed.map(id => [id, game.run.hp[id]!])), commands: [{ beat: 1, heroId: 'astrid', action: 'attack', targetId: 'f1', recipientId: 'f2' }] };
    let raw = ''; saveGame({ getItem: () => null, setItem: (_k, v) => { raw = v; } }, game);
    expect(() => parseGame(raw, map, lookup)).toThrow();
    const bad = JSON.parse(raw); bad.run.battle.commands = [{ beat: 1, heroId: 'astrid', action: 'doubledial', targetId: 'f1', recipientId: 'f2' }];
    expect(() => parseGame(JSON.stringify(bad), map, lookup)).toThrow();
  });
});
