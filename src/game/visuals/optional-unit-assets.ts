import type { EncounterDefinition } from '../../core/battle/types';
import { pilotSheets, type PilotSheet } from './unit-frames';

export function encounterPilotSheets(data: EncounterDefinition): PilotSheet[] {
  const art = new Set([...data.heroes.map(h => h.id), ...data.enemies.map(e => e.art ?? e.id)]);
  return Object.entries(pilotSheets).filter(([id]) => art.has(id)).map(([, name]) => name);
}

// Scheduling/cache state only. Optional artwork never owns the battle readiness gate.
export class OptionalUnitAssets {
  private needed: PilotSheet[] = [];
  private pending = new Set<PilotSheet>();
  private failed = new Set<PilotSheet>();
  setEncounter(data: EncounterDefinition): void { this.needed = encounterPilotSheets(data); this.failed.clear(); }
  request(exists: (name: PilotSheet) => boolean): PilotSheet[] {
    const names = this.needed.filter(name => !exists(name) && !this.pending.has(name) && !this.failed.has(name));
    for (const name of names) this.pending.add(name);
    return names;
  }
  complete(exists: (name: PilotSheet) => boolean): boolean {
    const changed = this.pending.size > 0;
    for (const name of this.pending) if (!exists(name)) this.failed.add(name);
    this.pending.clear();
    return changed;
  }
  unused(exists: (name: PilotSheet) => boolean): PilotSheet[] {
    return Object.values(pilotSheets).filter(name => !this.needed.includes(name) && exists(name));
  }
  reset(): void { this.pending.clear(); this.failed.clear(); }
}
