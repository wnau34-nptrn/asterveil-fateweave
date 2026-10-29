# A0/A1 release proof — ไอราและภูตแดนดิไลออน

เผยแพร่2026-10-28 08:44:29 Asia/Bangkokผ่าน [PR87](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/87) merge `1ea31d500bad7c9ed49538699cd2b76e333e418a` / validated `fcf210db06d3a7edb23ad8400e4810679d3d2f02` รวมฐานC5.6ที่เจ้าของผ่านและส่งแล้วโดยเก็บงาน/approvalเดิมครบ

[เล่นเกม](https://wnau34-nptrn.github.io/asterveil-fateweave/) · [16คลิป/ทุกActionId-intent/fallback](../../combat-presentation/unit-a1-slice/README_TH.md) · [machine proof](release.json)

## ผลที่ได้

Eiraมีbodyclipครบ7ActionIdปัจจุบัน: attack/Bolt/Storm/Dispelใช้staff-release, Ward/Sigil/Aegisใช้support/seal Spriteใช้SeedSparkเตรียม→ปล่อย→คืนท่า Hit/downมีเฟรมใหม่; block/dodge/counterยังprocedural ฟื้นresetseedตามHPจริง ไม่สร้างชื่อbasicattackใหม่ให้Spriteหรือclaimว่าLyraครบทุกสกิล ภาพ/timingของpilotเดิมและexistingC5FXmodule/atlasไม่เปลี่ยน ไม่มีcore/save/content/balance/UI/playbackdiff ไม่มีanimationเพิ่มcriticalpreload ทดสอบStart/เทิร์นแรกขณะโหลดค้าง/ล้มเหลว, safe-boundaryadoptionและevictionแล้ว

| ตัว | decodedRGBA | atlas+JSON | logical/uniqueframes |
| --- | --- | --- | --- |
| Eira | 4,067,328bytes /3.88MiB | 1,382,688bytes | 22/18 |
| Sprite | 1,251,328bytes /1.19MiB | 357,984bytes | 22/12 |

ตัวเลขเป็นatlasRGBA ไม่ใช่RAM/GPUรวมเกม Trim/dedup/packlosslessหลังshared-scale normalization; reconstructทุกvisibleRGBA/alphaเท่ากัน Eiraรอบแรกเกิน1.5MBจึงใช้215px/ratio1/.42เพื่อคงขนาดสนาม รายละเอียดsource/prompt/normalizerอยู่incoming/ART-UNIT-ANIMATION-A1-001

## Validation

- Local: typecheck/lint/build,958unit/80files,82focusedbrowser (57alchemyเดิม+20A1+3loading+2pilot),16fresh390pxcapturesและplayerdecodeทุกไฟล์ผ่าน1/1
- Premergequality [40611416449](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40611416449) และbrowser [40611416473](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40611416473) success:234source,3prechecks,249productionผ่าน/502skip
- Pages [40614459819](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40614459819) success: build,source234,production249/skip502แบ่ง4shards61/63/59/66 และdeploy Postmergequality40614459859success
- Artifact12784946429/55,423,967bytes/digest`sha256:af0fe34d740836b805f156727c9026cf90d01693c2fa8191adfc91465ec8ccb8` ผูกmergeSHAเดียวกัน Source/public/tests/.githubและwholetreeของmergeตรงvalidatedhead; source/publicตรงcaptureproof
- CIรอบ4ec57b1พบPCmulti-reloadcaseหมด45sที่contextcleanup ให้เฉพาะ1366pxcase75s end-to-endwallbudget ไม่มีassertionถูกลดหรือclock timingถูกเปลี่ยน ตรวจsource diffว่าต่างเฉพาะcomment+budget Headสุดท้ายผ่านครบ

## Capture limits และ handoff

16MP4มี1,547capturedframes+finalholds เก็บทุกcapturedframeตามCDPtimestampsโดยไม่interpolate/retime ผ่านdecodedcount/PTS/final duration (maxerror0.0061ms/maxgap0.300s) ทุกfinalstateเท่ากับresolver คำสั่งเดียวต่อcapture Fixtureใช้realUI/Phaser/playback/resolverแต่จัดparty/speed/entryHPเพื่อเข้ากรณีทดสอบ ไม่แก้เกมจริง Chromiumcloud/SwiftShader390pxemulation ไม่ใช่Safari/มือถือจริง/60fps certification

Workspaceไม่พร้อมใช้งานภายหลังpush MP4s/rawart/proofsอยู่Git ส่วนrawscreencastsไม่ได้uploadและpathsในproofอ้างworkspaceเดิม ไม่มีfreshliveCDNhash/HTTPclaimนอกเหนือจากPagesdeploysuccess

เจ้าของสั่งA0/A1และให้ดำเนินการต่อภายใต้standingauthorization ไม่มีการอ้างowner motionapprovalใหม่จากtests ไม่มีA2หรือVFXfamilyใหม่เริ่มในงานนี้ Futurelandmarksต้องใช้unitDisplayRatio(artOf(...))แทนhard-code2เพราะEiraใช้1/.42 ดูCODEX-TO-CLAUDEและNEW-CHAT-HANDOFFสำหรับรายการfallback/งานอนาคต
