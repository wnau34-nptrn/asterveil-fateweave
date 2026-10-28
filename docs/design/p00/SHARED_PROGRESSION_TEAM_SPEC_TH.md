# P00 — สเปกเลเวลค่าย การถือครอง และทีมสูงสุดห้า

ฐาน runtime: `e62292a` · 25 ตุลาคม 2026 UTC · งาน P00 เป็นสเปก/หลักฐาน ไม่เปลี่ยนกฎในเกม

อ่านร่วม [แผนรวม](../../DEVELOPMENT_PLAN_TH.md), [ทิศทางเลเวลร่วม](../SHARED_LEVEL_TEAM_BOSSES_TH.md), [หลักฐานฐานเดิม](../../validation/p00/README.md) ข้อเลือกด้านล่างเป็นฐาน implementation ที่แนะนำภายใต้คำขอให้ดำเนิน P00 ตัวเลขความสนุกยังต้องทดลองตาม P02/P04

## 1. ข้อเลือกที่ใช้ทำงานต่อ

| รหัส | ข้อเลือก | เหตุผล/ข้อจำกัด |
|---|---|---|
| S01 | Lv/EXP เดียวทั้งค่าย รวมคนใหม่และตัวนอกทีม | สลับคนได้โดยไม่ฝึกเลเวลซ้ำ; ค่า HP/ATK ยังตามอาชีพ |
| S02 | `profile.campProgress` เป็นแหล่ง EXP เดียว ทั้งระหว่างเที่ยวและที่ค่าย | ไม่คัดลอก EXP กลับซ้ำเมื่อ settle |
| S03 | หนึ่ง reward transition อัปเดต profile+run ใน envelope เดียว | ต่อสู้จบ/โหลด/กลับค่ายไม่เพิ่ม EXP ซ้ำ |
| S04 | P01 คงดาว/ตรา/ต้นไม้ตามสูตรปัจจุบันก่อน | เลิกแต้มดาวและเปลี่ยนเศษเป็นงาน P04 แยกจากเลเวลร่วม |
| S05 | แต่ละคนมีงบแต้มจาก Lvค่าย + ดาวของตนตามสูตรเดิมระหว่าง P01 | Lvเท่ากันยังแต้มต่างได้จน P04; ไม่กล่าวว่าบิลด์อิสระครบแล้ว |
| S06 | P01 รองรับทุก unique ID ในแค็ตตาล็อก ไม่มี paid slot | เปิดไว้ 14 ID ตอนนี้ เพิ่ม30ได้ด้วยข้อมูล ไม่สร้าง ID อนาคตก่อนเนื้อหาจริง |
| S07 | P01 ยัง field4/reserve4; P02 ทดลอง field5/reserve4 และ enemy1–5 | เปลี่ยนขนาดทีมแยกจากเซฟเลเวลร่วม วัดต้นเหตุ regression ได้ |
| S08 | คง hero IDs และ foe IDs เดิม เพิ่ม f3/b3 เป็นตัวเลือกตำแหน่ง | มีหกตำแหน่ง แต่จำนวนศัตรูที่เปิดใช้งานพร้อมกันไม่เกินห้า |
| S09 | ย้ายเที่ยว legacy ที่ค้างกลับค่ายแบบ withdrawn เมื่อกฎเลเวลเปลี่ยน | รักษาผลที่รับแล้ว ไม่ตีความคำสั่งเดิมด้วยพลังใหม่; ต้องมีข้อความสรุป |
| S10 | respec/เศษ/ขั้นสูง/Bond/กาชายังไม่เปิดใน P01 | ไม่ใช้การทำสเปกยืนยันค่าที่ไม่ผ่านการทดลอง |

## 2. สิ่งที่ตรวจจาก source และจุดแก้

| พื้นที่ | Actual runtime | งานที่ต้องแก้ |
|---|---|---|
| `src/core/world/world.ts` | gainExp แจก deployed/reserve รายตัว; expPercent ตาม gap; HPเพิ่มตาม MaxHP ที่โต | extract camp award และการ project Lv; world transition ต้องรับ context camp |
| `src/core/world/profile.ts` | joinLevel ต่ำกว่าคนเก่งสุด2; departure copyสมาชิกเข้าrun; settleนำLvกลับ; cap20 | joinตรงLvค่าย, camp mutationครั้งเดียว, capตามcatalog, เลิกmergeEXPตอนsettle |
| `src/core/world/talents.ts` | level−1 + stars−1 สำหรับ big tree | P01ใช้Lvค่ายแทนLvรายตัว สูตรดาวเดิมคงไว้; P04ค่อยเปลี่ยนสิทธิ์แต้ม |
| `src/core/world/types.ts` | MemberProgress มี optional level/exp; roster 4+4 | เพิ่ม CampProgress/context และ reward cursor; ไม่เพิ่ม field5 จน P02 |
| `src/core/save/expedition-save.ts` | v43; parseสมาชิกตามLvรายตัว; battle replayใช้memberDefปัจจุบัน | legacy decoder, migration boundary, validation schemaใหม่, snapshot/backup |
| `src/core/battle/engine.ts` + `types.ts` | EnemySlot=f1/f2/b1/b2; validatorsจำกัด4 | P02เพิ่มslotsและmax5; encounter versionใหม่เมื่อเปลี่ยนกฎ |
| `src/core/world/formation.ts` | columnละ3 เลือกfront/backตามmember ID | ใช้ต่อกับ5โดยตรวจจำนวนรวมและไม่มีcolumn4 |
| `src/ui/lobby-ui.ts` | ป้ายcompany/20 และcamp artแสดงslice0,4 | เปลี่ยนแสดงจำนวนถือครอง/ตัวกรอง; art4ไม่ใช่กฎfieldcap ต้องauditแยก |
| `src/content/world/chapter1.ts` | ไม่มี recruit Mira | เป็น content gap P05 ไม่เพิ่มรางวัลระหว่างย้ายเซฟ |
| `src/content/world/chapter-ruins.ts`/`chapter-forest.ts` | Lyra/Aira/Serenและdraftสองคน; Garranพักค่ายป่า | ต้องทดสอบทุกstarter route ไม่ถือว่าMiraได้รับแน่นอน |

(ประวัติ ณ audit 2026-10-25 — PR #59 merge แล้ว 2026-10-26 `d14a3e1`) PR #59 Blade ยังเปิดและรอตรวจภาพ ณ audit ห้ามเอาภาพผ่านเองหรือรวมเข้าฐาน P00; runtime base เป็น game branch ไม่ใช่ main

## 3. CampProgress และการคำนวณ EXP

รูปแบบสัญญาที่เสนอ (ชื่อฟิลด์ยืนยันกับ implementation อีกครั้ง):

```ts
interface CampProgress { totalXp: number }
// Game/profile owns the canonical CampProgress and a monotonic revision.
// Level and expWithinLevel are derived from totalXp and the active progression rules.
```

จำนวนต้องเป็น safe nonnegative integer ผ่านเพดานที่กำหนดโดยข้อมูล ไม่อ่านค่า Lvจากmemberเป็นauthorityในschemaใหม่ เก็บ `level`/`exp` legacy เฉพาะตัวอ่านเก่า/รายงานย้าย ห้ามเขียนค่ารายตัวแล้วมีสอง authority

ช่วงแรกใช้ threshold เดิม `next(L)=20+45L` และ cap10 เพื่อแยกผลเลเวลร่วมจากการจูน pacing:

`threshold(L)=20(L−1)+45L(L−1)/2` ดังนั้น Lv2=65 และ Lv10=2205

กรณีcap: เก็บ totalXpที่นำเข้ามาโดยไม่ตัดสิทธิ์ partial EXP ที่เซฟเก่าผ่านvalidatorได้ แม้การเล่นปกติเดิมล้างpartialเมื่อถึงcap; ไม่แจกEXPใหม่ขณะcapแล้ว ยอดเกินthresholdต้องอยู่ในช่วงที่legacyรับได้และมาจากmigrationเท่านั้น เมื่อปลดcapรุ่นต่อไปต้องระบุการตีความยอดที่เก็บ ไม่ให้เกิด overflow/ย้อนLv

EXP ต่อชัยชนะใช้ base เดิมจาก HP-worth ของศัตรู, ระดับศัตรู, boss/elite multiplier และสัดส่วน summon ที่เกิดจริง แล้วคูณ `expPercent(campLevel, encounterLevel)` และปัดครั้งเดียว **ไม่รวม share ของทุกตัว** ยกเลิก reserveExpPercent/catchUpPercent/joinBehind สำหรับกฎใหม่ สมาชิกมากขึ้นไม่เพิ่มEXPโดยตัวมันเอง (ศัตรูเพิ่มอาจเปลี่ยนHP-worthซึ่งต้องประเมิน P02)

ไม่เพิ่มEXPจากเควสต์/แพ้/การรับคนใหม่โดยอัตโนมัติ เพราะไม่มีในฐานเดิม การขยายแหล่งEXPต้องมีข้อมูลระบุและtransactionชนิดชัดเจน

หลังLvเพิ่ม ปรับ HP เฉพาะสมาชิกเที่ยวที่ยังยืนตามกฎเดิม: `min(newMax, oldHP + newMax − oldMax)` คนตายยัง0; ขาดเลือด/บาดแผลคงอยู่ คนนอกเที่ยวได้Lvตามprojection ไม่มีการสร้างรางวัลการรักษาในfieldโดยการสลับคน

## 4. แหล่งข้อมูลระหว่างเที่ยวและการกันรางวัลซ้ำ

Pure world function ต้องไม่แอบเปลี่ยน profile: รับ context camp และส่งผล transition พร้อม nextCampXP/nextRun ให้ตัวประสาน `Game` commitด้วย storage write เดียว ใช้ `gameRevision` ที่เพิ่มทุกaccepted mutation; active battleมี `runId`, `battleSeq`, `entryRevision` ผูกกับคำสั่งและreward receipt

- คำสั่งใช้ expected revision; stale commandถูกปฏิเสธ ไม่ใช้revisionจากclientเป็นหลักฐานในserverอนาคต
- reward token `(runId,battleSeq)` ถูกใช้ได้หนึ่งครั้งผ่านstate transition: consumed token/nextSeqและการล้างbattleอยู่ในenvelopeเดียว ไม่ต้องสะสมledgerทุกศึกไม่จำกัดในoffline
- รับรางวัลเฉพาะ battle ที่ authoritative replay เป็นผลจบถูกกฎหมาย; UIanimationไม่มอบรางวัล
- คำสั่งต่อสู้ที่ผู้เล่นcommitแล้วต้องถูกบันทึกก่อนเล่นภาพตามแนวเดิม ขณะstorage failเก็บstateเดิมและไม่ยอมรับคำสั่งต่อไปที่อิงstateไม่บันทึก ให้retryเขียนenvelopeเดิม ไม่สร้างrewardใหม่
- profile.campProgressเปลี่ยนทันทีที่commitผลชัยชนะ; settleเพิ่มเฉพาะของ/รางวัลตามกฎเดิม **ไม่บวกEXPอีก** สลับทีม/โหลดเซฟ/กดปิดผลซ้ำไม่award
- การโหลดsnapshotเก่าทั้งenvelopeด้วยการแก้storageด้วยตนเองไม่ได้ถูกกันโดยrevisionในoffline; ไม่อ้างว่าเป็นระบบป้องกันโกง P09ทำserverauthorityแยก

ช่วงหนึ่งbattle ค่าสถานะ/camp contextต้องคงตามsnapshotเข้าbattle การแก้Lv/แต้ม/ของระหว่างศึกถูกห้าม เมื่อการคำนวณเปลี่ยนให้ใช้version boundary ไม่เงียบๆ replayด้วยmemberDefใหม่

## 5. สมาชิกและการจัดทีม

company เป็นชุด unique hero IDs ที่มีข้อมูลจริง; members.keys ต้องตรงกับการถือครองตามสัญญาparser และกรณีguestของrunแยกชัด การจ้างคนเดิมยังเพิ่มdupesตามกฎเดิม ไม่เพิ่มcompany IDซ้ำ ราคาบอร์ด/featured slot/frozen board/taken indicesไม่เปลี่ยนจากงานนี้

archive เป็นตัวกรองการมองเห็นในค่าย ไม่ลบสมาชิก ดาว ของ หรือสิทธิ์; ไม่จำเป็นต้องสร้างarchiveใหม่เพื่อทำ P01 หากตัวกรองธรรมดาเพียงพอ ไม่มีการบังคับปลดคนเพื่อเพิ่มคนใหม่ รางวัลปลดสมาชิกเดิมยังไม่ลบเงียบๆ: คงพฤติกรรมจนP04กำหนดทางเลิกใช้พร้อมสรุปผลลงทุน

เปลี่ยนทั้งค่ายที่ค่ายหลัก; กลางเที่ยวใช้ได้เฉพาะ deployed/reserve ที่นำมา ไม่เรียกbenchทุกคนเข้าทุกจุด ตัวใหม่ที่ร่วมกลางเที่ยวใช้Lvค่ายและตามกฎจัดเข้าทีมเดิม เมื่อพื้นที่เที่ยวเต็มเก็บเป็นสมาชิก/arrivalตามสเปก ไม่ลบทับใคร

## 6. ทีมสูงสุดห้าและรหัสตำแหน่ง P02

- Hero ใช้IDตัวละครเดิม ไม่เปลี่ยนเป็นh1–h5; formationบันทึกlaneตามID ไม่ตามindexในรายการ
- EnemySlotขยายจาก `{f1,f2,b1,b2}` เป็น `{f1,f2,b1,b2,f3,b3}` เพื่อรองรับทั้งหน้า3/หลัง2 และหน้า2/หลัง3 คงลำดับtie-breakเดิมของสี่IDแรก แล้วต่อf3/b3; ห้าม reorder ENEMY_SLOTSเดิมโดยไม่ทดสอบ
- encounterมีactor definitionsที่reserveอยู่ได้ แต่ live actors/turn queueไม่เกิน5ต่อฝ่าย คำนิยามนี้แยกจากจำนวนdefinitionทั้งหมด; summonต้องตรวจพื้นที่/แถวและไม่ทับIDเดิม
- กฎคงที่≤3ต่อlane, field1–5, reserve0–4; แถวที่มีคนเดียววางกลางตามUI ไม่เปลี่ยนtargetID/กฎscreeningเพราะพิกัดวาด
- 4v4เดิมยังทำงาน; 5v1/1v5/5v5, summonเมื่อเต็ม/ตาย/มีช่อง, targeting/redirect/counter/aoe/cooldown สอดคล้องpreview=replay
- ไม่เพิ่มslotสกิลหรือเทิร์นต่อคน; UIอ่านเจตนาได้ครบที่390px ปุ่ม44px ไม่มีการย่อเพื่อให้สิบตัวพอดี; screenshot/มนุษย์ทดสอบยังไม่เกิดใน P00

## 7. ลำดับ PR สำหรับทำจริง

| PR งาน | ขอบเขต | หลักฐานจบงาน |
|---|---|---|
| P01-A | CampProgress projection/XP transition adapter ยังไม่เปิดกับเซฟผู้เล่น | threshold/rounding/cap/XP gap tests; world pure ไม่มีprofile side effects |
| P01-B | game envelope migration/backup/restore และ integration เข้าdeparture/finish/settle/join/talents | migration matrixในเอกสารคู่กัน; reward-once/storage fail/reload; เปิดsharedLvพร้อมกันแบบatomic |
| P01-C | ownershipตามcatalogและ UI levelค่าย/จำนวนคน/ตัวกรอง | recruit/draft/board preservation + browser390px; ลงทุนเดิมคงอยู่; คงfield4 |
| P02-A | six-slot vocabulary/max5 resolverและdata encountersแบบversioned | phase/summon/preview/replay/lane guards และ4v4เดิม regression |
| P02-B | UIทีม5+การตั้งเป้า+seededcomparison | 390pxจริงจากcanvas, keyboard/reduced motion; เปรียบหลายองค์ประกอบทีมด้วยทุนเท่ากัน |

P01-Aแบบไม่เปิดไม่ควรcommit unused scaffoldingเฉยๆ ให้รวมเข้ากับadapterที่เทสต์ได้หรือรวมกับP01-Bเมื่อเหมาะ ไม่มีคำสั่งให้เปิด partial migrationที่ยังsettleไม่ครบ

## 8. เกณฑ์ผ่านก่อนเริ่ม/จบ implementation

เก็บ baselineตามcommitและseed/policy/ทุน; P01เทียบทีม4เดิมเพื่อวัดผลsharedLvก่อน P02เปลี่ยนเป็น5 ค่าstat/EXPไม่จูนซ้อนจนแยกผลไม่ได้

P01: ทุกคนLvเดียวจริงหลังjoin/load/settle/withdraw/wipe; ไม่มีXPซ้ำและไม่เสียทุน บิลด์เดิมที่ถูกกฎยังจัดได้; ผลแคมเปญไม่ถดถอยโดยไม่มีคำอธิบาย

P02: ไม่ใช้ค่าเวลาศึกจากsimแทนเวลาคิดคน ต้องเก็บhuman testของศึกธรรมดา/ยาว/บอส ทั้งอ่านเจตนา เลือกเป้า และอธิบายเหตุผลเปลี่ยนตัวได้ ก่อนกำหนดเพดานเวลาเป็นตัวเลข รายงานbaselineผลจริงก่อนเปลี่ยนไม่ตั้งเป้าจากความรู้สึก

บอสเนื้อเรื่องอย่างน้อยสองคำตอบที่เล่นผ่าน หนึ่งทางจากคน/ของรับแน่นอน; ตรวจทุกstarter route ไม่พึ่งตัวกาชา/ขั้นสูง★5; ตรวจคนดาวต่ำ/ตำราน้อยที่Lvเท่ากัน ไม่ใช้ผลsimบอกว่าทุกบิลด์สนุก

### แบบเก็บข้อมูลมนุษย์สำหรับ P02

ใช้ encounter familyธรรมดา/ยืดเยื้อ/บอส ชุดโจมตี/ควบคุม/สนับสนุนและข้อมูลLv/ดาว/ตำรา/อุปกรณ์ที่บันทึกชัด ทดลอง4และ5โดยสลับลำดับเพื่อลดผลจากการจำโจทย์ ไม่เปรียบทีม5ที่เติมsupportกับทีม4ที่ไม่จัดบิลด์เลยแล้วอ้างว่าดีกว่า

เก็บ device/browser/viewport, ทีมและทุน, เวลาตั้งแต่เปิดcommandจนcommit, จำนวนกดเป้าผิด/ยกเลิก/เปิดคำอธิบาย, รอบศึก/เวลาภาพ, outcomeและทรัพยากรเหลือ พร้อมให้ผู้เล่นอธิบายภัย/เหตุผลเลือกตัวโดยไม่ใบ้ บันทึกทั้งกรณีตัวที่ห้าช่วยตัดสินใจและกรณีเป็นภาระ กำหนดเกณฑ์เวลาจากbaselineคนจริงก่อน ไม่ใช้เวลารันsimเป็นตัวแทน และไม่อ้างChromiumจำลองเป็นiOSจริง
