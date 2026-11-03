# UXD-04 — ถ่ายโอนคุณสมบัติอุปกรณ์

วันที่ 2026-11-03 (Asia/Bangkok) · สาขา `codex/uxd-04-affix-transfer` · ฐาน `5f08b7b6c9ba3769581eb84c03e95726898be588`

## ฐานและ baseline

ตรวจ GitHub connector และ git ls-remote: remote เกมตรง5f08b7b ซึ่งต่อจากUXD-03 merge3408f41ด้วยเอกสารreleaseเท่านั้น ตรวจancestryก่อนสร้างสาขาใหม่จากฐานนี้ ไม่ใช้main ไม่รวมcheckpointcc51cd4/bcd6133หรือmergeART PR133 ไม่มีCURRENT_STATE.mdในworkspace/ฐานที่ตรวจ

ช่วงเริ่มงาน runtimeรายงานrunningแต่offline และexec_commandตอบNo usable execution environment จึงอ่านโค้ด/แผนผ่านGitHub connectorก่อน ต่อมาenvironmentcontextและconnectivityกลับมาconnected จึงใช้shellได้ งานเดิมและdependenciesยังอยู่บนcodex/uxd-03-release-notesโดยไม่มีไฟล์ค้างแก้ ไม่เปลี่ยนauthentication ไม่resetงานเดิม และไม่อ้างว่าได้ยืนยันต้นเหตุของoutageจากdiagnosticsซึ่งไม่มีrecords

อ่านAGENTS/CLAUDE/UXD-03 release และIMPLEMENTATION_PLAN_TH.md/EQUIPMENT_DEVELOPMENT_TH.md พร้อมดูภาพ05_equipment_affix_transfer.pngจากart/art-ui-ux-002ที่a77d17bแยกจากเกม ชื่อ/ภาพ/ค่าต่าง ๆ ใช้ข้อมูลเกม ไม่ใช้placeholderว่างอยู่จากconcept และไม่mergeทั้งสาขาภาพ

Baselineก่อนแก้: affix-transfer.spec.ts390×844ผ่าน1กรณี ตรวจภาพreviewจริงใน /tmp/uxd-04/baseline/ แล้ว หน้าถ่ายโอนเดิมอยู่นอกdevelopmentView/sharedframe ใช้ข้อความต้นทางรวมกับpreview ไม่มีreceiptเฉพาะtransfer และEscapeจากreviewปิดช่างกลับตัวละครทันที โค้ดมีProfileguardและกฎtransferCandidate/transferReason/fusionRefundเดิมอยู่แล้ว

## การทำงานใหม่

1. หน้าเฉพาะงานใช้กรอบ/nav/safearea/scroll/dockของUXD-01–03 แบ่งเลือกช่องชิ้นรับ → เลือกต้นทางในคลัง → เลือกชนิด/คุณภาพจากต้นทาง มีภาพUID/Lv/+/สี/lock/ทุนตีบวก/ทุนLvจริง ชิ้นรับคงอยู่ ต้นทางหายทั้งชิ้น แสดงเซ็ต/พลังตำนานต้นทางที่ไม่ถูกคัดลอก
2. เตือนผูกช่องครั้งแรกก่อนreview และแสดงช่องที่ผูกเดิม แตกต่างจากล็อกอุปกรณ์ ชิ้นรับที่ล็อกยังถ่ายโอนได้ตามcoreเดิม ต้นทางล็อก/บอส/สวมอยู่/ช่องหรืออาชีพอาวุธไม่ตรงใช้ไม่ได้ ไม่เพิ่มกฎว่าต้องสีเดียวกัน
3. Previewใช้transferCandidateและstatPreviewเดิม คัดลอกเฉพาะชนิดกับคุณภาพ% ค่าใหม่คิดตามLvชิ้นรับ ไม่คัดลอกLv/ตัวเลขของต้นทาง/สี/เซ็ต/+หรือพลังตำนาน ช่องอื่นและทุนชิ้นรับคงเดิม ไม่มีRNGจากpreview
4. Ledgerมี/ใช้ล่วงหน้า/คืนทุน/หลังทำแยก3สกุล ค่าบริการอ่านmap.equipment.forge.transfer ทุนคืนอ่านfusionRefund ต้องมีเงินค่าบริการครบก่อนคืนทุน แม้ยอดสุทธิหลังทำดูพอก็ยืนยันไม่ได้ แสดงของขาดหลายประเภทพร้อมกัน
5. Reviewซ่อนตัวเลือกที่แก้ไขได้ แสดงชิ้นรับ/ต้นทางและค่าที่เปลี่ยน ConfirmตรวจProfileidentityและtransferReasonซ้ำ ล้างreviewก่อนส่งhost ป้องกันheldEnter/doubleclickตามshellเดิม เปลี่ยนชิ้นรับล้างต้นทาง/sourceIndexและreviewเก่า Escape/cancelคืนfocusปุ่มถ่ายโอนโดยคงรายการ
6. Receiptเกิดเฉพาะforged/transferหลังpersistผ่านGameShell/LobbyUI ใช้canonicalProfileกับsnapshotก่อนทำ แสดงผลช่องจริง ต้นทางที่หายและยอดbankจริง ดูขั้นถัดไปไม่สั่งงาน ไม่จ่ายเพิ่ม และกลับมาเลือกต้นทางใหม่บนชิ้นรับเดิม/ช่องผูกจริง
7. รักษาบริบทกลับตัวละคร/คลังและfocusเดิม ข้อความ200%กับจอสั้นย้ายledgerเข้าbodyเลื่อน และจัดledgerเป็นช่องมีป้ายกำกับแทนตัวเลขติดกัน Layoutobserverรองรับหน้าถ่ายโอนที่ไม่มีแผงstepตัวเลข โดยโครงหน้าอื่นยังใช้stepเดิม

ไม่มีcore/world,core/save,core/battle,content,public,ราคา,RNG,สมดุล,schemaหรือviewportเปลี่ยน ไม่เริ่มUXD-05/06,P04/P09,ดาวหรือเศรษฐกิจใหม่

## การตรวจและหลักฐาน

- Typecheck/lint/buildPagesผ่าน; fullunit1441/103filesผ่าน; focusedunit49ผ่าน รวมUItransfer20กรณีและcoretransfer/level/fusion-reroll regression
- ขยายaffix-transfer.spec.tsเป็น4ขนาด320×568/390×650/390×844/desktop ตรวจactualProfile/เงินจริง/donorหาย/reload/2การถ่ายโอนจริงในช่องผูกเดิม/heldEnter/doubleconfirm/readonlynext/Escapeกลับreviewแล้วคืนcontext
- browserใหม่3กรณีตรวจจ่ายล่วงหน้าแม้ทุนคืนทำให้ยอดสุทธิพอ, selection/taskเปลี่ยนแล้วล้างreview+ต้นทาง, กลับinventoryfocus, sourcelegend/setที่เสีย และtext200%กับinsetsจำลอง59/34
- Production browser44distinctผ่าน (40regressionในรอบรวม + 3กรณีใหม่ที่แก้fixtureแล้ว + world forge1); focusedproductionล่าสุด4ผ่าน ไม่บวกdev/baselineหรือการรันซ้ำเป็นกรณีเพิ่ม
- ระหว่างQA fixtureใหม่ใช้speedบนbodyนอกaffixPool ทำให้เซฟไม่ผ่าน แก้เป็นbarrierตามpoolจริงและเพิ่มparseGameก่อนseed เพื่อรายงานfixtureผิดทันที ไม่ผ่อนvalidatorหรือกฎเซฟ
- ภาพจริง390pxที่ตรวจด้วยตาแล้ว: /tmp/uxd-04/transfer-review-650.png, transfer-review-844.png, transfer-result-650.png, transfer-result-844.png, transfer-selection-390.png, transfer-review-text200-insets.png ไม่commitภาพregressionที่testsสร้างทับเอกสารเดิม

ใช้Chromium /usr/bin/chromium และproductionbuildใต้Pages subpath ไม่มีSafari/iPhone/มือถือจริงหรือผู้เล่นจริง ไม่อ้างemulationเป็นเครื่องจริง

## สถานะส่งมอบ

ImplementationและlocalQAผ่าน เปิด [PR #141](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/141) กลับfeature/fateweave-initial-prototypeแล้ว runtime commit a310eb3617fe2c768e6c4c1d8861d11ec7b02ea8 ตามด้วยเอกสารสถานะPR รอCIก่อนmergeและPages ผลเผยแพร่จะบันทึกตามหลักฐานจริง ไม่เริ่มงานถัดไปอัตโนมัติ
