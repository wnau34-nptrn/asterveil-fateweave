# AV06 VFX ท่าเด่นของศัตรูทั่วไป 10 ท่า — runtime จริง รอเจ้าของตรวจ motion

29 ตุลาคม 2026 · branch `claude/av06-foe-signature-vfx` · ภาพจาก art PR #105 (`art/art-vfx-foe-signature-001` @ `77bf592`, `incoming/ART-VFX-FOE-SIGNATURE-001/`)

[หน้าเลือกคลิป](index.html) · [แพ็ก atlas](../../../incoming/ART-VFX-FOE-SIGNATURE-001/atlas.py) · [โมดูล](../../../src/game/visuals/foe-signature-fx.ts)

**สถานะ: ยังไม่ได้รับ motion approval จากเจ้าของ** — เทสต์ผ่านไม่ใช่การอนุมัติภาพ ต้องให้เจ้าของดูคลิปก่อน merge

## แหล่งที่มา / การตรวจ

- `build_handoff.py --verify` ผ่าน (67 ไฟล์, decode PNG 60 ไฟล์); `atlas.py` ตรวจ sha256 ทั้ง 40 เลเยอร์กับ `layers.json` และ alpha bbox ก่อนแพ็ก
- ท่าละ 1 final (ไม่มีตัวเลือก R1/R2): prepare, peak-travel, peak-impact, settle
- atlas `public/assets/fx/foe_signature_fx.webp/json` 1024×1804 lossless trimmed (sourceSize 256) — 1,872,714 B ดาวน์โหลด, **7.05 MiB decoded** (sha256 `4bdc8b1e…6eea`); pivot/bounds ใน `src/game/visuals/foe-signature-art.json` ที่มา sha รายเลเยอร์ใน `incoming/.../production-sources.json`

## ตารางเส้นทาง (ใช้ `turn.intent.name` จริง + event จริงเท่านั้น)

| ชื่อท่าใน content | เลเยอร์ | kind | ผู้ใช้จริง |
| --- | --- | --- | --- |
| Seed Spark | seed-spark | energy | Dandelion Sprite |
| Ember Spark | ember-spark | energy | Ember Slime |
| Spore Hex | spore-hex | energy | Hollow Mycon |
| Spore Dust | spore-dust | energy | Spore Puff |
| Star Flame | star-flame | energy | Rift Wisp |
| Rune Lash | rune-lash | energy | Rift Weaver |
| Rift Needle | rift-needle | energy | Rift Weaver |
| Shard Burst | shard-burst | energy | Crystal Juggernaut |
| Rift Bolt | rift-bolt-foe | energy | Rift Channeler |
| Veil Quake | veil-quake | **physical**, พื้น | Veil Golem |

- **prepare**: ที่มือหน้า/อกของศัตรู (Veil Quake: ที่เท้า) ตาม sprite ที่เรนเดอร์จริง; ไม่บอกผลลัพธ์
- **travel**: ขวา→ซ้าย ไปยังผู้ที่ได้รับ/หลบ event `damage`/`dodge` จริงของศัตรู (Guard redirect = ฮีโร่ที่รับแทนจริง); หัวภาพนำ หางตามหลัง; ความยาวไม่เกิน ~115% ของระยะบินจริง (ไม่ต่ำกว่า 62% ของขนาดอาร์ต) เพราะศัตรูตัวใหญ่ยืนใกล้ฮีโร่
- **impact + settle**: เฉพาะผู้ที่ถูกสร้างความเสียหายจริง; เสียหาย 0 แต่ absorbed>0 = blocked (impact เล็กลง สีฟ้า cyan ไม่มี settle); **dodge = travel บินผ่านแล้วจางหาย ไม่มี impact/settle**
- `all`: หนึ่ง instance เล็กลง (×.78) ต่อผู้รับจริง; cancel = ไม่วาดอะไร (ไม่ใช้ route generic)
- Veil Quake อยู่ที่พื้น (เท้า) ไม่ยกขึ้นอก และใช้ route นี้แทน blade slash; parry counter ของฮีโร่ยังใช้ blade ตามเดิม
- ท่าบอส (Thorn*, Rift Gathering/Cataclysm/Wave, War Cry, Horn Charge, Stampede, phase/summon) **ไม่อยู่ในตาราง**
- ใน `BattleScene`: preload atlas, ใช้เมื่อ `textures.exists` (atlas พลาด = fallback เดิม), route ก่อน energy generic/blade, event ถูกเพิ่มในชุด suppress → ไม่มีวง/เส้นสแลชและไม่มี FILL ขาว (ใช้ multiply tint เดิม); normal blend ไม่ใช้ additive
- โหมด: normal/fast ใช้เวลา stage เดิม; “ลดเอฟเฟกต์” ความทึบ .74, ×.9, ไม่มี settle; OS reduced motion = ภาพ travel+impact นิ่งสั้นๆ ที่ผู้รับจริง แล้วจาง ไม่กวาดผ่านหน้า

## ผลตรวจ

- `npx tsc --noEmit`, `npm run lint` ผ่าน; `tests/foe-signature-fx.test.ts` 19 เทสต์ (routing จาก resolver จริง: ผู้รับ=target ของ event รวม Guard redirect, dodge, blocked, `all`, cancel, ทุกชื่อมีใน content และไม่ใช่ท่าบอส, hash/pivot ของ atlas)
- browser `tests/browser/foe-signature-fx.spec.ts` 17 เทสต์ผ่าน (10 ท่า prepare→travel→impact→settle→skip, Quake ที่พื้น, Guard, dodge, blocked, all, OS reduced motion)
- คลิปจริง 19 คลิป 390×844 (Chromium SwiftShader จำลอง **ไม่ใช่มือถือจริง**) ใช้ CDP timestamp จริง ไม่เร่ง ไม่แทรกเฟรม: 10 ท่า×hit, Rift Bolt guard, Seed Spark/Veil Quake dodge, Spore Hex blocked, Star Flame all, Rune Lash fast, Shard Burst ลดเอฟเฟกต์, Rift Bolt/Veil Quake OS reduce ดู [index](index.html) และ `clips.json`
- ตรวจเฟรมแล้ว: impact ตรงอกผู้รับ (Guard = Aegis), ตัวเลขดาเมจ/HP ไม่ถูกบัง, Star Flame all วาด 3 ผู้รับ

## ข้อจำกัด / ให้เจ้าของดู

- ภาพ Rift Bolt/Veil Quake เป็นสีดำ-ม่วงเข้ม ทับตัวศัตรูสีเข้ม (Channeler/Golem) อ่านยากช่วงใกล้ตัวศัตรู
- ศัตรูตัวใหญ่ยืนชิดฮีโร่ ระยะบินสั้น (~45px) ภาพ travel จึงถูกย่อ
- Veil Quake วาดบนเลเยอร์เอฟเฟกต์เหนือตัวละคร (สูง ~⅓ ของขา) ไม่ได้อยู่ใต้ sprite
- atlas 7.05 MiB decoded / 1.87 MB (ใหญ่กว่า command 3.19 MiB) โหลดตอนเริ่มสู้แบบ eager; ถ้างบภาพตึงให้พิจารณา lazy-load
- แพ็ก `atlas.py`/`production-sources.json` ถูกเพิ่มใน `incoming/ART-VFX-FOE-SIGNATURE-001/` ตามแบบ command/song → `build_handoff.py --verify` (coverage เป๊ะ) จะไม่ผ่านอีกต่อไปนอกจากย้ายสองไฟล์ออก
