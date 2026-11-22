# เฟส 4 ภูตธารา · แผนที่ 4 ทะเลสาบเงาจันทร์

คลิปจาก Phaser และ Battle UI ที่ 390×844 ใน Chromium จำลองจอสัมผัส แยก turn ที่ต้องการจาก encounter จริงของภูตธารา โดยคงลูกน้องและช่องตัวสำรองในสนาม

| ท่า | คลิป |
| --- | --- |
| Tide Lash R2 | [ชมคลิป](tide-lash-390.webp) |
| Water Veil R1 | [ฟื้น HP](water-veil-390.webp) · [ถูกผนึก](water-veil-sealed-390.webp) |
| Surging Wave R1 | [ชมคลิป](surging-wave-390.webp) |
| Undertow R1 | [ชมคลิป](undertow-390.webp) |
| Great Wave R1 | [ชมคลิป](great-wave-390.webp) |
| Reflection R1 | [เรียกเงาสะท้อน](reflection-390.webp) |
| ท่าล้ม | [ชมคลิป](down-390.webp) |

- ตามคำเลือกของเจ้าของ Tide Lash ใช้ R2 ส่วน Undertow และ Reflection ใช้ R1 ชุดร่างกายต้นฉบับจาก PR #339 มีช่อง 1024×1024 และแปลงเป็นช่อง runtime 768×768 ตามคำอนุมัติ จุดยึดอยู่ที่ 7/8 และขนาดท่ายืนใกล้กับผู้คุมรอยแยก ภาพนิ่ง 512×512 มาจาก ready seed
- Water Veil ออกจังหวะฟื้นพลังเมื่อมี heal จริง หากถูกผนึกจะเห็นเพียงภาพรวมพลังจางลงตามจังหวะยกเลิกเดิม คลื่นทั้งสองขึ้นที่เท้าของผู้รับผล และ Reflection ขึ้นที่เท้าเงาสะท้อนที่ถูกเรียกจริง VFX อยู่หลังตัวละคร ส่วนป้าย HP และตัวเลขผลการต่อสู้วางอยู่ด้านหน้า
- งบกรณีทีม 5 ที่ใช้ atlas หนักที่สุดคือ 59.0 MiB สำหรับตัวละคร และ 1.1 MiB สำหรับ VFX เฉพาะบอส รวม 60.1 MiB จากเพดาน 64 MiB ไฟล์ภาพตัวละครและ VFX เฉพาะบอสดาวน์โหลดรวมราว 17.1 MB เทียบกับเป้าหมาย ~12 MB [รายงานงบ](../../validation/w8-field-audit/BUDGET_TH.md)
- รอเจ้าของตรวจ motion จากคลิปชุดนี้ การเล่นบน Safari และมือถือจริงยังรอการตรวจ

## ทำซ้ำ

```sh
python3 -I scripts/build-lake-boss.py <package-dir>
python3 scripts/portraits-half.py
npm run coverage:presentation
LAKE_BOSS_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- tests/browser/lake-boss-clips.spec.ts --trace off
```

คลิป WebP ประกอบจากเฟรม CDP ตามช่วงห่าง timestamp และค้างเฟรมสุดท้าย 300 ms

สคริปต์ตรวจ SHA-256 ของไฟล์ภาพที่ใช้และประกอบกลับจาก atlas เพื่อเทียบ alpha และ RGB ที่มองเห็น เฟรม VFX เทียบกับไฟล์ต้นฉบับโดยตรง และเฟรมร่างกายเทียบกับภาพหลังปรับเป็น 768 px [ข้อมูล atlas](../../validation/map4-lake/boss-runtime.json) · [ข้อมูลคลิปและ SHA-256](clips.json)
