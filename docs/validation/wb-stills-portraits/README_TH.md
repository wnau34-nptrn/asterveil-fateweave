# World Boss — ภาพสำรองและ portrait จากภาพที่มีแล้ว

เจ้าของสั่ง “ชื่อท่าภาษาไทยไม่เอา” และ “ดำเนินการเรื่องที่ยังค้างได้เลย” หลังยืนยันว่ามีภาพบอสแล้ว งานนี้เชื่อม Kragmor, Valdrakk, Morvane ให้ใช้ภาพของตัวเองแทน Rift Warden ระหว่างโหลด/เมื่อโหลดแอนิเมชันไม่ได้ และในคิวเทิร์น/หน้ารายละเอียดที่ใช้ portrait ร่วมกัน ไม่มีการวาดบอสใหม่หรือเปลี่ยนชื่อท่า

## สถานะหลักฐาน

- **สร้างภาพแล้ว:** เป็นการประกอบเฟรมยืน 0 จาก atlas ที่อนุมัติไว้ และครอป portrait จาก seed เดิม ไม่ใช่ภาพวาดหรือแอนิเมชันใหม่
- **ตรวจด้วยตาแล้ว:** Codex ตรวจ seed ทั้งสาม, atlas portrait และภาพสนามจริง 390×844 จำนวน 6 ภาพด้านล่าง ภาพสำรอง/เฟรมยืนอ่านเป็นบอสตัวเดียวกัน สีและทิศทางตรงกัน; portrait แยกตัวได้ที่ขนาดคิวจริง
- **ทดสอบในเกมแล้ว:** Chromium emulation, real Phaser scene + BattleUI + resolver ผ่าน Playwright ใหม่ 6/6 (โหลดช้าและโหลดล้มเหลวครบสามตัว) และ unit-loading เดิม 3/3; สถานะไม่เปลี่ยนเมื่อโหลดเสร็จ, ขนาด/sole/จุดปล่อย VFX คงเดิม, caption bounds ตรง source trim ภายใน 3 CSS px, fallback เล่นจบเทิร์นได้และไม่โหลดซ้ำหลังล้มเหลว
- **รอเจ้าของอนุมัติ:** ไม่เปิด checkpoint ใหม่สำหรับการเชื่อมภาพเดิมที่เจ้าของสั่งให้ทำต่อ; การตรวจครอปนี้เป็นคำตัดสินของ Codex ไม่อ้างว่าเจ้าของตรวจภาพทั้งหกด้วยตนเอง การอนุมัติ VFX เดิมคงตาม #294

ตรวจภาพนิ่งเท่านั้น ไม่อ้างว่าตรวจ motion ต่อเนื่อง ไม่ใช่ iPhone/Android จริงหรือ iOS Safari

## ภาพ 390px จากเกมจริง

| บอส | ภาพสำรอง (หน่วง atlas) | โหลดเฟรมยืนแล้ว |
| --- | --- | --- |
| Kragmor | [fallback](kragmor-fallback-390.png) | [loaded](kragmor-loaded-390.png) |
| Valdrakk | [fallback](valdrakk-fallback-390.png) | [loaded](valdrakk-loaded-390.png) |
| Morvane | [fallback](morvane-fallback-390.png) | [loaded](morvane-loaded-390.png) |

ข้อจำกัดที่ยังเห็น: Kragmor และหาง/ปีก Valdrakk ชิดหรือเลยขอบขวาตามขนาดและตำแหน่งแอนิเมชันเดิม ไม่เปลี่ยน layout สนามในงานนี้ ภาพสำรอง 256px ถูกขยายตามขนาดบอส จึงนุ่มกว่า atlas เดิมเล็กน้อย แต่ไม่เปลี่ยนสัดส่วนหรือ sole; portrait เป็น crop หน้า/อก ไม่ใช่ภาพ bust วาดใหม่

## ไฟล์และวิธีสร้างซ้ำ

`python -I scripts/build-world-boss-stills.py` ใช้ Pillow อ่าน atlas lossless และ seed เดิมแบบ read-only; full source paths, SHA-256, crop rectangles, alpha bounds/ขอบว่าง และ output hashes อยู่ใน [assets.json](assets.json) ภาพทั้งสองเป็น lossless WebP 512×512, 2×2 ช่อง ช่องละ 256px; ช่อง 0/1/2 = Kragmor/Valdrakk/Morvane, ช่อง 3 ว่างจริง, alpha 0–255 ตรวจ decode เทียบ RGBA ก่อนบันทึกผ่าน

- `public/assets/art/units_worldboss.webp`: 172,490 bytes, decoded 1 MiB (เพิ่ม core static sheet หนึ่งใบเพื่อใช้ได้ทันทีแม้สลับ encounter)
- `public/assets/art/portraits_worldboss.webp`: 329,346 bytes, decoded 1 MiB เมื่อ DOM ใช้งาน
- `src/game/visuals/world-boss-stills.json`: cell size, origin Y .875, display ratio 2, source-trim bounds และ hash revision
- `assets.ts`, `BattleScene.ts`, `portraits.ts`: frame mapping, preload, fallback scale/sole/landmark compensation และ DOM atlas dimensions; actor อื่นใช้ข้อมูลเดิม
- `tests/browser/world-boss-stills.spec.ts` + fixture QA geometry และ CI source-fixture list: ตรวจพฤติกรรมจริงที่ 390px
- `tests/world.test.ts`: ทุก identity ต้องมี frame แยกกัน ไม่ยกเว้น placeholder อีก

ค่า field/HP layout rise คง `(497−5)/512` ตาม mapping เดิมเพื่อไม่เลื่อนสนามหรือ anchor ของท่าที่อนุมัติไว้; ขอบ caption ใช้ trim ของเฟรมจริงแยกจาก layout ไม่เปลี่ยน rules/save/catalog/balance/playback timing, incoming เดิม, atlas แอนิเมชัน, VFX หรือ Rise Beyond; ไม่ merge #292

Quality: typecheck/lint/build ผ่าน, unit 2,038 ผ่าน / 23 skipped, coverage:presentation 6/6 ไม่เปลี่ยนรายงานเดิม; full browser gate ให้ CI ตรวจตามปกติก่อน merge
