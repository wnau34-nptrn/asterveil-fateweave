# A2 — หลักฐานส่งมอบและเผยแพร่

## 2026-10-28 — เจ้าของอนุมัติภาพเคลื่อนไหว A2: “เอาเข้าเกมได้”

เจ้าของยืนยัน “เอาเข้าเกมได้” หลังส่งมอบชุดเอกิส `guardian` และองครักษ์อสูร `foe_vargoth_guard` พร้อม26คลิปจริง390px จึงบันทึกเป็น owner visual approval ของ A2 โดยตรง ไม่ได้อนุมานจาก tests ชุดนี้อยู่ในเกมแล้วผ่าน PR88 merge `e94b424` + QA-only `7ff5388`; Pages40671415477 deploy สำเร็จ หลักฐาน release และคลิปอยู่ใน `docs/validation/unit-a2-release/` และ `docs/combat-presentation/unit-a2-slice/`

รอบนี้แก้เฉพาะเอกสาร approval/handoff และ release.json บนสาขา `codex/a2-release-proof` ส่งเข้าสาขาเกม `feature/fateweave-initial-prototype` ไม่มี runtime/art/timing เปลี่ยน ตรวจเอกสารและ `git diff --check` ตามกฎ docs-only ไม่รันทดสอบเกมซ้ำ คงผลCI/ข้อจำกัดเดิมและ approval ของ pilot/A1/C5 ทุกชุด ไม่เริ่ม A3 หรือ VFX family ใหม่ ไม่มีงาน A2 ค้าง ข้อความก่อนหน้าที่ว่าไม่มี approval ใหม่หมายถึงสถานะก่อนเจ้าของยืนยันครั้งนี้

28 ตุลาคม2026 · [PR88](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/88) merge `e94b42462c96904f67f5ddfd4e251ea765840d59` · published head `7ff53885d45ed7259fddeed43103310c37439368`

[เกม](https://wnau34-nptrn.github.io/asterveil-fateweave/) · [26คลิป/ทุกActionId-intent/fallback](../../combat-presentation/unit-a2-slice/README_TH.md) · [source/prompt/normalization/packing](../../../incoming/ART-UNIT-ANIMATION-A2-001/NOTES.md) · [ผล local/ข้อผิดพลาดก่อนหน้า](local-results.json) · [release JSON/artifact/CI](release.json)

[Pages40671415477](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40671415477) สำเร็จ build + browser4shards + deploy ตรวจจากAPIเมื่อ 2026-10-28T10:48:46Z Artifact 12808292493, 58,202,500bytes, digest `sha256:1ef7f398ec8241e94c15d68755fb5d6c49e79c657e4009076ec4e33968a58fad` ผูกpublished SHAเดียวกัน ไม่อ้างliveCDNhashที่ไม่ได้วัด

| การตรวจ | ผลจริง |
| --- | --- |
| Premerge quality40663714124 / head91b2f40 | typecheck/lint/unit/buildผ่าน;975tests/81files |
| Premerge browser40663714062 |271source +3prechecks +249productionผ่าน/566skipped |
| Published head7ff5388 quality40671415937/40671427628 | success |
| Pages40671415477 |975unit/81files;271source;249productionผ่าน/566skipped;deploy success |
| Local final RAF repair |typecheck/lint/build,32focusedunit/4files,5counter repeatsผ่าน |
| Capture/state/command/independentdecode |26/26ผ่าน;1,202capturedframes;maxgap.377s/maxPTSerror.0061ms |
| Clip player |1/1ผ่าน เล่น/seek/decodeครบ26ไฟล์ |

Production skipped566รวมsource-onlyfixturesที่มีgateแยกและopt-inงานcapture/art/player/screenshotsที่ไม่ได้เปิดในproduction run ไม่รวมเป็นpassed Source gateรวมA1/A2และC5 regression ทุกfamily; pilotอยู่ในproduction regression Playwright ใช้CIสำหรับfullbrowserตามrepository ส่วนlocalfocusedตามheadจริงอยู่local-results.json

Pagesรอบแรก40668449459บนmergee94b424ไม่เผยแพร่:source270ผ่าน/1failedเพราะอ่านposecounterที่200mswallclockก่อนRAFสุดท้าย integrate (ได้recover7แทนidle0) follow-up7ff5388แก้เพียงQAgetterและsampleหลังtailที่assertไม่เกินหนึ่งเฟรม+RAF โดยยังassertduration200ms/phase/contact30/sword5/final0และstate/committedcommands ไม่มีการลบassertionหรือเปลี่ยนเวลาเกม/src/public/.github รอบใหม่ผ่านครบ

ฐานf0ee801ถึงpublishedheadไม่เปลี่ยนcore/save/content/balance/UI/battle-playbackหรือexistingVFXmodule/atlas Pilot/A1pixels/cadenceและC5approval/gatesรวมC5.6คงเดิม Capturedd56ddd,premerge91b2f40,mergee94b424,published7ff5388มีsrc/publictreesตรงกัน: `9c21ec671fa30a10236772f3819ba84aaca208a3` / `f6698cd8435f2b84295c503de9db6031b1f4e218` Finaldocsfollow-upเป็นdocs-onlyไม่เปลี่ยนpublishedruntime

Aegis32logical/25unique,2048×540,4,423,680decodedRGBAbytes(4.22MiB),1,397,790atlas+JSONbytes Guard32/24,768×1401,4,303,872bytes(4.10MiB),1,385,751atlas+JSONbytes ต่ำกว่า6MiB/1.5MBต่อคน ตัวเลขไม่ใช่RAM/GPUรวมเกม ไม่มีcriticalpreloadเพิ่ม ใช้loader/eviction/duplicatearttextureเดิมและoriginalimagefallbackเมื่อช้าหรือล้มเหลวไม่เปลี่ยนtextureกลางท่า

ท่าหลักและhit/block/downใช้sprite; dodgeใช้procedural, idleใช้seed/breathingเดิม, revive resetseedตามHPจริงไม่มีstand-upstrip VFXใช้ชุดเดิมและlandmarkอ่านunitDisplayRatioของartจริง ไม่เพิ่มกลไก/ชนิดดาเมจ/intentหรือVFXfamily

Chromiumcloud/SwiftShader390pxemulationเท่านั้น ไม่ใช่เครื่องมือถือจริง/iOSSafariหรือ60fpscertification SourceQAมีdevfixtureเตรียมเงื่อนไขแต่ใช้realUI/Phaser/resolverและเทียบfinalstateทุกfield ไม่มีowner save/eventปลอม ทุกMP4/metadata/hash/sourceproofเก็บGitไม่พึ่งrawJPEGชั่วคราว ไม่มีowner visualapprovalใหม่ถูกอนุมานจากtests ไม่เริ่มA3หรือfamily7
