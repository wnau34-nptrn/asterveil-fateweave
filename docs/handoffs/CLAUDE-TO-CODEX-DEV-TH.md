# ส่งต่องานพัฒนาให้ Codex ระหว่างรอ Usage ของ Claude (2026-10-23)

Claude ใช้ Usage รายสัปดาห์เกือบหมด (รีเซ็ต พ. 28 ต.ค. 19:00) ระหว่างนี้ให้ Codex พัฒนาต่อตามลำดับในไฟล์นี้ เมื่อ Claude กลับมาจะตรวจ PR ของ Codex ก่อน แล้วค่อยทำงานที่ต้องตัดสินกฎ/สมดุล

## สถานะตอนส่งต่อ (ไม่มีงานค้างฝั่ง Claude)

- สาขาเกม `feature/fateweave-initial-prototype` ที่ `ff29e98` · CI ผ่าน · GitHub Pages เผยแพร่แล้ว · เซฟ v39
- เสร็จวันนี้: ผู้ร่วมทางทีละคน + รับสมัครทหารรับจ้าง 2 ตัวหลัง prologue (เซฟ v38) · ต้นไม้ใหญ่ครบ 10 อาชีพ (เซฟ v39) — สรุปใน `docs/handoffs/NEW-CHAT-HANDOFF-TH.md` และ `docs/handoffs/CODEX-TO-CLAUDE.md`

## กติกาสำหรับ Codex (ทุกงาน)

- อ่าน `AGENTS.md` → `CLAUDE.md` ก่อน (มีสิทธิ์ทำงานจนจบโดยไม่ต้องขออนุมัติซ้ำ)
- สร้างสาขา `codex/<ชื่องาน>` จากสาขาเกม เปิด PR เข้าสาขาเกม ให้ CI ผ่านก่อน merge ทีละงาน
- ตรวจก่อน push: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` + เทสต์เบราว์เซอร์ที่เกี่ยวข้อง (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chromium> npx playwright test <ไฟล์>`)
- **ห้าม** เปลี่ยนกฎการต่อสู้ (`src/core/battle`), รูปแบบเซฟ (`src/core/save`), ตัวเลขสมดุลหรือแผนที่ในงานชุดนี้ ถ้างานจำเป็นต้องแตะ ให้หยุดแล้วจดไว้ในข้อ "ฝากถึง Claude" ท้ายไฟล์นี้
- ภาพหน้าจอให้เจ้าของ: 390px เท่านั้น 1–2 ภาพต่อหน้าจอ · เอฟเฟกต์ต้องส่งคลิปให้เจ้าของดูก่อนขยาย
- จบแต่ละงาน: เพิ่มบันทึกสั้นๆ ที่ต้น `docs/handoffs/CODEX-TO-CLAUDE.md` และขีดฆ่างานในไฟล์นี้

## ลำดับงานของ Codex

| ลำดับ | งาน | ชนิด | ขึ้นกับ |
|---|---|---|---|
| ~~C1~~ | ~~ไอคอนวาด 27 สกิลต้นไม้ใหญ่ + ใส่เข้า atlas~~ **ส่งแล้ว 2026-10-23, PR #60 รอรีวิว** | ภาพ + ต่อเข้าเกม | — |
| ~~C2~~ | ~~แจ้งเตือน "ทีมยังไม่มีผู้รักษา"~~ **ยกเลิก** (เจ้าของ 2026-10-23: ให้ผู้เล่นเรียนรู้การจัดทีมเองบนแผนที่ ห้ามเพิ่มแถบเตือนนี้) | — | — |
| ~~C3~~ | ~~เอฟเฟกต์ Execute / Ward~~ **เสร็จแล้ว เจ้าของให้ผ่าน 2026-10-23** (`src/game/visuals/exec-ward-fx.ts`) | — | — |
| ~~C4~~ | ~~งานภาพที่เหลือในคิว~~ **ส่งครบแล้ว (ตรวจ 2026-10-23)** | — | — |
| C5 | เอฟเฟกต์ภาพวาดของสกิลที่เหลือทั้งหมด ทำเป็น 8 ตระกูล ทีละตระกูล (ภาพ + ต่อเข้าเกม + คลิปให้เจ้าของ) | VFX | ทันที ทำตระกูลละ 1 PR ห้ามข้ามไปตระกูลถัดไปก่อนเจ้าของให้ผ่าน |

ไม่ใช่งานของ Codex (รอ Claude): การตัดระบบต้นไม้เล็กที่ไม่มีอาชีพใช้แล้วออกจาก `src/core/world/talents.ts`

### C1 — ส่งแล้ว: PR #60 รอรีวิว (2026-10-23)

```text
TASK C1 — Asterveil · Fateweave: painted icons for the 27 big-tree skills, delivered into the game
Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype, work branch codex/skill-icons-003, PR into the base branch.
1. Make the art exactly as specified in docs/handoffs/CODEX-ART-QUEUE-TH.md section 23 (ART-SKILL-ICON-003): 27 icons, same style/scale/palettes as public/assets/ui/skill_icons.webp. Keep sources under incoming/ART-SKILL-ICON-003/ (png/, preview.png, NOTES.md).
2. Put them in the game: rebuild public/assets/ui/skill_icons.webp as one atlas (256 px cells, 6 columns, row-major) holding the 34 current icons in their current order followed by the 27 new ones in the section-23 order, and update src/game/visuals/skill_icons.json (order, cols, rows) to match. src/ui/icons.ts reads the order, so every listed skill switches from its line icon to the painted one automatically; the line-icon aliases in icons.ts stay as the fallback.
3. Check: npm run typecheck, lint, npx vitest run, build; open the camp character sheet "สกิล" and "ความถนัด" tabs for Toma, Sefa, Brann, Lio, Lyra and Eira and the battle dock with a tree skill equipped; send the owner two 390px screenshots (tree page, battle dock). Keep the atlas file size reasonable (WebP quality ~85).
```

### ~~C2~~ — ยกเลิก (เจ้าของ 2026-10-23)

เจ้าของตัดสิน: แมพ 2 ปล่อยไว้ตามเดิม และไม่ต้องมีแถบเตือน ให้ผู้เล่นเจอเองบนแผนที่เพื่อเรียนรู้การจัดทีม

### ~~C3~~ — เสร็จแล้ว (เจ้าของให้ผ่าน 2026-10-23)

เอฟเฟกต์ Execute / Ward อยู่ในเกมแล้ว (`src/game/visuals/exec-ward-fx.ts`) ไม่ต้องทำซ้ำ

### ~~C4~~ — ส่งครบแล้ว (Claude ตรวจ 2026-10-23)

- อยู่ในเกมแล้ว: 14 ฉากหลังศึก (`battle_forest.webp`), 16 tile ป่า, 20 แผนที่บท 1 (`region_ch1.webp`), 22 ค้อนตีบวก (`forge_strike_fx.webp`)
- ส่งแล้ว รออยู่ในสาขาภาพจนกว่าระบบของรุ่นนั้นจะมา (ไม่ต้องทำซ้ำ): 17 บอสบท 1 (`art/art-char-boss-ch1-002`, แมพ 4–10 รุ่น B–C), 18 สัตว์เลี้ยง (`art/art-pet-002`, รุ่น B), 10 รูน (`art/art-ui-rune-001`, รุ่น B), 11 คู่แข่งลานประลอง (`art/art-char-rival-001`, รุ่น B)
- ยังไม่ส่ง: 12 หอคอยแห่งชะตา (รุ่น C ทำทีหลังได้) · 23 ไอคอน 27 สกิลส่งพร้อม runtime แล้วใน PR #60 (C1), รอรีวิว

### C5 — เอฟเฟกต์ของทุกสกิล เป็นตระกูล (เพิ่ม 2026-10-23)

ตอนนี้มีเอฟเฟกต์ภาพวาด 3 สกิล (Bolt `bolt-fx.ts`, Execute/Ward `exec-ward-fx.ts` เจ้าของให้ผ่านแล้ว) ที่เหลือ ~58 สกิลยังใช้เอฟเฟกต์โค้ดสั้นๆ แทนที่จะวาดทีละสกิล ให้ทำ "ตระกูล" ที่ใช้ภาพชุดเดียวกัน แล้วแต่ละสกิลเปลี่ยนแค่สี/ขนาด/ทิศ/จำนวน ตามลำดับ (ใช้บ่อยก่อน):

| ลำดับ | ตระกูล | สกิล |
|---|---|---|
| 1 | ฟันดาบ/แทง | attack, finisher, lunge, sweep, backstab, ambush, disarm, parry (ฟันสวน), pierce, halt |
| 2 | โล่/ป้องกัน | guard, aegis, rally, bulwark, stonearmor, guardstone, halo, sanctuary, brace, spearwall, hold |
| 3 | แสงรักษา | heal, prayer, rouse, revive, bless, mend (เพลงฟื้น) |
| 4 | ลูกธนู/มีดบิน | hinder, volley, weakshot, pin, track, disengage, knives |
| 5 | ทุบ/แผ่นดิน | bash, slam, quake, tremor |
| 6 | ขวดเล่นแร่ | acid, bomb, smoke, catalyst, haste, fury |
| 7 | ออร่า/เพลง/ตรา | mark, valor, dread, solo, warcry, taunt, challenge, decoy, evade, finale, note |
| 8 | เวทอาร์เคนที่เหลือ | storm, sigil, dispel |

```text
TASK C5 — Asterveil · Fateweave: painted VFX families for every remaining skill (one family per PR)
Read AGENTS.md and CLAUDE.md ("VFX — status") first, then docs/design/SYSTEMS_REFERENCE.md (VFX and combat-presentation rules), docs/combat-presentation/vfx-art-direction/README_TH.md, and the approved slices: src/game/visuals/bolt-fx.ts and src/game/visuals/exec-ward-fx.ts with public/assets/fx/{bolt,execute,ward}_fx.* and their clips in docs/combat-presentation/bolt-slice/ and exec-ward-slice/. Base branch feature/fateweave-initial-prototype; work branch codex/vfx-family-<n>-<name>; PR into the base branch.
Goal: replace the short code-drawn effects of every other skill with painted layers in the same language, built as 8 families (table in docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md section C5). Each family = one shared painted atlas (public/assets/fx/<family>_fx.webp + .json, sources under incoming/ART-VFX-<FAMILY>-001/) and one module src/game/visuals/<family>-fx.ts; each skill in the family picks its colour/scale/direction/count from a small table, not its own art.
Rules (same as the approved slices): timing comes from src/ui/battle-playback.ts and must not change; outcomes must be truthful (a dodged, blocked, guarded, cancelled or absorbed hit must look like it, read from the resolved events, never guessed); reduced-motion uses a still frame; nothing in the effect may change state (no rule, save or resolver changes); the class palettes from the skill icons; readable at 390px.
Process: family 1 first. For each family: make the art, wire it, run npm run typecheck, lint, npx vitest run, build and the battle Playwright tests, record short clips at 390px like the approved slices (one clip per skill type: hit, and where it applies blocked/dodged), put them in docs/combat-presentation/<family>-slice/, open the PR and stop. Start the next family only after the owner approves the clips (an approval is noted in docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md). Log each finished family at the top of docs/handoffs/CODEX-TO-CLAUDE.md.
```

### C6 — concept ตัวละครอาชีพใหม่ 5 อาชีพ (เจ้าของยืนยัน 15 อาชีพ 2026-10-23)

ทำ concept sheet ภาพตัวละครของ 5 อาชีพใหม่ใน `docs/MASTER_PLAN_TH.md` A6b: โหราจารย์ (หลัง), นักมวย (หน้า), นักสาป (หลัง), นักบุญรบ (หน้า), นักเต้นรำ (หลัง) สไตล์เดียวกับภาพทหารรับจ้างในเกม (`incoming/ART-CHAR-MERC-ENEMY-001/`) ให้ท่าทางและอาวุธสื่อกลไกของอาชีพ เป็น PR ภาพเท่านั้น (`art/art-char-class-new-001`, `incoming/ART-CHAR-CLASS-NEW-001/`) ห้ามแตะโค้ด กลไก ชื่อตัวละคร และสกิลรอ Claude ออกแบบ ไม่มีระบบธาตุ (อย่าใส่สัญลักษณ์ธาตุในภาพ)

```text
CODEX HANDOFF — ART-CHAR-CLASS-NEW-001
Asterveil · Fateweave: concept sheets for five new mercenary classes (concept only, no code)

Read AGENTS.md and CLAUDE.md first. Repository wnau34-nptrn/asterveil-fateweave, base branch feature/fateweave-initial-prototype. Branch art/art-char-class-new-001; files only under incoming/ART-CHAR-CLASS-NEW-001/. Do not change src/, tests/, public/, .github/. PR into the base branch; do not merge. Original artwork only; nothing from Asterveil: Rise Beyond. Never use the word ม่านเวล; the player's group is the ค่ายทหารรับจ้าง.

READ FIRST: incoming/ART-CHAR-MERC-ENEMY-001/ (mercs/, NOTES.md, STYLE_CHECK.md: the chibi-proportion painted style, outline, lighting and palette rules of the current mercenaries) and the in-game unit/portrait atlases in public/assets/art/. Match that style exactly so the new classes stand next to Aegis, Lyra, Eira, Seren, Garran, Mira, Toma, Sefa, Brann and Lio. There is NO element system: no element symbols, colour-coded element auras or elemental badges.

Each class must read at a glance from its silhouette and weapon, and must not look like an existing class (no sword-and-board knight, no rapier duelist, no staff mage, no bow, no spear, no flask belt, no hammer, no lute). Lane = where it stands in battle (front row / back row).

1. โหราจารย์ — Seer (back row). Bends fate: turns one enemy's attack onto another enemy and skips an enemy ahead in its move cycle. Calm, mysterious; star-chart cloak, floating astrolabe rings or fate threads between the fingers; cool silver-violet and deep blue with small gold stars. No staff.
2. นักมวย — Martial Artist (front row). Builds "ปราณ" (inner energy) with each hit and spends it on finishers. Unarmed: wrapped fists/forearm guards, light flexible clothing, a visible ki glow that grows (show 1 pip and full-charge variants). Warm earth and saffron tones.
3. นักสาป — Hexer (back row). Stacks curses that drain foes at the end of each round and make cursed foes hurt themselves when they act. Hooded, talismans/paper charms or a cursed doll, faint dark-crimson sigils; unsettling but not gory, still friendly chibi proportions.
4. นักบุญรบ — Battle Saint (front row). A front-line healer: every strike sends healing light to the most wounded ally. Mace or knuckle-cross with a small shield or prayer beads, half armour over vestments; white, warm gold and soft mint light. Must not look like Seren (back-row priest) or Aegis (knight).
5. นักเต้นรำ — Dancer (back row). Speeds allies' skills back up (cooldown refresh) through rhythm: ribbons, fans or bells, flowing layered skirt/sash with motion lines; coral, teal and gold. Graceful, not a bard (no instrument).

DELIVERABLES per class (folders 01_seer … 05_dancer):
- Two design options (A and B) on one concept sheet each: full-body front view, 3/4 view, back silhouette, face close-up, weapon/prop callouts, 6-swatch palette.
- One in-game test: a battle unit sprite (same canvas and pivot as the current mercs in the atlas) and a circular portrait crop, for option A only, so the owner sees it at real size.
- review/lineup.png: option A of all five standing beside the ten existing classes at in-game unit size (silhouette check), and review/lineup_390.png composited on a 390x844 battle-field mock.
- NOTES.md: per class the silhouette idea, how the pose/prop shows its mechanic, palette hex codes, and a short Thai name suggestion for each option (the owner picks names; Claude designs skills later).
- PROMPTS.md / provenance like ART-CHAR-MERC-ENEMY-001.

After the PR is open, add the entry Codex owes Claude (AGENTS.md) and stop: production sprites/portraits for the chosen options are a later task after the owner chooses A or B.
```

## เมื่อ Usage ของ Claude รีเซ็ต (หลัง พ. 28 ต.ค. 19:00)

เปิดแชตใหม่ (Opus) แล้ววาง:

```text
ทำงานต่อในรีโป wnau34-nptrn/asterveil-fateweave สาขา feature/fateweave-initial-prototype
อ่าน docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md, docs/handoffs/CODEX-TO-CLAUDE.md, docs/handoffs/NEW-CHAT-HANDOFF-TH.md และ CLAUDE.md ก่อน
แล้วตรวจงานที่ Codex ทำระหว่างนี้ (PR และ commit บนสาขาเกม): รันเทสต์ ดูภาพ แก้สิ่งที่ผิดกติกา รับภาพที่ค้างเข้าเกม ตรวจก่อน push ตาม CLAUDE.md ตอบเป็นภาษาไทย
```

## ฝากถึง Claude (Codex เขียนต่อท้าย)

- (ว่าง)
