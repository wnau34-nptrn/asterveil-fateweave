# ขั้นที่6 — Fidelity, responsive และ keyboard ของต้นแบบ

วันที่ 2 พฤศจิกายน 2026 · ฐานก่อนตรวจ `d220b45` · ปรับเฉพาะต้นแบบ ไม่แก้เกม

## ผลตรวจและการตัดสินใจ

ต้นแบบตีบวกผ่านชุดตรวจresponsive140กรณี, keyboard/reflow/guidance9กลุ่ม และregressioninteractionเดิม26กลุ่มหลังปรับ แนะนำส่งต่อขั้น7เพื่อจัดสเปกintegrationได้ โดยเก็บรายการช่องว่างภาพด้านล่างไว้เป็นงานส่งต่อ ไม่อ้างว่าภาพเหมือนArtwork100%หรือทดสอบproductionเกมแล้ว

ต้นแบบที่ปรับยังอยู่ [prototype-05/index.html](prototype-05/index.html) ใช้ไฟล์ร่วมจากLayout2/Material3/Decor4 ภาพเทียบ [Ready390×650](qa-06/ready-390x650.png) / [ข้อความ200%390×650](qa-06/text200-390x650.png) เป็นการrenderต้นแบบ ไม่ใช่การเปลี่ยนเกมที่เผยแพร่

## ปัญหาที่พบและแก้ในต้นแบบ

| ก่อนแก้ | หลังแก้ | หลักฐาน |
| --- | --- | --- |
| ที่480×844ใช้กรอบ390และเหลือขอบข้าง45ต่อฝั่ง | กรอบใช้พื้นที่ถึง480ตามเพดานportrait | matrix480px frame.width480 |
| Desktop1366×768 กรอบสูง768เริ่มy24 จึงจบที่792 | auto heightหักmargin48 ได้กรอบ480×720 ที่y24 จบ744 | matrixdesktop fits viewport |
| Probeขยายข้อความ200%เดิม: headerสูง60แต่หัวข้อสูง60เริ่มy−0.5 ติดขอบ | headerเป็นintrinsic height, titleห่อบรรทัดได้, ปุ่มปิด44ยังแยกอยู่ | titleInside=trueทุกกรณี |
| จอ320×568/200% reviewที่วางวัสดุและสองปุ่มในdockเบียดbodyเหลือ33px; safe-areaทำให้dockเกินกรอบ | 200%และความสูง<720ย้ายวัสดุเข้าbody; reviewให้วัสดุอยู่ต้นbodyก่อนชิ้น/ผล และคงactionsในdock | ที่320×568 safe24/34 review: body225, dock183 ไม่มีส่วนเกิน |
| ไม่มีตัวควบคุมtext-only resizeสำหรับทดลอง | เพิ่ม100/200%ที่แผงlabด้านนอก ข้อความ14→28px แต่ภาพยัง96px | keyboard/reflowและmatrixfont |
| จอเล็กกว่า320×560/มือถือแนวนอนยังแสดงกรอบใช้งาน | แสดงคำแนะนำขยายพื้นที่/หมุนจอ ซ่อนframeและตั้งinert โดยไม่เปลี่ยนbank/review | desktop-smallและcoarse-landscape checks |

แก้เฉพาะprototype.css, app.js, index.htmlและเอกสาร/ไฟล์ผลตรวจที่เกี่ยวข้อง ไม่แก้src/tests/public/core/save/economyหรือshader/assetเกม

## ขอบเขตตรวจresponsive

[responsive-results.json](qa-06/responsive-results.json) เก็บ140กรณีตามสูตร 5viewport × 2text scale × 2safe-area × 7state/scenario:

| Viewport | สถานะinputของชุดmatrix | สิ่งที่ตรวจ |
| --- | --- | --- |
| 320×568 | Chromium viewport/fine pointer | จอเล็กสุดที่อนุญาต, ข้อความยาว, reviewสองปุ่ม |
| 390×650 | Chromium viewport/fine pointer | จอเตี้ยและการย้ายค่าใช้จ่ายเมื่อ200% |
| 390×844 | Chromium viewport/fine pointer | ขนาดอ้างอิงหลักพร้อมnormalและaccessibilityvariant |
| 480×844 | Chromium viewport/fine pointer | เพดานความกว้างและพื้นที่เพิ่มเติม |
| 1366×768 | Chromium desktop | portrait480×720และlabด้านข้าง ไม่ขยายเต็มmonitor |

แต่ละviewportตรวจ100/200%, safe0/0และ24/34, ready/review/successพร้อมscenarioinsufficient/capped/unowned/long-name รวม7กรณีต่อชุด ตรวจขนาดกรอบ/ขอบล่าง, body≥44, dockไม่เกินframe, headerไม่ทับปิด, ไม่มีcontentล้นแนวนอน, controls≥44 และซ่อนลายcaptionเมื่อข้อความ200%

ตัวอย่างผลที่วัด:

| กรณี | Header / Body / Dock (CSS px) | ผล |
| --- | --- | --- |
| 320×568, 200%, safe24/34, review | 160 / 225 / 183 | ใช้bodyอ่านต้นทุนและชิ้นได้ ปุ่มแยกด้านล่าง |
| 390×650, 200%, safe0/0, review | 136 / 365 / 149 | ค่าใช้จ่ายอยู่ต้นbody ปุ่มสองแถว |
| 480×844,100%,ready | 60 / 615 / 169 | ใช้กรอบ480เต็มพื้นที่portrait |
| Desktop1366×768,100%,ready | 60 / 491 / 169 | frame480×720 จบก่อนขอบหน้าต่าง |

ชุดmatrixเป็นviewportบนChromium ไม่ใช่ผลมือถือจริง ส่วนtouchที่390สองความสูงอยู่ในregression26กลุ่มเดิม และการหมุนจอเป็นcoarse/mobileemulationแยกในkeyboardชุด9กลุ่ม

## ข้อความ200%และพื้นที่อ่าน

เป็นtext-only resizeที่ควบคุมผ่านCSSvar `--text-scale` ไม่ใช้transform/zoomทั้งหน้าหรือขยายรูปภาพ ขนาดเนื้อหาหลัก14→28, ชื่อ18→36, ตัวเลข32→64; line-heightเพิ่มตาม ขนาดภาพ96และไอคอน/ปุ่มปิดคงขนาดเดิมที่อ่านได้

ชื่อ/คำอธิบาย/ปุ่มห่อบรรทัด ไม่ใช้ellipsisหรือfontย่อกลับ Identityเปลี่ยนเป็นแนวตั้งเมื่อ200%เพื่อให้ชื่อมีพื้นที่ ส่วนเนื้อหาใช้scrollsurfaceเดียว ลายcaptionซ่อนเมื่อพื้นที่ไม่พอ

ในจอสูง<720ที่200% ค่าใช้จ่ายย้ายเข้าbody: reviewวางก่อนชิ้นอุปกรณ์ให้เห็นต้นทุนก่อนกดยืนยัน; ready/successวางก่อนรายละเอียดและเลื่อนถึงได้ ปุ่มตรวจรายการ/ยืนยันยังอยู่dock ไม่ทำให้ทุกช่องแสดงพร้อมกันด้วยการย่อทั้งหน้าต่าง

นี่ไม่ใช่ผลOS Dynamic Type, browser-native zoom, font substitution หรือscreen reader บนเครื่องจริง ต้องตรวจสิ่งเหล่านั้นก่อนนำเข้าเกมจริง

## Keyboard, input และการคงข้อมูล

[keyboard-results.json](qa-06/keyboard-results.json) มี9กลุ่มตรวจ:

1. Tabจากปิด→เปลี่ยนชิ้น→ล็อก→summary→งานอื่น→ตรวจรายการ, Shift+Tabย้อนกลับ, Spaceเปิด/ปิดdetails, targetอยู่ในbodyที่เห็นและoutline3px
2. EnterเปิดpickerและEscapeคืนfocusปุ่มที่เรียก
3. Enterเปิดreviewโดยไม่commit, โฟกัสกลับแก้ไขก่อน; Tabเลือกconfirmแล้วEntercommitครั้งเดียวและfocussuccess
4. Text200ยังใช้ภาพ96pxและscrollbodyเดียว
5. จอเตี้ยอ่านcostด้วยscrollได้ และreviewแสดงcostต้นbody
6. ภาพ390normal/200ที่fixtureเดียวกัน
7. จอdesktopแคบ310ซ่อนframeและไม่เปลี่ยนทุน/review เมื่อกลับ390ยังเป็นreview
8. Desktopใช้frame480และสูงไม่เกินviewport
9. Coarse landscapeซ่อนframe/inertและกลับportraitแล้วreview/bankเดิม

ชุดinteractionเดิม26กลุ่มผ่านอีกครั้งหลังแก้ ครอบคลุมdoubleclick/Enterค้าง/stale/cancelคืนscroll+details+focus/lock/picker/ต้นทางmock/ของไม่พอ/cap/reloadreset พร้อมguardห้ามStorage.setItem ไม่มีexternalrequestหรือconsole/pageerrorในชุดนั้น

ไม่ได้อ้างscreen readerผ่านจากaria/DOMตรวจ และไม่ถือว่าการคืนcontextของmockแทนการทดสอบหน้าตัวละครจริงตอนintegration

## เทียบกับArtworkโดยใช้สถานะเดียวกัน

อ้างอิง [Artwork01 ฝั่งซ้าย](01_development_concepts.png) พร้อมตีบวก +4→+5 เทียบกับReadyของprototypeที่ชิ้นLv6/+4และcost8/3 ภาพconceptเป็นหลายหน้าจอพร้อมฉากนอกโทรศัพท์ จึงเทียบภาษาภาพ/ลำดับข้อมูล ไม่ใช้ทั้งboardเป็นภาพpixel-referenceขนาด390

| ประเด็น | ผลเทียบ | การตัดสินใจส่งต่อ |
| --- | --- | --- |
| เป้าหมายหน้าตีบวก | งานเดียว/ชิ้นเดียว/ขั้นเดียวและมีreviewแยก | คงflowนี้ |
| จุดนำสายตา | ภาพอุปกรณ์96px, ชื่อ, ตัวเลขทอง32, ผลหลักเปิดทันที | คงขนาดbaseline; ไม่ย่อเพื่อใส่ฉากประดับเพิ่ม |
| วัสดุ/สี | navy glass/inner highlight/ทองCTA/cyanผล/mintdeltaเข้าทิศทาง | ใช้tokenกลางและscopeenhancementในการนำเข้า |
| มุม/เส้นประดับ | มีSVGยืดตามกรอบและดาวเล็กแล้ว แต่รายละเอียดน้อยกว่าลายวาดในconcept | เป็นvectorฉบับอ่านชัดขนาดเล็ก ไม่อ้างถอดภาพเหมือนทุกเส้น; ถ้าต้องการลายวาดละเอียดให้เป็นassetvariantพร้อมsafe boundsเดิม |
| ภาพดาบ | ใช้gear registryจริง ไม่ใช่ดาบที่image_genวาดในArtwork | คงตัวตนอุปกรณ์จริง; ภาพDPR2ยังเป็น128source resample ต้องตัดสินจากอุปกรณ์จริงก่อนวาดใหม่ |
| ไอคอนแร่/ฝุ่น | ต้นแบบเป็นline iconเดิม ต่างจากcrystal/material painted tileในArtwork | ช่องว่างภาพที่ยังเหลือ: ถ้าต้องการความเหมือนระดับภาพนี้ ให้เตรียมcurrency painted artแยก โดยไม่ฝังชื่อ/จำนวน; ไม่แต่งว่าชุดนี้ผลิตแล้ว |
| ผลค่าสถานะ | fixtureนี้heroรวมเท่าเดิม แต่itemโจมตี26→27อยู่ในรายละเอียด ต่างจากconceptที่ใส่deltaตัวอย่าง | คงค่าจริง; ห้ามปลอมhero+4เพื่อให้ภาพตรง |
| ปุ่ม/ค่าใช้จ่าย | ปุ่มทองมีbevelและค้อน, ใช้/มี/เหลือเป็นกลุ่ม | คงready=ตรวจรายการและreview=ยืนยัน; accessibilityvariantยอมreflow |
| ฉากวิหาร/ชื่อบอร์ด | ไม่รวมลงในกรอบprototype | เป็นฉากนำเสนอ ไม่ใช่assetที่ต้องวางใต้ทุกหน้าต่าง |

ไม่มีคะแนนความเหมือนเป็นเปอร์เซ็นต์หรือข้อสรุปpixel-perfectจากงานนี้ การดูภาพโดยผู้ใช้จริง/เจ้าของยังแยกจากผลเทสต์อัตโนมัติ

## สคริปต์และการทำซ้ำ

เปิดserverตาม [วิธีเปิดต้นแบบ](PROTOTYPE_05_TH.md) แล้วรันจากcheckoutที่มีPlaywrightโปรเจกต์:

```sh
node incoming/ART-UI-UX-002/qa-06/check-responsive.cjs
node incoming/ART-UI-UX-002/qa-06/check-keyboard.cjs
node incoming/ART-UI-UX-002/prototype-05/check.cjs
```

ใช้PROTOTYPE_URL/PLAYWRIGHT_CHROMIUM_EXECUTABLEได้ตามenvironment; art worktreeนี้ใช้NODE_PATHไปnode_modulesของcheckoutเกมเดิม รายงานและภาพเขียนเฉพาะincoming ไม่มีruntimebuild/deploy หากmatrixมีfailสคริปต์exitไม่สำเร็จ

การวัดต้องรอrender/font/สองanimation framesให้layoutและcaptionguardเสร็จ และเลื่อนหน้าlabกลับขึ้นก่อนเทียบbounds ไม่ใช้ตำแหน่งframeที่ติดลบเพราะกำลังดูแผงlabเป็นหลักฐานoverflow

ZIPฉบับปรับอยู่ `/workspace/artifacts/fateweave-enhancement-prototype-06.zip` สร้างด้วยmake-portable.pyเดิมพร้อมREADMEใหม่ ขนาดอื่น/200%ทดลองได้จากแผงนอกกรอบ ไม่เชื่อมเกม/เซฟ/API

## สิ่งที่ต้องตรวจตอนขั้น7และintegration

ขั้น7จัดhandoffที่ระบุไฟล์runtimeเป้าหมาย, mappingtoken/asset, guard/returncontextที่ต้องใช้ของจริง, regressionที่ต้องผ่าน และvisual acceptance checklist โดยเก็บช่องว่างcurrency art/ornamentไว้ชัดเจน

เมื่อเชื่อมเกมต้องใช้gameBounds/sizecontainerและviewportของเกม ไม่คัดlab/media-queryทั้งต้นแบบเข้าproduction; ย้ายresize guard/scale/cost reflowตามโครงสร้างDOMจริง ห้ามนำsnapshotหรือsimulationหักของไปแทนcore rules และห้ามเพิ่มsave schemaจากงานภาพ

ยังคงเหลือSafari/iOS/เครื่องจริง/OSfont/browserzoom/screenreader/ผู้เล่นจริง, production-save/transaction/network, performanceและการreturnหน้าตัวละครจริง การตรวจต้นแบบครบในรอบนี้ไม่ใช่ผลผ่านเรื่องเหล่านั้น และไม่ใช่คำสั่งmerge/deployเกมหรือเปิดงานดาว/สกิล/อุปกรณ์ทุกคำสั่งพร้อมกัน
