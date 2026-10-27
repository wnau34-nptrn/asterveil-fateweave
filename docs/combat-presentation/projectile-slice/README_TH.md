# C5.4 — ลูกธนู / มีดบิน R1 · เจ้าของให้ผ่าน motion แล้ว

เจ้าของให้ผ่านmotion40คลิปแล้ว27ต.ค.2026 “เอาเข้าเกมได้”; PR84 merged7c392b5หลังCIผ่าน Pages40503739046เผยแพร่successครบbuild+4browser shards+deployเวลา19:37:55น.กรุงเทพฯ [release proof](../../validation/projectile-vfx-release/README_TH.md) ข้อความเสนอรอตรวจด้านล่างเป็นประวัติ ไม่เริ่มตระกูล5

27 ตุลาคม 2026 · [PR#84 เดิม](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/84) → `feature/fateweave-initial-prototype`

เจ้าของเลือก artwork R1ด้วย “ดำเนินการขั้นต่อไป” แล้ว จึงต่อ runtime ทั้ง7ท่าในatlas/moduleเดียว การเลือกภาพไม่ใช่การอนุมัติ motion งานนี้ส่งคลิปให้ตรวจก่อน merge/เผยแพร่/ตระกูล5 ไม่มีการแก้ core/save/content/balance/playback timing

[เปิดหน้าเลือกคลิปทีละ390px](index.html) · [เวลา/ผล resolved จริง](clips.json) · [ต้นแบบที่เลือก](../projectile-storyboards/README_TH.md) · [ต้นฉบับ/การpack](../../../incoming/ART-VFX-PROJECTILE-001/NOTES.md)

## 7ท่า · ภาพเคลื่อนไหวจริง

ทุกท่ามี normal/fast/reduced intensity/OS-reduced motion เลือกได้ในหน้าplayer ตารางนี้ลิงก์คลิปปกติ:

| ท่า | คลิป390×844 | ความจริงที่รักษา |
|---|---|---|
| Hinder | [ปกติ](hinder-normal-normal-390.mp4) | ลูกเดียวและdelayรอบหน้าตามevent ไม่แสดงstun/cancel |
| Volley | [ปกติ](volley-normal-normal-390.mp4) | หนึ่งเส้นทางต่อศัตรูมีชีวิตทั้ง4 ไม่จำกัดแถวหน้า |
| Weakshot | [ปกติ](weakshot-normal-normal-390.mp4) | ศรเข็มหนึ่งhit ไม่มีcritical/armorbreakที่แต่งขึ้น |
| Pin | [ปกติ](pin-normal-normal-390.mp4) | สองศรเฉพาะแถวหน้า; pinnedหยุดscreening ไม่หยุดเทิร์น |
| Track | [ปกติ](track-normal-normal-390.mp4) | castหนึ่งhit; ไม่แสดงยิงซ้ำจากชื่อท่า |
| Disengage | [ปกติ](disengage-normal-normal-390.mp4) | damage+ย้ายเป้าที่ยังไม่เดินไปท้ายคิว ไม่ย้ายช่องยืนและไม่สร้างdodgeเอง |
| Knives | [ปกติ](knives-normal-normal-390.mp4) | มีดไปแถวหลังแม้มีscreen; โค้งข้ามเงาร่างแถวหน้าให้อ่านคมมีดชัด |

## กรณีเฉพาะจากresolverจริง

- Track: [ยิงซ้ำท้ายรอบเมื่อdelayed](track-delayed-normal-390.mp4), [เป้าล้มก่อนท้ายรอบ](track-targetdown-normal-390.mp4), [ผู้ยิงล้มก่อนท้ายรอบ](track-sourcedown-normal-390.mp4) ใช้commandsจริงจนจบรอบ/จบศึก ไม่แทรกcounterเอง `Tracking shot.` เป็น `counter` บนstageของผู้จบรอบ จึงแยกจากdamageตอนcast
- Knives: [แถวหลังว่างจึงใช้หน้า](knives-frontonly-normal-390.mp4), [Twinknives หลังเต็ม/หน้าครึ่งpower](knives-twin-normal-390.mp4), [Quickknives ไม่เพิ่มhit](knives-quick-normal-390.mp4)
- Weakshot: [bonusกับdelayedจริง](weakshot-delayed-normal-390.mp4); Volley: [volleyhinderให้delayเฉพาะเร็วสุดที่รอด](volley-volleyhinder-normal-390.mp4)
- Disengage: [quickstepเพิ่มdelayรอบหน้า](disengage-quickstep-normal-390.mp4), [covershotbonusตามintentจริง](disengage-covershot-normal-390.mp4)
- Hinder: [heavyhinderต่อdelayอีกรอบ](hinder-heavy-normal-390.mp4), [Veilguardลดdamageจริง](hinder-veiled-normal-390.mp4)

ภาพการป้องกัน/หลบที่ไม่มีในกฎฝั่งศัตรูของรุ่นนี้ไม่ได้ถูกสร้างขึ้นเพื่อให้ครบรายการ ปัจจุบันstrikeของ7ท่าต่อศัตรูเป็นdamage; enemyไม่มีhero-stylebarrier/evade/Guard redirect จึงไม่มีคลิปปลอมว่าได้ผลเหล่านั้น ตัวrouterยังอ่านผู้รับจริง/amount/dodgeจากeventและแยกcounter/absorbตามข้อมูลที่ได้รับ ส่วนcancel contractตรวจแยกในunit ไม่ใช่คลิปเหตุการณ์ที่แต่งขึ้น

## ภาพ/จังหวะ/cleanup

- หนึ่งlosslessRGBAatlas21frames1440×2016 และหนึ่งmodule `src/game/visuals/projectile-fx.ts`; ต้นฉบับและcell/hashที่ `incoming/ART-VFX-PROJECTILE-001/production-sources.json` ไม่สร้างpixelsตัวละคร/UIใหม่
- กราฟิกแต่ละลูกมีbrightboundsและปลายศรจริง ความกว้างปกติ58–76CSSpxตามท่า เตรียม22%ของcontactเดิมแล้วเดินทางโค้งถึงแนวรับในcontactเดิม ไม่เพิ่มเวลารอ/จังหวะhit ทุกผลยังเปิดพร้อมsnapshotเดิม
- LandmarkผูกกับimageworldtransformจริงและหารDPRเพียงครั้งเดียว รวมspriteoffset/pose scale/rotation/recoil/fieldshake จุดปล่อยเป็นยอดคันธนูหรือมือ/คมมีดด้านซ้าย จุดรับเป็นขอบbodyของผู้รับeventจริง ไม่ยึดsoleแบบheal
- Flight/glint/tailอยู่หลังunitและDOMชื่อ/HP/status; กลุ่มข้อความผลอยู่หน้าสุด ไม่มีเส้นslashขาวหรือbodyfillซ้ำจากfallbackเมื่อใช้atlasได้ Afterglowเป็นtailเดิมกับwakeเบาที่หน่วงตามหลัง ภายในstageเดิม
- Fastใช้stageTiming65%เดิม Reduced intensityลดopacity/ส่วนโค้ง; OS-reducedเปิดผลทันทีด้วยภาพนิ่งที่ผู้รับจริง ไม่มีflight/tailเคลื่อนที่
- ทุกtweenมีownedimageเป็นtarget; contactล้างflightก่อนลงwisps, stop/skip/load/resize/hidden/OSchangeล้างtweensและimages ไม่มีtimer/listenerใหม่ในmodule AssetsหายยังStart/commitได้และใช้fallbackเดิม

## การอัด/ทำซ้ำ

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/projectile-fx.spec.ts --output=test-results/projectile-checks-final
PROJECTILE_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/projectile-clips.spec.ts --output=test-results/projectile-delivery
python tests/browser/fixtures/encode-projectile-clips.py test-results/projectile-delivery
PROJECTILE_PLAYER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/projectile-player.spec.ts --output=test-results/projectile-player
```

Captureแยกจากtestsโดยไม่หยุด/เร่งนาฬิกา ใช้UIคลิกและresolver/playback/rendererจริง นิยามencounterQA4v4ตามกฎ ไม่ใช่เซฟเจ้าของ ตัวเลขHP9999/SPDในfixtureไม่ใช่การแก้balanceเกมจริง UIคลิกศัตรูตัวจริง `target-enemies-f1` แล้วส่งcanonical command `enemies` ตามBattleUIปัจจุบัน ไม่ใช้การdispatchfakeevents/เขียนBattleStateเพื่อจับภาพ

RawJPGทุกเฟรมกับ`stamps.txt`/`timing.json`/`final-state.json` คงอยู่ที่ `test-results/projectile-delivery/` ในworkspace (gitignored ไม่ลบก่อนตรวจ); `raw-captures.json`เก็บinventory/hash/timestamp MP4ใช้timestampจริงทุกเฟรม VFR90kHz/noBframes มีfinalhold50ms ไม่เร่ง/ชะลอ/interpolate/สร้างเฟรม การตรวจdecodeยืนยันcountและPTSทุกเฟรมกับraw รวมปลายคลิป ตัวplayerอ่านหลังencoderpackเสร็จเท่านั้น

เป็นChromium cloud/SwiftShader390px ไม่มีเสียงในfixture ไม่ใช่ผลทดสอบSafariหรือมือถือจริง และไม่อ้าง60fps ค่าช่องว่างเฟรมจริงอยู่ในclips.jsonให้ตรวจตรงไปตรงมา

## การตรวจรอบส่งมอบ

typecheck/lint/buildผ่าน;890unit/77filesผ่าน (เพิ่ม15routing/actualresolver cases);26uniquefocusedbrowserผ่าน และ8ข้อที่เกี่ยวกับknives/cleanupผ่านซ้ำหลังปรับarcและเพิ่มการเทียบcommands State/resultsเหมือนเดิม กรณีDPR2/3ใช้sourceworldpointอิสระ AtlasหายและOSภาพนิ่งครบ7ท่าผ่าน รักษาblade/defense/healing sourcegatesในCI/Pagesและเพิ่มprojectilegateโดยตรง Fullbrowserปล่อยCIรัน ไม่skipปัญหาเพื่อให้เขียว

สถานะcapture/player/CIล่าสุดจะบันทึกในhandoffเมื่อส่งคลิปครบ ผลtestsไม่ใช่การอนุมัติmotionโดยเจ้าของ PR84ยังdraftและยังไม่merge/เผยแพร่

ชุดส่งมอบสุดท้าย:40/40capturesผ่านพร้อมเทียบstateทุกช่องกับresolver,5479rawframes/40MP4,decodedPTS errorสูงสุด0.0062ms เทียบrawและจำนวนframe+finalholdผ่านทุกไฟล์ ช่องว่างcaptureสูงสุด367msในcloud เก็บจริงตามนั้น ไม่เติมเฟรมและไม่อ้าง60fps Rawชุดแรกที่พบวงfallbackยังเก็บที่ `test-results/projectile-delivery-pre-ring-fix/` แต่คลิปส่งมอบทุกไฟล์เป็นsourceหลังแก้แล้ว ดู [delivery-proof.json](delivery-proof.json) และ [raw-captures.json](raw-captures.json)

Playerผ่าน1/1: เลือกครบ7ท่า/4โหมด/40ไฟล์ไม่ซ้ำ เล่นdecodeได้จริงทุกไฟล์ ไม่มีpage/media errorและหน้าไม่ล้น390px หลังencoderเสร็จแล้ว
