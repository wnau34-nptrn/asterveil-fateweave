# แผนพัฒนาระบบกาชา — ฉบับข้อเสนอ 8 พฤศจิกายน 2026

เอกสารวางแผนเท่านั้น การขอเก็บบน GitHub ไม่ใช่คำสั่งเริ่ม implementation, P09, เปลี่ยน save/balance หรือขายแพ็ก อ่าน [ข้อเสนอ80แต้ม](GACHA_80_PROPOSAL_TH.md) และ [economy evidence](../validation/gacha-economy-80-2026-11-08/README_TH.md) ก่อนเลือกงาน ตัวเลขเป็น config draft ไม่ใช่ข้อกำหนด production

## 1. ฐานจริงและขอบเขต

- ใช้ game branch feature/fateweave-initial-prototype ไม่ใช่ main; ตรวจ head/ancestry ใหม่ก่อนทุกงาน
- Client: Phaser + TypeScript + Vite; ระบบจ้าง/อัปดาวอยู่ core/world/profile.ts; MemberProgress/Bank/Profile ยังไม่มี gacha wallet/mileage/history
- Save v58 ณการตรวจครั้งนี้อยู่ในเครื่อง; replay ศึกไม่ได้พิสูจน์สิทธิ์ตั๋วหรือเงินเติมในเซฟเก่า
- Cloudflare index.mjs รองรับ public /health เท่านั้น; ยังไม่มีบัญชี/D1/ธุรกรรมสุ่มที่ตรวจพบ
- P09บัญชี/เซฟ → P04เศรษฐกิจ/เศษ → server-authoritative free-ticket gacha ตาม OD-13; การทำเอกสาร/แบบจำลอง/หน้าจอต้นแบบภายในเริ่มได้เมื่อเจ้าของเลือก โดยไม่ถือว่า dependency พร้อมแล้ว
- Tower/PvP/World Boss/ชำระเงินจริงเป็นงานแยก การมีช่องงบแจกในข้อเสนอไม่ใช่การอนุมัติเปิดโหมดเหล่านั้น
- ไม่มีงาน battle resolver/เพิ่มraritytier/เพิ่มตัวใหม่/ร่างเลื่อนอาชีพอยู่ในกาชารุ่นแรก ถ้าต้องแตะกฎ/เซฟ/สมดุล ส่งคำถามให้ Claude ตาม AGENTS ก่อน implementation

## 2. Roadmap และเกณฑ์จบ

| ระยะ | งาน/ผลส่งมอบ | Dependency | เกณฑ์ผ่านก่อนทำระยะถัดไป |
|---|---|---|---|
| G00 ยืนยันสเปก | decision sheet:80/100,งบแจก,เรต/เศษ,SR,ปลดระบบ,สิทธิ์ตัวพัก/คนเต็มดาว/เรื่องซ้ำ | คำขอเจ้าของให้เริ่มตัดสินสเปก | แยก approved/draft/open; อัตรารวม100%, รายชื่อและค่าใช้ตรงกัน |
| G01 เศรษฐกิจ | จำลอง12เดือนและgrowth, first-copy/P90,คนโปรด★5,ทีม5,บัญชีเก่า/กลับมา/เติม; งบแร่ทองร่วม | G00 + P04 | มีผลที่ทำซ้ำได้และ downside; ไม่ใช้ผล30แต้มรับรอง80; ไม่มีรายได้แจกซ้อน |
| G02 UXต้นแบบ | หน้าตู้/รายละเอียดเรต/ยืนยัน/ผล/ประวัติ/แลก/เศษ และทดลองตัว บน390px | G00;ทำขนานG01ได้ | แยกข้อมูลdemo,ไม่มีคำสั่งแจกของจริง,ไม่มีขาย;กด1/10ต้นทุนชัดและkeyboard/reduced-motionผ่าน |
| G03 บัญชีและสิทธิ์ | guest→ผูกบัญชี/กู้คืน/ย้ายเครื่อง/รวมบัญชี; wallet/reward ledger; tooling support | P09 + G00 | serverเป็นauthority, auth/rate limit/backup/restore/reconcileมีหลักฐาน; health probeไม่ใช่เกณฑ์ผ่าน |
| G04 เศษและย้ายเซฟ | กฎรับตัว/ตัวซ้ำ/เศษกลาง/overflow/ต้นทุนดาว; migrate v58และเวอร์ชันที่เพิ่มภายหลัง | P04 + G01/G03 | migration matrixและdry-runชดเชยผ่าน;ไม่หายstars/gear/dupes;ไม่ให้ยอดแก้เครื่องเป็นpremiumcredit |
| G05 กาชาตั๋วฟรีจริง | config version, RNG server, pull1/10,แลก80,history/recovery,แหล่งแจกจริง | G01/G03/G04;UX G02 | transaction atomic+idempotent, concurrency/retry/reconnectผ่าน;ผลclientตรงjournal;ไม่มีการขาย |
| G06 QA/ทดลองภายใน | integration,เกมเดิม,มือถือจริง,load,กลุ่มเล่น3–5ครั้ง/สัปดาห์;telemetryและfeedback | G05 | quality/browserผ่าน,ไม่มีของหาย/ซ้ำ,ทราบรายได้จริงและเวลาทำงาน;ทดสอบ4–8สัปดาห์หรือจนข้อมูลเพียงพอ ไม่ใช้เวลาอย่างเดียวเป็นหลักฐาน |
| G07 แพ็กเงินจริง | รายเดือน/แพ็กเริ่มต้นเป็นกลุ่มแรก,receipt/refund/restore/entitlements,เงื่อนไขร้าน/ราคา | G06 + เจ้าของเลือกเริ่มขาย | ทดสอบsandboxและบัญชีทุกแบบ,จับคู่ยอดขายกับledgerได้,รับของที่ซื้อครบ,ไม่มี paid_rank advantage |
| G08 ขยายเนื้อหา/โหมด | ย้ายงบไปtower/PvP/WorldBossหรือfocus bannerเมื่อมีงานนั้น | งานแต่ละโหมดอนุมัติแยก | งบรวมไม่เพิ่มตามเมนู,เปลี่ยนrates/poolเปิดเผยและconfig-versioned,ไม่ล้างแต้มเก่า |

ไม่ใช้วันเปิดขายเป็น deadline บังคับข้ามเกณฑ์ G06; กำลังผลิตตัวละคร/เนื้อเรื่องและความเป็นธรรมสำคัญกว่าเพิ่มความเร็วออกตู้เพื่อดูดตั๋ว

## 3. แบ่งงาน implementation ที่เสนอ

โครงต่อไปนี้เป็นชื่อโมดูล/ข้อมูลที่เสนอ **ยังไม่ได้สร้างไฟล์หรือschemaในruntime** ให้ปรับกับ P09 จริงก่อนลงมือ

- Pure domain: catalog eligibility, config/rate validation, result→grant conversion, duplicate/overflow/redeem rules; รับ random outcomesจากauthority ไม่อ่านclock/Phaser/storage
- Server: identity, wallets, append-only grant/consume journal, request idempotency, pull/redemption/reward-claim services, inventory projectionและreconciliation
- Client adapter: อ่านsnapshot ส่งrequest แสดงpending/receipt/error;ไม่กำหนดseed/ผล/ยอดคงเหลือ authoritative
- Presentation: modalตู้/ผล,animationที่เล่นหลังcommit,history/recovery,accessibilityและnavigation;ไม่มีสูตรแจกในscene/tween
- Config: activePool,fullCharacterRate,shardQuantityWeights,duplicateValue,exchangeCost,sourceBudgets,period/timezone,version/effectiveAt; ห้ามclientส่งcost/priceตามใจ

ข้อมูลขั้นต่ำที่ต้องออกแบบ: accountID, configVersion, inventoryRevision, tickets, mileage, personalShards, universalShards, operationID, grant/consume entries, result order, sourceEntitlementKey, paidEntitlement reference; ชื่อจริง/schemaต้องทบทวนในG03/G04

## 4. สัญญาธุรกรรมที่ต้องพิสูจน์

1. Clientสร้างrequestIDและส่งชนิดคำสั่ง/จำนวน/เป้า/expectedrevisionตามสเปก server ตรวจบัญชี ราคา config และทรัพยากรใหม่ทุกครั้ง
2. การตัดตั๋ว สุ่มตามserver RNG แปลงผล เพิ่มแต้ม และบันทึกreceiptอยู่ในcommitเดียว; ไม่มีหักตั๋วสำเร็จแต่ไม่มีสิทธิ์รับผล
3. requestIDเดิม+payloadเดิมคืนreceiptเดิม ไม่ตัดซ้ำ; requestIDเดิมแต่payloadต่างถูกปฏิเสธ; สองอุปกรณ์ส่งพร้อมกันไม่เกิดยอดติดลบหรือแลกแต้มก้อนเดียวสองครั้ง
4. batch10ประมวลผลตามลำดับและเปิดเผยต้นทุน10; ถ้าเกมมีคนในbatchแรกแล้วbatchหลังซ้ำต้องแปลงถูก; ไม่มีระบบการันตี10ที่ขัดกับratesที่ประกาศ
5. แต้มไม่ล้างเมื่อได้ตัวดี ไม่ล้างเมื่อเปลี่ยนเป้า/ตู้; แลกต้องหัก80ครั้งเดียวตามconfigที่serverยอมรับ ไม่ใช้เลขตายตัวในUI
6. timeoutหลังcommit/reload/background/ข้ามanimationกู้receiptจากjournalได้; การดูประวัติไม่แจกซ้ำ; หากrequestยังไม่commitต้องไม่แสดงผลสำเร็จ
7. แหล่งแจกมีunique entitlementต่อaccount/source/period/map/difficultyที่เหมาะสม;เวลาและperiodมาจากserver; replay/reconnect/resetข้ามวันไม่เปิดสิทธิ์ซ้ำ
8. เปลี่ยนpool/configระหว่างpreviewกับconfirmต้องยอมรับ versionที่กำหนดหรือแจ้งข้อมูลใหม่ก่อนใช้ของ ไม่สุ่มด้วยrulesที่ต่างจากที่ผู้เล่นยืนยัน
9. แพ็ก: receiptตรวจserver มีgrantครั้งเดียวต่อธุรกรรม,คืนเงิน/revoke/reconcileตามนโยบายที่ประกาศ;ไม่ทำยอดinventoryติดลบเงียบ ๆ หรือให้clientยืนยันการจ่ายเอง
10. ไม่พกseedในlocalStorageเป็นหลักฐานผลออนไลน์; battle replayกับgacha ledgerเป็นคนละdomain และต้องเชื่อมsnapshot/accountrevisionที่สอดคล้องกัน

## 5. Migration matrix ที่ต้องส่งมอบก่อนแก้เซฟจริง

| กลุ่ม | สิทธิ์/กรณีที่ต้องเก็บ |
|---|---|
| บัญชีใหม่ | ทุกwallet/period defaultถูก, tutorialและfirst-clearรับครั้งเดียว |
| เซฟเก่าstars1–5 | คงดาว ลงทุนสกิล/talent/gear/loadout/แผนทีม;ระบุเศษเทียบสิทธิ์จากdupesและseals |
| คนเต็มดาว/ตัวพัก | ไม่ลบmember;ไม่ใส่ตัวพักในpool;กำหนดส่วนเกินและสิทธิ์promotionชัดก่อนแปลง |
| camp+active run | ไม่rollbackสิทธิ์ด้วยการsettle runเก่าหลังสุ่ม;เสนอใช้กาชาเฉพาะค่ายในv1 |
| ได้ตัวก่อนจุดรับเรื่อง | รางวัลเรื่องถูกแทนอย่างยุติธรรมและรับครั้งเดียว ไม่มีเขียนmemberทับความก้าวหน้า |
| โหลดmigrationซ้ำ/หลายเครื่อง | migrationID+version/receiptคงที่ ไม่ชดเชยหลายรอบ |
| guest/link/mergeบัญชี | ระบุsource of truthและconflictpolicy;ไม่บวกยอดจากเซฟสองฉบับที่เป็นสิทธิ์เดียวกัน |
| local saveแก้ไข/เสียหาย | นโยบายยอมรับสิทธิ์เดิมต้องประกาศและaudit;ไม่เชื่อมยอดofflineที่ตรวจไม่ได้เข้ากับตั๋วซื้อโดยตรง |
| returner/backupเก่า | ไม่คืนยอดตั๋วที่ใช้แล้ว ไม่เปิดentitlementที่รับไปแล้วซ้ำ;เส้นทางsupportรักษาหลักฐาน |

ห้ามแปลงsealsเป็นเศษกลาง1:1จากชื่อสกุลเงิน โดยไม่คำนวณสิทธิ์เดิมและข้อจำกัดการทดแทน และห้ามแก้การันตี/หมดอายุแต้มย้อนหลังเพื่อแก้ของล้น

## 6. QA ที่เป็นเกณฑ์ผ่าน

- Unit/domain: boundaries 0/79/80/159/160แต้ม,ราคา config80/100,ทรัพยากรพอดี/ไม่พอ,poolผิด/empty/ตัวพัก,weightsรวม100%,qtyและcap,duplicate/max-star overflow,1×10เท่ากับ10×1เมื่อป้อนoutcome streamเดียวกัน
- Integration: duplicate request,requestIDผิดpayload,simultaneous pulls/redeems,transaction rollback,commitแล้วtimeout,offline/reconnect,period rollover,claimย้อนหลัง,config cutover,history order/pagination,restore/reconcilewallet
- Migration: ทุกแถวในmatrix รวมactive run/slotเต็ม/compensationซ้ำ;bumpsaveversionจริงเมื่อจำเป็นและเก็บbackup
- Browser: 320×568/390×650/390×844และdesktop;ปุ่ม≥44px,focus/Escape/backdrop/scroll,confirmไม่ใช้ของก่อนกด,reducedmotion/skip,orientationgate,networkerror,receiptกู้ได้,สุ่มต่อใช้ราคาปัจจุบัน
- Real device: Safari iPhoneและAndroidจริงก่อนกล่าวว่าเล่นบนเครื่องผ่าน;ตรวจแรม/โหลดartตามงบเดิม
- Economy: ชุด30เดิม/80/100,80/96/100ตั๋ว,5/7.5/10%ตัวเต็ม,เศษ1–2เทียบ1–5,paid/returner/fullroster,newcontentcadence,hoardingและคอขวดแร่ทอง;ตรวจภารกิจใช้ตั๋วคืนตั๋วไม่สร้างวงจรสุ่มฟรี
- Telemetry: earnings/consumptionแยกsource,ยอดคงเหลือและunspentmileage,first-target/first★5/team5,median/P90,สัดส่วนtenpullมีแต่เศษ,claimmisses/time-to-weekly,จำนวนsupportเรื่องของหาย/ซ้ำ,free/paidpowergap;เก็บข้อมูลเท่าที่ต้องใช้และวางนโยบายลบข้อมูลตามP09
- Gates: ตามrepoให้รันtypecheck/lint/unit/buildและbrowserที่เกี่ยวข้องเมื่อแตะruntime; presentationcoverageเมื่อเปลี่ยนregistry/art/atlas;เอกสารอย่างเดียวตรวจเนื้อหา/links/diffและcontextlimits ไม่จำเป็นต้องเล่นเกมใหม่

## 7. Release / rollback ที่เสนอ

เริ่มfeature flagปิดค่าเริ่มต้น → dev/testบัญชีภายใน → free-ticket cohortเล็ก → reconcileผลและเศรษฐกิจ → ขยายฟรี → ประเมินขายแยก เจ้าของต้องสั่งเริ่มงานแต่ละขอบเขต ไม่ใช้เอกสารนี้เปิดproduction

เมื่อเกิดปัญหา ปิดการสร้างคำสั่งใหม่ได้โดยไม่ลบjournalหรือสิทธิ์ที่commitแล้ว กู้receiptและให้supportตรวจได้ rollbackclient/configไม่rewindยอดที่ใช้แล้ว ต้องใช้compensatingtransactionที่ตรวจสอบได้ ไม่restoreDBเก่าแล้วแจกซ้ำ

## 8. งานถัดไปที่แนะนำ

อัปเดต9พ.ย.2026: ส่งมอบ [G00 decision sheet](GACHA_G00_DECISIONS_TH.md) และ [หลักฐาน G01](../validation/gacha-g00-g01-2026-11-09/README_TH.md) แล้ว; ตัวเลขยังdraft/ไม่sign-off และเศรษฐกิจจริงยังไม่ผ่านgateเปิดใช้. ทบทวนทางรับคนโปรด/เวลาเล่นจริง/สิทธิ์เซฟก่อนเลือกขั้นถัดไป ไม่ถือว่าส่งเอกสารแล้วเริ่มG02/P09/G03/G05อัตโนมัติ.

ถ้าเจ้าของเลือกเริ่มงาน ให้เริ่ม **G00+G01: decision sheetและเศรษฐกิจร่วมกับแร่/ทอง/บัญชีเก่า** พร้อมตรวจP09ก่อน ไม่เริ่มจากปุ่มสุ่มที่หักตั๋วในlocalStorage ขณะนี้80/96และเรตAเป็นข้อเสนอที่เก็บไว้ ไม่ใช่คำสั่งเปลี่ยนเกม
