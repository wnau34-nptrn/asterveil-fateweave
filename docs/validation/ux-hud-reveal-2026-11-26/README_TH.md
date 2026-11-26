# P2-1 staged reveal เมื่อเข้าค่าย (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) P2-1 · เจ้าของสั่ง “merge แล้วทำ P2-1 staged reveal ต่อได้เลย”
ขอบเขต: presentation เท่านั้น

## ทำอะไร

- `src/ui/hud-reveal.ts` `revealHud()`: เข้าค่ายจากหน้าอื่น (หน้าแรก แผนที่ ต่อสู้) ฉากเฟดเข้าเหมือนเดิม แล้ว HUD ตามมาหลัง 100–120 ms ใน 220 ms — แถวบน (`.lobby-top`, `.lobby-boards`) เลื่อนลง 8px แผงออกเดินทางและเมนูล่าง (`.lobby-trip`, `.lobby-menu`) เลื่อนขึ้น 10px; แสดงครบภายใน ~340 ms
- `game-shell.ts` `showLobby()` เรียกเฉพาะตอน “เข้า” ค่าย (ไม่เล่นตอนเปิด/ปิด sheet หรือวาดใหม่)
- ใช้ Web Animations fill `backwards`: จบแล้วไม่เหลือสถานะ, ปุ่มกดได้ตั้งแต่เฟรมแรก, reduced motion ไม่เล่น

## ตรวจแล้ว

- typecheck, lint ผ่าน
- Playwright ใหม่ `tests/browser/ux-hud-reveal.spec.ts` 2 เคสผ่าน: HUD 4 ส่วนมีอนิเมชัน delay ≥80 ms, กดปุ่มตัวละครระหว่างอนิเมชันได้, จบแล้วไม่มีอนิเมชันค้าง, เปิด/ปิด sheet ไม่เล่นซ้ำ, reduced motion ไม่มีอนิเมชัน
- ชุดเดิม camp-trip-panel, camp-level, camp-poses-p03 ผ่าน
- ในเบราว์เซอร์: กดปุ่มระหว่าง reveal ตอบสนองใน 72 ms; ไม่มี transform ค้างหลังจบ
- ไม่มีคลิปในรอบนี้ (การเคลื่อนไหว 8–10px สั้นกว่า S2–S4); ยังไม่ได้ทดสอบ iOS Safari / Android จริง
