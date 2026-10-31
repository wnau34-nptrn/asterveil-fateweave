import { gameRules } from '../../src/content/world/rules';
import { campLevel, levelXp } from '../../src/core/world/world';

// Saves before v44 kept a level and EXP on every member (P01 moved them to one camp EXP). Tests that build an older
// envelope from current objects rewrite it into that shape: every member at the camp's level and EXP, arrivals as
// hero → join level and a starter pick with its level.
type Part = Record<string, unknown> & { members?: Record<string, Record<string, unknown>>; campXp?: number };
function legacyPart(part: Part): void {
  const xp = part.campXp ?? 0; delete part.campXp;
  const level = campLevel(gameRules, xp), exp = Math.min(xp - levelXp(gameRules, level), gameRules.progression.nextBase + gameRules.progression.nextPerLevel * level - 1);
  for (const m of Object.values(part.members ?? {})) if (level > 1 || exp > 0) Object.assign(m, { level, exp });
  if (Array.isArray(part.arrivals)) part.arrivals = Object.fromEntries((part.arrivals as string[]).map(id => [id, level]));
  if (part.draft && typeof part.draft === 'object') (part.draft as Record<string, unknown>).level = level;
}
export function legacyEnvelope<T extends { version: number }>(envelope: T): T {
  const out = structuredClone(envelope) as T & { profile?: Part | null; run?: Part | null; state?: Part };
  for (const part of [out.profile, out.run, out.state]) if (part && typeof part === 'object') legacyPart(part);
  return out;
}
