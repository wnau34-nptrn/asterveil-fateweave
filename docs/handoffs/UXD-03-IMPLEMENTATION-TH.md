# UXD-03 — เลื่อนความหายากและสุ่มคุณสมบัติ

วันที่ 2026-11-03 (Asia/Bangkok) · สาขา `codex/uxd-03-fusion-reroll` · ฐาน `186f430f54ceefccdd9935d65d18d73a4b5823cc`

## ฐานและ baseline

ตรวจ remote ผ่าน Git ls-remote และ GitHub connector: สาขาเกมยังตรง `186f430`; ancestry มี runtime merge UXD-02 `32cf6ce` และถัดมาเป็นเอกสาร release เท่านั้น ไม่มี CURRENT_STATE.md ทั้งใน workspace และ recursive tree ของฐานเกม ไม่พบ local checkpoint `cc51cd4` / `bcd6133`; ไม่ได้นำเข้า merge/cherry-pick/push checkpoint เหล่านั้น

environment เริ่มที่ `work/e51998c` มีเพียง README/CLAUDE ไม่มี src/AGENTS; default network ติดต่อ proxy8080 ไม่ได้ แต่คำสั่งที่เปิด network ใช้ได้ จึง fetch แบบ blob:none และ sparse checkout โค้ด/runtime assets/เอกสาร/JSON fixtures โดยรักษา work เดิม ใช้ Node24.19 และ npm ci ด้วย cache ใน /tmp; ไม่เปลี่ยน authentication/token หรือ package lock

ไม่มี workspace Artwork จึงอ่าน IMPLEMENTATION_PLAN_TH.md และภาพ04จาก `art/art-ui-ux-002` ที่ `a77d17b` แยกจากเกม ไม่ merge ART PR133; สถานะ UXD-02 ยึด release evidence ในเกม ไม่ยึด checkbox เก่าในแผนภาพ

ก่อนแก้รัน forge-phase2 ที่390×844 ผ่าน1กรณีและตรวจ fusion-review.png จริง: หน้าหลอมยังใช้แถบงาน/หัวหน้าต่างเก่า ไม่มีภาพ donor หรือทุนรายชิ้นใน review และไม่มี receipt เฉพาะงาน โค้ดยืนยัน developmentView/heading/receipt จำกัด enhance/level; stale confirm ของสองงานคืน focus ไปปุ่มที่ไม่มีอยู่ ตรวจ shell/lobby แล้ว: shell ไม่จับ Escape ใน lobby; lobby จัดการ top surface และตรวจ shortcutBlocked/rotation/repeat เดิม

## การทำงานใหม่

- ทั้งสองงานใช้กรอบ/nav/safe area/scroll region/dock เดียวกับตีบวกและเพิ่มเลเวล คง UID เมื่อเปลี่ยนงาน และกลับบริบทตัวละคร/ช่องอุปกรณ์เดิม
- แยกชิ้นหลักที่คงอยู่กับ donor ในคลัง: ภาพจริง UID/Lv/+/ความหายาก/ล็อก/ทุนตีบวก/ทุน Lv และช่องผูกถ่ายโอนเมื่อมี ของล็อกใช้ไม่ได้ ของสวมไม่เข้า donor pool ปุ่มแนะนำใช้ fuseMaterials เดิมและไม่ยืนยันแทนผู้เล่น
- Review ระบุ donor ที่หายทั้งชิ้น มี ledger มี/ใช้/คืนทุน/หลังทำ การหลอมไม่มีค่าบริการใหม่ คืนทุนจาก fusionRefund เท่านั้น ไม่คืนมูลค่าตัวอุปกรณ์ ชิ้นหลักคงอาชีพ/Lv/+/เซ็ต/คุณภาพ/คุณสมบัติเดิม/ทุนตามกฎ
- แสดง pool/ช่วงคุณภาพจาก affixPool/quality/affixCount และพลังตำนานจาก GEAR_SPECIALS เท่านั้น ไม่เรียก fuse/reroll/rollQuality หรือ RNG เพื่อ preview; จากล้ำค่าไปตำนานมีจำนวน affix เท่าเดิม จึงแสดงเพิ่ม0ช่องและ pool พลังตำนาน ไม่สัญญา affix ใหม่
- การสุ่มให้เลือกช่อง ระบุช่องคงเดิม ค่าใช้ตราสัญญาจากกฎจริง ไม่เสนอ keep/undo ที่ระบบไม่มี
- Confirm ตรวจ Profile guard และ fuseReason/rerollReason ซ้ำ ล้าง review ก่อนส่ง host; ป้องกัน held Enter/double-click เดิมยังทำงาน stale/Escape/cancel คืน focus ปุ่มของงานและ index ที่เลือก
- Receipt เกิดเฉพาะ forged/fuse หรือ forged/reroll ผ่าน shell หลัง persist และใช้ canonical Profile เดียวกับ host แสดงผลก่อน–หลังจริง donor ที่หาย และ bank ก่อน–หลังจริง คง receipt จนกดดูขั้นถัดไป การดูขั้นถัดไปไม่ใช้วัสดุ/ไม่สั่งงาน

ไม่มี core/world, core/save, core/battle, content, ราคา, RNG, สมดุล, schema, viewport หรือ asset เปลี่ยน ไม่เริ่ม UXD-04–06, P04/P09, ดาว หรือเศรษฐกิจใหม่

## การตรวจ

- Typecheck/lint/build: ผ่าน (build Pages; คำเตือน chunk ขนาดใหญ่เดิม)
- Focused unit: 31 ผ่าน รวม stale Profile, เปลี่ยนงาน/UID, repeat confirm, locked donor, cap/no affix, refund overflow, legendary pool, shortage และ receipt/explicit next
- Full unit: 1421 ผ่าน / 102 ไฟล์; production browser รอบรวม: 39 ผ่าน / 7.6 นาที ครอบคลุม fuse/reroll/level/enhance/refund/transfer/craft ที่320×568,390×650,390×844,480×844และdesktop รวม rotation/repeat/focus/200%text; หลังย่อหัวข้อหลอม focused visual+world11ผ่าน รวม production browser45distinct (39รอบรวม + world6ใหม่; ไม่บวกการรันซ้ำ5กรณี)
- Browser ใช้ Chromium `/usr/bin/chromium`; ตรวจ production build ผ่าน Playwright config เดิม ไม่อ้างว่าเป็น Safari/iPhone จริง
- ภาพ baseline `/tmp/uxd-03/baseline-fusion-390.png`; ภาพหลังทำจริง390pxใน `/tmp/uxd-03/fusion-review-650.png`, `fusion-review-844.png`, `fusion-result-650.png`, `fusion-result-844.png`, `reroll-review-650.png`, `reroll-review-844.png`, `reroll-result-650.png`, `reroll-result-844.png`; ตรวจด้วยตาแล้ว (ภาพเฉพาะworkspace ไม่commitเข้าrepo)

ยังไม่มีผล Safari/iPhone/มือถือจริงหรือผู้เล่นจริง จึงไม่อ้างปิด UXD-08 ไม่มีผล authenticated gh; สถานะ PR/CI ต้องดูจาก PR จริง ไม่ถือผล local เป็นผล GitHub Actions หรือ Pages

## สถานะส่งมอบ

ทำ implementation และ local QA แล้ว ส่ง PR กลับ feature/fateweave-initial-prototype ตามคำขอ ยังไม่ merge/deploy UXD-03; ไม่เริ่มงานถัดไปอัตโนมัติ
