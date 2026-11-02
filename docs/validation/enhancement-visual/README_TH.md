# หน้าตีบวกจริงตาม ART-UI-UX-002

ฐานเกม07f95a7 · แบบส่งต่อART PR133 commit a77d17b · implementation branch codex/enhancement-visual-integration

## เปลี่ยนอะไร

นำLayout/Material/Decorเข้าหน้าตีบวกจริง: ภาพชิ้น96px, ขั้นก่อน→หลังเด่น, ข้อมูลผลจริง/neutral, รายละเอียดพับรวม, ค่าใช้/มี/เหลือแยกวัสดุ, ปุ่มทอง/แผงnavy glass/cyan และกรอบSVG4ไฟล์รวม1594bytes

receiptเกิดจากforged/enhanceที่บันทึกแล้ว เก็บข้อมูลก่อน/หลังชั่วคราวในUI แสดงรายการที่เพิ่งทำสำเร็จจนกดดูขั้นถัดไป การเปิด/แก้ไข/next-previewไม่ใช้ของ ยืนยันยังผ่านProfile reference guard/ตรวจtarget/cost/bankและhostเดิม ไม่คัดsimulationหรือfixturesของprototypeเข้าเกม

GameShellส่งProfileฉบับที่persistแล้วให้receipt เพื่อให้ตรงกับobjectที่Lobbyวาด ไม่เปลี่ยนการบันทึกหรือกฎเกม Nativepickerเริ่มfocusที่หัวข้อเพื่อให้Escapeกลับชิ้นเดิมได้ โดยไม่ดักEscapeของselect/inputที่ผู้ใช้กำลังแก้ไข ยืนยันด้วยdoubleclickไม่ย้ายfocusไหลไปขั้นต่อไป

CSSจำกัดenhancement; window/container/orientationใช้ของเดิม อักษรremรวมรายละเอียดสกิล/ป้ายtrialheroและintrinsiclayoutรองรับrootfont200%, costย้ายเข้าbodyเมื่อframeเตี้ยและข้อความใหญ่ actionsคงdock ส่วนกรอบและcaptionมีpointer-none/safe bounds/guard/observerที่ถอดเมื่อวาดหรือปิดsurface

## ขอบเขตที่คงเดิม

ไม่มีcore/battle/core/save/core/world/contentbalance/schema/RNG/workflowเปลี่ยน ไม่เพิ่มfontsettingที่บันทึกลงเซฟ ไม่เปลี่ยนแอนิเมชันforge strike/เวลาเล่น ใช้gear registry/ไอคอนแร่ฝุ่น/ฟอนต์เดิม ไม่มีmockorigin/lab/rawmotifในruntime

รายละเอียดคืนทุนใช้enhancementInvestmentจริง รวมทุนก่อนเริ่มรอบนี้ ไม่ใช้paidสะสมจากprototype ของไม่มีผู้สวมแสดงผลอุปกรณ์และtrialheroที่ระบุว่าเป็นการทดลอง

## ภาพอ้างอิง

- before-ready-390.png: baselineจริงที่source07f95a7จากvisual-auditเดิม fixtureดาบLv6 rarity3 +4/เอกิส★3/ค่ายLv6
- ready-390x844.png / ready-390x650.png: หลังนำเข้า fixtureเดียวกันกับArtworkเทียบโครงสร้าง +4→+5 แร่8/ฝุ่น3
- review-390.png / success-390.png: สถานะจริงจากหน้าตีบวกและcommitจริงของfixture
- text200-390.png: เปลี่ยนrootfont16→32pxเพื่อทดสอบrelativetext ไม่ใช่ผลOSfontหรือSafari

ไฟล์หลังนำเข้าเขียนจากtests/browser/enhancement-visual.spec.ts รวมกรอบเกมจริง/fixtureเซฟจำลองcurrentSave ผลunitที่แสดงheroเท่าเดิมแต่itemโจมตี26→27มาจากhelperจริง ไม่ยกค่า+4ในArtworkมาปลอม

## การตรวจ

- typecheck/lint/unit1398ใน100ไฟล์และbuildPagesผ่าน
- tests/enhancement-review.test.tsครอบคลุมguard/stale/receipt/explicitnext โดยใช้enhanceToจริงสร้างผลทดสอบ
- browserใหม่6กลุ่ม: 320×568/390×650/390×844/480×844/desktop1366×768 อ่านภาพ96/neutral/header/body/dock/target, roottext200%, reviewcancel/commitครั้งเดียว, nextไม่ใช้ของ, pickerEscape/focus และassetURLใต้baseจริง
- regressionใช้enhancement-pilot, character, forge-phase2, forge-refund, affix-transfer, weapon-crafting, shared-equipment, portrait-keyboard และlegacyworldforgecase ผลรวม52กรณีไม่ซ้ำผ่านข้ามชุด (45กรณีในbatch, visual6บนPagesซึ่งซ้ำkeyboard1กรณี, rerunLv3901กรณีและlegacyworld1กรณี); ไม่รวมการถ่ายภาพซ้ำเป็นcaseเพิ่ม
- Localunitครั้งแรกขาด6report filesจากsparsecheckout คืนbytesตรงHEADแล้วรันใหม่ครบผ่าน ไม่มีการแก้reportหรือbalance; devserverแยกจากrunnerเพื่อไม่ถูกชุดก่อนปิด

Localbatchที่รันระหว่างปรับfocusยังมีvisual5failก่อนแก้pickerfocusและLv390cold-loadtimeout1; visual6บนbuildPagesและLv390/legacy2ที่rerunหลังแก้ผ่านแล้ว ส่วนCIจะตรวจใหม่ทั้งชุดบนheadเดียว ไม่ซ่อนผลล้มเหลวหรืออ้างbatchแรกผ่านทั้งหมด

ผลCI/Pagesของimplementationจะบันทึกตามcommitจริงในhandoffหลังworkflowเสร็จ ไม่ใช้ผลprototype140/9/26เป็นผลเกม

## ข้อแตกต่างภาพและสิ่งที่ยังไม่ยืนยัน

currencyยังlineiconเดิม ส่วนcrystalpaintedของArtworkยังไม่ผลิต; SVGเป็นฉบับอ่านชัดขนาดเล็ก รายละเอียดไม่เหมือนเส้นวาดทุกจุด; gear128sourceแสดง96CSSpx ไม่ใช่assetnative2x

Chromium touch/desktop emulationและrootfont200%ไม่ยืนยันSafari/iOS/เครื่องจริง/browsernativezoom/OSfont/screenreader/ผู้เล่นจริง ไม่อ้างpixelperfectหรือการอนุมัติภาพแทนเจ้าของ ชุดนี้นำเข้าหน้าตีบวกนำร่องเท่านั้น หน้าดาว/สกิล/เพิ่มLv/อุปกรณ์อื่นยังไม่ทำvisualredesignรอบนี้
