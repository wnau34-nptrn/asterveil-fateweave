import { decideCommand, type CommandLog } from '../cloud/cloud-save';
import type { Game } from '../save/expedition-save';
import { clientEvents, clientView, type ClientEvent, type ClientGame } from './client-view';
import { applyCommand, isRejected, parseCommand, type CommandContext } from './game-command';

// P09-02a2: one device request = `{ requestId, seq, command }`. The processor orders it with `decideCommand`
// (`core/cloud/cloud-save.ts`), checks the command's shape with `parseCommand`, runs it with `applyCommand` and keeps
// the answer so a retry of the same request gets the same answer without running the rules again. Pure (the caller
// stores the returned state and computes the SHA-256 of `canonicalJson(command)` with its platform's crypto), so a
// server (P09-02b) can call it directly. Locally the game shell does not need it. See docs/design/p09/CLIENT_VIEW_TH.md.

export interface CommandRequest { requestId: string; seq: number; command: unknown }
// The answer for a sequence number. A command refused by its shape or the rules still uses up its sequence number,
// so the device always sends `lastSeq + 1` next; the state does not change.
export type CommandReply =
  | { seq: number; status: 'applied'; view: ClientGame; events: ClientEvent[] }
  | { seq: number; status: 'rejected'; reason: string };
export interface CommandRecord { requestId: string; seq: number; argsSha256: string; reply: CommandReply }
// What the server keeps per account besides the game: the last sequence number and the recent answers.
export interface CommandBook extends CommandLog { recent: readonly CommandRecord[] }
export const RECENT_REPLIES = 64;
export const emptyBook = (): CommandBook => ({ lastSeq: 0, recent: [] });

export type EnvelopeOutcome =
  // A new sequence number was used: store `game` and `book` together (one write), then answer `reply`.
  | { kind: 'committed'; game: Game | null; book: CommandBook; reply: CommandReply }
  // A retry of a stored request: answer `reply` again, store nothing.
  | { kind: 'replayed'; reply: CommandReply }
  // Nothing ran and nothing is stored (see `CommandDecision`).
  | { kind: 'requestReused' } | { kind: 'stale'; lastSeq: number } | { kind: 'gap'; lastSeq: number } | { kind: 'invalid' };

// Stable JSON for hashing a command: object keys sorted, `undefined` fields left out, arrays in order.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(v => v === undefined ? 'null' : canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined);
    return `{${entries.map(k => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const kindOf = (command: unknown): string => typeof command === 'object' && command !== null && typeof (command as { kind?: unknown }).kind === 'string'
  ? (command as { kind: string }).kind : '';

// `argsSha256`: SHA-256 (lowercase hex) of `canonicalJson(request.command)`, computed by the caller.
export function processCommand(game: Game | null, book: CommandBook, request: CommandRequest, argsSha256: string, ctx: CommandContext): EnvelopeOutcome {
  const decision = decideCommand(book, { requestId: request.requestId, seq: request.seq, kind: kindOf(request.command), argsSha256 });
  if (decision.kind === 'replayed') return { kind: 'replayed', reply: book.recent.find(r => r.requestId === request.requestId)!.reply };
  if (decision.kind !== 'apply') return decision;
  const seq = request.seq; const cmd = parseCommand(request.command);
  const result = cmd ? applyCommand(game, cmd, ctx) : { rejected: 'shape' };
  let next = game; let reply: CommandReply;
  if (isRejected(result)) reply = { seq, status: 'rejected', reason: result.rejected };
  else {
    next = result.game;
    reply = { seq, status: 'applied', view: clientView(next, ctx), events: clientEvents(result.events) };
  }
  const recent = [...book.recent, { requestId: request.requestId, seq, argsSha256, reply }].slice(-RECENT_REPLIES);
  return { kind: 'committed', game: next, book: { lastSeq: seq, recent }, reply };
}
