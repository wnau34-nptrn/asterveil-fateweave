# C5.5 — หลักฐานรวมและเผยแพร่ทุบ / แผ่นดิน R1

27ตุลาคม2026 · เจ้าของตรวจ33คลิปจริง390pxแล้วสั่ง **“นำเข้าเกมได้”** ให้ผ่านmotionทั้ง4ท่าและอนุญาตmerge/เผยแพร่ผ่านPR85เดิม ไม่เริ่มตระกูล6

## รุ่นที่อนุมัติและรวม

- [PR85](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/85) → feature/fateweave-initial-prototype
- Approved runtime049c2014356aae3fdfa22bf6d0a276e37768e2e1; validated head91a48c1d335187bee26ad82712d04dc3e9c20f49; merge3196e1774ad272045bfbcd2e50f54bf5fab13213
- Fetchฐาน35e39afล่าสุดก่อนmerge ไม่มีconflict ตรวจsrc/public treesและatlasตรงกับคลิปที่เจ้าของอนุมัติ Mergeรักษาsrc/public/testsของvalidated headครบ ไม่มีcore/save/content/balance/playback timing diff
- bash/slam/quake/tremorใช้atlas/moduleเดียว12frames1584×1152 จุดรับจากactualeventsและspriteworldtransformจริง รวมpose/recoil/shake/DPR รูปทรงbodyedge/lowgroundต่างกัน มีปลายtail/wakeโปร่งหลังunit/ป้าย ไม่เพิ่มhitหรือเวลารอ
- Bashphysical/energy/reflect/retribution/resist/Steadfast/death; SlamintentbonusและRunequakeคู่slotครึ่งpower; Quakefront/backfallbackและSkyhammeractualheal; TremordrawnByเปลี่ยนnextintentไม่ใช่powercut ผลทั้งหมดตามresolver ไม่แต่งstate/events
- [33คลิปจริง/หน้าเลือก/หลักฐาน](../../combat-presentation/earth-slice/README_TH.md) ครบnormal/fast/reduced/OS-reducedและ17กรณีเฉพาะ

## การตรวจ

- Local910unit/78files,typecheck/lint/build,38focusedbrowser,33capturesพร้อมfinalstate equalityและplayerเล่น33uniqueclips1/1ผ่าน
- 4,345rawframes/timestampsคงอยู่ครบ MP4decodedcount/PTS/finalholdผ่าน errorสูงสุด0.0062ms ช่องว่างcaptureสูงสุด307ms ไม่เร่ง/ชะลอ/interpolateหรืออ้าง60fps
- [Quality40514139155](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40514139155) success:910unit/78files,typecheck/lint/build
- [Browser40514139036](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40514139036) success: sourceVFX157,prechecks3,production249ผ่าน/349skip ไม่ถือว่าskipคือผ่าน รักษา4sourcegatesเดิมและเพิ่มearthgate
- Chromiumcloud/SwiftShader ไม่ใช่Safari/มือถือจริง

## การเผยแพร่

[Pages40524232794](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40524232794) **success** ครบbuild/browser4shards/deploy สำหรับmergeSHA3196e17 เสร็จ27ต.ค.2026เวลา22:05:38น.กรุงเทพฯ sourceVFX157/157และproduction249ผ่าน/349skip (shards1–4ผ่าน61/63/59/66) ไม่ถือว่าskipคือผ่าน

เว็บไซต์: https://wnau34-nptrn.github.io/asterveil-fateweave/

Atlas1,391,888bytes/12frames/1584×1152 SHA256 `96702f00e0998df20ece729fad25326fc7a29fcde0d1185f06b38379f11779e4`

Cloudexecutionpolicyปัจจุบันไม่รวมgithub.io จึงไม่ทำliveHTTP/CDNhashใหม่ ไม่อ้างHTTP200หรือhashจากCDN ใช้mergeSHA + Pagesjobs + uploadedartifactเป็นreleaseproof ประวัติCONNECT403ของfamily4เป็นคนละobservation ดูรายละเอียดmetadataที่[release.json](release.json)

Pagesartifact12743825389 ผูกmergeSHA3196e17 ขนาด52,705,088bytes digest `sha256:e1f130996a3734bcb647f82aa5f3f6c9f19115b6693077ea614a79884acb0376` Postmergequality40524232637/40524250575success

บันทึกproof/approvalนี้เป็นdocs-only follow-up `[skip ci]` หลังPagesเผยแพร่สำเร็จ ไม่เปลี่ยนsrc/public/testsที่ผ่านCIและเจ้าของตรวจ
