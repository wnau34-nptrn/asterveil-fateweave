# บอสป่าทึบ: Thorn Tempest ตอบได้ (OD-09) — 2026-11-04

เจ้าของเลือกข้อ 2 (ข้อค้าง P02: “บอสป่ายังแพ้การกดโจมตีอย่างเดียวเมื่อทีม 5 คน”) สาขา `claude/forest-boss-tempest`

## ที่เปลี่ยน (`elite-briar-lord` v9 → v10)

- Thorn Tempest (หลัง Gather Thorns ในเฟส <50%) จาก 13 กันไม่ได้ → **28 ผนึกได้** (Sigil Bind ผนึกท่าพลังงาน; โล่/ฮีลช่วยลด) ทีมที่ไม่ตอบรับความเสียหาย 28 ทุกคน ตาม OD-09 (ประกาศกลไก ตอบได้เปรียบ ไม่ตอบโดนหนัก ไม่ใช่แพ้ทันที)
- ภาพรอชาร์จของบอส (AV07) เปลี่ยนจากกรอบฟันเลื่อย “กันไม่ได้” เป็นแบบ “ปกติ” (`gather-thorns_prepare`) ซึ่งมีอยู่แล้วใน atlas เพราะท่าปล่อยผนึกได้แล้ว ไม่มีภาพใหม่
- ไม่เปลี่ยนเซฟ บอสแผนที่อื่น หรือความแรง (`bossPercent`/`percent`)

## ทดลองแล้ว (campaign sim 12 บริษัท × 4 นโยบาย)

| รอบ | ผล |
| --- | --- |
| Tempest 22 ผนึกได้ | บอสป่ากดโจมตี 50–71% → 33–71% ผ่าน gate |
| Tempest 28 + อีลิทประตูแผนที่ 3 155% | gate ล้ม: rush/casual แผนที่ 3 รอบแรก 67% → 42% |
| Tempest 28 + อีลิท 140% | gate ล้ม 67% → 42% |
| Tempest 28 + Thorn Storm 32 ผนึกได้ | gate ล้ม 67% → 58% |
| **Tempest 28 + อีลิท 130% เดิม (เลือก)** | ผ่านทุก gate |

## ผลที่เลือก (ก่อน → หลัง, `docs/validation/roster-30/batch-1/CAMPAIGN.md`)

นโยบาย: R/E = rush/explorer, a/c = advisor/casual · `เส้น` = เส้นทางป่าทึบ, `แนวร` = แนวรอยแยก

```text
Ea เส้น #1 clear                  83% ->   83%
Ea เส้น boss                      92% ->   92%
Ea เส้น boss:attack               69% ->   62%
Ea เส้น elite-forced             100% ->  100%
Ea เส้น elite-forced:attack       14% ->   14%
Ea แนวร #1 clear                 100% ->  100%
Ea แนวร boss                     100% ->  100%
Ea แนวร boss:attack               79% ->   79%
Ea แนวร elite-forced             100% ->  100%
Ea แนวร elite-forced:attack       88% ->   88%
Ec เส้น #1 clear                  50% ->   50%
Ec เส้น boss                      93% ->   86%
Ec เส้น boss:attack               71% ->   64%
Ec เส้น elite-forced              78% ->   78%
Ec เส้น elite-forced:attack       22% ->   22%
Ec แนวร #1 clear                 100% ->  100%
Ec แนวร boss                      98% ->   98%
Ec แนวร boss:attack               76% ->   76%
Ec แนวร elite-forced             100% ->  100%
Ec แนวร elite-forced:attack       98% ->   98%
Ra เส้น #1 clear                 100% ->  100%
Ra เส้น boss                     100% ->  100%
Ra เส้น boss:attack               58% ->   42%
Ra เส้น elite-forced             100% ->  100%
Ra เส้น elite-forced:attack        8% ->    8%
Ra แนวร #1 clear                  83% ->   83%
Ra แนวร boss                      94% ->   94%
Ra แนวร boss:attack               63% ->   63%
Ra แนวร elite-forced             100% ->  100%
Ra แนวร elite-forced:attack       86% ->   86%
Rc เส้น #1 clear                  92% ->   92%
Rc เส้น boss                     100% ->  100%
Rc เส้น boss:attack               50% ->   33%
Rc เส้น elite-forced             100% ->  100%
Rc เส้น elite-forced:attack       15% ->   15%
Rc แนวร #1 clear                  67% ->   67%
Rc แนวร boss                      94% ->   94%
Rc แนวร boss:attack               59% ->   59%
Rc แนวร elite-forced             100% ->  100%
Rc แนวร elite-forced:attack       83% ->   83%
```

- บอสป่าแบบกดโจมตีอย่างเดียว: 58/69/50/71% → 42/62/33/64% (Ra/Ea/Rc/Ec) ทีมที่เล่นตามคำแนะนำยังชนะเท่าเดิม ยกเว้น explorer/casual 93% → 86% (1 ใน 14 ศึก) และอัตราเคลียร์รอบแรกทุกเซลล์เท่าเดิม
- `npm run sim` 28/28 ผ่าน: CLASSES ตัวที่ไม่ลงต้นไม้ (`none`) เลือดเหลือลด 1–3 จุด ลลิน/วิลา `none` 10/10 → 9/10; formation การกดโจมตีอย่างเดียว 9/10 → 8/10 (ตั้งใจ)

## ยังค้าง

- **อีลิทประตูแผนที่ 3** (บอสตัวเดียวกันที่ Lv9 130%) ยังแพ้การกดโจมตี 83–98% เพราะทีมที่มาถึงแผนที่ 3 แรงกว่ามาก แต่การเพิ่มความแรงแม้ 140% ทำให้รอบแรกของ rush/casual ล้มบ่อยขึ้น (เสียเลือดก่อนบอส) ต้องแก้ด้วยกลไกเฉพาะของแผนที่ 3 หรือแยก encounter ให้ประตู ไม่ใช่เพิ่มเลือด — รอเจ้าของเลือก
- ทดสอบใน sim เท่านั้น ยังไม่มีผู้เล่นจริง
