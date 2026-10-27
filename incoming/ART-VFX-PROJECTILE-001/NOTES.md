# ART-VFX-PROJECTILE-001 · artwork/runtime R1 ที่เจ้าของให้ผ่านแล้ว

เจ้าของให้ผ่านmotion40คลิปแล้ว27ต.ค.2026 “เอาเข้าเกมได้”; PR84 merged7c392b5หลังCIผ่าน Pages40503739046เผยแพร่successเวลา19:37:55น.กรุงเทพฯ ไม่เริ่มตระกูล5

2026-10-27 · เจ้าของเลือก artwork R1 ด้วย “ดำเนินการขั้นต่อไป” แล้ว ต่อ runtime ใน PR84เดิม ส่ง40คลิปจริงแล้ว ยังรอตรวจ motion/merge/เผยแพร่

- `source/seven-skills.png`: original ImageGen1024×1536 RGBA3columns×7rows (hinder/volley/weakshot/pin/track/disengage/knives); prepare/projectile/dissolve Originalไม่ได้แก้และเก็บสำเนา byte-identical; generated originalคงอยู่ใน `/workspace/generated_images`
- `generation-prompts.json`: exact prompt, transparent background request, toolและต้นทางเดิม ไม่มีฉาก/UI/characterที่AIวาดใหม่ ไม่มี external/sibling assets
- `reference/`: screenshot390×844จากrendererจริง14cases, masksจากspriteจริง และanchors/events/snapshots/commandsจากresolverจริง; fixtureนิยามQA ไม่มีเซฟเจ้าของ
- `docs/combat-presentation/projectile-storyboards/build_manifest.py`: measured cell boundsและ alpha/sha256, ไม่มีrepaintหรือkeying
- `viewer.js`: ภาพนิ่งเตรียม/ลูกธนูหรือมีดหนึ่งเล่มต่อผู้รับจริง/หางสลาย วางเส้นทางโค้งเฉพาะท่า สเกลสัดส่วนเดิมต่อcell ใช้maskจริงรักษาชุดและอาวุธ ไม่วาดสถานะ/HPที่แต่งขึ้น
- landmarkผูกกับrendered unit: MiraยอดคันธนูและSefaมือ/คมมีดด้านซ้าย ตามภาพอ้างอิง; CSScoordinates และตรวจ2×/3×ผ่านimageworldtransformอิสระ ไม่มีDPRซ้ำ การตามposeขณะruntimeต้องตรวจหลังเจ้าของเลือกภาพ
- Track actual follow-upเป็น `counter` text `Tracking shot.` ในengine ไม่ใช่damage; isolatedเป็นอีกตัวเลือก ไม่ปลอมสองhitตอนcast

หนึ่งPRตระกูล4ครอบคลุมขั้นต่อไปหลังเลือกภาพ: shared atlas/module, focusedbrowser, actual390pxclipsทุกท่า/ผลจริง/normal-fast-reduced-OS-reduced ให้เจ้าของตรวจ ก่อนmerge/เผยแพร่/เริ่มตระกูล5 ห้ามแก้rules/save/content/balance/playback timingเพื่อภาพ

Provenance: original built-in ImageGen artwork requested for this Fateweave task under the owner's existing authorization. No additional third-party art/license dependency.

Production: `package.py` preserves original RGBA cell pixels in one21-frame1440×2016 lossless atlas. `production-sources.json` records cells, bright bounds and hashes; no new painted pixels. Runtime uses cue events directly; knives has a higher flight arc to clear front-row silhouettes.
