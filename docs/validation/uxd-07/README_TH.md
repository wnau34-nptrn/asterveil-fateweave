# UXD-07 — รวมหน้าสกิลและหลักฐานการตรวจ

สถานะ: implementation เสร็จ กำลังตรวจขั้นสุดท้ายก่อน merge/Pages · [PR #145](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/145)

ฐาน remote `ab06dfd6cdd70b41bd6be721a85bf59e65289a7f` สืบจาก UXD-06 release `b3ad98e` บน `feature/fateweave-initial-prototype` สาขา `codex/uxd-07-unified-skills` ไม่รวมสาขา audit/Artwork หรือ checkpoints เก่า `cc51cd4`/`bcd6133`

## ผลที่ได้

- เหลือ 4 แท็บหลัก ภาพรวม/อุปกรณ์/สกิล/พัฒนา ผังเดิมอยู่ใต้สกิล ทางเข้า NPC/ทีม/กระเป๋า/พัฒนายังคงบริบทเดิม
- ดูชุดติดตั้งและเลือกสกิลได้ใกล้กัน ปุ่มติดตั้ง/ถอดอยู่ข้างตัวเลือก จำนวนช่อง/อย่างน้อยหนึ่งสกิลอ่านกฎเดิม ไม่สั่งติดตั้งจากการเลือกหรือ preview
- สลับรายละเอียด/ผัง/ตำราโดยคงสกิล ไปโหนด unlock หรือ choice ที่อ้าง ActionId เดียวกัน และกลับสกิลเดิมได้ เปรียบเทียบคำอธิบายผลปัจจุบัน/ถัดไปด้วย `skillDescription`/`withParty` เดิม ไม่สร้างสูตรใหม่
- เพิ่ม Lv/แลกตำรามี review จาก read-only `raiseSkill`/`tradeTomes` ก่อนส่งคำสั่ง แสดงต้นทุน/ยอดหลังทำและสรุปยอดติดปุ่มยืนยัน ตรวจ Profile identity/fingerprint กับ eligibility ซ้ำ consume review ก่อน host ป้องกัน stale/reentry/held Enter/double click
- Receipt รับ matching event และ canonical Profile หลัง persist เท่านั้น ตรวจ projected Profile ทั้งชุดยกเว้น `last` ที่ GameShell canonicalize แยก storage failure ชัดเจน กลับไปดูไม่ส่งคำสั่งเพิ่ม
- รักษา focus/scroll/fold ตำราและทางกลับ คืน focus ไปส่วนเดิมเมื่อปุ่มต้นทางหายหลังแลกจนหมดหรือถึง Lv5 รีเซ็ตแต้มฟรีมีคำยืนยันและเตือนคืนชุดเริ่มต้น คง skill levels/grants ตามคำสั่งเดิม
- ไม่เปลี่ยน `src/core`, content, assets, save schema, ราคา, RNG, สมดุล หรือ battle rules ไม่มี dependency ใหม่ ไม่เริ่ม UXD-08/P04/P09

รายละเอียด: [implementation](../../handoffs/UXD-07-IMPLEMENTATION-TH.md) · [แผน Artwork ที่อ่านแยก](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-ux-002/incoming/ART-UI-UX-002/IMPLEMENTATION_PLAN_TH.md) · [audit ก่อนเริ่ม](https://github.com/wnau34-nptrn/asterveil-fateweave/blob/codex/ux-ui-audit-2026-11-04/docs/validation/ux-ui-audit-2026-11-04/REPORT_TH.md)

## การตรวจ

| รายการ | ผล/ขอบเขต |
| --- | --- |
| Typecheck, lint, Pages production build | ผ่านหลังแก้ implementation ล่าสุด; มี Vite chunk-size warning เดิม ไม่เปลี่ยน bundling ในงานนี้ |
| Focused unit | 98 กรณี / 6 files ผ่าน: skill review 18 รวม Lv5/core, capacity upsize/cross-line, stale replace/mutate/refresh, reentry, preview/cancel/no RNG, receipt/save reload/failure; รวม tomes/metrics/talents/star/context regression |
| Browser สกิลและ C11 หลังแก้ markup | 13 กรณีผ่าน ครอบคลุม 390×650/844, 320×568, desktop1366×768; ยอดเงินและตำราจริง, cancel/preview ไม่เปลี่ยนเซฟ, double confirm, held Enter, rotation/inert, deep links, min/max loadout, legacy save/reset, storage failure และ cap |
| Browser focus ขอบเขต | ผ่าน4กรณี (ซ้ำกับชุด13จำนวน3กรณี รวม coverageล่าสุด14 distinct): แลกจนต้นทางหมด, legacy reset, Lv5/core, 200% text+insets+เลื่อนไปอ่านแถวสุดท้าย |
| Regression ระหว่างพัฒนา | ชุดอัปดาว+สกิลก่อนรายละเอียดสุดท้าย 26 ผ่าน; หน้าตัวละครบนแผนที่/อุปกรณ์/สมาชิก C12/painted icons และ scrollbar ตรวจแยก อีกชุด17/18ผ่านโดย C11 ล้มเฉพาะ selector จับภาพกว้างเกินไป แก้ให้ชี้ detail card แล้วผ่านในชุด13 ไม่ลด assertion ค่า34%/เซฟ |
| Full local unit | รอบแรก1511/1516ผ่าน อีก4กรณีขาดรายงานใน sparse checkout และ boss-balance ชน180s ระหว่างงานอื่น; ดึงรายงานตรงHEADแล้ว focused37/5ผ่าน จะบันทึกผลรันเดี่ยวสุดท้ายแยกเมื่อจบ ไม่อ้างรอบแรกผ่านครบ |
| Final PR CI / post-merge / Pages | รอผลของ final head ก่อน merge/เผยแพร่ จะบันทึก run/commit ที่ตรวจจริงหลังสำเร็จ |

ไม่รวมผลรอบที่ขาดรายงาน การรันที่ยุติไปแล้ว skips หรือ retries เป็น pass เพิ่ม ชุด browser หลายรอบมีกรณีซ้ำ จึงไม่บวกยอดแต่ละแถวเป็นจำนวนกรณีใหม่

## เพดานตำราที่พบและส่งต่อ

`tradeReason`/`tradeTomes` เดิมไม่ตรวจปลายทาง: เมื่อมี99,999 แลกเพิ่มได้100,000 แต่ `tomesOf` ในเซฟv45รับ0…99,999 UI guard ตรวจผล projection ก่อน review/confirm และแจ้ง “ตำราขนาดปลายทางเต็มแล้ว · ยังไม่ใช้ตำรา” โดยไม่ dispatch ทดสอบทั้ง upsize/cross-line และขอบเขต99,998→99,999 ไม่มีการเปลี่ยนกฎกลางหรือ schema

ฝาก Claude แก้ authoritative command และตรวจ rewards ที่เกี่ยวข้องใน [คิวคำถาม](../../handoffs/CLAUDE-TO-CODEX-DEV-TH.md) ขอบเขต guard ครั้งนี้เฉพาะคำสั่งผ่าน review นี้ ไม่อ้างว่าแก้ทุกแหล่งรางวัลของเกมแล้ว

## ภาพเกมจริงจาก production build

ใช้ fixture แยกจากข้อมูลผู้เล่นจริง เป็น canvas/DOM ที่เกม render ไม่ใช่ mockup ภาพ390pxเท่านั้นสำหรับเจ้าของ ส่วน320/desktopตรวจด้วย browser assertions และภาพระหว่าง QA

| สถานะ | 390×650 | 390×844 |
| --- | --- | --- |
| สกิลที่เลือก / ติดตั้ง | [ภาพ](images/skills-650.png) | [ภาพ](images/skills-844.png) |
| ตรวจรายการ | [ภาพ](images/review-650.png) | [ภาพ](images/review-844.png) |
| ผลจาก Profile หลังบันทึก | [ภาพ](images/receipt-650.png) | [ภาพ](images/receipt-844.png) |

[ผังสกิลที่ไปตรงโหนด](images/tree-650.png) · [review แลกตำรา](images/tome-review-650.png) · [200% text + insetsจำลอง59/34](images/text-insets.png)

## ข้อจำกัดและงานที่ยังไม่ทำ

- Chromium touch emulation และ desktop Chromium เท่านั้น ยังไม่มี Safari/iPhone/Android เครื่องจริง หรือผู้เล่นจริง ไม่ถือว่า automation เป็น human usability results
- Safe area ใช้ตัวแปร CSS จำลองและตรวจกรอบ/ปุ่ม/การเลื่อนไปแถวสุดท้าย ไม่ใช่ผลจาก notch/แถบที่อยู่ของอุปกรณ์จริง
- Build/ภาพตรวจผ่าน local production preview ไม่อ้างว่าเปิดตรวจ URL Pages สดจาก executor; หลักฐานเผยแพร่ใช้ workflow/head/deploy log
- ข้อเสนอ audit เรื่องหน้าทีม ข้อมูลแผนที่ทับภาพ จำนวนคนรอบค่าย และกระเป๋ายังอยู่นอก UXD-07 ไม่มีการเริ่มแก้โดยอัตโนมัติ
