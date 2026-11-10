/** Presentation-only HP thresholds, shared by the field and allied HUD. */
export function healthRatio(hp: number, maxHp: number): number {
  return maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
}
export function healthTone(hp: number, maxHp: number): 'green' | 'orange' | 'red' {
  const ratio = healthRatio(hp, maxHp);
  return ratio <= .25 ? 'red' : ratio <= .4 ? 'orange' : 'green';
}
export const healthColors = { green: '#68d8ad', orange: '#ffad54', red: '#f16d79' } as const;
// An open shallow curve only BELOW the sole; no rear half or closed outline.
export const frontHealthPath = 'M 3 2 Q 36 14 69 2';
export const bossCrown = '<svg class="boss-crown" viewBox="0 0 24 16" aria-hidden="true"><path d="m2 3 5 4 5-6 5 6 5-4-3 11H5Z"/><path d="M6 15h12"/></svg>';
