import { describe, expect, it } from 'vitest';
import { encounterById as lookup } from '../src/content/encounters/catalog';
import { chapterOne as map } from '../src/content/world/chapter1';
import { parseGame } from '../src/core/save/expedition-save';
import { newProfile } from '../src/core/world/profile';
import { doorOpen } from '../src/core/world/puzzles';
import type { Direction, ExpeditionState, Point } from '../src/core/world/types';
import { canOpenChest, chestAt, move, newExpedition } from '../src/core/world/world';

// Phase 3C (docs/EXPEDITION_DESIGN.md "Puzzles and secrets").
const P = map.puzzles;
const run = (patch: Partial<ExpeditionState> = {}): ExpeditionState => ({ ...newExpedition(map, lookup, 4, undefined, true), ...patch });
const dirs: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
// Step onto `p` from a neighbouring walkable tile (repel keeps encounter rolls out of the way).
function stepOnto(s: ExpeditionState, p: Point) {
  for (const [d, o] of Object.entries(dirs) as [Direction, Point][]) {
    const from = { x: p.x - o.x, y: p.y - o.y }; const r = move({ ...s, position: from, repel: 9 }, map, d);
    if (r.event.type !== 'blocked' && r.state.position.x === p.x && r.state.position.y === p.y) return r;
  }
  throw new Error(`no way onto ${p.x},${p.y}`);
}

describe('rune stones', () => {
  const runes = P.runes[0]!; const [a, b, c] = runes.stones;
  it('stepping on the stones in order opens the door to the vault chest', () => {
    let s = run();
    expect(move({ ...s, position: { x: runes.door.x - 1, y: runes.door.y } }, map, 'right').event).toEqual({ type: 'blocked', reason: 'wall' });
    let r = stepOnto(s, a!); expect(r.event).toEqual({ type: 'rune', puzzleId: runes.id, step: 1, solved: false, reset: false }); s = r.state;
    r = stepOnto(s, b!); expect(r.event).toMatchObject({ step: 2, solved: false }); s = r.state;
    r = stepOnto(s, c!); expect(r.event).toMatchObject({ step: 3, solved: true }); s = r.state;
    expect(s.solved).toContain(runes.id); expect(doorOpen(s, map, runes.door)).toBe(true);
    // Through the door to the vault chest.
    s = move({ ...s, position: { x: runes.door.x - 1, y: runes.door.y }, repel: 9 }, map, 'right').state; expect(s.position).toEqual(runes.door);
    s = move(s, map, 'right').state; s = move(s, map, 'right').state;
    expect(chestAt(map, s.position)?.id).toBe('meadow-vault'); expect(canOpenChest(s, map)).toBe(true);
  });
  it('a wrong stone resets the sequence (the first stone restarts it at 1)', () => {
    let s = stepOnto(run(), a!).state;
    let r = stepOnto(s, c!); expect(r.event).toMatchObject({ step: 0, reset: true }); s = r.state;
    r = stepOnto(s, a!); expect(r.event).toMatchObject({ step: 1 }); s = r.state;
    r = stepOnto(s, a!); expect(r.event).toMatchObject({ step: 1, reset: true });
    // Stones roll no encounters: the roll counter is unchanged.
    expect(stepOnto(run({ pressure: 90 }), a!).state.rolls).toBe(run().rolls);
  });
});

describe('levers', () => {
  const lv = P.levers[0]!;
  it('pulling every lever opens the storeroom door; a lever counts once', () => {
    let s = run();
    let r = stepOnto(s, lv.levers[0]!); expect(r.event).toEqual({ type: 'lever', puzzleId: lv.id, pulled: 1, solved: false }); s = r.state;
    r = stepOnto(s, lv.levers[0]!); expect(r.event.type).not.toBe('lever'); s = r.state;
    r = stepOnto(s, lv.levers[1]!); expect(r.event).toEqual({ type: 'lever', puzzleId: lv.id, pulled: 2, solved: true }); s = r.state;
    expect(doorOpen(s, map, lv.door)).toBe(true);
    s = move({ ...s, position: { x: lv.door.x - 1, y: lv.door.y }, repel: 9 }, map, 'right').state; expect(s.position).toEqual(lv.door);
  });
});

describe('boulder', () => {
  const b = P.boulders[0]!;
  it('the pit blocks until the boulder is pushed into it; then the vault opens', () => {
    const west = { x: b.at.x - 1, y: b.at.y };
    let s = run({ position: west });
    const r = move(s, map, 'right');
    expect(r.event).toEqual({ type: 'pushed', puzzleId: b.id, filled: true });
    s = r.state; expect(s.position).toEqual(b.at); expect(s.solved).toContain(b.id);
    s = move({ ...s, repel: 9 }, map, 'right').state; expect(s.position).toEqual(b.pit);
    s = move(s, map, 'right').state; expect(chestAt(map, s.position)?.id).toBe('thicket-vault');
  });
  it('an unfilled pit cannot be walked over; a boulder against a wall does not move', () => {
    const s = run({ position: { x: b.pit.x + 1, y: b.pit.y } });
    expect(move(s, map, 'left').event).toEqual({ type: 'blocked', reason: 'pit' });
    // Pushed onto plain floor it moves one tile; then the pit is no longer next to it.
    const moved = run({ boulders: { [b.id]: { x: b.at.x - 1, y: b.at.y } }, position: { x: b.at.x - 2, y: b.at.y } });
    const r = move(moved, map, 'right');
    expect(r.event).toEqual({ type: 'pushed', puzzleId: b.id, filled: false }); expect(r.state.boulders[b.id]).toEqual(b.at);
  });
});

describe('secret walls', () => {
  it('a cracked wall can be walked through into a hidden chest pocket; found once', () => {
    const sec = P.secrets[0]!; const east = { x: sec.x + 1, y: sec.y };
    let r = move(run({ position: east }), map, 'left');
    expect(r.event).toEqual({ type: 'secret', secretId: sec.id }); expect(r.state.position).toEqual({ x: sec.x, y: sec.y });
    r = move(r.state, map, 'left'); expect(chestAt(map, r.state.position)?.id).toBe('meadow-secret');
    const back = move(move(r.state, map, 'right').state, map, 'right').state;
    expect(move(back, map, 'left').event.type).toBe('moved'); expect(back.secrets).toEqual([sec.id]);
  });
});

describe('save v15–16', () => {
  it('round-trips puzzle state, a party standing in an open doorway, and rejects impossible puzzle data', () => {
    const lv = P.levers[0]!;
    const s = run({ position: lv.door, solved: [lv.id], levers: [`${lv.id}:0`, `${lv.id}:1`], runes: { [P.runes[0]!.id]: 2 }, secrets: [P.secrets[1]!.id],
      boulders: { [P.boulders[0]!.id]: { x: P.boulders[0]!.at.x - 1, y: P.boulders[0]!.at.y } } });
    const raw = (run: unknown) => JSON.stringify({ version: 16, profile: newProfile(map, 3), run });
    expect(parseGame(raw(s), map, lookup).run).toEqual(s);
    expect(() => parseGame(raw({ ...s, solved: [] }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...s, runes: { [P.runes[0]!.id]: 3 } }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...s, secrets: ['nowhere'] }), map, lookup)).toThrow();
    expect(() => parseGame(raw({ ...s, position: { x: 0, y: 0 } }), map, lookup)).toThrow();
  });
  it('v14 runs gain empty puzzle state (old map versions settle home as before)', () => {
    const s = run() as Partial<ExpeditionState>; delete s.runes; delete s.solved; delete s.levers; delete s.boulders; delete s.secrets;
    const g = parseGame(JSON.stringify({ version: 14, profile: newProfile(map, 3), run: s }), map, lookup);
    expect(g.run).toMatchObject({ runes: {}, solved: [], levers: [], boulders: {}, secrets: [] });
  });
});
