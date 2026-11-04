# ทางเข้าตัวละครจาก HUD ทีม

สถานะ: เสร็จและ merge แล้ว · [PR #146](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/146) · merge `1b0616be8a31bc324a7eb447d2034e74998110cc` · tested head `fa55f2235dea245354a8703c7bbfddd27d89bb6f` · merge tree ตรง tested head

เจ้าของอนุมัติให้ทำตามข้อเสนอ “ทีม → เลือกตัวละคร → สกิล” พร้อมจัดหน้าให้ใช้งานง่าย ฐาน `a2596e3140920dcda5512188fb073f8a6d15d6c9` บน `feature/fateweave-initial-prototype` สาขา `codex/team-hud-character-navigation` เป็น follow-up UXD-07 ไม่เริ่ม UXD-08/P04/P09

## วิเคราะห์และการปรับ

- การ์ดสมาชิกเดิมใช้เลือกย้ายทีม จึงแยกแถว “ตัวละคร” สำหรับแตะภาพเข้าอุปกรณ์/สกิล/พัฒนา และหัวข้อ “จัดทีมออกเดินทาง” สำหรับคำสั่งเดิม ไม่เพิ่มปุ่มสกิลใน HUD อีกปุ่ม
- เข้าครั้งแรกที่ภาพรวม กลับเข้าจากทีมจะจำคน/แท็บ/สกิล/ส่วนย่อย/ตำแหน่งเลื่อนภายใน session มี “ดูล่าสุด” บอกคนและแท็บ ไม่เพิ่ม navigation ลงเซฟ
- รายละเอียดในค่ายเป็น non-modal dialog เหนือ HUD จริง วัดขอบด้วย ResizeObserver และใช้ safe-area variables เดิม พื้นแผงทึบให้อ่านเหนือฉากค่ายชัด หน้าตัวละครบนแผนที่ยัง modal เดิม
- ล็อกค่าย/คำสั่งออกเดินทาง/เนื้อหาด้านหลังด้วย inert และซ่อนเลเยอร์ที่ไม่เกี่ยวข้อง เก็บ HUD ให้กดได้ มี active/aria-expanded เพียงทีมขณะดูตัวละคร ปิดกลับกระเป๋าแล้วคืนสถานะและ focus ต้นทาง
- Escape ย้อน review/preview ก่อนปิด กลับทีมคง filter/scroll/focus สลับ HUD แล้วทิ้ง review โดยไม่จ่ายเพิ่ม เก็บ scroll ก่อน review ครั้งเดียว ไม่ให้ close event บันทึกตำแหน่ง review ทับบริบทเดิม
- คงคำสั่งและ receipt จาก event/Profile หลัง persist ของ UXD-07 ไม่แก้ core/content/public/assets/save schema/ราคา/RNG/สมดุล/battle rules/workflows ไม่รวม Artwork/checkpoints ไม่แก้ workspace เดิม

## ผลตรวจ

| รายการ | ผล |
| --- | --- |
| Typecheck / lint / Pages production build | ผ่าน; มี chunk-size warning เดิม |
| Focused unit | 30 กรณี / 3 files: skill review, character metrics, agent context ผ่าน |
| Full PR quality | 1,518 กรณี / 107 files พร้อม lint/build ผ่านบน tested head |
| Full PR browser | production88/90/85/93 รวม356 distinct ครบ4shards/aggregate ผ่าน; source fixtures565 และ focus checks3 ผ่านแยกจาก production ไม่มี flaky/retry summaries |
| Local production browser | 60 distinct จากหลาย focused รอบ: ทางเข้า8 + ค่าย/อัปดาว/สกิล/ตัวละครแผนที่36 + portrait5 + world layout11 ไม่บวกกรณีซ้ำ |
| จอและ input | 390×650/844,320×568,desktop1366×768; portrait/world ถึง1920×1080,200% text+safe areaจำลอง,rotation/inert,44px controls และ hit-test HUD |
| เซฟและบริบท | preview/cancel/สลับ HUD ไม่เปลี่ยนเซฟ, จ่ายจริง/receipt/reload, stale/repeat confirm, storage failure, คืน filter/scroll/focus, จำแท็บต่อคน และคืนต้นทางกระเป๋า ผ่าน |

ชุดทางเข้า7รอบแรกผ่านด้วย timeout45s เดิม หลังเพิ่ม assertions คืน scroll ก่อน review ตรวจซ้ำผ่านด้วย local CLI120s อีก2กรณีที่เกี่ยวข้องกับ HUD active/กระเป๋าผ่าน (ซ้ำ1+ใหม่1) รวมชุดทางเข้า8 ไม่เพิ่มยอดจาก reruns รอบ local ที่ค้างก่อนเข้าเกม/จับภาพไม่นับเป็น pass; config/full CI คง45sเดิมและผ่านทั้งหมด

ปรับ assertions หน้าทีมที่เดิมคาดเต็มจอ ให้ตรวจกรอบเกม/เต็มความกว้าง/ไม่ทับ HUD/ปุ่ม44pxและ hit-test คงการตรวจแผนที่ dialog keyboard การจ้าง/ออกเดินทางและ no-page-scroll เดิม แก้ safe-top mapping8แทน59ด้วย variables ร่วม ไม่ลดเกณฑ์ safe area ข้อมูล fixture ของตัวกรองเพิ่มสมาชิกตามเงื่อนไขเปิดเดิม ไม่แก้กฎเกม

ดูผลใน [checks ของ PR](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/146/checks) งานจบที่ merge ตามกฎ pre-release; Pages deploy ต่ออัตโนมัติ ไม่รอผล deploy หรือเพิ่ม release-evidence commit

## ภาพจาก production build

เป็น DOM/canvas ใต้ Pages subpath ใช้ fixture แยกจากผู้เล่นจริง ไม่มี mockup ภาพ5ภาพเก็บและตรวจแล้ว จับภาพซ้ำด้วย `TEAM_HUD_SHOTS=1` ส่วน assertions และ screenshot-on-failure ของ repo ทำงานตามเดิม

| หน้า | 390×650 | 390×844 |
| --- | --- | --- |
| ทางเข้าตัวละครจากทีม | [ภาพ](images/team-entry-650.png) | [ภาพ](images/team-entry-844.png) |
| สกิลเหนือ HUD ที่กดได้ | [ภาพ](images/skills-hud-650.png) | [ภาพ](images/skills-hud-844.png) |

[Review ที่200% text และ safe areaจำลอง](images/review-hud-large-text.png)

## ข้อจำกัด

- Chromium desktop/touch emulation เท่านั้น ไม่มี Safari/iPhone/Android เครื่องจริง หรือผู้เล่นจริง ไม่ถือ automation เป็น human usability results
- Safe area ใช้ CSS variables จำลอง ไม่ใช่ผลจาก notch/แถบที่อยู่ของเครื่องจริง ภาพตรวจจาก local production preview ไม่อ้างว่าเปิดตรวจ URL Pages สดหรือยืนยัน deploy
- ข้อเสนอ audit อื่นเรื่องจัดทีมเชิงลึก/แผนที่ทับภาพ/คนรอบค่าย/กระเป๋ายังเปิดอยู่ งานนี้ทำทางเข้าตัวละครจาก HUD ไม่เริ่ม UXD-08/P04/P09 อัตโนมัติ
