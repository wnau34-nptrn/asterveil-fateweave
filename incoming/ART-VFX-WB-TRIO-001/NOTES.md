# ART-VFX-WB-TRIO-001 — world-boss VFX

Original VFX paintings for Kragmor / Valdrakk / Morvane, art-only. Base game `eb0d60b7284300bcc1872172da89b6c0a1a14f5b`, branch `art/art-vfx-wb-trio-001`, PR into `feature/fateweave-initial-prototype`, **do not merge**. All repository changes stay in this package. No runtime/atlas/rules/save/content numbers/playback timing/status documents/existing art changed. No body art generated; body poses, hero, minions and backdrop are read-only references from this repository and the specified art commits.

**Owner artwork selection and real in-game motion approval are pending.** These are illustrative boards, not runtime captures. Passing integrity/mask checks is not visual approval or proof of runtime anchor behavior.

## Delivery

- `layers/`: exactly **13 moves ×3 beats =39** primary PNGs, 256×256 straight RGBA, true alpha, ≥12px clear border. One default final design per move. Normal blending; no additive requirement.
- `alternatives/wing-gathering-r2/layers/` and `alternatives/call-the-court-r2/layers/`: 6 additional R2 layers. **Choose one design per move; do not stack R1 and R2.** R1 is recommended, owner decides.
- `storyboards/<move>-390.png`: 13 primary three-beat boards plus2 R2 boards. Navy/riftline staging and original bright gold-armour hero; actual release/hold body pose in the peak panel. All-side moves show5 representative heroes, one small instance for each fixture-affected hero. These are placement studies, not formation or gameplay changes.
- `storyboards/contrast-<boss>-390.png`: every beat at suggested canvas widths, fully visible on navy and the original gold shield/armour crop, normal alpha blending. `storyboard-audit.json` includes contrast pixel deltas, not a fabricated WCAG score or visual approval.
- `storyboards/telegraphs-390.png` / `preview-390.png`: ordinary action key / breakable key / rigid unstoppable-release key, all80px, navy and gold.
- `preview-peaks-390.png`: all13 primary peaks at their proposed canvas widths, navy normal blend; R2 choices are in the comparison boards separately.
- `storyboards/waiting-holds-390.png`: actual hold-selection examples with the charge body poses and masks. `severing-vs-lash-390.png`, `court-vs-rift-390.png` and `wing-gathering-variants-390.png` compare silhouettes and alternatives.
- `layers.json`: 13 primary moves,2 alternatives,45 layer records with checksum, crop/transform, route/flags, pivot/anchor/offset, proposed widths and masking results. `production-sources.json` records selected sheets and mechanical processing; `generation-prompts.json` retains every exact prompt and ordered references. `prompts.json` is its index.
- `source/` is the **raw generator output location**, following ART-VFX-BOSS-SIGNATURE-001: all18 outputs retained every byte, including rejected iterations. Do not overwrite. `selected` means the production source chosen by Codex, never owner approval. No numeric RNG seed is exposed by the tool.
- `seeds/` + `seeds.json`: exact boss seeds from commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf`, old style layers, original hero/minion/backdrop references, release/hold frame crops and provenance. Seed plus2 old effect layers were attached on every generator call. Pose crops are review/anchor references, not new bodies or unapproved game imports.

## Routes and anchors proposed

| Move | Route | Prepare | Peak / settle |
| --- | --- | --- | --- |
| Titan Gathering | charge, zero damage | caster.forward_chest; ordinary open curves | caster.chest; compact stone core / sparse chips |
| Mountain Fall | single, unstoppable | caster.forward_chest; rigid toothed brackets | actual target.feet; downward compression / crystal dust |
| Rift Quake | all, normal | caster.feet | one fracture piece per actual target.feet |
| Fault Awakening | caster phase, zero damage | caster.forward_chest | caster.chest; five stone crown prisms |
| Wing Gust | single | caster.wing_base | actual target.chest; three curved feather cuts |
| Wing Gathering | charge, breakable, zero damage | caster.left_shoulder_core | same core; fragile cracked shell, R2 feather folds |
| Worldshard Dive | all, normal | caster.wing_base | one oblique feather-shard wedge per actual target.chest |
| Sky Rend | caster phase, zero damage | caster.upper_back | same upper-back point; airy seven-feather fan |
| Severing Bolt | single | caster.lower_hands | actual target.chest; narrow straight filament |
| Fate Lash | single | caster.upper_hands_safe | actual target.chest; thick curved thread lash |
| Call the Court | summon, zero damage | actual restored slot.chest | same restored slot; hand R1 / cloth plume R2 |
| Shadow Tide | all, normal | caster.feet | one low cloth wave per actual target.feet |
| Severed Crown | caster phase, zero damage | caster.forward_chest | caster.chest; broken gold crown/thread arc |

Centre pivot `[128,128]`; feet layers `[128,210]`. Mountain Fall prepare is a chest warning, **not** a ground-pivot layer; its peak/settle are ground layers. The proposed Shadow Tide feet route keeps the low wave below the body and labels. No floor plane or floor-ring summon is painted.

Suggested canvas widths at390px: ordinary prepare80, single/phase peak130, settle60; charge peak110/settle54; all-side peak74/settle42 per affected hero; summon64/78/40 for smaller restored slots. Actual painted width is recorded from alpha bounds in `visible_width_390`. Settle also has a smaller160px maximum motif extent within its256 cell, so it recedes rather than becoming another hit. These are art placement proposals, not gameplay or playback timing changes.

`caster.forward_chest` means chest−60px horizontally for the216px world-boss review cell; that offset is already part of the anchor, **not a second offset to add**. Wing Gathering adds12px toward the rear from the near-left shoulder core, keeping the fragile rim away from Valdrakk's forward/lower head. Wing Gust / Dive prepare use proposed wing-base seed point `(485,475)`; Sky Rend uses upper-back `(600,400)`. Morvane lower hands use `(530,510)`, overhead-forward safe thread point `(200,165)`. Exact fixture definitions are in `layers.json.anchor_definitions_390`. These coordinates need real renderer attachment review by Claude.

Peak boards use the delivered move pose. For chest-only phase/charge effects, the fixture finds a cyan-weighted centre within a restricted body ROI; this is a review coordinate, **not an engine socket measurement**. Face masks are manually reviewed conservative rectangles for the actual seed/pose. Never mirror a boss/hero seed. Only Rift Quake peak VFX is mechanically mirrored, recorded in its transform, so the generated right-leading fracture ridges propagate toward hero-left.

## Waiting-turn semantics

Titan Gathering's own open-curve prepare is the **ordinary gathering action/key**. Its actual following release is unstoppable **Mountain Fall**, so during that real wait use `layers/mountain-fall-prepare.png` as the rigid warning. Do not imply the zero-damage gathering action itself gained unstoppable status.

Wing Gathering is explicitly **breakable**: hold its fragile cracked-shell prepare (or the chosen R2 feather version). Do not substitute a normal smooth arc merely because the following Worldshard Dive is normal. The three silhouette keys differ by form, not colour alone: flexible open wisps/stones; brittle curved plates with a bright jagged missing section; heavy angular brackets with offset teeth and a clear middle gap. Rigid brackets do not rotate. Reduced motion uses a static hold. Clear holds on actual release, interruption, death or intent replacement. No extra turn or damage from the hold.

R1 recommendation: Wing Gathering shell has the more obvious broken negative-space seam at80px. R2 feather folds are closer to the wing material but the fracture is finer. Call the Court R1 reaching hand communicates restoration more directly; R2 cloth plume is the supplied alternative. Both summon designs differ from the old pointed upright Call the Rift portal. Severing Bolt is narrow/straight; Fate Lash is thick/curved. Owner chooses the designs.

## Masks, contrast and limits

Only the **effect overlay** is stencilled around actor faces and HP/name/intent rectangles; original sprites and text are never erased. Every board records its protected rectangles, pre-mask overlaps, unique removed-pixel count/fraction, per-kind counts (which may double-count shared regions), and residual overlap. The47 panels include45 three-beat panels and2 actual-hold panels. `validation.json.mask_totals` summarizes the real counts; residual overlap is zero **after** these stencils. This is not a claim that the unmasked art naturally avoids every protected region.

Call the Court's lower row is explicitly a restored-slot **detail view, not field formation**. In the fixture only f2 and b2 were fallen/restored; f3 was already standing and gets no VFX instance. Existing crawler/wisp sprites are used. All-side fixtures instantiate one small effect per listed actual fixture target; single-target scenes affect only H1; charge/phase/summon scenes do not invent hero impacts. These fixtures do not simulate resolver outcomes or prove in-game event dispatch.

Reviewed normal-blend navy/gold contrast at native390px. Source viewer grey/coloured fringe was checked against real alpha; low-alpha residue is not treated as an opaque background. Normalization clears only alpha≤8 and hidden RGB, proportionally fits each complete motif around the recorded pivot, and adds transparent padding. No recolouring, keyed background removal, painted repair or additive blending. Source bytes remain untouched. Ground contact/pivots are proposals: Mountain Fall peak uses source `(1104,553)`; other low motifs use the lower footprint point. `--verify` reconstructs all45 layers and all15 three-beat boards plus held cues.

Rejected iterations remain in source: first Mountain Fall had a cropped tall peak and broad halo, replaced by R2 bounded compression; first Wing Gathering R2 had more low-alpha residue, replaced by a cleaner whole-row edit; first Severing Bolt prepare was too faint at80px on navy, replaced by R2 brighter inner edges. No rejected source is an extra integration candidate. Generator requests used one complete three-beat row per design; exported beats remain independent files.

## Rebuild / verify

Use Python3 with `requirements.txt` (Pillow12.3.0, NumPy2.2.6). From repository root:

```sh
python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py
python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py --verify
git fetch origin art/art-vfx-wb-trio-001
python3 -I incoming/ART-VFX-WB-TRIO-001/build_handoff.py --git-ref FETCH_HEAD
```

Rebuild uses fixed source/seed files and exact recorded processing, no image generator call or network/font fetch. Rebuild after any script/notes edit. `--verify` checks exact file inventory, bytes/SHA-256, full PNG/WebP decode,45 layer dimensions/alpha/margins/checksums, source-to-layer pixel reconstruction, storyboard pixels/masks and actual-instance lists. `--git-ref` reads actual Git blob bytes and checks the fetched tree and manifest, not just the working tree. Manifest self-hashing is excluded; exact `validation.json` SHA is recorded in PR and compared separately after fetch. Normal git push, fresh clone without object alternates, full decode and SHA comparison of every file including manifest are required before handoff is complete.

## ฝากถึง Claude

- ยังไม่เพิ่ม atlas/registry/runtime ในงานนี้ ต่อ `boss_signature_fx` / art JSON ภายหลัง ตรวจ actual face/name/HP/intent bounds ต่อ pose/formation/resize/shake/normal/fast/reduced-motion แล้วทำคลิป390px ให้เจ้าของอนุมัติ อย่าถือว่า mask ของภาพตัวอย่างคือ runtime protection ที่มีอยู่แล้ว
- ชื่อ13ท่าและ charge/all/unstoppable/breakable/phase/summon ตรวจจาก catalog จริงแล้ว ไม่มี VFX ใหม่ของ Stone Fist / Boulder Hurl / Shard Talon / Six-Hand Rend / Staggered
- **Call the Court เป็น summon intent ปกติ** ด้วย actual summon events ไม่ใช่เฉพาะ phase: branch summon ใน `boss-signature-fx.ts` ปัจจุบันยังผ่านเงื่อนไข phase ของชุดเก่า ให้ผูกผลเรียกคืนจริงโดยไม่ให้ phase gate เดิมกลืน cue และไม่วาดให้ช่องที่ยังยืนหรือไม่ถูกเรียก
- `ChargeHold.kind` เดิมมี normal/unstoppable ให้เพิ่มการเลือกภาพทำลายได้จาก `intent.breakable` จริง ไม่ทำให้ Worldshard Dive กลายเป็น unstoppable เมื่อ charge ถูกตัดให้ล้าง hold ทันที Staggered ใช้ร่างกายอย่างเดียว ไม่มี VFX ใหม่
- ใช้ peak/settle ที่ฮีโร่ที่โดนจริงเท่านั้น ท่าทั้งทีมใช้ instance เล็กต่อเป้าหมายจริง ไม่มี blanket เต็มจอ Phase/charge/summon ไม่สร้างดาเมจ/ตัวเลข/สถานะหรือเป้าหมายใหม่ ท่า single/ground ยึดเป้าหมายที่ resolver เลือกจริง ไม่เดาช่องเอง
- Width/offset/ROI ในแพ็กเป็นข้อเสนอภาพ ให้ตรวจจุดยึดกับ renderer จริงโดยเฉพาะหัวต่ำของ Valdrakk และ Morvane ลอยไม่มีเท้า ส่วน VFXที่ target.feet ยึดเท้าฮีโร่ ไม่ใช่ปลายผ้าบอส คง rules/save/content/balance/playback timing เดิมทั้งหมด
- R1/R2 ให้เจ้าของเลือกหนึ่งแบบต่อท่าและอนุมัติ motion จริง ผล CI / SHA / mask / ความเห็น Codex ไม่ใช่การอนุมัติของเจ้าของ
