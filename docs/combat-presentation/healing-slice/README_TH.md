# C5.3 — แสงรักษา6ท่า · runtime รอเจ้าของตรวจคลิป

27 ตุลาคม2026 · [PR#78](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/78) · `codex/vfx-family-3-healing`

เจ้าของเลือก [artwork R1](../healing-storyboards/README_TH.md) ด้วยข้อความ “ดำเนินการขั้นต่อไปได้” หลังส่งภาพ6ท่า/3จังหวะ จึงต่อภาพชุดนั้นเข้า runtime ใน PR เดิม การเลือกภาพนี้ยังไม่ใช่การผ่าน motion review หรือเริ่มตระกูล4

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

- Atlas/module เดียว `public/assets/fx/healing_fx.{webp,json}` / `src/game/visuals/healing-fx.ts`;30frames2352×520,272058bytes SHA256 `ba5de62ffd698458c76924638b6d04ee1e07640a7c5510a21b58da58d01e9b86` ภาพเดิมของ R1ฉายบนพื้นต่ำ ต้นฉบับ/prompt/alpha/source hashes/packager ใน `incoming/ART-VFX-HEALING-001/` ไม่มี artwork ใหม่หรือของจาก sibling
- Rouse แยกครึ่งทอง/หยกจากcellเดิมไปคนละผู้รับ ภาพรับแทนอิง `before.guard.all` + intent/ผู้รับdamageจริง ไม่ผูกกับsourceIdของศัตรูคนแรก; defense moduleยกเว้นall=trueเพื่อไม่วาดredirectซ้ำ ภาพดูดซับบาเรียยังเป็นneutral defenseเดิม ไม่อ้างเจ้าของบาเรียจากข้อมูลที่ไม่มี
- Heal/Twin/Prayer ใช้heal eventบวกจริง; Healเต็มHPและPrayerที่ไม่มีผู้ต้องรักษาถูก validationปฏิเสธ ไม่สร้างคลิปฮีลปลอม Overflow/Afterglow/Life Rhythmใช้เมล็ดแสงcyanต่างจากกลีบฮีลและตัวเลขbarrierจริง
- Tickแยกจากcastด้วยevent discriminatorเดิมและsnapshotก่อนupkeepของstageนั้น (`turn.state`); source/recipientอ่านeventจริง แม้tickอยู่ท้ายstageของคนอื่น Prayer echo, Renew และsongไม่เดาจากactionที่เลือก ไม่มีเปลี่ยนrulesเพื่อเพิ่มmetadata
- ไม่แก้core/battle,save,content,balanceหรือ `src/ui/battle-playback.ts` จังหวะcontact/end/fastคงเดิม Unit poseเริ่มก่อนpainted early-return,optional unitsไม่ขวางStart,captionอยู่เหนือภาพ
- ตราสถานะจริงอยู่กลางฐานเท้า จึงเลื่อนเฉพาะวงเล็บ Rouse/เมล็ด Bless/barrier ไปด้านข้าง20pxภายในslotเดิม ภาพเดิม/ความสูงเดิม; อัดซ้ำ10คลิปที่เกี่ยวข้องหลังตรวจพบตราบังแกนแสง
- peakสูง18px/tick16pxตามแบบที่เลือก พื้นที่ชุด/รองเท้า/HPเว้นว่าง ไม่มีwhite fillหรือheal pulseตอนBless/Mend cast แสงสลายไม่ลบสถานะ
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

Capture29/29ผ่าน อัดซ้ำ10/10หลังขยับแสงหลบตราและmergeโดยคงอีก19คลิปเดิม Playerเลือก/เล่น/ถอดรหัสครบ29คลิปผ่าน1/1 ไม่มีpageerror/overflowที่390px วิดีโอ2.57–11.88วินาที89–400captured framesต่อคลิป เก็บครบ+holdท้าย1frame,maxgapสูงสุด0.309วินาที

Validation: typecheck/lint/buildผ่าน,875unit/76filesผ่าน รวม17กรณีจากresolverจริง; healing browser24/24ผ่าน, Guard/Guardian Stone + presentation regression21/21ผ่าน (320/390/PC, skip/resize/reload/hidden/เปลี่ยนmotion), optional-unit loading3/3ผ่าน Source fixture gateในCI/Pagesเพิ่มhealingโดยคงblade+defenseเดิม; production skipเฉพาะsource/capture/playerที่มีgateหรือเป็นหลักฐานจับภาพ ไม่ลดชุดเกมproduction

คลิปใช้ทีม/HP/speed/intentเฉพาะQAเพื่อเรียกผล ไม่ใช่เซฟเจ้าของหรือการเปลี่ยนสมดุล Reviveโหลดpreludeคำสั่งที่replayจนเพื่อนล้มจริง Captureทุกคำสั่งผ่านBattleUIจริงรวมคำสั่งต่อจนถึงtick/solo ไม่ฉีดeventsหรือเปลี่ยนstateระหว่างอัด ตัวเลขผล/เวลากับsnapshotใน [clips.json](clips.json)

CDPเก็บเวลาที่จับจริงแล้วencodeH264HighLevel3.1/VFR/yuv420p limited range390×844 ไม่มีเร่ง/ชะลอ/interpolation เก็บทุกframeที่จับไว้+holdท้าย1frame Stillcast/tickแยกจากเฟรมจริงแรกที่ถึงcue+180ms ไม่เดาจากเวลาคลิก มีmaxFrameGapต่อคลิปในmanifestเพื่อเปิดเผยข้อจำกัดcapture ไม่ใช่FPSมือถือจริง

Chromium/SwiftShaderในcloud ไม่ใช่การรับรองSafariหรือเครื่องจริง ภาพที่captureผ่านและtestsผ่านไม่แทนการตรวจความสวย/การเคลื่อนไหวโดยเจ้าของ เก็บPRนี้draftและหยุดก่อนตระกูล4
