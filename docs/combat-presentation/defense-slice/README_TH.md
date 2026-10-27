# C5.2 — VFX โล่/ป้องกัน 11 ท่า · รอตรวจคลิป

**อัปเดต27ตุลาคม2026:** เจ้าของสั่ง “ไปต่อ” หลังดู [Rally R4 คำสั่งตั้งรับ](../rally-r4/README_TH.md) จึงเลือกภาพนี้ต่อ runtime ในPR#77เดิม คลิป Rally ในหน้านี้แทนแบบเก่าด้วย R4 แล้ว: Knight ส่งคลื่นข้างตัว → ทีมตอบรับที่พื้น → สลาย ยังรอตรวจคลิป ไม่ใช่การอนุมัติmergeหรือท่าอื่น

เจ้าของเลือกแนว aura R3 รอบเท้า/หน้าแข้งของ Stone Armour/Aegis และสั่ง “จัดไป” ให้ต่อ runtime หลังแผนเกลาภาพสี่ท่า รวม atlas/module ทดสอบ และส่งคลิปจริง การอนุมัตินี้ไม่ข้ามขั้นตรวจคลิปและไม่ครอบคลุมการเริ่มตระกูล 3

เปิด [หน้าเลือกคลิป](index.html) เลือกดูทีละคลิปที่ขนาดจริง 390×844px มี normal/fast/reduced intensity/OS reduced motion และผลที่เกิดจริง คลิปไม่มีเสียงและไม่มีการสร้างภาพต่อสู้ปลอม

## คลิปครบ 11 ท่า

| ท่า | สิ่งที่ควรดู | คลิป |
|---|---|---|
| Guard | วงเล็บนอกโล่เดิมตอนตั้งรับ แล้วภาพรับแทนติดผู้ได้รับ damage จริง | [Guard + รับแทน](guard-normal-normal-390.mp4) |
| Aegis | Aura ผลึกต่ำรอบเท้าของผู้ได้รับ barrier จริงแต่ละคน | [Aegis](aegis-normal-normal-390.mp4) |
| Rally | คลื่นคำสั่งข้าง Knight ชุดเดียว → เส้นโค้งตอบรับที่พื้นทั้งทีม เว้นชุด/รองเท้า/HP ไม่เพิ่มโล่เอง | [Rally](rally-normal-normal-390.mp4) |
| Bulwark | ฐานหนัก/กลางโปร่งเฉพาะแนวหน้า ไม่ใช่ barrier | [Bulwark](bulwark-normal-normal-390.mp4) |
| Stone Armour | Aura ศิลาต่ำ 88×32px รอบขาและ barrier ของผู้ใช้ | [Stone Armour](stonearmor-normal-normal-390.mp4) |
| Guardian Stone | ศิลาพ้นอาวุธที่ผู้รับพร แล้วรับแทน/ฟื้นผู้ใช้เมื่อเกิดผลจริง | [Guardian Stone](guardstone-stone-normal-390.mp4) |
| Halo | วงรีเหนือหัวทั้งทีม ลดเฉพาะพลังงาน ไม่มีการฮีลหรือสร้าง barrier | [Halo](halo-normal-normal-390.mp4) |
| Sanctuary | ตั้งพรแล้วคง HP 1 เมื่อโดนท่าที่ควรล้ม ไม่มีภาพโล่ดูดซับผิด ๆ | [Sanctuary กันล้ม](sanctuary-save-normal-390.mp4) |
| Brace | ทวนเดี่ยวตั้งนิ่งก่อน สวนเฉพาะ physical แรกที่แนวหน้าโดน | [Brace + สวน](brace-counter-normal-390.mp4) |
| Spear Wall | ซี่ทวนตั้งขนานก่อน สวนทุก physical ที่แนวหน้าโดน | [Spear Wall + สวน](spearwall-counter-normal-390.mp4) |
| Hold | แนวทวนต่ำก่อน สวนเมื่อแนวหลังโดนจริง ไม่เปลี่ยนเป้า | [Hold + สวน](hold-counter-normal-390.mp4) |

## ผลจริงและโหมด

- [โล่รับเต็ม](aegis-blocked-normal-390.mp4): HP ไม่ลด แสดง neutral absorption ตาม `absorbed` จริง ไม่ติดแสง damage บนตัว
- [โล่รับบางส่วน](aegis-partial-normal-390.mp4): แสดงส่วนที่โล่รับและ HP ที่ลดตาม event; คำว่าโล่หมดมาจากสถานะจริง
- [หลบ](guard-dodged-normal-390.mp4): ไม่มีภาพรับแทนที่สื่อว่าถูกตี ไม่มี core ปะทะที่ตัว
- [ศัตรูถูกยกเลิกท่า](guard-cancelled-normal-390.mp4): ไม่มี hit/counter ที่มาถึงทีหลัง
- [Fast](aegis-normal-fast-390.mp4), [ลดความเข้ม](aegis-normal-reduced-390.mp4), [OS reduced motion](aegis-normal-osreduce-390.mp4): ใช้ timing เดิม; reduced motion เป็นภาพนิ่งทันที ไม่บังคับดูการเคลื่อนไหว

ภาพสลายเป็นการจบ cue ชั่วคราว ไม่ได้ลบสถานะหรือหมายความว่าโล่แตก สถานะ/HP/ข้อความจริงยังเป็นของ resolver และ UI ไม่มี persistent rim ใหม่ในงานนี้

## การต่อและขอบเขต

- `public/assets/fx/defense_fx.webp` + `.json`: atlas เดียว 38 frames, 1584×1848px, 546,404 bytes; ภาพหลัก36จังหวะ (Rallyมีคำสั่ง/ตอบรับแยกกัน) กับ shared paintings จาก blade ของ repository นี้ `defense-art.json` เป็นตารางขนาด/anchor ที่สร้างซ้ำได้
- `src/game/visuals/defense-fx.ts`: module เดียว ใช้ตารางเล็กเลือกทรง/ขนาด/ทิศ/gesture พื้นที่โปร่งตาม artwork ที่เลือก แต่ละ strip ใช้สเกล/ฐานเดียวกันทั้งสามจังหวะ ไม่ยืดแต่ละภาพให้เต็มกรอบใหม่
- Earth/crystal aura ยึด foot anchor จริง ความสูงไม่เกิน 32/28px ที่ reference 390px ไม่ขยับฐานหรือขยายแนวตั้งตอนเคลื่อนไหว
- Cast recipients มาจาก event หรือ coverage state จริง; Guard/Stone อิง damage recipient จริง; ทวนสวนจาก `counter` จริงเท่านั้น Absorption ไม่เดาว่าบาเรียมาจากสกิลใดเพราะ state ไม่มีข้อมูลเจ้าของบาเรีย
- รักษา `unit-animation` และ optional-unit loading เดิม เริ่ม pose ก่อน defense early return และวางข้อความเหนือภาพ Tween ทุกตัวมี image ที่ scene เป็นเจ้าของ จึงเก็บกวาดเมื่อ skip/load/resize/hidden ผ่านระบบเดิม ไม่มี timer ค้างของ module
- ไม่แก้ core rules, save, balance, content หรือ `battle-playback.ts`; Fast และ cue ยังเป็นของ playback เดิม ถ้าภาพ atlas โหลดไม่ได้ ใช้กราฟิก fallback เดิมโดยไม่ขวางคำสั่ง
- Ward ที่ผ่านแล้วไม่วาดใหม่ Bolt/Execute/blade เป็น reference เท่านั้น ไม่เริ่มตระกูล 3

## การจับภาพและขอบเขตหลักฐาน

คลิปจาก Chromium headless/SwiftShader ใน cloud ผ่าน source fixture ที่ใช้ BattleUI, BattleScene, playback และ resolver จริง ใช้ทีม/ความเร็ว/HP/intent เฉพาะทดสอบเพื่อเรียกผลอย่างแน่นอน ไม่ใช่เซฟของเจ้าของหรือการปรับสมดุลเกม

Guardian Stone ใช้ energy แบบเป้าเดี่ยวที่เล็งผู้รับพร เพื่อให้เกิด redirect จริง Hold ใช้ physical แบบหมู่ที่โดนแนวหลังจริง เพราะ physical แบบเป้าเดี่ยวถูกแนวหน้าบังอยู่ กรณีหลบ/ยกเลิกใช้ initial status ของ fixture ส่วน barrier และ counter เกิดจากการกดสกิลผ่าน UI จริงทั้งหมด ไม่ใส่ event สำเร็จรูป ไม่มี fixture/debug surface ส่งเข้า production

[clips.json](clips.json) เก็บจำนวนเฟรม ระยะเวลา ช่องว่างเฟรม และ cue timestamps/ผล resolved จริง CDP จับเฟรมตามเวลาจริงแล้ว encode H.264 High Level 3.1 / VFR ด้วย time base 60Hz เพื่อเล่นในเบราว์เซอร์ ไม่มีการเร่ง/ชะลอหรือ interpolation เก็บเฟรมที่จับได้ไว้ครบในวิดีโอ (บวก hold เฟรมท้าย) ไม่ใช่หลักฐาน FPS ของเครื่องจริงหรือ Safari ช่องว่างเฟรมสูงสุดของแต่ละ capture ระบุใน manifest

PNG ของแต่ละคลิปดึงใกล้ cue จริง +180ms เพื่อให้ผ่านการวาด canvas ใน cloud แล้ว; Rally R4เลือกเฟรมจริงแรกที่ถึง/เกินเกณฑ์นี้ แทนเฟรมก่อนหน้าที่ยังไม่แสดงการตอบรับเมื่อCDPมีช่องว่าง ไม่ประมาณจากเวลาที่กดปุ่ม วิดีโอคงเวลาจริงทั้งหมดและยังแสดงช่วงเตรียมก่อน cue ตามปกติ

## ตรวจซ้ำและผลทดสอบชุดแรก

ผลชุดแรกด้านล่างเป็นหลักฐานก่อน Rally R4; การตรวจและคลิป R4 ระบุในรายการอัปเดตล่าสุด

```sh
python docs/combat-presentation/defense-storyboards/build_manifest.py
python incoming/ART-VFX-DEFENSE-001/package.py
npm run typecheck
npm run lint
npx vitest run --maxWorkers=1
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/defense-fx.spec.ts
DEFENSE_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/defense-clips.spec.ts --output test-results/defense-delivery
python tests/browser/fixtures/encode-defense-clips.py
```

- Typecheck/lint/build ผ่าน; **858 unit tests /75 files ผ่าน**
- Defense coverage 36 กรณี: timing/cleanup ทั้ง 11 ท่า, response 10 กรณี, still ทั้ง 11 ท่า, modes/resize 3 กรณี, missing-atlas fallback 1 กรณี ผ่าน; แก้ selector ของ QA party button แล้วตรวจซ้ำ ไม่แก้ input ของเกม
- Final focused run **28/28 ผ่าน**: cast/cleanup ของ defense 11 + fallback 1 + presentation 13 + Bolt/Execute/Ward ที่390px 3 รวม skip/resize/reload/hidden และ motion preferences
- Storyboard render/control 1/1 และ actual clip capture **18/18 ผ่าน**; ตรวจ PNG ของทุกท่าและผลสำคัญแล้ว ไฟล์วิดีโอทั้ง18มีขนาด390×844, level3.1 และจำนวนเฟรมที่จับไว้ไม่หาย หน้ารวมคลิปมี18ตัวเลือก แสดงกว้าง390px เลือกคลิปและเล่นได้ ไม่มี page error
- Runtime head `7df3af2`: [Quality CI 40364495891](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40364495891) ผ่าน; [Browser CI 40364495605](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40364495605) ผ่าน dev-source blade+defense gate และ production prechecks แล้ว ส่วน production regression เต็มยังทำงานขณะจัดชุดส่ง

การผ่าน tests เป็นหลักฐานทางเทคนิคเท่านั้น **รอเจ้าของตรวจคลิปก่อน merge และก่อนเริ่มตระกูลถัดไป**

## Rally R4 — คลิปที่เปลี่ยนเฉพาะท่านี้

[Normal](rally-normal-normal-390.mp4) · [Fast](rally-normal-fast-390.mp4) · [Reduced intensity](rally-normal-reduced-390.mp4) · [OS reduced motion](rally-normal-osreduce-390.mp4)

R4ใช้คำสั่งเพียงหนึ่งชุดจากผู้ใช้ ไม่วางprepareบนเพื่อนก่อนcontact ทุกrecipientอ่านจากcoverageจริงและdeduplicateเมื่อtalentให้สองครั้ง OS reduced motionแสดงภาพนิ่งของคำสั่งและการตอบรับ ทุกภาพอยู่ในeffects layerเดิมและล้างผ่านระบบเดิม ไม่มีการเพิ่มเวลาplaybackหรือpersistent aura

อัดซ้ำเฉพาะRallyและรวมmanifestโดยเก็บอีก17คลิปเดิม:

```sh
DEFENSE_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/defense-clips.spec.ts -g 'defense clip rally-' --output test-results/defense-rally-r4-clips
python tests/browser/fixtures/encode-defense-clips.py test-results/defense-rally-r4-clips --merge
```

ผลตรวจ R4ล่าสุด: typecheck/lint/buildผ่าน, unit858/75filesผ่าน, defense browser39/39ผ่าน (ทั้ง11ท่าและresponseเดิม พร้อมRallycommand/recipient/foot offset/cleanupและmodesใหม่) ตรวจatlas/profile38frames/11skillsผ่าน

Storyboard/control1/1 และcaptureRally4/4ผ่าน วิดีโอใหม่ทั้ง4เป็น390×844 H264HighLevel3.1/yuv420p limited range (แปลงfull-rangeJPEGอย่างชัดเจน)85–103captured framesเก็บครบ+holdท้าย1เฟรม ระยะเวลา3.28–3.38วินาที maxgap0.141–0.341วินาที ตรวจstillsทั้ง4แล้ว Player21คลิปเล่นRallyทั้ง4ได้ ไม่มีpageerror/overflowที่390px อีก17คลิป/17ภาพและprofile10ท่าเดิมbyte/dataเหมือนเดิม
