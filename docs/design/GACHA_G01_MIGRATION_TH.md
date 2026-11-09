# G01 — สิทธิ์เซฟเดิม การย้ายบัญชี และ P09 readiness

9 พฤศจิกายน 2026. **เอกสารเสนอทางเลือก ไม่ใช่ migration code หรือ trust policy ที่อนุมัติแล้ว**. ไม่แก้ `src/core/save`, `src/core/battle`, rules/balance หรือบริการออนไลน์. ฐานsavev58ที่ `c4beb7b8f1f39fd6a358c7d6bbba470b5fc5d2c7`; เวอร์ชันจริงต้องตรวจอีกครั้งก่อนลงมือ

## 1. ขอบเขตที่พิสูจน์ได้จากโค้ด

`src/core/save/expedition-save.ts` ตรวจรูปแบบและreplayศึก รวมmemberดาว1–5/dupes0–99, gear/talents/loadout/skillLevels และสิทธิ์ค่าย/active run. นี่พิสูจน์ความสอดคล้องตามกฎบางส่วน **ไม่พิสูจน์ว่ารายได้offlineเป็นสิทธิ์ออนไลน์ที่serverเคยแจก**. `StoragePort` รับข้อมูลจากlocal; ยังไม่มีaccountID/receipt/wallet/authoritative reward journal. `cloudflare/index.mjs` มีเฉพาะGET/HEAD `/health`; ไม่อนุมานว่าauth, D1 schema, receipt หรือbackupพร้อมจากhealth200 หรือมีsecretsตั้งในGitHub

## 2. ตารางรักษาสิทธิ์และ dry-run ที่ต้องมี

| ข้อมูล/กรณี | หลักการรักษาสิทธิ์ที่เสนอ | ตัวอย่างตรวจรับก่อน G04 |
|---|---|---|
| บัญชีใหม่ | ไม่สืบยอดoffline; walletเริ่มจากgrantที่มีentitlementจริง | retryสร้างบัญชี/tutorialไม่รับซ้ำ; 0แต้มแลกไม่ได้ |
| ดาว1–5 | คงดาวเดิม; ไม่เรียกคืนแร่หรือลดดาวเพื่อรับเศษ | ดาว3ยังดาว3พร้อมgear/ต้นไม้เดิมหลังloadซ้ำ; ไม่คืน60เศษที่ถือว่าเคยใช้แล้วทับดาวเดิม |
| dupesที่ยังไม่ใช้ | เสนอ20เศษเฉพาะต่อ1dupe เป็นอัตราเทียบdraft | dupes0/1/99→0/20/1980; ไม่รวมdupesที่ใช้ซื้อดาวไปแล้ว; เก็บrawsnapshot/บันทึกแปลง |
| seal | ไม่แปลง1:1จากชื่อ; เสนอคงlegacycreditจนเลือกอัตราและข้อจำกัด | 1ตราปัจจุบันแทน1dupeแต่ถูกจำกัดceil50%ต่อขั้น; ถ้าเลือก20กลาง/ตราจะเพิ่มความยืดหยุ่นเมื่อทดแทน100%, ต้องจำลองและอนุมัติ |
| แร่/ทอง/dust/tome/core/ยา | ไม่แปลงเป็นตั๋วหรือยอดเติม; คงมูลค่าเล่นเดิมภายใต้นโยบายlegacy | boundarycap/ทรัพยากรพอดี/เกินหลังชดเชยมีpendingcredit ไม่clampทิ้งเงียบ |
| gear | คงUID, owner, level, plus, affix, lock, boss flags, storage/overflow | ของสวม/ถอดบนrun/ของuid0ที่เพิ่งตกกลับค่ายถูกเจ้าของและไม่สร้างสำเนา |
| talent/grants/skillLevels | คงลงทุนและสิทธิ์ปลด; P04เปลี่ยนแต้มต้องมีแผนแยก | เปิดสกิล/loadoutที่เคยใช้ได้; reset/ย้ายเวอร์ชันไม่สูญตำรา |
| thiran/wila | เก็บสมาชิก/ดาว/เศษ/ของทุกอย่าง | ห้ามรับใหม่ในpoolแต่สมาชิกเก่าใช้ได้; ไม่แปลงเป็นIDอื่นหรือสกุลกลางเอง |
| archived/bench/ทีมเต็ม | archiveเป็นตัวกรอง ไม่ใช่สละสิทธิ์ | ได้ตัวเข้าคลังเมื่อfield5/reserve5เต็ม; ไม่มีauto-dismiss |
| เต็มดาว/เศษค้าง | ตัวซ้ำ→กลางตามOD-04; เศษเฉพาะค้างต้องรอpromotionpolicy | ตัว5ดาวกับdupeค้าง99ไม่หาย; ห้ามใช้สมมติฐานoverflowในโมเดลเป็นคำสั่งแปลงจริง |
| ได้ตัวก่อนเรื่อง | ตรวจเจ้าของก่อนgrant; เสนอrewardครั้งแรก20เศษ | เข้าจุดเรื่องซ้ำ/retry/ย้ายเครื่องไม่แจกเพิ่ม; ไม่เขียนmemberกลับดาว1; ปัจจุบันแค่skipยังไม่ชดเชย |
| active expedition/battle | เสนอสุ่มเฉพาะค่ายรุ่นแรก หลังsettleถูกต้อง | ห้ามหยิบprofileใหม่มาทับsnapshotศึกเก่าหรือreplayผลกาชาจากclient; active runคงเล่น/settleตามเวอร์ชันเดิมก่อนmigration |
| first-clear/guide/quest | สร้างentitlementจากหลักฐานที่ยอมรับเพียงครั้งเดียว | เซฟที่clearไปแล้วได้รับcatch-upตามนโยบายโดยไม่เล่นซ้ำ; guideที่skipแยกจากclaimed; ไม่รับnormal+hardสลับซ้ำ |
| veteran/returner | ไม่มีbootstrap40อัตโนมัติเพียงเพราะเก่า; เสนอcatch-upคงที่หรือreconstructสิทธิ์ให้เลือกชัด | profile.veteranไม่ใช่ตราเชื่อถือบัญชี; snapshotbackupเก่าไม่คืนตั๋ว/เปิดเควสต์ที่รับไปแล้ว |
| โหลดแปลงซ้ำ/หลายเครื่อง | migrationID+account+sourcefingerprint+versionคงที่/receiptหนึ่งรายการ | ยิงพร้อมกัน/load10รอบได้ยอดเท่าเดิม; มีrawbackupและreconcileก่อน/หลัง |
| guest→link | ผูกguestเดิมกับaccount ไม่สร้างgrantใหม่ | linkสำเร็จแต่responseหายแล้วretryไม่เพิ่มwallet; คืนเซฟจากserverrevisionล่าสุด |
| มีสองบัญชีอยู่แล้ว | เสนอเลือกcanonicalaccount+supportreview ไม่รวมยอดเอง | ยอดเดียวกันจากbackupไม่บวกสองครั้ง; สิทธิ์ซื้อต้องตามverifiedtransaction ไม่ตามmemberสูงสุดจากสองเซฟ |
| localแก้ไข/เสียหาย | แยกสิทธิ์legacyที่ยังตรวจไม่ได้; มีทางsupport/backup | ไม่ปฏิเสธแล้วลบของเดิม; ไม่ใช้validatedJSONเป็นหลักฐานpaidcredit; quarantineรายกรณีพร้อมreason |

ตัวอย่างบัญชีที่ใช้ลงทุนดาวไปแล้ว: ★3เทียบใช้dupe1+2=3 หรือ60เศษเชิงบัญชี; คงดาว3และแปลงเฉพาะdupesที่เหลือ ไม่แจก60อีกครั้ง. ★4ใช้120, ★5ใช้200ตามdraftเทียบหน่วยเดิม; ไม่มีเหตุให้ย้อนrefundแล้วคงดาวด้วย. ค่า20/ตราทำให้99,999ตราเป็น1,999,980เศษกลาง ซึ่งมากกว่างบปั้นฐานทั้ง15คน3,000เศษหลายร้อยเท่า; ยิ่งยืนยันว่าต้องแยกtrust/นโยบายชดเชยก่อนยอมรับlocalbalance ไม่ใช่ตั้งcapตัดสิทธิ์เก่าทิ้ง

## 3. ทางเลือก trust ที่ยังต้องให้เจ้าของเลือก

| ทางเลือก | ผลดี | ผลกระทบ/ข้อจำกัด |
|---|---|---|
| A เก็บlegacyเล่นต่อ แยกสิทธิ์ออนไลน์/ซื้อ | รักษาเซฟเดิม; serverwalletเริ่มจากgrant/receiptใหม่; ลดทางฟอกยอดlocal | ต้องออกแบบว่าตัว/ดาวlegacyใช้โหมดออนไลน์ได้แค่ไหน มิฉะนั้นพลังที่แก้ในlocalยังเข้ากิจกรรมแข่งขันได้; UI/supportต้องอธิบายชัด |
| B ตรวจsnapshotครั้งเดียวแล้วรับสิทธิ์เล่นบางส่วน | ย้ายเครื่องสะดวก; ตรวจschema/replay/ความสมเหตุผลช่วยคัดข้อผิดพลาด | ไม่สามารถพิสูจน์ประวัติรายได้ทั้งหมด; ต้องยอมรับความเสี่ยงcheat/ใช้manualreviewและaudit. ไม่มีหลักฐานให้เครดิตเงินจริง |
| C onlineเริ่มใหม่+ชดเชยคงที่ | นิยามสิทธิ์ง่ายกว่ารวมlocalcurrency | ผู้เล่นเก่าเสียความต่อเนื่องหากไม่มีlegacyโหมด/ทางกู้; ชดเชยต้องประกาศและให้ตรวจ ไม่บังคับลบเซฟ |

แนะนำศึกษาทางA พร้อมนโยบายใช้พลังlegacyและsupportreview; ยังไม่เลือกแทนเจ้าของและไม่เชื่อมเศษ/แร่เก่าเป็นตั๋วซื้อ. ทั้งสามทางต้องเก็บบัญชีที่จ่ายเงินจริงโดยreceiptserver: restoreตามtransactionเดิม, refund/revokeเป็นentryตรวจสอบได้, ไม่รวมยอดสองเครื่องหรือให้clientประกาศจ่ายสำเร็จเอง

## 4. Readiness ก่อนเริ่ม G03/G04/G05

| ส่วน | สภาพที่ตรวจพบ | หลักฐานที่ต้องมีก่อนผ่าน |
|---|---|---|
| P09 identity | ยังไม่มีaccount runtimeในเกม/Workerที่ตรวจ | guest/link/recovery/multi-device,sessionsecurity,authz,rate limitและprivacy/dataretention |
| Cloud save | มีlocalStorage + validator/replay | serverrevision/conflictpolicy,backup/restore,dry-runmigrateและreconcile; เก็บrawlegacyโดยไม่เปิดเผยsecret |
| Ledger/time | ไม่มีwallet/journal/period authority | entitlementunique,atomicgrant/consume,serverclock/timezone, configversion และreceiptอ่านซ้ำไม่แจก |
| P04เศรษฐกิจ | มีdupes/seal/oreเดิม; shardfarmยังเป็นdraft | เลือกราคา/เศษกลาง/ทางรับเป้า/ทีม5/overflow/migrationพร้อมหลักฐานเล่นจริง |
| G03 trust | ยังไม่มีนโยบายที่เลือก | เลือกA/B/Cและสิทธิ์ข้ามบัญชี/active run; ไม่มีlocal→premiumโดยปริยาย |
| G04 migration | ตารางนี้เป็นdesignเท่านั้น | fixturesทุกแถว+propertychecksยอดไม่หาย/ไม่ซ้ำ+idempotency/concurrency+supportrollbackโดยcompensatingentry |
| G05 pulls | ยังไม่มีRNG/servertransaction | retry/timeoutหลังcommitคืนreceiptเดิม; requestIDเดิมpayloadต่างปฏิเสธ;2เครื่องใช้แต้มก้อนเดียวไม่ได้;10ครั้งประมวลผลตามลำดับ |
| แหล่งแจก | ยังไม่มีsourceตั๋วจริง | รายการงบที่เปิดจริงและuniqueaccount/source/period; ไม่พึ่งTower/PvP/WBที่ยังไม่เปิด; งานเสร็จใน3ครั้งต่อสัปดาห์ |
| Telemetry/feedback/admin | P09ยังไม่พร้อม | earned/spent/hoarded,firsttarget,★5,team5,เวลาเล่น/claimmisses/free-paidgap; ลบข้อมูลได้; error/supportauditไม่เก็บข้อมูลเกินจำเป็น |
| การขาย | ไม่มีราคา/store/receiptsในงานนี้ | ผ่านG06ฟรีและเลือกเริ่มG07ก่อน; sandboxrefund/restore/reconcile. /healthไม่ใช่paymentreadiness |

OD-13: P09บัญชี/เซฟ/telemetry/admin → P04 → server-authoritative rewards/กาชาตั๋วฟรี → chat/WB → ทดสอบภายนอก. การวิเคราะห์นี้ไม่เปลี่ยนลำดับหรือเริ่ม backend. G02ต้นแบบแยกข้อมูลdemoได้เมื่อสั่งงานนั้น; G03/G05ไม่พร้อมเพียงเพราะเอกสารหรือhealthprobeผ่าน

## 5. Acceptance ของการศึกษารอบถัดไป

ก่อนเลือก implementation ให้มีค่าทดลองที่ตกลงแล้ว,เส้นทางคนโปรดที่ไม่พึ่งโชค/นับเวลาอย่างชัด,ตะกร้ารายได้จากเล่นจริง20–30นาที,starterที่ต่างกันและfull5พร้อมอุปกรณ์/ตำรา,legacyfixtureที่ไม่ทำของหาย และownerdecisionเรื่องtrust/overflow. งานP09/G04จริงต้องแยกขอบเขตและsaveversion; ไม่เพิ่มmoduleเปล่าหรือendpointจากรายการdependencyนี้
