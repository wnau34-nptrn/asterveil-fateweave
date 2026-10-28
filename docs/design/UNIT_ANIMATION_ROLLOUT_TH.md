# แผนแอนิเมชันยูนิตครบทุกตัว

## 2026-10-28 — เจ้าของอนุมัติภาพเคลื่อนไหว A2: “เอาเข้าเกมได้”

เจ้าของยืนยัน “เอาเข้าเกมได้” หลังส่งมอบชุดเอกิส `guardian` และองครักษ์อสูร `foe_vargoth_guard` พร้อม26คลิปจริง390px จึงบันทึกเป็น owner visual approval ของ A2 โดยตรง ไม่ได้อนุมานจาก tests ชุดนี้อยู่ในเกมแล้วผ่าน PR88 merge `e94b424` + QA-only `7ff5388`; Pages40671415477 deploy สำเร็จ หลักฐาน release และคลิปอยู่ใน `docs/validation/unit-a2-release/` และ `docs/combat-presentation/unit-a2-slice/`

รอบนี้แก้เฉพาะเอกสาร approval/handoff และ release.json บนสาขา `codex/a2-release-proof` ส่งเข้าสาขาเกม `feature/fateweave-initial-prototype` ไม่มี runtime/art/timing เปลี่ยน ตรวจเอกสารและ `git diff --check` ตามกฎ docs-only ไม่รันทดสอบเกมซ้ำ คงผลCI/ข้อจำกัดเดิมและ approval ของ pilot/A1/C5 ทุกชุด ไม่เริ่ม A3 หรือ VFX family ใหม่ ไม่มีงาน A2 ค้าง ข้อความก่อนหน้าที่ว่าไม่มี approval ใหม่หมายถึงสถานะก่อนเจ้าของยืนยันครั้งนี้

## 2026-10-28 — A2 เสร็จและเผยแพร่แล้ว (PR88)

- [x] แอนิเมชัน A2 เฉพาะเอกิส `guardian` + องครักษ์อสูร `foe_vargoth_guard` เสร็จผ่าน [PR88](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/88) merge `e94b424` และ QA-only follow-up `7ff5388` บน `feature/fateweave-initial-prototype` Pages [40671415477](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40671415477) สำเร็จครบ build/4 browser shards/deploy; published head `7ff53885d45ed7259fddeed43103310c37439368` ตรวจเมื่อ 2026-10-28T10:48:46Z
- [หลักฐาน release/CI/artifact](../validation/unit-a2-release/README_TH.md) · [บัญชีครบ7 ActionId/4 intents +26คลิป390px/fallback](../combat-presentation/unit-a2-slice/README_TH.md) · [เกม](https://wnau34-nptrn.github.io/asterveil-fateweave/) CI:975 unit/81files,271 source,249 production ผ่าน/566 skipped; premergeมี3prechecksผ่านแยกต่างหาก Skippedรวมsource-onlyfixturesและopt-inงานcapture/art/player/screenshots ไม่ใช่ผลผ่านที่นับเพิ่ม
- เอกิส4.22MiB decodedRGBA /1,397,790bytes atlas+JSON; องครักษ์4.10MiB/1,385,751bytes ไม่ใช่RAMรวมเกม ท่าฟัน/โล่/ทุบ/พลังงาน/รับผล/ล้มมีsprite; dodge procedural, idleใช้seed, revive resetseedตามHPจริง ไม่มีstand-upstrip ไม่เพิ่มcriticalpreload ใช้ภาพเดิมเมื่อโหลดช้า/ล้มเหลวและรับtextureที่safe boundary
- แก้เฉพาะ QA หลังPagesรอบแรกพบ270sourceผ่าน/1counter-testอ่านก่อนRAFสุดท้าย: ยืนยันreaction200msและtailไม่เกินหนึ่งเฟรม แล้วอ่านหลังbounded render tick; ยังตรวจpose0/committedcommand/stateครบ ไม่มีproduction timingเปลี่ยน รอบใหม่ผ่านทุกgate Counterซ้ำlocal5/5; focusedunit32/4filesผ่าน
- 26MP4/PNG/stamps/timing/finalstate/sourcehash อยู่Gitครบและdecode/state equalityผ่าน;1,202capturedframes, maxgap.377s/maxPTSerror.0061ms ไม่retime/interpolate ใช้Chromiumcloud/SwiftShader390pxemulation ไม่ใช่มือถือจริง/Safariหรือรับรอง60fps ไม่อ้างowner visualapprovalใหม่จากtests
- Files: unit-frames/unit-atlases/unit-animation-map/BattleScene reaction data; A2optionalatlases; incoming seed/raw/prompt/shared-normalizer/lossless packing reports; unit/browser/capture/player/encoder/proof; C5anchor QAอ่านunitDisplayRatio; rollout/handoffs/release docs คงpilot/A1pixels/timingและC5ทุกapproval/gateโดยเฉพาะC5.6 ไม่แก้core/save/content/balance/playback ไม่เริ่มA3หรือVFXfamilyใหม่ ไม่มีงานA2ค้าง ข้อความpendingด้านล่างเป็นประวัติ

## 2026-10-28 — A2 implementation +26 clips ready, CI/release pending (PR88)

Owner explicitly requested only Aegis `guardian` and Vargoth Guard `foe_vargoth_guard`, including all real tree/star actions/intents/reactions. [PR88](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/88), source snapshot `dd56ddd`; [mapping/26actual390pxclips/fallback/proof](../combat-presentation/unit-a2-slice/README_TH.md). Seven Knight ActionIds, four Guard intents in first-clash/vanguard-captain audited against content; Shield Smash has its own shield punch (mace lowered), Crushing Blow/Mace Swing share mace, Rift Bolt has separate energy-release body and existing genericenergyVFX. No new rules/save/content/balance/playback timing/VFXfamily; pilot/A1 pixels/cadence and all C5 approvals/gates retained.

Aegis32logical/25unique:4,423,680decodedRGBAbytes(4.22MiB)/1,397,790downloadbytes; Guard32/24:4,303,872(4.10MiB)/1,385,751. Not total gameRAM or phone measurement. Shipped seeds, whole-strip ImageGen edits, shared per-strip source scale against the same seed height/sole, lossless trim/dedup/pack and pixel reconstruction retained in incoming/ART-UNIT-ANIMATION-A2-001. Guard0–23 exactly reconstruct originalA2candidate60335a1; shield24–31 added. Guardian hit/block/down are sprites; actual Guard counter uses brace30→sword5→recover7 in the original200ms reaction (not gearThorns/wardreflect); downwins. Dodge staysprocedural, idleusesseed, revive resetsseed from authoritativeHP; no stand-upstrip. Optional art staysoutofcriticalpreload, held/failed loads allow Start/firstturn, safe-boundary adoption, eviction and duplicate-art sharing verified. VFX landmarks use actualunitDisplayRatio(Guardian1/.36, Eira1/.42, pilot/Sprite/Guard2, original1).

Typecheck/lint/build and37focusedunit/5files passed on finalruntime.42focusedbrowser passed on3c66c9a and finalguardcounter rerun1/1 ondd56ddd. Earlier117regression passed including57C5.6/20A1; finalfullCI will recheck all271sourcefixtures+production.26/26freshrealclockcaptures, finalstate/commands equality, independentdecodedPTS/count/end, andplayer26decode1/1passed.1,202capturedframes, maxgap.377s/maxPTSerror.0061ms; no interpolation/retiming/60fps claim. Chromiumcloud/SwiftShader390pxemulation only, not Safari/physicalphones. MP4s/PNG/metadata/state/hash/sourceproof go intoGit; rawJPEGs stayworkspace-only. Capturesource/publictrees9c21ec6/f6698cd. Finalmergedhead/CI/Pages results will be recorded after completion, not inferred from these local results. No new owner visualapproval inferred; noA3/family7 started. Older pending entries below are history.

## 2026-10-28 — A2 in progress: เอกิส + องครักษ์อสูร

Owner explicitly requested completing A2 only under standing authorization. Branch `codex/animation-a2`, base `f0ee801`; no reset/overwrite. Seven Knight ActionIds and four Guard intents audited against actual content/runtime. New whole-strip art/normalizer/trimmed lossless atlases, optional registry and A2 block/counter reactions; procedural dodge/idle/revive-reset fallback explicit. [Mapping/source/budget/verification status](../combat-presentation/unit-a2-slice/README_TH.md). Aegis4.22MiB/1,397,790bytes, Guard4.10MiB/1,385,751bytes; atlas counts, not totalRAM. No core/save/content/balance/playback or existingVFXmodule/atlas changes, pilot/A1/C5.6 approval/gates preserved. Rouse is actual guard/all, not an invented heal. Local verification/captures/CI/publication are in progress; do not read this as release or owner visual approval. Latest completion entry will supersede this paragraph. Do not start A3 or a new VFX family.

## A0/A1 released — 28 ตุลาคม2026

PR87 merged `1ea31d5` และPages40614459819เผยแพร่สำเร็จเมื่อ2026-10-28 08:44:29 Asia/Bangkok ครบเฉพาะA0/A1 Eira7ActionId+SpriteSeedSparkพร้อมreaction/lifecycle/fallbackตาม [หลักฐานrelease](../validation/unit-a1-release/README_TH.md) และ [16คลิป/audit](../combat-presentation/unit-a1-slice/README_TH.md) ผ่าน958unit/82focusedbrowser/234source/249production (502skip) งบใหม่Eira3.88MiB/1.38MB, Sprite1.19MiB/0.36MB ไม่ใช่RAMรวม คงpilotpixels/timingและC5.6ที่ส่งแล้ว ไม่มีrules/save/balance/playbackdiff A2–A11และrosterอนาคตยังเป็นแผน ไม่เริ่มอัตโนมัติ

วันที่ 27 ตุลาคม 2026 (Asia/Bangkok) · สถานะ: แผนงาน ไม่ใช่รายงานผลิตภาพหรือทดสอบชุดใหม่แล้ว

## ผล A0/A1 — 27 ตุลาคม2026

เจ้าของสั่งเริ่มเฉพาะA0/A1แล้ว: generalized art/clip registry และspriteไอรา/ภูตแดนดิไลออนพร้อมในbranch `codex/animation-a0-a1` รวม7ActionIdของไอราและSeedSpark [บัญชีท่า/fallback/16คลิปจริง390px/ผลตรวจ](../combat-presentation/unit-a1-slice/README_TH.md) Eira3.88MiB/1.38MB, Sprite1.19MiB/0.36MB ต่ำกว่างบ; ไม่เพิ่มcriticalpreload ไม่แก้rules/save/balance/playbacktiming และคงpixel/timing/approvalของpilotและC5เดิม งานA2–A11/rosterอนาคตยังไม่เริ่ม สถานะPR/CI/เผยแพร่ให้อ่านผลล่าสุดในsliceREADME; การมีคลิปหรือtestsผ่านไม่ใช่บันทึกowner visual approval

28ตุลาคม2026: รวมฐานC5.6ที่เจ้าของผ่านและเผยแพร่แล้วถึงa2993dfในPR87เดิม รักษาทุกapproval/gateและแก้landmarkบนEiraให้ตรงnormalizationใหม่ ตรวจ958unit/82focusedbrowserและอัด16คลิปใหม่ ผลreleaseล่าสุดอยู่sliceREADME ไม่เริ่มA2/ตระกูล7

## 1. ขอบเขตและฐานปัจจุบัน

ตรวจจาก `src/content/heroes/{team,mercenaries,roster-batch1}.ts`, `src/content/enemies/`, encounter catalog และ `src/game/visuals/assets.ts` บน game branch `3196e17` (หลัง PR #76 และงาน C5 ที่ตามมา); registry ยูนิต/roster ยังเป็นชุดเดิม

- ฝ่ายเราปัจจุบัน 14 ตัว / 12 อาชีพ; ภาพศัตรู 22 แบบ รวม 36 visual identities
- มี sprite pilot ของไลราและ Vargoth Hunter แล้ว: basic/Execute และ Raking Slash/Shadow Knife พร้อม reaction ตาม pilot ไม่ถือว่าครบทุกสกิลของไลรา
- ตัวอื่นมี motion จาก controller/ภาพเดิมเป็น fallback แต่ยังไม่มี sprite animation ครบชุด
- ระบบโหลดเฉพาะ encounter เบื้องหลังและแพ็ก trimmed atlas ส่งแล้วใน PR #76; pilot ทั้งคู่ใช้ decoded RGBA 10,279,936 bytes (9.8 MiB) และดาวน์โหลดรวม JSON 2,467,380 bytes ตัวเลขนี้ไม่ใช่ RAM/GPU รวม หรือผลทดสอบมือถือจริง
- ตารางด้านล่างครอบคลุมเพิ่มอีก 16 ตัวตาม [roster 30](ROSTER_30_TH.md) แต่ตัวเหล่านี้ยังไม่ได้อยู่ใน runtime; งานสกิล/กฎ/ภาพต้นแบบต้องพร้อมก่อนผลิตแอนิเมชันขั้นสุดท้าย
- Runtime ปัจจุบันยังเป็น 4v4; การทดลองทีม 5 อยู่ P02 ใน [แผนพัฒนารวม](../DEVELOPMENT_PLAN_TH.md) และต้องทวนงบภาพ/การทดสอบเมื่อจำนวนสนามเปลี่ยน

เจ้าของขอแผนทุกตัวหลังผ่าน pilot และแก้โหลดช้า งานครั้งนี้จัดแผนเท่านั้น ไม่เริ่มผลิต atlas ชุดถัดไป และไม่เปลี่ยนลำดับ P01–P03 ของงานระบบอื่น

## 2. ชุดงานที่ทุกตัวต้องมี

1. ยืน/พัก: ใช้ภาพหลักและ breathing เดิมก่อน; ไม่ผลิต idle strip ยาวทุกตัว
2. โจมตีปกติ: เตรียมท่า → ปล่อยท่า/สัมผัส → ตามแรง → คืนท่า เริ่มประมาณ 6–8 เฟรมต่อท่าแล้วปรับตามการอ่านภาพ
3. ท่าสกิล: เลือกชุดท่าตามอาวุธ/ร่างกาย เช่น ฟัน แทง ร่าย ปา ร้องเพลง รำ; เริ่ม 1–2 ชุดต่อหนึ่งตัว เพิ่มเมื่อการกระทำต่างกันจนอ่านไม่ออก
4. รับผล: โดนโจมตี ป้องกัน หลบ ล้ม และคืนสภาพเมื่อฟื้น; ใช้ transform ร่วมกับเฟรมสั้นเพื่อไม่เพิ่มภาพเกินจำเป็น
5. สกิลทุก ActionId ที่ตัวนั้นใช้จริง รวมสกิลปลดล็อก ต้นไม้ และสวนกลับ ต้องอยู่ในตาราง mapping: ชุดท่าร่างกาย + เอฟเฟกต์ + เป้าหมาย + จุดเกิดผล หากยังใช้ fallback ต้องระบุว่ายังไม่เสร็จ

ใช้ชุดจังหวะร่วมกันได้ แต่ภาพของแต่ละตัวต้องรักษาหน้า เสื้อผ้า อาวุธ บุคลิก และสัดส่วนของตัวเอง ไม่เอาเฟรมภาพคนหนึ่งไปแทนอีกคน การเลื่อนขั้นใช้คนเดิม/ท่าต่อยอดตามแผนระบบ ไม่สร้าง atlas ใหม่ทุกดาวโดยอัตโนมัติ

เอฟเฟกต์ใช้ family ที่ส่งจริงแล้วก่อน และรักษา approval เดิมของงาน C5 ตาม release proof ของแต่ละชุด งานขยับตัวละครกับการผลิต family เอฟเฟกต์ใหม่เป็นคนละงาน แผนนี้ไม่รีเซ็ต approval เดิมและไม่อนุมัติ family ใหม่เพิ่ม

## 3. ลำดับทำตัวปัจจุบัน

แต่ละระยะส่งย่อยประมาณ 2 ตัวต่อชุด หรือไม่เกิน 3 ตัวสำหรับสัตว์ประหลาดขนาดเล็ก ตารางระยะไม่ใช่การสั่งผลิตทั้งแถวใน PR เดียว

| ระยะ | ตัวที่ทำ | ผลที่ต้องได้ |
| --- | --- | --- |
| A0 | ไลรา + Hunter เดิม | ทำบัญชีสกิลที่ pilot ยังไม่ครอบคลุม; ขยาย registry จากสอง pilot ให้รับทุกตัว; คงภาพและ timing ที่เจ้าของผ่านแล้ว |
| A1 | ไอรา + ภูตแดนดิไลออน | ร่าย/ยิงพลังงานและคืนท่า; ไอรามีท่าคุ้มกันสำหรับ Ward/Sigil; ฝั่งศัตรูใช้ Seed Spark เป็นตัวตรวจ |
| A2 ✓ เผยแพร่ PR88 | เอกิส + องครักษ์อสูร | ฟัน/ตั้งโล่/กระแทก; ท่าพลังงานขององครักษ์ต้องอ่านต่างจากการทุบ และไม่ทำให้ผู้เล่นเข้าใจชนิดดาเมจผิด |
| A3 | เซเรน + เห็ดหมอผีกลวง | ร่ายสนับสนุน/ฟื้นฟู/ชุบตามผลจริง และร่ายสปอร์ของศัตรู |
| A4 | มิร่า + โทมะ; สไลม์น้ำค้าง + สไลม์ถ่านไฟ + ค้างคาวซาก | ยิงธนู/ยิงหมู่, ปาขวด/ระเบิด, เด้ง/พ่นไฟ/บินกัด; แยกส่งเป็นคู่คนและชุดสัตว์เล็ก |
| A5 | การ์แรน + แบรนน์; หมูป่าหลังตะไคร่ + ลิงซ์หนามพราง + ด้วงหนาม | แทง/ตั้งรับสวน, ค้อนหนัก, พุ่งชน/กระโจน/กัด; ตรวจน้ำหนักและการคืนตำแหน่ง |
| A6 | เซฟา + ลิโอ; ผู้ทอรอยแยก + ภูตสปอร์ | จู่โจม/ถอยหลบ, ดีดเครื่องดนตรี/เพลงสนับสนุน, ร่ายเส้นพลังและสปอร์ |
| A7 | เมตตา + ธีรัน; ลลิน + วิลา | หมัดและท่าที่เชื่อมกับการฟื้น HP ตามผลจริง; รำ/ท่าโจมตีของ Dancer และคืนท่าที่ไม่กระตุก |
| A8 | โกเลมเศษผลึก + อสูรส่งพลัง; วิญญาณรอยแยก + แมงมุมเศษผลึก | ทุบ/ปล่อยผลึก, รวมพลัง/ลำแสง, ลอยร่าย/แทงผลึก |
| A9 | ราชินีหนาม + ด้วงเกราะผลึก; ผู้คุมรอยแยก + หัวหน้ากองหน้า | ท่าเด่นบอส, เตรียมโจมตีหมู่, เปลี่ยน phase/เรียกกำลังเสริมตาม event จริง; ใช้ atlas ร่วมกับร่าง elite ที่ art เดียวกัน |
| A10 | Raider + Brute ชุดภาพเดิม | ครอบคลุม encounter ที่ยังใช้ภาพดั้งเดิมและทดสอบท้ายรายการ ไม่ทิ้งตัว legacy ให้มีคุณภาพต่ำกว่าตัวอื่น |
| A11 | สนามผสมทุกกลุ่ม | ตรวจความครบถ้วนทุกสกิล สนามเต็ม 8 ตัว ศัตรูซ้ำชนิด บอส/กำลังเสริม และโหลดซ้ำหลาย encounter |

ลำดับเริ่มจริงที่แนะนำคือ A0 → A1 (ไอรา + Sprite) เพื่อพิสูจน์ท่าร่ายทั้งสองฝั่งก่อน ไม่ผลิตท่าเวทให้ทุกตัวพร้อมกัน

## 4. รายตัวฝ่ายเรา: ปัจจุบันและเป้าหมาย 30 ตัว

ชื่อ/คู่ในอนาคตยึดแผน roster; คำว่าอนาคตไม่ได้แปลว่ามีกฎหรือภาพต้นแบบพร้อมแล้ว

| อาชีพ | มีใน runtime | ตัวคู่/ตัวใหม่ในแผน | ชุดท่าที่ต้องรองรับ |
| --- | --- | --- | --- |
| Knight | เอกิส `guardian` | นริน `narin` | ฟัน, ตั้งโล่, กระแทกโล่, คุ้มกัน/ท้าดวล |
| Duelist | ไลรา `tracer` (pilot) | เวคิน `vekin` | ฟัน, แทงปิดงาน, ลงตรา, ปัดป้อง |
| Mage | ไอรา `weaver` | เนมิ `nemi` | ยิงเวท, ร่ายโจมตี, ร่ายโล่/ผนึก/สลาย |
| Priest | เซเรน `healer` | มาลี `mali` | โจมตีเวท, รักษาเป้าเดียว/หมู่, อวยพร/ชุบ |
| Spear | การ์แรน `garran` | ปวิน `pavin` | แทง, แทงหนัก, ตั้งทวน, สวนกลับ |
| Archer | มิร่า `mira` | นาวา `nawa` | ง้าง/ปล่อยศร, ยิงกด/เล็งจุดอ่อน, ยิงหมู่ |
| Alchemist | โทมะ `toma` | พิลา `pila` | ปาขวด, ปาระเบิด, เตรียม/ส่งยาสนับสนุน |
| Scout | เซฟา `sefa` | ริสา `risa` | ฟันเร็ว, ลอบแทง, ปามีด/ควัน, ถอยหลบ |
| Warden | แบรนน์ `brann` | เขม `khem` | เหวี่ยง/ทุบค้อน, กระแทกพื้น, ยั่วยุ/ตั้งรับ |
| Bard | ลิโอ `lio` | สริน `sarin` | ดีด/บรรเลงโจมตี, เพลงสนับสนุน, ท่าปิดเพลง |
| Saint | เมตตา `metta`, ธีรัน `thiran` | — | หมัด, กวาดแนวหน้า, ส่งผลฟื้น HP หลังดาเมจจริง; แยกบุคลิกสองคน |
| Dancer | ลลิน `lalin`, วิลา `wila` | — | ท่าโจมตี, รำเป้าเดียว, รำหมู่, ปิดท่า; แยกบุคลิกสองคน |
| Martial (อนาคต) | — | อรุณ `arun`, ภาคิน `phakin` | หมัด, รวมปราณ, ปล่อยปราณ; ทำ mapping ขั้นสุดท้ายหลังระบบนั้นส่งจริง |
| Hexer (อนาคต) | — | รัตติ `ratti`, พิม `pim` | ร่ายโจมตี/ผูกสาป/วงสาป; reaction จบรอบต้องสัมพันธ์ event จริง |
| Seer (อนาคต) | — | ศศิ `sasi`, นิศา `nisa` | ร่าย/เบนวิถี/ขยับวงท่า; ทิศทางภาพต้องตรงกับเป้าจริง |

รวม 14 ปัจจุบัน + 16 อนาคต = 30 คน ตัวใหม่ในอาชีพเดิมใช้โครงจังหวะร่วมกันได้ แต่ต้องผลิตภาพของตนเองจาก seed ที่ผ่านแล้ว ส่วนอาชีพใหม่รอความพร้อม P03 ไม่เปลี่ยนกฎเพื่อให้เข้ากับท่าที่วาดไว้ก่อน

## 5. ภาพศัตรูครบ 22 แบบ

| Art ID | ตัว/กลุ่มที่ใช้ | ท่าที่ต้องรองรับ |
| --- | --- | --- |
| `foe_hunter` | Vargoth Hunter (pilot) | ฟัน, Shadow Knife, reaction; audit ทุก intent ที่ใช้ภาพนี้ |
| `foe_sprite` | ภูตแดนดิไลออน | รวมพลัง/Seed Spark, ลอยคืนท่า |
| `foe_vargoth_guard` | องครักษ์อสูร | ทุบ/โล่, Rift Bolt ตาม encounter, ตั้งรับ |
| `foe_mycon` | เห็ดหมอผีกลวง | ร่าย Spore Hex/ปล่อยสปอร์ |
| `foe_dew_slime` | สไลม์น้ำค้าง | ยุบ/เด้งชน/คืนรูป |
| `foe_ember_slime` | สไลม์ถ่านไฟ | รวมไฟ/ปล่อย Ember Spark |
| `foe_ruin_bat` | ค้างคาวซาก | บินค้าง/โฉบกัด/บินกลับ |
| `foe_tusker` | หมูป่าหลังตะไคร่/จ่าฝูง | เตรียมพุ่ง/ชน/คืนตัว; Stampede แยกท่าเตรียมจากพุ่งเป้าเดียว |
| `foe_stalker` | ลิงซ์หนามพราง | ย่อ/กระโจน/ตะปบ/คืนตัว |
| `foe_thorn_beetle` | ด้วงหนาม | ตั้งตัว/กัด/หดเกราะ |
| `foe_riftweaver` | ผู้ทอรอยแยก | ร่าย Rune Lash/ปล่อยเส้นพลัง และ Ribbon Snare ตาม intent |
| `foe_spore_puff` | ภูตสปอร์ | พอง/ปล่อย Spore Dust/คืนตัว |
| `foe_golem` | โกเลมเศษผลึก | ง้างหมัด/ทุบ, Shard Burst และคลื่นพื้นตาม encounter |
| `foe_rift_channeler` | อสูรส่งพลัง | รวมพลัง/ปล่อยลำแสง/Rift Bolt |
| `foe_rift_wisp` | วิญญาณรอยแยก | ลอย/รวมแสง/Star Flame |
| `foe_shard_crawler` | แมงมุมเศษผลึก | ยกขา/แทงผลึก/คืนตัว |
| `foe_matriarch` | ราชินีหนาม/เจ้าป่าหนาม | ฟาด/เถาวัลย์/Thorn Bloom, ท่า phase ตาม encounter |
| `foe_juggernaut` | ด้วงเกราะผลึก | พุ่งเขา/ปล่อยผลึก/ตั้งเกราะ |
| `foe_sentinel` | ผู้คุมรอยแยก | ทุบ/พลังงาน/รวมพลัง/คลื่นหมู่/เรียกกำลังเสริม |
| `foe_captain` | หัวหน้ากองหน้า | ทุบ/War Cry/เรียก Hunter ตาม phase |
| `raider` | นักจู่โจมชุดเดิม | ฟัน/Shadow Knife และ intent อื่นที่ใช้ภาพเดิม |
| `brute` | อสูรรอยแยกชุดเดิม | ทุบ/ปล่อยพลังงานตาม intent |

ชนิดเดียวกันหลายช่องใช้ texture ร่วมกัน แต่ controller, ทิศทาง, reaction และเป้าหมายแยกต่อ actor ID ไม่ผลิต atlas แยกตามเลเวล/HP/ชื่อ elite โดยไม่มีเหตุผลด้านท่า

## 6. ขั้นตอนต่อชุดส่งมอบ

1. ทำรายการ ActionId/intent จาก encounter และสกิลที่ปลดล็อกได้; กำหนดท่า/จุดเกิดผล/การคืนท่า รวมเงื่อนไขพิเศษ
2. ใช้ seed ภาพเดิมที่ผ่านแล้ว กำหนดสัดส่วน ทิศหัน จุดเท้า และ silhouette; ขาด seed ต้องทำภาพต้นแบบให้พร้อมก่อน
3. สร้างทั้ง strip ต่อท่าในครั้งเดียวเพื่อคุมความต่อเนื่อง ไม่แยกสร้างภาพอิสระทุกเฟรม; ตรวจลำดับอาวุธก่อน normalize
4. Normalize ด้วย scale/anchor ร่วม รักษา logical source/pivot แล้ว trim/deduplicate/pack แบบ lossless; แยกแสงกระจาย/กระสุนออกเป็น FX เมื่อเหมาะสม
5. ลง registry และโหลดเฉพาะ encounter รวมกำลังเสริมที่ประกาศไว้; ไม่เพิ่ม critical preload; รักษา fallback, dedup, การปล่อย texture และการเปลี่ยนภาพที่ safe boundary จาก PR #76
6. ดูในเกมที่ 390px ทั้งโจมตีปกติและสกิลเด่นทั้งสองฝั่ง ทำคลิปสั้นและ 1–2 ภาพที่จำเป็น ส่งให้เจ้าของดูและปรับตาม feedback
7. ทดสอบเฉพาะส่วนในเครื่อง, typecheck/lint/unit/build; full browser ให้ CI; merge และเผยแพร่ชุดที่ผ่านภายในขอบเขตที่เจ้าของสั่งทำจริง

ใช้ skill `sprite-pipeline` เป็น workflow ภาพ และ runtime ใช้ Phaser เดิม การวางแผนนี้ไม่ใช่คำสั่งเริ่มผลิตทุกชุดโดยอัตโนมัติ

## 7. งบภาพและประสิทธิภาพที่เสนอ

เป็นเป้าหมายเริ่มต้นสำหรับตรวจงานใหม่ ไม่ใช่ผลที่วัดได้ครบทุกตัวแล้ว

| รายการ | เป้าหมายเบื้องต้น |
| --- | --- |
| ตัวทั่วไป | atlas + JSON ไม่เกินประมาณ 1.5 MB; decoded RGBA ไม่เกิน 6 MiB ต่อ art |
| บอสที่จำเป็นต้องมีหลายท่า | ประมาณ 2 MB / decoded ไม่เกิน 8 MiB ต่อ art |
| ชุด animation ของ encounter เต็ม 8 ตัว | decoded รวมไม่เกินประมาณ 64 MiB; download รวมเป้าหมายประมาณ 12 MB (ต้องลดงบรายตัวถ้าบอสทำให้เกิน) |
| หน้าชื่อเกม | ไม่มี request optional animation |
| Start/เทิร์นแรก | เล่นได้แม้ hold/fail optional downloads |
| เปลี่ยน encounter | ใช้ cache ที่จำเป็นและปล่อย texture ที่ไม่ใช้; ทดสอบหลายรอบว่าไม่สะสม |

งบนี้นับเฉพาะ animation textures ไม่ใช่ RAM/GPU รวม; ฉาก ภาพหลัก VFX และระบบเกมต้องวัดแยก เกินงบให้ลดเฟรมซ้ำ/พื้นที่โปร่งใสและแยก FX ก่อนลดคุณภาพหน้าหรืออาวุธ ไม่เพิ่ม frame count เพื่อให้ลื่นโดยไม่ตรวจลำดับท่าก่อน

ก่อน rollout ใหญ่ต้องมีผลสนามเต็ม 8 ตัวบนมือถืออ้างอิงจริง เปรียบเทียบเวลา Start, เฟรมช้า/ช่วงกระตุก, หน่วยความจำ และโหลดซ้ำบนเครื่อง/เครือข่ายเดียวกัน Chromium emulation ใช้หา regression แต่ไม่แทน iOS Safari/Android จริง ขณะนี้ยังไม่มีผลทดสอบมือถือจริงของแผนนี้

## 8. เกณฑ์จบงาน

- ทุก visual identity ปัจจุบัน 36 แบบถูกทำบัญชี; ทุกสกิล/intent ใช้จริงมี mapping และระบุ fallback ที่ยังค้าง ไม่เรียกว่าครบจากแค่โจมตีปกติ
- หน้าตา เสื้อผ้า ขนาด และเท้าไม่เปลี่ยน/กระโดด; อาวุธเดินทางต่อเนื่องและคืนท่าได้เหมือน pilot ที่ผ่านแล้ว
- จุดโจมตี/ผลฮีล/โล่/สถานะตรงกับ event จริง; ไม่เพิ่มฮิตหรือให้ UI แสดงผลล่วงหน้าเพราะเฟรมภาพ
- fast/reduced motion, skip, resize, reload, hide/resume, ล้ม/ฟื้น, สวนกลับ, หลายเป้า และบอสเรียกกำลังเสริมยังไม่เพิ่ม/แก้ committed command
- ผ่านงบรายตัว/สนาม และไม่มี memory สะสมข้าม encounter; เป้าหมาย 30 คนไม่กลายเป็นการโหลด 30 คนพร้อมกัน
- มีคลิปในเกม ผลทดสอบ และ handoff ของแต่ละชุด; ไม่มีการแก้ battle/save/balance เพื่อรองรับแอนิเมชัน

สถานะเมื่อเขียนแผน: ยังไม่ผลิตชุดใหม่; ผลการทำA0/A1ภายหลังอยู่หัวเอกสาร ส่วนA2–A11ยังเป็นแผน
