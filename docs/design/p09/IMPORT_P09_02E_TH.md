# P09-02e — นำเข้าเซฟในเครื่องครั้งเดียว (D11) + snapshot ของ log

13 พฤศจิกายน 2026 · สาขา `claude/p09-02e-import` → `feature/fateweave-initial-prototype` · เจ้าของอนุมัติ D11 (2026-11-12) · กฎ ตัวเลข และรูปแบบเซฟ v58 ไม่เปลี่ยน · ไม่มี gacha/การจ่ายเงิน/P04 · **[โค้ด]** = ทำแล้ว; **[เสนอ]** = ร่าง

## 1. ผู้เล่นเห็นอะไร [โค้ด]

- เล่นผ่านเซิร์ฟเวอร์ (`?server=`) บนเครื่องที่มีเซฟเดิม (คีย์ `asterveil.fateweave.expedition.v1`, v1–58) และบัญชีบนเซิร์ฟเวอร์ยังไม่มีเกม → หน้าแรกแสดง “พบเซฟเดิมในเครื่องนี้” (ทีม แร่ดาว การเดินทางค้าง) + ปุ่ม **นำเข้าเซฟนี้ไปยังบัญชีเซิร์ฟเวอร์** (ปุ่มหลัก) และ “เริ่มเกมใหม่บนเซิร์ฟเวอร์”
- เสนอเฉพาะเซฟที่ build นี้อ่านได้ (`parseGame` ในเครื่องผ่าน); เซฟในเครื่องไม่ถูกแก้หรือลบ
- นำเข้าสำเร็จ → หน้าแรกแสดง “เข้าค่าย/เดินทางต่อ” จาก server พร้อมข้อความ “นำเข้าเซฟเดิม (vN) แล้ว”; ถูกปฏิเสธ → ข้อความภาษาไทยตามเหตุผล (ข้อ 3)

## 2. ลำดับบน server [โค้ด]

`POST /v1/import` (Bearer + content version + session D12) รับ envelope ตาม [CLOUD_SAVE_ENVELOPE §2](CLOUD_SAVE_ENVELOPE_TH.md); `requestId` = `imp_` + 40 ตัวแรกของ SHA-256 ของเซฟ (ส่งซ้ำกี่ครั้งก็คำขอเดียวกัน)

1. Worker: สวิตช์ `LEGACY_IMPORT` (wrangler var, `closed` = ปิด) → 403 `import_closed`; จำกัด 5 ครั้ง/นาที/บัญชี; body ≤ 2×256 KiB + 1 KiB
2. Worker: `checkUpload` (รูปร่าง ขนาด SHA-256 ที่คำนวณเอง เวอร์ชัน 1–58) → 413 `too_large` / 422 `<issue>`
3. Worker: จอง fingerprint ใน D1 `accounts.legacy_fingerprint` (migration `0003_legacy_import.sql`, unique index) **ก่อน** ส่งให้ DO — สองบัญชีแย่งเซฟเดียวกันได้บัญชีเดียว: 409 `fingerprint_used`; บัญชีนี้ถือ fingerprint อื่นอยู่ → 409 `already_imported`
4. DO: `decideUpload` + บันทึกการนำเข้า: ส่งซ้ำเซฟเดิม → 201 คำตอบเดิม; เซฟอื่นหลังนำเข้าแล้ว → 409 `already_imported`; บัญชีเริ่มเกมบน server แล้ว → 409 `has_game`
5. DO: `parseGame` (ย้ายเวอร์ชันเก่า + replay คำสั่งศึกที่ค้าง เหมือนโหลดในเครื่อง) ไม่ผ่าน → 422 `replay_failed`; ผ่าน → เขียน state + snapshot (`origin=import`) ที่ `seq` ปัจจุบัน + เซฟดิบ (`legacy_import`) ในธุรกรรมเดียว → 201 `{lastSeq, view, from}` (view ไม่มี seed)
6. DO ตอบ 422 หรือ 409 `has_game` → Worker คืน fingerprint (เซฟนั้นยังนำเข้าบัญชีอื่นได้); DO ล้ม/ไม่ตอบ → fingerprint ค้างไว้ให้บัญชีนี้ส่งซ้ำ

`seq` ไม่เปลี่ยนจากการนำเข้า; คำสั่งถัดไปต่อจาก snapshot นั้น

## 3. Snapshot ของ log [โค้ด]

- ตาราง DO `snapshots (seq, game, origin, at)`: เขียนในธุรกรรมเดียวกับคำสั่งทุก `SNAPSHOT_EVERY` = 50 seq (ร่าง) และเมื่อการเดินทางจบ (`run` → null); การนำเข้าก็เป็น snapshot
- `/v1/verify` replay จาก snapshot ล่าสุดเท่านั้น (ตอบ `{ok, seq, from}`) → ต้นทุนไม่เกิน ~50 คำสั่ง แทน O(ทั้ง log) (Workers วัดได้ 215 ms ที่ log ~300; คาดราว 1/6 — ยังไม่ได้วัดบน Workers)
- snapshot เป็นสถานะที่ server เขียนเอง จึงเชื่อถือ; ตรวจย้อนข้าม snapshot (สายโซ่ทั้งหมด) เป็นงาน admin ภายหลัง [เสนอ]; log เก่ายังไม่ถูกตัด (D6)

## 4. ทดสอบ

- `tests/server-import.test.ts` (6): เซฟ v58 กลางศึก นำเข้า/ส่งซ้ำ/เล่นต่อ/verify จาก snapshot; บัญชีเดียวต่อเซฟ ครั้งเดียวต่อบัญชี `has_game`; v41 ย้ายเวอร์ชัน; digest/bytes/shape/version/ขนาด/replay เสีย ไม่ค้าง fingerprint; D12 423, content version, ปิดสวิตช์ 403; snapshot ทุก 50 + verify จาก snapshot
- `tests/server-client.test.ts`: `importSave` ส่งซ้ำ requestId เดิมหลังคำตอบหาย, `fingerprint_used`
- Playwright `server-play.spec.ts` (Chromium 390px): ข้อเสนอบนหน้าแรก → นำเข้า → รีโหลดไม่เสนออีก → เข้าแผนที่ได้

## 5. ที่เหลือ [เสนอ]

- ปิด `LEGACY_IMPORT` ก่อนทดสอบคนนอก (OD-13, ตาม D11); เครื่องมือ admin เปลี่ยนเซฟที่นำเข้า (`admin_audit`)
- จำกัด `/v1/verify` ให้ admin; battle แบบ incremental ใน DO; วัด CPU ของ `/v1/import` และ verify จาก snapshot บน Workers
- Safari/iPhone/Android จริงยังไม่ได้ทดสอบ
