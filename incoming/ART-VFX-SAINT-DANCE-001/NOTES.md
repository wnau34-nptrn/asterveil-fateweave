# ART-VFX-SAINT-DANCE-001 — R1 and R2 art handoff

2026-10-28 (Asia/Bangkok). Branch `art/art-vfx-saint-dance-001`; base `feature/fateweave-initial-prototype` at `8616ad3155a179e05210fe6aa552e6d234c9bd24`. Art only. Leave the PR open and unmerged. Both revisions are supplied for review; no owner artwork selection or motion approval is claimed.

## Delivery and provenance

The structure follows ART-VFX-ARCANE-SEAL-001 (PR89): separate transparent 256px prepare / peak / settle layers, 390px anchor storyboards, original generated source sheets, exact prompts, reproducible packaging, pivots and SHA-256 hashes. The twelve requested moves are split into `saint/` and `dance/`.

- `saint/R1/`, `saint/R2/`, `dance/R1/`, `dance/R2/`: 18 PNGs each, six moves × three beats. Total 72 layers. RGBA, straight alpha, sRGB; minimum 8px transparent outer gutter. No characters, text, HUD, atlas or runtime module baked in.
- Each family has `storyboard-R1-390.png` and `storyboard-R2-390.png`, exactly 390×1648. C/A/F are neutral caster/ally/foe diagrams, not character replacements or gameplay captures. Rounddance explicitly diagrams five allies. The diagrams do not establish HP, cooldown values, successful effects or battle results.
- Each family's `source/R1.png` and `source/R2.png` are byte-identical original image-generation results. Requested 1536×3072; actual returned 887×1774. The 3×6 source grid is recorded per cell in `layers.json`. Soft glow can touch a source-cell boundary; outputs are fitted into a new clear gutter. No boundary reconstruction or repainting is claimed.
- `generation-prompts.json`: exact four prompts, tool, transparency setting and original paths. `package.py`: mechanical cell crop, alpha-bounds fit, proportional downsample and padding, plus diagram composition. No hue replacement, alpha threshold, stock art or reference-pixel copying. Source originals remain untouched. Storyboards may mirror link/step artwork for the depicted left/right formation; delivered layers retain original orientation.
- `layers.json`: source hashes/dimensions, source rectangles, output hashes, alpha bounds, suggested pivots, anchors and relative phases. `SHA256SUMS`: every delivered file except itself; its own bytes are verified against the remote Git blob after push.

All paintings were generated originally for this task using `image_gen.imagegen`. No external artwork, game art, real-world insignia or religious symbols were supplied as image references. ARCANE-SEAL's notes and manifest were read for packaging conventions only. AGENTS.md and CLAUDE.md were read first; no nested instruction files exist in the base tree. The explicit folder-only restriction supersedes shared `docs/handoffs/` edits, so this is the Codex-to-Claude handoff.

## Visual alternatives

**Saint — Metta / Thiran:** amber-gold and ivory cores, warm ochre fringes, light threads with small luminous endpoints. No mint/green healing wash. R1 uses soft round curls and fine trailing ends. R2 uses stronger rays, more angular vow geometry and clearer edges. Saint's distinguishing cue is a causal foe-to-ally transfer for Saintstrike/Lastlight, not a general healing aura.

**Dance — Lalin / Wila:** rose/pink ribbons, pale blush edges and separate petals. R1 is slender and flowing. R2 is broader, brighter and more swept. Keep the pink pigment visible; additive stacking can turn both families white. Dance has no damage impact except Echofoot. Cadence's hollow curl is a cooldown-restoration cue, not a heal. Do not display HP recovery for it.

## Anchors, sequence and timing

The three beats are art-direction phases within the existing presentation duration: prepare 0–25%, peak 25–65%, settle 65–100%. These are not new millisecond timings or rules. Fit them to the actual contact/event instant and preserve existing normal/fast total durations. Lastlight's burst should occupy only the beginning of peak (roughly 8–12% of the existing total); let its thread settle carry the remainder. Reduced motion: one restrained static peak, with a short static transfer link where required to explain an actual heal; no traveling particles or repeated flashes.

Hand = rendered release point. Centre = lower torso/waist, below faces. Feet = rendered sole contact, following the current pose. Pivots are normalized suggestions inside each padded canvas, not battle coordinates. Manifest pivots use centre `[.5,.5]`; low floor forms use `[.5,.76]`. Check exact visible contact during integration rather than placing at fixed formation coordinates.

| Move | Prepare → peak → settle | Suggested canvas at 390px |
| --- | --- | --- |
| saintstrike | Gather at caster hand → one compact gold contact at struck foe → fine thread from that foe to the ally actually healed. The settle endpoint is a small warm glow, not a second hit. | 36–44px / 58–72px / link span between real endpoints |
| communion | Gather at caster hand → shared paired glow between two actual allied recipients → soften both endpoints together. No foe contact. | 36–44px / real link span / 70–85% peak opacity |
| saintarc | Hand crescent → one sweeping arc across affected front-row positions and one contact per actually struck foe → fading low arc. No back-row decoration. | 40–50px / row span with 24–34px contacts / row span |
| vowstrike | Hand gathers geometric light → heavier gold contact backed by abstract vow seal at foe waist → seal fragments taper away. No status label unless an actual event provides one. | 42–50px / 72–88px / 54–68px |
| sharewound | Gather on caster → split light joining caster and the actual linked ally → both branches fade. No offensive starburst or implied extra ally. | 36–44px / link span / link span |
| lastlight | Hand gathers → one large but brief burst on one struck foe → fading fan from that foe to actual healed allies. Avoid a screen-wide flash. | 44–54px / 86–104px / real endpoint spans |
| cadence | Hand curl → ribbon swirls around the one ally whose cooldown was restored → the open curl clears into petals. Display actual restored cooldown through existing UI only. | 34–42px / 64–80px / 48–64px |
| duet | Gather two strands → two distinct ribbons connect caster and actual allied target → two loose tapering strands. No impact. | 34–42px / link span / link span |
| rounddance | Hand gathers petals → low circle around the whole actual allied team → separated petals recede. Rear rim behind feet, narrow foreground rim only. | 36–44px / allied footprint / same footprint |
| deepbeat | Quiet preparation → low pulse ring at one ally's soles → one fading ring. Never a torso explosion. | 30–38px / 58–76px wide, 20–30px high / smaller low ring |
| echofoot | Caster foot gathers step curl → step echoes travel to one actual foe → one small contact, then petals. Echo trail is decorative, not multiple hits. | 34–42px / actual foot-to-foe span / 26–38px contact |
| closingstep | Gather on caster → upright closing flourish blooms from caster soles → petals rise briefly and fade. No offensive contact or heal number. | 34–42px / 68–84px / 48–64px |

## Assembly details for Claude

These are flat painted components. Depth masking, endpoint attachment and per-event routing belong to integration. Protect faces, real HP/name/status labels, neighboring actors and the command area. Keep foot effects low; mask the rear half behind units. Never move a face or HP label to accommodate the art. Normal blending is the baseline.

Transfer links must join real rendered endpoints as actors recoil or change formation. A link source has decorative luminous ends, not authoritative fixed actor coordinates. Orient/fit its span along foe → ally; if the endpoints need independent motion, use the source rectangle to separate endpoint glows and the middle strand into atlas components. Do not scale a full impact to fill a long transfer span. Lastlight's source fan opens to the right; mirror it for a right-side foe linking to left-side allies, as the board does. Limit visible branches to actual recipients. The three decorative source endpoints are not a three-ally rule. Sharewound's split is two branches of one caster/ally link, not a second ally.

Saintarc's `peak` painting contains a slash and one embedded contact: use it as a local contact alternative per actual struck foe, never as a row-wide sweep plus additional contacts. For the diagrammed assembly, use `saintarc_prepare` as the continuous sweep and a small `saintstrike_peak` once at each struck foe. That avoids counting the embedded peak contact twice. The source contains no front-row targeting logic.

Echofoot R1 carries its contact into settle; R2 has a small glint in peak and a settle spark. Show exactly one contact at the real event instant, not both as repeated damage. R2 settle's spark is on the source's left: mirror it for left-to-right travel, as the storyboard does. End its glint at the struck foe, never back at the caster. For precise runtime travel/contact separation, split the source rectangle into trail and contact components during atlas assembly. All other Dance particles are support decoration.

Route only outcomes the resolver actually emitted. No transfer without a real heal; no extra target or impact on a miss, block, absent target or excluded foe. Communion/Sharewound/Duet are paired support cues; Cadence reflects actual cooldown restoration; Rounddance covers only the participating team. No resurrection, extra attack or resource change is implied by the artwork. Integration must preserve rules, balance, saves, targeting and playback timing.

## Validation and remaining work

Run `python incoming/ART-VFX-SAINT-DANCE-001/package.py` from any working directory with Pillow and DejaVu Sans installed. It validates 72 nonempty RGBA 256×256 layers, visible alpha cores, fully clear backgrounds and minimum 8px transparent gutters; builds all four 390px boards; records source/layer SHA-256; and rebuilds `SHA256SUMS`. Run `sha256sum -c SHA256SUMS` inside this folder. Exact output bytes depend on Pillow/font versions.

All four storyboards were visually inspected at 390px. They establish palette, motif, support-versus-damage intent and suggested placement only. No gameplay/browser tests or runtime motion review are claimed for this art-only task. The final scope check must show only additions under `incoming/ART-VFX-SAINT-DANCE-001/`. No `src/`, `tests/`, `public/`, `.github/` or existing art changes.

Remaining for Claude: owner revision selection, atlas/component extraction, actual-event alignment and motion implementation, then actual 390px normal/fast/reduced-motion clips for review. Passing packaging checks is not owner artwork or motion approval. No merge or publication is authorized by this handoff.
