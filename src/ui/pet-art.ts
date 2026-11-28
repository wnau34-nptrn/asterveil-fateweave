import { PET_IDS, type PetKind } from '../core/world/types';

// PET-3: ART-PET-002 (owner approved the six identities 2026-11-28). `pets.webp` is a lossless 4×6 atlas (rows in
// `PET_IDS` order; columns idle_a, idle_b, assist, happy; 256 px frames, feet at y=240); `pet_portraits.webp` a 3×2
// sheet of painted busts. Both are drawn as CSS sprites (the HUD stays DOM-native). The sheets load when a pet is shown.
export type PetPose = 'idle' | 'assist' | 'happy';
const COLUMN = { idle: 0, assist: 2, happy: 3 } as const;
export const PET_SHEET_URL = `${import.meta.env.BASE_URL}assets/pets/pets.webp?v=f45edee8`;
export const PET_PORTRAIT_URL = `${import.meta.env.BASE_URL}assets/pets/pet_portraits.webp?v=1ef6336d`;

export const petRow = (kind: PetKind): number => PET_IDS.indexOf(kind);
// One pet sprite. `idle` blinks between idle_a and idle_b (CSS, still under reduced motion); the size comes from `--pet-size`.
export const petSprite = (kind: PetKind, pose: PetPose = 'idle', cls = ''): string =>
  `<span class="pet-sprite${cls ? ` ${cls}` : ''}" data-pet="${kind}" data-pose="${pose}" style="--r:${petRow(kind)};--c:${COLUMN[pose]};--sheet:url(${PET_SHEET_URL})" aria-hidden="true"></span>`;
export const petPortrait = (kind: PetKind, cls = ''): string => {
  const i = petRow(kind);
  return `<span class="pet-portrait${cls ? ` ${cls}` : ''}" data-pet="${kind}" style="--pc:${i % 3};--pr:${Math.floor(i / 3)};--sheet:url(${PET_PORTRAIT_URL})" aria-hidden="true"></span>`;
};
