# ART-UNIT-ANIMATION-WB-C-001 — Morvane body motion

มอร์เวน ราชันด้ายขาด: 8 whole strips / 44 logical cells สำหรับ Claude ประกอบ `morvane` ภายหลัง ฐานเกม `c8e7f935248a8e96adfa3080e656ad643d3a1954` จาก `feature/fateweave-initial-prototype`; seed C จาก commit `46f366dc931e4994d3a6ccd9ad3951ac444a70cf` ตรวจ encounter `wb-morvane`, SPD80, ท่าจริง และ displayRatio2/sole896 แล้ว

**Draft รอเจ้าของตรวจภาพและอนุมัติ motion** ยังไม่ได้ประกอบ atlas หรือทดลองในเกม การตรวจเทคนิคไม่ใช่การอนุมัติภาพ งานนี้ไม่แก้ runtime, กฎ, เซฟ, ตัวเลข, เวลาเล่น, ลูกน้อง, เอกสารสถานะ หรือภาพเดิม

## ดูภาพ

- `preview-keyposes-390.png`: ท่าสำคัญครบ8ท่า เปรียบเทียบ Fate Lash (ไขว้แล้วสะบัด) กับ Call the Court (เปิดออกแล้วค้าง)
- `preview-390.png`: ทุก44เฟรมที่สเกลเซลล์เดียว .21, seed สูงประมาณ160px
- `previews/<move>.webp`: 390×280, เซลล์215px, สเกลเดียวทั้งท่า เวลา offline preview เท่านั้น ไม่ใช่เวลาเกม; down เล่นครั้งเดียวค้างภาพท้าย
- `sentinel-compare.png`: Morvane ready เทียบผู้คุมเดิม ด้วยขนาดเซลล์และ sole เดียวกัน
- `previews/height-landmarks-390.png`: เส้นทองที่ยอดมงกุฎ เส้นเขียวที่ปลายผ้า สำหรับตรวจจุดวัด ไม่ใช่ภาพส่งเข้าเกม

## ท่าและภาพจำ

6ท่าหลัก×6 + hit4 + down4 =44: `six-hand-rend`, `severing-bolt`, `fate-lash`, `call-the-court`, `shadow-tide`, `severed-crown`, `hit`, `down` ใน `strips/` เป็น RGBA1024×1024 ต่อเฟรม แถวเดียว เฟรมแรกทุกท่าและเฟรมสุดท้ายทุกท่ายกเว้น down = seed C ทุก pixel รวม alpha/hidden RGB (15 seed locks) ไม่มี idle loop

ใช้ R1 ของ Call the Court: คู่บนเปิดเหนือหัวแล้วค้าง index3 ไม่มีรอยแยกวาดติดมือ เพราะบรีฟอนุญาตให้ละไว้ได้ คู่กลางทำ Six-Hand Rend, คู่ล่างทำ Severing Bolt, คู่บนทำ Fate Lash คู่แขนจับจากต้นแขน/ปลอกทองตาม seed: บนปลอกเรียว, กลางมือใหญ่ปลอกใหญ่มาก, ล่างมือเล็กข้างเอว ผ้าคลุม3แฉก ไม่มีขา แกนอกกลม1ดวง มงกุฎ1 ไม่มี mirror ไม่มีลูกพลัง/ด้าย/คลื่น/เงาพื้น/VFX/ตัวอักษร/UI ใน raw และ strips

Six-Hand Rend ช่วงฟาดมีมือคู่ล่างบางส่วนซ้อนกับปลอกคู่กลาง แต่ยังตามตำแหน่งเอวและปลอกเล็กได้ ให้เจ้าของตรวจการอ่านที่160px โดยเฉพาะจุดนี้ ภาพ/การนับสามคู่ทุกเฟรมบันทึกใน `anatomy-review.json`; เป็นการตรวจของ Codex ไม่ใช่การอนุมัติของเจ้าของ

## สเกลและจุดยึดลอยตัว

- `annotations.json`: วัด **ครั้งเดียว** จาก Six-Hand Rend R3 ready: ยอดทองมงกุฎ y225 ถึงปลายผ้า y536 =311sourcepx; seed ยอดทองจริง y137 ถึงปลายผ้า y896 =759px → global canonical scale **759/311 = 2.440514469453376** คงค่าเดิมหลังแก้ช่องว่าง R4/R5 ไม่ fit ใหม่รายเฟรม/รายท่า
- ยอด gold apex y137 ต่างจาก alpha bbox top y134 ของ seed3px เนื่องจากขอบ anti-alias; seed bbox ทั้งหมด `(191,134,832,897)` ไม่ใช้มือชูเป็นความสูงลำตัว
- แถบ6pose ต้นฉบับ2172×724 มีslot362px ใช้ scale ข้างต้น แถบ4pose ต้นฉบับ2172×724 มีslot543px ใช้ค่าเดียวคูณ362/543 เพื่อแปลงความละเอียด raster ไม่ใช่การย่อท่าให้พอดี
- ทุกเฟรมใช้กลาง alpha silhouette x512 ปลายผ้าต่ำสุดหลังล้าง alpha จางเป็นจุดยึด y896; ไม่มีเท้า ทุก hover offset =0 ไม่ย้ายรูปขึ้นลงเพื่อซ่อนขนาดผิด ท่า Tide ใช้การกดลำตัวและการแผ่ผ้าในรูป ท่าล้มใช้ปลายผ้ากองบนพื้น y896
- ตรวจ alpha extent ทั้งตัว: บน/ซ้าย/ขวา≥32px และปลายผ้าไม่ต่ำกว่า899 รวม down ไม่มีการตัดส่วนใด ไม่มีการ shrink เฉพาะเฟรม Fate Lash ยกมือสูงสุดยังมีขอบบน37px
- `height-audit.json`: 41 cells ที่ไม่ใช่ท่าทรุด/ล้มผ่านความสูงมงกุฎถึงปลายผ้า ±4% (รวม seed locks); down index1–3 ลดความสูงฉายเป็น **intentional collapse** ไม่อ้างว่าความสูงล้มเท่าร่างยืนและไม่ย่อหัว/ลำตัวด้วย normalization
- จุดมงกุฎตรวจจากยอดทองและดูภาพจริง Fate Lash index2 ไขว้มือเหนือหัว ใช้ยอดมงกุฎที่มองเห็น `(922,218)` ไม่ใช้ปลอกแขนทองที่สูงกว่า จุดวัดมีความคลาดสายตาประมาณ1–2sourcepx มี overlay ให้ตรวจซ้ำ ความสูงไม่ใช่ใบรับรองสัดส่วนหัว/แขน

## ต้นฉบับและ raw ที่เตรียมตัด

`raw/original/*.png` เก็บ output เครื่องมือทั้ง17ครั้ง **ทุก byte** รวมรุ่นไม่เลือก ไม่เขียนทับไฟล์เหล่านี้ `prompts.json` เก็บ prompt จริง reference ตามลำดับและรุ่นที่เลือก ทุกคำขอแนบ seed C และสร้างทั้งแถบ ไม่สร้าง pose แยก ไม่มี numeric RNG seed จากเครื่องมือ

`raw/<move>.png` เป็น **derived raw สำหรับตัด** แยกจาก byte-original: ล้าง alpha≤8 และ RGB ที่มองไม่เห็น, ตัด alpha bbox, เติมช่อง alpha0อย่างน้อย64px โดยไม่ย่อ/วาดซ่อมตัวละคร source PNG มี alpha1–8 กระจายตามขอบ/ช่องว่าง และ Six-Hand Rend R5 หลังล้างยังมีหนึ่งช่อง37px จึงไม่อ้างว่าต้นฉบับ byte-original ผ่านเกณฑ์ช่อง48px แต่ raw ที่ส่งให้ตัดจริงมีช่อง≥64px รายงาน bbox/ช่องว่างต้นฉบับหลังล้างและ derived แยกใน `strips.json` ตรวจเกณฑ์ช่องว่างกับ `raw/<move>.png`; originals มีไว้ยืนยัน provenance

เลือก Six-Hand Rend R5 เพื่อรักษากรงเล็บกางและสัดส่วนรอบR3; R4 พับมือเพิ่มช่องแต่เกิด anatomy flags จึงไม่เลือก เลือก Severing Bolt R3 เพื่อตัดแสงคล้ายลูกพลังออก เลือก Severed Crown R3 เพื่อแก้ความสูงคอโดยไม่ rescale เลือก down R2 เพื่อดับแกนตั้งแต่ index2 และพับผ้าให้กระชับ รุ่นก่อนเก็บครบ

`seeds/` มี seed/concept/turnaround/transform JSON จาก commit อ้างอิงแบบ byte copy, layout4/6 ตาม geometry WB-A และ ready-strip4/6 ที่ทำจาก seed C ซ้ำในช่องเพื่อให้ generator คุมขนาด ได้แนบ seed ตัวเต็มแยกทุกครั้ง ใช้ turnaround เป็นแนวทางรูปทรงเท่านั้น

## ทำซ้ำและตรวจไฟล์

Python3 และ dependencies ตาม `requirements.txt` จาก root repo:

```sh
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/audit_anatomy.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/build_handoff.py
python3 -I incoming/ART-UNIT-ANIMATION-WB-C-001/build_handoff.py --verify
```

Build ใช้ PNG ต้นฉบับที่เก็บแล้ว ไม่เรียก generator ซ้ำ `audit_anatomy.py` ต้องรันจาก full checkout เพราะเรียก `scripts/unit-anatomy-audit.py` จริงบน QA copies512px และเก็บ SHA script; ไม่มีการปรับ shipping frames จาก audit `anatomy-review.json` คือบันทึกตรวจด้วยตา คงไว้เมื่อ rebuild

`--verify` ตรวจรายการไฟล์/bytes/SHA-256, mode/size, decode PNG/WebP ทุกเฟรม,44cells/15seed locks, reconstruct ทุกเฟรมจาก crop/scale/paste ที่บันทึก, สเกลร่วม, alpha จริง, ขอบ, ปลายผ้า, ความสูงมงกุฎไม่รวมมือ และช่องของ derived raw `validation.json` ไม่ hash ตัวเองเพราะเป็นวงจร SHA manifest บันทึกภายนอกใน PR หลัง normal git push ต้อง fetch ผ่าน fresh clone ที่ไม่มี object alternates ตรวจทุกไฟล์เทียบ local และ decode อีกครั้ง

Anatomy audit รุ่นสุดท้าย: **ไม่มี drift flags**, 3 not-measured = down index1–3 (global41–43), median scale1.005 หัว/มงกุฎเอียง แขนทับ และผ้ากองทำให้ fit ไม่พอ รายงานเก็บตามจริง **not-measured ไม่ใช่ผ่าน** ให้ตรวจด้วยตากับ seed ก่อนอนุมัติ

## ฝากถึง Claude

- รอเจ้าของตรวจภาพและอนุมัติ motion ไม่ใช้ผล CI/verify หรือความเห็น Codex แทน
- เมื่อนำเข้าใช้ identity `foe_morvane`, sheet `morvane`, atlas30เฟรม: seed0 + move1–6 ท่าละ4 (strip index1–4) + hit index1–2 + down index1–3, displayRatio2, sole896/1024, encounter-only loading ตาม WB-A
- ลำดับ move: Six-Hand Rend / Severing Bolt / Fate Lash / Call the Court / Shadow Tide / Severed Crown; ไม่มี idle loop ใช้ seed พร้อม
- ปลายผ้าคือ sole เสมือน ไม่มีเท้า ห้ามใช้มือหรือขอบมงกุฎเป็นพื้น คงมงกุฎ/แกนอก/สามคู่แขนและผ้า3แฉกโดยไม่ mirror; ห้ามเติมลูกพลังหรือด้ายใน body ซ้ำกับ VFX
- ลูกน้องใช้ crawler/wisp เดิม ไม่ต้องสร้างหรือเปลี่ยนในแพ็กนี้ คง rules/save/content/balance/playback timing เดิม
- ตรวจ presentation coverage และคลิป390px ในเกมภายหลัง เวลา offline preview ในแพ็กไม่ใช่ข้อเสนอเปลี่ยนเวลาเล่น การนำเข้า/atlas/loading/คลิปเป็นงาน Claude
