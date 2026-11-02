# ขั้นที่ 4 — Decorative assets และพื้นที่ปลอดภัย

วันที่ 2 พฤศจิกายน 2026 · ต่อจาก [Material ขั้นที่3](MATERIAL_03_TH.md) · ยังไม่แก้เกม

## ชุดส่งมอบ

- [บอร์ดตัวอย่าง](decor-04/index.html) และภาพพร้อมตีบวก [390×844](decor-04/ready-390x844.png) / [390×650](decor-04/ready-390x650.png)
- [ชิ้นส่วนที่ขนาดจริงและขยาย](decor-04/asset-preview-390.png)
- SVG โปร่งใส: [มุมกรอบ](decor-04/assets/frame-corner.svg), [รางแนวนอน](decor-04/assets/frame-edge-horizontal.svg), [รางแนวตั้ง](decor-04/assets/frame-edge-vertical.svg), [ปลายเส้นประดับ](decor-04/assets/divider-wing.svg)
- [CSS ประกอบ](decor-04/decor.css), [ขนาด/anchor/พื้นที่ปลอดภัยและhash](decor-04/assets.json), [ผลวัด DOM](decor-04/validation-measurements.json)
- ต้นแบบลายจาก image_gen: [ภาพต้นฉบับ](decor-04/motif-source.png) และ [prompt/ภาพอ้างอิง](decor-04/prompts.json)

สี่ SVG เป็น asset สำหรับงานออกแบบและต้นแบบถัดไป ยังไม่ผ่าน integration ในเกม ภาพ390เป็น render ของแบบ ไม่ใช่ screenshot เกมที่เผยแพร่แล้ว

## ที่มาของลายและวิธีผลิต

ใช้ image_gen โดยแนบ Artwork01 จริง ขอทองเส้นบาง/ดาวสี่แฉก/แสงcyanและพื้นโปร่งใส ผลได้ภาพRGBA1774×887 alpha0–255 เก็บต้นฉบับ byte-identical โดยไม่ crop/repaint หรือแก้ pixels

ภาพต้นแบบให้ภาษาลายที่ละเอียดกว่าพื้นที่ปลายทาง จึงเขียน SVG เป็นการตีความทางเทคนิคแยกต่างหาก ลดลวดลายให้เหลือเส้นคู่และดาวเล็ก ไม่ใช่ auto-trace หรือแปลงภาพเป็น SVG อัตโนมัติ ไม่ใช้ภาพต้นแบบเป็นพื้นหลังเต็มหน้า และไม่ฝังแผงทึบ/ตัวหนังสือลง asset

ใช้ game-ui-frontend และแนวทาง brief ของโปรเจกต์ `fateweave-codex-art-brief` ประกอบ ข้อกำหนด animation strip/VFX/seed ตัวละครไม่เกี่ยวกับชุดตกแต่งนิ่งนี้ ไม่เริ่ม wave อนิเมชันหรือขอ motion approval จากผลภาพนิ่ง

## ขนาดและวิธีประกอบกรอบ

| Asset | ViewBox / ขนาด CSS มาตรฐาน | จุดวางและการยืด |
| --- | --- | --- |
| frame-corner | 0 0 32 32 / 32×32 | มุมซ้ายบนที่0,0; ขวาบนmirrorX, ซ้ายล่างmirrorY, ขวาล่างmirrorXY; ไม่ยืดให้เข้าความสูงจอ |
| frame-edge-horizontal | 0 0 8 8 / pitch8, สูง8 | รางบนเริ่มx30จนถึงW−30; repeat-x ที่8px; ล่างmirrorY |
| frame-edge-vertical | 0 0 8 8 / pitch8, กว้าง8 | รางซ้ายเริ่มy30จนถึงH−30; repeat-y ที่8px; ขวาmirrorX |
| divider-wing | 0 0 32 12 / 32×12 | คู่ซ้าย/ขวาข้างคำอธิบายขั้นตีบวก; ขวาmirrorX ไม่ยืดดาว |

กรอบประกอบเป็น8ชิ้น: 4มุม + 4ราง ตรงกลางว่างและแสดง CSS material เดิม จึงไม่ต้องมีภาพ9-sliceขนาดเต็มและไม่ควรใส่ border-image ที่ยืดดาวตามกรอบ เส้นเชื่อมที่30pxทำให้ต่อรางกับปลายเส้นในมุมได้ โดย corner viewport32ยังเก็บขอบกันการตัด

ใช้ HTML layer แยก `.frame-trim`, position:absolute/inset0, z-index3, pointer-events:none, aria-hidden=true; ทุกชิ้นตกแต่งไม่เป็นปุ่มและไม่อยู่ในtab order เอา pseudo frame ของขั้น3ออกเพื่อไม่ซ้อนเส้นสองชุด Focusของปุ่ม/summaryอยู่z-index4เหนือชั้นตกแต่ง โดยเฉพาะวงfocusปุ่มปิดที่ใกล้ขอบบน

SVGไม่มีภาพภายนอก/font/script/filter และมีขนาดรวมเพียงไม่กี่KB (จำนวนจริงในassets.json) สีgold/cyanอยู่ในSVGเพื่อให้ไฟล์standaloneเปิดดูได้ หากจะปรับธีมในเกมให้กำหนดasset variantอย่างชัดเจน ไม่ใช้CSS filterเปลี่ยนสีทุกสถานะ

## พื้นที่ปลอดภัยและการซ่อนเส้น

- กรอบหลักใช้แถบขอบ0–8px; ดาวมุมอยู่ในบริเวณ0–10pxของมุมนั้น ทดสอบช่องว่างด้านในตั้งแต่inset11pxแล้วไม่มีinkของมุมตกแต่ง
- เนื้อหาและCTAยังเริ่มx16ตามLayout; ไม่เพิ่มpadding/borderที่กินพื้นที่ ไม่เปลี่ยนขนาด44/48pxของcontrol
- เส้นประดับอยู่ในstepที่left/right12px, top57px, ขนาด32×12; ต้องเหลือพื้นที่คำอธิบายจากขอบซ้าย/ขวาอย่างน้อย52px
- ตัวอย่างใช้ `.step-caption` วัดเนื้อข้อความหลังfonts.ready ถ้ากว้างชนพื้นที่52pxหรือสูงเกิน24px ให้ซ่อนทั้งสองข้างทันที ไม่ย่อฟอนต์/ตัดข้อความ/ซ่อนคำอธิบายแทนลาย
- ทดลองข้อความยาวแล้วguardซ่อนปีกทั้งคู่ผ่าน; ตอนนำเข้าจริงต้องเรียกguardหลังข้อความ/locale/ขนาดfontเปลี่ยน รวมResizeObserverของframe ไม่พึ่งwindow resizeอย่างเดียว
- Frame layerไม่รับpointer; การfocusยังต้องทดสอบkeyboardทั้งเส้นทางในprototype ภาพนี้ไม่รับรองfocus restoration/scrollทุกกรณี
- Safe-area24/34ของบอร์ดยังเป็นการจำลองเดิม มุมอิงขอบframe ไม่ใช่ขอบแผงbody จึงไม่หักsafe-areaซ้ำ ใช้กฎviewportของเกมเมื่อintegration

## ภาพอุปกรณ์เดิมที่DPR2

ตรวจtileเดิม96×96CSSpxผ่านChromium DPR2เป็นภาพ192×192devicepx เปิดดูแล้วดาบและbadgeยังแยกอ่านได้ในต้นแบบ ไม่มีการเปลี่ยนmappingหรือวาดดาบใหม่

Source cellของgear atlasมี128×128px ดังนั้น96CSSpxที่DPR2คือการresampleขึ้น1.5เท่า ไม่ใช่asset native2x และยังเห็นความนุ่มของเส้นบางบ้าง ข้อเสนอนี้ให้ใช้ของเดิมต่อสำหรับprototype แล้วตัดสินใจเรื่องภาพละเอียดขึ้นจากการดูบนอุปกรณ์จริง ไม่ถือว่าDPR2emulationแทนผลมือถือจริง

ไม่ได้แก้หรือคัดลอกgear atlas/fontซ้ำ บอร์ดยังอ้างlayout-02/assetsและmaterial-03/material.css ฉบับเดิม

## ผลตรวจที่ทำแล้ว

- Chromium/Playwrightตรวจ14กรอบ: header/body/dock/identity/art/step/impactตรงLayoutฐานภายใน0.1px, art96, target≥44, ไม่มีcontentล้นแนวนอน
- จอ650ทั้ง7variantเลื่อนถึงงานอื่นของช่างได้และเปิดรายละเอียดได้ ปุ่มหลักยังสูง48และอยู่ในdockเดิม
- Decorative layerมีpointer-events:none/aria-hidden=trueครบ14กรอบ; captionที่มีลายแสดงอยู่ผ่านsafe bounds และlong-caption guardผ่าน
- Renderมุมบนcanvasขนาด2xแล้วอ่านalphaของพื้นที่protected inset11px ไม่พบink; เป็นการตรวจรูปทรงมุม ไม่ใช่pixel auditทุกlayerทั่วหน้าจอ
- Focusจริงprimaryมีoutline3px และCSSยกfocusไว้เหนือกรอบ; ไม่ได้ตรวจkeyboard traversalหรือscreen readerทั้งหน้า
- ไม่มีpageerror/consoleerrorในรอบตรวจ; เปิดดูภาพreadyทั้งสองความสูงและgearDPR2แล้ว ตรวจPNGdecode, SVGXML, ลิงก์และhash
- เก็บprompt/ต้นฉบับRGBAและSVGแยกกันชัดเจน ไม่มีการใช้ของหรือทดสอบtransactionในบอร์ดนี้ ไม่รันgameplay suiteเพราะไม่มีruntime diff

ไม่มีผลSafari/iOS/เครื่องจริง/200%/performance benchmark/fidelityคะแนนหรือusability test ภาพนี้ยังไม่ใช่การอนุมัติให้merge/deployเกม

## ส่งต่อขั้นที่5

ทำprototypeแยกจากเกมที่กดได้ครบ ready→review→success และกรณีไม่พอ/ถึงเพดาน โดยใช้Layout2+Material3+Decor4ชุดเดียวกัน เก็บการเปลี่ยนชิ้น/ยกเลิก/กลับ/ล็อก/เปิดรายละเอียดและfocusไว้ในstateจำลอง แยกจากเซฟจริงชัดเจน

กำหนดfixtureที่ระบุแหล่งข้อมูลและไม่ลอกค่าตัวอย่างในArtworkเป็นกฎเกม ต้องไม่ทำให้preview/ยกเลิกใช้ของ และผลสำเร็จต้องแสดงหลังยืนยันหนึ่งครั้งในsimulationเท่านั้น จากนั้นค่อยทำขั้น6ตรวจfidelity/flow/จอและขั้น7ส่งต่อintegration ยังไม่แก้source/publicหรือเปิดพัฒนาทุกหน้าพร้อมกันในงานตกแต่งนี้
