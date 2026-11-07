## 2026-11-07 — ART-VFX-REWORK-001 (Codex art + intake)
- PR #200 · Branch `art/art-vfx-rework-001` → `feature/fateweave-initial-prototype`; no merge (owner motion review pending).
- Generated poison/storm/shadow/arcane/clash layers, R1 drop + R2 fang; raw sources/prompts and lossless pipeline in `incoming/ART-VFX-REWORK-001/`.
- Event-only routing in visuals/BattleScene; no rules/save/content/balance/stage timing changes; fallback/reduced/fast retained.
- Validation, real 390px Chromium clips and test results: `docs/combat-presentation/vfx-rework-slice/README_TH.md`.
- Owner explicitly authorized Codex to make art and integrate in §31; R1 recommendation is Codex's choice, not owner approval.
- CI follow-up: legacy knives/evade ring assertions now verify the new painted layers; state/cleanup checks retained; same 571 source cases partitioned across 4 runners (disjoint union verified).
- Open: owner reviews motion; do not merge/publish automatically. Real mobile/Safari unverified.

# Codex → Claude handoff

Newest first. One entry per finished task, at most 12 lines; link a validation README for evidence instead of pasting run ids or logs. Write each entry only here. Older entries (to 2026-11-03) are preserved verbatim in [archive/2026-11-04/CODEX-TO-CLAUDE.md](archive/2026-11-04/CODEX-TO-CLAUDE.md) and those of 2026-11-04 in [archive/2026-11-06/CODEX-TO-CLAUDE.md](archive/2026-11-06/CODEX-TO-CLAUDE.md); move entries there when this file passes ~40 KB. Current state: [CURRENT_STATE.md](../../CURRENT_STATE.md).

## 2026-11-07 — Codex brief ART-VFX-REWORK-001 (motion review follow-up)

- Branch `claude/art-vfx-rework-brief`, docs only. After the 390px motion-review clips of the step 5–6 skills the owner said "ตามที่คุณแนะนำเลย อะไรต้องแก้ไข ขอ prompt codex"; no clip was approved individually.
- Added copy-ready brief §31 in `docs/handoffs/CODEX-ART-QUEUE-TH.md`: own effect layers for venom coat/stack/tick/burst+splash, blade storm (4 slash variants), shadow step hit + afterimage, Eira arcane charge/release, Kael clash. Semantics taken from engine events; no rule/save/number change.
- Checks: `git diff --check`. Open: Codex package → intake (`fateweave-art-intake`) → real 390px clips → owner verdict in their own words.

## 2026-11-07 — UI frame group 4: run summary + battle rewards (Claude, branch feature/ui-frame-group4)
- CSS only (`src/ui/sheet-frame.css`): header divider/left title on the summary, gold primary plate on "กลับค่าย"/"ไปต่อ", hud-edge borders; text sizes, content, order, button positions unchanged (summary return keeps 52px). No rules/save change. Closes the UI frame series (groups 1–4).
- Evidence + before/after 390×844, 390×650, 320×568: `docs/validation/ui-frame-group4-2026-11-07/README_TH.md` (ui-language-audit: font-size sets and <12px counts identical, no hscroll; Chromium headless only).
- Owner got the images before merge. Open: none new; next task is the owner's pick (CURRENT_STATE.md).

## 2026-11-06 — Team presets + easier team page (Claude, PR #196, save v56)
- เจ้าของสั่ง: preset สลับทั้งทีมแตะเดียว + หน้าจัดทีม "ทีมบน คลังล่าง" · research HSR/Genshin/FEH/Raid/SW/AFK/Pokémon → ตารางใน README
- กฎบริสุทธิ์ `core/world/presets.ts`: 4 ชุด (ร่าง) ชื่อ ≤12 · ค่าย = ใช้ภายในสำรองที่ปลดตามบท (เกินรอในค่าย), เลิกจ้างแล้วหลุดจากทุกชุด · แผนที่ = นอกศึก เฉพาะคนที่พามา ไม่มีใครเข้า/ออก · formation/fatigue/ศึกไม่เปลี่ยน; replay หลังใช้ชุดเท่ากับจัดมือ (เทสต์)
- เซฟ v56: `Profile.presets` (ทับ v55 ของ #193 ที่ merge ระหว่างทำ) · #195 Sefa อ้าง v56 เหมือนกัน → ตัวที่ merge หลังบวกเป็น v57 (แจ้ง session skill rework แล้ว)
- UI: ค่าย ชุดทีม → ลงสนาม → สำรอง → แผนการยืน → ตัวละครในค่าย → แถบตัวละคร; ปุ่มแตะเดียว ใส่ลงสนาม/สำรอง/พักในค่าย; กระเป๋าแผนที่มีแถวชุดทีม (ขาด/ล้ม/เหนื่อย)
- Tests: typecheck/lint/build, vitest 1641, Playwright ทีม/ค่าย/world 148 + team-presets.spec (Chromium) · ภาพ/README `docs/validation/team-presets-2026-11-06/README_TH.md` · ไม่ได้ลองอุปกรณ์จริง
- เปิด: เจ้าของยังไม่ได้ลองเล่นจริง; จำนวนชุด 4 เป็นร่าง

## 2026-11-06 — UI frame group 3: map + battle dialogs (Claude, PR #194 merged, owner approved images)
- เจ้าของสั่งทำทั้งชุดพร้อมกัน; แก้เฉพาะ CSS `src/ui/sheet-frame.css` (หัวหน้าต่างชิดซ้ายสีทอง 19px, ปิด 44px ที่ 333,11 = เท่าแผ่นบริการ; ปุ่ม primary แผ่นทองเดียวกัน, secondary เปลี่ยนแค่มุม) ครอบ goals/pack/info/camp+entrance+withdraw/event และ `#game-info`; ไม่แตะ HUD/เนื้อหา/กฎ/เซฟ
- วัด 390/320: ขนาดตัวอักษรเท่าเดิม, ไม่มีเลื่อนแนวนอน, เนื้อหาในหน้าต่างเลื่อนลง 1px (หัวสูงขึ้น 1px) ยกเว้น `#game-info` ลง ~4px; ปุ่มอื่นอยู่ที่เดิม
- Tests: world.spec + battle-shots (93 ผ่าน), ui-language-audit ก่อน/หลัง (เพิ่มภาพ 53a/53b ของ `#game-info`); ผลและภาพ `docs/validation/ui-frame-group3-2026-11-06/README_TH.md`
- เจ้าของอนุมัติภาพ; PR gate quality+browser ผ่านครบ → merge · ต่อไป: จัดทีม preset (session_014iPEcP6oUwVRPxyN3wu8Go) แล้วกรอบสรุป/รางวัล

## 2026-11-06/07 — Skill rework step 6: small fixes (Claude, PRs #191 #192 #193 #195 #198 merged; saves v53–v55, v57 Sefa, v58 Shadow Step)
- เจ้าของ "ตามที่คุณแนะนำ" + "ดำเนินการต่อได้" = การ์ดขั้น 6 ในหน้า artifact "ตรวจสกิล Fateweave" · เซฟ v53–v57 (หนึ่งเวอร์ชันต่อชุด, ศึกค้างที่ใช้สกิลที่เปลี่ยนเริ่มใหม่)
- v53 #191: ส่งไม้ Toma 50%, Aegis challenge ตี 10 + แค้นสะสม, rouse −20%, Seren sanctuary พรค้างทั้งศึก, bless 6+6 · bash ผลักท้ายคิว: วัดแล้วทีมเสียเลือด เจ้าของเลือกคงเดิม
- v54 #192: Kael storedfist ปะทะท่า, circlefist 1 ปราณ/เลือด 10% · Lio solo ×2 + โน้ต 6, finale +20%/รอบ
- v55 #193: Mira ยิงถอยหลัง/ศรตามรอยเด้ง, Eira เกราะผลึกสะท้อน/ปลดพลังเวท (ประจุจาก bolt), Brann slam แค้นสะสม · v56: Sefa พายุคม/เคลือบพิษ/ระเบิดพิษ
- หายเข้าเงา (การ์ด) ทำ campaign gate ตก → เจ้าของเลือก ก้าวเงา = ตี 8 + หลบ (v58, #198) และ gate แบบดูทั้งแคมเปญ (ช่องเสียได้ ≤1 ค่ายเมื่อทั้งกลุ่มไม่แย่ลง) · v56 = ชุดทีม #196 (session อื่น) ประสานเลขเซฟผ่าน send_message
- Tests ทุกชุด: typecheck/lint/unit ~1635, sim 28/28 (campaign gate), Playwright ที่เกี่ยวข้อง (Chromium) · ตัวเลขทั้งหมด README §9 `docs/validation/skill-rework-2026-11-05/README_TH.md`
- เปิด: challenge ยังไม่ถูกเลือกใน sim, rouse ΔHP −8.6, ความยากศัตรู (ถ้าเจ้าของต้องการ) เป็นงานแยก · เจ้าของยังไม่ได้ดูภาพในเกม

## 2026-11-06 — Skill rework step 5: Toma (Claude, PR #190 merged)
- เจ้าของ "ดำเนินการขั้นต่อไปได้" = การ์ด Toma ในหน้า artifact "ตรวจสกิล Fateweave" (ไม่มีโน้ตเจ้าของ) · เซฟ v52 (ศึกค้างที่ใช้ haste/smoke/catalyst เริ่มใหม่จากเลือดเข้า)
- กฎ: haste ส่งไม้ (`HeroState.baton` +20% การลงมือครั้งถัดไป: ดาเมจ/รักษา/โล่) · smoke บนเป้าติดกรด ลาม 20% ไปศัตรูข้าง ๆ · catalyst 6+8 ไม่ล้างกรด กระเด็น 50% ไปศัตรูข้าง ๆ · ศัตรูข้าง ๆ = ใกล้สุดซ้าย/ขวาในแถวเดียวกัน (`foeNeighbours`, Claude ตีความ)
- Sim 28/28 (TREES/CLASSES/CHARACTERS เปลี่ยนเฉพาะ Toma): catalyst 0→12 ครั้ง, haste ΔHP −7.8/−6.9 → −3.3/−6.0, นักปรุงยา 43→47% · Playwright alchemy-fx + unit-a4 91 ผ่าน (2 เคสจังหวะเวลาตกเมื่อรัน 3 workers ผ่านเมื่อ 1 worker)
- ถามเจ้าของ: ส่งไม้ 20% ยังไม่คุ้มเท่า Toma ตีเอง (ลอง 50% = ΔHP +1.5/+3.4) · advisor gate ทำ campaign gate ตก จึงไม่ใช้ · รายละเอียด README §8 `docs/validation/skill-rework-2026-11-05/README_TH.md`
- เปิด: ควันลามเกิดน้อยใน sim · เจ้าของยังไม่ได้ดูภาพกระเด็น/ควันลาม · ขั้นถัดไป = ปรับเล็ก (ข้อ 6 ของการ์ด) รอเจ้าของสั่ง

## 2026-11-06 — Skill rework step 4: Astrid (Claude, branch feature/skill-rework-astrid)
- เจ้าของอนุมัติรูปแบบ (การ์ด Astrid ใน artifact "ตรวจสกิล Fateweave") + นิยาม "ท่าใหญ่"/"เลื่อน 1 รอบ"/กันโกง ("เห็นด้วย") บันทึกใน README §7 และ SYSTEMS_REFERENCE
- กฎ: deflectfate ตี 6 + คูลดาวน์ 4→3 · turncycle = เลื่อนท่าใหญ่ (ตี 8; ท่าใหญ่ถัดไปไปรอบหน้า ศัตรูใช้ท่าถัดไปในวงแทน; charge เลื่อนพร้อมท่าแรง; ครั้งเดียวต่อท่า; ถูกขัด/เบนแล้วเลื่อนไม่ได้) · doubledial = ดาวตก 18 ทุกตัวตอนจบรอบ หายถ้า Astrid ล้ม · `cycleShift`/`Command.steps` ถอดออก (`cycleLag`+`postpone`, `meteors`) · เซฟ v51
- b2y คืนคูลดาวน์เมื่อเลื่อนได้จริง · b4 = `seerMeteorBig` +6 (ข้อเสนอ Claude รอเจ้าของดู) · ป้าย "<ท่า> เลื่อนไปรอบหน้า" บนการ์ดเจตนา (เห็นที่ 390px) · VFX Mark/Dispel/Storm ตามเหตุการณ์จริง + `tests/browser/seer-fx.spec.ts`
- Advisor: เลื่อนมีค่า 10% ของท่าใหญ่ (80% ถ้าเป้าเหลือ ≤50) — 40% ทำให้กดบ่อยแต่ไม่ช่วย
- Sim 28/28 เฉพาะแถว Astrid: กิ่ง b 9/10 43% → 10/10 60%, กิ่ง a 9→10/10, ประจำตัว 54→60%; ΔHP turncycle +0.6/+2.1/+5.3, doubledial +13.2 · probe `tests/probe/astrid-probe.test.ts`
- เปิด: เบนชะตายังใช้ 2–4 ครั้ง · ขั้นถัดไป Toma (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง

## 2026-11-06 — iPhone web app: HUD text in the top ~100pt is blurred by iOS (Claude, branch fix/battle-header-layer)
- วัดภาพจริง: หัวแถวบน (≈70–95pt) นุ่ม แต่ตัวหนังสือที่ ≥108pt คม; ไม่มี filter/mask/overlay ใน DOM; สไตล์ที่แก้ใน #186 ไม่เปลี่ยนความคมเลย (วินิจฉัยรอบนั้นผิด); ตำแหน่งบนจอเท่ากันทั้งโหมดโปร่ง/ปกติ → สมมติฐาน: เอฟเฟกต์แถบบนของ iOS 26 ทับโซนบนสุดของเว็บแอป
- แก้ (เฉพาะ standalone): `--safe-top-fallback` = 36px ทุกหน้าจอได้ที่ว่างบนเพิ่ม; แตะกล่องตัวเลข (เปิดด้วยแตะมุมซ้ายบน 5 ครั้ง) เพื่อวนค่า 36/0/24/48 บนเครื่อง
- ยังไม่ยืนยันบนเครื่องจริง: ถ้าหัวแถวคมขึ้นที่ค่าไหน ให้ตั้งเป็นค่าเริ่มต้น และตรวจแผนที่/ค่าย/แผ่นบริการว่าหัวไม่ซ้อนโซนนี้

## 2026-11-06 — Skill rework step 3: Garran (Claude, PR #185 feature/skill-rework-garran)
- เจ้าของ "ดำเนินการตามที่คุณแนะนำได้เลย" = การ์ด Garran ในหน้า artifact "ตรวจสกิล Fateweave" (ตามโน้ตเจ้าของ) + เจ้าของเลือก brace = แทงเป้าทันที 8 แล้วตั้งทวนสวน 14 เหมือนเดิม (แทนปะทะท่า)
- กฎ: pierce ทะลุตัวหลังเป้า 50% (b2l เต็ม) · spearwall สวน 10 + ลดดาเมจแนวหน้า 5%/ครั้ง (สูงสุด 15%) · hold = ปักทวนตรึง 12 + ท่าถัดไปเบา 30% · halt = ผลักสลับแถวกับตัวหลังในคอลัมน์จนจบเทิร์นของตัวที่ถูกผลัก (ล็อก 2 รอบ, บอส/ตัวใหญ่ไม่ถูกผลัก, คูลดาวน์ 4) · warcry = พุ่งหอก 26 ตีถึงแถวหลัง รับเพิ่ม 20% · เซฟ v50 ศึกค้างที่ใช้ 6 ท่านี้เริ่มใหม่จากเลือดเข้า
- advisor ทวนใช้ preview ของ resolver + ผลหลังหน้าต่าง preview; ผลักนับลบเมื่อซ่อนตัวที่ทีมกำลังตี (วัดได้ −2.8 ถ้าไม่เลือก) · ฉากวาดสองตัวสลับแถวตามสถานะจริง (`standSlotId`) ภาพ 390px ใน README
- Tests: typecheck/lint/unit 1610 ผ่าน, Playwright command-fx + unit-a5 40 ผ่าน, sim 28/28: ผู้คุมแนว 9/10 49% → 10/10 57% (โจมตีปกติ 37→11), brace ΔHP −2.3→+0.9, warcry +2.4, ตัวอื่นไม่เปลี่ยน
- รายละเอียด `docs/validation/skill-rework-2026-11-05/README_TH.md` §6 · เปิด: spearwall ไม่ถูกเลือก, hold −1.2 · ขั้นถัดไป Astrid (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง

## 2026-11-06 — Battle header text sharper; home-screen app back to normal status bar (Claude)
- iPhone เว็บแอป: `black-translucent` (PR #175) ทำให้ iOS วาดหน้าที่ y=0 แต่ตัดที่ 793/852 → ล่าง 59pt วาดไม่ได้ (โหมดทดลอง #182 ยืนยัน) → เอาออก (#183) กลับเป็นแถบสถานะปกติ ที่ว่างล่างเหลือ ~26pt; ค่าที่วัด: inner 793, screen 852, env top 0, env bottom 34
- หัวแถวบนของหน้าต่อสู้ดูเบลอ ไม่ใช่เกา/filter แต่เป็นสไตล์ (เงาฟุ้ง 6px, ชิป 9px/400) → ปรับให้คม ดู `docs/validation/battle-header-text/`
- เปิด: ผู้ใช้ยังไม่ยืนยันผลบนเครื่องจริงหลังปรับ; ฉากพื้นหลังต่อสู้เป็นไฟล์แนวนอน 1536×1024 ขยาย ~1.6× (ถ้าต้องการคมกว่านี้ → ภาพแนวตั้งจาก Codex)

## 2026-11-06 — Skill rework step 2: Wynne pulls (Claude, PR #184 feature/skill-rework-wynne)
- เจ้าของ "ดำเนินการขั้นถัดไป Wynne ได้": ภาษีชีวิต/วงภาษีแทบไม่ถูกใช้ → ดึงด้าย (สาปทำงานทันที คลาย 1 ชั้น ต่ออายุชั้นที่เหลือ, คูลดาวน์ 2) + วงด้ายดึง (ตัวที่มีสาปทำงานทันที ตัวที่ไม่มีติด 1 ชั้น ใช้ได้ทุกเทิร์น)
- ถอดภาษี (`toll`/`payToll`/event `toll`) · โหนด b2x `hexPullHeavy`, b2y `hexPullKeep`, b4 `hexRingFull` ความหมายใหม่ · เซฟ v49 ศึกค้างที่ใช้ lifetoll/tollring เริ่มใหม่จากเลือดเข้า
- การต่ออายุตอนดึงเป็นการตัดสินของ Claude: ถ้าไม่ต่อ สาปจะหมดในรอบที่ดึง (เป็นที่กฎ ไม่ใช่การให้คะแนน)
- Tests: typecheck/lint/unit 1610 ผ่าน, Playwright roster-p03 + unit-a12-clips ผ่าน (คลิปถูกข้ามตาม env), sim ผ่าน: กิ่ง b 46→54% (tollring 0→11), ดึงด้าย 2–5 ครั้ง ตัวอื่นไม่เปลี่ยน
- รายละเอียด `docs/validation/skill-rework-2026-11-05/README_TH.md` §5 · ขั้นถัดไป Garran (รอเจ้าของสั่ง) · เจ้าของยังไม่ได้ดูท่าทาง/VFX

## 2026-11-05 — Skill rework step 1: Dancer kit + Astrid turn cycle (Claude, PR #181 feature/skill-direct-effects)
- เจ้าของ: นักเต้นมีแต่ลดคูลดาวน์และ "OP" → วิเคราะห์ทุกตัว (artifact "ตรวจสกิล Fateweave" + "คลังกลไกสกิล") แล้วสั่งทำขั้นแรก
- กฎ: cadence โล่ 8 + เร่งคูลดาวน์ใต้เพดาน; duet ตีตาม 40%; จังหวะจากสกิลเพื่อน → closingstep ตีทุกตัว 6+6/จังหวะ; rounddance โล่ 5; deepbeat ลดท่าถัดไป 40%; echofoot +จังหวะ; turncycle ตี 8; ไม่มีการเลือกสกิล/ผู้รับคูลดาวน์อีก; เซฟ v48
- Tests: typecheck/lint/unit 1604, Playwright saint-dance-fx 20/20 + roster-batch1 + world/unit-a7 ที่เกี่ยว, sim 28/28 (Cerise ทุกกิ่งชนะครบ HP ขึ้น) — [README](../validation/skill-rework-2026-11-05/README_TH.md)
- ต่อมา (เจ้าของสั่ง): rounddance โล่ 8 + จังหวะต่อเพื่อน, deepbeat ทั้งทีมลด 40% รอบนี้ + ก้าวสวน (ไม่เสียเปล่า) — ใช้แบบเฉพาะสถานการณ์ใน sim
- เปิด: ขั้นถัดไปตามลำดับในหน้า artifact (Wynne → Garran → Astrid → Toma → ปรับเล็ก) รอเจ้าของสั่ง

## 2026-11-05 — Damage-kind badge on enemy intents (Claude, branch feat/damage-type-badge)
- เจ้าของขอสัญลักษณ์/ป้ายเตือนกายภาพ vs เวท: การ์ดเจตนา (ไอคอนสี+ขอบ+ป้ายคำ) และมุมรูปศัตรูในคิวเทิร์น; ป้ายที่การ์ดฮีโร่ที่ถูกเล็งเจ้าของสั่งตัด; "เวท" แทน "พลังงาน" ในคำแสดงผลของเจตนา; ไม่เปลี่ยนกฎ/เซฟ/ตัวเลข
- Tests: typecheck/lint/unit ผ่าน; Playwright combat/team-five/battle-shots 54 ผ่าน; หลักฐาน [`damage-kind`](../validation/damage-kind/README_TH.md)


## 2026-11-05 — Painted skill tomes in game (Claude, branch art/tome-icons)
- ภาพตำรา 9 แบบจาก ART-UI-PROGRESS-001 (เจ้าของสั่งนำเข้า) → atlas 3×3 lossless 152 KB; ใช้ที่ชิปค่าใช้จ่ายเพิ่ม Lv สกิลและรายการตำราของค่าย; ไม่เปลี่ยนกฎ/เซฟ/ตัวเลข; ของอื่นในแพ็กเกจยังไม่ผูก
- รอบ 2: แก่นรอยแยก (ชิปค่าใช้จ่าย + สรุปเดินทาง) และช่องดาวในหน้าอัปดาว; เศษดาว/เหรียญเกียรติยศ/ไข่-อาหารสัตว์/แถบช่องดาวยังไม่ผูก (ไม่มีฟีเจอร์รองรับ — เหตุผลใน README)
- Tests: typecheck/lint/unit 1604 ผ่าน; Playwright unified-skills/character/skill-audit 22/22; หลักฐาน [`tome-art`](../validation/tome-art/README_TH.md)

## 2026-11-05 — UI frame group 2: team sheet + character window (Claude, branch feat/ui-frame-group2)
- แผ่นทีมและหน้าต่างตัวละคร (5 แท็บ + review) เต็มจอบนจอแนวตั้ง แถบนำทางซ่อน (Q1 = R1 การตัดสินใจของ Claude ตามที่เจ้าของมอบ); หัวเดียวกับแผ่นบริการ (ปิด 333,11), ปุ่มหลัก/รอง token เดียวกัน, ข้อความ ≥12px ในหน้าต่าง (ยกเว้นแถบสลับตัวละคร/ตารางทีมที่ห้ามแตะ)
- padding ใช้ `--star-safe-top/bottom` เดิม + box-shadow เติม navy; เทสต์ที่ยืนยัน "แถบนำทางเห็นได้" ปรับเป็น "แผ่นเต็มกรอบ แถบซ่อน" (portrait-keyboard, world, team-character-navigation)
- Tests: typecheck/lint/unit 1602 ผ่าน; Playwright เฉพาะที่เกี่ยว 149 ผ่าน + 2 ที่พังแก้แล้วผ่าน; audit 390/320 — [`ui-frame-group2`](../validation/ui-frame-group2-2026-11-05/README_TH.md); ยังไม่ทดสอบเครื่องจริง
- เปิด: กลุ่มถัดไป = ไดอะล็อกแผนที่ (หน้าต่างตัวละครบนแผนที่ใช้หัวใหม่แล้ว แต่ layout ยังเป็นของกลุ่มแผนที่) + กรอบสรุป/รางวัล

## 2026-11-05 — UI frame group 1: service-sheet header + buttons (Claude, PR #173 claude/ui-frame-group1)
- ทุกแผ่นบริการค่ายใช้หัวเดียวกัน (ปิด 333,11 ทุกแผ่น/ทุกขนาด, ย้อนกลับซ้าย, หัวเรื่องชิดซ้าย 19px) ปุ่มหลักทอง 1 แบบ ปุ่มรอง 1 แบบ ค่าเป็น token (`tokens.css`, `src/ui/sheet-frame.css` โหลดท้ายสุด)
- Q1–Q3: เจ้าของมอบให้ Claude เลือก → R1 (บันทึกเป็นการตัดสินใจของ Claude); Q2+Q3 ทำในกลุ่มนี้, Q1 (เต็มจอซ่อนแถบนำทาง) ไปกลุ่มหน้าต่างตัวละคร+แผ่นทีม
- กรอบช่างคงเยื้อง 8px (ART-UI-UX-002, เทสต์ safe-area); ลองชิดขอบแล้วเทสต์พัง 16 → ถอย ใช้ padding หัวชดเชย; หัวเรื่อง/ฟอนต์ปุ่มเป็น rem เพราะ `forge-text-large` อาศัยหัวขยายตามตัวอักษร
- Tests: typecheck/lint/unit 1602/build ผ่าน; Playwright หน้าที่เกี่ยว 97/97 + รอบหลัง Q3 54/54; audit ก่อน/หลัง 3 ขนาด — หลักฐาน `docs/validation/ui-frame-group1-2026-11-05/README_TH.md`
- เปิด: กลุ่มถัดไป = หน้าต่างตัวละคร (หัว + Q1 + ตัวอักษร ≥12px) แล้ว ไดอะล็อกแผนที่/สรุป; ปุ่ม "กลับไปป้ายจ้าง" ในเนื้อหายังเป็นปุ่มข้อความ

## 2026-11-05 — ART-UI-LANGUAGE-001 closed; new UI frame scope (Claude)
- Codex PR #171 (2 รอบ): SHA/ขอบเขต/verify ผ่าน แต่ภาพก่อน/หลังพบว่าต้นแบบรื้อเนื้อหาหน้า (ไอคอนสกิลวาด→ไอคอนเส้น, ตารางจัดทีมหาย, การ์ดรางวัล/ชิปสรุปหาย, ชื่อศัตรูถูกตัด) → ปิดไม่ merge (เจ้าของ "ดำเนินการได้")
- ขอบเขตใหม่ที่เจ้าของอนุมัติ: Claude ทำในเกมเองทีละกลุ่ม เฉพาะหัวหน้าต่าง/ปุ่ม/12px ในแผ่นบริการ+ตัวละคร/token ไม่แตะ HUD ต่อสู้-แผนที่; รายละเอียดหัว `docs/handoffs/ART-UI-LANGUAGE-001.md`
- บทเรียน: verify ผ่านไม่ใช่ภาพผ่าน; งาน UI DOM/CSS ให้ Claude ทำ, Codex ทำภาพวาด
- Tests: เอกสารเท่านั้น (`git diff --check`, agent-context)

## 2026-11-05 — UI language audit + Codex brief ART-UI-LANGUAGE-001 (Claude, branch claude/ui-language-audit)
- เจ้าของสั่งให้ภาษาภาพ UI ทั้งเกมเป็นแนวเดียว: Claude ตรวจ 55 ผิวหน้า × 3 ขนาด (390×844/650, 320×568) บนฐาน c5e57ce + PR #166/#167/#168 (merge ในเครื่องเท่านั้น) ไม่แก้ src/
- พบ: หัวหน้าต่าง 9 แบบ ปุ่มปิด 5 ตำแหน่ง/2 รูปทรง ย้อนกลับ 3 แบบ ปุ่มหลัก 13 แบบ ปุ่มรอง 16 แบบ; CSS font-size 638 จุดใช้ token 1, radius 310/21; ข้อความ < 12px ในตัวละคร/HUD แผนที่/ต่อสู้ (7–11px); แผ่นบริการทับแถบนำทางไม่เท่ากัน; กรอบทองเฉพาะช่าง
- หลักฐาน `docs/validation/ui-language-audit-2026-11-05/README_TH.md` (43 ภาพ + sheets + surfaces.json); สคริปต์ `tests/browser/ui-language-audit.spec.ts` (ข้ามใน CI, ตั้ง UI_AUDIT) + `scripts/ui-language-audit.py`
- Brief `docs/handoffs/ART-UI-LANGUAGE-001.md`: สเปก component 8 ชิ้น + ต้นแบบกลุ่ม C–H, เกณฑ์วัดได้ 10 ข้อ, คำถามเจ้าของ Q1–Q4 (Claude แนะนำ R1; เจ้าของยังไม่เลือก) ไม่ต้องมีภาพ/ไอคอนใหม่
- Tests: typecheck, eslint ไฟล์ spec, รัน audit spec 3/3 (Chromium headless เท่านั้น ไม่ใช่เครื่องจริง); git diff --check
- เปิด: Codex เริ่มหลัง #166–#168 merge; หน้า event/draft/แพ้ ยังไม่มีภาพก่อน

## 2026-11-05 — A12 intake: Kael/Wynne/Astrid battle bodies (Claude, branch claude/a12-intake)
- นำเข้า 22 strips จาก PR #157 (21 ที่รับ + astrid-deflect R2) เป็น atlas `kael_a12`/`wynne_a12`/`astrid_a12` (lossless ×.42, ในงบ); registry clips ใน `unit-frames.ts`; `STILL_ONLY` ว่าง; coverage regenerate. ไม่แตะ rules/save/balance.
- Claude ตัดสินรับภาพตาม delegation 2026-11-04 (ไม่ใช่ owner approval); R2 deflect ผ่านตาภาพ review.
- Tests: tsc, `tests/unit-a12.test.ts` (13), presentation-coverage/encounter-budget ผ่าน; 19 คลิป 390px (Chromium emulation) ดู `docs/combat-presentation/unit-a12-slice/README_TH.md`.
- เปิด: circle/toll/dial ยังไม่มีคลิปในเกม; เจ้าของยังไม่ดู motion; PR #157 ไม่ merge (ปิดได้เมื่อแน่ใจ).
