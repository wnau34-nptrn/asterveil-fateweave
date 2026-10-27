# C5.5 · ทุบ / แผ่นดิน R1 ใน runtime

เจ้าของเลือก artwork R1 ด้วย “ไปต่อ” วันที่27ตุลาคม2026 ต่อใน [draft PR85](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/85) เดิม [เปิดหน้าเลือกคลิป](index.html) เพื่อดู4ท่าและ33กรณี390×844 ก่อนอนุมัติ motion / merge / เผยแพร่ / เริ่มตระกูล6

| ท่า | คลิปปกติ | ผลจริง |
|---|---|---|
| Bash | [ดูคลิป](bash-normal-normal-390.mp4) | ทุบหนึ่งhit; physicalที่หยุดได้มีinterrupt/cancelภายหลัง |
| Slam | [ดูคลิป](slam-normal-normal-390.mp4) | impactเดี่ยว; bonusตามnextintentที่เล็งผู้ใช้ |
| Quake | [ดูคลิป](quake-normal-normal-390.mp4) | รอยแตกต่ำต่อผู้รับหน้า ถ้าหน้าไม่มีจึงหลัง |
| Tremor | [ดูคลิป](tremor-normal-normal-390.mp4) | ริบหินjadeดึงเข้าหาผู้ใช้; drawnByเปลี่ยนnextintent ไม่ลดpower |

ทุกท่ามีnormal/fast/reduced intensity/OS-reduced motion หน้าplayerเลือกกรณีเพิ่มได้:

- Bash energyปกติไม่หยุด, Reflectbash13damage+sigil, Unstoppable/Steadfastต้าน, Retribution26หนึ่งhit, เป้าล้มไม่interrupt Steadfastใช้Bashในรอบ1แล้วcommandsจริงจนรอบ3 ไม่ตั้งsteadyRoundเอง
- Slam intentเล็งผู้ใช้28; Runequakeprimary18/splash9ที่คู่slotf1↔b1 ไม่ถ่ายทอดbonusและไม่ตีทุกตัว **แก้คำอธิบายartworkที่เคยเขียนว่าsplashเต็มpower**: engineใช้ครึ่งskill.powerปัดลงมาตลอด ไม่ได้แก้กฎ
- Quake backfallback, แถวหน้าล้มทั้งสองแล้วไม่retargetหลัง, Skyhammeractualheal4+4/เต็มHPไม่มีevent/ขาด1ฟื้นจริง1 ใช้healingartเดิมหนึ่งภาพต่อcasterพร้อมcaption/HPครบทุกevent ไม่ปลอมผลรวมใหม่
- Tremor backfallback, physical/energyเปลี่ยนnextintentจริง, ผู้ใช้ล้มแล้วผลdrawnByสิ้นไป, เป้าล้มไม่ตั้งdrawnBy ไม่มีstun/weakeningที่แต่งจากชื่อหรือcommentเก่า

หนึ่งlosslessRGBAatlas12frames1584×1152 (1,391,888bytes) จากต้นฉบับImageGenที่เลือกแล้ว; cell/hashใน `incoming/ART-VFX-EARTH-001/production-sources.json` module `src/game/visuals/earth-fx.ts` อ่านactualdamage/dodge/heal ไม่มีการคำนวณผลใหม่ Body-edge Bash/Slam และlowground Quake/Tremorตามimageworldtransform รวมpose/recoil/rotation/fieldshake หารDPRครั้งเดียว ทดสอบเทียบจุดอิสระ2×/3× ปลายtail/wakeโปร่งอยู่หลังunitและข้อความ ลดfillflash/slash/ringที่ซ้ำcontact คงdeathringเดิมตามactualdown

ภาพprepare/peak/tailอยู่ในstageTimingเดิม Fast65%เดิม Reducedลดความเข้ม OS-reducedเป็นภาพนิ่งทันที ไม่มีnewtimers/listeners ทุกtweenมีownedimage stop/skip/load/resize/hidden/OSchangeล้างภาพได้ AssetsหายยังStart/commitผ่านfallbackเดิม ไม่แก้core/save/content/balance/playback timing

## การอัดและทำซ้ำ

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/earth-fx.spec.ts --output=test-results/earth-runtime-checks
EARTH_CLIPS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/earth-clips.spec.ts --output=test-results/earth-delivery
python tests/browser/fixtures/encode-earth-clips.py test-results/earth-delivery
EARTH_PLAYER=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/earth-player.spec.ts --output=test-results/earth-player
python docs/combat-presentation/earth-slice/verify_delivery.py
```

Captureแยกจากtests ใช้UI/resolver/renderer/playbackจริง ไม่มีclockmockในคลิป เปรียบเทียบstateทุกช่องกับresolverหลังจบทุกกรณี Fixtureเป็นQAencounterตามกฎ ไม่ใช่เซฟเจ้าของ ไม่แก้balanceเกม

RawJPGทุกเฟรมและstamps/timing/final-stateคงใน `test-results/earth-delivery` (gitignored ไม่ลบก่อนตรวจ) [raw-captures.json](raw-captures.json) เก็บinventory/hash MP4VFR90kHz/noBframesเก็บtimestampจริงทุกเฟรม+finalhold50ms ตรวจdecodedPTS/count/ปลายคลิป ไม่เร่ง/ชะลอ/interpolateหรือสร้างเฟรม Playerตรวจหลังpackเสร็จ ดู [clips.json](clips.json) และ [delivery-proof.json](delivery-proof.json)

Chromiumcloud/SwiftShader390px ไม่มีเสียงในfixture ไม่ใช่Safariหรือมือถือจริง ไม่อ้าง60fps ช่องว่างframeจริงบันทึกไว้เพื่อให้ตรวจได้ Testsไม่ใช่การอนุมัติmotionของเจ้าของ

ผลlocal: typecheck/lint/buildผ่าน;910unit/78filesผ่าน;38focusedbrowserผ่าน ครอบคลุมDPR2×/3×/OSstatic/fallback/cleanupและactualvariantrouting รักษาsourcegatesเดิมทั้งหมด FullbrowserรันในCI ผลpendingไม่ใช่ผ่าน

ส่งมอบ33/33capturesและ33MP4 จาก4,345rawframes ผ่านstate equalityทุกกรณีและdecodedcount/PTSทุกเฟรม errorสูงสุด0.0062ms รวมfinalhold50ms ช่องว่างเฟรมสูงสุด307msในcloud เก็บตามจริง ไม่เติมเฟรมหรืออ้าง60fps Source/public treesผูกกับruntime049c201ในdelivery-proof.json; rawframesยังอยู่ครบ

Player1/1ผ่าน เลือกและdecode/playครบ33ไฟล์390×844 ไม่มีpageerror/overflowที่390px CIquality40512871248ของruntime049c201success; browser40512871253ยังpendingตอนเตรียมส่ง ไม่ถือว่าผ่าน ตรวจlatestchecksในPR85ก่อนmergeทุกครั้ง
