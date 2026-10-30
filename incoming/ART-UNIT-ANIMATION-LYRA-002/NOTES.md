# ART-UNIT-ANIMATION-LYRA-002 — Mark / Parry stance

งานภาพเท่านั้น บน branch `art/art-unit-animation-lyra-002` จากสาขาเกม
`feature/fateweave-initial-prototype` commit `0e0d74547e4c39f885acc35979f5c31db0d273fa`.
ส่งภาพหนึ่งฉบับ R1 ต่อท่า รวม 2 strips × 8 เฟรม หันขวา เปิด PR แต่ห้าม merge
การเลือกภาพและอนุมัติ motion ยังเป็นของเจ้าของ; ผล audit/CI ไม่ใช่การอนุมัติ
Claude นำเข้าเกมภายหลัง งานนี้ไม่แก้ runtime, rules, saves, balance หรือเวลาเล่น
บันทึกส่งต่ออยู่ที่นี่ตามข้อจำกัดให้เขียนเฉพาะโฟลเดอร์งาน ไม่แก้ docs/handoffs เดิม

อ่าน AGENTS.md, CLAUDE.md, ANIMATION_PROMPT_QUALITY_TH.md และบทเรียน Aegis
`docs/validation/aegis-anatomy-2026-10-29/README_TH.md` ก่อนผลิต
ใช้เฉพาะ seed ของ Fateweave กับภาพสร้างใหม่ ไม่มีภาพ/ประวัติจาก Rise Beyond

## Seed และพิกัด

`seeds/lyra-seed.png` เป็นสำเนาตรงไบต์จาก
`incoming/ART-UNIT-ANIMATION-PILOT-001/lyra-seed.png` 512×512 ไม่มี retouch
เฟรม 1 และ 8 ของทั้งสองท่าใช้ seed ตรงพิกเซล วางที่ (256,64) ในช่อง 1024×640
ดาบ ผม ผ้าคลุมไม่ถูกตัดเมื่อเปลี่ยนท่า

**เส้นเท้าจริงของไฟล์ที่ระบุ:** brief บอกประมาณ y497 แต่ seed นี้มี alpha>40
ของตัวละครถึง y511 (bbox หลัก x0..500, y17..511) และปลายรองเท้าถึงขอบล่างเดิม
จึงเก็บ seed เดิมตามคำสั่งและยึดเส้นเท้าจริง y511 ของ seed สำหรับทุกเฟรม
ใน canvas ส่งมอบคือ y575 หลังเพิ่ม offset 64 ไม่ตัดรองเท้าหรือย่อ idle
Claude ควรใช้ anchor นี้ แล้วเลื่อนทุกเฟรมร่วมกันหาก pipeline ปลายทางใช้ y497
ขอบที่แตะเซลล์เดิมของ seed ไม่ได้ถูกวาดเติมหรือแก้ atlas เดิม

ทั้งสองแถบใช้ขนาดตัวในพิกัด seed เดียวกัน (logical display scale = 1)
ต้นทาง generator วาดมาคนละความละเอียด จึงแปลง raster ของแต่ละ *ทั้งแถบ*
ให้ conventional ready pose สูงเท่า seed หลัก 495px ก่อนวาง ไม่มีการบีบหัว
ขยาย idle ตามภาพผิด ยืดตัว หรือปรับสเกลเป็นรายเฟรม ผล anatomy เทียบ seed
แยกตรวจจริง ไม่ใช้ bbox/เส้นเท้าเป็นข้อพิสูจน์ว่าสัดส่วนผ่าน

## ลำดับเฟรมและ contact (นับ 1–8)

| เฟรม | Mark — ไม่ทำดาเมจ | Parry stance — ตั้งรับตัวเอง ไม่มีเป้า |
| --- | --- | --- |
| 1 | idle ตรง seed | idle ตรง seed |
| 2 | ยกดาบช้า ๆ | ถอยเท้าหลัง/ถ่ายน้ำหนักไปหลัง |
| 3 | หมุนข้อมือให้ดาบเริ่มชี้หน้า | ยกดาบเฉียงขวางหน้าตัว |
| **4 contact** | **ชี้นิ่งระดับอก มือซ้ายแตะใบดาบ** | **การ์ดเต็ม ย่อเข่า น้ำหนักหลัง** |
| 5 | ถือชี้นิ่ง | ถือการ์ดเดิมนิ่ง |
| 6 | คลายข้อมือ/พาดดาบกลับสู่ท่าพร้อม | เริ่มคลายการ์ด |
| 7 | ย้อนท่ายกดาบกลับเข้า idle | คลายเข่า/กลับท่าพร้อม |
| 8 | idle ตรง seed | idle ตรง seed |

เล่นครั้งเดียวแล้วคืน idle ไม่มีการแทงพุ่ง ฟัน หรือวาดตรา/วง/แสง/VFX
สีแดงในใบดาบเป็นลายวัสดุเดิม ไม่ใช่ glow หรือประกายปะทะ
ทั้งสองท่าต้องคงความช้า/นิ่งตามชนิด ไม่กำหนดเวลาของเกมใหม่ในงานภาพ

`source-sheets/` คือ generator outputs ที่ไม่แก้ไข สร้างแต่ละท่าทั้งแถบ 8 poses
ในคำสั่งเดียว ไม่สร้างทีละเฟรม `strips.json` ระบุการเลือก source ชัดเจน:

- Mark: source **1,2,3,5,5,6,2,8** (ปลายสองข้างแทนด้วย exact seed)
  source5 ใช้ทั้ง contact และ hold เพื่อให้ชี้นิ่งจริง; source2 ย้อนใช้ในเฟรม7
  เป็นช่วงคืนดาบ ไม่คัดเฟรมจากอีก attempt มาผสม
- Parry: source **1,2,3,5,5,6,7,8** (ปลายสองข้างแทนด้วย exact seed)
  source5 ใช้ทั้ง contact และ hold เพื่อถือการ์ดนิ่งจริง
- เฟรม 4–5 จึงซ้ำโดยตั้งใจ ไม่ใช่เฟรมภาพขาด ไม่มี alternate/R2 ส่งให้เลือก

## Anatomy audit ของไฟล์ส่งมอบจริง

รันเครื่องมือ repository เดิม **ไม่แก้สคริปต์/tolerance/minimum inliers**:

```sh
python3 scripts/unit-anatomy-audit.py --cells incoming/ART-UNIT-ANIMATION-LYRA-002/cells/mark --json incoming/ART-UNIT-ANIMATION-LYRA-002/audit/mark.json
python3 scripts/unit-anatomy-audit.py --cells incoming/ART-UNIT-ANIMATION-LYRA-002/cells/parry-stance --json incoming/ART-UNIT-ANIMATION-LYRA-002/audit/parry-stance.json
```

Cells เป็นช่องโปร่งใส 1024×640 เพื่อเก็บดาบทั้งเล่ม แต่ตัวละครยังอยู่ในหน่วย
pixel ของ seed 512 เดิม **ไม่ได้ย่อให้หัวผ่าน audit**. เครื่องมือรองรับขนาดช่องนี้
`000.png` คือ exact idle ที่อยู่ใน raw จริง ตรวจทั้ง 8 ช่องของแต่ละท่า

| ท่า | median เฉพาะ generated | max รวม idle | not-measured | ผล |
| --- | --- | --- | --- | --- |
| Mark | **0.981** | **1.000** | ไม่มี | ผ่าน median≤1.15 / ทุกเฟรม≤1.20 |
| Parry stance | **0.9365** | **1.000** | ไม่มี | ผ่าน median≤1.15 / ทุกเฟรม≤1.20 |

| เฟรมส่งมอบ | Mark scale / inliers | Parry scale / inliers |
| --- | --- | --- |
| 1 | 1.000 / 1993 (idle) | 1.000 / 1993 (idle) |
| 2 | 0.981 / 23 | 0.938 / 52 |
| 3 | 0.996 / 32 | 0.941 / 57 |
| 4 | 0.958 / 18 | 0.935 / 47 |
| 5 | 0.958 / 18 | 0.935 / 47 |
| 6 | 0.999 / 22 | 0.924 / 37 |
| 7 | 0.981 / 23 | 0.940 / 46 |
| 8 | 1.000 / 1993 (idle) | 1.000 / 1993 (idle) |

ไม่มีเฟรมส่งมอบเกินเกณฑ์หรือวัดไม่ได้ รายงานเต็มอยู่ใน `audit/`
ใช้ Pillow/NumPy/SciPy และ opencv-python-headless 5.0.0 ในเครื่องนี้
หากติดตั้ง OpenCV ลงโฟลเดอร์ชั่วคราว ให้กำหนด PYTHONPATH ของโฟลเดอร์นั้น
ก่อนรันคำสั่งข้างต้น (ครั้งนี้ `/tmp/lyra-audit-deps`); ไม่ต้องแก้ repository

## Attempts ที่คัดออก / การเลือกเฟรม

- Mark attempt1: ดาบ/ผ้าคลุมเชื่อมกับตัวข้างเคียง เหลือ 7 connected figures คัดออก
- Mark attempt2: ใช้เป็นต้นทางที่มี 8 figures แยกกันจริง แต่ source poses4/7
  ให้ SIFT fit เสื่อม (scale ใกล้ศูนย์ จึงเป็น not-measured ไม่ใช่ผ่าน)
  ไม่ส่ง poses เหล่านี้ ใช้ source5 สำหรับนิ่ง4–5 และ source2 ย้อนคืนท่า7
- Mark attempts3/4: คัดออกเพราะส่วนภาพเชื่อมกัน ไม่ได้ 8 figures แยกครบ
  ไม่ใช้ผลตรวจจาก prototype cells ที่เหลือจากการทดลองเป็นหลักฐาน
  build สุดท้าย assert จำนวน source figures = 8 แล้วเขียนทุก cell ใหม่ครบเสมอ
- Parry attempt1: poses3/4 วัดไม่สำเร็จ คัดออกเป็น final source
- Parry attempt2: source4 วัดไม่สำเร็จ จึงใช้ source5 ที่เป็นการ์ดเดียวกัน
  สำหรับทั้ง full guard และ hold และตรวจลำดับส่งมอบใหม่ครบทั้งแถบ
- ไม่อ้าง not-measured ว่าผ่าน ไม่บิดหัว/ตัวหรือแก้ตัวตรวจเพื่อให้ผ่าน
  รายงาน anatomy ในแพ็กนี้สร้างจาก cells สุดท้ายซึ่งตรงกับ raw ทุกพิกเซล
- เก็บ prompt ของทุก attempt ใน `prompts.json`; ไม่ส่งภาพที่คัดออกเป็น alternate

## ตรวจภาพและขอบเขตที่ยังไม่ยืนยัน

ตรวจ source และ preview 390px เทียบ seed ซ้าย/เฟรมจริงขวาด้วยสเกลเดียวกัน:
Mark อ่านเป็นการชี้นิ่ง มือซ้ายอยู่ที่ใบดาบ ไม่ก้าวแทง; Parry เป็นการ์ดต่ำกว่า
idle เข่างอและดาบบังด้านหน้า ไม่ใช่การสวน/ประกายปะทะ ดาบกับมือยังติดกัน
ไม่มีข้อความ/พื้นหลัง/VFX ใน raw และไม่มีการตัดขอบช่องส่งมอบ
สเกลหัว Parry เล็กกว่า seed ราว 6% ตาม audit อยู่ในเกณฑ์ แต่เจ้าของยังต้อง
เลือกภาพจริงโดยดูการเปลี่ยน idle→guard โดยเฉพาะ ไม่ถือว่าเลขผ่านแทนความพอใจ
ยังไม่ได้ทดสอบในเกมหรืออนุมัติ motion; Claude ต้องทำคลิปจริงภายหลัง

## Rebuild และตรวจหลัง push

```sh
python3 incoming/ART-UNIT-ANIMATION-LYRA-002/build_handoff.py
python3 incoming/ART-UNIT-ANIMATION-LYRA-002/build_handoff.py --verify
```

Inputs คือ supplied seeds, source sheets, prompts, notes, metadata ต้นทาง
Outputs คือ cells ทั้ง16, raw สองแถบ, preview, audit, strips และ validation
สร้างซ้ำ offline ได้; การเรียก generator ใหม่ไม่ใช่ deterministic rebuild
`seeds/eight-slot-layout.png` เป็นผังอ้างอิงที่ใช้ตอนสร้าง Mark attempt2

`validation.json` มี SHA-256 และจำนวนไบต์ของทุกไฟล์อื่นในแพ็ก (ไม่ hash ตัวเอง
แบบวนซ้ำ); ตรวจ manifest เองด้วยการเทียบไบต์จาก Git ที่ fetch กับ commit local
หลัง normal git push ให้ fetch branch ใน repository ใหม่ ตรวจทุก entry เทียบ
manifest และเปิด PNG ทุกไฟล์ด้วย Pillow verify + full load รวมไฟล์เกิน 768KB
ผลตรวจหลัง push จะระบุใน PR ไม่ใช้ผล CI เป็นการอนุมัติภาพ/motion
