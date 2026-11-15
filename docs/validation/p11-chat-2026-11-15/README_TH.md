# P11 แชทโลก — ผลตรวจ (2026-11-15)

ออกแบบ: [CHAT_P11_TH.md](../../design/CHAT_P11_TH.md) · ไม่แตะกติกา/เซฟ/สมดุล (เซฟ v64)

## ที่ทำ
- ตัวกรอง `src/core/chat/filter.ts` (ใช้ร่วมเครื่อง/เซิร์ฟเวอร์), DO `Chat` `src/server/chat.ts`, เส้นทาง Worker ใน `src/server/api.ts` (`/v1/chat`, `/v1/chat/send`, `/v1/chat/report`, `/v1/admin/chat{,/hide,/mute}`), binding `CHAT` + migration tag `v4` + var `CHAT_WRITE` ใน `cloudflare/wrangler.json`, purge แชทก่อนลบบัญชีใน `worker.ts`
- ไคลเอนต์ `ServerClient.chat*` และหน้าต่าง `src/ui/chat-panel.ts` (ปุ่ม "แชท" ในค่าย; ออฟไลน์ปิดพร้อมเหตุผล "เฉพาะเล่นออนไลน์")
- หน้านโยบายความเป็นส่วนตัวเพิ่มหัวข้อแชท

## ทดสอบ
- `tests/chat-p11.test.ts` (14): ตัวกรอง, ชื่อแฝง, จังหวะส่ง 4 วิ/8 ต่อนาที/60 ต่อชั่วโมง, ซ้ำ, แจ้ง 3 คนซ่อน, mute, เก็บ 7 วัน/500/30 วัน, purge, เส้นทาง Worker (ไม่มี account id ในคำตอบ, `CHAT_WRITE`, deleting, admin + audit, IP gate, DO ล่ม 503)
- Load probe `tests/probe/p11-chat-load.test.ts` → [load.md](load.md): 2000 บัญชีส่งพร้อมกัน ~0.2 ms/ข้อความ, poll 2000 บัญชี ~0.08–0.26 ms; id ไม่ซ้ำไม่ขาด, เก็บ 500 ล่าสุด, สแปม 200 ข้อความผ่าน 1 — handler + SQLite ในหน่วยความจำ ไม่ใช่ Cloudflare จริง
- Chromium 390px `tests/browser/chat-p11.spec.ts` (2): ส่ง/รับผ่าน polling, ลิงก์ถูกปฏิเสธบนเครื่อง, แจ้ง, ซ่อนค่าย, mute ทำให้ช่องพิมพ์ปิดพร้อมเหตุผล, touch ≥ 44px, ไม่มี scroll แนวนอน; ออฟไลน์ปุ่มปิด
- ภาพ: [chat-390.png](chat-390.png), [camp-offline-390.png](camp-offline-390.png)
- ไม่ได้ทดสอบ: Cloudflare staging จริง, iOS Safari/Android จริง, คนจริงหลายคนพร้อมกัน
