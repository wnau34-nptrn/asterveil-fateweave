import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { veilSiege } from '../src/content/encounters/veil-siege';
import { rosterP03 } from '../src/content/heroes/roster-p03';
import { chapterOne as map } from '../src/content/world/chapter1';
import { beginBattle, enemyIntent, nextIntentOf, previewCommand, replay, resolveCommand, skillCooldown, targetOptions, upcomingTurns, validateCommand } from '../src/core/battle/engine';
import type { ActionId, BattleState, Command, EncounterDefinition, EnemyDefinition, IntentDefinition, TalentCap, TurnStage } from '../src/core/battle/types';
import { parseGame, saveGame } from '../src/core/save/expedition-save';
import { depart, newProfile } from '../src/core/world/profile';
import { heroCatalog } from '../src/core/world/world';
import { talentsValid } from '../src/core/world/talents';
import { battleLesson } from '../src/ui/tutorial';

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
    expect(skillCooldown(d, 'astrid', 'deflectfate')).toBe(3);
    const s = beginBattle(d).state;
    const same = cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' });
    expect(same.state.heroes[0]!.cooldowns.deflectfate).toBe(s.round + 2);
    const cross = cast(d, s, 'deflectfate', 'f1', { recipientId: 'b1' });
    expect(cross.state.heroes[0]!.cooldowns.deflectfate).toBe(s.round + 1);
  });
});

describe('P03 Seer cycle', () => {
  it('turn cycle moves the cursor one normal move and announces it at once; SPD and the queue never change', () => {
    const d = fixture(['turncycle']);
    const s = beginBattle(d).state;
    expect(nextIntentOf(s, d, 'f1')!.name).toBe('A');
    const r = cast(d, s, 'turncycle');
    const t = r.turns.find(x => x.actorId === 'f1')!;
    expect(t.intent!.name).toBe('B');
    expect(r.state.enemies[0]!.cycleShift).toBe(1);
    expect(upcomingTurns(r.state, d, 4).map(x => x.actorId)).toEqual(upcomingTurns(resolveCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'attack', targetId: 'f1' }).state, d, 4).map(x => x.actorId));
    expect(enemyIntent(r.state, d, 'f1', r.state.round)!.name).toBe('C');
    // Skill rework 2026-11-05: the turn also lands a small energy hit on the turned foe.
    expect(r.turns[0]!.events.filter(e => e.type === 'damage')).toMatchObject([{ sourceId: 'astrid', targetId: 'f1', amount: 8 }]);
  });
  it('cannot turn a locked move or onto one, nor a one-move cycle', () => {
    const locked = fixture(['turncycle'], {}, undefined, [move('f1', 'A', 20), move('f1', 'Storm', 30, { all: true }), move('f2', 'W', 1)]);
    expect(targetOptions(beginBattle(locked).state, locked, 'astrid', 'turncycle').find(o => o.id === 'f1')).toMatchObject({ valid: false, reason: 'This move cannot be turned.' });
    expect(targetOptions(beginBattle(locked).state, locked, 'astrid', 'turncycle').find(o => o.id === 'f2')).toMatchObject({ valid: false, reason: 'Too few moves in its cycle.' });
  });
  it('double dial needs three moves and skips two; b4 chooses one or two', () => {
    const d = fixture(['doubledial']);
    const r = cast(d, beginBattle(d).state, 'doubledial');
    expect(r.turns.find(x => x.actorId === 'f1')!.intent!.name).toBe('C');
    const s = beginBattle(d).state;
    expect(validateCommand(s, d, { beat: s.beat, heroId: 'astrid', action: 'doubledial', targetId: 'f1', steps: 1 })).toBe('Invalid number of steps.');
    const choose = fixture(['doubledial'], { seerDialChoose: 1 });
    expect(cast(choose, beginBattle(choose).state, 'doubledial', 'f1', { steps: 1 }).turns.find(x => x.actorId === 'f1')!.intent!.name).toBe('B');
    const short = fixture(['doubledial'], {}, undefined, [move('f1', 'A', 20), move('f1', 'B', 30), move('f2', 'W', 1)]);
    expect(targetOptions(beginBattle(short).state, short, 'astrid', 'doubledial')[0]).toMatchObject({ valid: false, reason: 'Too few moves in its cycle.' });
  });
  it('b2x shortens; b2y refunds a round when the turned move was physical', () => {
    const d = fixture(['turncycle'], { seerTurnQuick: 1, seerTurnRefund: 1 });
    expect(skillCooldown(d, 'astrid', 'turncycle')).toBe(2);
    const s = beginBattle(d).state;
    expect(cast(d, s, 'turncycle').state.heroes[0]!.cooldowns.turncycle).toBe(s.round + 1);
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
  it('replays bent and turned moves to the same state; saves keep the recipient and steps', () => {
    const d = fixture(['deflectfate', 'turncycle', 'doubledial'], { seerDialChoose: 1 });
    let s = beginBattle(d).state;
    s = cast(d, s, 'deflectfate', 'f1', { recipientId: 'f2' }).state;
    s = cast(d, s, 'attack').state;
    s = cast(d, s, 'doubledial', 'f1', { steps: 1 }).state;
    expect(replay(d, s.commands)).toEqual(s);
    expect(s.commands.map(c => [c.recipientId, c.steps])).toEqual([['f2', undefined], [undefined, undefined], [undefined, 1]]);
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
    const bad = JSON.parse(raw); bad.run.battle.commands = [{ beat: 1, heroId: 'astrid', action: 'doubledial', targetId: 'f1', steps: 3 }];
    expect(() => parseGame(JSON.stringify(bad), map, lookup)).toThrow();
  });
});
