import type { EncounterDefinition } from '../../core/battle/types';
import { heroes } from '../heroes/team';
import { enemies } from '../enemies/veilbound';

export const crystalRift: EncounterDefinition = {
  id: 'crystal-rift', version: 2, name: 'The Crystal Rift', heroes, enemies,
  intents: [
    { sourceId: 'raider', targetId: 'tracer', name: 'Raking Slash', damage: 9, kind: 'physical', redirectable: false },
    { sourceId: 'brute', targetId: 'guardian', name: 'Rift Bolt', damage: 30, kind: 'energy', redirectable: true },
    { sourceId: 'raider', targetId: 'weaver', name: 'Raking Slash', damage: 9, kind: 'physical', redirectable: false },
    { sourceId: 'brute', targetId: 'tracer', name: 'Crushing Blow', damage: 22, kind: 'physical', redirectable: false },
  ],
  crystal: { id: 'energy-crystal', name: 'Energy Crystal', charges: 1, barrier: 8 },
  rules: { counterCap: 2, redirectCost: 1, guardReduction: 0.65, markDuration: 3, exposedDuration: 2, tracerBonus: 22 },
};
