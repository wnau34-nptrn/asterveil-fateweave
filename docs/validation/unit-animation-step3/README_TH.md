# ขั้น 3 — sprite animation คู่ทดลอง

26 ตุลาคม 2026 · branch `codex/unit-animation-pilot` · ต่อจาก controller ของ PR #73

## ผลงาน

Lyra: โจมตีปกติฟันดาบ / Execute แทงดาบ / ถูกโจมตี / ล้ม

Vargoth Hunter: Raking Slash ฟันมีด / Shadow Knife ขว้างมีด / ถูกโจมตี / ล้ม

ตัวอื่นและสกิลอื่นยังใช้ procedural fallback เดิม ผลกระทบจากการโจมตี การ์ด หลบ และสวนกลับยังอ่านผล resolver จริง ไม่ใช้ชื่อเอฟเฟกต์เป็นคำตัดสิน ไม่มีแก้ battle rules/save/balance หรือรวม C5 blade VFX

21 sequence slots ต่อตัว + idle โดยล็อก 4 จุดต้น/ปลายกับภาพเดิม (จึงมี 17 generated poses ต่อตัว) มี preview, seeds, raw sheets และ script ทำ atlas ซ้ำได้ใน `incoming/ART-UNIT-ANIMATION-PILOT-001/`

การเชื่อม: เริ่มเล่นเฟรมก่อน VFX เฉพาะท่า, windup หยุดก่อนเฟรมกระทบ, เปลี่ยน contact frame ทันทีเมื่อ BattlePlayback เรียก contact แล้วเล่น follow-through ภายในเวลาที่เหลือ ไม่มี sprite FPS ที่สร้างดาเมจเอง รีเซ็ตภาพและ transform เมื่อยกเลิก และเปลี่ยน down/idle ตาม HP boundary รวมถึง revive และ OS reduced-motion

## หลักฐาน

- [โจมตีปกติทั้งสองฝ่าย](basic-390.mp4)
- [Execute และ Shadow Knife](skill-390.mp4)
- [Lyra ขณะฟัน](lyra-slash-390.png)
- [Hunter ขณะฟัน](hunter-slash-390.png)

คลิป Chromium 390×844 เก็บภาพ virtual clock ทุก 50ms แล้ว encode 20fps ไม่มีเสียง ไม่ใช่ benchmark FPS ใช้ศึก first-clash และคำสั่งจริงผ่าน resolver; คลิปสกิลใช้ prefix ของคำสั่งถูกกติกาจนรอบ 3 ให้ Hunter ใช้ Shadow Knife ไม่มีการเปลี่ยน intent เพื่อจัดฉาก

## การตรวจ

- typecheck / lint / build ผ่าน
- Vitest: 73 files / 851 tests ผ่าน
- focused unit frames/controller/playback/effects: 4 files / 24 tests ผ่าน
- Browser: basic pilot และ Execute/Shadow Knife ผ่านทั้งสองกรณีหลังแก้ fixture ให้ใช้ TargetOption.valid, เลือก attack เมื่อ Mark ยังติดอยู่ และรองรับการ resume ศึกที่เริ่มไปแล้ว
- presentation mode matrix 4 กรณี (fast/reduced intensity/OS reduce toggle) ผ่าน; impact และ skip/resize/reload/hidden-tab ที่ 390px ผ่านอีก 2 กรณี
- ดู preview ทั้งสองและภาพจริงของทั้งสองฝั่งแล้ว ไม่มีอาวุธถูกตัดขอบหรือภาพเฟรมข้างเคียงติดเข้ามา; ความสม่ำเสมอทางศิลป์ยังให้เจ้าของตรวจจากคลิปก่อนขยายตัวอื่น
- Browser extension ไม่มี browser-control tool ในเซสชัน ใช้ Playwright + `/usr/bin/chromium` ของ repo ไม่อ้าง Safari/มือถือจริง
- ต้นทุน decoded atlas ~48 MiB สำหรับสองตัว ต้องทำโหลดตาม encounter ก่อนขยายครบ roster

ยังไม่ได้ผลิต sprite ของตัวอื่น และไม่ได้ถือว่าการทดสอบผ่านคือเจ้าของอนุมัติคุณภาพภาพ
