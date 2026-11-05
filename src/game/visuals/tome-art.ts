import type { TomeLine, TomeSize } from '../../core/world/types';
import frames from './progress/tome_items.json';

// Painted skill tomes (ART-UI-PROGRESS-001): 3 lines × 3 sizes, 128 px cells in a 3×3 atlas. Decorative only;
// names and counts stay in the DOM text beside the art.
export const TOME_ATLAS = { cols: 3, rows: 3 } as const;
export const tomeArtUrl = (): string => `${import.meta.env.BASE_URL}assets/ui/progress/tome_items.webp?v=ecfb5758`;
export function tomeCell(line: TomeLine, size: TomeSize): { col: number; row: number } {
  const f = (frames as Record<string, { x: number; y: number }>)[`tome_${line}_${size}`]!;
  return { col: f.x / 128, row: f.y / 128 };
}
