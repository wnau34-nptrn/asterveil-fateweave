# Perf R11 — ลดเวลารอเมื่อเน็ตหลุด (โหมด server)

ที่มา: audit 2026-11-20 C3 ท้าย / R11. แก้เฉพาะ `src/platform/server-client.ts` และ hook แสดงป้ายใน `src/ui/game-shell.ts`; ไม่แตะกติกา เซฟ หรือ Worker API.

## ค่าที่เปลี่ยน (ค่าร่าง — เจ้าของปรับได้)
| ค่า | ก่อน | หลัง |
|---|---|---|
| `SEND_ATTEMPTS` (คำขอที่ผู้เล่นรอ) | 5 | 3 |
| timeout ต่อครั้ง `ATTEMPT_TIMEOUT_MS` | 15 s | 7 s |
| backoff | 0.4/0.8/1.6/3.2 s | 0.4/0.8 s (Retry-After 429 ยังตามเซิร์ฟเวอร์ สูงสุด 5 s) |
| `/v1/import` (อัปโหลดใหญ่) | 5 × 15 s | เดิม (`LONG_SEND_ATTEMPTS`/`LONG_TIMEOUT_MS`) |
| chat/report/โพล | 15 s | เดิม |

ทุกครั้งส่ง requestId/seq/command เดิม (idempotency คงเดิม); ปุ่ม “ส่งซ้ำ” ใช้ `retry()` ตัวเดิม (ส่งอีก 3 ครั้งด้วยคำขอเดิม). เพิ่ม `ServerClient.onReconnecting` เรียกเมื่อครั้งแรกล้มเหลวและกำลังจะลองใหม่ → shell ขึ้นป้าย “กำลังเชื่อมต่อใหม่…” ทันที (ทั้ง lock เต็มและ soft wait).

## วัด (Chromium 390px emulation, route blackhole คำสั่ง — ไม่ตอบเลย; ไม่ใช่เครือข่ายจริง)
| | ก่อน | หลัง |
|---|---|---|
| ป้าย “กำลังส่ง/เชื่อมต่อ” | 0.85 s | 0.84 s |
| ป้าย “กำลังเชื่อมต่อใหม่…” | 60.9 s | 7.2 s |
| การ์ด “เชื่อมต่อเซิร์ฟเวอร์ไม่ได้” | 81.5 s | 22.3 s |

## ทดสอบ
- `tests/server-client-retry.test.ts` (ใหม่ 6): 3 ครั้ง ≤ 25 s, requestId เดิม, 5xx, 429 Retry-After, timeout แล้วสำเร็จรอบสอง, `retry()` ด้วยคำขอเดิม, hook `onReconnecting`.
- Vitest ทั้งชุด (2113 ผ่าน), typecheck, lint, build, Playwright `server-play.spec.ts` 7/7.
- ข้อจำกัด: ไม่ได้วัดกับ dev API จริงหรืออุปกรณ์จริง; ถ้า Worker เย็นตอบช้ากว่า 7 s จะเห็นป้ายเชื่อมต่อใหม่และลองซ้ำด้วย requestId เดิม (ปลอดภัย).
