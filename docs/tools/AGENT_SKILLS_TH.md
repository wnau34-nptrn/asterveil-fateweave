# Agent Skills ของโปรเจกต์ — การใช้งานกับ Asterveil-Fateweave

ติดตั้ง 2026-10-29 ที่ `.claude/skills/` (project-local อยู่ใน Git) ที่มา/เวอร์ชัน/license ดู [.claude/skills/README.md](../../.claude/skills/README.md)
Skills เป็นคู่มือเสริม ไม่แทนคำสั่งผู้ใช้, `CLAUDE.md`, `AGENTS.md`, แผน W1–W8 หรือการตัดสินใจภาพ/motion ของเจ้าของ งานติดตั้งนี้ไม่เปลี่ยน gameplay, rules, save, balance หรือ playback timing

## ข้อกำหนดเฉพาะเกมเมื่อใช้ Phaser skills

Phaser skills มาจาก repo ทางการ (tag v4.2.1 ตรงกับเกม) ตัวอย่างในนั้นเป็น JavaScript ทั่วไป เมื่อใช้กับเกมนี้:

- เขียนเป็น strict TypeScript ตามโค้ดเดิม; ไม่ใช้ physics, tilemap หรือ Phaser text สำหรับ HUD (HUD/ข้อความ/ปุ่มเป็น DOM)
- `BattleScene` แสดงผลเท่านั้น: ห้ามคำนวณดาเมจหรือเปลี่ยน resource ใน scene, tween หรือ animation callback; จังหวะภาพต้องตามด้วย event จริงของ resolver
- ขนาดใช้ game/arena dimensions ใน `BattleScene` และ `platform/viewport.ts` ไม่ใช่ `scale` mode แบบเต็มจอหรือ media query กว้างทั้ง viewport (ดู "Portrait game" ใน `CLAUDE.md`)
- รักษา reduced-motion, optional loading/fallback ของ unit atlas และงบ texture ใน `docs/design/UNIT_ANIMATION_ROLLOUT_TH.md` §7
- ภาพ/atlas มาจาก Codex ผ่าน `incoming/<ID>/` เท่านั้น ใช้ skill `fateweave-art-intake`

## playwright-cli: การตั้งค่าในคลาวด์

ใช้ `npx playwright cli` จาก `@playwright/test` 1.64.0 ที่ล็อกไว้ ไม่ต้องติดตั้ง `@playwright/cli` เพิ่ม (อย่ารัน `npx playwright install` ในคลาวด์ — Chromium ติดตั้งไว้แล้ว)
ค่าเริ่มต้นของ CLI หา Google Chrome (`/opt/google/chrome`) ซึ่งไม่มีในคลาวด์ จึงต้องชี้ไปที่ Chromium ด้วย config ชั่วคราว (นอก repo):

```bash
printf '{"browser":{"browserName":"chromium","launchOptions":{"headless":true,"executablePath":"%s","args":["--no-sandbox"]}}}' "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-/opt/pw-browsers/chromium}" > "${TMPDIR:-/tmp}/pw-cli.json"
```

บนเครื่องที่มี Chrome ติดตั้งอยู่ ไม่ต้องใช้ `--config` ตั้ง `NO_UPDATE_NOTIFIER=1` เพื่อปิดการเช็กเวอร์ชันผ่าน npm ไฟล์ snapshot/log จะอยู่ที่ `.playwright-cli/` (อยู่ใน `.gitignore`)

ตัวอย่างตรวจหน้าจอ 390px:

```bash
npm run dev -- --port 5173
```

```bash
npx playwright cli open http://localhost:5173/ --config="${TMPDIR:-/tmp}/pw-cli.json"
```

```bash
npx playwright cli resize 390 844
```

```bash
npx playwright cli snapshot
```

```bash
npx playwright cli screenshot --filename=camp-390.png
```

```bash
npx playwright cli console
```

```bash
npx playwright cli close
```

ใช้สำหรับดู DOM/console/ภาพเร็ว ๆ เท่านั้น เทสต์ที่ต้องเก็บและคลิปส่งเจ้าของใช้ spec ใน `tests/browser/` (`npm run test:browser` หรือรันเฉพาะไฟล์) ผลจาก Chromium emulation ไม่ยืนยัน iOS Safari หรือมือถือจริง

## ตัวอย่างคำสั่งเรียกใช้

- "ใช้ /fateweave-codex-art-brief เขียน prompt W3-a ART-UNIT-ANIMATION-A5-001 ให้ Codex โดยนำ feedback A4 ไปใช้"
- "ใช้ /fateweave-art-intake นำ PR #95 (A5) เข้าเกม ตรวจ hash, normalize, pack, เทสต์ และอัดคลิป 390px"
- "ดู /phaser-animations และ /phaser-loading-assets แล้วตรวจว่า optional unit atlas ปล่อย texture เมื่อเปลี่ยน encounter หรือไม่"
- "ใช้ /playwright-cli เปิดหน้า camp ที่ 390px ดู console error และถ่ายภาพหนึ่งภาพ"
- "ใช้ /fateweave-rules-and-sim ก่อนเพิ่มสถานะใหม่ใน resolver แล้วรัน npm run sim"

## Skills ที่ประเมินแล้วไม่ติดตั้ง

| Skill / แหล่ง | ประเภท | เหตุผล |
| --- | --- | --- |
| `frontend-design` (anthropics/skills @ `ca45fc4`) | Skill | ผลักให้คิดทิศทางภาพใหม่ ขัดกับ UI ที่เจ้าของอนุมัติแล้ว (ART-UI-MODERN-001, Luminous Veil tokens) |
| `webapp-testing` (anthropics/skills @ `ca45fc4`) | Skill | ใช้ Python Playwright ซึ่งไม่ได้ติดตั้ง และซ้ำกับ Node Playwright + `playwright-cli` ที่ตรงเวอร์ชัน |
| `sprite-gen` (aldegad/sprite-gen @ `419f02c`) | Skill + Python tool | สร้างภาพผ่าน GPT/Grok/Codex (บริการภายนอก/เสียเงิน), ต้องการ ffmpeg/RIFE ฯลฯ และสลับหน้าที่ Codex-ทำภาพ/Claude-นำเข้า |
| `performance`, `core-web-vitals` (addyosmani/web-quality-skills @ `afa8da9`) | Skill | เน้นเว็บไซต์ (LCP/SEO/RUM) ไม่ครอบคลุมหน่วยความจำ texture ของเกม งบเกมอยู่ใน rollout §7 แล้ว |
| `yakoub-ai/phaser4-gamedev` | Plugin (skills+agents+hooks) | ชุมชน; หน้ารายการระบุว่าอิง Phaser 4.0.0-rc.7 (ไม่ได้ clone ตรวจโค้ด) ซ้ำกับ skills ทางการ v4.2.1 และติดตั้ง hooks/agents เกินขอบเขต |
| Skills sprite/atlas จาก registry (claudskills, skillsmp, skills.sh) | Skill | ตรวจที่มา/โค้ดไม่ได้ชัดเจน และโปรเจกต์มี pipeline lossless ของตัวเองแล้ว |
| หมวด UI/HUD มือถือแนวตั้ง และ deterministic simulation | — | ไม่พบ Skill สำเร็จรูปที่ตรวจสอบได้และเข้ากับข้อกำหนด; ใช้ `CLAUDE.md` + `fateweave-rules-and-sim` |
