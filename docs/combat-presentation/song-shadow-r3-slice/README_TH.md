# C5.8 บทเพลงลิโอ + C5.9 เงาเซฟา — R3 (ART-VFX-SONG-SHADOW-002)

30 ตุลาคม 2026 · branch `claude/song-shadow-r3` · ฐานเกม `9313af3`

[หน้าคลิปก่อน–หลัง (Artifact)](https://claude.ai/artifact/AzESrmF88nzGGXxzi9rgJT) · [index.html](index.html) · ก่อน (R2/R1): [song-shadow-slice](../song-shadow-slice/README_TH.md)

**สถานะ: รอเจ้าของดูคลิปจริงและอนุมัติ motion ก่อน merge/เผยแพร่** — ผลเทสต์ไม่ใช่การอนุมัติภาพ

## การเลือกภาพ

เจ้าของอนุมัติ 2026-10-30 (“เอาตามที่คุณแนะนำทั้งหมด”) = R3 จาก PR #111. R3 มี **21 เลเยอร์ / 7 ท่า** (valor, solo, evade, dread, finale, finale-mend, finale-dread) **ไม่มี note และ decoy** จึงคง note = เพลง R2 และ decoy = เงา R1 จากแพ็ก 001 (ไม่เปลี่ยนภาพ) ใน atlas เดียว `song_shadow_fx.webp` 27 เฟรม 1024×1194 lossless — decoded **4.66 MiB (เดิม 5.24)**, ดาวน์โหลด 0.90 MB (+json 9 KB). ตรวจ `sha256sum -c SHA256SUMS` + `verify.py` ผ่านทั้ง 21 เลเยอร์ก่อนใช้. สร้างด้วย `incoming/ART-VFX-SONG-SHADOW-002/atlas.py` (พิกเซลไม่ถูกแก้, ตัดขอบโปร่งใส, pivot จาก `layers.json` ของ R3)

## ที่เปลี่ยน (เฉพาะการนำเสนอ `song-fx.ts`)

- ความกว้างจาก layers.json ของ R3 และ **ตัดตัวคูณเดิม 1.9/1.6/1.7 ออก** (R3 รวมขนาดแล้ว); เลเยอร์พื้นยังอยู่ใน body ใต้สไปรต์ + ขอบหน้าบางๆ (valor/evade)
- `solo`: prepare/peak/settle อยู่หลังพันธมิตรที่ได้รับบัฟจริงทั้งชุด (เดิม prepare อยู่ที่ลิโอ)
- `finale` เพลงฟื้นฟู/สะท้าน: ใช้ชุด `finale-mend`/`finale-dread` — prepare ที่มือ, peak + settle ที่เอวพันธมิตรแต่ละคนที่ resolver **ฟื้น/ให้โล่จริง** (heal / `Added barrier.`); ไม่มีผู้ได้ผล = แค่ prepare; **ไม่ใช้ contact โจมตี**
- `dread`: คลื่นเดียวไปทางศัตรู + สัญลักษณ์ข้างเอวศัตรูที่ยืนอยู่ (เดิม) ไม่มีดาเมจ
- rules/save/content/balance/playback timing/ActionId ไม่เปลี่ยน; normal/fast/reduced/OS reduce ทำงานเหมือนเดิม (reduced = ภาพนิ่งที่ปลายทางแล้วจาง)

## ผลตรวจ

- typecheck ผ่าน; `tests/song-fx.test.ts` 12/12 (รวมเคส finale-mend/dread ตาม event จริง, ไม่มีผู้ถูกฟื้น = แค่รวมพลัง, solo prepare ที่ผู้รับ); Playwright `song-fx.spec.ts` 13/13 (finale mend/dread นับ peak/settle ตามจำนวนผู้ได้ผลจริง)
- คลิปจริง 22 คลิป 390px (valor/finale/dread/solo/evade × normal/fast/reduced/OS-reduce + finale-mend/finale-dread; note/decoy ภาพไม่เปลี่ยนจึงไม่อัดใหม่) Chromium จำลอง ไม่ใช่มือถือจริง/iOS Safari
- fixture ใหม่ `hurt` ให้พันธมิตรบาดเจ็บ เพื่อให้เพลงฟื้นฟูมีผลจริง (เต็มเลือด resolver ไม่ปล่อย heal)
- **จุดให้เจ้าของดู**: evade ที่เท้าเซฟายังบางเมื่อเทียบฉาก; ไม่ได้ปรับสเกลเพิ่มจากที่ Codex กำหนด
