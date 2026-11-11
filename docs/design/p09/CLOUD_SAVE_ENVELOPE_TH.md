# P09-01 — รูปแบบ cloud save envelope

11 พฤศจิกายน 2026 · **[โค้ด]** = ตรวจจากโค้ด; **[เสนอ]** = ข้อเสนอ · ต้นแบบ pure: `src/core/cloud/cloud-save.ts` (ยังไม่ต่อกับเกม/Worker), เทสต์ `tests/cloud-save-envelope.test.ts`

## 1. ข้อเท็จจริงจากเซฟปัจจุบัน [โค้ด]

- เซฟ v58 เป็นสตริง JSON `{version, profile, run}`; `parseGame(raw, map, lookup, maps)` เป็นฟังก์ชัน pure (import แค่ `core/world`, `core/battle`, `content`) จึงรันใน Worker ได้ด้วยโค้ดชุดเดียวกัน
- `parseGame` รับทุกเวอร์ชัน 1–58 แล้วย้ายเวอร์ชันในหน่วยความจำ; `saveGame` เขียนเวอร์ชันล่าสุดเสมอ → การย้ายเวอร์ชันเกิดเมื่อ “โหลดแล้วเซฟใหม่”
- วัดในเครื่อง (Node, vitest): เซฟใหม่ไม่มี run ≈ 748 ไบต์, มี run ใหม่ ≈ 2,219 ไบต์, `parseGame` ≈ 0.7 ms/ครั้ง เซฟปลายเกม (ของจำนวนมาก ศึกค้างยาว) ยังไม่ได้วัด
- `parseGame` **ไม่พิสูจน์ที่มาของรายได้**: เซฟที่แก้ `bank` เป็นเพดาน (ทอง 9,999,999 / ตรา 99,999) ยังผ่าน (มีเทสต์ยืนยัน) และ `profile.seed` ที่กำหนดผลหลอม (`forge`) มาจากเครื่อง

## 2. Envelope ที่เครื่องส่ง [เสนอ, มีต้นแบบ]

```jsonc
{
  "format": 1,                    // รูปแบบ envelope (แยกจากเวอร์ชันเซฟ)
  "requestId": "req_…",           // 16–64 ตัว [A-Za-z0-9_-], ใหม่ทุกครั้งที่ “ตั้งใจเซฟใหม่”, ใช้ซ้ำเมื่อ retry
  "baseRevision": 4,              // revision ของ server ที่เครื่องซิงก์ล่าสุด (0 = ไม่เคย)
  "saveVersion": 58,              // ต้องตรงกับ payload.version
  "payload": "{\"version\":58,…}", // สตริงเซฟ local ตรงตัว ไม่ parse/จัดรูปใหม่
  "payloadBytes": 2219,           // ความยาว UTF-8
  "payloadSha256": "…64 hex…"     // SHA-256 ของ payload (UTF-8)
}
```

ลำดับตรวจบน server (`checkUpload` แล้วตามด้วย replay)

1. รูปร่าง: เป็น object มีคีย์ครบและไม่มีคีย์เกิน
2. `format`, `requestId`, `baseRevision` (จำนวนเต็ม ≥ 0), `saveVersion` ที่ build นี้รองรับ
3. **ขนาดก่อนทำอย่างอื่น**: เพดานร่าง 256 KiB (ทั้งความยาวสตริงและไบต์ UTF-8) และ `payloadBytes` ต้องตรง
4. ความสมบูรณ์: server คำนวณ SHA-256 เอง เทียบกับ `payloadSha256` — ใช้จับข้อมูลเสีย/ส่งไม่ครบ **ไม่ใช่กันโกง** (เครื่องคำนวณ hash เองได้; ไม่ใส่คีย์ลงนามในเครื่องเพราะคีย์จะรั่วได้)
5. `JSON.parse` ได้และ `version === saveVersion`
6. Replay: `parseGame` ด้วย content ของ build เดียวกัน; ไม่ผ่าน → 422 พร้อมเหตุผลแบบหยาบ (ไม่ส่ง stack)
7. ตัดสิน revision (`decideUpload`, compare-and-swap):

| ผล | เมื่อไร | server ทำ |
|---|---|---|
| `store` | `baseRevision` = head (หรือยังไม่มี head และ base=0) | เขียน revision+1, จด requestId |
| `replayed` | requestId นี้ commit แล้วด้วย payload เดิม | ตอบ revision เดิม ไม่เขียน |
| `unchanged` | head มี payload เดียวกันอยู่แล้ว | ตอบ revision ของ head |
| `requestReused` | requestId เดิม payload ต่าง | 409 ปฏิเสธ |
| `downgrade` | `saveVersion` ต่ำกว่าของ head | 409 ห้ามรูปแบบเก่าทับรูปแบบใหม่ |
| `conflict` | base ไม่ตรง head | 409 พร้อม revision ของ head → เครื่องเข้า §4 ของ ACCOUNT_FLOW |

## 3. ระเบียนบน server [เสนอ]

หัว (ก้อนล่าสุด) ต่อบัญชี: `revision`, `saveVersion`, `payload`, `payloadBytes`, `payloadSha256`, `buildId` ที่ตรวจ, `deviceId`, `updatedAt` (เวลา server), `origin` (`legacy` = อัปโหลดครั้งแรกจากเซฟ offline / `cloud`) — ประวัติเก็บสำเนาเดิมทุก revision ตามอายุร่าง (10 ก้อน + 30 วัน)

## 4. ย้ายเวอร์ชัน v58 → v59 และต่อไป [เสนอ]

- server เก็บ payload ตามที่เครื่องส่ง **ไม่แปลงเองเงียบ ๆ**; การย้ายเกิดเมื่อเครื่องเวอร์ชันใหม่โหลดแล้วเซฟใหม่ (เส้นทางเดียวกับ local วันนี้)
- ลำดับ deploy: Worker ที่รองรับ v59 ขึ้นก่อน → แล้วหน้าเกมที่เขียน v59 (Pages). เครื่องที่ใหม่กว่า server ได้ `saveVersion` ไม่รองรับ → เก็บ local รอ (`waiting`/แจ้ง “เซิร์ฟเวอร์กำลังอัปเดต”)
- เครื่องเก่าที่ดึงเซฟ v59 แล้วอ่านไม่ได้ → `blocked: versionTooNew` ให้รีโหลดเกม; และ `downgrade` กันเครื่องเก่าเขียนทับ
- admin migration (OD-13 เครื่องมือ admin) ทำได้เฉพาะแบบ “โหลดด้วย parseGame แล้วเขียนเป็น revision ใหม่” ผ่านโค้ดเดียวกัน มี dry-run และเก็บก้อนเดิมในประวัติ
- ทุกครั้งที่ bump `SAVE_VERSION` หรือ `EncounterDefinition.version` ต้องอัปเดตรายการเวอร์ชันที่ Worker รองรับในคราวเดียวกัน (เทสต์ P09-02 ควรบังคับ)

## 5. ความเสี่ยงที่ต้องวัดใน P09-02

- CPU ของ replay บน Worker กับเซฟใหญ่ (แผนฟรีจำกัด CPU ต่อคำขอต่ำ) — วัดเซฟปลายเกมก่อนเลือกแผน
- ขนาด bundle เมื่อรวม content ทั้งหมดเข้า Worker
- เพดาน 256 KiB เป็นร่าง: ยืนยันกับเซฟใหญ่ที่สุดจาก sim ก่อนล็อก; ตรวจขีดจำกัดขนาดแถวของ D1 ตามเอกสาร Cloudflare ปัจจุบัน
