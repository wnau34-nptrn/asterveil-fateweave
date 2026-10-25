# P00 — แผนย้ายเซฟและกรณีตรวจรับ

อ่าน [สเปกหลัก](SHARED_PROGRESSION_TEAM_SPEC_TH.md) · ฐาน v43/`e62292a` · เอกสารนี้กำหนดงานทดสอบ ยังไม่ได้ลง migration ใหม่

## นโยบาย boundary

P01ใช้save versionถัดจากรุ่นล่าสุด ณ ลงจริง ไม่จองv44ให้C12 Batch2 แม้copy-ready promptเก่ายังเขียนเช่นนั้น P02ถ้ากฎ/actor capacityเปลี่ยนต้องเพิ่มencounter/schema versionตามของที่เปลี่ยนจริง

ขั้นตอนโหลดเก่า:

1. Decode/validate envelopeด้วยข้อจำกัดรุ่นเดิมและcatalogที่รู้จัก หากเสียหายปฏิเสธพร้อมเก็บraw ห้ามแทนข้อมูลด้วยemptyprofileและsaveทับ
2. เก็บbackuprawแบบread-onlyภายใต้keymigrationที่ระบุversion/source digest; storageไม่มีพื้นที่ทำbackupให้คงoriginalและเสนอexport/retry ไม่บังคับเริ่มใหม่
3. หากมีrunให้ replay/validateด้วยกฎเดิมที่รองรับ กรณีcompleted/wipedที่จบแล้วใช้ผลและค่าปรับเดิมก่อน; เฉพาะเที่ยวที่ยังactiveจึงsettleแบบwithdrawn100%เฉพาะของ/EXP/questที่รับแล้ว โดยใช้โค้ดlegacyที่freezeไว้; activebattleไม่จบให้คงsnapshotในbackupและไม่แจกผลที่ยังไม่ได้รับ หากbattleจบแต่ยังไม่settleให้legacy finishครั้งเดียวก่อนwithdraw ไม่ทั้งfinishใหม่และใช้receiptเดิม
4. Temporary guestsไม่กลายเป็นคนถาวร; arrivalsที่ยังมาไม่ถึงไม่รับรางวัลล่วงหน้า; เงื่อนไขรับคนจากเนื้อเรื่องที่commitแล้วคงสิทธิ์ตามlegacy settle; รางวัลเควสต์ที่รับไปแล้วไม่เปิดรับซ้ำ
5. คำนวณcampXPจากmax totalXPของownedคนถาวรหลังsettle ไม่รวมguest/dupes และไม่sumทั้งค่าย ใช้thresholdcanonicalข้ามmap; Lv/expmissing=1/0; validcap partialต้องรักษายอดตามสเปก
6. รักษาทุนของสมาชิกที่เหลือทุกID รวมstars/dupes/grants/talents/gear/skillLevels, company, currency, items/UIDs, unlocked flags, shop/taken/boardPool/counters; ลบLvรายตัวจากauthorityเมื่อwriterใหม่พร้อม
7. สร้างrevision/run sequenceใหม่ให้ไม่มีpendinglegacyreward, validateทั้งenvelope แล้วwriteใหม่หนึ่งครั้ง หากwrite failคงoriginal keyและไม่แสดงmigrationสำเร็จ
8. โหลดซ้ำใช้versionใหม่ไม่applymigrationอีกรอบ แสดงสรุปLvค่าย/เหตุผลกลับค่าย/ของเก็บไว้กับpathกู้backup ไม่อ้างว่าสามารถเล่นเซฟใหม่ย้อนbinaryเก่าได้

การคัดลอกlegacydecoder/settleควรแยกmodulemigrationที่ชัด ไม่ให้resolverใหม่แอบคำนวณศึกเก่า พิจารณาboundaryนี้กับfixturesจริงก่อนเลือกเลิกsupportรุ่นเก่า parserเดิมรองรับv1–43; ต้องระบุrangeที่ยังรับตามจริงและไม่ตัดรุ่นทิ้งโดยไม่มีประกาศ

## Matrix ที่ต้องมี fixture และ assertion

| กรณี | ผลที่ต้องยืนยัน |
|---|---|
| profileใหม่ไม่มีrun | campLv1/XP0; สร้างผู้บัญชาการและprologueได้ |
| v43 idle Lvกระจาย/คนนอกทีมเก่งสุด | ใช้maxownedXP; ทุกคนรวมคนใหม่projectLvค่าย; ไม่sum |
| Lv/EXP absent และLvcapมีpartial | default1/0; รักษายอดที่valid; capไม่overflow |
| starsสูง/แต้มใช้แล้ว/grantsฟรี | ย้ายLvไม่ลดงบแต้มเดิมของคนที่ลงทุน; grantsไม่กลายเป็นpaid/doublegrant |
| กลางแผนที่มีของ/รางวัลครั้งแรก | withdrawรักษา100%ตามกฎ; claimed flagsไม่รีเซ็ต |
| activebattleมีcommands+entry/lane/CDmetadata | legacyreplayถูกต้องก่อนboundary; ไม่ใช้Lvร่วมตีความดาเมจใหม่ |
| battlefinishedแต่finishยังไม่commit | finishและrewardหนึ่งครั้งตามlegacy; migrationซ้ำไม่เพิ่มรางวัล |
| runเคยfinish/withdrawแต่profilesettleแล้ว | receipt/สถานะเดิมผ่านvalidationหรือปฏิเสธความขัดแย้ง; ห้ามsettleซ้ำ |
| guests/prologue/draft/arrivals | ไม่รับguestถาวร/คนยังมาไม่ถึง; คนรับแล้วไม่หาย |
| frozenboard v42→v43 ที่ยังไม่refresh | offers/taken/cost/สามข้อเสนอเดิมคงเดิม; featuredเปิดตามเงื่อนไขเดิม |
| gear worn/spare/found/overflow | UIDและเจ้าของถูกต้อง ไม่dup; การเลือกของเดิมตอนwithdrawไม่หาย |
| wipe/withdraw/clear | XPค่ายคงอยู่; resource penaltiesเดิม; ไม่awardXPตอนsettle |
| storagefull/throw/badJSON/unsupportedfutureversion | ไม่มีwriteทับoriginalด้วยข้อมูลไม่ครบ; retryไม่doubleaward |
| duplicate expectedrevision/rewardtoken | transitionที่สองถูกปฏิเสธหรือเป็นno-opที่ระบุ; XP/ของไม่เพิ่ม |
| สลับrun/campmapที่capต่างในอนาคต | Lvไม่ตกเพราะกลับแมพเก่า; authorityจากaccountcapที่ปลดถาวร |
| field4หลังP01/field5หลังP02 | versionชัด ไม่มีparserเก่าตัดคนที่ห้าหรือfallbackไปทีมเริ่มต้น |

## การแบ่งผล P01 กับ P04

P01ยังใช้pointสูตรเดิมและstarcurrencyเดิม จึงไม่ต้องชดเชยดาวเป็นtrainingcreditพร้อมmigrationLv การเปลี่ยนtrainingmilestone/เศษสากลทำP04แยกversionและreceipt ตามแผนเดิม: legacycreditสูงสุดของค่ายนับในเพดานtrainingสี่แต้ม ไม่sumทุกคน; formulaสุดท้ายต้องตรวจพร้อมlegalbuilds

## เริ่ม P01 ได้เมื่อใด

สเปกcampauthority/XPonce/withdrawboundary/fieldแยกเป็น4ก่อนมีแล้วใน P00; implementationต้องเพิ่มfixturesและผ่านmatrixก่อนเปิด ไม่อ้างว่าเขียนmatrixเท่ากับmigrationtested ข้อเลือกprototype16แต้ม/44%/Lv15ยังไม่ใช่เกณฑ์migrationปัจจุบัน
