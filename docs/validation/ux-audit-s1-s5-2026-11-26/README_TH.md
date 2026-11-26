# UX audit Sprint 1 — S1 จอเล็ก และ S5 empty state (2026-11-26)

แผน: [docs/UX_GAMEFEEL_AUDIT.md](../../UX_GAMEFEEL_AUDIT.md) §7 · เจ้าของอนุมัติ “อนุมัติแผน เริ่ม S1 และ S5 ได้เลย”
ขอบเขต: CSS/DOM เท่านั้น ไม่แตะ rules, save, content, balance หรือ timing การต่อสู้

## S1 จอเล็ก (P0-1, P0-2)

- `src/ui/lobby-ui.ts` ห่อชื่อ “กระดานเควสต์” ด้วย `.quest-title`; `src/ui/camp-layout.css` บรรทัดเดียวไม่ตัดคำไทย, ซ่อนลูกศรเมื่อกรอบ ≤ 440px, ลด padding/ตัวอักษร ≤ 380px, ซ่อนไอคอนธง ≤ 340px
- `src/ui/gacha.css` แถวปุ่มสุ่มติดขอบล่างของ sheet (`position: sticky`) ภาพ stage ไม่ถูกบีบ
- วัดได้: ที่ 320/360/393/430/480 px ทุกช่องแถวบน `scrollHeight ≤ clientHeight`, ชื่อไม่ถูกตัด; ปุ่มสุ่มที่ 360×640 bottom 615 (เดิม 647 เกินจอ 640), เลื่อนจนสุดแล้วปุ่มไม่ทับปุ่มลิงก์

## S5 empty state (P1-4)

- `src/ui/gear-inventory.ts` `gearEmpty()` ใช้ร่วม 3 ที่: คลังค่าย (`lobby-ui.ts`), กระเป๋าบนแผนที่ (`world-ui.ts`), แท็บอุปกรณ์ตัวละคร (`character-panel.ts`); สไตล์ `.gear-empty` ใน `components.css`
- ยังไม่มีของ → “ยังไม่มีอุปกรณ์” + ที่มา + ปุ่ม “เลือกแผนที่” (ค่าย) / “สำรวจต่อ” (แผนที่; action ใหม่ `pack-explore` ปิดกระเป๋า)
- ตัวกรองซ่อนทั้งหมด → บอกจำนวนที่มี + ปุ่ม “ล้างตัวกรอง” (ใช้ `data-gear-reset` เดิม)
- ช่องอุปกรณ์ที่เลือกว่าง (หน้าตัวละคร) → ปุ่ม “ดูทุกช่อง”
- หน้าตัวละครกรณีไม่มีของเลย แสดงคำอธิบายแต่ไม่มีปุ่ม (dialog นี้ใช้ทั้งในค่ายและบนแผนที่ จึงยังไม่ผูกปุ่มนำทาง)

## ตรวจแล้ว

- `npm run typecheck`, `npm run lint`, `npm test` (2337 ผ่าน, 25 skip), `npm run build` ผ่าน
- Playwright Chromium ใหม่ `tests/browser/ux-audit-s1-s5.spec.ts` 8 เคสผ่าน
- ชุดเดิมที่เกี่ยวข้องผ่าน: gacha, camp-trip-panel, camp-level, shared-equipment, storage, equipment-comparison, quest-board(+p05), world-boss-p11, world-boss-trio-ui, boss-equipment (40 ผ่าน); ui-language-audit, team-five, world (-g pack/bag/equipment/language/team: 26 ผ่าน 3 skip)
- ยังไม่ได้ทดสอบ: iOS Safari / Android จริง, ชุด browser เต็ม (ปล่อยให้ CI)

## ภาพก่อน/หลัง (viewport และ state เดียวกัน)

- `camp-top-360x640-before-after.jpg`
- `gacha-360x640-before-after.jpg`
- `bag-empty-393x852-before-after.jpg`
