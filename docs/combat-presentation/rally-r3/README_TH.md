# Rally R3 — พลังตั้งรับบนพื้น

27 ตุลาคม2026 · **ข้อเสนอ artwork หลังเจ้าของปฏิเสธ R2 เพราะทับชุด · ยังไม่แทน runtime**

[เปิดสามจังหวะ](index.html) · [ภาพ390px](rally-peak-390.png) · [แผ่นสามจังหวะ](rally-board.png)

วาดใหม่เป็นเครื่องหมายพลังน้ำเงิน–เงินแยกซ้าย–ขวาบนพื้น ไม่มีริ้วเชื่อมกลาง ไม่วางทับขาหรือชายชุด ขนาดสูงสุด90×12px ใช้ foot anchor และเว้นลงมา27px ให้พ้นรองเท้าและแถบ HP ในภาพสนามจริงที่390px ไม่ใช่โล่ดูดซับหรือฮีล

สามจังหวะ: แสงสั้นบนพื้น → เครื่องหมายคู่แผ่ออก → เศษแสงจางออก ภาพทั้งสามใช้สนามจริงเดิม HP/UIคงเดิม ไม่ใช่คลิป runtime และไม่มี AI วาดตัวละครหรือ UI ใหม่

ต้นฉบับ ImageGen2172×724 RGBA alpha0–253 และ prompt อยู่ใน `incoming/ART-VFX-DEFENSE-001/proposals/rally-r3/` เก็บต้นฉบับ byte-for-byte แยกจาก source/atlas/profile/module ที่ใช้งานจริง R2 ถูกปฏิเสธและเก็บเพื่อประวัติเท่านั้น

`build.py` วิเคราะห์ alpha/metadata เท่านั้น; `capture.mjs` คอมโพสิตใน browser ผ่าน shared viewer ไม่แก้ pixel ภาพต้นฉบับด้วย script

```sh
python docs/combat-presentation/rally-r3/build.py
# เมื่อ Vite ทำงานที่5173:
node docs/combat-presentation/rally-r3/capture.mjs
```

ตรวจสามจังหวะที่390px/เทียบสนามเปล่า/น้ำหนัก/คืนค่า/เลื่อนphaseผ่าน ไม่มี page error หรือ storage write ต้นฉบับ hash ตรง ภาพจุดเด่นดูด้วยตาแล้วพ้นชุด/รองเท้า/HP; Chromium cloud ไม่ใช่เครื่องจริง

PR#77 ใบเดิม ยังรอเลือก artwork ก่อน promote/repack/อัด Rally ใหม่ ท่าอื่นยังไม่ถือว่าผ่าน review ไม่เริ่มตระกูล3
