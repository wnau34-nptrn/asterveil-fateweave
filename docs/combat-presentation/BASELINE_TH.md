# หลักฐานจังหวะเดิม — วิธีทำซ้ำและขอบเขต

วันที่ 21 ตุลาคม 2026 · baseline ของ runtime เดิม ใช้เพื่อเทียบภาพและความถูกต้องในเฟสถัดไป

## วิธีทำซ้ำ

ใช้ Node ตาม `package.json` และ dependency ของ repo ที่ติดตั้งอยู่แล้ว:

```powershell
node scripts/combat-presentation-baseline.mjs --output 'C:\absolute\external-evidence-directory'
node scripts/combat-presentation-baseline.mjs --output 'C:\absolute\external-evidence-directory' --capture
```

คำสั่งแรกสร้าง catalog/fixtures/traces โดยไม่เปิด browser คำสั่งที่สองเปิดเกมปัจจุบันผ่าน Vite ที่ `127.0.0.1:5187` และบันทึกภาพ/วิดีโอ ใช้ port นี้เฉพาะ session และปิด server/browser ใน finally ไม่มีการใช้โปรไฟล์หรือเซฟส่วนตัวของผู้ใช้

ถ้า Playwright หา browser/ffmpeg ไม่พบ ให้ชี้ `PLAYWRIGHT_BROWSERS_PATH` ไปที่ runtime ที่ติดตั้งอยู่และ/หรือใช้ `PLAYWRIGHT_CHROMIUM_EXECUTABLE` แบบ absolute path ชุดตรวจครั้งนี้ใช้ Chrome ทางการที่ติดตั้งในเครื่อง เพราะ Chromium ของ Playwright เปิด process ไม่สำเร็จ ไม่ได้ดาวน์โหลด browser หรือเพิ่ม dependency

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:\Users\Warunyu.N\AppData\Local\ms-playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node scripts/combat-presentation-baseline.mjs --output 'C:\absolute\external-evidence-directory' --capture
```

เครื่องมือบังคับ output เป็น absolute directory นอก repo ห้ามใช้เซฟจริงเป็น fixture ต้องมีสิทธิ์เปิด browser process ตาม platform; ไม่มีการข้ามการบังคับสิทธิ์หรือแก้ browser security ของผู้ใช้

## หลักฐานที่สร้าง

| ไฟล์/โฟลเดอร์ | ใช้ตรวจอะไร |
|---|---|
| `coverage.json`, `COVERAGE_TH.md` | 31 actions / 20 intent variants / 23 event types, fallback และ proposal timings |
| `fixture-*.json` | เซฟ v27 สังเคราะห์ก่อนออกคำสั่งที่จับภาพ สร้างจาก `newProfile/depart` และ resolver จริง |
| `resolver-traces.json` | encounter definition, state ก่อน, command และ Resolution ที่คาดได้จาก resolver รวมทุก actor stage/events |
| `{viewport}/{case}/before.png` | ภาพหลังเลือก action แต่ก่อนยืนยัน target |
| `t-0000/0140/0250/1000/2000.png` | ภาพที่เวลา nominal บน clock ที่ควบคุมได้หลังยืนยัน command |
| `observations.json` | actor/phase/HP ที่อ่านจาก DOM, `data-sfx` ล่าสุด, error list, ชื่อวิดีโอ และผลตรวจ state |
| `observed-save.json` | เซฟสังเคราะห์หลัง commit ใช้ตรวจผลที่เกมบันทึกจริง |
| `*.webm` | วิดีโอภาพระหว่างการเก็บเฟรม ไม่ใช่หลักฐานเสียงหรือความเร็วแบบ wall-clock |
| `capture-report.json` | ผลรวมรอบที่สำเร็จทั้งชุด ต้องอ่าน status/จำนวน runs/metadata ก่อนอ้างว่าผ่าน |

ถ้ารันล้มเหลวก่อนจบ อย่าอ้าง PNG/วิดีโอที่มีบางส่วนว่าผ่านทั้งชุด ใช้ final report และชื่อวิดีโอใน observations เลือกหลักฐานจากรอบสำเร็จ ไม่เลือกไฟล์สุ่มจากรอบ retry ก่อนหน้า

## กรณีที่เก็บ

| Case | การตั้งต้น/คำสั่ง | ความหมายที่ต้องได้จริง |
|---|---|---|
| attack | veil-siege; Duelist Attack → brute | มี damage และ automatic enemy turn ตาม SPD |
| mark | veil-siege; Duelist Mark → brute | ติดตรา ไม่แต่ง damage จากการใช้ Mark |
| marked-execute | prefix `guided[0:4]`; Execute → brute | เป้าติดตราจริงก่อน strike และโบนัสจาก resolver |
| bolt | prefix Offensive Mark → raider; Mage Bolt → brute | damage และ HP ตรง resolver |
| ward | prefix Guided Mark; Ward → weaver | barrier ใช้ค่าเพิ่มจริง |
| guard | prefix Guided Mark/Ward; Guard → weaver | หลัง hero stage มี enemy stage ที่รับแทนจริง |
| heal | prefix Guided Mark/Ward/Guard; Heal → guardian | ฟื้น HP ที่ขาดจริง ไม่ใช่ full-HP sample |
| counter | rift-warden; ทีม guardian/tracer/garran/healer; Mark → Brace → guardian Attack | boss physical turn ทำให้ Spear counter จริง; มี counter event ใน trace |
| boss-victory | rift-warden Lv11; fixture ทีม ★5 Lv10 พร้อมอุปกรณ์ QA; advisor เดินถึงก่อนคำสั่งสุดท้าย | ยืนยันชนะ/settle, ordinary 3 + boss 1, reload ไม่ให้รางวัลซ้ำ |

อุปกรณ์ QA ที่แรงในกรณีสุดท้ายมีไว้สร้างจุดก่อนชนะที่ทำซ้ำได้ ไม่ใช่การรับรองสมดุลหรือฟาร์มไทม์ ผู้ทดสอบไม่ต้องเดินจากค่ายเพื่อถึงบอสในแต่ละ capture

390×844 และ 1366×768 เก็บครบเก้ากรณี; 320×568 เก็บ Attack/Guard/Boss victory เป็นชุดย่อ หน้าจอมือถือเป็น Chromium touch emulation ไม่ใช่เครื่องจริง

## ผลรอบตรวจ

สถานะ: **ผ่าน 21/21 capture flows** ใน final `capture-report.json` ไม่มี page/console errors จากรอบที่ผ่าน

| ขนาด | กรณีที่ผ่าน | ผลตรวจ |
|---|---|---|
| 390×844 touch emulation | 9/9 | ครบทุก case |
| 1366×768 desktop | 9/9 | ครบทุก case |
| 320×568 touch emulation | 3/3 | Attack / Guard / Boss victory |

รวม 105 sampled frames + 21 before screenshots และวิดีโอที่อ้างอิงจาก observations ของ 21 flows; บอสทั้งสามขนาดได้ ordinary 3 + boss 1 และ reload แล้วเซฟไม่เปลี่ยน Active cases ผ่าน state deep equality กับ resolver replay

ตรวจภาพจริงด้วยตา: 390px Attack t140, Counter t1000, Boss victory t2000; 1366px Bolt t250; 320px Guard t1000 และ Boss victory t2000 ภาพแสดงสนาม/ตัวเลข/การรับแทน/หน้าชนะของ runtime เดิม ไม่ใช่งาน VFX ใหม่

catalog/fixture generation และการตรวจ completeness ผ่าน; full repo lint ผ่าน และ whitespace/source-diff checks ยืนยันว่า `src`/package files ไม่เปลี่ยน ไม่มีการอ้างว่ารัน full unit/browser suite ในงานเตรียมนี้

การลองครั้งแรกพบ browser binary เปิดไม่ได้ และตัวเก็บหลักฐานอ่าน battle หลังชนะบอสทั้งที่ระบบ settle ล้าง battle แล้ว จึงเปลี่ยนเป็น Chrome ที่ติดตั้งอยู่และแก้ตัวเก็บให้ตรวจผล world/reward + stable reload แทน ไม่แก้ runtime หรืออ่อนกฎเซฟเพื่อให้ผ่าน

หลักฐานนอก repo:

`C:\Users\Warunyu.N\.codex\visualizations\2026\10\21\01a15cd5-a6e8-7f81-961a-2a851f62ed4c\combat-phase0-baseline`

## ข้อจำกัดที่ต้องรักษาในการอ้างผล

- ภาพ t0/t140 เป็นเวลา nominal ของ virtual clock ไม่ใช่การวัด FPS, audio latency หรือการพิสูจน์ cue sync ภายในหนึ่งเฟรมจริง
- `data-sfx` ระบุเสียงที่ร้องขอ ไม่พิสูจน์ว่าผู้ใช้ได้ยิน และวิดีโอไม่มีหลักฐาน SFX audible
- active cases เทียบเซฟด้วย replay/state deep equality; boss victory ตรวจผล world ที่ settle แล้วและ stable reload เนื่องจาก battle ถูกล้างหลังชนะ ไม่อ่าน final battle ที่ไม่มีอยู่แล้ว
- baseline ไม่ได้ทดสอบครบทุก action ที่อยู่ใน catalog, ไม่ใช่ full gameplay/browser regression suite และไม่รับรองการออกแบบเอฟเฟกต์ที่ยังไม่สร้าง
- iPhone/Safari จริง, รายงานเก่าเพลงดังแต่ SFX ไม่ดัง และ performance มือถือยังไม่ยืนยัน
