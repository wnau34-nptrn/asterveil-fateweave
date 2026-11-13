# P09-02f — ศึกแบบ incremental ใน DO + `/v1/verify` เฉพาะ admin + ออกจากระบบ

13 พฤศจิกายน 2026 · เจ้าของสั่ง “ทำ P09-02f” · ไม่เปลี่ยนกฎ ตัวเลข หรือรูปเซฟ (save v58 เดิม)

## 1. ศึกแบบ incremental [โค้ด]

- `src/core/command/battle-memo.ts` `battleMemo()`: เก็บสถานะศึกหลังแต่ละเทิร์นที่ resolve แล้ว คำสั่ง `battle` (ที่พกทุกเทิร์น) จึง resolve เฉพาะเทิร์นใหม่ด้วย `resolveCommand` ตัวเดียวกับ `replay` — ผลเท่ากันทุกบิต
- ใช้ของที่เก็บไว้เฉพาะเมื่อข้อมูลศึก (encounter ที่สร้างจาก run) + HP ตอนเข้าศึกตรงกันทุกตัวอักษร และ prefix ของรายการคำสั่งตรงกัน; ไม่ตรง/สั้นกว่า/เทิร์นผิด → resolve ต่อจากเทิร์นแรกที่ไม่ตรง (เท่ากับ replay เต็ม); เทิร์นผิดกฎยัง throw เหมือนเดิม และเทิร์นก่อนหน้ายังเก็บไว้
- เสียบผ่าน `CommandContext.battles` (ไม่บังคับ; ค่าเริ่มต้น = replay เต็ม) → `recordBattle`/`battleState`/`finishBattle` รับ `play` (เดิมแต่ละคำสั่ง replay ทั้งศึก 3 รอบ ตอนนี้ resolve เทิร์นใหม่ 1 ครั้ง)
- `GameHost` ถือ memo ไว้ตลอดอายุ DO (หลัง DO ถูกปลดจากหน่วยความจำ คำสั่งแรกจะ replay เต็มหนึ่งครั้ง); `/verify` ใช้ memo ใหม่ทุกครั้ง (log ที่มีคำสั่ง battle ต่อเนื่องกลายเป็น O(จำนวนเทิร์น))
- `sqlStore` ไม่ copy `book` (คำตอบล่าสุด 64 รายการ แต่ละรายการมี view ทั้งก้อน) ทุก load/commit อีก — `processCommand` สร้าง book ใหม่เสมอ ไม่แก้ของเดิม; game ยัง copy เหมือนเดิม (วัดได้ว่านี่คือต้นทุนหลักที่เหลือ ~1.6 ms/คำสั่ง)

## 2. `/v1/verify` เฉพาะ admin [โค้ด]

- D1 migration `0004_admin_audit.sql`: `admins (account_id, granted_at, note)` และ `admin_audit (admin_id, action, target, result, at)`
- เป็น admin = มีแถวใน `admins` เท่านั้น ไม่มี API ให้สิทธิ์ ไม่มี secret: เจ้าของเพิ่ม/ลบเองด้วย `npx wrangler d1 execute DB --remote --config <deploy config> --command "INSERT INTO admins (account_id, granted_at, note) VALUES ('<accountId>', <ms>, 'owner')"` (accountId ดูได้จาก `/v1/account`)
- ไม่ใช่ admin → 403 `forbidden` (ไม่ replay, ไม่เขียน audit); admin ส่ง body `{ accountId }` เพื่อตรวจบัญชีอื่นได้ (ไม่ใส่ = บัญชีตัวเอง; ไม่มีบัญชีนั้น 404); จำกัด 10 ครั้ง/นาที
- ทุกการตรวจของ admin เขียน `admin_audit` หนึ่งแถว: `ok:<seq>` / `fail:<reason>:<seq>` / `error:<status>`
- CI: smoke และการวัดให้สิทธิ์ admin กับบัญชีทิ้งชั่วคราวด้วย `wrangler d1 execute` แล้วลบแถวทันที (ไม่แสดง output ของ Wrangler เพราะมีอีเมลเจ้าของ)

## 3. ออกจากระบบ `/v1/sessions/revoke` [โค้ด]

- `{ scope: 'this' }` (ค่าเริ่มต้น): เพิกถอน credential ของเครื่องนี้ (`devices.revoked_at`) เครื่องลืม token แล้วเริ่มบัญชีทดลองใหม่ เข้าบัญชีเดิมได้ด้วย Google หรือรหัสกู้คืน
- ถ้าบัญชีไม่มี Google ไม่มีรหัสกู้คืน และไม่มีเครื่องอื่น → 409 `unrecoverable` จนกว่าจะส่ง `confirm: true` (หน้าบัญชีถามยืนยันก่อน)
- `{ scope: 'others' }`: ออกจากระบบทุกเครื่องอื่นของบัญชี (เช่น โทรศัพท์หาย) ตอบ `{ revoked: n }`
- หน้าบัญชี: หัวข้อ “ออกจากระบบ” ปุ่ม “ออกจากระบบเครื่องนี้” และ “ออกจากระบบเครื่องอื่นทั้งหมด”

## 4. ทดสอบ

- `tests/server-perf.test.ts` (6): memo = replay เต็มทุก prefix/รายการสั้นลง/เทิร์นผิด/ศึกอื่น/คืน copy; เล่นจริงผ่าน API 140 คำสั่ง (>30 คำสั่งศึก) แล้ว replay เต็มของ log ได้ game เดียวกับที่ server เก็บ และเทียบทีละคำสั่ง; เทิร์นผิดถูกปฏิเสธโดยศึกไม่เสีย, DO ใหม่ (ถูกปลด) เล่นต่อได้; verify: ไม่ใช่ admin 403, audit ทุกครั้ง, ตรวจบัญชีอื่น, log ถูกแก้ → `fail:status`; ออกจากระบบ: เตือน `unrecoverable`, `others`, token เดิม 401
- Playwright `server-play.spec.ts` (Chromium 390px, 4/4): เพิ่มขั้นออกจากระบบเครื่องอื่น → ออกจากระบบเครื่องนี้ → บัญชีทดลองใหม่ถูกเตือนก่อน → กลับด้วย Google

## 5. ตัวเลขวัด

### 5.1 Node (`SERVER_MEASURE=1`, เครื่อง dev, เทียบ 02d §5.1)

| กรณี | ก่อน (02d/02e) | หลัง |
|---|---|---|
| เล่นจริง MAP1 300 คำสั่ง | p50 5 · p95 8 · max 10–14 ms | p50 2.4 · p95 3.9 · max 5.9 ms |
| ศึกยาวสังเคราะห์ เทิร์นที่ 47 | 18–20 ms | 3.1–4.1 ms (ไม่โตตามจำนวนเทิร์นแล้ว) |
| `/v1/verify` log 300 | 180–210 ms (ทั้ง log) | 1.1 ms (จาก snapshot + memo) |
| `/v1/import` เซฟ ~2 KB | — | 5.5 ms |

### 5.2 Workers

`cloudflare-dev.yml` หลัง merge #233 (13 พ.ย.): smoke ผ่าน (verify ไม่ใช่ admin 403 → admin 200, ออกจากระบบ others/warned/confirmed) และวัด log 300 + นำเข้าเซฟ ~2.4 KB ขณะเปิด Workers Tail (Tail จับ DO `/command` ได้ 89 จาก ~300 ครั้ง)

| เส้นทาง | ก่อน (02d §5.2) | หลัง (CPU ms) |
|---|---|---|
| DO `/command` (เล่นจริง MAP1, ศึกยาวสุด 19 เทิร์น) | p50 7 · p95 19 · max 24 | p50 3 · p95 6 · max 12 |
| DO `/verify` (log 50/150/300, จาก snapshot) | 215 | 1–2 |
| DO `/import` (เซฟ ~2.4 KB) | — | 8 |
| Worker ทุกเส้นทาง (auth D1 + admin check + ส่งต่อ) | 0–4 | 0–5 |

เวลาไป-กลับจาก runner (รวมเครือข่าย): คำสั่ง p50 151 ms; verify 254–286 ms; import 398 ms. ไม่มีคำขอใดล้ม

ข้อสรุป [เสนอ]: คำสั่งปกติและ verify/import อยู่ใต้ 10 ms ของ Free plan แล้ว; max 12 ms ยังมีอยู่ (ศึกแรกหลัง DO ถูกปลด หรือคำสั่งที่จบศึก/จบการเดินทาง) — Free plan ยอมให้เกินเป็นครั้งคราว แต่การตัดสิน D8 (Free/Paid) ยังเป็นของเจ้าของ; ศึกบอสยาวจริงยังไม่ได้วัดบน Workers

## 6. ที่เหลือ [เสนอ]

- ปิด `LEGACY_IMPORT` ก่อนคนนอก; access/refresh token หมุนเวียน; ลบบัญชี + นโยบายความเป็นส่วนตัว; publish consent screen; rate limit จริง (ข้าม isolate)
- เครื่องมือ admin อื่น (ดู audit, แก้เซฟที่นำเข้า) ใช้ `admins`/`admin_audit` เดียวกัน
- Safari/iPhone/Android จริงยังไม่ได้ทดสอบ
