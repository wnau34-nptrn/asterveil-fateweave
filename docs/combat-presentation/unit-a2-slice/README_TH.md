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
| องครักษ์ `Crushing Blow` / `Shield Smash` / `Mace Swing` | heavy physical1–8; เตรียม1–4 สัมผัส5 คืน5–8 | generic physical impact เดิมตาม actual recipients | ใช้ท่าทุบร่วม ไม่ผลิต atlas ต่อชื่อ; Shield Smash ไม่มีเฟรมโจมตีด้วยโล่แยกเฉพาะ |
| องครักษ์ `Rift Bolt` | shield-hand release9–16; สัมผัส13 | **generic energy VFX เดิม** บน actual recipient/guard/barrier/dodge | ไม่ใช่ไฟ แม้เกราะมีลายส้ม; ไม่ใช่ painted Bolt ของMage และไม่ผลิต familyใหม่ |
| hurt ทั้งคู่ | 17–18 | damage event/HPจริง | ไม่แก้ state จากแอนิเมชัน |
| block เอกิส/องครักษ์ | 30–31 / 22–23 | shield brace + actual absorbed/zero-damage event | ใช้ reaction poses สั้นร่วมจาก raw ไม่สร้างท่าแยกทุกแหล่งโล่ |
| เอกิส guardcounter | sword reaction2→5→7ร่วม | counter event จริงจาก talent; generic counter VFX เดิม | ไม่เพิ่มคำสั่ง/เทิร์น/ฮิต; ไม่ใช่ ActionId ใหม่ |
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
| Vargoth Guard | 24/18 | 3,207,168bytes (3.06MiB) | 1,026,816bytes | 2 |

ตัวเลขนี้ไม่ใช่ RAM/GPU รวมเกมหรือผลมือถือจริง Normalizeด้วยscaleร่วมทั้งตัว/จุดเท้าร่วมก่อนtrim/dedup/pack WebPlossless; reconstruct alpha/visibleRGBAตรงทุกเฟรม Source/prompt/rawstrip/การเลือกเฟรมและpacking reportเก็บในGit ขนาด/ทิศ/seedของpilot/A1ไม่เปลี่ยน Landmarkเดิมใช้unitDisplayRatioของartจริง; original artยังratio1และEira1/.42

ใช้ optional backgroundโหลดเฉพาะencounterรวมreserveเดิม ศัตรูartเดียวกันหลายตัวใช้textureร่วมกันและcontrollerแยกactor ไม่โหลดA3/rosterอนาคต เข้าศึกใหม่evictเฉพาะtextureที่ไม่ใช้ โหลดfailไม่วนrequestไม่สิ้นสุดและใช้ภาพเดิมเล่นเทิร์นแรกได้

## Validation / release

อยู่ระหว่างตรวจและอัดคลิป ยังไม่อ้างCI/merge/Pagesหรือvisualapprovalจากผลที่ยังไม่เสร็จ ผลสุดท้ายจะอัปเดตในส่วนนี้พร้อมreleaseproof

Browser pluginไม่มีเครื่องมือควบคุมbrowserในsessionนี้ จึงใช้repositoryPlaywright/ChromiumกับSwiftShaderตามgame-playtest ตรวจภาพcanvasจริงที่390×844 เป็นcloud/touch emulation ไม่ใช่iOS Safari/มือถือจริง/การรับรอง60fps Realclockcaptureใช้CDPtimestamps เก็บทุกcapturedframeและfinalhold ไม่interpolate/retime; decodeกลับตรวจPTS/count/endและเทียบfinalstateกับauthoritative resolverทุกfield
