# C5.6 — ขวดเล่นแร่ · artwork R1 รอเลือกก่อน runtime

27 ตุลาคม 2026 · `codex/vfx-family-6-alchemy` → `feature/fateweave-initial-prototype` · หนึ่งPRตระกูล6ตั้งแต่artworkจนruntimeภายหลัง

[หน้าเลือก6ท่า / 3จังหวะ / 14กรณีจริง](index.html) — เตรียม → เกิดผล → ปลายฟุ้ง แต่ละภาพ390×844px มีปุ่มเทียบสนามเปล่าและน้ำหนัก60–110% ต้นฉบับImageGenวาดเฉพาะeffectโปร่งใส ไม่วาดชุด/สนาม/UIใหม่

| ท่า | เอกลักษณ์และeventจริง | เตรียม / เกิดผล / ปลายฟุ้ง |
|---|---|---|
| ACID | คราบคมchartreuse hitเดี่ยวก่อนcorrode; spreadไม่มีhitเพิ่ม | [01](acid-base-0-390.png) · [02](acid-base-1-390.png) · [03](acid-base-2-390.png) |
| BOMB | burstทองแดงเศษแสงสั้นทุกlivingfoeรวมหลัง | [01](bomb-base-0-390.png) · [02](bomb-base-1-390.png) · [03](bomb-base-2-390.png) |
| SMOKE | ริ้วควันม่วงเงินโปร่ง weakenไม่damage/stun/cancel | [01](smoke-base-0-390.png) · [02](smoke-base-1-390.png) · [03](smoke-base-2-390.png) |
| CATALYST | เศษแสงพีชยุบจุดเดียว damageตามeventและใช้corrosion | [01](catalyst-base-0-390.png) · [02](catalyst-base-1-390.png) · [03](catalyst-base-2-390.png) |
| HASTE | ริบบอนฟ้าเงินชี้ทิศ allyเปลี่ยนลำดับ ไม่เพิ่มturn/teleport | [01](haste-base-0-390.png) · [02](haste-base-1-390.png) · [03](haste-base-2-390.png) |
| FURY | ประกายอำพันแดงกระชับ empowered+exposed ไม่มีdamage/healตอนcast | [01](fury-base-0-390.png) · [02](fury-base-1-390.png) · [03](fury-base-2-390.png) |

## ผลจริงและขอบเขตภาพ

14legalcases: ทั้ง6ท่าbase; Acid spread/down; Bomb backonly; Smoke wide/poison; Catalyst corroded; Haste self; Fury self อ่านeventsจากresolveCommandจริง Catalyst corrodedใช้Acidแล้วคำสั่งattackจริงจนTomaกลับมา ไม่ยัดstatus/state/event ไม่มีowner save ดูcommands/events/snapshotsใน [anchors.json](../../../incoming/ART-VFX-ALCHEMY-001/reference/anchors.json)

ตัวอย่างฐานfixture: Acid8แล้วcorrode6, spreadยังมีdamageเพียงครั้งเดียว; Bomb10แก่ทั้ง4ตัว; Smoke40หรือwide20ทั้งแถวไม่มีdamage; Catalystplain6และหลังAcid20ตามevent; Hasteมีhasteเท่านั้น; Furybuff25ไม่มีdamage/heal ตัวเลขเป็นผลfixtureไม่ใช่ค่าhardcodeในVFX

ทุกช่องเป็นstaticconceptcompositeจากscreenshotก่อนcastเดียวกันต่อcase จึงไม่ใช่ภาพHPหลังผลหรือคลิปmotion ภาพและการผ่านtestsไม่ใช่ownerapproval ไม่เริ่มruntimeก่อนเจ้าของเลือกartwork ขั้นruntimeต้องเก็บcasesครบตาม[handoff](../../handoffs/C5-FAMILY-6-ALCHEMY-HANDOFF-TH.md)รวมChainreactionบนstageของactorอื่น HasteHealและlateractualhits/intent ห้ามอนุมานจากชื่อท่าหรือคำนวณamountใหม่

ต้นฉบับRGBA1536×1024/18cells เก็บbyte-identicalพร้อมexactprompt/provenanceใน[ART-VFX-ALCHEMY-001](../../../incoming/ART-VFX-ALCHEMY-001/NOTES.md) ใช้alphaเดิมและsprite/labelmaskจากworldtransformจริง รักษาชุด/อาวุธ/ชื่อ/HPและนอกสนามตรงpixel ตรวจDPR2/3โดยเทียบworldpivotอิสระ Staticanchorยังไม่ยืนยันpose/recoil/shakeขณะruntime ต้องตรวจใหม่หลังเลือกภาพ ไม่มีfixedslotcoordinate

Acid secondarycorrodeใช้ริ้วปลายคราบเล็ก ไม่มีburstเพิ่ม ผลภาพชั่วคราวจบไม่ได้แปลว่าสถานะหมดอายุ Smokepoisonยังใช้ภาพควันเดียวพร้อมeventcorrodeในmanifestและไม่ได้แต่งdamageเพิ่ม Haste/Furyภาพขอบตัวไม่วาดattackหรือheal

## ฐานและreleaseที่ตรวจ

Explicitfetchฐานล่าสุด1f783f83417f4d8b641040e04cc4be209c265f8bก่อนแยกbranch ตรวจPR85merged3196e17และPages40524232794ผ่านGitHubAPIใหม่: build+browser4shards+deploysuccessครบตรง[releaseproof](../../validation/earth-vfx-release/README_TH.md) ไม่อ้างCDNhash/HTTP200ของเว็บจริงหรือมือถือจริง รักษาแผนunitanimationafddd84แยกscope

## ตรวจและทำซ้ำ

```sh
ALCHEMY_ART=references PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/alchemy-art.spec.ts
python docs/combat-presentation/alchemy-storyboards/build_manifest.py
ALCHEMY_ART=render PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/alchemy-art.spec.ts
python docs/combat-presentation/alchemy-storyboards/verify_composites.py
```

References2/2และreviewcontrols/export1/1ผ่าน; mode-specificskipsไม่ใช่pass ตรวจ42compositesผ่าน: มีeffectทุกphaseและไม่มีpixelsชุด/ป้าย/นอกสนามเปลี่ยน Typecheck/lint/buildและ910unit/78filesผ่าน Browserextensionไม่มีcallableในsessionจึงใช้Playwrightของโครงการ Chromiumcloud/SwiftShader ไม่ใช่Safariหรือมือถือจริง

ยังไม่มีatlas/moduleตระกูล6ในเกม ไม่merge/เผยแพร่/เริ่มตระกูล7 ต้องต่อruntimeในPRเดิมหลังเลือกภาพแล้วส่งactual390pxclipsครบ6ท่าnormal/fast/reduced/OS-reducedให้เจ้าของตรวจก่อน ไม่มีrules/save/content/balance/playback timingdiff
