import { createBattle, replay } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../battle/types';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
const key = 'asterveil.fateweave.battle.v1';
export function saveBattle(storage: StoragePort | undefined, state: BattleState, data: EncounterDefinition): boolean {
  try {
    if (!storage || state.commands.length > 5000) return false;
    storage.setItem(key, JSON.stringify({ version: 1, encounterId: data.id, contentVersion: data.version, commands: state.commands }));
    return true;
  } catch { return false; }
}
export function loadBattle(storage: StoragePort | undefined, data: EncounterDefinition): { state: BattleState; restored: boolean } {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return { state: createBattle(data), restored: false };
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1 ||
      !('encounterId' in saved) || saved.encounterId !== data.id ||
      !('contentVersion' in saved) || saved.contentVersion !== data.version ||
      !('commands' in saved) || !Array.isArray(saved.commands) || saved.commands.length > 5000) throw new Error('Invalid save');
    const commands: Command[] = saved.commands.map((value: unknown) => {
      if (!value || typeof value !== 'object' || !('beat' in value) || !Number.isInteger(value.beat) ||
        !('heroId' in value) || typeof value.heroId !== 'string' || !('targetId' in value) || typeof value.targetId !== 'string' ||
        !('action' in value) || !Object.hasOwn(data.skills, String(value.action))) throw new Error('Invalid command');
      return { beat: value.beat as number, heroId: value.heroId, targetId: value.targetId, action: value.action as Command['action'] };
    });
    return { state: replay(data, commands), restored: commands.length > 0 };
  } catch { return { state: createBattle(data), restored: false }; }
}
