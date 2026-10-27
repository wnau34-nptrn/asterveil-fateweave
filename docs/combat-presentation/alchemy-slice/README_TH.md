# C5.6 — ขวดเล่นแร่ R1 · runtime รอตรวจ motion

27ตุลาคม2026 · `codex/vfx-family-6-alchemy` / [PR86](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/86) เดิม · เจ้าของเลือกartwork R1ด้วย **“ไปต่อ”** แล้ว ไม่มีmotionapproval/merge/เผยแพร่/ตระกูล7

[หน้าเลือกคลิปจริง390px](index.html) · [เวลาและevents](clips.json) · [deliveryproof](delivery-proof.json)

| ท่า | ปกติ | เร็ว | ลดความเข้ม | OS reduced |
|---|---|---|---|---|
| ACID | [เล่น](acid-normal-normal-390.mp4) | [เล่น](acid-normal-fast-390.mp4) | [เล่น](acid-normal-reduced-390.mp4) | [เล่น](acid-normal-osreduce-390.mp4) |
| BOMB | [เล่น](bomb-normal-normal-390.mp4) | [เล่น](bomb-normal-fast-390.mp4) | [เล่น](bomb-normal-reduced-390.mp4) | [เล่น](bomb-normal-osreduce-390.mp4) |
| SMOKE | [เล่น](smoke-normal-normal-390.mp4) | [เล่น](smoke-normal-fast-390.mp4) | [เล่น](smoke-normal-reduced-390.mp4) | [เล่น](smoke-normal-osreduce-390.mp4) |
| CATALYST | [เล่น](catalyst-normal-normal-390.mp4) | [เล่น](catalyst-normal-fast-390.mp4) | [เล่น](catalyst-normal-reduced-390.mp4) | [เล่น](catalyst-normal-osreduce-390.mp4) |
| HASTE | [เล่น](haste-normal-normal-390.mp4) | [เล่น](haste-normal-fast-390.mp4) | [เล่น](haste-normal-reduced-390.mp4) | [เล่น](haste-normal-osreduce-390.mp4) |
| FURY | [เล่น](fury-normal-normal-390.mp4) | [เล่น](fury-normal-fast-390.mp4) | [เล่น](fury-normal-reduced-390.mp4) | [เล่น](fury-normal-osreduce-390.mp4) |

## ภาพและกลไก

หนึ่งatlas/module18frames1584×1128/981524bytesจากoriginalRGBAที่เจ้าของเลือก ใช้prepare/contact/tailภายในstageTimingเดิม normal/fast65%เดิม Quietลดน้ำหนัก OSreducedแสดงภาพนิ่งทันที ทุกtweenผูกownedimageและcleanupเดิม ไม่มีlisteners/timersใหม่ ไม่มีcore/save/content/balance/playback timingdiff

- Acid: คมคราบchartreuse primaryhitเดี่ยวก่อนcorrode; spreadใช้ริ้วคราบเล็กไม่มีextrahit Potent/deeperอ่านผลจริงที่hitภายหลัง ไม่สร้างDoT
- Bomb: burstทองแดงสั้นเฉพาะผู้รับdamageจริงทุกตัวรวมหลัง ไม่คิดbonusจากขนาดภาพ
- Smoke: ริ้วควันม่วงเงินโปร่งตามweaken ผู้รับจริง wide/poisonตามevents ไม่มีdamage/stun/cancel และbossunstoppableยังweakenได้
- Catalyst: ปฏิกิริยาพีชยุบจุดเดียวตามactualhit ใช้corrosionจริง plain/corroded/expired/kill ไม่คำนวณamountซ้ำ
- Haste: ริบบอนฟ้าเงินที่allyจริง คนยังไม่เดินมาเป็นคนถัดไป คนเดินแล้ว/ตนเองใช้รอบหน้า ไม่เพิ่มturn/teleport/playbackspeed HasteHeal/overflowใช้actualheal/barrierผ่านhealingเดิม HPเต็มไม่มีhealปลอม Quickbrewใช้cooldownจริง
- Fury: ประกายอำพันแดงกระชับ empowered+exposedไม่มีdamage/healตอนcast ภายหลังการโจมตีใช้VFXเดิม ไม่ยิงcastใหม่ ทดสอบself/ally/refresh/outgoing/incoming/expiry

Chainreactionเป็นcorrodeevent `Chain reaction.` sourceIdAlchemist แม้อยู่บนKnightattackstage ใช้residueไม่castflaskใหม่และรักษาbladeของการโจมตีเดิม ตรวจส่งต่อแถวเดียวกันและfallbackแถวอื่นด้วยlegalAcidprelude

ตำแหน่งจากrenderedspriteworldtransformรวมpose/recoil/shake/DPR เทียบindependentpivot2×/3× ภาพอยู่rear-layerโปร่งหลังunit/ป้าย ไม่เปลี่ยนช่องยืน ตัวเลข/HP/status/captionsมาจากresolverตามเดิม AssetsหายยังStart/fallback/commitครั้งเดียวได้

## กรณีคลิป

55คลิป: 6ท่า×normal/fast/reduced/OSreduced=24 และ31variants ในtests/browser/alchemy-clips.spec.ts Acidspread/potent/deeper/down/chainother/laterhit; Bombbackonly/corroded/down; Smokewide/poison/boss/physical/energy; Catalystcorroded/expired/kill/chain/chainfallback; Hastenextalready/acted/self/heal/fullhp/overflow/quickbrew/downinvalid; Furyself/refresh/outgoing/expiry ในexpiryclipผู้รับยังยืนอยู่ การโจมตีGuardianจริงเป็น13ในรอบ1–2และ10ในรอบ3หลังบัฟหมดอายุ จบคลิปรอบ4GuardianHP56

ทุกcaseเริ่มจากdefinitions+entryHP+legalcommands ไม่มีowner save/injectedBattleState/fakeevents Captureผ่านจริงUI/scene/playback/resolver ไม่มีmockclock อัดแยกจากbrowserQA เก็บrawframes+timestamps+finalstateและเทียบstateทั้งก้อนกับresolver กรณีlaterhit/outgoing/expiryใช้legalfollowupcommandsที่คลิกจริง ไม่ยัดeventเพื่อภาพ

MP4VFR90kHz/noBframes เก็บทุกcapturedframeและfinalhold ตรวจdecodedframecount/PTS/duration ไม่retime/interpolate ไม่อ้าง60fps Chromiumcloud/SwiftShaderไม่ใช่Safariหรือมือถือจริง ไม่มีเสียงในคลิป

## ตรวจและทำซ้ำ

```sh
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/alchemy-fx.spec.ts --output=test-results/alchemy-focused
ALCHEMY_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/alchemy-clips.spec.ts --output=test-results/alchemy-delivery
python tests/browser/fixtures/encode-alchemy-clips.py test-results/alchemy-delivery
python docs/combat-presentation/alchemy-slice/verify_delivery.py
ALCHEMY_PLAYER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/alchemy-player.spec.ts --output=test-results/alchemy-player
```

ส่งมอบ: typecheck/lint/build,948unit/79files,57focusedbrowser,55capture/state-equalityและplayerdecode55uniquefilesผ่านทั้งหมด Raw6916frames/timestampsคงครบในtest-results/alchemy-delivery มีinventoryhashรวมencodedMP4hashในraw-captures.json MP4decodedframecount/PTS/finalholdผ่านทุกไฟล์ timestamp errorสูงสุด0.0062ms maxcapturedgap367ms ไม่retime/interpolateหรืออ้าง60fps AlphaและvisibleRGBของ18sourcecellsตรงatlasทุกจุด (RGBที่alpha0ถูกclearตามการpack)

[CIquality40533376869](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40533376869) success บนvalidatedhead2535454; [fullbrowser40533376856](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40533376856) ยังinprogressขณะส่งคลิป ไม่ถือpendingหรือskipเป็นผ่าน ดูvalidation.jsonสำหรับสถานะที่บันทึก รักษา5sourcegatesก่อนหน้าและเพิ่มalchemygate Runtime31c5e90และvalidatedhead2535454มีsrc/publictreesตรงกัน Deliveryartifact/docsไม่เปลี่ยนruntimeที่capture

ต้องให้เจ้าของตรวจmotionก่อนmerge/เผยแพร่/เริ่มตระกูล7 ตามคำสั่งเปิดงานและ[handoff](../../handoffs/C5-FAMILY-6-ALCHEMY-HANDOFF-TH.md)
