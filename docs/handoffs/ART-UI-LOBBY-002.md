# ART-UI-LOBBY-002 — ท่าที่ค่าย (นั่ง/ชูมือ/ท่าเฉพาะ) ของตัวละครใหม่ 5 ตัว

Claude 2026-11-05 · สถานะ: **เขียน prompt แล้ว** (ยังไม่ได้ส่ง/ยังไม่มีภาพ)

ที่มา: เจ้าของสังเกตว่าตัวใหม่ไม่ได้นั่งรอบกองไฟ ตรวจโค้ดแล้ว `lobbyPose()` (src/game/visuals/assets.ts) มีท่าค่ายเฉพาะ Aegis, Lyra, Eira, Seren (lobby_poses_heroes.webp) และ Garran, Mira, Toma, Sefa, Brann, Lio (lobby_poses_mercs.webp) ตัวที่ขาด: **Corin (metta, นักบุญ), Cerise (lalin, นักเต้น), Kael (นักมวย), Wynne (นักสาป), Astrid (โหราจารย์)** ตัวพวกนี้ตอนนี้ยืนด้วยภาพ idle ธรรมดาในฉากค่าย (ไม่นั่ง ไม่ชูมือ) Odran (thiran) และ Isolde (wila) พักตาม OD-14 ไม่รวมในงานนี้

```text
CODEX HANDOFF — ART-UI-LOBBY-002 (art only)
Asterveil · Fateweave · repository wnau34-nptrn/asterveil-fateweave

อ่านก่อนเริ่ม: AGENTS.md, CLAUDE.md, docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md, docs/handoffs/ART-UI-LOBBY-001.md (หัวข้อ "B. Character poses" และ Requirements — ใช้กติกาเดียวกัน), docs/handoffs/ART-PLACEMENT-RULES.md

เป้าหมาย: วาดท่าที่ค่ายทหารรับจ้าง 3 ท่าต่อคน ให้ตัวละครใหม่ 5 ตัวนั่งรอบกองไฟและชูมือเฉลิมฉลองได้เหมือนตัวอื่น
ท่า (3 ต่อคน, 512×512, หันขวา, มุม 3/4 เหมือนภาพ seed):
1. sit: นั่งบนท่อนซุง/ลังแบบสบายๆ อาวุธ/ของประจำวางข้างตัว (ท่อนซุงอยู่ในเฟรมเหมือนชุดเดิม)
2. cheer: ยกแขนชูถ้วย/โบกมือ ยิ้ม (ใช้ตอนชนะและตอนจ้างคนใหม่)
3. idle_alt: ท่าเฉพาะตัว
   - Corin (metta, นักบุญ): กำมือภาวนาเบาๆ มีรอยยิ้มสงบ (ไม่วาดแสง/ออร่า)
   - Cerise (lalin, นักเต้น): หมุนพัดหรือริบบิ้นเบาๆ ก้าวเต้นเล็กๆ
   - Kael (นักมวย): ยืดแขน/พันผ้าพันมือ ตั้งท่าอบอุ่นร่างกายสั้นๆ
   - Wynne (นักสาป): ถือตุ๊กตาด้ายขึ้นมาตรวจ ดึงด้ายเส้นเดียวเล่นๆ (ไม่วาดเอฟเฟกต์ด้าย/ลายมนตร์)
   - Astrid (โหราจารย์): ยกแอสโทรเลบขึ้นมองดาว (ไม่วาดเส้นดาว/แสงวง)

seed (ภาพที่อนุมัติ ใช้เป็นแบบ identity/สเกล/พื้น):
- Kael: incoming/ART-CHAR-CLASS-NEW-003/unit/kael.png (ฉบับสัดส่วนแก้ NEW-003 — ห้ามใช้ NEW-002)
- Wynne, Astrid: incoming/ART-CHAR-CLASS-NEW-002/unit/wynne.png, astrid.png
- Corin, Cerise: เฟรม idle ในเกมปัจจุบัน public/assets/art/units_mercs.webp (แถวที่ 7 = metta ดัชนี 6, แถวที่ 9 = lalin ดัชนี 8 ตาม src/game/visuals/assets.ts actorArt; sheet 2 คอลัมน์ ×7 แถว ของเฟรม 512×512) หรือ seed ต้นฉบับใน incoming/ART-CHAR-CLASS-NEW-001/ ถ้ามี — ตรวจกับโค้ดก่อนใช้
- ตัวอย่างชุดเดิม (ดูสไตล์ ขนาด การวางพื้น/ที่นั่ง): public/assets/lobby/lobby_poses_heroes.webp (1536×2048) และ lobby_poses_mercs.webp (1536×3072) ฉากค่าย public/assets/lobby/lobby_bg.webp

ข้อกำหนดทุกท่า:
- identity/ชุด/สีตรงกับ seed ห้ามออกแบบใหม่ ขนาดตัวเท่ากับ seed (หัวต่อลำตัวเท่า seed ทุกเฟรม) สเกลเดียวทั้งตัว
- โปร่งใสจริง (alpha) ไม่มีเงา ไม่มีออร่า/แสงวาด ไม่มีตัวอักษร ไม่มีเอฟเฟกต์ (VFX เป็นของเกม)
- ท่าต้องดูถูกต้องเมื่อกลับด้านซ้าย-ขวา (เกมกลับด้านตัวที่ยืนฝั่งขวาของกองไฟ): ไม่มีตัวอักษร/ตราข้างเดียว
- พื้น/ที่นั่งอยู่บนเส้นเดียวกับชุดเดิม (sole y=496 ในเฟรม 512; sit ให้บันทึก seatY)
- อ่านออกที่ความสูง 90–200 px
- ทำทั้งท่าเป็น 1 รูปต่อท่า (ไม่ตัดแปะ ไม่เติมด้วยโค้ด) ถ้าท่าใดตีความได้หลายแบบ ส่ง R1/R2 พร้อมตัวแนะนำ

ไฟล์ส่งมอบ (ใต้ incoming/ART-UI-LOBBY-002/):
- lobby_poses_p03.webp: 3 คอลัมน์ = sit / cheer / idle_alt, 5 แถว = metta, lalin, kael, wynne, astrid (ตามลำดับนี้) ขนาด 1536×2560 เฟรม 512×512 lossless
- lobby_poses_p03.json: {"<id>_<pose>": {x,y,w,h,footY}} และ seatY สำหรับ sit
- review/poses-lineup.png (ทั้ง 15 ท่าเทียบ seed สเกลเดียวกัน), review/silhouettes.png (90 px), review/lobby-phone.png (ภาพ 390×844 จำลองคน 5 คนรอบกองไฟโดยใช้ท่าใหม่ + ตัวเดิมอย่างน้อย 2 ตัว), cells/ (ภาพแยกท่าละไฟล์ก่อนรวม atlas), seeds/ + seeds.json, prompts.json (prompt จริง ภาพอ้างอิง generation id ถ้าเปิดเผยได้ ไม่ใส่ base64), strips/validation.json + SHA256SUMS, NOTES.md ภาษาไทย, build_handoff.py, verify_remote.py
- ตรวจด้วย python3 scripts/unit-anatomy-audit.py --cells กับ seed ทุกท่า (median ≤ 1.15, ทุกเฟรมที่วัดได้ ≤ 1.20; ท่าที่ไม่วัดต้องตรวจด้วยตาและบันทึกใน NOTES.md)

ขอบเขต: สร้าง branch art/art-ui-lobby-002 จาก feature/fateweave-initial-prototype (ไม่ใช่ main) เปลี่ยนไฟล์เฉพาะใต้ incoming/ART-UI-LOBBY-002/ ห้ามแตะ src/ tests/ public/ .github/ เปิด PR แต่ไม่ merge push ด้วย git ปกติ แล้ว fetch กลับมาตรวจ SHA-256 ทุกไฟล์และ decode ภาพด้วย Pillow การเลือกภาพและอนุมัติ motion เป็นของเจ้าของ ผล CI/เทสต์ไม่ใช่การอนุมัติ ส่วนนำเข้า public/ และเพิ่ม sheet p03 ใน lobbyPose() เป็นงานของ Claude
```
