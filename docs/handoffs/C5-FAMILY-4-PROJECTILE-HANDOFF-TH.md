# C5.4 — ลูกธนู/มีดบิน: handoff สำหรับแชตใหม่

สถานะล่าสุด27ต.ค.2026: เจ้าของให้ผ่านartworkและ40คลิปruntime R1แล้ว สั่ง “เอาเข้าเกมได้” PR84 merged7c392b5หลังquality/browserผ่าน Pages40503739046เผยแพร่successครบbuild+4browser shards+deployเวลา19:37:55น.กรุงเทพฯ [release proof](../validation/projectile-vfx-release/README_TH.md) ไม่เริ่มตระกูล5 Briefเริ่มงานด้านล่างเป็นประวัติ ไม่ต้องเริ่มตระกูล4ซ้ำ

27 ตุลาคม 2026 · เจ้าของขอ handoff หลังตระกูล3เผยแพร่แล้ว งานแชตนี้เตรียมเอกสารเท่านั้น ยังไม่มี artwork/runtime/PR ของตระกูล4 และยังไม่มีภาพตระกูล4ที่เจ้าของอนุมัติ

## ฐานและ release proof ที่ต้องตรวจก่อนเริ่ม

- Repository `wnau34-nptrn/asterveil-fateweave` เท่านั้น; base `feature/fateweave-initial-prototype` ต้อง fetch ล่าสุด ไม่ทำงานต่อจากสาขาตระกูล3เก่า
- ตระกูล3 R2 เจ้าของตรวจ29คลิปแล้วสั่ง “นำเข้าเกมได้”; PR78 merge `1cfe87493397fe30b0548857c4727971ff2844f8` และ Pages40460582964 success ครบbuild/browser4shards/deploy เวลา13:37:22น.กรุงเทพฯ
- อ่าน `docs/validation/healing-vfx-release/README_TH.md` และ `release.json`; docs-only follow-up20854baเก็บหลักฐาน ไม่เปลี่ยนruntimeที่เผยแพร่
- Premerge quality40458494729/browser40458494882ผ่าน:875unit/76files,sourceVFX93,prechecks3,production249ผ่าน/204skip; postmergequality40460582881ผ่าน ไม่อ้างว่าskipคือผ่าน
- Live HEADจากcloudถูกexecutionproxyปฏิเสธCONNECT403ก่อนถึงเว็บ จึงยังไม่มีหลักฐานHTTP200/hashCDNจริง ผลเผยแพร่ยึดPages/artifact/mergeSHA ไม่ใช้403นี้อ้างว่าเกมเสีย
- Branchใหม่ที่เสนอ `codex/vfx-family-4-projectile`; ตระกูล4หนึ่งPRเข้าฐานเกม ไม่ใช้PR78ต่อ ไม่ทำตระกูล5ในงานเดียวกัน
- เก็บงานCloudflareและแผนตลาด/quest/worldbossบนฐานล่าสุดไว้ครบ งานนี้ไม่เกี่ยวกับการตั้งค่าCloudflareหรือระบบใหม่

## อ่านก่อนทำ

1. `AGENTS.md`, `CLAUDE.md`, `docs/DEVELOPMENT_PLAN_TH.md`
2. C5 ใน `docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md`; `docs/design/SYSTEMS_REFERENCE.md` ส่วนVFX/combat presentation
3. `docs/combat-presentation/vfx-art-direction/README_TH.md`
4. `src/game/visuals/{bolt-fx,exec-ward-fx,blade-fx,defense-fx,healing-fx}.ts`, `src/game/scenes/BattleScene.ts`, atlas/คลิปที่สัมพันธ์กัน
5. Healing release proof และ `docs/combat-presentation/healing-slice/README_TH.md` โดยเฉพาะR2 anchoring/afterglow/actual-event routing
6. กลไกจริงใน `src/core/battle/engine.ts`, types, contentสกิล/talents และ playback เพื่ออ่านจังหวะเท่านั้น ห้ามแก้rules/save/balance/playbackเพื่อภาพ

## ขอบเขต7ท่าและข้อเท็จจริงที่ต้องยืนยันบนฐานล่าสุด

ตารางนี้ตรวจจากengineของรุ่น1cfe874/20854ba เป็นจุดเริ่มตรวจ ไม่ใช่การอนุมัติภาพหรือข้อเสนอเปลี่ยนกลไก

| ท่า | กลไกจริงที่ภาพต้องรักษา |
|---|---|
| hinder | ยิงเดี่ยวแล้วใส่delayรอบถัดไปเฉพาะเป้าที่ยังอยู่; heavyhinderอาจต่อdelayอีกรอบ ไม่วาดเป็นstun/cancelอัตโนมัติ |
| volley | strikeศัตรูมีชีวิตทุกตัว ไม่จำกัดแถวหน้า; volleyhinderเลือกศัตรูที่ยังอยู่และเร็วสุดให้delayจริง ไม่วาดdelayให้ทุกตัว |
| weakshot | damageเดี่ยว ได้bonusเมื่อเป้าอยู่ในสถานะdelayedตามengine ไม่ใช่คริติคอลหรือarmorbreakอัตโนมัติ |
| pin | strikeเฉพาะศัตรูแถวหน้า แล้วตั้งpinned/ส่งpin eventให้แถวหน้าหยุดscreeningตามเวลา ไม่ใช่หยุดเทิร์นหรือยิงทุกตัว |
| track | damageเดี่ยว; ลงทะเบียนยิงซ้ำท้ายรอบเฉพาะเป้าที่ยังอยู่และdelayed ยิงซ้ำจริงผ่านtrackingShotsเมื่อผู้ยิงกับเป้ายังอยู่ ต้องแยกcastจากeventภายหลัง ห้ามวาดสองhitทันทีทุกcast |
| disengage | caseปัจจุบันทำdamageเดี่ยวและย้ายเป้าที่ยังไม่เดินไปท้ายคิวรอบนี้; quickstepเพิ่มdelayรอบหน้า, covershotเพิ่มdamageตามintentจริง ไม่เปลี่ยนช่องยืนunitจริง อย่าเดาจากชื่อท่าหรือcommentเก่าว่าทุกcastต้องสร้างdodge อ่านevent/stateจริง |
| knives | ยิงศัตรูแถวหลังทั้งหมดแม้มีscreen; ถ้าแถวหลังว่างจึงยิงแถวหน้า; twinknivesเพิ่มstrikeแถวหน้าครึ่งpowerเมื่อมีแถวหลัง ส่วนquickknivesลดcooldown ไม่ใช่เพิ่มจำนวนhit |

อ่านผู้รับdamage/dodge/absorb/guard/block/cancelจากresolved eventsและsnapshotจริง แต่ละstrikeอาจมีผู้รับจริงต่างจากเป้าที่เลือก ห้ามปลอมhitหรือเพิ่มstrikeให้ตรงartwork หากกลไก/comment/contentขัดกันให้ยึดengineและฝากClaudeแยก ไม่แก้กฎในงานภาพ

## ขั้นแรก: artwork3จังหวะให้ดูก่อนruntime

- ทำเตรียม/จุดเด่น/สลายครบ7ท่าให้เอกลักษณ์ต่างกันด้วยรูปทรง เส้นทาง จังหวะและจำนวนตามกลไก ไม่ใช่แค่เปลี่ยนสี แนวภาพเป็นข้อเสนอจนเจ้าของเลือก
- ใช้ImageGenได้ตามที่อนุญาตแล้ว ตรวจtools/skillsที่มีจริง เก็บoriginal/prompt/provenanceและalphaจริง แก้เฉพาะVFXไม่ให้AIวาดทับสนาม/UI/ตัวละคร
- คอมโพสิตกับสนามจริงจากrenderer/resolverที่390×844 มีหน้าเลือกท่าและ3phase/เทียบสนามเปล่า/น้ำหนัก/คืนค่า ส่งภาพให้ดูครั้งละ1–2ภาพ390px
- น้ำหนักกลางแต่เห็นชัด มีปลายฟุ้ง/afterglowที่อ่านการเคลื่อนที่ โปร่งไม่ทับชุด/อาวุธ/HP/ข้อความ เอกลักษณ์ projectile ต้องเห็นจุดปล่อย→เส้นทาง→ผู้รับจริง ไม่ยืมวงhealมาแทนทุกท่า
- บทเรียนR2: อย่ายึดslotคงที่หรือบวกoffsetโดยไม่ตรวจtransformจริง ต้องตามrendered unitรวมpose/recoil/idle/fieldshake และไม่คูณDPRซ้ำ ตรวจ2×/3×ด้วยจุดอ้างอิงอิสระจากhelperที่กำลังทดสอบ สำหรับprojectileใช้จุดปล่อย/จุดรับที่เหมาะกับภาพจริง ไม่บังคับยึดsoleแบบhealทุกท่า
- เตรียมreferenceสำหรับtrackยิงซ้ำจริงและknivesตามแถว/talentจริง ไม่แต่งeventเพื่อจับภาพ ถ้าไม่มีผลจริงในfixtureให้สร้างencounter/คำสั่งที่ถูกกฎ
- โครงที่เสนอ: `incoming/ART-VFX-PROJECTILE-001/`, `docs/combat-presentation/projectile-storyboards/`, ภายหลัง `public/assets/fx/projectile_fx.{webp,json}` กับ `src/game/visuals/projectile-fx.ts` หนึ่งatlas/moduleต่อทั้งตระกูล
- ส่งartworkให้เลือก/แก้ก่อนต่อruntime การเริ่มงานไม่ใช่การอนุมัติภาพที่ยังไม่ได้เห็น

## หลังเจ้าของเลือกartwork

- ต่อatlas/moduleเดียวตามจังหวะเดิมของ`src/ui/battle-playback.ts` ห้ามแก้playback timing/core/save/content/balanceเพื่อให้ภาพสะดวก
- คงunit-animation,foregroundlabels,optional-assetsไม่ขวางStart และcleanupเมื่อskip/load/resize/hidden ไม่มีunowned timer/listener
- reduced-motionใช้ภาพนิ่ง; reduced intensityลดน้ำหนัก/การเคลื่อนไหว ไม่เปลี่ยนผลหรือเวลา รักษาfallbackเมื่อatlasหาย
- รักษาblade+defense+healing dev-source gatesในCI/Pages และproduction suite เพิ่มprojectile gateตรงไปตรงมา ไม่skipปัญหาเพื่อให้เขียว
- รันtypecheck/lint/unit/buildและfocusedbrowserที่เหมาะสม ให้CIรันfullbrowser ไม่เพิ่มtestsที่สะท้อนimplementationอย่างเดียว
- อัดactualruntime390pxครบ7ท่า รวมresponseที่เกิดจริง/หลายเป้า/แถวหน้า-หลัง/trackท้ายรอบ/twinknives/fast/reduced/OS-reduced แยกcaptureจากtests
- เก็บทุกrawframeและtimestampจริง ไม่มีspeedup/interpolation ตรวจdecodedPTS/count/ปลายคลิป; ใช้บทเรียนencoder90kHz/noBframesของhealingและรันpackให้เสร็จก่อนbrowserอ่านไฟล์
- ส่งคลิปในPRตระกูล4ให้เจ้าของตรวจ ก่อนmerge/เผยแพร่/เริ่มตระกูล5 บันทึกการอนุมัติแยกจากผลtests
- อัปเดตบนสุดCODEX-TO-CLAUDE, development/new-chat handoffและสถานะC5ทุกงาน; standing authorizationครอบคลุมimplementation/tests/commit/push/PR/releaseตามงาน ไม่ถามอนุญาตซ้ำสำหรับขั้นที่อนุมัติแล้ว

## ข้อความเปิดแชตใหม่

```text
ทำ VFX Asterveil-Fateweave ต่อ ตระกูล4 ลูกธนู/มีดบิน
อ่าน docs/handoffs/C5-FAMILY-4-PROJECTILE-HANDOFF-TH.md แล้วเริ่มตามนั้น
ตระกูล3 R2 PR#78 เจ้าของให้ผ่านและ merge/เผยแพร่แล้ว ตรวจrelease proofและfetchฐานล่าสุดก่อนเริ่ม
เริ่มartwork3จังหวะของทั้ง7ท่า hinder/volley/weakshot/pin/track/disengage/knives ให้ดูก่อนruntime
ตรวจengineจริง โดยเฉพาะtrackยิงซ้ำท้ายรอบ, pinเฉพาะแถวหน้า, knivesตามแถวและtalent และdisengageไม่เดาผลจากชื่อ/comment
แต่ละท่ามีเอกลักษณ์ น้ำหนักพอดี มีปลายฟุ้งตามหลัง โปร่งไม่ทับชุด ยึดตำแหน่งunitที่วาดจริง อ่านชัด390px ใช้ImageGenได้ตามที่อนุญาตแล้ว
ทำเฉพาะตระกูล4หนึ่งPR ส่งคลิปจริงให้ตรวจก่อนmerge/เผยแพร่/เริ่มตระกูล5 ไม่แก้rules/save/balance/playback timing
```
