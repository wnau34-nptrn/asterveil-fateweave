# P09-02g — ความปลอดภัยของบัญชีก่อนเปิดคนนอก (ลบบัญชี · ความเป็นส่วนตัว · rate limit · ปิดการนำเข้า)

13 พฤศจิกายน 2026 · เจ้าของ “ยืนยัน ใช้ 14 วันตามที่เสนอ” · ไม่แก้กฎ ตัวเลข หรือรูปแบบเซฟ (v58) · ไม่มี gacha/payments/P04

## 1. ลบบัญชี

| ขั้น | ทำอะไร |
|---|---|
| ขอลบ `POST /v1/account/delete` `{confirm:'delete'}` | ในแผงบัญชี ผู้เล่นต้องพิมพ์ “ลบบัญชี” ก่อน · สถานะเป็น `deleting`, `delete_after` = ตอนขอ + **14 วัน** · เครื่องอื่นออกจากระบบทันที · เครื่องที่ขอยังเข้าได้เพื่อยกเลิก · ขอซ้ำได้วันเดิม · ไม่ส่ง confirm → 400 `confirm_required` |
| ระหว่างรอ | เส้นทางเกม (`session/state/command/import/verify`) → 403 `account_deleting`; บัญชีอนุญาตเฉพาะ `GET /v1/account` (มี `deleteAfter`), cancel, sign-out · เครื่องใหม่เข้าด้วย Google/รหัสกู้คืนได้เพื่อยกเลิก · เกมแสดง “บัญชีนี้รอการลบ” พร้อมปุ่มเปิดหน้าบัญชี |
| ยกเลิก `POST /v1/account/cancel` | ได้จนถึง `delete_after` → กลับเป็น `linked` (มี Google) หรือ `guest` · หลังนั้น 409 `too_late`, ไม่ได้รอลบ 409 `not_deleting` |
| ลบจริง (Cron ทุกชั่วโมง นาทีที่ 17) | บัญชีที่เลย `delete_after` + 1 ชม. (กันชนกับการยกเลิก) ทีละ 20: ลบข้อมูลใน DO (`storage.deleteAll`) ก่อน แล้วลบแถว D1 `devices/identities/recovery_codes/admins/accounts` ใน batch เดียว · DO ล้มเหลว → ไม่แตะ D1 รอบถัดไปลองใหม่ |
| audit | D1 `account_audit` (migration `0005`): รหัสบัญชีสุ่ม + `delete_requested`(`revoked:N`)/`delete_cancelled`/`purged` + เวลา · ไม่มี Google sub, IP หรือข้อมูลเกม |

- ลบแล้ว `legacy_fingerprint` ไปกับแถวบัญชี: เซฟในเครื่องเดิมนำเข้าบัญชีใหม่ได้อีก (ยังได้บัญชีเดียวต่อเซฟในเวลาเดียวกัน)
- ยังไม่มี ledger ที่ต้องเก็บตามกฎหมาย (เมื่อมี ต้องแยกเก็บแบบไม่ระบุตัวตนตาม ACCOUNT_FLOW)
- Cloudflare D1/DO มีการกู้ย้อนเวลา (สูงสุด 30 วัน) — ระบุในหน้า privacy แล้ว
- โค้ด: `src/server/deletion.ts`, `api.ts`, `worker.ts` (`scheduled`, `GameAccount` `/purge`), แผง `ui/account-panel.ts`; เทสต์ `tests/server-safety.test.ts`, Playwright `server-play` (390px)

## 2. หน้าความเป็นส่วนตัว

`public/privacy.html` (ไทย สั้น) ลิงก์จากหน้าไตเติล (ทุกโหมด) และแผงบัญชี: เก็บอะไร (รหัสบัญชีสุ่ม, hash กุญแจอุปกรณ์, Google sub เท่านั้น, hash รหัสกู้คืน, ข้อมูล/ประวัติคำสั่งเกม, เซฟที่นำเข้า, IP ชั่วคราวเพื่อ rate limit), ใช้ทำอะไร, ผู้ให้บริการ (Cloudflare, Google, GitHub Pages), ระยะเก็บและการลบ 14 วัน

**ต้องทำก่อนคนนอก (เจ้าของ):** ใส่ช่องทางติดต่อจริงในหัวข้อ “ติดต่อ” (ตอนนี้เขียนว่า “ช่องทางที่แจ้งไว้ในคำเชิญทดสอบ”)

## 3. Rate limit ที่ข้าม isolate

| ขีดจำกัด (`LIMITS` เดิม ไม่เปลี่ยนตัวเลข) | นับที่ |
|---|---|
| คำสั่ง 10/วินาที, อ่าน/เข้าเกม 10/วินาที ต่อบัญชี | ใน DO ของบัญชีนั้นเอง (หนึ่งบัญชี = หนึ่ง object → นับแม่น ไม่มีค่าใช้จ่ายเพิ่ม) |
| สร้าง guest 5/นาที, sign-in 10/นาที, recover 5/นาที ต่อ IP | DO `RateLimit` หนึ่งตัวต่อ key (`durableGate`) · IPv6 นับต่อ /64 |
| เส้นทางบัญชี 20/นาที, import 5/นาที, verify 10/นาที ต่อบัญชี | DO `RateLimit` เช่นกัน |

- ตัวนับในหน่วยความจำของ Worker ยังอยู่เป็นด่านแรก (ถูก); ถ้า DO `RateLimit` ติดต่อไม่ได้ ปล่อยผ่าน (ไม่ล็อกผู้เล่นตอนระบบขัดข้อง) — ด่านแรกยังทำงาน
- หน้าต่างเวลาอยู่ในหน่วยความจำของ object: ถ้า object ถูก evict หน้าต่างเริ่มใหม่ (ยอมรับได้สำหรับหน้าต่าง ≤ 1 นาที)
- `wrangler.json`: binding `LIMIT` (class `RateLimit`, migration `v2`), `triggers.crons` `17 * * * *`

## 4. แผนปิด `LEGACY_IMPORT` (D11)

ตัวแปรใหม่ `LEGACY_IMPORT_UNTIL` (ISO date-time) ปิดการนำเข้าอัตโนมัติเมื่อถึงเวลา; `LEGACY_IMPORT=closed` ยังปิดทันทีได้; วันที่อ่านไม่ออก = ปิด (`legacyImportOpen` ใน `worker.ts`)

ให้ T = วันเริ่มทดสอบภายนอก (OD-13, เจ้าของกำหนด):

| วัน | ทำ |
|---|---|
| T − 28 | ตั้ง `LEGACY_IMPORT_UNTIL` = T − 14 เวลา 00:00 (+07:00) ใน `wrangler.json` · แจ้งผู้เล่นที่มีเซฟในเครื่องให้นำเข้า |
| T − 14 | การนำเข้าปิดเอง (403 `import_closed`, ปุ่มนำเข้าบอกเหตุผล) |
| T − 7 | เปลี่ยนเป็น `LEGACY_IMPORT=closed` ถาวร ลบ `LEGACY_IMPORT_UNTIL` |
| ย้อนกลับ | ลบตัวแปรแล้ว deploy (ข้อมูลที่นำเข้าแล้วไม่ถูกแตะ) |

ยังไม่มีวัน T → ยังไม่ตั้งค่า (เปิดอยู่เหมือนเดิม)

## 5. ที่เหลือก่อนคนนอก

ช่องทางติดต่อในหน้า privacy · token rotation · publish Google consent screen · ลบบัญชี guest ที่ไม่ใช้นาน (ยังไม่มี, หน้า privacy บอกไว้) · Safari/iPhone/Android จริงยังไม่ทดสอบ
