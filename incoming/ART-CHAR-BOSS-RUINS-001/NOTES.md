# ART-CHAR-BOSS-RUINS-001

Original character art for Asterveil · Fateweave, 2026-10-22. Built-in ImageGen production; no external artwork imported. Artwork intake only; no runtime integration, merge or deployment.

## Files and mapping

- `units_ruins_boss.webp`: 1024×512 RGBA, two 512×512 cells. Column 0 `vanguard_captain`, column 1 `vargoth_hunter`; matching JSON uses x/y/w/h/footY, both footY 496 (last occupied pixel row; origin below soles 497/512).
- `portraits_ruins_boss.webp`: 1024×512 RGB, same order and JSON format. Portrait footY is carried for compatibility and does not anchor a bust.
- `vanguard_captain` and `vargoth_hunter`: individual 512×512 transparent PNG/WebP; `portrait_*`: individual 512×512 opaque painted PNG/WebP.
- `preview.png`: 390×844 artwork-only phone composition on unchanged ruins backdrop, no baked UI. Neutral upper/lower bands reserve interface space. Normal cells 100px; captain 150px for requested ~1.5× boss comparison. Hunter at right-back 85%/51% and captain right-front 70%/81% of 400px arena. This follows the handoff formation, not a screenshot of current runtime: current field-layout implementation uses two enemy rows around x80% and can choose different responsive sizes.
- `review.png`: transparent-edge review on gray, 40px portrait samples and 64px cell silhouettes.
- `validation.json`: source generation filenames, actual alpha bounds, byte totals and SHA-256 of five unchanged reference assets.
- `package.py`: deterministic Pillow sizing/packing/review script. Requires the session-local ImageGen originals listed in validation.json; PNG/WebP deliverables are self-contained.

Intake mapping: encounter `vanguard-captain` currently uses `brute` for captain/front and `raider` for hunter/back. Add encounter-specific art references during a separate developer intake; do not globally replace legacy Raider/Brute or the prologue Vargoth Guard. Both delivered frames and portraits already face LEFT; no horizontal flip needed.

## Design and style review

Captain: broad horned officer helmet, oversized head, stubby armoured legs, cleaver, violet-black plate, ember-orange seams and gold rank accents. Heavy silhouette supports Crushing Blow; glowing helm/plate provides War Cry energy identity without baking an effect into idle art. Hunter: smaller horns, pointed ears, short dark hair, light violet-black leather, twin knives, orange eyes and seams; no gold rank trim. Shared top-left warm rimlight and clean dark outlines/cel gradients match the foes reference. Original designs, no gore, text, ground, rings or baked shadows.

Known visual differences: captain has a sterner angular face than the softer hunter; metal highlights are warmer than the violet crystal foes. Portrait eyes land closer to the middle than the ideal 40% line; inspected at 40px and remain readable, but circular-crop positioning may merit intake adjustment. The boss scale in preview deliberately demonstrates the requested 1.5× ratio; the documented responsive phone runtime may render it closer to 120px. This package does not claim owner style approval.

## Generation prompt set / provenance

Built-in ImageGen, not API/CLI. Existing foes/portraits were inspected as style references only. No source asset was repainted. Production prompts:

1. Captain: original full-body heroic chibi demon officer, violet-black plate, restrained ember cracks, gold officer accents, horned helm, broad cleaver, three-quarter LEFT, clean outlined cel shading/soft gradients, warm top-left rimlight, transparent background, complete body with padding; no ground/shadow/rings/text/UI/particles/companions. Initial long-legged draft rejected.
2. Captain correction: edit original captain only to 2.5–3-head chibi proportions, larger helm/head, broad compact torso and much shorter stubby legs; preserve identity/colours/cleaver/facing/light and transparency. Selected output recorded in validation.json.
3. Hunter: original 2.5-head chibi skirmisher, ash-mauve skin, dark swept hair, short horns, pointed ears, orange eyes, violet-black leather/scarf and ember seams, twin short knives, LEFT stance, no gold; same rendering/light and transparent isolation constraints.
4. Captain portrait: referenced selected full-body identity; square head/shoulders LEFT bust, face upper-middle, orange eyes, matching helm/pauldrons, warm rimlight, soft painted violet/ember opaque background, no text/border/UI.
5. Hunter portrait: referenced selected full-body identity; square LEFT head/shoulders, matching hair/horns/ears/scarf/armour, soft painted violet/ember opaque background, same rendering/light, no gold/text/border/UI.

Only non-painting export operations followed generation: alpha-bounds trim, uniform Lanczos resize, transparent canvas placement, WebP quality 85, atlas packing, preview compositing. Generated alpha retained; no background removal or synthetic alpha masks.

## Validation

- [x] Two 512×512 full-body RGBA frames; no frame-edge contact, footY 496.
- [x] Both LEFT-facing, no shadows/ground; two matching opaque square busts.
- [x] Two-column atlases and matching JSON, with individual PNG/WebP copies.
- [x] Visual inspection of selected sources, exported review and 390×844 preview; distinct 64px silhouettes and readable 40px portraits.
- [x] Runtime atlas total ~196KB; all WebP copies ~391KB, below 2MB. Exact regenerated totals in validation.json.
- [x] Existing references unchanged versus Git HEAD blobs; SHA-256 recorded in validation.json. No source/tests/public/workflow or existing art edits.
- [x] Latest base fetched before packaging; branch rebased onto it. Draft PR only; do not merge.

Ready for Claude Asset Intake Review.
