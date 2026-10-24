# Asset Intake Review — ART-CHAR-NPC-001 (living camp NPCs)

Source: draft PR #7 (`art/art-char-npc-001`), package `incoming/ART-CHAR-NPC-001/`. Reviewed 2026-10-16; owner approved integration the same day.

**Status: ACCEPTED_WITH_TECH_FIX** (fixes are integration choices; no Codex revision needed).

## Checks

- Scope: only `incoming/ART-CHAR-NPC-001/` added; the eleven protected runtime hashes are unchanged.
- Six NPC atlases at 2048×1536 (4 × 3 frames of 512 px), stations and busts at 1536×1024; runtime total 2,027,196 bytes (budget 2.4 MB).
- Baselines: measured independently. The lowest opaque row is y = 496 in every one of the 66 frames, so loops do not bob.
- Style and identity: matches the heroes' chibi line weight and warm rim light; each NPC stays on model across idle, work, greet and cheer.
- Silhouettes are clearly civilian and distinct from all ten mercenaries. No text anywhere (seals, stones and shapes only). Every frame faces right and reads when mirrored.

## Notes and integration fixes

- The smith's work frames have a flat-cropped sole edge; invisible at the in-game size (≈90–175 px).
- WebP quality 68 softens fine texture slightly; acceptable at the in-game size.
- The review mocks assumed the old banded lobby. The live lobby is a full-screen scene, so the staff were re-placed in code: a back row near the tents (left: smith, keeper, trainer; right: broker, herbalist, scout, mirrored), stations beside them on wide screens and hidden below 760 px.

## Integration

- `public/assets/lobby/npc/`: six atlases, stations, busts.
- `game/visuals/assets.ts`: `NPC_IDS`, atlas, station and bust URLs.
- `ui/lobby-ui.ts`:
  - drawings sit inside the aria-hidden scene, behind the members;
  - accessible ≥44 px tap buttons sit in the HUD at the same spots and open the NPC's service (the trainer and keeper open for the first deployed member);
  - idle plays by CSS, and one NPC at a time switches to work;
  - an NPC greets when its sheet opens and cheers on a success (hire, talent, equip/salvage, forge, brew);
  - reduced motion shows the still idle frame.
- Service sheets open with the NPC's bust and a rotating live Thai line (`ui/th.ts` `npcText`).

## Screenshots

`camp-npcs.png` (desktop), `camp-npc-sheet.png` (the smith greeting with the forge open), `camp-npcs-phone.png` (390×844).
