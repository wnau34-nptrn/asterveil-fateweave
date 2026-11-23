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

- ตามคำเลือกของเจ้าของ Tide Lash ใช้ R2 ส่วน Undertow และ Reflection ใช้ R1 ชุดกึ่ง chibi จาก [PR #346](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/346) มี 30 เฟรมต้นฉบับในช่อง 1024×1024 และใช้ช่อง runtime 768×768 จุดยึดอยู่ที่ 7/8 ขนาดท่ายืนใกล้กับผู้คุมรอยแยก ภาพนิ่ง 512×512 และไอคอนใบหน้าใช้ seed เดียวกับแอนิเมชัน
- ปรับสเกลภูตหมอกน้ำ ปูเกราะหิน และเงาสะท้อนให้เทียบกับวิญญาณรอยแยก แมงมุมเศษผลึก และนักล่าเผ่าอสูรตามลำดับ สเกลบอสอิงผู้คุมรอยแยกตามเดิม คลิปใหม่ตรวจให้เงาสะท้อนอยู่ในกรอบสนามเมื่อถูกเรียก
- Water Veil ออกจังหวะฟื้นพลังเมื่อมี heal จริง หากถูกผนึกจะเห็นเพียงภาพรวมพลังจางลงตามจังหวะยกเลิกเดิม คลื่นทั้งสองขึ้นที่เท้าของผู้รับผล และ Reflection ขึ้นที่เท้าเงาสะท้อนที่ถูกเรียกจริง VFX อยู่หลังตัวละคร ส่วนป้าย HP และตัวเลขผลการต่อสู้วางอยู่ด้านหน้า
- งบกรณีทีม 5 ที่ใช้ atlas หนักที่สุดคือ 61.7 MiB สำหรับตัวละคร และ 1.1 MiB สำหรับ VFX เฉพาะบอส รวม 62.8 MiB จากเพดาน 64 MiB ไฟล์ภาพตัวละครและ VFX เฉพาะบอสดาวน์โหลดรวมราว 17.9 MB เทียบกับเป้าหมาย ~12 MB [รายงานงบ](../../validation/w8-field-audit/BUDGET_TH.md)
- เจ้าของตอบ “อนุมัติ” หลังชมพรีวิว motion 390 พิกเซลของ PR #346 เมื่อ 2026-11-23 คลิปด้านบนจับซ้ำจากไฟล์ที่เกมโหลดจริง ทดสอบให้ภาพนิ่งสำรองคลาดจากขอบภาพในแอตลาสไม่เกิน 1 พิกเซล CSS ที่จอ 390 พิกเซล การเล่นบน Safari และมือถือจริงยังรอการตรวจ

## ทำซ้ำ

```sh
python3 -I scripts/build-lake-boss.py <chibi-package-dir> --body-only
python3 scripts/portraits-half.py
npm run coverage:presentation
LAKE_BOSS_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- tests/browser/lake-boss-clips.spec.ts --trace off
```

คลิป WebP ประกอบจากเฟรม CDP ตามช่วงห่าง timestamp และค้างเฟรมสุดท้าย 300 ms

สคริปต์ตรวจ SHA-256 ของไฟล์ภาพที่ใช้และประกอบกลับจาก atlas เพื่อเทียบ alpha และ RGB ที่มองเห็น การนำเข้า VFX เดิมตรวจเทียบกับไฟล์ต้นฉบับโดยตรง ส่วนการนำเข้าเฟรมร่างกายกึ่ง chibi ตรวจเทียบกับภาพหลังปรับเป็น 768 px [ข้อมูล atlas](../../validation/map4-lake/boss-runtime.json) · [ข้อมูลคลิปและ SHA-256](clips.json)
