# ART-VFX-EARTH-001 · artwork R1 selected / runtime motion pending

2026-10-27 · เจ้าของเลือกartwork R1ด้วย “ไปต่อ” แล้ว ต่อruntime4ท่าในPR85เดิม รอตรวจคลิปจริงก่อนmerge/เผยแพร่/ตระกูล6

- `source/four-skills.png`: built-inImageGen original1536×1024 RGBA,3columns×4rows bash/slam/quake/tremor: prepare/peak/dissolve เก็บสำเนาbyte-identical ไม่ลบoriginalใน `/workspace/generated_images`
- `generation-prompts.json`: exactprompt/transparent_background/tool/originalpath ไม่มีฉาก/ตัวละคร/UIที่AIวาดใหม่ ไม่ใช้external/sibling art
- `reference/`:15screenshots390×844กับbinaryalpha masksจากsprite+DOMจริง และanchors/events/snapshots/commandsจากresolverจริง ไม่มีstate/eventที่แทรกหรือowner save
- `docs/combat-presentation/earth-storyboards/build_manifest.py`: sourcehash/alpha/brightbounds/cell coordinates, CSSprecision6decimalsในmanifest; rawcapturesเก็บค่าต้นฉบับ
- `viewer.js`: body-contactedgeสำหรับBash/Slam, groundprojectionตื้นสำหรับQuake/Tremorที่renderedsole; ใช้alphaและmaskจริงรักษาpixelsชุด/อาวุธ/ป้ายทุกจุด ทุกphaseคงHP/UIก่อนcastเพื่อเทียบfootprint ไม่ใช่ผลHPหลังhitหรือruntime motion
- แยกแต่ละท่าด้วยshape/ทิศ/footprint ไม่ใช้วงกลมเดียวเปลี่ยนสี มีปลายฝุ้ง/afterglowโปร่ง ลดobstruction ขนาดนี้เป็นข้อเสนอให้เลือกก่อนruntime
- Truth: Bashretributionหนึ่งhitเพิ่มpowerไม่ใช่ทุบซ้ำ; reflectenergyเป็นsigilจริง; Slamincomingbonusและrunequakeคู่slotจริง; Quakefront/backfallback+skyhammerhealจริง; Tremorเป็นdrawnByไม่ใช่ลดpowerตามcommentเก่า ไม่แก้core/content

หลังเจ้าของเลือก: ต่อหนึ่งatlas/moduleของตระกูล5ในPRเดิม รักษาplayback timing/rules/save/content/balanceและ4sourceVFXgatesเดิม เพิ่มearthgateตรงไปตรงมา อัดactual390pxclipsครบ4ท่า/ผลจริง/normal-fast-reduced-OS-reducedพร้อมrawframes/timestamps ให้ตรวจก่อนmerge/เผยแพร่/ตระกูล6

Authorship: original built-inImageGen artwork for the owner's Fateweave request under existing permission. No new third-party art/license dependency.

Runtime: `package.py` packs12losslesscells1584×1152; production-sources.json recordsoriginalsource/cells/hash. See docs/combat-presentation/earth-slice/README_TH.md. Runequake splash is half skill.power floor (18→9), corrected prose only; original engine unchanged.
