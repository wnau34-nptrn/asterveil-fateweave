# ไลรา W2 · ท่ายืนวนลูป

8 เฟรม ขนาด 512 × 512 RGBA เฟรม `000.png` ตรงกับ seed ทุกไบต์
รอบละ 3.2 วินาที ผมตามหลัง 1/8 รอบและผ้าตามหลัง 1/4 รอบ
ดัดภาพจาก seed ด้วย premultiplied-alpha bilinear sampling ตามวิธีเอกิส W1b

## สร้างซ้ำจากราก repository

```sh
python3 incoming/ART-UNIT-ANIMATION-LIFE-001/w2-idle/lyra/tools/warp_idle.py --seed incoming/ART-UNIT-ANIMATION-LIFE-001/seeds/lyra-seed.png --paint-masks
python3 scripts/unit-anatomy-audit.py --cells incoming/ART-UNIT-ANIMATION-LIFE-001/w2-idle/lyra/frames
```

ใช้ Pillow 12.3.0, NumPy 2.5.5 และ OpenCV 5.1.0

## ระยะขยับจาก seed

ตัวคูณแอมพลิจูด **×0.72** สัดส่วนการวาดจาก seed **0.497**

| ส่วน | วัดได้สูงสุด (px) | ขีดจำกัด (px) |
| --- | ---: | ---: |
| ผ้าพันคอเหนืออกและไหล่ | 4.3200 | 4.32 |
| ศีรษะตรึงไว้ | 0.0000 | 2.88 |
| ผมแดงและปลายผม | 3.8017 | 4.32 |
| ชายผ้าคลุม | 4.3200 | 5.76 |
| ปลายผ้าพันคอและชายเสื้อ | 3.6000 | 5.76 |

ใช้ระยะ W1b ที่คูณ 0.72 ตลอดทั้งชุด เน้นผมและปลายผ้า ศีรษะและดาบใหญ่คงตำแหน่งเดิม

## ผลตรวจ

- พิกเซลนอก mask เปลี่ยน 0 พิกเซลทั้ง 8 เฟรม รวมถึงขอบแคนวาสทั้งสี่ด้าน
  หน้า ตา มือ อาวุธ และเท้าตรงกับ seed ในบริเวณที่ตรึงไว้
- ค่า Jacobian ต่ำสุด 0.274353 จาก inverse warp ทั้ง 8 เฟรม
- Anatomy audit วัดได้ 8/8 เฟรม มัธยฐาน 1.000 สูงสุด 1.001
- ตรวจการเล่นใน Chromium ที่ 400 และ 200 ms ต่อเฟรมที่ขนาด 100% และเทียบกับเอกิส W1b
  ตามสัดส่วนการวาดในเกม ภาพที่ตรวจรวมถึงรอยต่อ 8 → 1 ไม่พบรอยขาด ขอบซ้อน ขอบเลอะ หรือช่องโปร่งใหม่
- การตรวจภาพทำแบบออฟไลน์ การอนุมัติ motion ในเกมเป็นของเจ้าของ

`validation.json` บันทึก SHA-256 และขนาดไฟล์ทุกไฟล์ในชุด
และบันทึกภาพเทียบในชุดไลรา ตรวจแฮชของตัว manifest แยกจากรายการ

## สร้างภาพเทียบและตรวจไฟล์ส่งมอบ

```sh
PYTHONDONTWRITEBYTECODE=1 python3 incoming/ART-UNIT-ANIMATION-LIFE-001/w2-idle/lyra/tools/compare_allies.py --aegis incoming/ART-UNIT-ANIMATION-LIFE-001/w1b-aegis-idle/idle-aegis-111px.webp
python3 incoming/ART-UNIT-ANIMATION-LIFE-001/w2-idle/lyra/tools/verify_delivery.py --seeds incoming/ART-UNIT-ANIMATION-LIFE-001/seeds
```

ภาพเทียบจัดให้พื้นรองเท้าอยู่แนวเดียวกัน ใช้เอกิส W1b สูง 111 px เป็นฐาน
และใช้สัดส่วนการวาดจาก seed 0.360, 0.497, 0.420 และ 0.359 ตามลำดับ
จึงได้ขนาด 111, 153, 130 และ 111 px ส่วน `idle-111px.webp` ของแต่ละตัวสูง 111 px
