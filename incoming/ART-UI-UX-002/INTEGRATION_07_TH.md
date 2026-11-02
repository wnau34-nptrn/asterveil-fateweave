# ขั้นที่7 — สเปกส่งต่อการนำภาพหน้าตีบวกเข้าเกม

วันที่ 2 พฤศจิกายน 2026 · สถานะ: ชุดออกแบบและส่งต่อครบขั้น1–7; ยังไม่ได้ทำ visual integration ในเกม

## จุดเริ่มสำหรับผู้พัฒนา

อ่าน [brief ลงมือทำ](integration-07/IMPLEMENTER_BRIEF_TH.md) → [mapping ที่ตรวจจากโค้ด](integration-07/runtime-map.json) → [เกณฑ์ตรวจรับ](integration-07/ACCEPTANCE_TH.md) ใช้ [ต้นแบบล่าสุด](prototype-05/index.html) และ [ผล QA ขั้น6](QA_06_TH.md) เป็นแบบอ้างอิง ไม่คัดโปรแกรมจำลองเข้าเกม

ตรวจ remote `feature/fateweave-initial-prototype` ผ่าน GitHub API ในงานนี้แล้ว: `07f95a7f164b8b232c1c26edb0b4f31360df323f` ตรงกับ checkout ที่ใช้ตรวจโค้ด ชุดออกแบบฐาน `73a7e57` อยู่ [Draft PR #133](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/133) ส่วน flow นำร่อง UXD-00/01 [PR #135](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/135) นำเข้าและเผยแพร่แล้ว จึงไม่เริ่ม UXD-01 เดิมซ้ำ

งานถัดไปเป็นการนำ Layout/วัสดุ/asset มาใส่ flow จริงที่มีอยู่ ให้เริ่มสาขา implementation ใหม่จากเกมล่าสุด ไม่ merge ทั้งสาขา Artwork หรือคัด prototype มาแทน ForgeWorkbench รอบส่งต่อนี้ไม่แก้src/public/tests/workflowsและไม่deploy

## ขอบเขตการนำเข้ารอบแรก

หน้าตีบวกเฉพาะงาน: identityภาพ96, ชื่อ/เจ้าของ/เปลี่ยน/ล็อก, ขั้นก่อน→หลัง, ผลหลัก/neutral, รายละเอียด, costใช้/มี/เหลือ, ready/review/success/insufficient/capped, กรอบและปุ่มตาม Material3/Decor4, responsive/text reflow และkeyboardตาม QA6

ไม่เปลี่ยนกฎตีบวก/ราคา/เพดาน/ดาว/สกิล/RNG/ทุนคืน/save schema/บัญชี ไม่เพิ่มbackendหรือคำสั่งbatch ไม่เปิดหน้าพัฒนาอื่นพร้อมกัน และไม่สร้างระบบfont settingที่ต้องบันทึกลงเซฟจากงานภาพนี้

## แหล่งอ้างอิงที่ต้องใช้

| ข้อกำหนด | ไฟล์แบบ | วิธีใช้ในเกม |
| --- | --- | --- |
| สัดส่วน/ระยะ/พื้นที่เลื่อน | [LAYOUT_02_TH.md](LAYOUT_02_TH.md) | baseline390; ยืดตามcontainerจริง ไม่ยึดสูง844ตายตัว |
| วัสดุ/สี/ปุ่ม | [material.css](material-03/material.css), [tokens.json](material-03/tokens.json) | mapสีเดิมกลับtokensกลาง และเพิ่มเฉพาะtokenของenhancementที่ยังขาด |
| มุม/ราง/เส้นประดับ | [assets.json](decor-04/assets.json), [decor.css](decor-04/decor.css) | นำเฉพาะSVG4ไฟล์และวิธีประกอบ8ชิ้น ไม่ใช้motif-sourceเป็นพื้นหลัง |
| พฤติกรรม | [PROTOTYPE_05_TH.md](PROTOTYPE_05_TH.md) | เป็นinteraction reference; ใช้runtime commands/ข้อมูลจริง |
| ขนาดอื่น/ข้อความ/keyboard | [QA_06_TH.md](QA_06_TH.md) | portตามgameBounds/container; แยกผลprototypeออกจากผลเกม |

## Mapping โค้ดและเจ้าของข้อมูล

ตำแหน่งด้านล่างตรวจจริงที่เกม07f95a7; runtime-map.jsonบันทึก26ไฟล์พร้อมgit blob และ8จุดเชื่อม ก่อนimplementationถ้าสาขาเกมเคลื่อนต้องตรวจdiffฐานใหม่

| งาน | Runtime ที่ต้องต่อยอด | สิ่งที่ต้องคงไว้ |
| --- | --- | --- |
| Identity/ขั้น/ผล/cost/details | `src/ui/forge-workbench.ts` → `enhancementPage`, `statPreview`, `heroImpact` | `findItem`, `gearArt`, `itemName`, `characterStats`, `itemStats` และข้อมูลProfileจริง |
| Review/confirm | `ForgeWorkbench.click/render` | `source === p`, ตรวจtargetขั้นเดียว/cost/bankซ้ำ, ล้างreviewก่อนส่งhost |
| Success | `ForgeWorkbench.enhanced(p,uid)` ← `LobbyUI.forgeEnhanced` ← `GameShell.profileChange` | แสดงผลจากevent `forged` / action `enhance` ที่commitแล้วเท่านั้น |
| Header/ปิด/กลับ | `src/ui/lobby-ui.ts` → `openForge`, `closeSheet` | `forgeOrigin`, sheet/picked/scroll/focus; Escapeในreviewกลับแก้ไข |
| กลับหน้าตัวละคร | `src/ui/character-panel.ts` → `character-forge`, `resumeFromForge` | hero/tab/filter/item/scroll/focusเดิม; ไม่มีmock originในเกม |
| CSSหลัก | `src/ui/components.css` scope `.forge-enhancement`; ตรวจcascadeจาก`portrait.css` | ไม่แตะรูปแบบforgeคำสั่งอื่น/หน้าตัวละครทั้งระบบโดยไม่จำเป็น |
| Token | `src/ui/tokens.css` | palette/font/focusเดิม; ไม่เปลี่ยนขนาดตัวอักษรทั่วเกมโดยไม่ตั้งใจ |
| Frame/orientation | `src/platform/viewport.ts`, `#app` container `game` ใน`portrait.css` | ใช้ของเดิม อ่านgameBounds; ไม่เพิ่มviewport handlerอีกชุด |
| รูปอุปกรณ์ | `src/ui/equip-art.ts`, `src/game/visuals/equip-art.ts` | เลือกassetตามชิ้น/rarityจริง ไม่ฝังดาบguardianในทุกชิ้น |

CSSโหลด`portrait.css`ก่อน`components.css`จากsrc/main.ts แต่ยังต้องตรวจcomputed display/alignmentจริงของstep/header อย่าสรุปว่าtext-alignเพียงอย่างเดียวแก้layoutที่สืบทอดมาทั้งหมด

## สัญญาของข้อมูลและสถานะ

1. **Ready:** อ่านชิ้น/เจ้าของและnext targetจากProfileปัจจุบัน; costจาก`enhancementCostTo`; ผลจากhelperเกมเดิม ไม่อ่านfixtures.jsonและไม่เปลี่ยนbankเมื่อเปิดหน้า
2. **Review:** ใช้uid/targetที่ผู้ใช้เลือกและProfileปัจจุบัน การวาดใหม่หรือเปลี่ยนชิ้น/ทุนต้องinvalidateตามguardจริง ไม่คัดfingerprint/revisionจำลองมาทับreference guardของเกม
3. **Confirm:** ส่งผ่าน`ForgeHost.enhance(uid,target)` → `GameShell` → `enhanceTo`เดิม ตรวจซ้ำและล้างreviewก่อนส่ง ห้ามหักbankในDOM/animation callback
4. **Success:** ใช้receiptจากeventจริง ค่าใช้/ยอดหลังcommitเป็นค่าจริง แสดงขั้นที่เพิ่งทำสำเร็จจนผู้ใช้เลือกดูขั้นถัดไป หากต้องแสดงstatก่อน→หลัง ให้เก็บผลอ่านอย่างเดียวก่อน/หลังไว้เป็นUIreceiptชั่วคราว ไม่คาดค่าเก่าด้วยการหักเลขstatหรือใช้snapshotจำลอง
5. **Next preview:** เพิ่มactionUIเฉพาะสำหรับอ่านขั้นถัดไป ล้างreceipt/reviewโดยไม่ส่งhostและไม่ใช้ของ รหัสเสนอ `forge-next-preview` ยังไม่มีในเกม; handlerต้องใช้data-forgeให้ตรงระบบจริง
6. **Insufficient:** แสดงจำนวนขาดทุกวัสดุที่ไม่พอพร้อมข้อความ ปิดการเข้าหรือยืนยันที่ทำไม่ได้ ไม่พึ่งสีเดียว
7. **Capped:** ไม่สร้างtarget/costของขั้นที่ไม่มีจริง เสนอปุ่มเลือกชิ้นอื่น data-forge=picker ใช้IDแยกจาก`forge-change-item`ที่อาจอยู่ในidentityด้วย; ปรับtestcapให้ตรวจintentใหม่ ไม่ลบguard testเพื่อให้ผ่าน
8. **Unowned:** เปิดผลต่ออุปกรณ์เป็นหลัก หากมีtrial heroของเดิมให้ระบุว่าเป็นการทดลอง ไม่เรียกว่า“สวมอยู่”หรือเลือกเอกิสเป็นเจ้าของสมมติ; ผลต่อผู้สวมจริงยังเปิดทันที
9. **Details/refund:** รวมการอ่านผลฮีโร่/สกิล ค่าอุปกรณ์ และทุนคืนในdisclosureเดียวได้ แต่ต้องรักษาข้อมูลจริงจาก`enhancementInvestment`/helperเดิม ไม่ใช้ยอดpaidตั้งแต่เปิดprototypeมาแทนทุนทั้งหมดของชิ้น
10. **Lock:** เป็นสถานะป้องกันคำสั่งที่มีข้อจำกัดตามกฎจริง ไม่ทำให้ตีบวกไม่ได้โดยเพิ่มกฎใหม่

จุดที่ต้องทำเพิ่มจากruntimeนำร่องคือการจัดmarkup, neutralsummary, การรวมรายละเอียด, receipt/explicit next-preview และCTAของcap รวมถึงCSS/asset ไม่ใช่เพียงนำไฟล์CSSมาติดแล้วถือว่าflowต้นแบบครบ

## DOM/selector ที่ต้องรักษา

คง`#forge-enhance`, `#forge-confirm`, `#forge-cancel`, `#forge-change-item`, `#forge-lock`, `#forge-success`, `#forge-cost`, `#lobby-sheet-title`สำหรับactionที่ยังมีอยู่ และdata-forgeเดิม ไม่ใช้IDสั้นของprototypeที่อาจซ้ำกับระบบอื่น

ถ้าเปลี่ยนelementของcap/nextให้เพิ่มselectorเฉพาะและปรับtestตามพฤติกรรมที่ต้องการ ทุกหน้าต้องไม่มีduplicate ID การย้ายcostระหว่างbody/dockใช้data/viewเดียวกัน ไม่วาดปุ่มconfirmสองชุดเพื่อให้ดูเหมือนอยู่สองตำแหน่ง

ผลหลักอยู่ก่อนdisclosure; success/errorมีrole=status/alertและfocusที่เหมาะสม เปลี่ยนชิ้น/กลับ/ยกเลิกต้องคืนfocusและscrollจริง ไม่มีnested scrollในdetailsและไม่ย้ายfocusไปbackground modal

## Style/token/asset ที่นำเข้าได้

ค่าเดิมmapตรง: mv-base→navy-950, mv-surface-low→navy-900, mv-text→text, mv-muted→text-muted, mv-gold→gold-light, mv-gold-edge→gold-edge, mv-cyan→veil-cyan, mv-mint→hp-mint, mv-coral→danger-coral, mv-violet→rift-violet, mv-focus→focus, mv-on-gold→text-on-gold

เฉดเพิ่มเช่นsurface-high/edge/gold gradient/disabled surfaceและshadowให้จำกัดscopeenhancementก่อน ไม่เปลี่ยนสีปุ่มหลักทั้งเกมโดยรวมglobal selectorsจากmaterial.css

| SVGที่นำเข้า | Source | Targetเสนอ (ยังไม่สร้าง) |
| --- | --- | --- |
| มุม32×32 | `decor-04/assets/frame-corner.svg` | `public/assets/ui/forge-enhancement/frame-corner.svg` |
| รางแนวนอน8×8 | `decor-04/assets/frame-edge-horizontal.svg` | pathเดียวกันชื่อframe-edge-horizontal.svg |
| รางแนวตั้ง8×8 | `decor-04/assets/frame-edge-vertical.svg` | pathเดียวกันชื่อframe-edge-vertical.svg |
| ปลายเส้น32×12 | `decor-04/assets/divider-wing.svg` | pathเดียวกันชื่อdivider-wing.svg |

ใช้4SVGรวม1594bytesที่ตรวจhashไว้แล้ว ส่วนsourcePNG/ภาพconceptเก็บincomingเท่านั้น ใช้URLผ่านVite/BASE_URLให้ถูกต้องทั้งdevและGitHub Pagesใต้`/asterveil-fateweave/`; ห้ามคัดrelativepath `../decor-04` จากprototypeไปเป็นURLในproduction

กรอบcenterว่าง, pointer-events:none, aria-hidden=true, cornerคง32ไม่ยืด, รางต่อที่30, protected inset11, focusเหนือชั้นกรอบ และcaptionguardซ่อนลายเมื่อชนข้อความ/หลายบรรทัด ใช้ResizeObserverที่ถอดได้เมื่อsurfaceปิด ไม่สะสมobserverทุกrender

ไม่คัดbase-layout.css/ตัวควบคุมlab/resizeของprototypeทั้งหมด และไม่ทำสำเนาgear atlas/fontกลับpublicซ้ำ

## Responsive และข้อความขยายในเกมจริง

เกมมีcontainer `game`, maxportrait480/960และorientation gateอยู่แล้ว ใช้พื้นที่เกมเป็นตัวกำหนดbreakpoint ไม่ใช้ความกว้างmonitor งานprototypeใช้labmargin24จึงได้desktopสูง720เมื่อwindow768; เกมไม่มีlabmarginนี้ จึงต้องคำนวณจากframeจริง ไม่คัดเลข720ไปจำกัดความสูงเกม

คงtile96, target≥44, CTA≥48ที่textปกติ ใช้typographyแบบrelativeในscopeenhancement เช่นbody.875rem/title2remแทนการล็อกpxทุกชั้น หลีกเลี่ยงการแปลงtokenทั้งเกมพร้อมกัน ทดสอบbrowser text resizeและค่าfontจริง; labdropdown200%ไม่ใช่องค์ประกอบที่เพิ่มในเกม

Header/card/dockขยายตามข้อความได้ ถ้าค่าใช้จ่าย+header+actionsทำให้bodyอ่านลำบาก ให้ย้ายcostเข้าscrollbodyและคงactionsในdock; reviewให้costอยู่ต้นbody กติกาจากprototype `<720เมื่อ200%`เป็นตัวอย่างที่ตรวจแล้ว ไม่ใช่breakpointของwindowที่ต้องคัดตรง ๆ ให้ใช้ขนาดframeและความสูงเนื้อหาจริง รวมfontload/locale/safe-area

เมื่อย้ายcostให้คงลำดับอ่านและอย่าให้ResizeObserverสลับlayoutไปมาจากการวัดตัวเอง Safe-areaอ่านของเดิมไม่หักซ้ำ หมุนจอ/ย่อหน้าต่างต้องไม่ยืนยันคำสั่งหรือทำให้reviewเก่ากลับมายืนยันโดยไม่ตรวจใหม่

## แผนลงมือทำและPR

| ลำดับ | งานที่ทำในสาขาruntimeใหม่ | จุดจบที่ตรวจได้ |
| --- | --- | --- |
| 1 | ตรวจฐานgameล่าสุด/ถ่ายbaselineจริง แยกselectors/ข้อมูลกับรูปแบบที่กำลังนำเข้า | ระบุSHAและfixture, ไม่มีruntimecodeจากprototype |
| 2 | จัดidentity/step/neutral/details/costในForgeWorkbench, receipt+next/capอย่างชัดเจน | Ready/review/success/blockedครบ ข้อมูลมาจากhelperและeventจริง |
| 3 | นำscopedmaterials/4SVG/relativetype/reflowเข้ากรอบเดิม | ตัวหนังสือ/controlsอ่านได้320–480/desktopและขยายtext |
| 4 | ตรวจreturncontext/keyboardและคำสั่งอื่นที่ใช้forgeร่วมกัน | ผ่านACชุดruntimeและregressionโดยไม่แตะกฎ |
| 5 | ตรวจbuildPages/quality/browser4shards, แสดงภาพ390จริงและบันทึกข้อจำกัด | PRimplementation reviewable พร้อมหลักฐาน; การmerge/deployเป็นงานimplementationถัดไป |

ขนาดงานประมาณกลางเพราะมีreceipt/layout/keyboardร่วมกัน ไม่ประกาศเวลาหรือคะแนนความเหมือนก่อนวัดในruntimeจริง ไม่จำเป็นต้องสร้างCSSframework/Phaser sceneใหม่หรือbackendเพื่อเริ่มงานนี้

## ช่องว่างภาพและงานเพิ่มที่บันทึกไว้

- ไอคอนวัสดุยังเป็นline artเดิม หากต้องการภาพpaintedเหมือนcrystalในArtwork ต้องทำartpacketแร่/ฝุ่นพร้อมalpha/ขนาดเป้าหมายเพิ่มเติม ไม่ได้ผลิตแล้วในชุดนี้ การนำร่องด้วยไอคอนเดิมต้องบันทึกเป็นvisual variance
- ลายกรอบSVGเป็นฉบับลดรายละเอียดสำหรับขนาดเล็ก หากเปลี่ยนเป็นลายละเอียดขึ้นต้องรักษาsafe bounds/focusและตรวจภาพจริงใหม่
- gear128sourceที่แสดง96CSS/DPR2ยังเป็นresample ตรวจบนเครื่องจริงก่อนกำหนดงานภาพละเอียดขึ้น ไม่เปลี่ยนตัวตนดาบให้เหมือนconceptสมมติ
- NativeOSfont/browserzoom, Safari/iOS, screenreader, performanceและผู้เล่นจริงยังไม่มีผลจากprototype ต้องระบุสิ่งที่ตรวจจริงในPR ไม่อ้างผลเกินหลักฐาน

ข้อเสนอการนำเข้ารอบแรกคงassetเกมเดิมและ4SVGที่มี พร้อมแสดงข้อแตกต่างภาพเหล่านี้ในการreview ไม่สรุปว่าเจ้าของได้เลือกภาพpaintedหรืออนุมัติvisualสุดท้ายจากคำสั่งทำแผน

## การทดสอบ การเผยแพร่ และการย้อนกลับ

ใช้ [ACCEPTANCE_TH.md](integration-07/ACCEPTANCE_TH.md) เป็นรายการรับงาน เก็บผลใหม่บนcommitimplementationจริง ผลprototype140/9/26เป็นreferenceเท่านั้น ไม่เปลี่ยนป้ายเป็นผลเกม

RuntimePRใช้quality/browser workflowเดิม ห้ามใช้skip-ciหรือปรับgateให้ผ่าน งานส่งต่อครั้งนี้เป็นdocs-onlyจึงตรวจsource-map/ลิงก์/hash/diff ไม่รันเกมซ้ำหรือรอdeploymentที่ไม่ได้ร้องขอ

เมื่อนำเข้าและเผยแพร่ในงานถัดไป เก็บimplementationcommit/merge/Pagesrun/รูปจริงและผลเทสต์ให้ตรงกัน หากต้องย้อนภาพให้revertเฉพาะruntimepresentationcommitผ่านPRและเช็กworkflowเดิม ไม่resetสาขาเกม ไม่ย้อนsave/ราคา/ผลตีบวกของผู้เล่น

## งานหน้าดาว/สกิล/อุปกรณ์อื่นหลังนำร่อง

ชุด1–7นี้ปิดงานออกแบบเชิงลึกของหน้าตีบวก ไม่ได้ปิดทุกหน้าในแผนUXD-00–08 หลังpatternผ่านในเกมจึงต่อUXD-02เลือกงาน/เพิ่มLv แล้วดาวตาม [STAR_UPGRADE_TH.md](STAR_UPGRADE_TH.md), สกิล/พัฒนาตัวละครตาม [REVIEW_TH.md](REVIEW_TH.md), อุปกรณ์คำสั่งอื่นตาม [EQUIPMENT_DEVELOPMENT_TH.md](EQUIPMENT_DEVELOPMENT_TH.md)

แต่ละคำสั่งต้องมีผล/ทุน/ข้อมูลที่ถูกใช้หมดและreviewของตน โดยเฉพาะผลสุ่ม/ถ่ายโอน/donor; ไม่คัดตีบวกสำเร็จแน่นอนไปอธิบายคำสั่งสุ่ม และไม่เปิดP04/P09ด้วยการเปลี่ยนUIก่อนระบบจริง
