# Claude handoff — Combat Impact Slice 01
2026-11-14 · [Issue #246](https://github.com/wnau34-nptrn/asterveil-fateweave/issues/246)

## เจ้าของขอ
“ขอ handoff ส่งให้ claude ที แล้วถ้ามีภาพอะไรต้องทำเพิ่มให้ claude ส่งมาให้ codex ทำต่อ”
ส่งต่องานต้นแบบ 3 ท่าตามข้อเสนอ ไม่มีการอนุมัติ motion ทุกชุดหรือ rollout ทุกสกิล Codex บันทึก handoff ในงานนี้เท่านั้น ยังไม่ได้แก้เกมจริง

## เริ่มต้น
- อ่าน AGENTS.md, CLAUDE.md, CURRENT_STATE.md จาก game branch ล่าสุด feature/fateweave-initial-prototype รักษางานอื่น โดยเฉพาะ P04/P09
- อ่าน [แกลเลอรีและแผน](../../incoming/ART-COMBAT-IMPACT-001/README_TH.md) บน reference branch docs/combat-impact-proposal-2026-11-14
- ทำ implementation branch จาก game branch ล่าสุด อย่า merge reference branch ทั้งก้อน เพราะสถานะเอกสารบนนั้นเป็น snapshot
- ตรวจ implementation ล่าสุดก่อน: findings เดิมมาจาก 356afdd เมื่อ 2026-11-13 ไม่ใช่ audit ของ HEAD วันนี้
- Mockup ไม่ใช่ sprite/atlas; ชื่อ HP ปุ่ม และ selection บางส่วนคลาดเคลื่อน ห้ามคัดลอกเป็น UI/balance spec

## ต้นแบบ 3 ท่า
1. Lyra attack: ง้างสั้น → เร่งฟัน/พุ่งชั่วคราว → ปะทะ → คืนช่อง
2. Aegis Shield Bash: โล่นำ จุดกระแทกหน้าโล่ เป้ารับแรงตามทิศ ต่างจากคมดาบ
3. Eira Arcane Bolt: กระสุนออกจากคทา ถึงเป้าแล้ว burst เฉพาะจุด ไม่มี melee lunge
ใช้ภาพเดิมพิสูจน์จังหวะก่อน หากอ่านท่าไม่ได้ให้ส่ง brief ภาพเพิ่มให้ Codex ไม่ฝืนยืด sprite หรือใช้แสงกลบ

## ขอบเขตการทำงาน
- ประสานท่า จุดปะทะ เสียง ประกาย ตัวเลข HP จริง และ recoil ให้เป็นเหตุการณ์เดียว
- รักษา rules, damage, cooldown, targeting, formation, save/server outcomes และ authoritative contact/turn timing
- ทดลอง presentation-only contact hold 30–45 ms ทั่วไป / 50–70 ms ท่าหนัก เป็นค่า A/B ยังไม่ล็อก ห้าม pause rule/server clock หากทำโดยคง timing เดิมไม่ได้ให้เสนอทางเลือกก่อน
- คืนตำแหน่ง/anchor หลังพุ่งหรือสะดุ้ง; HUD อยู่นิ่ง
- HP จริงอัปเดตที่ contact; delayed HP trail เป็นภาพแยก ไม่ทำค่าจริงหน่วง
- ไม่สร้าง critical, extra hit, stun หรือผลโจมตีที่ resolver ไม่ได้ให้; hit/block/absorb/dodge/cancel ตรง actual events
- รักษา inspector ตามเจ้าของเทิร์น/เลือกเป้า/เลือกดูเองและ buff-debuff; lower HP cards ทั้ง 5 คงเดิม
- รักษา straight unit HP counters และสีเขียว >40%, ส้ม >25–40%, แดง ≤25%
- ข้อเสนอย่อ HP/ลูกศรที่ยังไม่อยู่ในเกมจริงไม่ใช่งานแทรกใน slice นี้

## Claude → Codex เมื่อภาพไม่พอ
ตรวจ existing sprites/registry ก่อน แล้วสร้างไฟล์ docs/handoffs/CLAUDE-TO-CODEX-COMBAT-IMPACT-ART-001.md ใน implementation branch พร้อม comment ลิงก์ใน issue #246 และ prompt สั้นให้เจ้าของส่งเปิดงาน Codex
การเขียนไฟล์ไม่เรียก Codex อัตโนมัติ หากไม่มีช่องส่งตรงต้องบอกเจ้าของว่ามี brief พร้อมส่งแล้ว

แต่ละคำขอภาพต้องมี:
- Request ID, unit/art/action ID, outcome, priority, เหตุผลที่ของเดิมไม่พอ และ reference asset paths
- ต้องการ windup/contact/recovery/hit-reaction หรือ projectile/contact/tail VFX ใด
- ทิศทาง จำนวน/ลำดับเฟรม ขนาดเฟรม pivot/foot anchor visual bbox/scale alpha/padding safe bounds ตามที่ integration ต้องใช้
- แยกข้อกำหนดที่ล็อกแล้วจากข้อเสนอของ Claude ไม่อ้างจำนวนเฟรม/ขนาดที่เดาเป็นคำสั่งเจ้าของ
- รักษารูปร่าง อาวุธ จำนวนแขนขา แยก VFX ออกจาก unit frames ที่ต้องนำไปประกอบ
- VFX ระบุ source/target anchor, travel direction, ความอ่านง่าย 390px และ miss/guard/reduced-motion variants เฉพาะที่จำเป็น
- อ่าน docs/handoffs/ANIMATION_PROMPT_QUALITY_TH.md และ art pipeline ก่อนเขียน brief
- เริ่ม batch เล็กหนึ่งตัว/หนึ่งท่า ตรวจ consistency ก่อนขยาย

## Codex → Claude ของส่งกลับ
- Art ใหม่อยู่ incoming/ART-COMBAT-IMPACT-001/<request-id>/ บน art branch แยกตามกติกา repo
- ส่ง reference inputs, originals/strip, contact sheet/frame order, metadata anchor/scale และ README integration
- ระบุสิ่งที่ตรวจ/ยังไม่ตรวจ request ID branch/commit/path ใน handoff และ issue comment
- Claude integrate; ไม่อ้าง owner approval จาก test หรือการเลือกของ Claude ระบุผู้ตัดสินจริง

## เกณฑ์ส่งมอบให้เจ้าของ
- คลิปจริงก่อน/หลังที่ 390px พร้อมเสียง ทั้ง 3 ท่า ภาพนิ่งไม่ใช่หลักฐาน motion ผ่าน
- normal/fast, reduced motion/effects, skip/เปลี่ยนเทิร์น และ cleanup ไม่ค้าง offset/particles
- actual hit, block/absorb, dodge, cancel, down, multi-target เท่าที่เกี่ยวข้อง
- boss ใหญ่กลางแถวหน้ามีมอนบนล่าง, 5v5; ตัวเลขไม่บังหน้า HP หรือ inspector; HUD 5 ใบอ่านได้
- รัน required checks ตามไฟล์ที่เปลี่ยน; registry/content/atlas เปลี่ยนต้อง coverage:presentation/atlas verification ตามกติกา
- ระบุ Chromium emulation หรือมือถือจริงตามที่ทดสอบ; Web Audio init ไม่พิสูจน์ว่าได้ยินเสียง
- บันทึก handoff ตาม repo พร้อมรายการ art ที่ยังขาด
- จบที่ต้นแบบให้เจ้าของดู motion ก่อนขยายทุกตัว/ทุกสกิล

## Prompt เปิดงาน Claude
อ่าน AGENTS/CLAUDE/CURRENT_STATE ล่าสุด แล้วอ่าน handoff นี้และ issue #246 ทำ Combat Impact Slice 01 เฉพาะ Lyra attack, Aegis Shield Bash, Eira Arcane Bolt ใช้ภาพเดิมพิสูจน์จังหวะก่อน รักษา rules/save/balance/authoritative timing และ HUD 5 ใบ ถ้าภาพไม่พอให้ส่ง technical brief ให้ Codex ตามขั้นตอนข้างต้น ส่งคลิปจริง 390px พร้อมเสียงก่อนขยาย อย่า merge reference branch ทั้งก้อนหรือใช้ตัวเลขจาก mockup เป็น balance
