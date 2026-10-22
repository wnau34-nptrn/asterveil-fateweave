import type { EnemyDefinition } from '../../core/battle/types';

export const enemies: readonly EnemyDefinition[] = [
  { id: 'b1', row: 'back', speed: 110, name: 'Veil Raider', displayName: 'นักจู่โจม', maxHp: 78, color: 0xee80bd, art: 'raider' },
  { id: 'f1', row: 'front', large: true, speed: 70, name: 'Rift Brute', displayName: 'อสูรรอยแยก', maxHp: 200, color: 0x9785f2, art: 'brute' },
];
