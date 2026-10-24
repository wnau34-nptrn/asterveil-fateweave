# ART-VFX-BLADE-001 — shared sword / thrust family

Generated with the built-in ImageGen tool on 2026-10-23 for Fateweave. Original effect-only artwork, no sibling-project assets or supplied concept sheets. Owner artistic approval is pending review of the runtime clips.

R2, 2026-10-24: the owner rejected the light/thin appearance of all ten blade-family skills and explicitly limited this revision to that family. Built-in ImageGen edited the shared atlas into broader, more opaque painted ribbons, wedges and contact cores (`prompt-r2.txt`). `generated-v1.png` preserves the previous source; `generated.png`, `png/`, `preview.png` and the runtime atlas now hold R2. The source remains 1254 square and the atlas remains 1056 square. Runtime ribbons are 25% larger, smaller skill variants are strengthened, and a separate time-based frame progression keeps the peak fully opaque until 52% of its 350ms visual lifetime. The dissolve still finishes inside the unchanged actor stage. No extra hits or particle counts, no changes to Bolt/Execute/Ward.

- `generated.png`: untouched generated RGBA source, 1254 × 1254 (requested 1024 square; actual output measured).
- `png/`: 16 transparent 256px cells, proportional source quarters uniformly resampled; no background removal, painted substitutes or recolouring during packaging.
- `preview.png`: labelled navy inspection sheet, excluded from runtime.
- `package.py`: reproducible Pillow packaging. Runtime `public/assets/fx/blade_fx.webp` is 1056 × 1056, quality 88, straight alpha, 4px gutters around 256px cells; `blade_fx.json` is Phaser atlas JSON.
- Rows: four slash phases, four thrust phases, four contact phases, then glint / flecks / deflect / pass. Slash is one continuous cut; thrust one point; flecks never represent additional hits.
- Neutral pearl/ivory and cool silver painted edge, restrained glow. Normal alpha blending preserves brushwork. Runtime multiplication uses icon palette families: Knight gold, Duelist rose, Scout cool blue, Spear teal; other classes' basic attacks share their icon palette. Class palettes are in `bladePalettes`, skill proportions/directions/fleck counts in `bladeSkills`.
- Effects use actual body anchors, CSS-pixel slot scale and real recipient IDs. Full block is a pearl deflection on the incoming edge; partial block adds that deflection to the HP hit; Dodge is an off-body passing wisp. Parry stance is a glint; only matching resolved Parry + counter events draw a riposte. Reduced motion uses one still, with no tweens; reduced intensity omits flecks.
- All family tweens target owned images, so scene cleanup cancels them. No delayed calls or detached tween counters. No rule, save, content balance or playback timing changes.

Generation prompt is preserved in `prompt.txt`. Packaging and the navy preview were inspected separately from runtime visual review. Clips and validation notes: `docs/combat-presentation/blade-slice/README_TH.md`.
