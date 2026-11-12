# Cloudflare development API — P09-02b

Worker `asterveil-api-dev` + Durable Object `GameAccount` ต่อบัญชี (SQLite) + D1 `asterveil-dev` สำหรับรันคำสั่งเกมบน server
ยังไม่ต่อกับหน้าเกม (P09-02c) และไม่ย้ายหน้าเกมออกจาก GitHub Pages; บัญชีเป็น guest แบบ dev เท่านั้น
สถาปัตยกรรม endpoint และตัวเลขวัด: [docs/design/p09/SERVER_P09_02B_TH.md](../docs/design/p09/SERVER_P09_02B_TH.md)

## ไฟล์

- `wrangler.json`: Worker (entry `../src/server/worker.ts`), binding `DB` (D1), `GAME` (DO), migration DO `v1`; `database_id` ในไฟล์เป็นค่าว่าง — workflow ใส่ id จริงลง `wrangler.deploy.json` (ไม่ commit)
- `migrations/`: schema ของ D1 (`wrangler d1 migrations apply`)
- `smoke.mjs`: ทดสอบ API ที่รันอยู่ `node cloudflare/smoke.mjs <url> <content-version>` ไม่พิมพ์ token
- `probe/`: Worker ทดลองของ workflow `Cloudflare permission probe` (สั่งมือ; สร้างแล้วลบ D1/Worker ทดลอง)

## Secret ที่ใช้

Repository secrets `CLOUDFLARE_API_TOKEN` (D1 Edit + Workers Scripts Edit; Workers Tail Read สำหรับวัด CPU) และ `CLOUDFLARE_ACCOUNT_ID`
ห้ามใส่ token ในไฟล์ โค้ด frontend ภาพหน้าจอ หรือแชต. Wrangler พิมพ์ชื่อบัญชี (มีอีเมลเจ้าของ) — ทุกขั้นใน workflow กรองบรรทัดนั้นออก

## รันในเครื่อง

```
npx vitest run tests/server-api.test.ts             # Node + node:sqlite
cd cloudflare && npx wrangler@4.153.0 d1 migrations apply DB --local
npx wrangler@4.153.0 dev --port 8799 --var CONTENT_VERSION:local
node cloudflare/smoke.mjs http://127.0.0.1:8799 local    # จากราก repo
```

## Workflow `Cloudflare development API`

PR: เทสต์ server + bundle แบบ `--dry-run` (ไม่ใช้ secret). Push ไปสาขาเกม: หา/สร้าง D1 `asterveil-dev` → apply migrations →
deploy พร้อม `CONTENT_VERSION` จาก `scripts/content-version.mjs` → smoke test + Workers Tail; ผลและเวลา CPU อยู่ใน run summary

ย้อนกลับ: deploy commit ก่อนหน้า หรือลบ Worker/D1 dev ใน Cloudflare (ยังไม่มีข้อมูลผู้เล่นจริง)
