import type { EncounterDefinition } from '../../core/battle/types';
import { unitSheets, type UnitSheet } from './unit-frames';

export function encounterUnitSheets(data: EncounterDefinition): UnitSheet[] {
  const art = new Set([...data.heroes.map(h => h.id), ...data.enemies.map(e => e.art ?? e.id)]);
  return Object.entries(unitSheets).filter(([id]) => art.has(id)).map(([, name]) => name);
}

// Scheduling/cache state only. Optional artwork never owns the battle readiness gate.
export class OptionalUnitAssets {
  private needed: UnitSheet[] = [];
  private pending = new Set<UnitSheet>();
  private failed = new Set<UnitSheet>();
  setEncounter(data: EncounterDefinition): void { this.needed = encounterUnitSheets(data); this.failed.clear(); }
  request(exists: (name: UnitSheet) => boolean): UnitSheet[] {
    const names = this.needed.filter(name => !exists(name) && !this.pending.has(name) && !this.failed.has(name));
    for (const name of names) this.pending.add(name);
    return names;
  }
  complete(exists: (name: UnitSheet) => boolean): boolean {
    const changed = this.pending.size > 0;
    for (const name of this.pending) if (!exists(name)) this.failed.add(name);
    this.pending.clear();
    return changed;
  }
  unused(exists: (name: UnitSheet) => boolean): UnitSheet[] {
    return Object.values(unitSheets).filter(name => !this.needed.includes(name) && exists(name));
  }
  reset(): void { this.pending.clear(); this.failed.clear(); }
}
