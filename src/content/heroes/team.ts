import type { HeroDefinition } from '../../core/battle/types';
export const heroes: readonly HeroDefinition[] = [
  { id: 'guardian', name: 'Aegis', role: 'Knight', lane: 'front', maxHp: 76, attack: 10, actions: ['attack', 'guard', 'bash'], color: 0x61c9ff },
  { id: 'tracer', name: 'Lyra', role: 'Duelist', lane: 'front', maxHp: 56, attack: 16, actions: ['attack', 'mark', 'execute'], color: 0xffcc72, empoweredByStatuses: true },
  { id: 'weaver', name: 'Eira', role: 'Mage', lane: 'back', maxHp: 48, attack: 11, actions: ['attack', 'bolt', 'ward'], color: 0xb59aff },
  { id: 'healer', name: 'Seren', role: 'Priest', lane: 'back', maxHp: 46, attack: 8, actions: ['attack', 'heal', 'prayer'], color: 0x90ddb0 },
];
