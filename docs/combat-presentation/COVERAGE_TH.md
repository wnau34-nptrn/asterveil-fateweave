# ตารางครอบคลุมท่าร่างกายและ VFX (W8) — สร้างจากโค้ด

> ไฟล์นี้และ `coverage.json` สร้างจาก `src/game/visuals/presentation-coverage.ts` (registry `unit-frames.ts`, content, ลำดับ routing ของ `BattleScene`) ด้วย `npm run coverage:presentation` ห้ามแก้ด้วยมือ; `tests/presentation-coverage.test.ts` ล้มเมื่อตารางไม่ตรงโค้ด

## สรุป

- identities 36 (ฝ่ายเรา 14 · ศัตรู 22) · มี atlas 34 · พักตาม OD-14 2 (โอดราน `thiran` / อิโซลด์ `wila`: ภาพนิ่งใหม่ + procedural ไม่มี atlas)
- ActionId ฝ่ายเรา 73 รายการ (98 แถว ตัวละคร×ท่า รวมท่าจากต้นไม้) · ชื่อท่าศัตรู/phase 40 ชื่อ (49 แถว identity×ท่า)
- ท่าร่างกาย: sprite 133 · procedural 14 (ทั้งหมดคือตัวที่พักตาม OD-14)
- VFX: วาดเฉพาะ 112 · ชุดร่วมโดยตั้งใจ 31 · วาดด้วยโค้ดโดยตั้งใจ 4

ความหมาย: **sprite** = เฟรม atlas (prepare → recover; contact = เฟรม recover แรก, เวลา contact/end มาจาก UI ไม่ใช่ FPS ภาพ) · **procedural** = ภาพนิ่ง + การเคลื่อนไหวด้วยโค้ด · **วาด** = painted atlas ของท่านั้น · **ชุดร่วม** = painted atlas ร่วมตระกูลโดยตั้งใจ · **โค้ด** = วาดด้วย Graphics ตั้งใจ (ไม่มีภาพเฉพาะ) · จุดเกิดผลทุกแถวอ่านจาก event จริงของ resolver

## Identities

| identity | ชื่อ | ฝั่ง | atlas (เฟรม · decoded · download) | hit | block | down | counter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `guardian` | Aegis | เรา | 32 · 3.41 MiB · 1.17 MB | sprite 17,18 | sprite 30,31 | sprite 19,20,21 · ค้าง 21 | sprite 30,5,7 |
| `tracer` | Lyra | เรา | 38 · 8.51 MiB · 2.31 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | sprite 12,13,14 |
| `weaver` | Eira | เรา | 22 · 3.88 MiB · 1.38 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `healer` | Seren | เรา | 40 · 4.68 MiB · 1.46 MB | sprite 17,18 | sprite 38,39 | sprite 19,20,21 · ค้าง 21 | — |
| `mira` | Mira | เรา | 32 · 3.97 MiB · 1.10 MB | sprite 17,18 | sprite 30,31 | sprite 19,20,21 · ค้าง 21 | — |
| `toma` | Toma | เรา | 24 · 2.18 MiB · 0.65 MB | sprite 17,18 | sprite 22,23 | sprite 19,20,21 · ค้าง 21 | — |
| `sefa` | Sefa | เรา | 40 · 4.04 MiB · 1.07 MB | sprite 17,18 | sprite 38,39 | sprite 19,20,21 · ค้าง 21 | — |
| `brann` | Brann | เรา | 40 · 4.40 MiB · 1.49 MB | sprite 17,18 | sprite 38,39 | sprite 19,20,21 · ค้าง 21 | — |
| `lio` | Lio | เรา | 40 · 4.96 MiB · 1.46 MB | sprite 17,18 | sprite 38,39 | sprite 19,20,21 · ค้าง 21 | — |
| `garran` | Garran | เรา | 32 · 3.85 MiB · 1.02 MB | sprite 17,18 | sprite 30,31 | sprite 19,20,21 · ค้าง 21 | sprite 30,5,6 |
| `metta` | Corin | เรา | 35 · 4.18 MiB · 1.37 MB | sprite 25,26,27 | sprite 28,29,30 | sprite 31,32,33,34 · ค้าง 34 | — |
| `thiran` | Odran | เรา | OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | procedural | procedural | procedural (ภาพนิ่งจาง) | — |
| `lalin` | Cerise | เรา | 41 · 6.23 MiB · 2.18 MB | sprite 31,32,33 | sprite 34,35,36 | sprite 37,38,39,40 · ค้าง 40 | — |
| `wila` | Isolde | เรา | OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | procedural | procedural | procedural (ภาพนิ่งจาง) | — |
| `brute` | อสูรรอยแยก | ศัตรู | 24 · 4.18 MiB · 1.44 MB | sprite 17,18 | sprite 22,23 | sprite 19,20,21 · ค้าง 21 | — |
| `foe_captain` | หัวหน้ากองหน้า | ศัตรู | 18 · 4.58 MiB · 1.34 MB | sprite 13,14 | procedural (tint/lift) | sprite 15,16,17 · ค้าง 17 | — |
| `foe_dew_slime` | สไลม์น้ำค้าง | ศัตรู | 22 · 1.35 MiB · 0.36 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_ember_slime` | สไลม์ถ่านไฟ | ศัตรู | 22 · 1.11 MiB · 0.32 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_golem` | โกเลมเศษผลึก | ศัตรู | 22 · 3.30 MiB · 1.08 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_hunter` | นักล่าเผ่าอสูร | ศัตรู | 22 · 3.89 MiB · 0.93 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_juggernaut` | ด้วงเกราะผลึก | ศัตรู | 14 · 4.11 MiB · 1.43 MB | sprite 9,10 | procedural (tint/lift) | sprite 11,12,13 · ค้าง 13 | — |
| `foe_matriarch` | ราชินีหนาม | ศัตรู | 26 · 3.37 MiB · 1.42 MB | sprite 21,22 | procedural (tint/lift) | sprite 23,24,25 · ค้าง 25 | — |
| `foe_mycon` | เห็ดหมอผีกลวง | ศัตรู | 22 · 2.32 MiB · 0.83 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_rift_channeler` | อสูรส่งพลัง | ศัตรู | 22 · 2.03 MiB · 0.55 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_rift_wisp` | วิญญาณรอยแยก | ศัตรู | 25 · 1.30 MiB · 0.34 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_riftweaver` | ผู้ทอรอยแยก | ศัตรู | 30 · 3.70 MiB · 1.15 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_ruin_bat` | ค้างคาวซาก | ศัตรู | 26 · 1.88 MiB · 0.43 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_sentinel` | ผู้คุมรอยแยก | ศัตรู | 34 · 3.65 MiB · 1.41 MB | sprite 29,30 | procedural (tint/lift) | sprite 31,32,33 · ค้าง 33 | — |
| `foe_shard_crawler` | แมงมุมเศษผลึก | ศัตรู | 22 · 1.30 MiB · 0.39 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_spore_puff` | ภูตสปอร์ | ศัตรู | 22 · 1.58 MiB · 0.46 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_sprite` | ภูตแดนดิไลออน | ศัตรู | 22 · 1.19 MiB · 0.36 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_stalker` | ลิงซ์หนามพราง | ศัตรู | 22 · 2.44 MiB · 0.70 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_thorn_beetle` | ด้วงหนาม | ศัตรู | 22 · 1.78 MiB · 0.48 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_tusker` | หมูป่าหลังตะไคร่ | ศัตรู | 22 · 4.08 MiB · 1.20 MB | sprite 17,18 | procedural (tint/lift) | sprite 19,20,21 · ค้าง 21 | — |
| `foe_vargoth_guard` | องครักษ์อสูร | ศัตรู | 32 · 4.10 MiB · 1.39 MB | sprite 17,18 | sprite 22,23 | sprite 19,20,21 · ค้าง 21 | — |
| `raider` | นักจู่โจม | ศัตรู | 24 · 3.72 MiB · 1.14 MB | sprite 17,18 | sprite 22,23 | sprite 19,20,21 · ค้าง 21 | — |

dodge ทุกตัว = procedural (เลื่อนหลบ) ไม่มีเฟรมเฉพาะ

## ฝ่ายเรา: ตัวละคร × ActionId

| identity | ActionId / ชื่อ | ท่าร่างกาย | VFX | เป้า | จุดเกิดผล |
| --- | --- | --- | --- | --- | --- |
| `guardian` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `guardian` | `guard` ตั้งรับแทน | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `defense-fx` | พันธมิตร 1 คน | ผู้ร่าย — ตัว |
| `guardian` | `bash` กระแทกโล่ | sprite `bash` 22,23,24,25 → 26,27,28,29 | วาด `earth-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | พื้นใต้ศัตรูที่โดนจริง (+ heal จริงแยก) |
| `guardian` | `bulwark` กำแพงโล่ | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `defense-fx` | ตัวเอง | ผู้รับจริง — ตัว |
| `guardian` | `challenge` ท้าดวล | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `command-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | โล่ผู้ร่าย → ศัตรูที่ถูกท้าจริง 1 ตัว |
| `guardian` | `rally` ตั้งรับหมู่ | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `defense-fx` | ตัวเอง | ผู้รับจริง — ขา/พื้น |
| `guardian` | `rouse` ยืนเคียงข้าง | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `healing-fx` | ตัวเอง | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `tracer` | `attack` โจมตี | sprite `attack` 1,2,3 → 5,4,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `tracer` | `mark` ติดตรา | sprite `mark` 23,24,25 → 26,27,28,29 | วาด `arcane-seal-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | กลางตัวเป้าจริง |
| `tracer` | `execute` ฟันเจาะจุด | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `exec-ward-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง (+ ตราเมื่อติด Mark จริง) |
| `tracer` | `lunge` พุ่งตัด | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `tracer` | `finisher` ปลิดชีพ | sprite `attack` 1,2,3 → 5,4,6,7,8 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `tracer` | `parry` ปัดดาบ | sprite `parry` 31,32,33 → 34,35,36,37 | วาด `blade-fx` | ตัวเอง | ผู้ร่าย (stance) + ผู้รับ counter จริง |
| `tracer` | `sweep` ฟันกวาด | sprite `attack` 1,2,3 → 5,4,6,7,8 | วาด `blade-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ตัวผู้รับ damage จริง |
| `weaver` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `weaver` | `bolt` ศรเวท | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `bolt-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ไม้เท้า → ตัวผู้รับจริง |
| `weaver` | `ward` โล่เวท | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `exec-ward-fx` | พันธมิตร 1 คน | ผู้รับ barrier จริง |
| `weaver` | `storm` พายุเวท | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `arcane-seal-fx` | ศัตรูทุกตัวที่ยืนอยู่ | กลางตัว → เท้าศัตรูที่โดนจริงทุกตัว |
| `weaver` | `aegis` เกราะผลึก | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `defense-fx` | ทั้งทีม | ผู้รับจริง — ขา/พื้น |
| `weaver` | `sigil` ตรึงเวท | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `arcane-seal-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | เท้าศัตรูจริง |
| `weaver` | `dispel` สลายเวท | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `arcane-seal-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | กลางตัวเป้าจริง |
| `healer` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `healer` | `heal` รักษา | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `healing-fx` | พันธมิตร 1 คน | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `healer` | `prayer` พรฟื้นฟู | sprite `prayer` 22,23,24,25 → 26,27,28,29 | วาด `healing-fx` | ทั้งทีม | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `healer` | `revive` ฟื้นคืน | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `healing-fx` | พันธมิตร 1 คน | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `healer` | `sanctuary` พรคุ้มภัย | sprite `sanctuary` 30,31,32,33 → 34,35,36,37 | วาด `defense-fx` | พันธมิตร 1 คน | ผู้รับจริง — ตัว |
| `healer` | `halo` วงแสงคุ้มกัน | sprite `prayer` 22,23,24,25 → 26,27,28,29 | วาด `defense-fx` | ตัวเอง | ผู้รับจริง — ตัว |
| `healer` | `bless` พรต่อเนื่อง | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `healing-fx` | พันธมิตร 1 คน | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `mira` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | โค้ด `basic-attack-fx` — ลูกธนู/ขวดวาดด้วยโค้ด (AV03 ตั้งใจ ไม่ใช้ภาพสกิล) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อย → ขอบหน้าผู้รับ damage จริง |
| `mira` | `hinder` ยิงสกัด | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `projectile-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `mira` | `volley` ห่าธนู | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `projectile-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `mira` | `weakshot` ศรจุดอ่อน | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `projectile-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `mira` | `pin` ศรตรึงแถว | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `projectile-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `mira` | `disengage` ยิงถอยคิว | sprite `disengage` 22,23,24,25 → 26,27,28,29 | วาด `projectile-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `mira` | `track` ศรตามรอย | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `projectile-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `toma` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | โค้ด `basic-attack-fx` — ลูกธนู/ขวดวาดด้วยโค้ด (AV03 ตั้งใจ ไม่ใช้ภาพสกิล) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ออกจากจุดปล่อย → ขอบหน้าผู้รับ damage จริง |
| `toma` | `acid` ขวดกรด | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `alchemy-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `toma` | `haste` ยาเร่ง | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `alchemy-fx` | พันธมิตร 1 คน | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `toma` | `bomb` ขวดระเบิด | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `alchemy-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `toma` | `fury` ยาคลั่ง | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `alchemy-fx` | พันธมิตร 1 คน | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `toma` | `smoke` ขวดควัน | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `alchemy-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `toma` | `catalyst` ตัวเร่งปฏิกิริยา | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `alchemy-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst |
| `sefa` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `sefa` | `ambush` จู่โจมก่อน | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `sefa` | `evade` ก้าวเงา | sprite `evade` 30,31,32,33 → 34,35,36,37 | วาด `song-shadow-fx` | ตัวเอง | เท้าผู้ร่าย |
| `sefa` | `backstab` ลอบแทง | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `sefa` | `decoy` เงาคุ้มกัน | sprite `evade` 30,31,32,33 → 34,35,36,37 | วาด `song-shadow-fx` | พันธมิตร 1 คน | ข้างพันธมิตรที่ถูกคุ้มจริง |
| `sefa` | `knives` มีดบิน | sprite `knives` 22,23,24,25 → 26,27,28,29 | วาด `projectile-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว) |
| `sefa` | `disarm` ปาดตัดหน้า | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `brann` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `brann` | `taunt` ยั่วยุ | sprite `taunt` 22,23,24,25 → 26,27,28,29 | วาด `command-fx` | ตัวเอง | อก/ค้อนผู้ร่าย (stance ตัวเอง) |
| `brann` | `slam` ทุบค้อนรูน | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `earth-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | พื้นใต้ศัตรูที่โดนจริง (+ heal จริงแยก) |
| `brann` | `stonearmor` เกราะหิน | sprite `brace` 30,31,32,33 → 34,35,36,37 | วาด `defense-fx` | ตัวเอง | ผู้ร่าย — ขา/พื้น |
| `brann` | `quake` ทุบปฐพี | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `earth-fx` | ศัตรูทุกตัวที่ยืนอยู่ | พื้นใต้ศัตรูที่โดนจริง (+ heal จริงแยก) |
| `brann` | `guardstone` ศิลาดึง | sprite `brace` 30,31,32,33 → 34,35,36,37 | วาด `defense-fx` | พันธมิตร 1 คน | ผู้รับจริง — ตัว |
| `brann` | `tremor` ปฐพีสั่น | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `earth-fx` | ศัตรูทุกตัวที่ยืนอยู่ | พื้นใต้ศัตรูที่โดนจริง (+ heal จริงแยก) |
| `lio` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `lio` | `valor` เพลงกล้า | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `song-shadow-fx` | ตัวเอง | ผู้ร่าย → พันธมิตรที่ยืนอยู่ |
| `lio` | `mend` เพลงฟื้น | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `healing-fx` | ตัวเอง | ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep) |
| `lio` | `dread` เพลงสะท้าน | sprite `dread` 22,23,24,25 → 26,27,28,29 | วาด `song-shadow-fx` | ตัวเอง | ฝั่งศัตรูที่ยืนอยู่ (ไม่ใช่ฮิต) |
| `lio` | `finale` บทสุดท้าย | sprite `finale` 30,31,32,33 → 34,35,36,37 | วาด `song-shadow-fx` | ตัวเอง | ศัตรูที่โดนจริง / พันธมิตรที่ได้ heal-โล่จริง |
| `lio` | `note` โน้ตคม | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `song-shadow-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ผู้รับ damage จริง |
| `lio` | `solo` เพลงเดี่ยว | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `song-shadow-fx` | พันธมิตร 1 คน | หลังพันธมิตรที่ได้ Solo จริง |
| `garran` | `attack` โจมตี | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `garran` | `brace` ตั้งทวน | sprite `stance` 22,23,24,25 → 26,27,28,29 | วาด `defense-fx` | ตัวเอง | ผู้ร่าย — ตัว |
| `garran` | `pierce` แทงทะลวง | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `garran` | `spearwall` กำแพงทวน | sprite `stance` 22,23,24,25 → 26,27,28,29 | วาด `defense-fx` | ตัวเอง | ผู้ร่าย — ตัว |
| `garran` | `halt` แทงสวนจังหวะ | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `blade-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `garran` | `hold` ทวนคุ้มหลัง | sprite `stance` 22,23,24,25 → 26,27,28,29 | วาด `defense-fx` | ตัวเอง | ผู้ร่าย — ตัว |
| `garran` | `warcry` เสียงศึก | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `command-fx` | ตัวเอง | อกผู้ร่าย (buff) + เป้าที่ถูกสวนจริงต่อ event |
| `metta` | `attack` โจมตี | sprite `attack` 1,2 → 3,4,5,6 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `metta` | `saintstrike` หมัดเมตตา | sprite `attack` 1,2 → 3,4,5,6 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `metta` | `communion` แบ่งแรงใจ | sprite `communion` 13,14 → 15,16,17,18 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `metta` | `saintarc` กวาดคุ้มชีพ | sprite `arc` 7,8 → 9,10,11,12 | วาด `saint-dance-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `metta` | `vowstrike` หมัดสัตย์ | sprite `attack` 1,2 → 3,4,5,6 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `metta` | `sharewound` แบ่งบาดแผล | sprite `communion` 13,14 → 15,16,17,18 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `metta` | `lastlight` แสงสุดท้าย | sprite `lastlight` 19,20,21 → 22,23,24 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `attack` โจมตี | procedural (role basic) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `thiran` | `saintstrike` หมัดเมตตา | procedural (punch) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `communion` แบ่งแรงใจ | procedural (cast) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `saintarc` กวาดคุ้มชีพ | procedural (punch) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรูทุกตัวที่ยืนอยู่ | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `vowstrike` หมัดสัตย์ | procedural (punch) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `sharewound` แบ่งบาดแผล | procedural (cast) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `thiran` | `lastlight` แสงสุดท้าย | procedural (cast) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง |
| `lalin` | `attack` โจมตี | sprite `attack` 13,14 → 15,16,17,18 | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `lalin` | `cadence` คืนจังหวะ | sprite `partner` 1,2,3 → 4,5,6 | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `lalin` | `duet` รำประสาน | sprite `partner` 1,2,3 → 4,5,6 | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `lalin` | `rounddance` รำวง | sprite `circle` 19,20 → 21,22,23,24 | วาด `saint-dance-fx` | ทั้งทีม | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `lalin` | `deepbeat` ย้ำจังหวะ | sprite `partner` 1,2,3 → 4,5,6 | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `lalin` | `echofoot` ก้าวสะท้อน | sprite `echo` 25,26,27 → 28,29,30 | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง (เส้นเดียว) |
| `lalin` | `closingstep` ก้าวปิดท้าย | sprite `closing` 7,8,9 → 10,11,12 | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `wila` | `attack` โจมตี | procedural (role basic) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | ชุดร่วม `blade-fx` — ฟันร่วมตามสีอาชีพ (ตั้งใจ) | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ตัวผู้รับ damage จริง |
| `wila` | `cadence` คืนจังหวะ | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `wila` | `duet` รำประสาน | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `wila` | `rounddance` รำวง | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ทั้งทีม | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `wila` | `deepbeat` ย้ำจังหวะ | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |
| `wila` | `echofoot` ก้าวสะท้อน | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | ศัตรู 1 ตัว (ตรวจซ้ำตอน commit) | ศัตรูที่โดนจริง (เส้นเดียว) |
| `wila` | `closingstep` ก้าวปิดท้าย | procedural (dance) — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง) | วาด `saint-dance-fx` | พันธมิตร 1 คน | พันธมิตรที่ได้ cooldown จริงเท่านั้น |

## ศัตรู: identity × intent / phase

| identity | ท่า (kind) | ท่าร่างกาย | VFX | เป้า | จุดเกิดผล | encounter |
| --- | --- | --- | --- | --- | --- | --- |
| `brute` | Rift Bolt (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | veil-siege |
| `brute` | Crushing Blow (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | veil-siege |
| `foe_captain` | Crushing Blow (physical) | sprite `move2` 0,5,6 → 7,8,0 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | vanguard-captain |
| `foe_captain` | War Cry (energy) | sprite `move1` 0,1,2 → 3,4,0 | วาด `boss-signature-fx` | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | vanguard-captain |
| `foe_captain` | Call the Hunt (phase) | sprite `move3` 0,9,10 → 11,12,0 | วาด `boss-signature-fx` | ตัวเอง + กำลังเสริมที่ปรากฏจริง | ตำแหน่งตัวที่ถูกเรียกจริง | vanguard-captain |
| `foe_dew_slime` | Jelly Bounce (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | bat-swarm, slime-nest, slime-pair |
| `foe_ember_slime` | Ember Spark (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | slime-nest, slime-pair |
| `foe_golem` | Crystal Fist (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | crystal-stampede |
| `foe_golem` | Stone Fist (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | mini-veil-golem |
| `foe_golem` | Veil Quake (physical) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | เท้าศัตรู → พื้นใต้ผู้รับจริง | mini-veil-golem |
| `foe_hunter` | Raking Slash (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | first-clash, vanguard-captain |
| `foe_hunter` | Shadow Knife (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | โค้ด `generic-code` — ท่าพลังงานทั่วไป: เส้น+แกนวาดด้วยโค้ด | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | เส้น+แกนพลังงานถึงผู้รับจริง (วาดด้วยโค้ด) | first-clash, vanguard-captain |
| `foe_juggernaut` | Horn Charge (physical) | sprite `move1` 0,1,2 → 3,4,0 | วาด `boss-signature-fx` | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | crystal-stampede |
| `foe_juggernaut` | Shard Burst (energy) | sprite `move2` 0,5,6 → 7,8,0 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | crystal-stampede |
| `foe_matriarch` | Thorn Bloom (energy) | sprite `move4` 0,13,14 → 15,16,0 | วาด `boss-signature-fx` | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | elite-briar-lord, thicket-ambush |
| `foe_matriarch` | Briar Lash (physical) | sprite `move2` 0,5,6 → 7,8,0 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | elite-briar-lord, thicket-ambush |
| `foe_matriarch` | Thorn Storm (energy) | sprite `move4` 0,13,14 → 15,16,0 | วาด `boss-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | elite-briar-lord |
| `foe_matriarch` | Gather Thorns (energy/charge) | sprite `move3` 0,9,10 → 11,12,0 | วาด `boss-signature-fx` | ตัวเอง (รวมพลัง ไม่มี damage) | ตัวบอส + ค้างจนปล่อยท่า | elite-briar-lord |
| `foe_matriarch` | Thorn Tempest (energy) | sprite `move1` 0,1,2 → 3,4,0 | วาด `boss-signature-fx` | ฮีโร่ทุกคนที่ยืนอยู่ | ฮีโร่ที่โดนจริงทุกคน | elite-briar-lord |
| `foe_matriarch` | Thorn Rage (phase) | sprite `move5` 0,17,18 → 19,20,0 | วาด `boss-signature-fx` | ตัวเอง + กำลังเสริมที่ปรากฏจริง | ตัวบอส | elite-briar-lord |
| `foe_mycon` | Spore Hex (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | thicket-ambush |
| `foe_rift_channeler` | Rift Bolt (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | rear-ambush |
| `foe_rift_channeler` | Rift Beam (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | channeler-wisps, rift-host |
| `foe_rift_wisp` | Star Flame (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | channeler-wisps, crawler-pack, rift-host, rift-warden |
| `foe_riftweaver` | Rune Lash (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | rear-ambush |
| `foe_riftweaver` | Ribbon Snare (physical) | sprite `snare` 22,23,24,25 → 26,27,28,29 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | rear-ambush |
| `foe_riftweaver` | Rift Needle (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | mini-veil-golem |
| `foe_ruin_bat` | Nip (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | bat-swarm, slime-nest, tusker-bats |
| `foe_sentinel` | Crushing Blow (physical) | sprite `move3` 0,9,10 → 11,12,0 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | rift-warden |
| `foe_sentinel` | Rift Bolt (energy) | sprite `move4` 0,13,14 → 15,16,0 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | rift-warden |
| `foe_sentinel` | Raking Slash (physical) | sprite `move2` 0,5,6 → 7,8,0 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | rift-warden |
| `foe_sentinel` | Rift Gathering (energy/charge) | sprite `move5` 0,17,18 → 19,20,0 | วาด `boss-signature-fx` | ตัวเอง (รวมพลัง ไม่มี damage) | ตัวบอส + ค้างจนปล่อยท่า | rift-warden |
| `foe_sentinel` | Rift Cataclysm (physical) | sprite `move1` 0,1,2 → 3,4,0 | วาด `boss-signature-fx` | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | rift-warden |
| `foe_sentinel` | Rift Wave (energy) | sprite `move4` 0,13,14 → 15,16,0 | วาด `boss-signature-fx` | ฮีโร่ทุกคนที่ยืนอยู่ | ฮีโร่ที่โดนจริงทุกคน | rift-warden |
| `foe_sentinel` | Call the Rift (phase) | sprite `move7` 0,25,26 → 27,28,0 | วาด `boss-signature-fx` | ตัวเอง + กำลังเสริมที่ปรากฏจริง | ตำแหน่งตัวที่ถูกเรียกจริง | rift-warden |
| `foe_sentinel` | Rift Awakening (phase) | sprite `move6` 0,21,22 → 23,24,0 | วาด `boss-signature-fx` | ตัวเอง (เปลี่ยนช่วง) | ตัวบอส | rift-warden |
| `foe_shard_crawler` | Crystal Stab (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | crawler-pack, rift-host, rift-warden |
| `foe_spore_puff` | Spore Dust (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | beetle-spore, beetle-wall, elite-briar-lord, elite-tusk-chief, forest-swarm, stalker-spore |
| `foe_sprite` | Seed Spark (energy) | sprite `attack` 1,2,3,4 → 5,6,7,8 | วาด `foe-signature-fx` | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | elite-tusk-chief, scout-patrol |
| `foe_stalker` | Thorn Pounce (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | elite-briar-lord, shadow-stalker, stalker-spore |
| `foe_thorn_beetle` | Thorn Bite (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | beetle-spore, beetle-wall, forest-swarm, thicket-ambush |
| `foe_tusker` | Tusk Charge (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | elite-tusk-chief, rift-whelp, tusker-bats |
| `foe_tusker` | Stampede (physical) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `boss-signature-fx` | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ผู้รับ damage จริง | elite-tusk-chief |
| `foe_vargoth_guard` | Rift Bolt (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | วาด `foe-signature-fx` | ฮีโร่ช่อง 3 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว) | first-clash |
| `foe_vargoth_guard` | Crushing Blow (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | first-clash |
| `foe_vargoth_guard` | Shield Smash (physical) | sprite `bash` 24,25,26,27 → 28,29,30,31 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | vanguard-captain |
| `foe_vargoth_guard` | Mace Swing (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 1 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | vanguard-captain |
| `raider` | Raking Slash (physical) | sprite `attack` 1,2,3,4 → 5,6,7,8 | ชุดร่วม `blade-fx` — ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ) | ฮีโร่ช่อง 2 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | ตัวผู้รับ damage จริง (ชุดดาบร่วม) | veil-siege |
| `raider` | Shadow Knife (energy) | sprite `skill` 9,10,11,12 → 13,14,15,16 | โค้ด `generic-code` — ท่าพลังงานทั่วไป: เส้น+แกนวาดด้วยโค้ด | ฮีโร่ช่อง 4 (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ) | เส้น+แกนพลังงานถึงผู้รับจริง (วาดด้วยโค้ด) | veil-siege |

## งานค้างที่รู้อยู่แล้ว (สร้างจากตาราง)

- ท่าร่างกาย procedural 14 แถว: `thiran`, `wila` — OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง)
- VFX วาดด้วยโค้ดโดยตั้งใจ 4 แถว: `mira` โจมตี, `toma` โจมตี, `foe_hunter` Shadow Knife, `raider` Shadow Knife
