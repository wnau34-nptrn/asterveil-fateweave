# P09-02a — ชั้นคำสั่งของค่ายและแผนที่ + seed จาก port

12 พฤศจิกายน 2026 · ทำตามคำสั่งเจ้าของ “ดำเนินการต่อได้” หลัง P09-01 และ D10 = ค · **[โค้ด]** = ข้อเท็จจริงจากโค้ดตอนนี้; **[เสนอ]** = ข้อเสนอสำหรับงานถัดไป · เกมยังเล่นในเครื่องเหมือนเดิม ไม่แตะ Cloudflare ไม่เปลี่ยนเซฟ v58 ไม่เปลี่ยนกฎหรือตัวเลข

## 1. สิ่งที่ทำ [โค้ด]

- `src/core/command/game-command.ts`: คำสั่งแบบ JSON ล้วน (`GameCommand` = `CampCommand | RunCommand`, 55 ชนิด), `parseCommand(raw)` ตรวจรูปร่างคำสั่งที่มาจากภายนอก (ชนิดรู้จัก, ฟิลด์ครบและไม่เกิน, ชนิดข้อมูล/ค่า enum ถูก) และ `applyCommand(game, cmd, ctx) → { game, events } | { rejected }` แบบ pure ที่เรียกฟังก์ชันกฎเดิมใน `core/world` ทุกตัว ไม่เขียนกฎซ้ำ
- `src/core/command/seed-source.ts`: port `SeedSource { next() }` + `sequenceSeeds()` สำหรับเทสต์/replay; `src/platform/seed-source.ts` `localSeedSource()` = ตัวสร้างเดิม (`Date.now() ^ Math.random()`) ย้ายออกจาก `game-shell.ts`
- `placeCampMember` (กฎจัดทีมในค่าย) ย้ายจาก `src/ui/camp-team.ts` ไป `src/core/world/camp-team.ts` เพราะเป็นกฎ ไม่ใช่ UI
- `src/ui/game-shell.ts` ส่งทุกการกระทำของค่าย/แผนที่/ศึกผ่าน `applyCommand` แล้ว (ไฟล์ UI อื่นไม่ได้แก้); ข้อความ เสียง เอฟเฟกต์ และ presentation lock ยังอยู่ใน shell เหมือนเดิม คำสั่งที่ถูกปฏิเสธไม่เปลี่ยนอะไร (เหมือนเดิมที่ `blocked` ถูกเพิกเฉย)
- เทสต์ `tests/game-command.test.ts` (66 เทสต์): ทุกชนิดคำสั่งให้ผลเท่ากับเรียกฟังก์ชันเดิมโดยตรงและไม่แก้ input (50 ชนิดเปลี่ยนสถานะจริง, 5 ชนิดตรวจเท่ากันบนเหตุผลที่ถูกปฏิเสธ), JSON round-trip, คำสั่งผิดรูปถูกปฏิเสธ, เหตุผลการปฏิเสธ, จบศึก/แพ้หมดทีม, ออกเดินทางครั้งแรกพร้อมศึก prologue, seed มาจาก port เท่านั้น, เล่นลำดับคำสั่งซ้ำได้ผลเดิมและเซฟยังโหลดได้, เดินถึงเป้าหมายแล้วตัดบัญชีกลับค่าย

## 2. รายการคำสั่ง [โค้ด]

ค่าย (ปฏิเสธ `inRun` ถ้ามีการเดินทางค้าง, `noGame` ถ้ายังไม่มีเซฟ): `createCommander` (ใช้ seed เมื่อสร้างค่ายใหม่), `hire`, `refreshBoard`, `buy`, `smelt`, `upgrade`, `setArchived`, `dismiss`, `placeMember`, `setPartyLane`, `preset` (apply/save/rename/clear), `raiseSkill`, `tradeTomes`, `learnTalent`, `chooseLoadout`, `resetTalents`, `claimGuide`, `equip`, `unequip`, `autoEquipCamp`, `transferAffix`, `craftWeapon`, `bossTarget`, `huntTarget`, `collectOverflow`, `recycleStored`, `expandStorage`, `salvage`, `enhance`, `lockEquipment`, `fuse`, `raiseItemLevel`, `reroll`, `brew`, `claimQuest`, `depart` (ใช้ seed; รวม `startPrologue` ของการเดินทางครั้งแรกไว้ในคำสั่งเดียว)

แผนที่ (ปฏิเสธ `noRun`): `move` (ถึงเป้าหมาย = ตัดบัญชี `complete` ในคำสั่งเดียว), `travel`, `rest`, `revive`, `swapMembers`, `setLane`, `moveMember`, `runPreset`, `withdraw`, `openChest`, `usePotion`, `chooseEvent`, `draftPick`, `learnRunTalent`, `chooseRunLoadout`, `wear`, `takeOff`, `autoEquipRun`, `battle`

- `battle { commands }`: ส่งรายการคำสั่งศึกทั้งหมด (`core/battle` `Command`); ต้องต่อท้ายของเดิมเท่านั้น (`rewrite`), resolver replay ทุกเทิร์นและปฏิเสธเทิร์นผิด/beat เก่า (`illegal`), ถ้า replay จบแล้วรัน `finishBattle` และแพ้หมดทีม = ตัดบัญชี `wiped` ในคำสั่งเดียว; ผลแพ้ชนะมาจาก replay ไม่ใช่จากเครื่อง
- ข้อสังเกตที่คงไว้ตามเดิม: คำสั่งจัดทีม/กระเป๋า/ต้นไม้บนแผนที่ใช้กฎของแผนที่แรก (`home`) เหมือนที่ shell เรียกมาตลอด ส่วนเดิน/พัก/หีบ/เหตุการณ์/ศึกใช้แผนที่ของการเดินทาง; กฎค่ายทุกแผนที่มาจาก `content/world/rules.ts` ชุดเดียวกัน
- `autoEquip*` แนบสำเนาสมาชิกและไอเท็มที่วางแผนไว้ กฎตรวจว่ายังตรงกับสถานะปัจจุบันตอน commit (แผนเก่า = ปฏิเสธ) จึงไม่ได้ไว้ใจข้อมูลจากเครื่อง
- เหตุการณ์ `settled` แนบการเดินทางที่ตัดบัญชีแล้ว (ใช้ทำสรุปผล) — การเดินทางนั้นจบแล้ว seed ของมันไม่ใช้ต่อ

## 3. จุดที่ seed ถูกใช้ [โค้ด]

สร้าง seed ใหม่: แค่ 2 จุด คือ `createCommander` ที่สร้างค่ายใหม่ (`newProfile`) และ `depart` (`newExpedition`) — ตอนนี้มาจาก `ctx.seeds` เท่านั้น

seed ที่อยู่ในสถานะและเซฟ (ยังส่งถึงเครื่องทั้งหมด):

| ค่า | ใช้กำหนด |
|---|---|
| `run.seed` + `run.rolls` | ศัตรูสุ่มต่อก้าวและ pool, ของจากหีบ/ยา, โจรใน event, ของดรอป/ล่าเป้า/บอส, ข้อเสนอจ้างช่วงแรก (`draftOffers`) |
| `profile.seed` (+ `refreshes`/`returns`) | กระดานจ้าง (`boardOffers`) |
| `profile.seed` + `profile.forge` | หลอมรวม/ปรับค่า (`fuse`, `reroll`) และหีบอุปกรณ์ในร้าน (`buy gearbox`) |
| เซฟเก่ามาก | `parseGame` สร้าง profile จาก `run.seed ^ 0x5bd1e995` |

ฟังก์ชันแสดงผลของ UI ที่ต้องรู้ seed (P09-02a2 ย้ายไปคำนวณใน `clientView` แล้ว ดู [CLIENT_VIEW_TH.md](CLIENT_VIEW_TH.md)): **`boardOffers`/`hireReason` ใน `lobby-ui.ts`** (รายชื่อบนกระดานจ้าง คำนวณจาก `profile.seed` บนเครื่อง) — เป็นจุดเดียวที่พบ. ที่ไม่ต้องใช้ seed: ข้อเสนอ draft (เก็บไว้ใน `run.draft.offers`), โอกาสเจอศัตรู (`encounterChance` ใช้ pressure), preview ศึก/replay (`core/battle` ไม่มีสุ่ม), preview ตำรา/ตีบวก/เพิ่มเลเวล/เหตุผลหลอม

## 4. สิ่งที่เหลือก่อนต่อ server [เสนอ]

1. ✅ ทำแล้วใน P09-02a2 ([CLIENT_VIEW_TH.md](CLIENT_VIEW_TH.md)) — **มุมมองเครื่อง**: ฟังก์ชัน `clientView(game)` ที่ตัด `seed`/`rolls`/`forge` และใส่ `boardOffers` ที่คำนวณแล้วแทน; ให้ `lobby-ui` อ่านรายชื่อจากมุมมองนี้ (แก้ UI เล็กน้อย ควรทำหลังงาน HUD ของ Codex)
2. ✅ ทำแล้วใน P09-02a2 (`processCommand`) — **ซองคำสั่ง**: ห่อ `{ requestId, seq, command }` แล้วใช้ `decideCommand` (`core/cloud/cloud-save.ts`) ก่อน `parseCommand` → `applyCommand`; เก็บผลไว้ตอบซ้ำ
3. **seed บน server**: `SeedSource` ที่ใช้ crypto ของ DO และไม่ส่งออก; ทดสอบว่า log คำสั่ง + seed ที่ใช้ replay ได้ snapshot เดิม
4. **เวอร์ชันเนื้อหา**: server และเครื่องต้องใช้ content/encounter version เดียวกัน หรือปฏิเสธคำสั่งเมื่อเวอร์ชันไม่ตรง
5. **ผลที่ shell ใช้**: shell ยังอ่าน `game` ที่ได้กลับมาทั้งก้อน; เมื่อมี server ให้ใช้มุมมองจากข้อ 1 และเหตุการณ์แทน และย้ายข้อความ `rejected` (เช่น `storage`) เป็นข้อความผู้เล่น
6. ขั้นต่อไปตามแผน: P09-02b (Worker + DO + D1, ต้องมีสิทธิ์ D1 Edit/DO) และ P09-02c (ล็อกระหว่างรอ, reconnect, อุปกรณ์อื่น)

ข้อตัดสินใจที่ยังรอเจ้าของ (ไม่ขวางงานนี้): D1 วิธีผูกบัญชี, D11 นำเข้าเซฟเดิม, D12 หลายเครื่อง
