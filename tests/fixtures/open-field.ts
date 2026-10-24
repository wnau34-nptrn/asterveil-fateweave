import type { EncounterDefinition } from '../../src/core/battle/types';

// Tests of other rules keep the pre-A7 targeting: every foe stands unscreened (slot ids unchanged).
// The front-row screen itself is covered in tests/four-slots.test.ts.
export const openField = <T extends EncounterDefinition>(d: T): T => ({ ...d, enemies: d.enemies.map(e => ({ ...e, row: 'front' as const })) });
