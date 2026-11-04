# ภาพวาดยาฟื้นความเหนื่อย (calm) — นำเข้า 2026-11-04

- ที่มา: Codex [PR #151](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/151) `ART-UI-POTION-CALM-001` (head `0caff1d`) เลือก **R1** (aqua + หมอกเงิน ตามที่ Codex แนะนำ) — เจ้าของมอบให้ Claude ตัดสินเรื่องภาพ (“เรื่องภาพหรืออะไรให้คุณตัดสินใจได้เลย”, 2026-11-04) ไม่ใช่การอนุมัติภาพโดยตรงของเจ้าของ
- ตรวจ SHA-256 `calm-R1.png` = `e26291f3…` ตรงกับ `validation.json` ของ package; ดู `review-390.png` ทั้งสีและขาวดำที่ 44/28px แล้ว R1 แยกจาก salve/tonic/repel ด้วยทรงไหล่กว้าง ไม่ใช่สีอย่างเดียว (R2 สีใกล้ repel, R3 กว้างเกิน)
- `public/assets/ui/equip/potion_items.webp` 640×128 → 768×128 lossless: 5 ช่องเดิมตรงทุกพิกเซลกับไฟล์เดิมที่ decode แล้ว, ช่อง 6 ตรงกับ R1 ทุกพิกเซล (59,954 → 69,974 bytes) · `potion_items.json` เพิ่ม `potion_calm` (640,0) · URL ใส่ `?v=c33f5fbb` ให้เบราว์เซอร์โหลดใหม่
- `src/ui/equip-art.ts` เลิกใช้ไอคอนเส้นแทนภาพ (`potion-art-icon` CSS ลบออก); ไอคอนเส้น `potionCalm` ยังใช้ในรายการย่อตามเดิม
- แก้บั๊กเดิมระหว่างตรวจ: ภาพยาในหน้าปรุงยาถูกยืดแนวนอน เพราะ `.hire-list li > span { flex: 1 }` (`world.css`) จับ `<span class="potion-art">` ด้วย เพิ่ม `.hire-list li > .potion-art { flex: none; }`
- ภาพจริง 390×844 หลังแก้: [brew-390x844.png](brew-390x844.png) จาก `tests/browser/world.spec.ts` “potions: brew in the lobby” (Chromium เท่านั้น)
- ไม่เปลี่ยนกฎ เซฟ ราคา หรือสมดุล
