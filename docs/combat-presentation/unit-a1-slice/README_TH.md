# A0/A1 — ไอรา + ภูตแดนดิไลออน

27–28 ตุลาคม 2026 (Asia/Bangkok) · branch `codex/animation-a0-a1` · ฐานเริ่ม `afddd84` / ฐานรวมส่งท้าย `a2993df`

[เปิดหน้าเลือกคลิป390px](index.html) · [ข้อมูลเฟรม/เวลา/eventจริง](clips.json) · [ต้นฉบับ/การแพ็ก](../../../incoming/ART-UNIT-ANIMATION-A1-001/NOTES.md)

งานนี้เพิ่ม sprite ร่างกายเฉพาะ `weaver` และ `foe_sprite` และขยาย registry จาก pilot สองตัว ไม่เปลี่ยน core/battle, save, content/balance, battle-playback หรือจังหวะเกิดผล ไม่ผลิต VFX family ใหม่ งาน/approval C5 เดิมทั้งหมดคงไว้ รวม C5.5 ที่อยู่แยกจากงานนี้

## บัญชี ActionId/intent

ไอรามี7 ActionId จริงจาก starting actions + star unlock + talent tree; unit test เทียบรายการนี้กับ content โดยตรง ไม่ถือว่า Bolt/Ward ครอบคลุมสกิลทั้งหมดโดยปริยาย

| ตัว/ActionId หรือ intent | ท่าร่างกาย | VFX เดิม/ผู้รับผล | cue และส่วนที่ยัง fallback |
| --- | --- | --- | --- |
| Eira `attack` | ชุดยิงคทา `attack` | impact เดิมของ basic attack บนผู้รับดาเมจจริง | release ที่ contact; ไม่เปลี่ยนชนิดดาเมจเพราะวาดคทา |
| Eira `bolt` | ชุดยิงคทาร่วม `attack` | painted Bolt เดิม ตาม damage/dodge/barrier จริง | prepare1–4 → contact5 → recover5–8; split/pierce ใช้ท่าร่างกายเดียว ไม่มีท่าซ้ำตามจำนวนเป้า |
| Eira `ward` | ชุดร่ายคุ้มกัน `skill` | painted Ward เดิมบน barrier recipients จริง | prepare9–12 → contact13 → recover13–16; twinward/echo ใช้ชุดเดียว |
| Eira `sigil` | ชุดร่ายคุ้มกัน/ผนึก `skill` | status/sigil cue เดิมบนศัตรูที่ผนึก; ไม่วาดผลก่อน event | body ใหม่ครบ; **VFX ยังเป็น generic เดิม** ไม่ผลิต family เพิ่ม; sealed move ไม่มีท่ายิงสำเร็จ |
| Eira `storm` | ชุดยิงคทาร่วม `attack` | generic arcane เดิมบนผู้รับผลจริง | body ใหม่ครบ; **VFX generic เดิม** ไม่ใช่ family ใหม่ |
| Eira `aegis` | ชุดคุ้มกันร่วม `skill` | painted defense C5.2 เดิม ตาม barrier จริง | ป้องกันหลายเป้าใช้ร่ายครั้งเดียว ไม่เพิ่ม hit/turn |
| Eira `dispel` | ชุดยิงคทาร่วม `attack` | generic arcane/dispel cue เดิม ตาม event | body ใหม่ครบ; **VFX generic เดิม** |
| Sprite `Seed Spark` | รวมมือใกล้ jewel → ยื่นมือปล่อย → คืนท่า `attack` | generic energy เดิมตาม actual intent target | prepare1–4 → contact5 → recover5–8; ไม่มี basic attack คนละชื่อใน catalog/species ปัจจุบัน จึงไม่ประดิษฐ์ท่า/กฎใหม่ |
| ทั้งคู่ hit | เฟรม17–18 | ข้อความ/HP จาก event เดิม | reaction ไม่เปลี่ยน state |
| ทั้งคู่ down | เฟรม19–21; ค้าง21เมื่อ HP0 | death alpha/ข้อความเดิม | ข้าม/resize/reload ยังสร้างภาพล้มจาก HPจริง |
| ทั้งคู่ block/dodge/counter | **procedural fallback เดิม** | absorption/dodge/counter จริง | ยังไม่มีเฟรมเฉพาะ3ท่านี้; ไม่เรียกว่าผลิต sprite reaction ครบทุกชนิด |
| Eira ฟื้น | reset ไป seed0 เมื่อ authoritative HP>0 | Revive เดิมโดยผู้ร่ายจริง | **ไม่มี strip ลุกขึ้นใหม่**; ไม่แก้ save/กฎการชุบ ฝั่งศัตรูไม่มี revive action ที่ใช้งานจริง |
| idle / reduced intensity / OS reduced motion | seedเดิม; breathing เฉพาะโหมดอนุญาต | VFX ลดการเคลื่อนไหวตามเดิม | เจตนาใช้ still ไม่ใช่ภาพโหลดไม่สำเร็จ |
| ไม่พบ clip / optional atlas โหลดไม่ได้ | **original-art + procedural fallback** | VFX เดิม | Start/เทิร์นแรกยัง commit ได้ และไม่ยิง requestซ้ำไม่สิ้นสุด |

Passive/talent modifiers (`splitbolt`, `piercebolt`, `arcanecharge`, `twinward`, `wardreflect`, `echo`, `sigilreflect`, `sigilward`, `fateseal`) ไม่ใช่ ActionId ใหม่ ใช้ชุดร่ายของ action ที่ก่อผล; actual reflect/counter ใช้ procedural counter เดิม ไม่เพิ่มท่ายิง/คำสั่งให้คนที่ไม่ได้รับเทิร์น

## A0: audit pilot เดิม

| ตัว/ActionId หรือ intent | สถานะ sprite | cue/fallback |
| --- | --- | --- |
| Lyra `attack` | pilot เดิม | prepare[1,2,3], recover[5,4,6,7,8] คงลำดับหลังฟัน |
| Lyra `execute` | pilot เดิม | prepare9–12, recover13–16; painted Execute เดิม |
| Lyra `mark` | **procedural cast fallback** | mark/status event เดิม |
| Lyra `finisher`, `lunge` | **procedural thrust fallback** | blade C5 เดิม; ยังไม่ได้ผลิต sprite เพิ่ม |
| Lyra `parry` | **procedural guard fallback** | blade/parry event เดิม |
| Lyra `sweep` | **procedural slash fallback** | blade C5 เดิมตาม actual recipients |
| Hunter `Raking Slash` | pilot เดิม `attack` | prepare1–4/recover5–8 |
| Hunter `Shadow Knife` | pilot เดิม `skill` | prepare9–12/recover13–16; energy intent คงเดิม |
| pilot hit/down | spriteเดิม17–18/19–21 | block/dodge/counter/idle/revive เป็น fallback/resetเดิม |
| future/unrecognized intent/action | **procedural fallback** | ห้ามแอบแมปทุกท่าเป็น attack |

A0 คง hash/URL/pixels ของ atlas pilot, frame cadence/exponent1.08, dissolve≤18ms, contact/recovery timing และลำดับพิเศษของ Lyra เดิม Registry ใหม่เลือกตาม art identity ไม่ใช่ field slot; texture key `unit-pilot-*` คงไว้เพื่อ compatibility ไม่ได้จำกัดจำนวนตัวไว้ที่สอง

## งบและการโหลด

| ตัว | atlas | decoded RGBA | atlas+JSON |
| --- | --- | --- | --- |
| Eira | 1536×662 | 4,067,328bytes =3.88MiB | 1,382,688bytes |
| Sprite | 512×611 | 1,251,328bytes =1.19MiB | 357,984bytes |

ทั้งคู่ต่ำกว่า6MiB/1.5MBต่อคน ไอรารอบแรก1.89MBเกินเป้า จึงลดด้วย scale ร่วมทั้งชุดเป็น215px และชดเชยdisplayRatioให้ขนาดในสนามเท่าเดิม ไม่ย่อคนละขนาดรายเฟรม หลัง normalize จึง trim/deduplicate/pack WebP lossless และ reconstruct ทุก alpha/visible RGBA เท่ากันครบ22logical frames/คน (Eira18unique/Sprite12unique)

ไม่เพิ่มเข้า `preload()`; optional requests เกิดหลังเข้าศึก เฉพาะ art ที่มีใน encounter รวม reserve ที่ประกาศไว้ ใช้ภาพเดิมระหว่างรอและไม่เปลี่ยน texture กลาง committed stage; ปล่อย texture ที่ไม่อยู่ใน encounter ใหม่ ตัวเลขข้างบนไม่ใช่ RAM/GPUรวมเกมหรือผลมือถือจริง Pilotเดิมยังรวม9.8MiBตามPR76

## การตรวจและคลิป

ใช้ UI/Phaser/BattleScene/BattleUI/playback/resolver จริงใน dev-only fixture ที่390×844; fixtureจัดความเร็ว/HP/action availability เพื่อเข้าท่าทดสอบ ไม่เปลี่ยนตัวเลขเกมจริง `final-state.json` แต่ละcaptureเทียบกับผล resolver ทุกฟิลด์และมีคำสั่งเดียว คลิปใช้ real clocks/CDP timestamps ไม่มีแทรกเฟรมหรือเร่งเวลา และ encoder decodeกลับตรวจจำนวนเฟรม/PTS/ระยะจบ ผู้เล่นเห็น Eira cast แล้ว Seed Spark ตามเทิร์นจริง; Sigil ที่ผนึกสำเร็จยกเลิกท่าศัตรูตามกฎ

Chromium cloud/SwiftShader emulation เท่านั้น ไม่ใช่ iOS Safari/มือถือจริง และไม่อ้าง60fpsจากคลิป cloud รายละเอียดจริง/ผลCI/releaseจะบันทึกหลังตรวจครบ ไม่มีการอนุมาน owner visual approval จาก tests

ผลที่ตรวจแล้ว: typecheck/lint/build ผ่าน; `npm test -- --maxWorkers=2` ผ่าน920tests/79files และ focused unit21/21ผ่าน (รวมการเทียบทุกactiveunlockกับcontentจริง) การตรวจ lifecycle/late arrival3/3, pilot+loading5/5 และ playerเล่น/decodeครบ16คลิป1/1ผ่าน; focused regressionรวม36/36เคสผ่าน Full browser รันในCIตามกฎrepository ผลCI/merge/publicationยังไม่ถูกอ้างว่าผ่าน

หลักฐานรอบแรกก่อนรวมC5.6 (`a719936`; หลักฐานปัจจุบันอยู่หัวข้อ28ตุลาคมและproof.json): attack/Bolt/Ward × normal/fast/reduced/OS-reduced และ Sigil/Storm/Aegis/Dispel normal จำนวนrawframesรวม1,262; maxframegap0.315s; maxPTSerror0.0061ms หลังdecodeกลับ ทุกคลิปเก็บทุกcapturedframe+finalhold ไม่แทรกภาพ/เร่งเวลา [proof.json](proof.json) บันทึกhashวิดีโอและrawcaptureที่ยังอยู่ในworkspace; rawframesไม่ใช่ไฟล์ที่commitหรือเผยแพร่ [ภาพBolt](bolt-normal-eira-390.png) / [ภาพSeedSpark](attack-normal-sprite-390.png) เป็นสองstillจากคลิปจริง


## 28 ตุลาคม2026 — รวมฐานC5.6ที่เผยแพร่แล้ว

หัวเดิม`a719936`ผ่านquality40532299467และfullbrowser40532299933ครบ175source/3prechecks/249productionผ่าน/384skip แต่ขณะรันมีC5.6PR86ที่เจ้าของผ่านและเผยแพร่เข้าฐานถึง`a2993df`แล้ว จึงรวมฐานใหม่ในPR87เดิม รักษาalchemyatlas/module/approvalและทุกCIgateครบ แก้เฉพาะalchemyAnchorให้อ่านdisplayratioของEiraใหม่อย่างถูกต้อง (pilotเดิม2/originalart1เท่าเดิม) เพิ่มanchorcheckที่2x/3xDPR ไม่แก้timing/rules/save/balance ขณะนี้กำลังตรวจmergedsourceและปรับหลักฐานให้ตรงฐานสุดท้าย ผลCIหัวเดิมไม่ใช่ผลของหัวใหม่


ผลmergedsource: typecheck/lint/buildผ่าน;958unit/80filesและ82focusedbrowserผ่านครบ (รวม57alchemyเดิม,20A1,3loading,2pilot) อัดใหม่16clipsจากฐานรวมแล้ว ทุกstateเทียบresolverตรงและMP4decodedPTS/count/endผ่าน มี1547rawframes maxgap0.3s/maxPTSerror0.0061ms บันทึกsource/publictreeและhashในproof.json ผลfullCI/merge/Pagesของหัวรวมยังรอขั้นส่งจริง

หน้าเล่นคลิปปัจจุบันตรวจdecode/controlsครบ16ไฟล์ผ่าน1/1ที่390pxด้วย
