# P09-02c — เกมคุยกับ dev API (ทำจริง)

12 พฤศจิกายน 2026 · สาขา `claude/p09-02c-client-server` → `feature/fateweave-initial-prototype` · กฎ ตัวเลข และเซฟ v58 ไม่เปลี่ยน · ไม่มี gacha/การจ่ายเงิน/P04

ป้าย: **[จริง]** = มีโค้ด/เทสต์ยืนยัน · **[เสนอ]** = ยังไม่ทำ

## 1. เปิดใช้อย่างไร [จริง]

- ค่าเริ่มต้นยังเล่นในเครื่องเหมือนเดิม (เซฟ localStorage, seed ในเครื่อง)
- เปิดเล่นผ่าน server: เปิดเกมด้วย `?server=<URL ของ Worker dev>` เช่น `https://asterveil-api-dev.<subdomain>.workers.dev` (ดู URL ได้ใน summary ของ workflow `cloudflare-dev.yml`) — เบราว์เซอร์จำไว้; `?server=off` กลับไปเล่นในเครื่อง (จำไว้เช่นกัน); build อาจตั้งค่าล่วงหน้าด้วย `VITE_FATEWEAVE_API` · รับเฉพาะ https (หรือ http บน localhost)
- โหมด server ไม่อ่านและไม่เขียนเซฟในเครื่องเลย (เซฟเดิมในเครื่องอยู่ครบ); หน้าแรกขึ้นป้าย "เล่นผ่านเซิร์ฟเวอร์ทดลอง"

## 2. โครง [จริง]

- `src/platform/server-client.ts` — `ServerClient`: สร้าง guest ครั้งแรก (token เก็บใน localStorage ต่อ URL), สุ่ม session id ต่อการเปิดหน้า, ส่งทีละคำสั่ง `{requestId, seq: lastSeq+1, command}`; ไม่ได้คำตอบ/5xx/429 → ส่งซ้ำ **requestId และ seq เดิม** สูงสุด 5 ครั้ง (0.4→3.2 วินาที, เคารพ `Retry-After`); ยังไม่ได้ → เก็บคำขอไว้ ปุ่ม "ส่งอีกครั้ง" ส่งคำขอเดิม; 409 `stale`/`gap`/`request_reused` → ทิ้งคำขอ อ่าน `/v1/state` ใหม่; token ที่ server ไม่รู้จัก (DB dev ถูกล้าง) → สร้าง guest ใหม่หนึ่งครั้ง
- `X-Fateweave-Content` = `__CONTENT_VERSION__` ที่ `vite.config.ts` คำนวณจาก `scripts/content-version.mjs` ตอน build (ค่าเดียวกับที่ workflow ส่งให้ Worker)
- `src/ui/game-shell.ts` — ทุกคำสั่งผ่าน `exec(cmd, then)`: ในเครื่องเรียก `applyCommand` แล้ว `then` ทันที (พฤติกรรมเดิม); โหมด server ส่งไป server แล้ว `then` เมื่อได้คำตอบ ระหว่างรอทุกหน้าจอเป็น `inert` (เมาส์/แตะ/คีย์บอร์ด) และขึ้น "กำลังส่งไปเซิร์ฟเวอร์…" ถ้าช้ากว่า 0.3 วินาที; ปุ่มลัดคีย์บอร์ดของ shell หยุดระหว่างรอ
- ศึก: resolver deterministic จึงเล่นเทิร์นบนเครื่องได้ทันที; คำสั่ง `battle` ส่งทุกเทิร์น (เทิร์นที่มาระหว่างรอถูกเก็บไว้ส่งต่อ ใช้ตัวล่าสุด); ปุ่มออกจากศึกรอคำตอบสุดท้ายก่อน (ของรางวัล/สรุปมาจาก server); ถ้า server ปฏิเสธศึก → โหลดสถานะจาก server
- `src/ui/server-game.ts` — แปลง `view`/`events` (`ClientProfile`/`ClientRun`) เป็นรูปที่ handler เดิมอ่าน โดยใส่ `seed/forge/rolls = 0` เป็นค่าแสดงผลเท่านั้น: โหมด server ไม่รันกฎที่ใช้ seed บนเครื่องและไม่บันทึกค่านี้; ป้ายจ้างใช้ `hireBoard` จาก server
- ข้อความปัญหา (การ์ดกลางจอ, ปุ่ม ≥ 44px): อุปกรณ์อื่น → "เล่นบนเครื่องนี้ต่อ"; เน็ต/เซิร์ฟเวอร์ → "ส่งอีกครั้ง"; เวอร์ชันไม่ตรง → "โหลดหน้าใหม่"; ทุกการ์ดมี "เล่นในเครื่องแทน" (`?server=off`)

## 3. D12 เล่นทีละเครื่อง [จริง]

- เจ้าของอนุมัติ 2026-11-12: เครื่องที่เข้าใหม่ได้สิทธิ์ เครื่องเก่าแสดง "กำลังเล่นบนอุปกรณ์อื่น"
- ทุกคำขอเกมส่ง `X-Fateweave-Session` (32 hex สุ่มต่อการเปิดหน้า; ผิดรูป → 400 `session_required`); `POST /v1/session` = เข้าเล่น: DO จด session นี้เป็นตัวที่ใช้งาน (ตาราง `session` ใน DO) แล้วตอบ `{lastSeq, view}`
- `GET /v1/state` และ `POST /v1/command` จาก session อื่น → 423 `other_device` ไม่มีอะไรรัน; session แรกของบัญชีได้สิทธิ์อัตโนมัติ; หลายแท็บในเครื่องเดียวนับเป็นคนละ session
- `/v1/verify` ไม่ผูก session (audit)

## 4. เทสต์ [จริง]

- `tests/server-client.test.ts` (7): ไคลเอนต์จริงกับ Worker+DO จริงในโปรเซส (`tests/fixtures/server-fakes.ts`): guest+เข้าเล่น+view ไม่มี seed, rejected กิน seq, คำตอบหายแล้วส่งซ้ำ requestId เดิม (log มีแถวเดียว), ไฟดับแล้ว retry ได้คำขอเดิม, 409 stale → ตามทัน, 423 สลับเครื่องไปมา, content version/token เก่า, สวิตช์ URL
- `tests/server-api.test.ts` +1 (D12: 400/423/เข้าใหม่)
- `tests/browser/server-play.spec.ts` (Chromium 390px): Playwright route `https://api.test` ไปยังโค้ด Worker จริง — 423 ก่อนสร้างผู้บัญชาการ → การ์ด → เข้าใหม่; คำตอบช้า+หาย → `inert` + ข้อความรอ + ส่งซ้ำ requestId เดิม; ไม่มีเซฟในเครื่อง; verify replay ผ่าน; reload → เล่นต่อจาก server
- `cloudflare/smoke.mjs` เพิ่มขั้น `/v1/session` และ 423 (รันใน workflow เมื่อ merge)

## 5. ที่เหลือ [เสนอ]

- ข้อความ "บันทึกบนเครื่องนี้อัตโนมัติ" ในศึก/แผนที่ยังขึ้นในโหมด server (ควรเป็น "บันทึกบนเซิร์ฟเวอร์")
- ชนิดข้อมูล UI ยังเป็น `Profile`/`ExpeditionState` เต็ม (ใช้ `server-game.ts` แปลง); เปลี่ยนเป็น `ClientProfile`/`ClientRun` รายไฟล์เมื่อแตะไฟล์นั้น (CLIENT_VIEW §5 ข้อ 1)
- Google sign-in รอ OAuth Web Client ID จากเจ้าของ; D11 นำเข้าเซฟ; snapshot log; rate limit จริง; migrate เซฟเมื่อ deploy เนื้อหาใหม่ (SERVER_P09_02B §7)
- ยังไม่ได้ทดสอบกับ Worker dev ที่ deploy จริงจากเบราว์เซอร์ (รอ workflow deploy หลัง merge แล้วเปิด `?server=`), Safari/iPhone/Android จริง
