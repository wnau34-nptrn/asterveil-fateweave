# UXD-06 — พัฒนาตัวละครและอัปดาว

เผยแพร่ครบ [PR #144](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/144) · 2026-11-04 08:30:52 Asia/Bangkok · runtime merge `b9031154edb5655145edac296ba44491693ef100`

เริ่ม 2026-11-04 (Asia/Bangkok) · สาขา `codex/uxd-06-character-star` · ฐาน `9bf63bd7c9dd966651ef536c971cb51b6876bb89` บน feature/fateweave-initial-prototype

## ฐานและ baseline

ตรวจ connector/git ls-remote และ compare ว่า remote ยังตรง release UXD-05 `9bf63bd7` ก่อนสร้างสาขา เดิม `/workspace/asterveil-fateweave` อ่านไฟล์ได้อีกครั้ง แต่ Git ไม่มี HEAD ที่ resolve ได้และแสดงไฟล์เดิมเป็น staged additions ไม่แก้/reset metadata หรือ draft/ภาพเดิม ใช้ shallow partial sparse checkout แยก `/workspace/asterveil-uxd-06-work` จาก remote แทน clone เต็มครั้งแรกยกเลิกเมื่อเห็นว่าจะใช้พื้นที่เกินจำเป็น (git ลบโฟลเดอร์ clone ที่ไม่สำเร็จเอง) ไม่ import checkpoint/สาขา release เก่าหรือ ART PR #133

ไม่พบ CURRENT_STATE.md ทั้งใน workspace และ tracked tree ไม่มี Artwork workspace อ่าน IMPLEMENTATION_PLAN_TH.md / STAR_UPGRADE_TH.md และภาพ03_character_star_upgrade.png จาก art/art-ui-ux-002 แยก ไม่ merge Artwork อ่านคำสั่ง repo/hand-off UXD-05 และ owner decisions; ขอบเขตเป็น UI ตามกฎเดิม ไม่เริ่ม P04/P09/UXD-07 หรือเพิ่มสกุลเงิน/เลื่อนอาชีพ

ก่อนแก้ตรวจ flow/code และภาพจริงหน้าทีม/ภาพรวมตัวละคร390×650/844 ด้วยproduction Pages build (baseline2casesผ่าน) ปุ่มดาวเดิมส่งhost.upgradeทันทีและติดกับเลิกจ้าง ไม่มีreviewหรือreceiptเฉพาะดาว Fixtureแรกไม่เปิดteam capabilityจึงติดหน้าระบบล็อก แก้fixtureให้เป็นveteranตามschemaเดิมก่อนเก็บbaseline ไม่แก้unlockกฎจริง

## พฤติกรรม

- ตัวละครมีแท็บพัฒนา บอกเลเวลค่ายร่วม ดาวรายตัว ตัวซ้ำ ทางเข้าสกิล/อุปกรณ์/ผังความถนัด ไม่มีอัปLvรายตัว คงแท็บความถนัดเดิมไว้ระหว่างรอ UXD-07 (จึงเป็น5แท็บชั่วคราว) ไม่รวมงานจัดหน้าสกิลของUXD-07
- ทางเข้าทีมเปิดหน้าอัปดาวของคนเดิมโดยไม่จ่ายทันที มีshortcutจากภาพรวม ตัวเลือกตัวละคร/แท็บเก็บcontext; reviewซ่อนตัวเลือกแก้ไข กลับไปแก้ได้ Escapeยกเลิกreviewก่อนออก คืนfocus/scroll/filter/team selection
- Previewใช้upgradeCost/sealLimit/upgradeReason/starred/wounded/talentPointsเดิม เทียบผลคนเดิมพร้อมgear/wound/level; ต้นทุน4ขั้น1/20,2/40,3/70,4/110ตามconfig ใช้ตัวซ้ำก่อนตรา เพดานceilอ่านจากระบบ แยกขาดตัวซ้ำขั้นต่ำ/ตรา/แร่พร้อมกัน ไม่ปลดสกิลจากดาวให้big treeที่ใช้ผัง ไม่เพิ่มSPD/เทิร์น
- Reviewเก็บProfile identity+fingerprint+คนที่เลือก ตรวจeligibilityซ้ำและconsumeก่อนdispatch ป้องกันreplace/mutate/member/tab/repeat/heldEnter ไม่มีRNG/จ่ายจากpreview/cancel/next
- Receiptรอmatching upgraded event และcanonical Profileหลังpersist ตรวจดาว/member/bankกับผลupgradeเดิม แสดงยอดจริง/ผลจริง แยกstorage failureไม่อ้างบันทึกถาวร ป้องกันdouble-clickข้ามไปnextและคืนfocusที่สถานะ ไม่auto-upgradeขั้นถัดไป
- อัปดาวยังเป็นcapabilityของค่ายตามteam unlockเดิม บนexpeditionไม่เปิดคำสั่งใหม่ ★5ไม่มีปุ่มจ่ายหรือเลื่อนอาชีพ ย้ายarchive/dismissใต้จัดการสมาชิกและคงconfirm/last-member rulesเดิม
- Bodyเลื่อนเดียว dockแยกfooter แสดงcost summaryเสมอ safeareaสงวนรอบdialog ปุ่ม≥44px ไม่ใช้assetsใหม่

- ดูวิธีหาวัตถุดิบในบริการที่เปิดแล้ว: แสดงป้ายจ้างและโควตาใบสัญญาซ้ำ/ตราในตลาดจาก shopLeft จริง ไม่จ้าง ซื้อ เปลี่ยนป้าย หรือเรียก RNG ให้เอง

Runtime: src/ui/star-upgrade.ts / star-upgrade.css / character-panel.ts / character-view.ts / lobby-ui.ts / game-shell.ts ไม่มีcore/content/public/save/schema/prices/RNG/battle/balance diff

## QA และ release

- Runtime commit `c4dade5bb4b59b5757e3de2e4d686df81528f220`; test-only `f431e3d0f324de68a04b35365ebe672bfa7958fd` เปิดจัดการสมาชิกก่อน archive ทั้งสองขา ไม่แก้ assertion ข้อมูลสมาชิก
- [PR144](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/144) บนฐาน9bf63bd7 ผ่าน [quality41743802268](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41743802268): typecheck/lint/unit1492/105files/build ด้วย timeout มาตรฐาน และ [browser41743802275](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41743802275): source565, focus3, production 83/84/80/88 รวม 335 ครบ4shards+aggregate ไม่รวมskips/retriesเป็นpassเพิ่ม
- Merge `b9031154edb5655145edac296ba44491693ef100` ด้วย expected-head guard tree ตรง head f431e3d (`66b41dc611cf82eee26689b7c8f5b2fe5eb24879`) และฐาน9bf63bd7ไม่เคลื่อน ผ่าน [post-merge quality41748274440](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41748274440) unit1492/105files/typecheck/lint/build และ [Pages41748274489](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/41748274489) build/unit/source565/production 83/84/80/88 รวม 335 ครบ4/deploy
- Deploy job126327413865 รายงาน Reported success! 2026-11-04T01:30:52.7619032Z = 2026-11-04 08:30:52 Asia/Bangkok [เกม](https://wnau34-nptrn.github.io/asterveil-fateweave/) ยืนยันจาก workflow/head/deploy log ไม่อ้างการเปิดlive URLจากexecutor
- Local full unit1492/105filesผ่าน (142.85s,maxWorkers2,timeoutเดิม) Focused43/3filesรวมstar22ผ่าน และstar22ตรวจซ้ำหลังเพิ่มmaterial-helpแล้ว Typecheck/lint/production Pages buildผ่านก่อนPR
- Fullunitรอบแรก1489ผ่าน/3ไม่ผ่าน: ขาดรายงาน2จากsparse checkout (ดึงไฟล์ตรงHEADโดยไม่แก้เนื้อหา) และboss-balanceชน180sขณะมีbrowser/buildร่วมกัน จึงรันfullunitแยกแล้วผ่านทั้งหมด ไม่มีการเปลี่ยนrepo/CI timeoutหรือกฎ
- Local production browser38distinctผ่าน: star15 + regression23 ของcharacter/equipment/forge/team/archive/legacy skill รวมยอดเงินจริง/ของเดิม/reload/no-spend preview/cancel/next/heldEnter/double confirm/storage failure/★5/แยกของขาด/legacy grants/โควตาแหล่งวัตถุดิบ/focus/return context
- ชุด33กรณีผ่าน32และdesktop characterเดิมชนtotal45sช่วงท้าย ตรวจกรณีเดิมซ้ำพร้อม5regressionsที่เหลือด้วย CLI120s ผ่าน6/6 (2.0m) จึงนับ38distinct ไม่บวกรอบซ้ำ baseline2/รอบขาดผลเป็นผลเพิ่ม repo/CI browser timeout45sเดิม
- QAเคยพบfield orderของparseGameต่างจากobjectเดิม จึงเทียบkeyแบบcanonicalในreceipt ไม่ลดassertionจำนวน/ยอดจริง พบdouble-clickไปโดนnextที่แทนตำแหน่งเดิมและmousedownย้ายfocus จึงกันคลิกซ้ำและคืนfocusสถานะ
- Environmentมีstarting/readyระหว่างQA ไฟล์อยู่ครบแต่browserprocessเดิมหาย ไม่มีผลสรุป จึงเริ่มชุดใหม่จนได้ผลครบ ไม่รวมรอบขาดผลเป็นpass
- ตรวจภาพจริงpreview/review/resultครบ390×650/844 พร้อมregression320×568/desktop และ200%text/insetsจำลอง59/34 Bodyเลื่อนไปถึงแถวสุดท้ายได้และdockไม่บัง [ภาพที่commitแล้ว](../validation/uxd-06/README_TH.md) ตัวอย่าง★3→★4 ตัวซ้ำ1/ตรา3/แร่120 ใช้1/2/70 เหลือ0/1/50
- ทำงานและ release docs บน checkout แยก /workspace/asterveil-uxd-06-work เก็บโฟลเดอร์เดิมพร้อม draft/ภาพ UXD-05 ไว้ ไม่ reset หรือแก้ auth เอกสาร release 5 ไฟล์เป็น docs-only ตรวจเนื้อหา/git diff --check และอัปเดต feature ด้วย expected-head guarded fast-forward ไม่ force งานถัดไปตรวจ remote head ใหม่ก่อนใช้ checkout/draft ใด

Chromium emulationเท่านั้น ไม่มีSafari/iPhone/อุปกรณ์จริง/ผู้เล่นจริง ไม่สรุปhuman usability ไม่พบCURRENT_STATE.md ไม่เริ่มUXD-07/P04/P09/เลื่อนอาชีพ/สกุลเงินใหม่หรืองานถัดไปอัตโนมัติ
