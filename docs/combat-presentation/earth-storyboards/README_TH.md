# C5.5 — ทุบ / แผ่นดิน · artwork R1 รอเจ้าของเลือก

27 ตุลาคม 2026 · `codex/vfx-family-5-earth` → `feature/fateweave-initial-prototype` · [draft PR85](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/85) ตระกูล5หนึ่งPR ตั้งแต่artworkถึงruntimeภายหลัง

เจ้าของอนุญาต “เริ่มขั้นต่อไปได้” หลังตระกูล4เผยแพร่แล้ว งานนี้เริ่มartwork3จังหวะของbash/slam/quake/tremorให้เลือกก่อนต่อruntime ยังไม่มีearth atlas/moduleในเกม ไม่มีการmerge/เผยแพร่หรือเริ่มตระกูล6

[หน้าเลือก4ท่า / 3จังหวะ / 15กรณีจริง](index.html) มีเตรียม/จุดเด่น/สลาย เลือกphase เทียบสนามเปล่า น้ำหนัก60–110% และคืนค่า100% ภาพทุกช่อง390×844px รูปทรงแต่ละท่าต่างกัน ไม่ใช้วงขยายเดียวเปลี่ยนสี

| ท่า | รูปทรงและข้อเท็จจริง | เตรียม / จุดเด่น / สลาย390px |
|---|---|---|
| Bash | ครีบแรงชนโล่ทอง/ivoryขอบฟ้า อยู่ขอบbodyผู้รับdamageจริง ไม่วาดshield/barrierหรือstunแทนการทุบ | [01](bash-base-0-390.png) · [02](bash-base-1-390.png) · [03](bash-base-2-390.png) |
| Slam | แนวทุบรูนบรอนซ์ลงจุดbody-contactเดียว ริ้วแตกเฉพาะจุด ไม่ใช่แรงระเบิดทั่วสนาม | [01](slam-base-0-390.png) · [02](slam-base-1-390.png) · [03](slam-base-2-390.png) |
| Quake | พัดรอยแยกอำพันต่ำจากแนวเท้าของผู้รับจริง เศษศิลาเล็กและหางฝุ่นโปร่ง ไม่เปลี่ยนterrainถาวร | [01](quake-base-0-390.png) · [02](quake-base-1-390.png) · [03](quake-base-2-390.png) |
| Tremor | สันศิลา/ริ้วหยกต่ำเอนหาผู้ใช้ อ่านเป็นแรงดึง ไม่เป็นรากตรึง/stunหรือpower-down | [01](tremor-base-0-390.png) · [02](tremor-base-1-390.png) · [03](tremor-base-2-390.png) |

## กลไกที่ตรวจบนฐาน35e39af

- Bash: damageเดี่ยว; interruptเฉพาะphysicalถัดไปที่หยุดได้และเป้ารอด Energyปกติไม่หยุด Reflectbashลดpower30%แต่ส่งsigilหยุดenergyได้; Retributionเพิ่ม8เมื่อstopsจริง **ไม่เพิ่มจำนวนhit** Unstoppable/steadfastต้านได้; เป้าล้มไม่สร้างinterrupt/sigil
- Slam: damageเดี่ยว+bonus10เมื่อintentถัดไปเล็งผู้ใช้ Runequakeเพิ่มstrikeครึ่งskill.powerปัดลงให้ศัตรูอื่นที่slotหมายเลขเดียวกัน (`f1↔b1` / `f2↔b2`) ไม่ใช่ตีทุกตัวและไม่พาbonusของprimaryไปเพิ่มsplash
- Quake: strikeแถวหน้าที่มีชีวิต; ถ้าหน้าไม่มีจึงstrikeผู้มีชีวิตที่เหลือ Skyhammerเรียกhealผู้ใช้ต่อstrikeตามengine เฉพาะamountที่คืนHPจริง กรณีเสนอให้ผู้ใช้ขาด15HPจึงเกิดheal4สองครั้งรวม8 Conceptนี้เสนอเฉพาะภาพทุบ ไม่วาดแสงhealปลอมตอนHPเต็ม; รายการhealอยู่ในmanifestเพื่อคงroutingของจริงตอนruntime
- Tremor: strikeหน้า/หลังเมื่อหน้าว่าง แล้วตั้งdrawnByให้เป้าที่รอดเล็งผู้ใช้ในintentถัดไปตามอายุจริง **ไม่ได้ลดpowerหรือหยุดเทิร์น** ตรวจbeforeintentเล็งKnightคนอื่น และactual later intentsของผู้รับถูกเปลี่ยนมาWarden ไม่มีการแก้state/eventsเพื่อภาพ

เลือกกรณีเพิ่มเติมในviewer: [Bash energy](bash-energy-1-390.png), [reflect energy](bash-reflect-1-390.png), [unstoppable](bash-unstoppable-1-390.png), [retribution](bash-retribution-1-390.png), [เป้าล้ม](bash-down-1-390.png), [Slam incoming bonus](slam-incoming-1-390.png), [runequake](slam-runequake-1-390.png), [Quake ไม่มีหน้า](quake-backonly-1-390.png), [skyhammer](quake-skyhammer-1-390.png), [Tremor ไม่มีหน้า](tremor-backonly-1-390.png), [drawnBy/energy intentจริง](tremor-redirect-1-390.png)

## ความจริงของภาพและanchor

ทั้งหมดเป็นstatic concept composites: หนึ่งscreenshotก่อนcastต่อกรณีเหมือนกันทุกphase ไม่ใช่ภาพHP/ผลควบคุมหลังcontactหรือคลิปmotion ตัวเลขUI/ชุด/อาวุธไม่ได้ให้AIวาดใหม่ ผู้รับมาจากdamage/dodge eventsจริงทุกตัว ไม่ใช้targetKindหรือชื่อท่าเดาจำนวน

ต้นฉบับImageGen1536×1024 RGBA4rows×3columns เก็บbyte-identicalพร้อมpromptใน [ART-VFX-EARTH-001](../../../incoming/ART-VFX-EARTH-001/NOTES.md) ไม่มีkeying/repaint แยกcellใช้brightboundsและnormalalpha projection; Bash/Slamแนวbodyedgeบน ส่วนQuake/Tremorฉายลงgroundตื้นที่renderedsoleจริง ต่างกันโดยshape/ทิศ/ขนาดไม่ใช่สีอย่างเดียว พื้นหน้าmaskมาจากsourceframe+worldtransformของspriteจริงและชื่อ/HPจริง จึงรักษาpixelsชุด/อาวุธ/ป้าย และจำกัดอยู่ในสนาม

ใช้CSSpixels/DPRครั้งเดียว ตรวจ2×/3×ด้วยimageworldpivotอิสระจากhelper ภาพนิ่งยังไม่พิสูจน์การตามpose/recoil/shakeหรือmotion runtime; ต้องตรวจอีกครั้งหลังเลือกartwork ไม่บวกoffsetslotคงที่หรือใช้soleกับทุกท่า จุดedge/projectionในR1เป็นข้อเสนอด้านภาพ ต้องยืนยันกับunitที่กำลังวาดจริงขณะต่อruntime

## ฐานและreleaseก่อนหน้า

Fetchล่าสุด35e39afก่อนแยกbranchใหม่ ตระกูล4PR84merged7c392b5และPages40503739046successตรงSHAผ่านbuild+4browser+deploy19:37:55กรุงเทพฯ ตรวจAPI/release.jsonตรงกัน AtlasSHA256d9a46b5189187cd779b4ee5ad2b2520fe4533a9d160f017796fe1e880bcc169dตรงcheckout ไม่อ้างตรวจliveHTTP200/hashCDNใหม่ ข้อจำกัดCONNECT403ของcloudแยกจากPagesสำเร็จ ดู [release proofตระกูล4](../../validation/projectile-vfx-release/README_TH.md)

## ทำซ้ำ / ตรวจ

```sh
EARTH_ART=references PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/earth-art.spec.ts --output=test-results/earth-art-final-references
python docs/combat-presentation/earth-storyboards/build_manifest.py
EARTH_ART=render PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/earth-art.spec.ts --output=test-results/earth-art-final-render
python docs/combat-presentation/earth-storyboards/verify_composites.py
```

References2/2ผ่าน (15legalcasesและDPR2/3), viewer/control/export1/1ผ่าน,45pixel-preservation checksผ่าน ทุกphaseมีVFXและไม่มีpixelsชุด/ชื่อ/HPหรือนอกสนามเปลี่ยน Mode-specific skipsไม่ใช่pass ตรวจtypecheck/lint/unit/buildในรอบส่งมอบตามhandoff Chromiumcloud/SwiftShader ไม่ใช่Safari/มือถือจริง Browser control toolsไม่มีcallableในsession จึงใช้Playwrightของโครงการ การผ่านtestsไม่ใช่การอนุมัติartworkโดยเจ้าของ
