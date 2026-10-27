# ART-VFX-PROJECTILE-001 · artwork R1 เสนอเลือก

2026-10-27 · ยังไม่มี artwork ตระกูล4ที่เจ้าของเลือก ยังไม่มี runtime ใหม่

- `source/seven-skills.png`: original ImageGen1024×1536 RGBA3columns×7rows (hinder/volley/weakshot/pin/track/disengage/knives); prepare/projectile/dissolve Originalไม่ได้แก้และเก็บสำเนา byte-identical; generated originalคงอยู่ใน `/workspace/generated_images`
- `generation-prompts.json`: exact prompt, transparent background request, toolและต้นทางเดิม ไม่มีฉาก/UI/characterที่AIวาดใหม่ ไม่มี external/sibling assets
- `reference/`: screenshot390×844จากrendererจริง14cases, masksจากspriteจริง และanchors/events/snapshots/commandsจากresolverจริง; fixtureนิยามQA ไม่มีเซฟเจ้าของ
- `docs/combat-presentation/projectile-storyboards/build_manifest.py`: measured cell boundsและ alpha/sha256, ไม่มีrepaintหรือkeying
- `viewer.js`: ภาพนิ่งเตรียม/ลูกธนูหรือมีดหนึ่งเล่มต่อผู้รับจริง/หางสลาย วางเส้นทางโค้งเฉพาะท่า สเกลสัดส่วนเดิมต่อcell ใช้maskจริงรักษาชุดและอาวุธ ไม่วาดสถานะ/HPที่แต่งขึ้น
- landmarkผูกกับrendered unit: MiraยอดคันธนูและSefaมือ/คมมีดด้านซ้าย ตามภาพอ้างอิง; CSScoordinates และตรวจ2×/3×ผ่านimageworldtransformอิสระ ไม่มีDPRซ้ำ การตามposeขณะruntimeต้องตรวจหลังเจ้าของเลือกภาพ
- Track actual follow-upเป็น `counter` text `Tracking shot.` ในengine ไม่ใช่damage; isolatedเป็นอีกตัวเลือก ไม่ปลอมสองhitตอนcast

หนึ่งPRตระกูล4ครอบคลุมขั้นต่อไปหลังเลือกภาพ: shared atlas/module, focusedbrowser, actual390pxclipsทุกท่า/ผลจริง/normal-fast-reduced-OS-reduced ให้เจ้าของตรวจ ก่อนmerge/เผยแพร่/เริ่มตระกูล5 ห้ามแก้rules/save/content/balance/playback timingเพื่อภาพ

Provenance: original built-in ImageGen artwork requested for this Fateweave task under the owner's existing authorization. No additional third-party art/license dependency.
