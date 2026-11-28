import { PET_IDS, type PetBlessing, type PetKind } from '../core/world/types';

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

// PET-3c: ART-PET-003 (owner chose the R1 gold egg 2026-11-28). `pets_walk.webp` 4×6 (same rows; walk_a…d loops), `egg.webp`
// 1792×512 (row 1: idle, wobble_l, wobble_r, crack_1–3, open; row 2: six 128 px shards then three 256 px flash beats),
// `pet_den.webp` 512×256 (empty, egg waiting) and `pet_blessing_icons.webp` 768×128 (blessing order below).
const asset = (name: string, v: string): string => `${import.meta.env.BASE_URL}assets/pets/${name}.webp?v=${v}`;
export const PET_WALK_URL = asset('pets_walk', 'fe816f87'), PET_EGG_URL = asset('egg', '834254bb'), PET_DEN_URL = asset('pet_den', '353b08ef'), PET_ICON_URL = asset('pet_blessing_icons', 'a0c7dcac');
export const BLESSING_ORDER: readonly PetBlessing[] = ['luck', 'forage', 'farsight', 'ward', 'lantern', 'renewal'];
// The follower on the map: the still idle pose plus the walk loop, which `.walking` shows while the leader is stepping.
export const petFollowerSprite = (kind: PetKind): string =>
  `${petSprite(kind, 'idle', 'follow-idle')}<span class="pet-sprite follow-walk" data-pet="${kind}" style="--r:${petRow(kind)};--wsheet:url(${PET_WALK_URL})" aria-hidden="true"></span>`;
export const blessingIcon = (kind: PetBlessing, cls = ''): string =>
  `<span class="blessing-icon${cls ? ` ${cls}` : ''}" data-blessing="${kind}" style="--bi:${BLESSING_ORDER.indexOf(kind)};--isheet:url(${PET_ICON_URL})" aria-hidden="true"></span>`;
