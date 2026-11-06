# ชุดทีม (preset) และหน้าจัดทีม — 2026-11-06

เจ้าของสั่ง 2026-11-06: (1) ตั้ง preset ทีมแล้วกดปุ่มเดียวเพื่อสลับทั้งทีม (2) หน้าจัดทีมใช้ง่ายขึ้น โดยด้านบนเป็นทีม + สำรอง ด้านล่างเป็นตัวละครทั้งหมด
ตัวเลข (4 ช่อง, ชื่อ 12 ตัว) เป็นร่างที่ตรวจด้วยเทสต์ ไม่ใช่ค่าสุดท้าย

## A) Research เกมที่มีทีมหลายตัว (ค้นเว็บ 2026-11-06)

| เกม | จำนวน preset | สลับด่วน / โครงหน้า | สิ่งที่นำมาใช้ |
|---|---|---|---|
| Honkai: Star Rail | 5 → 10 ช่อง (3.4, ตั้งชื่อได้ เช่น "MoC") ตามบทความแฟน ยังไม่เจอประกาศทางการ | ทีมบนสุด, Quick Setup | ตั้งชื่อชุดตามเนื้อหา, ชุดที่ใช้อยู่ไฮไลต์ |
| Genshin Impact | ราว 4 ชุด × 4 คน (แหล่งไม่แน่นอน) | Party Setup สลับนอกการต่อสู้ | จำนวนน้อยพอให้อยู่แถวเดียวบนมือถือ |
| Fire Emblem Heroes | 5 → 8 → 15 ทีม (เพิ่มตามอัปเดต) | ทีมละ 4 | เริ่มน้อย เพิ่มทีหลังได้โดยไม่เปลี่ยนรูปเซฟ |
| Raid: Shadow Legends | 10 ต่อกลุ่ม (ภายหลัง PvP 15) | Saved Teams ใช้ได้หลายโหมด | ชุดเดียวใช้ได้ทุกที่ (ค่าย + แผนที่) |
| Summoners War | 3–25 ตามโหมด (Deck Preset 2026) | Save แล้วโหลดจากหน้าเตรียมศึก | ปุ่มบันทึก/โหลดชัดเจนในหน้าเดียว |
| AFK Arena | บันทึกหลาย formation (1.27) | — | เก็บตำแหน่ง/แถวไปกับชุด |
| Pokémon Scarlet/Violet | Party 6 + กล่อง 30/กล่อง, Battle Teams แยก | ปาร์ตี้ข้างบน/กล่องล่าง ลากวาง, ค้นหาในกล่อง | โครง "ทีมบน คลังล่าง" + ค้นหา/กรองในคลัง |
| Octopath CotC | ไม่พบข้อมูล preset; แถวหน้า 4 + หลัง 4 สลับได้ | — | ไม่มีอะไรเพิ่มจากที่เกมนี้มีแล้ว (สำรอง) |

ไม่พบข้อมูลยืนยันเรื่องการเตือนตัวหายใน preset ของเกมเหล่านี้ เกมนี้จึงออกแบบเอง: บอกชื่อคนที่ไม่ได้พามา/ล้ม/เหนื่อยบนปุ่มและ aria-label

แหล่ง: [HSR 3.4 QoL (dtgre)](https://www.dtgre.com/2025/07/hsr-3-4-qol-updates-guide-skip-dialogue-relics-teams.html), [Genshin party setup (Shacknews)](https://shacknews.com/article/120929/how-to-change-the-party-setup-genshin-impact), [FEH teams 10→15 (Siliconera)](https://www.siliconera.com/?p=723112), [FEH 5→8 (Heavy)](https://heavy.com/games/2017/06/fire-emblem-heroes-update-tempest-trials-arena-options-teams-quest-rewards/amp/{{url}}), [Raid 4.30 saved teams (HellHades)](https://hellhades.com/raid-shadow-legends-patch-notes-4-30/), [Raid saved teams guide (Plarium)](https://forum.plarium.com/raid-shadow-legends/673_guides-and-tutorials/594642_saved-teams---skill-instructions), [Summoners War Deck Preset (Inven Global)](https://www.invenglobal.com/articles/21467/com2us-launches-deck-preset-update-to-celebrate-12th-anniversary-of-summoners-war), [AFK Arena 1.27 (APKMirror)](https://apkmirror.com/apk/lilith-games/afk-arena/afk-arena-1-27-01-release), [Pokémon SV boxes (Dot Esports)](https://dotesports.com/pokemon/news/how-to-access-your-pc-boxes-in-pokemon-scarlet-and-violet), [SV 1.2.0 (Dexerto)](https://www.dexerto.com/pokemon/pokemon-scarlet-violet-1-2-0-patch-notes-box-features-bug-fixes-performance-issue-2064603/)

## B) การออกแบบ (ทางเลือกที่เลือก = คำแนะนำ)

- ทางเลือก: (ก) เก็บ preset ใน localStorage แยก ไม่ bump เซฟ — หายเมื่อย้ายเครื่อง/ล้างข้อมูล ไม่เลือก; (ข) เก็บใน `Profile.presets` + เซฟ v56 — **เลือก**; (ค) เก็บใน run ด้วย — ไม่จำเป็น เพราะ profile อยู่ในเซฟเดียวกันตลอด
- 4 ช่อง (ร่าง): พอดีแถวเดียวที่ 320px ปุ่มสูง 52px; เพิ่มทีหลังได้โดยแก้ `PRESET_SLOTS` และ validator ยอมรับความยาวมากขึ้น
- ชุด = ชื่อ (≤12 ตัวอักษรที่เห็น) + ลงสนามตามลำดับช่อง + สำรอง + แนวของแต่ละคน (`formation()` ตอนบันทึก)
- ค่าย: แตะชุดที่มี = ใช้ทั้งทีมทันที; แตะช่องว่าง = บันทึกทีมตอนนี้; "จัดการชุด" = บันทึกทับ/เปลี่ยนชื่อ/ล้าง (ล้างต้องกดยืนยัน) สำรองที่เกินช่องที่ปลดตามบท (3→4→5) รออยู่ในค่ายและบอกชื่อ; คนในคลังสมาชิกที่ถูกเรียกออกจากคลังอัตโนมัติ; เลิกจ้างแล้วถูกถอดจากทุกชุด
- แผนที่ (กระเป๋า/แคมป์ แท็บทีม): ใช้ชุดได้นอกการต่อสู้เท่านั้น เฉพาะคนที่พามา ไม่มีใครเข้า/ออกจากการเดินทาง; คนที่พามาแต่ไม่อยู่ในชุดยังมีที่ (สำรองก่อน ถ้าเต็มลงสนาม); ปุ่มบอก "ขาด n / ล้ม n / เหนื่อย n" บันทึก/แก้ชุดทำที่ค่าย
- กฎเดิมไม่เปลี่ยน: แนวละ ≤3 (`formation()`), fatigue ยังเปลี่ยนเฉพาะตอนศึกจบตามคนที่ลงสนามจริง, ศึกที่กำลังสู้แตะไม่ได้ (`canManage`), `ActiveBattle.entry/lanes` ล็อกตอนเริ่มศึกเหมือนเดิม
- เซฟ v56: เพิ่ม `presets` ที่ profile เท่านั้น; เซฟเก่าไม่มีชุด; ตรวจ id ซ้ำ/ไม่ได้เป็นเจ้าของ/ชื่อยาว/แนวของคนนอกชุด/ช่องเกิน → ปฏิเสธ
- หน้าจัดทีมค่าย: ชุดทีม → ลงสนาม → สำรอง → (แผงสมาชิกที่เลือก) → แผนการยืน → ตัวละครในค่าย (ค้นหา/กรองเดิม) → เลเวลค่าย + แถบตัวละคร (ย้ายลงล่าง); แผงสมาชิกมีปุ่มแตะเดียว "ใส่ลงสนาม · ช่อง n / ใส่สำรอง / พักในค่าย"; การแตะเลือกแล้วแตะอีกกลุ่มเพื่อสลับยังทำได้เหมือนเดิม กระเป๋าแผนที่ย้ายสำรองขึ้นมาก่อนแผนการยืน

## C) ทดสอบ

- `tests/team-presets.test.ts` (9): บันทึก/ใช้/ชื่อ/ล้าง, สำรองตามบท, คลังสมาชิก, เลิกจ้าง, แผนที่ (เฉพาะคนที่พามา, ไม่มีใครหาย, ห้ามระหว่างศึก, fatigue/HP คงเดิม), ศึกหลังใช้ชุด replay เท่ากับจัดมือ, เซฟ v56 round-trip + ปฏิเสธเซฟปลอม
- ภาพก่อน/หลังที่ 390×844, 390×650, 320×568: `tests/browser/team-presets-shots.spec.ts` (`TEAM_SHOTS=<dir> TEAM_SHOTS_PRESETS=1`) — ไฟล์ในโฟลเดอร์นี้เป็น 390×844
- ไม่ได้ทดสอบบน Safari/iPhone/Android จริง
