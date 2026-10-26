# Handoff — C5.2 โล่/ป้องกัน (2026-10-26)

## ข้อความเปิดแชตใหม่ — คัดลอกได้เลย

```text
ทำงานต่อใน Asterveil-Fateweave: C5 ตระกูล 2 โล่/ป้องกัน
อ่าน docs/handoffs/C5-FAMILY-2-DEFENSE-HANDOFF-TH.md แล้วทำตามบริบทและข้อกำหนดในนั้น
ตระกูล 1 ผ่านและ merge PR #59 แล้ว ให้เริ่มด้วย artwork/storyboard 3 จังหวะของทั้ง 11 สกิล
แต่ละท่าต้องมีเอกลักษณ์ น้ำหนักพอดี ไม่บางหรือหนาจนบังตัวละคร และดูชัดที่ 390px
ใช้ ImageGen ได้ตามที่อนุญาตไว้แล้ว ทำภาพเอฟเฟกต์แยกพื้นโปร่งใส แล้ววางบนภาพเกมจริง
ส่งให้ดูแบบภาพก่อนต่อเป็น VFX จริง จากนั้นทำ atlas/module ร่วมหนึ่งชุดต่อหนึ่งตระกูล
รักษากฎ ผลลัพธ์จาก resolved events และ timing เดิม เปิด PR เข้า feature/fateweave-initial-prototype
ทำเฉพาะตระกูล 2 หยุดรอเจ้าของตรวจคลิปก่อนเริ่มตระกูล 3
```

## ฐานและสถานะที่ยืนยันแล้ว

- Repository: `asterveil-fateweave` เท่านั้น ห้ามนำ code/assets จาก Rise Beyond มาใช้
- Base: `feature/fateweave-initial-prototype`; fetch ฐานล่าสุดก่อนเริ่ม สร้าง branch ใหม่ `codex/vfx-family-2-defense` และแยก worktree ถ้าจำเป็น อย่าใช้ branch ตระกูล 1 ต่อ
- C5.1 ฟัน/แทง 10 ท่า: เจ้าของเลือก artwork R4 รวม Pierce R2 หอกหนาขึ้น และอนุมัติ “merge ได้เลย” แล้ว
- PR [#59](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/59) merged เป็น `d14a3e18f93f2e39b1e077dc22f683d506852151`; เอกสาร release proof ตามที่ `0906501`
- Pages run `40348106389` เผยแพร่สำเร็จครบ build/browser 4 shards/deploy; WebP ที่เว็บ HTTP 200 และ hash ตรง R4 ดู `docs/validation/blade-vfx-release/README_TH.md`
- ตระกูล 2 ยังไม่ได้สร้าง artwork หรือ runtime ใน handoff นี้ การอนุมัติตระกูล 1 ไม่ใช่การอนุมัติภาพตระกูล 2

## อ่านก่อนทำ

1. `AGENTS.md`, `CLAUDE.md` โดยเฉพาะ VFX status และ standing authorization
2. `docs/design/SYSTEMS_REFERENCE.md` ส่วน VFX/combat presentation
3. `docs/combat-presentation/vfx-art-direction/README_TH.md`
4. ตาราง C5 ใน `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`
5. `src/game/visuals/bolt-fx.ts`, `exec-ward-fx.ts`, `blade-fx.ts` และ atlas/คลิปที่สัมพันธ์กัน
6. `docs/combat-presentation/blade-storyboards/README_TH.md`, `blade-slice/README_TH.md` และ release proof ข้างต้น

## ขอบเขตตระกูล 2

11 สกิล: **guard, aegis, rally, bulwark, stonearmor, guardstone, halo, sanctuary, brace, spearwall, hold**

Ward มี approved slice อยู่แล้ว ไม่รวมการวาดใหม่ในชุดนี้ Bolt/Execute และ blade R4 เป็น reference เท่านั้น

ตรวจคำอธิบายและ resolved events ของแต่ละท่าในฐานล่าสุดก่อนออกแบบ โดยเฉพาะ Guard redirect, mitigation, barrier, aura และ counter ห้ามสมมุติว่าท่าป้องกันทุกท่าสร้างโล่ดูดซับ หรือทำโล่แตกทั้งที่ event ไม่รองรับ

## แนวภาพและกระบวนการ

- เริ่ม artwork 3 จังหวะ เตรียม/จุดเด่น/สลาย ของ 11 ท่า ให้เอกลักษณ์ตามกลไกจริง เช่น รูปร่าง ทิศทาง ระยะครอบคลุม และจังหวะ ไม่ใช่เปลี่ยนสีอย่างเดียว
- เจ้าของเคยแจ้งว่าชุดแรกบางไป ต่อมาหนาไปและคล้ายกันเกินไป เป้าหมายคือน้ำหนักกลาง อ่านทรงชัด มีพื้นที่โปร่ง ตัวละคร/HP/ข้อความยังอ่านได้ ใช้ palette จาก skill icons
- ภาพเอฟเฟกต์แยกพื้นโปร่งใส คอมโพสิตบน screenshot เกมจริงขนาด 390px ห้ามให้ AI วาดทับ UI ตัวอักษรหรือตัวละคร ส่งภาพให้ดูครั้งละ 1–2 ภาพและมีหน้าเลือกท่า
- เจ้าของอนุญาต “ใช้ ImageGen ทำต่อได้” แล้ว หลัง Shado มีปัญหาพอร์ต/transport และ Sophos block ไม่ต้องรอแก้ Shado หรือขออนุญาตเปลี่ยนเครื่องมือซ้ำ อ่าน imagegen skill ก่อนสร้าง ใช้เครื่องมือ ImageGen ที่มีให้ ตรวจภาพและขนาดจริงก่อนส่ง
- รอเจ้าของเลือก/แก้ artwork ก่อนต่อ runtime ตาม workflow ที่ร้องขอ เมื่อเลือกแล้วรวมภาพที่เลือกไว้ใน atlas เดียวและ module เดียว ใช้ตารางเล็กเลือก frame/สี/ขนาด/ทิศ ไม่แยก atlas/module ต่อสกิล
- ชื่อที่เสนอ: `incoming/ART-VFX-DEFENSE-001/`, `public/assets/fx/defense_fx.webp` + `.json`, `src/game/visuals/defense-fx.ts`, `docs/combat-presentation/defense-slice/` เก็บ originals/prompts/manifest และ script package ที่ทำซ้ำได้
- Blade R4 เป็นต้นแบบการรวมภาพเฉพาะท่าลง atlas ร่วม: 38 frames, 1584×1848 ใช้ `incoming/ART-VFX-BLADE-001/package-approved.py`; `package.py` เก่าเป็น R1–R3 อย่ารันแล้วทับ atlas ปัจจุบัน

## ข้อกำหนด runtime

- `src/ui/battle-playback.ts` เป็นเจ้าของ timing รวม fast mode ห้ามเปลี่ยนจังหวะเพื่อให้ภาพพอดี
- VFX ไม่มีสิทธิ์แก้ state/rules/save/balance ผล dodged/blocked/guarded/cancelled/absorbed และผู้รับจริงต้องอ่านจาก resolved events ห้ามเดาจากชื่อสกิลหรือ selected target
- OS reduced-motion ใช้ still frame; reduced intensity ลดความเข้ม/อนุภาค
- cleanup ภาพ/tween/timer ที่เป็นเจ้าของเมื่อ skip/load/resize/hidden ห้าม callback ค้างหรือเพิ่ม command
- รักษา unit-animation controller และ nonblocking optional-asset loading จากฐานล่าสุด เริ่ม unit pose ก่อน VFX early return และรักษา contact/reaction controller กับข้อความเหนือเอฟเฟกต์
- ถ้าต้องเปลี่ยนกฎ/เซฟให้บันทึกคำถามใน “ฝากถึง Claude” ไม่แก้เพื่อเอื้อภาพ

## หลังเลือก artwork แล้ว

1. ต่อ runtime ตามข้อกำหนด ทดสอบ `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` และ battle Playwright ที่เกี่ยวข้อง
2. บันทึกคลิป actual runtime 390×844 ต่อ skill type และผลที่มีจริง (สำเร็จ/blocked/dodged ฯลฯ ตามกลไก) รวม fast/reduced-motion ที่เกี่ยวข้อง เก็บ clips และ README/manifest ใน defense-slice
3. Capture ใช้ renderer/playback/resolver จริง อย่าแทรกผลลัพธ์ด้วยภาพปลอม อย่าอ้าง Chromium emulation ว่าเป็นเครื่องจริง แยก capture จาก full tests เพื่อลด frame drop
4. Fixture ใต้ tests ไม่ได้ ship ขึ้น Pages: blade มี dev-source fixture gate แยก 28 checks และ production suite skip เฉพาะ fixture นั้น รักษา gate นี้ และแยก fixture ใหม่อย่างตรงไปตรงมา
5. เปิด PR ตระกูล 2 เข้า base บันทึกบนสุด `CODEX-TO-CLAUDE.md`, อัปเดต C5 status และ `NEW-CHAT-HANDOFF-TH.md` ส่งคลิปให้เจ้าของตรวจแล้วหยุด ไม่เริ่มตระกูล 3 จนมี owner approval ลงบันทึก

Standing authorization ครอบคลุมงานที่ร้องขอ/ทดสอบ/commit/push/PR ไม่ต้องสร้าง permission checkpoint ซ้ำ แต่การเลือก artwork และตรวจคลิปเป็นขั้น review ภาพที่เจ้าของขอไว้ ต้องรักษาไว้
