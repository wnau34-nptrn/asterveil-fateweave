# ผลตรวจ animation และ VFX ครบ catalog ปัจจุบัน — 2026-10-29

> **สถานะหลังแก้ (2026-10-30):** ดู [ผลแก้ AV02–AV08](../animation-vfx-audit-fixes-2026-10-30/README_TH.md) — AV03/04/05/07/08 แก้แล้ว, AV02/AV06 บางส่วน (brief Codex ค้าง), AV01 แยกงานอัศวิน รายงานด้านล่างคงเป็นหลักฐานก่อนแก้

**ผล: ยังมีจุดต้องแก้ ไม่ใช่ผ่านคุณภาพทั้งเกม** รอบนี้รัน renderer จริงครบ 36 visual identities (14 ฝ่ายเรา / 22 ศัตรู), 73 ActionIds และ 36 ชื่อ intent / 48 รูปแบบเมื่อแยก phase, charge, AoE และ unstoppable บนสาขา `feature/fateweave-initial-prototype` source `157d6855808edbcf055929cd00f1e0b1dbfea91e` ไม่ใช่การอ่านโค้ดหรือ atlas อย่างเดียว

เริ่มอ่าน [งานส่งต่อ Claude](CLAUDE_HANDOFF_TH.md), [ตารางรายตัว/รายท่า](COVERAGE_TH.md), [CSV](coverage.csv), [ข้อมูลเฟรม/events](coverage.json), [ผลตรวจการบันทึก](validation.json) และ [บัญชีคลิป](CLIPS_TH.md)

## ตรวจอะไรแล้ว

| ชุด | จำนวน | วิธีตรวจ |
| --- | ---: | --- |
| คู่ตัวละคร–สกิลฝ่ายเรา | 98 | ทุกตัว 7 ท่า รวม 73 ActionIds ไม่ซ้ำ; idle, windup, contact, recovery, settle |
| รูปแบบท่าศัตรู | 48 | ทุก 22 identities; ชื่อเดียวที่ต่าง phase/AoE/charge/unstoppable แยกกรณี |
| ฝ่ายเรา hit / block / dodge / down | 56 | 14×4; ตรวจ event จริงว่าตกที่ตัวที่ต้องการ ไม่ถือว่ามี screenshot แล้วเท่ากับทดสอบอาการนั้น |
| ศัตรู hit / down | 44 | 22×2; ไม่สร้าง dodge/block ให้ศัตรูที่ไม่มีกลไกนั้น |
| Boss phase / summon | 4 | Rift Warden สอง phase, Matriarch, Vanguard Captain |
| Counter | 4 | Aegis Guard, Lyra Parry, Garran Brace/War Cry |
| Fast / reduced intensity / OS reduced motion | 108 | โหมดละ 36 ตัวอย่าง ครบทุก identity; เป็น smoke ด้าน state, frame policy และ cleanup ไม่ใช่ตรวจทุกสกิลทุกโหมด |
| **รวม** | **362** | **3,186 screenshots ต้นทาง; filmstrip หนึ่งไฟล์ต่อกรณี** |

ชุดหลัก 250 กรณีและ counter 4 กรณีตรวจภาพ strip และภาพสนาม contact แล้ว ข้อมูลโหมด 108 กรณีแยกเป็น smoke ใน coverage ทุกแถว ไม่เหมารวมว่าได้รับ motion approval บันทึกคลิปเวลาเดินจริง 72 กรณี ครอบคลุมทุก identity พร้อมท่าที่ใช้ body clip ต่างกันและประเด็นที่พบ ตรวจเฟรม/PTS และคงเวลาต้นทาง ไม่ทำ slow motion หรือ interpolate

## ประเด็นที่ต้องแก้ตามลำดับ

### AV01 · P1 — Aegis สัดส่วนเปลี่ยนทั้งเจ็ดท่า ไม่ใช่เฉพาะ attack

`attack, guard, bash, rally, bulwark, challenge, rouse` เปลี่ยนจาก seed หัวเล็ก/ตัวสูงเข้าสู่ generated poses หัวกว้าง/ลำตัวเตี้ย แล้วกระโดดกลับเมื่อคืน seed ดู [attack](strips/hero-guardian-attack.webp), [bash](strips/hero-guardian-bash.webp), [rally](strips/hero-guardian-rally.webp) และ [หลักฐานจากเกมแคมเปญจริงรอบก่อน](../animation-visual-audit-2026-10-29/README_TH.md)

ต้นเหตุอยู่ใน pixels ของ seed กับ generated poses ที่ anatomy ไม่ตรงกัน `incoming/ART-UNIT-ANIMATION-A2-001/build_assets.py` เทียบ silhouette height/sole แล้วล็อก exact idle เป็น endpoint จึงรักษาความสูงรวมแต่ไม่รักษาสัดส่วนหัว/คอ/ไหล่ การแก้ต้องเริ่มจาก model sheet/ภาพต้นทางและ normalization ไม่ขยาย idle ให้ผิดตามท่าโจมตีหรือเพิ่ม dissolve กลบรอยต่อ

**รับเมื่อ:** รูปลักษณ์คงที่ตลอด seed→pose→seed ทั้งเจ็ดท่า และ hit/block/down/counter หลังแก้; การย่อ/หมุนที่ตั้งใจยังอยู่, contact/end เดิม

### AV02 · P2 — มี atlas แล้ว แต่บางท่าของ Lyra และ counter ยังไม่มี gesture ของการออกแรง

Lyra ใช้ sequence จริงใน `attack/execute` แต่ `mark/finisher/lunge/parry/sweep` primary sprite อยู่ frame 0 ระหว่าง action มีเพียงการเลื่อน/หมุน body ดู [finisher](strips/hero-tracer-finisher.webp), [lunge](strips/hero-tracer-lunge.webp), [sweep](strips/hero-tracer-sweep.webp) และ [parry counter](strips/counter-tracer-parry.webp) ปัญหาชัดที่สุดในท่าโจมตีที่ควรเห็นการเคลื่อนอาวุธ; Mark เป็นท่าที่ควรกำหนด gesture การร่ายให้เหมาะสม ไม่ใช่บังคับให้ทุกท่าต้องฟันดาบ

`src/game/visuals/unit-frames.ts:22` map เพียง attack/execute; ค่า pose ใน `unit-animation-map.ts` ไม่ใช่การมี frame sequence แล้ว ส่วน Garran Brace/War Cry มี counter event จริง แต่ร่างกายเล่น hurt เป็นหลัก ไม่เห็น thrust/riposte ของผู้สวน ดู [Brace counter](strips/counter-garran-brace.webp), [War Cry counter](strips/counter-garran-warcry.webp) เพราะ reaction priority ให้ incoming hit ชนะ counter ต่างจากข้อยกเว้นที่ทำให้ Aegis

**รับเมื่อ:** map clip ให้สอดคล้องการเคลื่อนไหวจริง; ใช้ art ที่มีได้เมื่อท่าตรงกัน มิฉะนั้นส่ง brief แก้ภาพ ห้ามเอา gesture ผิดชนิดมาใช้เพียงให้ไม่เป็น frame 0; counter อ่านได้ว่ารับและสวนในหน้าต่างเดิม ไม่สร้าง hit เพิ่ม

### AV03 · P1 — Mira/Toma โจมตีธรรมดามี body ยิง/ขว้าง แต่ VFX เป็นดาบ

ดู [Mira attack](strips/hero-mira-attack.webp), [Toma attack](strips/hero-toma-attack.webp), ภาพสนามใน `review/vfx-overview-hero-2.jpg` และ event/FX frame ใน coverage: basic attack เข้า `blade-fx` ซึ่งรับ `attack` โดยไม่ดู identity/weapon; projectile/alchemy routes ไม่รับ basic attack ทำให้ไม่มี arrow/flask flight ที่เข้ากับ body

**รับเมื่อ:** presentation profile แยก basic attack ตามอาวุธ/identity; มิร่ายิง โทมะขว้าง เอฟเฟกต์เริ่มจากจุดอาวุธ/มือและเกิดผลที่ผู้รับจริง ไม่เพิ่มชนิด damage, ActionId, จำนวน hit หรือเปลี่ยน attack ของทุกอาชีพเป็นลูกธนู

### AV04 · P1 — Mira: projectile ออกไปขณะ body ยังง้างธนู และจุดเริ่มต้องเทียบ bow landmark ใหม่

Hinder contact=263ms ใน fixture นี้: 66ms มี `hinder_flight` แล้ว ขณะ body กำลังผสม frame1/2; 171ms projectile อยู่กลางอากาศ แต่ body ยังเป็น frame3 ง้างธนู; 251ms body frame4; body release/frame5 จึงตามมาที่ contact ดู [66ms](evidence/mira-flight-early.jpg), [171ms](evidence/mira-flight-windup.jpg), [หลัง contact](evidence/mira-flight-contact.jpg) และ clip `hero-mira-hinder`

`projectile-fx.ts:47` เริ่ม travel หลัง .22×contact (~58ms) ขณะที่ body clip ใช้ damage contact เป็นขอบ release จึงเป็นคนละนาฬิกา; ในภาพช่วงเริ่ม VFX อยู่เหนือจุดลูกธนูบน bow ด้วย ให้เทียบจุดกำเนิดกับ nock/มือที่เห็นจริง ไม่ตรวจสูตร anchor เทียบสูตรเดียวกันอย่างเดียว หกท่า projectile ของ Mira ใช้ routing นี้ร่วมกัน ส่วน Knives ต้องประสานกับงาน gesture ของ Sefa ใน AV06

**รับเมื่อ:** มี cue ปล่อยของ body ตรง flight start, ไม่มีลูกธนูหลุดก่อนคลายสาย, จุดเริ่มติดอาวุธจริงทั้ง normal/fast, impact ยังตรง damage contact เดิม; ไม่เลื่อนผล resolver ให้ตามภาพที่ผิด

### AV05 · P2 — Generic hit flash ปิดรายละเอียดตัวละครด้วยสีขาวทั้งตัว

ยืนยันกับ Seed Spark, Spore Hex, Rift Bolt, Shard Burst ฯลฯ และสกิลที่ยังใช้ generic route เช่น Lio Note/Finale และ Saint: ที่ contact+35ms ผู้รับกลายเป็น silhouette ขาว หน้า/ชุดหาย ก่อนกลับมาที่ประมาณ +100ms ดู [ศัตรู](evidence/enemy-white-flash.jpg), [Saint](evidence/saint-white-flash.jpg) และ overview ทั้งฝ่ายเรา/ศัตรู โหมด quiet ยังคง flash นี้ในกรณีที่ตรวจ เพราะโค้ดปิดด้วย OS reduced-motion เท่านั้น

`BattleScene.ts:583–586` ใช้ `TintModes.FILL` สีขาวเมื่อไม่เข้า painted family และล้างหลัง90ms ต่างจาก multiply tint ของ painted effects

**รับเมื่อ:** อ่านใบหน้า/ชุดได้ระหว่าง hit ใช้ tint/rim/impact ที่รักษารายละเอียดและลดความเข้มตาม preference; hit/block/dodge/down และผลจริงไม่เปลี่ยน ไม่ใช้แสงขาวกลบความต่างของสกิล

### AV06 · P2 — 18 ตัวและ 19 ActionIds ยังเป็นภาพนิ่ง/เอฟเฟกต์ generic ใน runtime

**6 ฝ่ายเรา:** Sefa, Lio, Metta, Thiran, Lalin, Wila — ตรวจครบ7ท่าต่อตัวแล้ว body ส่วนใหญ่ยังเป็น idle image โยก/เลื่อน ไม่ใช่ปัญหา texture โหลดไม่สำเร็จ **12 ศัตรู:** Raider, Brute, Golem, Rift Weaver, Rift Channeler, Rift Wisp, Shard Crawler, Spore Puff, Matriarch, Juggernaut, Sentinel, Captain ทั้ง action/hit/down ยังไม่มี frame registry เฉพาะ จึงมีกรณี HP0 แต่ยังเป็นเงาท่ายืน ไม่ใช่ collapsed pose ดูตารางรายตัว/รายท่าและ review reaction

**19 ท่าที่ไม่มี painted family เฉพาะ:** valor, finale, dread, note, solo; evade, decoy; saintstrike, communion, saintarc, vowstrike, sharewound, lastlight; cadence, duet, rounddance, deepbeat, echofoot, closingstep ตัวเลขนี้เป็นช่องว่างหลัง C5.7 และ command VFX เข้าเกมแล้ว ไม่ใช่ baseline เก่า32ท่า Mend มี healing family แล้วจึงไม่รวม

**รับเมื่อ:** intake ตาม W4–W8 โดยใช้ภาพที่มีอยู่แล้วตาม owner decisions, ตรวจสัดส่วน/อุปกรณ์/sole/ทิศ/การคืนท่า และ collapsed frame; ระบุ shared design ที่ตั้งใจและ fallback ที่ยังค้างแยกกัน ไม่สร้างผล heal/cooldown/damage ปลอมเพื่อให้มี VFX

### AV07 · P1 — บอสยังไม่แยกภาษา charge/release/phase/summon ชัดบนตัวบอส

ตรวจ Gather Thorns/Thorn Tempest, Rift Gathering/Cataclysm/Wave และ phase/summon จริงจาก resolver แล้ว: body ยังเป็นภาพนิ่งโยก, physical ใช้ slash ร่วม, energy ใช้ ring/trail ร่วม; world-space cue บนตัวบอสไม่ค้างตลอดช่วงรอปล่อยท่า มี **HUD intent/ข้อความเตือนอยู่แล้ว** ประเด็นนี้ไม่ได้หมายความว่าเกมไม่มีคำเตือนเลย ดู `review/vfx-overview-foe-2.jpg`, `review/vfx-overview-phase-0.jpg`, strip ของ Matriarch/Sentinel และคลิป phase

**รับเมื่อ:** signature/charge cue ผูกกับ state จริง, แยก normal กับ unstoppable ด้วยรูปทรง, ค้างระหว่างเทิร์นแล้วล้างเมื่อ release/cancel/down/ออกสนาม; คืน cue หลัง repaint/reload ได้; summon/phase ไม่สร้าง damage ปลอม, AoE เฉพาะผู้รับจริง; Captain War Cry ไม่ถูกแปลงเป็น buff และ Stampede/Horn Charge ไม่เพิ่ม charge turn เอง

### AV08 · P2 — Caption ทับใบหน้า และ down reaction จางตั้งแต่เริ่มล้ม

คำว่า “คุ้มกัน”, “แนวป้องกัน”, “ยั่วยุ”, “เตรียมสวน” ทับหัว/หน้าในภาพที่ขนาด390px ดู [Brann Taunt](evidence/brann-caption.jpg), [Aegis Guard](evidence/guardian-guard-caption.jpg) จาก `caption()` ที่วางเหนือ centre anchor ตามค่าคงที่ ไม่ใช้ head bounds ของ frame ปัจจุบัน อีกทั้งการลด body alpha เป็น .28 ทันทีที่ HP0 ทำให้ลำดับ down อ่านยากก่อนจบการล้ม ดู [Aegis down](evidence/guardian-down-faint.jpg) นี่เป็นข้อสังเกตด้าน readability ไม่ใช่อ้างว่า state ตายผิด

**รับเมื่อ:** ข้อความหลบ face/weapon/HP ที่ render จริงและไม่ชนตัวข้างเคียง; down motion อ่านออกก่อนเข้าสู่ corpse emphasis ที่ตั้งใจ คง HP0/command/result เดิมและเคารพ reduced motion ไม่เพิ่มเวลาล็อกเทิร์น

## สรุปเป็นรายกลุ่ม

| กลุ่ม | ผลจากภาพที่ตรวจ |
| --- | --- |
| Aegis | AV01 ชัดในทั้ง7ท่า; เพิ่ม AV08; ไม่ผ่านด้านสัดส่วน |
| Lyra | attack/execute มีเฟรม; อีก5ท่าใช้ transform fallback; counter มี hit reaction แต่ไม่มี riposte gesture เฉพาะ |
| Eira / Seren | ไม่พบ head-pop เด่นแบบ Aegis ใน sampled normal actions; ยังมี caption/generic-hit readability และ reaction fallback บางชนิด ไม่ได้ให้ motion approval ใหม่ |
| Mira / Toma | body clips เล่นได้ แต่ AV03; Mira เพิ่ม AV04 |
| Garran / Brann | ไม่พบ head-pop เด่นแบบ Aegis ใน sampled normal actions; Garran counter อ่านร่างกายไม่ชัด และมี AV08 |
| Sefa / Lio / Metta / Thiran / Lalin / Wila | AV06; Bard/Saint/Dancer หลายท่าเพิ่ม AV05/AV08 |
| ศัตรู animated10ตัว | โจมตี/hit/down มี sequence; generic hit/signature ยังต้องแก้ตามประเภท ไม่ถอน approval art เดิมจากการมีภาพใหม่ |
| ศัตรู fallback12ตัว | AV06; boss เพิ่ม AV07; down มักยังเป็นเงาท่ายืน |

## วิธีรันและข้อจำกัดที่ต้องคงไว้เมื่ออ่านผล

- ใช้ BattleUI, BattleScene, UnitAnimation, VFX modules และ `resolveCommand` จริง ผ่าน audit fixture ที่เลือก actor/loadout/HP/SPD, phase และสถานะเริ่มต้นเพื่อให้เรียกแต่ละท่าได้ซ้ำ **ไม่แต่ง BattleEvent และไม่แก้ production core/renderer** เป็นการตรวจ presentation ไม่ใช่เดินแคมเปญทุกด่านหรือทดสอบ balance
- “resultEqual/saveStable” ใน manifest หมายถึง state เท่ากับ expected resolver และ snapshot ที่ commit ลง test key `audit-committed` ไม่เปลี่ยนเพิ่มระหว่าง presentation ไม่ใช่รับรอง expedition-save reload/replay ทุกสถานการณ์ การยืนยัน Aegis จากเกมแคมเปญจริงอยู่ในรายงานรอบก่อนที่ลิงก์ไว้
- ตรวจทีละจังหวะด้วย Playwright clock; ภาพ/filmstrip เป็น sampled render frames ไม่ใช่ทุกเฟรมของทุก transition บันทึก frames/alpha/FX/events/timing ไว้ใน coverage; filmstrip ใช้ crop/scale คงที่ภายในกรณี ไม่ปรับขนาดท่าแต่ละเฟรมเพื่อซ่อนอาการ
- Browser runtime/js ไม่มีในเซสชัน ใช้ Playwright + system Chromium + SwiftShader ที่390×844; ไม่ใช่มือถือจริง/iOS Safari ไม่รับรอง device FPS หรือความลื่นจาก host นี้ รายละเอียด frame gaps ของคลิปเวลาเดินจริงอยู่ใน live-validation และ proof รายคลิป คลิปมีไว้ตรวจ sequence/เหตุการณ์และเทียบเฟรม รักษา timestamps เดิมแม้ host จับภาพได้ไม่สม่ำเสมอ
- ไม่ตรวจ exhaustive talent/gear/formation combinations หรือทุก viewport/mode ต่อทุกสกิล; 108 mode cases เป็น smoke ที่แยกไว้ ไม่ใช้ผลเทสต์แทน visual approval; ไม่ได้ตรวจงานภาพ incoming ที่ยังไม่ใช้ในเกมทั้งหมด
- รอบนี้เป็น audit/report/handoff เท่านั้น ไม่มี production art, gameplay, save, balance, timing หรือ owner decisions เปลี่ยน ไม่มีปัญหาใดถูกประกาศว่าแก้แล้ว

ไฟล์ `repro/` เก็บ audit entry และตัวจับหลักฐานที่ใช้ ให้คัดลอก entry กลับไปชื่อ `audit-runtime.html/.ts` ที่ root ของ checkout ชั่วคราวตามคำอธิบายใน repro README แล้วใช้ dependency ของโปรเจกต์ การทดสอบในหน้านี้ไม่ถูกเพิ่มเป็น production entry หรือ gameplay feature
