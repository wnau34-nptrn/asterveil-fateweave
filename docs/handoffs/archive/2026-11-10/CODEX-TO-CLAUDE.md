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


Older entries moved verbatim to [archive/2026-11-08/CODEX-TO-CLAUDE.md](archive/2026-11-08/CODEX-TO-CLAUDE.md).
