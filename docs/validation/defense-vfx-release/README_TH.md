# C5.2 — หลักฐานรวมและเผยแพร่ VFX ป้องกัน

27 ตุลาคม2026 · เจ้าของสั่ง “ดำเนินการขั้นต่อไปได้” หลังได้รับคลิปสุดท้าย Rally R5 วงพื้นเท่านั้น ถือเป็นการให้ผ่านmotion reviewตระกูล2และดำเนินขั้นmerge/เผยแพร่ตามstanding authorization

## รุ่นที่เลือกและขอบเขต

- [PR#77](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/77) → `feature/fateweave-initial-prototype`
- Headที่CIตรวจ: `f518dceb0c1a127e4628d329c3f44a08dc8af441`
- 11ท่า: guard,aegis,rally,bulwark,stonearmor,guardstone,halo,sanctuary,brace,spearwall,hold ในatlas/moduleเดียว
- Aegis/Stone Armourเป็นlow auraรอบขา; RallyR5มีเฉพาะวงพื้นของKnightสว่างนำ→วงทีมตอบรับตามcoverageจริง ไม่มีคลื่นด้านหน้า ไม่มีภาพพาดชุด/รองเท้าหรือบังHP
- คงrules/save/balance/playback timing, unit-animationและnonblocking optional assets ไม่ส่งsource fixture/debug surfaceขึ้นเว็บ
- [คลิปจริง21ไฟล์](../../combat-presentation/defense-slice/README_TH.md): Rally4โหมดอัปเดตเป็นR5 อีก17คลิปเป็นหลักฐานที่คงเดิม

## การตรวจ

- ในเครื่อง: typecheck/lint/buildผ่าน,858unit/75filesผ่าน
- Focusedbrowser16กรณีครอบคลุม11casts/cleanup, Rallyreducedstill/3modes-resizeและmissing-atlasfallback; รันทวนfallbackและRally2/2ผ่านหลังหยุดเวลาในตัวทดสอบเพื่อให้ปุ่มskipไม่หายก่อนกด
- Storyboard1/1,captureRally4/4,ตรวจภาพจริงทั้ง4/การdecodeวิดีโอ/เก็บrawframesครบ(+hold1)/player21คลิปผ่าน
- [Quality CI40438279773](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40438279773): success
- [Browser CI40438279808](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40438279808): success — source fixture67/67, prechecks3/3, production249ผ่าน/146skip (source/capture-onlyมีgateแยก)
- [Qualityของmerge commit40441295054](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40441295054): success
- Chromiumในcloud/emulation ไม่ใช่การรับรองSafariหรืออุปกรณ์จริง และcaptureframegapไม่ใช่FPSของเครื่องจริง

## การเผยแพร่

MergeSHA: `afeef4a3e356046efe4814803fb1c8161509e5c6`

[Pages run 40441295039](https://github.com/wnau34-nptrn/asterveil-fateweave/actions/runs/40441295039): **success** — build, browserทั้ง4shardsและdeployผ่านครบ สำหรับmergeSHAข้างต้น; sourcefixture67/67, productionรวม249ผ่าน/146skip (shards1–4ผ่าน61/63/59/66ข้อ)

เว็บไซต์: https://wnau34-nptrn.github.io/asterveil-fateweave/

Atlasที่เลือก `public/assets/fx/defense_fx.webp`:496190bytes,35frames,1584×1584px; SHA-256 `f618e519eb083d85e7493b51f762666a6dd52224cc7157c648d89de1de526e20`

ตรวจความพร้อมการเชื่อมต่อด้วยHEADจากcloudระหว่างรอdeployที่ `https://wnau34-nptrn.github.io/asterveil-fateweave/` วันที่27ต.ค.2026 10:01น.(กรุงเทพฯ): proxyปฏิเสธCONNECTด้วย403จากenvoy ก่อนถึงเว็บไซต์ จึงไม่อ้างHTTP200หรือhashจากCDNจริง หลักฐานเผยแพร่ยึดmergeSHA/treeตรงกับruntimeที่ตรวจ, GitHubPagesartifactผูกกับmergeSHAและdigest, และผลPagesbuild/browser/deploy ไม่ใช่การรายงานว่าเว็บไซต์ตอบ403

บันทึกฉบับนี้เป็นdocs-only follow-up `[skip ci]` ไม่เปลี่ยนruntimeที่CIตรวจและdeployแล้ว หลักฐานเครื่องอ่านได้: [release.json](release.json)

## งานถัดไป

[ตระกูล3แสงรักษา6ท่า](../../handoffs/C5-FAMILY-3-HEALING-HANDOFF-TH.md) เริ่มartwork3จังหวะก่อนruntimeในbranch/PRใหม่ Rouseเป็นguard, Bless/Mendไม่ฮีลทันทีตอนcast ต้องตรงeventจริง ไม่อนุมานว่าการให้ผ่านตระกูล2เป็นการอนุมัติภาพตระกูล3
