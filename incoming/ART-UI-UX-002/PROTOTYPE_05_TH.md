# ขั้นที่5 — ต้นแบบกดใช้งานหน้าตีบวก

วันที่ 2 พฤศจิกายน 2026 · ต่อจาก [Decorative assets ขั้นที่4](DECOR_04_TH.md) · ไม่แก้เกม

ปรับต้นแบบต่อและตรวจขนาดอื่น/text200%/keyboardแล้วใน [ขั้นที่6](QA_06_TH.md) ข้อมูลผลตรวจด้านล่างเป็นbaselineขั้น5; การเปลี่ยนใหม่และข้อจำกัดดูเอกสารขั้น6

## เปิดทดลอง

ไฟล์หลักอยู่ [prototype-05/index.html](prototype-05/index.html) ให้บริการชุด ART-UI-UX-002 ทั้งโฟลเดอร์ผ่าน HTTP เพื่อให้ relative paths ของภาพ/ฟอนต์/วัสดุครบ:

```sh
python3 -m http.server 5185 --bind 127.0.0.1 --directory incoming/ART-UI-UX-002
```

แล้วเปิด `http://127.0.0.1:5185/prototype-05/` เครื่องที่รัน server ต้องมีไฟล์ชุดนี้ ไม่ใช่ URL ของเกมหรือเว็บสาธารณะที่เผยแพร่แล้ว ในจอมือถือ controls ทดลองจะอยู่ใต้กรอบ ส่วน desktop อยู่ด้านข้าง

เลือกตัวอย่างเริ่มต้นจากแผงทดลองด้านนอกกรอบ: พร้อมตีบวก / ฝุ่นไม่พอ / ถึงเพดาน / ไม่มีผู้สวม / ชื่อยาว และเลือกความสูง844/650หรือปรับตามหน้าต่างได้ มี safe-areaจำลอง24/34 และปุ่มเริ่มใหม่

ต้นแบบไม่เชื่อมบัญชี เซฟ หรือทรัพยากรในเกม ไม่มี localStorage/sessionStorage/API หรือการนำเข้าโค้ดเกมในbrowser ข้อมูลอยู่ในหน่วยความจำหน้าเดียว รีโหลดหรือเริ่มตัวอย่างใหม่แล้วคืนค่าเริ่มต้น

## ชุดพกพา

สคริปต์ [make-portable.py](prototype-05/make-portable.py) สร้างZIPที่รวมเฉพาะต้นแบบและภาพ/ฟอนต์/CSS/SVGที่จำเป็นครบ20ไฟล์ พร้อมREADMEวิธีเปิด ไม่ต้องติดตั้งnpmเพื่อทดลอง UI:

```sh
python3 incoming/ART-UI-UX-002/prototype-05/make-portable.py /tmp/fateweave-enhancement-prototype-05.zip
```

ZIPตัดบอร์ดArtworkก่อนหน้าออก และปรับลิงก์ช่วยเหลือในindexเป็นREADMEภายในZIPเท่านั้น โค้ดinteraction/fixtures/วัสดุเหมือนต้นฉบับ ตรวจarchive CRCและrelative linksของHTML/CSSครบแล้ว ไฟล์ส่งเจ้าของในworkspaceอยู่ `/workspace/artifacts/fateweave-enhancement-prototype-05.zip` ไม่ได้publishไปเกม

## สิ่งที่กดได้

| การกระทำ | ผลในต้นแบบ | การใช้วัสดุจำลอง |
| --- | --- | --- |
| ตรวจรายการ | ready→review แสดงชิ้น/ขั้น/ต้นทุนเดิม โฟกัสกลับไปแก้ไข | ไม่ใช้ |
| กลับไปแก้ไข/Escapeในreview | กลับready คืนรายละเอียด/ตำแหน่งเลื่อนและโฟกัสปุ่มตรวจรายการ | ไม่ใช้ |
| ยืนยัน | ตรวจsnapshotปัจจุบันแล้วเพิ่มทีละ1ขั้น แสดงsuccessและยอดคงเหลือ | หักครั้งเดียวหลังยืนยันผ่าน |
| ดับเบิลคลิก/Enterค้าง | ไม่ยืนยันหรือใช้วัสดุซ้ำจากinputต่อเนื่อง | จำนวนcommitไม่เพิ่มซ้ำ |
| ดูขั้นถัดไป | success→ready อ่านcost/ผลจากsnapshotขั้นถัดไป | ไม่ใช้ |
| เปลี่ยนอุปกรณ์ | เปิดpickerสามชิ้น เลือกแล้วแสดงผลของชิ้นนั้น หรือกลับชิ้นเดิม | ไม่ใช้ |
| ล็อก/ปลดล็อก | toggle aria-pressed/ชื่อปุ่ม; ล็อกไม่ห้ามตีบวกตามกฎเกมปัจจุบัน | ไม่ใช้ |
| รายละเอียด | เปิดค่าอุปกรณ์/ผลต่อผู้สวม และทุนจากการทดลองนี้ | ไม่ใช้ |
| งานอื่นของช่าง | เปิดรายชื่อขอบเขตคำสั่ง แล้วกลับหน้าตีบวกเดิม | ไม่ใช้; ยังไม่ทำคำสั่งอื่น |
| ปิดหน้าตีบวก | กลับหน้าต้นทางจำลอง เก็บค้นหา/หมวด/scroll/focus | ไม่ใช้ |
| ฝุ่นไม่พอ | ปุ่มตรวจรายการdisabled มีข้อความจำนวนขาด | ไม่ใช้ |
| ถึงเพดาน | ไม่มีCTAอัปเพิ่ม มีปุ่มเลือกชิ้นอื่น | ไม่ใช้ |

หน้าต้นทางเป็นmockสำหรับลองการรักษาค้นหา/หมวด/โฟกัส ไม่ใช่implementationหน้าตัวละครจริง หมวดภาพรวมเป็นค่าcontextจำลองไม่ได้ทำหน้าภาพรวมใหม่ รายชื่อคำสั่งอื่นเป็นทางเข้าแสดงขอบเขต ไม่ได้เพิ่มLv/เลื่อนสี/สุ่ม/ถ่ายโอน/รีไซเคิลในต้นแบบนี้

## ข้อมูลตัวอย่างและกฎที่แยกไว้

[fixtures.json](prototype-05/fixtures.json) และไฟล์classicJSที่โหลดคู่กันเป็นข้อมูลส่งออกแบบอ่านอย่างเดียวจากเกม `07f95a7f164b8b232c1c26edb0b4f31360df323f` ไม่คัดตัวเลขจากArtwork:

- Seed17, เอกิส★3, ค่ายLv6, อาวุธrarity index3/Lv6/dawn, affixPoolสามค่าต้น, +4เริ่มต้น, แร่120ฝุ่น48
- ส่งออกsnapshot +4ถึง+20ด้วย `enhanceCost`, `itemStats`, `starred` และ `characterStats`; เพดาน20มาจาก `map.equipment.forge.plusCap[3]` ไม่ใช่การเปลี่ยนcapเกม
- +4→+5 ใช้แร่8/ฝุ่น3 เหลือ112/45; ค่าอุปกรณ์โจมตี26→27 แต่ผลรวมผู้สวมในfixtureนี้เท่าเดิม จึงแสดงneutralที่ผลต่อเอกิสและแสดงค่าอุปกรณ์ในรายละเอียด
- ขั้นถัดไป+5→+6อ่านcost9/3จากsnapshot ไม่แสดงราคาขั้นเก่าซ้ำ; ทำต่อได้จนทุนไม่พอหรือถึงcapของsnapshot
- ชิ้น#2เป็นอาวุธแบบเดียวกันในคลัง ไม่มีผู้สวม; ชิ้น#3เป็นตัวอย่างcap+20; ชื่อยาวเป็นข้อความทดลองแยกscenario ไม่ใช่เพิ่มอุปกรณ์ใหม่ในเกม
- ทุนที่แสดงในรายละเอียดคือเฉพาะยอดลงทุนจากการทดลองรอบนี้ ไม่อ้างว่าเป็นrefundทั้งหมดของชิ้นตั้งแต่ก่อนเริ่ม; ไม่จำลองรีไซเคิลและไม่คำนวณrefundใหม่

ตอนเปิดต้นแบบbrowserโหลดเพียงsnapshotข้อมูล ไม่มีbattle/save/rule engine หรือpackageเกมในbundle ตรรกะหักวัสดุเป็นsimulationเพื่อทดสอบinteraction ไม่ใช่production resolver และไม่ใช้แทนauthoritative preview/commitของเกมเมื่อintegration

## Review guard และผลสำเร็จ

reviewเก็บfingerprintของrevision, uid, plus, bankและcost พร้อมtarget; ยืนยันแล้วล้างreviewทันทีและตรวจเทียบข้อมูลปัจจุบัน ถ้าทุนหรือขั้นเปลี่ยนต้องกลับreadyพร้อมเหตุผลและตรวจรายการใหม่ ไม่มีการหักจากreviewเก่า

ปุ่ม “จำลองทุนเปลี่ยนระหว่างตรวจรายการ” ด้านนอกกรอบลดฝุ่น1และเพิ่มrevisionไว้ทดสอบstale review ไม่ใช่ฟังก์ชันผู้เล่นในเกม ยืนยันหลังจากนี้ต้องถูกปฏิเสธ แม้ทุนใหม่ยังพอ

successสร้างหลังsimulationcommitเสร็จจริง พร้อมจำนวนที่ใช้/ยอดหลังหักและขั้นที่สำเร็จ ปุ่มดูขั้นถัดไปไม่หักของ โฟกัสไปข้อความsuccess มีaria-liveประกาศผล ไม่มีanimationใหม่ในรอบนี้

ตัดclickdetail>1และkeydownrepeatของEnter/Space เพื่อไม่ให้inputค้างไหลไปการกระทำขั้นถัดไป ส่วนการยืนยันซ้ำจากnetwork/serverหรือหลายแท็บอยู่นอกsimulationนี้

## ภาพและการจัดพื้นที่

ใช้Layout2, CSSMaterial3และSVGDecor4ร่วมกัน อ้างasset/fontเดิมโดยไม่ทำสำเนาซ้ำ ไฟล์base-layout.cssเป็นสำเนาbaselineเพื่อใช้ต้นแบบหน้าเดียว; prototype.cssเพิ่มinteraction surfacesและdockแบบintrinsic height ขณะข้อความยาวไม่ตัดทิ้ง

ความสูงdockขั้นต่ำ168และCTAขั้นต่ำ48; เนื้อหาbodyรับพื้นที่ที่เหลือ จึงอาจต่างฐานคงที่เล็กน้อยตามborder/ข้อความจริง อย่าอ้างpixel-perfectจากต้นแบบนี้ ภาพอุปกรณ์ยัง96px ชื่อยาวขยายcardได้ และcaptionguardถูกเรียกหลังrender/fontพร้อมกับResizeObserver

ภาพส่งมอบเป็นต้นแบบ ไม่ใช่ภาพเกมหลังแก้:

- [Ready390×844](prototype-05/ready-390x844.png) / [Ready390×650](prototype-05/ready-390x650.png)
- [Review390×844](prototype-05/review-390x844.png)
- [Success390×844](prototype-05/success-390x844.png)

## ผลตรวจ

[validation-results.json](prototype-05/validation-results.json) บันทึก26กลุ่มตรวจinteraction: 13กลุ่มที่390×844 และ13กลุ่มที่390×650 ด้วยChromium touch emulation/reduced-motion

ครอบคลุมgeometry/target, reviewไม่หักของ, cancelคืนdetails/scroll/focus, confirmครั้งเดียวแม้doubleclick, nextไม่ใช้ของ, insufficient/cap, stale, lock, picker, งานอื่น, ต้นทางค้นหา/หมวด/focus, Escape/Enterค้าง, ชื่อยาว/safe-area และreloadreset ตรวจJSsyntaxและsnapshotexportด้วย

รอบสุดท้ายไม่มีpageerror/consoleerrorหรือrequestออกนอกlocalhost ใช้Storage.setItem guardให้throwทันทีหากพยายามเขียนเซฟ ผลผ่านหมายถึงsimulationนี้ ไม่ใช่ทดสอบเกมจริง/เซฟmigrationหรือproductionresolver

ระหว่างร่างพบIDปุ่มเลือกชิ้นซ้ำในสถานะcap แก้ให้เป็นpick-primaryแล้วตรวจครบ26กลุ่มใหม่ เปิดดูภาพreadyจอเตี้ยและsuccessแล้ว

สคริปต์ทำซ้ำอยู่ [check.cjs](prototype-05/check.cjs) ใช้Playwrightของโปรเจกต์ ไม่เพิ่มdependencyใหม่ เปิดHTTPserverก่อนแล้วรันจากcheckoutที่มีnode_modules:

```sh
node incoming/ART-UI-UX-002/prototype-05/check.cjs
```

เปลี่ยนURLด้วยPROTOTYPE_URL และbrowserด้วยPLAYWRIGHT_CHROMIUM_EXECUTABLEได้ ค่าเริ่มต้นใช้localhost5185และ/usr/bin/chromium ในenvironmentนี้ ถ้าart worktreeไม่มีnode_modulesให้ใช้NODE_PATHของcheckoutเกมเดิม สคริปต์จะเขียนภาพและรายงานทับเฉพาะในprototype-05

ยังไม่มีผลSafari/iOS/เครื่องจริง/text200%/screen reader/320px/480px หรือผู้เล่นจริง ไม่มีการรับรองaccessibility/fidelityทั้งหน้าหรือrollback/productionintegration และไม่รันgameplay suiteเพราะไม่มีruntimediff

## งานถัดไปขั้นที่6

ตรวจfidelityและresponsiveจากต้นแบบนี้ด้วยสถานะ/fixtureเดียวกันกับArtworkและแบบก่อนหน้า แยกความต่างด้านข้อมูลออกจากวัสดุ ตรวจข้อความยาว/200%/safe-area/จอแคบและkeyboardก่อนส่งต่อขั้น7

จากนั้นจึงจัดรายการเปลี่ยนจริงและเกณฑ์รับเข้าเกม โดยคงauthoritative preview/commit, returncontext, saveและbalanceเดิม การทำprototypeเสร็จครั้งนี้ไม่ใช่การอนุมัติmerge/deployเกม และยังไม่ออกแบบทุกหน้าดาว/สกิล/อุปกรณ์อื่นแทนหน้าตีบวก
