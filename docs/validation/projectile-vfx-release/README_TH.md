# C5.4 — หลักฐานรวมและเผยแพร่ลูกธนู / มีดบิน R1

27 ตุลาคม 2026 · เจ้าของตรวจ40คลิปจริง390pxแล้วสั่ง **“เอาเข้าเกมได้”** ให้ผ่านmotionทั้ง7ท่าและอนุญาตรวมเข้าเกม/เผยแพร่ผ่านPR84เดิม ไม่เริ่มตระกูล5

## รุ่นที่เลือกและรวม

- [PR#84](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/84) → `feature/fateweave-initial-prototype`
- รุ่นruntimeที่เจ้าของตรวจ: `0353b8f8890673882d14e6875714b721b56174cb`; รุ่นคลิป/CI: `15f82957df6221c699fadbeee70b4f75d5f19e63`
- Merge: `7c392b5cf427b620059d7844c4374c6baf0b827b` ฐานล่าสุด8f00428ถูกfetchอีกครั้งก่อนmerge ไม่มีconflictและรักษางานCloudflare/แผนอื่นไว้ครบ
- ตรวจsrc/public/tests trees ของruntime/validated head/mergeตรงกันทุกตัว ไม่มีrules/save/content/balance/playback timing diff
- hinder/volley/weakshot/pin/track/disengage/knivesใช้atlas/moduleเดียว21frames จุดปล่อย/ผู้รับตามspriteworldtransformจริง รวมpose/recoil/shake/DPR วางหลังชุด/ป้าย มีหางฟุ้งไม่เพิ่มhit และเอาวงfallbackที่ซ้อนออก
- Trackยิงซ้ำเฉพาะcounterท้ายรอบที่เกิดจริง ไม่ยิงซ้ำเมื่อผู้ยิง/เป้าล้ม Pinเฉพาะหน้า Knivesหลัง/หน้าว่าง/twinครึ่งpowerตามevents Disengageย้ายคิวตามกฎ ไม่สร้างdodgeหรือย้ายslotเอง
- [40คลิปจริง/หน้าเลือก/หลักฐาน](../../combat-presentation/projectile-slice/README_TH.md):7ท่า×normal/fast/reduced/OS-reduced และ12กรณีจริง ไม่ใช้testsแทนการอนุมัติภาพโดยเจ้าของ

## การตรวจ

- ในเครื่อง:890unit/77files,typecheck/lint/build,26unique focusedbrowser,40capturesพร้อมเทียบfinalstateทุกช่องกับresolver และplayer40uniquevideo1/1ผ่าน
- เก็บ5479rawframesและtimestampทุกframe; decodedcount/PTS/ปลายคลิปผ่านทั้งหมด errorสูงสุด0.0062ms ช่องว่างcaptureสูงสุด367ms ไม่อ้าง60fps ไม่มีspeedup/interpolation
- [Quality40492197706](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40492197706): success —890unit/77files,typecheck/lint/build
- [Browser40492197679](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40492197679): success —sourceVFX119/119,prechecks3/3,production249ผ่าน/274skip ไม่ถือว่าskipคือผ่าน รักษาblade/defense/healingและเพิ่มprojectilegateตรงไปตรงมา
- [Postmerge quality40503738918](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40503738918): success
- Chromium cloud/SwiftShader ไม่ใช่การรับรองSafariหรืออุปกรณ์จริง

## การเผยแพร่

[Pages40503739046](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40503739046): **success** ครบbuild/browser4shards/deploy สำหรับmergeSHA7c392b5 เสร็จ27ต.ค.2026เวลา19:37:55น.กรุงเทพฯ sourceVFX119/119,production249ผ่าน/274skip (shards1–4ผ่าน61/63/59/66ข้อ) ไม่ถือว่าskipคือผ่าน

เว็บไซต์: https://wnau34-nptrn.github.io/asterveil-fateweave/

Atlas `public/assets/fx/projectile_fx.webp`:1013228bytes,21frames,1440×2016px SHA256 `d9a46b5189187cd779b4ee5ad2b2520fe4533a9d160f017796fe1e880bcc169d`

Pagesartifact12734650094 ผูกmergeSHA7c392b5 ขนาด51312457bytes digest `sha256:52749f2e2cb424bbaa84a9b112f08a1cca4a3761e6278dca5935e61c3d0a666f`

HEADจากcloud27ต.ค.2026เวลา19:28:54น.กรุงเทพฯ ถูกexecutionproxyปฏิเสธCONNECT403/envoyก่อนถึงเว็บไซต์ จึงไม่อ้างliveHTTP200หรือhashCDNจริง และไม่ใช้403นี้กล่าวว่าเกมเสีย ผลเผยแพร่ต้องยึดPagesbuild/browser/deployและartifactที่ผูกmergeSHA

[release.json](release.json) เป็นหลักฐานเครื่องอ่านได้ การเก็บproof/approvalในfollow-upนี้เปลี่ยนdocsเท่านั้น ไม่เปลี่ยนruntimeที่เจ้าของตรวจและCIผ่าน ไม่เริ่มตระกูล5

บันทึกproof/approvalนี้เป็นdocs-only follow-up `[skip ci]` หลังPagesเผยแพร่สำเร็จ ไม่เปลี่ยนsrc/public/testsหรือruntimeที่ผ่านCIและเจ้าของตรวจ
