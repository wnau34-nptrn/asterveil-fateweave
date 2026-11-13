import type { Bank, ExpeditionState, PotionId, Potions, Resources, TomeBag } from './types';
import { POTION_IDS, TOME_LINES, TOME_SIZES } from './types';

// The camp's storage ceilings. These are the limits the v45 save validator accepts (`core/save/expedition-save.ts`), kept in
// one place so every command checks the same numbers it will be saved with (claude 2026-11-04, Codex UXD-05/UXD-07 notes).
// Choices the player makes (trade, smelt, buy, claim, salvage) are refused when they would pass a ceiling; settling an
// expedition and a dismissal refund cannot be refused, so they fill to the ceiling and the excess is lost.
export const BANK_CAP: Readonly<Bank> = { gold: 9_999_999, ore: 9_999_999, shard: 99_999, dust: 9_999_999 };
export const TOME_CAP = 99_999;
export const RIFT_CORE_CAP = 9_999;
export const POTION_CAP = 9_999; // potions kept at the camp (a run carries `map.potions.carry`)
const BANK_KEYS = ['gold', 'ore', 'shard', 'dust'] as const;

// True when `bank` plus `add` (negative entries spend) stays within every ceiling.
export function bankFits(bank: Bank, add: Partial<Bank>): boolean {
  return BANK_KEYS.every(k => { const n = bank[k] + (add[k] ?? 0); return Number.isSafeInteger(n) && n <= BANK_CAP[k]; });
}
export function clampBank(bank: Bank): void {
  for (const k of BANK_KEYS) bank[k] = Math.min(bank[k], BANK_CAP[k]);
}
export function clampTomes(bag: TomeBag): void {
  for (const l of TOME_LINES) for (const z of TOME_SIZES) bag[l][z] = Math.min(bag[l][z], TOME_CAP);
}
export const potionsFit = (potions: Potions, add: Partial<Record<PotionId, number>> | undefined): boolean => POTION_IDS.every(id => potions[id] + (add?.[id] ?? 0) <= POTION_CAP);
export function clampPotions(potions: Potions): void {
  for (const id of POTION_IDS) potions[id] = Math.min(potions[id], POTION_CAP);
}

// What an expedition in progress may carry (the run limits of the same validator). Random encounters have no end, so a
// very long run could otherwise farm past them; every gain on the map fills to the ceiling instead (claude 2026-11-04).
export const RUN_CAP: Readonly<Resources> & { dust: number; riftCore: number; tomeWins: number; respawns: number } =
  { ore: 999_999, gold: 999_999, ember: 9_999, shard: 9_999, dust: 999_999, riftCore: 999, tomeWins: 9_999, respawns: 99 };
export function clampRun(state: ExpeditionState): void {
  const r = state.resources;
  state.resources = { ore: Math.min(r.ore, RUN_CAP.ore), gold: Math.min(r.gold, RUN_CAP.gold), ember: Math.min(r.ember, RUN_CAP.ember), shard: Math.min(r.shard, RUN_CAP.shard) };
  state.dust = Math.min(state.dust, RUN_CAP.dust);
  if (state.tomes) clampTomes(state.tomes);
  if (state.riftCore !== undefined) state.riftCore = Math.min(state.riftCore, RUN_CAP.riftCore);
  if (state.tomeWins !== undefined) state.tomeWins = Math.min(state.tomeWins, RUN_CAP.tomeWins);
}
