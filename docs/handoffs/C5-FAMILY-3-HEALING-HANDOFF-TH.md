# C5.3 — แสงรักษา: handoff สำหรับแชตถัดไป

สถานะล่าสุด27ต.ค.2026: เจ้าของตรวจR2แล้วสั่ง “นำเข้าเกมได้” ให้ผ่านmotionและนำเข้าเกมผ่านPR78เดิม PR78 mergeแล้ว `1cfe874` คุณภาพ+browserผ่าน Pages40460582964สำเร็จครบbuild+4browser shards+deploy ดู [release proof](../validation/healing-vfx-release/README_TH.md) ไม่เริ่มตระกูล4 ข้อความรอตรวจด้านล่างเก็บเป็นประวัติ

ล่าสุดR2: เจ้าของขอเพิ่มน้ำหนักแสง/ปลายฟุ้งตามหลังและแก้ตำแหน่งไม่ตรงunit จึงยึดsoleจริงแบบfollowทุกเฟรม เปลี่ยนrear layer+front sole rimและภาพหางฟุ้งในPR78เดิม ดูhealing-slice/README_TH.md ยังไม่ผ่านmotion ไม่เริ่มตระกูล4

สถานะ27ต.ค.2026: เจ้าของเลือกartworkR1ครบ6ท่าด้วย “ดำเนินการขั้นต่อไปได้” หลังส่งภาพ390px ต่อruntimeในbranch `codex/vfx-family-3-healing` / draftPR#78เดิมแล้ว [คลิปและผลตรวจ](../combat-presentation/healing-slice/README_TH.md) รอmotion reviewก่อนmerge/เผยแพร่/ตระกูล4 ไม่ย้อนขั้นไปขอเลือกR1อีก เอกสารขั้นเตรียมด้านล่างคงไว้เป็นข้อกำหนด

27 ตุลาคม2026 · เจ้าของให้ไปขั้นถัดไปหลังตรวจคลิปตระกูล2 รวม Rally R5 “วงพื้นเท่านั้น” ด้วยข้อความ “ดำเนินการขั้นต่อไปได้”

## ฐานและขอบเขต

- ทำเฉพาะ `asterveil-fateweave` ฐาน `feature/fateweave-initial-prototype` หลัง PR#77 ตระกูล2 merge/เผยแพร่แล้ว ตรวจหลักฐานล่าสุดใน `docs/validation/defense-vfx-release/README_TH.md` และ fetchฐานก่อนเริ่ม
- สร้าง branchใหม่ `codex/vfx-family-3-healing` แยกจากdefense ไม่ใช้PR#77ต่อ หนึ่งPRสำหรับตระกูล3เท่านั้น
- 6ท่าในคิว: **heal, prayer, rouse, revive, bless, mend** ตรวจengine/contentฐานล่าสุดก่อนสร้างภาพทุกครั้ง ชื่อตระกูลไม่ได้แปลว่าทั้ง6ท่าฮีลทันที
- อย่าวาด Bolt/Execute/Ward/blade/defenseใหม่ การอนุมัติตระกูล2ไม่ใช่การอนุมัติภาพตระกูล3

## อ่านก่อนทำ

1. AGENTS.md, CLAUDE.md และ docs/DEVELOPMENT_PLAN_TH.md
2. C5 ใน docs/handoffs/CLAUDE-TO-CODEX-DEV-TH.md, docs/design/SYSTEMS_REFERENCE.md ส่วนVFX/combat presentation
3. docs/combat-presentation/vfx-art-direction/README_TH.md
4. src/game/visuals/{bolt-fx,exec-ward-fx,blade-fx,defense-fx}.ts และ atlas/clipที่สัมพันธ์กัน
5. docs/combat-presentation/defense-slice/README_TH.md และ defense release proof

## กลไกที่ตรวจจากฐานตระกูล2แล้ว ต้องยืนยันกับฐานล่าสุดอีกครั้ง

| ท่า | ข้อเท็จจริงที่ภาพต้องรักษา | แนวเอกลักษณ์ที่เสนอ ยังไม่ใช่ภาพที่อนุมัติ |
|---|---|---|
| heal | ฮีลเป้าหมายเดี่ยวเฉพาะผู้มีชีวิต; amountเป็นHPที่คืนจริง ถ้าเต็มอาจไม่มีheal event; talentอาจมีbarrier/twin healจริง | แสงรวมสู่เป้าหมายเดี่ยวเป็นกลีบเปิดเล็ก อ่านเป็นการประคอง |
| prayer | ฮีลเพื่อนมีชีวิตทั้งทีมตามผลจริง; longprayerอาจมีhealอีกครั้งรอบถัดไป ไม่รวมtickนั้นเข้ากับcastมั่ว | จังหวะอวยพรหมู่โปร่ง แยกจากจุดรวมเดี่ยวของheal |
| rouse | **ไม่ใช่ฮีลในengineปัจจุบัน** เลือกเพื่อนมีชีวิตอื่นที่สัดส่วนHPต่ำสุดอัตโนมัติ แล้วสร้างguard/all; อ่านผู้ถูกคุ้มจากstate.guard/eventจริง ไม่เดาจากtargetที่คลิก | แสงยืนเคียง/เส้นสัมพันธ์สั้น ไม่ใช่เครื่องหมายเพิ่มHP; ไม่ทับชุดและไม่ย้อนกลับไปใช้คลื่นRallyที่เจ้าของตัด |
| revive | ยกเฉพาะเพื่อนที่ล้มในการต่อสู้นี้ กลับมาด้วยHPตามrevive event; มีข้อจำกัดการใช้จริง อ่านvalidation/targets ไม่สื่อว่าฟื้นคนที่ยังอยู่ | จุดแสงกลับมาที่ฐานเท้าแล้วเปิดออก ชัดต่างจากheal แต่ไม่ครอบศีรษะ/ชุด |
| bless | castเป็นbuff/Renew ไม่ได้ฮีลทันที; round-starthealเกิดเมื่อเงื่อนไขrenewและผู้ร่ายยังอยู่ตามengine | ตราพรสั้น/เมล็ดแสงเปิดโปร่งตอนมอบพร; heal pulseแยกเฉพาะtickจริง |
| mend | castเริ่มsong; ฮีลเพื่อนมีชีวิตเมื่อเริ่มรอบใหม่จริง ไม่ฮีลปลอมตอนตั้งเพลง; talentอาจมีbarrierตอนเริ่มsongและsoloอาจเพิ่มฮีลจริง | ริ้ว/คลื่นโน้ตบางพอดีที่ผู้ร่ายเริ่มเพลง แยกการตอบรับฮีลรอบใหม่ตามevent |

อย่าแก้rules/save/balanceเพื่อให้ภาพเข้ากับชื่อคิว ถ้าต้องเปลี่ยนกลไกให้เขียนคำถามฝากClaude; Rouseยังอยู่ในคิว6ท่านี้ตามแผน แต่ภาพต้องสื่อguardที่เกิดจริง

## ขั้น artwork ก่อน runtime

- สร้าง3จังหวะ เตรียม/จุดเด่น/สลายของทั้ง6ท่าให้เอกลักษณ์ตามกลไก อย่าเพียงเปลี่ยนสี
- ใช้ImageGenได้ตามที่เจ้าของอนุญาตแล้ว ตรวจskill/toolที่มีจริง ไม่ต้องรอเครื่องมือที่ไม่มี เก็บoriginal/prompt/provenanceและalphaจริง
- ภาพVFXพื้นโปร่งแยกจากUI/ตัวละคร คอมโพสิตกับสนามจริง390×844จากrenderer/resolverที่มีอยู่ ไม่ให้AIวาดทับUIหรือชุด
- ส่งครั้งละ1–2ภาพ390px มีหน้าเลือกท่า/3phase/เทียบสนามเปล่า/น้ำหนัก/คืนค่า น้ำหนักกลาง อ่านชัดไม่ทับชุด อาวุธ HPหรือข้อความ
- บทเรียนจากRally: เจ้าของตัดภาพพาดชุดและคลื่นด้านหน้าที่ดูคล้ายโจมตี เลือกวงพื้นเท่านั้นให้Knightนำ→ทีมตอบรับ อย่าฝืนใส่ของตกแต่งที่กลบความหมายสกิล
- รอเลือก/แก้artworkก่อนต่อruntime ไม่ถือว่าการให้เริ่มตระกูล3เป็นการอนุมัติภาพที่ยังไม่ได้ดู
- โครงที่เสนอ: incoming/ART-VFX-HEALING-001/, docs/combat-presentation/healing-storyboards/, public/assets/fx/healing_fx.{webp,json}, src/game/visuals/healing-fx.ts ใช้หนึ่งatlas/moduleตลอดตระกูล

## Runtime หลังเลือกภาพ

- ห้ามเปลี่ยน src/ui/battle-playback.ts หรือrules/save/balanceเพื่อภาพ ทุกrecipient/amount/heal/renew/reviveอ่านeventกับsnapshotจริง ไม่ใช้selectedtargetเดาผล
- Rouseใช้guard.all=true จึงอาจรับแทนจากศัตรูหลายคน อย่ายกเงื่อนไขsourceIdของGuardธรรมดามาใช้ตรงๆจนพลาดครั้งหลัง อ่านbefore.guard/allและdamage recipientจริง หลีกเลี่ยงวาดresponseซ้ำกับdefense module; อย่าเปลี่ยนrulesเพื่อระบุที่มาภาพ
- แยกcastสกิลกับtickต่อเนื่อง; ห้ามฮีลจากbless/mendก่อนเกิดheal event หรือวาดreviveให้คนมีชีวิต/เป้าผิดเงื่อนไข
- รักษาunit-animation, optional assetsที่โหลดไม่สำเร็จแล้วไม่ขวางStart, foregroundlabels และ cleanupเมื่อskip/load/resize/hidden
- reducedmotionเป็นภาพนิ่ง; reducedintensityลดน้ำหนัก/การเคลื่อนไหว ไม่เปลี่ยนผลหรือเวลา
- รักษาblade+defense dev-source gateในCI/Pages และproduction suiteที่skipเฉพาะfixtureที่มีgateนี้ เพิ่มhealinggateอย่างตรงไปตรงมา
- ตรวจtypecheck/lint/unit/buildและbrowserที่เกี่ยวข้อง แยกcaptureจากtestsเพื่อลดframegap
- อัดactualruntime390pxต่อท่าและกรณีที่เกิดจริง: healจริง/เต็มHPหรือbarrieroverflowถ้ามี, prayerหมู่/echoจริง, Rouseผู้รับguardจริง, reviveเป้าล้มจริง, bless/mendcastกับtickจริง, fast/reduced/OS-reduced; ไม่forgeevents
- ส่งคลิปในPRตระกูล3ให้ตรวจแล้วหยุดก่อนตระกูล4 บันทึกบนสุดCODEX-TO-CLAUDEและอัปเดตdevelopment/new-chat handoffทุกงาน

## ข้อความเปิดแชตถัดไป

```text
ทำ VFX Asterveil-Fateweave ต่อ ตระกูล3 แสงรักษา
อ่าน docs/handoffs/C5-FAMILY-3-HEALING-HANDOFF-TH.md แล้วเริ่มตามนั้น
ตระกูล2 PR#77 ผ่านการตรวจของเจ้าของและ merge/เผยแพร่แล้ว ตรวจrelease proofก่อนเริ่ม
เริ่มartwork3จังหวะของทั้ง6ท่า heal/prayer/rouse/revive/bless/mend ให้ดูก่อนruntime
Rouseปัจจุบันเป็นguard ไม่ใช่heal; Bless/Mendไม่ฮีลทันทีตอนcast ภาพต้องตรงeventจริง
แต่ละท่าต้องมีเอกลักษณ์ น้ำหนักพอดี โปร่งไม่ทับชุด และอ่านชัดที่390px ใช้ImageGenได้ตามที่อนุญาตไว้แล้ว
ทำเฉพาะตระกูล3หนึ่งPR และส่งคลิปให้ตรวจ ก่อนเริ่มตระกูลถัดไป
```
