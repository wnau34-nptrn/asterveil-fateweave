# ART-CHAR-CLASS-NEW-001 — owner selection package

Original concept artwork for Asterveil · Fateweave and the ค่ายทหารรับจ้าง. Created 2026-10-23 with built-in image_gen. No external game artwork, named-artist imitation or imported character designs. No element system: palette and light indicate costume, inner energy or mechanics only.

Base: `feature/fateweave-initial-prototype` at `93125f1898fa69fb24b03fa07232210e1f4f9e92`. Delivery: `art/art-char-class-new-001`. Concept only; owner chooses A/B and names. Claude designs skills later. No skill numbers, gameplay rules or runtime assets changed.

## Review

Each numbered folder has `concept_A.png` and `concept_B.png`: front, right-facing three-quarter, back silhouette, face, prop callouts and six palette swatches. The seer A board is identified by its folder/file name. Back silhouettes are shape studies; some retain faint construction detail. Generated board labels are presentation text, not game copy.

Option A only: `unit_A.png` (512×512 RGBA), `portrait_A.png` (512×512 circular RGBA crop), plus actual-size `unit_A_115.png` and `portrait_A_40.png`. `unit_A_source.png` retains the original transparent generation for reproducibility. These are static concept tests, not production-ready sprites or new atlases.

Unit contract: frame-local footY=496, visible sole ends at y=496 inclusive; runtime origin=(0.5,497/512), horizontal frame center x=256. Art fits a 480×460 bounding box with transparent padding. No ground shadow is baked into units. Portrait crops come from the option A face closeups, with a circular alpha mask; no new portrait identity was invented.

`review/lineup.png`: ten unchanged current atlas frames in order Aegis, Lyra, Eira, Seren, Garran, Mira, Toma, Sefa, Brann, Lio, then five A tests in folder order. Full frames rendered at exactly 115×115, common foot line, followed by same-scale silhouettes. Original first-four anchors follow runtime origin=1; mercenaries and new tests use 497/512. Existing atlas boundary specks remain visible and are not new artwork.

`review/lineup_390.png`: 390×844 review mock, 390×480 battlefield, 115px frame size (the 390px width cap floor(390×.295) in current field-layout). Four new A tests active: Seer/Hexer at back, Martial Artist/Saint at front; four existing allies face them only as scale references, not a proposed encounter. Dancer A appears in a reserve audition inset at the same 115px frame size. All five circular portraits are shown at 40px. This is a composited art review, not a live game screenshot or a five-unit formation. No UI implementation is included.

## Style review

Reviewed against incoming/ART-CHAR-MERC-ENEMY-001/mercs, NOTES.md, STYLE_CHECK.md, PROMPTS.md and runtime units/portraits atlases. Large expressive heads, compact chibi bodies, dark contours, cel shading softened with painted gradients, saturated non-neon accents and warm upper-left light match the current family. No staff, sword-and-board, rapier, bow, spear, flask belt, hammer or lute in the new designs. New silhouettes rely on rings, wrapped fists, doll/charms, cross-knuckles/beads or rounded mace, and fans/ribbons. Owner visual acceptance remains pending; exact stylistic acceptance cannot be inferred from file validation.

## 1. โหราจารย์ — SEER

Lane: **back row**. Short Thai name suggestions: **A: ศศิ / B: นิศา** (owner chooses).

เสื้อคลุมแยกทรงจันทร์เสี้ยวและวงแอสโทรเลบด้านข้างทำให้ A อ่านต่างจาก Eira ที่มีหมวกแหลมและไม้เท้า; B ใช้ปกตั้งกับเสื้อคลุมทรงแคบ นิ้วแยกสองทิศสื่อการเบนเป้าหมาย เส้นชะตาที่ดึงผ่านวงแหวนสื่อการข้ามไปข้างหน้าใน move cycle ของศัตรู

Palette: `#202C50`, `#68608D`, `#B6B9D3`, `#D9C68A`, `#453C62`, `#ECE2D3`. Hex values are the authoritative design targets; generated painted swatches vary under lighting.

## 2. นักมวย — MARTIAL ARTIST

Lane: **front row**. Short Thai name suggestions: **A: อรุณ / B: ภูผา** (owner chooses).

A ใช้มวยผมคู่ หมัดพันผ้าสองข้างและกางเกงพอง; B ใช้จุกผมเดี่ยว ท่าฝ่ามือต่ำและผ้าคาดเอว หมัดแยกจากลำตัวทำให้รู้ว่าไม่มีอาวุธ ปราณ 1 pip → เต็ม 3 pips แสดงการสะสมจากการโจมตีก่อนใช้ท่าปิด ไม่ใช่ไฟหรือธาตุ จำนวน pips เป็นข้อเสนอภาพสำหรับคอนเซปต์ ไม่ใช่ค่าระบบที่อนุมัติแล้ว

Palette: `#A76A3B`, `#DCA647`, `#644737`, `#F0DFC1`, `#353039`, `#E7BC70`. Hex values are the authoritative design targets; generated painted swatches vary under lighting.

## 3. นักสาป — HEXER

Lane: **back row**. Short Thai name suggestions: **A: รัตติ / B: พิมพ์** (owner chooses).

A ใช้ฮู้ดปลายตกสองด้าน ตุ๊กตาผ้าและยันต์ห้อย; B ใช้ฮู้ดเหลี่ยม เสื้อคลุมสั้นกับหุ่นกระดาษสองข้าง เส้นด้ายวนกลับสื่อคำสาปที่ทำร้ายผู้ถูกสาปเมื่อออกท่า ยันต์หลายใบสื่อการซ้อนและการดูดพลังตอนจบรอบ ไม่มีเลือดหรือบาดแผล

Palette: `#342D40`, `#675064`, `#A88F88`, `#732F43`, `#D3BA9A`, `#E6D4C4`. Hex values are the authoritative design targets; generated painted swatches vary under lighting.

## 4. นักบุญรบ — BATTLE SAINT

Lane: **front row**. Short Thai name suggestions: **A: เมตตา / B: ธำรง** (owner chooses).

A ใช้เกราะข้างเดียว ชายชุดแยกสั้น สนับหมัดกางเขนและลูกประคำ; B ใช้กระบองสั้นหัวมนกับโล่เล็ก ท่ายืนลงน้ำหนักด้านหน้าสื่อผู้รักษาที่เข้าปะทะ แสง mint ย้อนจากหมัด/กระบองไปหาเพื่อนที่บาดเจ็บสื่อ healing-on-hit ต่างจาก Seren ที่ถือไม้เท้าและ Aegis ที่ใช้ดาบกับโล่ใหญ่

Palette: `#EAE3CE`, `#BD9456`, `#6E6558`, `#B4DBC8`, `#5D4038`, `#FAEBD0`. Hex values are the authoritative design targets; generated painted swatches vary under lighting.

## 5. นักเต้นรำ — DANCER

Lane: **back row**. Short Thai name suggestions: **A: ลลิตา / B: ลีลา** (owner chooses).

A ใช้พัดสองใบและริบบิ้นรูป S กับกระโปรงชั้น; B ใช้ห่วงริบบิ้นสองมือและชายชุดแยกเหนือกางเกง จังหวะโค้งซ้ำและกระดิ่งสื่อการเร่งคืนสกิลให้พันธมิตร ไม่มีเครื่องดนตรีหรือสัญลักษณ์โน้ต จึงต่างจาก Lio แม้มีสี coral ร่วมกัน

Palette: `#DF806F`, `#348B89`, `#D3AF66`, `#334B59`, `#F1DCC0`, `#804E47`. Hex values are the authoritative design targets; generated painted swatches vary under lighting.

## Delivery boundary and handoff

All additions stay under this incoming package. After opening the PR, the Codex report owed to Claude is added as `CODEX-TO-CLAUDE.md` here: the task's explicit files-only boundary takes precedence over AGENTS.md's usual docs/handoffs location. Claude can copy that entry during later intake. No merge, publication or subsequent task is authorized in this handoff. Production sprites/portraits await the owner's A/B choices.

## Provenance and verification

PROMPTS.md describes all 15 selected generations. provenance/generations.json and unit-generations.json retain verbatim prompts, original local output paths and packaged source associations. export-commands.json records deterministic ImageMagick crops/resizes/masks/composites; no procedural character painting. manifest.json records sizes, dimensions and SHA-256 values. validation.json records alpha bounds, pivots, review dimensions and read-only reference hashes. No exact image model version was exposed, so none is asserted.
