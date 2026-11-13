# P09-01 — บัญชีและการตัดสินบน server (ภาพรวม + ข้อที่เจ้าของต้องเลือก)

11 พฤศจิกายน 2026 · เจ้าของอนุมัติให้เริ่มส่วนที่ไม่ต้องใช้ฐานข้อมูลจริง (“อนุมัติ ทำตามที่แนะนำ”) แล้วเลือกให้ server ตัดสินทั้งหมด (“เลือก ค.”) · ไม่ deploy ไม่สร้าง D1 ไม่ใช้ secret ไม่แก้กฎต่อสู้/สมดุล/รูปแบบเซฟ v58

## สรุป

- **server เป็นผู้ตัดสินทุกอย่าง** (D10 = ค): เครื่องส่งคำสั่ง server รันกฎชุดเดียวกับเกมแล้วส่งผลกลับ แก้ตัวเลขในเครื่องไม่มีผล ผลสุ่มทั้งหมดมาจาก seed ที่อยู่บน server เท่านั้น
- ต้องออนไลน์ขณะเล่น และต้องมีบัญชี (สร้าง guest ให้อัตโนมัติ → ผูกบัญชี → กู้คืน/ย้ายเครื่อง)
- เซฟในเครื่องเดิมไม่ถูกลบ ใช้นำเข้าครั้งเดียว (D11) ด้วย envelope ที่ server ตรวจ replay ได้

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [SERVER_AUTHORITY_TH.md](SERVER_AUTHORITY_TH.md) | **หลัก**: สถาปัตยกรรม server ตัดสินทั้งหมด ช่องโหว่ seed ปัจจุบัน ลำดับงาน |
| [ACCOUNT_FLOW_TH.md](ACCOUNT_FLOW_TH.md) | สถานะบัญชีและการเปลี่ยนสถานะ ออฟไลน์/หมดเวลา/ส่งซ้ำ หลายเครื่อง |
| [CLOUD_SAVE_ENVELOPE_TH.md](CLOUD_SAVE_ENVELOPE_TH.md) | envelope สำหรับนำเข้าเซฟเดิมและรูปแบบ snapshot การย้ายเวอร์ชัน |
| [TRUST_BOUNDARY_TH.md](TRUST_BOUNDARY_TH.md) | อะไรเป็นของ server (ทั้งหมด) และการปฏิบัติต่อเซฟเก่า |
| [SCHEMA_API_DRAFT_TH.md](SCHEMA_API_DRAFT_TH.md) | ร่างตาราง D1/DO และ endpoint |
| [COMMAND_LAYER_TH.md](COMMAND_LAYER_TH.md) | **P09-02a**: รายการคำสั่งค่าย/แผนที่ `applyCommand`, จุดที่ seed ถูกใช้, สิ่งที่เหลือก่อนต่อ server |
| [CLIENT_VIEW_TH.md](CLIENT_VIEW_TH.md) | **P09-02a2**: มุมมองเครื่องไม่มี seed (`clientView`, `hireBoard`) และซองคำสั่ง `{requestId, seq}` (`processCommand`) |
| [SERVER_P09_02B_TH.md](SERVER_P09_02B_TH.md) | **P09-02b**: Worker + DO ต่อบัญชี (SQLite) + D1 guest ที่ทำจริง, endpoint, ตัวเลขวัดสำหรับ D8, งานที่เหลือ |
| [CLIENT_SERVER_P09_02C_TH.md](CLIENT_SERVER_P09_02C_TH.md) | **P09-02c**: เกมคุยกับ dev API หลังสวิตช์ `?server=` (ล็อกระหว่างรอ, ส่งซ้ำ requestId เดิม, ตามทัน 409, D12 เล่นทีละเครื่อง 423) |
| [ACCOUNT_P09_02D_TH.md](ACCOUNT_P09_02D_TH.md) | **P09-02d**: D1 ผูก Google (ตรวจ ID token กับ JWKS) + รหัสกู้คืน (เก็บ hash) + ย้ายเครื่อง; วัดศึกยาวและ `/v1/verify` บน log ยาว; ป้าย "บันทึกบนเซิร์ฟเวอร์" |
| [IMPORT_P09_02E_TH.md](IMPORT_P09_02E_TH.md) | **P09-02e**: นำเข้าเซฟในเครื่องครั้งเดียว (D11: `/v1/import`, fingerprint ใน D1, `parseGame` ใน DO) + snapshot ของ log ให้ `/v1/verify` replay จาก snapshot ล่าสุด |
| [PERF_P09_02F_TH.md](PERF_P09_02F_TH.md) | **P09-02f**: ศึกแบบ incremental ใน DO (`battleMemo`, ผลเท่า replay เต็ม), `/v1/verify` เฉพาะ admin (D1 `admins` + `admin_audit`), ออกจากระบบ `/v1/sessions/revoke`, ตัวเลขวัด |
| [SAFETY_P09_02G_TH.md](SAFETY_P09_02G_TH.md) | **P09-02g**: ลบบัญชี (รอ 14 วัน ยกเลิกได้, Cron ลบ DO+D1, `account_audit`), หน้า `privacy.html`, rate limit ข้าม isolate (DO ของบัญชี + DO `RateLimit`), แผนปิดนำเข้า `LEGACY_IMPORT_UNTIL` |
| [TELEMETRY_P09_03_TH.md](TELEMETRY_P09_03_TH.md) | **P09-03**: หมุนกุญแจอุปกรณ์ทุก 24 ชม. (ผ่อนผัน 10 นาที ไม่ต้องเข้าใหม่), สถิติรวมรายวันไม่มี id (`telemetry_daily`), ฟอร์มส่งความเห็นในเกม + มุมมองผู้ดูแลที่ audit |

ต้นแบบ pure (ยังไม่ต่อกับเกม/Worker): `src/core/cloud/cloud-save.ts` (`checkUpload`, `decideUpload`, `decideCommand`), เทสต์ `tests/cloud-save-envelope.test.ts`

P09-02a (2026-11-12, ใช้งานในเกมแล้ว): `src/core/command/game-command.ts` (`parseCommand`, `applyCommand`), seed จาก port `SeedSource` (`src/platform/seed-source.ts` ในเครื่อง), เทสต์ `tests/game-command.test.ts`

## ข้อตัดสินใจ

ตัดสินแล้ว

| # | เรื่อง | ผล |
|---|---|---|
| D10 | ใครตัดสินผลเกม | **ค — server ทั้งหมด** (เจ้าของ “เลือก ค.” 2026-11-11) |
| D2 | เซฟเครื่อง/คลาวด์ขัดกัน | ไม่มีแล้ว — มีสถานะเดียวบน server |
| D4 | ต้องมีบัญชีไหม | ต้องมี (ผลของ D10) — สร้าง guest อัตโนมัติ |
| D5 | เคลม/สุ่มทำที่ไหน | บน server (ผลของ D10) |
| D1 | วิธีผูกบัญชี | **Google sign-in + รหัสกู้คืน** (เจ้าของ “อนุมัติ” 2026-11-12); Apple เมื่อทำแอป iOS |
| D11 | เซฟเดิมในเครื่อง | **นำเข้าครั้งเดียวต่อบัญชีก่อนเปิดทดสอบคนนอกเท่านั้น** (ตรวจ replay+เพดาน; “อนุมัติ” 2026-11-12) |
| D12 | เล่นหลายเครื่อง | **ทีละเครื่อง** เครื่องใหม่ได้สิทธิ์ (“อนุมัติ” 2026-11-12) |

รอเจ้าของเลือก (พร้อมคำแนะนำ)

| # | เรื่อง | ทางเลือก | แนะนำ |
|---|---|---|---|
| D7 | World Boss/อันดับ | ก) รางวัลตามการเข้าร่วม+เพดาน ข) อันดับตามดาเมจ | ตอนนี้ **ข** ทำได้แล้ว เพราะ server คำนวณดาเมจและสเตตัสเอง; เลือกตอนออกแบบ World Boss |
| D6 | อายุประวัติ snapshot | ร่าง snapshot ทุกจบการเดินทาง เก็บ 30 วัน | ตามร่าง ปรับเมื่อรู้ขนาดจริง |
| D8 | แผน Cloudflare | Free / Paid (ต้องใช้ Durable Objects) | ตัดสินใน P09-02 หลังวัดจำนวนคำขอ/CPU และตรวจราคาปัจจุบัน |
| D9 | ข้อมูลส่วนตัว | เก็บแค่ provider+subject ไม่เก็บอีเมล/ชื่อ; หน้าความเป็นส่วนตัว+ขอลบบัญชีก่อนเปิดคนนอก | ตามนี้ (OD-13) |

## งานถัดไป

P09-02a ชั้นคำสั่งของค่าย/แผนที่ + ย้ายการสร้าง seed ออกจาก UI (ทำในเครื่องได้ ไม่ต้องใช้ credential; แตะ `core/world`/`ui` จึงใช้ Opus และต้องประสานกับงาน UI ของ Codex) → P09-02b Worker+DO+D1 (เจ้าของต้องเพิ่มสิทธิ์ D1 Edit และ Durable Objects ให้ token) → P09-02c ต่อ UI รายละเอียดใน SERVER_AUTHORITY_TH §5
