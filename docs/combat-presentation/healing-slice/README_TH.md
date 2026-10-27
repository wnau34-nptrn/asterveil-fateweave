# C5.3 — แสงรักษา R2 · แสงเข้ม หางฟุ้ง ยึดเท้า unit จริง

27 ตุลาคม2026 · [PR#78](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/78) · `codex/vfx-family-3-healing`

เจ้าของเลือก [artwork R1](../healing-storyboards/README_TH.md) ด้วยข้อความ “ดำเนินการขั้นต่อไปได้” หลังส่งภาพ6ท่า/3จังหวะ จึงต่อภาพชุดนั้นเข้า runtime ใน PR เดิม การเลือกภาพนี้ยังไม่ใช่การผ่าน motion review หรือเริ่มตระกูล4

เจ้าของขอแก้ว่าแสงเบา ไม่มีปลายฟุ้งตามหลัง และตำแหน่งไม่ตรงunit R2แก้ต้นเหตุ: ยกเลิกการวางใต้เท้า34px/ขยับข้าง20pxและแถบภาพบาง18px เปลี่ยนไปยึดsoleจากtransformของunitจริง รวมoffsetร่าย/รับผล/idleและfield shake อัปเดตตำแหน่งหลังunit animationทุกเฟรม [R1ก่อนแก้](https://github.com/wnau34-nptrn/asterveil-fateweave/tree/032edf1453acdc3467da3c7945dff6a3e8a5865b/docs/combat-presentation/healing-slice)

เปิด [หน้าเลือกคลิป](index.html) เลือกท่า/โหมด/กรณี ดูทีละคลิป390×844 ทุกท่ามี normal/fast/reduced intensity/OS reduced motion รวม24คลิป และ5กรณีเสริม รวม29คลิป ไม่มีเสียง

| ท่า | สิ่งที่ต้องดู | ปกติ |
|---|---|---|
| Heal | กลีบประคองเฉพาะคนได้คืน HP จริง ตัวเลขเป็น amount ที่คืนจริง | [Heal](heal-normal-normal-390.mp4) |
| Prayer | พัดแสงตอบรับเฉพาะเพื่อนที่ได้ heal; ไม่รวม echo รอบถัดไปเป็น cast เดียว | [Prayer](prayer-normal-normal-390.mp4) |
| Rouse | ทองที่ผู้คุ้ม หยกที่เพื่อนHP ratioต่ำสุดจริง; รับแทนศัตรู2คนตาม guard/all ไม่มีฮีล | [Rouse + รับแทน](rouse-normal-normal-390.mp4) |
| Revive | ฟื้นเพื่อนที่ล้มจากการต่อสู้จริง มี HP จาก revive event; ไม่ฟื้นคนที่ยืนอยู่ | [Revive](revive-normal-normal-390.mp4) |
| Bless | ตอน cast เป็นเมล็ดพร ไม่มีฮีล; ใบพร tick ตาม Renew จริงในรอบถัดไป | [Bless cast → tick](bless-normal-normal-390.mp4) |
| Mend | ตอน cast ริ้วเสียงที่ Bard ไม่มีฮีล; เมื่อเริ่มรอบใหม่ ผู้ได้ heal จึงตอบรับจริง | [Mend cast → tick](mend-normal-normal-390.mp4) |

กรณีเสริม: [Heal overflow เป็น barrier](heal-overflow-normal-390.mp4) · [Twin heal](heal-twin-normal-390.mp4) · [Prayer echo](prayer-echo-normal-390.mp4) · [Mend life rhythm barrier ตอนเริ่มเพลง](mend-barrier-normal-390.mp4) · [Mend solo เพิ่มจำนวนฮีลจริง](mend-solo-normal-390.mp4)

## ภาพและ event

- Atlas/module เดียว `public/assets/fx/healing_fx.{webp,json}` / `src/game/visuals/healing-fx.ts`;30frames3504×1480,1376664bytes SHA256 `dc176c363d9b0b0a5d6af1491190572f75388c1015e2af4e9213f3a5c332e965` ต้นฉบับR1เก็บเดิม R2ใช้ImageGenแก้เฉพาะVFXให้แกนแสงชัด/ปลายโค้งฟุ้ง เก็บoriginal/prompt/alpha/source hashesและcellcutsที่ `incoming/ART-VFX-HEALING-001/r2/` ไม่มีของจาก sibling
- Rouse แยกครึ่งทอง/หยกจากcellเดิมไปคนละผู้รับ ภาพรับแทนอิง `before.guard.all` + intent/ผู้รับdamageจริง ไม่ผูกกับsourceIdของศัตรูคนแรก; defense moduleยกเว้นall=trueเพื่อไม่วาดredirectซ้ำ ภาพดูดซับบาเรียยังเป็นneutral defenseเดิม ไม่อ้างเจ้าของบาเรียจากข้อมูลที่ไม่มี
- Heal/Twin/Prayer ใช้heal eventบวกจริง; Healเต็มHPและPrayerที่ไม่มีผู้ต้องรักษาถูก validationปฏิเสธ ไม่สร้างคลิปฮีลปลอม Overflow/Afterglow/Life Rhythmใช้เมล็ดแสงcyanต่างจากกลีบฮีลและตัวเลขbarrierจริง
- Tickแยกจากcastด้วยevent discriminatorเดิมและsnapshotก่อนupkeepของstageนั้น (`turn.state`); source/recipientอ่านeventจริง แม้tickอยู่ท้ายstageของคนอื่น Prayer echo, Renew และsongไม่เดาจากactionที่เลือก ไม่มีเปลี่ยนrulesเพื่อเพิ่มmetadata
- ไม่แก้core/battle,save,content,balanceหรือ `src/ui/battle-playback.ts` จังหวะcontact/end/fastคงเดิม Unit poseเริ่มก่อนpainted early-return,optional unitsไม่ขวางStart,captionอยู่เหนือภาพ
- แสงหลัก/หางฟุ้งวางหลังunit เพื่อให้ชุดอยู่ข้างหน้า ขอบแสงด้านหน้าครอปเฉพาะ6pxใต้soleจริง ไม่เลื่อนทั้งท่าไปใต้HP ไม่มีwhite fillหรือheal pulseตอนBless/Mend cast
- ขยายfootprintตามรูปท่า คืนsoft alphaจากภาพวาดแทนตัดเป็นแถบบาง เพิ่มหางสลายกับwakeที่หน่วงตามหลังและลอยขึ้นเล็กน้อย หางตามunitระหว่างเคลื่อนด้วย ทุกชั้นจบภายในstageเดิม ไม่เพิ่มdelay/เวลาhealหรือเปลี่ยนสถานะ
- OS reduced motionเป็นภาพนิ่งทันที ลดความเข้มลดalpha/gestureโดยไม่เปลี่ยนเวลา/ผล ทุกtweenผูกกับimageที่sceneเป็นเจ้าของ cleanupเดิมเก็บเมื่อskip/load/resize/hidden; โหลดatlasไม่สำเร็จใช้fallbackเดิมและยังสั่งได้

## หลักฐานและทำซ้ำ

```sh
python incoming/ART-VFX-HEALING-001/package.py
npm run typecheck
npm run lint
npx vitest run --maxWorkers=1
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/healing-fx.spec.ts
HEALING_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/healing-clips.spec.ts --output test-results/healing-delivery
python tests/browser/fixtures/encode-healing-clips.py
HEALING_PLAYER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/healing-player.spec.ts
```

ผลตรวจR2: unit875/76files,typecheck/lint/buildผ่าน; healing browser26กรณีผ่าน (24หลัก + DPR2x/3xอีก2กรณี) (ยึดsoleที่เคลื่อนและfield shakeด้วยworld-transformอิสระที่DPR2x/3x, rear layer, expanding wake, static reduced, tick/guard/barrierจริง, fallback/cleanup), presentation13/13และoptional-unit loading3/3ผ่าน รวม42กรณี อัดR2ใหม่29/29ผ่าน และplayerเลือก/เล่น/ถอดรหัส29ไฟล์ผ่าน1/1 ไม่มีpageerror/overflowที่390px ไม่ถือผลR1เป็นผลmotion R2

วิดีโอR2ยาว2.55–12.06วินาที83–386captured framesต่อคลิป เก็บครบ+holdท้าย1frame, maxFrameGapสูงสุด0.305วินาที; encoderใช้90kHz timestampsและไม่ใช้B-frameเพื่อเก็บเฟรมที่เวลาชิดกันและความยาวMP4ท้ายคลิปครบ ตรวจdecoded PTSทุกเฟรมคลาดจากtimestampต้นฉบับไม่เกิน0.0062ms ไม่เร่ง/ชะลอ/interpolate

คลิปใช้ทีม/HP/speed/intentเฉพาะQAเพื่อเรียกผล ไม่ใช่เซฟเจ้าของหรือการเปลี่ยนสมดุล Reviveโหลดpreludeคำสั่งที่replayจนเพื่อนล้มจริง Captureทุกคำสั่งผ่านBattleUIจริงรวมคำสั่งต่อจนถึงtick/solo ไม่ฉีดeventsหรือเปลี่ยนstateระหว่างอัด ตัวเลขผล/เวลากับsnapshotใน [clips.json](clips.json)

CDPเก็บเวลาที่จับจริงแล้วencodeH264HighLevel3.1/VFR/yuv420p limited range390×844 ไม่มีเร่ง/ชะลอ/interpolation เก็บทุกframeที่จับไว้+holdท้าย1frame Stillcast/tickแยกจากเฟรมจริงแรกที่ถึงcue+180ms ไม่เดาจากเวลาคลิก ภาพafterglowของ6ท่าปกติเลือกเฟรมจริงที่ถึง60%ของremainingMsที่playbackส่งมา ไม่สร้างภาพปลายฟุ้งปลอม มีmaxFrameGapต่อคลิปในmanifestเพื่อเปิดเผยข้อจำกัดcapture ไม่ใช่FPSมือถือจริง

Chromium/SwiftShaderในcloud ไม่ใช่การรับรองSafariหรือเครื่องจริง ภาพที่captureผ่านและtestsผ่านไม่แทนการตรวจความสวย/การเคลื่อนไหวโดยเจ้าของ เก็บPRนี้draftและหยุดก่อนตระกูล4
