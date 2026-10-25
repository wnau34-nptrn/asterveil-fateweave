# แผนภาพท่ายูนิต — ขั้น 1: สำรวจและกำหนดขอบเขต

วันที่ 2026-10-25 · ผู้ใช้อนุญาตเฉพาะขั้นแรกของแผน animation ทั้งสองฝ่าย

## ฐานที่ตรวจ

- เกม: `feature/fateweave-initial-prototype` ที่ `e79e8a4ebb51f33c1d79c88fa6fc35828185a6c1` (C12 Batch 1)
- เทียบงาน VFX แยก: `codex/vfx-family-1-blade` ที่ `91572e16c0e72fe177fa7f1348e9e3ce727d3c21`; ไม่ถือว่างานใน branch นี้ merge หรือผ่านการตรวจภาพแล้ว
- `main` มีเพียง README ไม่ใช่ฐานเกม; งานใหม่นี้อยู่ใน `codex/unit-animation-audit`
- ตรวจ `team.ts`, `mercenaries.ts`, `roster-batch1.ts`, `talents.ts`, `core/battle/types.ts`, enemy species/veilbound, encounter catalog/veil-siege, `visuals/assets.ts`, `BattleScene.ts`, `battle-playback.ts` และกติกา presentation ใน SYSTEMS_REFERENCE

## สิ่งที่มีและช่องว่าง

เกมใช้ Phaser 4.2.1 ภาพ battle unit เป็น `add.image` หนึ่งเฟรมต่อ art key; มี breathing/active bob, ขยับประชิด 14px, recoil และคืนตำแหน่ง แต่ยังไม่มีภาพเปลี่ยนท่าแขนขาโจมตีหรือร่าย แผ่น lobby pose/NPC animation ไม่ใช่ชุด battle action

`BattlePlayback` และ `stageTiming` มี contact/end และจัดการยกเลิกอยู่แล้ว รวม timing ของ Saint/Dancer จึงไม่ต้องสร้างนาฬิกาต่อสู้ใหม่

Bolt/Execute/Ward มี painted VFX ในฐานเกม; blade branch มี atlas/module ของ 10 ท่า และใช้ physical enemy events เป็น attack effect ได้ แต่ยังเป็น VFX ไม่ใช่ sprite animation ของผู้โจมตี ไม่ผลิตซ้ำและไม่รวมทั้ง branch เก่าทับฐาน C12

พบจุดต้องแก้ภายหลัง: `prepare()` มี early return สำหรับ VFX เฉพาะบางสกิล จึงต้องเริ่มท่ายูนิตก่อน dispatch VFX; `attack` ร่วมกันหลายอาชีพไม่ควรแปลว่าใช้ดาบเสมอ และ `intent.kind` บอกประเภทดาเมจ ไม่พอระบุท่าของสัตว์/แมลง/ผู้ร่าย

## ตารางฝ่ายเรา

ทุกแถวต้องรองรับ `idle`, `hit`, `down`, คืนท่า และท่าสำรองจากภาพเดิม; `attack` มีทุกตัวและต้องเลือกจากอาชีพ/อาวุธ สกิลด้านล่างรวมต้นไม้และ unlock แล้ว ไม่ได้หมายความว่าใส่พร้อมกันทั้งหมด ท่าในคอลัมน์สุดท้ายเป็นข้อเสนอด้านภาพ ไม่เปลี่ยนกติกาสกิล

| ID | ชื่อ | อาชีพ | กลุ่มท่าใหม่ | สกิลนอกเหนือ attack |
|---|---|---|---|---|
| `guardian` | Aegis | Knight | sword / shield | `guard`, `bash`, `challenge`, `bulwark`, `rally`, `rouse` |
| `tracer` | Lyra | Duelist | slash / thrust / parry | `mark`, `execute`, `finisher`, `parry`, `lunge`, `sweep` |
| `weaver` | Eira | Mage | cast / channel | `bolt`, `ward`, `sigil`, `storm`, `aegis`, `dispel` |
| `healer` | Seren | Priest | cast / blessing | `heal`, `prayer`, `sanctuary`, `revive`, `halo`, `bless` |
| `garran` | Garran | Spear | thrust / brace | `brace`, `pierce`, `spearwall`, `hold`, `halt`, `warcry` |
| `mira` | Mira | Archer | bow draw / release | `hinder`, `volley`, `weakshot`, `disengage`, `pin`, `track` |
| `toma` | Toma | Alchemist | throw / offer tonic | `acid`, `haste`, `bomb`, `smoke`, `fury`, `catalyst` |
| `sefa` | Sefa | Scout | dagger / throw / evade | `ambush`, `evade`, `backstab`, `knives`, `decoy`, `disarm` |
| `brann` | Brann | Warden | hammer / ground slam / stance | `taunt`, `slam`, `quake`, `stonearmor`, `guardstone`, `tremor` |
| `lio` | Lio | Bard | play / release note | `valor`, `mend`, `finale`, `dread`, `note`, `solo` |
| `metta` | Metta | Saint | punch / sweep / communion | `saintstrike`, `communion`, `saintarc`, `vowstrike`, `sharewound`, `lastlight` |
| `thiran` | Thiran | Saint | punch / sweep / communion | `saintstrike`, `communion`, `saintarc`, `vowstrike`, `sharewound`, `lastlight` |
| `lalin` | Lalin | Dancer | step / turn / gesture | `cadence`, `duet`, `rounddance`, `deepbeat`, `echofoot`, `closingstep` |
| `wila` | Wila | Dancer | step / turn / gesture | `cadence`, `duet`, `rounddance`, `deepbeat`, `echofoot`, `closingstep` |

ครบ 14 ตัวละคร / 12 อาชีพ / 73 ActionId ที่ฐานนี้ใช้อยู่ (นับ attack ครั้งเดียว) สองตัวในอาชีพเดียวกันใช้ recipe ร่วมกันได้ แต่ภาพและ silhouette ต้องเป็นของแต่ละตัว ไม่ใช้แค่เปลี่ยนสีแทน

## ตารางศัตรูตาม art key

ศัตรูใช้ ID ช่อง `f1/f2/b1/b2` ซ้ำข้าม encounter จึงห้ามใช้ slot ID เป็น animation identity เลือกภาพผ่าน `artOf(encounter,id)` แล้วใช้ intent ประกอบ รวมบอส/elite ที่ใช้ภาพเดียวกันเป็นหนึ่งชุดภาพ แต่อาจมีหลายท่า

| Art key | กลุ่มท่าที่ต้องสร้าง |
|---|---|
| `raider` | ฟัน / ขว้างมีดเงา |
| `brute` | ทุบ / ปล่อยเวท |
| `foe_tusker` | ก้มเตรียม / พุ่งชน / กระทืบ |
| `foe_sprite` | ลอยรวบรวมพลัง / ปล่อยเมล็ด |
| `foe_stalker` | ย่อตัว / กระโจน |
| `foe_mycon` | รวบรวมสปอร์ / ปล่อยคำสาป |
| `foe_golem` | ง้างหมัด / ทุบพื้น |
| `foe_riftweaver` | สะบัดสายพลัง / ร่าย |
| `foe_matriarch` | ฟาดเถาวัลย์ / รวบรวมหนาม / ปล่อยเวท |
| `foe_juggernaut` | เตรียมเขา / พุ่ง / ปล่อยผลึก |
| `foe_sentinel` | ทุบ / ฟัน / รวบรวม / ปล่อยเวทหมู่ |
| `foe_hunter` | ฟัน / ขว้างมีดเงา |
| `foe_captain` | ทุบ / คำราม |
| `foe_dew_slime` | ยุบ / เด้งชน |
| `foe_ember_slime` | พอง / ปล่อยประกาย |
| `foe_ruin_bat` | กระพือ / โฉบกัด |
| `foe_vargoth_guard` | กระแทกโล่ / เหวี่ยงอาวุธ / ร่ายเมื่อ encounter ใช้เวท |
| `foe_thorn_beetle` | ก้ม / กัด |
| `foe_spore_puff` | พอง / ปล่อยสปอร์ |
| `foe_rift_channeler` | รวบรวม / ปล่อยลำแสง |
| `foe_rift_wisp` | ลอย / ปล่อยเปลวพลัง |
| `foe_shard_crawler` | ง้างขา / แทงผลึก |

ครบ 22 enemy art keys ใน runtime atlas รวม legacy raider/brute ไม่ใช่จำนวน encounter หรือจำนวนศัตรูบนสนาม ภาพบอสอนาคตที่อยู่ใน art branches ยังไม่ใช่ runtime scope นี้

### คลัง intent ที่พบ

ตรวจชื่อ+kind จาก species และ encounter definitions ลดรายการซ้ำที่ต่างเพียงเป้าหมาย/ดาเมจ เหลือ 36 คู่ ข้อมูลนี้ใช้ทำ mapping ในขั้น 2 ไม่ใช้ข้อความชื่ออย่างเดียวเป็นตัวตัดสิน outcome

| Intent name | Kind | ท่าเริ่มต้น |
|---|---|---|
| Briar Lash | physical | physical ตาม art key |
| Crushing Blow | physical | physical ตาม art key |
| Crystal Fist | physical | physical ตาม art key |
| Crystal Stab | physical | physical ตาม art key |
| Ember Spark | energy | cast/release |
| Gather Thorns | energy | charge/channel |
| Horn Charge | physical | physical ตาม art key |
| Jelly Bounce | physical | physical ตาม art key |
| Mace Swing | physical | physical ตาม art key |
| Nip | physical | physical ตาม art key |
| Raking Slash | physical | physical ตาม art key |
| Ribbon Snare | physical | physical ตาม art key |
| Rift Beam | energy | cast/release |
| Rift Bolt | energy | cast/release |
| Rift Cataclysm | physical | physical ตาม art key |
| Rift Gathering | energy | charge/channel |
| Rift Needle | energy | cast/release |
| Rift Wave | energy | cast/release |
| Rune Lash | energy | cast/release |
| Seed Spark | energy | cast/release |
| Shadow Knife | energy | cast/release |
| Shard Burst | energy | cast/release |
| Shield Smash | physical | physical ตาม art key |
| Spore Dust | energy | cast/release |
| Spore Hex | energy | cast/release |
| Stampede | physical | physical ตาม art key |
| Star Flame | energy | cast/release |
| Stone Fist | physical | physical ตาม art key |
| Thorn Bite | physical | physical ตาม art key |
| Thorn Bloom | energy | cast/release |
| Thorn Pounce | physical | physical ตาม art key |
| Thorn Storm | energy | cast/release |
| Thorn Tempest | energy | cast/release |
| Tusk Charge | physical | physical ตาม art key |
| Veil Quake | physical | physical ตาม art key |
| War Cry | energy | cast/release |

การ override ใน catalog สำคัญ: องครักษ์บาง encounter ใช้ Rift Bolt ด้วย ทั้งที่ species ปกติมีแต่ Shield Smash/Mace Swing; บอสมี charge/all/phase/unstoppable ต้องตรวจ flags จริงก่อน fallback กายภาพไม่แปลว่าต้องวิ่งประชิด (เช่นคลื่น/แผ่นดิน/เถาวัลย์) และ energy ไม่แปลว่าต้องมีธาตุ

## ข้อกำหนดภาพและปริมาณงาน

เสนอ sprite sheet เป็นทางหลักรอบแรก ใช้ภาพต้นฉบับของเกมเป็น reference พื้นโปร่งใส ไม่มี UI/ฉาก/รอยฟัน baked ลงในเฟรม รอยฟัน กระสุน และแสงยังเป็น VFX แยก

- คง 512×512 logical cell เป็นจุดเริ่มต้น ตำแหน่งเท้า/จุดลอย ขนาดตัว อาวุธ และแสงต้องคงที่ทุกเฟรม; ห้ามยืดหรือจัดกึ่งกลางทีละเฟรมจนตัวกระโดด
- atlas JSON ระบุ frame, origin, contact marker, bounds และทิศตั้งต้น; รักษา mirroredArt/foot origins เดิมจนมีข้อมูลใหม่รองรับ ไม่ flip ข้อความ/HP ตามตัว
- ท่าร่วมด้านสถานะ: idle ใช้ภาพเดิมก่อน, hit 2 เฟรม, down 3 เฟรม; evade/block/cancel ใช้ procedural fallback ก่อน ส่วน revive คืน standing จาก event จริง
- ต่อยูนิต pilot: attack 8 เฟรม + skill 8 + hit 2 + down 3 = **21 เฟรมใหม่**; idle เดิมไม่รวม รวม pilot 2 ตัว = **42 เฟรมใหม่** เป็นงบเสนอ ไม่ใช่ภาพที่ผลิตแล้ว
- หากขยายขั้นต่ำแบบนี้ครบ 36 art identities จะเป็น 756 เฟรมใหม่ แต่ไม่ใช่งบสุดท้าย: บอสหลายท่าและสกิลเฉพาะต้องเพิ่ม; recipe ร่วมลดงานโค้ด ไม่ได้ทำให้ภาพของแต่ละตัวใช้แทนกันได้
- โหลดเฉพาะยูนิตที่ใช้ใน encounter, ตรวจ memory หลัง decode และคุณภาพจริงที่ 390px ก่อนกำหนด atlas compression/ขนาด texture สุดท้าย

## คู่ pilot และลำดับงานถัดไป

1. **Lyra (`tracer`) + Vargoth Hunter (`foe_hunter`)**: โครงร่างมนุษย์และท่าฟันเทียบกันง่าย ฝ่ายเราใช้ attack/execute ฝ่ายศัตรูใช้ Raking Slash/Shadow Knife (มีท่าปล่อยมีดสำหรับช่อง skill 8 เฟรม) เชื่อม Execute เดิมและ blade เฉพาะส่วนที่เข้ากันได้ ไม่ถือว่า blade ผ่านภาพแล้ว
2. **Eira (`weaver`) + Dandelion Sprite (`foe_sprite`)**: ทดสอบ cast/release, Bolt/Seed Spark พร้อมจุดยึดของตัวลอย ไม่ฝืนใช้ rig มนุษย์ให้ภูต
3. ขยาย Knight/Spear/Scout → Archer/Alchemist → Warden/Bard → Saint/Dancer/Priest และศัตรูที่เหลือ; บอสทำ mixed physical/energy/charge/phase หลังระบบหลักนิ่ง

ขั้น 2 ทำ controller และ mapping/fallback ก่อน; ขั้น 3 จึงผลิต 42 เฟรมของคู่ประชิด ไม่สร้างภาพทั้งกองในขั้นสำรวจนี้

## สัญญาการเชื่อมและการตรวจรับขั้น 2–3

- แยก presentation controller ที่เสนอ `src/game/visuals/unit-animation.ts` และ mapping/manifest ออกจาก VFX (ยังไม่สร้างไฟล์ runtime ในขั้นนี้)
- ลำดับเริ่ม actor pose → prepare VFX → contact ที่เวลาเดิม → คืนท่าภายใน end เดิม; metadata contact frame ถูกปรับตาม stageTiming ไม่เพิ่มหรือเลื่อน damage cue
- ActorId คือผู้เริ่มท่า แต่ recipients อ่าน resolved events เพื่อรองรับ Guard/counter/reflect/AoE; cancelled turn ไม่เล่นโจมตีสำเร็จ ไม่มี HP damage ไม่เล่น hit recoil
- เล่น counter ของผู้สวนแม้อยู่ enemy stage และไม่ล้มทับการ revive; จำกัด hit/down ตาม authoritative before/after ไม่สร้าง HP state จาก animation
- pause idle tween ขณะ action, กลับ depth/scale/position/tint/flip/frame อย่างถูกต้อง; แยก body/visual จาก stationary hit targets และ HP/text
- skip/load/hidden-tab/resize/shutdown ยกเลิกและ settle งานค้าง ไม่เพิ่มคำสั่งหรือเล่นเสียงซ้ำ; settings เปลี่ยนตาม stage boundary และ OS reduced-motion settle ทันทีตามพฤติกรรมเดิม
- ตรวจ normal/fast, standard/reduced intensity และ OS reduced-motion แยกกัน; ภาพ fallback ต้องมีเมื่อ asset ขาด
- หลักฐานขั้น 3: คลิป 390px ของทั้งสองฝ่าย โจมตี/สกิล/hit/dodge/block/guard/cancel/down พร้อม unit tests ของ mapping/cancellation และ browser gameplay ที่เกี่ยวข้อง ไม่อ้างว่า Chromium emulation ทดสอบ iOS จริง

## ผลส่งมอบขั้นแรก

ตาราง identity ครบ, ActionId ครบ, intent inventory, สถานะ branch/VFX, รายการภาพและงบ pilot, จุดเชื่อมระบบ และเกณฑ์ตรวจรับพร้อมแล้ว ขั้นนี้เป็นเอกสารเท่านั้น ไม่มีการแก้ gameplay/save/balance, ไม่มี sprite ใหม่หรือคลิปใหม่ และไม่ได้อนุมัติภาพ C5 แทนเจ้าของ
