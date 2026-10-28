# A2 — เอกิส + องครักษ์อสูร

28 ตุลาคม2026 · branch `codex/animation-a2` · ฐานเกม `f0ee801792f4a0a081a2752cadfdd99d63b50dbe` (หลัง A0/A1 PR87 และ C5.6)

[หน้าเลือกคลิปจริง390px](index.html) · [แหล่งภาพ/prompt/normalization](../../../incoming/ART-UNIT-ANIMATION-A2-001/NOTES.md) · [ผลแพ็กจริง](../../../incoming/ART-UNIT-ANIMATION-A2-001/validation.json)

ขอบเขตเฉพาะ `guardian` / `foe_vargoth_guard` ใช้ registry/optional loader เดิม ไม่เพิ่ม critical preload ไม่เปลี่ยน battle rules/save/content/balance/playback timing หรือ VFX atlas/module เดิม Pilot/A1 และ approval/gate ของ C5 ทุกfamilyคงเดิม การสั่งทำ A2 และ standing authorization ไม่ใช่บันทึก owner visual approval ใหม่จากผล tests

## Audit จาก content/runtime จริง

เอกิสมี7 ActionId จาก team.ts + unlockดาว + talentTrees.guardian; ทดสอบเทียบรายการกับ content ทุกตัว องครักษ์ใช้ภาพในสอง encounter จริง: `first-clash` (f1: Rift Bolt energy16 / Crushing Blow physical14) และ `vanguard-captain` (f2: Shield Smash physical16 / Mace Swing physical18 หลังscaleLv3จากฐาน14/16) ไม่มี intent ตั้งรับแยกใน catalog จึงไม่สร้างชื่อ/เทิร์นใหม่ให้ศัตรู ตั้งโล่เป็น windup/ปล่อยพลังงาน/รับผลตามจริง Species.vargothGuard ยังคงสองท่ากายภาพ; veil-siege ใช้ภาพbruteจึงไม่แอบเปลี่ยนเป็นองครักษ์

| ActionId/intent | body clip | VFX เดิม / เป้าหมาย / จุดเกิดผล | fallback/เงื่อนไข |
| --- | --- | --- | --- |
| เอกิส `attack` | sword1–8; เตรียม1–4 สัมผัส5 คืน5–8 | basic physical impact เดิมบน actual damage recipient ที่ contact | ไม่เพิ่มฮิต/เปลี่ยนชนิดดาเมจ |
| `bash` | shield bash22–29; เตรียม22–25 สัมผัส26 คืน26–29 | C5.5 earth Bash เดิมบน actual target/damage/interruption | retribution/reflectbash ใช้ท่าร่วม ไม่สร้างโล่ยิงเวทเพิ่ม; energy cancel เฉพาะเมื่อ resolver ให้ผลจริง |
| `guard` | shield support9–16; เตรียม9–12 สัมผัส13 คืน13–16 | C5.2 defense ตาม guard event/announced ally; absorption/redirect เมื่อโดนจริง | ไม่วาดผลคุ้มกันก่อน event |
| `rally` | supportร่วม | C5.2 บน living allies จาก rally/buff จริง; brightbanner barrier ตาม event | rallybanner/twoguard ไม่เพิ่ม body cast ซ้ำ |
| `challenge` | supportร่วม | C5.2 ตาม taunt event บน enemy ที่เลือก/ท่าท้าดวลของผู้ใช้ | ไม่สื่อดาเมจจากการท้าดวล |
| `bulwark` | supportร่วม | C5.2 ตาม buff จริงบนผู้ใช้ | ไม่เปลี่ยนเปอร์เซ็นต์ลดดาเมจ |
| `rouse` | supportร่วม | C5.3 เดิม: guard/all บน actual ally และ protector/redirect ตาม event | **runtime เป็นคุ้มกัน ไม่ใช่ฮีลทันที**; ไม่อนุมาน heal จากชื่อmodule/คอมเมนต์เก่า |
| องครักษ์ `Crushing Blow` / `Mace Swing` | heavy physical1–8; เตรียม1–4 สัมผัส5 คืน5–8 | generic physical impact เดิมตาม actual recipients | ใช้ท่าทุบร่วม ไม่ผลิต atlas ต่อชื่อ; ท่ากระบองใช้เฉพาะสอง intent นี้ |
| องครักษ์ `Shield Smash` | shield smash24–31; เตรียม24–27 สัมผัส28 คืน28–31 | generic physical impact เดิมบน actual recipient | กระบองค้างลง โจมตีด้วยโล่ ต่างจากท่าทุบและท่าปล่อยพลังงาน |
| องครักษ์ `Rift Bolt` | shield-hand release9–16; สัมผัส13 | **generic energy VFX เดิม** บน actual recipient/guard/barrier/dodge | ไม่ใช่ไฟ แม้เกราะมีลายส้ม; ไม่ใช่ painted Bolt ของMage และไม่ผลิต familyใหม่ |
| hurt ทั้งคู่ | 17–18 | damage event/HPจริง | ไม่แก้ state จากแอนิเมชัน |
| block เอกิส/องครักษ์ | 30–31 / 22–23 | shield brace + actual absorbed/zero-damage event | ใช้ reaction poses สั้นร่วมจาก raw ไม่สร้างท่าแยกทุกแหล่งโล่ |
| เอกิส guardcounter | brace30→sword5→recover7ร่วม | counter event จริงจาก talent; generic counter VFX เดิม ภายในreaction200msเดิม รับhit/blockแล้วสวนโดยไม่ถูกhurtpriorityบัง; downยังชนะ ไม่ใช้สวนดาบแทนgearThorns/Wardreflect | ไม่เพิ่มคำสั่ง/เทิร์น/ฮิต; ไม่ใช่ ActionId ใหม่ |
| dodge ทั้งคู่ / counterศัตรู | **proceduralเดิม** | dodge/counter event จริง | ไม่มี stripเฉพาะ; current Guardไม่มี counter talentของตัวเอง |
| down ทั้งคู่ | 19–21 ค้าง21เมื่อHP0 | actual down/authoritativeHP | skip/resize/reloadคงภาพล้ม |
| revive เอกิส | resetseed0เมื่อHP>0 | Reviveเดิมโดยผู้ร่ายจริง | **ไม่มี stand-up stripใหม่**; ศัตรูไม่มี revive actionในcontent |
| idle/reduced/OS-reduced | exact seed; breathingเดิมเฉพาะโหมดอนุญาต | ระบบลดmotionเดิม | intentionally still |
| missing clip/optionalโหลดค้างหรือล้มเหลว | **original-art + proceduralเดิม** | VFX/eventเดิม | ไม่gate Start/firstturn ไม่เปลี่ยนtextureกลางcommitted stage |

Modifiers ไม่ใช่ ActionId ใหม่: guardReduction/twoguard/stand/retribution/reflectbash/guardcounter/brightbanner/rallybanner/fatebanner ใช้ action หรือ upkeep/reactionที่ก่อผลจริง Fatebannerจบรอบไม่มี body castปลอม และ VFXเดิมตาม barrier eventเท่านั้น ไม่อ้างว่าได้ผลิต stripใหม่ทุกpassive

## ภาพและงบ

| ตัว | logical/unique | decoded atlas RGBA | atlas+JSON | display ratio |
| --- | --- | --- | --- | --- |
| Aegis | 32/25 | 4,423,680bytes (4.22MiB) | 1,397,790bytes | 1/.36 |
| Vargoth Guard | 32/24 | 4,303,872bytes (4.10MiB) | 1,385,751bytes | 2 |

ตัวเลขนี้ไม่ใช่ RAM/GPU รวมเกมหรือผลมือถือจริง Normalizeด้วยscaleร่วมทั้งตัว/จุดเท้าร่วมก่อนtrim/dedup/pack WebPlossless; reconstruct alpha/visibleRGBAตรงทุกเฟรม Source/prompt/rawstrip/การเลือกเฟรมและpacking reportเก็บในGit ขนาด/ทิศ/seedของpilot/A1ไม่เปลี่ยน Landmarkเดิมใช้unitDisplayRatioของartจริง; original artยังratio1และEira1/.42

ใช้ optional backgroundโหลดเฉพาะencounterรวมreserveเดิม ศัตรูartเดียวกันหลายตัวใช้textureร่วมกันและcontrollerแยกactor ไม่โหลดA3/rosterอนาคต เข้าศึกใหม่evictเฉพาะtextureที่ไม่ใช้ โหลดfailไม่วนrequestไม่สิ้นสุดและใช้ภาพเดิมเล่นเทิร์นแรกได้

## Validation / release

[PR88](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/88) · ส่ง26คลิปชุดสุดท้ายแล้ว กำลังรอfullCIก่อนmerge/Pages ไม่อ้างผลที่ยังpending

- Source snapshot `dd56ddd` / src tree `9c21ec671fa30a10236772f3819ba84aaca208a3` / public tree `f6698cd8435f2b84295c503de9db6031b1f4e218`
- typecheck/lint/buildและ37focused unit/5filesผ่าน;42focusedbrowserผ่านบน3c66c9a และguardcounterที่กรองเฉพาะeventจริงรันซ้ำบนdd56dddผ่าน1/1 ก่อนcapture
- ก่อนเพิ่มShieldSmashแยกและcounterpolicy:117focusedbrowserผ่าน (57C5.6+20A1+35A2+3loading+2pilot); Guardframes0–23หลังเพิ่มstripเท่ากันทุกalpha/visibleRGBA (retained-frames.json) FullCIชุดสุดท้ายตรวจ271source fixturesรวมทุกC5+A1+A2แยกจากproduction
- ชุดสุดท้าย26/26realclockcapturesผ่านทุกfinalstateเทียบresolverและcommittedcommands; MP4decodeตรวจcount/PTS/endครบ26, playerเล่น/seek/decodeทุกไฟล์ผ่าน1/1 มี1,202capturedframes, maxgap0.377s, maxPTSerror0.0061ms ไม่interpolate/retime
- ทุกcaptureมีคำสั่งใหม่1ครั้ง; reviveมีprelude2คำสั่งจากresolverอยู่ก่อนแล้ว รวม3คำสั่ง ไม่ยัดHP/eventกลางการเล่น
- RawJPEGsยังอยู่ในworkspaceเท่านั้น แต่MP4/PNG/stamps/timing/final-state/hash/sourceproofเก็บในGitครบ แชตใหม่ใช้ไฟล์ในcapture-metadataและproof.jsonได้ ไม่ต้องพึ่งrawCapture workspacepath

ข้อจำกัดQAที่บันทึกตามจริง: unitรอบรวมแรก974ผ่าน/1boss-simtimeoutขณะรันbrowserร่วมกัน เคสนั้นรันเดี่ยวผ่าน1/1โดยไม่แก้180s timeout/assertions รอfinalCIสำหรับfullunit975 ชุดอัดก่อนสุดท้ายเคย25/26เพราะoptionalartยังไม่พร้อมภายใน5s; A2visualQA/captureรอoptionalart15sก่อนเริ่มอัดเท่านั้น ไม่เปลี่ยนเวลาเกมหรือassertionStart/firstturnขณะhold/fail และไม่ตีความว่าเป็นผลperformanceบนมือถือจริง รอบที่เจอHMR/reloadระหว่างแก้fixtureไม่ถูกรายงานว่าผ่าน

## คลิปสำคัญ

- [เอกิสโจมตีปกติ + องครักษ์ทุบ/คืนท่า](attack-CrushingBlow-normal-normal-390.mp4)
- [เอกิสกระแทกโล่ + องครักษ์ปล่อยRiftBolt/คืนท่า](bash-RiftBolt-normal-normal-390.mp4)
- [องครักษ์ShieldSmashด้วยโล่จริง](attack-ShieldSmash-normal-normal-390.mp4)
- [เอกิสตั้งโล่แล้วสวนกลับจริง](guard-CrushingBlow-counter-normal-390.mp4)
- [หน้าเลือกคลิป26รายการ](index.html) / [inventory](clips.json) / [proof+hash](proof.json)


คลิปและsource QAใช้dev-only fixtureจัดparty/speed/entryHP/actionavailability/talentcapsเพื่อเข้ากรณีทดสอบ รวมล้ม/ฟื้นและcounter แต่ทุกคำสั่งผ่านreal UI/Phaser/playback/resolverและเทียบfinalstateทุกfield ไม่เปลี่ยนcontentเกมจริง ไม่ใช้owner saveหรือยัดeventปลอม ก่อนส่งตรวจproductionผ่านCIแยกต่างหาก

Browser pluginไม่มีเครื่องมือควบคุมbrowserในsessionนี้ จึงใช้repositoryPlaywright/ChromiumกับSwiftShaderตามgame-playtest ตรวจภาพcanvasจริงที่390×844 เป็นcloud/touch emulation ไม่ใช่iOS Safari/มือถือจริง/การรับรอง60fps Realclockcaptureใช้CDPtimestamps เก็บทุกcapturedframeและfinalhold ไม่interpolate/retime; decodeกลับตรวจPTS/count/endและเทียบfinalstateกับauthoritative resolverทุกfield

## รายการคลิปทั้งหมด

| คลิป | ระยะเวลา | captured frames |
| --- | --- | --- |
| [attack-CrushingBlow-normal-osreduce](attack-CrushingBlow-normal-osreduce-390.mp4) | 2.190s | 53 |
| [attack-CrushingBlow-normal-fast](attack-CrushingBlow-normal-fast-390.mp4) | 1.678s | 35 |
| [attack-CrushingBlow-normal-normal](attack-CrushingBlow-normal-normal-390.mp4) | 1.947s | 46 |
| [attack-MaceSwing-normal-normal](attack-MaceSwing-normal-normal-390.mp4) | 2.274s | 46 |
| [attack-RiftBolt-enemy-down-normal](attack-RiftBolt-enemy-down-normal-390.mp4) | 1.651s | 37 |
| [attack-RiftBolt-normal-fast](attack-RiftBolt-normal-fast-390.mp4) | 1.825s | 35 |
| [attack-RiftBolt-normal-normal](attack-RiftBolt-normal-normal-390.mp4) | 2.221s | 39 |
| [attack-RiftBolt-normal-osreduce](attack-RiftBolt-normal-osreduce-390.mp4) | 2.232s | 51 |
| [attack-RiftBolt-normal-reduced](attack-RiftBolt-normal-reduced-390.mp4) | 2.260s | 50 |
| [attack-ShieldSmash-normal-normal](attack-ShieldSmash-normal-normal-390.mp4) | 2.275s | 50 |
| [bash-RiftBolt-normal-fast](bash-RiftBolt-normal-fast-390.mp4) | 2.257s | 42 |
| [bash-RiftBolt-normal-normal](bash-RiftBolt-normal-normal-390.mp4) | 2.720s | 60 |
| [bash-RiftBolt-normal-osreduce](bash-RiftBolt-normal-osreduce-390.mp4) | 2.844s | 58 |
| [bash-RiftBolt-normal-reduced](bash-RiftBolt-normal-reduced-390.mp4) | 2.765s | 61 |
| [bash-RiftBolt-reflect-normal](bash-RiftBolt-reflect-normal-390.mp4) | 1.934s | 44 |
| [bulwark-RiftBolt-normal-normal](bulwark-RiftBolt-normal-normal-390.mp4) | 2.272s | 46 |
| [challenge-RiftBolt-normal-normal](challenge-RiftBolt-normal-normal-390.mp4) | 1.872s | 51 |
| [attack-CrushingBlow-normal-reduced](attack-CrushingBlow-normal-reduced-390.mp4) | 1.949s | 49 |
| [guard-CrushingBlow-counter-normal](guard-CrushingBlow-counter-normal-390.mp4) | 1.941s | 45 |
| [guard-RiftBolt-normal-fast](guard-RiftBolt-normal-fast-390.mp4) | 1.693s | 28 |
| [guard-RiftBolt-normal-normal](guard-RiftBolt-normal-normal-390.mp4) | 2.367s | 45 |
| [guard-RiftBolt-normal-osreduce](guard-RiftBolt-normal-osreduce-390.mp4) | 2.099s | 44 |
| [guard-RiftBolt-normal-reduced](guard-RiftBolt-normal-reduced-390.mp4) | 1.977s | 44 |
| [rally-RiftBolt-normal-normal](rally-RiftBolt-normal-normal-390.mp4) | 2.689s | 53 |
| [revive-RiftBolt-revive-normal](revive-RiftBolt-revive-normal-390.mp4) | 1.734s | 35 |
| [rouse-RiftBolt-wounded-normal](rouse-RiftBolt-wounded-normal-390.mp4) | 2.692s | 55 |
