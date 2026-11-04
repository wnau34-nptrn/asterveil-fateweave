# ART-CHAR-CLASS-NEW-003 — แก้สัดส่วนเคล (ก่อนทำชุดท่า A12)

Claude 2026-11-04 · สถานะ: **เขียน prompt แล้ว** · ที่มา: เจ้าของบอกว่า “ตัวเคลมันดูสเกลต่างกับตัวอื่น”

## ผลตรวจ

- `incoming/ART-CHAR-CLASS-NEW-002/validation.json` วัดหัวเคลได้ 162px (hair_top_y 47 → chin_y 208) ผ่านเกณฑ์ 145–165 แต่ y47 เป็น**ยอดมวยผม** ไม่ใช่ยอดศีรษะ
- เมื่อตีเส้นทุก 20px บนภาพ 512 พบว่ายางรัดมวยอยู่ราว y100 และกระหม่อมจริง (ไม่นับมวย) อยู่ราว y95–105 หัวจริงจึงสูงประมาณ 105–115px ส่วนวินน์วัดได้ 157 และแอสทริด 159 (ไม่นับฮู้ด) อัตราส่วนหัวต่อตัวของเคลจึงราว 0.25 ไม่ใช่ 0.36 ที่รายงานไว้
- ใน `review/lineup.png` (สเกลเดียวกัน) หน้าเคลเล็กกว่าคอริน/วินน์ชัดเจน แขนขายาวแบบสัดส่วนคนจริงกว่า และท่ายืนย่อกว้างทำให้ลำตัวเตี้ยลงอีก เลยดูเหมือนต่างสเกล
- สรุป: ต้องวาดเคลใหม่ให้เข้าสัดส่วน chibi ก่อน แล้วจึงใช้เป็น seed ของชุดท่า A12 ส่วนวินน์/แอสทริดใช้ต่อได้

## กล่อง prompt สำหรับ Codex (คัดลอกทั้งกล่อง)

```text
CODEX HANDOFF — ART-CHAR-CLASS-NEW-003 (art only) · Kael proportion fix
Asterveil · Fateweave: redraw ONLY Kael's static battle unit (and matching portrait if the face changes) so his head and proportions match the cast

Read AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md, docs/handoffs/CODEX-KAEL-SCALE-FIX-TH.md and incoming/ART-CHAR-CLASS-NEW-002/NOTES.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype (not main). Create branch art/art-char-class-new-003. Add files only under incoming/ART-CHAR-CLASS-NEW-003/. Do not change src/, tests/, public/, .github/, existing art or earlier incoming folders (ART-CHAR-CLASS-NEW-002 stays as it is). Open a PR into the base branch; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond.

PROBLEM: incoming/ART-CHAR-CLASS-NEW-002/unit/kael.png (sha256 cff332c889f5c677a8e7aef7d6b1bd1a75d899a8e342facabb27f233f80ed0d2) passed the 145–165px head check only because hair_top was measured at the topknot tip (y47). His real skull crown is near y95–105, so the head (crown → chin, topknot excluded) is only ~105–115px and the head/body ratio is ~0.25. In review/lineup.png his face is clearly smaller than Corin, Wynne and Astrid and his limbs read as adult-proportioned, so he looks like a different scale.

GOAL: the same Kael (same design, palette, topknot, wraps, gold sash, leg wraps, sandals, open-palm low guard) redrawn in the cast's chibi proportion:
- head measured from the SKULL CROWN (hair mass on the scalp, NOT the topknot) to the chin: 145–160px; the topknot sits on top of that and may add ~30–45px
- skull crown → sole 425–445px, head/body ratio (skull crown basis) 0.33–0.37; face, eyes and hands sized like Corin (metta) and Garran at the same scale
- a slightly less deep stance than NEW-002: feet still wide, knees bent, but the hips higher so his body is not shorter than the other front-row allies; he stays the broadest silhouette
- 512×512 RGBA, facing right, real alpha, no shadow/energy/text, both soles touching y496 (pivot (0.5, 497/512)); topknot tip ≥ y30 and everything fits in the cell (scale the figure as a whole; never shrink the head to make room)
- portrait: only regenerate portrait/kael.png if the face changes; it must match the new unit

REFERENCES to attach: the NEW-002 kael unit + portrait (identity), the Corin cell from public/assets/art/units_mercs.webp (cell map in src/game/visuals/assets.ts) and Garran (units.webp) for proportion only — do not copy their costume or pose.

MEASURE AND REPORT in validation.json: skull_crown_y, topknot_top_y, chin_y, head_height (crown basis), crown_to_sole, ratio, foot contact columns at y496, bounds; and run python3 scripts/unit-anatomy-audit.py comparing the new kael.png with Corin and Garran (report the numbers; inspect by eye and say so). Deliver review/lineup.png like NEW-002 (all 12 current allies + Kael-new + Wynne + Astrid at 115px on the forest battle background, with guides at Garran's hair top and chin, plus black silhouettes) and review/kael-before-after.png (NEW-002 vs NEW-003 at the same scale).

DELIVERABLES: unit/kael.png, (portrait/kael.png if changed), sources/ (untouched generator outputs), prompts.json (exact prompts, references, generation ids — no base64 in JSON), validation.json + SHA256SUMS, review/, NOTES.md (Claude handoff), package.py, verify_remote.py. Push with normal git, fetch back, verify every SHA-256 and decode every image with Pillow. Owner visual approval is required; these checks and CI are not approval. No merge, no runtime integration, no rules/content/save/balance changes. After the owner approves, ART-UNIT-ANIMATION-A12-001 uses this kael.png as Kael's seed.
```
