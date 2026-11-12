# P09-02d — ผูก Google + รหัสกู้คืน + ย้ายเครื่อง (ทำจริง)

12 พฤศจิกายน 2026 · สาขา `claude/p09-02d-google` → `feature/fateweave-initial-prototype` · เจ้าของอนุมัติ D1 (Google + รหัสกู้คืน) · กฎ ตัวเลข และเซฟ v58 ไม่เปลี่ยน · ไม่มี gacha/การจ่ายเงิน/P04/D11

ป้าย: **[จริง]** = มีโค้ด/เทสต์ยืนยัน · **[เสนอ]** = ยังไม่ทำ

## 1. ผู้เล่นเห็นอะไร [จริง]

- โหมด server (`?server=`) หน้าแรกมีปุ่ม **"บัญชี · Google · รหัสกู้คืน"** และป้าย "ความคืบหน้าบันทึกบนเซิร์ฟเวอร์"; ในเกมป้ายบันทึกเป็น "บันทึกบนเซิร์ฟเวอร์" (ค่าย) / "…ทุกก้าว" (แผนที่) / "…ทุกเทิร์น" (ศึก) — โหมดในเครื่องข้อความเดิม
- แผงบัญชี: สถานะ (บัญชีทดลอง ยังไม่ผูก / ผูก Google แล้ว), ปุ่ม Google ของ Google Identity Services (โหลดสคริปต์ตอนเปิดแผงเท่านั้น), ออกรหัสกู้คืน (แสดงครั้งเดียว ปุ่มคัดลอก; ออกใหม่ต้องกดยืนยันเพราะรหัสเดิมจะใช้ไม่ได้), ช่องใส่รหัสกู้คืนของบัญชีอื่น
- กด Google บนบัญชีที่ยังไม่ผูก → ผูก; ถ้า Google นั้นผูกกับบัญชีเกมอื่นอยู่ → **ไม่รวมบัญชี** แสดง "สลับไปบัญชีนั้น / ยกเลิก" พร้อมเตือนถ้าบัญชีทดลองบนเครื่องนี้ยังไม่ผูกและไม่มีรหัสกู้คืน (สลับแล้วกลับมาไม่ได้). บัญชีที่ผูกแล้วกด Google = เข้าบัญชีของ Google นั้น
- สลับสำเร็จ → เครื่องนี้เข้าบัญชีนั้น (D12: เครื่องใหม่ได้สิทธิ์ เครื่องเดิมได้ "กำลังเล่นบนอุปกรณ์อื่น" ในคำสั่งถัดไป) แล้วกลับหน้าแรกพร้อมหมายเหตุ
- ไม่อ่าน/ไม่เก็บอีเมลหรือชื่อจาก Google ทั้งบนเครื่องและ server — ใช้เฉพาะ `sub`

## 2. Server [จริง]

- `src/server/google.ts` — ตรวจ ID token: RS256 เท่านั้น, กุญแจจาก JWKS ของ Google (`https://www.googleapis.com/oauth2/v3/certs`) cache ตาม `Cache-Control: max-age` (60 วินาที–1 วัน), เจอ `kid` ใหม่ดึงซ้ำได้ไม่เกินนาทีละครั้ง; `iss` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `aud` = Client ID (และ `azp` ถ้ามี), `exp` ยังไม่หมด (เผื่อนาฬิกา 60 วินาที), `iat` ไม่อยู่ในอนาคต, `sub` รูปแบบถูก; token ยาวเกิน 4 KB = malformed. JWKS ดึงไม่ได้ → 503
- D1 migration `0002_identities.sql` ตาม SCHEMA_API_DRAFT: `identities (provider, subject) PK` + unique `(account_id, provider)` (บัญชีละหนึ่ง Google, Google ละหนึ่งบัญชี); `recovery_codes (account_id PK, code_hash UNIQUE)`
- รหัสกู้คืน: Crockford base32 20 ตัว (100 บิตสุ่ม) แสดงเป็น `XXXX-XXXX-XXXX-XXXX-XXXX`; รับพิมพ์เล็ก/ไม่มีขีด/O→0, I/L→1; D1 เก็บ SHA-256 เท่านั้น; ออกใหม่ทับรหัสเดิม; ใช้ได้ครั้งเดียว (insert เครื่องใหม่แบบอ่านแถวรหัส + ลบรหัส ใน batch เดียว — สองคำขอแข่งกันได้เครื่องเดียว)
- **credential ของเครื่องใหม่ เครื่องสร้างเอง** (`<deviceId 128 บิต>.<secret 256 บิต>`, server เก็บ hash) แล้วส่งมากับ `/v1/signin` และ `/v1/recover`: คำตอบหายแล้วส่งซ้ำ → credential เดิมอยู่แล้ว ตอบสำเร็จซ้ำ (รหัสไม่ถูกใช้สองครั้ง ไม่ได้เครื่องซ้ำ)
- Client ID อยู่ใน `cloudflare/wrangler.json` var `GOOGLE_CLIENT_ID` (ไม่ใช่ความลับ); ไม่ตั้ง → `/v1/link`, `/v1/signin` ตอบ 503 `google_unset`

| เส้นทาง | เข้า | ออก |
|---|---|---|
| `GET /v1/account` | Bearer | `{accountId, status, google, recoveryCodeAt}` |
| `POST /v1/link` | Bearer + `{idToken}` | 200 ข้อมูลบัญชี (ซ้ำได้) / 409 `identity_in_use` · `already_linked` / 401 `{error:'google_token', reason}` |
| `POST /v1/signin` | `{idToken, token}` | `{accountId}` / 404 `not_linked` / 400 credential ผิดรูปหรือชน / 401 / 429 เกิน 10 ครั้ง/นาที/IP |
| `POST /v1/recovery-code` | Bearer | 201 `{code}` (แสดงครั้งเดียว) |
| `POST /v1/recover` | `{code, token}` | `{accountId}` / 404 `invalid_code` / 400 / 429 เกิน 5 ครั้ง/นาที/IP |

เส้นทางบัญชีไม่ต้องใช้ header เวอร์ชันเนื้อหาหรือ session (ไม่แตะเกม); บัญชีละ 20 ครั้ง/นาที; JSON ≤ 8 KB. บัญชี `suspended`/`deleting` เข้าด้วย Google/รหัสไม่ได้

## 3. Client [จริง]

- `ServerClient` (`src/platform/server-client.ts`): `account()`, `link()`, `recoveryCode()`, `signIn()`, `recover()`; สำเร็จแล้วเก็บ credential ใหม่ (หน่วยความจำมาก่อน localStorage) แล้ว shell เรียก `enter()` เข้าบัญชีนั้น
- `src/platform/google-identity.ts` (โหลด GIS แบบ popup, `auto_select: false`, Client ID override ได้ด้วย `VITE_GOOGLE_CLIENT_ID`), `src/ui/account-panel.ts`, `src/ui/save-place.ts` (ป้ายบันทึก); ระหว่างรอทุกหน้าจอ `inert` เหมือนคำสั่งเกม
- โค้ดตรวจ token ไม่อยู่ใน bundle ของเกม (bundle มีแค่ URL สคริปต์ GIS)

## 4. เทสต์ [จริง]

- `tests/server-account.test.ts` (8): verifier (ผ่าน, iss/aud/azp/exp/iat/alg/ลายเซ็นปลอม/กุญแจแปลก/ผิดรูป, cache, kid หมุน, JWKS ล่ม); link (เก็บแค่ sub ไม่มีอีเมล, ซ้ำได้, ไม่รวมบัญชี, already_linked, 401/415/405/503); signin เครื่องใหม่ → บัญชีเดิม + D12 423 เครื่องเก่า + retry ไม่ได้เครื่องซ้ำ; รหัสกู้คืน (รูปแบบ, เก็บ hash, ออกใหม่ทับ, ใช้ครั้งเดียว, retry ได้, พิมพ์หลวม); rate limit + suspended; `ServerClient` สามเครื่องกับคำตอบที่หาย
- `tests/browser/server-play.spec.ts` +1 (Chromium 390px, GIS เป็น stub ที่ให้ token ลงลายเซ็นด้วยกุญแจทดสอบ ตรวจด้วยโค้ด Worker จริง): มือถือผูก + ออกรหัส → แล็ปท็อปเจอ "สลับไปบัญชีนั้น" → เข้าบัญชีเดิมถึงศึกแรก → แท็บเล็ตใช้รหัส → เครื่องที่สี่ใช้รหัสเดิมไม่ได้; ป้าย "บันทึกบนเซิร์ฟเวอร์ทุกเทิร์น"
- `cloudflare/smoke.mjs` +account/recovery-code/recover/recover again (404)/เครื่องใหม่เข้าเล่น/`/v1/link` ด้วย token รูปถูกแต่ `kid` แปลก → 401 `key` (พิสูจน์ว่าตั้ง Client ID และ Worker ดึง JWKS ของ Google ได้) — ผ่านกับ `wrangler dev` (workerd) ในเครื่อง ดึง JWKS จริง
- ยังไม่ได้กดปุ่ม Google จริงกับบัญชี Google จริง (ต้องเปิดจาก origin ที่อนุญาต `https://wnau34-nptrn.github.io` หรือ `http://localhost:5173` และเป็น test user ของโหมด Testing) — เจ้าของลองได้หลัง deploy

## 5. ตัวเลขวัด: ศึกยาว และ `/v1/verify` บน log ยาว [จริง: Node · Workers ดูข้อ 5.2]

`tests/server-measure.test.ts` เล่นบัญชีใหม่ผ่าน API แบบเดียวกับเกม (คำสั่ง `battle` ทุกเทิร์นพกทุกเทิร์นก่อนหน้า) จน log ครบ แล้วเรียก verify

### 5.1 Node (`SERVER_MEASURE=1`, SQLite ในหน่วยความจำ, เครื่อง dev)

| กรณี | ผล |
|---|---|
| เล่นจริง MAP1 300 คำสั่ง (18 ศึก ยาวสุด 19–20 เทิร์น) | คำสั่ง p50 5 ms · p95 8 ms · สูงสุด 10–14 ms; คำตอบใหญ่สุด ~3.7 KB |
| `/v1/verify` log 50 / 150 / 300 | 40–53 / 100–115 / 180–210 ms |
| ศึกยาวสังเคราะห์ (HP ศัตรู ×12, ศึก 47 เทิร์นวนซ้ำ, log 260) | เทิร์นที่ 25 ≈ 6–13 ms, เทิร์นที่ 47 ≈ 18–20 ms (โตตามจำนวนเทิร์น ~0.35 ms/เทิร์นที่ replay); `/v1/verify` 0.9–1.2 วินาที |

### 5.2 Workers (CPU จริง, deploy หลัง #229, 12 พ.ย.)

workflow `cloudflare-dev.yml` รันชุดเดียวกันกับ Worker dev (log 300, verify ที่ 50/150/300) ขณะเปิด Workers Tail (Tail เก็บได้บางส่วน: DO `/command` 105 จาก ~300 ครั้ง, DO `/verify` 1 จาก 3 ครั้ง)

| เส้นทาง | CPU (ms) |
|---|---|
| Worker ทุกเส้นทาง (auth D1 + ส่งต่อ; `/v1/recover` `/v1/recovery-code` `/v1/guest`) | 0–4 |
| DO `/command` (เล่นจริง MAP1, ศึกยาวสุด 19 เทิร์น) | p50 7 · p95 19 · max 24 |
| DO `/verify` (log ยาว, ครั้งที่ Tail จับได้) | 215 |

เวลาไป-กลับจาก runner ในสหรัฐฯ: คำสั่ง p50 198 ms; verify log 50/150/300 = 301/384/471 ms (รวมเครือข่าย). ไม่มีคำขอใดล้มเพราะ CPU ในรอบนี้

### 5.3 ข้อสรุป [เสนอ]

- **`/v1/verify` replay ทั้ง log จึงโต O(n) ตามจำนวนคำสั่ง × ความยาวศึก** และเกิน 10 ms ของ Free plan ตั้งแต่ log สั้น ๆ: ใช้เป็น audit ของ admin/งานเบื้องหลังเท่านั้น และทำ snapshot เป็นระยะ (verify จาก snapshot ล่าสุด) ก่อนเปิดคนนอก (ตรง SERVER_P09_02B §7)
- **คำสั่ง `battle` replay ทั้งศึกทุกเทิร์น** — ศึกจริง MAP1 ~20 เทิร์นยังเบา แต่ศึกบอส/ศึกยาว 50+ เทิร์นแตะ 10–20 ms (Node): ทางลด (ไม่เปลี่ยนกฎ): DO เก็บ `BattleState` ล่าสุดในหน่วยความจำแล้ว resolve เฉพาะเทิร์นใหม่ (ตรวจว่า prefix ตรงกับที่เก็บไว้) — เลือกหลังเห็น CPU จริงของ Workers
- ตัดสิน D8: CPU บน Workers สูงกว่า Node ราว 1.5–2 เท่า: คำสั่งศึก p95 19 ms เกิน 10 ms ของ Free แล้ว (ศึกยาวจะเกินมากขึ้น) และ verify 215 ms → แนะนำ Paid หรือทำ battle แบบ incremental + snapshot ก่อนเปิดคนนอก

## 6. ที่เหลือ [เสนอ]

- D11 นำเข้าเซฟ v58 (งานถัดไป); snapshot log + verify จาก snapshot; battle แบบ incremental ใน DO
- ชวนผูกบัญชีหลังเคลียร์ MAP1 (ACCOUNT_FLOW §2) และปุ่มบัญชีในค่าย — ตอนนี้เปิดจากหน้าแรกเท่านั้น
- ออกจากระบบ/เพิกถอนเครื่อง (`/v1/sessions/revoke`), access/refresh token หมุนเวียน, ลบบัญชี, นโยบายความเป็นส่วนตัว (ก่อนเปิดคนนอก)
- OAuth consent screen โหมด Testing: เฉพาะ test user ที่เจ้าของเพิ่มใน Google Cloud เข้าได้; ต้อง publish ก่อนทดสอบภายนอก (OD-13)
- Safari/iPhone/Android จริงกับ popup ของ Google ยังไม่ได้ทดสอบ
