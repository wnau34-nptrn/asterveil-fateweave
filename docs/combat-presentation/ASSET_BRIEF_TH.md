# Asset brief — เอฟเฟกต์และผู้คุมรอยแยก

วันที่ 21 ตุลาคม 2026 · เตรียมการ C04 เท่านั้น ยังไม่สร้างหรือเลือกซื้อ asset ใหม่

## บทบาทและชุดส่งมอบ

บทบาทต่อไปนี้เป็นเจ้าของงานสำหรับรอบพัฒนา ไม่ใช่การส่งงานออกไปให้บุคคลภายนอกแล้ว

- **ผู้พัฒนาระบบ/agent ที่รับช่วง:** เป็นเจ้าของ manifest, cue/anchor/fallback, integration และตรวจว่า asset ตรงกับ event จริง
- **ผู้ผลิตภาพในรอบ asset:** รับผิดชอบ FX และภาพบอสตาม brief; ผู้พัฒนาระบบตรวจดีไซน์/สิทธิ์ก่อนนำเข้า งานนี้ยังไม่เริ่ม generate หรือมอบหมายศิลปิน
- **ผู้ผลิต/คัดเลือกเสียงในรอบ audio:** ทำ source/rights record, ตัดช่วงเงียบต้นเสียง, ปรับความดัง และตรวจ Web Audio/ไฟล์ตาม browser เป้าหมาย ไม่มีคำสั่งซื้อบริการในเฟสนี้
- **ผู้ตรวจ QA ในรอบ integration:** เทียบ baseline/ผล resolver, ดูภาพจริง, ตรวจ peak VFX และฟังบนอุปกรณ์จริง แยกผลที่ยืนยันกับสิ่งที่ยังทดสอบไม่ได้

## รายการภาพและ UI

ชื่อ key ด้านล่างเป็นชื่อเสนอสำหรับ manifest ไม่ใช่ไฟล์ที่เกมมีแล้ว

| ID / key | ภาพที่ต้องส่ง | Anchor / การใช้ | ช่วงเวลาภาพ | Fallback ระหว่างต้นแบบ |
|---|---|---|---|---|
| FX01 `combat.slash` | เส้นโค้งฟันสั้น มีแกนคม/ขอบแสง | ทิศผู้โจมตี→bodyContact | travel/contact | Phaser graphics stroke |
| FX02 `combat.thrust` | เส้นแทงและรอยปะทะแคบ | เส้นวิถีสู่ bodyContact | travel/contact | line + spark |
| FX03 `combat.physicalImpact` | ประกายสัมผัสโลหะ/หินเป็นชิ้นเล็ก | bodyContact | 100–250ms หลัง contact | วง/เส้นสั้นตามน้ำหนัก |
| FX04 `combat.arcane` | ลูกพลังฟ้า/ม่วงและ impact แยกกัน | castOrigin→bodyContact | travel/contact | orb + line |
| FX05 `combat.barrier` | แผ่นเกราะหกเหลี่ยม รอยรับแรง และแตกเมื่อหมด | bodyContact ของผู้รับจริง | apply/block/break | hex outline + icon |
| FX06 `combat.heal` | ประกายมิ้นต์/แสงอุ่นไหลขึ้น | ผู้ได้รับ HP จริง | apply/reaction | mint motes + number |
| FX07 `combat.mark` | ตราและ pulse สั้นเมื่อเข้าเงื่อนไขจริง | bodyContact/status ที่มีพื้นที่ | apply/consume | diamond + text |
| FX08 `combat.interrupt` | รูปท่าถูกตัด/ตราแตก | intent/ผู้ถูกหยุด | cancel/interrupt จริง | crossed icon + text |
| FX09 `boss.dust` | ฝุ่นหินต่ำ/สะเก็ด ไม่ปิดร่าง | foot/พื้น | step/slam | sparse particles |
| FX10 `boss.rift` | เส้นเปิดรอยแยกและแสงเกราะ | intro layer/เกราะ | B01–B04 | gradient/lines |
| FX11 `boss.sentinelCloseup` | ภาพใกล้ Sentinel แยก base/glow/shadow | ชิ้นสำคัญไม่ถูกชื่อและ Skip ทับ | B02–B03 | ภาพเดิมเฉพาะต้นแบบ; ไม่อ้างเป็น final art |
| FX12 `boss.collapse` | รอยเกราะแตก/แสงรั่ว/สลาย | bodyContact/ร่างบอส | defeat หลัง outcome จริง | fade + simple fragments |
| UI01 `boss.nameplate` | ชื่อบอสเป็น live Thai text | กรอบเกมและ safe area | B03/farm | DOM text/panel |
| UI02 `presentation.settings` | speed/intensity/intro mode + skip | info Settings/intro | ตามการใช้งาน | native DOM controls |

## ข้อกำหนดภาพ

- รักษาร่าง เกราะ โทนทอง–ม่วง อาวุธ และทิศของ Sentinel จาก `foe_sentinel` ปัจจุบัน ไม่สร้างบอสใหม่หรือเปลี่ยนเป็นวาร์กอธ
- แยกแสง/ฝุ่นจากภาพฐาน และแยกข้อความ/โลโก้/UI ออกจาก raster ทุกไฟล์ FX ที่ต้องวางทับฉากใช้ transparency ที่ตรวจจริง
- เก็บ source ที่แก้ไขได้ พร้อมไฟล์ runtime WebP/PNG หรือ atlas ตาม pipeline โครงการ ถ้าเป็น strip ต้องระบุ frame size/count/order/FPS/anchor และ padding ไม่ bake DPI/rarity/damage numbers ลงภาพ
- เริ่มทดลองภาพบอสใกล้ด้วย source ราว 1,024–1,536px ตามด้านที่ต้องเห็นบนกรอบ 480px แล้วลด runtime หลังตรวจภาพ ไม่ขยาย cell 512px เดิมแล้วเรียกว่า high-resolution ใหม่
- ผืน FX มี bounds รอบประกายพอไม่ให้ขอบถูกตัด แต่ไม่เว้นพื้นที่โปร่งใสมากจนตำแหน่งปะทะคาดเดายาก ระบุ anchor normalized และ scale ที่อ้างอิง CSS pixels
- ตรวจบนฉากมืด/สว่าง ที่ 320px และ 390px ก่อนขยายชุดภาพ ไม่มีข้อความ โลโก้ watermark ผู้ติดตาม อาวุธ หรือ scenery เพิ่มนอก brief
- เริ่ม budget ต้นแบบด้วย effect objects ที่มีชีวิตจำกัดและคืน pool/ทำลายเมื่อจบ ไม่ล็อกจำนวน particle/ขนาดไฟล์เป็นผลรับรองก่อนวัดจริง หลีกเลี่ยง full-screen blur/postprocess ในชุดแรก

## รายการเสียง

| ID | เสียงที่เตรียม | Cue | Fallback |
|---|---|---|---|
| AU01 | physical whoosh / slash / thrust contact | prepare/travel/contact แยกไฟล์หรือ recipe | synth hit/crit เดิมตาม event โดยไม่สื่อ crit rule |
| AU02 | magic charge / travel / impact | travel/contact | zap เดิม |
| AU03 | shield activate / block / break | apply/absorb/depleted จริง | barrier/guard เดิม |
| AU04 | heal / support pulse | actual apply | heal/buff เดิม |
| AU05 | mark / interrupt / canceled move | status/cancel จริง | debuff/cancel เดิม |
| AU06 | rift opening / low rumble | B01–B02 | encounter + synth ที่ควบคุมได้ |
| AU07 | heavy stone-metal step / slam | B04/contact | hit/guard แบบหนักในต้นแบบ |
| AU08 | rift bolt charge-impact / boss collapse | boss contact/defeat | zap/down/victory เดิม |

ช่วงตัวอย่างสำหรับงานผลิต: whoosh 0.1–0.3s, contact 0.1–0.4s, support 0.2–0.6s, boss rumble/collapse 0.6–1.5s หางเสียงต้องไม่บังคับให้ล็อกเทิร์นรอจนจบ หากข้ามฉากให้หยุด/fade ตามเจ้าของ cue ไม่มีการเล่นเสียงตกค้างเมื่อกลับจาก background

ใช้เพลง `bgm_boss.mp3` เดิมตามสิทธิ์ที่โครงการมี ไม่เพิ่ม BGM/เสียงพากย์ในชุดแรก Duck ชั่วคราวต้องคืน volume/mute ที่ผู้ใช้ตั้ง แม้ cancel/load fail ไม่ให้ peak เสียงซ้อนจน clipping ตรวจด้วยไฟล์และการฟังจริง ไม่อ้างว่า `data-sfx` พิสูจน์ว่าได้ยิน

## แบบฟอร์ม metadata ทุก asset

`id, producer/source, license/permission evidence, source file, runtime file, dimensions or duration, frames if any, anchor, color variants, cue, fallback, tested viewports, review status`

สถานะตั้งต้นทุกชิ้น: **brief-ready / not-produced / rights-pending-until-source-selected** สถานะนี้ไม่ได้หมายความว่ามีสิทธิ์ใช้ไฟล์ใดที่ยังไม่เลือก ชุดที่ใช้จากของเดิมต้องอ้าง mapping/สิทธิ์เดิม ไม่มีการดึงโค้ดหรือภาพจาก Rise Beyond

## เกณฑ์รับงานก่อน integrate

1. ดีไซน์/โทน/รูปทรงตรง brief และไม่สร้างความหมายทางกติกาที่ไม่มีจริง
2. ไฟล์โปร่งใส ขอบ/anchor/frames ถูกต้อง ไม่มี text/logo/watermark ฝังมา
3. source/rights ตรวจได้ และ manifest มี fallback เมื่อโหลดไม่ได้
4. เอฟเฟกต์ไม่ทับ HP/status/คำสั่ง และยังอ่านได้ใน reduced-motion/no-audio
5. ชุด production ผ่านภาพจริงและเสียงจริงตามขอบเขตอุปกรณ์ที่รายงาน; ต้นแบบใช้ placeholder ต้องติดสถานะไว้
