# ART-UI-POTION-CALM-001 — ภาพวาดยาฟื้นความเหนื่อย (calm)

เขียนโดย Claude 2026-11-04 · สถานะ: **เขียน prompt แล้ว** (Codex ยังไม่ได้สร้างภาพ) · เจ้าของเป็นผู้เลือกภาพ

ตรวจคลังภาพเกม 2026-11-04 (ตาราง coverage จากโค้ด + ค้นจุดใช้ภาพสำรองใน `src/`) แล้ว ท่าทางและ VFX ในศึกครบทุกตัว ยกเว้นตัวที่พักไว้ตาม OD-14 เหลือภาพที่เกมขาดจริงอยู่ภาพเดียว คือยา `calm` ที่ยังใช้ไอคอนเส้น `src/ui/svg/potion-calm.svg` (`src/ui/equip-art.ts:21–24`) อยู่ในหน้าปรุงยา กระเป๋าแผนที่ พ่อค้า และรางวัล

## กล่อง prompt สำหรับ Codex (คัดลอกทั้งกล่อง)

```text
เป้าหมาย:
วาดยา "ยาฟื้นความเหนื่อย" (potion id `calm`, P02) แบบเดียวกับยาที่วาดแล้ว 3 ขวด เพื่อแทนไอคอนเส้นชั่วคราว
งาน ID: ART-UI-POTION-CALM-001 · branch `art/art-ui-potion-calm-001` จาก `feature/fateweave-initial-prototype` (ไม่ใช่ main)
ไฟล์เฉพาะใน `incoming/ART-UI-POTION-CALM-001/` ห้ามแตะ src/ tests/ public/ .github/ และภาพเดิม เปิด PR เข้าสาขาเกม แต่ไม่ merge เอง

บริบทเกมและไฟล์ที่ตรวจแล้ว:
- atlas ที่ใช้จริง `public/assets/ui/equip/potion_items.webp` ขนาด 640×128 แบ่ง 5 ช่อง ช่องละ 128×128 เรียงเป็น salve / tonic / repel / item_dust / item_gold และมี map ใน `src/game/visuals/equip/potion_items.json`
- ที่มาและกติกาสไตล์: `incoming/ART-UI-EQUIP-001/NOTES.md` และ `STYLE_CHECK.md` วางของไว้กลางช่อง ไม่ยึดพื้น เผื่อขอบอย่างน้อย 6px ขนาดที่ใช้: salve 96px, tonic/repel/dust 108px
- ทรงขวดเดิมที่ต้องไม่ซ้ำ: salve ขวดกลมคอสั้น น้ำสีแดง-ส้ม · tonic ขวดเหลี่ยมก้นกว้างคอยาว น้ำเขียวมะนาว · repel ขวดเรียวสูง น้ำม่วง
- ไอคอนเส้นเดิม `src/ui/svg/potion-calm.svg`: ขวดไหล่กว้าง ก้นแบน คอตรง มีเส้นคลื่นสงบกลางน้ำ ภาพวาดควรอ่านเป็นทรงเดียวกับไอคอนนี้ที่ 15–28px
- กรอบไอคอนชั่วคราวใน `src/ui/portrait.css:67` ใช้โทน aqua/mint (#86dfc2, #356459) เป็นทิศสีที่ผู้เล่นเห็นอยู่แล้ว

ภาพอ้างอิงที่แนบ/เข้าถึงได้:
- crop 3 ช่องแรกจาก `public/assets/ui/equip/potion_items.webp` (เอาไว้เทียบแสง เส้นขอบ และสเกลเท่านั้น ห้ามลอกทรงขวด)
- `src/ui/svg/potion-calm.svg` (silhouette)

ข้อกำหนดที่ยืนยันแล้ว:
- ภาพเดียว PNG RGBA 128×128 alpha จริง (ไม่มีลายตารางปลอม ไม่มีพื้นหลัง) ตัวขวดกว้าง/สูงสุดประมาณ 104–108px วางกลางช่อง เผื่อขอบ ≥6px
- แสงจากซ้ายบน เส้นขอบเข้มคม ทรงสามส่วนสี่แบบกะทัดรัด cel-shade ไล่สีนุ่ม ให้เข้าชุดกับ salve/tonic/repel
- ไม่มีตัวอักษร ตัวเลข ป้าย ราคา กรอบ หรือแสงบอกความหายาก
- ต้นฉบับใหม่ทั้งหมด ห้ามใช้ภาพหรืองานจาก Asterveil: Rise Beyond

สมมติฐานและข้อมูลที่ยังขาด:
- ยังไม่มีชื่อภาษาอังกฤษในเกม ใช้ id `calm` และชื่อไทย "ยาฟื้นความเหนื่อย"
- เจ้าของยังไม่เคยกำหนดสี ข้อเสนอ: aqua ใส/ฟ้าแก้วทะเล มีหมอกเงินขาว (ไม่ใช่เขียวแบบ tonic ไม่ใช่ม่วงแบบ repel)

ท่า ทิศ จำนวนเฟรม และจังหวะ:
- ภาพนิ่ง 1 ภาพ ไม่มีแอนิเมชัน

ขนาดเฟรม จุดยึด และรูปแบบไฟล์:
- `calm.png` ขนาด 128×128 จุดยึดอยู่กลางช่อง (ไม่ใช่ ground anchor)
- ต่อท้ายเป็นช่องที่ 6 ในตัวอย่าง `potion_items_preview.png` ขนาด 768×128 (ห้ามแก้ไฟล์ atlas จริง)

คำอธิบายด้านภาพ:
ขวดแก้วไหล่กว้าง ก้นแบน คอตรงสั้นถึงกลาง จุกไม้ก๊อก ผูกเชือกเล็กพร้อมใบสมุนไพร 1–2 ใบที่คอขวด
น้ำ aqua ใสนิ่ง ผิวน้ำเป็นคลื่นเรียบหนึ่งเส้น มีหมอกเงินจางลอยในน้ำ ให้ความรู้สึกพักและหายใจโล่ง
ไม่มีประกาย/ไฟ/ฟองเดือดแบบยาเร่งพลัง

Prompt สำหรับเครื่องมือสร้างภาพ:
"Single painted game inventory item, original design: a calming draught potion. Wide-shouldered glass flask with a flat base and a short straight neck, cork stopper, a thin twine tied at the neck holding one or two small herb leaves. Clear aqua / sea-glass blue liquid, perfectly still with one smooth gentle wave line across its surface and a faint silvery-white mist inside. Top-left light, crisp dark outline, compact three-quarter view, cel-shaded volume with soft gradients, glass highlights, restrained palette that matches a set of painted fantasy potions (round red salve, faceted green tonic, slim violet repel) without copying their shapes. Centered on a fully transparent background, no text, no numbers, no frame, no glow ring, no rarity border."
สร้าง 3 ตัวเลือก (R1 แนะนำ: aqua + หมอกเงิน, R2: ฟ้าอ่อนอมลาเวนเดอร์จาง, R3: aqua ทรงเตี้ยกว่า) แล้วเลือกตัวแนะนำ 1 ตัวไว้ใน NOTES.md

งานปรับ asset และ metadata:
- ตัดช่องว่างรอบภาพ แล้ววางกลางช่อง 128×128 ใช้ scale เดียวสำหรับทุกตัวเลือก
- `calm.json` ระบุ { "potion_calm": { "x": 640, "y": 0, "w": 128, "h": 128 } } เป็นตำแหน่งที่เสนอเมื่อ Claude ต่อ atlas เป็น 768×128
- ส่ง `review-390.png` ที่วางยาทั้ง 4 ขวดเรียงกันในกรอบ 44px และ 28px บนพื้น navy ของเกม (#0f1a2e) เพื่อดูว่าอ่านออกที่ขนาดจริง

งานนำเข้าเกมและการเปลี่ยนสถานะ:
- Codex ไม่ต้องนำเข้า Claude จะต่อ atlas แบบ lossless, เพิ่ม `potion_calm` ใน `potion_items.json`, เอาไอคอนเส้นออกจาก `equip-art.ts` แล้วตรวจภาพ 390px
- ไม่เปลี่ยนกฎ เซฟ ราคา หรือสมดุล

เกณฑ์ตรวจรับ:
- อ่านออกและไม่สับสนกับ salve/tonic/repel ที่ 28px และ 44px รวมถึงภาพขาวดำ (greyscale) โดยดูจากทรงขวด ไม่ใช่สีอย่างเดียว
- alpha สะอาด ไม่มีขอบขาว/ฟริงจ์ ไม่ถูกตัดขอบ ขนาดใกล้ยาเดิม
- แนบ `prompts.json` (prompt จริง + reference ที่แนบจริง + generation id), `validation.json` (SHA-256 + ขนาด + โหมดสีทุกไฟล์), `NOTES.md`
- หลัง push ให้ fetch กลับมาตรวจ SHA-256 เทียบ `validation.json` และ decode ด้วย Pillow ทุกไฟล์ (PR #90 เคยถูกตัดที่ ~768 KB)

ขอบเขตงานที่ผู้ใช้อนุญาต:
- ภาพยา calm เท่านั้น ไม่ทำยา/ไอคอนอื่นเพิ่ม การเลือกภาพเป็นของเจ้าของ ผลเทสต์/CI ไม่ใช่การอนุมัติภาพ
```
