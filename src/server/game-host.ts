import { clientView, type ClientGame } from '../core/command/client-view';
import { canonicalJson, emptyBook, processCommand, type CommandBook, type CommandReply, type CommandRequest } from '../core/command/command-envelope';
import { applyCommand, isRejected, parseCommand, type CommandContext } from '../core/command/game-command';
import type { SeedSource } from '../core/command/seed-source';
import type { Game } from '../core/save/expedition-save';

// P09-02b: the per-account game host the Durable Object wraps. It keeps the authoritative `Game` and the command book,
// runs every device request through the same `processCommand` the game uses, draws seeds from a server source, and
// writes the new state, the book and one log row (the command plus the seeds it used) in a single commit. Nothing
// here touches Cloudflare: the store and the random source are injected, so tests run it in memory. The device only
// ever receives seed-free views. See docs/design/p09/SERVER_P09_02B_TH.md.

export type GameContext = Omit<CommandContext, 'seeds'>;
export interface HostState { game: Game | null; book: CommandBook }
// One applied sequence number. `seeds` are the server draws the command consumed, in order; with them the log replays
// to the same game. They never leave the server.
export interface LogEntry { seq: number; requestId: string; command: unknown; seeds: number[]; status: CommandReply['status']; contentVersion: string; at: number }
export interface HostStore {
  load(): HostState | null;
  // Must store `state` and append `entry` atomically (one transaction).
  commit(state: HostState, entry: LogEntry): void;
  entries(): LogEntry[];
}

export type HostAnswer =
  | { status: 200; body: CommandReply; replayed: boolean }
  | { status: 400; body: { error: 'invalid_request' } }
  | { status: 409; body: { error: 'stale' | 'gap'; lastSeq: number } | { error: 'request_reused' } };

export const MAX_COMMAND_BYTES = 128 * 1024;
// Battle `commands` lists are the largest normal command (one entry per committed turn).

// A seed source that records every value it hands out.
export function recordingSeeds(draw: () => number): SeedSource & { used: number[] } {
  const used: number[] = [];
  return { used, next: () => { const v = draw() >>> 0; used.push(v); return v; } };
}

export class GameHost {
  constructor(private readonly store: HostStore, private readonly ctx: GameContext, private readonly draw: () => number,
    private readonly contentVersion: string, private readonly now: () => number = () => Date.now()) {}

  private current(): HostState { return this.store.load() ?? { game: null, book: emptyBook() }; }

  // Synchronous between load and commit, so a Durable Object never interleaves two commands (hash the command first).
  command(request: CommandRequest, argsSha256: string): HostAnswer {
    const { game, book } = this.current();
    const seeds = recordingSeeds(this.draw);
    const out = processCommand(game, book, request, argsSha256, { ...this.ctx, seeds });
    switch (out.kind) {
      case 'replayed': return { status: 200, body: out.reply, replayed: true };
      case 'invalid': return { status: 400, body: { error: 'invalid_request' } };
      case 'requestReused': return { status: 409, body: { error: 'request_reused' } };
      case 'stale': case 'gap': return { status: 409, body: { error: out.kind, lastSeq: out.lastSeq } };
      case 'committed':
        this.store.commit({ game: out.game, book: out.book }, {
          seq: out.reply.seq, requestId: request.requestId, command: request.command, seeds: seeds.used,
          status: out.reply.status, contentVersion: this.contentVersion, at: this.now(),
        });
        return { status: 200, body: out.reply, replayed: false };
    }
  }

  // What a device may read: the seed-free view and the last sequence number.
  view(): { lastSeq: number; view: ClientGame | null } {
    const { game, book } = this.current();
    return { lastSeq: book.lastSeq, view: game ? clientView(game, this.ctx) : null };
  }

  // Audit: replay the whole log from nothing with the recorded seeds and compare with the stored game.
  verify(): ReplayResult { const { game } = this.current(); return replayLog(this.store.entries(), this.ctx, game); }
}

export type ReplayResult = { ok: true; seq: number } | { ok: false; seq: number; reason: 'order' | 'seeds' | 'status' | 'snapshot' };

export function replayLog(entries: readonly LogEntry[], ctx: GameContext, expected: Game | null): ReplayResult {
  let game: Game | null = null; let seq = 0;
  for (const e of entries) {
    if (e.seq !== seq + 1) return { ok: false, seq: e.seq, reason: 'order' };
    seq = e.seq;
    let i = 0;
    const seeds: SeedSource = { next: () => { if (i >= e.seeds.length) throw new Error('seeds'); return e.seeds[i++]! >>> 0; } };
    const cmd = parseCommand(e.command);
    let result;
    try { result = cmd ? applyCommand(game, cmd, { ...ctx, seeds }) : { rejected: 'shape' }; } catch { return { ok: false, seq, reason: 'seeds' }; }
    if (i !== e.seeds.length) return { ok: false, seq, reason: 'seeds' };
    if ((isRejected(result) ? 'rejected' : 'applied') !== e.status) return { ok: false, seq, reason: 'status' };
    if (!isRejected(result)) game = result.game;
  }
  return canonicalJson(game) === canonicalJson(expected) ? { ok: true, seq } : { ok: false, seq, reason: 'snapshot' };
}

export function memoryStore(): HostStore & { state: HostState | null; log: LogEntry[] } {
  const s = {
    state: null as HostState | null, log: [] as LogEntry[],
    load: () => s.state ? structuredClone(s.state) : null,
    commit: (state: HostState, entry: LogEntry) => { s.state = structuredClone(state); s.log.push(structuredClone(entry)); },
    entries: () => structuredClone(s.log),
  };
  return s;
}
