import type { EnemyDefinition } from '../../core/battle/types';

export const enemies: readonly EnemyDefinition[] = [
  { id: 'raider', speed: 110, name: 'Veil Raider', maxHp: 78, color: 0xee80bd },
  { id: 'brute', speed: 70, name: 'Rift Brute', maxHp: 200, color: 0x9785f2 },
];
