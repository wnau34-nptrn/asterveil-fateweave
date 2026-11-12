import type { ClientEvent, ClientGame, ClientProfile, ClientRun } from '../core/command/client-view';
import type { CommandReply } from '../core/command/command-envelope';
import type { CommandEvent, CommandResult } from '../core/command/game-command';
import type { Game } from '../core/save/expedition-save';
import type { ExpeditionState, Profile } from '../core/world/types';

// P09-02c: the shell's handlers read a `Game`. In server play the device holds only the server's seed-free view
// (`ClientProfile`/`ClientRun`), so the hidden draw counters are filled with zeros here. The device never runs a seeded
// rule in server play — every command goes to the server, which keeps the real seeds — so these zeros are display
// placeholders only and are never saved (server play writes no local save). See docs/design/p09/CLIENT_VIEW_TH.md §5.
export const runFromView = (run: ClientRun): ExpeditionState => ({ ...run, seed: 0, rolls: 0 });
export const profileFromView = (profile: ClientProfile): Profile => ({ ...profile, seed: 0, forge: 0 });
export const gameFromView = (view: ClientGame): Game => ({ profile: profileFromView(view.profile), run: view.run ? runFromView(view.run) : null });

const eventFromView = (e: ClientEvent): CommandEvent => e.type === 'settled' ? { type: 'settled', outcome: e.outcome, run: runFromView(e.run) } : e;

// The server's answer as the result the local `applyCommand` would have returned.
export function resultFromReply(reply: CommandReply): CommandResult {
  return reply.status === 'rejected' ? { rejected: reply.reason } : { game: gameFromView(reply.view), events: reply.events.map(eventFromView) };
}
