# UX audit Sprint 1 — S2–S4 transition (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) P1-1, P1-2, P1-3 · เจ้าของสั่ง “เริ่ม S2–S4 ต่อได้เลย”
ขอบเขต: presentation เท่านั้น ไม่แตะ rules, save, content, balance หรือ timing การต่อสู้ · **รอเจ้าของดูคลิปก่อน merge**

## ทำอะไร

| งาน | พฤติกรรม | ไฟล์ |
| --- | --- | --- |
| S2 เปลี่ยนตัวละคร | เนื้อหาเลื่อนเข้า 18px จากฝั่งที่ตัวละครอยู่ในรายการ + ภาพตัวละครขยายเข้าเบาๆ, 200 ms | `character-panel.ts` (`cue`, `data-enter`), `game-feel.css`, `tokens.css` (`--swap-ms`) |
| S3 เปลี่ยนแท็บ | เนื้อหาเลื่อน 8px ตามทิศแท็บ + แท็บที่เลือกเรืองหนึ่งครั้ง, 150 ms; คีย์บอร์ด ←/→/Home/End ใช้ทิศเดียวกัน | เหมือน S2 (`--tab-ms`) |
| S4 ปิด sheet/dialog | dialog ปิดและคืน focus ทันที แล้วสำเนาที่ไม่มี id, `inert`, ไม่รับการแตะ จมลงและจางใน 140 ms (dialog ทุกตัวที่เป็น `.world-dialog` และ sheet ในค่าย) | `dialog-leave.ts` (`beforetoggle`), `lobby-ui.ts` (`leavingSheet`), `main.ts`, `game-feel.css` (`--sheet-exit-ms`) |
| แก้เพิ่ม | ปิดหน้าทอชะตา/บอสโลกแล้ว focus กลับปุ่มที่เปิด (เดิมหาปุ่มไม่เจอ) | `lobby-ui.ts` `closeSheet` |

- อนิเมชันใช้ fill `backwards`: จบแล้วไม่ค้างสถานะ; render ใหม่ที่ไม่ใช่การเปลี่ยนตัว/แท็บไม่เล่นซ้ำ; แตะซ้ำเร็วๆ เริ่มใหม่ ไม่ซ้อน
- Reduced motion: ไม่มีอนิเมชันเข้าและไม่มีสำเนาตอนปิด
- เบราว์เซอร์ที่ไม่มี `beforetoggle` บน dialog จะปิดทันทีแบบเดิม

## ยังไม่ทำ (รอการตัดสินใจของเจ้าของ §9 ของแผน)

- ให้ทุกแท็บแสดงภาพตัวละครแบบเดียวกัน (P1-2 ข้อ 1) และโทนสีประจำคลาส (P1-1 ข้อ 2)

## ตรวจแล้ว

- Playwright ใหม่ `tests/browser/ux-audit-s2-s4.spec.ts` 3 เคสผ่าน: ทิศ swap/tab, แตะเร็ว 5 ครั้งจบที่ตัวสุดท้ายไม่มีอนิเมชันค้างหลัง 350 ms, กล่องเนื้อหาไม่ขยับตำแหน่ง, แตะแท็บระหว่างอนิเมชันได้ทันที, focus คืนทันที, สำเนาไม่มี id/inert และหายภายใน 1 วินาที, เปิด-ปิด 10 ครั้งไม่ค้าง, reduced motion ไม่มีอะไรเล่น
- ภาพกลางอนิเมชัน `mid-transition-frames-390.jpg` (เปลี่ยนตัว 60 ms, แท็บ 50 ms, ปิด dialog 50 ms, ปิด sheet 60 ms)
- คลิป `s2-s4-390.mp4` (390×844, Chromium headless + touch emulation, เฟรมจาก CDP screencast ไม่ใช่ FPS ของเครื่องจริง)
- ยังไม่ได้ทดสอบ iOS Safari / Android จริง
