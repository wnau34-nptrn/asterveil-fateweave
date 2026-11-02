# เกณฑ์ตรวจรับการนำภาพหน้าตีบวกเข้าเกม

สถานะทุกข้อด้านล่าง: **รอตรวจบน runtime implementation** วันที่2พฤศจิกายน2026 งานขั้น7เพียงจัดรายการนี้ ไม่มีข้อใดถูกทำเครื่องหมายผ่านจากผลprototype

ฐานอ้างอิงruntime07f95a7 / design73a7e57; ถ้าฐานเปลี่ยนให้ตรวจsource-mapใหม่ คู่กับ [สเปกหลัก](../INTEGRATION_07_TH.md)

| ID | เกณฑ์รับงาน | หลักฐานที่ต้องได้ / ทดสอบที่ใช้ต่อ |
| --- | --- | --- |
| AC01 ข้อมูลจริง | ชื่อ/ภาพ/เจ้าของ/ขั้น/ราคา/ผลก่อนหลังมาจากProfileและhelperปัจจุบัน ไม่อ่านfixturesของต้นแบบ | ตรวจfixtureอาวุธLv6 rarity3 +4→+5cost8/3และกรณีbody+2→+3เดิม; fixtureเป็นหลักฐานอ้างอิงตามฐาน ไม่hardcodeค่าที่UI |
| AC02 Review/ครั้งเดียว | เปิดreview/ยกเลิก/เลือกชิ้นไม่เปลี่ยนsave; confirmตรวจทุน/target/Profileซ้ำ, inputซ้ำcommitครั้งเดียว; staleไม่ส่งhost | ใช้tests/enhancement-review.test.tsและtests/browser/enhancement-pilot.spec.tsต่อ; เปรียบเทียบsave/writesจริงและhostcall |
| AC03 Receipt/next | successแสดงจากforged/enhanceจริงเท่านั้น ขั้น/ราคาเป็นรายการที่commitแล้ว; next-previewไม่ใช้ของและอ่านcostใหม่ | เพิ่มcaseในenhancement-pilotสำหรับreceiptค้างจนnextและblockedไม่มีsuccess; focusไปresultจริง |
| AC04 กลับต้นทาง | จากcharacterและinventoryกลับhero/tab/filter/item/scroll/focusเดิม รวมหลังยกเลิก/สำเร็จ | ใช้enhancement-pilotและcharacter.spec.ts; ต้นทางต้องเป็นdialogจริง ไม่ใช้mockorigin |
| AC05 Neutral/unowned | ไม่มีแถวเปล่า/ตัวเลขปลอมเมื่อheroรวมเท่าเดิม; unownedไม่อ้างว่ามีผู้สวม | ใช้ผล26→27itemแต่heroเท่าเดิมของfixtureเดิมเป็นตัวอย่าง; trialheroต้องระบุว่าเป็นการทดลอง |
| AC06 ของไม่พอ/cap/lock | แสดงoreและdustที่ขาดครบ; capไม่มีคำสั่งขั้นที่ไม่มีจริงและเลือกชิ้นอื่นได้; lockไม่เพิ่มข้อห้ามตีบวก | ขยายcaseเดิมของenhancement-pilotตามCTAใหม่ เก็บassertไม่มีsavewrite/confirmและไม่มีduplicateID |
| AC07 Scoped visuals/assets | ภาพ96/stepเด่น/glass/gold/cyanตามแบบ; effectจำกัดenhancement; SVG4ไฟล์ถูกhash/URL/transform; decorไม่รับinputและfocusอ่านชัด | ภาพจริง+computedbounds+networkassetsจากdevและPagesbase; คำสั่งforgeอื่นไม่เปลี่ยนหน้าตาโดยไม่ตั้งใจ |
| AC08 Responsive/text | 320×568/390×650/390×844/480×844/desktop1366×768ใช้gameBoundsจริง; textขยาย200ยังอ่านและกดได้ ไม่มีoverflow/clip | เพิ่มเฉพาะcaseขาดในenhancement-pilot/portrait-keyboard; บันทึกวิธีtextscaleจริงและframeขนาดจริง ไม่ใช้prototype140เป็นผลแทน |
| AC09 Keyboard | Tab/Shift+Tab, Spaceเปิดdetails, Enterเลือกreviewแล้วconfirmชัดเจน, Escapeถอยทีละชั้น; focusไม่ถูกdock/กรอบบัง | keyboardจริงบนruntime; ใช้portrait-keyboardและenhancement-pilotเป็นฐาน; ไม่มีinputค้างไปcommitต่อ |
| AC10 Viewport/safe | safe-areaไม่หักซ้ำ/desktopframeเดิม; rotationgateเหนือsurfaceและinert, rotate/resizeไม่ใช้ของ/ไม่queuecommand | portrait-keyboardเคสgate/dialogและsaveเดิม; อย่าคัดlabmargin24หรือ480×720เป็นกฎเกม |
| AC11 แยกartจากrules | ไม่มีcore/battle/core/save/core/world/contentbalance/schema/workflowเปลี่ยนจากงานภาพ; ไม่shipmockmodel/fixture/lab/rawmotif | reviewdiffและproductionbundle/network; source simulationอยู่incomingเท่านั้น |
| AC12 Shared regressions | Lv/fusion/refund/transfer/craft/storage/character/ดาว/สกิลที่ใช้surfaceร่วมยังทำงาน | forge-phase2.spec.ts, forge-refund.spec.ts, affix-transfer.spec.ts, weapon-crafting.spec.ts, shared-equipment.spec.ts, character.spec.ts และbaseline star/skill caseในenhancement-pilot |
| AC13 Quality/build | checksทั้งหมดอ้างcommitใหม่ตรงกัน ไม่มีskip-ciของruntimeและไม่ลดgate | typecheck/lint/test/build, focusedbrowser, quality+browser4shards+aggregateผ่าน; build:pagesและproductionbase checksผ่าน |
| AC14 ภาพ/ข้อแตกต่าง | ใช้state/fixtureตรงกันในการเทียบ มีภาพจริง390pxอ่านได้ บันทึกlinecurrency/ornamentvarianceและassetที่ยังไม่ผลิต | Ready390844/650, review/successและblockedที่จำเป็น; จำนวน1–2ภาพต่อหน้าจอ ไม่อ้างpixelperfectหรือเปอร์เซ็นต์ไม่มีวิธีวัด |
| AC15 รายงาน/rollback | สรุปchanged files/ผลจริง/ข้อจำกัด/commit/PR/Pagesให้ตรง ไม่อ้างSafari/เครื่องจริง/OSfont/screenreaderที่ยังไม่ได้ทดสอบ | บันทึกhandoffบนสาขาเกมพร้อมงานจริง; ระบุfollow-upอุปกรณ์ที่ยังขาด; rollbackpresentationcommitโดยไม่ย้อนsaveผู้เล่น |

## คำสั่งตรวจที่ใช้ได้เมื่อมีruntime change

ใช้package/เวอร์ชันที่ล็อกไว้ของrepository ไม่เพิ่มเครื่องมือหรือเปลี่ยนworkflowเพื่อเลี่ยงข้อผิดพลาด:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser -- tests/browser/enhancement-pilot.spec.ts tests/browser/character.spec.ts tests/browser/forge-phase2.spec.ts tests/browser/forge-refund.spec.ts tests/browser/affix-transfer.spec.ts tests/browser/weapon-crafting.spec.ts tests/browser/shared-equipment.spec.ts tests/browser/portrait-keyboard.spec.ts
npm run build:pages
```

ตรวจproductionด้วยplaywright.configและวิธีPagesเดิมของโปรเจกต์ ไม่ใส่URLdevไว้ในtestของproduction ผลprototypeในqa-06ใช้เป็นรูปแบบcaseสำหรับportไปเกม ไม่ควรรันprototypeแล้วนับว่าproductionbrowserผ่าน

งานdocs-onlyขั้น7ตรวจลิงก์/anchors/hash/diffแทน ไม่ได้รันคำสั่งเหล่านี้ใหม่ การตรวจNativeSafari/OSfont/เครื่องจริงต้องบันทึกตามสิ่งที่เข้าถึงได้จริง ไม่สร้างผลผ่านหรือapprovalแทนเจ้าของ
