# UXD-06 — พัฒนาตัวละครและอัปดาว

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

Runtime: src/ui/star-upgrade.ts / star-upgrade.css / character-panel.ts / character-view.ts / lobby-ui.ts / game-shell.ts ไม่มีcore/content/public/save/schema/prices/RNG/battle/balance diff

## QA และ release

กำลังตรวจ ห้ามอ้างว่า merge หรือเผยแพร่แล้วจนมีหลักฐานท้ายงาน

- Focused unit43/3filesผ่าน (star reviewใหม่22) หลังแก้การเทียบobject field orderของparseGame ไม่ลดassertionยอดจริง
- Typecheck/lint/production Pages buildผ่านบนโค้ดปัจจุบัน Focused star22ผ่านอีกครั้งหลังเพิ่มhelpแหล่งวัตถุดิบ
- Full local unit1492/105filesผ่าน (142.85s, maxWorkers2, timeoutเดิม) รอบแรก1489ผ่าน/3ไม่ผ่าน: missingรายงาน2จากsparse checkout (ดึงไฟล์ตรงHEADโดยไม่แก้เนื้อหาแล้ว) และboss-balance timeout180sขณะรันbrowser/buildร่วมกัน จึงรันfullunitแยกแล้วผ่านทั้งหมด ไม่เปลี่ยนrepo/CI timeout
- Production browser12ผ่าน (2.2m) ก่อนเพิ่มreadonly material-help; รอบสุดท้ายรวมlegacy/management/helpและregressionกำลังรัน ไม่อ้างเป็นผลผ่านจนจบ
- Environmentมีstarting/readyระหว่างQA ไฟล์อยู่ครบ แต่process browserเดิมหยุดและไม่มีผลสรุป จึงเริ่มชุดใหม่ ไม่รวมรอบขาดผลเป็นpass
- Browserพบdouble-clickไปโดนnextที่แทนตำแหน่งเดิมและfocusถูกmousedownย้าย แก้ป้องกันทั้งmousedown/clickซ้ำและคืนfocusที่สถานะ ไม่ใช่ปัญหาจ่ายซ้ำ
- ภาพbaselineและภาพพัฒนาใน/tmp/uxd-06/; จะตรวจ/เก็บภาพfinal390×650/844และregressionที่เกี่ยวข้องก่อนปิดงาน
- ใช้Chromium emulation ไม่มีSafari/iPhone/อุปกรณ์จริงหรือผู้เล่นจริง
