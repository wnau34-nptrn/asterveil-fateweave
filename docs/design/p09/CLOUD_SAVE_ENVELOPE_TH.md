# P09-01 — Envelope นำเข้าเซฟเดิม และรูปแบบ snapshot บน server

11 พฤศจิกายน 2026 · อัปเดตตาม D10 = ค: เครื่อง**ไม่**อัปโหลดเซฟเป็นประจำอีก envelope นี้ใช้เฉพาะ (1) นำเข้าเซฟในเครื่องครั้งเดียว (D11) และ (2) admin กู้/ย้อน snapshot · **[โค้ด]** = ข้อเท็จจริง; **[เสนอ]** = ข้อเสนอ · ต้นแบบ `src/core/cloud/cloud-save.ts`, เทสต์ `tests/cloud-save-envelope.test.ts`

## 1. ข้อเท็จจริงจากเซฟปัจจุบัน [โค้ด]

- เซฟ v58 เป็นสตริง JSON `{version, profile, run}`; `parseGame(raw, map, lookup, maps)` เป็น pure จึงรันใน Worker/DO ด้วยโค้ดชุดเดียวกันได้
- `parseGame` รับเวอร์ชัน 1–58 แล้วย้ายในหน่วยความจำ; `saveGame` เขียนเวอร์ชันล่าสุดเสมอ
- วัดในเครื่อง (Node): เซฟใหม่ไม่มี run ≈ 748 ไบต์, มี run ≈ 2,219 ไบต์, `parseGame` ≈ 0.7 ms; เซฟปลายเกมยังไม่ได้วัด
- `parseGame` ไม่พิสูจน์ที่มาของรายได้ (เซฟที่แก้ bank เป็นเพดานผ่าน)

## 2. Envelope นำเข้า [เสนอ, มีต้นแบบ]

```jsonc
{
  "format": 1,
  "requestId": "req_…",           // 16–64 ตัว [A-Za-z0-9_-]; retry ใช้ id เดิม
  "baseRevision": 0,              // นำเข้าครั้งแรก = 0
  "saveVersion": 58,              // ต้องตรงกับ payload.version
  "payload": "{\"version\":58,…}", // สตริงเซฟในเครื่องตรงตัว
  "payloadBytes": 2219,           // ความยาว UTF-8
  "payloadSha256": "…64 hex…"
}
```

ลำดับตรวจ (`checkUpload` แล้ว replay):
1. รูปร่าง คีย์ครบไม่เกิน → `format`, `requestId`, `baseRevision`, `saveVersion` ที่ build รองรับ
2. **ขนาดก่อนอย่างอื่น** (ร่าง 256 KiB ทั้งความยาวและไบต์ UTF-8) และ `payloadBytes` ตรง
3. SHA-256 ที่ server คำนวณเองต้องตรง — จับข้อมูลเสีย ไม่ใช่กันโกง
4. `JSON.parse` ได้และ `version === saveVersion`
5. `parseGame` ด้วย content ของ build เดียวกัน
6. `decideUpload`: นำเข้าครั้งแรก → `store`; retry → `replayed`; requestId เดิม payload ต่าง → ปฏิเสธ; บัญชีมีสถานะอยู่แล้ว → `conflict` (นำเข้าซ้ำไม่ได้ ตาม D11)

## 3. Snapshot บน server [เสนอ]

- สถานะของ DO เก็บเป็นสตริงรูปแบบเซฟเดิม `{version, profile, run}` (รวม seed ซึ่ง**ไม่ส่งให้เครื่อง**) + `seq` ล่าสุด + command log ตั้งแต่ snapshot ก่อนหน้า
- snapshot ใหม่เมื่อจบการเดินทาง/ทุก N คำสั่ง (ร่าง) เก็บ 30 วัน (D6); สถานะ = snapshot + เล่น log ต่อ (deterministic)
- ตรวจได้เสมอ: โหลด snapshot ด้วย `parseGame` แล้ว replay log ต้องได้สถานะเดียวกัน (ใช้เป็นเทสต์และเครื่องมือ admin)

## 4. ย้ายเวอร์ชัน v58 → v59 และต่อไป [เสนอ]

- DO โหลด snapshot ด้วย `parseGame` (ย้ายในหน่วยความจำ) แล้วเขียน snapshot ใหม่เป็นเวอร์ชันล่าสุด — เส้นทางเดียวกับ local วันนี้; ก้อนเก่าเก็บในประวัติ
- ลำดับ deploy: server ที่รองรับเวอร์ชันใหม่ขึ้นก่อน แล้วหน้าเกม; หน้าเกมเก่าที่คุยกับ server ใหม่ได้ “กรุณารีโหลด” (เทียบ build/protocol version ทุกคำขอ)
- bump `SAVE_VERSION`/`EncounterDefinition.version` ต้องปรับรายการเวอร์ชันที่ server รองรับในคราวเดียวกัน; ศึกที่ค้างบน server ตอนเปลี่ยนกฎใช้กติกาเดิมของเซฟ (เริ่มใหม่จาก HP ตอนเข้า) ตามที่ `parseGame` ทำอยู่
- admin migration ใช้เส้นทางเดียวกัน มี dry-run และ `admin_audit`
