# ART-VFX-ALCHEMY-001 · artwork R1 รอเจ้าของเลือก

RuntimeR1/18frameatlasเสร็จในPR86เดิม ส่ง55actual390pxclipsแล้ว รอowner motion review รายละเอียดdocs/combat-presentation/alchemy-slice/README_TH.md ไม่merge/เผยแพร่/ตระกูล7

อัปเดต: เจ้าของเลือกartworkR1ด้วย “ไปต่อ” แล้ว27ต.ค.2026 กำลังต่อruntimeในPR86เดิม ก่อนส่งคลิปจริงให้ตรวจ ไม่มีmotionapproval/merge/เผยแพร่/ตระกูล7 ข้อความรอเลือกด้านล่างเป็นประวัติ

27 ตุลาคม 2026 · branch `codex/vfx-family-6-alchemy` บนฐานล่าสุด `1f783f8`

ต้นฉบับ built-in ImageGen RGBA1536×1024 effect-only 6แถว×3จังหวะ acid/bomb/smoke/catalyst/haste/fury เก็บbyte-identicalในsource/six-skills.png และคงoriginalใน/workspace/generated_images ไว้ Exact prompt/tool/originalpathอยู่generation-prompts.json ไม่มีตัวละคร/สนาม/UIที่AIวาดใหม่ ไม่มีthird-party assetsใหม่

reference/ มี14กรณีจริง: screenshots390×844, sprite/label alpha masks และanchors.jsonที่เก็บcommands/prelude/events/before/afterจากresolver ไม่มีowner saveหรือinjectedBattleState/events ตัวเลข/HPในทุกภาพเป็นภาพก่อนcast ไม่ใช่ผลHPหลังcontact

Storyboards: docs/combat-presentation/alchemy-storyboards/ มี3จังหวะทุกท่าและviewer น้ำหนัก60–110% ปิดภาพ/คืนค่า/เลือกphase ใช้alphaเดิมไม่keying/repaint Maskจากactualspriteและlabelsรักษาชุด/อาวุธ/HP/ชื่อ ขอบcontactมาจากrenderedunitanchorกับsizeและพื้นที่canvas ไม่ใช้offsetslotตายตัว ทั้งนี้staticreferenceยังไม่พิสูจน์การตามpose/recoil/shakeขณะruntime ต้องตรวจต่อหลังเลือกภาพ

รอเจ้าของเลือกartworkก่อนruntime ตามคำสั่งเปิดงานและhandoff ไม่ได้อนุมัติภาพเพียงเพราะอนุญาตImageGen ขั้นต่อไปหนึ่งatlas/moduleในPRเดิม รักษา5sourceVFXgatesแล้วเพิ่มalchemy ส่งactual390pxclips6ท่าnormal/fast/reduced/OS-reducedและcasesในhandoffก่อนmerge/เผยแพร่/ตระกูล7 ไม่แก้rules/save/content/balance/playback timing
