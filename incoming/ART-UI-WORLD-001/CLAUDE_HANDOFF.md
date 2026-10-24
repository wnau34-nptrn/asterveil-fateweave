# Claude handoff — ART-UI-WORLD-001 / revision 2

คุณเป็นผู้พัฒนาที่รับช่วง integrate งานศิลป์และ UI ของ Asterveil · Fateweave

Repository: https://github.com/wnau34-nptrn/asterveil-fateweave
Asset branch: `art/art-ui-world-001-r2`
Game base branch: `feature/fateweave-initial-prototype`
Package: `incoming/ART-UI-WORLD-001/`

## เริ่มงาน

1. Fetch repository และ checkout branch `art/art-ui-world-001-r2` หรือสร้าง integration branch จาก branch นี้ มันมีโค้ดเกมเดิมและแพ็ก asset แล้ว อย่าเริ่มจาก main ที่มีเพียง README และอย่า force-push หรือเขียนทับงานอื่น
2. อ่าน `NOTES.md`, `STYLE_GUIDE.md`, `RESEARCH.md`, `reference/DESIGN_R2.md`, `reference/FIDELITY_R2.md`, `ui/HUD_KIT.md` และ `CLAUDE_HANDOFF.md` ในแพ็ก
3. ดู mockups จาก asset จริง: `world-390x844.png`, `world-844x390.png`, `world-1366x768.png`, `world-320x568.png`, `world-camp-390x844.png`, `world-goals-390x844.png`, `world-high-1366x768.png` รวมทั้ง world-states, encounter-transition, title และ battle
4. ทำ Asset Intake Review: ตรวจ atlas/frame maps, alpha, bottom-centre anchors, PNG/WebP dimensions, ความอ่านง่ายที่ 36 px, licences, file checksums และ runtime budget จาก `MANIFEST.json` / `reference/intake-validation.json` ไม่ต้องสร้าง art ใหม่หรือรัน packing scripts ที่อ้างถึงไฟล์ source generation ของเครื่อง Codex

## ทิศทางที่ผู้ใช้ยืนยันล่าสุด — ให้ข้อนี้เหนือกว่า layout รุ่นแรก

- **MAP เต็มจอ 100vw × 100dvh** และวาง HUD ลอยภายใน ไม่แบ่งพื้นที่เป็นแถบ/แท็บด้านข้าง ไม่มีกรอบใหญ่ครอบ map
- **D-pad โปร่งใสซ้ายล่าง** เป็นลูกศรสี่ทิศ กดครั้งละหนึ่งช่อง ตรงกลางไม่มีปุ่ม Rest ไม่ใช้ joystick หรือ auto-pathing
- **ปุ่มคุย/โต้ตอบตามบริบทขวาล่าง** ใช้ไอคอน `talk.svg` ตอนอยู่แคมป์เปลี่ยนเป็น `พัก` และเปิดใช้งาน/เรืองแสง ตอนยังไม่มี interaction ปิดใช้งานอย่างชัดเจน ใช้ระบบ camp/rest ที่มีอยู่ ไม่สร้างระบบ NPC/dialogue ใหม่เพื่อเติมปุ่ม
- ข้อมูลปาร์ตี้สี่คนเป็นแถวบางด้านบน HUD ใช้ navy glass ขอบขาวบาง ลดกรอบทองหนัก ๆ ชื่อ/HP ยังครบ หน้าจอ portrait ไม่ต้องมีภาพ portrait ในแถวปาร์ตี้ ส่วน desktop ใช้ portrait เดิมได้
- ชื่อโซนอยู่บนซ้าย danger + % ก้าวถัดไปและ info อยู่บนขวา ใช้ Safe/Low/Mid/High ตาม spec เดิม
- เป้าหมายเป็น capsule เล็กเปิด checklist ลอย พร้อมทั้งสี่รายการและสถิติเดิม ไม่ต้องแสดง sidebar ถาวร
- ข้อความ event ล่าสุดเป็น pill เล็กภายใน map ระวังอย่าบัง party token หรือช่องที่แตะเดินได้

ภาพ `concept-fullscreen-*` เป็นภาพแนวคิดการจัดวาง ภาพทางเดิน/เกาะลอยใน concept เป็น illustration ไม่ใช่ production map ที่ตรงกับ topology ของเกม ให้ใช้ mockups ที่ render จาก tile/portrait จริงร่วมกับ `ui/world_overlay.css` เป็นข้อมูล implementation อย่านำภาพ concept หรือ mockup มาทำ background แทน map ที่เล่นได้ และอย่าอบข้อความไทยลงภาพ

## ขอบเขต integration

- แพ็กนี้เปลี่ยนเฉพาะงานภาพและ reference ไม่มีการแก้ `src/`, tests หรือ workflows มาก่อน คุณรับช่วงแก้ renderer/HUD และ tests ที่จำเป็นสำหรับ integration ได้ โดยรักษากติกาเดิม
- ย้ายเฉพาะ asset ที่รับแล้วเข้า `public/assets/` ต่อ `tokens.css`, `ui/components.css`, `ui/world_overlay.css` และ motion spec `fx/README.md` / `effects.css` เข้ากับ state/event จริง อย่าคัดลอก demo handlers จาก `reference/reference.js` เป็น game logic
- คง one-tile movement, encounter probability, HP carry-over, camp heal/revive, boss/gate และ save/replay behavior
- คง `units.webp`, `portraits.webp`, `ruins.webp` เดิม byte-for-byte ห้าม regenerate ตัวละครหรือ battle backdrop
- Title และ Battle ใช้ mockups ในแพ็กเป็น skin reference คง region/mechanics เดิม: SPD queue 4/6 slots, enemy intent, 2×2 battle hero cards, 3 commands, field targeting >=44 px, floating skill popover, start/result actions
- % danger, HP/barrier, skill cooldown/availability, objectives และ action availability ต้องมาจาก authoritative game state ห้ามใช้ข้อมูลตัวอย่างใน mockup
- Thai เป็น live HTML ทุก control >=44×44 px ไม่มี page scroll รองรับ iOS safe areas และ reduced motion ทุก effect; hop 160 ms, encounter transition <=720 ms และไม่เกิน 800 ms
- คุม runtime art <=2.5 MB ตรวจยอดที่เกมโหลดจริง ไม่โหลด PNG และ WebP พร้อมกัน ไม่ส่ง `mockups/`, concept images, reference fonts/art หรือ build tools เป็น production assets
- ไม่เพิ่ม currency, shop, gacha, stamina, AUTO, minimap, joystick, NPC cast หรือระบบที่ยังไม่มี

## การตรวจและส่งคืน

1. ทดสอบ viewport ทั้ง 11: 320×568, 360×640, 375×812, 390×844, 414×896, 430×932, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080
2. ตรวจ map เต็มจอจริง ไม่มี sidebar, HUD/touch targets ไม่ทับช่องเดิน, ทุกปุ่มมองเห็น, Thai marks ไม่ถูกตัด, modal/popover ไม่บังเป้าหมาย, page ไม่ scroll
3. เล่น flow จริง: title continue/new+confirm → เดินด้วย D-pad/แตะเพื่อนบ้าน → encounter/battle → กลับ map → camp heal/revive → boss → gate/complete รวมทั้ง reload/save, disabled actions และ reduced motion
4. รัน project checks ที่มีอยู่ เช่น typecheck/lint/unit tests/build/browser tests และเพิ่มเฉพาะ regression tests ที่จำเป็นสำหรับ behavior ที่เปลี่ยน ไม่ปรับกติกาเพื่อให้ tests ผ่าน
5. ส่ง PR พร้อมภาพ portrait/landscape/desktop, รายการ asset ที่รับ/เลื่อน, ผลทดสอบ, budget, สิ่งที่ยังต้องตรวจบน Safari/อุปกรณ์จริง และลิงก์ PR อย่า merge หรือเปลี่ยน deployment/workflows เพียงเพราะงานนี้

Codex ตรวจ static references ด้วย Chromium มาแล้ว 33 layout checks / 11 viewports, disclosure/context/target interactions ผ่าน และยืนยัน original art hashes เดิม แต่ผลนี้ไม่แทนการทดสอบเกมหลัง integration ของคุณ
