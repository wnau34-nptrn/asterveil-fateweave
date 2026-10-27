# C5.3 — หลักฐานรวมและเผยแพร่ VFX แสงรักษา R2

27 ตุลาคม 2026 · เจ้าของตรวจ29คลิป R2 แล้วสั่ง “นำเข้าเกมได้” ให้ผ่านmotionทั้ง6ท่าและนำเข้าเกมผ่านPR78เดิม

## รุ่นที่เลือก

- [PR #78](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/78) → `feature/fateweave-initial-prototype`
- รุ่นภาพ/runtimeที่เจ้าของตรวจ: `3dc1501d8525225d34351ea626ac5cdd68a7f8af`
- Headที่CIตรวจ: `194a1ff17c61c6499b7b342d406bf03d3741d6c0` รวมฐานเกมล่าสุด3bf10dbและแก้เฉพาะhandoff/doc approval; source/assets/testsตรงรุ่นที่ตรวจ
- Merge: `1cfe87493397fe30b0548857c4727971ff2844f8`; treeของsrc/public/testsตรงheadก่อนmergeทุกตัว
- Heal/Prayer/Rouse/Revive/Bless/Mendใช้atlas/moduleเดียว30frames แสงเข้มขึ้น มีหางฟุ้งตามหลัง ยึดsoleของunitที่กำลังวาดจริงระหว่างcast/recoil/field shake แสงหลักอยู่หลังชุดและมีrimบางใต้เท้า
- Rouseยังguard/allตามผู้รับจริง; Bless/Mend castเป็นbuff/songและฮีลเมื่อeventภายหลังเกิดจริง ไม่แก้rules/save/content/balance/playback timing
- [คลิปจริง29ไฟล์390px](../../combat-presentation/healing-slice/README_TH.md) รวมnormal/fast/reduced/OS-reducedและกรณีoverflow/twin/echo/barrier/solo

## การตรวจ

- ในเครื่อง:875unit/76files, typecheck/lint/build,42unique focused browser,29captureและplayerdecodeผ่าน รายละเอียดข้อจำกัด/การแก้harness/การรักษาtimestampอยู่ในslice
- [Quality CI40458494729](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40458494729): success —875unit/76filesและtypecheck/lint/build
- [Browser CI40458494882](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40458494882): success — sourceVFX93/93,prechecks3/3,production249ผ่าน/204skip (source/capture-onlyแยกgate;ไม่ใช่204ข้อที่ตรวจผ่าน)
- [Qualityหลังmerge40460582881](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40460582881): success
- Chromiumในcloud/emulation ไม่ใช่การรับรองSafariหรืออุปกรณ์จริง

## การเผยแพร่

[Pages run40460582964](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40460582964) — **success** ครบbuild/browser4shards/deploy สำหรับmergeSHA1cfe874; sourceVFX93/93, production249ผ่าน/204skip (shards1–4ผ่าน61/63/59/66ข้อ) เสร็จ27ต.ค.2026เวลา13:37:22น.กรุงเทพฯ

เว็บไซต์: https://wnau34-nptrn.github.io/asterveil-fateweave/

Atlas `public/assets/fx/healing_fx.webp`:1376664bytes,30frames,3504×1480px; SHA256 `dc176c363d9b0b0a5d6af1491190572f75388c1015e2af4e9213f3a5c332e965`

Pagesartifact12714776039ผูกกับmergeSHAข้างต้น ขนาด50294147bytes digest `sha256:635392eb61077bf2fdeeefa0b775be3e9f0ce4616d428fad8ce41f226e73b5a4`

HEADจากcloudเวลา13:01:50น.กรุงเทพฯ ถูกexecutionproxyปฏิเสธCONNECT403/envoyก่อนถึงเว็บไซต์ จึงไม่อ้างHTTP200หรือhashจากCDNจริง ผลเผยแพร่ยึดGitHubPagesbuild/browser/deployและartifactที่ผูกmergeSHA

หลักฐานเครื่องอ่านได้: [release.json](release.json) บันทึกนี้เป็นdocs-only follow-up `[skip ci]` ไม่เปลี่ยนruntimeที่ตรวจและเผยแพร่ ไม่เริ่มตระกูล4ในงานนี้
