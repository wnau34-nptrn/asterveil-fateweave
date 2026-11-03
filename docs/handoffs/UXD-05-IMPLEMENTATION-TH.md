# UXD-05 — สร้างอาวุธ / รีไซเคิล / หลอมแร่

เผยแพร่ครบ PR #142 + #143 · 2026-11-04 01:23:05 Asia/Bangkok · final runtime merge `75f0c7c151f3b7190a10555b185faf7fc8600479`

เริ่มงาน 2026-11-03 (Asia/Bangkok) · สาขา `codex/uxd-05-craft-recycle-smelt` · ฐาน `fda92e36943944d15ce97b9e8c35cfce704ccdd8`

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

## Follow-up เพดานฝุ่นเดิม — PR143

หลัง PR142 merged พบ mismatch เดิม: smeltReason ไม่เช็กเพดาน bank.dust9,999,999 ของ validator v45 เมื่อเต็มแล้วยังหลอม1ได้เป็น10,000,000, saveGameคืนtrueแต่ parseGameปฏิเสธ Invalid bank Repro ผ่านจริงก่อนเพิ่ม guard (ไม่เก็บ regression ที่บังคับให้ core defect คงอยู่)

PR143 เพิ่มเฉพาะ UI guard ใน workbench: ปิดตัวเลือก1/5ที่เกินเพดานคลังเดิม แจ้งเหตุผลและตรวจซ้ำก่อน host หลอมถึงเพดานพอดีได้พร้อม serialize/parse/reload regression ไม่แก้ core/world/core/save/schema/ราคา/อัตราหลอม/โควตา/RNG/สมดุล ฝาก mismatch ไว้ในหัวข้อฝากถึง Claude แล้ว

## การตรวจและ release

- PR142 head26913b6: quality41663593300 และ browser41663593365 ผ่าน (unit1467/104, source565 + focus3 + production78/80/76/84 =318 ครบ4+aggregate); merged159058e และ Pages41672891117 เผยแพร่ชุดหลัก 2026-11-04 00:09:28 Bangkok
- [PR143](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/143) head6de4086: quality41674505325 ผ่าน typecheck/lint/unit1470/104/build และ browser41674505111 ผ่าน source565 + focus3 + production79/81/76/84 =320 ครบ4shards+aggregate ไม่รวม skips เป็นผลผ่าน
- Final merge `75f0c7c151f3b7190a10555b185faf7fc8600479` ใช้ expected-head guard และมี treeตรงPR head `d8570954c98d8e5ddd40ad7e400d6c1356b8d9b0` ไม่มี base drift จาก159058e
- [Post-merge quality41683593840](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41683593840) และ [Pages41683594383](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41683594383) บน final merge ผ่าน build/browser4/deploy; deploy job 126116992951 รายงาน Reported success! 2026-11-03 18:23:05 UTC = 2026-11-04 01:23:05 Asia/Bangkok [เกม](https://wnau34-nptrn.github.io/asterveil-fateweave/) ยืนยันจาก workflow/head/deploy log ไม่อ้าง live URL/browser จาก executor
- Local ก่อน I/O ค้าง: focused unit101/9, full1467/104, typecheck/lint/build Pages และ production browser26 distinct ผ่าน (25 รอบหลัก + quota1 หลังแก้ native option property; ไม่บวก baseline/dev/retries) ใช้ CLI allowance unit60s/browser120s เพราะ environment ช้า Repo/CI timeout เดิม
- หลัง guard: local typecheck/lint/build Pages/service unit29 ผ่าน Browser8 ค้างที่case3และ full1470ไม่จบ ไม่อ้าง local ผ่านส่วนนี้ Current CI ที่ timeoutมาตรฐานผ่าน1470/104 และ production320 รวมสอง browser cases ใหม่ที่เพดานเต็ม/ถึงเพดานพอดี+reload
- QA เคยพบ BossPower fixtureผิด type (แก้เป็น aegis), lint2จุด, dev browserถูกรบกวนด้วยVite reloadจึงย้ายเป็นproduction, full unit timing timeout5sในbalance-sim (39.4s), และ toBeDisabled ไม่ตรวจ native option จึงใช้ disabled property ตรง ๆ ไม่ลด assertion ยอด/ของ/การบันทึกหรือเปลี่ยน timeoutในrepo
- Focused coverage: fixed blueprint/ราคา/เพดาน/คลัง/ของรอรับ, ไม่auto-equip/ไม่เพิ่มpity/RNG, UIDและทุนที่หาย/legacyเครดิต/lock/worn/boss/full, quota0/1/4/5, ยอดมี/ใช้/ได้รับ/หลังทำจริง, readonlypreview/cancel, staleProfile/recipe/task/quantity, heldEnter/doubleconfirm, next preview, reload, context/focus/Escape และ storage failure
- ภาพ review/result จริงครบ craft/recycle/smelt390×650/844 ตรวจแล้ว พร้อม regression320×568/desktop1366×768 และ text200%+insetsจำลอง59/34 ทั้งสามงาน Bodyเลื่อนได้และ dockเข้าถึงได้ ภาพหลักมาจากruntime PR142; guardไม่เปลี่ยน layout ปกติ ภาพอยู่ในchatและ /tmp/uxd-05/ พร้อมสำเนา local docs/validation/uxd-05/ อย่างละ2ภาพต่องาน (review844/result650) ตัวอย่างแยกfixtureเริ่มแร่120ฝุ่น48: craftLv3ใช้30/6→90/42, recycle#1รับ32/6→152/54, smelt5ใช้แร่40→80/53
- Environment รายงาน running/connected แต่ local บางคำสั่งและ Playwright ติดรอ I/O โดยยังไม่ทราบต้นเหตุ ไม่ reset workspace หรือแก้ auth เอกสาร release 4 ไฟล์ส่งผ่าน GitHub connector แบบ expected-head guarded fast-forward ไม่ force ตรวจเนื้อหาและ whitespace ของข้อความเพิ่มผ่าน API; ไม่อ้างว่า final git diff --check รันสำเร็จ เก็บ draft และภาพ local ไว้ (PNG ยังไม่ได้ commit) ห้ามนำ draft เก่าทับ release; งานครั้งถัดไปตรวจ remote head ใหม่ก่อนจัด workspace

ใช้ Chromium /usr/bin/chromium และ emulation เท่านั้น ไม่มี Safari/iPhone/มือถือจริง/ผู้เล่นจริง ไม่สรุป human usability หรือเปอร์เซ็นต์ปรับปรุงจาก emulation ไม่พบ CURRENT_STATE.md ไม่เริ่ม UXD-06/P04/P09/ดาวหรืองานถัดไปอัตโนมัติ
