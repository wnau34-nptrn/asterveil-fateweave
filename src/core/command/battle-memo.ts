import { createBattle, replay, resolveCommand } from '../battle/engine';
import type { BattleEntry, BattleState, Command, EncounterDefinition } from '../battle/types';
import type { BattleReplay } from '../world/world';
import { canonicalJson } from './command-envelope';

// P09-02f: the server keeps the current battle's resolved turns, so a `battle` command (which carries every committed
// turn) resolves only the turns it adds instead of replaying the whole battle (three times: record, outcome, finish).
// It is the same `resolveCommand` the full `replay` folds over, so the answer is identical; anything that does not
// match what it holds — another battle (encounter data or entry HP differ), a different or shorter list — falls back to
// resolving from the first command it does not hold. Pure apart from its own cache; not shared between accounts.
export interface BattleMemo { replay: BattleReplay; stats: { resolved: number; reused: number; resets: number } }

export function battleMemo(): BattleMemo {
  let key: string | undefined;
  // states[i] is the battle after the first i commands; commands[i] is the canonical JSON of command i.
  let states: BattleState[] = []; let commands: string[] = [];
  const stats = { resolved: 0, reused: 0, resets: 0 };
  function play(data: EncounterDefinition, list: readonly Command[], entry: BattleEntry): BattleState {
    // Plain JSON (not the sorted canonical form, ~20× slower on encounter data): a battle built the same way gives the
    // same text; anything else only misses the cache and resolves from the start.
    const k = JSON.stringify([data, entry]);
    if (k !== key) { key = undefined; states = [createBattle(data, entry)]; commands = []; stats.resets++; }
    let n = 0;
    while (n < commands.length && n < list.length && commands[n] === canonicalJson(list[n])) n++;
    stats.reused += n; states.length = n + 1; commands.length = n;
    // A turn that does not resolve throws, as in `replay`; the turns before it stay held.
    for (let i = n; i < list.length; i++) { states.push(resolveCommand(states[i]!, data, list[i]!).state); commands.push(canonicalJson(list[i])); stats.resolved++; }
    key = k;
    return structuredClone(states[list.length]!);
  }
  return { replay: play, stats };
}

// The plain full replay, for comparisons.
export const fullReplay: BattleReplay = (data, list, entry) => replay(data, list, entry);
