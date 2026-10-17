# Asset Intake Review: ART-STORY-PROLOGUE-001 (Vargoth and the prologue scenes)

- **Source:** draft PR #9, branch `art/art-story-prologue-001` (commit 895157b), package in `incoming/ART-STORY-PROLOGUE-001/`.
- **Status:** ACCEPTED (2026-10-16).

## Checks

| Check | Result |
|---|---|
| Vargoth full | 1024×1024 RGBA, faces LEFT, `footY` 1000, figure 85% of frame height, transparent with no ground or shadow |
| Design | Original heroic-chibi demon chief: horn crown with violet crystal tips, cracked black-stone armour, tattered cloak dissolving into rift light, low crescent glaive. Clearly distinct from the brute, golem, weaver and sentinel (see the lineup sheet) |
| Bust | 512×512, crops cleanly to a circle down to 40 px |
| Scenes | `story_awaken`, `story_rift` and `story_retreat`, each 1920×1080: the same ruins as `ruins.webp`, the rift inside the centre 9:16 slice, a calm floor in the lower third |
| Imagery and text | No veil or barrier imagery and no text |
| Budget | Runtime total 1,508,462 bytes (budget 1,600,000) |
| Existing art | Protected source hashes unchanged |

## Integration

- Files: `public/assets/story/*.webp`, read through `storyArt` in `game/visuals/assets.ts`.
- `StoryPanel.scene` picks the painted backdrop:

  | Scenes | Panels |
  |---|---|
  | awaken | prologue 1–2 |
  | rift | prologue 3–4 |
  | retreat | the closing pair |

- Vargoth's lines show his full figure (right of centre on wide screens, centred on phones) and his bust in the speaker line. The code-drawn rift and the sentinel silhouette are gone.
- Screenshots in Chromium: 1366×1000 (scenes 3 and the closing scene) and 390×844 portrait.
