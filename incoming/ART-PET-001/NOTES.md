# ART-PET-001 — companion concepts / owner review

Concept stage only. Six original working designs for Asterveil · Fateweave, 2026-10-22. Approval is pending. These boards are not production sprites, animation frames or runtime atlases.

## Reading the boards

- `concept_sheet.png`: **2048×1152**, left to right: meadow fox, thicket piglet, rift crystal moth; ruined-fort gargoyle pup, deep-forest lantern owl, rift-gate star-veil slime. The large views face right in front 3/4. Under each are actual **32 px and 64 px high silhouette canvases**, aligned on a common baseline. These are resampled from the same painted concept, not illustrative approximations.
- `01_…_turnaround.png` through `06_…_turnaround.png`: **1024×1024 each**. Front, right-facing side, back, left to right. Shared design identity; some side faces retain a slight 3/4 appeal at concept stage. Production orthographic construction and exact appendage registration remain for the sprite task.
- `scale_preview.png`: **1536×1152**, the same six-cell order. Each cell has a battle strip, two map patches, then a lobby strip. Inspect at 100% zoom for real sizes. Battle uses the unchanged Knight's first **512×512 atlas cell**, displayed as a **100×100 px frame**; pet art fits **52×44 px** alongside it. The legacy enemy frame is mirrored as the runtime does. Map patches use actual **48 px tiles on the left, 64 px on the right**, pets within 82% tile width and 76% tile height. Lobby checks show the same pet facing the central firepit from both sides, with only the right copy mirrored. This is a static placement study, not an in-game screenshot or implemented system.
- `concept_source.png` retains the original built-in imagegen sheet for provenance and reproducible layout. `assemble.py` only crops, rescales, makes silhouette masks, and lays out review boards. `generation-prompts.json` records the prompt set. `validation.json` records exported dimensions and placement sizes.

## Palette and readable features

Hex values are suggested production palette anchors, not a claim that these painted concepts use a fixed indexed palette.

| Pet / intended role | Palette anchors | Primary reading shapes | Idle idea | Help / perk cue idea |
|---|---|---|---|---|
| Meadow — dandelion-fluff fox kit / luck | cream `#FFF1D2`, ochre `#DFA34D`, leaf `#527636`, outline `#483429` | triangular ears, pointed muzzle, one round seed-puff tail; light body above dark feet | ear flick, one tail sway; keep root stationary | tail puffs once and releases a tiny seed arc when a luck result is confirmed |
| Thicket — moss-backed piglet / herbs and chests | cream `#F5D9B6`, clay `#CE8064`, moss `#197568`, leaf `#9BBC43`, outline `#343B30` | low oval body, broad snout, paired leaves, curled tail | snout sniff and leaf bob | sniff–turn–nose point toward a revealed find; never imply an unrevealed reward |
| Rift scar — crystal moth / fog reveal +1 | ivory `#FFF1D5`, lilac `#C796EF`, crystal light `#EBD9FF`, plum `#493266`, amber `#D4A05A` | four angular wings, furry central body, paired bent antennae | restrained wing hinge and small hover, constant centre | wings open once; a narrow lilac reveal arc follows the actual newly revealed tile |
| Ruined fort — little gargoyle pup / small shield | slate `#747184`, light stone `#B9ADB0`, champagne `#E8C583`, moss `#628144`, outline `#34323D` | chunky paws, short canine muzzle, folded buttress wings, curled stone tail | blink and a small stone ear tilt | brace paws, fold wings around chest; one short champagne shield pulse at the supported ally |
| Deep forest — lantern owl / cooldown tick | deep teal `#164B5C`, feather `#357083`, cream `#FFF0CC`, amber `#F5B641`, outline `#283B3F` | upright pear body, cream facial disc, single broad amber chest light | slow blink, tiny chest light breath | chest light brightens once and a feather sweep directs a brief amber arc to the affected ally |
| Rift gate — star-veil slime / small heal | navy `#242552`, violet `#7164C9`, veil `#C7AEF6`, mint `#7FE1BE`, highlight `#F4EBFF` | low asymmetric dome, sweeping veil crest, one mint core; no star emblem | slow squash and veil ripple | core compresses, then one mint droplet lifts toward the healed ally |

## Mobile reading and next-stage decisions

The six silhouettes separate by tail/ears, low snout/leaves, angular wing fan, paws/wings, upright owl and low veil crest. At 32 px, painted seed filaments, moss leaves, stone seams and crystal facets merge. The fox's small silhouette is particularly busy around its tail. For production, collapse its tail to one filled puff with a few edge notches; reduce piglet moss to one saddle and two leaves; use only broad crystal wing planes; give the gargoyle one light chest plate and few stone seams. Preserve the owl's cream face and chest light as two separate value masses. Preserve the slime's light rim around the navy body. None of these simplifications are approved sprite designs yet.

Keep companions below the Knight's waist in battle, outside hero tap regions, labels and status marks. Pets never enter the SPD queue and never suggest a fifth party slot. Foot baseline / hover baseline must remain stable in later animations. No painted ground shadow or target ring belongs in production pet frames; the game owns those layers. The temporary concept cutouts in placement studies are not deliverable transparent sprites and may retain fine pale fringes.

Help animation ideas above are visual proposals, not new rules or assigned numerical powers. The first three retain only their requested map perks; no unrequested combat skill was assigned. The shield, cooldown tick and heal are small deterministic round-end assists under the future pet system. Do not infer the trigger, HP result, cooldown or reward from the animation. Reduced motion should show a single static help cue and the actual state change.

## Sources, scope and verification

Read `docs/MASTER_PLAN_TH.md` (the current release-B pets paragraph; there is no heading literally named section 3), `docs/handoffs/ART-PLACEMENT-RULES.md`, `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`, and inspected the existing units, floor and decor images. Palette/material cues follow the painted heroic-chibi figures and Luminous Veil world. Only this repository's art is used for reference and review compositing.

Generated with the built-in `image_gen` tool, one initial six-pet sheet and one separate turnaround request per pet. No CLI/API fallback. Final export sizes were normalized without redrawing the concepts. Visual review checked all six identities, three turnaround views, absence of text/UI, right-facing main views, silhouette separation, and the battle/map/lobby placement study. Owner approval and production asset QA remain future work. No franchise reference was supplied or intentionally imitated.

All changes for this handoff stay under `incoming/ART-PET-001/`. No runtime, test, public asset or workflow changes. Art-only validation consists of PNG decoding, exact dimension checks, visual inspection and a changed-path audit; game tests are not needed for an unreferenced concept folder. PR targets `feature/fateweave-initial-prototype`; do not merge or deploy this concept task.
