# P09-01 — ร่าง schema และ API (server ตัดสินทั้งหมด)

11 พฤศจิกายน 2026 · อัปเดตตาม D10 = ค · **ร่างเอกสารเท่านั้น**: ไม่สร้างฐานข้อมูล ไม่ deploy ไม่ใช้ secret; ยืนยันขีดจำกัด/ราคา D1, Durable Objects และ Workers กับเอกสาร Cloudflare ปัจจุบันก่อน P09-02 · token ต้องได้สิทธิ์ D1 Edit (และ DO ตามที่ Cloudflare กำหนด) จากเจ้าของก่อน (OD-13)

## 1. ที่เก็บ [เสนอ]

- **Durable Object ต่อบัญชี** (storage ภายใน DO): สถานะเกมตัวจริง ทำคำสั่งทีละคำสั่ง ไม่มีการเขียนชนกัน
  - `state`: snapshot ปัจจุบัน `{version, profile, run}` + `seq`
  - `commands`: `(seq PK, request_id UNIQUE, kind, args, args_sha256, result, created_at)` — เก็บผลไว้ตอบ retry
  - `snapshots`: `(seq PK, payload, created_at)` ตามอายุ D6
- **D1** (ข้อมูลข้ามบัญชี/ค้นหา/admin):

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,                -- สุ่มบน server ไม่ใช่ข้อมูลส่วนตัว
  status TEXT NOT NULL CHECK (status IN ('guest','linked','deleting','suspended')),
  created_at INTEGER NOT NULL, delete_after INTEGER,
  legacy_fingerprint TEXT UNIQUE      -- SHA-256 ของเซฟที่นำเข้า (D11) บัญชีเดียวต่อก้อน
);
CREATE TABLE identities (
  provider TEXT NOT NULL, subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id), linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE TABLE devices (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
  refresh_hash TEXT NOT NULL, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, revoked_at INTEGER
);
CREATE TABLE recovery_codes (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id), code_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE ledger_entries (         -- ตั๋ว/แต้ม/สิทธิ์ (P09-02 ขึ้นไป)
  id INTEGER PRIMARY KEY, account_id TEXT NOT NULL, currency TEXT NOT NULL,
  delta INTEGER NOT NULL, reason TEXT NOT NULL, source_key TEXT NOT NULL, created_at INTEGER NOT NULL,
  UNIQUE (account_id, source_key)     -- แหล่งเดียวให้ได้ครั้งเดียว
);
CREATE TABLE admin_audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
  account_id TEXT, detail TEXT NOT NULL, created_at INTEGER NOT NULL);
```

ถ้าคำสั่งหนึ่งทั้งแก้สถานะเกมและ ledger (เช่น สุ่มกาชา) ให้ DO เป็นผู้ทำทั้งสองฝั่งด้วย `source_key` = `requestId` เพื่อให้ retry ไม่ทำซ้ำ

## 2. Endpoint [เสนอ]

JSON, `Cache-Control: no-store`, CORS เฉพาะ origin ของ Pages, ทุกคำขอแนบ protocol/build version; error `{ "error": "<code>" }`

| เส้นทาง | เข้า | ออก |
|---|---|---|
| `GET/HEAD /health` | — | มีอยู่แล้ว [โค้ด] |
| `POST /v1/guest` | `{requestId, installId}` | `{accountId, accessToken, refreshToken}`; retry → บัญชีเดิม |
| `POST /v1/session/refresh` | `{refreshToken}` | token คู่ใหม่ (หมุน) |
| `POST /v1/link` | `{requestId, provider, idToken}` | `linked` / 409 `identity_in_use` |
| `POST /v1/recovery-code` · `POST /v1/recover` | — · `{requestId, code, installId}` | รหัสแสดงครั้งเดียว · token ของบัญชีนั้น |
| `POST /v1/import` | envelope นำเข้า (CLOUD_SAVE_ENVELOPE §2) | 201 / 409 `already_imported`·`fingerprint_used` / 413 / 422 `<issue>`·`replay_failed` / 403 `import_closed` |
| `GET /v1/state` | — | มุมมองสถานะ (ตัด seed) + `seq` |
| `POST /v1/command` (หรือ WebSocket ไปที่ DO) | `{requestId, seq, kind, args}` | ผลลัพธ์ + เหตุการณ์ (สำหรับ VFX) + มุมมองที่เปลี่ยน + `seq`; 409 `stale`/`gap`/`request_reused`; 422 `<เหตุผลตามกฎ>`; 423 `other_device` |
| `POST /v1/account/delete` · `…/cancel` | `{requestId}` | `deleting` |
| `POST /v1/sessions/revoke` | `{deviceId?}` | ออกจากระบบเครื่อง/ทุกเครื่อง |

ช่องทาง: WebSocket ไป DO ลดความหน่วงของการเดิน/ศึก (คำสั่งถี่); HTTP ใช้ได้เมื่อ WebSocket ไม่ได้ Rate limit (ร่าง): คำสั่งไม่เกิน 10 ครั้ง/วินาที/บัญชี, สร้าง guest จำกัดต่อ IP

## 3. ที่ทำล่วงหน้าแล้วในงานนี้

`src/core/cloud/cloud-save.ts`: `checkUpload` + `decideUpload` (นำเข้าเซฟ), `decideCommand` (ลำดับคำสั่ง/ส่งซ้ำ) — pure ไม่มีนาฬิกา/สุ่ม/crypto; 11 เทสต์ใน `tests/cloud-save-envelope.test.ts`. Worker ยังไม่ import โมดูลนี้
