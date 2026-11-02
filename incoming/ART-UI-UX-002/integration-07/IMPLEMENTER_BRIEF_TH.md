# Brief สำหรับเริ่มงานนำภาพตีบวกเข้า runtime

ใช้ข้อความนี้เปิดงานimplementationถัดไปได้ งานปัจจุบันจบที่สเปกส่งต่อ ไม่ได้เริ่มเปลี่ยนเกม

## เป้าหมาย

นำLayout/Material/Decorของ ART-UI-UX-002 เข้าหน้าตีบวกจริง โดยต่อยอดflowUXD-01ที่เผยแพร่แล้ว ให้ผู้เล่นเห็นชิ้น/ขั้น/ผล/ต้นทุนและยืนยันชัดเจน รวมถึงresponsiveและkeyboard ไม่เปลี่ยนrules/save/balanceหรือพัฒนาทุกหน้าพร้อมกัน

## อ่านก่อนลงมือ

1. AGENTS.md / CLAUDE.md และsource branchเกมล่าสุด
2. [INTEGRATION_07_TH.md](../INTEGRATION_07_TH.md) — mapping/ข้อกำหนดข้อมูล/ลำดับลงมือ/assetgap
3. [runtime-map.json](runtime-map.json) — 26pathsพร้อมblobและ8anchors; refreshถ้าฐานเกมเปลี่ยน
4. [ACCEPTANCE_TH.md](ACCEPTANCE_TH.md) — AC01–15ยังรอผลruntime
5. [ต้นแบบ](../prototype-05/index.html), [Layout](../LAYOUT_02_TH.md), [Material](../MATERIAL_03_TH.md), [Decor](../DECOR_04_TH.md), [QA](../QA_06_TH.md)

## ฐานและการเริ่ม

ฐานเกมที่ตรวจล่าสุด07f95a7; designฐาน73a7e57ในDraft PR133 ควรใช้สาขาimplementationใหม่จากเกมล่าสุดและเก็บเฉพาะassetที่เลือก ไม่mergeartbranchทั้งชุดหรือเอาprototypeappแทนระบบจริง ตรวจlocalworkเดิมก่อนเปลี่ยนและเก็บdesktop/viewportงานเก่าไว้

## สิ่งที่ทำ

- ForgeWorkbench.enhancementPage: identity96พร้อมchange/lock, ขั้นกลาง, neutralผลจริง, detailsรวมข้อมูลเดิมครบ, costcards/dockตามพื้นที่จริง
- คงhost/guard/readonlypreviewเดิม; receiptจากenhanced/eventจริงและเพิ่มexplicit next-previewที่ไม่ใช้ของ; capเลือกชิ้นอื่นด้วยselectorไม่ซ้ำ
- คงLobbyUI/CharacterPanelreturncontextและfocus; prototypeoriginเป็นmockต้องไม่คัดมา
- ScopedCSS/materialและSVG4ไฟล์1594bytesตามassets.json; paletteเดิม/relativetype/ข้อความwrap/target44/CTA48; viewport/container/safe-areaใช้ของเดิม
- Portresponsive/text200/keyboardcaseไปtestเกมจริง ขนาดdesktopจากgameBounds ไม่เอาlabheightไปล็อก

## สิ่งที่ไม่คัดเข้า runtime

app.js/fixturesJSON+JS/modelbank/paid/revisionจำลอง, prototypeCSSทั้งก้อน, labdropdown100/200, mockorigin, rawmotifPNG, conceptboards และscriptทดสอบต้นแบบ

ไม่แก้core/battle, core/save, core/world, src/content, saveversion, ราคา/RNG/เพดาน หรือworkflowsจากงานนี้ ถ้าการจัดรูปแบบดูเหมือนต้องเปลี่ยนกฎให้บันทึกเหตุผลในhandoff ไม่แอบแก้เพื่อให้ภาพตรงconcept

## ข้อแตกต่างภาพที่ต้องรายงาน

ใช้รูปดาบ/ไอคอนเกมจริงเป็นฐาน ไอคอนแร่/ฝุ่นpaintedแบบArtworkยังไม่ได้ผลิต, กรอบSVGละเอียดน้อยกว่าภาพวาดและgear128ยังresampleDPR2 ต้องระบุในPR ไม่ใช้ค่าhero+4สมมติหรือclaim100%เหมือนเพื่อปิดงานภาพ

## ส่งมอบimplementation

PRที่มีdiffจำกัดหน้าตีบวก + ผลAC01–15บนcommitจริง + ภาพ390ของready/review/success/blockedที่จำเป็น + ผลquality/browser4shards/Pagesbaseที่ตรงcommit + handoffและสิ่งที่ยังไม่ตรวจ ถ้ามีเผยแพร่ในงานimplementationให้ระบุmerge/Pagesrunจริง ไม่อ้างผลprototypeเป็นการdeploy

แผนขั้น1–7เป็นงานออกแบบของหน้าตีบวกนำร่อง ไม่แทนแผนUXD-02–08ของดาว/สกิล/อุปกรณ์อื่น จบรอบนี้ก่อนขยายคำสั่งถัดไปตามIMPLEMENTATION_PLAN_TH.md
