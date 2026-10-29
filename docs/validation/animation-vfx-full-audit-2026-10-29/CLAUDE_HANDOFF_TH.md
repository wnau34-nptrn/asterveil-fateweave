# Prompt ให้ Claude — แก้จากผลตรวจครบ catalog

```text
ดำเนินการแก้คุณภาพ animation/VFX ของ Asterveil-Fateweave จาก visual audit ล่าสุด ไม่ใช่ตรวจ coverage ของโค้ดอย่างเดียว

Repo: wnau34-nptrn/asterveil-fateweave
สาขาเกม: feature/fateweave-initial-prototype (ไม่ใช่ main)
เริ่มจาก HEAD ล่าสุด อ่าน AGENTS.md/CLAUDE.md ก่อน และรักษางานใหม่ทั้งหมด

อ่าน:
docs/validation/animation-vfx-full-audit-2026-10-29/README_TH.md
docs/validation/animation-vfx-full-audit-2026-10-29/COVERAGE_TH.md
docs/validation/animation-vfx-full-audit-2026-10-29/coverage.json
docs/validation/animation-vfx-full-audit-2026-10-29/CLIPS_TH.md
docs/handoffs/CODEX-TO-CLAUDE.md

Audit source: 157d6855808edbcf055929cd00f1e0b1dbfea91e
ตรวจ 36 identities, 73 ActionIds, 48 enemy variants; 362 cases พร้อม sampled runtime strips, events และ72คลิปเวลาเดินจริง แยก smoke modes ออกจาก visual review แล้ว อย่าเรียกทุกกรณีว่า visual pass เพราะ state tests ผ่าน

แก้ตามลำดับ:
1. AV01/P1 Aegis anatomy pop ทั้ง7ท่า: รักษา head/face/neck/shoulder/weapon model เดียวกับ seed แก้ต้นทาง/normalization ก่อน pack ไม่ขยาย idle ให้ผิดตาม generated pose หรือเพิ่ม dissolve กลบอาการ
2. AV03/P1 Mira/Toma basic attack ใช้ VFX ดาบ ให้แยก presentation profile ตามอาวุธ/identity โดยคง damage kind/ActionId/จำนวนhitเดิม
3. AV04/P1 Mira projectile ออกก่อน body ปล่อย: Hinder 66/171ms มี flight แต่ body ยังง้าง frame1–4; contact263msค่อยเข้าframe5 จัด release cue ของ gesture และจุด bow/nock ให้ตรง flight start/ตำแหน่งจริง โดยคง damage contact/end เดิม ทวน6ท่าของMiraและKnivesตามgestureSefa
4. AV02/P2 Lyra finisher/lunge/sweep/parry/mark ยังใช้ frame0 transform; Garran Brace/WarCry counter เล่น hurtโดยไม่มีแรงสวน อ่านก่อนmap clips ใช้ artเดิมได้เมื่อgestureตรงกัน มิฉะนั้นทำ briefให้Codexแก้ภาพตามการแบ่งหน้าที่เดิม
5. AV05/P2 generic hit flash ทำให้ตัวรับกลายขาวทึบ90ms ทั้งenemy energyและBard/Saintที่ยังfallback ลดflashโดยรักษาหน้า/ชุด และตาม effect preferences
6. AV06/P2 ปิด18identity/19ActionIdที่ยังfallbackตามW4–W8 ใช้งานภาพPRที่มีแล้วและowner decisionsจริง ไม่สร้างซ้ำ ไม่แก้ชื่อintent/contentให้ตามbriefที่คลาดเคลื่อน ระวังRaider/Matriarch incomingหันซ้ายแล้วจึงห้ามflipซ้ำ
7. AV07/P1 จัดsignatureกับpersistent world-space charge cuesของbossจากstateจริง ปกติ/unstoppableคนละทรง;คืน cueหลังrepaint/reload;ล้างเมื่อrelease/cancel/down/ออกสนาม มีHUDคำเตือนเดิมอยู่แล้วให้รักษา;phase/summonไม่แสดงdamageปลอม,AoEเฉพาะผู้รับจริง
8. AV08/P2 ย้ายcaptionออกจากrendered face/weapon/HP และทำdown motionให้อ่านออกก่อนdim corpse โดยไม่เปลี่ยนHP0หรือเวลาล็อกเทิร์น

ข้อกำหนด:
- ไม่เปลี่ยนrules/save/balance/ActionId/logical contact/endเพื่อกลบภาพผิด
- การย่อตัว/หมุน/foreshorteningที่ตั้งใจยังทำได้ ไม่บังคับทุกbboxเท่ากันหรือบีบทั้งตัวต่อเฟรม
- เก็บ fallback เล่นต่อได้เมื่อassetโหลดช้า/พัง และไม่เปลี่ยนภาพกลาง committed cast
- ตรวจnormal/fast/quiet/OSreduce พร้อมhit/block/dodge/down/revive/counter/Guardredirect/phase/summon/skip/reload/resize/hidden-tabที่เกี่ยวข้อง ผลresolverและคำสั่งที่commitเท่าเดิม
- ใช้ meaningful tests ว่าrouteและrelease cueตรงอาวุธ/เหตุการณ์จริง ไม่ใช่assertว่ามีframeหรือatlasก็พอ
- ส่งbefore/afterจากruntimeที่ขนาด390pxและภาพseed→first/last generated pose ระบุsourceSHA,timing,clip และข้อจำกัดdeviceจริง ห้ามปิดfindingจากCIหรือstaticstoryboard
- บันทึกผลรายAVxxและงานค้างในhandoff/coverage ไม่ถือว่าของที่ยังไม่ตรวจผ่านเป็นapproved

ทำ implementation/verification ที่ทำได้ต่อเนื่องตามสิทธิ์เดิม งานนี้เจ้าของให้ตรวจและส่งแก้ชัดเจนแล้ว อย่าหยุดเพียงเสนอแผน หากจำเป็นต้องแก้ภาพต้นทางให้ส่งbriefที่concreteพร้อมframe/หลักฐานแล้วทำส่วนที่ไม่ติดขัดต่อ ไม่อ้างว่าCodex/Claudeอีกฝ่ายเริ่มทำหากยังไม่ได้dispatchจริง
```
