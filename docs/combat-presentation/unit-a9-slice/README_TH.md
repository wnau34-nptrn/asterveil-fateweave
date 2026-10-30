# A9 — บอส 4 ตัว (ราชินีหนาม/เจ้าป่าหนาม, ด้วงเกราะผลึก, ผู้คุมรอยแยก, หัวหน้ากองหน้า)

29 ตุลาคม 2026 · branch `claude/av06-a9-boss-bodies` (ฐาน `ba5db3f`) · audit AV06

**สถานะ: รอเจ้าของดูคลิปจริงและอนุมัติ motion ก่อน merge/เผยแพร่** — ผลเทสต์ไม่ใช่การอนุมัติภาพ คลิปด้านล่างเป็น Chromium SwiftShader บน viewport 390px ไม่ใช่เครื่องจริง/iOS Safari

## แหล่งภาพ

- Codex PR/branch `art/art-unit-animation-a9-001` (`42e550d`), `incoming/ART-UNIT-ANIMATION-A9-001/`; `validation.json` sha256 `e4dff5e37a9c5672d1776461d5830a40d90219a53716331143f80838c3bdfcc1`
- strip ทั้ง 25 เส้น (หนึ่งเส้นต่อท่า ไม่มี candidate ให้เลือก) ถูกตรวจ sha256 เทียบ `strips.json` ใน `build_assets.py` ก่อนใช้; เฟรม ready/recover ของทุก strip ตรงกับ seed แบบพิกเซลต่อพิกเซล (บันทึกใน `validation-normalized.json`)
- เฟรมดิบ 1024×896 มี seed 512 อยู่ที่ (+256,+160) (ฝ่าเท้า y=657) เพื่อรองรับอาวุธยาว

## Normalization

- แปลเฟรมด้วยค่าคงที่ (0,+239) เข้า cell จตุรัส 1024 → ฝ่าเท้าที่ y=896 (7/8) และกึ่งกลาง x=512; ไม่ปรับขนาดต่อท่า, ไม่จัดกึ่งกลางใหม่ต่อท่า (คงตำแหน่งที่ศิลปินวาง), ขนาดลำตัวเท่า seed
- เหตุที่ใช้ 7/8 ไม่ใช่ 496/512: ขวานของ Captain Crushing Blow ห้อยต่ำกว่าฝ่าเท้า 49px ซึ่งเกินช่อง 32px ของ cell 1024 แบบ 496/512
- ย่อทั้ง cell ด้วย factor เดียวต่อตัวละคร (Lanczos, defringe สีขอบ, trim/dedup, pack WebP lossless, ตรวจสร้างซ้ำได้พิกเซลตรงเดิม) — `displayRatio` ยังเป็น **2** เพราะ cell ยังหมายถึง 1024 หน่วย seed (static seed 512 แสดงที่ ratio 1)
- registry ใหม่: `soleOrigin` (7/8) และ `downedFrame` (เฟรมสุดท้ายของท่าล้ม) ต่อ identity; identity เดิมยังใช้ 496/512 และเฟรม 21

| identity | atlas | factor / cell | เฟรม | decoded | download |
| --- | --- | --- | --- | --- | --- |
| foe_matriarch | `matriarch` 1280×690 | .37 / 379 | 26 | 3.37 MiB | 1,420,295 B |
| foe_juggernaut | `juggernaut` 1536×702 | .50 / 512 | 14 | 4.11 MiB | 1,425,783 B |
| foe_sentinel | `sentinel` 1024×934 | .31 / 317 | 34 | 3.65 MiB | 1,409,354 B |
| foe_captain | `captain` 768×1562 | .50 / 512 | 18 | 4.58 MiB | 1,336,077 B |

งบ: decoded ≤ 6 MiB, download ≤ 1.5 MB ต่อตัวละคร. Sentinel (7 ท่า) และ Matriarch (5 ท่า) ต้องลด factor เพื่อให้ผ่านงบ download (ที่ .5 ได้ 3.3 MB / 2.4 MB) จึงมีความละเอียดต่ำกว่าบอสอีกสองตัว — จุดที่เจ้าของควรดูในคลิป

## เลย์เอาต์เฟรมและ mapping

เฟรม 0 = seed ตรง ๆ; แต่ละท่าเพิ่ม 4 เฟรมไม่ซ้ำ [เตรียม, ก้มรับแรง, สัมผัส/ปล่อย, ตามแรง] (เฟรม ready/recover ของ strip คือเฟรม 0): prepare = 0 → a → b, สัมผัส = recover ตัวแรก (c), recover = c → d → 0. hit = [recoil, brace], down = [buckle, collapse, hold] (ค้างท่านอน). ทำครั้งเดียวตามเวลาเดิม ไม่มี telegraph แบบค้างท่า (ตามขอบเขตงาน)

| identity | ท่าจริง (intent / phase) → clip | เฟรมเริ่ม |
| --- | --- | --- |
| Matriarch / Briar Lord | Thorn Tempest→move1 (1), Briar Lash→move2 (5), Gather Thorns→move3 (9), Thorn Bloom + Thorn Storm→move4 (13), **phase** Thorn Rage→move5 (17); hit 21–22; down 23–25 | สัมผัส = เริ่ม+2 |
| Juggernaut | Horn Charge→move1 (1), Shard Burst→move2 (5); hit 9–10; down 11–13 | |
| Sentinel (Rift Warden) | Rift Cataclysm (1), Raking Slash (5), Crushing Blow (9), Rift Bolt + Rift Wave (13), Rift Gathering (17), **phase** Rift Awakening (21), **phase** Call the Rift (25); hit 29–30; down 31–33 | |
| Captain | War Cry→move1 (1) (ตะโกนท้าทายเชิงรุก ไม่ใช่บัฟ), Crushing Blow (5), **phase** Call the Hunt (9); hit 13–14; down 15–17 | |

ท่า phase เล่นเฉพาะเทิร์น phase จริงที่ resolver สร้าง (`intent.special === 'phase'`; ชื่อ phase ไม่ซ้ำกับท่าปกติ) — `tests/unit-a9.test.ts` ตรวจทุก intent + ชื่อ phase ของทุก encounter เทียบ mapping และสร้างเทิร์น phase จริงสำหรับทั้งสี่ phase.

## Matriarch หันซ้าย

atlas ของ Matriarch ถูกวาดหันซ้ายแล้ว (ตามเจ้าของ) และ **ไม่ถูกพลิกซ้ำ** (`setFlipX(!framed && mirroredArt.has(key))`); seed แบบ static ยังพลิกโดย `mirroredArt` ระหว่างรอ atlas. เทสต์ browser ยืนยัน `flipX` เป็น true ตอนเป็นภาพ static และ false หลังโหลด atlas; ภาพคลิป `foe_matriarch-*-foe-390.png` แสดงหันหาฮีโร่ซ้าย

## คลิปจริง 390px (15 คลิป, ตรวจเฟรมแล้ว)

ท่าเด่นสองท่า/บอส: Matriarch Thorn Tempest + Briar Lash (+ phase Thorn Rage), Juggernaut Horn Charge + Shard Burst, Sentinel Rift Cataclysm + Raking Slash (+ phase Call the Rift), Captain War Cry + Crushing Blow (+ phase Call the Hunt); ทุกคลิป normal มีท่า hit ของบอสจากการโจมตีของฮีโร่; คลิป `*-enemy-down-*` ของทั้งสี่ตัว. ไฟล์ `*-390.mp4` + ภาพนิ่ง foe/hero ในโฟลเดอร์นี้ (`clips.json` บันทึก timestamp จริง). ท่าล้มเมื่อชนะ: ตัวบอสโปร่ง/หายตามพฤติกรรม victory เดิม ท่านอนยืนยันด้วย `frame === downedFrame` ใน `tests/browser/unit-a9.spec.ts`

## ข้อจำกัด / ข้อสังเกต

- ไม่มีการเปลี่ยน rules/save/content/balance/เวลา; ไม่มี VFX ใหม่ (ใช้ VFX เดิม); โหลด atlas แบบ optional พร้อม fallback เป็น seed static + การเคลื่อนไหวเชิงโค้ด
- Aegis ยัง `anatomyHold` (ไม่เกี่ยวกับงานนี้)
- ท่า Gather Thorns/Rift Gathering/Horn Charge ตามโน้ต Codex ควรค้างเฟรม 3 เป็น telegraph — ไม่ทำในงานนี้ (อีกงานดูแล telegraph ต่อเนื่อง)
- เจ้าของยังไม่ได้เลือก/อนุมัติ motion; ความละเอียดต่ำของ Sentinel/Matriarch ต้องให้เจ้าของตัดสิน
- ไม่ได้ทดสอบบนอุปกรณ์จริง/iOS Safari
