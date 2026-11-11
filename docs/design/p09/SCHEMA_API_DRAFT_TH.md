# P09-01 — ร่าง schema D1 และ API ของ Worker

11 พฤศจิกายน 2026 · **ร่างเอกสารเท่านั้น**: ยังไม่สร้างฐานข้อมูล ไม่ deploy ไม่ใช้ secret; ยืนยันขีดจำกัด D1/Workers กับเอกสาร Cloudflare ปัจจุบันก่อน P09-02 · token ต้องเพิ่มสิทธิ์ D1 Edit โดยเจ้าของก่อน (OD-13)

## 1. ตาราง D1 (SQLite) [เสนอ]

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,                -- สุ่มบน server (เช่น 128 บิต base32) ไม่ใช่ข้อมูลส่วนตัว
  status TEXT NOT NULL CHECK (status IN ('guest','linked','deleting','suspended')),
  created_at INTEGER NOT NULL,        -- ms เวลา server
  delete_after INTEGER                -- ตั้งเมื่อขอลบ
);
CREATE TABLE identities (            -- ตัวตนภายนอกที่ผูก (ไม่เก็บอีเมล/ชื่อถ้าไม่จำเป็น)
  provider TEXT NOT NULL, subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE TABLE devices (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
  refresh_hash TEXT NOT NULL,         -- hash ของ refresh token เท่านั้น
  created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, revoked_at INTEGER
);
CREATE TABLE recovery_codes (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id),
  code_hash TEXT NOT NULL, created_at INTEGER NOT NULL   -- ใช้แล้วออกใหม่ทับ
);
CREATE TABLE cloud_saves (            -- หัวเซฟ 1 แถวต่อบัญชี
  account_id TEXT PRIMARY KEY REFERENCES accounts(id),
  revision INTEGER NOT NULL, save_version INTEGER NOT NULL,
  payload TEXT NOT NULL, payload_bytes INTEGER NOT NULL, payload_sha256 TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('legacy','cloud')), legacy_fingerprint TEXT,
  build_id TEXT NOT NULL, device_id TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE cloud_save_history (
  account_id TEXT NOT NULL, revision INTEGER NOT NULL,
  save_version INTEGER NOT NULL, payload TEXT NOT NULL, payload_sha256 TEXT NOT NULL,
  device_id TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, revision)
);
CREATE TABLE requests (               -- idempotency: คำตอบเดิมเมื่อ retry
  account_id TEXT NOT NULL, request_id TEXT NOT NULL, kind TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL, revision INTEGER, response TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, request_id)
);
-- P09-02 ขึ้นไป (เขียนไว้เพื่อยืนยันว่าเส้นแบ่งใน TRUST_BOUNDARY วางได้):
CREATE TABLE ledger_entries (
  id INTEGER PRIMARY KEY, account_id TEXT NOT NULL, currency TEXT NOT NULL,
  delta INTEGER NOT NULL, reason TEXT NOT NULL, source_key TEXT NOT NULL, created_at INTEGER NOT NULL,
  UNIQUE (account_id, source_key)     -- แหล่งเดียวให้ได้ครั้งเดียว
);
CREATE TABLE admin_audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
  account_id TEXT, detail TEXT NOT NULL, created_at INTEGER NOT NULL);
```

การเขียนเซฟใน transaction เดียว (`db.batch`): `INSERT` ประวัติ → `UPDATE cloud_saves … WHERE account_id=? AND revision=?` (compare-and-swap; 0 แถว = conflict) → `INSERT requests`. ครั้งแรกใช้ `INSERT` ที่ชน PK = conflict. ถ้าภายหลังต้องเรียงคำสั่งต่อบัญชีที่ซับซ้อนกว่านี้ (สุ่ม+เขียนเซฟ) ค่อยใช้ Durable Object ต่อบัญชี; World Boss ใช้ DO แยก

## 2. Endpoint [เสนอ]

ทุกเส้นทางตอบ JSON, `Cache-Control: no-store`, CORS เฉพาะ origin ของ Pages, คำขอที่เปลี่ยนข้อมูลต้องมี `requestId`; error เป็น `{ "error": "<code>" }`

| เส้นทาง | เข้า | ออก |
|---|---|---|
| `GET/HEAD /health` | — | มีอยู่แล้ว [โค้ด] |
| `POST /v1/guest` | `{requestId, installId}` | 201 `{accountId, accessToken, refreshToken}`; retry → บัญชีเดิม |
| `POST /v1/session/refresh` | `{refreshToken}` | token คู่ใหม่ (หมุน, ของเก่าใช้ไม่ได้) |
| `POST /v1/link` | `{requestId, provider, idToken}` | 200 `linked` / 409 `identity_in_use` (+ ให้สลับบัญชี) |
| `POST /v1/recovery-code` | — | `{code}` แสดงครั้งเดียว (เก็บแค่ hash) |
| `POST /v1/recover` | `{requestId, code, installId}` | token ของบัญชีนั้น |
| `GET /v1/save` | — | 200 `{revision, saveVersion, payload, payloadSha256, updatedAt}` / 404 `no_save` |
| `PUT /v1/save` | `CloudSaveUpload` (ดู ENVELOPE) | 200 `{revision}` / 409 `conflict`·`request_reused`·`downgrade` / 413 `too_large` / 422 `<issue>`·`replay_failed` / 426 `save_version_unsupported` |
| `GET /v1/save/history` | — | รายการ `{revision, saveVersion, createdAt, summary}` ไม่รวม payload |
| `POST /v1/account/delete` · `…/delete/cancel` | `{requestId}` | สถานะ `deleting` |
| `POST /v1/sessions/revoke` | `{deviceId?}` | ออกจากระบบเครื่อง/ทุกเครื่อง |

Rate limit (ร่าง): `PUT /v1/save` ไม่เกิน 30 ครั้ง/ชม./บัญชี (เกมเซฟบ่อย → เครื่องรวบเซฟส่งเป็นช่วง เช่นเมื่อกลับค่าย/จบศึก/ปิดแท็บ); สร้าง guest จำกัดต่อ IP

## 3. ส่วนที่ทำล่วงหน้าแล้วในงานนี้

`src/core/cloud/cloud-save.ts`: `checkUpload` (รูปร่าง ขนาด ไบต์ UTF-8 digest เวอร์ชัน), `decideUpload` (compare-and-swap/idempotency/downgrade), `syncStep` (สถานะเครื่อง) — pure ไม่มีนาฬิกา/สุ่ม/crypto; 14 เทสต์ใน `tests/cloud-save-envelope.test.ts`. Worker ยังไม่ import โมดูลนี้
