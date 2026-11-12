# P09-02a2 — มุมมองเครื่องที่ไม่มี seed + ซองคำสั่ง

12 พฤศจิกายน 2026 · ทำตามคำสั่งเจ้าของ “อนุมัติตามที่คุณแนะนำ ดำเนินการได้” หลัง P09-02a (#222) · **[โค้ด]** = ข้อเท็จจริงจากโค้ดตอนนี้; **[เสนอ]** = ข้อเสนอสำหรับงานถัดไป · ทำในเครื่องเท่านั้น ไม่แตะ Cloudflare ไม่เปลี่ยนเซฟ v58 ไม่เปลี่ยนกฎ ตัวเลข หรือผลของการกระทำใด ๆ

## 1. มุมมองเครื่อง `clientView` [โค้ด]

`src/core/command/client-view.ts` (pure ไม่มีนาฬิกา/สุ่ม/API ของเครื่อง)

- `clientView(game, { home, lookup }) → ClientGame = { profile: ClientProfile; run: ClientRun | null; hireBoard: HireSlot[] }`
- ตัดออก: `profile.seed`, `profile.forge` (กระดานจ้าง หีบอุปกรณ์ หลอมรวม ปรับค่า) และ `run.seed`, `run.rolls` (ศัตรู หีบ เหตุการณ์ ของดรอป ข้อเสนอจ้างช่วงแรก) — รายชื่อคีย์อยู่ใน `HIDDEN_PROFILE_KEYS`/`HIDDEN_RUN_KEYS`; `migrated` (โน้ตย้ายเซฟครั้งเดียวของเครื่อง) ไม่อยู่ในมุมมอง
- ใส่แทน: `hireBoard` = กระดานจ้างตามลำดับช่อง `{ heroId, reason }` โดย `heroId` = `boardOffers` และ `reason` = `hireReason` (`''` จ้างได้ / `taken` / `gold` / `maxed`) คำนวณด้วยกฎของแผนที่แรก (`home`) เหมือนคำสั่ง `hire`
- `clientEvents(events)`: เหตุการณ์ `settled` แนบการเดินทางแบบไม่มี seed
- สำรวจซ้ำ: ฟิลด์อื่นใน `Profile`/`ExpeditionState` ไม่บอกผลสุ่มล่วงหน้า (`boardPool`/`boardFeatured` เป็นรายชื่อผู้สมัคร ไม่ใช่ลำดับที่จะออก; `refreshes`/`returns` แสดงบนจออยู่แล้ว; `draft.offers` เก็บข้อเสนอที่ออกแล้ว; `bossLoot`/`hunt` เป็นตัวนับ pity ที่ผู้เล่นเห็น)

## 2. UI ที่เปลี่ยน [โค้ด]

- `src/ui/lobby-ui.ts`: `LobbyView` มี `board: readonly HireSlot[]`; จำนวนป้ายที่จ้างได้บนเมนู รายการกระดานจ้าง และหน้าดูข้อมูลก่อนจ้าง อ่านจาก `board` แทนการเรียก `boardOffers`/`hireReason` (ไม่ import สองฟังก์ชันนี้แล้ว) ข้อความ ปุ่ม ลำดับ และ index เหมือนเดิม
- `src/ui/game-shell.ts`: ส่ง `board: clientView(game, …).hireBoard` ให้ lobby ตอน render; อย่างอื่นใน shell เหมือนเดิม (ยังใช้ `game` ทั้งก้อนในเครื่อง)
- สำรวจ UI อื่น (`src/ui`, `src/game`): ไม่พบการอ่าน `seed`/`rolls`/`forge` หรือการเรียกฟังก์ชันที่ใช้ seed (`draftOffers`, `rollPercent`, `fuse`/`reroll` preview); `planEquipment` ใช้คำว่า seed แต่หมายถึงชุดเซ็ตตั้งต้น ไม่ใช่การสุ่ม

## 3. ซองคำสั่ง `processCommand` [โค้ด]

`src/core/command/command-envelope.ts` — server เรียกได้ตรง ๆ; shell ในเครื่องยังไม่ใช้ (พฤติกรรมเกมเหมือนเดิม)

- คำขอ `{ requestId, seq, command }`; ผู้เรียกคำนวณ SHA-256 ของ `canonicalJson(command)` (เรียงคีย์ ตัด `undefined`) ด้วย crypto ของตัวเอง
- ลำดับ: `decideCommand` (`core/cloud/cloud-save.ts`) → `parseCommand` → `applyCommand` → ตอบ `{ seq, status: 'applied', view, events }` (มุมมองไม่มี seed) หรือ `{ seq, status: 'rejected', reason }`
- ผล: `committed` (เก็บ `game` + `book` ในการเขียนครั้งเดียว), `replayed` (ส่งคำตอบเดิม ไม่รันกฎซ้ำ ไม่เขียน), `requestReused`, `stale`, `gap`, `invalid` (ไม่รันและไม่เขียน)
- คำสั่งที่ผิดรูป (`shape`) หรือกฎปฏิเสธ ใช้เลข seq ไปแล้วและเก็บคำตอบไว้ตอบซ้ำ สถานะไม่เปลี่ยน — เครื่องส่ง `lastSeq + 1` ต่อได้เสมอ
- เก็บคำตอบล่าสุด `RECENT_REPLIES` = 64 รายการ (ร่าง)

## 4. เทสต์ [โค้ด]

`tests/client-view.test.ts` (11): มุมมองไม่มีคีย์ seed/rolls/forge ที่ระดับใดเลย (ค่าย แผนที่ ระหว่างศึก) และ JSON round-trip ได้; ส่วนอื่นเท่าเดิมและไม่แก้ input; `hireBoard` เท่ากับ `boardOffers`+`hireReason` ผ่านการจ้าง สุ่มป้าย และเงินไม่พอ; `settled` ไม่มี seed; ซอง apply/replayed (ไม่รันกฎซ้ำ)/requestReused/stale/gap/invalid, คำสั่งถูกปฏิเสธใช้ seq, เก็บ 64 รายการ, hash ไม่ขึ้นกับลำดับคีย์, เล่นซ้ำทั้ง session ได้ผลเดิมและเท่ากับเรียก `applyCommand` ตรง

## 5. สิ่งที่เหลือก่อน P09-02b [เสนอ]

1. **ชนิดข้อมูลของ UI**: `LobbyView.profile`, world UI และ summary ยังรับ `Profile`/`ExpeditionState` เต็ม (ไม่ได้อ่าน seed แต่ชนิดยังต้องมี) — เปลี่ยนเป็น `ClientProfile`/`ClientRun` ทีละไฟล์เมื่อ shell รับมุมมองจาก server; ฟังก์ชันเหตุผล (`buyReason` ฯลฯ) ควรรับชนิดที่ไม่มี seed
2. **ผลลัพธ์ที่ shell สร้างเอง**: shell ยังคำนวณข้อความ/สรุปจาก `game` เต็มและ `settled.run` เต็ม; ฝั่ง server ให้ใช้ `view` + `clientEvents`
3. **seed บน server**: `SeedSource` ด้วย crypto ของ DO ไม่ส่งออก; เก็บ seed ที่ใช้ไว้กับ log เพื่อ replay ตรวจสอบ
4. **เวอร์ชันเนื้อหา**: ปฏิเสธคำสั่งเมื่อ content/encounter version ของเครื่องกับ server ไม่ตรง
5. **ขนาดคำตอบ**: ส่งมุมมองเต็มทุกคำสั่ง (~ขนาดเซฟ) — วัดก่อน P09-02b แล้วตัดสินว่าจะส่ง diff หรือไม่
6. P09-02b (Worker + DO + D1, ต้องมีสิทธิ์ D1 Edit/DO บน token) และ P09-02c (ล็อกระหว่างรอ, reconnect, อุปกรณ์อื่น)

ข้อตัดสินใจ D1/D11/D12 ยังบันทึกตามเอกสาร P09 เดิม; งานนี้ไม่ได้บันทึกว่าเจ้าของอนุมัติ
