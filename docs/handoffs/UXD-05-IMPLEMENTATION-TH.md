# UXD-05 — สร้างอาวุธ / รีไซเคิล / หลอมแร่

วันที่ 2026-11-03 (Asia/Bangkok) · สาขา `codex/uxd-05-craft-recycle-smelt` · ฐาน `fda92e36943944d15ce97b9e8c35cfce704ccdd8`

## ฐานและ baseline

Environment รอบนี้เป็น checkout เอกสารเก่าบน `work` ที่ `e51998c` และสะอาด ไม่มี Artwork workspace `/workspace/uxd-art-progress` ไม่ reset หรือแก้ auth ตรวจ GitHub connector และ git ls-remote ว่า remote `feature/fateweave-initial-prototype` ตรง `fda92e3`; compare และ git merge-base ยืนยันต่อจาก UXD-04 merge `caeed26` ด้วยเอกสาร release 1 commit แล้ว fetch/switch สาขาใหม่ตรงฐานนี้ ไม่รวม checkpoints `cc51cd4` / `bcd6133`, สาขา release UXD-02 หรือ merge ART PR #133

ไม่พบ CURRENT_STATE.md ใน workspace จริงหลัง checkout อ่าน AGENTS/CLAUDE/handoff และ UXD-04 implementation แล้ว อ่านแผน `IMPLEMENTATION_PLAN_TH.md`, `EQUIPMENT_DEVELOPMENT_TH.md` และดูภาพ `06_crafting_recycle_smelt.png` จาก Artwork ref `a77d17b` แยกจากเกม ยึด release ในเกมเป็นหลัก เพราะแผน Artwork ยังเรียก UXD-02–04 ว่าค้าง

Baseline ก่อนแก้: ตรวจ flow และภาพจริงทั้งสามงานพร้อม review ที่ 390×844 / 390×650 (2 browser cases ที่ `/tmp/uxd-05/baseline-*.png`) หน้าเดิมยังใช้ tabs/bank/footer เก่า, review ยังแสดง selectors เดิม, craft กระโดดไปตีบวกหลังทำ, recycle/smelt ไม่มี receipt เฉพาะงาน Escape ปิดทั้งหน้าช่าง

## พฤติกรรมใหม่

- ทั้งสามงานใช้กรอบ, task navigation, body scroll เดียว, dock, safe area, review/Escape/focus และ receipt ร่วมแนว UXD-01–04 โดยใช้ภาพอุปกรณ์/ไอคอน registry เดิม
- สร้างอาวุธ: เลือกสมาชิกที่ถือครองและ Lv ภายใน `itemLevelCap`; blueprint และราคาอ่าน `weaponBlueprint`/`weaponCraftCost`/`weaponCraftReason` เดิม ผลแน่นอนไม่สุ่ม เข้าคลัง 1 ชิ้น ไม่ auto-equip ไม่เพิ่ม pity ไม่เปลี่ยนเป็นงานตีบวกเอง แสดงคลัง/ของรอรับและทางไปจัดคลังแล้วกลับสูตรเดิม
- รีไซเคิล: เห็น UID/ภาพ/Lv/+/lock/เซ็ต/คุณสมบัติและพลังที่เสีย ทำลายทั้งชิ้น แจกแจงพื้นฐาน/ทุนตีบวก/ทุนเพิ่ม Lv/ยอดรวมจาก `salvageValue` และ investment เดิม แสดงเครดิต legacy + ไม่มี refund ค่าผลิต/สุ่ม/ถ่ายโอนหรือ donor เก่า ไม่ปลด lock/ถอดให้อัตโนมัติ ของบอสที่ core อนุญาตยังทำได้พร้อมคำเตือน
- หลอม: อัตราอ่าน `forge.smeltOre`, จำนวน 1/5, โควตาอ่าน `smeltLeft` และ `smeltCap`, ระบุเริ่มใหม่เมื่อกลับค่ายจากการเดินทาง ปิดตัวเลือก 5 เมื่อโควตาไม่ถึง แยกใช้แร่/รับฝุ่น/ก่อน–หลัง ไม่สร้างโควตารายวันหรือแลกย้อน
- Review ซ่อนตัวเลือกแก้ไข เก็บสูตร/UID/จำนวนกับ Profile identity และ fingerprint ตรวจ Profile/eligibility ซ้ำก่อนส่ง host ล้าง review ก่อนเรียก ป้องกัน stale/repeat confirm ไม่มี RNG ใน preview
- Receipt แยกการเขียนเซฟล้มเหลวด้วย saved flag ของ shell: แสดงผลในรอบนี้โดยไม่อ้างว่าบันทึกถาวรและไม่มี repeat confirm ไม่เปลี่ยนกลไก save เดิม ผลสำเร็จที่บันทึกแล้วเกิดจาก matching forged/craft, salvaged หรือ smelted หลัง shell persist ใช้ canonical Profile และยอดเงินจริง ไม่เปลี่ยนเป็นผลสำเร็จจากปุ่ม confirm เอง ดูขั้นถัดไปเป็น readonly คงสูตร/จำนวน เลือกชิ้นถัดไปหลังรีไซเคิลไม่สั่งงานเพิ่ม
- คง return context ตัวละคร/คลัง ตัวกรองและ scroll; ถ้าชิ้นต้นทางถูกทำลายแล้ว focus กลับหัวหน้าคลังแทนปุ่ม UID ที่ไม่มีแล้ว ทางจัดคลังมี back/Escape กลับสูตรพร้อม focus

Runtime เปลี่ยนเฉพาะ `src/ui/forge-workbench.ts`, `forge-enhancement.css`, `lobby-ui.ts`, `game-shell.ts` ไม่มี core/content/public, ราคา, RNG, สมดุล, schema/save หรือ battle rules เปลี่ยน ไม่เริ่ม UXD-06/P04/P09/ดาว/เศรษฐกิจใหม่

## การตรวจและสถานะ

กำลังตรวจ local QA; ยังไม่ถือว่า CI/merge/Pages สำเร็จ

- Focused unit รอบแรก 56 ผ่าน (service 24 + transfer/fusion/reroll regression 32); typecheck/lint/build Pages ผ่านหลังแก้ fixture BossPower และ lint
- Browser รอบ development แรกถูกรบกวนโดย Vite reload ระหว่างแก้ จึงหยุดและเปลี่ยนตรวจ production build ใต้ Pages subpath รอบ production แรกมี timeout ขณะ full unit รันพร้อมกัน และ case ใหม่รวมสามงานยาวเกิน timeout เดิม จึงแยก case ต่อตัวงาน/ขนาด โดยคง assertions เงิน/ของ/การบันทึก/reload ไม่ลด assertion หรือเพิ่ม timeout
- Full unit รอบแรกมี timing failures ใน battle-playback และ balance-sim ระหว่างรันพร้อม browser; หยุดและกำลังรันเต็มใหม่ด้วย maxWorkers=1 แยกจาก browser ไม่เปลี่ยน rule/test timeout
- ภาพจริงที่ต้องตรวจครบ: review/result ของ craft/recycle/smelt ที่ 390×650 และ 390×844, text200%/safe insets จำลอง 59/34 พร้อม regression 320×568 และ desktop

ใช้ Chromium `/usr/bin/chromium` และ emulation เท่านั้น ยังไม่มี Safari/iPhone/มือถือจริงหรือผู้เล่นจริง
