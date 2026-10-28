# A2 — release evidence

28 ตุลาคม2026 · [PR88](https://github.com/wnau34-nptrn/asterveil-fateweave/pull/88) · กำลังตรวจ ยังไม่รายงานว่าเผยแพร่แล้ว

[Mapping/คลิป/ขนาดจริง/fallback](../../combat-presentation/unit-a2-slice/README_TH.md) · [Source/prompt/packing](../../../incoming/ART-UNIT-ANIMATION-A2-001/NOTES.md)

ฐานf0ee801หลังA0/A1และC5.6 กฎ/save/content/balance/playbacktimingและVFXเดิมไม่เปลี่ยน รักษาownerapprovalและทุกCIgateเดิม ไม่มีowner visualapprovalใหม่ถูกอนุมานจากtests

ขั้นตรวจจริง: typecheck/lint/buildผ่าน; unitรอบรวม974ผ่าน/1timeoutในboss-balanceเดิมขณะรันbrowserร่วมกัน เคสนั้นรันเดี่ยวผ่าน1/1ใน175.90sโดยไม่แก้180s timeoutหรือassertions A2+optional-focusedล่าสุด21/21ผ่าน CIquality40655110089ผ่านบน60335a1 ผลสุดท้ายของfullbrowser/capture/player/merge/Pagesจะเพิ่มหลังตรวจครบเท่านั้น

Aegis4,423,680decodedRGBAbytes/1,397,790downloadbytes Guard4,303,872/1,385,751 ตัวเลขไม่ใช่RAMรวมเกมและไม่มีผลมือถือจริง Chromiumcloud/SwiftShader390pxemulationไม่ใช่iOSSafari/physicaldeviceหรือ60fpscertification

## Local delivery complete, final CI pending

Runtime snapshotdd56ddd has src/public trees9c21ec671fa30a10236772f3819ba84aaca208a3/f6698cd8435f2b84295c503de9db6031b1f4e218. [Local run inventory/earlier failures](local-results.json) records37focusedunit,42browser+finalcounter1,26capture/state equality/independentdecode andplayer1/1.26MP4 contain1,202rawcapturedframes+finalholds, maxgap.377s/maxPTSerror.0061ms. Captures/images/metadata are inGit; rawJPEGs are not. The two Playwright-hashed names are derived from actualheroaction+announcedintent+mode/scenario metadata; no video retiming. Source/public remain identical while delivery-only encoder/metadata are finalized. FullCI/merge/Pages are stillpending here and will be updated after success.
