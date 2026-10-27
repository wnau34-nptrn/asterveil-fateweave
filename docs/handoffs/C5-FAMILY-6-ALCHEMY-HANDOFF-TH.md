# C5.6 — ขวดเล่นแร่ · handoff สำหรับแชตใหม่

สถานะ27ต.ค.2026: เริ่มตามคำสั่งเจ้าของแล้วบนฐานfetch1f783f8 branch `codex/vfx-family-6-alchemy` [artworkR1/3จังหวะ/14legalcases390px](../combat-presentation/alchemy-storyboards/README_TH.md) รอเจ้าของเลือกก่อนruntime ไม่มีการmerge/เผยแพร่/เริ่มตระกูล7 เนื้อหาเตรียมงานด้านล่างเก็บเป็นประวัติและข้อกำหนดruntimeต่อไป

27 ตุลาคม 2026 · เอกสารเตรียมงานเท่านั้น ยังไม่เริ่มภาพ/runtime/branch/PR ตระกูล6ในแชตนี้ ใช้ข้อความเปิดแชตท้ายเอกสารเมื่อเริ่มงาน

## ฐานและงานที่จบแล้ว

- Repository `wnau34-nptrn/asterveil-fateweave` เท่านั้น ฐานเกม `feature/fateweave-initial-prototype` อ่าน AGENTS.md/CLAUDE.md ก่อน ห้ามแตะหรือยืมcode/assets/historyของRise Beyond
- ตระกูล5 bash/slam/quake/tremor เจ้าของตรวจ33คลิปจริง390pxและอนุมัติ **“นำเข้าเกมได้”** แล้ว [PR85](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/85) merged `3196e1774ad272045bfbcd2e50f54bf5fab13213`
- [Release proof](../validation/earth-vfx-release/README_TH.md) / [JSON](../validation/earth-vfx-release/release.json): Pages40524232794 successครบbuild+browser4shards+deploy 27ต.ค.2026เวลา22:05:38กรุงเทพฯ เผยแพร่merge3196e17; artifact12743825389ผูกSHAเดียวกัน Quality/browserก่อนmergeผ่าน910unit/78files,157sourceVFX,3prechecks,249productionผ่าน/349skip อย่านับskipเป็นผ่าน
- Approved earth atlas12frames1584×1152/1,391,888bytes SHA256 `96702f00e0998df20ece729fad25326fc7a29fcde0d1185f06b38379f11779e4` Source/public treesในproofตรงruntimeที่เจ้าของอนุมัติ ไม่มีcore/save/content/balance/playback timing diff
- ฐานที่fetchตอนเตรียมhandoff: `aaf9ff435d301cd73c7956b6131c90583e4aa241` เป็นdocsfollow-upหลังrelease ไม่ใช่publishedSHA ห้ามยึดSHAนี้แทนการfetchตอนเริ่มแชตใหม่
- รักษา `afddd84` แผน [UNIT_ANIMATION_ROLLOUT_TH.md](../design/UNIT_ANIMATION_ROLLOUT_TH.md) และhandoffของงานอื่นไว้ครบ งานแผนanimation/P01–P03เป็นอีกscope ไม่เริ่มจากงานVFXนี้

Workspaceเดิมมีremote fetchspecที่ติดตามเฉพาะbranchงาน ใช้explicitrefspecเพื่อไม่อ่านbaseเก่า:

```sh
git fetch origin feature/fateweave-initial-prototype:refs/remotes/origin/feature/fateweave-initial-prototype
git status --short
git log -3 --oneline origin/feature/fateweave-initial-prototype
```

ตรวจreleaseproof/APIใหม่ แล้วสร้างbranchใหม่ เช่น `codex/vfx-family-6-alchemy` จากฐานล่าสุด ใช้หนึ่งPRใหม่สำหรับตระกูล6ทั้งหมด ไม่ต่อPR85 ไม่มีliveCDNhashที่ตรวจแล้ว: cloudpolicyไม่รวมgithub.io ใช้Pagesjobs/artifactproof อย่าอ้างHTTP200/มือถือจริงจากข้อมูลนี้

## ขอบเขตและลำดับงาน

ทำเฉพาะ **acid / bomb / smoke / catalyst / haste / fury** รวม6ท่า เริ่มด้วยartwork **เตรียม–เกิดผล–ปลายฟุ้ง** ของทั้ง6ท่าบนสนามจริง390×844 ให้เจ้าของดูก่อนruntime ใช้ImageGenตามสิทธิ์ที่อนุญาตแล้ว ไม่ต้องถามอนุญาตใช้ซ้ำ แต่การอนุญาตเครื่องมือไม่ใช่การเลือกภาพที่ยังไม่ได้เห็น

- วาดeffect-onlyโปร่งใส ไม่ให้AIวาดตัวละคร/ชุด/สนาม/UIใหม่ เก็บoriginal/exactprompt/provenanceใน `incoming/ART-VFX-ALCHEMY-001/` และstoryboardsใน `docs/combat-presentation/alchemy-storyboards/`
- ใช้realrenderer/resolver/commandsสร้างreferencesและevent/snapshot cases ไม่มีการยัดBattleState/eventหรือใช้owner saveเพื่อทำภาพ บางtestเก่าเซ็ตstateโดยตรงได้ แต่ห้ามเลียนแบบวิธีนั้นเพื่ออ้างว่าเป็นเหตุการณ์ในคลิปจริง
- ภาพแต่ละท่ามีเอกลักษณ์กลางน้ำหนัก มีปลายฟุ้งตามหลัง โปร่งไม่ทับชุด/อาวุธ/HP/ชื่อ อ่านชัด390px ยึดhand/body/groundworldtransformจริงรวมpose/recoil/shake/DPR ตรวจ2×/3×ด้วยจุดอิสระ ไม่ใส่offsetslotตายตัว ไม่ใช้วงกลมเดียวเปลี่ยนสีแทน6ท่า
- อาจเสนอacidเป็นคราบกัดกร่อนคมบาง, bombเป็นburstเศษแสงสั้น, smokeเป็นริ้วควันโปร่ง, catalystเป็นปฏิกิริยายุบเข้าจุด, hasteเป็นริบบอนเร่งทิศ, furyเป็นประกายอำพันกระชับ ทั้งหมดเป็นdirectionเสนอเลือก ไม่ใช่ภาพอนุมัติ และไม่สื่อระบบธาตุที่เกมไม่มี
- หลังเจ้าของเลือกภาพ ต่อหนึ่งatlas/moduleของตระกูล6ในPRเดิม รักษา5sourceVFXgatesก่อนหน้า (blade/defense/healing/projectile/earth) เพิ่มalchemygate ไม่เปลี่ยนกฎ/save/content/balance/playback timing
- ส่งactual390pxclipsครบ6ท่า ทั้งnormal/fast/reducedintensity/OSreducedและกรณีจริงให้ตรวจ **ก่อนmerge/เผยแพร่/เริ่มตระกูล7** ไม่ใช้testsผ่านแทนmotionapproval ไม่เริ่มตระกูล7หรือผลิตanimationทุกตัวอัตโนมัติ

## กลไกจริง: อ่านengineก่อนชื่อ/comment/description

ข้อมูลต่อไปนี้มาจากcode inspection ณ ฐานhandoff ไม่ใช่ผลfixtureหรือtestsใหม่ของตระกูล6 ต้องตรวจด้วยlegalcommands/actualeventsอีกครั้งในแชตใหม่ ตัวเลขเป็นตัวอย่างฐาน ไม่ใช่ค่าที่ให้hardcodeในVFX

| ท่า | engineปัจจุบัน | ข้อห้ามทางภาพ / casesที่ต้องเก็บ |
|---|---|---|
| Acid | damageเดี่ยวก่อนลงcorrodeแก่ผู้รอด; acidspreadลงcorrodeทุกศัตรูที่ยังมีชีวิต **โดยไม่damageเพิ่ม**; potentยืดอายุ; corrosionเพิ่มbonusในhitจริงภายหลัง | ไม่ใช่DoT/tickdamageอัตโนมัติ ไม่เปลี่ยนcorrodeeventsเป็นextraexplosions/hits เก็บplain/spread/targetdown/potent/deepercorrosionและlateractualhit |
| Bomb | strikeศัตรูมีชีวิตทุกตัวรวมแถวหลัง ไม่จำกัดหน้า แต่ละamountรวมcorrosion/traitsตามstrikeจริง | ไม่มีbonusdamageปลอมจากขนาดburst เก็บfront+back/backonly/corroded/plain/targetdown |
| Smoke | weakenเป้าลดnextmoveทั้งphysical/energy; smokewideใช้ค่าที่เบากว่ากับlivingทั้งแถวของเป้า; smokepoisonลงcorrodeเป้าหลัก | castปกติไม่มีdamage ไม่ใช่stun/cancel และไม่ใช้ต้านinterruptของbossมาห้ามweaken เก็บsingle/wide/poison/boss/physical/energyพร้อมlateractualintent/damage |
| Catalyst | damageเดี่ยวตามskillpower + corrosionroundsleft×CATALYST_PER_ROUND แล้วใช้corrosionหมดเมื่อleft>0; strikeยังรับcorrosionbonusตามกฎปัจจุบัน | อย่าคิดamountซ้ำจากสูตรVFX ใช้actualevent เก็บplain/corroded/expired/kill/chainreactionด้วยlegalprelude ไม่แยกreactionเป็นหลายhitเอง |
| Haste | allyยังไม่เดินในรอบนี้ถูกย้ายมาเดินถัดจากToma; ถ้าเป็นคนถัดไปอยู่แล้วไม่เพิ่มturn; ถ้าเดินไปแล้วหรือใช้กับตัวเองให้hastedรอบหน้า; hasteHealอาจเกิดactualheal; quickbrewลดcooldown | อย่ายึดcommentเก่าที่ว่าเร็วรอบหน้าเสมอ ไม่เพิ่มturn/teleport/เปลี่ยนช่องยืน/เร่งplaybackทั้งเกม เก็บnotyet/nextalready/acted/self/downinvalid/heal/fullHP/quickbrew |
| Fury | buffแก่allyที่ยืนอยู่รวมตัวเอง empoweredเพิ่มpercentและexposedทำให้รับdamageมากขึ้นถึงท้ายรอบหน้า (ฐาน25%/10%); ไม่healหรือdamageตอนcast | ไม่แสดงโจมตีทันที/คลั่งเสียการควบคุม/bonusเป็นextrahit เก็บself/ally/refresh/actualoutgoing/incoming/expiry |

**Chainreactionสำคัญ:** เมื่อcorrodedfoeล้มและมีAlchemistที่มีcapยังยืน จะส่งcorrosionให้livingfoeแถวเดียวกันก่อน ถ้าไม่มีใช้คนอื่นตามlivinglist เป็นactual `corrode` event text `Chain reaction.` sourceIdเป็นAlchemist แต่อาจอยู่บนTurnStageของactorอื่น/ท่าอื่น อย่าวาดflaskcastใหม่หรืออนุมานจากturn.actionอย่างเดียว ตรวจsource/target/event/snapshotsและรักษาVFXตระกูลเดิมบนstageนั้น

HasteHeal/gearoverflowที่เกิดจริงต้องอ่านactualheal/barrierและใช้routingเดิมที่เหมาะสม ไม่วาดhealเมื่อไม่มีevent ไม่ทิ้งcaptions/HPเพื่อรวมภาพ ภาพcorrosion/weaken/empoweredภายหลังไม่ควรทับหรือยิงcastใหม่แทนการโจมตีของท่าอื่น

อ่านหลัก: `src/core/battle/engine.ts` (targetOptions,corrode,weaken,chainReaction,6actioncases,enemyturn,roundexpiry), `types.ts`, `src/content/heroes/mercenaries.ts`, `talents.ts`, `src/content/encounters/veil-siege.ts`; testsอ้างอิง `battle.test.ts`, `stars.test.ts`, `talents.test.ts`, `recruit-trees-engine.test.ts` อย่าใช้COVERAGE/descriptionเก่าลบล้างengine

## บทเรียนruntime / QAที่ต้องรักษา

- ศึกษา `src/game/visuals/earth-fx.ts`, `projectile-fx.ts`, `healing-fx.ts` และBattleScene Prepare/contact/source-role routing มีupkeep/followupที่เกิดบนendingactorอื่น อย่าทำearlyreturnจนทิ้งผลเก่า
- ทุกtweenผูกownedimage; skip/load/resize/hidden/OSmotionchangeล้างภาพ/tween ไม่เพิ่มlistener/timerที่ไม่มีเจ้าของ AssetsหายยังStart/commitหนึ่งครั้งและfallbackได้
- stageTimingเดิม/fast65%เดิม OSreducedเปิดผลภาพนิ่งทันที Reducedintensityเบาลง ไม่เพิ่มhitpause/จังหวะเล่นเพื่อโชว์ภาพ
- ทดสอบtypecheck/lint/unit/buildและfocusedbrowser meaningful ใช้CIสำหรับfullbrowser ไม่skipปัญหาให้เขียว ไม่แก้rules/save/balanceเพื่อให้ภาพสวย พบความคลาดเคลื่อนให้ฝากClaudeแยก
- CaptureแยกจากbrowserQAอื่น ไม่mock/เร่งclock เก็บrawframes+timestamps+finalstate ตรวจstate equalityทั้งก้อนกับresolverทุกcase ไม่dispatchfakeevents
- MP4VFR90kHz/noBframes ตรวจdecodedframecount/PTS/ปลายคลิปและfinalhold เก็บทุกframe ไม่retime/interpolate Playerอ่านหลังencoderpackเสร็จและdecodeครบทุกไฟล์ที่390px ไม่อ้าง60fps/มือถือจริง/SafariจากChromiumcloud
- อัปเดตCODEX-TO-CLAUDE/development/new-chat/C5ทุกงาน หนึ่งPRตระกูล6 ตระกูล5เสร็จแล้วไม่ทำซ้ำ ข้อความรอmotionในบันทึกเก่าของตระกูล5เป็นประวัติ

## ข้อความเปิดแชตใหม่ — คัดลอกทั้งบล็อก

```text
ทำ VFX Asterveil-Fateweave ต่อ ตระกูล6 ขวดเล่นแร่
อ่าน docs/handoffs/C5-FAMILY-6-ALCHEMY-HANDOFF-TH.md แล้วเริ่มตามนั้น
ตระกูล5 PR#85 ผ่านเจ้าของและ merge/เผยแพร่แล้ว ตรวจ release proof และ fetch ฐานล่าสุดก่อนเริ่ม
เริ่ม artwork 3 จังหวะของทั้ง6ท่า acid/bomb/smoke/catalyst/haste/fury ให้ดูก่อน runtime
ภาพต้องตรง event จริง แต่ละท่ามีเอกลักษณ์ น้ำหนักพอดี มีปลายฟุ้งตามหลัง โปร่งไม่ทับชุด ตรงตำแหน่ง unit และอ่านชัด390px ใช้ ImageGen ได้ตามที่อนุญาตแล้ว
ทำเฉพาะตระกูล6หนึ่งPR ส่งคลิปจริงให้ตรวจก่อน merge/เผยแพร่/เริ่มตระกูล7 ไม่แก้ rules/save/balance/playback timing
```
