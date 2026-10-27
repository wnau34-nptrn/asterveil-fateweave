# ปรับการเปลี่ยนท่าให้ต่อเนื่อง

26 ตุลาคม 2026 · `codex/unit-animation-smooth` · ต่อจาก PR #74

เจ้าของแจ้งว่าการเปลี่ยนท่าโจมตียังไม่สมูท หลังให้ผ่านภาพและขอปรับความเร็วเล็กน้อยแล้ว งานนี้แก้ความต่อเนื่องของ pose ไม่ลดความเร็วทั้งเทิร์น

## ปัญหาและสิ่งที่แก้

- ลำดับฟัน Lyra เดิมมีภาพดาบต่ำ (frame 4) ก่อน contact แล้วเปลี่ยนไปดาบแนวนอน (frame 5) ทำให้ย้อนทิศ จัดใหม่เป็น windup `[1,2,3]` และ follow-through `[5,4,6,7,8]` โดย frame 5 ยังแสดงตรง UI contact เท่านั้น
- แทนการเปลี่ยนภาพทันทีด้วยการเชื่อมสองเฟรมติดกันช่วงสั้นประมาณ 18ms ท้ายแต่ละช่วง มี smoothstep สำหรับน้ำหนักภาพ และถือเฟรมสุดท้ายของแต่ละ phase ไว้ ไม่มีการ blend เข้า contact ล่วงหน้า
- เพิ่มภาพวาดซ้อนเพียงหนึ่ง instance จาก texture เดิมต่อ pilot actor เฉพาะตอน transition; ไม่มี atlas เพิ่ม ไม่มี image-generation draft แทนภาพที่เจ้าของอนุมัติ ไม่มีการสร้าง tween/timer ต่อเฟรม
- การเคลื่อนตัวใช้ smoothstep เพื่อเริ่ม/หยุดแบบความเร็วเข้าใกล้ศูนย์ แทนการคืนตัวแบบความเร็วคงที่จนหยุดทันที
- หากพุ่งแล้วถูกโจมตี รับ reaction จากตำแหน่ง/rotation/scale ขณะนั้น แล้วค่อยคืนสู่ฐาน ไม่ teleport กลับ slot ที่ event boundary
- reset/skip/death/revive/OS reduced-motion ล้างภาพซ้อนและคืน alpha เต็ม ป้องกันเงาเฟรมค้าง ทั้งสองภาพใช้ origin/scale/flip/tint เดียวกัน เป้ากดและข้อมูล HP อยู่ที่เดิม
- จังหวะ contact/end, recovery ที่เจ้าของให้ปรับเป็น 260ms, fast/reduced motion, ผลกติกาและเซฟยังใช้ระบบเดิม

## หลักฐาน

- [คลิปโจมตีปกติ](basic-390.mp4)
- [คลิปสกิล](skill-390.mp4)
- [เปรียบเทียบลำดับก่อน/หลัง](sequence-comparison.png)

คลิปใหม่เก็บ virtual clock ทุก 25ms ที่ 390×844 แล้ว encode 40fps ไม่มีเสียง ไม่ใช่ benchmark FPS เปรียบเทียบกับคลิป pilot เดิมตาม timestamp ของเทิร์นเดียวกัน ภาพแถวบนคือเดิม แถวล่างคือแก้แล้ว ตรวจว่าดาบไม่ลงก่อน contact และกลับขึ้นทันทีอีกครั้ง ภาพที่ส่งให้ผู้ใช้เป็นภาพในเกมจริง

การลองสร้าง strip 16 เฟรมยังได้ท่าที่ห่างกันและภาพซ้ำ จึงไม่ใช้ใน runtime เก็บ draft ใน Library `/workspace/generated_images/exec-fa26ee6b-c66f-4224-a33f-ad8104eba9a0.png` และ reference ที่ `/tmp/asterveil-smooth-drafts/` ชุดภาพ WebP ที่ผ่านแล้วไม่เปลี่ยน

## ตรวจสอบ

- typecheck / lint / build:pages ผ่าน
- focused frame-view/frame/controller/playback/effects: 5 files / 27 tests ผ่าน
- Chromium pilot basic + Execute/Shadow Knife, fast/standard, reduced intensity, OS reduced-motion toggle และ skip/resize/reload/hidden: 7 กรณีผ่าน
- ชุด unit รวม 854 tests / 74 files ผ่าน; ผลรันทวนสุดท้ายและ CI/เผยแพร่บันทึกที่ PR/เอกสารส่งต่อ
- ใช้ Playwright ของ repo เพราะไม่มี Browser control tool ในเซสชัน ไม่อ้าง Safari หรือมือถือจริง

ข้อจำกัด: ภาพพื้นฐานยังเป็น key poses เดิม การเชื่อมช่วงสั้นอาจมีความนุ่มที่ขอบระหว่างเคลื่อนไหว แต่หลีกเลี่ยง dissolve ยาวซึ่งทำให้เห็นตัวซ้อนชัด ไม่ถือว่าการทดสอบผ่านคือการอนุมัติ artwork ใหม่
