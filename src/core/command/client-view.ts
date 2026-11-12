import type { Game } from '../save/expedition-save';
import { boardOffers, hireReason } from '../world/profile';
import type { ExpeditionState, MapDefinition, Profile } from '../world/types';
import type { EncounterLookup } from '../world/world';
import type { CommandEvent } from './game-command';

// P09-02a2: what a device may see of a `Game` once the server decides everything (owner D10 = ค). The view drops every
// value that fixes a future random draw — the profile's seed and forge counter (hiring board, gear box, fuse, reroll)
// and the run's seed and roll counter (encounters, chests, events, drops, starter offers) — and carries instead the
// values the UI used to work out from them. Locally the shell builds the view from the full game; a server would send
// only the view. Pure: no clocks, randomness or platform APIs. See docs/design/p09/CLIENT_VIEW_TH.md.

// Keys removed from the state. Keep in sync with the seeded draws listed in docs/design/p09/COMMAND_LAYER_TH.md §3.
export const HIDDEN_PROFILE_KEYS = ['seed', 'forge'] as const;
export const HIDDEN_RUN_KEYS = ['seed', 'rolls'] as const;
export type ClientProfile = Omit<Profile, (typeof HIDDEN_PROFILE_KEYS)[number]>;
export type ClientRun = Omit<ExpeditionState, (typeof HIDDEN_RUN_KEYS)[number]>;
// One offer of the hiring board, in board order (its position is the `hire` command's index). `reason` is
// `hireReason`: '' when the offer can be hired, else 'taken' | 'gold' | 'maxed'.
export interface HireSlot { heroId: string; reason: string }
export interface ClientGame { profile: ClientProfile; run: ClientRun | null; hireBoard: HireSlot[] }
export type ClientEvent = Exclude<CommandEvent, { type: 'settled' }> | { type: 'settled'; outcome: Extract<CommandEvent, { type: 'settled' }>['outcome']; run: ClientRun };
export interface ViewContext { home: MapDefinition; lookup: EncounterLookup }

function omit<T extends object, K extends string>(value: T, keys: readonly K[]): Omit<T, K> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (!(keys as readonly string[]).includes(k)) out[k] = v;
  return out as Omit<T, K>;
}
export const clientProfile = (profile: Profile): ClientProfile => omit(profile, HIDDEN_PROFILE_KEYS);
export const clientRun = (run: ExpeditionState): ClientRun => omit(run, HIDDEN_RUN_KEYS);

// The hiring board as the lobby shows it, computed where the seed lives (the camp's hiring rules are the frontier
// map's, as the `hire` command uses them).
export function hireBoard(profile: Profile, ctx: ViewContext): HireSlot[] {
  return boardOffers(profile, ctx.home, ctx.lookup).map((heroId, i) => ({ heroId, reason: hireReason(profile, ctx.home, ctx.lookup, i) }));
}

// The view shares nested objects with `game` (no deep copy); treat it as read-only. JSON round-trips cleanly.
export function clientView(game: Game, ctx: ViewContext): ClientGame {
  return { profile: clientProfile(game.profile), run: game.run ? clientRun(game.run) : null, hireBoard: hireBoard(game.profile, ctx) };
}
export function clientEvents(events: readonly CommandEvent[]): ClientEvent[] {
  return events.map(e => e.type === 'settled' ? { type: 'settled', outcome: e.outcome, run: clientRun(e.run) } : e);
}
