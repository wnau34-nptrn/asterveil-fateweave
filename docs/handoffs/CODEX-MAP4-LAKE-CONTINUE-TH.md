# ส่งต่อให้ Codex: นำเข้าภาพแผนที่ 4 ต่อ (เฟส 3–4) — 2026-11-22

เหตุผล: usage ของ Claude ใกล้หมด เจ้าของขอให้ Codex ทำต่อ · แผนเต็ม [MAP4-LAKE-ART-IMPORT-PHASES-TH.md](MAP4-LAKE-ART-IMPORT-PHASES-TH.md) · brief ภาพ [CODEX-ART-MAP4-LAKE-TH.md](CODEX-ART-MAP4-LAKE-TH.md)

## สถานะตอนส่งต่อ

| งาน | สถานะ |
|---|---|
| #336 กฎ/เนื้อหา/เซฟ v68 (`claude/map4-moonlake`) · #337 หน้าจอ (`claude/map4-lake-ui`) | เปิดอยู่ รอเจ้าของอนุมัติหน้าจอ แล้วค่อย merge เข้าสาขาเกม |
| Codex PR #338 / #340 / #339 (ภาพแผนที่ / ศัตรู / บอส+VFX) | **ผ่านการตรวจรับแล้ว** ห้าม merge ใช้เป็นแหล่งไฟล์ (`git archive origin/art/<branch> incoming/<ID>`) |
| เฟส 1 ภาพแผนที่ | **เสร็จ** เจ้าของอนุมัติ ("อนุมัติ") merge แล้ว PR #342 → `claude/map4-lake-ui` |
| เฟส 2 ศัตรูธรรมดา 4 ตัว | PR #343 (`claude/map4-lake-foes`) **รอเจ้าของอนุมัติ motion** — คลิป `docs/combat-presentation/lake-foes-slice/` ถ้าเจ้าของอนุมัติด้วยคำพูด ให้บันทึกคำพูดใน handoff แล้ว merge หลัง CI ผ่าน |
| เฟส 3 อสรพิษเงา + นางเงือกร้องไห้ | นำเข้าแล้วใน PR #344 · เจ้าของเลือก **R1 ทั้งคู่** และอนุมัติ motion (2026-11-22 “อนุมัติ”) จาก [คลิป 390px](../combat-presentation/lake-elites-slice/README_TH.md) |
| เฟส 4 บอสภูตธารา + VFX 4 ชุด | ยังไม่เริ่ม · **เจ้าของยังไม่ได้เลือก R1/R2** ของ Tide Lash / Undertow / Reflection ต้องถามก่อน |

## กติกา (ย่อจาก CLAUDE.md — อ่านไฟล์เต็มก่อนเริ่ม)

- สาขา `codex/map4-lake-elites` และ `codex/map4-lake-boss` แตกจาก `claude/map4-lake-foes` (หรือจาก `claude/map4-lake-ui` ถ้า #343 merge แล้ว · จากสาขาเกมถ้า #336/#337 merge แล้ว) เปิด PR เข้าสาขาฐานนั้น
- ห้ามแก้ `src/core/battle`, `src/core/save`, ตัวเลข/สมดุล/timing · ไม่แก้ภาพของ Codex (นำเข้าตามที่ส่ง lossless) · ไม่ใช้คำว่า ม่านเวล · ไม่ commit secrets · ไม่แตะ Asterveil: Rise Beyond
- ก่อน push: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run coverage:presentation` · CI (quality + validate) ต้องผ่าน
- **งานภาพ merge ได้เมื่อเจ้าของอนุมัติด้วยคำพูดเท่านั้น** (CI/เทสต์ไม่นับ) บันทึกคำพูดนั้นไว้
- ระวัง: สาขาเก่าบางสาขายัง track `node_modules` เป็น symlink ถ้า `npm ci` ลบมัน อย่า commit การลบนอกจากอยู่บนสาขาที่ลบไปแล้ว
- Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`, `--trace off` · ไม่มี ffmpeg (คลิปทำ animated WebP ด้วย Pillow)

## เฟส 3 — อสรพิษเงา + นางเงือก (R1)

- แบบอย่าง: `scripts/build-lake-foes.py` (เฟส 2) — เพิ่ม actor `shadow-serpent`, `weeping-siren` (R1) ต่อเซลล์ foes3 frame 4 (อสรพิษ) และ 5 (นางเงือก) ใน `units_foes3`/`portraits_foes3` แล้วรัน `scripts/portraits-half.py`
- **ข้อควรระวังหลัก:** ทั้งสองตัวมี 3 strip ที่ Codex ใส่ index ซ้ำ 9..16 (อสรพิษ Venom Spit / Coil Gathering / Crushing Coil; นางเงือก Weeping Song / Drowning Call) สคริปต์เฟส 2 จะ assert ล้ม ต้องจัด layout ของตัวเอง เช่น attack 1–8, skill แรก 9–16, skill ถัดไป 22–29 และ 30–37, hit 17–18, down 19–21 แล้วใช้ `clips`/`own` ใน `unit-frames.ts` ให้แต่ละ intent ชี้ clip ของตัวเอง (ดูแบบ `foe_riftweaver` snare 22..29 และคอมเมนต์ `own` ใน `UnitDefinition`)
- art key ใหม่ `foe_shadow_serpent`, `foe_weeping_siren` ใน `assets.ts` (actorArt, figureTops จาก alpha top ของ seed), `unit-animation-map.ts`, แก้ `art` ใน encounter `eliteShadowSerpent`/`eliteWeepingSiren` (`src/content/encounters/catalog.ts`) และเอาสอง id นี้ออกจาก `LAKE_STANDINS`
- เทสต์: ขยาย `tests/unit-lake-foes.test.ts` (ทุก intent จริงได้ clip ของตัวเอง, hit/down, atlas lossless, LAKE_STANDINS เหลือ `water-spirit`) · คลิป 390px ต่อ intent + ล้ม (ขยาย fixture `tests/fixtures/unit-a4.ts` `lakeFoeArts` และ `tests/browser/unit-a4-clips.spec.ts`) เก็บใน `docs/combat-presentation/lake-elites-slice/`
- งบ: ดู `docs/validation/w8-field-audit/BUDGET_TH.md` หลัง coverage (≤ 64 MiB ต่อ encounter)

## เฟส 4 — บอสภูตธารา + VFX

- แตกเฟส 4 จาก `claude/map4-lake-foes` หลัง merge #344 เพื่อให้ทั้งสองอีลิทอยู่ในฐานเดียวกัน
- ถามเจ้าของเลือก R1/R2 ก่อน (ดู `preview-390.png`/`storyboard-390.png` ใน package boss)
- strip 1024 ต่อเซลล์ sole 0.875 (`BOSS_SOLE`) layout `bossMove(base)`: ท่าละ 4 เฟรม + hit 2 + down 3 แบบ `foe_sentinel` · art key `foe_water_spirit` (foes3 frame 6 ถ้าใช้เซลล์ 512 สำหรับภาพนิ่ง ให้ย่อจาก seed อย่างเดียว ห้ามวาดใหม่)
- VFX 4 ชุด (Water Veil / Surging Wave / Great Wave / Reflection, 256×256 สามจังหวะ) เข้า `boss-signature-fx` แทน `paintedAs` ชั่วคราว · ผูกกับ event จริง ไม่บังตัวเลขดาเมจและป้าย HP · ม่านน้ำต้องต่างจากโล่ฮีโร่
- เสร็จแล้ว `LAKE_STANDINS` ว่าง → รัน `coverage:presentation`, `tests/encounter-budget.test.ts` · คลิป 390px ให้เจ้าของอนุมัติ motion

## งานเสริม (ทำเมื่อเจ้าของสั่งเท่านั้น)

- พอร์เทรตวาดจริงของศัตรูทะเลสาบ (ตอนนี้เป็นภาพครอปจาก seed) · ภาพศาลเจ้าริมน้ำ/แพพ่อค้าใน decor_lake ยังไม่ได้ต่อกับ event ของแผนที่ · คลิปน้ำขึ้นน้ำลง `docs/validation/map4-lake/lake-tide-clip.webp` ยังเป็นของชั่วคราว

## จบแต่ละเฟส

เขียน entry ≤ 12 บรรทัดบนสุดของ `docs/handoffs/CODEX-TO-CLAUDE.md`, อัปเดต `CURRENT_STATE.md` และติ๊กสถานะในไฟล์นี้กับแผนเฟส
