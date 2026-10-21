import type { MapDefinition } from '../../core/world/types';
import { chapterOne } from './chapter1';

// The campaign in order (chapters plan, owner-approved 2026-10-17). Every map shares `gameRules`; each one opens
// once the map before it has been cleared (`mapUnlocked`).
export const MAPS: readonly MapDefinition[] = [chapterOne];
export const mapById = (id: string): MapDefinition | undefined => MAPS.find(m => m.id === id);
