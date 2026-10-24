# ตารางครอบคลุมสกิลและเอฟเฟกต์ — เฟส 0

ต้นทาง c6efee7623d58064ad813cd23cd40223bcca9d24; 10 อาชีพ / 31 actions / 20 intent variants (kind+name) / 23 event types.

ข้อมูลชื่อ/เจ้าของ/target มาจาก content และ resolver จริง ส่วน family/เวลา/เสียง/fallback เป็นข้อเสนอ ยังไม่พัฒนา visualKind เป็นภาษาภาพ ไม่ใช่การเพิ่มประเภท damage ในกติกา

## แอ็กชันทั้งหมด

| ID / ชื่อ | อาชีพ / ปลดล็อก | เป้าหมายจริง | family ที่เสนอ | เวลา ms |
| --- | --- | --- | --- | --- |
| attack / โจมตี | Knight:base, Duelist:base, Mage:base, Priest:base, Archer:base, Alchemist:base, Scout:base, Warden:base, Bard:base, Spear:base | enemy | weapon-contact | 600 |
| guard / ตั้งรับแทน | Knight:base | ally | guard-link | 500 |
| bash / กระแทกโล่ | Knight:base | enemy | shield-bash | 800 |
| mark / ติดตรา | Duelist:base | enemy | mark-seal | 500 |
| execute / ฟันเจาะจุด | Duelist:base | enemy | precision-slash | 850 |
| bolt / ศรเวท | Mage:base | enemy | arcane-projectile | 850 |
| ward / โล่เวท | Mage:base | ally | hex-barrier | 650 |
| heal / รักษา | Priest:base | ally | mint-heal | 650 |
| prayer / พรฟื้นฟู | Priest:base | party | party-heal | 700 |
| brace / ตั้งทวน | Spear:base | self | spear-stance | 500 |
| pierce / แทงทะลวง | Spear:base | enemy | spear-thrust | 800 |
| hinder / ยิงสกัด | Archer:base | enemy | arrow-delay | 750 |
| volley / ห่าธนู | Archer:base | enemies | arrow-volley | 900 |
| acid / ขวดกรด | Alchemist:base | enemy | acid-flask | 800 |
| haste / ยาเร่ง | Alchemist:base | ally | haste-tonic | 550 |
| ambush / จู่โจมก่อน | Scout:base | enemy | shadow-strike | 750 |
| evade / ก้าวเงา | Scout:base | self | shadow-step | 500 |
| taunt / ยั่วยุ | Warden:base | self | challenge-rune | 550 |
| slam / ทุบค้อนรูน | Warden:base | enemy | hammer-slam | 850 |
| valor / เพลงกล้า | Bard:base | self | valor-notes | 600 |
| mend / เพลงฟื้น | Bard:base | self | mending-notes | 600 |
| rally / ตั้งรับหมู่ | Knight:star3 | self | party-guard | 700 |
| finisher / ปลิดชีพ | Duelist:star3 | enemy | finishing-lunge | 950 |
| sigil / ตรึงเวท | Mage:star3 | enemy | sigil-bind | 850 |
| sanctuary / พรคุ้มภัย | Priest:star3 | ally | sanctuary-seal | 750 |
| spearwall / กำแพงทวน | Spear:star3 | self | spear-wall | 700 |
| weakshot / ศรจุดอ่อน | Archer:star3 | enemy | weakpoint-arrow | 850 |
| bomb / ขวดระเบิด | Alchemist:star3 | enemies | blast-flask | 900 |
| backstab / ลอบแทง | Scout:star3 | enemy | backstab-shadow | 900 |
| quake / ทุบปฐพี | Warden:star3 | enemy | earthshaker | 1000 |
| finale / บทสุดท้าย | Bard:star3 | self | finale-wave | 950 |

Fallback ทุกแถว: support ใช้ไอคอนผู้รับและข้อความเหตุการณ์; damage ใช้เส้นจากผู้กระทำถึงเป้าจริงพร้อมจุดปะทะ ตัวเลขและผลรองต้องมาจาก events ทุก asset ยัง not-produced รายละเอียด cue และเงื่อนไขอยู่ใน coverage.json และสเปกเฟส 0

## ท่าศัตรูทั้งหมด

| ชื่อ | kind จริง | ใช้ใน encounter | family / เวลาเสนอ | บอส override |
| --- | --- | --- | --- | --- |
| Raking Slash | physical | first-clash, veil-siege, rift-warden | enemy-weapon-contact / 800 | rift-warden: warden-raking-slash / 1200 |
| Rift Bolt | energy | first-clash, veil-siege, rear-ambush, rift-warden | enemy-energy-projectile / 800 | rift-warden: warden-rift-bolt / 1200 |
| Crushing Blow | physical | first-clash, veil-siege, rift-warden | enemy-heavy-contact / 800 | rift-warden: warden-heavy-slam / 1200 |
| Shadow Knife | energy | first-clash, veil-siege | enemy-energy-projectile / 800 | ไม่มี |
| Seed Spark | energy | scout-patrol, elite-tusk-chief | enemy-energy-projectile / 800 | ไม่มี |
| Tusk Charge | physical | rift-whelp, elite-tusk-chief | enemy-weapon-contact / 800 | ไม่มี |
| Spore Hex | energy | thicket-ambush | enemy-energy-projectile / 800 | ไม่มี |
| Thorn Bloom | energy | thicket-ambush, elite-briar-lord | enemy-energy-projectile / 800 | ไม่มี |
| Briar Lash | physical | thicket-ambush, elite-briar-lord | enemy-weapon-contact / 800 | ไม่มี |
| Thorn Pounce | physical | shadow-stalker, elite-briar-lord | enemy-weapon-contact / 800 | ไม่มี |
| Rune Lash | energy | rear-ambush | enemy-energy-projectile / 800 | ไม่มี |
| Ribbon Snare | physical | rear-ambush | enemy-weapon-contact / 800 | ไม่มี |
| Crystal Fist | physical | crystal-stampede | enemy-weapon-contact / 800 | ไม่มี |
| Horn Charge | physical | crystal-stampede | enemy-weapon-contact / 800 | ไม่มี |
| Shard Burst | energy | crystal-stampede | enemy-energy-projectile / 800 | ไม่มี |
| Stampede | physical | elite-tusk-chief | enemy-weapon-contact / 800 | ไม่มี |
| Thorn Storm | energy | elite-briar-lord | enemy-energy-projectile / 800 | ไม่มี |
| Rift Needle | energy | mini-veil-golem | enemy-energy-projectile / 800 | ไม่มี |
| Stone Fist | physical | mini-veil-golem | enemy-weapon-contact / 800 | ไม่มี |
| Veil Quake | physical | mini-veil-golem | enemy-weapon-contact / 800 | ไม่มี |

Fallback ทุกแถว: เชื่อมต้นทางถึง resolved target และอ่าน Guard/Dodge/Barrier/Cancel จริง ไม่สร้าง AoE จากชื่อท่า; cue prepare/travel/contact, ผลรองตาม events และ asset ทุกแถวยัง not-produced

## เหตุการณ์ทั้งหมด

| Event | family ที่เสนอ | cue | fallback |
| --- | --- | --- | --- |
| damage | contact-number-hp | contact | actual-target-icon-and-event-text; exact-values-only |
| guard | guard-link | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| mark | mark-seal | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| barrier | barrier-gain | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| heal | hp-restoration | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| interrupt | intent-break | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| cancel | canceled-action | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| down | fall-or-dissolve | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| outcome | result-transition | after-final-reaction | actual-target-icon-and-event-text; exact-values-only |
| brace | spear-stance | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| counter | return-strike | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| delay | queue-delay | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| corrode | acid-status | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| haste | haste-status | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| evade | evasion-ready | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| dodge | miss-afterimage | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| taunt | challenge-link | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| song | song-state | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| rally | party-guard | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| sigil | sigil-status | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| sanctuary | survival-seal | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| stand | last-stand | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |
| finale | song-finale | at-authoritative-event-order | actual-target-icon-and-event-text; exact-values-only |

ชนิด event อย่างเดียวไม่ระบุว่าเป็นพลัง boss/set/passive ใด ห้ามเดา provenance จากข้อความ log รายการ passive/talent/gear ใช้เป็นเงื่อนไขเพิ่ม feedback เมื่อพิสูจน์แหล่งได้ ไม่เพิ่ม event หรือกติกาปลอม

## คำอธิบายสกิลจากระบบจริง

### attack — โจมตี

โจมตีศัตรู 10 กำจัดผู้โจมตีได้ก็หยุดการโจมตีของมัน

### guard — ตั้งรับแทน

เอกิสรับการโจมตีแทนคนที่ศัตรูเล็ง ลดความเสียหาย 65% ปัดความเสียหายที่เหลือขึ้น แล้วใช้โล่ก่อนเลือด ป้องกันการโจมตีศัตรูถัดไปที่แสดงไว้ หมดเมื่อรับการโจมตีหรือถึงเทิร์นเอกิสอีกครั้ง

### bash — กระแทกโล่

โจมตี 18 และหยุดเทิร์นถัดไปของเป้าหมายหากการโจมตีนั้นเป็นกายภาพ พลังงานยังโจมตีต่อได้ ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### mark — ติดตรา

ยังไม่ทำความเสียหาย ติดตรา 2 รอบรวมรอบนี้ เพื่อให้ไลราโจมตีหรือฟันเจาะจุดแรงขึ้น 22 (ใช้ตราหมดเมื่อโจมตี)

### execute — ฟันเจาะจุด

ฟันเจาะจุด 28 หรือ 50 เมื่อเป้าหมายติดตรา ใช้ตราหมด ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### bolt — ศรเวท

ยิงศรเวทสร้างความเสียหาย 26 ให้ศัตรูหนึ่งตัว ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### ward — โล่เวท

ให้โล่ 14 แก่เพื่อนที่ยังยืนอยู่ 1 คน โล่รับความเสียหายก่อนเลือด ไม่ซ้อนกัน อยู่จนถูกใช้หมด ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### heal — รักษา

ฟื้นเลือด 20 ให้เพื่อนที่ยังยืนอยู่ 1 คน ไม่เกินเลือดสูงสุด ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### prayer — พรฟื้นฟู

ฟื้นเลือดคนละ 10 ให้ทุกคนที่ยังยืนอยู่ ไม่เกินเลือดสูงสุด ไม่ชุบชีวิต ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### brace — ตั้งทวน

ตั้งทวนรอ เมื่อศัตรูโจมตีกายภาพใส่เพื่อนแนวหน้าคนใดก็ได้ (รวมตัวเอง) ครั้งแรก จะแทงสวนกลับ 14 หลังโดนตี อยู่จนสวนแล้วหรือถึงเทิร์นของตัวเองอีกครั้ง พลังงานไม่ทำให้สวน ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### pierce — แทงทะลวง

แทงทะลวงสร้างความเสียหาย 22 ให้ศัตรูหนึ่งตัว ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### hinder — ยิงสกัด

ยิงสกัด 12 และเป้าหมายจะไปลงมือท้ายสุดในรอบถัดไป (ลำดับรอบนี้ไม่เปลี่ยน) ใช้ขวางศัตรูที่เร็วก่อนที่มันจะได้ตีก่อนทีม ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### volley — ห่าธนู

ยิงห่าธนูใส่ศัตรูทุกตัว ตัวละ 10 ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### acid — ขวดกรด

ปาขวดกรด 8 แล้วเป้าหมายถูกกัดกร่อน 2 รอบรวมรอบนี้ ทุกการโจมตีของทีมใส่ตัวนี้แรงขึ้น +6 ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### haste — ยาเร่ง

ให้ยาเร่งเพื่อนที่ยังยืนอยู่ 1 คน (รวมตัวเอง) รอบถัดไปคนนั้นได้ลงมือก่อนทุกคน รอบนี้ลำดับไม่เปลี่ยน ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### ambush — จู่โจมก่อน

จู่โจม 12 หรือ 24 ถ้าเป้าหมายยังไม่ได้ลงมือในรอบนี้ (ดูคิว SPD) ใช้ได้ดีกับศัตรูที่ช้ากว่า ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### evade — ก้าวเงา

ก้าวเงาเตรียมหลบ การโจมตีของศัตรูครั้งแรกที่โดนเซฟา (กายภาพหรือพลังงาน) จะพลาดทั้งหมด อยู่จนหลบแล้วหรือถึงเทิร์นของตัวเองอีกครั้ง ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### taunt — ยั่วยุ

ยั่วยุศัตรูทุกตัว ตั้งแต่ตอนนี้จนถึงเทิร์นถัดไปของแบรนน์ การโจมตีของศัตรูทุกครั้ง (กายภาพหรือพลังงาน) จะเล็งมาที่แบรนน์ และเขารับเบาลง 35% แผนโจมตีศัตรูจะแสดงเป้าใหม่ทันที ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### slam — ทุบค้อนรูน

ทุบค้อนรูนสร้างความเสียหาย 18 ให้ศัตรูหนึ่งตัว ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### valor — เพลงกล้า

บรรเลงเพลงกล้าค้างไว้ ทุกการโจมตีของทีมแรงขึ้น +4 (รวมสกิลและการสวน) จนกว่าจะเปลี่ยนเพลงหรือลิโอล้ม เล่นได้ทีละเพลง ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### mend — เพลงฟื้น

บรรเลงเพลงฟื้นค้างไว้ ทุกคนที่ยังยืนอยู่ฟื้นเลือด 5 เมื่อเริ่มแต่ละรอบใหม่ จนกว่าจะเปลี่ยนเพลงหรือลิโอล้ม เล่นได้ทีละเพลง ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### rally — ตั้งรับหมู่

ตั้งรับหมู่ เพื่อนทุกคนที่ยังยืนอยู่ (รวมเอกิส) ลดความเสียหาย 35% จากการโจมตีครั้งแรกที่โดน จนถึงเทิร์นถัดไปของเอกิส ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### finisher — ปลิดชีพ

ปลิดชีพ 16 หรือ 32 ถ้าเลือดศัตรูต่ำกว่า 40% ไม่ใช้ตรา ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### sigil — ตรึงเวท

ตรึงเวท 8 และยกเลิกท่าพลังงานครั้งถัดไปของเป้าหมาย ท่ากายภาพยังโจมตีตามปกติ (กระแทกโล่ใช้หยุดกายภาพ) ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### sanctuary — พรคุ้มภัย

อวยพรเพื่อนที่ยังยืนอยู่ 1 คน (รวมตัวเอง) เลือดจะไม่ลดต่ำกว่า 1 จนถึงเทิร์นถัดไปของเซเรน ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### spearwall — กำแพงทวน

ตั้งกำแพงทวน ทุกครั้งที่ศัตรูโจมตีกายภาพใส่เพื่อนแนวหน้า (รวมตัวเอง) จะโดนแทงสวน 8 จนถึงเทิร์นถัดไปของการ์แรน ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### weakshot — ศรจุดอ่อน

ยิงศรจุดอ่อน 16 หรือ 28 ถ้าเป้าหมายถูกยิงสกัดเลื่อนเทิร์นอยู่ ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### bomb — ขวดระเบิด

ปาขวดระเบิดใส่ศัตรูทุกตัว ตัวละ 10 ตัวที่ถูกกัดกร่อนอยู่โดนแรงขึ้นตามโบนัสกรด ใช้แล้วพร้อมอีกครั้งใน 3 รอบ

### backstab — ลอบแทง

ลอบแทง 20 ใส่ศัตรูที่ไม่ได้เล็งเซฟาในท่าถัดไป (ดูเป้าที่ศัตรูประกาศ) ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### quake — ทุบปฐพี

ทุบปฐพี 14 หรือ 24 ถ้าท่าถัดไปของเป้าหมายเล็งแบรนน์อยู่ (เข้าคู่กับยั่วยุ) ใช้แล้วพร้อมอีกครั้งใน 2 รอบ

### finale — บทสุดท้าย

จบเพลงที่บรรเลงอยู่แล้วปล่อยพลังทันที: เพลงกล้า = โจมตีศัตรูทุกตัว 16 · เพลงฟื้น = ฟื้นเลือดทุกคน 12 ต้องมีเพลงของลิโอเล่นอยู่ ใช้แล้วพร้อมอีกครั้งใน 3 รอบ
