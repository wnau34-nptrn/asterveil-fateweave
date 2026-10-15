import type { HeroDefinition } from '../../core/battle/types';

// Hireable mercenaries beyond the starting four (2C-2). Each one is a unique character with
// its own class mechanic; they join through the Lobby hiring board. Numbers are drafts.
export const mercenaries: readonly HeroDefinition[] = [
  // Spear: brace counters the first physical hit on any front-lane ally; pierce is plain damage.
  // Archer: hinder delays an enemy to the end of the next round; volley hits every enemy.
  { id: 'mira', speed: 105, name: 'Mira', role: 'Archer', lane: 'back', maxHp: 50, attack: 13, actions: ['attack', 'hinder', 'volley'], color: 0x6fbf73 },
  // Alchemist: acid corrodes an enemy (every hero hit +bonus); haste makes an ally act first next round.
  { id: 'toma', speed: 95, name: 'Toma', role: 'Alchemist', lane: 'back', maxHp: 48, attack: 9, actions: ['attack', 'acid', 'haste'], color: 0xd9a441 },
  { id: 'garran', speed: 90, name: 'Garran', role: 'Spear', lane: 'front', maxHp: 70, attack: 12, actions: ['attack', 'brace', 'pierce'], color: 0x4fc3b4 },
];
