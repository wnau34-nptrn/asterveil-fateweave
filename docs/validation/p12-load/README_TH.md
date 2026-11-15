# P12 — แผนทดสอบโหลด staging ของ `WorldBoss` และ `Chat`

15 พฤศจิกายน 2026 · ไม่แก้กฎ ตัวเลข หรือรูปแบบเซฟ (v64) · ไม่มี secret ในไฟล์

## ทำไม

probe เดิม ([P11-04](../p11-04-2026-11-15/README_TH.md), [แชท](../p11-chat-2026-11-15/README_TH.md)) วัดแค่ handler + SQLite ในหน่วยความจำ
ของ Node. สองอย่างนี้เป็น Durable Object **ตัวเดียวทั้งโลก** — ทุกคนเขียน HP ส่วนกลางและห้องแชทที่ object เดียว — จึงต้องวัด
ผ่านเครือข่ายจริง, Worker, DO ของบัญชี, การเขียนลง storage ถาวร และทาง outbox (hit ค้างใน DO บัญชี → Worker ส่ง `/contribute` → `/hits/taken`)

## ทำอะไร

Workflow `Cloudflare staging load test` (`.github/workflows/cloudflare-load.yml`, สั่งมือเท่านั้น):

1. **deploy** สำเนาทิ้ง: Worker `asterveil-api-staging` + D1 `asterveil-staging` + DO ใหม่ทั้งหมด (ไม่แตะ dev API ที่หน้า Pages ใช้) · import เปิด, `CHAT_WRITE=all`, ไม่มี cron
2. **load** 1–4 runner พร้อมกัน (แต่ละ runner = IP เดียว ทำให้ขีดจำกัดต่อ IP เป็นของจริง) รัน `tests/server-load.test.ts`:
   - สร้าง guest `accounts` บัญชี (guest 5/นาที/IP → เว้น 12.5 วินาที) · นำเข้าเซฟค่ายที่ผ่านทุกแผนที่ (ชื่อสุ่ม → fingerprint ใหม่)
   - World Boss: ทุกบัญชีเล่นครบ 5 ครั้ง ทีละครั้งต่อบัญชี ทุกบัญชีพร้อมกัน; **ทุกคำขอส่งสองครั้งพร้อมกัน** (จำลองคำตอบหาย แล้วส่งซ้ำ) แล้วอ่าน `/v1/state` (ทาง outbox ส่ง hit ที่ค้าง)
   - แชทไปพร้อมกัน `seconds` วินาที: ทุกบัญชีอ่าน `GET /v1/chat` ทุก 1 วินาที (ขีด 2/วินาที) และส่งทุก 12 วินาที (ต่ำกว่า 30/นาที/IP และ 4 วินาที/8 ต่อนาทีต่อบัญชี) ข้อความไทยสุ่มไม่มีตัวเลข/ลิงก์
3. **teardown** (`if: always()`): ลบ Worker และ D1 staging ทุกกรณี

ค่าเริ่ม 4 runner × 5 บัญชี = 20 บัญชี · 100 attempt (200 คำขอ) ลง `WorldBoss` · อ่านแชท ~20/วินาที · ส่ง ~100/นาที

## ผ่านเมื่อ (ตรวจในเทสต์)

| เรื่อง | เงื่อนไข |
|---|---|
| HP ส่วนกลาง | ไม่ต่ำกว่า 0 · ลดลงอย่างน้อยเท่าดาเมจของ runner นั้น (runner อื่นลดเพิ่มได้เท่านั้น) → hit ทุกอันไปถึง ไม่หาย |
| ส่งซ้ำ | ทุก attempt ได้ `applied` ครบ 5 · คำตอบสองฉบับของคำขอเดียวกันเหมือนกันทุกตัว (นับครั้งเดียว) |
| แชท | ข้อความที่ runner ส่งสำเร็จ ผู้อ่านของ runner เห็นครบทุกข้อความ |
| ความเสถียร | ไม่มี 5xx หรือ timeout (20 วินาที) · 429 รายงานแยกในตาราง (คาดว่าเป็น 0 ที่ค่าเริ่ม) |

ผลแต่ละ runner (p50/p95/max ต่อ route + สถานะ) อยู่ใน run summary — ไม่ commit run id หรือ log (กติกา pre-release)

## รันในเครื่อง (ตรวจสคริปต์ก่อน)

```
cd cloudflare && npx wrangler@4.153.0 d1 migrations apply DB --local && npx wrangler@4.153.0 dev --port 8799 --var CONTENT_VERSION:local
LOAD_URL=http://127.0.0.1:8799 LOAD_CONTENT=local LOAD_ACCOUNTS=3 LOAD_CHAT_SECONDS=40 LOAD_CHAT_GAP=6 npx vitest run tests/server-load.test.ts
```

ผลในเครื่อง 2026-11-15 (wrangler dev, เครื่องเดียว — ไม่ใช่ตัวเลข Cloudflare): ผ่าน · 3 บัญชี 15 attempt คำตอบส่งซ้ำเหมือนกัน 15/15 · HP 5000 ลดตรงกับดาเมจ ·
แชทส่ง 19 เห็น 19 · World Boss command p50 79 ms / max 174 ms, อ่านแชท p50 13 ms

## ข้อจำกัด

- รันบน Cloudflare จริงต้องใช้ secret ของ repo (`CLOUDFLARE_API_TOKEN` มี D1 Edit + Workers Scripts Edit) ผ่าน workflow เท่านั้น; ห้ามชี้ `LOAD_URL` ไปที่ dev API (เขียนแชทและดาเมจ World Boss จริง)
- HP ส่วนกลางของ staging ใหม่ = ขั้นต่ำ 5000 → ศึกจะถูกฆ่าระหว่างทดสอบ (ทดสอบทางตัดดาเมจที่ 0 ไปด้วย)
- ทาง outbox เมื่อ `/contribute` ล้มจริง ตรวจด้วย unit test (`tests/world-boss-p11.test.ts`) — ที่นี่ตรวจว่าทางปกติ + `/v1/state` ไม่ทำ hit หาย/ซ้ำ
- 4 runner ยังน้อยกว่าผู้เล่นจริงหลายร้อยคน: ใช้ดูแนวโน้ม latency ของ object เดียว ไม่ใช่เพดาน ถ้าต้องการมากกว่านี้ใช้ WebSocket/แบ่ง object (ดู CHAT_P11_TH §ถัดไป)
