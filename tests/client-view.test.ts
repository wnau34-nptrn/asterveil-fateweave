import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as home } from '../src/content/world/chapter1';
import { MAPS as maps } from '../src/content/world/maps';
import { currentActorId, resolveCommand } from '../src/core/battle/engine';
import type { Command } from '../src/core/battle/types';
import { clientEvents, clientView, hireBoard, HIDDEN_PROFILE_KEYS, HIDDEN_RUN_KEYS, type ClientGame } from '../src/core/command/client-view';
import {
  canonicalJson, emptyBook, processCommand, RECENT_REPLIES, type CommandBook, type CommandRequest, type EnvelopeOutcome,
} from '../src/core/command/command-envelope';
import { applyCommand, isRejected, type CommandContext, type GameCommand } from '../src/core/command/game-command';
import { sequenceSeeds } from '../src/core/command/seed-source';
import type { Game } from '../src/core/save/expedition-save';
import { boardOffers, buy, COMMANDER_COLORS, COMMANDER_CRESTS, depart, hireReason, newProfile } from '../src/core/world/profile';
import type { Commander, Profile } from '../src/core/world/types';
import { battleData, battleState } from '../src/core/world/world';

// P09-02a2: the seed-free client view and the `{ requestId, seq, command }` envelope (docs/design/p09/CLIENT_VIEW_TH.md).
const ctx = (...seeds: number[]): CommandContext => ({ home, maps, lookup, seeds: sequenceSeeds(seeds) });
const commander: Commander = { name: 'ทดสอบ', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: 'ค่ายทดสอบ' };
const sha = (command: unknown) => createHash('sha256').update(canonicalJson(command)).digest('hex');
const rid = (n: number) => `request-${String(n).padStart(8, '0')}`;
const req = (n: number, command: unknown, seq = n): CommandRequest => ({ requestId: rid(n), seq, command });

function campProfile(): Profile {
  let p: Profile = { ...newProfile(home, 4), tutorialDone: true, commander, cleared: maps.map(m => m.id), campXp: 400000,
    bank: { ore: 9000, gold: 9000, shard: 60, dust: 9000 } };
  for (let i = 0; i < 3; i++) { const r = buy(p, home, 'gearbox'); if (r.event.type !== 'blocked') p = r.profile; }
  return p;
}
const campGame = (): Game => ({ profile: campProfile(), run: null });
const runGame = (): Game => { const out = depart(campProfile(), home, lookup, 7); return { profile: { ...out.profile, last: null }, run: out.run }; };
function turns(g: Game, limit = 400): Command[] {
  const data = battleData(g.run!, home, lookup)!; let s = battleState(g.run!, home, lookup)!;
  for (let n = 0; n < limit && s.outcome === 'active'; n++) {
    const heroId = currentActorId(s)!; let done = false;
    for (const e of s.enemies) {
      try { s = resolveCommand(s, data, { beat: s.beat, heroId, action: 'attack', targetId: e.id }, true).state; done = true; break; } catch { /* next target */ }
    }
    if (!done) throw new Error('no legal turn');
  }
  return s.commands;
}
// Every key anywhere in a JSON value.
function keysDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(v => keysDeep(v, out));
  else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) { out.add(k); keysDeep(v, out); }
  return out;
}
const HIDDEN = new Set<string>([...HIDDEN_PROFILE_KEYS, ...HIDDEN_RUN_KEYS]);
const leaks = (value: unknown) => [...keysDeep(JSON.parse(JSON.stringify(value)))].filter(k => HIDDEN.has(k));

describe('P09-02a2 client view', () => {
  it('carries no seed, roll or forge counter anywhere, in camp, on the map and in a battle', () => {
    const inBattle = (() => { const r = applyCommand({ ...campGame(), profile: { ...campProfile(), tutorialDone: false } }, { kind: 'depart', hard: false }, ctx(9)); if (isRejected(r)) throw new Error(r.rejected); return r.game; })();
    expect(inBattle.run!.battle).not.toBeNull();
    for (const g of [campGame(), runGame(), inBattle]) {
      expect(keysDeep(g).has('seed')).toBe(true); // the full game does have them
      const view = clientView(g, { home, lookup });
      expect(leaks(view)).toEqual([]);
      expect(JSON.parse(JSON.stringify(view))).toEqual(view);
    }
  });
  it('keeps everything else of the game unchanged and does not touch the input', () => {
    const g = runGame(); const before = structuredClone(g); const view = clientView(g, { home, lookup });
    expect(g).toEqual(before);
    expect(view.profile).toEqual({ ...g.profile, seed: undefined, forge: undefined });
    expect(view.run).toEqual({ ...g.run!, seed: undefined, rolls: undefined });
    expect(Object.keys(view.profile).length).toBe(Object.keys(g.profile).length - 2);
    expect(Object.keys(view.run!).length).toBe(Object.keys(g.run!).length - 2);
  });
  it('the hiring board equals boardOffers + hireReason, through refreshes, hires and a short purse', () => {
    let p = campProfile(); const views: ClientGame['hireBoard'][] = [];
    const check = (q: Profile) => {
      const board = hireBoard(q, { home, lookup }); views.push(board);
      expect(board.map(s => s.heroId)).toEqual(boardOffers(q, home, lookup));
      board.forEach((s, i) => expect(s.reason).toBe(hireReason(q, home, lookup, i)));
      expect(clientView({ profile: q, run: null }, { home, lookup }).hireBoard).toEqual(board);
    };
    check(p);
    for (const cmd of [{ kind: 'hire', index: 0 }, { kind: 'refreshBoard' }, { kind: 'hire', index: 1 }, { kind: 'refreshBoard' }] as GameCommand[]) {
      const r = applyCommand({ profile: p, run: null }, cmd, ctx()); if (isRejected(r)) throw new Error(r.rejected); p = r.game.profile; check(p);
    }
    check({ ...p, bank: { ...p.bank, gold: 0 } });
    expect(views.flat().some(s => s.reason === 'taken')).toBe(true);
    expect(views.at(-1)!.every(s => s.reason !== '')).toBe(true);
  });
  it('settled events carry a seed-free run', () => {
    const r = applyCommand(runGame(), { kind: 'withdraw' }, ctx()); if (isRejected(r)) throw new Error(r.rejected);
    expect(leaks(r.events)).not.toEqual([]);
    const events = clientEvents(r.events);
    expect(events.map(e => e.type)).toEqual(r.events.map(e => e.type)); expect(leaks(events)).toEqual([]);
  });
});

describe('P09-02a2 command envelope', () => {
  const apply = (game: Game | null, book: CommandBook, r: CommandRequest, c: CommandContext) => processCommand(game, book, r, sha(r.command), c);
  const committed = (o: EnvelopeOutcome) => { if (o.kind !== 'committed') throw new Error(o.kind); return o; };

  it('applies the next seq like applyCommand, answering with the client view', () => {
    const g = campGame(); const cmd: GameCommand = { kind: 'hire', index: 0 };
    const o = committed(apply(g, emptyBook(), req(1, cmd), ctx()));
    const direct = applyCommand(g, cmd, ctx()); if (isRejected(direct)) throw new Error(direct.rejected);
    expect(o.game).toEqual(direct.game); expect(o.book.lastSeq).toBe(1);
    expect(o.reply).toEqual({ seq: 1, status: 'applied', view: clientView(direct.game, { home, lookup }), events: clientEvents(direct.events) });
    expect(leaks(o.reply)).toEqual([]);
  });
  it('answers a retry from the stored reply without running the rules again', () => {
    const r = req(1, { kind: 'depart', hard: false });
    const first = committed(apply(campGame(), emptyBook(), r, ctx(11)));
    // An exhausted seed source would throw if the rules ran again.
    const again = apply(first.game, first.book, r, ctx());
    expect(again).toEqual({ kind: 'replayed', reply: first.reply });
  });
  it('rejects a reused requestId, a stale seq, a gap and a malformed envelope without changing anything', () => {
    const first = committed(apply(campGame(), emptyBook(), req(1, { kind: 'hire', index: 0 }), ctx()));
    const g = first.game, b = first.book;
    expect(apply(g, b, req(1, { kind: 'hire', index: 1 }), ctx())).toEqual({ kind: 'requestReused' });
    expect(apply(g, b, { ...req(1, { kind: 'hire', index: 0 }), seq: 2 }, ctx())).toEqual({ kind: 'requestReused' });
    expect(apply(g, b, req(2, { kind: 'hire', index: 1 }, 1), ctx())).toEqual({ kind: 'stale', lastSeq: 1 });
    expect(apply(g, b, req(3, { kind: 'hire', index: 1 }, 3), ctx())).toEqual({ kind: 'gap', lastSeq: 1 });
    expect(apply(g, b, { requestId: 'short', seq: 2, command: { kind: 'refreshBoard' } }, ctx())).toEqual({ kind: 'invalid' });
    expect(apply(g, b, { requestId: rid(4), seq: 2, command: 'refreshBoard' }, ctx())).toEqual({ kind: 'invalid' });
    expect(processCommand(g, b, req(5, { kind: 'refreshBoard' }, 2), 'not-a-digest', ctx())).toEqual({ kind: 'invalid' });
  });
  it('a command refused by its shape or the rules uses up its seq, keeps the state and is replayed as refused', () => {
    const g = campGame();
    const shape = committed(apply(g, emptyBook(), req(1, { kind: 'hire', index: 'x' }), ctx()));
    expect(shape.reply).toEqual({ seq: 1, status: 'rejected', reason: 'shape' }); expect(shape.game).toBe(g);
    const rules = committed(apply(shape.game, shape.book, req(2, { kind: 'move', dir: 'up' }), ctx()));
    expect(rules.reply).toEqual({ seq: 2, status: 'rejected', reason: 'noRun' }); expect(rules.book.lastSeq).toBe(2);
    expect(apply(rules.game, rules.book, req(2, { kind: 'move', dir: 'up' }), ctx())).toEqual({ kind: 'replayed', reply: rules.reply });
  });
  it(`keeps the last ${RECENT_REPLIES} replies`, () => {
    let g: Game | null = campGame(), b = emptyBook();
    for (let n = 1; n <= RECENT_REPLIES + 5; n++) { const o = committed(apply(g, b, req(n, { kind: 'huntTarget' }), ctx())); g = o.game; b = o.book; }
    expect(b.recent).toHaveLength(RECENT_REPLIES); expect(b.recent[0]!.seq).toBe(6); expect(b.lastSeq).toBe(RECENT_REPLIES + 5);
  });
  it('hashes commands by content, not key order', () => {
    expect(canonicalJson({ kind: 'buy', item: 'gearbox', heroId: undefined })).toBe(canonicalJson({ item: 'gearbox', kind: 'buy' }));
    expect(canonicalJson({ b: [1, { d: 2, c: 'x' }], a: true })).toBe('{"a":true,"b":[1,{"c":"x","d":2}]}');
  });
  it('replays a session of envelopes deterministically, matching the commands run directly', () => {
    const session = (): { game: Game | null; replies: unknown[]; book: CommandBook } => {
      let game: Game | null = null, book = emptyBook(); const replies: unknown[] = []; const c = ctx(31, 32, 33); let n = 0;
      const send = (command: GameCommand | ((g: Game) => GameCommand)) => {
        const cmd = typeof command === 'function' ? command(game!) : command;
        const o = committed(apply(game, book, req(++n, cmd), c)); game = o.game; book = o.book; replies.push(o.reply);
        // A lost response: the same request again changes nothing.
        expect(apply(game, book, req(n, cmd), c)).toEqual({ kind: 'replayed', reply: o.reply });
      };
      send({ kind: 'createCommander', commander, replace: false }); send({ kind: 'depart', hard: false });
      send(g => ({ kind: 'battle', commands: turns(g) }));
      for (const dir of ['up', 'up', 'left', 'right', 'down'] as const) send({ kind: 'move', dir });
      send({ kind: 'withdraw' }); send({ kind: 'hire', index: 0 }); send({ kind: 'depart', hard: false });
      return { game, replies, book };
    };
    const a = session(), b = session();
    expect(b).toEqual(a);
    // Same commands straight through applyCommand give the same game.
    let direct: Game | null = null; const c = ctx(31, 32, 33);
    const cmds: GameCommand[] = [{ kind: 'createCommander', commander, replace: false }, { kind: 'depart', hard: false }];
    for (const cmd of cmds) { const r = applyCommand(direct, cmd, c); if (!isRejected(r)) direct = r.game; }
    const battle = applyCommand(direct, { kind: 'battle', commands: turns(direct!) }, c); if (!isRejected(battle)) direct = battle.game;
    for (const cmd of [...(['up', 'up', 'left', 'right', 'down'] as const).map(dir => ({ kind: 'move', dir }) as GameCommand),
      { kind: 'withdraw' }, { kind: 'hire', index: 0 }, { kind: 'depart', hard: false }] as GameCommand[]) {
      const r = applyCommand(direct, cmd, c); if (!isRejected(r)) direct = r.game;
    }
    expect(a.game).toEqual(direct);
    expect(a.replies.every(r => leaks(r).length === 0)).toBe(true);
  });
});
