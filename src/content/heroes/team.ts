import type { HeroDefinition } from '../../core/battle/types';

export const heroes: readonly HeroDefinition[] = [
  { id: 'guardian', name: 'Aegis', role: 'Guardian', maxHp: 64, attack: 10, actions: ['attack', 'guard'], color: 0x61c9ff },
  { id: 'tracer', name: 'Lyra', role: 'Tracer', maxHp: 44, attack: 16, actions: ['attack', 'mark'], color: 0xffcc72, empoweredByStatuses: true },
  { id: 'weaver', name: 'Eira', role: 'Weaver', maxHp: 42, attack: 11, actions: ['attack', 'redirect'], color: 0xb59aff },
];
