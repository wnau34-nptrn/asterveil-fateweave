# ART-UNIT-ANIMATION-A7-001 — artwork handoff

2026-10-28 (Asia/Bangkok). Branch `art/art-unit-animation-a7-001`; PR target `feature/fateweave-initial-prototype`; pinned seed/base commit `8616ad3155a179e05210fe6aa552e6d234c9bd24`.

Four independently generated characters, 36 raw strips / 192 figures including alternatives; 30 recommended strip candidates. Actions have six frames; reactions have four. This package is for owner artwork selection. Claude owns normalization, atlas packing, event routing and in-game motion review. Leave the PR unmerged.

## Character folders

| Character | Folder | Personality expressed in body and proposed pose holds |
| --- | --- | --- |
| Metta | `saints/metta/` | Nimble, compassionate protector of wounded travellers; mobile guard, attentive palms, quick catch after hit; white beads and ivory/gold costume. |
| Thiran | `saints/thiran/` | Mature gate repairer defending camp; broad planted shoulders, practical heavy brace, deliberate wind-up and longer weight absorption; beard, green coat and brown beads. |
| Lalin | `dancers/lalin/` | Travelling performer keeping the caravan moving; buoyant crossing steps, brisk accents and theatrical fan finish; braid, coral/teal costume. |
| Wila | `dancers/wila/` | Shelter dance teacher who remembers everyone; welcoming group presentation, clear measured pivots, grounded foot placement and gentle closing bow; short dark hair, purple costume and crescent ornament. |

All four seeds are exact unmodified 512×512 RGBA crops of the pinned `public/assets/art/units_mercs.webp`, zero-based cells 6, 7, 8, 9. The atlas Git blob is `2f2ed2ebdca12584d9324c53fcc67694c68b0d22`; runtime sole reference is y=497. `seeds.json` records every crop and SHA-256. No other character's frames were substituted, recoloured or reused. Source edits reference only each character's own shipped seed. Original generated artwork; no external character assets were imported.

Each folder contains:
- `seeds/`: exact shipped seed.
- `source-sheets/`: three intact original generated PNG sheets: actions R1, reactions R1 and ambiguous-move R2.
- `raw/`: one transparent PNG per complete move strip, preserving source X positions and all retained RGBA pixels.
- `spaced/`: the same pixels arranged in 640×512 cells with wide transparent gutters. No repainting, scaling or rotation. Each figure receives only the explicit X translation needed to pad its original slot; one shared Y translation per whole strip preserves jumps, crouches and down heights. The lowest major silhouette in each strip reaches the y=497 reference.
- `preview-390.png`: nine labelled sequences at 390px width, three figures per line and approximately 100px standing height, with one shared scale per strip. Previews are static review sheets, not game screenshots.
- `prompts.json`, `strips.json`, `seeds.json` and local `NOTES.md`.

Root metadata aggregates the four folders. `moves.json` is the build input; `strips.json` records actual frame order, action aliases, frame bounds, source crop, SHA-256, preferred candidates and suggested relative pose holds. These are art handoff metadata, not runtime manifests or new timing requirements.

## Candidate choices and routing

| Class/body set | Actions | Recommendation |
| --- | --- | --- |
| Saint punch | attack, saintstrike, vowstrike | R1 per character. |
| Saint sweeping arc | saintarc | R1; a cross-front forearm sweep, not an effect layer. |
| Saint communion | communion, sharewound | R1 open-palm offering; R2 is an alternate left-side invitation. Thiran R2's clearest leftward palm is frame 5; preceding palms still face front/right. |
| Saint last-light | lastlight | R2: gathered low stance → raised gauntlet → heavy downward strike. Retain R1's heavy straight punch for comparison. |
| Dancer dance strike | attack | R1 fan-led strike toward the foe. |
| Dancer single partner | cadence, duet, deepbeat | R2, with clearer turns/invitations toward a left-side ally; R1 retained. No partner is painted into the strip. |
| Dancer circle spin | rounddance | R1, including a visible back-facing pivot before returning right. |
| Dancer echo/closing | echofoot, closingstep | R1's forward fan accent is recommended for echofoot; R2's gathered fans → high arch → bow is recommended for non-attack closingstep. They are two interpretations of this requested body set. |
| Reactions | hit, block, down | R1, four frames each. Down ends prone/unconscious and holds; never returns to standing. |

All sequences read left to right. Detailed descriptions of every frame are in each character's `strips.json` and generated table in local `NOTES.md`. Relative hold weights express Metta/Lalin's brisk accents versus Thiran/Wila's steadier phrasing. They are suggestions for pose emphasis only; do not change existing action durations, event timing, rules, saves or balance.

No healing light, readiness ribbons, auras, rings, contact flashes, projectiles, target figures or afterimages were painted into the bodies. Attached dancer ribbons are costume fabric, fans are held equipment, and Saint prayer beads remain physical accessories. Communion/share gestures are body poses only: Claude must route damage and allied healing from actual battle events, and must not invent a heal before damage. Dancer readiness gestures do not imply extra turns or SPD changes.

## Extraction and validation

Run `python3 incoming/ART-UNIT-ANIMATION-A7-001/build_handoff.py` from the repository (Pillow, NumPy, SciPy). It verifies all four seeds against the pinned Git atlas, finds the inspected major alpha components (>80, >600 pixels), assigns detached details and low-alpha edges to their nearest major figure, and isolates rows without repainting retained pixels. It asserts expected counts (24/12/12 per source sheet), fully contained silhouettes, per-character frame counts and exact retained source pixels after saving. It also produces the layout-only spaced strips and static 390px previews.

Raw figures occasionally cross nominal equal-width source slots; use the explicit frame bounds and ownership algorithm rather than a naive equal-width crop. `spaced/` supplies safe equal cells with generous transparent separation for intake. No per-frame rescaling, smoothing, recolouring or seed endpoint substitution was performed.

`validation.json` records every payload file's byte length and SHA-256 and every PNG's decoded size/mode/transparency. Its own hash is intentionally excluded to avoid self-reference. After normal Git push, `verify_remote.py` compares every package file, including the manifest itself, with the fetched branch and fully decodes the fetched PNGs. The PR records the final fetched commit and counts. This avoids the size-limited upload path that truncated A3.

## Claude handoff / remaining review

- Artwork selection is pending. Recommended candidates are recommendations, not owner approval. No runtime, browser, device, normalized-atlas or in-game motion validation is claimed.
- Check fine face/embroidery/fan grip/bead continuity against the exact supplied seeds during intake. Raw generated endpoints and sole placement are close visual matches, not pixel-identical seed endpoints.
- Use one common scale for a character's selected strips; preserve genuine airborne, crouched and prone heights. Do not stretch a downed figure to standing height. Decide endpoint seed lockback during integration.
- R2 differs in native source resolution from R1. Native pixels are intentionally preserved; choose one shared integration scale against the seed instead of scaling individual frames independently.
- Review coloured antialias edges against the real battle background; transparent pixels may contain unused matte RGB. The raw/source bytes remain untouched.
- Body sheets intentionally contain no VFX; damage/heal/readiness outcome timing belongs to the separately scoped effects and real event routing.
- Only this incoming package changes. The owner's incoming-only scope overrides the usual shared handoff-document edits; these notes carry the Claude handoff. No changes to src/, tests/, public/, .github/, existing art or shared docs. No merge or publication.
