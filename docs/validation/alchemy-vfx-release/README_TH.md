# C5.6 — หลักฐานรวมและเผยแพร่ขวดเล่นแร่ R1

เจ้าของตรวจ55คลิปจริง390pxและอนุมัติ **“เอาเข้าเกมได้”** แล้ว27ต.ค.2026 อนุญาตmerge/เผยแพร่ผ่าน[PR86](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/86)เดิม ตระกูล6เสร็จแล้ว ไม่เริ่มตระกูล7

## รุ่นที่อนุมัติและรวม

- Approvedruntime31c5e90691164b9d85820ef61a92f63975635b8a; validated/capturefixture25354540874a0d797e027e4e2c71d7833301df66; approvedhead45244c401bb8a8c1e132df1730ba7b19c3f4decb
- Fetchฐานล่าสุด1f783f8ก่อนmerge ไม่มีงานใหม่แทรก PR86 merged **5ad447568b34ecd432760a80701d04cfe6f15e81** Source/public/tests/workflowsตรงvalidatedhead และatlasตรงคลิปที่เจ้าของตรวจ ไม่มีcore/save/content/balance/playback timingdiff รักษาแผนunitanimationafddd84ครบ
- หนึ่งatlas/module18frames1584×1128/981524bytes acid/bomb/smoke/catalyst/haste/fury ตามactualeventsและrenderedworldtransformรวมpose/recoil/shake/DPR อยู่rear-layerและมีwispytrailingtail รักษาทั้ง5sourceVFXgatesก่อนหน้า เพิ่มalchemygate
- Acidspread/Chainreactionเป็นคราบไม่มีextrahit; Chainreactionอ่านsourceAlchemistบนstageของactorอื่นและรักษาVFXเดิม; Smoke/Haste/Furyไม่มีdamageตอนcast; Catalystใช้corrosionตามactualhit; HasteHeal/overflowใช้actualheal/barrierผ่านartเดิม ไม่มีการเพิ่มturn/teleport/playbackspeed
- [55คลิปจริง/หน้าเลือก/หลักฐาน](../../combat-presentation/alchemy-slice/README_TH.md) ครบ6ท่าnormal/fast/reduced/OS-reducedและ31actualvariants ไม่มีowner save/injectedBattleState/fakeevents Furyexpiryผู้รับยังยืนอยู่ actualoutgoing13ในรอบ1–2กลับเป็น10ในรอบ3 จบรอบ4HP56

## การตรวจ

- Local948unit/79files,typecheck/lint/build,57focusedbrowser,55capture/full-state-equalityและplayerdecode55uniquefilesผ่านทั้งหมด
- 6916rawframes/timestamps/finalstateยังอยู่ครบที่test-results/alchemy-delivery InventoryรวมencodedMP4และrawhashในalchemy-slice/raw-captures.json MP4decodedcount/PTS/finalholdผ่านทุกไฟล์ errorสูงสุด0.0062ms maxcapturedgap367ms ไม่retime/interpolateหรืออ้าง60fps
- [Quality40533376869](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40533376869) success และ[Browser40533376856](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40533376856) successบนvalidatedhead2535454:214sourceVFX,3prechecks,249productionผ่าน/465skip ไม่ถือว่าskipคือผ่าน
- Postmergequality40598822102และ40598832843successบนmergeSHAเดียวกัน
- Chromiumcloud/SwiftShader ไม่ใช่Safariหรือมือถือจริง AlphaและvisibleRGBของ18sourcecellsตรงatlas; RGBที่alpha0ถูกclearตามการpack ต้นฉบับImageGenเก็บbyte-identicalพร้อมexactprompt/provenance

## การเผยแพร่

[Pages40598822074](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40598822074) **success** ครบbuild/browser4shards/deploy สำหรับmergeSHA5ad4475 เผยแพร่เมื่อ **2026-10-28 06:17:56 น. กรุงเทพฯ** (UTC2026-10-27T23:17:56Z)

เว็บไซต์: [เปิดเกม](https://wnau34-nptrn.github.io/asterveil-fateweave/)

Pages214sourceVFXและ249productionผ่าน/465skip Shards1–4ผ่าน61/63/59/66ตามลำดับ ไม่ถือว่าskipคือผ่าน JobIDs/เวลาจบและcountsอยู่ใน[release.json](release.json)

AtlasSHA256 `18c4b740db78eb4f80c6f66bc845770f46f013e2c3dede909e27ef19ba2505a5`

Pagesartifact12777099123 ผูกmergeSHA5ad4475 ขนาด53,689,733bytes digest `sha256:a5dc706292feb3ac44b1a2ea19df6fd0fb4012b68fbd6ff0c46112d86b938706`

Cloudnetworkpolicyไม่รวมgithub.io จึงไม่ทำliveHTTP/CDNhashใหม่ ไม่อ้างHTTP200หรือCDNhash ใช้mergeSHA + successfulPagesjobs + artifactเป็นreleaseproof เอกสารfollow-upหลังเผยแพร่นี้ไม่เปลี่ยนruntimeที่เจ้าของอนุมัติและผ่านCI
