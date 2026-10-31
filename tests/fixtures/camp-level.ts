import { gameRules } from '../../src/content/world/rules';
import { levelXp } from '../../src/core/world/world';

// P01: tests set the camp level (every member shares it) as the camp EXP at the start of that level.
export const xpAt = (level: number): number => levelXp(gameRules, level);
