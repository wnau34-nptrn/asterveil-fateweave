# Rally R2 — ริ้วตั้งรับหมู่แนวนอน

27 ตุลาคม2026 · **ข้อเสนอ artwork ใหม่ หลังเจ้าของไม่ชอบ Rally เดิม · ยังไม่แทน runtime**

[เปิดพรีวิวสามจังหวะ](index.html) · [ภาพจุดเด่น390px](rally-peak-390.png) · [แผ่นสามจังหวะ](rally-board.png) · [เทียบแบบเดิม](../defense-storyboards/rally-peak-390.png)

เปลี่ยนทรงยอดแหลม/ริ้วคล้ายมงกุฎเหนือหัว เป็นริ้วพลังน้ำเงินคลี่ออกด้านข้างช่วงขา ขอบเงินและทองบาง ลดรายละเอียดแฉกและกลุ่มแสงทองที่กลืนกับชุด สัดส่วนวางเสนอ84×30px กลางโปร่ง ไม่ครอบตัวและไม่เป็นวง barrier แบบ Aegis

สามจังหวะ: สองริ้วเริ่มรวม → คลี่ออกแนวนอน → แยกเป็นริ้วสั้นสลาย กลไกยังเป็นลดการโดนครั้งแรกของเพื่อนแต่ละคน ไม่มีการวาดว่าเพิ่ม barrier หรือฮีล ภาพแต่ละช่องเป็นสนามจริง390×844เดิมซ้ำ จึงไม่ใช่ผลต่อสู้ที่กำลังเล่น HP/UI คงเดิมและไม่มี AI วาดทับตัวละคร

- ต้นฉบับ ImageGen RGBA2172×724, alpha0–255: `incoming/ART-VFX-DEFENSE-001/proposals/rally-r2/source.png`
- Prompt แก้ไขเต็มและ original tool path: `prompt.json` ในโฟลเดอร์เดียวกัน
- [manifest.json](manifest.json): SHA-256, ขนาดจริง, ขอบเขตสามจังหวะ, shared scale และ anchors จาก resolver ที่จับไว้เดิม
- `build.py` วิเคราะห์ alpha เท่านั้น; `capture.mjs` ใช้ canvas คอมโพสิตใน browser แล้วส่ง PNG1170×950และ390×844 ไม่แก้ pixels ของต้นฉบับด้วย script
- Preview ใช้ compositor เดียวกับ defense-storyboards มีเทียบสนามเปล่า น้ำหนัก60–110% คืนค่า และเลื่อนไปแต่ละจังหวะ ไม่มี resolver/runtime import และไม่เขียน localStorage

```sh
npm run dev -- --port 5173
# อีก terminal:
python docs/combat-presentation/rally-r2/build.py
node docs/combat-presentation/rally-r2/capture.mjs
```

ตรวจรูปใหม่ที่390pxแล้ว ทั้งสามจังหวะ/เทียบสนามเปล่า/ปรับน้ำหนัก/คืนค่า/เลื่อนphaseผ่าน ไม่มี page error และไม่มี storage write; lintผ่าน ใช้ Chromium ใน cloud ตาม workflow capture ของ repository ไม่ใช่การตรวจเครื่องจริง

ไฟล์นี้แยกจาก manifest/packaging ที่ใช้ส่ง runtime เพื่อไม่ให้ภาพที่ยังไม่เลือกถูกแพ็กเข้า atlas โดยบังเอิญ `source/rally.png`, production atlas/module และคลิป Rally ที่ส่งก่อนหน้ายังเป็นแบบเดิมที่เจ้าของไม่ชอบ เก็บไว้เทียบเท่านั้น หลังเลือก R2 จึง promote source/prompt/ขนาดวางเข้า packaging แล้วอัดคลิป Rally ใหม่ใน PR#77 ใบเดิม ไม่เริ่มตระกูล3
