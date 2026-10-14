import { createBattle, replay } from '../battle/engine';
import type { BattleState, Command, EncounterDefinition } from '../battle/types';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
const key = 'asterveil.fateweave.battle.v1';
const selectionKey = 'asterveil.fateweave.encounter.v1';
// Keep the original save key compatible; additional battles own separate replays.
export const battleSaveKey = (data: EncounterDefinition): string => data.id === 'veil-siege' ? key : `${key}.${data.id}`;
export function loadSelectedEncounter(storage: StoragePort | undefined, catalog: readonly EncounterDefinition[]): EncounterDefinition {
  if (!catalog.length) throw new Error('At least one encounter is required.');
  try { return catalog.find(data => data.id === storage?.getItem(selectionKey)) ?? catalog[0]!; }
  catch { return catalog[0]!; }
}
export function rememberEncounter(storage: StoragePort | undefined, data: EncounterDefinition): boolean {
  try { if (!storage) return false; storage.setItem(selectionKey, data.id); return true; }
  catch { return false; }
}
export function saveBattle(storage: StoragePort | undefined, state: BattleState, data: EncounterDefinition): boolean {
  try {
    if (!storage || state.commands.length > 5000) return false;
    storage.setItem(battleSaveKey(data), JSON.stringify({ version: 1, encounterId: data.id, contentVersion: data.version, commands: state.commands }));
    return true;
  } catch { return false; }
}
export function loadBattle(storage: StoragePort | undefined, data: EncounterDefinition): { state: BattleState; restored: boolean } {
  try {
    const raw = storage?.getItem(battleSaveKey(data));
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
