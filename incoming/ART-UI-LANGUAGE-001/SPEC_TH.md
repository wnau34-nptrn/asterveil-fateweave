# ART-UI-LANGUAGE-001 · สเปกภาษาภาพร่วม

ออกแบบอ้างอิง DOM/CSS เท่านั้น · ฐาน `dd99b38d` (รวม #166 #167 #168 #170) · 5 พฤศจิกายน 2026
การเลือก Q1–Q4 เป็นของเจ้าของ ผล verify ไม่ใช่การอนุมัติภาพ ไม่มีการนำเข้าเกมในชุดนี้

## ทิศทางและแหล่งข้อมูล

Luminous Veil: navy ทึบอ่านง่าย ภาพเดิมเป็นบริบทของเกม ทองระบุการกระทำหลัก/การจ่าย ฟ้าระบุการเลือกและโฟกัส
ใช้ `src/ui/tokens.css` เป็นแหล่งสี ฟอนต์ ระยะ รัศมี และเงา; `tokens-proposal.css` เพิ่มชื่อสำหรับ geometry ที่ขาดโดยไม่เปลี่ยน token เดิม
ภาพ/ตัวอักษรนำมาจากเกมนี้เท่านั้น ไม่มี image generation หรือ artwork ใหม่

อ่าน brief ทั้งฉบับ, README_TH หลักฐาน, surfaces.json, CLAUDE.md, AGENTS.md, UI_INPUT_RULES.md, ANIMATION_PROMPT_QUALITY_TH.md,
CSS/DOM ของ lobby, forge-workbench, character/skills/star, world, summary, rewards, battle และทิศทาง ART-UI-MODERN-001 / ART-UI-WORLD-001
รวมทั้งรายงาน UX 4 พ.ย. บน `origin/codex/ux-ui-audit-2026-11-04` โดยไม่ merge สาขานั้น
ข้อ #8–10 และสิ่งที่ควรรักษานำมาใช้กับสเกลอักษร ชื่อทรัพยากร และโครงร่วม

## โครงมาตรฐานและจุดยึด

วัดจากขอบ `#app` เป็น CSS px ไม่ใช่พิกเซลของ PNG; PNG = DPR 2

| โครง | จุดยึด / พื้นที่ | การเลื่อนและการกระทำ |
|---|---|---|
| แผ่นบริการเต็มจอ | `--ui-max` 480; `--ui-head` 96; หัวเริ่ม x16 หรือ x68 เมื่อมีย้อนกลับ | `.scroll` เลื่อนภายใน; ไม่มีกรอบซ้าย/ขวา; R1 ไม่มี nav เหนือแผ่น |
| review/ยืนยัน | หัวเหมือนแผ่นบริการ; ledger อยู่ในเนื้อหา ไม่ขยาย dock | dock สูง80; ปุ่มหลัก h48, y=H−64, ขอบล่าง16; กลับไปแก้ไขเป็นรอง |
| ไดอะล็อกแผนที่/ต่อสู้ | ใช้หัวและจุดยึดเดียวกัน; `.dialog` ใช้ `--panel-bg` เหนือฉาก | เลื่อนเนื้อหาแยก; Escape/คืน focus เป็นสัญญาสำหรับ integration ไม่ใช่เพิ่มขั้นยืนยัน |

ปิด: x=W−56, y12, 44×44 วงกลม; ย้อนกลับ: x12, y12, 44×44 วงกลม
หัวชิดซ้าย x16 (ไม่มี back) หรือ x68 (มี back), y16; ช่องท้ายเว้น68 ป้องกันทับปิด
หัวคง96 เพื่อรองรับ “ตรวจรายการสร้างอาวุธ” สองบรรทัดที่320px พร้อมคำรอง
แท็บอยู่ใต้หัวอย่างเดียว: หน้าต่างตัวละคร/ป้ายจ้าง/กระเป๋าใช้ grammar เดียวกัน
ทุกหน้ากว้าง320px ใช้ gutter16; พื้นที่เนื้อหา288px; ledger มีพื้นที่ชื่อ28% และคอลัมน์ตัวเลข4ช่อง
ความสูง/ตำแหน่ง dock คงที่ในแต่ละ viewport; หน้าที่เป็นการกระทำในการ์ด (เช่นปรุงยา/เควสต์) ไม่มี dock เปล่า

## component 1–8 และสถานะ

| # | โครงและ token | สถานะ / สัญญา |
|---|---|---|
| 1 หัว + แท็บ | `.window-head`, `.title-block`, `.close`, `.back`, `.tabs`; `--ui-head`, `--ui-title`, `--touch-min`, `--space-3/4`, `--radius-pill` | หัวคงที่; ข้อความไทยห่อบรรทัดได้; active tab มีข้อความและ cyan; ปิด/ย้อนกลับคืน focus ในเกมจริง |
| 2 การ์ดรายการ | `.card`: art56 + copy; แถวราคา/การกระทำด้านล่าง; `--space-3`, `--radius-md`, `--navy-800`; `.dense` ใช้ `--space-2` | ปกติ/เลือก/cyan + ข้อความ; หนึ่ง action; งานรองอยู่ “เพิ่มเติม”; รูปไม่เปลี่ยนตาม rarity |
| 3 ปุ่มหลัก/รอง/อันตราย | primary h48, `--radius-sm`, `--primary-fill`, `--font-heading`, `--type-body`, `--button-shadow`; รอง `--secondary-fill`; อันตราย `--danger-panel` + `--danger-coral` | ปกติ/กด/โฟกัส/ปิดใช้พร้อมเหตุผล/กำลังทำ/สำเร็จ; ปิดใช้ด้วย disabled จริง ไม่มีลด opacity จนอ่านไม่ได้; หนึ่ง primary ที่เปิดใช้ในช่วงที่เห็น |
| 4 ราคา / ledger | `.price`, `.ledger`; หน่วย/มี/ใช้/ได้รับ/หลังทำ; `--type-caption`, tabular-nums; สีเดิมจาก token | แยกยอดก่อนจ่าย/receipt; star เติมคอลัมน์ได้รับ0เพราะไม่มีรับทรัพยากร ไม่ใช่เพิ่มรางวัล; ค่าอื่นตรง DOM |
| 5 ป้าย | `.badge.count` pill + เลข; `.notice` มุม6 + ✓/ข้อความ; `.locked` มุม6 + เหตุผล | จำนวนไม่ใช้แทนแจ้งเตือน; สีมีข้อความ/รูปทรงคู่เสมอ; ขาด/เต็มไม่ซ่อนเหตุผล |
| 6 แถบพับ | `details.fold > summary + .stack`; `--touch-min`, `--space-3`, `--radius-sm`, `--navy-900` | ข่าว NPC/จัดการคลัง/ตัวกรอง/คำอธิบายยาว; คีย์บอร์ดเปิดได้; ไม่มีขั้นจ่ายใหม่ |
| 7 แผ่นข้อมูลทึบ | `.info-panel`, `.hud-label`, `.receipt`; `--navy-900/950`, `--hud-shadow`, `--text/text-muted` | แผ่นเล็กอยู่หลังข้อความบนภาพ; HUD เก็บ anchor เดิมจาก geometry.json; success มีข้อความบันทึกผล ไม่แต่งยอด |
| 8 ตัวอักษร | หัว20 Kanit600; ป้าย16; เนื้อหา14 Noto; รอง/ตาราง/HUD12; line-height1.45 (หัว1.2) | R1 ขั้นต่ำ12ทั้ง DOM; R2 Q4 เฉพาะป้ายตัวเลขล้วน11; ชื่อ/ข้อความกติกาไม่ลด |

`components.html` แสดงทั้ง6สถานะ รวม disabled พร้อมเหตุผล, busy, receipt; ต้นแบบเป็น static gallery ไม่จำลองการจ่ายหรือเขียนเซฟ
ภาพอุปกรณ์/ยา/ตัวละครตัดจาก atlas เดิมด้วย CSS เท่านั้น; `art-tokens.css` เก็บตำแหน่ง crop ที่อ่านจาก markup ไม่ใช่ semantic token ใหม่
ฟอนต์อ้างไฟล์เดิม `public/assets/fonts` โดยตรง ไม่คัดลอกฟอนต์
motion ใช้ `--sheet-ms`180ms ease เมื่อ integration เปิดแผ่น; แกลเลอรีคงนิ่ง ไม่มีแอนิเมชันใหม่
reduced-motion ไม่มีการเคลื่อนไหว; focus outline3px offset3px ใช้ `--focus`

## R1/R2 ที่เจ้าของเลือก

R1: แผ่นเต็มจอ/ซ่อน nav, หัวชิดซ้าย, ทองเฉพาะ review ledger/ปุ่มหลัก, DOMขั้นต่ำ12
R2 `-r2-all`: ทุกข้อพร้อมกัน; `-r2-q1…q4`: แยกทีละคำถามเพื่อดูสาเหตุของความต่าง
ปรุงยาและ review สร้างอาวุธมี R2 ที่390×844และ320×568ครบ
Q1 ลดพื้นที่แผ่นลง72pxเพื่อคง nav; จุดยึดหัวเดิม แต่ dock ยกขึ้น72pxตามขอบแผ่น เป็นความต่างที่ตั้งใจจาก R1
Q2 เปลี่ยนเฉพาะ alignment หัว; Q3 ไม่มีเส้นทองที่ ledger/หัวตาราง แต่คงปุ่มทอง
Q4 ไม่มีป้าย HUD บนปรุงยา/review จึงหน้าตาเท่าR1เมื่อแยกข้อนี้ — ห้ามสร้างป้ายตัวเลขแปลกปลอมขึ้นมาให้ต่าง
มี `f-map-hud-r2-q4` และ `h-battle-hud-r2-q4` เพิ่มเพื่อให้เห็นผล11/12จริงที่ทั้ง3ขนาด

## ข้อมูลจริงและสิ่งที่คงไว้

- ปรุงยา: ยาฟื้นแผลแร่6/ผง2; ฟื้นหมู่10/4; ไล่อสูร8/3; ฟื้นความเหนื่อย8/2; ขวด3/2/1/1 ตาม fixture audit
- review สร้างอาวุธ: ดาบอัศวินดี Lv3 คุณภาพ100%; แร่640−30=610; ฝุ่น120−6=114; คลัง6/90; รับ1ชิ้น ไม่สวมอัตโนมัติ **ผลรับประกัน ไม่สุ่ม**
- ไม่เพิ่มผลสุ่มในงาน craft ที่ไม่มี RNG; งานสุ่มคุณสมบัติในเกมจริงต้องแยกผลสุ่มและห้ามใช้ผล preview เป็นผลบันทึก
- อัปดาว: ตัวซ้ำ4−3=1; ตรา3−0=3; แร่640−70=570; เลือด109→115; attack14→15; SPD80→80; ข้อความใช้ตัวซ้ำของคนนี้คงอยู่
- หน้าสร้างพร้อมทำจากภาพก่อนเป็นLv1 ส่วน review เป็นLv3ตาม audit แต่ละหน้าเป็นตัวอย่างอิสระ ไม่ใช่การจำลอง flow ที่เปลี่ยนยอดเอง
- ถอนตัวมีสถานะก่อนยืนยัน/ยืนยันเดิมสองสถานะ ไม่เพิ่มขั้น; สรุปเดินทางและทีมล้มมีปุ่มกลับค่ายติดล่าง
- เควสต์คงการ์ดและปุ่มรับในการ์ด; หน้าค่ายเป็นบริบทภาพเดิมและ nav เดิม6ตำแหน่ง ไม่ออกแบบฉาก/NPC ใหม่
- HUD map/battle ใช้ภาพฉากจากเกมโดยเอาตัวอักษรออกก่อน แล้วซ้อนข้อความ DOM + hit target ที่ anchor เดิม; ไม่ใช้ PNG เหล่านี้เป็น UI runtime
- draft ไม่มีปิดตาม `world-ui.ts` (mandatory choice); แสดงโครง first pick จาก poolจริง lio/brann/sefa/toma ไม่แต่งราคา/HP/SPD
- event/draft/ทีมล้มไม่มีภาพก่อนใน audit; ช่องbeforeระบุชัดว่าไม่มีภาพก่อน ใช้โครง/ข้อความจาก world-ui.ts/th.ts/summary-ui.ts
- ภาพก่อนDPR2จับใหม่จากฐานที่ merge ครบ ไม่ใช่นำภาพDPR1มาขยาย

## การตรวจและขอบเขตผล

`render.cjs` export ทุกหน้าและภาพbefore-after ป้ายชื่ออยู่นอกกรอบเกม; `verify.cjs` ตรวจเกณฑ์1–10จาก DOM/computed style แบบ topmost,
พื้นที่แตะ/โฟกัสจริง, statesเลื่อนบน/กลาง/ล่างและแถบพับเปิด, literal CSS, style families, ภาพ/ฟอนต์โหลด และ preservation manifest
contrast ใช้ภาพ Chromium ที่ซ่อนตัวอักษรแล้ว sample พื้นจริงใต้แต่ละบรรทัดผ่าน Pillow 3จุด/บรรทัด ไม่ใช่ประเมินด้วยตา
ตรวจเฉพาะจุดตัวอย่างที่ระบุในverification.json; ผลไม่ครอบคลุมทุกpixelบนทุกฉากของเกมจริง
R1 ใช้เกณฑ์10ข้อเต็ม; R2 รายงานgeometry/style/contrastแยกพร้อมความต่างที่ตั้งใจ ไม่เอาQ1/Q4มาปนเกณฑ์R1
ผลตรวจเทคนิคไม่ใช่การทดสอบผู้เล่น ไม่มีSafari/iPhone/Androidจริง ไม่มีการรับรองscreen readerหรือtext zoom200%

## ตารางนำเข้าครบ55ผิวหน้า

selector มาจาก audit computed DOM; ไฟล์ CSS ระบุจากการค้น selector จริงในฐาน เพื่อให้ผู้ integrate ตรวจจุดที่จะย้ายมาใช้ component ร่วม
A/B/HUD ตั้งใจคงโครง ไม่บังคับเป็นหน้าต่างบริการ; ตารางนี้เป็นแผนนำเข้า ไม่ใช่การแก้ไฟล์เหล่านั้นใน PR นี้

| ผิวหน้าเดิม | กลุ่ม audit | selector เดิมที่จะย้าย/รักษา | ไฟล์ CSS ปัจจุบัน | component ใหม่ / ข้อยกเว้น |
|---|---|---|---|---|
| 01-title | title/story | `#app`; `button#new-game.primary`, `h1.title-logo` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม |
| 02-new-game | title/story | `#app`; `button.round-glass`, `button#commander-create.primary`, `h1` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม |
| 03-story | title/story | `#app`; `button#story-next.primary` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม |
| 04-story-next | title/story | `#app`; `button#story-next.primary` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม |
| 10-title-continue | title/story | `#app`; `button#continue.primary`, `h1.title-logo` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม |
| 11-camp | camp home | `#app`; `button#lobby-music.round-glass`, `button.round-glass`, `button#lobby-depart.primary` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | B คงฉาก/NPC/nav; แผ่นข้อมูลทึบ + ป้ายจำนวน/ชื่อทรัพยากร |
| 12-camp-bank-legend | camp home | `#app`; `button#lobby-music.round-glass`, `button.round-glass`, `button#lobby-depart.primary` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | B คงฉาก/NPC/nav; แผ่นข้อมูลทึบ + ป้ายจำนวน/ชื่อทรัพยากร |
| 13-team | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 14-team-member-picked | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 15-team-member-scrolled | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#lobby-upgrade.primary`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 16-character-overview | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 16-character-gear | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 16-character-skills | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 16-character-develop | character window | `.character-dialog`; `button.quiet`, `button#camp-character-star-open.primary`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 17-character-skills-tree | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 17b-character-tome-trade | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 18-star-page | character window | `.character-dialog`; `button.quiet`, `button#camp-star-review.primary`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 18b-star-review | character window | `.character-dialog`; `button.quiet`, `button#camp-star-confirm.primary`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 20-hire-board | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 21-hire-preview | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#hire-0.primary.hire-preview-hire`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 22-market | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 23-bag | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#lobby-sub-back.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 24-bag-storage-open | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#lobby-sub-back.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 25-farm-plan | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 26-brew | camp service sheet | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 27-forge-tasks | forge | `.lobby-sheet`; `button.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-enhance | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-level | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-fuse | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-reroll | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-transfer | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-craft | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `button#forge-craft.primary` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-recycle | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 28-forge-smelt | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `button#forge-smelt.primary` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 29-forge-craft-review | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `button#forge-confirm.primary` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 30-forge-enhance-picked | forge | `.lobby-sheet`; `button.round-glass`, `button#forge-open-tasks.round-glass`, `button#forge-enhance.primary` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม |
| 31-maps | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#map-go-veil-frontier.primary`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 32-quest-board | camp service sheet | `.lobby-sheet`; `button.round-glass`, `button#quest-claim-broker-proven.primary`, `h2#lobby-sheet-title` | `src/ui/portrait.css`, `src/ui/team-navigation.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ |
| 33-npc-trainer-tree | character window | `.character-dialog`; `button.quiet`, `h2#camp-character-title` | `src/ui/skills.css`, `src/ui/star-upgrade.css`, `src/ui/team-navigation.css`, `src/ui/portrait.css` | D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger |
| 40-map-hud | map | `#app`;  | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | F HUD คงจุดยึด; เปลี่ยนเฉพาะอักษร/ป้าย |
| 41-map-goals | map | `.world-dialog`; `button.quiet`, `h2#world-goals-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 42-map-pack | map | `.world-dialog`; `button.quiet`, `h2#pack-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 43-map-pack-tab2 | map | `.world-dialog`; `button.quiet`, `h2#pack-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 44-map-info | map | `.world-dialog`; `button.quiet`, `h2#world-info-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 45-map-camp | map | `.world-dialog`; `button.quiet`, `h2#camp-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 46-map-withdraw-confirm | map | `.world-dialog`; `button.quiet`, `h2#camp-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/game-feel.css` | F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว |
| 47-run-summary | run summary | `.summary-view`; `button#summary-done.primary`, `h2#summary-title` | `src/ui/portrait.css`, `src/ui/components.css`, `src/ui/game-feel.css` | G หัว + แผ่นผลลัพธ์ + dock กลับค่าย/ไปต่อ |
| 48-summary-scrolled | run summary | `.summary-view`; `button#summary-done.primary`, `h2#summary-title` | `src/ui/portrait.css`, `src/ui/components.css`, `src/ui/game-feel.css` | G หัว + แผ่นผลลัพธ์ + dock กลับค่าย/ไปต่อ |
| 49-camp-after-run | camp home | `#app`; `button#lobby-music.round-glass`, `button.round-glass`, `button#lobby-depart.primary` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css` | B คงฉาก/NPC/nav; แผ่นข้อมูลทึบ + ป้ายจำนวน/ชื่อทรัพยากร |
| 50-battle | battle | `#app`; `h2` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | H HUD คงจุดยึด; เปลี่ยนเฉพาะอักษร/ป้าย |
| 51-battle-skill-help | battle | `#app`; `button.quiet`, `h2` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | H ไดอะล็อก/คำอธิบาย + หัว + แถบพับ |
| 52-battle-target | battle | `#app`; `h2` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | H HUD คงจุดยึด; เปลี่ยนเฉพาะอักษร/ป้าย |
| 53-battle-menu | battle | `#app`; `button.quiet`, `h2#info-title` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | H ไดอะล็อก/คำอธิบาย + หัว + แถบพับ |
| 54-battle-victory | battle | `#app`; `button#leave-battle.primary`, `h2` | `src/ui/portrait.css`, `src/ui/styles.css`, `src/ui/components.css`, `src/ui/game-feel.css` | G หัว + แผ่นผลลัพธ์ + dock กลับค่าย/ไปต่อ |
| 55-battle-rewards | battle | `.battle-rewards`; `button.primary`, `h2#rewards-title` | `src/ui/styles.css`, `src/ui/world.css`, `src/ui/components.css`, `src/ui/forge-enhancement.css` | G หัว + แผ่นผลลัพธ์ + dock กลับค่าย/ไปต่อ |

## ลำดับนำเข้าที่เสนอ (Claude หลังเจ้าของเลือก)

1. บันทึกคำเลือก Q1–Q4 ของเจ้าของเอง; เพิ่ม token geometry โดยไม่เปลี่ยน token เดิม แล้วทำหัว/ปุ่ม/สเกลอักษร
2. C บริการ: ปรุงยา → จ้าง/ตลาด → คลัง/ทีม/เควสต์; รักษา actual state/action และชื่อทรัพยากร
3. E งานช่าง: การ์ดงาน → พร้อมทำ → review/ledger → receipt; รักษา stale/repeat guard และส่วนสุ่ม
4. D ตัวละคร: หัว/แท็บ → ภาพรวม/สกิล → star review/receipt; ไม่ใช้สมาชิกอื่นเป็นวัตถุดิบ
5. F/G/H ไดอะล็อก สรุป รางวัล และสเกล HUD; คงตำแหน่ง HUD/ฉาก/คำสั่ง/ขั้นถอนตัว
6. PR แยกต่อกลุ่ม รัน audit ก่อน/หลังบนทั้ง3ขนาดและ gameplay browser checks; เจ้าของตรวจ390pxก่อนขยาย

ไม่ merge สาขา art ทั้งก้อนเข้าเกม; ย้าย DOM/CSS ตามจริง ไม่ใช้ PNG เป็นแผง
งานนี้ไม่แก้ src/tests/public/.github หรือ docs เดิม; บันทึกส่งต่ออยู่ใน NOTES.md แทนเพราะขอบเขตเฉพาะincomingจากคำสั่งผู้ใช้มีลำดับเหนือกว่ากฎบันทึกทั่วไป
