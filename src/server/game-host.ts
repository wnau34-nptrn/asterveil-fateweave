import { clientView, type ClientGame } from '../core/command/client-view';
import { canonicalJson, emptyBook, processCommand, type CommandBook, type CommandReply, type CommandRequest } from '../core/command/command-envelope';
import { applyCommand, isRejected, parseCommand, type CommandContext } from '../core/command/game-command';
import type { SeedSource } from '../core/command/seed-source';
import { decideUpload, type CloudSaveUpload } from '../core/cloud/cloud-save';
import { parseGame, type Game } from '../core/save/expedition-save';
import type { BattleReplay } from '../core/world/world';
import { battleMemo } from '../core/command/battle-memo';

// P09-02b: the per-account game host the Durable Object wraps. It keeps the authoritative `Game` and the command book,
// runs every device request through the same `processCommand` the game uses, draws seeds from a server source, and
// writes the new state, the book and one log row (the command plus the seeds it used) in a single commit. Nothing
// here touches Cloudflare: the store and the random source are injected, so tests run it in memory. The device only
// ever receives seed-free views. See docs/design/p09/SERVER_P09_02B_TH.md.

export type GameContext = Omit<CommandContext, 'seeds' | 'battles'>;
export interface HostState { game: Game | null; book: CommandBook }
// One applied sequence number. `seeds` are the server draws the command consumed, in order; with them the log replays
// to the same game. They never leave the server.
export interface LogEntry { seq: number; requestId: string; command: unknown; seeds: number[]; status: CommandReply['status']; contentVersion: string; at: number }
// P09-02e: the game as it stood right after sequence number `seq`. The log replays from the latest one, so `/verify`
// costs at most SNAPSHOT_EVERY commands. `import`: the game an imported local save became (D11); `periodic`: written by
// the server itself every SNAPSHOT_EVERY commands and when an expedition ends.
export interface Snapshot { seq: number; game: Game | null; origin: 'import' | 'periodic'; at: number }
// P09-02e (D11): the one local save an account imported, kept verbatim (origin = legacy) beside its fingerprint.
export interface ImportRecord { requestId: string; payloadSha256: string; saveVersion: number; seq: number; at: number }
export interface HostStore {
  load(): HostState | null;
  // Must store `state`, append `entry` and write `snapshot` (when given) atomically (one transaction).
  commit(state: HostState, entry: LogEntry, snapshot?: Snapshot): void;
  // Log entries with a sequence number above `after` (all of them by default).
  entries(after?: number): LogEntry[];
  latestSnapshot(): Snapshot | null;
  imported(): ImportRecord | null;
  // Must store `state`, `snapshot`, `record` and the raw save atomically.
  commitImport(state: HostState, snapshot: Snapshot, record: ImportRecord, payload: string): void;
  // D12: the one session (one tab on one device) allowed to play this account; the newest claim wins.
  activeSession(): string | null;
  setActiveSession(session: string, at: number): void;
}

export type HostAnswer =
  | { status: 200; body: CommandReply; replayed: boolean }
  | { status: 400; body: { error: 'invalid_request' } }
  | { status: 409; body: { error: 'stale' | 'gap'; lastSeq: number } | { error: 'request_reused' } }
  | { status: 423; body: { error: 'other_device' } };
export const OTHER_DEVICE = { status: 423, body: { error: 'other_device' } } as const;

export const MAX_COMMAND_BYTES = 128 * 1024;
// Draft: a snapshot after every 50 sequence numbers (and whenever an expedition ends) bounds `/verify` to 50 commands.
export const SNAPSHOT_EVERY = 50;

export type ImportAnswer =
  | { status: 201; body: { lastSeq: number; view: ClientGame | null; from: number }; replayed: boolean }
  | { status: 409; body: { error: 'already_imported' | 'has_game' } }
  | { status: 422; body: { error: 'replay_failed' | 'baseRevision' } };
// Battle `commands` lists are the largest normal command (one entry per committed turn).

// A seed source that records every value it hands out.
export function recordingSeeds(draw: () => number): SeedSource & { used: number[] } {
  const used: number[] = [];
  return { used, next: () => { const v = draw() >>> 0; used.push(v); return v; } };
}

export class GameHost {
  // P09-02f: the current battle's resolved turns, kept while this object lives (a Durable Object stays in memory between
  // requests; after eviction the first battle command resolves from the start again).
  private readonly battles = battleMemo();
  constructor(private readonly store: HostStore, private readonly ctx: GameContext, private readonly draw: () => number,
    private readonly contentVersion: string, private readonly now: () => number = () => Date.now()) {}

  private current(): HostState { return this.store.load() ?? { game: null, book: emptyBook() }; }

  // D12 (owner 2026-11-12): one account plays on one session at a time and the session that enters last takes over.
  // `claim` makes `session` the active one; `admits` lets the active session through (the first session ever claims).
  claim(session: string): void { this.store.setActiveSession(session, this.now()); }
  admits(session: string): boolean {
    const active = this.store.activeSession();
    if (active === null) { this.claim(session); return true; }
    return active === session;
  }

  // Synchronous between load and commit, so a Durable Object never interleaves two commands (hash the command first).
  command(request: CommandRequest, argsSha256: string): HostAnswer {
    const { game, book } = this.current();
    const seeds = recordingSeeds(this.draw);
    const out = processCommand(game, book, request, argsSha256, { ...this.ctx, seeds, battles: this.battles.replay });
    switch (out.kind) {
      case 'replayed': return { status: 200, body: out.reply, replayed: true };
      case 'invalid': return { status: 400, body: { error: 'invalid_request' } };
      case 'requestReused': return { status: 409, body: { error: 'request_reused' } };
      case 'stale': case 'gap': return { status: 409, body: { error: out.kind, lastSeq: out.lastSeq } };
      case 'committed': {
        const at = this.now(), seq = out.reply.seq;
        const ended = game?.run != null && out.game?.run == null;
        const snapshot: Snapshot | undefined = seq % SNAPSHOT_EVERY === 0 || ended ? { seq, game: out.game, origin: 'periodic', at } : undefined;
        this.store.commit({ game: out.game, book: out.book }, {
          seq, requestId: request.requestId, command: request.command, seeds: seeds.used,
          status: out.reply.status, contentVersion: this.contentVersion, at,
        }, snapshot);
        return { status: 200, body: out.reply, replayed: false };
      }
    }
  }

  // P09-02e (owner D11): a checked upload (`checkUpload` passed in the Worker, which also holds the fingerprint in D1)
  // becomes this account's game, once, and only while the account has no game. `parseGame` validates the save the way
  // a local load does (format, ceilings, and the replay of an unfinished battle's commands); the game it returns starts
  // a snapshot at the current sequence number, so the log and `/verify` continue from it. A retry of the same save gets
  // the same answer; any other save after an import is refused.
  importSave(upload: CloudSaveUpload): ImportAnswer {
    const { game, book } = this.current();
    const record = this.store.imported();
    const head = record ? { revision: 1, saveVersion: record.saveVersion, payloadSha256: record.payloadSha256 } : null;
    const decision = decideUpload(head, record ? [{ requestId: record.requestId, payloadSha256: record.payloadSha256, revision: 1 }] : [], upload);
    if (record) {
      if (decision.kind === 'replayed' || decision.kind === 'unchanged') return { status: 201, body: { ...this.view(), from: record.saveVersion }, replayed: true };
      return { status: 409, body: { error: 'already_imported' } };
    }
    if (game) return { status: 409, body: { error: 'has_game' } };
    if (decision.kind !== 'store') return { status: 422, body: { error: 'baseRevision' } };
    let parsed: Game;
    try { parsed = parseGame(upload.payload, this.ctx.home, this.ctx.lookup, this.ctx.maps); } catch { return { status: 422, body: { error: 'replay_failed' } }; }
    // The one-time migration summary is for a local load's message; the server keeps the game itself.
    const next: Game = { profile: parsed.profile, run: parsed.run };
    const at = this.now();
    this.store.commitImport({ game: next, book }, { seq: book.lastSeq, game: next, origin: 'import', at },
      { requestId: upload.requestId, payloadSha256: upload.payloadSha256, saveVersion: upload.saveVersion, seq: book.lastSeq, at }, upload.payload);
    return { status: 201, body: { ...this.view(), from: upload.saveVersion }, replayed: false };
  }

  // What a device may read: the seed-free view and the last sequence number.
  view(): { lastSeq: number; view: ClientGame | null } {
    const { game, book } = this.current();
    return { lastSeq: book.lastSeq, view: game ? clientView(game, this.ctx) : null };
  }

  // Audit: replay the log from the latest snapshot (or from nothing) with the recorded seeds and compare with the stored
  // game. `from` is where the replay started.
  verify(): ReplayResult & { from: number } {
    const { game } = this.current(); const start = this.store.latestSnapshot();
    const from = start ? { seq: start.seq, game: start.game } : { seq: 0, game: null };
    return { ...replayLog(this.store.entries(from.seq), this.ctx, game, from, battleMemo().replay), from: from.seq };
  }
}

export type ReplayResult = { ok: true; seq: number } | { ok: false; seq: number; reason: 'order' | 'seeds' | 'status' | 'snapshot' };

// `play`: how battle commands replay (`verify` passes a fresh `battleMemo`, so each turn of a battle resolves once).
export function replayLog(entries: readonly LogEntry[], ctx: GameContext, expected: Game | null, from: { seq: number; game: Game | null } = { seq: 0, game: null }, play?: BattleReplay): ReplayResult {
  let game: Game | null = from.game ? structuredClone(from.game) : null; let seq = from.seq;
  for (const e of entries) {
    if (e.seq !== seq + 1) return { ok: false, seq: e.seq, reason: 'order' };
    seq = e.seq;
    let i = 0;
    const seeds: SeedSource = { next: () => { if (i >= e.seeds.length) throw new Error('seeds'); return e.seeds[i++]! >>> 0; } };
    const cmd = parseCommand(e.command);
    let result;
    try { result = cmd ? applyCommand(game, cmd, { ...ctx, seeds, ...(play ? { battles: play } : {}) }) : { rejected: 'shape' }; } catch { return { ok: false, seq, reason: 'seeds' }; }
    if (i !== e.seeds.length) return { ok: false, seq, reason: 'seeds' };
    if ((isRejected(result) ? 'rejected' : 'applied') !== e.status) return { ok: false, seq, reason: 'status' };
    if (!isRejected(result)) game = result.game;
  }
  return canonicalJson(game) === canonicalJson(expected) ? { ok: true, seq } : { ok: false, seq, reason: 'snapshot' };
}

export function memoryStore(): HostStore & { state: HostState | null; log: LogEntry[]; snapshots: Snapshot[]; record: ImportRecord | null; raw: string | null; session: string | null } {
  const s = {
    state: null as HostState | null, log: [] as LogEntry[], snapshots: [] as Snapshot[], record: null as ImportRecord | null, raw: null as string | null,
    load: () => s.state ? structuredClone(s.state) : null,
    commit: (state: HostState, entry: LogEntry, snapshot?: Snapshot) => {
      s.state = structuredClone(state); s.log.push(structuredClone(entry)); if (snapshot) s.snapshots.push(structuredClone(snapshot));
    },
    entries: (after = 0) => structuredClone(s.log.filter(e => e.seq > after)),
    latestSnapshot: () => s.snapshots.length ? structuredClone(s.snapshots[s.snapshots.length - 1]!) : null,
    imported: () => s.record ? { ...s.record } : null,
    commitImport: (state: HostState, snapshot: Snapshot, record: ImportRecord, payload: string) => {
      s.state = structuredClone(state); s.snapshots.push(structuredClone(snapshot)); s.record = { ...record }; s.raw = payload;
    },
    session: null as string | null,
    activeSession: () => s.session,
    setActiveSession: (session: string) => { s.session = session; },
  };
  return s;
}
