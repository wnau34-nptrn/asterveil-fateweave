# P09-02b — Worker + Durable Object ต่อบัญชี + D1 (ทำจริง)

12 พฤศจิกายน 2026 · สาขา `claude/p09-02b-worker-do-d1` → `feature/fateweave-initial-prototype` · ยังไม่ต่อ UI ของเกม (P09-02c) · กฎ ตัวเลข และเซฟ v58 ไม่เปลี่ยน

ป้าย: **[จริง]** = มีโค้ด/เทสต์/ผลรันยืนยัน · **[เสนอ]** = ข้อเสนอ ยังไม่ทำหรือรอเจ้าของตัดสิน

## 1. สิทธิ์ token [จริง]

workflow `Cloudflare permission probe` (`.github/workflows/cloudflare-probe.yml`, สั่งมือได้) ใช้ secret `CLOUDFLARE_API_TOKEN` เดิม: สร้าง D1 ทดลอง → สร้างตาราง/insert/select (ได้ 42) → deploy Worker `asterveil-probe-dev` ที่มี DO แบบ SQLite → `/health` และตัวนับใน DO เพิ่ม 1 → ลบ Worker และ D1 — ผ่านทั้งหมด (run 2, 12 พ.ย.). สรุป: secret นี้มี D1 Edit + Workers Scripts Edit (ครอบคลุม DO) ใช้งานได้จริง

ข้อควรรู้: Wrangler พิมพ์ชื่อบัญชี Cloudflare (มีอีเมลเจ้าของ) ใน log ของ Actions ระหว่าง probe รอบแรก ๆ — แก้ workflow ให้กรองบรรทัดเหล่านี้แล้ว; เจ้าของอาจลบ log ของ run probe เก่าได้ที่หน้า Actions (ไม่มี secret หลุด: token/Account ID ถูกปิดเป็น `***`)

## 2. โครงสร้างที่ทำ [จริง]

```
อุปกรณ์ ──HTTPS──▶ Worker (src/server/api.ts)
                    ├─ D1 asterveil-dev: accounts, devices (เก็บแค่ SHA-256 ของ token)
                    └─ DO GameAccount (หนึ่งตัวต่อ accountId, SQLite)  src/server/account-object.ts
                         └─ GameHost (pure)  src/server/game-host.ts → processCommand / applyCommand ชุดเดียวกับเกม
```

- **Worker** (`src/server/worker.ts` เป็น entry, Wrangler bundle จาก `cloudflare/wrangler.json`): routing, จำกัดขนาด/ชนิดคำขอ, ตรวจเวอร์ชันเนื้อหา, ตรวจ token กับ D1, rate limit พื้นฐาน แล้วส่งต่อให้ DO ของบัญชี (`idFromName(accountId)`) DO ไม่มีเส้นทางสาธารณะ
- **DO `GameAccount`**: ตาราง `state` (game + book หนึ่งแถว) และ `log` (seq, requestId, คำสั่ง, seed ที่ใช้, ผล, เวอร์ชันเนื้อหา, เวลา). หนึ่งคำสั่ง = `transactionSync` เดียวเขียน state + book + แถว log (เทสต์: log เขียนไม่สำเร็จ → state เดิม). ช่วง load → process → commit ไม่มี `await` (hash คำสั่งก่อน) จึงไม่มีสองคำสั่งแทรกกันใน DO
- **Seed**: `crypto.getRandomValues` ฝั่ง DO ผ่าน `SeedSource` ที่จดค่าที่ใช้ลง log; คำตอบเป็น `clientView`/`clientEvents` เท่านั้น (ไม่มี `seed`/`rolls`/`forge`)
- **Replay ตรวจสอบ**: `replayLog` เล่น log ตั้งแต่ว่างด้วย seed ที่จด แล้วเทียบ `canonicalJson` กับ snapshot; แจ้ง `order`/`seeds`/`status`/`snapshot` เมื่อไม่ตรง
- **บัญชี guest (dev)**: `accountId` สุ่ม 128 บิต; token = `<deviceId>.<secret 256 บิต>`; D1 เก็บ hash ของ secret, เทียบแบบไม่ออกเร็ว; ยกเลิกได้ด้วย `revoked_at`
- **เวอร์ชันเนื้อหา**: `scripts/content-version.mjs` = SHA-256 (16 hex) ของทุกไฟล์ใน `src/core` + `src/content`; workflow ส่งเป็น var `CONTENT_VERSION` ตอน deploy. ทุกเส้นทางเกมต้องส่ง header `X-Fateweave-Content` ตรงกัน ไม่งั้น 409 `content_version` (+ค่าของ server); server ที่ไม่ตั้งค่า → 503

## 3. Endpoint [จริง]

ทุกคำตอบ JSON + `Cache-Control: no-store`; CORS เฉพาะ origin ใน `ALLOWED_ORIGINS` (Pages + localhost:5173)

| เส้นทาง | เข้า | ออก |
|---|---|---|
| `GET/HEAD /health` | — | เหมือนเดิมทุกไบต์ (`{"status":"ok","service":"asterveil-api","environment":"dev"}`) |
| `POST /v1/guest` | — | 201 `{accountId, token}` (แสดง token ครั้งเดียว); 429 เกิน 5 ครั้ง/นาที/IP |
| `GET /v1/state` | Bearer + content header | `{lastSeq, view}` (`view` = `ClientGame` หรือ `null`) |
| `POST /v1/command` | `{requestId, seq, command}` ≤ 128 KB, `application/json` | 200 `CommandReply` (`applied` + view + events / `rejected` + reason); ส่งซ้ำ → คำตอบเดิมทุกไบต์; 409 `stale`/`gap` (+`lastSeq`) / `request_reused`; 400 / 413 / 415; 429 เกิน 10 ครั้ง/วินาที/บัญชี |
| `POST /v1/verify` | Bearer + content header | `{ok, seq}` หรือ `{ok:false, seq, reason}` — replay log ทั้งหมดบน server (dev audit) |

ข้อผิดพลาดร่วม: 401 token ผิด/ถูกยกเลิก, 409 `content_version`, 404/405

## 4. เทสต์ [จริง]

- `tests/server-api.test.ts` (8 เทสต์, Node + `node:sqlite` แทน D1 และ SQL ของ DO, ใช้ไฟล์ migration จริง): health เดิม, guest + hash, 401/409/503, 405/413/415/400/CORS, rate limit, ลำดับ seq + retry ได้ไบต์เดิม + rejected กิน seq + ไม่มี seed ในคำตอบ (camp, map, battle), replay ได้ snapshot เดิมและจับ seed/status/ลำดับ/snapshot ที่ถูกแก้, transaction ไม่ครึ่ง ๆ กลาง ๆ
- `cloudflare/smoke.mjs`: ยิงจริงกับ `wrangler dev` (workerd ในเครื่อง) และกับ Worker dev ที่ deploy แล้วใน workflow — guest → createCommander → retry → gap → depart → state → verify, ตรวจไม่มี seed
- `npm run typecheck`, `npm run lint`, `npm test` (127 ไฟล์, 1758 ผ่าน), `npm run build` ผ่าน; โค้ด server ไม่อยู่ใน bundle ของเกม

## 5. ตัวเลขวัด (dev) [จริง]

ขนาดคำตอบ (ไบต์ JSON) และเวลาใน Node (`SERVER_MEASURE=1 npx vitest run tests/server-api.test.ts -t measure`; รวม SQLite + hash, ไม่ใช่ CPU ของ Workers):

| คำสั่ง | ไบต์ | ms (Node) |
|---|---|---|
| createCommander (บัญชีใหม่) | 881 | 4–6 |
| depart (prologue) | 2,175 | 4–5 |
| battle 14 เทิร์น (prologue) | 2,230 | 12–17 |
| hire / depart (ค่ายช่วงหลัง ตัวละครครบ) | 1,280 / 2,916 | 2 |
| move บนแผนที่ | 2,958–3,142 | 2–4 |
| battle 6 เทิร์น | 3,093 | 4–5 |
| GET state | 1,155–2,907 | 1–2 |

Worker ที่ deploy: bundle 383 KiB (gzip 87 KiB), content `e7f18d399c8f67ac`. Smoke test บน Cloudflare จริง (12 พ.ย., runner GitHub ในสหรัฐฯ, เวลาไป-กลับรวมเครือข่าย): createCommander 878 B / 139 ms, ส่งซ้ำ 878 B (ไบต์เดิม) / 117 ms, depart 2,172 B / 118 ms, state 2,009 B / 85 ms, verify 92 ms, guest 135 ms — ผ่านทั้งหมด

เวลา CPU บน Workers (Workers Tail, deploy แรกจากสาขาเกมหลัง #225, 12 พ.ย.): ฝั่ง Worker (`/v1/*`, auth D1 + ส่งต่อ) 0–2 ms; ฝั่ง DO `/command` 1–6 ms (6 ms = createCommander/depart ที่สร้างโปรไฟล์/ออกสำรวจ), `/state` 1–3 ms, `/verify` (log 2 รายการ) 2 ms. workflow พิมพ์ค่าเหล่านี้ลง log/summary ทุกครั้งที่ deploy

ข้อสังเกต [เสนอ]: ทุกคำสั่งที่วัดได้ต่ำกว่าเพดาน CPU ของแผน Free (10 ms ต่อคำขอ ณ วันที่เขียน — ตรวจซ้ำกับเอกสาร Cloudflare ตอนตัดสิน D8); ยังไม่ได้วัด battle ยาว ๆ และ `/verify` ที่ log ยาวบน Workers — สองอย่างนี้เสี่ยงเกินก่อน

## 6. ข้อเสนอสำหรับ D8 (Free/Paid) [เสนอ]

- คำตอบ ~3 KB/คำสั่ง ส่งมุมมองเต็มยังรับได้ ยังไม่ต้องทำ diff; ทบทวนเมื่อเซฟโตเกิน ~20 KB
- หนึ่งคำสั่ง = 1 คำขอ Worker + 1 คำขอ DO + 1 query D1 (auth) + 1 transaction ใน DO. คำนวณจาก 20–30 นาที/ครั้ง 3–5 ครั้ง/สัปดาห์ (OD-06) ด้วยจำนวนคำสั่งจริงจาก telemetry ก่อนตัดสิน; Free plan น่าพอสำหรับทดสอบภายใน แต่ต้องตรวจขีดจำกัดล่าสุด (CPU/คำขอ/วัน, DO, D1 rows read) ในเอกสาร Cloudflare ตอนตัดสิน
- ลดงานต่อคำสั่ง: ใช้ WebSocket ไป DO (hibernation) และ token แบบลงลายเซ็น (ไม่ต้อง query D1 ทุกคำขอ)

## 7. ที่เหลือ [เสนอ]

- **P09-02c**: shell ส่งคำสั่งไป server และแสดง `view` แทนเกมในเครื่อง; ล็อกระหว่างรอ, reconnect/ส่งซ้ำด้วย requestId เดิม, ตอบ 409 `stale`/`gap` ด้วยการอ่าน state ใหม่; ใส่ `CONTENT_VERSION` ตอน build (Vite define จาก `scripts/content-version.mjs`); ชนิด UI เป็น `ClientProfile`/`ClientRun` (CLIENT_VIEW §5 ข้อ 1–2)
- **D12 ทีละเครื่อง**: ยังไม่มีล็อกอุปกรณ์ (423 `other_device`) — ทำใน P09-02c
- **Google sign-in (D1)**: ต้องขอเจ้าของ: Google OAuth Client ID (ชนิด Web) พร้อม authorized JavaScript origin ของ Pages; server ตรวจ ID token กับ JWKS ของ Google; ตาราง `identities`/`recovery_codes` ตาม SCHEMA_API_DRAFT
- **D11 นำเข้าเซฟ**: ยังไม่ทำ (`checkUpload`/`decideUpload` มีแล้ว); ต้อง replay เซฟ v58 ด้วย `parseGame` ใน DO และเก็บ fingerprint ใน D1
- log ใน DO โตไม่หยุด → snapshot เป็นระยะ + ตัด log เก่าตาม D6; `/v1/verify` replay ทั้ง log (ช้าเมื่อยาว) → จำกัดให้ admin
- rate limit อยู่ในหน่วยความจำของ isolate (best effort) → ใช้ Rate Limiting binding ของ Cloudflare หรือนับใน DO ก่อนเปิดคนนอก; `/v1/guest` ไม่ idempotent (retry ได้บัญชีใหม่)
- เมื่อ deploy เนื้อหาใหม่ DO ยังถือ game ของเวอร์ชันเก่า: ต้องมีขั้น migrate เซฟ (ผ่าน `parseGame`) ก่อนรับคำสั่งเวอร์ชันใหม่
