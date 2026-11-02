# ขั้นที่ 3 — วัสดุ กรอบ แสง และสถานะ UI

วันที่ 2 พฤศจิกายน 2026 · ต่อจาก [Layout ขั้นที่ 2](LAYOUT_02_TH.md) · ชุดออกแบบ ยังไม่แก้เกม

ต่อยอดแล้วใน [ขั้นที่4 Decorative assets](DECOR_04_TH.md); ภาพและCSSด้านล่างคงเป็นbaselineวัสดุขั้น3

## ผลงานที่เปิดดูได้

- [บอร์ดวัสดุและหน้าจอ](material-03/index.html): component sheet และหน้าตีบวก 14 กรอบตาม Layout เดิม
- ภาพตัวอย่างหน้าพร้อมตีบวก [390×844](material-03/ready-390x844.png) / [390×650](material-03/ready-390x650.png)
- [ตัวอย่างสถานะปุ่มและข้อมูล](material-03/component-states-390.png): normal, pressed, focus, disabled, delta, neutral, insufficient, success
- [CSS วัสดุ](material-03/material.css), [token JSON](material-03/tokens.json), [คู่สีที่ตรวจ](material-03/contrast-pairs.json), [ขนาดที่วัด](material-03/validation-measurements.json), [ที่มา asset](material-03/asset-provenance.json)

ภาพชุดนี้เป็น render ของแบบ CSS แยกจากเกม ไม่ใช่ผลการนำเข้าเกมและไม่ใช่ภาพที่วาดสร้างใหม่ ยังใช้ดาบ/ฟอนต์เดิม และใช้ geometry ของไอคอนเดิม ไม่เปลี่ยนตัวละครหรือกฎตามภาพ concept

## ทิศทางวัสดุ

อ้างอิง [Artwork01 ฝั่งซ้าย](01_development_concepts.png): พื้นกรมท่าลึก แผงกระจกน้ำเงินมีแสงด้านบน ขอบบางสองระดับ ตัวเลขทอง ปุ่มทองอุ่น และ cyan เน้นข้อมูลผลลัพธ์ ใช้เงาด้านในกับ gradient สร้างมิติ โดยไม่เพิ่มความหนากรอบหรือขนาดกล่องจาก Layout

| ส่วน | วัสดุที่ออกแบบ | หน้าที่ |
| --- | --- | --- |
| พื้นและกรอบหลัก | กรมท่า + แสงน้ำเงินกว้างอ่อน ๆ; เส้นทองนอกและขอบในจาง | รวมหน้าต่างเป็นชิ้นเดียว ยังไม่มีมุมประดับผลิตจริง |
| Header | น้ำเงินเข้มไล่แนวนอน + ขอบล่าง blue-steel | แยกการนำทางออกจากเนื้อหา; หัวข้อขาวอ่านง่าย |
| Identity | navy glass ไล่แสงบนซ้าย + ขอบ blue-steel | ดาบและชื่อเด่น ไม่ใช้เส้นทองทุก card |
| Tile อุปกรณ์ | น้ำเงินมืด + ขอบ violet + glow เบา | คงตัวอย่าง rarity ของชิ้นเดิม; badge +4 มีพื้นรองอ่านชัด |
| ขั้นตีบวก | พื้นน้ำเงินเข้ม + ขอบทอง + ตัวเลขทองเงาบาง | จุดเด่นรองจากอุปกรณ์ เห็น +4→+5 ชัด |
| ผลต่อผู้สวม | navy glass + ขอบ cyan + highlight ด้านใน | ชี้ไปยังผลที่ต้องอ่านก่อนใช้ของ |
| Disclosure/งานอื่น | น้ำเงินเข้ม ลดแสงและน้ำหนักขอบ | แสดงความสำคัญรอง แต่ยังเห็นขอบและพื้นที่แตะ |
| ค่าใช้จ่าย/dock | น้ำเงินเข้ม + ขอบบนทอง; ช่องวัสดุสองชิ้นมีมิติ | จัดวัสดุและการตัดสินใจเป็นกลุ่มเดียว |
| CTA | ทองอ่อนไปทองเข้ม + highlight บน + bevel ล่าง | ปุ่มหลักเห็นชัด ข้อความกรมท่าและไอคอนค้อนเดิม |

CSS ใช้ gradients, borders, box-shadow และ DOM text ไม่ต้องใช้ background screenshot ของหน้าจอ ไม่มี backdrop blur, shimmer วน หรือ animation ใหม่ในขั้นนี้ ผลกระทบด้าน performance ยังไม่ได้ benchmark

## Token และการนำไปใช้ภายหลัง

ชื่อ `--mv-*` เป็น namespace ของข้อเสนอ เพื่อไม่ทับเกมเมื่อเปิดบอร์ด ไม่ได้กำหนดให้นำชื่อใหม่ทั้งหมดเข้า runtime ควร map กลับ token กลางเดิมเมื่อ integration และ scope ที่ enhancement ก่อน

| Token ในข้อเสนอ | ค่า/การใช้ | สัมพันธ์ของเดิม |
| --- | --- | --- |
| mv-base / mv-surface-low | #08121f / #0d1c2e | navy-950 / navy-900 เดิม |
| mv-text / mv-muted | #f4f7fc / #bbcadb | text / text-muted เดิม |
| mv-gold / mv-gold-edge | #f2d596 / #d9bf86 | gold-light / gold-edge เดิม |
| mv-cyan / mv-mint / mv-coral / mv-violet | #74d4ef / #68e5b6 / #ed927f / #b59aff | veil-cyan / hp-mint / danger-coral / rift-violet เดิม |
| mv-focus | #a3edff | focus เดิม; outline3 offset2 |
| mv-surface-high / mv-edge | #1e3b57 / #6a92ac | ระดับแผง/เส้นขอบที่เสนอเพิ่ม ต้องตรวจร่วม token กลางก่อนนำเข้า |
| mv-gold-top / mv-gold-bottom | #ffe4a4 / #c69b52 | stop สำหรับผิวปุ่มที่เสนอเพิ่ม |
| mv-on-gold | #172135 | text-on-gold เดิม |
| mv-disabled-bg / mv-disabled-text | #26374b / #bbcadb | ผิวปุ่มใช้ไม่ได้; ไม่ลด opacity ทั้งปุ่ม |

รายละเอียด gradient และ shadow อ่านได้ใน CSS/JSON ที่แนบ แก้ค่าที่ token ต้นทางแทนการคัดลอกเฉดไปตามหน้า ให้เพิ่ม Lv/ดาว/สกิลใช้ material family ร่วมกันภายหลัง แต่ไม่ใช้สีหรือรูปทรงแทนคำอธิบายผลสุ่ม/การสูญเสีย donor

## สถานะปุ่มและข้อมูล

| สถานะ | รูปแบบ | ข้อกำหนดส่งต่อ |
| --- | --- | --- |
| Normal primary | ทอง มีไอคอนค้อนและข้อความกรมท่า | Ready=ตรวจรายการ, Review=ยืนยัน ตาม Layout ไม่ใช้ข้อความเดียวกันทั้งสองขั้น |
| Pressed | ลดความสว่างทอง เปลี่ยนเป็นเงากดด้านใน | ไม่ลดขนาดหรือเลื่อน hitbox; CSS :active และตัวอย่าง is-pressed ใช้วัสดุเดียวกัน |
| Focus | เส้น cyan3px ห่าง2px รอบปุ่ม | ไม่ตัด ring ด้วย overflow; is-focus เป็นภาพตัวอย่าง ไม่แทน focus จริงจาก keyboard |
| Disabled | ผิว slate ข้อความยังอ่านได้ ไม่มีทอง | ใช้ native disabled ในตัวอย่าง และแสดงเหตุผล/จำนวนที่ขาดแยกใกล้ปุ่ม |
| Secondary | น้ำเงินมี highlight บน | มี normal/pressed/focus/disabled เช่นกัน แต่ไม่แย่ง CTA |
| Delta | ตัวเลขส่วนต่าง mint + เครื่องหมาย | บอร์ด component ใช้ข้อความแทนค่าจริง; placeholder ใน phone เป็นตัวอย่างจัดหน้า |
| Neutral | เนื้อหาขาว/คำอธิบาย muted | ไม่เพิ่มตัวเลขบวกหรือแถวเปล่าเพื่อให้เหมือน Artwork |
| Insufficient | พื้นแดงม่วงมืด ขอบ coral และข้อความ “ขาด1” | ไม่พึ่งสีอย่างเดียว ตัวอย่างฝุ่นมี2ต้องใช้3เป็น fixture แยก |
| Success | พื้นเขียวเข้ม ขอบ mint และข้อความผลสำเร็จ | ตอนนำเข้าแสดงหลัง committed event จริงเท่านั้น ไม่แสดงจากการกดปุ่มอย่างเดียว |

ตัวอย่างยังไม่มี handler สำหรับปุ่มตรวจรายการ/ยืนยัน/เปลี่ยนชิ้น ไม่มี transaction, storage หรือ API การกดปุ่มมีเพียง CSS pressed/focus และเปิดรายละเอียดได้ ไม่ใช่ prototype flow ขั้นที่5

## ขนาดและแหล่งภาพที่รักษาไว้

ตรวจเทียบ `header/body/dock/identity/art/step/impact` กับ measurements ของขั้น2 ครบ14กรอบ แต่ละพิกัด/ขนาดต่างไม่เกิน0.1px ไม่มีการเพิ่ม padding/border width ที่กินพื้นที่

ยังเป็น tile96×96, header60, dock168, CTA48 และปุ่มรอง/summary≥44; จอเตี้ยเลื่อนเฉพาะ body และเลื่อนถึงงานอื่นของช่างได้ แบบชื่อยาว/safe-areaยังอยู่ครบ ลำดับอ่านพร้อมตีบวกและค่าใช้จ่ายเป็นชุดเดิม

Font/gear atlas อ้างไฟล์ใน `layout-02/assets` โดยไม่ทำสำเนาซ้ำ ไอคอน enhance/ore/dust/act-lock มาจาก `src/ui/svg` ของเกม `07f95a7` คง path/viewBox และเพิ่ม class/aria-hidden เพื่อจัดขนาด ไม่ใช่ asset production ชุดใหม่ มี hash ต้นทางใน provenance

ขอบทองนอก phone เป็น outline จึงไม่เปลี่ยน box model และอาจอยู่นอกภาพ crop390px ให้ตัวอย่างขอบด้านในช่วยอ่านกรอบ ขณะนำเข้าเกมต้องตรวจ clipping กับกรอบ portrait จริง ไม่ถือว่ารูปแบบ outline นี้ผ่าน integration แล้ว

## หลักฐานตรวจ

- Playwright/Chromium: geometry เทียบฐาน14กรอบผ่าน, ปุ่ม/summary≥44px, tile96, ไม่มี content ล้นแนวนอน; จอ650ทั้ง7variantเลื่อนถึงปุ่มงานอื่นและเปิด disclosure ได้
- ตรวจ focus จริงบน primary ด้วย `.focus()` ได้ outline3px; component sheet แสดง focus ตัวอย่างแยก ไม่มีผลตรวจลำดับ keyboard ทั้งหน้า
- ไม่มี pageerror/console error ในรอบตรวจ; รอ fonts.ready, DPR1, reduced motion; เปิดดู ready สองขนาดและ component sheet แล้ว
- คู่สี11คู่คำนวณตาม sRGB relative luminance: ข้อความ muted กับพื้นแผงขอบเขตสว่างอนุรักษนิยมได้5.28:1, ข้อความปุ่มกับ gradient stop มืดสุด6.29:1, ขอบ controlกับพื้นcontrol3.10:1; รายการเต็มใน contrast-pairs.json
- การคำนวณใช้ solid stops ที่เลือกเป็นขอบเขต ไม่ใช่ตรวจทุก pixel ของภาพ gradient/เงา ไม่ใช่การรับรอง WCAG ทั้งหน้า; disabledแม้ไม่อยู่ในเกณฑ์บังคับก็เก็บค่าไว้เพื่ออ่านง่าย
- ไม่มีผล Safari/iOS/เครื่องจริง/text200%/screen reader หรือ usability test; ไม่อ้างว่ากฎเกมหรือ flow ยืนยันผ่านจากบอร์ดนี้ ไม่รัน gameplay suite เพราะไม่มี runtime diff

## งานที่ยังเหลือเพื่อให้ถึง Artwork

ขั้น3เสร็จในระดับ material sheet และ CSS preview ตามขนาดเดิม ยังไม่อ้างเหมือน Artwork ทุกพิกเซล ภาพต้นแบบหลายหน้าจอไม่ได้เป็นสเปกพิกัด production และกรอบ/รายละเอียดแฟนตาซีที่วาดในภาพยังไม่ถูกผลิตเป็น asset

ขั้น4 ให้กำหนดและทำ decorative assets เฉพาะที่จำเป็น:

1. มุมกรอบหลักแบบโปร่งใส/ยืดได้ วางใน gutter ไม่ทับชื่อ/ปุ่มและไม่ใช้ภาพเต็มหน้า
2. เส้นแบ่ง/จุดประดับสำหรับขั้นตีบวก ให้มีขนาดปลอดภัยต่อข้อความไทยและจอเตี้ย
3. ตรวจภาพอุปกรณ์เดิม96pxบน DPR2 ก่อนตัดสินใจวาดใหม่; ไม่เปลี่ยน mapping หรือรูปดาบเพียงเพื่อเลียนแบบภาพ concept
4. ใช้ CSS เดิมต่อสำหรับ panel/CTA ที่ทำได้แล้ว ไม่ทำภาพปุ่มพร้อมข้อความ จัดเอกสาร slicing/safe bounds หากต้องใช้กรอบภาพ

หลัง asset จึงทำ prototype แยกและตรวจ fidelity/flow ตามแผนเดิม ก่อน integration หน้าตีบวกและขยายไปดาว/สกิล/อุปกรณ์อื่น ยังไม่แก้ source/public/deployment ของเกมจากงานนี้
