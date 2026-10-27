# C5.5 — ทุบ / แผ่นดิน · handoff

27ตุลาคม2026 · เจ้าของสั่ง “เริ่มขั้นต่อไปได้” หลังตระกูล4ให้ผ่าน/merge/เผยแพร่แล้ว จึงเริ่มตระกูล5เท่านั้น

- ฐาน35e39afที่fetchล่าสุด; family4PR84merge7c392b5/Pages40503739046successครบbuild+4browser+deploy19:37:55กรุงเทพฯ ตรวจAPI/releaseproofและcheckoutatlasSHAตรงกัน
- Branch `codex/vfx-family-5-earth` [draft PR85](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/85) ต่อทั้งตระกูล ไม่ใช้PR84ต่อ ไม่merge/เผยแพร่/เริ่มตระกูล6ก่อนตรวจคลิปจริง
- [Artwork R1](../combat-presentation/earth-storyboards/README_TH.md) ครบ4ท่า×3จังหวะและ15กรณีจริง รวม45composites390×844 หน้าเลือกท่า/กรณี/phase เทียบสนามเปล่า น้ำหนัก60–110% คืนค่า100% เจ้าของเลือกR1ด้วย “ไปต่อ” แล้ว ต่อruntime4ท่า/12-frameatlasในPR85เดิม [คลิปจริง390px](../combat-presentation/earth-slice/README_TH.md) รอเจ้าของตรวจmotionก่อนmerge/เผยแพร่/ตระกูล6
- Originaleffect-onlyImageGen RGBA1536×1024/4rows×3columns พร้อมexactprompt/provenanceใน `incoming/ART-VFX-EARTH-001/` สร้างเฉพาะVFX ไม่ให้AIวาดสนาม/ชุด/UIใหม่ ใช้sprite/DOMmasksจริงรักษาพื้นหน้า

## กลไกจริง ห้ามเดาจากชื่อ/comment

Bash: damageเดี่ยว; physicalที่หยุดได้และเป้ารอดจึงinterrupt Energyปกติไม่หยุด reflectbashลดpowerและส่งsigilหยุดenergyที่หยุดได้ retributionเพิ่มpowerเมื่อstopsจริง ไม่เพิ่มhit Unstoppable/steadfastต้านได้ เป้าล้มไม่สร้างinterrupt ต้องดูactualcancelภายหลังแยกจากcast

Slam: power+quakeBonusเมื่อnextintentของเป้าเล็งผู้ใช้ Runequakeส่งstrikeครึ่งskill.powerปัดลงให้ศัตรูอื่นที่slotหมายเลขเดียวกัน f1↔b1/f2↔b2 ไม่ใช่allและไม่คูณbonusprimaryให้splash

Quake: strikeหน้าในlivinglist ณ action ถ้าหน้าไม่มีจึงlivingที่เหลือ Skyhammerเรียกhealผู้ใช้ต่อstrike อ่านactualhealamountไม่ปลอมhealเมื่อเต็มHP/อย่าเดาจากชื่อearthshakerว่าinterruptอัตโนมัติ

Tremor: strikeหน้า/หลังfallbackตามlivinglistเหมือนquake แล้วตั้งdrawnByแก่ผู้รอด ให้เล็งผู้ใช้ในintentถัดไปตามอายุจริง ไม่ได้ลดpower/หยุดturn ภาพไม่เป็นรากตรึง/stun เราตรวจbeforeintentเล็งคนอื่นและlateractualintentเล็งWardenแล้ว ไม่แก้state/events

## ถัดไปหลังเจ้าของเลือกภาพ

- หนึ่งearthatlas/moduleต่อ4ท่า รักษา4sourceVFXgatesเดิม เพิ่มearthgate อ่านevents/snapshots ไม่คำนวณdamageซ้ำ
- ใช้renderedsource/body/soleworldtransformจริงรวมpose/recoil/fieldshake/DPR ไม่บวกoffsetslotตายตัว ตรวจ2×/3×กับจุดอิสระให้ตรงเมื่อเคลื่อนที่ด้วย
- Bash/Slamเป็นbody-contactเฉพาะจุด Quake/Tremorเป็นlowgroundshapeต่อผู้รับจริง ไม่ยืมวงhealมาแทนทุกท่า ปลายฟุ้งน้ำหนักกลางไม่ทับชุด/HP/ข้อความ
- เก็บBashcontrolstatesจริง physical/energy/reflect/unstoppable/steadfast/targetdownและactualcancelภายหลัง; ทดสอบsteadfastด้วยcommandsถูกกฎหลายรอบ ไม่ตั้งsteadyRoundเอง
- Slamprimary/splash/intentbonus; Quakefront/backfallbackและSkyhammeractualheal (คงhealingroutingเดิมของผลที่เกิดจริง ไม่ปนhealกับearthhit); TremoractualdrawnBy/nextintentและsource/targetdown
- คงstageTimingเดิม/fast65%, OSreducedภาพนิ่ง, reducedintensityเบาลง, optionalassets/fallback/cleanupskip-load-resize-hiddenครบ ไม่มีunownedtimer/listener
- typecheck/lint/unit/buildและfocusedbrowserตามงาน ให้CIรันfullbrowser ไม่มีrules/save/content/balance/playback timing changes
- ส่งactual390pxclipsครบ4ท่า+กรณีจริง+normal/fast/reduced/OS-reducedในPRเดิมก่อนmerge/เผยแพร่/ตระกูล6 เก็บrawframes/timestampsทุกframe ใช้90kHz/noBframes/VFR ตรวจdecodedPTS/count/ปลายคลิปและplayerหลังpackเสร็จ ไม่มีretiming/interpolation
- อัปเดตCODEX-TO-CLAUDE/development/new-chat/C5ทุกงาน ภาพR1เจ้าของเลือกแล้วด้วย “ไปต่อ”; motionยังไม่อนุมัติ

## ผลตรวจartwork

References2/2 (15legalcases+DPR2/3), viewer/control/export1/1,45pixel-preservationผ่าน; typecheck/lint/buildและ890unit/77filesผ่าน ไม่มีsrc/publicdiff Chromiumcloud/SwiftShaderไม่ใช่Safariหรือเครื่องจริง Testsไม่ใช่การอนุมัติartwork/motion
