# ส่งต่อ ART-UI-UX-002

## 2026-11-02 — ขั้นที่7 สเปกส่งต่อครบ (ไม่แก้เกม)

เริ่มที่ [INTEGRATION_07_TH.md](INTEGRATION_07_TH.md), [briefลงมือ](integration-07/IMPLEMENTER_BRIEF_TH.md), [mapping26paths/8anchors](integration-07/runtime-map.json) และ [AC01–15](integration-07/ACCEPTANCE_TH.md) ตรวจremoteเกมล่าสุด07f95a7ผ่านGitHubแล้ว ต่อยอดflowPR135ที่เผยแพร่ ไม่เริ่มUXD-01เดิมซ้ำ ไม่mergeทั้งARTbranchและไม่คัดsimulation/fixtures/labเข้าเกม

สเปกระบุreceiptจริง/next-preview/cap/unowned/refund/returncontext, token/SVG4ไฟล์ที่นำเข้าได้, nativeframe/textreflow, regression/Pages/rollback และvisualgapcurrencyart/ornament/DPR2 ทุกACยังรอตรวจบนruntimeimplementation; prototype140/9/26ไม่ใช่ผลเกม รอบนี้มีเฉพาะเอกสารและmetadata ไม่รันทดสอบเกมหรือdeployใหม่

ปิดชุดออกแบบเชิงลึกหน้าตีบวก1–7แล้ว งานถัดไปคือimplementationภาพหน้าตีบวกบนสาขาเกมใหม่ตามbrief ขอบเขตหน้าดาว/สกิล/อุปกรณ์อื่นยังตามแผนUXD-02–08 ไม่เปิดพร้อมกันจากhandoffนี้


## 2026-11-02 — ขั้นที่6 Fidelity/responsive/keyboard เสร็จ (ไม่แก้เกม)

อ่าน [QA_06_TH.md](QA_06_TH.md): แก้เฉพาะprototypeให้กว้างถึง480, autoheightdesktopหักmargin, text-only200%/intrinsicheader/verticalidentity/reviewactions, ย้ายcostเข้าbodyเมื่อ200%และกรอบสูง<720; จอเล็ก/มือถือแนวนอนซ่อนframeพร้อมinertโดยไม่เปลี่ยนreview/bank

responsive140กรณีผ่าน(5viewport×2scale×2safe×7state/scenario), keyboard/reflow/guidance9ผ่าน, interactionเดิม26ผ่าน ไม่มีruntime/gameintegration ช่องว่างภาพที่เหลือcurrencypaintedart/รายละเอียดornament/DPR2assetต้องเก็บในhandoff ไม่อ้างpixelperfect ขั้นต่อไป7จัดสเปกนำเข้าเกมก่อนimplementationจริง


## 2026-11-02 — ขั้นที่5 ต้นแบบกดใช้งานเสร็จ (ไม่แก้เกม)

อ่าน [PROTOTYPE_05_TH.md](PROTOTYPE_05_TH.md) และprototype-05/index.html: ใช้Layout2+Material3+Decor4, fixture snapshotsจาก07f95a7 (+4ถึง20), guardreview/stale/doubleclick/Enterค้าง, picker/lock/details/returncontext; หักทุนเฉพาะin-memorysimulation มีlabreset/ขนาดจอ/scenarioและZIPbuilder ไม่โหลดruleengine/save/APIเกมในbrowser

Chromium26กลุ่มผ่านสองความสูง, cancelคืนscroll/details/focus, successcommitครั้งเดียว, staleปฏิเสธ; ไม่มีpageerror/consoleerror/externalrequest/storagewrite ภาพready2/review1/success1เป็นต้นแบบ ไม่ใช่เกมจริง ขั้นต่อไปfidelity/responsive/keyboard/ข้อความ200%และจออื่นตามขั้น6 ยังไม่merge/deployหรือขยายทุกหน้าพัฒนา


## 2026-11-02 — ขั้นที่4 Decorative assets เสร็จ (ไม่แก้เกม)

อ่าน [DECOR_04_TH.md](DECOR_04_TH.md), [บอร์ด](decor-04/index.html) และdecor-04/assets.json: SVG4ไฟล์รวม1594bytes ประกอบกรอบ8ชิ้น/ปลายเส้นข้างcaption พร้อมsourceRGBAจากimage_genและpromptแยกชัดเจน เป็นvectorตีความใหม่ไม่ใช่auto-trace/แก้pixels ตรวจgeometry14กรอบตรงฐาน, target/scroll/pointer/captionguardผ่าน, cornerprotectedinset11ไม่มีinkบนcanvas2x และดูgear96CSSที่DPR2แล้ว

ขั้นถัดไปprototypeแยกจากเกมตามLayout2+Material3+Decor4 มีflowจำลองและfixtureชัดเจน ยังไม่แตะsrc/public/core/saveหรือmerge/deployเกม ไม่ถือว่าการตรวจภาพนี้อนุมัติvisualintegrationแล้ว


## 2026-11-02 — ขั้นที่ 3 Material sheet เสร็จ (ไม่แก้เกม)

อ่าน [MATERIAL_03_TH.md](MATERIAL_03_TH.md) และ [บอร์ดวัสดุ](material-03/index.html): CSS/tokenJSON, navy glass/ขอบทอง-cyan/CTAทองมีมิติ, button states4แบบ และข้อมูลdelta/neutral/insufficient/success พร้อมภาพreadyสองความสูงและcomponent sheet ตรวจgeometryตรงฐาน14กรอบ, target/scrollผ่าน และคู่สี11คู่ผ่านขอบเขตที่ระบุ ไม่ใช่WCAG/เครื่องจริง/transactionรับรอง

ใช้asset/fontเดิมจากlayout-02ร่วมกันและinlinegeometryไอคอนเกมเดิม มีprovenance ไม่แตะsrc/public/core/save ขั้นถัดไปdecorative assetsเฉพาะที่จำเป็น แล้วจึงprototypeตามแผน; ยังไม่merge/deployเกม


## 2026-11-02 — ขั้นที่ 2 Layout สองความสูงเสร็จ (ไม่แก้เกม)

อ่าน [LAYOUT_02_TH.md](LAYOUT_02_TH.md) และ [บอร์ด HTML](layout-02/index.html): ภาพ96, identityขั้นต่ำ158, step88/ตัวเลข32, neutral110, header60, dock168, CTA48; พร้อมห้าสถานะ × สองความสูงและสองvariant × สองความสูง รวม14กรอบ ผ่านตรวจ geometry/target/overflow/scroll ถึงงานรองบน Chromium รูป ready สองขนาดเป็นภาพแบบใหม่ ไม่ใช่ภาพเกมหลังแก้ รายละเอียดและข้อจำกัดดูเอกสาร

ขั้นถัดไปเป็น material/token sheet ตาม Artwork01 ไม่เริ่มแก้ source/public หรือ merge/deploy เกม และยังไม่ข้ามไปทำ transaction prototype; ใช้ atlas/ฟอนต์เกมเดิม byte-identical มี provenance และ OFL ใน layout-02/assets


## 2026-11-02 — ขั้นแรกของแผนปรับภาพ (ยังไม่แก้เกม)

อ่าน [VISUAL_AUDIT_01_TH.md](VISUAL_AUDIT_01_TH.md) ก่อนทำ dimensioned layout: ตรวจเกมหลัง PR #135 ที่ `07f95a7` เทียบ Artwork01 ฝั่งซ้าย พร้อมภาพจริงสองความสูงและ review แยกสถานะ พบ item tile 56px, ขั้นตีบวกยังไม่เด่น, neutral stats มีหัวตารางเปล่า และต้นทุนเป็นข้อความบรรทัดเดียว; จัด VF01–12 พร้อมลำดับ P0/P1/P2 แล้ว ข้อเสนอทั้งหมดยังไม่ได้ปรับเข้า runtime

PR #135 นำเข้า `4686ca5` และ Pages run41369875841 เผยแพร่แล้ว รอบตรวจภาพนี้เป็นเอกสาร/หลักฐานใน ART PR #133 เท่านั้น ห้ามตีความเป็นคำสั่ง merge artwork หรือ deploy เกม ขั้นถัดไปคือ layout 390×844/390×650 ตาม brief ไม่เปิดทุกหน้าพัฒนาพร้อมกัน


แผนพัฒนาตามคำขอเจ้าของอยู่ `IMPLEMENTATION_PLAN_TH.md` แบ่ง UXD-00–08 ขั้นแรก baseline+flowตีบวกมีโค้ดแยกใน PR #135 (ฐาน `db1788e`, localunit1396/focusedbrowser30ผ่าน); ตรวจสถานะ CI/merge/Pages ที่PRโดยตรง ส่วนอุปกรณ์ครบคำสั่ง/ดาว/สกิลใหม่/QAคนจริงยังเป็นแผน ไม่เปลี่ยน P04/P09 จากชุดนำร่อง

อัปเดตตามเจ้าของรอบอุปกรณ์: เพิ่ม concept04–06 ครอบคลุมเพิ่ม Lv/เลื่อนสี/สุ่ม/ถ่ายโอน/สร้าง/รีไซเคิล/หลอมแร่ และ `EQUIPMENT_DEVELOPMENT_TH.md` อ่านคู่กับกฎที่ตรวจซ้ำล่าสุด โดยเฉพาะผลสุ่มที่ preview ไม่ได้, transfer ผูกช่องถาวร/จ่ายล่วงหน้า, refund ที่ไม่รวมมูลค่าพื้นฐานของ donor และค่าผลิตที่ไม่คืน

อัปเดตตามเจ้าของ: เพิ่มหน้าอัปดาวเฉพาะใน `03_character_star_upgrade.png` และสเปก `STAR_UPGRADE_TH.md` ตรวจทางเข้าจัดทีม/การอัปทันที/ผลก่อน–หลัง/ตัวซ้ำ-ตรา-แร่/เพดานตรา/★5/stale review; แยก P04 ที่ยังไม่เข้า runtime จากกฎปัจจุบันอย่างชัดเจน

## เป้าหมาย

ลดการค้นหาคำสั่งและการสลับหน้าในโรงตีเหล็ก/พัฒนาตัวละคร คงทิศทาง Luminous Veil และกรอบ portrait เดิม เจ้าของขอวิเคราะห์และเสนอ Artwork เพื่อนำไปปรับเกมภายหลัง

## ข้อเท็จจริงที่ต้องรักษา

- ดูหลักฐานและ SHA ใน REVIEW_TH.md; main เป็นฐานเอกสาร สาขาเกมคือ feature/fateweave-initial-prototype
- ตีบวกสำเร็จแน่นอน ครั้งละ 1 ขั้น; เพิ่ม Lv ตามเพดานจริง ไม่มี batch upgrade ในข้อเสนอนี้
- หน้า preview/ยกเลิก/เปลี่ยน tab ไม่เปลี่ยนทรัพยากร การยืนยันใช้ state ล่าสุดและไม่ส่งคำสั่งซ้ำ
- มี preview, review guard, lock, auto-equip และ deep link เข้า forge แล้ว ให้นำมาใช้ต่อ
- เลเวลค่ายใช้ร่วม ดาวเป็นรายตัว; คำอธิบายแต้ม/ดาวต้องตรง runtime และ owner decisions ตามลำดับที่นำเข้า ไม่ตีความ artwork เป็นกฎใหม่

## ข้อเสนอหลัก

1. โรงตีเหล็กเปิดเป็น task launcher → operation view หนึ่งงาน โดยเปลี่ยนงานผ่าน sheet แทนแถบปุ่มซ้อน
2. ตัวละครมี ภาพรวม/อุปกรณ์/สกิล/พัฒนา; สกิลรวม ติดตั้ง/เพิ่ม Lv/ผังสกิล
3. พัฒนาเป็นทางเข้าไปดาวรายตัว ข้อมูลเลเวลค่าย สกิล และอุปกรณ์เดิม
4. กลับจาก forge ต้องคืน hero/item/tab/filter/scroll/focus ของต้นทาง
5. งานใช้หมดแสดงชิ้นหลัก/วัตถุดิบ/ทุนคืนแยกชัดเจน

## วิธีใช้ Artwork

ภาพ concept สร้างแล้วและตรวจดูแล้ว ใช้สื่อ hierarchy, grouping และตำแหน่ง CTA เท่านั้น ไม่ใช้เป็นภาพ UI แปะทับทั้งหน้า ให้สร้าง DOM/CSS ด้วย tokens และ fonts ในเกม ใช้ portrait/item/skill art ปัจจุบันจาก registry จริง ภาพตัวละครใน concept เป็นภาพประกอบใหม่ ไม่ได้อนุมัติให้เปลี่ยนรูปลักษณ์ Aegis

ข้อความเชิงผลของดาว/สกิล, ชื่อตัวอย่าง, Lv, EXP, ราคา, ค่าสถานะ และจำนวน donor ในภาพเป็นตัวอย่าง ผู้สร้างภาพอาจเติมคำอธิบายเพื่อสื่อแนวคิด ต้องแทนด้วย localized copy และ preview จากกฎจริงทั้งหมด โดยเฉพาะไม่ใช้ข้อความดาวในภาพเพื่อเพิ่มผลสกิลหรือเปลี่ยนกฎดาว และไม่รับรองดาเมจจากตัวเลขก่อนเงื่อนไขต่อสู้

ขนาด canvas และ hash อยู่ validation.json; ภาพเป็น board หลายหน้าจอ ไม่ใช่ screenshot จริงขนาด 390px และไม่ใช่ sprite/atlas จึงไม่มี frame/FPS/anchor/loop การนำเข้าเป็นงาน DOM UI ไม่ใช่ loader asset

## สถานะและการตรวจ

ทำแล้ว: สำรวจ 135 ชื่อสาขา ตรวจ 9 tree/commit ที่เกี่ยวข้อง อ่านไฟล์ UI/core และกฎอัปดาว/อุปกรณ์ที่เกี่ยวข้อง เปิด artwork เดิม สร้าง concept 6 boards เขียนสเปก/ข้อเสนอ/เกณฑ์ QA และ decode/hash ไฟล์

ไฟล์ภาพในpackageนี้ยังเป็นข้อเสนอ; runtimeนำร่องแยกไปPR #135 พร้อมการตรวจChromiumในเส้นทางที่กระทบ ไม่ใช่นำเข้า UI ทั้งระบบจากภาพ ยังไม่มีhuman usability/iOS/มือถือจริง ไม่เปลี่ยนกฎหรือsave และไม่อ้างผลlocalว่าPagesเผยแพร่แล้ว

ดู acceptance และแผนแบ่งงานใน REVIEW_TH.md เมื่อเริ่ม implementation ให้ตรวจสาขาเกมล่าสุดอีกครั้ง
