# ผลแก้ animation/VFX ตาม audit 2026-10-29 (AV02–AV08, ยกเว้นอัศวิน)

สาขา `claude/av-audit-fixes` → PR [#113](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/113) เข้าสาขาเกม `feature/fateweave-initial-prototype`
ฐานก่อนแก้ ("before") = HEAD สาขาเกม `78574820df976778345948328a378f44fdcd74b3` (ใหม่กว่า audit `ae2d7af`/source `157d685` และมี Aegis anatomy hold แล้ว) · หลังแก้ ("after") = SHA ใน [`source.json`](source.json)
หลักฐาน runtime ใช้ harness ของ audit เอง (`../animation-vfx-full-audit-2026-10-29/repro/`) ที่ 390×844 กับ BattleUI/BattleScene/resolveCommand จริง เทียบกรณีเดียวกันทั้งสองฝั่ง ผลทุกกรณี state = resolver ที่คาด, snapshot ที่ commit ไม่เปลี่ยนระหว่าง presentation, ไม่มี pageerror

**ขอบเขตที่ยกเว้น:** AV01/Aegis ไม่แตะ — ไม่เปลี่ยนภาพ seed/raw/atlas, mapping หรือ normalization ของอัศวิน; `anatomyHold` จาก 7857482 คงไว้ (counter-guardian-guard ก่อน/หลัง = frame 0 นิ่ง + procedural เหมือนกัน, atlas `aegis_a2` ไม่ถูกโหลด) โค้ดร่วมที่มีผลถึงอัศวิน: caption placement (AV08), down dim, hit lift (AV05) — ทั้งสามเป็นการแสดงผลทั่วไป ไม่แตะภาพ/ท่าของอัศวิน

**ไม่เปลี่ยน:** rules, save, content, balance, ActionId, จำนวน hit, logical contact/end (`src/ui/battle-playback.ts` ไม่แตะ) — ตารางเวลา contact/end ก่อน/หลังเท่ากันทุกกรณีที่จับ

## สถานะราย finding

| Finding | สถานะ | สรุป |
| --- | --- | --- |
| AV01 Aegis | **นอกขอบเขต** | เจ้าของส่งงานอัศวินแยก; รักษา hold เดิม |
| AV02 Lyra/Garran gesture | **แก้บางส่วน** | finisher/sweep → ฟัน, lunge → แทง, riposte ของ Lyra (12→13) และ Garran (30→5→6) ในหน้าต่าง reaction เดิม; **ค้าง:** Mark และ Parry stance ไม่มีภาพที่ตรงชนิด → brief [`CODEX-AV02-LYRA-GESTURES-TH.md`](../../handoffs/CODEX-AV02-LYRA-GESTURES-TH.md) (ยังไม่ส่ง Codex) |
| AV03 basic attack ของ Mira/Toma | **แก้แล้ว** (รอเจ้าของดู motion) | Mira ยิงลูกธนูธรรมดา, Toma ขว้างขวด (วาดด้วยโค้ด ไม่ใช้ภาพสกิล) หนึ่ง cue ต่อ event จริง; อาชีพอื่นยังใช้ดาบ |
| AV04 projectile ออกก่อนปล่อย | **แก้แล้ว** | flight เริ่มที่เฟรมปล่อยของร่างกาย (`RELEASE_AT` .55): Mira 5/13/26, Toma 5, Sefa knives 26 จากปลายลูกธนู/มือที่วัดบนเฟรมปล่อย; contact/end เดิม |
| AV05 white flash | **แก้แล้ว** | FILL ขาว → ADD lift (อุ่น/ม่วง) รักษาหน้า/ชุด, ลดครึ่งใน quiet; route ที่มี painted family ใหม่ (foe signature, saint/dance, boss) ใช้ multiply tint |
| AV06 fallback 18 ตัว / 19 ActionIds | **แก้ส่วนใหญ่** | ดูตาราง AV06; **ค้าง:** Lalin/Wila บาง strip ไม่ผ่านด่านสัดส่วน → brief [`CODEX-A7-DANCER-REDRAW-TH.md`](../../handoffs/CODEX-A7-DANCER-REDRAW-TH.md); การเลือก candidate ที่เจ้าของยังไม่ระบุใช้ “ตาม Codex แนะนำ” (สมมติฐาน) |
| AV07 boss charge/release/phase/summon | **แก้แล้ว** (รอเจ้าของดู motion) | ART-VFX-BOSS-SIGNATURE-001 + hold ค้างจาก state จริง แยกรูปทรง, ล้างตาม lifecycle, คืนหลัง reload/resize |
| AV08 caption / down | **แก้แล้ว** | caption หลบหน้า/HP/ป้ายชื่อ/ตัวอื่นจาก bounds จริง; ตัวที่ล้มเห็นท่าล้มเต็มก่อนจางภายในเวลาเดิม |

ทุกข้อ **ยังไม่ยืนยันบนมือถือจริง/iOS Safari** (Chromium SwiftShader เท่านั้น) และ **ยังไม่ได้รับการอนุมัติ motion จากเจ้าของ** ผลเทสต์/CI ไม่ใช่การอนุมัติ

## หลักฐานราย finding

ภาพทั้งหมดเป็นเฟรม runtime จริงที่ 390px จาก controlled clock (เวลาเทียบจุดเริ่ม stage; c = contact)

### AV03 — [av03-before-after.jpg](av03-before-after.jpg)
ก่อน: ฟันดาบที่องครักษ์ทั้ง Mira และ Toma · หลัง: ลูกธนู/ขวดออกจากอาวุธที่เฟรมปล่อยและตกที่ผู้รับจริงตอน contact (210ms), เลข −13/−9 อยู่ข้างตัว ไม่ทับหน้า

### AV04 — [av04-frames.md](av04-frames.md), [av04-hinder.jpg](av04-hinder.jpg)
เฟรมร่างกายจาก snapshot (ก่อน → หลัง): Hinder 66:f1/171:f3/251:f4 → 66:f2/171:**f5**/251:f5 (ปล่อยที่ 145ms = flight start) · Volley 205:f11 → **f13** · Disengage 182:f24 → **f26** · Knives (Sefa) → f26 ที่ .55 · Toma 137:f3 → **f5** · contact/end เท่าเดิมทุกท่า

### AV02 — [av02-frames.md](av02-frames.md)
finisher/sweep/lunge ก่อน = frame 0 ตลอด → หลัง 1→2→3→5→4…/9→11→12→13…; counter Lyra ก่อน hurt 17/18 → หลัง 12/13; Garran ก่อน 17/17 → หลัง 30/5; Mark/Parry stance ยัง frame 0 (ค้าง brief); Aegis counter เท่าเดิม (hold)

### AV05 — [av05-before-after.jpg](av05-before-after.jpg), [av05-generic-lift.jpg](av05-generic-lift.jpg)
ก่อน: Aegis/องครักษ์กลายเป็นเงาขาวที่ contact+35ms · หลัง: หน้า/เกราะอ่านได้ (Seed Spark/Spore Hex ด้วยชั้น foe signature, Saintstrike ด้วย saint layer) และ route generic ที่ยังเหลือ (Shadow Knife) ใช้ lift ม่วงอ่อน ลดลงใน quiet

### AV07 — [av07-hold.jpg](av07-hold.jpg), [av07-release.jpg](av07-release.jpg), [av07-charge-caption.jpg](av07-charge-caption.jpg), [hold.json](hold.json), [release.json](release.json)
- hold ใช้ไฟล์ทดสอบชั่วคราวที่ขับ encounter จริง (Briar Lord, Rift Warden) ผ่าน resolver จนบอสรวบพลังเสร็จ (harness ของ audit ใช้ cycle ท่าเดียวจึงไม่มี release ให้รอ — ผลไม่มี hold ในกรณีนั้นถูกต้อง)
- Briar: วงเล็บหนามแข็ง (Thorn Tempest prepare = unstoppable) หน้าอกฝั่งฮีโร่ ไม่ทับหน้า/ชื่อ/HP; Warden: วงเล็บผลึก Cataclysm
- ค้างทุก stage ของตัวอื่น 4 คำสั่ง (`release.json`), อยู่ระหว่าง prepare ของ release, **ล้างที่ impact** ของ Tempest; Warden กด skip ระหว่าง prepare → ล้าง; reload/resize 360px → คืน; OS reduce → นิ่ง; atlas ยังไม่โหลด → วงเล็บวาดด้วยโค้ดแล้วเปลี่ยนเป็นภาพเมื่อโหลดเสร็จ
- release: ลมหนามหนึ่งชุดต่อฮีโร่ที่โดนจริงเท่านั้น; HUD banner เดิมคงอยู่
- แก้เพิ่มที่พบ: caption “รวบรวมพลัง” เคยไปอยู่ที่ฮีโร่ (เป้าในนาม) ตอนนี้อยู่ที่บอส (`av07-charge-caption.jpg`)
- unit tests: hold เฉพาะช่วง charge→release, interrupt/down/absent ล้าง, Horn Charge/Stampede ไม่มี hold, War Cry ไม่ใช่ buff และผู้รับ = event จริง, phase/charge ไม่มี damage

### AV08 — [av08-before-after.jpg](av08-before-after.jpg)
Brann Taunt: ก่อน “ยั่วยุ” บนหน้า → หลังข้างศีรษะ · Lyra/Brann ล้ม: ก่อนจาง .28 ทันทีที่ HP0 → หลังเห็นท่าล้มเต็ม 915–980ms แล้วจางก่อนจบ stage (ไม่เพิ่มเวลาล็อก)

## AV06 — ผลรายตัว

| ตัว | สถานะ | หลักฐาน |
| --- | --- | --- |
| Sefa, Lio, Rift Weaver, Spore Puff | ครบ (W4, PR #110 รวมในงานนี้) | [unit-a6](../../combat-presentation/unit-a6-slice/README_TH.md), [song/shadow](../../combat-presentation/song-shadow-slice/) |
| Metta, Thiran | ครบ 7 ActionId + hit/block/down | [unit-a7](../../combat-presentation/unit-a7-slice/README_TH.md) |
| Lalin | **บางส่วน** cadence/duet/deepbeat/closingstep; attack/rounddance/echofoot/reactions ยัง procedural | brief A7-002 |
| Wila | **เกือบครบ** ขาด echofoot และ down | brief A7-002 |
| Raider, Brute | ครบ (หันซ้ายแล้ว ไม่ flip ซ้ำ) | [unit-a10](../../combat-presentation/unit-a10-slice/README_TH.md) |
| Golem, Rift Channeler, Rift Wisp, Shard Crawler | ครบ (Wisp ท่าล้มจางตามภาพ ไม่ dim ซ้ำ) | [unit-a8](../../combat-presentation/unit-a8-slice/README_TH.md) |
| Matriarch, Juggernaut, Sentinel, Captain | ครบรวม phase (Matriarch หันซ้ายแล้ว ไม่ flip ซ้ำ; Sentinel/Matriarch ความละเอียดลดเพื่องบ 1.5MB) | [unit-a9](../../combat-presentation/unit-a9-slice/README_TH.md) |
| VFX valor/finale/dread/note/solo/evade/decoy | painted (W4 R2/R1); R3 (PR #111) รอเจ้าของเลือก | song-shadow-slice |
| VFX saintstrike…closingstep 12 ท่า | painted R1 (Claude เลือกแทน: Codex ไม่ระบุ) route ตาม event จริง; บางเลเยอร์ไม่ใช้เพราะไม่มี event รองรับ | [saint-dance](../../combat-presentation/saint-dance-slice/README_TH.md) |
| ท่าพลังงานศัตรู 10 ท่า | painted (PR #105) | [foe-signature](../../combat-presentation/foe-signature-slice/README_TH.md) |

after-capture ครอบคลุม 158 กรณี (62 กรณีเทียบ before + ทุก action/intent/hit/down ของ 18 ตัว AV06) captured 158/158 ดู [`after-results.json`](after-results.json)

งบภาพ (OD-05): atlas ตัวละคร decoded แย่สุดต่อ encounter ≈32.5 MiB (ฮีโร่ 4 ตัวใหญ่สุด + ศัตรู vanguard-captain) / ≈36.9 MiB ถ้าทีม 5; atlas VFX boss (8.5 MiB) / foe signature (7 MiB) / saint-dance โหลดเฉพาะ encounter ที่ใช้

## คลิปเวลาเดินจริง ก่อน/หลัง

[clips/](clips/) — 9 กรณี × ก่อน/หลัง (Mira attack/Hinder, Toma attack, Lyra finisher, counter Lyra/Garran, Seed Spark, Shadow Knife, Brann Taunt) จาก `live.cjs` ของ audit: เริ่มก่อน pointer-down จริง, timestamps ไม่ retime, max PTS error ≈6µs, ช่องว่างเฟรมสูงสุดตาม SwiftShader (ดู `clips/*.json`) ใช้ดู sequence ไม่ใช่วัด FPS มือถือ

## การทดสอบ

- `npx tsc --noEmit`, eslint, vitest ทั้งชุด (94 files / 1328 tests ก่อน merge saint-dance; ชุดที่เกี่ยว 289 หลัง merge), `npm run build`
- `tests/av-audit-fixes.test.ts` (10): weapon profile ตาม event จริง, release ทุกคลิป, riposte ตามข้อความ counter จริง, hit lift, boss hold lifecycle บน encounter จริง, War Cry/Horn Charge/Stampede
- Playwright ในเครื่อง: presentation + foe-signature + saint-dance 50/50 หลังแก้ lazy load; spec ของแต่ละ slice โดยผู้นำเข้า; CI full browser 4 shards บน PR
- แก้ที่พบระหว่างทาง: preload เกินขีด 32 ไฟล์ทำให้ battle หลัง reload ค้างใน spec presentation (clock หยุด) → atlas foe-signature/saint-dance โหลดเฉพาะ encounter ที่ใช้ (เหมือน boss)

## งานค้าง / ส่งต่อ

1. Codex: brief AV02 (Lyra Mark/Parry stance) และ A7-002 (Lalin/Wila) — ยังไม่ส่ง
2. เจ้าของ: เลือก/ยืนยัน candidate ที่ใช้ตามสมมติฐาน (A7 ตาม Codex แนะนำ, Saint/Dance R1, Song R2 vs R3 #111) และดู motion ทุกชุดก่อนถือว่าผ่าน
3. Rift Bolt/Veil Quake โทนมืดบนศัตรูมืด, ribbon ของนักระบำยืดยาวเมื่ออยู่ช่องบน, Rounddance/Deepbeat จาง — ข้อสังเกตจาก slice ที่ควรให้เจ้าของดู
