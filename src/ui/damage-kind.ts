import type { Intent } from '../core/battle/types';
import { lineIcon } from './icons';

// Incoming damage kind for the player (owner request 2026-11-05): physical hits are met with armour, Guard and the
// front line; energy ("เวท") reaches the back line and is met with resist and energy shields. Shape + word + colour,
// never colour alone. Presentation only: the kind comes from the announced intent.
export type DamageKind = Intent['kind'];
export const damageKindText: Record<DamageKind, string> = { physical: 'กายภาพ', energy: 'เวท' };
const kindIcon = { physical: 'attack', energy: 'bolt' } as const;
const hint: Record<DamageKind, string> = { physical: 'ลดด้วยเกราะ ท่าป้องกัน และแนวหน้า', energy: 'ลดด้วยต้านพลังงาน และโล่พลังงาน ถึงแนวหลังได้' };
// An intent that deals no damage of its own (phase change, charging) has no kind to show.
export const damageKindOf = (intent: Intent | null | undefined): DamageKind | undefined => intent && !intent.special && !intent.charge ? intent.kind : undefined;
export const kindGlyph = (kind: DamageKind): string => `<span class="dmg-kind" data-kind="${kind}" aria-hidden="true">${lineIcon(kindIcon[kind])}</span>`;
// A pill with the word, for the intent card.
export const kindPill = (kind: DamageKind): string => `<b class="dmg-pill" data-kind="${kind}" title="${hint[kind]}">${lineIcon(kindIcon[kind])}${damageKindText[kind]}</b>`;
