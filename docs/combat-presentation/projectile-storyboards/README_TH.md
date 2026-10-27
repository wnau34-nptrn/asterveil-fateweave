# C5.4 — ลูกธนู / มีดบิน · artwork R1 ที่เจ้าของเลือกแล้ว

เจ้าของเลือก R1ด้วย “ดำเนินการขั้นต่อไป” แล้ว27ต.ค.2026 ต่อruntimeในPR84เดิม; ขั้นเสนอเดิมด้านล่างเป็นประวัติ ยังต้องส่งคลิปจริงให้ตรวจ ก่อนmerge/เผยแพร่/ตระกูล5

27 ตุลาคม 2026 · `codex/vfx-family-4-projectile` → `feature/fateweave-initial-prototype` · [draft PR#84](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/84) ตระกูล4หนึ่งPR ตั้งแต่ artwork ถึงคลิป runtime ภายหลัง

[หน้าเลือก 7 ท่า / 3 จังหวะ / 14 กรณีจริง](index.html) มีเตรียม/จุดเด่น/สลาย เลือก phase, เทียบสนามเปล่า, น้ำหนัก60–110% และคืนค่า100% ภาพทุกช่อง390×844px เลือกหรือแก้ artwork ก่อนต่อ runtime ตามคำสั่งเจ้าของ งานนี้ยังไม่มี projectile module/atlas ในเกม ไม่มีคลิป runtime ใหม่ และยังไม่ merge/เผยแพร่/เริ่มตระกูล5

| ท่า | เอกลักษณ์และผลจริง | ภาพ390px: เตรียม / จุดเด่น / สลาย |
|---|---|---|
| hinder | ศรเงินฟ้าหางแตกริ้ว; delay รอบหน้าเฉพาะเป้ารอด ไม่มี stun/cancel | [01](hinder-base-0-390.png) · [02](hinder-base-1-390.png) · [03](hinder-base-2-390.png) |
| volley | ศรพัดทองแยกทางไปศัตรูมีชีวิตทั้ง4; ไม่จำกัดแถวหน้า | [01](volley-base-0-390.png) · [02](volley-base-1-390.png) · [03](volley-base-2-390.png) |
| weakshot | ศรเข็มแคบทองแต้มแดง; ไม่ใส่ภาพ critical/armorbreak อัตโนมัติ | [01](weakshot-base-0-390.png) · [02](weakshot-base-1-390.png) · [03](weakshot-base-2-390.png) |
| pin | หมุดฟ้าคานคู่; strike เฉพาะแถวหน้าและ pinned หยุด screening ตามกฎ ไม่หยุดเทิร์น | [01](pin-base-0-390.png) · [02](pin-base-1-390.png) · [03](pin-base-2-390.png) |
| track | ศรลาเวนเดอร์ริ้วคู่; หนึ่งhit ตอน cast ยิงซ้ำแยก event ท้ายรอบจริง | [01](track-base-0-390.png) · [02](track-base-1-390.png) · [03](track-base-2-390.png) |
| disengage | ศรหยกหางปัดกลับ; damage+ย้ายเป้าที่ยังไม่เดินไปท้ายคิว ไม่ย้ายช่องยืนและไม่มี dodge ที่เดาเอง | [01](disengage-base-0-390.png) · [02](disengage-base-1-390.png) · [03](disengage-base-2-390.png) |
| knives | ใบมีดเงินกุหลาบหางโค้ง ไม่มีขนศร; strike แถวหลังแม้มี screen | [01](knives-base-0-390.png) · [02](knives-base-1-390.png) · [03](knives-base-2-390.png) |

ตัวเลือกเพิ่มเติมใน viewer: [track เป้า delayed](track-delayed-1-390.png), [track counter ท้ายรอบ](track-followup-1-390.png), [weakshot เป้า delayed](weakshot-delayed-1-390.png), [knives ไม่มีหลัง](knives-frontonly-1-390.png), [twinknives](knives-twin-1-390.png), [volleyhinder](volley-volleyhinder-1-390.png), [quickstep](disengage-quickstep-1-390.png)

## ความจริงของภาพและการจัดวาง

ภาพเหล่านี้เป็น static concept composites ไม่ใช่ภาพผล damage หลัง contact และไม่ใช่คลิปเคลื่อนไหว: ทุกphaseใช้ screenshot ก่อน cast เดียวกันต่อกรณีเพื่อเทียบน้ำหนัก จุดเด่นเป็นตัวอย่างช่วง projectile กำลังเดินทาง ส่วนสลายเป็นริ้วหลังแนวรับ ไม่มีตัวเลขหรือสถานะที่แต่งขึ้น HP/UI จึงคงภาพอ้างอิง ไม่ได้แสดง HP หลังแต่ละ hit

ImageGen สร้างเฉพาะ21cell RGBA: เตรียม/ศรหรือมีดหนึ่งเล่ม/หางฟุ้ง ของ7ท่า ตัว compositor ใช้หนึ่งเล่มต่อ damage/dodge recipient หรือ Tracking counter จริง ไม่เพิ่ม hit ตามจำนวนริ้ว เส้นทางโค้งและรูปทรงแยกแต่ละท่า ปลายฟุ้งจากต้นฉบับยังเป็น alpha จริง ไม่มีการลบพื้นหลังด้วย color key หรือวาดทับ pixels ของเกม

จุดยึดตาม rendered unit ของ `BattleScene` ไม่ใช่ตำแหน่งslotตายตัว; landmark ปล่อยผูกกับยอดคันธนู Mira และมือ/คมมีดด้านซ้าย Sefa ที่ตรวจจากภาพจริง (สัดส่วนตามขนาดunit) ปลายทางผูกกับ body ผู้รับจริง ใช้ CSS pixels ไม่คูณDPRซ้ำ สกัด mask จาก source frame และ world transform ของ sprite จริงโดยอิสระเพื่อให้ชุด/อาวุธอยู่หน้า VFX คง pixels ของชุดเดิมและจำกัดภาพในสนาม ไม่ใช่วง heal ใต้เท้า การตาม pose/recoil/shake ระหว่างเคลื่อนไหวยังต้องตรวจอีกครั้งเมื่อ runtime หลังเลือก artwork

Fixture ใช้ encounterนิยาม QA ที่มี4ศัตรู/4เพื่อนและ commands ที่ resolver ยอมรับ ไม่เขียน BattleState หรือแทรก events: delayed มาจาก helper ใช้ hinder จริงก่อนผู้ยิง, followup ผ่าน commands จนจบรอบและพบ `counter` ข้อความ `Tracking shot.` จาก `strikeBack` ไม่ใช่ damage event; cast ที่ไม่ delayed ไม่มี counter ภายหลัง Pin strike2หน้า, knives2หลัง/2หน้าเมื่อหลังว่าง/twin4ผู้รับ ส่วน twinหน้าใช้ครึ่งpowerตามengine; volleyhinder มี delay เพียงตัวเดียว

## ฐานและ release proof ที่ตรวจ

- Fetch ฐานเกมล่าสุด `8f00428` ก่อนแยก branchใหม่ ไม่ทำต่อ branchตระกูล3 และไม่ใช้ `main` ซึ่งมีเพียง project bootstrap
- อ่าน healing release README/release.json; PR78 merged `1cfe87493397fe30b0548857c4727971ff2844f8`
- ตรวจ GitHub API Pages40460582964: completed/success, headSHA ตรง merge, updated27ต.ค.2026 13:37:22กรุงเทพฯ
- healing atlas ในcheckout SHA256 `dc176c363d9b0b0a5d6af1491190572f75388c1015e2af4e9213f3a5c332e965` ตรง release proof; artifact digestใน release.json `sha256:635392eb61077bf2fdeeefa0b775be3e9f0ce4616d428fad8ce41f226e73b5a4`
- ไม่อ้างว่าได้ตรวจ liveHTTP200/hashCDN ใหม่; ข้อจำกัด CONNECT403 ของรุ่นก่อนยังแยกจากผล Pages สำเร็จ

## ทำซ้ำ / การตรวจ

```sh
PROJECTILE_ART=references PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/projectile-art.spec.ts
python docs/combat-presentation/projectile-storyboards/build_manifest.py
PROJECTILE_ART=render PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/projectile-art.spec.ts
python docs/combat-presentation/projectile-storyboards/verify_composites.py
```

ใช้ Chromium cloud/SwiftShader ไม่ใช่ Safari/มือถือจริง Browser skill ถูกอ่านแล้ว แต่ไม่มี callable browser-control tool ในsessionนี้ จึงใช้ Playwright ตาม workflow โครงการ Screenshot/UI จริงผ่าน fixture; originals/prompt/provenance อยู่ใน [ART-VFX-PROJECTILE-001](../../../incoming/ART-VFX-PROJECTILE-001/NOTES.md) รายละเอียดผลตรวจรอบส่งมอบบันทึกใน handoff และ composite-verification.json การผ่าน tests ไม่ใช่การอนุมัติ artwork โดยเจ้าของ

ผลตรวจรอบส่งมอบ: typecheck/lint/buildผ่าน,875unit/76filesผ่าน, references2/2 (14กรณี+DPR2/3), viewer1/1,42pixel-preservationผ่าน ไม่มีmode skipที่นับเป็นpass เจ้าของยังไม่เลือกartwork R1
