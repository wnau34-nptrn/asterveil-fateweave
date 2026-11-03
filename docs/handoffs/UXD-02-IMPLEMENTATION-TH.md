# UXD-02 — หน้าเลือกงานโรงตีเหล็กและเพิ่มเลเวลอุปกรณ์

เผยแพร่แล้วผ่าน [PR #139](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/139) merge32cf6ce3b2d6617d99b71ffec0495d09cb9a5c2b: exacthead639793f quality41562079992/browser41562079906ครบ4+aggregateผ่าน; [Pages41567220931](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41567220931) build/browser4/deployผ่านทั้งหมด logsuccess2026-11-03T03:17:48Z (10:17:48 Asia/Bangkok) เกม https://wnau34-nptrn.github.io/asterveil-fateweave/

ผลlocalสุดท้าย31browserdistinct (30รอบงานช่าง+NPC1), unit1407/101files, lint/typecheck/buildPagesผ่าน รายละเอียดและประวัติด้านล่างเป็นบันทึกระหว่างทำ ให้ยึดผลปิดงานนี้เมื่อมีคำว่าpending ไม่มีการทดสอบSafari/iPhoneจริง/liveHTTPจากexecutorนี้

ฐานเกม `cce1bf0` (รวมแก้ safe area ของกรอบ iPhone และภาพเกราะ PR #137–138) · สาขา `codex/uxd-02-forge-launcher-level` · อ้างอิง ART-UI-UX-002/IMPLEMENTATION_PLAN_TH.md และภาพ04 โดยใช้ชื่อ ค่าใช้จ่าย เพดาน และภาพจริงจากเกม

## ขอบเขตและทางเข้า

เปิดช่างจากเมนูค่าย/NPC → หน้าเลือกงาน 8 คำสั่ง: ตีบวก, เพิ่มเลเวลอุปกรณ์, เลื่อนความหายาก, สุ่มคุณสมบัติ, ถ่ายโอนคุณสมบัติ, สร้างอาวุธ, รีไซเคิล และแปรรูปแร่เป็นฝุ่น แสดงคำอธิบายสั้นและปิดคำสั่งที่ยังไม่ปลดล็อกจาก feature gate เดิม

ปุ่มพัฒนาจากอุปกรณ์ยังเปิดตีบวกชิ้นเดิมโดยตรง ปุ่มเลือกงานบนหัวหน้าต่างเปลี่ยนคำสั่งได้โดยคง UID และตัวกรอง เมื่อยังไม่มีชิ้นจึงเปิดตัวเลือกอุปกรณ์ การสร้างอาวุธ/แปรรูปแร่ใช้ข้อมูลของงานนั้น ไม่ใช้ชิ้นเดิมเป็นวัตถุดิบโดยอัตโนมัติ

หน้าสุ่ม หลอมสี ถ่ายโอน สร้าง รีไซเคิล และแปรรูปแร่ยังใช้กระบวนการและกฎเดิม รอบนี้เพิ่มทางเข้าที่ชัด ไม่ถือว่าปิดงานออกแบบ UXD-03–05

## หน้าเพิ่มเลเวล

ใช้โครงหน้าคำสั่งที่ผ่านแล้วร่วมกับตีบวก: ภาพชิ้น96px/ผู้สวม → Lv ก่อน–หลังและเพดานถาวรที่ปลดล็อก → ผลจริงต่อผู้สวมหรืออุปกรณ์ → รายละเอียดพับ/ทุนพัฒนา → ค่าใช้-มี-เหลือ → ตรวจรายการ → ยืนยัน

เพิ่มทีละ1 Lv ตามพฤติกรรมหน้าจอเดิม ราคาจาก itemLevelCost เพดานจาก itemLevelCap ผลอุปกรณ์และผู้สวมจาก itemStats/starred/character metrics เดิม ข้อความเรื่องเงื่อนไขปลดเพดานและคืนทุนใช้ข้อมูล map และ levelInvestment จริง ไม่มีการย้าย camp Lv ของตัวละครมารวมกับ Lv อุปกรณ์

สำเร็จจาก forged/level ที่ host บันทึกจริงเท่านั้น ส่ง canonical persisted Profile เข้า receipt แบบเดียวกับตีบวก แสดงขั้นที่เพิ่งทำสำเร็จค้างไว้จนกดดูขั้นถัดไป การดูขั้นถัดไปไม่ใช้วัสดุและไม่ยืนยันรอบถัดไปเอง

## ขอบเขตคำสั่งและบริบทย้อนกลับ

Review ผูกกับ Profile เดียว เปลี่ยนงาน ชิ้น ผู้ทดลอง หรือข้อมูลแล้วใช้ review เดิมไม่ได้ ตรวจขั้นถัดไป ค่าใช้จ่าย เพดานและทรัพยากรซ้ำก่อนเรียก host ของเพิ่มเลเวล ล้าง review ก่อนส่งคำสั่ง ป้องกัน confirm/double click/held key ซ้ำ

Escape จาก review กลับไปแก้ไขและคืน focus ปุ่มเดิม จากตัวเลือกชิ้นกลับชิ้นเดิมหรือหน้าเลือกงาน จากเมนูเลือกงานที่เปิดระหว่างพัฒนากลับหน้าคำสั่งเดิมได้ การปิดช่างจากบริบทตัวละคร/คลังยังคืน tab/slot/filter/scroll/focus เดิม

ไม่มี core/battle, core/world, core/save, content, ราคา, RNG, schema, viewport หรือเวลาแอนิเมชันเปลี่ยน รูปเกราะที่คืนต้นฉบับและ gear URL revision3935edef คงเดิม

## หน้าจอและการตรวจ

คง safe-area frame ที่แก้แล้ว (ขั้นต่ำ8px/เคารพ insets) ทั้งหน้าเลือกงาน ตัวเลือกชิ้น และหน้าคำสั่ง ปุ่มเลือกงานอยู่หัวหน้าต่าง ไม่ถูก dock บัง ใช้ DOM/CSS และ SVG trim เดิม ฟอนต์ rem/ข้อความ200% และ layout observer เดิมช่วยย้ายค่าใช้จ่ายเข้าพื้นที่เลื่อนเมื่อจอสั้น

เทสต์ใหม่ item-level-review.test.ts ตรวจ launcher/lock/selected UID/stale review/switch item+task/single commit/receipt/explicit next/shortages/cap และ forge-tasks-level.spec.ts ตรวจ320×568/390×650/390×844/desktop,200%text,rotation,ค่าใช้จ่าย/ledgerจริง,กลับบริบทตัวละคร ก่อนยืนยันและยกเลิกไม่เขียนเซฟ

ปรับ helper เทสต์คำสั่งเก่าให้กดหน้าเลือกงานอย่างผู้เล่น รักษาการตรวจเงินจริง ผลหลอม/ถ่ายโอน/คืนทุน/โหลดเซฟ ไม่ทำเพียงเปลี่ยน selector ให้ผ่าน

ผล local/CI/merge/Pages และภาพ390pxจะบันทึกใน CODEX-TO-CLAUDE.md ตาม commit จริง งานนี้ยังไม่มี Safari/iOS/เครื่องจริง/ผู้เล่นจริง ไม่อ้างว่าผ่าน UXD-08 หรือเริ่ม P04/P09/หน้าดาว/สกิลจากการเปลี่ยนโรงตีเหล็ก

## ผล local สุดท้าย

Lint/typecheck/buildPagesผ่าน, fullunit1407/101filesผ่านหลังแก้itemPicker, focusedunit15ผ่าน, productionChromiumbrowser30ผ่าน (4.8นาที) บนruntimeคงที่ รวมหน้าใหม่6กรณี/ทางเข้าโลก3/งานช่างเดิม21 ไม่บวกซ้ำผลdev ภาพ390pxใน /tmp/uxd-02/launcher-390.png และ level-390.png ตรวจด้วยตาแล้ว

จับและแก้บั๊กย้อนกลับcraft/smeltที่ไม่มีUIDถูกมองเป็นpicker และreceiptหายเมื่อเปลี่ยนผู้ทดลองreadonly มีregressionทั้งunit/browser ส่วนselectorsเก่าปรับให้ใช้launcherใหม่โดยรักษาchecksเงิน/คืนทุน/เซฟเดิม ผลPR/Pagesยังรอดำเนินการ ดูhandoffบนสุด

PR #139 รอบ119a188: qualityผ่านunit1407; browser shard4พบNPCspecคาดชื่อหัวหน้าต่างเดิม2จุด ปรับexpectationใหม่โดยคงการทดสอบNPCทั้งหมด productionNPCผ่าน1กรณีเพิ่ม (local31distinct); runtimeไม่เปลี่ยน รอCIheadใหม่ครบ
